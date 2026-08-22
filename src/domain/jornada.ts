/**
 * Tu jornada contra el arco del sol.
 *
 * Este módulo existe por una corrección concreta. La app decía «sal cinco
 * minutos, el crepúsculo civil ya sirve», y eso **no es un consejo si no te
 * dejan salir**. Hay quien ficha a las siete menos cuarto en una nave sin
 * ventanas, tiene un único hueco de quince minutos a media mañana, y no vuelve
 * a pisar la calle hasta las tres de la tarde.
 *
 * Repartir consejos genéricos a esa persona es peor que no decir nada, porque
 * la deja además con la sensación de estar haciéndolo mal. Así que aquí no se
 * reparte nada: se coge **su** horario, se mira dónde está el sol en cada hueco
 * que realmente tiene, y se dice cuál sirve —o se dice que hoy ninguno sirve,
 * que también es una respuesta y es la verdadera.
 *
 * ## Lo que sale de cruzar las dos cosas
 *
 * Con el arco del día y el fichaje, la app sabe sin preguntar nada más:
 *
 *  - A qué altura estaba el sol cuando fichaste, y por tanto si tu trayecto
 *    fue de noche cerrada, de crepúsculo o ya de día.
 *  - Si el único hueco que tienes cae por encima de los umbrales que sirven.
 *  - **Cuándo tus gafas rojas de la mañana pasan a estorbar**: en Madrid, con
 *    entrada a las 06:45, del 1 de mayo al 4 de agosto el trayecto de casa al
 *    trabajo *es* la ventana del amanecer, y llevarlas puestas bloquea justo la
 *    señal que hace falta. El resto del año son correctas y no se toca nada.
 */
import type { Fichaje, Filtro, PerfilDeLuz, Profile, SalidaAlExterior } from './types'
import {
  ALTURAS,
  arcoDelDia,
  elevacionSolar,
  sumarDiaIso,
  type ArcoDelDia,
  type Coordenadas
} from './arcoSolar'

export const FILTROS: Record<Filtro, string> = {
  ninguno: 'Sin gafas',
  ambar: 'Gafas ámbar',
  rojo: 'Gafas rojas'
}

/**
 * Cuánto azul deja pasar cada filtro, de 0 a 1.
 *
 * Son las cifras que dan los fabricantes para el rango de la melanopsina, no
 * medidas propias: un filtro ámbar decente corta en torno al 90 % y uno rojo
 * prácticamente todo. Se usan para explicar, no para certificar.
 */
export const PASO_DE_AZUL: Record<Filtro, number> = {
  ninguno: 1,
  ambar: 0.08,
  rojo: 0.01
}

/** Los días laborables de toda la vida, cuando el usuario no ha dicho otra cosa. */
export const LABORABLES_POR_DEFECTO = [1, 2, 3, 4, 5]

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Qué día de la semana es una fecha ISO, de 0 (domingo) a 6 (sábado). */
export function diaSemana(fechaIso: string): number {
  return new Date(`${fechaIso}T00:00:00Z`).getUTCDay()
}

export function nombreDiaSemana(fechaIso: string): string {
  return DIAS[diaSemana(fechaIso)]
}

/** Si ese día se trabaja, según lo que el usuario tenga configurado. */
export function esLaborable(fechaIso: string, perfil: Profile | null): boolean {
  const dias = perfil?.diasLaborables ?? LABORABLES_POR_DEFECTO
  return dias.includes(diaSemana(fechaIso))
}

/** Si el usuario ha puesto sus coordenadas, y por tanto hay arco que calcular. */
export function tieneSitio(perfil: Profile | null): perfil is Profile & Coordenadas {
  return (
    perfil !== null &&
    typeof perfil.lat === 'number' &&
    typeof perfil.lon === 'number' &&
    Number.isFinite(perfil.lat) &&
    Number.isFinite(perfil.lon)
  )
}

export function coordenadasDe(perfil: Profile | null): Coordenadas | null {
  return tieneSitio(perfil) ? { lat: perfil.lat, lon: perfil.lon } : null
}

