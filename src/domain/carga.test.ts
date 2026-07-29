import { describe, expect, it } from 'vitest'
import { planFor, progresoDeCarga } from './workoutBuilder'
import { INCREMENTO_CARGA, PASO_MINIMO_CARGA, SESIONES_PARA_SUBIR } from './protocol'
import { exerciseById } from '../data/exercises'
import type { ExerciseVariant, Profile, Session } from './types'

const perfil: Profile = {
  name: 'T',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'mancuernas', 'banco', 'barra'],
  maxWeights: { mancuernas: 24, barra: 60 }
}

const BILATERAL: ExerciseVariant = { implement: 'mancuernas', side: 'bilateral' }

/** `veces` sesiones con ese peso y esas repeticiones, de más nueva a más vieja. */
function historial(
  exerciseId: string,
  opts: { veces?: number; peso: number; reps?: number; rpe?: 1 | 2 | 3 | 4 | 5; variant?: ExerciseVariant }
): Session[] {
  const { veces = 1, peso, reps, rpe = 3, variant = BILATERAL } = opts
  return Array.from({ length: veces }, (_, i) => ({
    id: `s${i}`,
    date: `2026-07-${String(20 - i * 3).padStart(2, '0')}`,
    kind: 'fuerza' as const,
    title: 't',
    completed: true,
    rpe,
    exercises: [
      {
        exerciseId,
        name: exerciseId,
        primary: exerciseById(exerciseId)!.primary,
        plan: { sets: 3, reps: '8-12' },
        done: true,
        actualWeightKg: peso,
        variant,
        logs: Array.from({ length: 3 }, () => ({ done: true, weightKg: peso, reps }))
      }
    ]
  }))
}

const curl = exerciseById('curl_biceps')!
const sentadilla = exerciseById('sentadilla_goblet')!
const frances = exerciseById('press_frances')!

// ── La regla 2-por-2 ──────────────────────────────────────

describe('la carga no sube a la primera', () => {
  it('una sesión al tope del rango deja el peso donde estaba', () => {
    const p = progresoDeCarga(curl, perfil, 1, historial('curl_biceps', { peso: 10, reps: 12 }), BILATERAL)
    expect(p.weightKg).toBe(10)
    expect(p.decision).toBe('esperando_segunda')
  })

  it(`con ${SESIONES_PARA_SUBIR} seguidas al tope, sube`, () => {
    const h = historial('curl_biceps', { veces: SESIONES_PARA_SUBIR, peso: 10, reps: 12 })
    const p = progresoDeCarga(curl, perfil, 1, h, BILATERAL)
    expect(p.weightKg!).toBeGreaterThan(10)
    expect(p.decision).toBe('sube')
  })

  it('si la segunda se queda corta, vuelve a esperar', () => {
    const h = [
      ...historial('curl_biceps', { peso: 10, reps: 10 }),
      ...historial('curl_biceps', { peso: 10, reps: 12 })
    ]
    expect(progresoDeCarga(curl, perfil, 1, h, BILATERAL).weightKg).toBe(10)
  })
})

describe('la doble progresión se respeta', () => {
  it('a media tabla se ganan repeticiones, no kilos', () => {
    const h = historial('curl_biceps', { veces: 3, peso: 10, reps: 10 })
    const p = progresoDeCarga(curl, perfil, 1, h, BILATERAL)
    expect(p.weightKg).toBe(10)
    expect(p.decision).toBe('mantiene')
  })

  it('por debajo del rango tampoco sube', () => {
    const h = historial('curl_biceps', { veces: 3, peso: 10, reps: 6 })
    expect(progresoDeCarga(curl, perfil, 1, h, BILATERAL).weightKg).toBe(10)
  })

  it('sin repeticiones anotadas hacen falta dos sesiones cómodas', () => {
    const una = historial('curl_biceps', { peso: 10, rpe: 5 })
    const dos = historial('curl_biceps', { veces: 2, peso: 10, rpe: 5 })
    expect(progresoDeCarga(curl, perfil, 1, una, BILATERAL).weightKg).toBe(10)
    expect(progresoDeCarga(curl, perfil, 1, dos, BILATERAL).weightKg!).toBeGreaterThan(10)
  })

  it('y si costó, no sube por muchas que sean', () => {
    const h = historial('curl_biceps', { veces: 3, peso: 10, rpe: 1 })
    expect(progresoDeCarga(curl, perfil, 1, h, BILATERAL).weightKg).toBe(10)
  })
})

// ── Cuánto sube ───────────────────────────────────────────

