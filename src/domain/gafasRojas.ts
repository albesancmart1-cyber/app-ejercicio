/**
 * Las gafas de bloqueo: hacer de noche con la luz encendida.
 *
 * La higiene de luz nocturna, dicha entera, es incompatible con vivir: apagarlo
 * todo al ocaso significa en enero no hacer nada desde las seis de la tarde. La
 * app puede decir lo que cuesta cada cosa encendida —esa tabla está en
 * `estaciones.ts`—, pero decirlo sin ofrecer salida es una lista de reproches.
 *
 * Las gafas son la salida, y no son un apaño: son la única herramienta de esta
 * pantalla que ataca el mecanismo por donde va la señal.
 *
 * ## Por qué funcionan
 *
 * El reloj central no mide la luz con los conos ni con los bastones: la mide
 * con unas células propias de la retina —las **ipRGC**, que llevan
 * melanopsina—, y su sensibilidad tiene un pico estrecho en **480 nm** que cae
 * a casi nada pasados los 550 (Lucas et al., 2014, para el espectro de acción
 * melanópico). Es un canal, y un canal se puede tapar: poner delante un filtro
 * que no deje pasar por debajo de su corte quita el estímulo antes de que
 * entre, y la melatonina de la noche se conserva bajo una luz que sin filtro la
 * habría hundido (Kayumov et al., 2005; Sasseville et al., 2006; Ostrin et al.,
 * 2017).
 *
 * ## Por qué las ámbar valen la mitad y no un poco menos
 *
 * Aquí hay una trampa de las cifras que merece la pena deshacer. `PASO_DE_AZUL`
 * en `jornada.ts` dice que unas ámbar dejan pasar el 8 % del **azul**, y eso es
 * verdad: como filtro de azul son casi tan buenas como unas rojas. Pero la
 * melanopsina no mide azul: mide su propia banda, y a 500 nm —verde, que las
 * ámbar dejan pasar entero— todavía responde con cerca del ochenta por ciento
 * de su máximo.
 *
 * De ahí que hagan falta dos números y no uno. Cortar por 480 quita el azul y
 * deja el canal medio abierto; cortar por 550, que es lo que hacen unas rojas
 * de verdad, lo cierra. No es prudencia: es dónde está el pico.
 *
 * ## Lo que no hacen
 *
 * Una herramienta que tenga un remedio para todo está mintiendo en algo, y esta
 * tiene agujeros que no se tapan con más filtro: solo valen puestas, se cuelan
 * por los lados si no envuelven, y duermes sin ellas. Están escritos abajo, en
 * `LO_QUE_NO_TAPAN`, y se enseñan en la pantalla y no en un pie de página
 * porque son la parte que decide si esto se usa bien o se usa de excusa.
 */
import type { Filtro } from './types'
import { FILTROS, PASO_DE_AZUL } from './jornada'

export interface Gafas {
  id: Filtro
  nombre: string
  /** Por debajo de esta longitud de onda no pasa prácticamente nada, en nm. */
  corte: number
  /** En una línea, qué son y qué dejan pasar. */
  que: string
}

/** Las dos que existen de verdad. `ninguno` no es unas gafas, es no llevarlas. */
export const GAFAS: Gafas[] = [
  {
    id: 'rojo',
    nombre: FILTROS.rojo,
    corte: 550,
    que: 'Cortan por debajo de 550 nm: se va el azul y también el verde. Lo ves todo rojo, y esa es la señal de que están haciendo su trabajo.'
  },
  {
    id: 'ambar',
    nombre: FILTROS.ambar,
    corte: 480,
    que: 'Cortan por debajo de 480 nm: quitan el azul y dejan pasar el verde. Se ve mucho mejor con ellas puestas, y por eso mismo tapan bastante menos.'
  }
]

export function gafasDe(filtro: Filtro | undefined): Gafas | undefined {
  return GAFAS.find((g) => g.id === filtro)
}

/**
 * Cuánto del estímulo **melanópico** deja pasar cada filtro, de 0 a 1.
 *
 * No es lo mismo que `PASO_DE_AZUL` y por eso está aparte: aquello mide azul y
 * esto mide la banda de la melanopsina, que llega hasta bien entrado el verde.
 * Unas ámbar cortan el 92 % del azul y solo un 60 % de esto. Son órdenes de
 * magnitud sacados del espectro de acción y del corte que declara cada filtro,
 * no medidas propias.
 */
export const PASO_MELANOPICO: Record<Filtro, number> = {
  ninguno: 1,
  ambar: 0.4,
  rojo: 0.02
}

