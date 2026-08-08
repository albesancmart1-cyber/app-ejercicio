import { describe, expect, it } from 'vitest'
import {
  diasDelPeriodo,
  estadisticasDe,
  formatVariacion,
  mesAnterior,
  mesDe,
  mesesConDatos,
  nombreDeMes,
  resumirMes,
  variacion
} from './estadisticas'
import type { Session, SetLog } from './types'

const s = (weightKg: number | undefined, reps: number, extra: Partial<SetLog> = {}): SetLog => ({
  weightKg,
  reps,
  rir: 1,
  done: true,
  ...extra
})

function sesion(
  date: string,
  series: SetLog[],
  extra: {
    id?: string
    exerciseId?: string
    name?: string
    durationSec?: number
    completed?: boolean
  } = {}
): Session {
  return {
    id: extra.id ?? `s-${date}-${extra.exerciseId ?? 'press'}`,
    date,
    kind: 'fuerza',
    title: 'Fuerza',
    completed: extra.completed ?? true,
    durationSec: extra.durationSec,
    exercises: [
      {
        exerciseId: extra.exerciseId ?? 'press_banca',
        name: extra.name ?? 'Press de banca',
        primary: 'pecho',
        plan: { sets: series.length, reps: '8-10', rir: 1 },
        logs: series
      }
    ]
  }
}

describe('meses', () => {
  it('el mes va del día 1 al último, y sabe de bisiestos', () => {
    expect(mesDe('2026-03-17')).toEqual({ desde: '2026-03-01', hasta: '2026-03-31' })
    expect(mesDe('2026-02-05').hasta).toBe('2026-02-28')
    expect(mesDe('2024-02-05').hasta).toBe('2024-02-29')
  })

  it('el mes anterior cruza el año hacia atrás', () => {
    expect(mesAnterior('2026-01-09')).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' })
    expect(mesAnterior('2026-03-09').desde).toBe('2026-02-01')
  })

  it('cuenta los días del periodo, extremos incluidos', () => {
    expect(diasDelPeriodo({ desde: '2026-03-01', hasta: '2026-03-31' })).toBe(31)
    expect(diasDelPeriodo({ desde: '2026-03-01', hasta: '2026-03-01' })).toBe(1)
  })

  it('lista los meses con algo registrado, del más reciente al más antiguo', () => {
    const historia = [
      sesion('2026-01-10', [s(40, 8)]),
      sesion('2026-03-02', [s(40, 8)]),
      sesion('2026-03-20', [s(40, 8)]),
      sesion('2026-02-01', [s(40, 8)], { completed: false })
    ]
    expect(mesesConDatos(historia)).toEqual(['2026-03', '2026-01'])
  })

  it('se lee en cristiano', () => {
    expect(nombreDeMes('2026-03-01')).toBe('marzo de 2026')
  })
})

