import { useSyncExternalStore } from 'react'
import { todayIsoAt } from './clock'
import { VERSION_ACTUAL, migrar } from './migrate'
import type { AppData, BodyMeasurement, CheckIn, Profile, Session } from '../domain/types'

const STORAGE_KEY = 'ritmo-data-v1'

// Los datos guardados antes de existir `measurements` cargan igual: `load()`
// fusiona sobre esta base, así que la clave que falte queda con su valor vacío.
const emptyData: AppData = { version: VERSION_ACTUAL, profile: null, checkIns: [], sessions: [], measurements: [] }

/** Versiones que sabemos leer. Las anteriores se migran al cargar. */
const VERSIONES_LEGIBLES = [1, 2]

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData
    const parsed = JSON.parse(raw) as AppData
    if (!VERSIONES_LEGIBLES.includes(parsed.version)) return emptyData
    const fusionado = { ...emptyData, ...parsed }
    // La migración es idempotente, así que pasarla en cada arranque es seguro y
    // recoge también lo que se hubiera quedado a medias.
    const { data, migrados, paraRevisar } = migrar(fusionado)
    if (migrados > 0 || parsed.version !== VERSION_ACTUAL) {
      // Se persiste aquí mismo. Migrar solo en memoria dejaría el disco en el
      // formato viejo y volvería a deducir lo mismo en cada arranque, con lo que
      // las marcas de «revisar esto» que el usuario fuera resolviendo
      // reaparecerían la próxima vez.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      console.info(
        `Ritmo: migrados ${migrados} ejercicios a la taxonomía muscular` +
          (paraRevisar > 0 ? `, ${paraRevisar} para revisar` : '')
      )
    }
    return data
  } catch {
    return emptyData
  }
}

let state: AppData = load()
const listeners = new Set<() => void>()

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function setState(updater: (prev: AppData) => AppData) {
  state = updater(state)
  persist()
  listeners.forEach((l) => l())
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state
  )
}

/**
 * Fecha de hoy para quien no necesite reaccionar al cambio de día. En los
 * componentes hay que usar `useToday()` de `clock.ts`, que sí se actualiza sola
 * al cruzar la medianoche.
 */
export function todayIso(): string {
  return todayIsoAt(new Date())
}

export const actions = {
  saveProfile(profile: Profile) {
    setState((s) => ({ ...s, profile }))
  },
  saveCheckIn(checkIn: CheckIn) {
    setState((s) => ({
      ...s,
      checkIns: [...s.checkIns.filter((c) => c.date !== checkIn.date), checkIn]
    }))
  },
  saveSession(session: Session) {
    setState((s) => ({
      ...s,
      sessions: [...s.sessions.filter((x) => x.id !== session.id), session]
    }))
  },
  discardSession(id: string) {
    setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }))
  },
  saveMeasurement(measurement: BodyMeasurement) {
    setState((s) => ({
      ...s,
      measurements: [...s.measurements.filter((m) => m.date !== measurement.date), measurement]
    }))
  },
  deleteMeasurement(date: string) {
    setState((s) => ({ ...s, measurements: s.measurements.filter((m) => m.date !== date) }))
  },
  exportData(): string {
    return JSON.stringify(state, null, 2)
  },
  importData(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as AppData
      if (parsed.version !== 1) return false
      setState(() => ({ ...emptyData, ...parsed }))
      return true
    } catch {
      return false
    }
  },
  reset() {
    setState(() => emptyData)
  }
}
