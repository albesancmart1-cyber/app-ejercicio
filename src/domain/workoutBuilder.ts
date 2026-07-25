import { EXERCISES } from '../data/exercises'
import type {
  Equipment,
  Exercise,
  MuscleGroup,
  PlannedExercise,
  Profile,
  Recommendation,
  Session
} from './types'
import { repPrescription, setsFor } from './protocol'

let idCounter = 0
function newId(): string {
  idCounter += 1
  return `s-${Date.now().toString(36)}-${idCounter}`
}

function hasEquipment(exercise: Exercise, owned: Equipment[]): boolean {
  return exercise.equipment.some((eq) => owned.includes(eq) || eq === 'peso_corporal')
}

/** Un básico multiarticular necesita más descanso que un accesorio. */
function isCompound(exercise: Exercise): boolean {
  return exercise.stress !== 'bajo' && exercise.secondary.length > 0
}

/** Peso máximo disponible entre los equipos válidos para el ejercicio. */
function availableMax(exercise: Exercise, profile: Profile): number | undefined {
  const maxes = exercise.equipment
    .filter((eq) => profile.equipment.includes(eq))
    .map((eq) => profile.maxWeights[eq])
    .filter((w): w is number => typeof w === 'number' && w > 0)
  if (maxes.length === 0) return undefined
  return Math.max(...maxes)
}

/** Redondeo a discos de 2,5 kg, solo para la primera estimación. */
function roundWeight(kg: number): number {
  return Math.max(1, Math.round(kg / 2.5) * 2.5)
}

/** Al progresar respetamos el peso real que usó el usuario, en pasos de 0,5 kg. */
function roundStep(kg: number): number {
  return Math.max(1, Math.round(kg * 2) / 2)
}

interface LastPerformance {
  weightKg?: number
  rpe?: number
}

function lastPerformance(exerciseId: string, history: Session[]): LastPerformance | undefined {
  const sorted = [...history].filter((s) => s.completed).sort((a, b) => (a.date < b.date ? 1 : -1))
  for (const s of sorted) {
    const pe = s.exercises.find((p) => p.exerciseId === exerciseId && p.done === true)
    if (pe) return { weightKg: pe.actualWeightKg ?? pe.plan.weightKg, rpe: s.rpe }
  }
  return undefined
}

/**
 * Peso sugerido. Si ya hay registros, progresa desde el último teniendo en cuenta
 * cómo se sintió esa sesión: si costó mucho, se mantiene la carga.
 */
function suggestWeight(
  exercise: Exercise,
  profile: Profile,
  loadScale: number,
  history: Session[]
): number | undefined {
  const max = availableMax(exercise, profile)
  if (max === undefined || !exercise.loadFactor) return undefined

  const last = lastPerformance(exercise.id, history)
  if (last?.weightKg) {
    // Sensación 1–2 = muy duro → mantenemos. 4–5 = cómodo → subimos algo más.
    const hard = last.rpe !== undefined && last.rpe <= 2
    const easy = last.rpe !== undefined && last.rpe >= 4
    if (hard) return Math.min(last.weightKg, max)
    const factor = easy ? 1.05 : 1.025
    // Al menos medio kilo, para que la progresión no se quede en nada.
    const next = Math.max(last.weightKg + 0.5, last.weightKg * factor)
    return Math.min(roundStep(next), max)
  }
  return Math.min(roundWeight(max * exercise.loadFactor * loadScale), max)
}

/** Ejercicios usados en la última sesión, para no repetir siempre lo mismo. */
function recentExerciseIds(history: Session[]): Set<string> {
  const last = [...history]
    .filter((s) => s.completed)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  return new Set(last ? last.exercises.map((e) => e.exerciseId) : [])
}

