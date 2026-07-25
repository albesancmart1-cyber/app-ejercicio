import type { MuscleGroup, Profile, Recommendation, Session } from './types'
import { MUSCLE_LABELS } from './types'
import type { Readiness } from './readiness'
import {
  computeBalance,
  consecutiveStrengthSessions,
  daysSinceLastSession,
  neglectedGroups
} from './muscleBalance'

const LONG_BREAK_DAYS = 10

/**
 * Decide qué le conviene al cuerpo hoy. Reglas en cascada:
 * 1. Parón largo → reacondicionamiento suave.
 * 2. Readiness bajo → descanso activo.
 * 3. Varias sesiones de fuerza seguidas → cardio.
 * 4. Fuerza priorizando los grupos menos trabajados en 14 días.
 */
export function recommend(
  profile: Profile,
  readiness: Readiness,
  sessions: Session[],
  todayIso: string
): Recommendation {
  const daysSince = daysSinceLastSession(sessions, todayIso)
  const balance = computeBalance(sessions, todayIso)
  const neglected = neglectedGroups(balance, readiness.avoid)
  const canCardioOut = profile.equipment.includes('correr') || profile.equipment.includes('bici')

  // 1. Mucho tiempo sin entrenar (o nunca): volver con suavidad.
  if (daysSince === null || daysSince > LONG_BREAK_DAYS) {
    if (readiness.level === 'bajo') {
      return {
        kind: 'descanso_activo',
        title: 'Vuelta muy suave',
        message:
          'Llevas un tiempo parado y hoy el cuerpo pide calma. Un paseo tranquilo y algo de movilidad son la mejor forma de empezar a volver. No hay prisa.',
        focus: ['cardio'],
        intensity: 'suave',
        cardioMinutes: 20
      }
    }
    return {
      kind: 'reacondicionamiento',
      title: 'Reacondicionamiento',
      message:
        daysSince === null
          ? 'Primera sesión: empezamos suave, con todo el cuerpo, para que se adapte sin estresarse.'
          : `Llevas ${daysSince} días sin entrenar y no pasa nada: hoy toca reencontrarse con el movimiento. ${
              canCardioOut ? 'Cardio muy suave y ' : ''
            }un full-body ligero para reactivar el cuerpo sin agobiarlo.`,
      focus: neglected.slice(0, 4),
      intensity: 'suave',
      cardioMinutes: canCardioOut ? 15 : undefined
    }
  }

  // 2. El cuerpo no está para guerra: descanso activo.
  if (readiness.level === 'bajo') {
    return {
      kind: 'descanso_activo',
      title: 'Descanso activo',
      message:
        'Hoy tu cuerpo pide recuperar, y eso también es entrenar. Un paseo, movilidad suave, y mañana lo vemos con otros ojos. Descansar cuando toca es lo que te hace progresar.',
      focus: ['cardio'],
      intensity: 'suave',
      cardioMinutes: 20
    }
  }

  // 3. Varias sesiones de fuerza seguidas → toca corazón.
  if (consecutiveStrengthSessions(sessions) >= 2 && canCardioOut) {
    const medio = readiness.level === 'alto'
    return {
      kind: medio ? 'cardio_medio' : 'cardio_suave',
      title: medio ? 'Día de cardio' : 'Cardio suave',
      message:
        'Llevas varias sesiones de fuerza seguidas: hoy le damos aire al corazón y descanso a los músculos. ' +
        (profile.equipment.includes('bici') ? 'Bici o ' : '') +
        'carrera a un ritmo en el que puedas hablar.',
      focus: ['cardio'],
      intensity: medio ? 'moderada' : 'suave',
      cardioMinutes: medio ? 35 : 25
    }
  }

  // 4. Fuerza, empezando por lo más descompensado.
  const focus = neglected.slice(0, 3)
  const focusLabel = MUSCLE_LABELS[focus[0] as MuscleGroup].toLowerCase()
  const intensity = readiness.level === 'alto' ? 'media-alta' : 'moderada'
  return {
    kind: 'fuerza',
    title: `Fuerza · prioridad ${focusLabel}`,
    message:
      readiness.level === 'alto'
        ? `Tu cuerpo está receptivo. Estos días ha quedado atrás ${focusLabel}, así que hoy empezamos por ahí para mantener el equilibrio.`
        : `Sesión de fuerza tranquila, empezando por ${focusLabel}, que es lo que más lo necesita. Sin buscar el fallo: lo justo para estimular sin estresar.`,
    focus,
    intensity
  }
}
