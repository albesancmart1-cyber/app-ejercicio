import { describe, expect, it } from 'vitest'
import {
  SERIES_PARA_QUE_CUENTE,
  celebrar,
  conSerie,
  describirSerieCorta,
  formatMarca,
  marcaPrevia,
  historialDe,
  marcasDe,
  marcasDeSerie,
  recordsDe,
  recordsDeLaSesion,
  unaRepMaxima,
  vecesEntrenado
} from './records'
import type { ExerciseVariant, Session, SetLog } from './types'

function sesion(
  date: string,
  series: SetLog[],
  extra: { id?: string; exerciseId?: string; variant?: ExerciseVariant; completed?: boolean } = {}
): Session {
  return {
    id: extra.id ?? `s-${date}`,
    date,
    kind: 'fuerza',
    title: 'Fuerza',
    completed: extra.completed ?? true,
    exercises: [
      {
        exerciseId: extra.exerciseId ?? 'press',
        name: 'Press',
        primary: 'pecho',
        plan: { sets: series.length, reps: '8-10' },
        variant: extra.variant,
        logs: series
      }
    ]
  }
}

const s = (weightKg: number | undefined, reps: number, extra: Partial<SetLog> = {}): SetLog => ({
  weightKg,
  reps,
  done: true,
  ...extra
})

describe('1RM estimado', () => {
  it('a una repetición es el propio peso', () => {
    expect(unaRepMaxima(100, 1)).toBe(100)
  })

  it('sube con las repeticiones, por Epley', () => {
    // 100 × (1 + 5/30) = 116,7
    expect(unaRepMaxima(100, 5)).toBeCloseTo(116.7, 1)
    expect(unaRepMaxima(100, 10)!).toBeGreaterThan(unaRepMaxima(100, 5)!)
  })

  it('no estima por encima de doce repeticiones: ahí las fórmulas se separan', () => {
    expect(unaRepMaxima(100, 12)).toBeDefined()
    expect(unaRepMaxima(100, 13)).toBeUndefined()
    expect(unaRepMaxima(100, 30)).toBeUndefined()
  })

  it('sin peso o sin repeticiones no hay estimación', () => {
    expect(unaRepMaxima(0, 5)).toBeUndefined()
    expect(unaRepMaxima(50, 0)).toBeUndefined()
  })
})

describe('las cinco marcas', () => {
  const historia = [
    sesion('2026-01-05', [s(40, 10), s(40, 9)]),
    sesion('2026-01-12', [s(50, 5), s(45, 8)]),
    sesion('2026-01-19', [s(42, 12), s(42, 11)])
  ]

  it('el peso máximo es el más alto que se ha movido', () => {
    expect(recordsDe('press', historia).pesoMaximo).toMatchObject({
      valor: 50,
      fecha: '2026-01-12',
      reps: 5
    })
  })

  it('la mejor serie es la de más peso por repeticiones', () => {
    // 42×12 = 504, por encima de 50×5 = 250 y 40×10 = 400.
    expect(recordsDe('press', historia).mejorSerie).toMatchObject({
      valor: 504,
      fecha: '2026-01-19'
    })
  })

  it('el 1RM estimado compara series que a ojo no se comparan', () => {
    const r = recordsDe('press', historia)
    // 50×5 → 58,3 gana a 42×12 → 58,8… no: 42×12 sale a 58,8. Se comprueba
    // justo eso, que la serie larga con menos peso puede ganar.
    expect(r.unRM!.valor).toBeCloseTo(58.8, 1)
    expect(r.unRM!.fecha).toBe('2026-01-19')
  })

  it('más repeticiones sirve a quien entrena sin peso', () => {
    const r = recordsDe('fondos', [
      sesion('2026-01-05', [s(undefined, 8)], { exerciseId: 'fondos' }),
      sesion('2026-01-12', [s(undefined, 14)], { exerciseId: 'fondos' })
    ])
    expect(r.masReps).toMatchObject({ valor: 14, fecha: '2026-01-12' })
    expect(r.pesoMaximo).toBeUndefined()
  })

  it('la mejor sesión suma todo lo levantado ese día', () => {
    // 2026-01-19: 42×12 + 42×11 = 966, por encima de 40×10 + 40×9 = 760.
    expect(recordsDe('press', historia).mejorSesion).toMatchObject({
      valor: 966,
      fecha: '2026-01-19'
    })
  })

  it('a igualdad de cifra, el récord es del día en que se consiguió primero', () => {
    const r = recordsDe('press', [
      sesion('2026-01-05', [s(60, 5)]),
      sesion('2026-01-12', [s(60, 5)])
    ])
    expect(r.pesoMaximo!.fecha).toBe('2026-01-05')
  })
})

