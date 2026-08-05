import { describe, expect, it } from 'vitest'
import { computeReadiness } from './readiness'
import { CARDIO_MINIMO_MIXTO } from './protocol'
import { RIR_EFECTIVO } from './volume'
import {
  canIntensify,
  canMix,
  recommend,
  reentryState,
  withMoreIntensity,
  withSomeStrength
} from './recommender'
import { buildSession } from './workoutBuilder'
import { contributionsOf } from '../data/contributions'
import { computeBalance, neglectedGroups, recentlyWorked, weeklySets } from './muscleBalance'
import {
  RIR_VUELTA,
  ketoAdaptationWeeksLeft,
  proteinTarget,
  reentrySteps,
  repPrescription,
  targetRir
} from './protocol'
import { MUSCLE_GROUPS, type CheckIn, type MuscleGroup, type Profile, type Session, type SessionKind } from './types'

const TODAY = '2026-07-25'

const profile: Profile = {
  name: 'Test',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'bici', 'correr'],
  maxWeights: { mancuernas: 24 }
}

function checkIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    date: TODAY,
    sleep: 4,
    lightHygiene: true,
    sunrise: true,
    sunsetYesterday: true,
    sunExposure: true,
    keto: true,
    energy: 4,
    discomfort: 'ninguna',
    ...overrides
  }
}

const goodDay = () => computeReadiness(checkIn())
const badDay = () =>
  computeReadiness(
    checkIn({
      sleep: 1,
      energy: 1,
      lightHygiene: false,
      sunrise: false,
      keto: false,
      sunExposure: false,
      sunsetYesterday: false
    })
  )

function session(
  date: string,
  exerciseIds: string[],
  opts: { kind?: SessionKind; cardioMinutes?: number; sets?: number; rpe?: 1 | 2 | 3 | 4 | 5 } = {}
): Session {
  return {
    id: `t-${date}-${exerciseIds.join('-')}`,
    date,
    kind: opts.kind ?? 'fuerza',
    title: 'test',
    exercises: exerciseIds.map((id) => ({
      exerciseId: id,
      name: id,
      primary: 'pecho' as MuscleGroup,
      plan: { sets: opts.sets ?? 3, reps: '8-12' },
      done: true
    })),
    cardioMinutes: opts.cardioMinutes,
    rpe: opts.rpe,
    completed: true
  }
}

/** Historial establecido y variado, para salir de la rampa de principiante. */
function establishedHistory(): Session[] {
  return [
    session('2026-07-14', ['flexiones', 'remo_mancuerna']),
    session('2026-07-17', ['sentadilla_goblet', 'press_militar_mancuernas']),
    session('2026-07-19', ['flexiones_inclinadas', 'curl_biceps']),
    session('2026-07-21', ['remo_banda', 'elevaciones_laterales'])
  ]
}

describe('readiness', () => {
  it('buen sueño y buenos hábitos → disposición alta', () => {
    expect(goodDay().level).toBe('alto')
  })

  it('mala noche y cansancio → disposición baja', () => {
    expect(badDay().level).toBe('bajo')
  })

  it('molestia localizada excluye ese grupo sin hundir la puntuación', () => {
    const r = computeReadiness(checkIn({ discomfort: 'espalda' }))
    expect(r.avoid).toContain('espalda')
    expect(r.level).toBe('alto')
  })

  it('recoge si hoy se respeta la cetosis', () => {
    expect(computeReadiness(checkIn({ keto: false })).keto).toBe(false)
  })
})

