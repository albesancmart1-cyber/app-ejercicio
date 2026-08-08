/**
 * Motor de conteo fraccional de volumen.
 *
 * El volumen semanal de un músculo es la suma, sobre los últimos 7 días, de
 * cada **serie efectiva** multiplicada por lo que ese ejercicio le aporta:
 * entera si es motor primario, media si es sinergista.
 *
 * Qué cuenta como serie efectiva:
 *
 * - **Está hecha.** Una serie planificada y no marcada no ha estimulado nada.
 * - **No es calentamiento.** Se excluyen las marcadas como tal.
 * - **Va cerca del fallo.** Con más de 3 repeticiones en reserva el estímulo
 *   por serie cae lo bastante como para que sumarla entera desvirtúe la cuenta
 *   (`RIR_EFECTIVO`). Las series de la rampa de vuelta tras un parón, que van a
 *   4 y 5, se quedan fuera a propósito: son de rodaje.
 *
 * El cardio no entra: no tiene mapa de contribuciones y su dosis se lleva en
 * minutos, no en series.
 */
import { contributionsOf } from '../data/contributions'
import { daysBetween } from './muscleBalance'
import { ALL_MUSCLES, MUSCLES, REGIONS, musclesOf } from './muscles'
import type { Muscle, Region, VolumeLandmarks } from './muscles'
import type { PlannedExercise, Session } from './types'
import { esCalentamiento, pesoEnVolumen, rirDe } from './setLogs'

/** Ventana de conteo: el volumen es un asunto semanal. */
export const VENTANA_DIAS = 7

/**
 * Tope de repeticiones en reserva para que una serie cuente entera. Por encima
 * de 3 el estímulo por serie baja lo suficiente como para que meterla en el
 * mismo saco infle la cuenta.
 */
export const RIR_EFECTIVO = 3

export type MuscleVolume = Record<Muscle, number>

/**
 * Cuántas series efectivas tiene un ejercicio ya registrado.
 *
 * **Manda el RIR anotado, no el prescrito.** El plan dice a cuánto del fallo
 * había que quedarse, pero es una intención: si el plan pedía quedarse a dos y
 * la serie acabó al fallo, el estímulo fue el de una serie al fallo. Cuando hay
 * RIR real anotado se cuenta serie a serie con él; cuando no lo hay —registros
 * de antes de que se pudiera anotar— se cae al del plan, que es la mejor
 * estimación disponible.
 */
export function seriesEfectivas(pe: PlannedExercise): number {
  const logs = pe.logs
  if (!logs || logs.length === 0) {
    // Registro antiguo sin series: se usa el marcador de ejercicio completado.
    if (pe.plan.rir !== undefined && pe.plan.rir > RIR_EFECTIVO) return 0
    return pe.done === true ? pe.plan.sets : 0
  }

  // Cada serie aporta según su tipo —el calentamiento nada, el drop set media—
  // y solo si se llevó lo bastante cerca del fallo. `rirDe` resuelve de dónde
  // sale ese RIR: el anotado, el cero implícito de una serie al fallo, o el del
  // plan como última estimación.
  const total = logs
    .filter((l) => l.done && !esCalentamiento(l))
    .reduce((acc, l) => {
      const rir = rirDe(l, pe.plan.rir)
      if (rir !== undefined && rir > RIR_EFECTIVO) return acc
      return acc + pesoEnVolumen(l)
    }, 0)

  return Math.round(total * 2) / 2
}

/** Volumen fraccional que aporta un ejercicio, músculo a músculo. */
export function volumenDe(pe: PlannedExercise): Partial<MuscleVolume> {
  const series = seriesEfectivas(pe)
  if (series === 0) return {}
  const aporte = pe.muscleContributions ?? contributionsOf(pe.exerciseId)
  const out: Partial<MuscleVolume> = {}
  for (const [musculo, factor] of Object.entries(aporte)) {
    if (!factor) continue
    out[musculo as Muscle] = series * factor
  }
  return out
}

function vacio(): MuscleVolume {
  return Object.fromEntries(ALL_MUSCLES.map((m) => [m, 0])) as MuscleVolume
}

/**
 * Volumen semanal por músculo. Solo sesiones completadas dentro de la ventana.
 */
export function weeklyMuscleVolume(
  sessions: Session[],
  todayIso: string,
  dias = VENTANA_DIAS
): MuscleVolume {
  const total = vacio()
  for (const s of sessions) {
    if (!s.completed) continue
    const edad = daysBetween(s.date, todayIso)
    if (edad < 0 || edad >= dias) continue
    for (const pe of s.exercises) {
      for (const [musculo, cuanto] of Object.entries(volumenDe(pe))) {
        total[musculo as Muscle] += cuanto!
      }
    }
  }
  // Los decimales de coma flotante ensucian la suma de medias series.
  for (const m of ALL_MUSCLES) total[m] = Math.round(total[m] * 2) / 2
  return total
}

