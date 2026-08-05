/**
 * Qué pasó en una sesión ya hecha.
 *
 * El historial guardaba la sesión entera desde siempre —serie a serie, con su
 * peso y sus repeticiones— pero no había forma de mirarlo: la lista solo
 * enseñaba título y fecha. Esto lee lo guardado y lo deja listo para pintarlo.
 *
 * No calcula nada nuevo sobre el entreno ni juzga: resume. Las decisiones sobre
 * volumen y progresión viven donde vivían.
 */
import { volumenDe, type MuscleVolume } from './volume'
import type { Muscle } from './muscles'
import type { ExerciseVariant, PlannedExercise, Session, SetLog } from './types'

export interface ResumenEjercicio {
  exerciseId: string
  name: string
  /** Las series que se hicieron de verdad, calentamiento incluido. */
  series: SetLog[]
  /** Cuántas contaron: hechas y sin marcar como aproximación. */
  seriesHechas: number
  seriesPlanificadas: number
  repsTotales: number
  /** El peso más alto que se movió, si el ejercicio llevaba peso. */
  pesoMaximo?: number
  /** Kilos por repetición sumados. Sin peso anotado, no hay cifra que dar. */
  cargaTotal?: number
  variante?: ExerciseVariant
  /** El usuario lo añadió a mano durante la sesión. */
  anadido: boolean
}

export interface ResumenSesion {
  ejercicios: ResumenEjercicio[]
  seriesTotales: number
  repsTotales: number
  /** Kilos levantados sumando peso × repeticiones de cada serie. */
  cargaTotal: number
  /** Series por músculo, contadas como cuenta el motor: primario 1, ayuda 0,5. */
  musculos: Partial<MuscleVolume>
  /** Ejercicios que no llegaron a registrarse. */
  sinHacer: number
}

/** Las series que cuentan como trabajo: hechas y sin marcar de aproximación. */
function seriesQueCuentan(logs: SetLog[]): SetLog[] {
  return logs.filter((l) => l.done && !l.warmup)
}

function resumirEjercicio(pe: PlannedExercise): ResumenEjercicio {
  const logs = (pe.logs ?? []).filter((l) => l.done)
  const cuentan = seriesQueCuentan(pe.logs ?? [])

  const pesos = cuentan.map((l) => l.weightKg).filter((w): w is number => typeof w === 'number')
  const conPeso = cuentan.filter(
    (l) => typeof l.weightKg === 'number' && typeof l.reps === 'number'
  )

  return {
    exerciseId: pe.exerciseId,
    name: pe.name,
    series: logs,
    // Sin registro serie a serie —sesiones antiguas— manda el marcador viejo.
    seriesHechas: pe.logs ? cuentan.length : pe.done === true ? pe.plan.sets : 0,
    seriesPlanificadas: pe.plan.sets,
    repsTotales: cuentan.reduce((a, l) => a + (l.reps ?? 0), 0),
    pesoMaximo: pesos.length > 0 ? Math.max(...pesos) : undefined,
    cargaTotal:
      conPeso.length > 0 ? conPeso.reduce((a, l) => a + l.weightKg! * l.reps!, 0) : undefined,
    variante: pe.variant,
    anadido: pe.addedByUser === true
  }
}

export function resumirSesion(session: Session): ResumenSesion {
  const ejercicios = session.exercises
    .filter((pe) => pe.primary !== 'cardio')
    .map(resumirEjercicio)

  const musculos: Partial<MuscleVolume> = {}
  for (const pe of session.exercises) {
    for (const [m, v] of Object.entries(volumenDe(pe)) as [Muscle, number][]) {
      musculos[m] = (musculos[m] ?? 0) + v
    }
  }
  // Medias series por acompañar salen con muchos decimales al sumarse.
  for (const m of Object.keys(musculos) as Muscle[]) {
    musculos[m] = Math.round(musculos[m]! * 2) / 2
  }

  return {
    ejercicios,
    seriesTotales: ejercicios.reduce((a, e) => a + e.seriesHechas, 0),
    repsTotales: ejercicios.reduce((a, e) => a + e.repsTotales, 0),
    cargaTotal: ejercicios.reduce((a, e) => a + (e.cargaTotal ?? 0), 0),
    musculos,
    sinHacer: ejercicios.filter((e) => e.seriesHechas === 0).length
  }
}

/** Cómo se lee una serie suelta: «40 kg × 8» o «× 12» si va sin peso. */
export function describirSerie(l: SetLog): string {
  const reps = l.reps !== undefined ? `× ${l.reps}` : '× —'
  return l.weightKg !== undefined ? `${l.weightKg} kg ${reps}` : reps
}

/** Kilos con separador de millar, que un entreno pasa de los mil fácilmente. */
export function formatCarga(kg: number): string {
  return `${Math.round(kg).toLocaleString('es-ES')} kg`
}
