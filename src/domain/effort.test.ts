import { describe, expect, it } from 'vitest'
import { esfuerzoDe, esfuerzoReciente, explicarEsfuerzo, pideAflojar } from './effort'
import { seriesEfectivas } from './volume'
import type { PlannedExercise, Session, SetLog } from './types'

const HOY = '2026-08-10'

const serie = (rir?: number, extra: Partial<SetLog> = {}): SetLog => ({
  weightKg: 20,
  reps: 10,
  rir,
  done: true,
  ...extra
})

const ejercicio = (logs: SetLog[], p: Partial<PlannedExercise> = {}): PlannedExercise => ({
  exerciseId: 'press_banca_mancuernas',
  name: 'Press',
  primary: 'pecho',
  plan: { sets: logs.length, reps: '8-12', rir: 2 },
  logs,
  done: true,
  ...p
})

const sesion = (date: string, exercises: PlannedExercise[]): Session => ({
  id: `s-${date}`,
  date,
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  exercises
})

describe('lo que costó una sesión', () => {
  it('cuenta las series llevadas cerca del fallo', () => {
    const e = esfuerzoDe(sesion(HOY, [ejercicio([serie(2), serie(1), serie(0)])]))
    expect(e.seriesMedidas).toBe(3)
    expect(e.seriesDuras).toBe(2)
    expect(e.rirMedio).toBe(1)
  })

  it('sin RIR anotado no dice nada, en vez de suponer', () => {
    const e = esfuerzoDe(sesion(HOY, [ejercicio([serie(), serie()])]))
    expect(e.medida).toBe(false)
    expect(e.seriesDuras).toBe(0)
  })

  it('el calentamiento no cuenta como esfuerzo', () => {
    const e = esfuerzoDe(sesion(HOY, [ejercicio([serie(0, { warmup: true }), serie(3)])]))
    expect(e.seriesMedidas).toBe(1)
    expect(e.seriesDuras).toBe(0)
  })

  it('las series sin marcar tampoco', () => {
    const e = esfuerzoDe(sesion(HOY, [ejercicio([serie(0, { done: false }), serie(2)])]))
    expect(e.seriesMedidas).toBe(1)
  })

  it('el cardio no entra: el RIR es cosa de las pesas', () => {
    const cardio = ejercicio([serie(0)], { primary: 'cardio', exerciseId: 'trote_suave' })
    expect(esfuerzoDe(sesion(HOY, [cardio])).medida).toBe(false)
  })
})

describe('lo acumulado de los últimos días', () => {
  it('suma las sesiones dentro de la ventana', () => {
    const e = esfuerzoReciente(
      [
        sesion('2026-08-10', [ejercicio([serie(0), serie(1)])]),
        sesion('2026-08-09', [ejercicio([serie(1), serie(0)])])
      ],
      HOY
    )
    expect(e.seriesDuras).toBe(4)
  })

  it('lo de antes de la ventana se queda fuera', () => {
    const e = esfuerzoReciente([sesion('2026-08-01', [ejercicio([serie(0), serie(0)])])], HOY)
    expect(e.medida).toBe(false)
  })

  it('la media se pondera por series, no por sesiones', () => {
    // Cuatro series a RIR 0 y una a RIR 4: la media tiene que acercarse a 0,8,
    // no a 2, que es lo que saldría promediando las dos sesiones.
    const e = esfuerzoReciente(
      [
        sesion('2026-08-10', [ejercicio([serie(0), serie(0), serie(0), serie(0)])]),
        sesion('2026-08-09', [ejercicio([serie(4)])])
      ],
      HOY
    )
    expect(e.rirMedio).toBe(0.8)
  })
})

describe('cuándo pide el cuerpo aflojar', () => {
  const duras = (n: number) =>
    esfuerzoReciente([sesion(HOY, [ejercicio(Array.from({ length: n }, () => serie(0)))])], HOY)

  it('con muchas series al fallo, sí', () => {
    expect(pideAflojar(duras(9))).toBe(true)
  })

  it('con pocas, no', () => {
    expect(pideAflojar(duras(4))).toBe(false)
  })

  it('muchas series pero lejos del fallo tampoco: es volumen, no fatiga', () => {
    const suaves = esfuerzoReciente(
      [sesion(HOY, [ejercicio(Array.from({ length: 12 }, () => serie(3)))])],
      HOY
    )
    expect(pideAflojar(suaves)).toBe(false)
  })

  it('sin RIR anotado nunca: no se penaliza por sospecha', () => {
    const sinDato = esfuerzoReciente(
      [sesion(HOY, [ejercicio(Array.from({ length: 12 }, () => serie()))])],
      HOY
    )
    expect(pideAflojar(sinDato)).toBe(false)
  })

  it('lo cuenta con los números delante', () => {
    expect(explicarEsfuerzo(duras(9))).toMatch(/9 series/)
    expect(explicarEsfuerzo(esfuerzoReciente([], HOY))).toBeNull()
  })
})

describe('el RIR real manda sobre el prescrito al contar series', () => {
  it('una serie llevada lejos del fallo no cuenta, aunque el plan pidiera apretar', () => {
    const pe = ejercicio([serie(2), serie(6)], { plan: { sets: 2, reps: '8-12', rir: 2 } })
    expect(seriesEfectivas(pe)).toBe(1)
  })

  it('y una llevada al fallo sí cuenta, aunque el plan fuera suave', () => {
    // Antes el plan mandaba: con `rir: 5` el ejercicio entero valía cero, por
    // mucho que las series se hubieran ido al fallo.
    const pe = ejercicio([serie(0), serie(1)], { plan: { sets: 2, reps: '8-12', rir: 5 } })
    expect(seriesEfectivas(pe)).toBe(2)
  })

  it('sin RIR anotado sigue decidiendo el plan, como siempre', () => {
    expect(seriesEfectivas(ejercicio([serie(), serie()], { plan: { sets: 2, reps: '8-12', rir: 5 } }))).toBe(0)
    expect(seriesEfectivas(ejercicio([serie(), serie()], { plan: { sets: 2, reps: '8-12', rir: 2 } }))).toBe(2)
  })

  it('mezclando anotadas y sin anotar, cada una por su criterio', () => {
    const pe = ejercicio([serie(0), serie()], { plan: { sets: 2, reps: '8-12', rir: 2 } })
    expect(seriesEfectivas(pe)).toBe(2)
  })
})
