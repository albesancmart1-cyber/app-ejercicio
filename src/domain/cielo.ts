/**
 * Cómo se ve el sol, y cuánto UVB deja pasar lo que hay en medio.
 *
 * La fórmula de síntesis que usa `vitaminaD.ts` calcula el UVB de **cielo
 * despejado** y lo dice explícitamente: no incluye nubes, ni ozono, ni
 * aerosoles. Eso deja fuera lo que más varía de un día a otro, y lo único que
 * el usuario puede observar sin instrumentos: si el sol se ve limpio o si hay
 * algo delante.
 *
 * Este módulo es **un añadido nuestro sobre esa fórmula**, no parte de ella, y
 * conviene que quede escrito: multiplica el resultado de cielo despejado por lo
 * que se estima que atraviesa. Separarlo en su propio fichero es a propósito —
 * así se ve dónde acaba la referencia publicada y dónde empieza nuestra
 * estimación.
 *
 * ## De dónde salen los factores
 *
 * De la atenuación medida del UV eritemático, que está publicada y es grande:
 * un velo de cirros finos deja pasar del orden del 70–90 %, un cielo con calima
 * bastante menos, y un cubierto cerrado entre el 20 y el 30 %. A la sombra, con
 * el cielo abierto encima, queda la componente difusa —un pequeño porcentaje—,
 * que no es cero pero casi.
 *
 * Son **órdenes de magnitud**, y por eso el resultado se sigue dando como rango.
 * La etiqueta describe lo que se ve en el cielo y nada más: de dónde salga lo
 * que haya delante del sol no es asunto de esta app, y modelar la atenuación no
 * requiere ninguna opinión sobre su origen.
 */

export type EstadoDelCielo = 'limpio' | 'estelas' | 'velado' | 'filtrado' | 'sin_sol'

export interface DefinicionCielo {
  nombre: string
  /** Qué se ve, para poder elegir sin dudar. */
  comoSeVe: string
  /** Fracción del UVB de cielo despejado que llega al suelo. */
  factor: number
}

export const CIELOS: Record<EstadoDelCielo, DefinicionCielo> = {
  limpio: {
    nombre: 'Sol limpio',
    comoSeVe: 'Azul de punta a punta y el sol deslumbra: no se puede mirar.',
    factor: 1
  },
  estelas: {
    nombre: 'Con estelas o calima',
    comoSeVe: 'El sol se ve entero, pero el cielo tiene un velo, polvo o estelas.',
    factor: 0.7
  },
  velado: {
    nombre: 'Velado',
    comoSeVe: 'Se ve el disco del sol pero difuso, y ya se puede mirar un momento.',
    factor: 0.4
  },
  filtrado: {
    nombre: 'Filtrado',
    comoSeVe: 'No se ve el disco: solo se intuye por dónde anda.',
    factor: 0.2
  },
  sin_sol: {
    nombre: 'Sin sol',
    comoSeVe: 'Cubierto cerrado, o estás a la sombra.',
    factor: 0.03
  }
}

/** El orden en que se ofrecen, del cielo más abierto al más cerrado. */
export const ORDEN_CIELO: EstadoDelCielo[] = ['limpio', 'estelas', 'velado', 'filtrado', 'sin_sol']

/**
 * Cuánto deja pasar un cielo.
 *
 * Sin dato devuelve **1**, es decir, cielo despejado. Es la elección menos mala:
 * suponer nubes rebajaría en silencio lo que el usuario apuntó, y la fórmula de
 * referencia ya es de cielo despejado, así que sin información se queda tal cual
 * la referencia la definió.
 */
export function factorDeCielo(cielo: EstadoDelCielo | undefined): number {
  return cielo ? CIELOS[cielo].factor : 1
}

/** Si con ese cielo hay algo que sintetizar, para no ofrecer lo que no hay. */
export function haySolUtil(cielo: EstadoDelCielo | undefined): boolean {
  return factorDeCielo(cielo) > 0.05
}
