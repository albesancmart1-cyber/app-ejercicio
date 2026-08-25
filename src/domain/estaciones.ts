/**
 * Las estaciones robadas, el callo solar y la higiene de la noche.
 *
 * Tres cosas que van juntas porque las tres miden lo mismo desde ángulos
 * distintos: **si tu cuerpo sabe en qué mes vive**.
 *
 * ## El fotoperiodo, o por qué enero puede vivirse como julio
 *
 * La melatonina no mide si hay luz. Mide **cuánto dura la noche**, y esa
 * duración es la única señal que le dice al cuerpo en qué estación está. Con
 * ocho horas de oscuridad en enero —dormir de doce a ocho con el móvil hasta
 * las once— el cuerpo recibe la misma información que en pleno julio, y actúa
 * en consecuencia todo el invierno.
 *
 * No es una metáfora: es que el dato que llega es literalmente el de otra
 * estación. De ahí el nombre de la pantalla.
 *
 * ## El callo solar
 *
 * La piel no se prepara para el sol en un día. Se prepara a lo largo de meses,
 * desde el solsticio de invierno, y esa preparación tiene fases. Aquí se lleva
 * como una **racha anclada al solsticio** —no al 1 de enero, que es una fecha
 * administrativa— porque es el punto en que el arco empieza a subir.
 *
 * Y se dice lo que es: una racha de exposición, no un permiso. La app no va a
 * decirte que ya puedes tumbarte tres horas al sol de agosto.
 *
 * ## La higiene de la noche
 *
 * Lo que se apaga, a qué hora, y qué cuesta cada cosa que se queda encendida.
 * El coste se da en minutos de oscuridad perdidos, que es la unidad en que se
 * mide la amplitud, y no en una nota.
 */
import { arcoDelDia, sumarDiaIso, type Coordenadas } from './arcoSolar'
import type { CheckIn, SalidaAlExterior } from './types'

/* ══════════════════════════════════════════════ EL FOTOPERIODO ══ */

export interface MesDelAno {
  /** 1 a 12. */
  mes: number
  nombre: string
  /** Minutos de oscuridad que tocaban, de media, en ese mes y en ese sitio. */
  tocaba: number
}

export const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic'
]

export const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
]

/**
 * La oscuridad que toca cada mes en un sitio.
 *
 * Se muestrea el día 15 de cada mes, que es lo bastante representativo y evita
 * calcular trescientos sesenta y cinco arcos para pintar doce barras.
 */
export function oscuridadDelAno(anio: number, coord: Coordenadas): MesDelAno[] {
  return MESES_CORTOS.map((nombre, i) => {
    const fecha = `${anio}-${String(i + 1).padStart(2, '0')}-15`
    const arco = arcoDelDia(fecha, coord)
    return { mes: i + 1, nombre, tocaba: Math.max(0, 1440 - arco.duracionDiaMin) }
  })
}

export interface EstacionRobada {
  /** Minutos de oscuridad que tocaban hoy en tu latitud. */
  tocaba: number
  /** Los que de verdad tuviste, si se sabe. */
  tuviste?: number
  /**
   * El mes cuya noche se parece más a la que tuviste.
   *
   * Es el número que da nombre a todo esto: alguien en enero con ocho horas de
   * oscuridad está viviendo, para su melatonina, un mes de verano.
   */
  vividoComo?: number
  /** Si el mes vivido no es el real. */
  robada: boolean
}

/**
 * Qué estación está viviendo el cuerpo, frente a la que marca el calendario.
 *
 * Sin dato de oscuridad no se inventa nada: se devuelve lo que tocaba y ya.
 */
export function estacionRobada(
  fechaIso: string,
  coord: Coordenadas,
  oscuridadReal?: number
): EstacionRobada {
  const arco = arcoDelDia(fechaIso, coord)
  const tocaba = Math.max(0, 1440 - arco.duracionDiaMin)

  if (oscuridadReal === undefined) return { tocaba, robada: false }

  const anio = Number(fechaIso.slice(0, 4))
  const mesReal = Number(fechaIso.slice(5, 7))
  const meses = oscuridadDelAno(anio, coord)

  // El mes cuya noche más se parece a la que tuvo.
  const parecido = meses.reduce((a, b) =>
    Math.abs(b.tocaba - oscuridadReal) < Math.abs(a.tocaba - oscuridadReal) ? b : a
  )

  return {
    tocaba,
    tuviste: oscuridadReal,
    vividoComo: parecido.mes,
    // Dos meses de diferencia es ruido; a partir de tres, el cuerpo vive otra
    // estación. Se mide por la distancia circular: diciembre y enero son vecinos.
    robada: distanciaDeMeses(mesReal, parecido.mes) >= 3
  }
}

