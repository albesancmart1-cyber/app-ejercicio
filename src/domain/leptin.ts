/**
 * Señal de leptina.
 *
 * La leptina es la hormona con la que el tejido graso le informa al hipotálamo de
 * la disponibilidad energética del cuerpo. Cuando esa señal llega limpia, el apetito
 * se autorregula y el entorno hormonal es permisivo para construir músculo; cuando
 * se ensucia, aparecen hambre voraz, antojos y peor recuperación por mucho que uno
 * entrene bien.
 *
 * Por eso aquí no se cuentan calorías: se cuida la señal y se come hasta saciedad
 * real con proteína suficiente.
 *
 * Evidencia que sostiene las ponderaciones:
 * - La leptina tiene ritmo circadiano propio, con pico unas 2 h antes del amanecer,
 *   sincronizado por el ciclo luz/oscuridad y por los horarios de comida.
 *   (Journal of Applied Physiology, 2013; JCI, 2021)
 * - La restricción de sueño baja la leptina un 18–19 % (6 días de restricción →
 *   −19 % en 24 h; 2 días → −18 % diurna). Es la palanca más potente.
 *   (Leptin: a biomarker for sleep disorders?, 2014)
 * - La luz de la mañana sube la leptina incluso en personas con el sueño restringido.
 *   (Figueiro et al., Int J Endocrinol, 2012)
 * - El desalineamiento circadiano induce resistencia a la leptina.
 *   (Cell Metabolism, 2015)
 * - La carga muscular crónica aumenta los receptores de leptina en el propio músculo
 *   (+62 % de OB-R170 en el brazo dominante de tenistas profesionales): entrenar
 *   mejora la sensibilidad local. (Eur J Appl Physiol, 2009)
 * - La baja disponibilidad energética sostenida suprime leptina e IGF-1, y eso sí
 *   bloquea la ganancia de músculo. Se detecta por señales, no por una cuenta.
 *   (Nutrients, 2021)
 *
 * La ventana es de 7 días a propósito: la leptina refleja patrones de días, no una
 * noche suelta. Es lo que la distingue del índice de disposición, que sí es diario.
 */
import { minutosDelDia, solDe } from './vitaminaD'
import type { CheckIn, DiaDeSol, Goal } from './types'
import { daysBetween } from './muscleBalance'

const WINDOW_DAYS = 7

/**
 * Días contestados por debajo de los cuales no se da veredicto.
 *
 * Con dos días sueltos se puede decir qué pasó esos dos días, no cómo va la
 * semana, que es lo que esta señal dice medir.
 */
export const DIAS_MINIMOS = 3

export interface LeptinSignal {
  /** 0–100 sobre la última semana. */
  score: number
  level: 'baja' | 'media' | 'alta'
  /** Cuántos check-ins sostienen el cálculo. */
  days: number
  /** Los días de la ventana: siempre siete, se hayan contestado o no. */
  diasDeLaVentana: number
  /** Los que se quedaron sin contestar, que también cuentan. */
  diasSinContestar: number
  /** La puntuación antes de descontar los días sin contestar. */
  scoreBruto: number
  helping: string[]
  hurting: string[]
  /** Qué significa esto para ganar músculo. */
  muscleNote: string
}

interface Lever {
  /** Proporción de días en que la palanca jugó a favor, o null si no hay datos. */
  ratio: number | null
  weight: number
  good: string
  bad: string
}

/** Media de una lista de booleanos, ignorando los días sin dato. */
function ratioOf(values: (boolean | undefined)[]): number | null {
  const known = values.filter((v): v is boolean => v !== undefined)
  if (known.length === 0) return null
  return known.filter(Boolean).length / known.length
}

/**
 * La señal de la última semana.
 *
 * **Los días sin contestar cuentan.** Antes no: la media se hacía solo sobre los
 * días que había, así que una semana con dos check-ins buenos y cinco días en
 * blanco salía como «93 sobre 100, señal limpia». Es decir, la app premiaba
 * dejar de contestar, que es exactamente lo contrario de lo que quiere medir —y
 * de paso alimentaba con esa cifra inflada la interpretación de la tendencia y
 * la progresión de carga.
 *
 * La corrección no es inventarse los días que faltan: de un día en blanco no se
 * sabe si dormiste bien o mal, y ponerle un cero sería mentir igual, solo que en
 * la otra dirección. Lo que se hace es **acercar la puntuación al medio en
 * proporción a lo que no se sabe**: con la semana entera contestada la cifra es
 * la que sale de los datos; con dos días de siete, la mayor parte de lo que se
 * enseña es «no lo sé». Así no se puede llegar a «alta» sin contestar, y una
 * semana mala tampoco se dispara a «baja» por dos días sueltos.
 */