describe('vuelta progresiva tras un parón (regla 50/30/20/10)', () => {
  it('la rampa es más larga cuanto más largo fue el parón', () => {
    expect(reentrySteps(5)).toBe(0)
    expect(reentrySteps(15)).toBe(2)
    expect(reentrySteps(45)).toBe(3)
    expect(reentrySteps(120)).toBe(4)
  })

  it('dos semanas sin entrenar → reacondicionamiento al 50 % de volumen', () => {
    const rec = recommend(profile, goodDay(), [session('2026-07-10', ['flexiones'])], TODAY)
    expect(rec.kind).toBe('reacondicionamiento')
    expect(rec.volumeScale).toBe(0.5)
    expect(rec.intensity).toBe('suave')
    expect(rec.reentry).toEqual({ step: 1, total: 2 })
  })

  it('parón de meses → arranca por cardio suave y rampa de 4 pasos', () => {
    const rec = recommend(profile, goodDay(), [session('2026-01-10', ['flexiones'])], TODAY)
    expect(rec.kind).toBe('reacondicionamiento')
    expect(rec.cardioMinutes).toBeGreaterThan(0)
    expect(rec.reentry?.total).toBe(4)
  })

  /** Parón largo y vuelta entrenando tres días por semana desde el 20 de julio. */
  function volviendo(hasta: string): Session[] {
    const dias = ['2026-07-20', '2026-07-22', '2026-07-24', '2026-07-27', '2026-07-29', '2026-07-31',
      '2026-08-03', '2026-08-05']
    return [
      session('2026-06-01', ['flexiones']),
      ...dias.filter((d) => d <= hasta).map((d) => session(d, ['flexiones']))
    ]
  }

  it('la rampa sube de volumen semana a semana', () => {
    // Tres sesiones en la primera semana no adelantan la rampa: sigue en el paso 1.
    expect(reentryState(volviendo('2026-07-20'), '2026-07-20')?.scale).toBe(0.5)
    expect(reentryState(volviendo('2026-07-24'), '2026-07-24')?.scale).toBe(0.5)
    // A los siete días de la vuelta, segundo paso; a los catorce, tercero.
    expect(reentryState(volviendo('2026-07-27'), '2026-07-27')?.scale).toBe(0.7)
    expect(reentryState(volviendo('2026-08-03'), '2026-08-03')?.scale).toBe(0.8)
  })

  it('entrenar más veces no acelera la vuelta', () => {
    // Es la razón de contar por semanas: lo que se readapta despacio tras un
    // parón es el tejido, y eso no depende de cuántos días vayas al gimnasio.
    const pocas = [session('2026-06-01', ['flexiones']), session('2026-07-20', ['flexiones'])]
    expect(reentryState(volviendo('2026-07-24'), '2026-07-24')?.step).toBe(
      reentryState(pocas, '2026-07-24')?.step
    )
  })

  it('la intensidad se acerca a la normal según avanza la rampa', () => {
    // Con RIR 4 en toda la vuelta nada contaba como volumen efectivo: la vista
    // por músculo enseñaba ceros después de semanas entrenando.
    expect(targetRir({ reentryStep: 1, intensity: 'suave' })).toBe(4)
    expect(targetRir({ reentryStep: 4, intensity: 'suave' })).toBeLessThan(4)
    expect(RIR_VUELTA[RIR_VUELTA.length - 1]).toBeLessThanOrEqual(RIR_EFECTIVO)
  })

  it('un historial establecido ya no está en rampa', () => {
    expect(reentryState(establishedHistory(), TODAY)).toBeNull()
  })

  it('quien empieza de cero también entra en rodaje', () => {
    const rec = recommend(profile, goodDay(), [], TODAY)
    expect(rec.kind).toBe('reacondicionamiento')
    expect(rec.reentry).toEqual({ step: 1, total: 3 })
  })

  it('durante la rampa nunca se llega cerca del fallo', () => {
    const rec = recommend(profile, goodDay(), [session('2026-07-08', ['flexiones'])], TODAY)
    expect(rec.rir).toBeGreaterThanOrEqual(4)
  })
})

describe('protección de la recuperación', () => {
  it('mala noche → descanso activo, nunca fuerza', () => {
    const rec = recommend(profile, badDay(), establishedHistory(), TODAY)
    expect(rec.kind).toBe('descanso_activo')
  })

  it('tres días seguidos entrenando → día de respiro', () => {
    const history = [
      ...establishedHistory(),
      session('2026-07-22', ['flexiones']),
      session('2026-07-23', ['sentadilla_goblet']),
      session('2026-07-24', ['remo_mancuerna'])
    ]
    const medio = computeReadiness(checkIn({ sleep: 3, energy: 3 }))
    const rec = recommend(profile, medio, history, TODAY)
    expect(rec.kind).toBe('descanso_activo')
    expect(rec.title).toBe('Día de respiro')
  })

  it('no repite un grupo entrenado hace menos de 48 h', () => {
    const history = [...establishedHistory(), session('2026-07-24', ['sentadilla_goblet'])]
    expect(recentlyWorked(history, TODAY, 2)).toContain('cuadriceps_gluteo')
    const rec = recommend(profile, goodDay(), history, TODAY)
    expect(rec.focus).not.toContain('cuadriceps_gluteo')
  })

  it('molestia en una zona la deja fuera de la sesión', () => {
    const rec = recommend(profile, computeReadiness(checkIn({ discomforts: ['espalda'] })), establishedHistory(), TODAY)
    expect(rec.focus).not.toContain('espalda')
  })

  it('varias zonas marcadas quedan todas fuera', () => {
    const zonas: MuscleGroup[] = ['espalda', 'pecho', 'hombro']
    const r = computeReadiness(checkIn({ discomforts: zonas }))
    expect(r.avoid).toEqual(zonas)
    const rec = recommend(profile, r, establishedHistory(), TODAY)
    for (const g of zonas) expect(rec.focus, g).not.toContain(g)
  })

  it('y cuantas más zonas, menos exigente es el día', () => {
    const una = computeReadiness(checkIn({ discomforts: ['espalda'] })).score
    const tres = computeReadiness(checkIn({ discomforts: ['espalda', 'pecho', 'hombro'] })).score
    expect(tres).toBeLessThan(una)
  })

  it('con casi todo el cuerpo cargado, lo dice en vez de fingir que está todo cubierto', () => {
    const todas = MUSCLE_GROUPS.filter((g) => g !== 'cardio')
    const rec = recommend(profile, computeReadiness(checkIn({ discomforts: todas })), establishedHistory(), TODAY)
    expect(rec.kind).not.toBe('fuerza')
    expect(rec.reasons.join(' ')).toMatch(/zonas con molestias/i)
    expect(rec.reasons.join(' ')).not.toMatch(/cubierto bien todos/i)
  })

  it('un check-in guardado antes, con una sola zona, se sigue leyendo igual', () => {
    const viejo = computeReadiness(checkIn({ discomfort: 'espalda' }))
    expect(viejo.avoid).toEqual(['espalda'])
    const leves = computeReadiness(checkIn({ discomfort: 'leves' }))
    expect(leves.avoid).toEqual([])
    expect(leves.score).toBeLessThan(computeReadiness(checkIn({})).score)
  })

  it('las leves repartidas se pueden marcar junto con zonas concretas', () => {
    const soloZona = computeReadiness(checkIn({ discomforts: ['espalda'] }))
    const conLeves = computeReadiness(checkIn({ discomforts: ['espalda'], mildSoreness: true }))
    expect(conLeves.score).toBeLessThan(soloZona.score)
    expect(conLeves.avoid).toEqual(['espalda'])
  })
})

