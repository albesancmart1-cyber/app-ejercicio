import { describe, expect, it } from 'vitest'
import {
  diasDeLaSemana,
  explicarSemana,
  resumenDeSemana,
  ultimosSieteDias,
  zonasDeLaSemana
} from './semana'
import type { MuscleContributions } from './muscles'
import type { Session } from './types'

function sesion(
  date: string,
  ejercicios: { aporte: MuscleContributions; series: number }[]
): Session {
  return {
    id: `s-${date}-${ejercicios.length}`,
    date,
    kind: 'fuerza',
    title: 'Fuerza',
    completed: true,
    exercises: ejercicios.map((e, i) => ({
      exerciseId: `ej-${i}`,
      name: `Ejercicio ${i}`,
      primary: 'pecho' as const,
      plan: { sets: e.series, reps: '8-10', rir: 1 },
      muscleContributions: e.aporte,
      logs: Array.from({ length: e.series }, () => ({
        weightKg: 40,
        reps: 10,
        rir: 1,
        done: true
      }))
    }))
  }
}

describe('los siete días', () => {
  it('acaban hoy, no el domingo', () => {
    const dias = ultimosSieteDias('2026-03-11')
    expect(dias).toHaveLength(7)
    expect(dias[6]).toBe('2026-03-11')
    expect(dias[0]).toBe('2026-03-05')
  })

  it('cruzan el cambio de mes sin despeinarse', () => {
    expect(ultimosSieteDias('2026-03-02')[0]).toBe('2026-02-24')
  })

  it('cada día trae su inicial y si se entrenó', () => {
    const dias = diasDeLaSemana([sesion('2026-03-10', [{ aporte: { pectoral_mayor: 1 }, series: 3 }])], '2026-03-11')
    const martes = dias.find((d) => d.fecha === '2026-03-10')!
    expect(martes.entrenado).toBe(true)
    expect(martes.inicial).toBe('M')
    expect(martes.series).toBe(3)
    expect(dias.find((d) => d.fecha === '2026-03-11')!.esHoy).toBe(true)
  })

  it('un día sin entrenar cuenta cero, no desaparece', () => {
    const dias = diasDeLaSemana([], '2026-03-11')
    expect(dias).toHaveLength(7)
    expect(dias.every((d) => !d.entrenado && d.series === 0)).toBe(true)
  })
})

describe('lo que falta por trabajar', () => {
  const historia = [
    sesion('2026-03-09', [{ aporte: { pectoral_mayor: 1 }, series: 6 }]),
    sesion('2026-03-11', [{ aporte: { pectoral_mayor: 1 }, series: 6 }])
  ]

  it('suma las series de la zona en los siete días', () => {
    const pecho = zonasDeLaSemana(historia, '2026-03-11').find((z) => z.grupo === 'pecho')!
    expect(pecho.series).toBe(12)
  })

  it('marca como corta la zona que no llega a su mínimo', () => {
    const zonas = zonasDeLaSemana(historia, '2026-03-11')
    const espalda = zonas.find((z) => z.grupo === 'espalda')!
    expect(espalda.series).toBe(0)
    expect(espalda.estado).toBe('corto')
  })

  it('y como pasada la que se sale del máximo', () => {
    const mucho = [sesion('2026-03-11', [{ aporte: { pectoral_mayor: 1 }, series: 40 }])]
    expect(zonasDeLaSemana(mucho, '2026-03-11').find((z) => z.grupo === 'pecho')!.estado).toBe(
      'pasado'
    )
  })

  it('ordena poniendo delante lo que más falta', () => {
    const zonas = zonasDeLaSemana(historia, '2026-03-11')
    expect(zonas[0].series).toBe(0)
    expect(zonas[zonas.length - 1].grupo).toBe('pecho')
  })

  it('lo de hace nueve días ya no cuenta para esta semana', () => {
    const viejo = [sesion('2026-03-01', [{ aporte: { pectoral_mayor: 1 }, series: 10 }])]
    expect(zonasDeLaSemana(viejo, '2026-03-11').find((z) => z.grupo === 'pecho')!.series).toBe(0)
  })
})

describe('el resumen de la semana', () => {
  const historia = [
    sesion('2026-03-02', [{ aporte: { pectoral_mayor: 1 }, series: 4 }]),
    sesion('2026-03-09', [{ aporte: { pectoral_mayor: 1 }, series: 6 }]),
    sesion('2026-03-11', [{ aporte: { dorsal_ancho: 1 }, series: 6 }])
  ]
  const r = resumenDeSemana(historia, '2026-03-11')

  it('cuenta días y series de los últimos siete', () => {
    expect(r.diasEntrenados).toBe(2)
    expect(r.series).toBe(12)
  })

  it('trae la semana anterior, para saber si vas a más', () => {
    expect(r.seriesPrevias).toBe(4)
  })

  it('señala la zona que va más corta', () => {
    expect(r.masCorta).toBeDefined()
    expect(r.masCorta!.series).toBe(0)
  })

  it('lo dice en una frase, sin regañar', () => {
    const frase = explicarSemana(r)
    expect(frase).toContain('2 días')
    expect(frase).toMatch(/más corto/)
    expect(frase).not.toMatch(/deberías|mal|fracaso/i)
  })

  it('una semana en blanco se dice sin reproche', () => {
    const frase = explicarSemana(resumenDeSemana([], '2026-03-11'))
    expect(frase).toMatch(/todavía no hay nada/i)
    expect(frase).not.toMatch(/deberías|falta de|mal/i)
  })
})
