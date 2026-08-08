/**
 * Rutinas guardadas: un entreno que te gustó, listo para repetir.
 *
 * Con una precaución que no es un detalle: **la app sigue decidiendo por
 * defecto**. Todo lo demás —el descanso cuando toca descansar, el músculo que
 * lleva más tiempo sin trabajarse, la vuelta progresiva tras un parón— existe
 * porque una rutina fija no sabe cómo has dormido ni qué te duele hoy. Elegir
 * una rutina es una decisión explícita de un día concreto, no un modo en el que
 * uno se queda; por eso no hay «rutina activa» ni calendario semanal.
 *
 * Lo que se guarda es **la estructura**: qué ejercicios, en qué orden, con qué
 * series y repeticiones, con sus superseries. Los pesos no: esos los pone la
 * progresión al construir la sesión, mirando lo que hiciste la última vez. Una
 * rutina que congelara los kilos sería una forma elegante de dejar de progresar.
 */
import { prepareExercise } from './workoutBuilder'
import { exerciseById } from '../data/exercises'
import { initLogs } from './setLogs'
import { ultimaVezDe } from './ultimaVez'
import { MUSCLE_LABELS } from './types'
import type { MuscleGroup, PlannedExercise, Profile, Routine, Session, SessionKind } from './types'

/** Un ejercicio de rutina: el plan, sin nada de lo que pasó aquel día. */
function comoPlantilla(pe: PlannedExercise): PlannedExercise {
  return {
    exerciseId: pe.exerciseId,
    name: pe.name,
    primary: pe.primary,
    // Las series y repeticiones se guardan; el peso no viaja con la rutina.
    plan: { sets: pe.plan.sets, reps: pe.plan.reps, rir: pe.plan.rir, restSeconds: pe.plan.restSeconds },
    ...(pe.variant ? { variant: pe.variant } : {}),
    ...(pe.supersetId ? { supersetId: pe.supersetId } : {})
  }
}

/** Guarda una sesión como rutina. */
export function desdeSesion(
  session: Session,
  name: string,
  opts: { folder?: string; id?: string; ahora?: number } = {}
): Routine {
  const ahora = opts.ahora ?? Date.now()
  return {
    id: opts.id ?? `rut-${ahora.toString(36)}`,
    name: name.trim(),
    ...(opts.folder?.trim() ? { folder: opts.folder.trim() } : {}),
    kind: session.kind,
    exercises: session.exercises.map(comoPlantilla),
    fromSessionId: session.id,
    createdAt: ahora,
    updatedAt: ahora
  }
}

/**
 * Construye la sesión de hoy a partir de una rutina.
 *
 * Los ejercicios se vuelven a preparar de cero —peso sugerido según la
 * progresión, referencia de la última vez, nota de carga—, y de la rutina se
 * respeta lo que la rutina sabe: cuáles, en qué orden, cuántas series, con qué
 * rango y encadenados con quién.
 */
export function aSesion(
  rutina: Routine,
  profile: Profile,
  history: Session[],
  opts: { date: string; id?: string; keto?: boolean; rir?: number }
): Session {
  const contexto = {
    intensity: 'moderada' as const,
    volumeScale: 1,
    keto: opts.keto ?? false,
    history
  }

  const exercises = rutina.exercises.map((plantilla) => {
    const ex = exerciseById(plantilla.exerciseId)
    if (!ex) {
      // Un ejercicio que ya no está en el catálogo no invalida la rutina: se
      // lleva tal cual estaba guardado, con sus series en blanco.
      return { ...plantilla, logs: initLogs(plantilla.plan) }
    }
    const fresco = prepareExercise(ex, profile, {
      ...contexto,
      rir: plantilla.plan.rir ?? opts.rir ?? 2,
      variant: plantilla.variant
    })
    // La dosis la manda la rutina; el peso, la progresión.
    const plan = {
      ...fresco.plan,
      sets: plantilla.plan.sets,
      reps: plantilla.plan.reps,
      ...(plantilla.plan.restSeconds ? { restSeconds: plantilla.plan.restSeconds } : {})
    }
    const previa = ultimaVezDe(ex.id, history, fresco.variant)
    return {
      ...fresco,
      plan,
      logs: initLogs(plan, previa),
      ...(plantilla.supersetId ? { supersetId: plantilla.supersetId } : {})
    }
  })

  return {
    id: opts.id ?? `ses-${Date.now().toString(36)}`,
    date: opts.date,
    kind: rutina.kind,
    title: rutina.name,
    exercises,
    completed: false
  }
}

/** Las carpetas, con sus rutinas dentro. Las sueltas van al final. */
export interface Carpeta {
  /** Sin nombre: las que no están en ninguna carpeta. */
  nombre?: string
  rutinas: Routine[]
}

export function carpetasDe(routines: Routine[]): Carpeta[] {
  const porCarpeta = new Map<string, Routine[]>()
  const sueltas: Routine[] = []
  for (const r of [...routines].sort((a, b) => a.name.localeCompare(b.name, 'es'))) {
    if (r.folder) {
      const ya = porCarpeta.get(r.folder)
      if (ya) ya.push(r)
      else porCarpeta.set(r.folder, [r])
    } else {
      sueltas.push(r)
    }
  }
  const carpetas: Carpeta[] = [...porCarpeta.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'es'))
    .map(([nombre, rutinas]) => ({ nombre, rutinas }))
  return sueltas.length > 0 ? [...carpetas, { rutinas: sueltas }] : carpetas
}

/** Los nombres de carpeta que ya existen, para poder reutilizarlos. */
export function nombresDeCarpeta(routines: Routine[]): string[] {
  return [...new Set(routines.map((r) => r.folder).filter((f): f is string => !!f))].sort((a, b) =>
    a.localeCompare(b, 'es')
  )
}

/**
 * Un nombre que no choque con los que ya hay. Dos rutinas llamadas igual son
 * dos rutinas que no se pueden distinguir en una lista.
 */
export function nombreLibre(routines: Routine[], base: string, exceptoId?: string): string {
  const usados = new Set(
    routines.filter((r) => r.id !== exceptoId).map((r) => r.name.trim().toLowerCase())
  )
  const limpio = base.trim() || 'Rutina'
  if (!usados.has(limpio.toLowerCase())) return limpio
  let n = 2
  while (usados.has(`${limpio} ${n}`.toLowerCase())) n++
  return `${limpio} ${n}`
}

/** «5 ejercicios · 15 series · pecho y espalda». */
export function describirRutina(r: Routine): string {
  const ejercicios = r.exercises.length
  const series = r.exercises.reduce((a, e) => a + e.plan.sets, 0)
  const zonas = [...new Set(r.exercises.map((e) => e.primary))]
  const nombres = zonas.map((z) => MUSCLE_LABELS[z as MuscleGroup].toLowerCase())
  const lista =
    nombres.length <= 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
  return [
    `${ejercicios} ${ejercicios === 1 ? 'ejercicio' : 'ejercicios'}`,
    `${series} series`,
    lista
  ]
    .filter(Boolean)
    .join(' · ')
}

/** ¿Merece la pena ofrecer guardar esta sesión como rutina? */
export function sePuedeGuardar(session: Session): boolean {
  return session.exercises.some((e) => e.primary !== 'cardio')
}

/** Un título de partida para la rutina, sacado de la sesión. */
export function nombrePropuesto(session: Session): string {
  return session.title.replace(/^Fuerza\s*·\s*/i, '').trim() || session.title
}

export type { Routine, SessionKind }
