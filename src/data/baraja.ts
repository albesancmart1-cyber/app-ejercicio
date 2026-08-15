/**
 * La baraja española: cuarenta cartas.
 *
 * Cuatro palos —oros, copas, espadas y bastos— del uno al siete y las tres
 * figuras: sota, caballo y rey. Sin ochos ni nueves, que es lo que la distingue
 * de la francesa y lo que hace que sean cuarenta y no cuarenta y ocho.
 */
export type Palo = 'oros' | 'copas' | 'espadas' | 'bastos'

export const PALOS: Palo[] = ['oros', 'copas', 'espadas', 'bastos']

export const NOMBRE_PALO: Record<Palo, string> = {
  oros: 'oros',
  copas: 'copas',
  espadas: 'espadas',
  bastos: 'bastos'
}

/**
 * Los números que existen. Del uno al siete y luego el salto a diez, once y
 * doce: las figuras llevan esos números en la carta aunque se llamen por su
 * nombre.
 */
export const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const
export type Numero = (typeof NUMEROS)[number]

export const NOMBRE_NUMERO: Record<Numero, string> = {
  1: 'as',
  2: 'dos',
  3: 'tres',
  4: 'cuatro',
  5: 'cinco',
  6: 'seis',
  7: 'siete',
  10: 'sota',
  11: 'caballo',
  12: 'rey'
}

export interface Carta {
  /** `oros-7`, `bastos-12`… */
  id: string
  palo: Palo
  numero: Numero
}

/** ¿Es una de las tres figuras? Se dibujan distinto que los números. */
export function esFigura(c: Carta): boolean {
  return c.numero >= 10
}

/** «Siete de oros», «rey de bastos». */
export function nombreDe(c: Carta): string {
  const n = NOMBRE_NUMERO[c.numero]
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} de ${NOMBRE_PALO[c.palo]}`
}

/** La baraja entera, en orden. */
export function barajaCompleta(): Carta[] {
  return PALOS.flatMap((palo) => NUMEROS.map((numero) => ({ id: `${palo}-${numero}`, palo, numero })))
}

/**
 * Baraja las cartas. Fisher-Yates con el azar inyectado: sin poder fijarlo, una
 * prueba de un juego de cartas no prueba nada.
 */
export function barajar(cartas: Carta[], random: () => number = Math.random): Carta[] {
  const a = [...cartas]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) % (i + 1)
    const guarda = a[i]
    a[i] = a[j]
    a[j] = guarda
  }
  return a
}
