/**
 * Los hábitos que no cuestan dinero: grounding, frío y ayuno estacional.
 *
 * Tres cosas con una regla común, y la regla es lo que hace que este módulo no
 * sea una lista de consejos más: **se suben por escalones y con rampa**. Nadie
 * empieza por un baño de hielo de cinco minutos ni por un ayuno de tres días, y
 * una app que ofrezca el escalón más alto desde el primer día consigue una de
 * dos cosas: que no lo haga nadie, o que alguien se haga daño.
 *
 * Así que aquí cada protocolo tiene sus escalones, y la app **solo propone el
 * siguiente**, y solo cuando el anterior lleva hecho un tiempo razonable.
 *
 * ## Y una advertencia que va en el código, no en la letra pequeña
 *
 * El frío tiene contraindicaciones reales. La app lo dice y no las esconde, no
 * ofrece nunca el escalón más alto de golpe, y no promete que ninguno de estos
 * hábitos cure nada, porque no es su trabajo saberlo.
 */
import { sumarDiaIso } from './arcoSolar'

export type Habito = 'grounding' | 'frio' | 'ayuno'

export const NOMBRES_HABITO: Record<Habito, string> = {
  grounding: 'Contacto con el suelo',
  frio: 'Frío',
  ayuno: 'Ayuno estacional'
}

export interface Escalon {
  nivel: number
  titulo: string
  que: string
  /** Días haciéndolo antes de que la app ofrezca el siguiente. */
  diasParaSubir: number
}

/* ══════════════════════════════════════════════ GROUNDING ══ */

/**
 * Las superficies valen o no valen, y no es lo mismo.
 *
 * La condición es que la superficie conduzca: tierra húmeda, hierba, arena
 * mojada, roca, agua de mar. El asfalto, la madera seca, el plástico y la suela
 * de goma no conducen, y andar descalzo por ellos es agradable pero no es esto.
 * Decirlo evita que alguien piense que lo está haciendo cuando no.
 */
export const SUPERFICIES_QUE_VALEN = [
  'Tierra, mejor si está húmeda',
  'Hierba',
  'Arena mojada',
  'Roca desnuda',
  'Agua de mar o de río'
]

export const SUPERFICIES_QUE_NO = [
  'Asfalto y acera',
  'Madera seca y tarima',
  'Baldosa de interior',
  'Cualquier suela de goma en medio'
]

export const ESCALONES_GROUNDING: Escalon[] = [
  { nivel: 1, titulo: 'Cinco minutos', que: 'Descalzo sobre hierba o tierra. Con estar de pie basta.', diasParaSubir: 7 },
  { nivel: 2, titulo: 'Quince minutos', que: 'Ya da tiempo a sentarse. Mejor por la mañana, que suma la luz.', diasParaSubir: 14 },
  { nivel: 3, titulo: 'Media hora', que: 'Andar descalzo, no solo estar. El suelo irregular trabaja el pie.', diasParaSubir: 21 },
  { nivel: 4, titulo: 'Una hora o más', que: 'Con esto ya es una costumbre y no un protocolo. Si puede ser al sol, mejor.', diasParaSubir: 0 }
]

/* ══════════════════════════════════════════════ FRÍO ══ */

/**
 * Seis escalones, del más tonto al más serio.
 *
 * La app **nunca** ofrece el sexto a quien va por el primero. Subir uno cada
 * vez es lo que hace que esto sea un hábito y no una hazaña que se abandona.
 */
export const ESCALONES_FRIO: Escalon[] = [
  { nivel: 1, titulo: 'Los últimos treinta segundos', que: 'Acaba la ducha en frío. Treinta segundos, respirando por la nariz.', diasParaSubir: 7 },
  { nivel: 2, titulo: 'Un minuto', que: 'Lo mismo, el doble de tiempo. Si tiritas al salir, has llegado.', diasParaSubir: 10 },
  { nivel: 3, titulo: 'Dos minutos', que: 'Aquí ya no es incomodidad: es aprender a estar tranquilo dentro de ella.', diasParaSubir: 14 },
  { nivel: 4, titulo: 'Ducha entera fría', que: 'De principio a fin. La respiración es lo que lo hace posible.', diasParaSubir: 21 },
  { nivel: 5, titulo: 'Salir al frío sin abrigo', que: 'Diez minutos fuera en invierno, con poca ropa. El frío del aire trabaja distinto del agua.', diasParaSubir: 30 },
  { nivel: 6, titulo: 'Inmersión', que: 'Bañera o río, unos minutos. Nunca solo y nunca hasta el temblor incontrolado.', diasParaSubir: 0 }
]

/**
 * Lo que la app dice siempre del frío, esté en el escalón que esté.
 *
 * No es letra pequeña: sale con el hábito, porque el frío es el único de los
 * tres que puede hacer daño de verdad a alguien con el corazón delicado.
 */
export const AVISO_FRIO =
  'El frío no es para todo el mundo. Si tomas medicación para el corazón o la tensión, o has tenido algún problema cardíaco, pregunta antes. Y nunca en inmersión estando solo.'

/* ══════════════════════════════════════════════ AYUNO ══ */

