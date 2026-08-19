import { describe, expect, it } from 'vitest'
import { compararConHistorial, compararSesiones, sesionComparable } from './comparacion'
import type { PlannedExercise, Session, SetLog } from './types'

function ej(id: string, series: Partial<SetLog>[]): PlannedExercise {
  return {
    exerciseId: id,
    name: id,
    primary: 'pecho',
    plan: { sets: series.length, reps: '8-12', rir: 2, restSeconds: 120 },
    done: true,
    logs: series.map((s) => ({ done: true, ...s }))
  }
}

function sesion(id: string, date: string, exercises: PlannedExercise[]): Session {
  return { id, date, kind: 'fuerza', title: 'Fuerza', completed: true, exercises }
}

const serie = (weightKg: number, reps: number, rir?: number): Partial<SetLog> => ({ weightKg, reps, rir })

describe('encontrar la sesión comparable', () => {
  const hoy = sesion('hoy', '2026-08-19', [ej('press', [serie(40, 10)]), ej('remo', [serie(30, 10)]), ej('curl', [serie(12, 12)])])

  it('la más reciente que comparte la mayoría de ejercicios', () => {
    const vieja = sesion('a', '2026-08-01', [ej('press', [serie(38, 10)]), ej('remo', [serie(28, 10)])])
    const cercana = sesion('b', '2026-08-15', [ej('press', [serie(39, 10)]), ej('remo', [serie(29, 10)])])
    expect(sesionComparable(hoy, [vieja, cercana, hoy])?.id).toBe('b')
  })

  it('una sesión de pierna no compara con una de torso', () => {
    const pierna = sesion('p', '2026-08-17', [ej('sentadilla', [serie(80, 8)]), ej('zancada', [serie(20, 10)])])
    expect(sesionComparable(hoy, [pierna, hoy])).toBeUndefined()
  })

  it('sin historial no hay comparación, y no se inventa', () => {
    expect(compararConHistorial(hoy, [hoy])).toBeUndefined()
  })

  it('las sesiones de después no valen como referencia', () => {
    const futura = sesion('f', '2026-08-20', [ej('press', [serie(50, 10)]), ej('remo', [serie(40, 10)])])
    expect(sesionComparable(hoy, [futura, hoy])).toBeUndefined()
  })
})

describe('la comparación', () => {
  it('«un 4 % más que ayer», con los kilos de verdad', () => {
    const antes = sesion('a', '2026-08-18', [ej('press', [serie(40, 10), serie(40, 10)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(40, 10), serie(41.6, 10)]), ej('remo', [serie(0, 0)])])
    // La búsqueda pide ≥2 comunes con ≥2 ejercicios… aquí se compara directo.
    const c = compararSesiones(hoy, antes)
    expect(c.volumenAntesKg).toBe(800)
    expect(c.volumenHoyKg).toBe(816)
    expect(c.titular).toMatch(/816 kg/)
    expect(c.titular).toMatch(/2 % más|lo mismo que/)
  })

  it('subir el peso se dice con la flecha y los kilos', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10, 2)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(42.5, 10, 2)])])
    const e = compararSesiones(hoy, antes).ejercicios[0]
    expect(e.direccion).toBe('sube')
    expect(e.detalle).toBe('40 → 42,5 kg')
  })

  it('mismo peso con más repeticiones también es subir', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(40, 12)])])
    const e = compararSesiones(hoy, antes).ejercicios[0]
    expect(e.direccion).toBe('sube')
    expect(e.detalle).toBe('+2 reps con el mismo peso')
  })

  it('subir yendo igual de sobrado es progreso doble, y se dice', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10, 2), serie(40, 10, 2)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(42.5, 10, 2), serie(42.5, 10, 3)])])
    const e = compararSesiones(hoy, antes).ejercicios[0]
    expect(e.matiz).toMatch(/progreso doble/)
  })

  it('subir arrastrándose lleva su matiz, no su medalla', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10, 3)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(42.5, 10, 0)])])
    const e = compararSesiones(hoy, antes).ejercicios[0]
    expect(e.matiz).toMatch(/apurando/)
  })

  it('sin RIR anotado no hay matiz: no se inventa el esfuerzo', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(42.5, 10)])])
    expect(compararSesiones(hoy, antes).ejercicios[0].matiz).toBeUndefined()
  })

  it('un ejercicio que no estaba se marca nuevo, no se compara con nada', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(40, 10)]), ej('curl', [serie(12, 12)])])
    const c = compararSesiones(hoy, antes)
    expect(c.ejercicios.find((e) => e.exerciseId === 'curl')?.direccion).toBe('nuevo')
  })

  it('bajar volumen se dice como información, no como juicio', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10), serie(40, 10), serie(40, 10)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(40, 10)])])
    const c = compararSesiones(hoy, antes)
    expect(c.titular).toMatch(/menos/)
    expect(c.titular).toMatch(/información, no un juicio/)
  })

  it('los calentamientos no cuentan en la mejor serie', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10)])])
    const hoy = sesion('h', '2026-08-19', [
      ej('press', [{ ...serie(60, 5), tipo: 'calentamiento' } as Partial<SetLog>, serie(40, 10)])
    ])
    const e = compararSesiones(hoy, antes).ejercicios[0]
    expect(e.direccion).toBe('igual')
  })

  it('nunca habla de calorías', () => {
    const antes = sesion('a', '2026-08-12', [ej('press', [serie(40, 10)])])
    const hoy = sesion('h', '2026-08-19', [ej('press', [serie(35, 8)])])
    const c = compararSesiones(hoy, antes)
    expect(c.titular).not.toMatch(/calor[ií]a|kcal/i)
    for (const e of c.ejercicios) expect(e.detalle).not.toMatch(/calor[ií]a/i)
  })
})
