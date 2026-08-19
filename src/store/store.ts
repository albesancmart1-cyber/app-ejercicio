import { useSyncExternalStore } from 'react'
import { todayIsoAt } from './clock'
import { VERSION_ACTUAL, migrar } from './migrate'
import type { DiaDeComidas, AppData, BodyMeasurement, CheckIn, Profile, Routine, Session } from '../domain/types'
import { claveDeMedicion, claveDeRutina, claveDeSesion, type Lapida } from '../domain/merge'

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

/**
 * Deja constancia de un borrado, para que sincronizar no lo resucite.
 *
 * Sin esto, borrar una medición en el móvil y abrir el ordenador la traería de
 * vuelta: la fusión une listas, y lo que no está no se distingue de lo que
 * todavía no ha llegado.
 */
function conLapida(s: AppData, clave: string): Lapida[] {
  return [...(s.deleted ?? []).filter((l) => l.clave !== clave), { clave, at: Date.now() }]
}

export const actions = {
  saveProfile(profile: Profile) {
    setState((s) => ({ ...s, profile, profileUpdatedAt: Date.now() }))
  },
  saveCheckIn(checkIn: CheckIn) {
    setState((s) => ({
      ...s,
      checkIns: [
        ...s.checkIns.filter((c) => c.date !== checkIn.date),
        { ...checkIn, updatedAt: Date.now() }
      ]
    }))
  },
  saveSession(session: Session) {
    setState((s) => ({
      ...s,
      sessions: [
        ...s.sessions.filter((x) => x.id !== session.id),
        { ...session, updatedAt: Date.now() }
      ]
    }))
  },
  discardSession(id: string) {
    setState((s) => ({
      ...s,
      sessions: s.sessions.filter((x) => x.id !== id),
      deleted: conLapida(s, claveDeSesion(id))
    }))
  },
  /**
   * Mete sesiones traídas de fuera **sin pisar lo que ya hay**.
   *
   * Importar es añadir, nunca sustituir: quien trae su historial de otra app ya
   * puede llevar semanas registrando aquí, y machacar eso sería el peor
   * estreno posible. Y no se cuela dos veces lo mismo si se importa el archivo
   * repetido: una sesión con la misma fecha y el mismo título ya está.
   *
   * Devuelve cuántas han entrado de verdad.
   */
  importSessions(sesiones: Session[]): number {
    let traidas = 0
    setState((s) => {
      const ya = new Set(s.sessions.map((x) => `${x.date}|${x.title}`))
      const nuevas = sesiones.filter((x) => !ya.has(`${x.date}|${x.title}`))
      traidas = nuevas.length
      return { ...s, sessions: [...s.sessions, ...nuevas] }
    })
    return traidas
  },
  saveRoutine(routine: Routine) {
    setState((s) => ({
      ...s,
      routines: [
        ...(s.routines ?? []).filter((r) => r.id !== routine.id),
        { ...routine, updatedAt: Date.now() }
      ]
    }))
  },
  deleteRoutine(id: string) {
    setState((s) => ({
      ...s,
      routines: (s.routines ?? []).filter((r) => r.id !== id),
      deleted: conLapida(s, claveDeRutina(id))
    }))
  },
  /** Guarda el día de comidas entero, con su marca para la fusión. */
  saveComidas(dia: DiaDeComidas) {
    setState((s) => ({
      ...s,
      comidas: [
        ...(s.comidas ?? []).filter((d) => d.date !== dia.date),
        { ...dia, updatedAt: Date.now() }
      ].sort((a, b) => (a.date < b.date ? -1 : 1))
    }))
  },
  saveMeasurement(measurement: BodyMeasurement) {
    setState((s) => ({
      ...s,
      measurements: [
        ...s.measurements.filter((m) => m.date !== measurement.date),
        { ...measurement, updatedAt: Date.now() }
      ]
    }))
  },
  deleteMeasurement(date: string) {
    setState((s) => ({
      ...s,
      measurements: s.measurements.filter((m) => m.date !== date),
      deleted: conLapida(s, claveDeMedicion(date))
    }))
  },
  /** Los datos tal cual están aquí, para sincronizar. */
  snapshot(): AppData {
    return state
  },
  /** El resultado de una fusión, ya calculado fuera. */
  replaceAll(data: AppData) {
    setState(() => data)
  },
  exportData(): string {
    return JSON.stringify(state, null, 2)
  },
  importData(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as AppData
      // Se admite cualquier versión que sepamos leer, no solo la última: una
      // copia exportada antes de la taxonomía muscular tiene que poder volver a
      // entrar, y la migración la pone al día igual que al arrancar.
      if (!VERSIONES_LEGIBLES.includes(parsed.version)) return false
      const { data } = migrar({ ...emptyData, ...parsed })
      setState(() => data)
      return true
    } catch {
      return false
    }
  },
  reset() {
    setState(() => emptyData)
  }
}
