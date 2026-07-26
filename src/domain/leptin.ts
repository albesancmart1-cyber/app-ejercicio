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
import type { CheckIn, Goal } from './types'
import { daysBetween } from './muscleBalance'

const WINDOW_DAYS = 7

export interface LeptinSignal {
  /** 0–100 sobre la última semana. */
  score: number
  level: 'baja' | 'media' | 'alta'
  /** Cuántos check-ins sostienen el cálculo. */
  days: number
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

export function computeLeptinSignal(checkIns: CheckIn[], todayIso: string, goal?: Goal): LeptinSignal {
  const window = checkIns.filter((c) => {
    const age = daysBetween(c.date, todayIso)
    return age >= 0 && age < WINDOW_DAYS
  })

  if (window.length === 0) {
    return {
      score: 0,
      level: 'media',
      days: 0,
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
      ratio: ratioOf(window.map((c) => c.sunExposure)),
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
  const score = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100)

  const helping = available.filter((l) => l.ratio! >= 0.6).map((l) => l.good)
  const hurting = available.filter((l) => l.ratio! < 0.6).map((l) => l.bad)

  const level: LeptinSignal['level'] = score < 45 ? 'baja' : score < 70 ? 'media' : 'alta'

  // Disponibilidad energética baja: poca energía sostenida junto con antojos o
  // hambre voraz. Es la forma de detectar que se come de menos sin contar nada.
  const lowEnergyAvailability =
    energyRatio < 0.4 && (ratioOf(window.map((c) => c.cravings)) ?? 0) > 0.5

  return {
    score,
    level,
    days: window.length,
    helping,
    hurting,
    muscleNote: muscleNoteFor(level, lowEnergyAvailability, goal)
  }
}

function muscleNoteFor(
  level: LeptinSignal['level'],
  lowEnergyAvailability: boolean,
  goal?: Goal
): string {
  if (lowEnergyAvailability) {
    return 'Poca energía y antojos a la vez suelen significar que estás comiendo por debajo de lo que tu cuerpo necesita. Sostenido, eso hunde la leptina y frena el músculo: come hasta saciarte de verdad, empezando siempre por la proteína.'
  }
  if (level === 'baja') {
    return goal === 'masa'
      ? 'Con la señal así, el freno para ganar músculo no está en el entrenamiento: está en el sueño y en la luz. Arregla eso y el apetito se ordenará solo.'
      : 'Tu señal está apagada. Antes de tocar nada del entrenamiento, prioriza dormir y ver luz por la mañana.'
  }
  if (level === 'media') {
    return 'Vas por buen camino. Come hasta saciedad real con proteína por delante y cuida las noches: es lo que termina de afinar la señal.'
  }
  return goal === 'masa'
    ? 'Señal limpia: tu cuerpo está en condiciones de construir. Come hasta saciarte con proteína suficiente y deja que el apetito haga el resto, sin contar nada.'
    : 'Señal limpia. Tu apetito puede autorregularse solo; confía en él y come hasta saciedad real.'
}
