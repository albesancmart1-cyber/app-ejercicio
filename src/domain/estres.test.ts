import { describe, expect, it } from 'vitest'
import {
  DIAS_MINIMOS,
  explicarRacha,
  rachaAmable,
  cargaDeSesion,
  cargaDiaria,
  estadoDeEstres,
  ewma,
  explicarEstres,
  nivelDe
} from './estres'
import type { PlannedExercise, Session, SetLog } from './types'

const serie = (rir: number | undefined, extra: Partial<SetLog> = {}): SetLog => ({
  weightKg: 20,
  reps: 10,
  rir,
  done: true,
  ...extra
})

const pesas = (logs: SetLog[], planRir = 2): PlannedExercise => ({
  exerciseId: 'press_banca_mancuernas',
  name: 'Press',
  primary: 'pecho',
  plan: { sets: logs.length, reps: '8-12', rir: planRir },
  logs,
  done: true
})

const sesion = (date: string, exercises: PlannedExercise[]): Session => ({
  id: `s-${date}`,
  date,
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  exercises
})

const cardio = (date: string, exerciseId: string, minutos: number): Session => ({
  id: `c-${date}`,
  date,
  kind: 'cardio_suave',
  title: 'Cardio',
  completed: true,
  exercises: [
    {
      exerciseId,
      name: exerciseId,
      primary: 'cardio',
      plan: { sets: 1, reps: `${minutos} min` }
    }
  ]
})

describe('lo que cuesta una sesión', () => {
  it('cuanto más cerca del fallo, más cuesta', () => {
    const suave = cargaDeSesion(sesion('2026-08-10', [pesas([serie(4), serie(4)])])).total
    const duro = cargaDeSesion(sesion('2026-08-10', [pesas([serie(0), serie(0)])])).total
    expect(duro).toBeGreaterThan(suave)
  })

  it('y cuantas más series, también', () => {
    const pocas = cargaDeSesion(sesion('2026-08-10', [pesas([serie(2), serie(2)])])).total
    const muchas = cargaDeSesion(
      sesion('2026-08-10', [pesas([serie(2), serie(2), serie(2), serie(2)])])
    ).total
    expect(muchas).toBeGreaterThan(pocas)
  })

  it('el calentamiento no cuesta nada', () => {
    const con = cargaDeSesion(
      sesion('2026-08-10', [pesas([serie(2, { tipo: 'calentamiento' }), serie(2)])])
    ).total
    const sin = cargaDeSesion(sesion('2026-08-10', [pesas([serie(2)])])).total
    expect(con).toBe(sin)
  })

  it('un drop set cuesta la mitad que una serie entera', () => {
    const normal = cargaDeSesion(sesion('2026-08-10', [pesas([serie(0)])])).total
    const drop = cargaDeSesion(sesion('2026-08-10', [pesas([serie(0, { tipo: 'drop' })])])).total
    expect(drop).toBe(normal / 2)
  })

  it('una serie al fallo cuesta lo máximo aunque no se anote el RIR', () => {
    const c = cargaDeSesion(sesion('2026-08-10', [pesas([serie(undefined, { tipo: 'fallo' })])]))
    expect(c.pesas).toBe(10)
  })

  it('sin RIR anotado se estima por el plan, en vez de dar cero', () => {
    const c = cargaDeSesion(sesion('2026-08-10', [pesas([serie(undefined), serie(undefined)], 3)]))
    expect(c.pesas).toBe(14)
  })

  it('el cardio también cuesta, y más cuanto más intenso', () => {
    const andar = cargaDeSesion(cardio('2026-08-10', 'caminar', 30)).cardio
    const trote = cargaDeSesion(cardio('2026-08-10', 'trote_suave', 30)).cardio
    expect(andar).toBeGreaterThan(0)
    expect(trote).toBeGreaterThan(andar)
  })

  it('las pesas y el cardio se suman en la misma escala', () => {
    const s: Session = {
      ...sesion('2026-08-10', [pesas([serie(1), serie(1)])]),
      exercises: [
        ...sesion('2026-08-10', [pesas([serie(1), serie(1)])]).exercises,
        ...cardio('2026-08-10', 'trote_suave', 20).exercises
      ]
    }
    const c = cargaDeSesion(s)
    expect(c.total).toBe(Math.round((c.pesas + c.cardio) * 10) / 10)
    expect(c.pesas).toBeGreaterThan(0)
    expect(c.cardio).toBeGreaterThan(0)
  })

  it('una sesión que no se registró serie a serie sigue costando algo', () => {
    const viejo: PlannedExercise = {
      exerciseId: 'flexiones',
      name: 'Flexiones',
      primary: 'pecho',
      plan: { sets: 3, reps: '8-12', rir: 2 },
      done: true
    }
    expect(cargaDeSesion(sesion('2026-08-10', [viejo])).pesas).toBe(24)
  })
})