/** Cuántos meses hay entre dos, contando por el camino corto del círculo. */
export function distanciaDeMeses(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 12 - d)
}

/* ══════════════════════════════════════════════ EL CALLO SOLAR ══ */

export type FaseCallo = 'invierno' | 'despertar' | 'construir' | 'almacenar'

export const NOMBRES_FASE: Record<FaseCallo, string> = {
  invierno: 'Invierno',
  despertar: 'Despertar',
  construir: 'Construir',
  almacenar: 'Almacenar'
}

export interface CalloSolar {
  /** Días transcurridos desde el solsticio de invierno anterior. */
  diasDesdeSolsticio: number
  /** De esos, cuántos tuvieron sol en la piel de verdad. */
  diasConSol: number
  fase: FaseCallo
  /** Qué significa esa fase, en una línea. */
  queSignifica: string
}

/**
 * El solsticio de invierno anterior a una fecha, en el hemisferio de quien
 * pregunta.
 *
 * En el sur el invierno cae en junio, y dar por hecho el norte convertiría toda
 * esta pantalla en un sinsentido para media Tierra.
 */
export function solsticioAnterior(fechaIso: string, coord: Coordenadas): string {
  const anio = Number(fechaIso.slice(0, 4))
  const norte = coord.lat >= 0
  // Fechas aproximadas y suficientes: el solsticio se mueve un día como mucho.
  const esteAno = norte ? `${anio}-12-21` : `${anio}-06-21`
  if (fechaIso >= esteAno) return esteAno
  return norte ? `${anio - 1}-12-21` : `${anio - 1}-06-21`
}

/** Días enteros entre dos fechas ISO. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000)
}

export function calloSolar(
  fechaIso: string,
  coord: Coordenadas,
  salidas: SalidaAlExterior[] | undefined
): CalloSolar {
  const solsticio = solsticioAnterior(fechaIso, coord)
  const dias = Math.max(0, diasEntre(solsticio, fechaIso))

  // Días distintos con algún rato fuera desde el solsticio.
  const conSol = new Set(
    (salidas ?? [])
      .filter((s) => s.date >= solsticio && s.date <= fechaIso && s.minutos > 0)
      .map((s) => s.date)
  ).size

  const fase: FaseCallo =
    dias < 45 ? 'invierno' : dias < 105 ? 'despertar' : dias < 165 ? 'construir' : 'almacenar'

  return {
    diasDesdeSolsticio: dias,
    diasConSol: conSol,
    fase,
    queSignifica: {
      invierno: 'El arco todavía está bajo. Aquí no hay callo que construir: hay noche que aprovechar.',
      despertar: 'El sol empieza a subir. Ratos cortos y frecuentes valen más que uno largo.',
      construir: 'El arco sube deprisa. Es el tramo en que la piel se prepara para el verano.',
      almacenar: 'El arco está en lo más alto. Es cuando la exposición cunde, y también cuando quema.'
    }[fase]
  }
}

/* ══════════════════════════════════════════════ HIGIENE DE NOCHE ══ */

export interface CostoDeLuz {
  id: string
  que: string
  /** Minutos de oscuridad que se pierden, aproximadamente. */
  cuesta: number
  /** Y qué hacer, si hay algo barato que hacer. */
  enVezDe?: string
  /**
   * Lo mismo, pero hecho con las gafas rojas puestas.
   *
   * Va por fila y no como un porcentaje general porque las gafas no arreglan
   * todas estas cosas igual, y una de ellas no la arreglan en absoluto.
   */
  conGafas: number
  /** Y por qué no baja a cero. Es la parte que hace honesta la columna. */
  loQueQueda: string
}

/**
 * Lo que cuesta cada cosa encendida, en minutos de oscuridad, con las gafas
 * rojas puestas y sin ellas.
 *
 * Se da en minutos y no en una nota porque los minutos son la unidad en que se
 * mide la amplitud: así el coste se puede sumar a lo que ya se lleva y verse
 * como lo que es. Las cifras son órdenes de magnitud, no medidas de laboratorio.
 *
 * La segunda columna existe porque la primera, sola, es una lista de reproches:
 * en enero, apagarlo todo al ocaso es no hacer nada desde las seis de la tarde.
 * Las gafas son la salida real —tapan el canal por donde va la señal, ver
 * `gafasRojas.ts`—, y por eso conviene mirar las dos filas donde **no** bajan
 * gran cosa: el móvil, que engancha por lo que sale en la pantalla, y la luz de
 * la calle entrando de madrugada, que no baja nada porque a esa hora las gafas
 * están en la mesilla y no en tu cara.
 */
