/**
 * Cuánto estrés lleva encima el cuerpo, y contra qué se mide.
 *
 * La app ya sabía tres cosas por separado: cómo te sientes hoy (el test
 * diario), cuánto apretaste anteayer (`effort.ts`) y cuánto volumen lleva cada
 * músculo esta semana (`volume.ts`). Ninguna contestaba a la pregunta que
 * importa un martes cualquiera: **¿voy sobrado o voy pasado?**
 *
 * El modelo tiene dos piezas y ninguna es exótica:
 *
 * 1. **Una carga por sesión**, comparable entre pesas y cardio. En pesas, la
 *    suma de `10 − RIR` de cada serie efectiva: el RIR que el usuario anota es
 *    el RPE invertido, así que esto es el *session-RPE* de Foster medido serie
 *    a serie en vez de con una nota global al final. En cardio, MET-minuto, que
 *    ya se calculaban para ajustar los cambios de actividad.
 *
 * 2. **Dos medias móviles exponenciales** sobre esa carga: una rápida, que es
 *    la fatiga que aún se arrastra, y otra lenta, que es la base a la que el
 *    cuerpo está acostumbrado. Es el modelo impulso-respuesta de Banister, y su
 *    cociente es la versión suavizada del *acute:chronic workload ratio*.
 *
 * **Lo que esto no es.** El cociente agudo:crónico tiene críticas metodológicas
 * serias —Impellizzeri y otros mostraron que no predice lesiones de forma
 * fiable—, así que aquí se usa como **descriptor**: dice si estás subiendo la
 * carga más rápido de lo que te has acostumbrado. No es un pronóstico, y la
 * pantalla no lo presenta como tal.
 *
 * Y no se inventa nada que no se mida. Sin pulsómetro no hay variabilidad
 * cardíaca ni sueño medido, así que no aparecen. El test diario sigue siendo la
 * señal subjetiva, que además responde a los cambios de carga antes que muchas
 * medidas objetivas (Saw, Main y Gastin, 2016).
 */
import { metDe } from './cardio'
import { esCalentamiento, pesoEnVolumen, rirDe } from './setLogs'
import type { Session } from './types'

/**
 * Constante de tiempo de la fatiga, en días. Siete: es lo que tarda en diluirse
 * el grueso de lo que dejó una sesión dura.
 */
export const DIAS_FATIGA = 7

/**
 * Constante de tiempo de la base. Veintiocho: cuatro semanas es el plazo en el
 * que el cuerpo se acostumbra de verdad a un volumen de trabajo.
 */
export const DIAS_BASE = 28

/** Cuánto pesa un minuto de cardio frente a una serie de pesas. */
const MET_MINUTO_POR_PUNTO = 10

/** Ventana que se dibuja en la gráfica. */
export const DIAS_HISTORIA = 56

export interface CargaSesion {
  fecha: string
  /** Puntos de las pesas: suma de 10 − RIR por serie efectiva. */
  pesas: number
  /** Puntos del cardio, traídos de MET-minuto a la misma escala. */
  cardio: number
  total: number
}

function minutosDe(reps: string): number {
  const m = reps.match(/(\d+)\s*min/)
  return m ? Number(m[1]) : 0
}

/**
 * Lo que costó una sesión, en una sola cifra.
 *
 * Las pesas se cuentan serie a serie, ponderando por tipo —el calentamiento no
 * suma, el drop set suma medio— y por lo cerca del fallo que se fue. Sin RIR
 * anotado se usa el del plan, que es la mejor estimación disponible; peor sería
 * dar cero a una sesión que se hizo.
 */
export function cargaDeSesion(session: Session): CargaSesion {
  let pesas = 0
  let metMinuto = 0

  for (const pe of session.exercises) {
    if (pe.primary === 'cardio') {
      const met = metDe(pe.exerciseId)
      if (met) metMinuto += met * minutosDe(pe.plan.reps)
      continue
    }
    for (const l of pe.logs ?? []) {
      if (!l.done || esCalentamiento(l)) continue
      const rir = rirDe(l, pe.plan.rir) ?? 2
      // Diez menos el RIR: quedarse a cinco del fallo cuesta la mitad que
      // quedarse a cero, que es lo que dice la escala de esfuerzo percibido.
      const esfuerzo = Math.max(0, 10 - rir)
      pesas += esfuerzo * pesoEnVolumen(l)
    }
    // Sesión antigua sin registro serie a serie: se estima por el plan.
    if (!pe.logs && pe.done === true) {
      pesas += Math.max(0, 10 - (pe.plan.rir ?? 2)) * pe.plan.sets
    }
  }

  const cardio = metMinuto / MET_MINUTO_POR_PUNTO
  return {
    fecha: session.date,
    pesas: Math.round(pesas * 10) / 10,
    cardio: Math.round(cardio * 10) / 10,
    total: Math.round((pesas + cardio) * 10) / 10
  }
}

