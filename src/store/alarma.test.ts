import { describe, expect, it } from 'vitest'
import { duracionDeAlarma, pulsosDeAlarma } from './alarma'

describe('el patrón de la alarma', () => {
  const pulsos = pulsosDeAlarma()

  it('son tres pulsos: con uno no te enteras y con cinco parece una urgencia', () => {
    expect(pulsos).toHaveLength(3)
  })

  it('van cortos, que una alarma larga en un gimnasio molesta a todo el mundo', () => {
    expect(Math.max(...pulsos.map((p) => p.dura))).toBeLessThanOrEqual(0.4)
    expect(duracionDeAlarma()).toBeLessThan(1)
  })

  it('acaba subiendo, que es lo que se reconoce como «se acabó»', () => {
    expect(pulsos[pulsos.length - 1].hz).toBeGreaterThan(pulsos[0].hz)
  })

  it('se queda donde el oído es más sensible y el gimnasio menos ruidoso', () => {
    for (const p of pulsos) {
      expect(p.hz).toBeGreaterThanOrEqual(700)
      expect(p.hz).toBeLessThanOrEqual(1400)
    }
  })

  it('los pulsos no se solapan entre ellos', () => {
    for (let i = 1; i < pulsos.length; i++) {
      expect(pulsos[i].en).toBeGreaterThanOrEqual(pulsos[i - 1].en + pulsos[i - 1].dura)
    }
  })
})
