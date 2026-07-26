import { describe, expect, it } from 'vitest'
import {
  BASE_LABELS,
  DHA_THRESHOLDS,
  EFFORT_LABELS,
  MEALS,
  bestDhaTier,
  dhaLevel,
  filterMeals,
  mealById,
  suggestMeal,
  type MealBase,
  type MealEffort
} from '../data/meals'
import { computeLeptinSignal } from './leptin'
import { DHA_LIMITS, complementarConPastillas, esVerano, objetivoDhaDiario } from './dha'
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

  it('sin filtros recorre todo el abanico de DHA alto sin encasillarse', () => {
    // Con la priorización activa solo salen platos de DHA alto —eso es lo que se
    // busca—, pero deben salir casi todos ellos, no siempre los mismos tres.
    const altos = MEALS.filter((m) => dhaLevel(m) === 'alto')
    const vistos = new Set<string>()
    for (let i = 0; i < altos.length; i++) {
      vistos.add(suggestMeal(null, null, undefined, () => i / altos.length)!.id)
    }
    expect(vistos.size).toBeGreaterThan(altos.length * 0.8)
  })

  it('un filtro sin resultados no rompe', () => {
    expect(suggestMeal('dulce', 'con_calma')).toBeUndefined()
  })
})

describe('priorización de DHA', () => {
  it('sin filtros siempre sugiere un plato de DHA alto', () => {
    for (let i = 0; i < 30; i++) {
      const meal = suggestMeal(null, null, undefined, () => i / 30)!
      expect(dhaLevel(meal), meal.name).toBe('alto')
    }
  })

  it('con carne resuelve el DHA acompañándola de algo del mar', () => {
    const meal = suggestMeal('carne', null)!
    expect(meal.base).toBe('carne')
    expect(dhaLevel(meal)).toBe('alto')
  })

  it('hay variedad de carne con DHA alto, no un único plato', () => {
    const altos = filterMeals('carne', null).filter((m) => dhaLevel(m) === 'alto')
    expect(altos.length).toBeGreaterThanOrEqual(3)
    // Y no todos dependen del hígado de bacalao, que tiene tope semanal.
    expect(altos.filter((m) => !m.limit).length).toBeGreaterThanOrEqual(2)
  })

  it('respeta el filtro aunque eso obligue a bajar de DHA', () => {
    // Los lácteos y el cacao sí son un callejón sin salida: se devuelve lo pedido.
    const meal = suggestMeal('lacteos', null)!
    expect(meal.base).toBe('lacteos')
  })

  it('dentro de un filtro elige el mejor escalón disponible', () => {
    const marisco = suggestMeal('marisco', null)!
    const mejor = bestDhaTier(filterMeals('marisco', null))
    expect(mejor.map((m) => m.id)).toContain(marisco.id)
    expect(dhaLevel(marisco)).not.toBe('bajo')
  })

  it('se puede desactivar la priorización para explorar el catálogo', () => {
    const vistos = new Set<string>()
    for (let i = 0; i < MEALS.length; i++) {
      vistos.add(suggestMeal(null, null, undefined, () => i / MEALS.length, false)!.id)
    }
    const niveles = new Set([...vistos].map((id) => dhaLevel(mealById(id)!)))
    expect(niveles.size).toBeGreaterThan(1)
  })

  it('hay platos de DHA alto sin cocinar, para los días de cero ganas', () => {
    const altos = filterMeals(null, 'sin_cocinar').filter((m) => dhaLevel(m) === 'alto')
    expect(altos.length).toBeGreaterThanOrEqual(4)
  })

  it('el catálogo tiene suficiente variedad de DHA alto para no repetirse', () => {
    expect(MEALS.filter((m) => dhaLevel(m) === 'alto').length).toBeGreaterThanOrEqual(15)
  })

  it('los niveles de DHA respetan sus umbrales', () => {
    for (const meal of MEALS) {
      const nivel = dhaLevel(meal)
      if (nivel === 'alto') expect(meal.dhaMg).toBeGreaterThanOrEqual(DHA_THRESHOLDS.alto)
      if (nivel === 'bajo') expect(meal.dhaMg).toBeLessThan(DHA_THRESHOLDS.medio)
    }
  })

  it('la carne sin acompañamiento marino no tiene DHA, como manda la biología', () => {
    const MARINO = /sardina|caballa|anchoa|salm|hueva|bacalao|atún|arenque|marisco|mejill/i
    const carneSola = MEALS.filter(
      (m) => m.base === 'carne' && !MARINO.test([m.name, ...m.ingredients].join(' '))
    )
    expect(carneSola.length).toBeGreaterThan(5)
    for (const m of carneSola) {
      expect(dhaLevel(m), m.name).toBe('bajo')
    }

    const pescado = MEALS.filter((m) => m.base === 'pescado')
    const media = (l: typeof MEALS) => l.reduce((a, m) => a + m.dhaMg, 0) / l.length
    expect(media(pescado)).toBeGreaterThan(media(carneSola) * 10)
  })
})

