import type { CheckIn, MuscleGroup } from './types'

export interface Readiness {
  /** 0–100 */
  score: number
  level: 'bajo' | 'medio' | 'alto'
  /** Grupos a evitar hoy por molestias. */
  avoid: MuscleGroup[]
  notes: string[]
  /** Si hoy se está respetando la alimentación cetogénica. */
  keto: boolean
}

/** Penalización por zona cargada, y su tope. */
export const PENALIZACION_POR_ZONA = 4
export const PENALIZACION_MAXIMA_ZONAS = 12
/** Lo que restan unas agujetas leves repartidas, sin zona concreta. */
export const PENALIZACION_LEVES = 8

/**
 * Las zonas con molestias de un check-in.
 *
 * Lee la lista nueva y, si no la hay, el campo viejo de una sola zona: los
 * check-ins guardados antes de que se pudieran marcar varias siguen valiendo.
 */
export function zonasConMolestias(checkIn: CheckIn): MuscleGroup[] {
  if (checkIn.discomforts) return checkIn.discomforts.filter((g) => g !== 'cardio')
  const uno = checkIn.discomfort
  return uno === 'ninguna' || uno === 'leves' ? [] : [uno]
}

/** ¿Hay agujetas leves repartidas, sin una zona a la que señalar? */
export function tieneLevesRepartidas(checkIn: CheckIn): boolean {
  return checkIn.mildSoreness ?? checkIn.discomfort === 'leves'
}

/**
 * Índice de disposición del cuerpo a partir del check-in.
 *
 * Sueño y energía pesan más; los hábitos circadianos y la alimentación suman
 * contexto. Las molestias hacen dos cosas: cada zona marcada se deja descansar,
 * y además **restan puntos según cuántas sean**. Marcar una zona es información
 * sobre dónde entrenar; marcar tres es información sobre cómo está el cuerpo, y
 * antes se perdía porque solo se podía señalar una.
 */
export function computeReadiness(checkIn: CheckIn): Readiness {
  const notes: string[] = []

  // Sueño y energía mandan: 80 puntos entre ambos (40 cada uno, escala 1–5).
  // Son los que determinan si el cuerpo puede asimilar el entreno de hoy.
  const sleepPts = ((checkIn.sleep - 1) / 4) * 40
  const energyPts = ((checkIn.energy - 1) / 4) * 40

  // Hábitos: 20 puntos. Acompañan, pero no compensan una mala noche.
  let habitPts = 0
  if (checkIn.lightHygiene) habitPts += 5
  else notes.push('Anoche hubo luz azul: el descanso pudo resentirse.')
  if (checkIn.sunrise) habitPts += 4
  if (checkIn.sunsetYesterday) habitPts += 3
  if (checkIn.sunExposure) habitPts += 4
  if (checkIn.keto) habitPts += 4

  let score = Math.round(sleepPts + energyPts + habitPts)

  if (tieneLevesRepartidas(checkIn)) {
    score = Math.max(0, score - PENALIZACION_LEVES)
    notes.push('Agujetas leves repartidas: bajamos un poco la intensidad.')
  }

  const avoid = zonasConMolestias(checkIn)
  if (avoid.length > 0) {
    score = Math.max(
      0,
      score - Math.min(PENALIZACION_MAXIMA_ZONAS, PENALIZACION_POR_ZONA * avoid.length)
    )
    notes.push(
      avoid.length === 1
        ? 'Hoy dejamos descansar la zona con molestias.'
        : `Hoy dejamos descansar las ${avoid.length} zonas que has marcado, y bajamos el listón: con varias zonas cargadas el cuerpo pide menos, no solo otra cosa.`
    )
  }

  let level: Readiness['level'] = score < 40 ? 'bajo' : score < 65 ? 'medio' : 'alto'

  // Unos hábitos impecables no compensan llegar sin dormir y sin energía.
  if (checkIn.sleep <= 2 && checkIn.energy <= 2) level = 'bajo'

  if (checkIn.sleep <= 2) notes.push('Con poco sueño, forzar hoy estresaría más de lo que ayuda.')

  return { score, level, avoid, notes, keto: checkIn.keto }
}
