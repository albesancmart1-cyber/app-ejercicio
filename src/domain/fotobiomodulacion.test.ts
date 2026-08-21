import { describe, expect, it } from 'vitest'
import {
  dosisAcumulada,
  dosisDeSesion,
  escribirIrradiancia,
  escribirJulios,
  factorDistancia,
  lamparaCalculable,
  picosQueFaltan
} from './fotobiomodulacion'
import type { Lampara, SesionPBM } from './types'

/** El panel del ejemplo: cuatro ondas, 60 mW/cm² en total a 15 cm. */
const PANEL: Lampara = {
  id: 'panel',
  nombre: 'Panel del salón',
  distanciaRefCm: 15,
  ondas: [
    { nm: 630, irradiancia: 12 },
    { nm: 660, irradiancia: 18 },
    { nm: 810, irradiancia: 16 },
    { nm: 850, irradiancia: 14 }
  ]
}

const sesion = (extra: Partial<SesionPBM> = {}): SesionPBM => ({
  id: 's1',
  date: '2026-03-21',
  lamparaId: 'panel',
  minutos: 10,
  distanciaCm: 15,
  zona: 'espalda',
  ...extra
})

describe('la dosis de una sesión', () => {
  it('es potencia por tiempo: 60 mW/cm² diez minutos son 36 J/cm²', () => {
    // 60 mW/cm² × 600 s ÷ 1 000 = 36 J/cm². Es la cuenta entera, a mano.
    const d = dosisDeSesion(sesion(), PANEL)
    expect(d.julios).toBeCloseTo(36, 6)
  })

  it('se reparte por onda, que es lo que hace que el dato sirva', () => {
    const d = dosisDeSesion(sesion(), PANEL)
    expect(d.porOnda.map((o) => [o.nm, Number(o.julios.toFixed(1))])).toEqual([
      [630, 7.2],
      [660, 10.8],
      [810, 9.6],
      [850, 8.4]
    ])
    // Y las partes suman el todo.
    expect(d.porOnda.reduce((t, o) => t + o.julios, 0)).toBeCloseTo(d.julios, 6)
  })

  it('el doble de distancia entrega la cuarta parte', () => {
    const cerca = dosisDeSesion(sesion({ distanciaCm: 15 }), PANEL)
    const lejos = dosisDeSesion(sesion({ distanciaCm: 30 }), PANEL)
    expect(lejos.julios).toBeCloseTo(cerca.julios / 4, 6)
    expect(lejos.julios).toBeCloseTo(9, 6)
  })

  it('y la mitad de distancia, el cuádruple', () => {
    const d = dosisDeSesion(sesion({ distanciaCm: 7.5 }), PANEL)
    expect(d.julios).toBeCloseTo(144, 6)
  })

  it('el doble de minutos es el doble de dosis, sin más misterio', () => {
    const diez = dosisDeSesion(sesion({ minutos: 10 }), PANEL)
    const veinte = dosisDeSesion(sesion({ minutos: 20 }), PANEL)
    expect(veinte.julios).toBeCloseTo(diez.julios * 2, 6)
  })

  it('una sesión de cero minutos no entrega nada', () => {
    expect(dosisDeSesion(sesion({ minutos: 0 }), PANEL).julios).toBe(0)
  })

  it('pegar la lámpara a la piel no da una dosis infinita', () => {
    // Sin protección, distancia cero daría Infinity y envenenaría toda suma
    // posterior. Se trata como un centímetro.
    const d = dosisDeSesion(sesion({ distanciaCm: 0 }), PANEL)
    expect(Number.isFinite(d.julios)).toBe(true)
    expect(d.julios).toBeGreaterThan(0)
  })
})

