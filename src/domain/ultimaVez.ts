/**
 * Qué hiciste la última vez en este mismo ejercicio.
 *
 * Es lo que convierte el historial en algo útil mientras entrenas. Llegar a la
 * barra sin saber con qué peso y cuántas repeticiones la dejaste la semana
 * pasada obliga a adivinar, y adivinar hacia abajo es la forma más silenciosa
 * de no progresar nunca.
 *
 * Se guardan **las series una a una**, no un resumen: la referencia que sirve
 * para la tercera serie es la tercera serie de aquel día, no la media. Y va
 * congelado dentro de la sesión al construirla, para que abrir el entreno de
 * hace un mes siga enseñando lo que se veía entonces.
 */
import { sameVariant } from './variants'
import { esCalentamiento } from './setLogs'
import type { ExerciseVariant, Session, SetLog } from './types'

export interface UltimaVez {
  /** Cuándo fue. */
  date: string
  /** Las series que contaron, en orden, con su peso, repeticiones y RIR. */
  series: SetLog[]
  /** RIR real medio de aquellas series, si se anotó alguno. */
  rirMedio?: number
  /** Se hizo de otra forma —otro material o a un lado cada vez—. */
  otraForma?: boolean
}

/** Las series que cuentan como trabajo: hechas y sin ser calentamiento. */
function seriesDeTrabajo(logs: SetLog[] | undefined): SetLog[] {
  return (logs ?? []).filter((l) => l.done && !esCalentamiento(l))
}

export function rirMedioDe(series: SetLog[]): number | undefined {
  const anotados = series.map((l) => l.rir).filter((r): r is number => typeof r === 'number')
  if (anotados.length === 0) return undefined
  return Math.round((anotados.reduce((a, b) => a + b, 0) / anotados.length) * 10) / 10
}

/**
 * La última vez que se hizo este ejercicio, de la más reciente hacia atrás.
 *
 * Se prefiere la que se hizo de la misma forma —mismo material, mismo lado—,
 * porque comparar un press a un brazo con uno a dos no dice nada. Si nunca se
 * hizo así, se devuelve la que haya marcada como de otra forma, que sigue
 * siendo mejor referencia que ninguna siempre que se avise.
 */
export function ultimaVezDe(
  exerciseId: string,
  history: Session[],
  variant?: ExerciseVariant
): UltimaVez | undefined {
  const ordenadas = [...history]
    .filter((s) => s.completed)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  let deOtraForma: UltimaVez | undefined

  for (const s of ordenadas) {
    for (const pe of s.exercises) {
      if (pe.exerciseId !== exerciseId) continue
      const series = seriesDeTrabajo(pe.logs)
      // Una sesión antigua sin registro serie a serie no sirve de referencia:
      // no hay repeticiones que enseñar, solo que se hizo.
      if (series.length === 0) continue

      const encontrada: UltimaVez = {
        date: s.date,
        series: series.map((l) => ({ ...l })),
        rirMedio: rirMedioDe(series)
      }
      if (sameVariant(variant, pe.variant)) return encontrada
      if (!deOtraForma) deOtraForma = { ...encontrada, otraForma: true }
    }
  }

  return deOtraForma
}

function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`)
  const b = Date.parse(`${hasta}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

/** «hace 5 días», «ayer», «hoy». */
export function cuandoFue(date: string, hoyIso: string): string {
  const d = diasEntre(date, hoyIso)
  if (d <= 0) return 'hoy'
  if (d === 1) return 'ayer'
  return `hace ${d} días`
}

/** Una serie en corto: «22 kg × 10», o «× 12» si va sin peso. */
export function describirSerie(l: SetLog): string {
  const reps = l.reps !== undefined ? `×${l.reps}` : '×—'
  return l.weightKg !== undefined ? `${l.weightKg}${reps}` : reps
}

/**
 * La línea que se lee mientras entrenas: qué hiciste y cuándo.
 *
 * Se enumeran las series en vez de dar una media porque lo que interesa es la
 * forma de la serie: «22×10, 22×9, 22×8» dice que la última costó, y «22×10,
 * 22×10, 22×10» dice que sobra peso. La media borra justo eso.
 */
export function describirUltimaVez(u: UltimaVez, hoyIso: string): string {
  const series = u.series.map(describirSerie).join(', ')
  const rir = u.rirMedio !== undefined ? ` · RIR ${u.rirMedio}` : ''
  const forma = u.otraForma ? ', hecho de otra forma' : ''
  return `${cuandoFue(u.date, hoyIso)}${forma}: ${series}${rir}`
}
