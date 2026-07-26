import { describe, expect, it } from 'vitest'
import { BASE_LABELS, EFFORT_LABELS, MEALS, filterMeals, mealById, suggestMeal, type MealBase, type MealEffort } from '../data/meals'
import { computeLeptinSignal } from './leptin'
import type { CheckIn } from './types'

const TODAY = '2026-07-25'

describe('catálogo de comidas', () => {
  // El usuario no quiere frutos secos. Es una restricción dura, no una preferencia,
  // así que la vigila un test en vez de la buena voluntad de quien edite el catálogo.
  const VETADOS = [
    'nuez', 'nueces', 'almendra', 'avellana', 'anacardo', 'pistacho', 'cacahuete',
    'macadamia', 'pecana', 'piñon', 'piñón', 'semilla', 'sesamo', 'sésamo', 'tahini',
    'frutos secos'
  ]

  it('ningún plato contiene frutos secos ni semillas', () => {
    for (const meal of MEALS) {
      // «una nuez de mantequilla» es una medida, no un fruto seco: se mira el ingrediente entero.
      const texto = [meal.name, ...meal.ingredients, meal.steps].join(' | ').toLowerCase()
      const limpio = texto.replace(/una nuez de mantequilla/g, 'un poco de mantequilla')
      for (const veto of VETADOS) {
        expect(limpio, `${meal.id} menciona «${veto}»`).not.toContain(veto)
      }
    }
  })

  it('todos los platos tienen proteína y datos completos', () => {
    for (const meal of MEALS) {
      expect(meal.proteinG, meal.id).toBeGreaterThan(0)
      expect(meal.ingredients.length, meal.id).toBeGreaterThan(0)
      expect(meal.steps.length, meal.id).toBeGreaterThan(10)
      expect(BASE_LABELS[meal.base], meal.id).toBeDefined()
      expect(EFFORT_LABELS[meal.effort], meal.id).toBeDefined()
    }
  })

  it('los identificadores no se repiten', () => {
    const ids = MEALS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('el catálogo es de base animal', () => {
    const animales = MEALS.filter((m) => m.animalOnly).length
    expect(animales / MEALS.length).toBeGreaterThan(0.8)
  })

  it('hay platos de cada base y de cada nivel de esfuerzo', () => {
    for (const base of Object.keys(BASE_LABELS) as MealBase[]) {
      expect(filterMeals(base, null).length, base).toBeGreaterThan(0)
    }
    for (const effort of Object.keys(EFFORT_LABELS) as MealEffort[]) {
      expect(filterMeals(null, effort).length, effort).toBeGreaterThan(0)
    }
  })

  it('siempre hay algo sin cocinar, para los días de cero ganas', () => {
    expect(filterMeals(null, 'sin_cocinar').length).toBeGreaterThanOrEqual(8)
  })

  it('busca un plato por su identificador', () => {
    expect(mealById('gambas_ajillo')?.name).toBe('Gambas al ajillo')
    expect(mealById('no_existe')).toBeUndefined()
  })
})

describe('sugerencia de comida', () => {
  it('respeta el filtro elegido', () => {
    const meal = suggestMeal('marisco', 'sin_cocinar')
    expect(meal?.base).toBe('marisco')
    expect(meal?.effort).toBe('sin_cocinar')
  })

  it('no repite el plato anterior', () => {
    const previous = filterMeals('huevos', null)[0]
    for (let i = 0; i < 20; i++) {
      const next = suggestMeal('huevos', null, previous.id, () => i / 20)
      expect(next?.id).not.toBe(previous.id)
    }
  })

  it('devuelve algo aunque el filtro deje un solo plato', () => {
    const solo = filterMeals('dulce', 'rapido')
    expect(solo.length).toBe(1)
    expect(suggestMeal('dulce', 'rapido', solo[0].id)?.id).toBe(solo[0].id)
  })

  it('sin filtros recorre todo el catálogo', () => {
    const vistos = new Set<string>()
    for (let i = 0; i < MEALS.length; i++) {
      vistos.add(suggestMeal(null, null, undefined, () => i / MEALS.length)!.id)
    }
    expect(vistos.size).toBeGreaterThan(MEALS.length * 0.8)
  })

  it('un filtro sin resultados no rompe', () => {
    expect(suggestMeal('dulce', 'con_calma')).toBeUndefined()
  })
})

// ── Leptina ───────────────────────────────────────────────────

function week(overrides: Partial<CheckIn>, days = 7): CheckIn[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date('2026-07-25T12:00:00')
    d.setDate(d.getDate() - i)
    return {
      date: d.toISOString().slice(0, 10),
      sleep: 5,
      lightHygiene: true,
      sunrise: true,
      sunsetYesterday: true,
      sunExposure: true,
      keto: true,
      energy: 5,
      discomfort: 'ninguna',
      wokeHungry: false,
      cravings: false,
      ...overrides
    } as CheckIn
  })
}