describe('qué cuenta y qué no', () => {
  it('el calentamiento y la cola de un drop set no hacen récords', () => {
    const r = recordsDe('press', [
      sesion('2026-01-05', [s(40, 10)]),
      sesion('2026-01-12', [
        s(80, 20, { tipo: 'calentamiento' }),
        s(30, 25, { tipo: 'drop' }),
        s(45, 8)
      ])
    ])
    expect(r.pesoMaximo!.valor).toBe(45)
    expect(r.masReps!.valor).toBe(10)
  })

  it('una serie sin marcar no cuenta: no se hizo', () => {
    const r = recordsDe('press', [sesion('2026-01-05', [s(100, 10, { done: false })])])
    expect(r.pesoMaximo).toBeUndefined()
    expect(r.seriesRegistradas).toBe(0)
  })

  it('una sesión sin terminar no cuenta', () => {
    const r = recordsDe('press', [sesion('2026-01-05', [s(100, 5)], { completed: false })])
    expect(r.pesoMaximo).toBeUndefined()
  })

  it('separa las marcas por forma: a un brazo no es a dos', () => {
    const historia = [
      sesion('2026-01-05', [s(40, 10)], { variant: { side: 'bilateral' } }),
      sesion('2026-01-12', [s(22, 10)], { variant: { side: 'unilateral' } })
    ]
    expect(recordsDe('press', historia, { variant: { side: 'unilateral' } }).pesoMaximo!.valor).toBe(22)
    expect(recordsDe('press', historia, { variant: { side: 'bilateral' } }).pesoMaximo!.valor).toBe(40)
    // Sin pedir forma se mira todo junto, que es lo que quiere la ficha.
    expect(recordsDe('press', historia).pesoMaximo!.valor).toBe(40)
  })

  it('puede excluir la sesión de hoy, que es contra lo que se compara', () => {
    const historia = [
      sesion('2026-01-05', [s(40, 10)], { id: 'vieja' }),
      sesion('2026-01-12', [s(60, 10)], { id: 'hoy' })
    ]
    expect(recordsDe('press', historia, { excluirSesion: 'hoy' }).pesoMaximo!.valor).toBe(40)
  })
})

describe('avisar en el momento', () => {
  const historia = [sesion('2026-01-05', [s(40, 10), s(40, 9), s(40, 8)])]
  const previos = recordsDe('press', historia)

  it('canta el peso máximo', () => {
    const marcas = marcasDeSerie(s(45, 6), previos)
    expect(marcas).toContain('pesoMaximo')
    expect(celebrar(marcas, s(45, 6), previos)).toContain('40 kg')
  })

  it('canta la mejor serie aunque el peso no sea récord', () => {
    const marcas = marcasDeSerie(s(40, 12), previos)
    expect(marcas).not.toContain('pesoMaximo')
    expect(marcas).toContain('mejorSerie')
  })

  it('no canta nada si no se mejora', () => {
    expect(marcasDeSerie(s(35, 5), previos)).toEqual([])
    expect(celebrar([], s(35, 5), previos)).toBeUndefined()
  })

  it('el primer día no se cantan récords: todo sería uno', () => {
    const vacio = recordsDe('press', [])
    expect(vacio.seriesRegistradas).toBeLessThan(SERIES_PARA_QUE_CUENTE)
    expect(marcasDeSerie(s(100, 10), vacio)).toEqual([])
  })

  it('la misma marca dos veces seguidas solo se canta una', () => {
    const primera = s(45, 6)
    expect(marcasDeSerie(primera, previos)).toContain('pesoMaximo')
    const tras = conSerie(previos, primera, '2026-01-12')
    // La segunda serie igual ya no bate nada: el récord acaba de ponerse ahí.
    expect(marcasDeSerie(s(45, 6), tras)).toEqual([])
    expect(marcasDeSerie(s(46, 6), tras)).toContain('pesoMaximo')
  })

  it('una serie sin marcar todavía no es un récord', () => {
    expect(marcasDeSerie(s(80, 10, { done: false }), previos)).toEqual([])
  })

  it('un calentamiento pesado no es un récord', () => {
    expect(marcasDeSerie(s(80, 3, { tipo: 'calentamiento' }), previos)).toEqual([])
  })

  it('los récords de una sesión ya guardada se recuentan igual', () => {
    const hoy = sesion('2026-01-12', [s(50, 8)], { id: 'hoy' })
    const conseguidos = recordsDeLaSesion(hoy, [...historia, hoy])
    expect(conseguidos).toHaveLength(1)
    expect(conseguidos[0].tipos).toContain('pesoMaximo')
  })
})