export const COSTES: CostoDeLuz[] = [
  {
    id: 'techo',
    que: 'La luz del techo después del ocaso',
    cuesta: 90,
    conGafas: 10,
    loQueQueda: 'Lo que se cuela por los lados, y el rato que te las quitas para ver algo bien.',
    enVezDe: 'Lámparas bajas, cálidas, por debajo de la altura de los ojos.'
  },
  {
    id: 'movil',
    que: 'El móvil en la cama',
    cuesta: 60,
    conGafas: 15,
    loQueQueda:
      'La luz se va casi entera; lo que no se va es la hora. La pantalla te mantiene despierto por lo que sale en ella.',
    enVezDe: 'Fuera de la habitación. Cargarlo en otro sitio resuelve el resto solo.'
  },
  {
    id: 'pantalla',
    que: 'Pantalla grande hasta tarde',
    cuesta: 45,
    conGafas: 8,
    loQueQueda: 'Poco, si no te las quitas. Una serie es más fácil de ver con ellas que un texto.',
    enVezDe: 'Filtro cálido y la lámpara del salón encendida detrás, para que no sea el único foco.'
  },
  {
    id: 'bano',
    que: 'Encender el baño de madrugada',
    cuesta: 20,
    conGafas: 2,
    loQueQueda: 'Casi nada, si las llevas puestas. A las tres de la mañana casi nunca las llevas.',
    enVezDe: 'Una luz roja de noche. Es la única que no borra lo que llevas acumulado.'
  },
  {
    id: 'persiana',
    que: 'Dormir con luz de la calle entrando',
    cuesta: 30,
    conGafas: 30,
    loQueQueda: 'Todo. Duermes sin ellas, así que aquí no hacen absolutamente nada.',
    enVezDe: 'Persiana o antifaz. Barato y se nota a la primera noche.'
  }
]

export interface HigieneDeNoche {
  /** Cuándo empieza a contar la noche: el ocaso de hoy. */
  ocaso: number | null
  /** La oscuridad que toca en esta fecha y latitud. */
  nocheQueToca: number
  /** Lo declarado en el test de la mañana, si se declaró. */
  cuidada?: boolean
  costes: CostoDeLuz[]
}

export function higieneDeNoche(
  fechaIso: string,
  coord: Coordenadas,
  checkIns: CheckIn[] | undefined
): HigieneDeNoche {
  const arco = arcoDelDia(fechaIso, coord)
  const c = (checkIns ?? []).find((x) => x.date === fechaIso)
  return {
    ocaso: arco.pasos.orto.tarde,
    nocheQueToca: Math.max(0, 1440 - arco.duracionDiaMin),
    cuidada: c?.lightHygiene,
    costes: COSTES
  }
}

/* ══════════════════════════════════════════════ SKYGAZING ══ */

export interface Skygazing {
  /** Cuándo mirar al cielo por la tarde: del ocaso al fin del crepúsculo civil. */
  desde: number | null
  hasta: number | null
  /** Y por la mañana, la ventana equivalente. */
  amanecerDesde: number | null
  amanecerHasta: number | null
  /** Si hoy existe: en la noche polar, no. */
  hayVentana: boolean
}

/**
 * Las dos ventanas de mirar al cielo, sin gafas y sin pantalla.
 *
 * El atardecer no es solo bonito: el cambio de proporción entre el rojo y el
 * azul en esos minutos es la señal que le dice al cuerpo que la noche viene, y
 * es tan informativa como la del amanecer. Dura poco y no vuelve hasta mañana.
 */
export function skygazing(fechaIso: string, coord: Coordenadas): Skygazing {
  const arco = arcoDelDia(fechaIso, coord)
  return {
    desde: arco.pasos.orto.tarde,
    hasta: arco.pasos.civil.tarde,
    amanecerDesde: arco.pasos.civil.manana,
    amanecerHasta: arco.pasos.orto.manana,
    hayVentana: arco.pasos.orto.tarde !== null && arco.pasos.civil.tarde !== null
  }
}

/** Cuántos días seguidos, hasta ayer, hubo algún rato fuera. Racha simple. */
export function rachaDeSol(
  fechaIso: string,
  salidas: SalidaAlExterior[] | undefined,
  maxDias = 400
): number {
  const conSol = new Set((salidas ?? []).filter((s) => s.minutos > 0).map((s) => s.date))
  let racha = 0
  let fecha = fechaIso
  for (let i = 0; i < maxDias; i++) {
    if (!conSol.has(fecha)) break
    racha++
    fecha = sumarDiaIso(fecha, -1)
  }
  return racha
}
