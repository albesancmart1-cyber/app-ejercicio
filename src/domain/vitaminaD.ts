/**
 * Sol de verdad: minutos, franja y piel — y la vitamina D que eso da.
 *
 * «¿Te dio el sol ayer?» con un sí o un no no distingue cinco minutos por la
 * ventana de una hora a mediodía, y la diferencia fisiológica entre ambos es
 * enorme. Aquí el sol se apunta como lo que es: cuánto tiempo, a qué hora y
 * con cuánta piel.
 *
 * **La estimación de UI es honesta o no es.** La síntesis depende del UVB que
 * llega, y en España (~40° N) eso significa dos cosas que el modelo respeta:
 *
 *  - Solo la franja del mediodía (≈12–16 h solar) trae UVB en serio. Por la
 *    mañana temprano y a última hora el ángulo del sol lo filtra casi entero.
 *  - **De noviembre a febrero apenas hay síntesis** a esta latitud — el
 *    «invierno vitamínico»— y la app lo dice tal cual en vez de repartir UI
 *    imaginarias.
 *
 * Los números salen de la referencia clásica: una exposición de cuerpo entero
 * al mediodía de verano produce del orden de 10 000–20 000 UI en 15–30 minutos
 * (≈1 dosis eritemal mínima, Holick). De ahí se escala por fracción de piel y
 * por temporada, **siempre como rango**: la piel, la edad y hasta la nubosidad
 * mueven el resultado, y dar una cifra exacta sería mentir con decimales.
 */
import type { DiaDeSol, ExposicionSolar, FranjaSolar, PielExpuesta } from './types'

export const FRANJAS: Record<FranjaSolar, string> = {
  manana: 'Por la mañana',
  mediodia: 'Mediodía (12–16 h)',
  tarde: 'Por la tarde'
}

export const PIELES: Record<PielExpuesta, string> = {
  cara_manos: 'Cara y manos',
  brazos_piernas: 'Brazos o piernas',
  torso: 'Torso descubierto'
}

/**
 * UI por minuto al mediodía de temporada alta, según la piel expuesta.
 * Rangos, no cifras: piel clara-media en latitud española.
 */
const UI_POR_MINUTO: Record<PielExpuesta, { min: number; max: number }> = {
  cara_manos: { min: 40, max: 100 },
  brazos_piernas: { min: 150, max: 350 },
  torso: { min: 300, max: 650 }
}

/** Fuera del mediodía el UVB cae en picado. */
const FACTOR_FRANJA: Record<FranjaSolar, number> = {
  manana: 0.25,
  mediodia: 1,
  tarde: 0.25
}

/**
 * La piel satura: pasada media hora eficaz, la propia piel degrada la
 * previtamina D y seguir al sol ya no suma en proporción.
 */
const MINUTOS_EFICACES = 40

/** Techo diario razonable de síntesis. */
const TOPE_UI_DIA = 20000

/** De noviembre a febrero, a ~40° N, la síntesis es casi nula. */
export function esInviernoVitaminico(mes: number): boolean {
  return mes === 11 || mes === 12 || mes === 1 || mes === 2
}

/** El mes (1–12) de una fecha ISO. */
export function mesDe(iso: string): number {
  return Number(iso.slice(5, 7))
}

export interface RangoUI {
  min: number
  max: number
}

/** Las UI estimadas de una exposición suelta, ya con temporada y franja. */
export function uiDeExposicion(e: ExposicionSolar, mes: number): RangoUI {
  const minutos = Math.min(Math.max(0, e.minutos), MINUTOS_EFICACES)
  const base = UI_POR_MINUTO[e.piel]
  // 0,05 y no un número mayor: en diciembre a 40° N el índice UV del mediodía
  // ronda el 2, y por debajo de 3 la síntesis es residual.
  const temporada = esInviernoVitaminico(mes) ? 0.05 : 1
  const factor = FACTOR_FRANJA[e.franja] * temporada
  return {
    min: Math.round(base.min * minutos * factor),
    max: Math.round(base.max * minutos * factor)
  }
}

/**
 * Las UI del día. La cifra manual manda: si el usuario la trae de una app que
 * la calcula con más datos que nosotros, estimar por encima sería empeorarla.
 * Sin cifra manual, se estima de las exposiciones.
 */
