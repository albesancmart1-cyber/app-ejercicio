import { MUSCLE_GROUPS, type MuscleGroup, type Session } from './types'
import { exerciseById } from '../data/exercises'

export type BalanceMap = Record<MuscleGroup, number>

const WINDOW_DAYS = 14
const WEEK_DAYS = 7

export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T12:00:00')
  const b = new Date(bIso + 'T12:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function emptyBalance(): BalanceMap {
  return Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as BalanceMap
}

/** Un ejercicio cuenta solo si el usuario lo marcó explícitamente como hecho. */
function wasDone(done: boolean | undefined): boolean {
  return done === true
}

/**
 * Volumen relativo por grupo muscular en los últimos 14 días.
 * Primario suma 1 serie efectiva por serie realizada, secundario 0,4.
 * Las sesiones recientes pesan algo más que las antiguas.
 */
export function computeBalance(sessions: Session[], todayIso: string): BalanceMap {
  const balance = emptyBalance()

  for (const session of sessions) {
    if (!session.completed) continue
    const age = daysBetween(session.date, todayIso)
    if (age < 0 || age > WINDOW_DAYS) continue
    const recency = 1 - (age / WINDOW_DAYS) * 0.5 // de 1,0 (hoy) a 0,5 (hace 14 días)

    for (const pe of session.exercises) {
      if (!wasDone(pe.done)) continue
      const ex = exerciseById(pe.exerciseId)
      if (!ex) continue
      const sets = Math.max(1, pe.plan.sets)
      // El cardio ya se contabiliza por minutos; no lo duplicamos aquí.
      if (ex.primary !== 'cardio') balance[ex.primary] += sets * recency
      for (const sec of ex.secondary) {
        if (sec !== 'cardio') balance[sec] += sets * 0.4 * recency
      }
    }

    if (session.cardioMinutes && session.cardioMinutes > 0) {
      // 30 min de cardio ≈ el estímulo semanal de una sesión de fuerza para el corazón.
      balance.cardio += (session.cardioMinutes / 30) * 3 * recency
    }
  }
  return balance
}

/** Series efectivas por grupo muscular en los últimos 7 días (sin ponderar por antigüedad). */
export function weeklySets(sessions: Session[], todayIso: string): BalanceMap {
  const sets = emptyBalance()
  for (const session of sessions) {
    if (!session.completed) continue
    const age = daysBetween(session.date, todayIso)
    if (age < 0 || age >= WEEK_DAYS) continue
    for (const pe of session.exercises) {
      if (!wasDone(pe.done)) continue
      const ex = exerciseById(pe.exerciseId)
      if (!ex || ex.primary === 'cardio') continue
      sets[ex.primary] += pe.plan.sets
      for (const sec of ex.secondary) {
        if (sec !== 'cardio') sets[sec] += pe.plan.sets * 0.5
      }
    }
  }
  return sets
}

/**
 * Grupos ordenados de menos a más trabajado. Los primeros son los descompensados
 * que conviene priorizar. Excluye cardio, los grupos a evitar por molestias y
 * los que aún están recuperando de una sesión reciente.
 */
export function neglectedGroups(
  balance: BalanceMap,
  exclude: MuscleGroup[] = []
): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((g) => g !== 'cardio' && !exclude.includes(g)).sort(
    (a, b) => balance[a] - balance[b]
  )
}

/**
 * Grupos trabajados en las últimas `days` jornadas: aún están sintetizando
 * proteína y volver a castigarlos suma fatiga sin sumar estímulo.
 */
export function recentlyWorked(
  sessions: Session[],
  todayIso: string,
  days: number
): MuscleGroup[] {
  const groups = new Set<MuscleGroup>()
  for (const session of sessions) {
    if (!session.completed) continue
    const age = daysBetween(session.date, todayIso)
    if (age < 0 || age >= days) continue
    for (const pe of session.exercises) {
      if (!wasDone(pe.done)) continue
      const ex = exerciseById(pe.exerciseId)
      if (!ex || ex.primary === 'cardio') continue
      groups.add(ex.primary)
    }
  }
  return [...groups]
}

/** Días desde la última sesión completada; null si no hay ninguna. */
export function daysSinceLastSession(sessions: Session[], todayIso: string): number | null {
  const completed = sessions.filter((s) => s.completed && daysBetween(s.date, todayIso) >= 0)
  if (completed.length === 0) return null
  const last = completed.reduce((acc, s) => (s.date > acc ? s.date : acc), completed[0].date)
  return daysBetween(last, todayIso)
}

/**
 * Sesiones de fuerza consecutivas más recientes, contadas solo dentro de la última
 * semana: dos sesiones de fuerza de hace un mes no dicen nada de hoy.
 */
export function consecutiveStrengthSessions(sessions: Session[], todayIso: string): number {
  const recent = sessions
    .filter((s) => s.completed)
    .filter((s) => {
      const age = daysBetween(s.date, todayIso)
      return age >= 0 && age < WEEK_DAYS
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  let count = 0
  for (const s of recent) {
    if (s.kind === 'fuerza' || s.kind === 'reacondicionamiento') count++
    else break
  }
  return count
}

/** Días seguidos entrenando hasta hoy (ayer, anteayer…). */
export function consecutiveTrainingDays(sessions: Session[], todayIso: string): number {
  const dates = new Set(sessions.filter((s) => s.completed).map((s) => s.date))
  let streak = 0
  for (let back = 1; back <= 14; back++) {
    const d = new Date(todayIso + 'T12:00:00')
    d.setDate(d.getDate() - back)
    const iso = d.toISOString().slice(0, 10)
    if (dates.has(iso)) streak++
    else break
  }
  return streak
}

/**
 * Cuántas sesiones se han completado desde que terminó el parón, para saber
 * en qué paso de la vuelta progresiva estamos.
 */
export function sessionsSinceBreak(sessions: Session[], todayIso: string, breakDays: number): number {
  const completed = sessions
    .filter((s) => s.completed && daysBetween(s.date, todayIso) >= 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  let count = 0
  for (let i = 0; i < completed.length; i++) {
    const prev = completed[i + 1]
    count++
    if (!prev) break
    if (daysBetween(prev.date, completed[i].date) > breakDays) break
  }
  return count
}