describe('historial de un ejercicio', () => {
  const historia = [
    sesion('2026-01-05', [s(40, 10), s(40, 9)]),
    sesion('2026-01-19', [s(45, 8, { rir: 1 }), s(45, 7, { rir: 0 })]),
    sesion('2026-01-12', [s(42, 10)])
  ]

  it('viene del día más reciente hacia atrás', () => {
    expect(historialDe('press', historia).map((d) => d.fecha)).toEqual([
      '2026-01-19',
      '2026-01-12',
      '2026-01-05'
    ])
  })

  it('cada día trae su carga, su tope y su RIR medio', () => {
    const d = historialDe('press', historia)[0]
    expect(d.carga).toBe(45 * 8 + 45 * 7)
    expect(d.pesoMaximo).toBe(45)
    expect(d.rirMedio).toBe(0.5)
    expect(d.unRM).toBeCloseTo(57, 0)
  })

  it('cuenta los días entrenados', () => {
    expect(vecesEntrenado('press', historia)).toBe(3)
    expect(vecesEntrenado('sentadilla', historia)).toBe(0)
  })
})

describe('cómo se leen', () => {
  it('cada marca lleva su unidad', () => {
    expect(formatMarca('pesoMaximo', { valor: 42, fecha: 'x' })).toBe('42 kg')
    expect(formatMarca('masReps', { valor: 14, fecha: 'x' })).toBe('14 reps')
    // En español los cuatro dígitos van sin separador, y los cinco con él.
    expect(formatMarca('mejorSesion', { valor: 1240, fecha: 'x' })).toBe('1240 kg')
    expect(formatMarca('mejorSesion', { valor: 12400, fecha: 'x' })).toBe('12.400 kg')
  })

  it('se enseñan en orden y solo las que existen', () => {
    const r = recordsDe('fondos', [
      sesion('2026-01-05', [s(undefined, 12)], { exerciseId: 'fondos' })
    ])
    expect(marcasDe(r).map((m) => m.tipo)).toEqual(['masReps'])
  })
})

describe('los decimales se leen en español', () => {
  it('el 1RM estimado va con coma, no con punto', () => {
    expect(formatMarca('unRM', { valor: 18.7, fecha: 'x' })).toBe('18,7 kg')
  })
})

describe('el antes y el después de un récord', () => {
  const historia = [sesion('2026-01-05', [s(40, 10), s(40, 9), s(40, 8)])]
  const previos = recordsDe('press', historia)

  it('la serie se lee en corto', () => {
    expect(describirSerieCorta(s(45, 8))).toBe('45 kg × 8')
    expect(describirSerieCorta(s(undefined, 12))).toBe('12 reps')
  })

  it('enseña contra qué se ha batido', () => {
    expect(marcaPrevia(['pesoMaximo'], previos)).toBe('40 kg × 10')
    expect(marcaPrevia(['mejorSerie'], previos)).toBe('40 kg × 10')
  })

  it('sin nada previo no se inventa una referencia', () => {
    expect(marcaPrevia(['pesoMaximo'], recordsDe('press', []))).toBeUndefined()
    expect(marcaPrevia([], previos)).toBeUndefined()
  })

  it('sin peso, la referencia son repeticiones', () => {
    const sinPeso = recordsDe('fondos', [
      sesion('2026-01-05', [s(undefined, 8)], { exerciseId: 'fondos' })
    ])
    expect(marcaPrevia(['masReps'], sinPeso)).toBe('8 reps')
  })
})
