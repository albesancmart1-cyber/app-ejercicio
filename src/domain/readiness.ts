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

/**
 * Índice de disposición del cuerpo a partir del check-in.
 * Sueño y energía pesan más; los hábitos circadianos y la alimentación
 * suman contexto. Las molestias localizadas no bajan el score global,
 * sino que excluyen ese grupo del entreno.
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

  if (checkIn.discomfort === 'leves') {
    score = Math.max(0, score - 8)
    notes.push('Agujetas leves: bajamos un poco la intensidad.')
  }

  const avoid: MuscleGroup[] = []
  if (checkIn.discomfort !== 'ninguna' && checkIn.discomfort !== 'leves') {
    avoid.push(checkIn.discomfort)
    notes.push('Hoy dejamos descansar la zona con molestias.')
  }

  let level: Readiness['level'] = score < 40 ? 'bajo' : score < 65 ? 'medio' : 'alto'

  // Unos hábitos impecables no compensan llegar sin dormir y sin energía.
  if (checkIn.sleep <= 2 && checkIn.energy <= 2) level = 'bajo'

  if (checkIn.sleep <= 2) notes.push('Con poco sueño, forzar hoy estresaría más de lo que ayuda.')

  return { score, level, avoid, notes, keto: checkIn.keto }
}
