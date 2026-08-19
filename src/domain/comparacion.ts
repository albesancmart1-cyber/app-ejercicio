/**
 * El entreno de hoy frente al último comparable.
 *
 * «¿Voy a mejor?» es la pregunta que el resumen de cierre no contestaba: decía
 * cuánto habías movido, pero un número sin referencia no es progreso ni deja de
 * serlo. Aquí se busca la última sesión que se parezca —la misma rutina, o la
 * que comparte la mayoría de ejercicios— y se compara con ella: kilos movidos,
 * ejercicio a ejercicio, y la duración.
 *
 * El matiz del RIR importa: subir el peso yendo igual de sobrado es progreso
 * doble, y subirlo arrastrándose no es lo mismo. Se dice cuando se sabe.
 */
import { escribirNumero } from './numeros'
import { volumeLoad } from './setLogs'
import type { PlannedExercise, Session, SetLog } from './types'

export interface ComparacionEjercicio {
  exerciseId: string
  name: string
  direccion: 'sube' | 'igual' | 'baja' | 'nuevo'
  /** «40 → 42,5 kg» / «+2 reps con el mismo peso» / «igual». */
  detalle: string
  /** El matiz del esfuerzo, cuando el RIR de las dos veces se conoce. */
  matiz?: string
}

export interface ComparacionSesion {
  /** La sesión contra la que se compara. */
  fecha: string
  diasHace: number
  volumenHoyKg: number
  volumenAntesKg: number
  /** Variación porcentual del volumen, redondeada. */
  pctVolumen?: number
  titular: string
  ejercicios: ComparacionEjercicio[]
}

const DIA = 86400000

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DIA)
}

/** Las series de trabajo hechas, sin calentamientos. */
function seriesHechas(pe: PlannedExercise): SetLog[] {
  return (pe.logs ?? []).filter((l) => l.done && l.tipo !== 'calentamiento')
}

/** La mejor serie: la de más peso, y a igual peso la de más repeticiones. */
function mejorSerie(pe: PlannedExercise): SetLog | undefined {
  return seriesHechas(pe)
    .filter((l) => l.weightKg !== undefined || l.reps !== undefined)
    .sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0]
}

/** El RIR medio de las series que lo anotaron, o undefined si ninguna. */
function rirMedio(pe: PlannedExercise): number | undefined {
  const con = seriesHechas(pe).filter((l) => l.rir !== undefined)
  if (con.length === 0) return undefined
  return con.reduce((a, l) => a + l.rir!, 0) / con.length
}

/**
 * La última sesión completada que se parece a esta: comparte al menos la mitad
 * de los ejercicios (y como mínimo dos). La igualdad de título no basta — casi
 * todas se llaman «Fuerza»— y exigir la lista idéntica dejaría fuera el día en
 * que cambiaste un ejercicio.
 */