/**
 * El descuento por las gafas de verdad, no las del catálogo.
 *
 * Se las levanta uno un momento para ver algo bien —y la melatonina se hunde en
 * minutos, así que ese rato no se promedia, cuenta entero—, y por el hueco de
 * la patilla entra luz justo hacia la retina periférica, que es donde más ipRGC
 * hay. Es una cifra a ojo, y está separada del paso melanópico para que se vea
 * que es una cosa distinta: aquella es óptica y esta es cómo se usan.
 */
export const DESCUENTO_POR_USO = 0.08

/**
 * Cuánto vale un minuto con gafas puestas comparado con un minuto a oscuras.
 *
 * Se deriva de las dos cifras de arriba en vez de escribirse a mano para que no
 * puedan separarse: cambiar el paso melanópico sin cambiar esto habría dejado
 * dos versiones del mismo hecho conviviendo.
 */
export const CUENTA_COMO_OSCURO: Record<Filtro, number> = {
  ninguno: 0,
  ambar: Math.max(0, 1 - PASO_MELANOPICO.ambar - DESCUENTO_POR_USO),
  rojo: Math.max(0, 1 - PASO_MELANOPICO.rojo - DESCUENTO_POR_USO)
}

/** Los minutos de oscuridad que valen unos minutos con las gafas puestas. */
export function minutosQueValen(minutos: number, filtro: Filtro | undefined): number {
  if (minutos <= 0 || filtro === undefined || filtro === 'ninguno') return 0
  return Math.round(minutos * CUENTA_COMO_OSCURO[filtro])
}

/** Cuánto azul deja pasar el filtro, en porcentaje, para poder decirlo. */
export function pctDeAzulQueCorta(filtro: Filtro): number {
  return Math.round((1 - PASO_DE_AZUL[filtro]) * 100)
}

/** Y cuánto de lo que de verdad mide el reloj. Casi siempre es menos. */
export function pctMelanopicoQueCorta(filtro: Filtro): number {
  return Math.round((1 - PASO_MELANOPICO[filtro]) * 100)
}

/**
 * El rato con las gafas puestas **antes** de apagar la luz, envolviendo la
 * medianoche.
 *
 * Solo cuenta ese tramo: desde que se apaga todo ya hay oscuridad de verdad, y
 * sumar las gafas ahí sería contar el mismo minuto dos veces. Ponérselas a las
 * nueve y apagar a las once y media son dos horas y media de este tramo.
 */
export function minutosConGafas(gafasDesde: number | undefined, apagado: number): number {
  if (gafasDesde === undefined) return 0
  const bruto = apagado >= gafasDesde ? apagado - gafasDesde : 1440 - gafasDesde + apagado
  // Media noche entera con las gafas puestas antes de apagar no es un dato, es
  // un dedo mal puesto en el reloj. Se descarta en vez de inflar la barra.
  return bruto > 12 * 60 ? 0 : bruto
}

/** La cuenta de una noche, con las gafas dentro y sin esconder cuál es cuál. */
export interface OscuridadDeLaNoche {
  /** Minutos con todo apagado. */
  reales: number
  /** Minutos con las gafas puestas y la luz todavía encendida. */
  conGafas: number
  /** Lo que esos minutos con gafas valen en minutos de oscuridad. */
  valen: number
  /** La suma, que es lo que va a la barra. */
  total: number
  filtro?: Filtro
}

export function oscuridadDeLaNoche(n: {
  apagado: number
  levantado: number
  gafasDesde?: number
  gafas?: Filtro
}): OscuridadDeLaNoche {
  const reales =
    n.levantado >= n.apagado ? n.levantado - n.apagado : 1440 - n.apagado + n.levantado
  const conGafas = minutosConGafas(n.gafasDesde, n.apagado)
  const valen = minutosQueValen(conGafas, n.gafas)
  return { reales, conGafas, valen, total: reales + valen, filtro: n.gafas }
}

/**
 * Lo que las gafas **no** tapan, dicho sin rodeos.
 *
 * Va en la pantalla y no en un pie de página porque es la parte que decide si
 * esto se usa bien o se usa como excusa para tener la casa encendida.
 */
export const LO_QUE_NO_TAPAN = [
  'Solo valen puestas. Quitártelas un momento para ver algo bien no se promedia: la melatonina se hunde en minutos, y ese rato cuenta entero.',
  'Lo que se cuela por los lados, si no envuelven. Las células que miden la luz no están solo en el centro de la retina, y el hueco de la patilla apunta justo adonde más cuenta.',
  'La luz de la calle mientras duermes: no las llevas puestas en la cama. Eso sigue siendo persiana o antifaz.',
  'La hora a la que sueltas el móvil. La pantalla te mantiene despierto por lo que sale en ella, no solo por su color.'
]
