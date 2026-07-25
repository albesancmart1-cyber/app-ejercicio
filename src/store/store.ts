import { useSyncExternalStore } from 'react'
import type { AppData, CheckIn, Profile, Session } from '../domain/types'

const STORAGE_KEY = 'ritmo-data-v1'

const emptyData: AppData = { version: 1, profile: null, checkIns: [], sessions: [] }

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData
    const parsed = JSON.parse(raw) as AppData
    if (parsed.version !== 1) return emptyData
    return { ...emptyData, ...parsed }
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

export function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
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
