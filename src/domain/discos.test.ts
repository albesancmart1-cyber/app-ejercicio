import { describe, expect, it } from 'vitest'
import {
  BARRA_ESTANDAR,
  calentamientoPara,
  describirReparto,
  redondearA,
  repartirDiscos
} from './discos'

describe('repartir discos en la barra', () => {
  it('un peso redondo sale exacto', () => {
    // 60 kg = barra de 20 + 20 por lado.
    const r = repartirDiscos(60)
    expect(r.porLado).toEqual([20])
    expect(r.totalKg).toBe(60)
    expect(r.desvioKg).toBe(0)
  })

  it('reparte de mayor a menor, que es como se monta a mano', () => {
    // 100 kg = 20 de barra + 40 por lado = 25 + 15
    expect(repartirDiscos(100).porLado).toEqual([25, 15])
  })

  it('llega hasta el disco más pequeño', () => {
    // 62,5 = 20 + 21,25 por lado = 20 + 1,25
    const r = repartirDiscos(62.5)
    expect(r.porLado).toEqual([20, 1.25])
    expect(r.desvioKg).toBe(0)
  })

  it('lo que no se puede montar exacto se dice, no se disimula', () => {
    // 61 kg no sale con discos de 1,25 como mínimo: se queda en 60.
    const r = repartirDiscos(61)
    expect(r.totalKg).toBe(60)
    expect(r.desvioKg).toBe(-1)
  })

  it('con el peso de la barra, ningún disco', () => {
    const r = repartirDiscos(20)
    expect(r.porLado).toEqual([])
    expect(r.totalKg).toBe(BARRA_ESTANDAR)
  })

  it('por debajo de la barra avisa de que no se puede', () => {
    const r = repartirDiscos(15)
    expect(r.imposible).toBe(true)
  })

  it('admite otra barra y otros discos', () => {
    // Barra Z de 10 kg con discos pequeños.
    const r = repartirDiscos(30, { barraKg: 10, discos: [5, 2.5] })
    expect(r.porLado).toEqual([5, 5])
    expect(r.totalKg).toBe(30)
  })

  it('siempre pone lo mismo a los dos lados', () => {
    for (const objetivo of [40, 55, 82.5, 137.5]) {
      const r = repartirDiscos(objetivo)
      const suma = r.porLado.reduce((a, b) => a + b, 0)
      expect(r.totalKg, `${objetivo}`).toBe(r.barraKg + suma * 2)
    }
  })

  it('nunca se pasa del objetivo', () => {
    for (const objetivo of [61, 73, 99, 101.3]) {
      expect(repartirDiscos(objetivo).totalKg, `${objetivo}`).toBeLessThanOrEqual(objetivo)
    }
  })
})

describe('cómo se lee el reparto', () => {
  it('agrupa los discos repetidos', () => {
    expect(describirReparto(repartirDiscos(110))).toBe('1×25 + 1×20')
    expect(describirReparto(repartirDiscos(120))).toBe('2×25')
  })

  it('sin discos lo dice', () => {
    expect(describirReparto(repartirDiscos(20))).toBe('Solo la barra')
  })

  it('y si no llega ni a la barra, también', () => {
    expect(describirReparto(repartirDiscos(10))).toMatch(/Solo la barra pesa/)
  })
})

describe('el calentamiento por porcentajes', () => {
  it('sube de peso y baja de repeticiones', () => {
    const s = calentamientoPara(100, { salto: 2.5 })
    expect(s.map((x) => x.weightKg)).toEqual([40, 60, 80])
    expect(s.map((x) => x.reps)).toEqual([8, 5, 3])
  })

  it('redondea al peso que se puede montar', () => {
    // El 40 % de 47,5 es 19: con saltos de 2,5 se queda en 20.
    expect(calentamientoPara(47.5, { salto: 2.5 })[0].weightKg).toBe(20)
  })

  it('con mancuernas que saltan de 2 en 2, redondea a eso', () => {
    const s = calentamientoPara(24, { salto: 2 })
    expect(s.every((x) => x.weightKg % 2 === 0)).toBe(true)
  })

  it('descarta lo que no se puede montar por ligero', () => {
    // Con 10 kg de trabajo y saltos de 2,5, el 40 % son 4 → redondea a 5.
    const s = calentamientoPara(10, { salto: 2.5, minimoKg: 5 })
    expect(s.every((x) => x.weightKg >= 5)).toBe(true)
  })

  it('no repite dos veces la misma serie', () => {
    // Con pesos bajos, dos escalones caen en el mismo sitio al redondear.
    const s = calentamientoPara(12, { salto: 5 })
    expect(new Set(s.map((x) => x.weightKg)).size).toBe(s.length)
  })

  it('ningún calentamiento pesa tanto como la serie de trabajo', () => {
    for (const trabajo of [20, 37.5, 60, 100]) {
      for (const s of calentamientoPara(trabajo, { salto: 2.5 })) {
        expect(s.weightKg, `${trabajo}`).toBeLessThan(trabajo)
      }
    }
  })

  it('sin peso de trabajo no hay nada que calcular', () => {
    expect(calentamientoPara(0)).toEqual([])
    expect(calentamientoPara(Number.NaN)).toEqual([])
  })
})

describe('redondeo', () => {
  it('va al múltiplo más cercano', () => {
    expect(redondearA(19, 2.5)).toBe(20)
    expect(redondearA(18, 2.5)).toBe(17.5)
  })

  it('sin salto no toca el número', () => {
    expect(redondearA(19.3, 0)).toBe(19.3)
  })
})
