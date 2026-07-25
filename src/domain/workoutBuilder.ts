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

let idCounter = 0
function newId(): string {
  idCounter += 1
  return `s-${Date.now().toString(36)}-${idCounter}`
}

function hasEquipment(exercise: Exercise, owned: Equipment[]): boolean {
  return exercise.equipment.some((eq) => owned.includes(eq) || eq === 'peso_corporal')
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

function roundWeight(kg: number): number {
  return Math.max(1, Math.round(kg / 2.5) * 2.5)
}

interface RepScheme {
  sets: number
  reps: string
  loadScale: number // multiplicador sobre el loadFactor base
}

function repScheme(profile: Profile, intensity: Recommendation['intensity']): RepScheme {
  const base: RepScheme =
    profile.goal === 'masa'
      ? { sets: 3, reps: '6-10', loadScale: 1.0 }
      : profile.goal === 'tonificar'
        ? { sets: 3, reps: '12-15', loadScale: 0.75 }
        : { sets: 3, reps: '8-12', loadScale: 0.85 }

  if (intensity === 'suave') return { sets: 2, reps: '10-12', loadScale: base.loadScale * 0.6 }
  if (intensity === 'moderada') return { ...base, loadScale: base.loadScale * 0.85 }
  return base
}

/** Peso sugerido: parte del catálogo y, si ya hay registros, progresa suave desde el último. */
function suggestWeight(
  exercise: Exercise,
  profile: Profile,
  scheme: RepScheme,
  history: Session[]
): number | undefined {
  if (exercise.bodyweightOnly && availableMax(exercise, profile) === undefined) return undefined
  const max = availableMax(exercise, profile)
  if (max === undefined || !exercise.loadFactor) return undefined

  // Último peso usado en este ejercicio.
  let last: number | undefined
  for (const s of [...history].sort((a, b) => (a.date < b.date ? 1 : -1))) {
    const pe = s.exercises.find((p) => p.exerciseId === exercise.id && p.done !== false)
    if (pe?.actualWeightKg) {
      last = pe.actualWeightKg
      break
    }
  }

  if (last) {
    // Progresión conservadora: +2.5% aprox, sin pasar del material disponible.
    return Math.min(roundWeight(last * 1.025), max)
  }
  return Math.min(roundWeight(max * exercise.loadFactor * scheme.loadScale), max)
}

function pickForGroup(
  group: MuscleGroup,
  profile: Profile,
  maxStress: 'bajo' | 'medio' | 'alto',
  exclude: Set<string>
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
  // Preferimos el ejercicio de mayor estímulo permitido (mejor dosis por ejercicio).
  candidates.sort((a, b) => stressRank[b.stress] - stressRank[a.stress])
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
  todayIso: string
): Session {
  const scheme = repScheme(profile, recommendation.intensity)
  const exercises: PlannedExercise[] = []
  const used = new Set<string>()

  const maxStress =
    recommendation.intensity === 'suave'
      ? 'bajo'
      : recommendation.intensity === 'moderada'
        ? 'medio'
        : 'alto'

  if (recommendation.kind === 'fuerza' || recommendation.kind === 'reacondicionamiento') {
    // 2 ejercicios del grupo prioritario, 1 de cada grupo siguiente, + core si cabe.
    const [first, ...rest] = recommendation.focus.filter((g) => g !== 'cardio')
    const plan: MuscleGroup[] = first ? [first, first, ...rest.slice(0, 3)] : rest.slice(0, 4)
    for (const group of plan) {
      const ex = pickForGroup(group, profile, maxStress, used)
      if (!ex) continue
      used.add(ex.id)
      exercises.push({
        exerciseId: ex.id,
        name: ex.name,
        primary: ex.primary,
        plan: {
          sets: recommendation.kind === 'reacondicionamiento' ? 2 : scheme.sets,
          reps: scheme.reps,
          weightKg: suggestWeight(ex, profile, scheme, history)
        }
      })
    }
    if (!used.has('plancha') && exercises.length < 5) {
      const core = pickForGroup('core', profile, 'bajo', used)
      if (core) {
        exercises.push({
          exerciseId: core.id,
          name: core.name,
          primary: 'core',
          plan: { sets: 2, reps: '30-45 s' }
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