export function computeLeptinSignal(
  checkIns: CheckIn[],
  todayIso: string,
  goal?: Goal,
  sol?: DiaDeSol[]
): LeptinSignal {
  const window = checkIns.filter((c) => {
    const age = daysBetween(c.date, todayIso)
    return age >= 0 && age < WINDOW_DAYS
  })
  // Por fecha: dos check-ins del mismo día no son dos días cubiertos.
  const diasContestados = new Set(window.map((c) => c.date)).size
  const diasSinContestar = WINDOW_DAYS - diasContestados
  const cobertura = diasContestados / WINDOW_DAYS

  if (window.length === 0) {
    return {
      score: 0,
      level: 'media',
      days: 0,
      diasDeLaVentana: WINDOW_DAYS,
      diasSinContestar: WINDOW_DAYS,
      scoreBruto: 0,
      helping: [],
      hurting: [],
      muscleNote:
        'Aún no hay check-ins suficientes esta semana. En unos días podré decirte cómo va tu señal de leptina.'
    }
  }

  // El sueño se mide en escala 1–5; lo pasamos a proporción 0–1.
  const sleepRatio = window.reduce((acc, c) => acc + (c.sleep - 1) / 4, 0) / window.length
  const energyRatio = window.reduce((acc, c) => acc + (c.energy - 1) / 4, 0) / window.length

  const levers: Lever[] = [
    {
      ratio: sleepRatio,
      weight: 30,
      good: 'Estás durmiendo bien, que es lo que más sube la leptina.',
      bad: 'El sueño corto baja la leptina hasta un 19 %: es lo primero que hay que arreglar.'
    },
    {
      ratio: ratioOf(window.map((c) => c.sunrise)),
      weight: 16,
      good: 'La luz de la mañana está haciendo su trabajo: sube la leptina incluso durmiendo poco.',
      bad: 'Te falta luz por la mañana, que es lo que ancla el ritmo de la leptina.'
    },
    {
      ratio: ratioOf(window.map((c) => c.lightHygiene)),
      weight: 16,
      good: 'Noches sin luz azul: así no se desalinea el reloj ni aparece resistencia a la leptina.',
      bad: 'La luz azul de noche desalinea el reloj, y eso induce resistencia a la leptina.'
    },
    {
      /*
       * Con el registro de sol, mandan los minutos reales del día: un cuarto de
       * hora fuera es la dosis que ancla el ritmo. El sí/no del test queda de
       * respaldo para los días sin registro.
       */
      ratio: ratioOf(
        window.map((c) => {
          const dia = solDe(sol, c.date)
          if (dia && dia.exposiciones.length > 0) return minutosDelDia(dia) >= 15
          return c.sunExposure
        })
      ),
      weight: 10,
      good: 'Buena exposición solar durante el día.',
      bad: 'Poco sol durante el día: el contraste luz/oscuridad es el que marca el ritmo.'
    },
    {
      ratio: ratioOf(window.map((c) => c.sunsetYesterday)),
      weight: 6,
      good: 'Ver el atardecer ayuda a cerrar bien el día.',
      bad: 'Sin atardecer, el cuerpo recibe una señal más difusa de que llega la noche.'
    },
    {
      ratio: ratioOf(window.map((c) => (c.wokeHungry === undefined ? undefined : !c.wokeHungry))),
      weight: 11,
      good: 'Te despiertas sin hambre voraz: buena señal nocturna.',
      bad: 'Despertarte con mucha hambre apunta a que la señal nocturna no está llegando bien.'
    },
    {
      ratio: ratioOf(window.map((c) => (c.cravings === undefined ? undefined : !c.cravings))),
      weight: 11,
      good: 'Sin antojos: el apetito se está autorregulando solo.',
      bad: 'Los antojos son el aviso clásico de que la leptina no manda bien la señal de saciedad.'
    }
  ]

  // Normalizamos sobre las palancas con datos, para que un historial incompleto
  // no hunda la puntuación.
  const available = levers.filter((l) => l.ratio !== null)
  const totalWeight = available.reduce((acc, l) => acc + l.weight, 0)
  const earned = available.reduce((acc, l) => acc + l.ratio! * l.weight, 0)
  const scoreBruto = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100)

  /*
   * Lo que no se contestó tira hacia el medio. Con la semana entera puesta, la
   * cifra es la que dicen los datos; con dos días de siete, cinco séptimos de
   * lo que se enseña es «no lo sé», y eso es 50, ni bien ni mal.
   */
  const score = Math.round(NEUTRO + (scoreBruto - NEUTRO) * cobertura)

  /*
   * Con muy pocos días no se listan aciertos ni fallos.
   *
   * Un solo check-in bueno daba siete líneas de «estás durmiendo bien», «la luz
   * de la mañana está haciendo su trabajo»… que son afirmaciones sobre la
   * semana hechas con un día. Y además contradecían al propio aviso de que
   * faltan días, justo encima.
   */
  const bastante = diasContestados >= DIAS_MINIMOS
  const helping = bastante ? available.filter((l) => l.ratio! >= 0.6).map((l) => l.good) : []
  const hurting = bastante ? available.filter((l) => l.ratio! < 0.6).map((l) => l.bad) : []

  const level: LeptinSignal['level'] = score < 45 ? 'baja' : score < 70 ? 'media' : 'alta'

  // Disponibilidad energética baja: poca energía sostenida junto con antojos o
  // hambre voraz. Es la forma de detectar que se come de menos sin contar nada.
  const lowEnergyAvailability =
    energyRatio < 0.4 && (ratioOf(window.map((c) => c.cravings)) ?? 0) > 0.5

  return {
    score,
    level,
    days: diasContestados,
    diasDeLaVentana: WINDOW_DAYS,
    diasSinContestar,
    scoreBruto,
    helping,
    hurting,
    muscleNote: muscleNoteFor(level, lowEnergyAvailability, goal, diasSinContestar, diasContestados)
  }
}

