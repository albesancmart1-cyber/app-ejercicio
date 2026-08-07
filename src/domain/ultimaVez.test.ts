import { describe, expect, it } from 'vitest'
import { cuandoFue, describirUltimaVez, rirMedioDe, ultimaVezDe } from './ultimaVez'
import { initLogs } from './setLogs'
import type { PlannedExercise, Session, SetLog } from './types'

const HOY = '2026-08-10'

const serie = (weightKg: number | undefined, reps: number, extra: Partial<SetLog> = {}): SetLog => ({
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
  logs: [serie(22, 10), serie(22, 9), serie(22, 8)],
  done: true,
  ...p
})

const sesion = (date: string, exercises: PlannedExercise[], completed = true): Session => ({
  id: `s-${date}`,
  date,
  kind: 'fuerza',
  title: 'Fuerza',
  completed,
  exercises
})

describe('qué hiciste la última vez', () => {
  it('trae las series una a una, no una media', () => {
    const u = ultimaVezDe('press_banca_mancuernas', [sesion('2026-08-05', [ejercicio()])])
    expect(u?.date).toBe('2026-08-05')
    expect(u?.series.map((l) => l.reps)).toEqual([10, 9, 8])
    expect(u?.series.map((l) => l.weightKg)).toEqual([22, 22, 22])
  })

  it('coge la más reciente de todas', () => {
    const u = ultimaVezDe('press_banca_mancuernas', [
      sesion('2026-08-01', [ejercicio({ logs: [serie(20, 12)] })]),
      sesion('2026-08-08', [ejercicio({ logs: [serie(24, 8)] })])
    ])
    expect(u?.date).toBe('2026-08-08')
    expect(u?.series[0].weightKg).toBe(24)
  })

  it('el calentamiento no es la referencia', () => {
    const u = ultimaVezDe('press_banca_mancuernas', [
      sesion('2026-08-05', [ejercicio({ logs: [serie(10, 15, { warmup: true }), serie(22, 10)] })])
    ])
    expect(u?.series).toHaveLength(1)
    expect(u?.series[0].weightKg).toBe(22)
  })

  it('las series sin marcar tampoco', () => {
    const u = ultimaVezDe('press_banca_mancuernas', [
      sesion('2026-08-05', [ejercicio({ logs: [serie(22, 10), { weightKg: 22, done: false }] })])
    ])
    expect(u?.series).toHaveLength(1)
  })

  it('una sesión sin terminar no cuenta como referencia', () => {
    expect(ultimaVezDe('press_banca_mancuernas', [sesion('2026-08-05', [ejercicio()], false)])).toBeUndefined()
  })

  it('un ejercicio que nunca se ha hecho no inventa una base', () => {
    expect(ultimaVezDe('sentadilla_barra', [sesion('2026-08-05', [ejercicio()])])).toBeUndefined()
  })

  it('una sesión antigua sin registro serie a serie no sirve de referencia', () => {
    // Se sabe que se hizo, pero no con qué: enseñarlo sería inventar.
    const viejo = ejercicio({ logs: undefined, done: true, actualWeightKg: 20 })
    expect(ultimaVezDe('press_banca_mancuernas', [sesion('2026-08-05', [viejo])])).toBeUndefined()
  })
})

describe('la forma en que se hizo importa', () => {
  it('se prefiere la vez que se hizo igual, aunque sea más antigua', () => {
    const aDosManos = ejercicio({ variant: { side: 'bilateral' }, logs: [serie(22, 10)] })
    const aUnaMano = ejercicio({ variant: { side: 'unilateral' }, logs: [serie(12, 10)] })
    const u = ultimaVezDe(
      'press_banca_mancuernas',
      [sesion('2026-08-08', [aUnaMano]), sesion('2026-08-01', [aDosManos])],
      { side: 'bilateral' }
    )
    expect(u?.date).toBe('2026-08-01')
    expect(u?.otraForma).toBeUndefined()
  })

  it('si nunca se hizo así, se da la que hay pero avisando', () => {
    const aUnaMano = ejercicio({ variant: { side: 'unilateral' }, logs: [serie(12, 10)] })
    const u = ultimaVezDe('press_banca_mancuernas', [sesion('2026-08-08', [aUnaMano])], {
      side: 'bilateral'
    })
    expect(u?.otraForma).toBe(true)
  })
})

