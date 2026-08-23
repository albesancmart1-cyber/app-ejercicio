import { useSyncExternalStore } from 'react'
import { todayIsoAt } from './clock'
import { VERSION_ACTUAL, migrar } from './migrate'
import type { DiaDeComidas, DiaDeSol, EdicionAlimento, ExposicionSolar, AppData, BodyMeasurement, CheckIn, EnCurso, Fichaje, Lampara, PerfilDeLuz, Profile, Routine, NocheRegistrada, SalidaAlExterior, SesionPBM, Suplemento, Session, TipoEnCurso } from '../domain/types'
import { claveDeMedicion, claveDeRutina, claveDeSesion, type Lapida } from '../domain/merge'
import { decirleElSitio } from './reloj'

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
    /*
     * Y si hay reloj, se le dice dónde vives. Es lo único que viaja hacia allá,
     * y con eso calcula la altura del sol sin red — que es justo cuando hace
     * falta saberla. Se manda aquí y no al arrancar porque es lo único que
     * puede cambiarlo, y fuera del contenedor no hace nada.
     */
    if (typeof profile.lat === 'number' && typeof profile.lon === 'number') {
      void decirleElSitio(profile.lat, profile.lon)
    }
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
  /** Guarda el sol de un día entero, con su marca para la fusión. */
  saveSol(dia: DiaDeSol) {
    setState((s) => ({
      ...s,
      sol: [
        ...(s.sol ?? []).filter((d) => d.date !== dia.date),
        { ...dia, updatedAt: Date.now() }
      ].sort((a, b) => (a.date < b.date ? -1 : 1))
    }))
  },
  /**
   * Añade una exposición al sol del día, sin pisar las que ya hubiera.
   *
   * Va aquí y no en la pantalla porque hace falta el día que ya estuviera
   * guardado para poder añadirle una más, y leer el estado desde fuera del
   * store obligaría a que quien llame sea un componente. Este no lo es: lo
   * llama también el cierre de lo que se quedó abierto.
   */
  saveExposicion(fecha: string, e: ExposicionSolar) {
    setState((s) => {
      const dia = (s.sol ?? []).find((d) => d.date === fecha)
      /*
       * Con `id` sustituye en vez de añadir. Es lo que hace que recoger el
       * buzón dos veces —un fallo de red entre recoger y borrar— no deje el
       * mismo rato de sol apuntado dos veces. Sin `id`, se añade como siempre.
       */
      const previas = (dia?.exposiciones ?? []).filter((x) => !e.id || x.id !== e.id)
      const nuevo: DiaDeSol = {
        ...(dia ?? {}),
        date: fecha,
        exposiciones: [...previas, e],
        updatedAt: Date.now()
      }
      return {
        ...s,
        sol: [...(s.sol ?? []).filter((d) => d.date !== fecha), nuevo].sort((a, b) =>
          a.date < b.date ? -1 : 1
        )
      }
    })
  },
  /** Guarda la corrección de un alimento del catálogo. */
  saveEdicionAlimento(ed: EdicionAlimento) {
    setState((s) => ({
      ...s,
      alimentosEditados: [
        ...(s.alimentosEditados ?? []).filter((x) => x.id !== ed.id),
        { ...ed, updatedAt: Date.now() }
      ]
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
  /*
   * Luz. Todas siguen el mismo patrón que las de arriba: reemplazar por id y
   * poner `updatedAt`, para que la fusión entre dispositivos sepa cuál gana.
   */
  saveLampara(lampara: Lampara) {
    setState((s) => ({
      ...s,
      lamparas: [
        ...(s.lamparas ?? []).filter((l) => l.id !== lampara.id),
        { ...lampara, updatedAt: Date.now() }
      ]
    }))
  },
  deleteLampara(id: string) {
    setState((s) => ({ ...s, lamparas: (s.lamparas ?? []).filter((l) => l.id !== id) }))
  },
  saveSesionPBM(sesion: SesionPBM) {
    setState((s) => ({
      ...s,
      sesionesPBM: [
        ...(s.sesionesPBM ?? []).filter((x) => x.id !== sesion.id),
        { ...sesion, updatedAt: Date.now() }
      ]
    }))
  },
  deleteSesionPBM(id: string) {
    setState((s) => ({ ...s, sesionesPBM: (s.sesionesPBM ?? []).filter((x) => x.id !== id) }))
  },
  savePerfilLuz(perfil: PerfilDeLuz) {
    setState((s) => ({
      ...s,
      perfilesLuz: [
        ...(s.perfilesLuz ?? []).filter((p) => p.id !== perfil.id),
        { ...perfil, updatedAt: Date.now() }
      ]
    }))
  },
  deletePerfilLuz(id: string) {
    setState((s) => ({ ...s, perfilesLuz: (s.perfilesLuz ?? []).filter((p) => p.id !== id) }))
  },
  saveFichaje(fichaje: Fichaje) {
    setState((s) => ({
      ...s,
      fichajes: [
        ...(s.fichajes ?? []).filter((f) => f.id !== fichaje.id),
        { ...fichaje, updatedAt: Date.now() }
      ]
    }))
  },
  deleteFichaje(id: string) {
    setState((s) => ({ ...s, fichajes: (s.fichajes ?? []).filter((f) => f.id !== id) }))
  },
  saveSalida(salida: SalidaAlExterior) {
    setState((s) => ({
      ...s,
      salidas: [
        ...(s.salidas ?? []).filter((x) => x.id !== salida.id),
        { ...salida, updatedAt: Date.now() }
      ]
    }))
  },
  deleteSalida(id: string) {
    setState((s) => ({ ...s, salidas: (s.salidas ?? []).filter((x) => x.id !== id) }))
  },
  saveNoche(noche: NocheRegistrada) {
    setState((s) => ({
      ...s,
      noches: [
        ...(s.noches ?? []).filter((n) => n.date !== noche.date),
        { ...noche, updatedAt: Date.now() }
      ]
    }))
  },
  /**
   * Empieza algo. Sustituye lo que hubiera abierto del mismo tipo en vez de
   * duplicarlo: darle dos veces al botón del sol es un dedo, no dos ratos.
   */
  abrirEnCurso(x: EnCurso) {
    setState((s) => ({
      ...s,
      enCurso: [
        ...(s.enCurso ?? []).filter((y) => !(y.tipo === x.tipo && y.date === x.date)),
        x
      ]
    }))
  },
  /** Y lo cierra, sin tocar lo demás que siga en marcha. */
  cerrarEnCurso(tipo: TipoEnCurso, date: string) {
    setState((s) => ({
      ...s,
      enCurso: (s.enCurso ?? []).filter((y) => !(y.tipo === tipo && y.date === date))
    }))
  },
  saveAnalitica(a: import('../domain/analiticas').Analitica) {
    setState((s) => ({
      ...s,
      analiticas: [
        ...(s.analiticas ?? []).filter((x) => x.date !== a.date),
        { ...a, updatedAt: Date.now() }
      ]
    }))
  },
  deleteAnalitica(date: string) {
    setState((s) => ({ ...s, analiticas: (s.analiticas ?? []).filter((x) => x.date !== date) }))
  },
  saveHabito(r: import('../domain/habitos').RegistroHabito) {
    setState((s) => ({
      ...s,
      habitos: [
        ...(s.habitos ?? []).filter((x) => !(x.date === r.date && x.habito === r.habito)),
        { ...r, updatedAt: Date.now() }
      ]
    }))
  },
  saveSuplemento(sup: Suplemento) {
    setState((s) => ({
      ...s,
      suplementos: [
        ...(s.suplementos ?? []).filter((x) => x.id !== sup.id),
        { ...sup, updatedAt: Date.now() }
      ]
    }))
  },
  deleteSuplemento(id: string) {
    setState((s) => ({ ...s, suplementos: (s.suplementos ?? []).filter((x) => x.id !== id) }))
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
