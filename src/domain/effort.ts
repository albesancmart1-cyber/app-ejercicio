/**
 * Cuánto estrés dejó de verdad una sesión.
 *
 * Hasta aquí la app estimaba la dureza por lo que **había pedido**: el RIR del
 * plan. Eso es una intención, no un hecho. Dos sesiones con el mismo peso y las
 * mismas repeticiones dejan una fatiga muy distinta si una se hizo a dos
 * repeticiones del fallo y la otra al fallo, y esa diferencia es justo la que
 * decide si mañana toca entrenar o recuperar.
 *
 * Con el RIR anotado serie a serie eso deja de ser una estimación. Lo que se
 * mide aquí es sencillo y por eso es fiable:
 *
 *  - **cuántas series se llevaron cerca del fallo**, que es lo que de verdad
 *    cuesta reponer —el daño y la fatiga del sistema nervioso escalan de golpe
 *    en las últimas repeticiones, no de forma lineal con el volumen—, y
 *  - **a cuánto del fallo se fue de media**.
 *
 * No se inventa un índice de fatiga con más pretensiones que eso. La app ya
 * tiene un sitio donde se juzga el cuerpo entero —el test diario— y este dato
 * entra ahí como una señal más, no como un veredicto.
 */
import type { Session, SetLog } from './types'

/**
 * A partir de aquí una serie cuenta como llevada cerca del fallo. Uno o menos:
 * queda como mucho una repetición en el depósito.
 */
export const RIR_DURO = 1

/** Series duras en dos días a partir de las cuales conviene bajar el listón. */
export const SERIES_DURAS_PARA_AFLOJAR = 8

export interface EsfuerzoSesion {
  /** Series de trabajo con RIR anotado. */
  seriesMedidas: number
  /** De esas, las llevadas a una repetición del fallo o menos. */
  seriesDuras: number
  /** A cuánto del fallo se fue de media. */
  rirMedio?: number
  /** Se anotó el RIR en al menos una serie: sin esto lo demás no dice nada. */
  medida: boolean
}

function seriesDeTrabajo(logs: SetLog[] | undefined): SetLog[] {
  return (logs ?? []).filter((l) => l.done && !l.warmup)
}

export function esfuerzoDe(session: Session): EsfuerzoSesion {
  const conRir: number[] = []
  for (const pe of session.exercises) {
    if (pe.primary === 'cardio') continue
    for (const l of seriesDeTrabajo(pe.logs)) {
      if (typeof l.rir === 'number') conRir.push(l.rir)
    }
  }
  if (conRir.length === 0) {
    return { seriesMedidas: 0, seriesDuras: 0, medida: false }
  }
  return {
    seriesMedidas: conRir.length,
    seriesDuras: conRir.filter((r) => r <= RIR_DURO).length,
    rirMedio: Math.round((conRir.reduce((a, b) => a + b, 0) / conRir.length) * 10) / 10,
    medida: true
  }
}

function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`)
  const b = Date.parse(`${hasta}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

export interface EsfuerzoReciente extends EsfuerzoSesion {
  /** Cuántas sesiones entran en la ventana. */
  sesiones: number
}

/**
 * Lo acumulado en los últimos días. Dos por defecto: es la ventana en la que la
 * fatiga de una sesión dura todavía pesa sobre la siguiente.
 */
export function esfuerzoReciente(
  sessions: Session[],
  todayIso: string,
  dias = 2
): EsfuerzoReciente {
  const dentro = sessions.filter((s) => {
    if (!s.completed) return false
    const d = diasEntre(s.date, todayIso)
    return d >= 0 && d <= dias
  })

  const esfuerzos = dentro.map(esfuerzoDe).filter((e) => e.medida)
  if (esfuerzos.length === 0) {
    return { seriesMedidas: 0, seriesDuras: 0, medida: false, sesiones: dentro.length }
  }

  const seriesMedidas = esfuerzos.reduce((a, e) => a + e.seriesMedidas, 0)
  const seriesDuras = esfuerzos.reduce((a, e) => a + e.seriesDuras, 0)
  // Media ponderada por series, no por sesiones: cinco series duras en una
  // sesión pesan más que una serie suave en otra.
  const suma = esfuerzos.reduce((a, e) => a + (e.rirMedio ?? 0) * e.seriesMedidas, 0)

  return {
    seriesMedidas,
    seriesDuras,
    rirMedio: Math.round((suma / seriesMedidas) * 10) / 10,
    medida: true,
    sesiones: dentro.length
  }
}

/**
 * ¿Lo hecho estos días pide bajar el listón hoy?
 *
 * Solo dice que sí cuando hay **medida**: sin RIR anotado no se penaliza a
 * nadie por una sospecha. Y hace falta que se junten las dos cosas —muchas
 * series cerca del fallo y una media baja—, porque cualquiera de las dos por
 * separado tiene explicaciones inocentes: ocho series duras repartidas en dos
 * sesiones con RIR medio de 2 es una semana normal.
 */
export function pideAflojar(e: EsfuerzoReciente): boolean {
  if (!e.medida) return false
  return e.seriesDuras >= SERIES_DURAS_PARA_AFLOJAR && (e.rirMedio ?? 3) <= RIR_DURO
}

/** Cómo se lo contamos al usuario, con los números delante. */
export function explicarEsfuerzo(e: EsfuerzoReciente): string | null {
  if (!e.medida) return null
  if (e.seriesDuras === 0) {
    return `En los últimos dos días no has llevado ninguna serie cerca del fallo (RIR medio ${e.rirMedio}).`
  }
  return `En los últimos dos días llevaste ${e.seriesDuras} ${
    e.seriesDuras === 1 ? 'serie' : 'series'
  } a una repetición del fallo o menos, con un RIR medio de ${e.rirMedio}.`
}