describe('subir el listón a petición del usuario', () => {
  /** Semana con tres días seguidos: la app propone descanso activo. */
  function historialDeRespiro(): Session[] {
    return [
      ...establishedHistory(),
      session('2026-07-22', ['flexiones']),
      session('2026-07-23', ['sentadilla_goblet']),
      session('2026-07-24', ['remo_mancuerna'])
    ]
  }

  it('cambia una caminata por pesas cuando el usuario lo pide', () => {
    const readiness = computeReadiness(checkIn({ sleep: 3, energy: 3 }))
    const base = recommend(profile, readiness, historialDeRespiro(), TODAY)
    expect(base.kind).toBe('descanso_activo')

    const subida = withMoreIntensity(base, profile, readiness, historialDeRespiro(), TODAY)
    expect(subida.kind).toBe('fuerza')
    expect(subida.userOverride).toBe(true)
    const s = buildSession(subida, profile, historialDeRespiro(), TODAY)
    expect(s.exercises.some((e) => e.primary !== 'cardio')).toBe(true)
  })

  it('con disposición baja mueve peso pero no pasa de suave', () => {
    const base = recommend(profile, badDay(), establishedHistory(), TODAY)
    const subida = withMoreIntensity(base, profile, badDay(), establishedHistory(), TODAY)
    expect(subida.kind).toBe('fuerza')
    expect(subida.intensity).toBe('suave')
    expect(subida.rir).toBeGreaterThanOrEqual(4)
  })

  it('nunca se acerca al fallo, por mucho que se suba', () => {
    for (const r of [goodDay(), badDay(), computeReadiness(checkIn({ sleep: 3, energy: 3 }))]) {
      const base = recommend(profile, r, establishedHistory(), TODAY)
      const subida = withMoreIntensity(base, profile, r, establishedHistory(), TODAY)
      expect(subida.rir).toBeGreaterThanOrEqual(2)
    }
  })

  it('sigue respetando las molestias al subir el listón', () => {
    const readiness = computeReadiness(checkIn({ discomfort: 'espalda' }))
    const base = recommend(profile, readiness, establishedHistory(), TODAY)
    const subida = withMoreIntensity(base, profile, readiness, establishedHistory(), TODAY)
    expect(subida.focus).not.toContain('espalda')
    const s = buildSession(subida, profile, establishedHistory(), TODAY)
    expect(s.exercises.every((e) => e.primary !== 'espalda')).toBe(true)
  })

  it('sigue respetando las 48 h de recuperación', () => {
    const history = [...establishedHistory(), session('2026-07-24', ['sentadilla_goblet'])]
    const base = recommend(profile, goodDay(), history, TODAY)
    const subida = withMoreIntensity(base, profile, goodDay(), history, TODAY)
    expect(subida.focus).not.toContain('cuadriceps_gluteo')
  })

  it('durante la vuelta de un parón mantiene el volumen reducido', () => {
    const history = [session('2026-07-05', ['flexiones'])]
    const base = recommend(profile, goodDay(), history, TODAY)
    const subida = withMoreIntensity(base, profile, goodDay(), history, TODAY)
    expect(subida.volumeScale).toBeLessThan(1)
    expect(subida.intensity).not.toBe('media-alta')
  })

  it('explica que la subida es decisión del usuario y qué tocaba en realidad', () => {
    const readiness = computeReadiness(checkIn({ sleep: 3, energy: 3 }))
    const base = recommend(profile, readiness, historialDeRespiro(), TODAY)
    const subida = withMoreIntensity(base, profile, readiness, historialDeRespiro(), TODAY)
    expect(subida.reasons.join(' ')).toContain('Has pedido tú')
    expect(subida.reasons.join(' ').toLowerCase()).toContain(base.title.toLowerCase())
  })

  it('no se ofrece subir cuando ya se está en lo más alto', () => {
    expect(canIntensify({ ...baseRec(), kind: 'fuerza', intensity: 'media-alta' })).toBe(false)
    expect(canIntensify({ ...baseRec(), kind: 'descanso_activo', intensity: 'suave' })).toBe(true)
  })
})

