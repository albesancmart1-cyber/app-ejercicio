/**
 * La cocina: qué se enseña y en qué orden.
 *
 * La pantalla pedía dos filtros y un botón para dar **una** idea. Es el patrón
 * de la máquina tragaperras: elegir antes de ver nada y luego tirar de la
 * palanca hasta que salga algo que apetezca. Quien abre esta pantalla no quiere
 * configurar un filtro, quiere cenar.
 *
 * Así que se enseñan tres a la vez y sin preguntar nada, que es cómo funciona
 * elegir de verdad: se compara. Los filtros siguen ahí para cuando uno ya sabe
 * lo que quiere, pero dejan de ser el peaje de entrada.
 */
import {
  bestDhaTier,
  filterMeals,
  type Meal,
  type MealBase,
  type MealEffort
} from '../data/meals'
import type { Goal } from './types'
import { proteinTarget } from './protocol'

/** Cuántas se ponen delante a la vez. */
export const IDEAS_A_LA_VEZ = 3

/**
 * Tres platos distintos dentro del filtro, con el DHA por delante.
 *
 * `evitar` es la tanda anterior: pedir otras tres y que repitan dos sería no
 * haber pedido nada. Si el filtro no da para tanto, se rellena con lo que haya
 * antes que devolver menos de lo posible —vale más repetir que quedarse corto—.
 */
export function tresIdeas(
  base: MealBase | null,
  effort: MealEffort | null,
  evitar: string[] = [],
  random: () => number = Math.random,
  cuantas: number = IDEAS_A_LA_VEZ
): Meal[] {
  const pool = filterMeals(base, effort)
  if (pool.length === 0) return []

  /*
   * Solo el mejor escalón de DHA que exista dentro del filtro. **Nunca se baja
   * de escalón para completar la terna**, y esto no es un detalle: pidiendo
   * carne solo hay dos platos que resuelvan el DHA, y rellenando con un tercero
   * cualquiera se colaba un plato de 10 mg junto a dos de 1.100. Con una sola
   * sugerencia el problema no existía —siempre salía del mejor escalón—; al
   * enseñar tres, completar el hueco a cualquier precio se cargaba justo la
   * regla que sostiene esta pantalla.
   *
   * Así que si el escalón bueno da para dos, se enseñan dos. Dos platos que
   * sirven valen más que tres de los que uno sobra.
   */
  const escalon = bestDhaTier(pool)
  const elegidas: Meal[] = []
  const puestas = new Set<string>()

  // Dos pasadas: primero sin repetir la tanda anterior, y solo si falta, con
  // ella. Un catálogo pequeño no puede dejar la pantalla vacía.
  for (const evitando of [true, false]) {
    const candidatos = escalon.filter(
      (m) => !puestas.has(m.id) && (!evitando || !evitar.includes(m.id))
    )
    for (const m of barajar(candidatos, random)) {
      if (elegidas.length >= cuantas) break
      elegidas.push(m)
      puestas.add(m.id)
    }
    if (elegidas.length >= cuantas) break
  }
  return elegidas
}

/** Fisher-Yates, con el azar inyectado para que las pruebas sean pruebas. */
function barajar<T>(xs: T[], random: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) % (i + 1)
    const guarda = a[i]
    a[i] = a[j]
    a[j] = guarda
  }
  return a
}

export interface BandaProteina {
  /** Los gramos del día, de mínimo a máximo. */
  min: number
  max: number
  /** Lo mismo por kilo de peso, que es de donde sale. */
  porKilo: { min: number; max: number }
  /** Los extremos de la regla que se dibuja. */
  desde: number
  hasta: number
  /** Dónde cae la banda dentro de esa regla, en tanto por ciento. */
  inicio: number
  ancho: number
}

/**
 * La proteína del día, dibujable.
 *
 * Es la única cifra que esta app pide vigilar, y aun así **es una banda y no un
 * número**: enseñarla como una barra que se llena invitaría a contar, que es
 * justo lo que aquí no se hace. La regla va de 1,2 a 3 g/kg —lo que se come de
 * verdad, de poco a mucho— para que se vea que el objetivo es una zona ancha
 * dentro de un rango aún más ancho, no una diana.
 */
export function bandaDeProteina(weightKg: number, goal: Goal): BandaProteina {
  const { min, max } = proteinTarget(weightKg, goal)
  const desde = Math.round(weightKg * 1.2)
  const hasta = Math.round(weightKg * 3)
  const span = Math.max(1, hasta - desde)
  const pct = (g: number) =>
    Math.min(100, Math.max(0, ((g - desde) / span) * 100))
  return {
    min,
    max,
    porKilo: {
      min: Math.round((min / weightKg) * 10) / 10,
      max: Math.round((max / weightKg) * 10) / 10
    },
    desde,
    hasta,
    inicio: Math.round(pct(min) * 10) / 10,
    ancho: Math.round((pct(max) - pct(min)) * 10) / 10
  }
}

/**
 * Cuántos platos como estos harían falta para llegar al mínimo del día.
 *
 * Sirve para lo contrario de lo que parece: casi siempre salen dos o tres, y
 * decirlo es la forma de quitar la cuenta de en medio —«con lo que ya comes,
 * está»— en vez de abrir una hoja de cálculo.
 */
export function platosParaElMinimo(min: number, ideas: Meal[]): number {
  if (ideas.length === 0) return 0
  const medio = ideas.reduce((a, m) => a + m.proteinG, 0) / ideas.length
  return Math.max(1, Math.ceil(min / Math.max(1, medio)))
}
