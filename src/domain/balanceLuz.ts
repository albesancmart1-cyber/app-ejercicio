/**
 * ¿He tomado luz suficiente hoy?
 *
 * La pregunta parece sencilla y tiene una trampa que conviene enseñar antes que
 * esconder: **no existe consenso sobre cuántos julios por centímetro cuadrado
 * de luz roja necesita una persona al día**. Ninguna cifra redonda está
 * respaldada. Poner una y llamarla «tu objetivo» sería vender algo.
 *
 * Así que aquí el cien por cien no es un número de manual: **es el arco**. Lo
 * que el sol ofrecía hoy en tu latitud y en tu fecha, contra lo que te llegó.
 * Eso sí se puede calcular, y tiene dos propiedades que lo hacen honesto:
 *
 *  - En diciembre, en Madrid, la barra de UVB no sale en rojo. **No sale**,
 *    porque el sol no pasa de 26° y no había nada que coger. No es un fallo del
 *    usuario y la app no se lo va a cobrar como tal.
 *  - Alguien en Islandia no tiene peor balance por vivir donde vive. Se le mide
 *    contra su propio cielo, no contra el de Málaga.
 *
 * ## El azul no se mide en cantidad
 *
 * Con el azul la pregunta «¿cuánto?» está mal planteada. Lo que importa es
 * **cuándo**, y son tres ventanas con tres respuestas distintas: el pulso de la
 * mañana, que pone el reloj en hora; el mediodía, donde ya da igual porque la
 * curva de respuesta está plana; y después del ocaso, donde cuenta en contra.
 * Por eso el azul se puntúa por ventanas y no por lux acumulados.
 */
import type {
  DiaDeSol,
  Fichaje,
  Filtro,
  Lampara,
  SalidaAlExterior,
  SesionPBM,
  Session
} from './types'
import { ALTURAS, arcoDelDia, elevacionSolar, type Coordenadas } from './arcoSolar'
import { dosisAcumulada } from './fotobiomodulacion'
import { minutosFueraDelEntreno } from './entornoEntreno'
import { PASO_DE_AZUL, juzgarHueco } from './jornada'
import { minutosDe } from './reparto'
import { minutosConGafas, minutosQueValen } from './gafasRojas'

/** Las cuatro cosas que se miden, y que no son intercambiables entre sí. */
export type Banda4 = 'rojo' | 'ultravioleta' | 'azul' | 'oscuridad'

export const NOMBRES_BANDA4: Record<Banda4, string> = {
  rojo: 'Rojo e infrarrojo',
  ultravioleta: 'Ultravioleta',
  azul: 'Azul de día',
  oscuridad: 'Oscuridad de noche'
}

export interface BarraBalance {
  banda: Banda4
  /**
   * De 0 a 1, o `null` cuando **hoy no había nada que coger**. Es la
   * distinción que hace honesto todo esto: cero es no haberlo aprovechado y
   * `null` es que el cielo no lo ofrecía.
   */
  fraccion: number | null
  /** Qué explica ese número, en una línea. */
  detalle: string
  /**
   * Contra qué se mide el cien por cien.
   *
   * Va aparte del detalle porque son dos preguntas distintas —«cuánto llevo» y
   * «cuánto es todo»— y porque una barra que no dice contra qué se mide es una
   * barra que no significa nada. Ausente en las que no tienen referencia
   * numérica, como la del azul, que va por ventanas y no por cantidad.
   */
  referencia?: string
}

/** Un rato en horas y minutos, para las referencias de las barras. */
function escribirRato(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}

export interface BalanceDelDia {
  fecha: string
  barras: BarraBalance[]
  /** Minutos que hoy hubo disponibles de sol útil, por si hace falta explicarlo. */
  disponibleMin: number
  /** Y cuántos se aprovecharon. */
  aprovechadoMin: number
}

/**
 * Cuánto rojo e infrarrojo ofrece el sol en un día.
 *
 * Se aproxima por los **minutos con el sol por encima del horizonte**: el rojo
 * y el infrarrojo están presentes durante todo el arco —de hecho son más de la
 * mitad de lo que entrega el sol— y a diferencia del UVB no necesitan una
 * altura mínima. El amanecer y el ocaso son de los momentos más ricos.
 */