describe('equilibrio y alternancia', () => {
  it('torso trabajado y pierna olvidada → prioridad pierna', () => {
    const history = [
      session('2026-07-14', ['flexiones', 'remo_mancuerna']),
      session('2026-07-19', ['press_banca_mancuernas', 'remo_banda']),
      session('2026-07-21', ['press_militar_mancuernas', 'curl_biceps']),
      session('2026-07-24', [], { kind: 'cardio_suave', cardioMinutes: 20 })
    ]
    const rec = recommend(profile, goodDay(), history, TODAY)
    expect(rec.kind).toBe('fuerza')
    expect(['cuadriceps_gluteo', 'femoral']).toContain(rec.focus[0])
  })

  it('dos sesiones de fuerza seguidas → toca cardio', () => {
    const history = [...establishedHistory(), session('2026-07-22', ['flexiones']), session('2026-07-24', ['remo_banda'])]
    const rec = recommend(profile, goodDay(), history, TODAY)
    expect(['cardio_suave', 'cardio_medio']).toContain(rec.kind)
  })

  it('sin material de cardio no fuerza a salir a correr', () => {
    const gymOnly: Profile = { ...profile, equipment: ['peso_corporal', 'mancuernas', 'banco'] }
    const history = [...establishedHistory(), session('2026-07-22', ['flexiones']), session('2026-07-24', ['remo_banda'])]
    const rec = recommend(gymOnly, goodDay(), history, TODAY)
    expect(rec.kind).toBe('fuerza')
  })

  it('el balance no cuenta los ejercicios que no marcaste como hechos', () => {
    const partial = session('2026-07-24', ['flexiones', 'sentadilla_goblet'])
    partial.exercises[1].done = undefined
    const balance = computeBalance([partial], TODAY)
    expect(balance.pecho).toBeGreaterThan(0)
    expect(balance.cuadriceps_gluteo).toBe(0)
  })

  it('el cardio no se contabiliza por duplicado', () => {
    const cardio = session('2026-07-24', ['bici_suave'], { kind: 'cardio_suave', cardioMinutes: 30 })
    const balance = computeBalance([cardio], TODAY)
    // 30 min ≈ 3 series efectivas para el corazón, no 3 + la del ejercicio.
    expect(balance.cardio).toBeLessThanOrEqual(3)
    expect(balance.cardio).toBeGreaterThan(0)
  })

  it('cuenta series semanales por grupo muscular', () => {
    const week = weeklySets([session('2026-07-23', ['flexiones'], { sets: 3 })], TODAY)
    expect(week.pecho).toBe(3)
  })

  it('detecta el grupo menos trabajado', () => {
    const balance = computeBalance([session('2026-07-23', ['flexiones', 'flexiones_inclinadas'])], TODAY)
    expect(neglectedGroups(balance)[0]).not.toBe('pecho')
    expect(balance.pecho).toBeGreaterThan(0)
  })
})

describe('cetosis', () => {
  it('durante la adaptación quedan semanas por delante', () => {
    expect(ketoAdaptationWeeksLeft('2026-07-18', TODAY)).toBeGreaterThan(0)
    expect(ketoAdaptationWeeksLeft('2026-01-01', TODAY)).toBe(0)
    expect(ketoAdaptationWeeksLeft(undefined, TODAY)).toBe(0)
  })

  it('en adaptación cetogénica no se sube a intensidad media-alta', () => {
    const ketoNuevo: Profile = { ...profile, ketoSince: '2026-07-15' }
    const rec = recommend(ketoNuevo, goodDay(), establishedHistory(), TODAY)
    expect(rec.ketoAdapting).toBe(true)
    expect(rec.intensity).not.toBe('media-alta')
  })

  it('en cetosis se evitan las series de muchísimas repeticiones', () => {
    const conKeto = repPrescription('tonificar', 'media-alta', true, true)
    const sinKeto = repPrescription('tonificar', 'media-alta', false, true)
    expect(conKeto.reps).toBe('10-12')
    expect(sinKeto.reps).toBe('12-15')
    // Y se descansa más, que es lo que sostiene la calidad sin glucógeno.
    expect(conKeto.restSeconds).toBeGreaterThan(sinKeto.restSeconds)
  })

  it('los básicos descansan más que los accesorios', () => {
    const basico = repPrescription('masa', 'media-alta', false, true)
    const accesorio = repPrescription('masa', 'media-alta', false, false)
    expect(basico.restSeconds).toBeGreaterThan(accesorio.restSeconds)
  })

  it('calcula el objetivo de proteína diaria', () => {
    const t = proteinTarget(75, 'recomposicion')
    expect(t.min).toBe(150)
    expect(t.max).toBe(195)
  })
})

