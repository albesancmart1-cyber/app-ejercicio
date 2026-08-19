import { describe, expect, it } from 'vitest'
import { DIAS_MINIMOS, computeLeptinSignal, explicarCobertura } from './leptin'
import type { CheckIn } from './types'

const HOY = '2026-08-19'

function menos(dias: number): string {
  const d = new Date(`${HOY}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - dias)
  return d.toISOString().slice(0, 10)
}

/** Un día contestado y con todo a favor. */
function buenDia(dias: number): CheckIn {
  return {
    date: menos(dias),
    sleep: 5,
    lightHygiene: true,
    sunrise: true,
    sunsetYesterday: true,
    sunExposure: true,
    keto: false,
    energy: 5,
    discomfort: 'ninguna',
    wokeHungry: false,
    cravings: false
  }
}

/** Un día contestado y con todo en contra. */
function malDia(dias: number): CheckIn {
  return {
    ...buenDia(dias),
    sleep: 1,
    energy: 1,
    lightHygiene: false,
    sunrise: false,
    sunsetYesterday: false,
    sunExposure: false,
    wokeHungry: true,
    cravings: true
  }
}

const semanaEntera = Array.from({ length: 7 }, (_, i) => buenDia(i))

describe('los días sin contestar cuentan', () => {
  it('una semana entera de días buenos sí llega a «alta»', () => {
    const s = computeLeptinSignal(semanaEntera, HOY)
    expect(s.days).toBe(7)
    expect(s.diasSinContestar).toBe(0)
    expect(s.level).toBe('alta')
    expect(s.score).toBe(s.scoreBruto)
  })

  it('dos días buenos y cinco en blanco NO son una señal limpia', () => {
    // El fallo que motiva esto: la media se hacía solo sobre los días
    // contestados, así que dos días buenos daban «93 sobre 100, alta».
    const s = computeLeptinSignal([buenDia(5), buenDia(6)], HOY)
    expect(s.days).toBe(2)
    expect(s.diasSinContestar).toBe(5)
    expect(s.scoreBruto).toBeGreaterThan(85)
    expect(s.level).not.toBe('alta')
    expect(s.score).toBeLessThan(s.scoreBruto)
  })

  it('dejar de contestar nunca sube la puntuación', () => {
    const entera = computeLeptinSignal(semanaEntera, HOY)
    for (let contestados = 1; contestados <= 7; contestados++) {
      const s = computeLeptinSignal(semanaEntera.slice(0, contestados), HOY)
      expect(s.score, `${contestados} días`).toBeLessThanOrEqual(entera.score)
    }
  })

  it('cuantos más días se contestan, más se acerca la cifra a la real', () => {
    const scores = [1, 3, 5, 7].map((n) => computeLeptinSignal(semanaEntera.slice(0, n), HOY).score)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i], `${scores}`).toBeGreaterThan(scores[i - 1])
    }
  })

  it('los días repetidos no cuentan dos veces', () => {
    const dobles: CheckIn[] = [buenDia(1), { ...buenDia(1), energy: 4 }, buenDia(2)]
    expect(computeLeptinSignal(dobles, HOY).days).toBe(2)
  })

  it('lo de hace ocho días queda fuera de la ventana', () => {
    const s = computeLeptinSignal([buenDia(8), buenDia(9)], HOY)
    expect(s.days).toBe(0)
    expect(s.diasSinContestar).toBe(7)
  })

  it('una semana mala tampoco se dispara por dos días sueltos', () => {
    const dos = computeLeptinSignal([malDia(1), malDia(2)], HOY)
    const siete = computeLeptinSignal(Array.from({ length: 7 }, (_, i) => malDia(i)), HOY)
    expect(siete.level).toBe('baja')
    // Con dos días, la cifra sigue siendo peor que el medio pero no tan extrema.
    expect(dos.score).toBeGreaterThan(siete.score)
    expect(dos.score).toBeLessThan(50)
  })

  it('con menos de tres días no se da veredicto, se dice que faltan', () => {
    const s = computeLeptinSignal([buenDia(1), buenDia(2)], HOY)
    expect(s.days).toBeLessThan(DIAS_MINIMOS)
    expect(s.muscleNote).toMatch(/no lo sé/i)
    expect(s.muscleNote).toMatch(/2 días/)
  })

  it('con un solo día no se cantan siete aciertos sobre la semana', () => {
    // Un check-in bueno llenaba la tarjeta de «estás durmiendo bien», «la luz de
    // la mañana está haciendo su trabajo»… con un día de datos, y encima justo
    // debajo del aviso de que faltaban días.
    const uno = computeLeptinSignal([buenDia(1)], HOY)
    expect(uno.helping).toEqual([])
    expect(uno.hurting).toEqual([])
    // Y con la semana entera sí se dicen, que para eso están.
    expect(computeLeptinSignal(semanaEntera, HOY).helping.length).toBeGreaterThan(3)
  })

  it('tampoco se cantan fallos con un solo día malo', () => {
    expect(computeLeptinSignal([malDia(1)], HOY).hurting).toEqual([])
    expect(computeLeptinSignal(Array.from({ length: 7 }, (_, i) => malDia(i)), HOY).hurting.length)
      .toBeGreaterThan(3)
  })

  it('sin ningún check-in la cifra es cero y se dice', () => {
    const s = computeLeptinSignal([], HOY)
    expect(s.score).toBe(0)
    expect(s.days).toBe(0)
    expect(s.diasSinContestar).toBe(7)
    expect(s.muscleNote).toMatch(/Aún no hay check-ins/)
  })
})

describe('cómo se cuenta lo que falta', () => {
  it('con la semana entera no hay nada que explicar', () => {
    expect(explicarCobertura(computeLeptinSignal(semanaEntera, HOY))).toBeUndefined()
  })

  it('con días sueltos dice cuántos faltan y que cuentan', () => {
    const texto = explicarCobertura(computeLeptinSignal([buenDia(1), buenDia(2)], HOY))
    expect(texto).toMatch(/5 de los últimos 7 días/)
  })

  it('con la mayoría contestada dice que la cifra va descontada', () => {
    const texto = explicarCobertura(computeLeptinSignal(semanaEntera.slice(0, 5), HOY))
    expect(texto).toMatch(/2 de los últimos 7 días/)
    expect(texto).toMatch(/también cuentan/)
  })
})