function disponibleRojoMin(fecha: string, coord: Coordenadas, desfase?: number): number {
  return arcoDelDia(fecha, coord, desfase).duracionDiaMin
}

/**
 * Qué parte del día disponible se toma como el cien por cien de la barra.
 *
 * ## Por qué no es el cien por cien
 *
 * Hasta ahora lo era, y era una mala referencia. La barra de rojo se llenaba
 * con **todos** los minutos de sol del día —quince horas fuera en un junio de
 * Madrid— y la de ultravioleta con la ventana de UVB entera. Eso no es una
 * referencia humana, es una astronómica: mide lo que el cielo ofrecía, no lo
 * que una persona puede coger. Una barra cuyo máximo nadie puede alcanzar no
 * dice nada, porque siempre estás al ocho por ciento de algo.
 *
 * Y en el caso del ultravioleta era peor que inútil. Llenar esa barra serían
 * varias dosis eritemáticas seguidas: un máximo que **no deberías querer
 * alcanzar**.
 *
 * ## De dónde sale la mitad
 *
 * De poner el listón donde está la diferencia que importa. El ser humano
 * moderno pasa alrededor del **92 % de su tiempo en interiores**, y sale una
 * mediana de poco más de una hora al día. Del otro lado, quien trabaja fuera
 * recibe en torno al 10 % del ultravioleta ambiental disponible, y hasta el
 * 14 % medido en obreros de la construcción — la diferencia entre «estar
 * fuera» y «recibir» es la sombra, la ropa y que un cuerpo de pie no es un
 * sensor tumbado.
 *
 * La mitad del día disponible al aire libre es exigente y es alcanzable, y
 * separa con claridad a quien vive dentro de quien vive fuera. Ese es el
 * trabajo de una referencia.
 *
 * ## Lo que esto no significa
 *
 * Que llenar la barra de ultravioleta sea un objetivo. Estar fuera medio día
 * es sano; **estar al sol de mediodía medio día no lo es**, y esa diferencia la
 * marca el tiempo hasta enrojecer, que la app enseña aparte y es el que manda.
 * Esta barra mide si tu día se parece al de alguien que vive fuera. No es una
 * receta de cuánto sol tomar.
 */
export const PARTE_DEL_DIA_QUE_CUENTA = 0.5

/** Cuánto tiempo pasa en interiores el ser humano moderno, de media. */
export const HORAS_DENTRO_PCT = 92

/**
 * Equivalencia entre una sesión de lámpara y estar al sol, en minutos.
 *
 * Es una conversión **aproximada y a la baja**, y se dice: un panel entrega en
 * diez minutos una irradiancia de rojo comparable a la de un buen rato de sol
 * en esa banda, pero le faltan el espectro completo, el UVB y la señal de fase.
 * Sirve para que la barra no ignore la lámpara, no para decir que la sustituya.
 */
export const MIN_SOL_POR_JULIO = 1.2

export interface DatosDelDia {
  fecha: string
  coord: Coordenadas
  desfaseMin?: number
  /** Ratos fuera apuntados, con su hora. */
  salidas?: SalidaAlExterior[]
  /** El sol apuntado a la vieja usanza, por si no hay salidas con hora. */
  sol?: DiaDeSol
  sesionesPBM?: SesionPBM[]
  lamparas?: Lampara[]
  fichaje?: Fichaje
  /** Los entrenos del día, por si alguno se hizo fuera o con descansos fuera. */
  sessions?: Session[]
  /** Minutos desde medianoche en que se apagó todo y en que se levantó. */
  oscuridadDesde?: number
  oscuridadHasta?: number
  /**
   * Y en que se pusieron las gafas de bloqueo, si se pusieron antes de apagar.
   *
   * Cuenta para las dos barras de la noche, pero no igual en las dos: ver
   * `barraAzul` y `barraOscuridad`, que es donde está la diferencia y por qué.
   */
  gafasDesde?: number
  gafas?: Filtro
}

