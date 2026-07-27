import { EXERCISES } from '../data/exercises'
import type {
  Equipment,
  Exercise,
  ExerciseVariant,
  MuscleGroup,
  PlannedExercise,
  PlannedSet,
  Profile,
  Recommendation,
  Session
} from './types'
import { BASE_SETS, repPrescription } from './protocol'
import { initLogs, parseRepRange, repVerdict, type RepVerdict } from './setLogs'
import { FACTOR_UNILATERAL, defaultVariant, sameVariant, scaleForSide } from './variants'

let idCounter = 0
function newId(): string {
  idCounter += 1
  return `s-${Date.now().toString(36)}-${idCounter}`
}

export function hasEquipment(exercise: Exercise, owned: Equipment[]): boolean {
  return exercise.equipment.some((eq) => owned.includes(eq) || eq === 'peso_corporal')
}

/** Un básico multiarticular necesita más descanso que un accesorio. */
export function isCompound(exercise: Exercise): boolean {
  return exercise.stress !== 'bajo' && exercise.secondary.length > 0
}

/**
 * Peso máximo disponible entre los equipos válidos para el ejercicio. Si se ha
 * elegido con qué hacerlo, manda ese material: el tope de la polea no tiene por
 * qué ser el de las mancuernas.
 */
function availableMax(exercise: Exercise, profile: Profile, variant?: ExerciseVariant): number | undefined {
  if (variant?.implement && profile.equipment.includes(variant.implement)) {
    const w = profile.maxWeights[variant.implement]
    if (typeof w === 'number' && w > 0) return w
  }
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
  /** Veredicto de las repeticiones registradas, si las hubo. */
  verdict?: RepVerdict
  /** Cómo se hizo aquella vez, para no comparar peras con manzanas. */
  variant?: ExerciseVariant
}

/**
 * La última vez que se hizo este ejercicio **de esta misma forma**. Si nunca se
 * ha hecho así, se admite el registro más reciente sea cual sea la variante:
 * mejor una referencia aproximada, que luego se corrige por el lado, que
 * empezar de cero cada vez que se cambia de agarre.
 */
function lastPerformance(
  exerciseId: string,
  history: Session[],
  variant?: ExerciseVariant
): LastPerformance | undefined {
  const sorted = [...history].filter((s) => s.completed).sort((a, b) => (a.date < b.date ? 1 : -1))
  let cualquiera: LastPerformance | undefined
  for (const s of sorted) {
    const pe = s.exercises.find((p) => p.exerciseId === exerciseId && p.done === true)
    if (!pe) continue
    const registro: LastPerformance = {
      weightKg: pe.actualWeightKg ?? pe.plan.weightKg,
      rpe: s.rpe,
      verdict: repVerdict(pe),
      variant: pe.variant
    }
    if (sameVariant(variant, pe.variant)) return registro
    if (!cualquiera) cualquiera = registro
  }
  return cualquiera
}

/**
 * Peso sugerido. Si ya hay registros, progresa desde el último teniendo en cuenta
 * cómo se sintió esa sesión: si costó mucho, se mantiene la carga.
 */
export function suggestWeight(
  exercise: Exercise,
  profile: Profile,
  loadScale: number,
  history: Session[],
  variant?: ExerciseVariant
): number | undefined {
  const max = availableMax(exercise, profile, variant)
  if (max === undefined || !exercise.loadFactor) return undefined

  const last = lastPerformance(exercise.id, history, variant)
  if (last?.weightKg) {
    // Si el referente es de otra forma de hacerlo, se traduce la carga antes de
    // progresar: la mitad al pasar a un lado, el doble al volver a los dos.
    const base = roundStep(last.weightKg * scaleForSide(variant?.side, last.variant?.side))
    // Cambiar de material o de lado invalida el veredicto: es otro ejercicio a
    // efectos de carga, así que se parte de la traducción sin subir nada.
    if (!sameVariant(variant, last.variant)) return Math.min(base, max)

    // Las repeticiones registradas son dato objetivo: mandan sobre la sensación.
    if (last.verdict === 'mantiene') return Math.min(base, max)
    if (last.verdict === 'sube') {
      const next = Math.max(base + 1, base * 1.05)
      return Math.min(roundStep(next), max)
    }

    // Sin repeticiones registradas, seguimos guiándonos por la sensación.
    const hard = last.rpe !== undefined && last.rpe <= 2
    const easy = last.rpe !== undefined && last.rpe >= 4
    if (hard) return Math.min(base, max)
    const factor = easy ? 1.05 : 1.025
    // Al menos medio kilo, para que la progresión no se quede en nada.
    const next = Math.max(base + 0.5, base * factor)
    return Math.min(roundStep(next), max)
  }
  const estimado = roundWeight(max * exercise.loadFactor * loadScale)
  // A un lado cada vez se mueve alrededor de la mitad del peso total.
  const porLado = variant?.side === 'unilateral' ? roundStep(estimado * FACTOR_UNILATERAL) : estimado
  return Math.min(porLado, max)
}

/** Ejercicios usados en la última sesión, para no repetir siempre lo mismo. */
function recentExerciseIds(history: Session[]): Set<string> {
  const last = [...history]
    .filter((s) => s.completed)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  return new Set(last ? last.exercises.map((e) => e.exerciseId) : [])
}

/**
 * Construye el plan de un ejercicio concreto. Lo usan tanto la creación de la
 * sesión como la sustitución, para que un ejercicio cambiado reciba exactamente
 * el mismo trato que uno propuesto de origen.
 */
