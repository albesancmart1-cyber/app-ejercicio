/**
 * Registro serie a serie.
 *
 * El motor lleva desde el principio leyendo `done` y `actualWeightKg` de cada
 * ejercicio (balance muscular y progresión de cargas). En vez de cambiar esos
 * consumidores, aquí se derivan del registro detallado: así las sesiones
 * guardadas antes de existir este registro siguen siendo válidas y el resto de
 * la app no se entera del cambio.
 */
import type { PlannedExercise, PlannedSet, SetLog } from './types'
import type { UltimaVez } from './ultimaVez'

/**
 * Una entrada por serie planificada, precargada con la referencia que toca.
 *
 * **El peso lo pone el plan y las repeticiones la última vez**, y esa división
 * es deliberada. El peso del plan ya viene de mirar el historial: la progresión
 * decide si toca mantener o subir, y precargar aquí el peso viejo pelearía con
 * esa decisión justo cuando dice que hay que subir. Las repeticiones, en
 * cambio, no las decide nadie: son la marca a batir, y tenerlas delante serie
 * por serie es lo que convierte el registro en una comparación.
 *
 * Van serie a serie y no como un número único porque la referencia de la
 * tercera serie es la tercera serie de aquel día, no la media: si la última vez
 * fueron 10, 9 y 8, la caída forma parte del dato.
 */
export function initLogs(plan: PlannedSet, previa?: UltimaVez): SetLog[] {
  return Array.from({ length: Math.max(1, plan.sets) }, (_, i) => ({
    weightKg: plan.weightKg,
    reps: previa?.series[i]?.reps,
    done: false
  }))
}

export function completedSets(pe: PlannedExercise): SetLog[] {
  return (pe.logs ?? []).filter((l) => l.done)
}

/**
 * Recalcula los campos que lee el resto del motor a partir del registro:
 * el ejercicio cuenta como hecho si hay al menos una serie completada, y el
 * peso de referencia es el de la serie completada más pesada.
 */
export function syncExercise(pe: PlannedExercise): PlannedExercise {
  if (!pe.logs) return pe
  const hechas = completedSets(pe)
  const pesos = hechas.map((l) => l.weightKg).filter((w): w is number => typeof w === 'number' && w > 0)
  return {
    ...pe,
    done: hechas.length > 0,
    actualWeightKg: pesos.length > 0 ? Math.max(...pesos) : undefined
  }
}

/** Volumen de trabajo: suma de peso × repeticiones de las series hechas. */
export function volumeLoad(pe: PlannedExercise): number {
  return completedSets(pe).reduce((acc, l) => acc + (l.weightKg ?? 0) * (l.reps ?? 0), 0)
}

export interface RepRange {
  min: number
  max: number
}

/**
 * Interpreta el rango prescrito. Devuelve undefined en los que no son
 * repeticiones, como «30-45 s» de las planchas.
 */
export function parseRepRange(reps: string): RepRange | undefined {
  if (/[a-zA-Z]/.test(reps)) return undefined
  const m = reps.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/)
  if (!m) {
    const solo = reps.match(/^\s*(\d+)\s*$/)
    if (!solo) return undefined
    const n = Number(solo[1])
    return { min: n, max: n }
  }
  const min = Number(m[1])
  const max = Number(m[2])
  return min <= max ? { min, max } : { min: max, max: min }
}

export type RepVerdict = 'sube' | 'mantiene' | 'progresa_suave'

/**
 * Doble progresión: se sube el peso cuando todas las series llegan al tope del
 * rango, y se mantiene si alguna se queda por debajo del mínimo. Es el método
 * estándar y, sobre todo, es dato objetivo: manda sobre la sensación.
 */
export function repVerdict(pe: PlannedExercise): RepVerdict | undefined {
  const rango = parseRepRange(pe.plan.reps)
  if (!rango) return undefined
  const hechas = completedSets(pe).filter((l) => typeof l.reps === 'number')
  if (hechas.length === 0) return undefined
  if (hechas.some((l) => l.reps! < rango.min)) return 'mantiene'
  if (hechas.every((l) => l.reps! >= rango.max)) return 'sube'
  return 'progresa_suave'
}