/** Minutos al aire libre apuntados hoy, vengan de donde vengan. */
function minutosFuera(d: DatosDelDia): number {
  /*
   * Unidos y no sumados: dos actividades a la vez —al sol y descalzo— dejan dos
   * registros del mismo rato, y sumarlos inflaba la barra de rojo al doble.
   */
  const conHora = minutosDe(
    (d.salidas ?? []).map((s) => ({ desde: s.desde, hasta: s.desde + Math.max(0, s.minutos) }))
  )
  /*
   * El entreno aporta lo suyo: entero si fue al aire libre, y si no, los
   * descansos que se pasaron fuera. Se suma en vez de unirse porque ocurre
   * dentro del bloque del entreno y no se solapa con las salidas apuntadas a
   * mano — quien está entrenando no está además apuntando un rato de sol.
   */
  const delEntreno = (d.sessions ?? []).reduce(
    (t, s) => t + (s.date === d.fecha ? minutosFueraDelEntreno(s) : 0),
    0
  )
  if (conHora > 0 || delEntreno > 0) return conHora + delEntreno
  // Si no hay salidas con hora, vale lo apuntado en el diario de sol de siempre.
  return d.sol?.minutos ?? 0
}

/** La barra de rojo e infrarrojo: sol al aire libre más lo que dieran las lámparas. */
function barraRojo(d: DatosDelDia): BarraBalance {
  const disponible = disponibleRojoMin(d.fecha, d.coord, d.desfaseMin)
  if (disponible === 0) {
    return {
      banda: 'rojo',
      fraccion: null,
      detalle: 'Hoy el sol no llega a salir. No había nada que coger.'
    }
  }

  const fuera = minutosFuera(d)
  const lampara = dosisAcumulada(d.sesionesPBM ?? [], d.lamparas ?? [])
  const equivalente = lampara.juliosMitocondria * MIN_SOL_POR_JULIO

  const partes: string[] = []
  if (fuera > 0) partes.push(`${Math.round(fuera)} min fuera`)
  if (lampara.sesiones > 0) partes.push(`lámpara ${lampara.juliosMitocondria.toFixed(0)} J/cm²`)

  const referencia = disponible * PARTE_DEL_DIA_QUE_CUENTA
  return {
    banda: 'rojo',
    fraccion: Math.min(1, (fuera + equivalente) / referencia),
    detalle: partes.length ? partes.join(' + ') : 'Ni un minuto fuera, ni lámpara.',
    referencia: `El 100 % es media jornada de sol fuera: ${escribirRato(referencia)} hoy.`
  }
}

/**
 * La barra de ultravioleta: solo cuenta el tiempo pasado **dentro de la ventana
 * de UVB**, porque fuera de ella no hay síntesis por mucho sol que dé.
 */
function barraUltravioleta(d: DatosDelDia): BarraBalance {
  const arco = arcoDelDia(d.fecha, d.coord, d.desfaseMin)
  const uvb = arco.pasos.uvb

  if (uvb.manana === null || uvb.tarde === null) {
    return {
      banda: 'ultravioleta',
      fraccion: null,
      detalle: `El sol no pasa de ${arco.elevacionMaxima.toFixed(0)}° hoy. No hay ventana de UVB.`
    }
  }

  const ventana = uvb.tarde - uvb.manana
  let dentro = 0
  for (const s of d.salidas ?? []) {
    const desde = Math.max(s.desde, uvb.manana)
    const hasta = Math.min(s.desde + s.minutos, uvb.tarde)
    if (hasta > desde) dentro += hasta - desde
  }

  const referencia = ventana * PARTE_DEL_DIA_QUE_CUENTA
  return {
    banda: 'ultravioleta',
    fraccion: Math.min(1, dentro / referencia),
    detalle:
      dentro > 0
        ? `${Math.round(dentro)} min dentro de la ventana`
        : d.fichaje
          ? 'Estabas dentro toda la ventana. No es un fallo tuyo: es tu turno.'
          : 'Ni un minuto dentro de la ventana de hoy.',
    referencia: `El 100 % es media ventana de UVB: ${escribirRato(referencia)} hoy. No es un objetivo que haya que llenar — quien manda es el tiempo hasta enrojecer.`
  }
}

