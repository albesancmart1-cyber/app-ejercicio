import { describe, expect, it } from 'vitest'
import { EXERCISES, exerciseById } from '../data/exercises'
import { patternOf } from '../data/patterns'
import {
  defaultVariant,
  hasVariants,
  implementOptions,
  sameVariant,
  sideOptions,
  variantLabel
} from './variants'
import { catalogFor, changeVariant, swapExercise } from './swap'
import { buildSession, prepareExercise, suggestWeight } from './workoutBuilder'
import { MUSCLE_GROUPS, type Profile, type Recommendation, type Session } from './types'

const HOY = '2026-07-27'

const perfil: Profile = {
  name: 'T',
  goal: 'recomposicion',
  weightKg: 80,
  equipment: ['peso_corporal', 'mancuernas', 'polea', 'bandas', 'banco'],
  maxWeights: { mancuernas: 24, polea: 60 }
}

const soloCuerpo: Profile = {
  name: 'T',
  goal: 'recomposicion',
  equipment: ['peso_corporal'],
  maxWeights: {}
}

const rec: Recommendation = {
  kind: 'fuerza',
  title: 't',
  message: '',
  focus: ['brazo', 'pecho', 'espalda', 'hombro'],
  intensity: 'moderada',
  volumeScale: 1,
  rir: 2,
  reasons: []
}

/** Sesión completada con un ejercicio hecho de una forma concreta. */
function hecha(opts: {
  exerciseId: string
  weightKg: number
  reps: number
  variant?: Session['exercises'][number]['variant']
  date?: string
}): Session {
  return {
    id: `s-${opts.exerciseId}-${opts.date ?? '2026-07-24'}`,
    date: opts.date ?? '2026-07-24',
    kind: 'fuerza',
    title: 'test',
    completed: true,
    rpe: 3,
    exercises: [
      {
        exerciseId: opts.exerciseId,
        name: opts.exerciseId,
        primary: 'brazo',
        plan: { sets: 3, reps: '8-12', weightKg: opts.weightKg },
        done: true,
        actualWeightKg: opts.weightKg,
        variant: opts.variant,
        logs: Array.from({ length: 3 }, () => ({ weightKg: opts.weightKg, reps: opts.reps, done: true }))
      }
    ]
  }
}