describe('lo que va a la mitocondria', () => {
  it('en un panel de rojo e infrarrojo es casi todo', () => {
    const d = dosisDeSesion(sesion(), PANEL)
    expect(d.juliosMitocondria).toBeCloseTo(36, 6)
  })

  it('el azul de una lámpara no cuenta como mitocondria', () => {
    const mixta: Lampara = {
      id: 'mixta',
      nombre: 'Mixta',
      distanciaRefCm: 15,
      ondas: [
        { nm: 480, irradiancia: 30 },
        { nm: 660, irradiancia: 30 }
      ]
    }
    const d = dosisDeSesion(sesion({ lamparaId: 'mixta' }), mixta)
    expect(d.julios).toBeCloseTo(36, 6)
    expect(d.juliosMitocondria).toBeCloseTo(18, 6) // solo la mitad roja
  })

  it('el infrarrojo medio cuenta, pero a peso reducido', () => {
    const estufa: Lampara = {
      id: 'estufa',
      nombre: 'Estufa',
      distanciaRefCm: 15,
      ondas: [{ nm: 1500, irradiancia: 60 }]
    }
    const d = dosisDeSesion(sesion({ lamparaId: 'estufa' }), estufa)
    expect(d.julios).toBeCloseTo(36, 6)
    expect(d.juliosMitocondria).toBeLessThan(d.julios)
    expect(d.juliosMitocondria).toBeGreaterThan(0)
  })
})

describe('los picos de Karu', () => {
  it('el panel de cuatro ondas cubre tres, y falta el de 760', () => {
    const d = dosisDeSesion(sesion(), PANEL)
    expect(d.picos).toEqual([620, 680, 820])
    expect(picosQueFaltan(PANEL)).toEqual([760])
  })

  it('una bombilla de una sola onda deja tres sin cubrir', () => {
    const bombilla: Lampara = {
      id: 'b',
      nombre: 'Bombilla',
      distanciaRefCm: 30,
      ondas: [{ nm: 660, irradiancia: 5 }]
    }
    expect(picosQueFaltan(bombilla)).toEqual([620, 760, 820])
  })
})

describe('acumular varias sesiones', () => {
  it('suma las que se pueden calcular', () => {
    const total = dosisAcumulada(
      [sesion({ id: 'a' }), sesion({ id: 'b', minutos: 5 })],
      [PANEL]
    )
    expect(total.sesiones).toBe(2)
    expect(total.minutos).toBe(15)
    expect(total.julios).toBeCloseTo(54, 6)
  })

  it('una sesión cuya lámpara se borró no se cuenta, en vez de inventarle una media', () => {
    const total = dosisAcumulada(
      [sesion({ id: 'a' }), sesion({ id: 'huerfana', lamparaId: 'no-existe' })],
      [PANEL]
    )
    expect(total.sesiones).toBe(1)
    expect(total.julios).toBeCloseTo(36, 6)
  })

  it('sin sesiones, todo a cero y sin reventar', () => {
    expect(dosisAcumulada([], [PANEL])).toEqual({
      julios: 0,
      juliosMitocondria: 0,
      sesiones: 0,
      minutos: 0
    })
  })
})

describe('el factor de distancia', () => {
  it('vale uno en la distancia de referencia', () => {
    expect(factorDistancia(15, 15)).toBe(1)
  })

  it('y sigue el cuadrado en ambas direcciones', () => {
    expect(factorDistancia(30, 15)).toBeCloseTo(0.25, 6)
    expect(factorDistancia(60, 15)).toBeCloseTo(0.0625, 6)
    expect(factorDistancia(15, 30)).toBeCloseTo(4, 6)
  })
})

describe('si una lámpara se puede calcular', () => {
  it('el panel completo sí', () => {
    expect(lamparaCalculable(PANEL)).toBe(true)
  })

  it('una sin ondas no', () => {
    expect(lamparaCalculable({ ...PANEL, ondas: [] })).toBe(false)
  })

  it('una con una onda fuera de rango tampoco: eso es una errata', () => {
    expect(lamparaCalculable({ ...PANEL, ondas: [{ nm: 66, irradiancia: 10 }] })).toBe(false)
  })

  it('ni una sin irradiancia, que es justo el dato que falta para la dosis', () => {
    expect(lamparaCalculable({ ...PANEL, ondas: [{ nm: 660, irradiancia: 0 }] })).toBe(false)
  })
})

describe('cómo se escribe', () => {
  it('los julios con un decimal y coma', () => {
    expect(escribirJulios(36)).toBe('36,0 J/cm²')
    expect(escribirJulios(7.24)).toBe('7,2 J/cm²')
  })

  it('la irradiancia con su unidad', () => {
    expect(escribirIrradiancia(12)).toBe('12 mW/cm²')
    expect(escribirIrradiancia(4.5)).toBe('4,5 mW/cm²')
  })
})