/** El punto medio: ni a favor ni en contra. Es lo que vale un día sin contestar. */
const NEUTRO = 50

/** «4 de los últimos 7 días sin contestar», cuando toca decirlo. */
export function explicarCobertura(s: LeptinSignal): string | undefined {
  if (s.diasSinContestar === 0) return undefined
  const dias = `${s.diasSinContestar} de los últimos ${s.diasDeLaVentana} días`
  if (s.days < DIAS_MINIMOS) return `Llevas ${dias} sin contestar el test.`
  return `${dias} sin contestar, y esos días también cuentan: la cifra está descontada por lo que no sé de ellos.`
}

function muscleNoteFor(
  level: LeptinSignal['level'],
  lowEnergyAvailability: boolean,
  goal: Goal | undefined,
  diasSinContestar: number,
  diasContestados: number
): string {
  // Sin días suficientes no hay veredicto que dar, y decirlo es la respuesta.
  if (diasContestados < DIAS_MINIMOS) {
    return `Con ${diasContestados} ${diasContestados === 1 ? 'día' : 'días'} no puedo decirte cómo va la semana, que es lo que esta señal mide. Los días en blanco cuentan como que no lo sé, no como que fueron bien: contesta el test unos días seguidos y la cifra empezará a significar algo.`
  }
  if (lowEnergyAvailability) {
    return 'Poca energía y antojos a la vez suelen significar que estás comiendo por debajo de lo que tu cuerpo necesita. Sostenido, eso hunde la leptina y frena el músculo: come hasta saciarte de verdad, empezando siempre por la proteína.'
  }
  if (level === 'baja') {
    return goal === 'masa'
      ? 'Con la señal así, el freno para ganar músculo no está en el entrenamiento: está en el sueño y en la luz. Arregla eso y el apetito se ordenará solo.'
      : 'Tu señal está apagada. Antes de tocar nada del entrenamiento, prioriza dormir y ver luz por la mañana.'
  }
  if (level === 'media') {
    return diasSinContestar > 0
      ? 'Vas por buen camino con lo que sé. Contestar los días que faltan es lo que haría esta cifra fiable, además de cuidar las noches y comer hasta saciedad real con proteína por delante.'
      : 'Vas por buen camino. Come hasta saciedad real con proteína por delante y cuida las noches: es lo que termina de afinar la señal.'
  }
  return goal === 'masa'
    ? 'Señal limpia: tu cuerpo está en condiciones de construir. Come hasta saciarte con proteína suficiente y deja que el apetito haga el resto, sin contar nada.'
    : 'Señal limpia. Tu apetito puede autorregularse solo; confía en él y come hasta saciedad real.'
}