function isoDe(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return isoDe(d)
}

/**
 * Carga día a día, con ceros en los días de descanso.
 *
 * Los ceros no son un detalle: son justo lo que hace que la fatiga baje cuando
 * descansas. Saltárselos daría una media sobre los días entrenados, que sube
 * cuanto menos entrenas.
 */
export function cargaDiaria(sessions: Session[], hastaIso: string, dias = DIAS_HISTORIA): CargaSesion[] {
  const porDia = new Map<string, number>()
  for (const s of sessions) {
    if (!s.completed) continue
    porDia.set(s.date, (porDia.get(s.date) ?? 0) + cargaDeSesion(s).total)
  }
  return Array.from({ length: dias }, (_, i) => {
    const fecha = sumarDias(hastaIso, i - (dias - 1))
    const total = Math.round((porDia.get(fecha) ?? 0) * 10) / 10
    return { fecha, pesas: total, cardio: 0, total }
  })
}

/**
 * Media móvil exponencial. `lambda = 2 / (N + 1)`, la forma habitual de traducir
 * «una media de N días» a un suavizado que pondera lo reciente.
 */
export function ewma(valores: number[], dias: number): number[] {
  const lambda = 2 / (dias + 1)
  let acumulado = 0
  return valores.map((v, i) => {
    acumulado = i === 0 ? v : v * lambda + acumulado * (1 - lambda)
    return Math.round(acumulado * 100) / 100
  })
}

export type NivelEstres = 'bajo' | 'sostenible' | 'subiendo' | 'pasado'

export interface EstadoEstres {
  /** Carga de hoy, si hoy se ha entrenado. */
  hoy: number
  /** Lo que aún se arrastra de los últimos días. */
  fatiga: number
  /** El nivel al que el cuerpo está acostumbrado. */
  base: number
  /**
   * Fatiga dividida por base. Uno es «estás en lo tuyo». Por encima, subiendo
   * más rápido de lo acostumbrado; por debajo, aflojando.
   */
  ratio: number
  nivel: NivelEstres
  /** Las dos curvas, para dibujarlas. */
  serie: { fecha: string; carga: number; fatiga: number; base: number }[]
  /** Hay historial suficiente para que la base signifique algo. */
  fiable: boolean
}

/**
 * Umbrales del cociente.
 *
 * Los tres primeros vienen de la zona que la literatura de ACWR llama
 * «sostenible» —en torno a 0,8–1,3—, con la advertencia de siempre: sirven para
 * describir, no para predecir. El de arriba es deliberadamente alto: avisar por
 * cualquier semana buena convertiría el aviso en ruido.
 */
export const UMBRALES = { bajo: 0.8, subiendo: 1.3, pasado: 1.5 }

export function nivelDe(ratio: number): NivelEstres {
  if (ratio >= UMBRALES.pasado) return 'pasado'
  if (ratio >= UMBRALES.subiendo) return 'subiendo'
  if (ratio < UMBRALES.bajo) return 'bajo'
  return 'sostenible'
}

/** Días con algo de carga que hacen falta para que la base signifique algo. */
export const DIAS_MINIMOS = 10

export function estadoDeEstres(sessions: Session[], todayIso: string): EstadoEstres {
  const diaria = cargaDiaria(sessions, todayIso)
  const totales = diaria.map((d) => d.total)
  const fatigas = ewma(totales, DIAS_FATIGA)
  const bases = ewma(totales, DIAS_BASE)

  const fatiga = fatigas[fatigas.length - 1] ?? 0
  const base = bases[bases.length - 1] ?? 0
  // Sin base no hay cociente: dividir por casi cero da números enormes que no
  // significan nada. Se dice que no es fiable en vez de inventar una cifra.
  const ratio = base > 0.5 ? Math.round((fatiga / base) * 100) / 100 : 1

  const diasConCarga = totales.filter((t) => t > 0).length

  return {
    hoy: diaria[diaria.length - 1]?.total ?? 0,
    fatiga,
    base,
    ratio,
    nivel: nivelDe(ratio),
    serie: diaria.map((d, i) => ({
      fecha: d.fecha,
      carga: d.total,
      fatiga: fatigas[i],
      base: bases[i]
    })),
    fiable: diasConCarga >= DIAS_MINIMOS
  }
}