describe('construcción de la sesión', () => {
  it('solo propone ejercicios con el equipamiento disponible', () => {
    const rec = recommend(profile, goodDay(), establishedHistory(), TODAY)
    const s = buildSession(rec, profile, establishedHistory(), TODAY)
    expect(s.exercises.length).toBeGreaterThan(0)
    for (const pe of s.exercises) {
      expect(pe.exerciseId).not.toMatch(/_barra$|polea|maquina|prensa|kettlebell|dominadas/)
    }
  })

  it('el peso sugerido nunca supera el material disponible', () => {
    const rec = recommend({ ...profile, goal: 'masa' }, goodDay(), establishedHistory(), TODAY)
    const s = buildSession(rec, { ...profile, goal: 'masa' }, establishedHistory(), TODAY)
    for (const pe of s.exercises) {
      if (pe.plan.weightKg) expect(pe.plan.weightKg).toBeLessThanOrEqual(24)
    }
  })

  it('cada serie lleva repeticiones en reserva y descanso', () => {
    const rec = recommend(profile, goodDay(), establishedHistory(), TODAY)
    const s = buildSession(rec, profile, establishedHistory(), TODAY, true)
    const fuerza = s.exercises.filter((e) => e.primary !== 'cardio')
    expect(fuerza.length).toBeGreaterThan(0)
    for (const pe of fuerza) {
      expect(pe.plan.rir).toBeGreaterThanOrEqual(2)
      expect(pe.plan.restSeconds).toBeGreaterThan(0)
    }
  })

  // El remate de core se añadía después de la cascada de molestias y sin
  // consultarla, así que marcar agujetas de abdomen en el test diario daba una
  // sesión con abdomen igualmente. Es el camino entero: check-in → readiness →
  // recomendación → sesión, que es donde el usuario lo vio.
  describe('las molestias declaradas también valen para el remate de core', () => {
    const conAgujetasDe = (zonas: MuscleGroup[]) => {
      const r = computeReadiness(checkIn({ discomforts: zonas }))
      const rec = recommend(profile, r, establishedHistory(), TODAY)
      return buildSession(rec, profile, establishedHistory(), TODAY)
    }

    it('con agujetas en el core, la sesión no trae ni un ejercicio de core', () => {
      const s = conAgujetasDe(['core'])
      expect(s.exercises.length).toBeGreaterThan(0)
      expect(s.exercises.map((e) => e.primary)).not.toContain('core')
    })

    it('y tampoco por la puerta de atrás: nada que trabaje abdomen como motor', () => {
      const s = conAgujetasDe(['core'])
      for (const pe of s.exercises) {
        const aporte = contributionsOf(pe.exerciseId)
        expect((aporte.recto_abdominal ?? 0) < 1, pe.exerciseId).toBe(true)
        expect((aporte.oblicuos ?? 0) < 1, pe.exerciseId).toBe(true)
      }
    })

    it('sin molestias, el remate de core sigue estando', () => {
      const rec = recommend(profile, goodDay(), establishedHistory(), TODAY)
      const s = buildSession(rec, profile, establishedHistory(), TODAY)
      expect(s.exercises.map((e) => e.primary)).toContain('core')
    })

    it('y no se dobla: como mucho un ejercicio de core por sesión', () => {
      const rec = recommend(profile, goodDay(), establishedHistory(), TODAY)
      const s = buildSession(rec, profile, establishedHistory(), TODAY)
      expect(s.exercises.filter((e) => e.primary === 'core').length).toBeLessThanOrEqual(1)
    })
  })

  it('la vuelta progresiva reduce las series', () => {
    const history = [session('2026-07-05', ['flexiones'])]
    const rec = recommend(profile, goodDay(), history, TODAY)
    const s = buildSession(rec, profile, history, TODAY)
    for (const pe of s.exercises) expect(pe.plan.sets).toBeLessThanOrEqual(2)
  })

  /** Historial donde el press se hizo a 14 kg, y después otra sesión distinta. */
  /** `veces` sesiones de press con esa sensación, sin repeticiones anotadas. */
  function pressHistory(rpe: 1 | 5, veces = 1): Session[] {
    const fechas = ['2026-07-18', '2026-07-15', '2026-07-12'].slice(0, veces)
    return [
      ...fechas.map((fecha) => ({
        ...session(fecha, ['press_banca_mancuernas']),
        rpe,
        exercises: [
          {
            exerciseId: 'press_banca_mancuernas',
            name: 'Press banca',
            primary: 'pecho' as const,
            plan: { sets: 3, reps: '8-12' },
            done: true,
            actualWeightKg: 14
          }
        ]
      })),
      session('2026-07-21', ['sentadilla_goblet'])
    ]
  }

  it('si la última sesión costó mucho, no sube el peso', () => {
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, pressHistory(1), TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBe(14)
  })

  it('una sola sesión cómoda no basta para subir', () => {
    // Regla 2-por-2: una sesión fácil puede serlo por haber dormido bien.
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, pressHistory(5), TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBe(14)
  })

  it('dos sesiones cómodas seguidas sí progresan', () => {
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, pressHistory(5, 2), TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBeGreaterThan(14)
  })

  it('y la subida es proporcional, no un kilo a lo bruto', () => {
    // 14 kg de press de banca: 2,5 % son 0,35 kg, que redondea a medio kilo.
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, pressHistory(5, 2), TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBeLessThanOrEqual(14.5)
  })

  it('las repeticiones registradas mandan sobre la sensación', () => {
    // Sesión cómoda (RPE 5) pero sin llegar al mínimo del rango: se mantiene el
    // peso, porque el dato objetivo pesa más que la sensación.
    const history: Session[] = [
      {
        ...session('2026-07-18', ['press_banca_mancuernas']),
        rpe: 5,
        exercises: [
          {
            exerciseId: 'press_banca_mancuernas',
            name: 'Press banca',
            primary: 'pecho',
            plan: { sets: 2, reps: '8-12' },
            done: true,
            actualWeightKg: 14,
            logs: [
              { weightKg: 14, reps: 10, done: true },
              { weightKg: 14, reps: 6, done: true }
            ]
          }
        ]
      },
      session('2026-07-21', ['sentadilla_goblet'])
    ]
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, history, TODAY)
    expect(s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')?.plan.weightKg).toBe(14)
  })

  /** Sesiones de press completando el tope del rango, de más nueva a más vieja. */
  function alTope(fechas: string[], reps = 12): Session[] {
    // La sesión de sentadilla del final es la más reciente: sin ella, el press
    // sería «lo de la última vez» y el constructor lo dejaría para el final.
    return [...fechas.map((fecha) => ({
      ...session(fecha, ['press_banca_mancuernas']),
      rpe: 2 as const,
      exercises: [
        {
          exerciseId: 'press_banca_mancuernas',
          name: 'Press banca',
          primary: 'pecho' as const,
          plan: { sets: 2, reps: '8-12' },
          done: true,
          actualWeightKg: 14,
          logs: [
            { weightKg: 14, reps, done: true },
            { weightKg: 14, reps, done: true }
          ]
        }
      ]
    })), session('2026-07-21', ['sentadilla_goblet'])]
  }

  it('una sesión al tope del rango todavía no sube el peso', () => {
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, alTope(['2026-07-18']), TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBe(14)
  })

  it('dos seguidas al tope del rango suben el peso aunque costaran', () => {
    const history = alTope(['2026-07-18', '2026-07-15'])
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, history, TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBeGreaterThan(14)
  })

  it('a media tabla se ganan repeticiones, no kilos', () => {
    // Doble progresión: 10 de un rango 8-12 no es haberlo ganado.
    const history = alTope(['2026-07-18', '2026-07-15'], 10)
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, history, TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBe(14)
  })

  it('avisa de que falta una sesión para subir', () => {
    const s = buildSession({ ...baseRec(), focus: ['pecho'] }, profile, alTope(['2026-07-18']), TODAY)
    const press = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.progressNote).toMatch(/dos veces seguidas|próximo día/i)
  })

  it('las sesiones nuevas nacen con sus series listas para rellenar', () => {
    const rec = recommend(profile, goodDay(), establishedHistory(), TODAY)
    const s = buildSession(rec, profile, establishedHistory(), TODAY)
    for (const pe of s.exercises) {
      expect(pe.logs, pe.name).toHaveLength(pe.plan.sets)
      expect(pe.logs!.every((l) => !l.done)).toBe(true)
    }
  })

  it('varía los ejercicios respecto a la última sesión', () => {
    const history = [...establishedHistory(), session('2026-07-22', ['press_banca_mancuernas'])]
    const rec = { ...baseRec(), focus: ['pecho' as MuscleGroup] }
    const s = buildSession(rec, profile, history, TODAY)
    expect(s.exercises[0].exerciseId).not.toBe('press_banca_mancuernas')
  })

  it('explica siempre por qué recomienda lo que recomienda', () => {
    const rec = recommend(profile, goodDay(), establishedHistory(), TODAY)
    expect(rec.reasons.length).toBeGreaterThan(0)
  })

  it('la sesión de vuelta mantiene al menos 2 series por ejercicio', () => {
    const history = [session('2026-07-05', ['flexiones'])]
    const rec = recommend(profile, goodDay(), history, TODAY)
    const s = buildSession(rec, profile, history, TODAY)
    for (const pe of s.exercises) expect(pe.plan.sets).toBeGreaterThanOrEqual(2)
  })
})

