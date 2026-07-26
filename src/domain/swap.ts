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
import { STRESS_RANK, hasEquipment, planFor } from './workoutBuilder'
import type { Exercise, PlannedExercise, Profile, Recommendation, Session, StressLevel } from './types'

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
  const plan = planFor(
    next,
    profile,
    opts.intensity,
    opts.volumeScale,
    pe.plan.rir ?? 2,
    history,
    opts.keto
  )
  // Se conserva el número de series planificado: cambia el ejercicio, no la dosis.
  plan.sets = pe.plan.sets
  return {
    exerciseId: next.id,
    name: next.name,
    primary: next.primary,
    plan,
    logs: initLogs(plan)
  }
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
