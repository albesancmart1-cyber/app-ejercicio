import { MUSCLE_GROUPS, type MuscleGroup, type Session } from './types'
import { exerciseById } from '../data/exercises'

export type BalanceMap = Record<MuscleGroup, number>

const WINDOW_DAYS = 14

export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T12:00:00')
  const b = new Date(bIso + 'T12:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * Volumen relativo por grupo muscular en los últimos 14 días.
 * Primario suma 1 por ejercicio completado, secundario 0.4.
 * Sesiones más recientes pesan un poco más.
 */
export function computeBalance(sessions: Session[], todayIso: string): BalanceMap {
  const balance = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as BalanceMap

  for (const session of sessions) {
    if (!session.completed) continue
    const age = daysBetween(session.date, todayIso)
    if (age < 0 || age > WINDOW_DAYS) continue
    const recency = 1 - (age / WINDOW_DAYS) * 0.5 // de 1.0 (hoy) a 0.5 (hace 14 días)

    if (session.cardioMinutes && session.cardioMinutes > 0) {
      balance.cardio += (session.cardioMinutes / 30) * recency
    }
    for (const pe of session.exercises) {
      if (pe.done === false) continue
      const ex = exerciseById(pe.exerciseId)
      if (!ex) continue
      balance[ex.primary] += 1 * recency
      for (const sec of ex.secondary) balance[sec] += 0.4 * recency
    }
  }
  return balance
}

/**
 * Grupos ordenados de menos a más trabajado (los primeros son los
 * "descompensados" que conviene priorizar). Excluye cardio y los grupos a evitar.
 */
export function neglectedGroups(balance: BalanceMap, avoid: MuscleGroup[] = []): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((g) => g !== 'cardio' && !avoid.includes(g)).sort(
    (a, b) => balance[a] - balance[b]
  )
}

/** Días desde la última sesión completada; null si no hay ninguna. */
export function daysSinceLastSession(sessions: Session[], todayIso: string): number | null {
  const completed = sessions.filter((s) => s.completed)
  if (completed.length === 0) return null
  const last = completed.reduce((acc, s) => (s.date > acc ? s.date : acc), completed[0].date)
  return daysBetween(last, todayIso)
}

/** Nº de sesiones de fuerza seguidas (desde la más reciente hacia atrás). */
export function consecutiveStrengthSessions(sessions: Session[]): number {
  const completed = sessions.filter((s) => s.completed).sort((a, b) => (a.date < b.date ? 1 : -1))
  let count = 0
  for (const s of completed) {
    if (s.kind === 'fuerza' || s.kind === 'reacondicionamiento') count++
    else break
  }
  return count
}
