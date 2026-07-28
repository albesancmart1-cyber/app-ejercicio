/**
 * Meter pesas en una sesión de cardio **ya preparada**.
 *
 * La opción de repartir el día vive en la pantalla de la recomendación, antes
 * de preparar nada. Pero el momento en que a uno le apetece levantar no siempre
 * llega ahí: llega mirando el plan del día, con la sesión ya montada. Sin esta
 * puerta, la única salida era añadir ejercicios a mano de la lista —justo el
 * trabajo que la app existe para quitarte— o descartar la sesión y empezar de
 * cero.
 *
 * Se reutiliza entero el camino de `withSomeStrength`, así que valen los mismos
 * guardas: zonas descansadas, 48 h de recuperación, molestias, rampa de vuelta
 * tras un parón, intensidad contenida y lejos del fallo. Y el cardio se recorta
 * igual, porque el día pasa a llevar las dos cosas.
 */
import { computeReadiness } from './readiness'
import { recommend, withSomeStrength } from './recommender'
import { volumePlan } from './progression'
import { interpretTrend } from './trend'
import { buildSession } from './workoutBuilder'
import type { AppData, MuscleGroup, PlannedExercise, Session } from './types'

export interface PesasParaMeter {
  /** Ejercicios de fuerza elegidos por la app, listos para registrar. */
  exercises: PlannedExercise[]
  /** Minutos a los que queda el cardio una vez repartido el día. */
  cardioMinutes: number
  /** Zonas que se han elegido, para poder decirlo. */
  zonas: MuscleGroup[]
}

/** ¿Tiene sentido ofrecerlo? Solo si el día es de cardio y va corto de fuerza. */
export function puedeMeterPesas(session: Session): boolean {
  if (session.completed) return false
  const cardio = session.exercises.filter((e) => e.primary === 'cardio')
  const fuerza = session.exercises.filter((e) => e.primary !== 'cardio')
  return cardio.length > 0 && fuerza.length < 3
}

/**
 * Calcula qué pesas meter. Devuelve null si no hay check-in del día —sin saber
 * cómo estás no se decide nada— o si no sale ningún ejercicio nuevo.
 */
export function pesasParaMeter(
  data: AppData,
  session: Session,
  todayIso: string
): PesasParaMeter | null {
  const profile = data.profile
  const checkIn = data.checkIns.find((c) => c.date === session.date)
  if (!profile || !checkIn) return null

  const readiness = computeReadiness(checkIn)
  const volumen = volumePlan({
    profile,
    sessions: data.sessions,
    checkIns: data.checkIns,
    trendState: interpretTrend(data.measurements, profile, data.checkIns, data.sessions, todayIso).state,
    todayIso
  })

  // Se parte de lo que la app recomendaría hoy, no de la sesión ya montada: así
  // las zonas salen del balance real y no de lo que hubiera en pantalla.
  const base = recommend(profile, readiness, data.sessions, session.date, volumen)
  const mixta = withSomeStrength(base, profile, readiness, data.sessions, session.date)
  const propuesta = buildSession(mixta, profile, data.sessions, session.date, checkIn.keto)

  const yaEstan = new Set(session.exercises.map((e) => e.exerciseId))
  const exercises = propuesta.exercises.filter(
    (e) => e.primary !== 'cardio' && !yaEstan.has(e.exerciseId)
  )
  if (exercises.length === 0) return null

  const original = session.exercises.find((e) => e.primary === 'cardio')
  const minutosActuales = Number(original?.plan.reps.match(/(\d+)/)?.[1] ?? 0)
  return {
    exercises,
    // Nunca alargar el cardio: si ya estaba por debajo de lo que saldría del
    // reparto, se respeta lo que hay.
    cardioMinutes: Math.min(mixta.cardioMinutes ?? minutosActuales, minutosActuales || Infinity),
    zonas: [...new Set(exercises.map((e) => e.primary))]
  }
}

/**
 * Aplica el reparto a la sesión: las pesas delante, el cardio detrás y con los
 * minutos recortados. Lo ya anotado en los ejercicios que se quedan no se toca.
 */
export function meterPesas(exercises: PlannedExercise[], pesas: PesasParaMeter): PlannedExercise[] {
  const fuerza = exercises.filter((e) => e.primary !== 'cardio')
  const cardio = exercises
    .filter((e) => e.primary === 'cardio')
    .map((e) => ({ ...e, plan: { ...e.plan, reps: `${pesas.cardioMinutes} min` } }))
  return [...fuerza, ...pesas.exercises, ...cardio]
}