describe('límites de seguridad del DHA', () => {
  const VERANO = '2026-07-26'
  const INVIERNO = '2026-01-15'

  it('el objetivo sube en los meses de más sol', () => {
    expect(esVerano(VERANO)).toBe(true)
    expect(esVerano(INVIERNO)).toBe(false)
    expect(objetivoDhaDiario(VERANO)).toBeGreaterThan(objetivoDhaDiario(INVIERNO))
  })

  it('nunca sugiere más de 1 g de suplemento al día, que es el techo de la EFSA', () => {
    // Da igual lo lejos que quede el objetivo o lo pequeña que sea la pastilla.
    for (const pastilla of [250, 500, 1000]) {
      for (const comida of [0, 100, 500]) {
        const c = complementarConPastillas(comida, pastilla, VERANO)
        expect(c.pastillas * pastilla).toBeLessThanOrEqual(DHA_LIMITS.maxSuplementoDiario)
      }
    }
  })

  it('con pastillas de 1000 mg nunca pasa de una', () => {
    expect(complementarConPastillas(0, 1000, VERANO).pastillas).toBe(1)
    expect(complementarConPastillas(200, 1000, VERANO).pastillas).toBe(1)
  })

  it('si el plato ya cubre el objetivo, no manda tomar nada', () => {
    const c = complementarConPastillas(2800, 1000, VERANO)
    expect(c.pastillas).toBe(0)
    expect(c.cubierto).toBe(true)
  })

  it('el total nunca supera el techo diario, barriendo todo el rango', () => {
    // Probar valores sueltos deja huecos: aquí se recorre el rango entero,
    // porque el fallo estaba justo en los platos muy densos como el hígado
    // de bacalao, que rondan los 2.200 mg.
    for (const pastilla of [250, 500, 1000]) {
      for (let comida = 0; comida <= 3200; comida += 20) {
        const c = complementarConPastillas(comida, pastilla, VERANO)
        expect(c.totalMg, `${comida} mg + ${pastilla} mg`).toBeLessThanOrEqual(
          Math.max(DHA_LIMITS.techoDiario, comida)
        )
        expect(c.pastillas * pastilla).toBeLessThanOrEqual(DHA_LIMITS.maxSuplementoDiario)
      }
    }
  })

  it('con los platos reales del catálogo tampoco se pasa del techo', () => {
    for (const meal of MEALS) {
      const c = complementarConPastillas(meal.dhaMg, 1000, VERANO)
      expect(c.totalMg, meal.name).toBeLessThanOrEqual(Math.max(DHA_LIMITS.techoDiario, meal.dhaMg))
    }
  })

  it('sin pastillas configuradas no inventa suplementación', () => {
    expect(complementarConPastillas(500, 0, VERANO).pastillas).toBe(0)
  })

  it('el techo de suplemento es coherente con el objetivo y el techo diario', () => {
    expect(DHA_LIMITS.maxSuplementoDiario).toBeLessThan(DHA_LIMITS.objetivoDiario)
    expect(DHA_LIMITS.objetivoVerano).toBeLessThanOrEqual(DHA_LIMITS.techoDiario)
  })
})

describe('vitamina A: los hígados no pueden ser diarios', () => {
  it('todo plato con hígado lleva tope semanal y su motivo', () => {
    const higados = MEALS.filter((m) =>
      [m.name, ...m.ingredients].join(' ').toLowerCase().includes('hígado')
    )
    expect(higados.length).toBeGreaterThanOrEqual(3)
    for (const m of higados) {
      expect(m.limit, `${m.id} sin tope semanal`).toBeDefined()
      expect(m.limit!.maxPerWeek).toBeLessThanOrEqual(2)
      expect(m.limit!.reason.toLowerCase()).toContain('vitamina a')
    }
  })

  it('el hígado de bacalao aporta DHA alto pese al tope', () => {
    const m = mealById('higado_bacalao')!
    expect(dhaLevel(m)).toBe('alto')
    expect(m.limit!.maxPerWeek).toBe(2)
  })

  it('hay una opción para no quedarse a cero de DHA comiendo carne', () => {
    const m = mealById('higado_bacalao_carne')!
    expect(m.base).toBe('carne')
    expect(m.dhaMg).toBeGreaterThan(1000)
  })

  it('ningún plato sin tope semanal es de casquería', () => {
    for (const m of MEALS.filter((x) => !x.limit)) {
      expect([m.name, ...m.ingredients].join(' ').toLowerCase()).not.toContain('hígado')
    }
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