describe('señal de leptina', () => {
  it('una semana de buenos hábitos da señal alta', () => {
    const s = computeLeptinSignal(week({}), TODAY)
    expect(s.level).toBe('alta')
    expect(s.score).toBeGreaterThan(90)
    expect(s.hurting).toHaveLength(0)
  })

  it('mal sueño, luz azul y antojos dan señal baja', () => {
    const s = computeLeptinSignal(
      week({ sleep: 1, lightHygiene: false, sunrise: false, sunExposure: false, cravings: true, wokeHungry: true }),
      TODAY
    )
    expect(s.level).toBe('baja')
    expect(s.hurting.length).toBeGreaterThan(3)
  })

  it('el sueño pesa más que ninguna otra palanca', () => {
    const malSueno = computeLeptinSignal(week({ sleep: 1 }), TODAY)
    const sinAtardecer = computeLeptinSignal(week({ sunsetYesterday: false }), TODAY)
    expect(malSueno.score).toBeLessThan(sinAtardecer.score)
  })

  it('un historial antiguo sin las preguntas nuevas no hunde la puntuación', () => {
    const antiguos = week({}).map((c) => {
      const { wokeHungry, cravings, ...resto } = c
      return resto as CheckIn
    })
    const s = computeLeptinSignal(antiguos, TODAY)
    expect(s.level).toBe('alta')
    expect(s.score).toBeGreaterThan(90)
  })

  it('sin check-ins no inventa una puntuación', () => {
    const s = computeLeptinSignal([], TODAY)
    expect(s.days).toBe(0)
    expect(s.muscleNote).toContain('check-ins')
  })

  it('solo mira los últimos 7 días', () => {
    const viejos = week({ sleep: 1 }, 3).map((c) => ({ ...c, date: '2026-06-01' }))
    const s = computeLeptinSignal([...week({}, 3), ...viejos], TODAY)
    expect(s.days).toBe(3)
    expect(s.level).toBe('alta')
  })

  it('detecta que se está comiendo de menos sin contar calorías', () => {
    const s = computeLeptinSignal(week({ energy: 1, cravings: true }), TODAY, 'masa')
    expect(s.muscleNote).toContain('por debajo de lo que tu cuerpo necesita')
  })

  it('con señal baja y objetivo de masa, señala dónde está el freno real', () => {
    const s = computeLeptinSignal(week({ sleep: 1, sunrise: false, lightHygiene: false }), TODAY, 'masa')
    expect(s.muscleNote).toContain('no está en el entrenamiento')
  })

  it('con señal limpia y objetivo de masa, invita a comer sin contar', () => {
    const s = computeLeptinSignal(week({}), TODAY, 'masa')
    expect(s.muscleNote).toMatch(/sin contar nada/)
  })

  it('nunca menciona calorías, déficit ni superávit', () => {
    const casos = [week({}), week({ sleep: 1 }), week({ energy: 1, cravings: true })]
    for (const c of casos) {
      const s = computeLeptinSignal(c, TODAY, 'masa')
      const texto = [s.muscleNote, ...s.helping, ...s.hurting].join(' ').toLowerCase()
      expect(texto).not.toMatch(/calor[ií]a|d[eé]ficit|super[aá]vit/)
    }
  })
})