/**
 * El ayuno, por estaciones.
 *
 * La idea que lo ordena: el invierno es cuando históricamente había menos
 * comida, y el verano cuando había de sobra. Alinear el ayuno con eso es más
 * coherente que hacer lo mismo los doce meses — y en verano, con más luz y más
 * actividad, forzarlo suele salir mal.
 */
export type Estacion = 'invierno' | 'primavera' | 'verano' | 'otono'

export interface FaseAyuno {
  estacion: Estacion
  ventanaHoras: number
  que: string
}

export const FASES_AYUNO: FaseAyuno[] = [
  { estacion: 'invierno', ventanaHoras: 8, que: 'La ventana más corta del año. Es cuando el cuerpo lo lleva mejor y cuando históricamente había menos que comer.' },
  { estacion: 'primavera', ventanaHoras: 10, que: 'Se abre un poco. Sube la luz, sube la actividad y conviene acompañarlo.' },
  { estacion: 'verano', ventanaHoras: 12, que: 'La más ancha. Con quince horas de luz, forzar una ventana estrecha suele salir mal.' },
  { estacion: 'otono', ventanaHoras: 10, que: 'Se vuelve a cerrar, al ritmo al que se acorta el día.' }
]

/** En qué estación cae una fecha, según el hemisferio. */
export function estacionDe(fechaIso: string, lat: number): Estacion {
  const mes = Number(fechaIso.slice(5, 7))
  const norte: Estacion[] = [
    'invierno', 'invierno', 'primavera', 'primavera', 'primavera',
    'verano', 'verano', 'verano', 'otono', 'otono', 'otono', 'invierno'
  ]
  const e = norte[mes - 1]
  if (lat >= 0) return e
  // En el sur, la estación opuesta.
  const opuesta: Record<Estacion, Estacion> = {
    invierno: 'verano',
    verano: 'invierno',
    primavera: 'otono',
    otono: 'primavera'
  }
  return opuesta[e]
}

export function faseDeAyuno(fechaIso: string, lat: number): FaseAyuno {
  const e = estacionDe(fechaIso, lat)
  return FASES_AYUNO.find((f) => f.estacion === e)!
}

/* ══════════════════════════════════════════════ LA RAMPA ══ */

export interface RegistroHabito {
  date: string
  updatedAt?: number
  habito: Habito
  nivel: number
  /** Minutos, para el grounding y el frío. */
  minutos?: number
  /** La superficie, para el grounding. */
  superficie?: string
}

export function escalonesDe(h: Habito): Escalon[] {
  switch (h) {
    case 'grounding':
      return ESCALONES_GROUNDING
    case 'frio':
      return ESCALONES_FRIO
    case 'ayuno':
      // El ayuno no va por escalones sino por estación: se devuelve vacío a
      // propósito para que quien llame no invente una rampa que no existe.
      return []
  }
}

export interface EstadoHabito {
  habito: Habito
  /** El escalón en el que está, o null si no ha empezado. */
  actual: Escalon | null
  /** Días seguidos haciéndolo. */
  racha: number
  /** El siguiente, si ya toca ofrecerlo. */
  siguiente?: Escalon
  /** Cuántos días faltan para que la app lo ofrezca. */
  diasParaElSiguiente?: number
}

/**
 * En qué punto de la rampa está alguien.
 *
 * El siguiente escalón **solo se ofrece cuando el actual lleva hecho sus días**.
 * Es la regla que convierte esto en una rampa y no en un menú, y la que evita
 * que alguien pase de treinta segundos de ducha fría a meterse en un río.
 */
export function estadoDeHabito(
  habito: Habito,
  registros: RegistroHabito[] | undefined,
  hoyIso: string
): EstadoHabito {
  const escalones = escalonesDe(habito)
  const mios = (registros ?? [])
    .filter((r) => r.habito === habito && r.date <= hoyIso)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  if (mios.length === 0 || escalones.length === 0) {
    return { habito, actual: null, racha: 0, siguiente: escalones[0] }
  }

  const nivelActual = Math.max(...mios.map((r) => r.nivel))
  const actual = escalones.find((e) => e.nivel === nivelActual) ?? escalones[0]

  // Racha: días seguidos hacia atrás con algún registro de este hábito.
  const fechas = new Set(mios.map((r) => r.date))
  let racha = 0
  let fecha = hoyIso
  while (fechas.has(fecha)) {
    racha++
    fecha = sumarDiaIso(fecha, -1)
  }
  // Si hoy no está pero ayer sí, la racha sigue viva hasta que acabe el día.
  if (racha === 0) {
    fecha = sumarDiaIso(hoyIso, -1)
    while (fechas.has(fecha)) {
      racha++
      fecha = sumarDiaIso(fecha, -1)
    }
  }

  const enEsteNivel = mios.filter((r) => r.nivel === nivelActual).length
  const siguiente = escalones.find((e) => e.nivel === nivelActual + 1)
  const yaToca = actual.diasParaSubir > 0 && enEsteNivel >= actual.diasParaSubir

  return {
    habito,
    actual,
    racha,
    ...(siguiente && yaToca ? { siguiente } : {}),
    ...(siguiente && !yaToca
      ? { diasParaElSiguiente: Math.max(0, actual.diasParaSubir - enEsteNivel) }
      : {})
  }
}
