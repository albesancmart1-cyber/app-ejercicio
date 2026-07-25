import type { CheckIn, MuscleGroup } from './types'

export interface Readiness {
  /** 0–100 */
  score: number
  level: 'bajo' | 'medio' | 'alto'
  /** Grupos a evitar hoy por molestias. */
  avoid: MuscleGroup[]
  notes: string[]
}

/**
 * Índice de disposición del cuerpo a partir del check-in.
 * Sueño y energía pesan más; los hábitos circadianos y la alimentación
 * suman contexto. Las molestias localizadas no bajan el score global,
 * sino que excluyen ese grupo del entreno.
 */
export function computeReadiness(checkIn: CheckIn): Readiness {
  const notes: string[] = []

  // Sueño y energía: 70 puntos entre ambos (35 cada uno, escala 1–5).
  const sleepPts = ((checkIn.sleep - 1) / 4) * 35
  const energyPts = ((checkIn.energy - 1) / 4) * 35

  // Hábitos: 30 puntos repartidos.
  let habitPts = 0
  if (checkIn.lightHygiene) habitPts += 7
  else notes.push('Anoche hubo luz azul: el descanso pudo resentirse.')
  if (checkIn.sunrise) habitPts += 6
  if (checkIn.sunsetYesterday) habitPts += 4
  if (checkIn.sunExposure) habitPts += 7
  if (checkIn.keto) habitPts += 6

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

  const level: Readiness['level'] = score < 40 ? 'bajo' : score < 65 ? 'medio' : 'alto'

  if (checkIn.sleep <= 2) notes.push('Con poco sueño, forzar hoy estresaría más de lo que ayuda.')

  return { score, level, avoid, notes }
}
