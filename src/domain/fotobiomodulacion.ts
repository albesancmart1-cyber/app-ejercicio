/**
 * Cuánta luz te ha dado de verdad una sesión.
 *
 * «Diez minutos de luz roja» no es un dato: no dice nada sin saber con qué
 * aparato, a qué distancia y en qué longitudes de onda. Dos personas con la
 * misma frase en su diario pueden haber recibido diez veces distinta cantidad.
 *
 * Aquí se calcula lo único que se puede calcular de verdad —**la energía que
 * llegó a la piel**— a partir de lo que el usuario sí sabe: la lámpara que
 * tiene, con sus ondas y su irradiancia, y a qué distancia se puso.
 *
 * ## Las dos fórmulas, y son las dos
 *
 * La dosis es potencia por tiempo:
 *
 *     J/cm² = mW/cm² × segundos ÷ 1 000
 *
 * Y la potencia cae con el **cuadrado** de la distancia, porque la misma luz se
 * reparte sobre una superficie que crece con el cuadrado:
 *
 *     irradiancia(d) = irradiancia(ref) × (ref ⁄ d)²
 *
 * Esa segunda es la que más se ignora y la que más manda: **al doble de
 * distancia llega la cuarta parte**. Por eso la app pide la distancia en vez de
 * suponerla, y por eso una sesión a 30 cm con un panel medido a 15 entrega la
 * cuarta parte de lo que dice la caja.
 *
 * ## Lo que aquí no se hace
 *
 * No hay dosis recomendada, ni objetivo terapéutico, ni «te faltan X julios».
 * La literatura no tiene un número de consenso para eso, y ponerlo sería
 * inventarlo. Lo que hay es la cuenta de lo entregado, honesta, para que quien
 * la use sepa qué se está dando.
 */
import type { Lampara, SesionPBM, ZonaPBM } from './types'
import { BANDAS, bandaDe, picosCubiertos, PICOS_KARU } from './luz'

export const ZONAS: Record<ZonaPBM, string> = {
  cara: 'Cara',
  cuello: 'Cuello',
  torso: 'Torso',
  espalda: 'Espalda',
  abdomen: 'Abdomen',
  piernas: 'Piernas',
  articulacion: 'Una articulación'
}

/** Lo que una onda concreta entregó en una sesión. */
export interface DosisDeOnda {
  nm: number
  /** La irradiancia ya corregida por la distancia real. */
  irradiancia: number
  julios: number
}

export interface DosisSesion {
  /** Suma de todas las ondas, en J/cm². */
  julios: number
  porOnda: DosisDeOnda[]
  /** Solo lo que va a la mitocondria: rojo e infrarrojo. */
  juliosMitocondria: number
  /** Cuáles de los cuatro picos de Karu cubre la lámpara usada. */
  picos: number[]
  /** Cuánto se ha multiplicado o dividido la irradiancia por la distancia. */
  factorDistancia: number
}

/**
 * Cuánto queda de la irradiancia de referencia a la distancia real.
 *
 * Se protege de la distancia cero, que daría infinito: por debajo de un
 * centímetro se trata como un centímetro, porque nadie apoya un panel en la
 * córnea y un infinito envenenaría todas las sumas de después.
 */
export function factorDistancia(distanciaCm: number, referenciaCm: number): number {
  const d = Math.max(1, distanciaCm)
  const ref = Math.max(1, referenciaCm)
  return (ref / d) ** 2
}

/** La dosis de una sesión con una lámpara concreta. */
export function dosisDeSesion(sesion: SesionPBM, lampara: Lampara): DosisSesion {
  const factor = factorDistancia(sesion.distanciaCm, lampara.distanciaRefCm)
  const segundos = Math.max(0, sesion.minutos) * 60

  const porOnda: DosisDeOnda[] = lampara.ondas.map((o) => {
    const irradiancia = o.irradiancia * factor
    return { nm: o.nm, irradiancia, julios: (irradiancia * segundos) / 1000 }
  })

  const julios = porOnda.reduce((t, o) => t + o.julios, 0)
  const juliosMitocondria = porOnda.reduce((t, o) => {
    const banda = bandaDe(o.nm)
    if (!banda || BANDAS[banda].proposito !== 'mitocondria') return t
    return t + o.julios * BANDAS[banda].peso
  }, 0)

  return {
    julios,
    porOnda,
    juliosMitocondria,
    picos: picosCubiertos(lampara.ondas.map((o) => o.nm)),
    factorDistancia: factor
  }
}

/** La suma de varias sesiones, para el balance del día o de la semana. */
export function dosisAcumulada(
  sesiones: SesionPBM[],
  lamparas: Lampara[]
): { julios: number; juliosMitocondria: number; sesiones: number; minutos: number } {
  let julios = 0
  let juliosMitocondria = 0
  let minutos = 0
  let contadas = 0

  for (const s of sesiones) {
    const lampara = lamparas.find((l) => l.id === s.lamparaId)
    // Una sesión cuya lámpara se borró no se puede calcular, y sumar cero es
    // más honesto que inventarle una lámpara media.
    if (!lampara) continue
    const d = dosisDeSesion(s, lampara)
    julios += d.julios
    juliosMitocondria += d.juliosMitocondria
    minutos += s.minutos
    contadas++
  }

  return { julios, juliosMitocondria, sesiones: contadas, minutos }
}

/**
 * Qué le falta a una lámpara para cubrir los cuatro picos.
 *
 * Se dice como dato y no como carencia: es para que sepas qué tienes, no para
 * empujarte a comprar otra. La app no vende lámparas.
 */
export function picosQueFaltan(lampara: Lampara): number[] {
  const cubiertos = picosCubiertos(lampara.ondas.map((o) => o.nm))
  return PICOS_KARU.filter((p) => !cubiertos.includes(p))
}

/** Si una lámpara está lo bastante descrita para calcular su dosis. */
export function lamparaCalculable(lampara: Lampara): boolean {
  return (
    lampara.ondas.length > 0 &&
    lampara.ondas.every((o) => bandaDe(o.nm) !== null && o.irradiancia > 0) &&
    lampara.distanciaRefCm > 0
  )
}

/** Los julios como se escriben aquí: «36,0 J/cm²». */
export function escribirJulios(j: number): string {
  return `${j.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} J/cm²`
}

/** La irradiancia: «12 mW/cm²». */
export function escribirIrradiancia(mw: number): string {
  return `${mw.toLocaleString('es-ES', { maximumFractionDigits: 1 })} mW/cm²`
}