/**
 * Cuántos minutos de tarde artificial se dejan pasar antes de contarlos en contra.
 *
 * Hay que elegir un número y conviene decir cuál y por qué. Marcar cualquier
 * bombilla encendida después del ocaso señalaría a todo el mundo todas las
 * noches, y una alarma que suena siempre no dice nada. Tres horas dejan vivir
 * una tarde normal —en marzo, en Madrid, apagar a las diez pasa— y siguen
 * marcando lo que de verdad aplana la amplitud: llegar a medianoche con todo
 * encendido.
 */
export const MINUTOS_DE_TARDE_QUE_PASAN = 180

export function ventanaDeFase(fecha: string, coord: Coordenadas, desfase?: number) {
  const arco = arcoDelDia(fecha, coord, desfase)
  const desde = arco.pasos.civil.manana
  // Una hora larga después del orto: pasado eso, el pulso pierde fuerza.
  const hasta = arco.pasos.orto.manana !== null ? arco.pasos.orto.manana + 90 : null
  return { desde, hasta }
}

/**
 * La barra de azul: tres ventanas, no una cantidad.
 *
 * Se puntúa sobre tres tercios. El primero se gana con **cualquier** rato fuera
 * antes de que el sol suba mucho: es el pulso que pone el reloj en hora, y para
 * eso bastan minutos. El segundo, con haber pisado la calle en algún momento
 * del día. El tercero se conserva no habiendo tomado azul después del ocaso.
 */
function barraAzul(d: DatosDelDia): BarraBalance {
  const arco = arcoDelDia(d.fecha, d.coord, d.desfaseMin)
  const fase = ventanaDeFase(d.fecha, d.coord, d.desfaseMin)
  const salidas = d.salidas ?? []

  let puntos = 0
  const partes: string[] = []

  const enFase =
    fase.desde !== null &&
    fase.hasta !== null &&
    salidas.some(
      (s) =>
        s.desde + s.minutos > fase.desde! &&
        s.desde < fase.hasta! &&
        PASO_DE_AZUL[s.filtro] > 0.5
    )
  if (enFase) {
    puntos++
    partes.push('pulso de fase sí')
  } else {
    partes.push('pulso de fase no')
  }

  const algoDeDia = salidas.some((s) =>
    juzgarHueco(d.fecha, d.coord, s.desde, s.minutos, d.desfaseMin).sirve
  )
  if (algoDeDia) puntos++

  /*
   * El tercer tercio se conserva salvo que se demuestre lo contrario: si no hay
   * dato de la noche, no se penaliza a nadie por no haberlo apuntado.
   *
   * Aquí las gafas cuentan enteras, y en la barra de oscuridad no. No es una
   * incoherencia: esta barra pregunta si hubo **azul** después del ocaso, y las
   * dos clases de gafas cortan el azul —eso lo hacen las dos bien—. La otra
   * pregunta cuánta noche hubo para la melatonina, y eso lo mide una célula que
   * tiene el pico en 480 nm y sigue respondiendo al verde, que es justo lo que
   * las ámbar dejan pasar. Misma noche, dos preguntas distintas.
   */
  const ocaso = arco.pasos.orto.tarde
  const seApagoElAzul =
    d.gafasDesde !== undefined && d.gafas !== undefined
      ? Math.min(d.oscuridadDesde ?? d.gafasDesde, d.gafasDesde)
      : d.oscuridadDesde
  const trasnochoConLuz =
    ocaso !== null &&
    seApagoElAzul !== undefined &&
    seApagoElAzul > ocaso + MINUTOS_DE_TARDE_QUE_PASAN
  if (!trasnochoConLuz) puntos++
  else partes.push('azul después del ocaso')

  return { banda: 'azul', fraccion: puntos / 3, detalle: partes.join(' · ') }
}

/**
 * La barra de oscuridad: la mitad del contraste que sí se controla entera.
 *
 * Se mide contra la noche que **tocaba** hoy —la que hay entre el ocaso y el
 * orto siguiente— y no contra unas ocho horas fijas, porque en junio esa noche
 * dura menos y exigir lo mismo sería absurdo.
 */
