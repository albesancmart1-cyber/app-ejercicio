/**
 * Cambiar un ejercicio que no encaja.
 *
 * A veces el ejercicio propuesto no sirve: no gusta, o no se tiene con qué
 * hacerlo. La sustitución busca otro **del mismo grupo muscular pero que trabaje
 * de otra manera**, y para eso se apoya en los patrones de movimiento: se
 * prefieren primero los de un patrón distinto al del ejercicio que se descarta.
 */
import { EXERCISES } from '../data/exercises'
import { patternOf } from '../data/patterns'
import { initLogs } from './setLogs'
import { STRESS_RANK, hasEquipment, planFor, prepareExercise } from './workoutBuilder'
import type {
  Exercise,
  ExerciseVariant,
  MuscleGroup,
  PlannedExercise,
  Profile,
  Recommendation,
  Session,
  StressLevel
} from './types'

/**
 * Alternativas para un ejercicio, ordenadas por lo distintas que son.
 * Excluye las que ya están en la sesión, para no acabar repitiendo.
 */
export function alternativesFor(
  pe: PlannedExercise,
  profile: Profile,
  session: Session,
  maxStress: StressLevel = 'alto'
): Exercise[] {
  const enSesion = new Set(session.exercises.map((e) => e.exerciseId))
  const patronActual = patternOf(pe.exerciseId)

  const candidatos = EXERCISES.filter(
    (e) =>
      e.primary === pe.primary &&
      e.id !== pe.exerciseId &&
      !enSesion.has(e.id) &&
      hasEquipment(e, profile.equipment) &&
      STRESS_RANK[e.stress] <= STRESS_RANK[maxStress]
  )

  // Primero los que trabajan el grupo de otra forma, que es lo que se busca al
  // cambiar; después el resto, para no quedarse sin opciones.
  return candidatos.sort((a, b) => {
    const distintoA = patternOf(a.id) !== patronActual ? 0 : 1
    const distintoB = patternOf(b.id) !== patronActual ? 0 : 1
    if (distintoA !== distintoB) return distintoA - distintoB
    return a.name.localeCompare(b.name, 'es')
  })
}

/**
 * Sustituye el ejercicio recalculando su plan: el peso depende del factor de
 * carga del nuevo ejercicio y del material disponible, y el descanso de si es
 * básico o accesorio. Las series vuelven a empezar en blanco.
 */
export function swapExercise(
  pe: PlannedExercise,
  next: Exercise,
  profile: Profile,
  history: Session[],
  opts: { intensity: Recommendation['intensity']; volumeScale: number; keto: boolean }
): PlannedExercise {
  const sustituto = prepareExercise(next, profile, {
    intensity: opts.intensity,
    volumeScale: opts.volumeScale,
    rir: pe.plan.rir ?? 2,
    history,
    keto: opts.keto,
    addedByUser: pe.addedByUser
  })
  // Se conserva el número de series planificado: cambia el ejercicio, no la dosis.
  const plan = { ...sustituto.plan, sets: pe.plan.sets }
  return { ...sustituto, plan, logs: initLogs(plan) }
}

/**
 * Cambiar cómo se hace el ejercicio —de mancuerna a polea, de dos brazos a uno—
 * recalcula el peso sugerido, porque la carga de una forma no es la de la otra.
 * Lo ya anotado se conserva: cambiar el agarre no borra las series hechas.
 */
export function changeVariant(
  pe: PlannedExercise,
  variant: ExerciseVariant,
  profile: Profile,
  history: Session[],
  opts: { intensity: Recommendation['intensity']; volumeScale: number; keto: boolean }
): PlannedExercise {
  const exercise = EXERCISES.find((e) => e.id === pe.exerciseId)
  if (!exercise) return { ...pe, variant }
  const plan = planFor(
    exercise,
    profile,
    opts.intensity,
    opts.volumeScale,
    pe.plan.rir ?? 2,
    history,
    opts.keto,
    undefined,
    variant
  )
  return { ...pe, variant, plan: { ...plan, sets: pe.plan.sets, reps: pe.plan.reps } }
}

/**
 * El catálogo completo para elegir a mano, ordenado como conviene mirarlo:
 * favoritos primero, después el resto por nombre. Los que ya están en la sesión
 * se marcan para no repetirlos sin darse cuenta.
 */
export function catalogFor(
  profile: Profile,
  opts: { group?: MuscleGroup; onlyOwned?: boolean; search?: string } = {}
): Exercise[] {
  const favoritos = new Set(profile.favoriteExercises ?? [])
  const busqueda = normalizar(opts.search ?? '')

  return EXERCISES.filter((e) => {
    if (opts.group && e.primary !== opts.group) return false
    if (opts.onlyOwned !== false && !hasEquipment(e, profile.equipment)) return false
    if (busqueda && !normalizar(e.name).includes(busqueda)) return false
    return true
  }).sort((a, b) => {
    const favA = favoritos.has(a.id) ? 0 : 1
    const favB = favoritos.has(b.id) ? 0 : 1
    if (favA !== favB) return favA - favB
    return a.name.localeCompare(b.name, 'es')
  })
}

/** Búsqueda tolerante con las tildes: «biceps» encuentra «bíceps». */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Siguiente alternativa rotando, para que tocar el botón varias veces recorra
 * las opciones y vuelva a empezar en lugar de quedarse atascado.
 */
export function nextAlternative(
  pe: PlannedExercise,
  profile: Profile,
  session: Session,
  maxStress: StressLevel = 'alto'
): Exercise | undefined {
  const opciones = alternativesFor(pe, profile, session, maxStress)
  return opciones[0]
}
