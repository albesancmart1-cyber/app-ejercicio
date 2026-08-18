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
import { seriesEfectivas, volumenDe, type MuscleVolume } from './volume'
import { esfuerzoDe, type EsfuerzoSesion } from './effort'
import { rirMedioDe } from './ultimaVez'
import { esCalentamiento, tipoDe } from './setLogs'
import { etiquetaDe } from './superseries'
import type { Muscle } from './muscles'
import type { ExerciseVariant, PlannedExercise, Session, SetLog } from './types'
import { escribirNumero } from './numeros'

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
  /** RIR real medio de las series que contaron, si se anotó. */
  rirMedio?: number
  /** El usuario lo añadió a mano durante la sesión. */
  anadido: boolean
  /** «A1», «A2»… si fue parte de una superserie. */
  superserie?: string
}

export interface ResumenSesion {
  ejercicios: ResumenEjercicio[]
  /** Series de trabajo contadas a pelo, sin ponderar por tipo. */
  seriesTotales: number
  /**
   * Las que cuentan de verdad para el volumen: el calentamiento no suma y el
   * drop set suma medio. Es la cifra que se enseña, porque es la que cuadra con
   * el desglose por músculo; dar una arriba y otra abajo confunde más de lo que
   * informa.
   */
  seriesEfectivas: number
  repsTotales: number
  /** Kilos levantados sumando peso × repeticiones de cada serie. */
  cargaTotal: number
  /** Series por músculo, contadas como cuenta el motor: primario 1, ayuda 0,5. */
  musculos: Partial<MuscleVolume>
  /** Lo que costó de verdad, según el RIR anotado. */
  esfuerzo: EsfuerzoSesion
  /** Ejercicios que no llegaron a registrarse. */
  sinHacer: number
}

/** Las series que cuentan como trabajo: hechas y sin ser calentamiento. */
function seriesQueCuentan(logs: SetLog[]): SetLog[] {
  return logs.filter((l) => l.done && !esCalentamiento(l))
}

function resumirEjercicio(pe: PlannedExercise, superserie?: string): ResumenEjercicio {
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
    rirMedio: rirMedioDe(cuentan),
    anadido: pe.addedByUser === true,
    superserie
  }
}

export function resumirSesion(session: Session): ResumenSesion {
  const ejercicios = session.exercises
    // La etiqueta se saca **antes** de filtrar el cardio, porque se calcula
    // sobre la posición en la sesión entera.
    .map((pe, i) => ({ pe, etiqueta: etiquetaDe(session.exercises, i) }))
    .filter(({ pe }) => pe.primary !== 'cardio')
    .map(({ pe, etiqueta }) => resumirEjercicio(pe, etiqueta))

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
    seriesEfectivas:
      Math.round(
        session.exercises
          .filter((pe) => pe.primary !== 'cardio')
          .reduce((a, pe) => a + seriesEfectivas(pe), 0) * 2
      ) / 2,
    cargaTotal: ejercicios.reduce((a, e) => a + (e.cargaTotal ?? 0), 0),
    musculos,
    esfuerzo: esfuerzoDe(session),
    sinHacer: ejercicios.filter((e) => e.seriesHechas === 0).length
  }
}

/**
 * Cómo se lee una serie suelta: «40 kg × 8 · RIR 2».
 *
 * El RIR solo aparece si se anotó: poner «RIR —» en las sesiones antiguas sería
 * llenar el resumen de huecos que no significan nada.
 */
export function describirSerie(l: SetLog): string {
  const reps = l.reps !== undefined ? `× ${l.reps}` : '× —'
  const base = l.weightKg !== undefined ? `${escribirNumero(l.weightKg)} kg ${reps}` : reps
  // Una serie al fallo no necesita que le escriban el RIR: ya lo dice su tipo.
  if (l.rir !== undefined) return `${base} · RIR ${l.rir}`
  return tipoDe(l) === 'fallo' ? `${base} · al fallo` : base
}

/** Kilos con separador de millar, que un entreno pasa de los mil fácilmente. */
export function formatCarga(kg: number): string {
  return `${Math.round(kg).toLocaleString('es-ES')} kg`
}
