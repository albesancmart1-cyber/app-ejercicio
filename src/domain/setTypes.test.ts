import { describe, expect, it } from 'vitest'
import { esCalentamiento, pesoEnVolumen, repVerdict, rirDe, syncExercise, tipoDe } from './setLogs'
import { seriesEfectivas } from './volume'
import { esfuerzoDe } from './effort'
import type { PlannedExercise, Session, SetLog, TipoSerie } from './types'

const serie = (tipo: TipoSerie | undefined, extra: Partial<SetLog> = {}): SetLog => ({
  weightKg: 20,
  reps: 10,
  done: true,
  ...(tipo ? { tipo } : {}),
  ...extra
})

const ejercicio = (logs: SetLog[], plan: Partial<PlannedExercise['plan']> = {}): PlannedExercise => ({
  exerciseId: 'press_banca_mancuernas',
  name: 'Press',
  primary: 'pecho',
  plan: { sets: logs.length, reps: '8-12', rir: 2, ...plan },
  logs,
  done: true
})

const sesion = (exercises: PlannedExercise[]): Session => ({
  id: 's1',
  date: '2026-08-10',
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  exercises
})

describe('qué clase de serie es', () => {
  it('lo que no lleva tipo es una serie normal', () => {
    expect(tipoDe(serie(undefined))).toBe('normal')
  })

  it('los registros antiguos con la bandera de calentamiento se siguen leyendo', () => {
    // Antes solo existía `warmup`. Respetarlo es lo que hace que una sesión
    // guardada hace meses cuente hoy igual que el día que se registró.
    expect(tipoDe(serie(undefined, { warmup: true }))).toBe('calentamiento')
    expect(esCalentamiento(serie(undefined, { warmup: true }))).toBe(true)
  })

  it('el tipo nuevo manda sobre la bandera vieja', () => {
    expect(tipoDe(serie('normal', { warmup: true }))).toBe('normal')
  })
})

describe('cuánto cuenta cada tipo para el volumen', () => {
  it('el calentamiento no cuenta: prepara, no estimula', () => {
    expect(pesoEnVolumen(serie('calentamiento'))).toBe(0)
  })

  it('una serie normal cuenta entera', () => {
    expect(pesoEnVolumen(serie('normal'))).toBe(1)
  })

  it('una serie al fallo también: es una serie, y de las duras', () => {
    expect(pesoEnVolumen(serie('fallo'))).toBe(1)
  })

  it('un drop set cuenta media: continúa la anterior, no es una nueva', () => {
    expect(pesoEnVolumen(serie('drop'))).toBe(0.5)
  })

  it('el total de un ejercicio suma los pesos, no las series', () => {
    // Calentamiento + dos normales + un drop = 2,5
    const pe = ejercicio([serie('calentamiento'), serie('normal'), serie('normal'), serie('drop')])
    expect(seriesEfectivas(pe)).toBe(2.5)
  })
})

describe('el RIR de una serie al fallo se da por hecho', () => {
  it('vale cero aunque no se anote: es lo que significa', () => {
    expect(rirDe(serie('fallo'))).toBe(0)
  })

  it('lo anotado a mano manda igualmente', () => {
    expect(rirDe(serie('fallo', { rir: 1 }))).toBe(1)
  })

  it('una serie normal sin anotar cae al RIR del plan', () => {
    expect(rirDe(serie('normal'), 2)).toBe(2)
    expect(rirDe(serie('normal'))).toBeUndefined()
  })

  it('y cuenta como serie dura en el esfuerzo, sin haber escrito nada', () => {
    const e = esfuerzoDe(sesion([ejercicio([serie('fallo'), serie('fallo')])]))
    expect(e.medida).toBe(true)
    expect(e.seriesDuras).toBe(2)
    expect(e.rirMedio).toBe(0)
  })
})

describe('las series de trabajo son las que mandan en la progresión', () => {
  it('el peso de referencia no sale de un calentamiento', () => {
    const pe = syncExercise(
      ejercicio([serie('calentamiento', { weightKg: 30 }), serie('normal', { weightKg: 20 })])
    )
    expect(pe.actualWeightKg).toBe(20)
  })

  it('ni de la cola de un drop set, que va más ligera', () => {
    const pe = syncExercise(
      ejercicio([serie('normal', { weightKg: 24 }), serie('drop', { weightKg: 12 })])
    )
    expect(pe.actualWeightKg).toBe(24)
  })

  it('con solo calentamiento anotado, se usa lo que hay antes que quedarse sin nada', () => {
    const pe = syncExercise(ejercicio([serie('calentamiento', { weightKg: 10 })]))
    expect(pe.actualWeightKg).toBe(10)
  })

  it('las repeticiones de un drop set no cuentan para la doble progresión', () => {
    // Las dos series de trabajo ganan el rango, así que toca subir. La cola del
    // drop se hace con menos peso y cae por debajo del mínimo: si contara,
    // frenaría la subida por un motivo que no es haber fallado.
    const conDrop = ejercicio([
      serie('normal', { reps: 12 }),
      serie('normal', { reps: 12 }),
      serie('drop', { reps: 5, weightKg: 10 })
    ])
    expect(repVerdict(conDrop)).toBe('sube')
  })

  it('ni las del calentamiento', () => {
    const pe = ejercicio([
      serie('calentamiento', { reps: 5, weightKg: 8 }),
      serie('normal', { reps: 12 }),
      serie('normal', { reps: 12 })
    ])
    expect(repVerdict(pe)).toBe('sube')
  })
})

describe('nada de esto cambia lo ya guardado', () => {
  it('una sesión sin tipos cuenta exactamente igual que antes', () => {
    const pe = ejercicio([serie(undefined), serie(undefined), serie(undefined)])
    expect(seriesEfectivas(pe)).toBe(3)
  })

  it('y una con la bandera vieja de calentamiento, también', () => {
    const pe = ejercicio([serie(undefined, { warmup: true }), serie(undefined), serie(undefined)])
    expect(seriesEfectivas(pe)).toBe(2)
  })

  it('el plan sigue decidiendo cuando no hay RIR anotado en ninguna', () => {
    expect(seriesEfectivas(ejercicio([serie(undefined), serie(undefined)], { rir: 5 }))).toBe(0)
  })
})