function pickForGroup(
  group: MuscleGroup,
  profile: Profile,
  maxStress: 'bajo' | 'medio' | 'alto',
  exclude: Set<string>,
  recent: Set<string>
): Exercise | undefined {
  const stressRank = { bajo: 0, medio: 1, alto: 2 }
  const candidates = EXERCISES.filter(
    (e) =>
      e.primary === group &&
      e.primary !== 'cardio' &&
      !exclude.has(e.id) &&
      hasEquipment(e, profile.equipment) &&
      stressRank[e.stress] <= stressRank[maxStress]
  )
  if (candidates.length === 0) return undefined

  // Preferimos no repetir lo de la última sesión; dentro de eso, el mayor
  // estímulo permitido (más músculo por ejercicio, menos ejercicios totales).
  candidates.sort((a, b) => {
    const repeatA = recent.has(a.id) ? 1 : 0
    const repeatB = recent.has(b.id) ? 1 : 0
    if (repeatA !== repeatB) return repeatA - repeatB
    return stressRank[b.stress] - stressRank[a.stress]
  })
  return candidates[0]
}

function cardioExercise(profile: Profile, medium: boolean): Exercise | undefined {
  const prefer = medium
    ? ['bici_media', 'trote_suave', 'bici_suave', 'caminar']
    : ['caminar', 'bici_suave', 'trote_suave']
  for (const id of prefer) {
    const ex = EXERCISES.find((e) => e.id === id)
    if (ex && hasEquipment(ex, profile.equipment)) return ex
  }
  return EXERCISES.find((e) => e.id === 'movilidad')
}

/** Construye la sesión concreta a partir de la recomendación. */
export function buildSession(
  recommendation: Recommendation,
  profile: Profile,
  history: Session[],
  todayIso: string,
  keto = false
): Session {
  const exercises: PlannedExercise[] = []
  const used = new Set<string>()
  const recent = recentExerciseIds(history)

  const maxStress =
    recommendation.intensity === 'suave'
      ? 'bajo'
      : recommendation.intensity === 'moderada'
        ? 'medio'
        : 'alto'

  if (recommendation.kind === 'fuerza' || recommendation.kind === 'reacondicionamiento') {
    const groups = recommendation.focus.filter((g) => g !== 'cardio')
    // En fuerza doblamos el grupo prioritario; en la vuelta progresiva repartimos
    // el trabajo por todo el cuerpo con poco volumen en cada zona.
    const plan: MuscleGroup[] =
      recommendation.kind === 'fuerza' && groups.length > 0
        ? [groups[0], groups[0], ...groups.slice(1, 3)]
        : groups.slice(0, 4)

    for (const group of plan) {
      const ex = pickForGroup(group, profile, maxStress, used, recent)
      if (!ex) continue
      used.add(ex.id)
      const rx = repPrescription(profile.goal, recommendation.intensity, keto, isCompound(ex))
      exercises.push({
        exerciseId: ex.id,
        name: ex.name,
        primary: ex.primary,
        plan: {
          sets: setsFor(recommendation.intensity, recommendation.volumeScale),
          reps: rx.reps,
          weightKg: suggestWeight(ex, profile, rx.loadScale, history),
          rir: recommendation.rir,
          restSeconds: rx.restSeconds
        }
      })
    }

    // Un poco de core siempre que la sesión no se haya alargado.
    if (exercises.length < 5 && !used.has('plancha')) {
      const core = pickForGroup('core', profile, 'bajo', used, recent)
      if (core) {
        used.add(core.id)
        exercises.push({
          exerciseId: core.id,
          name: core.name,
          primary: 'core',
          plan: { sets: 2, reps: '30-45 s', rir: recommendation.rir, restSeconds: 60 }
        })
      }
    }
  } else {
    const cardio = cardioExercise(profile, recommendation.kind === 'cardio_medio')
    if (cardio) {
      exercises.push({
        exerciseId: cardio.id,
        name: cardio.name,
        primary: 'cardio',
        plan: { sets: 1, reps: `${recommendation.cardioMinutes ?? 25} min` }
      })
    }
    if (recommendation.kind === 'descanso_activo') {
      exercises.push({
        exerciseId: 'movilidad',
        name: 'Movilidad y estiramientos suaves',
        primary: 'cardio',
        plan: { sets: 1, reps: '10 min' }
      })
    }
  }

  return {
    id: newId(),
    date: todayIso,
    kind: recommendation.kind,
    title: recommendation.title,
    exercises,
    cardioMinutes: recommendation.cardioMinutes,
    completed: false
  }
}