/**
 * Series que se han hecho pero no cuentan, por quedarse a más de
 * `RIR_EFECTIVO` repeticiones del fallo.
 *
 * Hace falta para poder explicarlo: en una vuelta progresiva se trabaja a RIR 4
 * a propósito, y entonces el volumen sale a cero en todos los músculos. Sin una
 * frase que lo diga, la vista parece rota cuando en realidad está describiendo
 * bien una semana de rodaje.
 */
export function seriesFueraDeCuenta(
  sessions: Session[],
  todayIso: string,
  dias = VENTANA_DIAS
): number {
  let fuera = 0
  for (const s of sessions) {
    if (!s.completed) continue
    const edad = daysBetween(s.date, todayIso)
    if (edad < 0 || edad >= dias) continue
    for (const pe of s.exercises) {
      if (pe.plan.rir === undefined || pe.plan.rir <= RIR_EFECTIVO) continue
      if (Object.keys(pe.muscleContributions ?? contributionsOf(pe.exerciseId)).length === 0) continue
      const hechas = pe.logs
        ? pe.logs.filter((l) => l.done && !l.warmup).length
        : pe.done === true
          ? pe.plan.sets
          : 0
      fuera += hechas
    }
  }
  return fuera
}

/** El desglose de series directas e indirectas, para poder explicarlo. */
export interface Desglose {
  directas: number
  indirectas: number
  total: number
}

export function desglosePorMusculo(
  sessions: Session[],
  todayIso: string,
  musculo: Muscle,
  dias = VENTANA_DIAS
): Desglose {
  let directas = 0
  let indirectas = 0
  for (const s of sessions) {
    if (!s.completed) continue
    const edad = daysBetween(s.date, todayIso)
    if (edad < 0 || edad >= dias) continue
    for (const pe of s.exercises) {
      const factor = (pe.muscleContributions ?? contributionsOf(pe.exerciseId))[musculo]
      if (!factor) continue
      const series = seriesEfectivas(pe)
      if (factor === 1) directas += series
      else indirectas += series
    }
  }
  return { directas, indirectas, total: Math.round((directas + indirectas * 0.5) * 2) / 2 }
}

/** Suma de una región: para enseñarla plegada, nunca para juzgar volumen. */
export function volumenPorRegion(volumen: MuscleVolume): Record<Region, number> {
  return Object.fromEntries(
    REGIONS.map((r) => [r, musclesOf(r).reduce((a, m) => a + volumen[m], 0)])
  ) as Record<Region, number>
}

export type VolumeZone = 'bajo' | 'suficiente' | 'optimo' | 'alto' | 'excesivo'

export const ZONE_LABELS: Record<VolumeZone, string> = {
  bajo: 'Por debajo del mínimo',
  suficiente: 'Suficiente para sostener',
  optimo: 'En la banda que más rinde',
  alto: 'Por encima de lo que rinde, aún recuperable',
  excesivo: 'Por encima de lo que puedes recuperar'
}

/**
 * En qué zona cae un volumen respecto a los landmarks de su músculo.
 *
 * `alto` —entre el MAV y el MRV— existe porque el tramo tiene significado
 * propio: son series que ya no rinden más, pero que todavía se recuperan. No es
 * un problema como pasarse del MRV, pero tampoco es donde conviene estar, y
 * pintarlo del mismo color que la banda buena lo escondería.
 */
export function zonaDe(series: number, l: VolumeLandmarks): VolumeZone {
  if (series < l.mev) return 'bajo'
  if (series < l.mavMin) return 'suficiente'
  if (series <= l.mavMax) return 'optimo'
  return series > l.mrv ? 'excesivo' : 'alto'
}

/**
 * Series fraccionales en texto: una cifra decimal y coma, que es como se
 * escriben los decimales en español. «10,5 series».
 */
export function formatSeries(series: number): string {
  return series.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/**
 * Lo que cambiaría el volumen semanal al meter un ejercicio en la rutina, para
 * poder enseñarlo antes de añadirlo.
 */
export function impactoDeAnadir(
  actual: MuscleVolume,
  pe: PlannedExercise
): { musculo: Muscle; antes: number; despues: number }[] {
  // El impacto se calcula sobre las series planificadas: aún no hay nada hecho.
  const series = pe.plan.sets
  const aporte = pe.muscleContributions ?? contributionsOf(pe.exerciseId)
  return Object.entries(aporte)
    .filter(([, f]) => f)
    .map(([m, f]) => {
      const musculo = m as Muscle
      return {
        musculo,
        antes: actual[musculo],
        despues: Math.round((actual[musculo] + series * f!) * 2) / 2
      }
    })
    .sort((a, b) => b.despues - b.antes - (a.despues - a.antes))
}

export { MUSCLES }