describe('la subida es proporcional a lo que mueve el ejercicio', () => {
  // Mancuernas de sobra, para leer el porcentaje sin que lo tape el tope.
  const gimnasio: Profile = { ...perfil, maxWeights: { mancuernas: 100, barra: 100 } }
  const sube = (id: string, peso: number, variant = BILATERAL) =>
    progresoDeCarga(exerciseById(id)!, gimnasio, 1, historial(id, { veces: 2, peso, reps: 12, variant }), variant)
      .weightKg!

  it('un aislamiento sube poco', () => {
    // 40 kg de curl no son realistas, pero sirven para leer el porcentaje sin
    // que lo tape el salto mínimo de medio kilo.
    const de = 40 // 2,5 % son 1 kg, justo por encima del salto mínimo
    const a = sube('curl_biceps', de)
    expect((a - de) / de).toBeCloseTo(INCREMENTO_CARGA.general, 2)
  })

  it('un básico de pierna sube el doble', () => {
    const de = 40
    const a = sube('sentadilla_goblet', de)
    expect((a - de) / de).toBeCloseTo(INCREMENTO_CARGA.basicoInferior, 2)
  })

  it('con cargas pequeñas manda el salto mínimo real', () => {
    // El 2,5 % de 8 kg son 0,2 kg, y ese disco no existe. Antes el suelo era un
    // kilo entero, que en un curl de 8 kg es un 12,5 %.
    const p = progresoDeCarga(curl, perfil, 1, historial('curl_biceps', { veces: 2, peso: 8, reps: 12 }), BILATERAL)
    expect(p.weightKg).toBe(8 + PASO_MINIMO_CARGA)
  })

  it('nunca pasa del material disponible', () => {
    const h = historial('curl_biceps', { veces: 2, peso: 24, reps: 12 })
    expect(progresoDeCarga(curl, perfil, 1, h, BILATERAL).weightKg).toBe(24)
  })
})

// ── Al tope del material ──────────────────────────────────

describe('cuando ya no quedan kilos que poner', () => {
  it('lo dice, en vez de estancarse en silencio', () => {
    const h = historial('curl_biceps', { veces: 2, peso: 24, reps: 12 })
    const p = progresoDeCarga(curl, perfil, 1, h, BILATERAL)
    expect(p.decision).toBe('topado')
  })

  it('si el ejercicio admite un solo lado, esa es la siguiente palanca', () => {
    const h = historial('curl_biceps', { veces: 2, peso: 24, reps: 12 })
    expect(progresoDeCarga(curl, perfil, 1, h, BILATERAL).palanca).toBe('unilateral')
  })

  it('si no lo admite, la palanca son las repeticiones', () => {
    // El press francés no tiene versión a un brazo en el catálogo.
    expect(frances.unilateralOption).toBeFalsy()
    const soloMancuernas: Profile = { ...perfil, equipment: ['mancuernas', 'banco'] }
    const h = historial('press_frances', { veces: 2, peso: 24, reps: 12, variant: { implement: 'mancuernas' } })
    const p = progresoDeCarga(frances, soloMancuernas, 1, h, { implement: 'mancuernas' })
    expect(p.decision).toBe('topado')
    expect(p.palanca).toBe('reps')
  })

  it('y entonces el plan estira el rango de repeticiones', () => {
    const soloMancuernas: Profile = { ...perfil, equipment: ['mancuernas', 'banco'] }
    const h = historial('press_frances', { veces: 2, peso: 24, reps: 12, variant: { implement: 'mancuernas' } })
    const normal = planFor(frances, soloMancuernas, 'media-alta', 1, 2, [], false, undefined, {
      implement: 'mancuernas'
    })
    const topado = planFor(frances, soloMancuernas, 'media-alta', 1, 2, h, false, undefined, {
      implement: 'mancuernas'
    })
    expect(topado.reps).not.toBe(normal.reps)
    expect(topado.weightKg).toBe(24)
  })

  it('a un lado cada vez sí queda margen, y no se marca como topado', () => {
    const unLado: ExerciseVariant = { implement: 'mancuernas', side: 'unilateral' }
    const h = historial('curl_biceps', { veces: 2, peso: 12, reps: 12, variant: unLado })
    const p = progresoDeCarga(curl, perfil, 1, h, unLado)
    expect(p.decision).toBe('sube')
  })
})

describe('el ejercicio sin carga o sin estrenar', () => {
  it('sin historial estima desde el material disponible', () => {
    const p = progresoDeCarga(sentadilla, perfil, 1, [], { implement: 'mancuernas' })
    expect(p.decision).toBe('primera_vez')
    expect(p.weightKg!).toBeGreaterThan(0)
  })

  it('un ejercicio de peso corporal no propone kilos', () => {
    const plancha = exerciseById('plancha')!
    expect(progresoDeCarga(plancha, perfil, 1, [], undefined).weightKg).toBeUndefined()
  })
})
