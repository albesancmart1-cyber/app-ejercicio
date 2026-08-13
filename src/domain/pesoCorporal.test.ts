import { describe, expect, it } from 'vitest'
import {
  FRACCION_POR_DEFECTO,
  FRACCION_POR_PATRON,
  cargaCorporal,
  explicarCargaCorporal,
  fraccionCorporal
} from './pesoCorporal'
import { EXERCISES } from '../data/exercises'
import { patternOf } from '../data/patterns'

describe('qué fracción del cuerpo mueve cada ejercicio', () => {
  it('colgado se sube el cuerpo entero', () => {
    expect(fraccionCorporal('dominadas')).toBe(1)
  })

  it('tumbado o inclinado descuenta los apoyos', () => {
    // Una flexión no levanta los ochenta kilos: levanta lo que queda por encima
    // de los pies.
    expect(fraccionCorporal('flexiones')).toBeLessThan(1)
    expect(fraccionCorporal('flexiones')).toBeGreaterThan(0.4)
  })

  it('a una pierna se mueve casi todo el cuerpo', () => {
    expect(fraccionCorporal('sentadilla_bulgara')).toBeGreaterThan(
      fraccionCorporal('sentadilla_corporal')
    )
  })

  it('un ejercicio desconocido no rompe: cae en la fracción por defecto', () => {
    expect(fraccionCorporal('no-existe-este-id')).toBe(FRACCION_POR_DEFECTO)
  })

  it('ninguna fracción es absurda', () => {
    for (const [patron, f] of Object.entries(FRACCION_POR_PATRON)) {
      expect(f, patron).toBeGreaterThan(0)
      expect(f, patron).toBeLessThanOrEqual(1)
    }
  })

  it('todo ejercicio de peso corporal del catálogo tiene su patrón', () => {
    // Sin patrón se cae en la fracción por defecto, que para un ejercicio de
    // core o de dominadas sería un disparate. Esto lo caza al añadir catálogo.
    const sinPatron = EXERCISES.filter(
      (e) => e.equipment.includes('peso_corporal') && !patternOf(e.id)
    )
    expect(sinPatron.map((e) => e.id)).toEqual([])
  })
})

describe('los kilos que cuenta la serie', () => {
  it('sale del peso del usuario por la fracción del ejercicio', () => {
    // Dominadas a 80 kg: el cuerpo entero.
    expect(cargaCorporal('dominadas', 80)).toBe(80)
  })

  it('redondea a medio kilo, que es como se habla de peso', () => {
    const c = cargaCorporal('flexiones', 77)!
    expect(c * 2).toBe(Math.round(c * 2))
  })

  it('sin peso del usuario no se inventa un número', () => {
    // Devolver cero sería volver justo al problema que esto viene a resolver.
    expect(cargaCorporal('flexiones', undefined)).toBeUndefined()
    expect(cargaCorporal('flexiones', 0)).toBeUndefined()
  })

  it('la sentadilla búlgara deja de valer cero', () => {
    // El caso que motivó todo esto: semanas haciéndola sin mancuernas y la app
    // contándolo como una serie sin peso.
    const carga = cargaCorporal('sentadilla_bulgara', 80)
    expect(carga).toBeDefined()
    expect(carga!).toBeGreaterThan(50)
  })
})

describe('de dónde sale el número', () => {
  it('se explica con el porcentaje y el peso, para que no parezca inventado', () => {
    const texto = explicarCargaCorporal('dominadas', 80)!
    expect(texto).toContain('80')
    expect(texto).toMatch(/%/)
  })

  it('sin peso del usuario no hay nada que explicar', () => {
    expect(explicarCargaCorporal('dominadas', undefined)).toBeUndefined()
  })
})