/** Para qué sirve un momento del día, mirando solo la altura del sol. */
export interface QueSirve {
  elevacion: number
  /** Hay azul de sobra para mover la fase del reloj. */
  fase: boolean
  uva: boolean
  uvb: boolean
}

export function queSirve(
  fechaIso: string,
  coord: Coordenadas,
  minutos: number,
  desfaseMin?: number
): QueSirve {
  const elevacion = elevacionSolar(fechaIso, coord, minutos, desfaseMin)
  return {
    elevacion,
    fase: elevacion >= ALTURAS.civil,
    uva: elevacion >= ALTURAS.uva,
    uvb: elevacion >= ALTURAS.uvb
  }
}

/** Un hueco del día en que se puede estar fuera, ya juzgado. */
export interface Hueco {
  desde: number
  minutos: number
  /** En el mejor instante del hueco, que es el que decide si merece la pena. */
  mejor: QueSirve
  sirve: boolean
}

/**
 * Juzga un rato libre: si a esa hora hay algo que coger.
 *
 * Se mira el **mejor** instante del hueco y no el primero, porque un descanso
 * de quince minutos a las 09:45 puede empezar por debajo de un umbral y acabar
 * por encima, y lo que cuenta es si en algún momento hubo algo.
 */
export function juzgarHueco(
  fechaIso: string,
  coord: Coordenadas,
  desde: number,
  minutos: number,
  desfaseMin?: number
): Hueco {
  const arco = arcoDelDia(fechaIso, coord, desfaseMin)
  // El sol sube hasta el mediodía y baja después: el mejor instante del hueco
  // es su extremo más cercano al mediodía solar.
  const hasta = desde + Math.max(0, minutos)
  const mejorMinuto = Math.min(Math.max(arco.mediodiaSolar, desde), hasta)
  const mejor = queSirve(fechaIso, coord, mejorMinuto, desfaseMin)
  return { desde, minutos, mejor, sirve: mejor.fase }
}

/**
 * El aviso de las gafas: si el trayecto de casa al trabajo cae dentro de la
 * ventana que sirve para la fase, llevar filtro puesto la desperdicia.
 *
 * Se comprueba contra la hora de entrada real y contra el arco de hoy, así que
 * la respuesta cambia sola con la estación. No dice que las gafas estén mal:
 * dice **hoy**, para este día concreto.
 */
export interface AvisoGafas {
  /** Hoy, a esa hora, hay luz que sirve. */
  hayLuzAprovechable: boolean
  /** Y encima lleva un filtro que la bloquea. */
  filtroEstorba: boolean
  elevacion: number
}

export function avisoDeGafas(
  fechaIso: string,
  coord: Coordenadas,
  minutosEntrada: number,
  filtro: Filtro,
  desfaseMin?: number
): AvisoGafas {
  const q = queSirve(fechaIso, coord, minutosEntrada, desfaseMin)
  return {
    hayLuzAprovechable: q.fase,
    filtroEstorba: q.fase && PASO_DE_AZUL[filtro] < 0.5,
    elevacion: q.elevacion
  }
}

/**
 * Entre qué fechas el filtro de la mañana estorba, para poder avisar con
 * antelación en vez de solo el mismo día.
 *
 * Devuelve los tramos del año en que a esa hora ya hay luz aprovechable. Son
 * tramos y no un solo intervalo porque el cambio de hora los parte en dos.
 */
export function tramosConLuzALaEntrada(
  anio: number,
  coord: Coordenadas,
  minutosEntrada: number,
  desfasePara: (fechaIso: string) => number
): { desde: string; hasta: string }[] {
  const tramos: { desde: string; hasta: string }[] = []
  let abierto: string | null = null
  let ultimo = ''

  for (let n = 0; n < 366; n++) {
    const d = new Date(Date.UTC(anio, 0, 1 + n))
    if (d.getUTCFullYear() !== anio) break
    const iso = d.toISOString().slice(0, 10)
    const hay = queSirve(iso, coord, minutosEntrada, desfasePara(iso)).fase
    if (hay && abierto === null) abierto = iso
    if (!hay && abierto !== null) {
      tramos.push({ desde: abierto, hasta: ultimo })
      abierto = null
    }
    ultimo = iso
  }
  if (abierto !== null) tramos.push({ desde: abierto, hasta: ultimo })
  return tramos
}

