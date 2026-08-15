/**
 * El juego de la pirámide.
 *
 * Quince cartas en cinco filas —cinco, cuatro, tres, dos y una—, boca abajo. En
 * cada turno se levanta la siguiente: de izquierda a derecha dentro de la fila,
 * y fila a fila desde la base hasta la cúspide.
 *
 * El recorrido es fijo y el reparto es lo único que cambia, así que toda la
 * lógica cabe en un índice: cuántas cartas se han levantado ya. De ahí sale
 * dónde está cada una, cuál toca ahora y si se ha acabado.
 */
import { barajaCompleta, barajar, type Carta } from '../data/baraja'

/** Cuántas cartas lleva cada fila, de la base a la cúspide. */
export const FILAS = [5, 4, 3, 2, 1] as const

/** Las quince cartas que forman la pirámide. */
export const CARTAS_EN_JUEGO = FILAS.reduce((a, b) => a + b, 0)

export interface Piramide {
  /** Las quince cartas repartidas, en orden de destape. */
  cartas: Carta[]
  /** Cuántas se han levantado ya. */
  levantadas: number
}

/** Reparte una pirámide nueva, con todo boca abajo. */
export function nuevaPiramide(random: () => number = Math.random): Piramide {
  return { cartas: barajar(barajaCompleta(), random).slice(0, CARTAS_EN_JUEGO), levantadas: 0 }
}

/** En qué fila y posición cae la carta número `i` del recorrido. */
export function posicionDe(i: number): { fila: number; columna: number } {
  let restante = i
  for (let fila = 0; fila < FILAS.length; fila++) {
    if (restante < FILAS[fila]) return { fila, columna: restante }
    restante -= FILAS[fila]
  }
  return { fila: FILAS.length - 1, columna: 0 }
}

/** Las cartas de una fila, con su índice global y si están levantadas. */
export function filaDe(
  p: Piramide,
  fila: number
): { carta: Carta; indice: number; levantada: boolean }[] {
  const desde = FILAS.slice(0, fila).reduce((a, b) => a + b, 0)
  return Array.from({ length: FILAS[fila] }, (_, columna) => {
    const indice = desde + columna
    return { carta: p.cartas[indice], indice, levantada: indice < p.levantadas }
  })
}

/** ¿Quedan cartas por levantar? */
export function quedanCartas(p: Piramide): boolean {
  return p.levantadas < CARTAS_EN_JUEGO
}

/** La última carta levantada, que es la que se está mirando. */
export function cartaActual(p: Piramide): Carta | null {
  return p.levantadas === 0 ? null : p.cartas[p.levantadas - 1]
}

/** Levanta la siguiente. Si no quedan, devuelve la misma pirámide. */
export function levantar(p: Piramide): Piramide {
  if (!quedanCartas(p)) return p
  return { ...p, levantadas: p.levantadas + 1 }
}

/**
 * En qué fila se está ahora, para poder decirlo: «fila 2 de 5».
 * Cuando aún no se ha levantado nada, la primera.
 */
export function filaActual(p: Piramide): number {
  return posicionDe(Math.max(0, p.levantadas - 1)).fila
}