function barraOscuridad(d: DatosDelDia): BarraBalance {
  const arco = arcoDelDia(d.fecha, d.coord, d.desfaseMin)
  const nocheQueTocaba = Math.max(60, 1440 - arco.duracionDiaMin)

  if (d.oscuridadDesde === undefined || d.oscuridadHasta === undefined) {
    return { banda: 'oscuridad', fraccion: null, detalle: 'Sin apuntar todavía.' }
  }

  // La noche cruza la medianoche: se envuelve el día.
  const aOscuras =
    d.oscuridadHasta >= d.oscuridadDesde
      ? d.oscuridadHasta - d.oscuridadDesde
      : 1440 - d.oscuridadDesde + d.oscuridadHasta

  /*
   * El rato con las gafas puestas antes de apagar cuenta, pero con descuento:
   * las rojas valen 0,9 de un minuto a oscuras y las ámbar 0,5. El porqué está
   * en `gafasRojas.ts`, y se resume en que la célula que mide esto tiene el
   * pico en 480 nm y las ámbar dejan pasar el verde entero.
   *
   * Solo cuenta el tramo de **antes** de apagar. Desde que se apaga todo ya hay
   * oscuridad de verdad, y sumar las gafas ahí sería contar el minuto dos veces.
   */
  const conGafas = minutosConGafas(d.gafasDesde, d.oscuridadDesde)
  const valen = minutosQueValen(conGafas, d.gafas)
  const minutos = aOscuras + valen

  const escrito = (m: number) =>
    `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min`

  return {
    banda: 'oscuridad',
    fraccion: Math.min(1, minutos / nocheQueTocaba),
    detalle:
      valen > 0
        ? `${escrito(aOscuras)} a oscuras y ${escrito(conGafas)} con gafas, que valen ${escrito(valen)}`
        : `${escrito(aOscuras)} a oscuras`
  }
}

/** El balance de un día, con sus cuatro barras. */
export function balanceDelDia(d: DatosDelDia): BalanceDelDia {
  const barras = [barraRojo(d), barraUltravioleta(d), barraAzul(d), barraOscuridad(d)]
  return {
    fecha: d.fecha,
    barras,
    disponibleMin: disponibleRojoMin(d.fecha, d.coord, d.desfaseMin),
    aprovechadoMin: minutosFuera(d)
  }
}

/**
 * La deuda de fase de la semana.
 *
 * Cada día laborable en que no hubo pulso de mañana suma atraso, porque el
 * reloj humano corre largo —unas 24 h 12 min— y sin la señal que lo pone en
 * hora se va retrasando. Doce minutos por día es la cifra que se usa, que es el
 * orden de magnitud aceptado del período libre.
 */
export const ATRASO_POR_DIA_SIN_LUZ = 12

export function deudaDeFase(
  dias: { fecha: string; huboPulso: boolean }[]
): { minutos: number; diasSinPulso: number } {
  const sinPulso = dias.filter((d) => !d.huboPulso)
  return { minutos: sinPulso.length * ATRASO_POR_DIA_SIN_LUZ, diasSinPulso: sinPulso.length }
}

/**
 * Qué se le propone a alguien el fin de semana.
 *
 * No hábitos nuevos: **el amanecer**, con su hora y su ventana. Es la única
 * herramienta que revierte de verdad cinco días de LED, y solo se tiene dos
 * veces por semana.
 */
export interface PlanDeAmanecer {
  /** Minutos desde medianoche: cuándo empieza a merecer la pena salir. */
  desde: number
  hasta: number
  /** Minutos de deuda que ese rato puede recuperar. */
  recupera: number
}

export function planDeAmanecer(
  fecha: string,
  coord: Coordenadas,
  deudaMin: number,
  desfase?: number
): PlanDeAmanecer | null {
  const v = ventanaDeFase(fecha, coord, desfase)
  if (v.desde === null || v.hasta === null) return null
  // Un pulso bueno adelanta del orden de tres cuartos de lo que se debe, sin
  // pasarse: la fase no se arregla de golpe y prometerlo sería mentir.
  return { desde: Math.round(v.desde), hasta: Math.round(v.hasta), recupera: Math.round(deudaMin * 0.75) }
}

/** Si a esa hora, en ese sitio, ya hay azul que sirva. */
export function hayLuzQueSirve(
  fecha: string,
  coord: Coordenadas,
  minutos: number,
  desfase?: number
): boolean {
  return elevacionSolar(fecha, coord, minutos, desfase) >= ALTURAS.civil
}
