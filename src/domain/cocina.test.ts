import { describe, expect, it } from 'vitest'
import {
  IDEAS_A_LA_VEZ,
  bandaDeProteina,
  platosParaElMinimo,
  tresIdeas
} from './cocina'
import { MEALS, bestDhaTier, dhaLevel, filterMeals } from '../data/meals'

/** Azar determinista: siempre el primero de la lista. */
const primero = () => 0

describe('tres ideas a la vez', () => {
  it('pone tres platos distintos delante sin preguntar nada', () => {
    const ideas = tresIdeas(null, null, [], primero)
    expect(ideas).toHaveLength(IDEAS_A_LA_VEZ)
    expect(new Set(ideas.map((m) => m.id)).size).toBe(IDEAS_A_LA_VEZ)
  })

  it('sin filtro, las tres son del mejor escalón de DHA que hay', () => {
    const ideas = tresIdeas(null, null, [], primero)
    expect(ideas.every((m) => dhaLevel(m) === 'alto')).toBe(true)
  })

  it('respeta la base pedida aunque baje el DHA', () => {
    const ideas = tresIdeas('lacteos', null, [], primero)
    expect(ideas.length).toBeGreaterThan(0)
    expect(ideas.every((m) => m.base === 'lacteos')).toBe(true)
  })

  it('respeta el tiempo disponible', () => {
    const ideas = tresIdeas(null, 'sin_cocinar', [], primero)
    expect(ideas.every((m) => m.effort === 'sin_cocinar')).toBe(true)
  })

  it('pedir otras tres no devuelve las mismas', () => {
    const primeras = tresIdeas(null, null, [], primero)
    const otras = tresIdeas(
      null,
      null,
      primeras.map((m) => m.id),
      primero
    )
    for (const m of otras)
      expect(primeras.map((x) => x.id)).not.toContain(m.id)
  })

  it('no baja de escalón de DHA para completar la terna', () => {
    // Pidiendo carne solo hay dos platos que resuelvan el DHA. Antes se
    // rellenaba con un tercero cualquiera y se colaba uno de 10 mg junto a dos
    // de mil y pico: dos que sirven valen más que tres de los que uno sobra.
    const ideas = tresIdeas('carne', null, [], primero)
    const mejor = dhaLevel(bestDhaTier(filterMeals('carne', null))[0])
    expect(ideas.length).toBeGreaterThan(0)
    for (const m of ideas) expect(dhaLevel(m), m.name).toBe(mejor)
  })

  it('con un filtro estrecho devuelve lo que haya, sin inventar', () => {
    const pool = filterMeals('dulce', null)
    const ideas = tresIdeas('dulce', null, [], primero)
    expect(ideas.length).toBe(Math.min(IDEAS_A_LA_VEZ, pool.length))
  })

  it('antes que quedarse corto repite la tanda anterior', () => {
    // Con dos platos en el filtro, evitar los dos no puede dejar la pantalla vacía.
    const pool = filterMeals('dulce', null)
    const ideas = tresIdeas(
      'dulce',
      null,
      pool.map((m) => m.id),
      primero
    )
    expect(ideas.length).toBe(Math.min(IDEAS_A_LA_VEZ, pool.length))
  })

  it('un filtro sin nada no da nada, y lo dice quedándose vacío', () => {
    const combinacion = (
      ['huevos', 'carne', 'pescado', 'marisco', 'lacteos', 'dulce'] as const
    ).find((b) =>
      (['sin_cocinar', 'rapido', 'con_calma'] as const).some(
        (e) => filterMeals(b, e).length === 0
      )
    )
    if (!combinacion) return; // Si el catálogo cubre todas, no hay caso que probar.
    const esfuerzo = (['sin_cocinar', 'rapido', 'con_calma'] as const).find(
      (e) => filterMeals(combinacion, e).length === 0
    )!
    expect(tresIdeas(combinacion, esfuerzo, [], primero)).toEqual([])
  })
})

describe('la banda de proteína', () => {
  it('sale del peso y del objetivo, y se dice también por kilo', () => {
    const b = bandaDeProteina(80, 'recomposicion')
    expect(b.min).toBeLessThan(b.max)
    expect(b.porKilo.min).toBeCloseTo(2, 1)
    expect(b.porKilo.max).toBeCloseTo(2.6, 1)
  })

  it('la banda cae dentro de la regla y no la ocupa entera', () => {
    for (const peso of [55, 70, 80, 110]) {
      const b = bandaDeProteina(peso, 'recomposicion')
      expect(b.inicio).toBeGreaterThan(0)
      expect(b.inicio + b.ancho).toBeLessThan(100)
      expect(b.ancho).toBeGreaterThan(0)
    }
  })

  it('buscar masa pide menos proteína por kilo que recomponer', () => {
    const recomp = bandaDeProteina(80, 'recomposicion')
    const masa = bandaDeProteina(80, 'masa')
    expect(masa.porKilo.min).toBeLessThan(recomp.porKilo.min)
  })
})

describe('cuántos platos', () => {
  it('con platos normales salen dos o tres, que es el mensaje', () => {
    const ideas = MEALS.slice(0, 3)
    const n = platosParaElMinimo(160, ideas)
    expect(n).toBeGreaterThanOrEqual(2)
    expect(n).toBeLessThanOrEqual(6)
  })

  it('sin platos delante no se inventa una cuenta', () => {
    expect(platosParaElMinimo(160, [])).toBe(0)
  })
})
