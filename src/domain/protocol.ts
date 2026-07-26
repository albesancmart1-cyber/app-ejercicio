/**
 * Parámetros de entrenamiento basados en evidencia.
 *
 * Fuentes principales:
 * - CSCCa/NSCA Joint Consensus Guidelines for Transition Periods (Strength Cond J, 2019):
 *   regla 50/30/20/10 — reducción progresiva del volumen durante las primeras 2–4 semanas
 *   tras un periodo de inactividad.
 * - Refalo et al. (2023) y Grgic et al. (2018), meta-análisis de proximidad al fallo:
 *   parar a 1–3 repeticiones en reserva produce prácticamente la misma hipertrofia que
 *   llegar al fallo, con bastante menos fatiga.
 * - Schoenfeld et al., meta-regresiones de dosis-respuesta: ~4 series semanales por grupo
 *   muscular ya producen ganancias sustanciales; 10–20 maximizan. Frecuencia 2×/semana
 *   iguala o supera a 1×/semana a volumen equiparado.
 * - ISSN Position Stand: Ketogenic Diets (JISSN, 2024): la cetosis no compromete la fuerza
 *   máxima, pero sí el trabajo glucolítico de altas repeticiones; construir músculo exige
 *   proteína alta y que el cuerpo perciba disponibilidad energética suficiente —lo que aquí
 *   se gestiona por la señal de leptina, en `leptin.ts`, y no contando calorías.
 * - Vargas-Molina et al. (2024), meta-análisis de dieta cetogénica y fuerza.
 * - Guías de entrenamiento concurrente: separar cardio y fuerza ≥6 h, o hacer la fuerza
 *   primero si van el mismo día.
 */
import type { Goal } from './types'

/** Días sin entrenar a partir de los cuales se considera un parón real. */
export const LONG_BREAK_DAYS = 10

/** Horas de recuperación recomendadas antes de volver a castigar un mismo grupo. */
export const MUSCLE_RECOVERY_DAYS = 2

/** Series semanales por grupo muscular: mínimo eficaz y banda objetivo. */
export const WEEKLY_SETS = { minimoEficaz: 4, objetivo: 10, techo: 20 }

/**
 * Escalado de volumen tras un parón (regla 50/30/20/10: se reduce el volumen
 * un 50 % la primera sesión, 30 % la segunda, 20 % la tercera y 10 % la cuarta).
 */
export const REENTRY_VOLUME_SCALE = [0.5, 0.7, 0.8, 0.9]

/** Cuántos pasos de vuelta progresiva corresponden a un parón de N días. */
export function reentrySteps(daysOff: number): number {
  if (daysOff <= LONG_BREAK_DAYS) return 0
  if (daysOff <= 21) return 2
  if (daysOff <= 60) return 3
  return 4
}

/**
 * Repeticiones en reserva objetivo. Cuanto más lejos del fallo, menos fatiga
 * y menos daño muscular para un estímulo casi idéntico.
 */
export function targetRir(opts: { reentryStep?: number; intensity: Intensity }): number {
  if (opts.reentryStep !== undefined) return 4 // vuelta: siempre lejos del fallo
  if (opts.intensity === 'suave') return 4
  if (opts.intensity === 'moderada') return 3
  return 2
}

export type Intensity = 'suave' | 'moderada' | 'media-alta'

export interface RepPrescription {
  reps: string
  restSeconds: number
  loadScale: number
}

/**
 * Rangos de repeticiones por objetivo. En cetosis se evita el trabajo glucolítico
 * de muy altas repeticiones (>15) con descansos cortos: es el que más se resiente
 * con el glucógeno muscular bajo. Se compensa con algo más de carga y más descanso.
 */
export function repPrescription(
  goal: Goal,
  intensity: Intensity,
  keto: boolean,
  compound: boolean
): RepPrescription {
  let reps: string
  let loadScale: number

  if (goal === 'masa') {
    reps = '6-10'
    loadScale = 1.0
  } else if (goal === 'tonificar') {
    // Sin cetosis admitimos rangos altos; en cetosis los acortamos.
    reps = keto ? '10-12' : '12-15'
    loadScale = keto ? 0.8 : 0.7
  } else {
    reps = '8-12'
    loadScale = 0.85
  }

  if (intensity === 'suave') {
    reps = keto ? '8-10' : '10-12'
    loadScale *= 0.6
  } else if (intensity === 'moderada') {
    loadScale *= 0.87
  }

  // Descanso: más largo en básicos y en cetosis (resíntesis de fosfocreatina
  // sin apoyo glucolítico), para sostener la calidad de las series.
  let restSeconds = compound ? 150 : 90
  if (keto) restSeconds += 30

  return { reps, restSeconds, loadScale }
}

/**
 * Series por ejercicio. Partimos siempre de 3 (volumen de trabajo normal) y es
 * el escalado de la vuelta progresiva el que reduce, no la intensidad: si no,
 * se recorta dos veces y la sesión se queda en nada. Nunca bajamos de 2 series.
 */
export const BASE_SETS = 3

export function setsFor(_intensity: Intensity, volumeScale: number): number {
  return Math.max(2, Math.round(BASE_SETS * volumeScale))
}

/** Semanas de adaptación a la cetosis durante las que el rendimiento aún se resiente. */
export const KETO_ADAPTATION_WEEKS = 6

export function ketoAdaptationWeeksLeft(ketoSince: string | undefined, todayIso: string): number {
  if (!ketoSince) return 0
  const start = new Date(ketoSince + 'T12:00:00').getTime()
  const today = new Date(todayIso + 'T12:00:00').getTime()
  const weeks = (today - start) / (7 * 86_400_000)
  if (weeks < 0) return 0
  return Math.max(0, Math.ceil(KETO_ADAPTATION_WEEKS - weeks))
}

/**
 * Proteína diaria recomendada (g/día) según peso y objetivo. Es la única cifra que
 * la app pide vigilar: lo demás se regula comiendo hasta saciedad real.
 */
export function proteinTarget(weightKg: number, goal: Goal): { min: number; max: number } {
  // 1,6–2,2 g/kg de base; hasta 2,3–3,1 g/kg si se busca perder grasa conservando músculo.
  const [lo, hi] = goal === 'recomposicion' ? [2.0, 2.6] : goal === 'masa' ? [1.8, 2.2] : [1.6, 2.0]
  return { min: Math.round(weightKg * lo), max: Math.round(weightKg * hi) }
}
