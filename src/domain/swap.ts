/**
 * Cambiar un ejercicio que no encaja.
 *
 * A veces el ejercicio propuesto no sirve: no gusta, o no se tiene con qué
 * hacerlo. Tocar «cambiar» **sustituye directamente**, sin pedirle al usuario
 * que elija de una lista de cien: para eso está la app. Y cada toque trae uno
 * distinto hasta agotar las opciones, en vez de ir y venir entre los dos mismos.
 *
 * El sustituto trabaja **los mismos músculos**, no el mismo grupo grueso: eso
 * era lo que permitía que cambiar un curl te devolviera un tríceps. Dentro de
 * los que valen, mandan los que te gustan —marcados a mano o aprendidos de lo
 * que entrenas— y después los que lo trabajan de otra manera, que es lo que uno
 * busca al cambiar.
 */
import { EXERCISES } from '../data/exercises'
import { patternOf } from '../data/patterns'
import { contributionsOf } from '../data/contributions'
import { pesoDePreferencia } from './affinity'
import { initLogs } from './setLogs'
import { STRESS_RANK, hasEquipment, planFor, prepareExercise } from './workoutBuilder'
import type { Muscle } from './muscles'
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

/** Los músculos que un ejercicio mueve como motor principal. */
function motoresDe(exerciseId: string, aporte?: PlannedExercise['muscleContributions']): Muscle[] {
  const mapa = aporte ?? contributionsOf(exerciseId)
  return (Object.keys(mapa) as Muscle[]).filter((m) => mapa[m] === 1)
}

/**
 * Alternativas para un ejercicio, de más a menos recomendable.
 *
 * Excluye las que ya están en la sesión y las que se hayan descartado en esta
 * misma ronda (`yaVistos`), que es lo que evita el bucle entre dos: sin eso, al
 * cambiar A por B el siguiente toque devolvía A, porque A ya no estaba en la
 * sesión y volvía a ser candidato.
 */
export function alternativesFor(
  pe: PlannedExercise,
  profile: Profile,
  session: Session,
  maxStress: StressLevel = 'alto',
  yaVistos: string[] = []
): Exercise[] {
  const fuera = new Set([...session.exercises.map((e) => e.exerciseId), ...yaVistos])
  const patronActual = patternOf(pe.exerciseId)
  const motores = motoresDe(pe.exerciseId, pe.muscleContributions)
  const descartados = new Set(profile.dislikedExercises ?? [])

  /**
   * Cuánto cubre este ejercicio de lo que movía el original.
   *
   * Dos puntos si lo mueve como motor principal y uno si lo acompaña. Los de
   * acompañante entran a propósito: hay músculos con solo dos o tres ejercicios
   * directos en todo el catálogo —el bíceps, con mancuernas y poco más— y sin
   * ellos cambiar se convertía justo en el bucle entre dos que hay que evitar.
   * Salen después de los directos, nunca por delante.
   */
  const cubre = (e: Exercise) => {
    if (motores.length === 0) return e.primary === pe.primary ? 2 : 0
    const suyos = contributionsOf(e.id)
    return motores.reduce((a, m) => a + (suyos[m] === 1 ? 2 : suyos[m] ? 1 : 0), 0)
  }

  const sirve = (e: Exercise) =>
    e.id !== pe.exerciseId &&
    e.primary !== 'cardio' &&
    !fuera.has(e.id) &&
    hasEquipment(e, profile.equipment) &&
    STRESS_RANK[e.stress] <= STRESS_RANK[maxStress] &&
    cubre(e) > 0

  // Los descartados a mano no vuelven… salvo que sin ellos no quede nada.
  let candidatos = EXERCISES.filter((e) => sirve(e) && !descartados.has(e.id))
  if (candidatos.length === 0) candidatos = EXERCISES.filter(sirve)

  return candidatos.sort((a, b) => {
    // 1. Que haga el trabajo: primero los que mueven esos músculos de verdad.
    //    Va por delante del gusto a propósito —un sustituto que te encanta pero
    //    que no trabaja lo que tocaba no es un sustituto.
    if (cubre(a) !== cubre(b)) return cubre(b) - cubre(a)
    // 2. Entre los que sirven igual, lo que sabemos que te gusta: favoritos
    //    marcados y afinidad aprendida de lo que entrenas y de lo que cambias.
    const prefA = pesoDePreferencia(profile, a.id)
    const prefB = pesoDePreferencia(profile, b.id)
    if (prefA !== prefB) return prefB - prefA
    // 3. Que lo trabaje de otra manera, que es a lo que se cambia.
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
 * El catálogo completo para elegir a mano, ordenado como conviene mirarlo: lo
 * que sabemos que te gusta primero —marcado o aprendido— y después el resto por
 * nombre. Los que ya están en la sesión se marcan para no repetirlos sin darse
 * cuenta.
 */
export function catalogFor(
  profile: Profile,
  opts: { group?: MuscleGroup; onlyOwned?: boolean; search?: string } = {}
): Exercise[] {
  const preferencia = (id: string) => pesoDePreferencia(profile, id)
  const busqueda = normalizar(opts.search ?? '')

  return EXERCISES.filter((e) => {
    if (opts.group && e.primary !== opts.group) return false
    if (opts.onlyOwned !== false && !hasEquipment(e, profile.equipment)) return false
    if (busqueda && !normalizar(e.name).includes(busqueda)) return false
    return true
  }).sort((a, b) => {
    const prefA = preferencia(a.id)
    const prefB = preferencia(b.id)
    if (prefA !== prefB) return prefB - prefA
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
 * La siguiente alternativa al tocar «cambiar».
 *
 * Con `yaVistos` se recorren todas antes de repetir ninguna. Cuando se agotan,
 * se empieza otra vez desde el principio en vez de dejar el botón muerto: puede
 * que en la segunda vuelta lo que no encajaba a la primera ya sirva.
 */
export function nextAlternative(
  pe: PlannedExercise,
  profile: Profile,
  session: Session,
  maxStress: StressLevel = 'alto',
  yaVistos: string[] = []
): Exercise | undefined {
  const opciones = alternativesFor(pe, profile, session, maxStress, yaVistos)
  if (opciones.length > 0) return opciones[0]
  return alternativesFor(pe, profile, session, maxStress)[0]
}