describe('el catálogo da margen para cambiar', () => {
  it('todo ejercicio tiene su patrón de movimiento', () => {
    const sinPatron = EXERCISES.filter((e) => !patternOf(e.id))
    expect(sinPatron.map((e) => e.id)).toEqual([])
  })

  it('no hay identificadores repetidos', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada grupo tiene lo bastante como para que cambiar no sea ir y venir entre dos', () => {
    for (const g of MUSCLE_GROUPS) {
      const conMaterial = EXERCISES.filter((e) => e.primary === g).length
      expect(conMaterial, g).toBeGreaterThanOrEqual(6)
    }
  })

  it('incluso solo con peso corporal quedan al menos dos por grupo', () => {
    for (const g of MUSCLE_GROUPS) {
      if (g === 'cardio') continue
      expect(catalogFor(soloCuerpo, { group: g }).length, g).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('elegir un ejercicio de la lista', () => {
  it('los favoritos salen primero', () => {
    const conFavorito: Profile = { ...perfil, favoriteExercises: ['curl_martillo'] }
    const lista = catalogFor(conFavorito, { group: 'brazo' })
    expect(lista[0].id).toBe('curl_martillo')
  })

  it('la búsqueda no se atasca con las tildes', () => {
    const conTilde = catalogFor(perfil, { search: 'bíceps' }).map((e) => e.id)
    const sinTilde = catalogFor(perfil, { search: 'biceps' }).map((e) => e.id)
    expect(sinTilde).toEqual(conTilde)
    expect(sinTilde.length).toBeGreaterThan(0)
  })

  it('por defecto solo enseña lo que se puede hacer con el material propio', () => {
    const propios = catalogFor(soloCuerpo).map((e) => e.id)
    expect(propios).not.toContain('jalon_polea')
    const todos = catalogFor(soloCuerpo, { onlyOwned: false }).map((e) => e.id)
    expect(todos).toContain('jalon_polea')
  })

  it('un ejercicio añadido a mano queda listo para registrar, como los propuestos', () => {
    const ex = exerciseById('curl_martillo')!
    const nuevo = prepareExercise(ex, perfil, {
      intensity: 'moderada',
      volumeScale: 1,
      rir: 2,
      history: [],
      keto: false,
      addedByUser: true
    })
    expect(nuevo.plan.sets).toBeGreaterThan(0)
    expect(nuevo.logs?.length).toBe(nuevo.plan.sets)
    expect(nuevo.logs?.every((l) => l.done === false)).toBe(true)
    expect(nuevo.addedByUser).toBe(true)
  })
})

describe('los favoritos guían lo que propone la app', () => {
  it('un favorito se antepone dentro de su grupo', () => {
    const conFavorito: Profile = { ...perfil, favoriteExercises: ['patada_triceps'] }
    const s = buildSession({ ...rec, focus: ['brazo'] }, conFavorito, [], HOY)
    expect(s.exercises.map((e) => e.exerciseId)).toContain('patada_triceps')
  })

  it('marcar favorito no rompe a quien no tiene ninguno', () => {
    const s = buildSession(rec, perfil, [], HOY)
    expect(s.exercises.length).toBeGreaterThan(0)
  })
})

describe('con qué y de qué forma se hace', () => {
  const triceps = exerciseById('extension_triceps')!

  it('ofrece elegir material solo cuando hay más de uno disponible', () => {
    expect(implementOptions(triceps, perfil)).toEqual(['mancuernas', 'polea', 'bandas'])
    const soloMancuernas: Profile = { ...perfil, equipment: ['peso_corporal', 'mancuernas'] }
    expect(implementOptions(triceps, soloMancuernas)).toEqual([])
  })

  it('ofrece a un lado o a dos cuando el ejercicio lo admite', () => {
    expect(sideOptions(triceps)).toEqual(['bilateral', 'unilateral'])
    expect(sideOptions(exerciseById('press_militar_barra')!)).toEqual([])
  })

  it('la variante por defecto coge el material con más recorrido de carga', () => {
    const v = defaultVariant(triceps, perfil)
    expect(v?.implement).toBe('polea') // 60 kg frente a 24 de mancuernas
    expect(v?.side).toBe('bilateral')
  })

  it('un ejercicio sin alternativas no pregunta nada', () => {
    const plancha = exerciseById('plancha')!
    expect(hasVariants(plancha, perfil)).toBe(false)
    expect(defaultVariant(plancha, perfil)).toBeUndefined()
  })

  it('se dice en lenguaje llano cómo se hizo', () => {
    expect(variantLabel({ implement: 'polea', side: 'unilateral' })).toBe('Polea · a un lado cada vez')
    expect(variantLabel(undefined)).toBe('')
  })
})

describe('la progresión no mezcla formas distintas', () => {
  it('el historial de una forma no arrastra la carga de la otra', () => {
    // Dos sesiones al tope: hace falta la segunda para que la carga suba.
    const historial = ['2026-07-24', '2026-07-21'].map((date) =>
      hecha({ exerciseId: 'extension_triceps', weightKg: 12, reps: 12, date, variant: { implement: 'mancuernas', side: 'bilateral' } })
    )
    const triceps = exerciseById('extension_triceps')!

    // Misma forma: progresa desde los 12 kg.
    const misma = suggestWeight(triceps, perfil, 1, historial, { implement: 'mancuernas', side: 'bilateral' })
    expect(misma).toBeGreaterThan(12)

    // A un brazo: se traduce a la mitad y no se sube encima.
    const unLado = suggestWeight(triceps, perfil, 1, historial, { implement: 'mancuernas', side: 'unilateral' })
    expect(unLado).toBeLessThan(12)
    expect(unLado).toBeCloseTo(6, 1)
  })

  it('volver a los dos lados recupera la carga completa, no la doblada por error', () => {
    const historial = [
      hecha({ exerciseId: 'extension_triceps', weightKg: 6, reps: 12, variant: { implement: 'mancuernas', side: 'unilateral' } })
    ]
    const dos = suggestWeight(exerciseById('extension_triceps')!, perfil, 1, historial, {
      implement: 'mancuernas',
      side: 'bilateral'
    })
    expect(dos).toBeCloseTo(12, 1)
  })

  it('el historial sin variante sigue valiendo: no se pierde el peso alcanzado', () => {
    const antiguo = [hecha({ exerciseId: 'extension_triceps', weightKg: 12, reps: 12 })]
    const ahora = suggestWeight(exerciseById('extension_triceps')!, perfil, 1, antiguo, {
      implement: 'mancuernas',
      side: 'bilateral'
    })
    expect(ahora).toBeGreaterThanOrEqual(12)
  })

  it('el material elegido manda sobre el tope de peso disponible', () => {
    const conPolea = suggestWeight(exerciseById('extension_triceps')!, perfil, 1, [], {
      implement: 'polea',
      side: 'bilateral'
    })
    const conMancuernas = suggestWeight(exerciseById('extension_triceps')!, perfil, 1, [], {
      implement: 'mancuernas',
      side: 'bilateral'
    })
    expect(conPolea).toBeGreaterThan(conMancuernas!)
  })

  it('una variante ausente vale como comodín en ambos sentidos', () => {
    expect(sameVariant(undefined, { implement: 'polea' })).toBe(true)
    expect(sameVariant({ implement: 'polea' }, undefined)).toBe(true)
    expect(sameVariant({ implement: 'polea' }, { implement: 'mancuernas' })).toBe(false)
    expect(sameVariant({ side: 'unilateral' }, { side: 'unilateral' })).toBe(true)
  })
})

describe('cambiar la forma no borra lo hecho', () => {
  it('conserva las series anotadas y solo recalcula el peso sugerido', () => {
    const ex = exerciseById('extension_triceps')!
    const pe = prepareExercise(ex, perfil, {
      intensity: 'moderada',
      volumeScale: 1,
      rir: 2,
      history: [],
      keto: false
    })
    const conDatos = { ...pe, logs: [{ weightKg: 10, reps: 11, done: true }, ...(pe.logs ?? []).slice(1)] }
    const cambiado = changeVariant(conDatos, { implement: 'mancuernas', side: 'unilateral' }, perfil, [], {
      intensity: 'moderada',
      volumeScale: 1,
      keto: false
    })
    expect(cambiado.logs?.[0]).toEqual({ weightKg: 10, reps: 11, done: true })
    expect(cambiado.variant).toEqual({ implement: 'mancuernas', side: 'unilateral' })
    expect(cambiado.plan.sets).toBe(pe.plan.sets)
  })

  it('sustituir un ejercicio sí empieza sus series en blanco', () => {
    const s = buildSession({ ...rec, focus: ['brazo'] }, perfil, [], HOY)
    const pe = { ...s.exercises[0], logs: [{ weightKg: 10, reps: 10, done: true }] }
    const sustituto = swapExercise(pe, exerciseById('curl_martillo')!, perfil, [], {
      intensity: 'moderada',
      volumeScale: 1,
      keto: false
    })
    expect(sustituto.exerciseId).toBe('curl_martillo')
    expect(sustituto.logs?.every((l) => l.done === false)).toBe(true)
  })
})