export function planFor(
  exercise: Exercise,
  profile: Profile,
  intensity: Recommendation['intensity'],
  volumeScale: number,
  rir: number,
  history: Session[],
  keto: boolean,
  volume?: Recommendation['volume'],
  variant?: ExerciseVariant
): PlannedSet {
  const rx = repPrescription(profile.goal, intensity, keto, isCompound(exercise))
  // El nivel de volumen manda sobre las series base, pero la rampa de vuelta
  // tras un parón sigue teniendo la última palabra: se reduce igual.
  const seriesBase = volume?.setsPerExercise ?? BASE_SETS
  const sets = Math.max(2, Math.round(seriesBase * volumeScale))
  return {
    sets,
    reps: volume?.repBias === 'variado' ? variarRango(rx.reps) : rx.reps,
    weightKg: suggestWeight(exercise, profile, rx.loadScale, history, variant),
    rir,
    restSeconds: rx.restSeconds
  }
}

/**
 * Prepara un ejercicio completo —variante por defecto, plan y series en blanco—
 * para meterlo en una sesión. Lo usan tanto la construcción de la sesión como
 * añadir o cambiar un ejercicio a mano, de modo que un ejercicio elegido por el
 * usuario recibe exactamente el mismo trato que uno propuesto por la app.
 */
export function prepareExercise(
  exercise: Exercise,
  profile: Profile,
  opts: {
    intensity: Recommendation['intensity']
    volumeScale: number
    rir: number
    history: Session[]
    keto: boolean
    volume?: Recommendation['volume']
    variant?: ExerciseVariant
    addedByUser?: boolean
  }
): PlannedExercise {
  const variant = opts.variant ?? defaultVariant(exercise, profile)
  const plan = planFor(
    exercise,
    profile,
    opts.intensity,
    opts.volumeScale,
    opts.rir,
    opts.history,
    opts.keto,
    opts.volume,
    variant
  )
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    primary: exercise.primary,
    plan,
    variant,
    logs: initLogs(plan),
    ...(opts.addedByUser ? { addedByUser: true } : {})
  }
}

export const STRESS_RANK = { bajo: 0, medio: 1, alto: 2 }

/**
 * Desplaza el rango de repeticiones para variar el estímulo cuando el volumen
 * ya está alto y hace falta cambiar algo más que la cantidad.
 */
export function variarRango(reps: string): string {
  const rango = parseRepRange(reps)
  if (!rango) return reps
  return `${rango.min + 4}-${rango.max + 4}`
}

function pickForGroup(
  group: MuscleGroup,
  profile: Profile,
  maxStress: 'bajo' | 'medio' | 'alto',
  exclude: Set<string>,
  recent: Set<string>
): Exercise | undefined {
  const stressRank = STRESS_RANK
  const base = (e: Exercise) =>
    e.primary === group &&
    e.primary !== 'cardio' &&
    !exclude.has(e.id) &&
    hasEquipment(e, profile.equipment) &&
    stressRank[e.stress] <= stressRank[maxStress]

  // Los descartados dejan de proponerse… salvo que descartarlos todos dejara al
  // grupo sin nada. Antes un ejercicio que no entusiasma que una sesión coja.
  const descartados = new Set(profile.dislikedExercises ?? [])
  let candidates = EXERCISES.filter((e) => base(e) && !descartados.has(e.id))
  if (candidates.length === 0) candidates = EXERCISES.filter(base)
  if (candidates.length === 0) return undefined

  // Con un catálogo grande, lo que hace que las sesiones se parezcan a lo que
  // uno quiere entrenar son los favoritos: van primero. Después, no repetir lo
  // de la última sesión —así se rota entre los favoritos en vez de caer siempre
  // en el mismo—, y por último el mayor estímulo permitido.
  const favoritos = new Set(profile.favoriteExercises ?? [])
  candidates.sort((a, b) => {
    const favA = favoritos.has(a.id) ? 0 : 1
    const favB = favoritos.has(b.id) ? 0 : 1
    if (favA !== favB) return favA - favB
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
    // Cuántos ejercicios de fuerza caben, según el nivel de volumen alcanzado.
    const cuantos = recommendation.volume?.exercisesPerSession ?? 4
    // En fuerza doblamos el grupo prioritario; en la vuelta progresiva repartimos
    // el trabajo por todo el cuerpo con poco volumen en cada zona.
    const plan: MuscleGroup[] =
      recommendation.kind === 'fuerza' && groups.length > 0
        ? [groups[0], groups[0], ...groups.slice(1, cuantos - 1)]
        : groups.slice(0, cuantos)

    for (const group of plan) {
      const ex = pickForGroup(group, profile, maxStress, used, recent)
      if (!ex) continue
      used.add(ex.id)
      exercises.push(
        prepareExercise(ex, profile, {
          intensity: recommendation.intensity,
          volumeScale: recommendation.volumeScale,
          rir: recommendation.rir,
          history,
          keto,
          volume: recommendation.volume
        })
      )
    }

    // Un poco de core siempre que la sesión no se haya alargado.
    if (exercises.length < cuantos + 1 && !used.has('plancha')) {
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
    // Cada ejercicio nace con sus series listas para rellenar.
    exercises: exercises.map((pe) => ({ ...pe, logs: initLogs(pe.plan) })),
    cardioMinutes: recommendation.cardioMinutes,
    completed: false
  }
}