describe('cobertura del catálogo', () => {
  // Sin esto, un grupo sin opción suave desaparece de las sesiones de vuelta,
  // que son justo las que más lo necesitan.
  const minimo: Profile = { ...profile, equipment: ['peso_corporal', 'bandas'], maxWeights: {} }

  for (const group of MUSCLE_GROUPS.filter((g) => g !== 'cardio')) {
    it(`${group} tiene ejercicio suave solo con peso corporal y bandas`, () => {
      const rec = { ...baseRec(), focus: [group], intensity: 'suave' as const, volumeScale: 0.5 }
      const s = buildSession(rec, minimo, [], TODAY)
      expect(s.exercises.some((e) => e.primary === group)).toBe(true)
    })
  }
})

function baseRec() {
  return {
    kind: 'fuerza' as const,
    title: 't',
    message: '',
    focus: [] as MuscleGroup[],
    intensity: 'media-alta' as const,
    volumeScale: 1,
    rir: 2,
    reasons: []
  }
}

describe('pesas sin quitar el cardio', () => {
  /** Un día que la app manda cardio: dos sesiones de fuerza seguidas y hace poco. */
  function historialQuePideCardio(): Session[] {
    return [
      session('2026-07-23', ['sentadilla_goblet']),
      session('2026-07-25', ['remo_mancuerna'])
    ]
  }

  it('solo se ofrece cuando lo que tocaba era cardio', () => {
    const cardio = recommend(profile, goodDay(), historialQuePideCardio(), TODAY)
    expect(cardio.kind).toMatch(/^cardio/)
    expect(canMix(cardio)).toBe(true)

    const fuerza = recommend(profile, goodDay(), establishedHistory(), TODAY)
    expect(canMix(fuerza)).toBe(false)
  })

  it('conserva cardio y añade fuerza, en ese orden', () => {
    const base = recommend(profile, goodDay(), historialQuePideCardio(), TODAY)
    const mixta = withSomeStrength(base, profile, goodDay(), historialQuePideCardio(), TODAY)

    expect(mixta.mixed).toBe(true)
    expect(mixta.userOverride).toBe(true)
    expect(mixta.cardioMinutes).toBeGreaterThan(0)

    const s = buildSession(mixta, profile, historialQuePideCardio(), TODAY)
    const cardios = s.exercises.filter((e) => e.primary === 'cardio')
    const pesas = s.exercises.filter((e) => e.primary !== 'cardio')
    expect(pesas.length).toBeGreaterThan(0)
    expect(cardios.length).toBe(1)
    // La fuerza va antes que el cardio: al revés se llega cansado a levantar.
    expect(s.exercises[s.exercises.length - 1].primary).toBe('cardio')
  })

  it('el cardio se recorta pero no desaparece', () => {
    const base = recommend(profile, goodDay(), historialQuePideCardio(), TODAY)
    const mixta = withSomeStrength(base, profile, goodDay(), historialQuePideCardio(), TODAY)
    expect(mixta.cardioMinutes!).toBeLessThan(base.cardioMinutes!)
    expect(mixta.cardioMinutes!).toBeGreaterThanOrEqual(CARDIO_MINIMO_MIXTO)
  })

  it('la sesión de fuerza es más corta que si se cambiara el cardio del todo', () => {
    const historia = historialQuePideCardio()
    const base = recommend(profile, goodDay(), historia, TODAY)
    const soloPesas = buildSession(
      withMoreIntensity(base, profile, goodDay(), historia, TODAY), profile, historia, TODAY)
    const mixta = buildSession(
      withSomeStrength(base, profile, goodDay(), historia, TODAY), profile, historia, TODAY)

    const cuenta = (s: Session) => s.exercises.filter((e) => e.primary !== 'cardio').length
    expect(cuenta(mixta)).toBeLessThan(cuenta(soloPesas))
  })

  it('no pasa de moderada aunque la disposición sea alta', () => {
    const historia = historialQuePideCardio()
    const base = recommend(profile, goodDay(), historia, TODAY)
    const mixta = withSomeStrength(base, profile, goodDay(), historia, TODAY)
    expect(mixta.intensity).not.toBe('media-alta')
  })

  it('mantiene los guardas: nunca se acerca al fallo', () => {
    const historia = historialQuePideCardio()
    for (const r of [goodDay(), badDay(), computeReadiness(checkIn({ sleep: 3, energy: 3 }))]) {
      const base = recommend(profile, r, historia, TODAY)
      if (!canMix(base)) continue
      const mixta = withSomeStrength(base, profile, r, historia, TODAY)
      expect(mixta.rir).toBeGreaterThanOrEqual(2)
    }
  })

  it('respeta las molestias igual que cualquier otra sesión', () => {
    const historia = historialQuePideCardio()
    const readiness = computeReadiness(checkIn({ discomfort: 'espalda' }))
    const base = recommend(profile, readiness, historia, TODAY)
    const mixta = withSomeStrength(base, profile, readiness, historia, TODAY)
    expect(mixta.focus).not.toContain('espalda')
    const s = buildSession(mixta, profile, historia, TODAY)
    expect(s.exercises.some((e) => e.primary === 'espalda')).toBe(false)
  })

  it('la vuelta tras un parón sigue mandando sobre el volumen', () => {
    const parado: Session[] = [session('2026-05-01', ['sentadilla_goblet'])]
    const base = recommend(profile, goodDay(), parado, TODAY)
    const mixta = withSomeStrength(base, profile, goodDay(), parado, TODAY)
    expect(mixta.volumeScale).toBeLessThanOrEqual(1)
    const s = buildSession(mixta, profile, parado, TODAY)
    for (const e of s.exercises.filter((x) => x.primary !== 'cardio')) {
      expect(e.plan.sets).toBeLessThanOrEqual(3)
    }
  })

  it('explica que fue decisión tuya y qué se ha recortado', () => {
    const historia = historialQuePideCardio()
    const base = recommend(profile, goodDay(), historia, TODAY)
    const mixta = withSomeStrength(base, profile, goodDay(), historia, TODAY)
    const texto = [mixta.message, ...mixta.reasons].join(' ').toLowerCase()
    expect(texto).toContain('has pedido')
    expect(texto).toMatch(/primero las pesas|fuerza primero|pesas y después/)
    expect(texto).not.toMatch(/calor[ií]a|d[eé]ficit|culpa|fracas/)
  })
})

