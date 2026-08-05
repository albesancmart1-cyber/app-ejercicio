import { describe, expect, it } from 'vitest'
import { CONTRIBUTIONS, contributionsOf } from './contributions'
import { EXERCISES } from './exercises'
import { ALL_MUSCLES } from '../domain/muscles'
import type { Muscle } from '../domain/muscles'

/**
 * Reglas del mapa de aportes musculares. Se prueban aquí y no en el motor
 * porque son decisiones sobre el catálogo: qué mueve cada ejercicio. Si mañana
 * se añade uno mal, el fallo aparece aquí y no tres pantallas más allá, en
 * forma de sesión rara.
 */

describe('el mapa está completo y es coherente', () => {
  const fuerza = EXERCISES.filter((e) => e.primary !== 'cardio')

  it('ningún ejercicio de fuerza se queda sin aportes', () => {
    for (const e of fuerza) {
      expect(Object.keys(contributionsOf(e.id)).length, e.id).toBeGreaterThan(0)
    }
  })

  it('todos los músculos citados existen', () => {
    for (const [id, aporte] of Object.entries(CONTRIBUTIONS)) {
      for (const m of Object.keys(aporte)) {
        expect(ALL_MUSCLES, `${id} cita «${m}»`).toContain(m as Muscle)
      }
    }
  })

  it('los aportes solo pueden ser 1 (motor) o 0,5 (acompaña)', () => {
    for (const [id, aporte] of Object.entries(CONTRIBUTIONS)) {
      for (const [m, valor] of Object.entries(aporte)) {
        expect([0.5, 1], `${id} → ${m}`).toContain(valor)
      }
    }
  })

  it('todo ejercicio de fuerza mueve algo como motor, no solo acompañando', () => {
    for (const e of fuerza) {
      const aporte = contributionsOf(e.id)
      expect(Object.values(aporte).some((v) => v === 1), e.id).toBe(true)
    }
  })

  it('no sobra ningún mapa: todo id del mapa está en el catálogo', () => {
    const ids = new Set(EXERCISES.map((e) => e.id))
    for (const id of Object.keys(CONTRIBUTIONS)) expect(ids, id).toContain(id)
  })
})

/**
 * El agarre.
 *
 * Aviso del usuario: «me exige hacer ejercicios de antebrazos, pero cuando hago
 * abdominales colgado en barra se exige bastante a los antebrazos, y cuando
 * hago peso muerto rumano también, y no lo cuenta».
 *
 * Tenía razón, y la simulación lo confirmó: sin contar el agarre salían 4,5
 * series semanales de antebrazo —por debajo del principio del rango productivo,
 * que es lo que hace que la app siga pidiendo más— y contándolo salen 7, dentro
 * del rango. Ver `scripts/medir-antebrazo.mjs`.
 */
describe('el agarre cuenta como trabajo de antebrazo', () => {
  const agarre = (id: string) => contributionsOf(id).antebrazo ?? 0

  it('en todo lo que se sostiene con la mano sin ayuda', () => {
    for (const id of [
      'peso_muerto_rumano',
      'peso_muerto_mancuernas',
      'peso_muerto_deficit',
      'peso_muerto_una_pierna',
      'remo_mancuerna',
      'remo_barra',
      'swing_kettlebell',
      'encogimientos'
    ]) {
      expect(agarre(id), id).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('y en todo lo que se hace colgado de una barra', () => {
    for (const id of ['dominadas', 'dominadas_supinas', 'dominadas_negativas', 'rodillas_colgado']) {
      expect(agarre(id), id).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('cargar peso andando o sujetarlo es trabajo de antebrazo a secas', () => {
    expect(agarre('paseo_granjero')).toBe(1)
  })

  it('pero acompañar no es entrenarlo: el agarre nunca pasa de 0,5', () => {
    // Si fuera 1, la app daría por entrenado el antebrazo cada vez que se hace
    // peso muerto y dejaría de proponerle trabajo directo para siempre.
    for (const id of ['peso_muerto_rumano', 'dominadas', 'remo_barra']) {
      expect(agarre(id), id).toBe(0.5)
    }
  })

  it('en máquinas y poleas no se cuenta: ahí el agarre no es lo que falla', () => {
    for (const id of ['jalon_polea', 'remo_polea_sentado', 'remo_maquina']) {
      expect(agarre(id), id).toBe(0)
    }
  })

  it('los ejercicios de agarre directo siguen siendo los únicos que lo trabajan a 1', () => {
    const directos = Object.entries(CONTRIBUTIONS)
      .filter(([, c]) => c.antebrazo === 1)
      .map(([id]) => id)
    expect(directos.length).toBeGreaterThanOrEqual(3)
    for (const id of directos) expect(EXERCISES.some((e) => e.id === id), id).toBe(true)
  })
})