describe('la carga día a día', () => {
  const HOY = '2026-08-10'

  it('los días sin entrenar valen cero, no se saltan', () => {
    // Sin los ceros, la fatiga no bajaría nunca al descansar.
    const d = cargaDiaria([sesion('2026-08-10', [pesas([serie(2)])])], HOY, 5)
    expect(d).toHaveLength(5)
    expect(d.slice(0, 4).every((x) => x.total === 0)).toBe(true)
    expect(d[4].total).toBeGreaterThan(0)
  })

  it('dos sesiones el mismo día se suman', () => {
    const d = cargaDiaria(
      [sesion(HOY, [pesas([serie(2)])]), sesion(HOY, [pesas([serie(2)])])],
      HOY,
      3
    )
    expect(d[2].total).toBe(16)
  })

  it('lo que no está terminado no cuenta', () => {
    const aMedias = { ...sesion(HOY, [pesas([serie(2)])]), completed: false }
    expect(cargaDiaria([aMedias], HOY, 3)[2].total).toBe(0)
  })

  it('termina siempre en hoy', () => {
    expect(cargaDiaria([], HOY, 7)[6].fecha).toBe(HOY)
  })
})

describe('las dos medias móviles', () => {
  it('la rápida reacciona antes que la lenta', () => {
    const carga = [0, 0, 0, 0, 0, 0, 0, 100]
    const rapida = ewma(carga, 7)
    const lenta = ewma(carga, 28)
    expect(rapida[7]).toBeGreaterThan(lenta[7])
  })

  it('con carga constante las dos convergen a esa carga', () => {
    const carga = Array.from({ length: 200 }, () => 50)
    expect(ewma(carga, 7)[199]).toBeCloseTo(50, 0)
    expect(ewma(carga, 28)[199]).toBeCloseTo(50, 0)
  })

  it('al parar, la fatiga baja', () => {
    const carga = [...Array.from({ length: 20 }, () => 50), ...Array.from({ length: 10 }, () => 0)]
    const f = ewma(carga, 7)
    expect(f[29]).toBeLessThan(f[19])
  })
})