describe('la opción mixta aparece siempre que haya cardio que repartir', () => {
  it('en un descanso activo también, porque repartir exige menos que cambiarlo entero', () => {
    // Disposición por los suelos: la cascada manda descanso activo.
    const base = recommend(profile, badDay(), establishedHistory(), TODAY)
    expect(base.kind).toBe('descanso_activo')
    // Se ofrecía cambiarlo del todo por pesas pero no la versión suave: al revés.
    expect(canIntensify(base)).toBe(true)
    expect(canMix(base)).toBe(true)
  })

  it('y en la vuelta tras un parón, que es cuando la rampa recorta los minutos', () => {
    const parado: Session[] = [session('2026-04-01', ['sentadilla_goblet'])]
    for (const r of [goodDay(), badDay()]) {
      const base = recommend(profile, r, parado, TODAY)
      if (base.kind === 'fuerza' || base.kind === 'reacondicionamiento') continue
      expect(base.cardioMinutes!, 'la rampa recorta el cardio').toBeLessThan(35)
      expect(canMix(base), `${base.title} con ${base.cardioMinutes} min`).toBe(true)
    }
  })

  it('nunca cuando ya toca fuerza: no hay nada que repartir', () => {
    expect(canMix(recommend(profile, goodDay(), establishedHistory(), TODAY))).toBe(false)
  })

  it('la mixta desde un descanso activo sigue siendo suave', () => {
    const historia = establishedHistory()
    const base = recommend(profile, badDay(), historia, TODAY)
    const mixta = withSomeStrength(base, profile, badDay(), historia, TODAY)
    expect(mixta.intensity).not.toBe('media-alta')
    expect(mixta.rir).toBeGreaterThanOrEqual(2)
    expect(mixta.cardioMinutes!).toBeGreaterThanOrEqual(CARDIO_MINIMO_MIXTO)
    // Y sigue diciendo que el motivo original no ha desaparecido.
    expect(mixta.reasons.join(' ').toLowerCase()).toContain('sigue ahí')
  })
})

