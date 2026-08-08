import { describe, expect, it } from 'vitest'
import { conDescanso, conNota, descansoDe, formatDescanso, notaDe, sinDescanso } from './preferencias'
import type { Profile } from './types'

const perfil = (p: Partial<Profile> = {}): Profile => ({
  name: 'Alberto',
  goal: 'recomposicion',
  equipment: ['peso_corporal'],
  maxWeights: {},
  ...p
})

describe('el descanso de cada ejercicio', () => {
  it('sin ajustar, manda lo que propuso el protocolo', () => {
    expect(descansoDe(perfil(), 'sentadilla_barra', 180)).toBe(180)
  })

  it('ajustado, manda lo del usuario', () => {
    const p = conDescanso(perfil(), 'sentadilla_barra', 240)
    expect(descansoDe(p, 'sentadilla_barra', 180)).toBe(240)
  })

  it('el ajuste es de ese ejercicio y no de los demás', () => {
    const p = conDescanso(perfil(), 'sentadilla_barra', 240)
    expect(descansoDe(p, 'curl_biceps', 90)).toBe(90)
  })

  it('quitarlo devuelve el ejercicio a lo que diga el protocolo', () => {
    const p = sinDescanso(conDescanso(perfil(), 'sentadilla_barra', 240), 'sentadilla_barra')
    expect(descansoDe(p, 'sentadilla_barra', 180)).toBe(180)
  })

  it('sin perfil ni ajuste no se rompe', () => {
    expect(descansoDe(null, 'x', 90)).toBe(90)
    expect(descansoDe(undefined, 'x', undefined)).toBeUndefined()
  })

  it('no toca el perfil que recibe', () => {
    const p = perfil()
    conDescanso(p, 'sentadilla_barra', 240)
    expect(p.restOverrides).toBeUndefined()
  })
})

describe('cómo se lee un descanso', () => {
  it('en segundos por debajo del minuto', () => {
    expect(formatDescanso(45)).toBe('45 s')
  })

  it('en minutos redondos', () => {
    expect(formatDescanso(120)).toBe('2′')
  })

  it('y con los segundos sueltos cuando los hay', () => {
    expect(formatDescanso(90)).toBe('1′30″')
  })
})

describe('las notas de cada ejercicio', () => {
  it('se guardan y se recuperan', () => {
    const p = conNota(perfil(), 'prensa', 'Asiento en el agujero 4')
    expect(notaDe(p, 'prensa')).toBe('Asiento en el agujero 4')
  })

  it('se limpian los espacios de los bordes', () => {
    expect(notaDe(conNota(perfil(), 'prensa', '  agujero 4  '), 'prensa')).toBe('agujero 4')
  })

  it('guardar una nota vacía es borrarla', () => {
    const conAlgo = conNota(perfil(), 'prensa', 'algo')
    const p = conNota(conAlgo, 'prensa', '   ')
    expect(notaDe(p, 'prensa')).toBe('')
    expect(p.exerciseNotes?.prensa).toBeUndefined()
  })

  it('sin nota devuelve cadena vacía, no undefined', () => {
    expect(notaDe(perfil(), 'prensa')).toBe('')
    expect(notaDe(null, 'prensa')).toBe('')
  })

  it('tampoco toca el perfil que recibe', () => {
    const p = perfil()
    conNota(p, 'prensa', 'algo')
    expect(p.exerciseNotes).toBeUndefined()
  })
})