describe('el RIR real de aquella vez', () => {
  it('sale la media de lo anotado', () => {
    expect(rirMedioDe([serie(22, 10, { rir: 2 }), serie(22, 9, { rir: 1 })])).toBe(1.5)
  })

  it('sin nada anotado no se inventa un cero', () => {
    expect(rirMedioDe([serie(22, 10), serie(22, 9)])).toBeUndefined()
  })

  it('viaja con la referencia', () => {
    const u = ultimaVezDe('press_banca_mancuernas', [
      sesion('2026-08-05', [ejercicio({ logs: [serie(22, 10, { rir: 2 }), serie(22, 8, { rir: 0 })] })])
    ])
    expect(u?.rirMedio).toBe(1)
  })
})

describe('cómo se lee', () => {
  it('dice cuándo fue y qué se hizo, serie a serie', () => {
    const u = ultimaVezDe('press_banca_mancuernas', [sesion('2026-08-05', [ejercicio()])])!
    const texto = describirUltimaVez(u, HOY)
    expect(texto).toContain('hace 5 días')
    expect(texto).toContain('22×10, 22×9, 22×8')
  })

  it('enumera las series en vez de promediarlas', () => {
    // La forma de la serie es el dato: 10, 9, 8 dice que la última costó, y
    // tres dieces dicen que sobra peso. Una media borra justo eso.
    const cae = ultimaVezDe('press_banca_mancuernas', [sesion('2026-08-09', [ejercicio()])])!
    const plana = ultimaVezDe('press_banca_mancuernas', [
      sesion('2026-08-09', [ejercicio({ logs: [serie(22, 10), serie(22, 10), serie(22, 10)] })])
    ])!
    expect(describirUltimaVez(cae, HOY)).not.toEqual(describirUltimaVez(plana, HOY))
  })

  it('ayer y hoy se dicen con palabras', () => {
    expect(cuandoFue('2026-08-09', HOY)).toBe('ayer')
    expect(cuandoFue('2026-08-10', HOY)).toBe('hoy')
  })

  it('avisa cuando la referencia es de otra forma de hacerlo', () => {
    const u = ultimaVezDe(
      'press_banca_mancuernas',
      [sesion('2026-08-05', [ejercicio({ variant: { side: 'unilateral' } })])],
      { side: 'bilateral' }
    )!
    expect(describirUltimaVez(u, HOY)).toContain('otra forma')
  })
})

describe('las series nuevas arrancan desde ahí', () => {
  const previa = ultimaVezDe('press_banca_mancuernas', [sesion('2026-08-05', [ejercicio()])])

  it('cada serie se precarga con las repeticiones de esa misma serie', () => {
    const logs = initLogs({ sets: 3, reps: '8-12', weightKg: 24 }, previa)
    expect(logs.map((l) => l.reps)).toEqual([10, 9, 8])
  })

  it('el peso lo pone el plan, no la última vez', () => {
    // La progresión ya ha mirado el historial para decidir 24. Precargar aquí
    // los 22 de la vez pasada pelearía con esa decisión.
    const logs = initLogs({ sets: 3, reps: '8-12', weightKg: 24 }, previa)
    expect(logs.every((l) => l.weightKg === 24)).toBe(true)
  })

  it('si hoy toca una serie más, la de sobra queda en blanco', () => {
    const logs = initLogs({ sets: 4, reps: '8-12', weightKg: 24 }, previa)
    expect(logs[3].reps).toBeUndefined()
  })

  it('sin referencia, nada precargado', () => {
    const logs = initLogs({ sets: 3, reps: '8-12', weightKg: 20 })
    expect(logs.every((l) => l.reps === undefined)).toBe(true)
  })

  it('ninguna serie nace marcada como hecha', () => {
    const logs = initLogs({ sets: 3, reps: '8-12', weightKg: 24 }, previa)
    expect(logs.every((l) => l.done === false)).toBe(true)
  })
})