describe('la mixta recomienda los ejercicios, no te hace elegirlos', () => {
  const diaDeCardio = (): Session[] => [
    session('2026-07-23', ['sentadilla_goblet']),
    session('2026-07-25', ['remo_mancuerna'])
  ]

  /** El propósito de la app es no tener que pensar qué hacer. */
  it('trae tres o cuatro ejercicios de fuerza ya elegidos', () => {
    const historia = diaDeCardio()
    const base = recommend(profile, goodDay(), historia, TODAY)
    const s = buildSession(withSomeStrength(base, profile, goodDay(), historia, TODAY), profile, historia, TODAY)
    const pesas = s.exercises.filter((e) => e.primary !== 'cardio')
    expect(pesas.length).toBeGreaterThanOrEqual(3)
    expect(pesas.length).toBeLessThanOrEqual(4)
  })

  it('reparte por zonas distintas en vez de doblar la misma', () => {
    const historia = diaDeCardio()
    const base = recommend(profile, goodDay(), historia, TODAY)
    const s = buildSession(withSomeStrength(base, profile, goodDay(), historia, TODAY), profile, historia, TODAY)
    const zonas = s.exercises.filter((e) => e.primary !== 'cardio').map((e) => e.primary)
    expect(new Set(zonas).size).toBe(zonas.length)
  })

  it('las zonas elegidas son las que llevan más sin trabajarse', () => {
    // Pecho y espalda entrenados hace nada: no deberían abrir la sesión.
    const historia: Session[] = [
      session('2026-07-25', ['press_banca_mancuernas']),
      session('2026-07-25', ['remo_mancuerna'])
    ]
    const base = recommend(profile, goodDay(), historia, TODAY)
    const mixta = withSomeStrength(base, profile, goodDay(), historia, TODAY)
    const s = buildSession(mixta, profile, historia, TODAY)
    const zonas = s.exercises.filter((e) => e.primary !== 'cardio').map((e) => e.primary)
    expect(zonas).not.toContain('pecho')
  })

  it('dice qué zonas ha elegido y por qué, para no tener que pensarlo', () => {
    const historia = diaDeCardio()
    const base = recommend(profile, goodDay(), historia, TODAY)
    const mixta = withSomeStrength(base, profile, goodDay(), historia, TODAY)
    const texto = mixta.reasons.join(' ')
    expect(texto).toMatch(/He elegido .+ zonas que llevan más tiempo sin trabajarse/)
    expect(texto).toContain('tú no tienes que decidir nada')
  })

  it('sigue siendo más corta que una sesión de fuerza entera', () => {
    const historia = diaDeCardio()
    const base = recommend(profile, goodDay(), historia, TODAY)
    const entera = buildSession(
      withMoreIntensity(base, profile, goodDay(), historia, TODAY), profile, historia, TODAY)
    const mixta = buildSession(
      withSomeStrength(base, profile, goodDay(), historia, TODAY), profile, historia, TODAY)
    const series = (s: Session) =>
      s.exercises.filter((e) => e.primary !== 'cardio').reduce((a, e) => a + e.plan.sets, 0)
    expect(series(mixta)).toBeLessThan(series(entera))
  })
})
