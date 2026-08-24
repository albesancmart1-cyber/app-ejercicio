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
import type { Lampara, LamparaEnSesion, SesionPBM, TramoDeLamparas, ZonaPBM } from './types'
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

/**
 * Lo que puso cada lámpara, cuando hubo varias a la vez.
 *
 * Va **por lámpara y por distancia**, no solo por lámpara: si a mitad de sesión
 * la acercaste, son dos filas del mismo aparato con sus minutos y su factor
 * cada una. Promediarlas daría un factor que no ocurrió en ningún momento.
 */
export interface DosisDeLampara {
  lamparaId: string
  nombre: string
  distanciaCm: number
  /** Cuánto se ha multiplicado o dividido su irradiancia por la distancia. */
  factorDistancia: number
  /** Cuántos minutos estuvo encendida así. */
  minutos: number
  julios: number
  juliosMitocondria: number
}

export interface DosisSesion {
  /** Suma de todas las ondas, en J/cm². */
  julios: number
  porOnda: DosisDeOnda[]
  /** Solo lo que va a la mitocondria: rojo e infrarrojo. */
  juliosMitocondria: number
  /** Cuáles de los cuatro picos de Karu cubren, juntas, las lámparas usadas. */
  picos: number[]
  /** Lo que puso cada lámpara. Con una sola, un elemento. */
  porLampara: DosisDeLampara[]
  /** Lámparas de la sesión que ya no están en el armario y no se han podido contar. */
  lamparasPerdidas: number
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

/**
 * Las lámparas de una sesión, en las dos formas en que puede venir.
 *
 * Existe para que nadie tenga que acordarse de mirar los dos sitios. Una sesión
 * de antes de que se pudiera poner más de una trae solo `lamparaId` y
 * `distanciaCm`; una de ahora con varias trae además `lamparas`, con la primera
 * dentro. Todo lo que calcula pasa por aquí.
 */
export function lamparasDe(
  sesion: Pick<SesionPBM, 'lamparaId' | 'distanciaCm' | 'lamparas' | 'tramos'>
): LamparaEnSesion[] {
  // Con tramos, «las lámparas de la sesión» son todas las que se encendieron en
  // algún momento, sin repetir: es lo que hay que nombrar en una lista.
  if (sesion.tramos && sesion.tramos.length > 0) {
    const vistas = new Map<string, LamparaEnSesion>()
    for (const t of sesion.tramos) {
      for (const l of t.lamparas) {
        if (!vistas.has(`${l.lamparaId}@${l.distanciaCm}`)) {
          vistas.set(`${l.lamparaId}@${l.distanciaCm}`, l)
        }
      }
    }
    return [...vistas.values()]
  }
  if (sesion.lamparas && sesion.lamparas.length > 0) return sesion.lamparas
  if (!sesion.lamparaId) return []
  return [{ lamparaId: sesion.lamparaId, distanciaCm: sesion.distanciaCm }]
}

/**
 * Los trozos de una sesión, en las dos formas en que puede venir.
 *
 * Una sesión sin cambios de lámpara es un trozo único con todos sus minutos, y
 * así el cálculo es el mismo para las dos. Nadie tiene que preguntarse si esta
 * sesión tiene tramos o no.
 */
export function tramosDe(sesion: SesionPBM): TramoDeLamparas[] {
  if (sesion.tramos && sesion.tramos.length > 0) return sesion.tramos
  return [{ minutos: Math.max(0, sesion.minutos), lamparas: lamparasDe(sesion) }]
}

/**
 * La dosis de una sesión, con una lámpara o con varias a la vez.
 *
 * ## Por qué se suman, y por qué eso no es hacer trampa
 *
 * Dos paneles apuntando a la misma piel entregan cada uno sus julios, y los
 * julios se suman: es energía, no una nota media. Poner el panel grande y el
 * pequeño a la vez sobre la espalda entrega de verdad la suma de los dos, y
 * ninguna de las dos cifras por separado describiría el rato.
 *
 * Las **ondas se juntan por longitud**. Si las dos lámparas tienen un pico a
 * 660 nm, lo que le llega a la piel a 660 nm es la suma de las dos
 * irradiancias, no dos cosas distintas que casualmente coinciden. Enseñarlas
 * separadas obligaría a sumar de cabeza para saber cuánto rojo hay.
 *
 * Y los **picos de Karu se unen**, que es la razón de fondo por la que alguien
 * enciende dos lámparas: una cubre 660 y 850, la otra 810, y juntas cubren tres
 * de los cuatro. Eso solo se ve si se miran juntas.
 *
 * ## La distancia va por lámpara
 *
 * Cada una con la suya, porque cada una está donde está. Es lo que impide que
 * esto sea un atajo: una lámpara al doble de distancia aporta la cuarta parte,
 * y la suma lo refleja.
 */
export function dosisDeSesion(sesion: SesionPBM, catalogo: Lampara[]): DosisSesion {
  /** Una fila por lámpara **y distancia**: moverla a mitad son dos filas. */
  const filas = new Map<string, DosisDeLampara>()
  /** Las irradiancias por longitud de onda, ponderadas por el rato que duró cada tramo. */
  const juliosPorNm = new Map<number, number>()
  const nmsCubiertos: number[] = []
  const perdidas = new Set<string>()
  let minutosTotales = 0

  for (const tramo of tramosDe(sesion)) {
    const minutos = Math.max(0, tramo.minutos)
    const segundos = minutos * 60
    minutosTotales += minutos

    for (const puesta of tramo.lamparas) {
      const lampara = catalogo.find((l) => l.id === puesta.lamparaId)
      // Una lámpara que se borró no se puede calcular, y sumar cero es más
      // honesto que inventarle una lámpara media. Se dice cuántas faltan.
      if (!lampara) {
        perdidas.add(puesta.lamparaId)
        continue
      }

      const factor = factorDistancia(puesta.distanciaCm, lampara.distanciaRefCm)
      const clave = `${lampara.id}@${puesta.distanciaCm}`
      const fila = filas.get(clave) ?? {
        lamparaId: lampara.id,
        nombre: lampara.nombre,
        distanciaCm: puesta.distanciaCm,
        factorDistancia: factor,
        minutos: 0,
        julios: 0,
        juliosMitocondria: 0
      }
      fila.minutos += minutos

      for (const o of lampara.ondas) {
        const j = (o.irradiancia * factor * segundos) / 1000
        juliosPorNm.set(o.nm, (juliosPorNm.get(o.nm) ?? 0) + j)
        nmsCubiertos.push(o.nm)

        fila.julios += j
        const banda = bandaDe(o.nm)
        if (banda && BANDAS[banda].proposito === 'mitocondria') {
          fila.juliosMitocondria += j * BANDAS[banda].peso
        }
      }

      filas.set(clave, fila)
    }
  }

  const segundosTotales = minutosTotales * 60
  const porOnda: DosisDeOnda[] = [...juliosPorNm.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([nm, julios]) => ({
      nm,
      /*
       * La irradiancia que se enseña es la **media del rato**: los julios entre
       * los segundos que duró la sesión. Con las lámparas fijas sale la de
       * siempre; con una encendida solo la mitad del tiempo sale la mitad, que
       * es lo honesto — no estuvo dándote eso todo el rato.
       */
      irradiancia: segundosTotales > 0 ? (julios * 1000) / segundosTotales : 0,
      julios
    }))

  const porLampara = [...filas.values()]

  return {
    julios: porLampara.reduce((t, l) => t + l.julios, 0),
    porOnda,
    juliosMitocondria: porLampara.reduce((t, l) => t + l.juliosMitocondria, 0),
    picos: picosCubiertos(nmsCubiertos),
    porLampara,
    lamparasPerdidas: perdidas.size
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
    const d = dosisDeSesion(s, lamparas)
    // Una sesión de la que no queda ni una lámpara en el armario no se puede
    // calcular, y sumar cero es más honesto que inventarle una lámpara media.
    // Si de dos lámparas queda una, cuenta lo que esa puso: es lo que se sabe.
    if (d.porLampara.length === 0) continue
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
