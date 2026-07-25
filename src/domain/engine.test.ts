import { describe, expect, it } from 'vitest'
import { computeReadiness } from './readiness'
import { recommend } from './recommender'
import { buildSession } from './workoutBuilder'
import { computeBalance, neglectedGroups } from './muscleBalance'
import type { CheckIn, Profile, Session } from './types'

const profile: Profile = {
  name: 'Test',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'bici', 'correr'],
  maxWeights: { mancuernas: 24 }
}

function checkIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    date: '2026-07-25',
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

function strengthSession(date: string, exerciseIds: string[], names: string[] = []): Session {
  return {
    id: `t-${date}`,
    date,
    kind: 'fuerza',
    title: 'test',
    exercises: exerciseIds.map((id, i) => ({
      exerciseId: id,
      name: names[i] ?? id,
      primary: 'pecho',
      plan: { sets: 3, reps: '8-12' },
      done: true
    })),
    completed: true
  }
}

const TODAY = '2026-07-25'

describe('readiness', () => {
  it('buen sueño y buenos hábitos → readiness alto', () => {
    const r = computeReadiness(checkIn())
    expect(r.level).toBe('alto')
  })

  it('mala noche y cansancio → readiness bajo', () => {
    const r = computeReadiness(
      checkIn({ sleep: 1, energy: 1, lightHygiene: false, sunrise: false, keto: false, sunExposure: false, sunsetYesterday: false })
    )
    expect(r.level).toBe('bajo')
  })

  it('molestia localizada excluye ese grupo sin hundir el score', () => {
    const r = computeReadiness(checkIn({ discomfort: 'espalda' }))
    expect(r.avoid).toContain('espalda')
    expect(r.level).toBe('alto')
  })
})

describe('recommender', () => {
  it('dos semanas sin entrenar → reacondicionamiento suave', () => {
    const old = strengthSession('2026-07-10', ['flexiones'])
    const rec = recommend(profile, computeReadiness(checkIn()), [old], TODAY)
    expect(rec.kind).toBe('reacondicionamiento')
    expect(rec.intensity).toBe('suave')
  })

  it('sin historial → primera sesión de reacondicionamiento', () => {
    const rec = recommend(profile, computeReadiness(checkIn()), [], TODAY)
    expect(rec.kind).toBe('reacondicionamiento')
  })

  it('mala noche → descanso activo, nunca fuerza', () => {
    const recent = strengthSession('2026-07-23', ['flexiones'])
    const bad = computeReadiness(
      checkIn({ sleep: 1, energy: 1, lightHygiene: false, sunrise: false, keto: false, sunExposure: false, sunsetYesterday: false })
    )
    const rec = recommend(profile, bad, [recent], TODAY)
    expect(rec.kind).toBe('descanso_activo')
  })

  it('semana con torso trabajado y pierna olvidada → prioridad pierna', () => {
    const sessions = [
      strengthSession('2026-07-21', ['flexiones', 'remo_mancuerna', 'press_militar_mancuernas']),
      strengthSession('2026-07-23', ['press_banca_mancuernas', 'jalon_polea', 'curl_biceps'])
    ]
    // Un cardio reciente para que no salte la regla de alternancia.
    sessions.push({ ...strengthSession('2026-07-24', []), kind: 'cardio_suave', cardioMinutes: 20 })
    const rec = recommend(profile, computeReadiness(checkIn()), sessions, TODAY)
    expect(rec.kind).toBe('fuerza')
    expect(['cuadriceps_gluteo', 'femoral']).toContain(rec.focus[0])
  })

  it('varias sesiones de fuerza seguidas → toca cardio', () => {
    const sessions = [
      strengthSession('2026-07-22', ['flexiones']),
      strengthSession('2026-07-24', ['remo_mancuerna'])
    ]
    const rec = recommend(profile, computeReadiness(checkIn()), sessions, TODAY)
    expect(['cardio_suave', 'cardio_medio']).toContain(rec.kind)
  })

  it('molestia en espalda → la sesión no incluye espalda', () => {
    const sessions = [
      { ...strengthSession('2026-07-24', []), kind: 'cardio_suave' as const, cardioMinutes: 20 }
    ]
    const readiness = computeReadiness(checkIn({ discomfort: 'espalda' }))
    const rec = recommend(profile, readiness, sessions, TODAY)
    expect(rec.focus).not.toContain('espalda')
  })
})

describe('workoutBuilder', () => {
  it('solo propone ejercicios con el equipamiento disponible', () => {
    const rec = recommend(profile, computeReadiness(checkIn()), [], TODAY)
    const session = buildSession(rec, profile, [], TODAY)
    expect(session.exercises.length).toBeGreaterThan(0)
    for (const pe of session.exercises) {
      // Nada de barra, poleas ni máquinas: el perfil no las tiene.
      expect(pe.exerciseId).not.toMatch(/barra$|polea|maquina|prensa/)
    }
  })

  it('el peso sugerido nunca supera el material disponible', () => {
    const massProfile: Profile = { ...profile, goal: 'masa' }
    const rec = {
      kind: 'fuerza' as const,
      title: 't',
      message: '',
      focus: ['pecho' as const, 'espalda' as const],
      intensity: 'media-alta' as const
    }
    const session = buildSession(rec, massProfile, [], TODAY)
    for (const pe of session.exercises) {
      if (pe.plan.weightKg) expect(pe.plan.weightKg).toBeLessThanOrEqual(24)
    }
  })

  it('progresa suave a partir del último peso registrado', () => {
    const history: Session[] = [
      {
        ...strengthSession('2026-07-20', ['press_banca_mancuernas']),
        exercises: [
          {
            exerciseId: 'press_banca_mancuernas',
            name: 'Press banca',
            primary: 'pecho',
            plan: { sets: 3, reps: '8-12' },
            done: true,
            actualWeightKg: 14
          }
        ]
      }
    ]
    const rec = {
      kind: 'fuerza' as const,
      title: 't',
      message: '',
      focus: ['pecho' as const],
      intensity: 'media-alta' as const
    }
    const session = buildSession(rec, profile, history, TODAY)
    const press = session.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
    expect(press?.plan.weightKg).toBeGreaterThanOrEqual(14)
    expect(press?.plan.weightKg).toBeLessThanOrEqual(16.5)
  })
})

describe('muscleBalance', () => {
  it('detecta el grupo menos trabajado', () => {
    const sessions = [strengthSession('2026-07-23', ['flexiones', 'flexiones_inclinadas'])]
    const balance = computeBalance(sessions, TODAY)
    const neglected = neglectedGroups(balance)
    expect(neglected[0]).not.toBe('pecho')
    expect(balance.pecho).toBeGreaterThan(0)
  })
})
