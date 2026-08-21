/**
 * El ratio omega 3 : 6 del día, y el sitio donde encaja una cápsula.
 *
 * Un suplemento de omega-3 **no es un alimento**, y meterlo en el catálogo como
 * si lo fuera estropearía dos cosas a la vez: obligaría a inventarle un peso en
 * gramos que nadie mira, y mezclaría en el mismo saco lo que viene de la comida
 * con lo que viene de un bote. Son cosas distintas y conviene poder verlas
 * separadas: alguien con un 1 : 1,2 gracias a las cápsulas y un 1 : 2,4 de
 * comida sabe algo útil sobre su semana que el número combinado le esconde.
 *
 * Así que aquí el ratio se da **tres veces**: solo de comida, solo con lo que
 * añade el suplemento, y el total. Y siempre acompañado de **cuánto de lo que
 * se comió tenía dato**, porque un ratio calculado sobre un tercio del plato no
 * es un ratio, es una impresión.
 *
 * ## Por qué el ratio y no la cantidad
 *
 * El omega-3 y el omega-6 compiten por las mismas enzimas. No es que uno sea
 * bueno y otro malo —los dos son esenciales— sino que **se estorban**, y lo que
 * decide qué se fabrica es la proporción entre ambos. Por eso comer más pescado
 * sin tocar el aceite de girasol mueve menos de lo que parece.
 */
import { omegasDe } from '../data/omegas'
import type { ComidaRegistrada, DiaDeComidas, Suplemento, TomaDeSuplemento } from './types'

export interface Omegas {
  o3: number
  o6: number
}

export interface RatioOmega {
  /** Miligramos, de la comida sola. */
  comida: Omegas
  /** Lo que aportaron las cápsulas. */
  suplemento: Omegas
  total: Omegas
  /**
   * Gramos de comida con dato de omegas, y gramos totales apuntados. Sin esto
   * el ratio es una cifra sin contexto.
   */
  gramosConDato: number
  gramosApuntados: number
}

const VACIO: Omegas = { o3: 0, o6: 0 }

/** Cuántos gramos son un alimento apuntado, vengan en gramos o en unidades. */
function gramosDe(a: { gramos?: number; unidades?: number }): number {
  return a.gramos ?? 0
}

/** Lo que aporta una comida, sin contar suplementos. */
export function omegasDeComida(comida: ComidaRegistrada): {
  omegas: Omegas
  gramosConDato: number
  gramosApuntados: number
} {
  let o3 = 0
  let o6 = 0
  let conDato = 0
  let apuntados = 0

  for (const a of comida.alimentos ?? []) {
    const g = gramosDe(a)
    apuntados += g
    const om = omegasDe(a.alimentoId)
    if (!om || g === 0) continue
    conDato += g
    o3 += (om.o3 * g) / 100
    o6 += (om.o6 * g) / 100
  }

  return { omegas: { o3, o6 }, gramosConDato: conDato, gramosApuntados: apuntados }
}

/** Lo que aportan las cápsulas tomadas en una comida. */
export function omegasDeSuplementos(
  tomas: TomaDeSuplemento[] | undefined,
  suplementos: Suplemento[] | undefined
): Omegas {
  let o3 = 0
  let o6 = 0
  for (const t of tomas ?? []) {
    const s = suplementos?.find((x) => x.id === t.suplementoId)
    // Un suplemento borrado no se puede contar, y sumarle cero es más honesto
    // que suponerle una dosis media.
    if (!s) continue
    const n = Math.max(0, t.capsulas)
    o3 += ((s.dhaMg ?? 0) + (s.epaMg ?? 0)) * n
    o6 += (s.omega6Mg ?? 0) * n
  }
  return { o3, o6 }
}

/** El ratio de un día entero. */
export function ratioDelDia(
  dia: DiaDeComidas | undefined,
  suplementos: Suplemento[] | undefined
): RatioOmega {
  let comida: Omegas = { ...VACIO }
  let suplemento: Omegas = { ...VACIO }
  let gramosConDato = 0
  let gramosApuntados = 0

  for (const c of dia?.comidas ?? []) {
    const r = omegasDeComida(c)
    comida = { o3: comida.o3 + r.omegas.o3, o6: comida.o6 + r.omegas.o6 }
    gramosConDato += r.gramosConDato
    gramosApuntados += r.gramosApuntados

    const s = omegasDeSuplementos(c.suplementos, suplementos)
    suplemento = { o3: suplemento.o3 + s.o3, o6: suplemento.o6 + s.o6 }
  }

  return {
    comida,
    suplemento,
    total: { o3: comida.o3 + suplemento.o3, o6: comida.o6 + suplemento.o6 },
    gramosConDato,
    gramosApuntados
  }
}

/**
 * El ratio como se dice: «1 : 2,4».
 *
 * Se normaliza siempre con el omega-3 en uno porque es como se habla de esto, y
 * porque deja el número de la derecha comparable de un día a otro. Sin omega-3
 * no hay ratio que dar y se dice con una raya, no con un infinito.
 */
export function escribirRatio(o: Omegas): string {
  if (o.o3 <= 0 && o.o6 <= 0) return '—'
  if (o.o3 <= 0) return 'solo omega 6'
  if (o.o6 <= 0) return 'solo omega 3'
  const veces = o.o6 / o.o3
  if (veces < 1) {
    // Más omega-3 que omega-6: se le da la vuelta para no escribir «1 : 0,4».
    return `${(o.o3 / o.o6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} : 1`
  }
  return `1 : ${veces.toLocaleString('es-ES', { maximumFractionDigits: 1 })}`
}

/**
 * Cuánto de lo apuntado tiene dato, de 0 a 1.
 *
 * Por debajo de la mitad, la app enseña el ratio en gris y lo dice: no es que
 * el número esté mal, es que se ha calculado sobre poca cosa.
 */
export function cobertura(r: RatioOmega): number {
  if (r.gramosApuntados <= 0) return 0
  return Math.min(1, r.gramosConDato / r.gramosApuntados)
}

export const COBERTURA_MINIMA_FIABLE = 0.5

export function ratioFiable(r: RatioOmega): boolean {
  return cobertura(r) >= COBERTURA_MINIMA_FIABLE
}

/** Los miligramos como se escriben: «660 mg». */
export function escribirMg(mg: number): string {
  return `${Math.round(mg).toLocaleString('es-ES')} mg`
}

/** Cómo se resume un suplemento en una línea: «330 mg DHA · 110 mg EPA». */
export function resumirSuplemento(s: Suplemento): string {
  const partes: string[] = []
  if (s.dhaMg) partes.push(`${escribirMg(s.dhaMg)} DHA`)
  if (s.epaMg) partes.push(`${escribirMg(s.epaMg)} EPA`)
  if (s.omega6Mg) partes.push(`${escribirMg(s.omega6Mg)} omega 6`)
  return partes.length ? partes.join(' · ') : 'Sin omegas declarados'
}

/** Y una toma concreta: «2 cáps. · 660 mg DHA». */
export function resumirToma(t: TomaDeSuplemento, s: Suplemento): string {
  const n = t.capsulas
  const cuantas = `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} cáps.`
  const dha = (s.dhaMg ?? 0) * n
  const epa = (s.epaMg ?? 0) * n
  const partes = [cuantas]
  if (dha > 0) partes.push(`${escribirMg(dha)} DHA`)
  if (epa > 0) partes.push(`${escribirMg(epa)} EPA`)
  return partes.join(' · ')
}
