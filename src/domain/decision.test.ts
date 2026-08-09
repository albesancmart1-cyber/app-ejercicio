import { describe, expect, it } from 'vitest'
import { razonesCortas, resumenDelPlan, tituloDeHoy } from './decision'
import type { Readiness } from './readiness'
import type { Recommendation } from './types'

const base: Recommendation = {
  kind: 'fuerza',
  title: 'Fuerza · hombro',
  message: 'Tu cuerpo está receptivo.',
  focus: ['hombro', 'pecho'],
  intensity: 'media-alta',
  volumeScale: 1,
  rir: 2,
  reasons: ['El hombro lleva 4 días sin trabajarse']
}

const listo: Readiness = { score: 80, level: 'alto', avoid: [], notes: [], keto: true }

describe('qué toca hoy, en una palabra', () => {
  it('en fuerza, la zona que abre la sesión', () => {
    expect(tituloDeHoy(base)).toEqual({ gancho: 'Hoy toca', titular: 'Hombro' })
  })

  it('el descanso se llama descanso', () => {
    expect(tituloDeHoy({ ...base, kind: 'descanso_activo' }).titular).toBe('Descansar')
  })

  it('y el cardio suave, moverte suave', () => {
    expect(tituloDeHoy({ ...base, kind: 'cardio_suave' }).titular).toBe('Moverte suave')
  })

  it('sin zonas no se queda en blanco', () => {
    expect(tituloDeHoy({ ...base, focus: [] }).titular).toBe('Fuerza')
  })
})

describe('la línea de debajo', () => {
  it('enumera las zonas', () => {
    expect(resumenDelPlan(base)).toBe('hombro y pecho')
  })

  it('suma el cardio cuando lo hay', () => {
    expect(resumenDelPlan({ ...base, cardioMinutes: 20 })).toContain('20 min de cardio')
  })

  it('el día de descanso dice para qué sirve', () => {
    expect(resumenDelPlan({ ...base, kind: 'descanso_activo' })).toMatch(/construye/)
  })
})

describe('las razones, en corto', () => {
  it('coge tres como mucho: más deja de leerse', () => {
    const r = razonesCortas(
      { ...base, reasons: ['a', 'b', 'c', 'd', 'e'] },
      { ...listo, notes: ['f'] }
    )
    expect(r).toHaveLength(3)
  })

  it('mezcla las de la recomendación con las del check-in', () => {
    const r = razonesCortas({ ...base, reasons: ['uno'] }, { ...listo, notes: ['dos'] })
    expect(r.map((x) => x.texto)).toEqual(['uno', 'dos'])
  })

  it('marca de aviso lo que habla de molestias o fatiga', () => {
    const r = razonesCortas({ ...base, reasons: ['Tienes molestias en el hombro'] }, listo)
    expect(r[0].tono).toBe('ojo')
  })

  it('y de bien lo que habla de estar descansado', () => {
    const r = razonesCortas({ ...base, reasons: ['Vienes bien descansado'] }, listo)
    expect(r[0].tono).toBe('bien')
  })

  it('lo demás se queda neutro, sin colorear porque sí', () => {
    const r = razonesCortas({ ...base, reasons: ['El hombro abre la sesión'] }, listo)
    expect(r[0].tono).toBe('neutro')
  })
})
