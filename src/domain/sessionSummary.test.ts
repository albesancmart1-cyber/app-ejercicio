import { describe, expect, it } from 'vitest'
import { describirSerie, formatCarga, resumirSesion } from './sessionSummary'
import type { PlannedExercise, Session, SetLog } from './types'

const serie = (weightKg: number | undefined, reps: number | undefined, extra: Partial<SetLog> = {}): SetLog => ({
  weightKg,
  reps,
  done: true,
  ...extra
})

const ejercicio = (p: Partial<PlannedExercise> = {}): PlannedExercise => ({
  exerciseId: 'press_banca_mancuernas',
  name: 'Press de banca con mancuernas',
  primary: 'pecho',
  plan: { sets: 3, reps: '8-12', rir: 2 },
  logs: [serie(20, 10), serie(20, 9), serie(20, 8)],
  ...p
})

const sesion = (exercises: PlannedExercise[]): Session => ({
  id: 's1',
  date: '2026-08-05',
  kind: 'fuerza',
  title: 'Fuerza · pecho',
  completed: true,
  exercises
})

describe('lo que se hizo, ejercicio a ejercicio', () => {
  it('cuenta series y repeticiones', () => {
    const r = resumirSesion(sesion([ejercicio()]))
    expect(r.ejercicios[0].seriesHechas).toBe(3)
    expect(r.ejercicios[0].repsTotales).toBe(27)
  })

  it('el peso máximo es el más alto que se movió', () => {
    const r = resumirSesion(sesion([ejercicio({ logs: [serie(20, 10), serie(24, 6)] })]))
    expect(r.ejercicios[0].pesoMaximo).toBe(24)
  })

  it('la carga total es peso por repeticiones, sumado', () => {
    const r = resumirSesion(sesion([ejercicio({ logs: [serie(20, 10), serie(10, 10)] })]))
    expect(r.ejercicios[0].cargaTotal).toBe(300)
  })

  it('sin peso anotado no se inventa una carga', () => {
    const r = resumirSesion(sesion([ejercicio({ logs: [serie(undefined, 12), serie(undefined, 10)] })]))
    expect(r.ejercicios[0].cargaTotal).toBeUndefined()
    expect(r.ejercicios[0].repsTotales).toBe(22)
  })

  it('el calentamiento se enseña pero no cuenta como trabajo', () => {
    const r = resumirSesion(
      sesion([ejercicio({ logs: [serie(10, 12, { warmup: true }), serie(20, 10), serie(20, 8)] })])
    )
    expect(r.ejercicios[0].series).toHaveLength(3)
    expect(r.ejercicios[0].seriesHechas).toBe(2)
    expect(r.ejercicios[0].repsTotales).toBe(18)
  })

  it('las series sin marcar no cuentan ni salen', () => {
    const r = resumirSesion(
      sesion([ejercicio({ logs: [serie(20, 10), { weightKg: 20, reps: undefined, done: false }] })])
    )
    expect(r.ejercicios[0].series).toHaveLength(1)
    expect(r.ejercicios[0].seriesHechas).toBe(1)
  })

  it('una sesión antigua sin registro serie a serie sigue contando', () => {
    const r = resumirSesion(sesion([ejercicio({ logs: undefined, done: true })]))
    expect(r.ejercicios[0].seriesHechas).toBe(3)
    expect(r.ejercicios[0].series).toHaveLength(0)
  })

  it('dice cuántos ejercicios se quedaron sin hacer', () => {
    const r = resumirSesion(sesion([ejercicio(), ejercicio({ exerciseId: 'x', logs: [] })]))
    expect(r.sinHacer).toBe(1)
  })

  it('marca lo que se añadió a mano', () => {
    const r = resumirSesion(sesion([ejercicio({ addedByUser: true })]))
    expect(r.ejercicios[0].anadido).toBe(true)
  })
})

describe('los totales de la sesión', () => {
  it('suman lo de todos los ejercicios', () => {
    const r = resumirSesion(
      sesion([
        ejercicio({ logs: [serie(20, 10), serie(20, 10)] }),
        ejercicio({ exerciseId: 'curl_biceps', name: 'Curl', logs: [serie(10, 12)] })
      ])
    )
    expect(r.seriesTotales).toBe(3)
    expect(r.repsTotales).toBe(32)
    expect(r.cargaTotal).toBe(520)
  })

  it('el cardio no entra en la lista de ejercicios', () => {
    const r = resumirSesion(
      sesion([
        ejercicio(),
        { exerciseId: 'trote_suave', name: 'Trote', primary: 'cardio', plan: { sets: 1, reps: '25 min' } }
      ])
    )
    expect(r.ejercicios).toHaveLength(1)
  })
})

describe('los músculos trabajados', () => {
  it('cuenta el primario entero y el que acompaña a media serie', () => {
    const r = resumirSesion(sesion([ejercicio()]))
    expect(r.musculos.pectoral_mayor).toBe(3)
    expect(r.musculos.triceps_braquial).toBe(1.5)
  })

  it('suma lo que aportan varios ejercicios al mismo músculo', () => {
    const r = resumirSesion(
      sesion([
        ejercicio(),
        ejercicio({ exerciseId: 'flexiones', name: 'Flexiones', logs: [serie(undefined, 12), serie(undefined, 10)] })
      ])
    )
    expect(r.musculos.pectoral_mayor).toBe(5)
  })

  it('usa el mapa congelado en la sesión, no el del catálogo de hoy', () => {
    // Afinar el mapa mañana no debe reescribir lo que ya entrenaste.
    const r = resumirSesion(
      sesion([ejercicio({ muscleContributions: { gluteo: 1 } })])
    )
    expect(r.musculos.gluteo).toBe(3)
    expect(r.musculos.pectoral_mayor).toBeUndefined()
  })

  it('un ejercicio sin registrar no aporta músculo', () => {
    const r = resumirSesion(sesion([ejercicio({ logs: [] })]))
    expect(Object.keys(r.musculos)).toHaveLength(0)
  })
})

describe('cómo se leen los números', () => {
  it('una serie con peso', () => {
    expect(describirSerie(serie(40, 8))).toBe('40 kg × 8')
  })

  it('una serie sin peso', () => {
    expect(describirSerie(serie(undefined, 12))).toBe('× 12')
  })

  it('una serie sin repeticiones anotadas no miente con un cero', () => {
    expect(describirSerie(serie(40, undefined))).toBe('40 kg × —')
  })

  it('la carga se lee con separador de millar', () => {
    expect(formatCarga(4520)).toMatch(/4\D?520 kg/)
  })
})