describe('lo que se cuenta del mes', () => {
  const marzo = mesDe('2026-03-01')
  const historia = [
    sesion('2026-02-25', [s(40, 10)], { id: 'de-febrero' }),
    sesion('2026-03-03', [s(40, 10), s(40, 9)], { durationSec: 3600 }),
    sesion('2026-03-10', [s(45, 8), s(45, 8)], { durationSec: 1800 }),
    sesion('2026-03-10', [s(20, 12)], {
      id: 'curl',
      exerciseId: 'curl_biceps',
      name: 'Curl de bíceps'
    }),
    sesion('2026-04-02', [s(50, 8)], { id: 'de-abril' })
  ]

  const e = estadisticasDe(historia, marzo)

  it('deja fuera lo que no cae en el mes', () => {
    expect(e.entrenos).toBe(3)
    expect(e.diasEntrenados).toBe(2)
  })

  it('suma series, repeticiones y kilos', () => {
    expect(e.series).toBe(5)
    expect(e.repeticiones).toBe(10 + 9 + 8 + 8 + 12)
    expect(e.cargaTotal).toBe(40 * 10 + 40 * 9 + 45 * 8 + 45 * 8 + 20 * 12)
  })

  it('los minutos solo salen de lo que se cronometró, y lo dice', () => {
    expect(e.minutos).toBe(90)
    expect(e.entrenosCronometrados).toBe(2)
  })

  it('ordena los ejercicios por veces hechos', () => {
    expect(e.masHechos[0]).toMatchObject({ exerciseId: 'press_banca', dias: 2, series: 4 })
    expect(e.masHechos[1]).toMatchObject({ exerciseId: 'curl_biceps', dias: 1 })
  })

  it('reparte el volumen por músculo', () => {
    expect(Object.keys(e.porMusculo).length).toBeGreaterThan(0)
  })

  it('mide la constancia sobre las semanas del periodo', () => {
    expect(e.semanas).toBe(5)
    expect(e.semanasConEntreno).toBe(2)
    expect(e.porSemana).toBeCloseTo(0.6, 1)
  })

  it('recoge los récords conseguidos dentro del mes', () => {
    // Con cuatro series previas registradas, el salto a 45 kg es récord.
    const conBase = [
      sesion('2026-02-01', [s(40, 10), s(40, 9), s(40, 8)], { id: 'base' }),
      sesion('2026-03-10', [s(45, 8)], { id: 'record' })
    ]
    const stats = estadisticasDe(conBase, mesDe('2026-03-01'))
    expect(stats.records).toHaveLength(1)
    expect(stats.records[0]).toMatchObject({ exerciseId: 'press_banca', fecha: '2026-03-10' })
    expect(stats.records[0].tipos).toContain('pesoMaximo')
  })

  it('un mes vacío no rompe nada', () => {
    const vacio = estadisticasDe(historia, mesDe('2026-06-01'))
    expect(vacio.entrenos).toBe(0)
    expect(vacio.series).toBe(0)
    expect(vacio.masHechos).toEqual([])
    expect(vacio.porSemana).toBe(0)
  })
})

describe('comparar con el mes anterior', () => {
  it('da el cambio en tanto por ciento', () => {
    expect(variacion(12, 10)).toBe(20)
    expect(variacion(8, 10)).toBe(-20)
    expect(variacion(10, 10)).toBe(0)
  })

  it('sin mes anterior no hay comparación que hacer', () => {
    expect(variacion(12, 0)).toBeUndefined()
    expect(formatVariacion(undefined)).toBeUndefined()
  })

  it('se lee con su signo', () => {
    expect(formatVariacion(20)).toBe('+20 %')
    expect(formatVariacion(-20)).toBe('−20 %')
    expect(formatVariacion(0)).toBe('igual')
  })
})

describe('el mes en una frase', () => {
  const marzo = mesDe('2026-03-01')
  const historia = [sesion('2026-03-03', [s(40, 10)]), sesion('2026-03-10', [s(40, 10)])]

  it('cuenta lo que hubo', () => {
    const frase = resumirMes(estadisticasDe(historia, marzo))
    expect(frase).toContain('2 entrenos')
    expect(frase).toContain('kg movidos')
  })

  it('compara con el mes anterior cuando lo hay', () => {
    const previo = estadisticasDe([sesion('2026-02-03', [s(40, 10)])], mesDe('2026-02-01'))
    const frase = resumirMes(estadisticasDe(historia, marzo), previo)
    expect(frase).toContain('100 % más entrenos')
  })

  it('un mes en blanco se dice sin reproche', () => {
    const frase = resumirMes(estadisticasDe([], marzo))
    expect(frase).toMatch(/no hay entrenos/i)
    expect(frase).not.toMatch(/deber|falta|mal|excusa/i)
  })

  it('entrenar menos no se cuenta como un fracaso', () => {
    const previo = estadisticasDe(
      [sesion('2026-02-03', [s(40, 10)]), sesion('2026-02-05', [s(40, 10)]), sesion('2026-02-07', [s(40, 10)]), sesion('2026-02-09', [s(40, 10)])],
      mesDe('2026-02-01')
    )
    const frase = resumirMes(estadisticasDe(historia, marzo), previo)
    expect(frase).toContain('50 % menos entrenos')
    expect(frase).toMatch(/también es información/)
  })
})
