import { describe, expect, it } from 'vitest'
import { msUntilNextMidnight, todayIsoAt } from '../store/clock'
import { HORAS_ARRASTRE, findActiveSession } from './activeSession'
import type { Session } from './types'

describe('el día de la app', () => {
  it('devuelve la fecha local en el formato con el que se guarda todo', () => {
    expect(todayIsoAt(new Date(2026, 6, 26, 13, 45))).toBe('2026-07-26')
  })

  it('rellena con ceros meses y días de una cifra', () => {
    expect(todayIsoAt(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05')
  })

  it('a las 23:59 sigue siendo el mismo día; un minuto después, el siguiente', () => {
    expect(todayIsoAt(new Date(2026, 6, 26, 23, 59, 59))).toBe('2026-07-26')
    expect(todayIsoAt(new Date(2026, 6, 27, 0, 0, 1))).toBe('2026-07-27')
  })

  it('cambia de mes y de año correctamente', () => {
    expect(todayIsoAt(new Date(2026, 6, 31, 23, 59))).toBe('2026-07-31')
    expect(todayIsoAt(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
    expect(todayIsoAt(new Date(2027, 0, 1, 0, 1))).toBe('2027-01-01')
  })

  it('calcula lo que falta para medianoche', () => {
    // A las 23:00 faltan exactamente 60 minutos.
    expect(msUntilNextMidnight(new Date(2026, 6, 26, 23, 0, 0, 0))).toBe(60 * 60 * 1000)
    // Recién pasada la medianoche falta casi un día entero.
    const recien = msUntilNextMidnight(new Date(2026, 6, 26, 0, 0, 1, 0))
    expect(recien).toBeGreaterThan(23 * 60 * 60 * 1000)
    expect(recien).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
  })

  it('nunca devuelve una espera negativa', () => {
    expect(msUntilNextMidnight(new Date(2026, 6, 26, 23, 59, 59, 999))).toBeGreaterThanOrEqual(0)
  })
})

// ── Sesión en marcha al cruzar la medianoche ──────────────────

function sesion(over: Partial<Session>): Session {
  return {
    id: 's',
    date: '2026-07-26',
    kind: 'fuerza',
    title: 'test',
    exercises: [],
    completed: false,
    ...over
  }
}

const AHORA = new Date(2026, 6, 27, 0, 15).getTime() // 00:15 del día siguiente

describe('sesión activa', () => {
  it('encuentra la sesión de hoy', () => {
    const s = sesion({ date: '2026-07-27' })
    expect(findActiveSession([s], '2026-07-27', AHORA)?.id).toBe('s')
  })

  it('un entreno empezado antes de medianoche no se pierde al cambiar el día', () => {
    // Empezó a las 23:50 de ayer; ahora son las 00:15.
    const s = sesion({ date: '2026-07-26', startedAt: new Date(2026, 6, 26, 23, 50).getTime() })
    expect(findActiveSession([s], '2026-07-27', AHORA)?.id).toBe('s')
  })

  it('una sesión de ayer que nunca se empezó no bloquea el día nuevo', () => {
    const s = sesion({ date: '2026-07-26' }) // sin startedAt
    expect(findActiveSession([s], '2026-07-27', AHORA)).toBeUndefined()
  })

  it('un entreno abandonado hace horas tampoco sigue activo', () => {
    const s = sesion({
      date: '2026-07-26',
      startedAt: AHORA - (HORAS_ARRASTRE + 1) * 3600 * 1000
    })
    expect(findActiveSession([s], '2026-07-27', AHORA)).toBeUndefined()
  })

  it('las sesiones terminadas nunca cuentan como activas', () => {
    const s = sesion({ date: '2026-07-27', completed: true })
    expect(findActiveSession([s], '2026-07-27', AHORA)).toBeUndefined()
  })

  it('con varias candidatas gana la empezada más recientemente', () => {
    const vieja = sesion({ id: 'vieja', date: '2026-07-26', startedAt: AHORA - 3600 * 1000 })
    const nueva = sesion({ id: 'nueva', date: '2026-07-27', startedAt: AHORA - 60 * 1000 })
    expect(findActiveSession([vieja, nueva], '2026-07-27', AHORA)?.id).toBe('nueva')
  })
})
