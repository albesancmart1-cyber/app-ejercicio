/**
 * El peso corporal como carga de verdad.
 *
 * Una sentadilla búlgara sin mancuernas no es una serie sin peso: es una serie
 * con ochenta kilos encima, solo que los llevas puestos. La app lo contaba como
 * cero —el campo de kilos se quedaba vacío—, así que semanas enteras de trabajo
 * real desaparecían del volumen, de los récords y de la progresión de carga. Es
 * el hueco más grande que le quedaba al registro.
 *
 * ── Cuánto cuenta ────────────────────────────────────────────────────────────
 *
 * No todo el cuerpo, y ese es el matiz que hace esto honesto. En una flexión no
 * levantas tus ochenta kilos: levantas la parte que queda por encima de los
 * puntos de apoyo. En una dominada sí los levantas enteros. En una sentadilla a
 * una pierna, casi todos menos la pierna que apoya.
 *
 * Las fracciones de abajo son las que se manejan en biomecánica para cada patrón
 * de movimiento. Son **estimaciones redondas a propósito**: dar 0,6437 fingiría
 * una precisión que depende de la altura, de la proporción entre tronco y
 * piernas y de dónde pongas las manos. Lo que se busca no es medir tu flexión,
 * es que la serie deje de valer cero y que dos sesiones se puedan comparar.
 */
import { patternOf, type MovementPattern } from '../data/patterns'
import { escribirNumero } from './numeros'

/**
 * Qué fracción del peso corporal mueve cada patrón.
 *
 * Donde no hay dato, `POR_DEFECTO`: dos tercios, que es lo que mueve la mayoría
 * de los ejercicios de peso corporal de tren superior.
 */
export const FRACCION_POR_PATRON: Partial<Record<MovementPattern, number>> = {
  // Colgado del todo: sube el cuerpo entero.
  traccion_vertical: 1,
  fondo: 1,
  // Tumbado o inclinado: descuentan los apoyos.
  empuje_horizontal: 0.65,
  traccion_horizontal: 0.6,
  empuje_vertical: 0.65,
  // De pie sobre las dos piernas: descuenta la parte que no sube.
  sentadilla: 0.7,
  bisagra: 0.7,
  // A una pierna: casi todo el cuerpo sobre una sola.
  zancada: 0.85,
  puente: 0.55,
  curl_femoral: 0.5,
  extension_tobillo: 0.9,
  // Core y aislamientos: lo que se mueve es un segmento, no el cuerpo.
  core_dinamico: 0.35,
  extension_espalda: 0.4,
  isometrico: 0.35,
  flexion_codo: 0.35,
  extension_codo: 0.4
}

export const FRACCION_POR_DEFECTO = 0.65

/** Qué fracción del cuerpo mueve este ejercicio. */
export function fraccionCorporal(exerciseId: string): number {
  const patron = patternOf(exerciseId)
  if (!patron) return FRACCION_POR_DEFECTO
  return FRACCION_POR_PATRON[patron] ?? FRACCION_POR_DEFECTO
}

/**
 * Los kilos que cuenta una serie hecha a peso corporal.
 *
 * Sin el peso del usuario no se puede calcular nada, y devolver cero sería
 * volver al problema de partida: se devuelve `undefined` para que quien llame
 * sepa que no hay dato en vez de creerse un cero.
 */
export function cargaCorporal(exerciseId: string, pesoUsuarioKg: number | undefined): number | undefined {
  if (!pesoUsuarioKg || pesoUsuarioKg <= 0) return undefined
  return Math.round(pesoUsuarioKg * fraccionCorporal(exerciseId) * 2) / 2
}

/**
 * «Tu peso: unos 52 kg de los 80» — para que se vea de dónde sale el número.
 *
 * Enseñarlo importa: si la app apunta cincuenta y dos kilos en una flexión sin
 * decir por qué, el número parece inventado y deja de confiarse en él.
 */
export function explicarCargaCorporal(
  exerciseId: string,
  pesoUsuarioKg: number | undefined
): string | undefined {
  const carga = cargaCorporal(exerciseId, pesoUsuarioKg)
  // Sin carga no hay nada que explicar, y si la hay es que había peso.
  if (carga === undefined || pesoUsuarioKg === undefined) return undefined
  const pct = Math.round(fraccionCorporal(exerciseId) * 100)
  return `Cuentan ${escribirNumero(carga)} kg: el ${pct} % de tus ${escribirNumero(pesoUsuarioKg)} kg, que es lo que mueve este ejercicio.`
}