export const TITULO_NIVEL: Record<NivelEstres, string> = {
  bajo: 'Descansado',
  sostenible: 'En tu sitio',
  subiendo: 'Subiendo el listón',
  pasado: 'Vas por encima de tu base'
}

/**
 * Qué significa, dicho sin dramatismo y sin prometer nada que no se pueda
 * cumplir. En particular no se dice «riesgo de lesión»: el cociente no da para
 * eso, y decirlo sería vender una precisión que no existe.
 */
export function explicarEstres(e: EstadoEstres): string {
  if (!e.fiable) {
    return 'Todavía no hay suficientes semanas registradas para saber cuál es tu base. Sigue entrenando y en un par de semanas esto empezará a decir algo.'
  }
  switch (e.nivel) {
    case 'pasado':
      return 'Estás cargando bastante más de lo que te has acostumbrado. No es alarmante, pero es el momento de bajar una marcha antes de que lo pida el cuerpo por su cuenta.'
    case 'subiendo':
      return 'Estás por encima de tu base, que es justo lo que hace progresar. Mantén el ojo en el sueño y en cómo te levantas.'
    case 'bajo':
      return 'Vienes de una temporada tranquila. Tienes margen para apretar cuando te apetezca.'
    default:
      return 'Lo que estás haciendo se parece a lo que tu cuerpo ya sabe manejar. Este es el sitio donde se acumula el trabajo sin pagarlo.'
  }
}


/**
 * Días de descanso que siguen contando como día cumplido.
 *
 * Dos: es lo que tarda en asimilarse una sesión. Descansar dentro de esa
 * ventana no es dejarlo, es la otra mitad del entrenamiento.
 */
export const DESCANSO_QUE_CUENTA = 2

export interface RachaAmable {
  /** Días seguidos cumpliendo, contando hacia atrás desde hoy. */
  dias: number
  /** Hoy ya cuenta: o has entrenado, o vienes de hacerlo. */
  hoyCumple: boolean
  /** Hoy cuenta por descanso ganado, no por haber entrenado. */
  hoyEsDescanso: boolean
}

/**
 * La racha que no se rompe al descansar.
 *
 * Es lo contrario de la racha de toda la vida, que castiga el día libre y
 * empuja a entrenar cansado para no perderla. Aquí **un día de descanso después
 * de entrenar cuenta como cumplido**, porque lo es: el músculo se construye
 * descansando, y una app que premia solo los días de gimnasio está premiando lo
 * que no toca.
 *
 * Lo que rompe la racha es dejarlo de verdad: más de `DESCANSO_QUE_CUENTA` días
 * seguidos sin nada.
 */
export function rachaAmable(sessions: Session[], todayIso: string): RachaAmable {
  const entrenados = new Set(sessions.filter((s) => s.completed).map((s) => s.date))

  const cumple = (fecha: string): boolean => {
    if (entrenados.has(fecha)) return true
    for (let atras = 1; atras <= DESCANSO_QUE_CUENTA; atras++) {
      if (entrenados.has(sumarDias(fecha, -atras))) return true
    }
    return false
  }

  let dias = 0
  // Un tope generoso: nadie necesita ver una racha de más de un año, y evita
  // recorrer un historial entero cada vez que se pinta la tarjeta.
  for (let i = 0; i < 400; i++) {
    if (!cumple(sumarDias(todayIso, -i))) break
    dias++
  }

  return {
    dias,
    hoyCumple: cumple(todayIso),
    hoyEsDescanso: cumple(todayIso) && !entrenados.has(todayIso)
  }
}

/** Cómo se cuenta la racha, en una línea. */
export function explicarRacha(r: RachaAmable): string {
  if (r.dias === 0) return 'Hoy es un buen día para volver.'
  const cuantos = `${r.dias} ${r.dias === 1 ? 'día' : 'días'}`
  if (r.hoyEsDescanso) {
    return `${cuantos} seguidos cuidándote. Hoy toca reponer, y eso también cuenta.`
  }
  return `${cuantos} seguidos cuidándote.`
}