/** Cuántos minutos de la jornada caen bajo luz artificial, hoy. */
export function minutosDentro(fichaje: Fichaje, ahoraMin: number): number {
  const fin = fichaje.salida ?? ahoraMin
  return Math.max(0, fin - fichaje.entrada)
}

/** El fichaje abierto de un día, si lo hay. */
/* ══════════════════════════════════════════════ ¿ES TUYA ESA VENTANA? ══ */

/**
 * Cuántos fichajes hacen falta para atreverse a decir a qué hora entras.
 *
 * Con uno solo no se sabe nada: pudo ser el día que fuiste al médico. Tres es
 * lo mínimo para que la mediana signifique algo, y por debajo de eso la app
 * dice que no lo sabe en vez de inventárselo.
 */
export const FICHAJES_PARA_SABERLO = 3

/** Cuántos días atrás se miran los fichajes para sacar tu hora de entrada. */
export const DIAS_DE_FICHAJES = 28

/**
 * A qué hora sueles entrar, de lo que has fichado.
 *
 * **Mediana y no media**, a propósito: un sábado que entraste a las once, o el
 * día que te llamaron a las cinco de la mañana, moverían la media lo bastante
 * como para que la app se equivocara justo en el caso que importa.
 *
 * Y sale de los fichajes, no de un campo del perfil: nadie va a rellenar su
 * horario en una pantalla de ajustes, pero fichar ya lo hace.
 */
export function entradaHabitual(
  fichajes: Fichaje[] | undefined,
  hastaIso: string,
  dias = DIAS_DE_FICHAJES
): number | undefined {
  const desde = sumarDiaIso(hastaIso, -dias)
  const horas = (fichajes ?? [])
    .filter((f) => f.date >= desde && f.date <= hastaIso)
    .map((f) => f.entrada)
    .sort((a, b) => a - b)

  if (horas.length < FICHAJES_PARA_SABERLO) return undefined
  const mitad = Math.floor(horas.length / 2)
  return horas.length % 2 === 1 ? horas[mitad] : Math.round((horas[mitad - 1] + horas[mitad]) / 2)
}

/**
 * De quién es la ventana de la mañana: tuya, del trabajo, o no se sabe.
 *
 *  - `tuya`: acaba antes de que entres, o hoy no trabajas.
 *  - `parte`: empieza antes de que entres y acaba después. Hay un trozo tuyo,
 *    y `hastaQue` dice hasta cuándo.
 *  - `trabajas`: ya estás dentro cuando empieza. No es tuya.
 *  - `no_se_sabe`: aún no hay fichajes suficientes. Se dice, y no se supone.
 */
export type DeQuienEsLaVentana = 'tuya' | 'parte' | 'trabajas' | 'no_se_sabe'

export interface VentanaYTuJornada {
  de: DeQuienEsLaVentana
  /** Hasta qué hora es tuya de verdad, cuando solo lo es en parte. */
  hastaQue?: number
  /** La hora a la que sueles entrar, si se sabe. */
  entrada?: number
}

/**
 * Cruza la ventana de fase con tu horario real.
 *
 * Existe para que la app deje de decirle «sal fuera entre las 05:04 y las
 * 07:03» a quien a las seis y media ya está fichado en una nave sin ventanas.
 * Eso no es un consejo: es un reproche con formato de consejo, y es justo lo
 * que este módulo se escribió para no hacer.
 *
 * No devuelve un texto, sino de quién es la ventana. Quien lo pinte decide qué
 * decir, y así el mismo juicio sirve para las tres esferas y para el parte.
 */