export function sesionComparable(actual: Session, sessions: Session[]): Session | undefined {
  const mios = new Set(actual.exercises.map((e) => e.exerciseId))
  if (mios.size === 0) return undefined
  return sessions
    .filter((s) => s.completed && s.id !== actual.id && s.date < actual.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .find((s) => {
      const comunes = s.exercises.filter((e) => mios.has(e.exerciseId)).length
      return comunes >= Math.max(2, Math.ceil(mios.size / 2))
    })
}

function compararEjercicio(hoy: PlannedExercise, antes?: PlannedExercise): ComparacionEjercicio {
  const base = { exerciseId: hoy.exerciseId, name: hoy.name }
  if (!antes) return { ...base, direccion: 'nuevo', detalle: 'nuevo en la sesión' }

  const mh = mejorSerie(hoy)
  const ma = mejorSerie(antes)
  if (!mh || !ma) return { ...base, direccion: 'igual', detalle: 'sin series que comparar' }

  const ph = mh.weightKg ?? 0
  const pa = ma.weightKg ?? 0
  const rh = mh.reps ?? 0
  const ra = ma.reps ?? 0

  let direccion: ComparacionEjercicio['direccion']
  let detalle: string
  if (ph > pa) {
    direccion = 'sube'
    detalle = `${escribirNumero(pa)} → ${escribirNumero(ph)} kg`
  } else if (ph < pa) {
    direccion = 'baja'
    detalle = `${escribirNumero(pa)} → ${escribirNumero(ph)} kg`
  } else if (rh > ra) {
    direccion = 'sube'
    detalle = ph > 0 ? `+${rh - ra} reps con el mismo peso` : `+${rh - ra} reps`
  } else if (rh < ra) {
    direccion = 'baja'
    detalle = ph > 0 ? `−${ra - rh} reps con el mismo peso` : `−${ra - rh} reps`
  } else {
    direccion = 'igual'
    detalle = ph > 0 ? `igual: ${escribirNumero(ph)} kg × ${rh}` : `igual: ${rh} reps`
  }

  // El matiz del esfuerzo, solo con las dos medidas en la mano.
  const rirH = rirMedio(hoy)
  const rirA = rirMedio(antes)
  let matiz: string | undefined
  if (direccion === 'sube' && rirH !== undefined && rirA !== undefined) {
    if (rirH >= rirA) matiz = 'y yendo igual de sobrado: progreso doble'
    else if (rirA - rirH >= 1.5) matiz = 'aunque apurando bastante más que entonces'
  }
  return { ...base, direccion, detalle, ...(matiz ? { matiz } : {}) }
}

/** «ayer», «hace 4 días», «el mes pasado». */
function haceCuanto(dias: number): string {
  if (dias === 1) return 'ayer'
  if (dias <= 13) return `hace ${dias} días`
  if (dias <= 45) return `hace ${Math.round(dias / 7)} semanas`
  return `hace ${Math.round(dias / 30)} meses`
}

export function compararSesiones(actual: Session, anterior: Session): ComparacionSesion {
  const volumenHoyKg = Math.round(actual.exercises.reduce((a, e) => a + volumeLoad(e), 0))
  const volumenAntesKg = Math.round(anterior.exercises.reduce((a, e) => a + volumeLoad(e), 0))
  const dias = diasEntre(anterior.date, actual.date)

  const pctVolumen =
    volumenAntesKg > 0 ? Math.round(((volumenHoyKg - volumenAntesKg) / volumenAntesKg) * 100) : undefined

  const cuando = haceCuanto(dias)
  let titular: string
  if (volumenHoyKg === 0 || volumenAntesKg === 0) {
    titular = `Comparado con la sesión de ${cuando}.`
  } else if (pctVolumen !== undefined && Math.abs(pctVolumen) < 3) {
    titular = `Hoy moviste ${volumenHoyKg.toLocaleString('es-ES')} kg, lo mismo que ${cuando}.`
  } else if (pctVolumen !== undefined && pctVolumen > 0) {
    titular = `Hoy moviste ${volumenHoyKg.toLocaleString('es-ES')} kg, un ${pctVolumen} % más que ${cuando}.`
  } else {
    titular = `Hoy moviste ${volumenHoyKg.toLocaleString('es-ES')} kg, un ${Math.abs(pctVolumen!)} % menos que ${cuando} — que también es información, no un juicio.`
  }

  const previos = new Map(anterior.exercises.map((e) => [e.exerciseId, e]))
  const ejercicios = actual.exercises
    .filter((e) => e.primary !== 'cardio')
    .map((e) => compararEjercicio(e, previos.get(e.exerciseId)))

  return { fecha: anterior.date, diasHace: dias, volumenHoyKg, volumenAntesKg, pctVolumen, titular, ejercicios }
}

/** La comparación contra el historial, o nada si no hay con qué comparar. */
export function compararConHistorial(actual: Session, sessions: Session[]): ComparacionSesion | undefined {
  const anterior = sesionComparable(actual, sessions)
  return anterior ? compararSesiones(actual, anterior) : undefined
}