export function uiDelDia(dia: DiaDeSol | undefined): RangoUI | undefined {
  if (!dia) return undefined
  if (dia.ui !== undefined) return { min: dia.ui, max: dia.ui }
  if (dia.exposiciones.length === 0) return undefined
  const mes = mesDe(dia.date)
  const suma = dia.exposiciones.reduce(
    (a, e) => {
      const r = uiDeExposicion(e, mes)
      return { min: a.min + r.min, max: a.max + r.max }
    },
    { min: 0, max: 0 }
  )
  return { min: Math.min(suma.min, TOPE_UI_DIA), max: Math.min(suma.max, TOPE_UI_DIA) }
}

/** Los minutos totales de sol del día: los manuales si están, si no la suma. */
export function minutosDelDia(dia: DiaDeSol | undefined): number {
  if (dia?.minutos !== undefined) return Math.max(0, dia.minutos)
  return (dia?.exposiciones ?? []).reduce((a, e) => a + Math.max(0, e.minutos), 0)
}

/**
 * Cómo se escriben las UI. Un rango estimado va redondeado y con «unas» —la
 * precisión sería mentira—; una cifra exacta (min = max: la trajo el usuario)
 * se escribe tal cual, sin redondear lo que no es nuestro.
 */
export function escribirUI(r: RangoUI): string {
  if (r.min === r.max) return `${r.min.toLocaleString('es-ES')} UI`
  const red = (n: number) => (Math.round(n / 100) * 100).toLocaleString('es-ES')
  if (r.max < 100) return 'una síntesis mínima'
  return `unas ${red(r.min)}–${red(r.max)} UI`
}

/** El día de una fecha, del registro completo. */
export function solDe(sol: DiaDeSol[] | undefined, fecha: string): DiaDeSol | undefined {
  return sol?.find((d) => d.date === fecha)
}

/** Fija los minutos y las UI manuales del día, conservando lo demás. */
export function conManual(
  dia: DiaDeSol | undefined,
  fecha: string,
  manual: { minutos?: number; ui?: number }
): DiaDeSol {
  return {
    date: fecha,
    exposiciones: dia?.exposiciones ?? [],
    ...(manual.minutos !== undefined ? { minutos: manual.minutos } : {}),
    ...(manual.ui !== undefined ? { ui: manual.ui } : {})
  }
}

/** Añade una exposición al día. */
export function conExposicion(
  dia: DiaDeSol | undefined,
  fecha: string,
  e: ExposicionSolar
): DiaDeSol {
  return { ...(dia ?? {}), date: fecha, exposiciones: [...(dia?.exposiciones ?? []), e] }
}

/** Quita la exposición en esa posición. */
export function sinExposicion(dia: DiaDeSol, indice: number): DiaDeSol {
  return { ...dia, exposiciones: dia.exposiciones.filter((_, i) => i !== indice) }
}

export interface ResumenSolar {
  /** UI acumuladas en la ventana, como rango. */
  ui: RangoUI
  /** Días con al menos un rato de sol apuntado. */
  diasConSol: number
  /** Días con sol de mediodía, que es el que sintetiza. */
  diasDeMediodia: number
  /** La ventana mirada, en días. */
  dias: number
}

/** La semana de sol: cuánta vitamina D y cuántos días de mediodía. */
export function resumenSemanal(sol: DiaDeSol[] | undefined, todayIso: string, dias = 7): ResumenSolar {
  const desde = new Date(Date.parse(`${todayIso}T00:00:00Z`) - (dias - 1) * 86400000)
    .toISOString()
    .slice(0, 10)
  const ventana = (sol ?? []).filter((d) => d.date >= desde && d.date <= todayIso)
  const ui = ventana.reduce(
    (a, d) => {
      const r = uiDelDia(d)
      return r ? { min: a.min + r.min, max: a.max + r.max } : a
    },
    { min: 0, max: 0 }
  )
  return {
    ui,
    diasConSol: ventana.filter((d) => minutosDelDia(d) > 0).length,
    diasDeMediodia: ventana.filter((d) => d.exposiciones.some((e) => e.franja === 'mediodia' && e.minutos >= 10))
      .length,
    dias
  }
}

/**
 * La nota de temporada, cuando toca. En invierno la app no reparte UI
 * imaginarias: dice que el sol de estos meses no sintetiza y para qué sigue
 * sirviendo (el ritmo circadiano se ancla igual).
 */
export function notaDeTemporada(todayIso: string): string | undefined {
  if (!esInviernoVitaminico(mesDe(todayIso))) return undefined
  return 'De noviembre a febrero, a nuestra latitud, la piel apenas sintetiza vitamina D por bajo que esté el sol. El rato fuera sigue contando — ancla tu reloj y tu leptina — pero la vitamina D de estos meses sale de lo que sintetizaste en verano, del pescado azul o de un suplemento.'
}