export function ventanaContraTuJornada(
  fechaIso: string,
  ventana: { desde: number | null; hasta: number | null },
  perfil: Profile | null,
  fichajes: Fichaje[] | undefined
): VentanaYTuJornada {
  // Un día libre es tuyo entero, y eso se sabe sin mirar ningún fichaje.
  if (!esLaborable(fechaIso, perfil)) return { de: 'tuya' }
  if (ventana.desde === null || ventana.hasta === null) return { de: 'tuya' }

  const entrada = entradaHabitual(fichajes, fechaIso)
  if (entrada === undefined) return { de: 'no_se_sabe' }

  if (entrada >= ventana.hasta) return { de: 'tuya', entrada }
  if (entrada <= ventana.desde) return { de: 'trabajas', entrada }
  return { de: 'parte', hastaQue: entrada, entrada }
}

export function fichajeAbierto(fichajes: Fichaje[] | undefined, fechaIso: string): Fichaje | undefined {
  return fichajes?.find((f) => f.date === fechaIso && f.salida === undefined)
}

/**
 * Cuánto azul te está llegando de verdad ahora mismo, en lux equivalentes.
 *
 * Es una cuenta deliberadamente simple —los lux del sitio por lo que deja pasar
 * el filtro— y su valor está en la comparación, no en el número: 450 lux de LED
 * frío sin gafas y con gafas ámbar son dos días distintos, y esto es lo que lo
 * hace visible.
 */
export function azulEfectivo(luz: Pick<PerfilDeLuz, 'lux' | 'temperaturaK' | 'filtro'>): number {
  // Un LED cálido de 2 700 K trae bastante menos azul que uno frío de 5 700 K.
  // La proporción entre ambos se aproxima por su temperatura de color.
  const porTemperatura = Math.min(1, Math.max(0.15, (luz.temperaturaK - 2000) / 4000))
  return luz.lux * porTemperatura * PASO_DE_AZUL[luz.filtro]
}

/**
 * Si el filtro cuesta amplitud o no.
 *
 * Es la parte tranquilizadora de la cuenta, y merece decirse: por debajo de mil
 * lux la luz de interior **nunca iba a dar contraste** de todas formas, así que
 * ponerse las gafas ámbar en el taller no le quita amplitud a nadie. Lo que
 * quita amplitud es la falta de día, no el filtro.
 */
export const LUX_QUE_EMPIEZAN_A_CONTAR = 1000

export function filtroCuestaAmplitud(luz: Pick<PerfilDeLuz, 'lux' | 'filtro'>): boolean {
  return luz.filtro !== 'ninguno' && luz.lux >= LUX_QUE_EMPIEZAN_A_CONTAR
}

/** Todo lo que la app sabe de un día de trabajo, junto. */
export interface ResumenJornada {
  arco: ArcoDelDia
  laborable: boolean
  fichaje?: Fichaje
  minutosDentro: number
  /** Los ratos que sí estuvo fuera, ya juzgados. */
  huecos: Hueco[]
  /** Minutos fuera que sirvieron para mover la fase. */
  minutosUtiles: number
  gafas?: AvisoGafas
}

export function resumenDeJornada(
  fechaIso: string,
  perfil: Profile | null,
  fichajes: Fichaje[] | undefined,
  salidas: SalidaAlExterior[] | undefined,
  ahoraMin: number,
  desfaseMin?: number
): ResumenJornada | null {
  const coord = coordenadasDe(perfil)
  if (!coord) return null

  const arco = arcoDelDia(fechaIso, coord, desfaseMin)
  const fichaje = fichajes?.find((f) => f.date === fechaIso)
  const delDia = (salidas ?? []).filter((s) => s.date === fechaIso)

  const huecos = delDia.map((s) => juzgarHueco(fechaIso, coord, s.desde, s.minutos, desfaseMin))
  const minutosUtiles = huecos.filter((h) => h.sirve).reduce((t, h) => t + h.minutos, 0)

  return {
    arco,
    laborable: esLaborable(fechaIso, perfil),
    fichaje,
    minutosDentro: fichaje ? minutosDentro(fichaje, ahoraMin) : 0,
    huecos,
    minutosUtiles,
    gafas: fichaje
      ? avisoDeGafas(fechaIso, coord, fichaje.entrada, fichaje.luz.filtro, desfaseMin)
      : undefined
  }
}