describe('el nivel de estrés', () => {
  it('describe dónde estás respecto a tu base', () => {
    expect(nivelDe(0.5)).toBe('bajo')
    expect(nivelDe(1.0)).toBe('sostenible')
    expect(nivelDe(1.35)).toBe('subiendo')
    expect(nivelDe(1.8)).toBe('pasado')
  })

  it('una semana normal después de meses iguales sale sostenible', () => {
    const sesiones: Session[] = []
    for (let i = 60; i >= 0; i -= 2) {
      const f = new Date(Date.parse('2026-08-10T00:00:00Z') - i * 86400000)
      sesiones.push(sesion(f.toISOString().slice(0, 10), [pesas([serie(2), serie(2), serie(2)])]))
    }
    const e = estadoDeEstres(sesiones, '2026-08-10')
    expect(e.fiable).toBe(true)
    expect(e.nivel).toBe('sostenible')
  })

  it('doblar de golpe el trabajo se nota', () => {
    const sesiones: Session[] = []
    for (let i = 60; i >= 8; i -= 2) {
      const f = new Date(Date.parse('2026-08-10T00:00:00Z') - i * 86400000)
      sesiones.push(sesion(f.toISOString().slice(0, 10), [pesas([serie(3), serie(3)])]))
    }
    // Última semana entrenando todos los días y al fallo.
    for (let i = 6; i >= 0; i--) {
      const f = new Date(Date.parse('2026-08-10T00:00:00Z') - i * 86400000)
      sesiones.push(
        sesion(f.toISOString().slice(0, 10), [
          pesas([serie(0), serie(0), serie(0), serie(0), serie(0), serie(0)])
        ])
      )
    }
    const e = estadoDeEstres(sesiones, '2026-08-10')
    expect(e.ratio).toBeGreaterThan(1.3)
    expect(['subiendo', 'pasado']).toContain(e.nivel)
  })

  it('sin historial no se inventa un diagnóstico', () => {
    const e = estadoDeEstres([], '2026-08-10')
    expect(e.fiable).toBe(false)
    expect(explicarEstres(e)).toMatch(/no hay suficientes|base/i)
  })

  it('con muy pocos días tampoco', () => {
    const e = estadoDeEstres([sesion('2026-08-10', [pesas([serie(1)])])], '2026-08-10')
    expect(e.fiable).toBe(false)
  })

  it('hacen falta al menos diez días con carga para fiarse', () => {
    const sesiones = Array.from({ length: DIAS_MINIMOS }, (_, i) => {
      const f = new Date(Date.parse('2026-08-10T00:00:00Z') - i * 2 * 86400000)
      return sesion(f.toISOString().slice(0, 10), [pesas([serie(2), serie(2)])])
    })
    expect(estadoDeEstres(sesiones, '2026-08-10').fiable).toBe(true)
  })

  it('la explicación nunca habla de riesgo de lesión', () => {
    // El cociente agudo:crónico no da para eso, y decirlo sería vender una
    // precisión que no existe.
    for (const ratio of [0.4, 1, 1.4, 2]) {
      const e = { ...estadoDeEstres([], '2026-08-10'), fiable: true, ratio, nivel: nivelDe(ratio) }
      expect(explicarEstres(e)).not.toMatch(/lesi[oó]n/i)
    }
  })

  it('la serie que se dibuja llega hasta hoy', () => {
    const e = estadoDeEstres([], '2026-08-10')
    expect(e.serie[e.serie.length - 1].fecha).toBe('2026-08-10')
  })
})


describe('la racha que no castiga descansar', () => {
  const HOY = '2026-08-10'
  const dia = (n: number) => new Date(Date.parse(`${HOY}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10)

  it('entrenar días alternos mantiene la racha entera', () => {
    // Este es el caso de todo el mundo: entrenas lunes, miércoles y viernes.
    // Una racha normal se rompería el martes; esta no.
    const s = [0, 2, 4, 6, 8, 10].map((n) => sesion(dia(n), [pesas([serie(2)])]))
    expect(rachaAmable(s, HOY).dias).toBe(11)
  })

  it('el día de descanso después de entrenar cuenta', () => {
    const s = [sesion(dia(1), [pesas([serie(2)])])]
    const r = rachaAmable(s, HOY)
    expect(r.hoyCumple).toBe(true)
    expect(r.hoyEsDescanso).toBe(true)
  })

  it('pero dejarlo del todo sí la rompe', () => {
    const s = [sesion(dia(5), [pesas([serie(2)])])]
    expect(rachaAmable(s, HOY).dias).toBe(0)
  })

  it('entrenar hoy no se marca como descanso', () => {
    const r = rachaAmable([sesion(HOY, [pesas([serie(2)])])], HOY)
    expect(r.hoyEsDescanso).toBe(false)
  })

  it('sin nada registrado no hay racha, y se dice sin reproche', () => {
    const r = rachaAmable([], HOY)
    expect(r.dias).toBe(0)
    expect(explicarRacha(r)).toMatch(/buen día para volver/i)
  })

  it('la frase nunca regaña', () => {
    for (const s of [[], [sesion(dia(1), [pesas([serie(2)])])], [sesion(HOY, [pesas([serie(2)])])]]) {
      const texto = explicarRacha(rachaAmable(s, HOY))
      expect(texto).not.toMatch(/has perdido|fallaste|roto/i)
    }
  })

  it('un descanso ganado se cuenta como tal en la frase', () => {
    const texto = explicarRacha(rachaAmable([sesion(dia(1), [pesas([serie(2)])])], HOY))
    expect(texto).toMatch(/también cuenta/i)
  })
})
