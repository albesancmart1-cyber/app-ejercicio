/**
 * En qué casillas de tiempo se reparte la gráfica.
 *
 * Hasta aquí la gráfica ponía un punto por medición, repartidos a distancias
 * iguales. Eso miente: dos pesadas seguidas y una tercera un mes después salían
 * igual de separadas, y la pendiente —que es lo único que importa en una
 * tendencia— no significaba nada.
 *
 * Aquí el eje es el tiempo de verdad. Tres ventanas, cada una con sus casillas:
 *
 *  - **semana**: los siete días que acaban hoy, uno por casilla.
 *  - **mes**: los treinta días que acaban hoy.
 *  - **año**: los doce meses que acaban en el actual.
 *
 * Ventanas que terminan hoy, y no meses de calendario: media gráfica vacía
 * esperando a que pase el mes no ayuda a nadie, y así la última casilla es
 * siempre la de ahora mismo.
 *
 * Una casilla puede quedarse sin medición —lo normal, si te pesas una vez por
 * semana— y entonces no tiene punto. Las líneas se dibujan uniendo las casillas
 * que sí lo tienen, saltándose los huecos: si no, la vista del mes serían
 * cuatro puntos sueltos sin línea.
 */
import type { BodyMeasurement } from './types'

export type RangoTendencia = 'semana' | 'mes' | 'anio'

export const RANGOS: RangoTendencia[] = ['semana', 'mes', 'anio']

export const ETIQUETA_RANGO: Record<RangoTendencia, string> = {
  semana: '1 semana',
  mes: '1 mes',
  anio: '1 año'
}

/** Cuántas casillas tiene cada ventana. */
export const CASILLAS: Record<RangoTendencia, number> = {
  semana: 7,
  mes: 30,
  anio: 12
}

export interface Casilla {
  /** Identificador estable: `2026-08-05` por día, `2026-08` por mes. */
  clave: string
  /** Lo que se pinta en el eje, cuando toca pintarlo. */
  etiqueta: string
  /** Si merece rótulo en el eje: con treinta días no caben todos. */
  destacada: boolean
}

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function fecha(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

function isoDe(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function sumarDias(iso: string, dias: number): string {
  const d = fecha(iso)
  d.setUTCDate(d.getUTCDate() + dias)
  return isoDe(d)
}

function sumarMeses(iso: string, meses: number): string {
  const d = fecha(`${iso}-01`)
  d.setUTCMonth(d.getUTCMonth() + meses)
  return isoDe(d).slice(0, 7)
}

/** La casilla a la que cae una fecha dentro de un rango. */
export function claveDe(iso: string, rango: RangoTendencia): string {
  return rango === 'anio' ? iso.slice(0, 7) : iso
}

/**
 * Las casillas de la ventana, de la más antigua a hoy.
 *
 * `destacada` marca las que llevan rótulo en el eje: todos los días en la
 * semana, uno de cada cinco en el mes y todos los meses en el año. Treinta
 * números de día seguidos no se leen, se amontonan.
 */
export function casillasDe(rango: RangoTendencia, hoyIso: string): Casilla[] {
  const total = CASILLAS[rango]
  if (rango === 'anio') {
    const mesActual = hoyIso.slice(0, 7)
    return Array.from({ length: total }, (_, i) => {
      const clave = sumarMeses(mesActual, i - (total - 1))
      return {
        clave,
        etiqueta: MESES[Number(clave.slice(5, 7)) - 1],
        destacada: true
      }
    })
  }
  return Array.from({ length: total }, (_, i) => {
    const clave = sumarDias(hoyIso, i - (total - 1))
    const d = fecha(clave)
    return {
      clave,
      etiqueta: rango === 'semana' ? DIAS[d.getUTCDay()] : String(d.getUTCDate()),
      // En el mes, un rótulo cada cinco días y siempre el último.
      destacada: rango === 'semana' || i === total - 1 || (total - 1 - i) % 5 === 0
    }
  })
}

export interface PuntoDeCasilla {
  casilla: Casilla
  /** Mediciones que caen en esta casilla. Vacío es lo habitual. */
  mediciones: BodyMeasurement[]
}

/**
 * Reparte las mediciones por casillas.
 *
 * Lo de fuera de la ventana se descarta: la gráfica enseña el rango elegido, no
 * todo el historial recortado.
 */
export function repartir(
  measurements: BodyMeasurement[],
  rango: RangoTendencia,
  hoyIso: string
): PuntoDeCasilla[] {
  const casillas = casillasDe(rango, hoyIso)
  const porClave = new Map<string, BodyMeasurement[]>()
  for (const m of measurements) {
    const clave = claveDe(m.date, rango)
    const ya = porClave.get(clave)
    if (ya) ya.push(m)
    else porClave.set(clave, [m])
  }
  return casillas.map((casilla) => ({
    casilla,
    mediciones: porClave.get(casilla.clave) ?? []
  }))
}

/**
 * El valor de una casilla: la media de lo que haya caído dentro.
 *
 * Media y no la última: en el año, una casilla es un mes entero, y la
 * bioimpedancia se mueve un 3–5 % según la hidratación. Quedarse con la última
 * lectura del mes es quedarse con el ruido de un día concreto.
 */
export function promedio(valores: (number | undefined)[]): number | undefined {
  const buenos = valores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (buenos.length === 0) return undefined
  return buenos.reduce((a, b) => a + b, 0) / buenos.length
}

/** ¿Hay al menos dos casillas con dato? Con una, no hay tendencia que enseñar. */
export function haySuficiente(puntos: PuntoDeCasilla[]): boolean {
  return puntos.filter((p) => p.mediciones.length > 0).length >= 2
}

/**
 * El rango más corto en el que ya se ve algo, para abrir por ahí.
 *
 * Alguien que lleva tres meses pesándose una vez por semana no quiere abrir en
 * «1 semana» y ver un punto suelto.
 */
export function rangoPorDefecto(
  measurements: BodyMeasurement[],
  hoyIso: string
): RangoTendencia {
  for (const rango of RANGOS) {
    if (haySuficiente(repartir(measurements, rango, hoyIso))) return rango
  }
  return 'anio'
}
