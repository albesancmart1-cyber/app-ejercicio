import { describe, expect, it } from 'vitest'
import {
  NM_PICO_VITAMINA_D,
  W_M2_POR_UVI,
  mwCm2AWm2,
  pesoEritematico,
  pesoVitaminaD
} from './espectroAccion'

describe('la curva de la quemadura', () => {
  it('vale uno hasta los 298 nm, que es lo que dice la norma', () => {
    expect(pesoEritematico(280)).toBe(1)
    expect(pesoEritematico(298)).toBe(1)
  })

  it('y cae en dos tramos exponenciales, con el codo en 328', () => {
    // 10^(0,094·(298−308)) = 10^(−0,94) = 0,1148
    expect(pesoEritematico(308)).toBeCloseTo(0.1148, 4)
    // 10^(0,094·(298−328)) = 0,00151
    expect(pesoEritematico(328)).toBeCloseTo(0.00151, 5)
    /*
     * Los dos tramos no empalman clavados: en el codo hay un escalón del 3 %,
     * y es de la fórmula publicada, no nuestro. Se comprueba que sigue siendo
     * pequeño para que nadie lo tape «arreglándolo» con un tercer tramo.
     */
    expect(pesoEritematico(328.001) / pesoEritematico(328)).toBeGreaterThan(0.95)
    expect(pesoEritematico(328.001) / pesoEritematico(328)).toBeLessThan(1)
  })

  it('baja siempre, nunca sube', () => {
    for (let nm = 280; nm < 400; nm++) {
      expect(pesoEritematico(nm + 1), `${nm}`).toBeLessThanOrEqual(pesoEritematico(nm))
    }
  })

  it('fuera del ultravioleta es cero: el rojo no quema', () => {
    expect(pesoEritematico(401)).toBe(0)
    expect(pesoEritematico(660)).toBe(0)
    expect(pesoEritematico(NaN)).toBe(0)
  })
})

describe('la curva de la vitamina D', () => {
  it('tiene su máximo en 297 nm, que es donde lo pone la CIE', () => {
    expect(pesoVitaminaD(NM_PICO_VITAMINA_D)).toBe(1)
    for (const nm of [285, 290, 295, 300, 305, 310]) {
      expect(pesoVitaminaD(nm), `${nm}`).toBeLessThan(1)
    }
  })

  it('casi todo ocurre entre 295 y 300 nm', () => {
    expect(pesoVitaminaD(295)).toBeGreaterThan(0.9)
    expect(pesoVitaminaD(300)).toBeGreaterThan(0.9)
  })

  it('y por encima de 315 nm ya no queda nada apreciable', () => {
    expect(pesoVitaminaD(315)).toBeLessThan(0.05)
    expect(pesoVitaminaD(320)).toBeLessThan(0.01)
    expect(pesoVitaminaD(330)).toBe(0)
    expect(pesoVitaminaD(360)).toBe(0)
  })

  it('el rojo y el infrarrojo no fabrican vitamina D, por mucha potencia que traigan', () => {
    expect(pesoVitaminaD(660)).toBe(0)
    expect(pesoVitaminaD(850)).toBe(0)
  })

  it('se interpola en logaritmo, no en recta, porque la caída es de órdenes', () => {
    // En recta, el punto medio entre 305 (0,45) y 310 (0,13) daría 0,29. En
    // logaritmo da 0,24, que es la forma real de una caída exponencial.
    const medio = pesoVitaminaD(307.5)
    expect(medio).toBeLessThan((0.45 + 0.13) / 2)
    expect(medio).toBeCloseTo(Math.sqrt(0.45 * 0.13), 2)
  })

  it('nunca sube al bajar de longitud desde el pico hacia el rojo', () => {
    for (let nm = 297; nm < 335; nm++) {
      expect(pesoVitaminaD(nm + 1), `${nm}`).toBeLessThanOrEqual(pesoVitaminaD(nm))
    }
  })
})

describe('las dos curvas comparadas', () => {
  it('la de la vitamina D se acaba mucho antes que la de la quemadura', () => {
    /*
     * Es la razón de que haya que pesarlas por separado en vez de multiplicar
     * el UVB por una constante. Por encima de 315 nm la síntesis se apaga y la
     * quemadura no: a 330 nm una vale cero y la otra sigue contando, y todo el
     * UVA que viene después quema sin fabricar ni una unidad.
     */
    expect(pesoVitaminaD(320) / pesoEritematico(320)).toBeLessThan(0.5)
    expect(pesoVitaminaD(330)).toBe(0)
    expect(pesoEritematico(330)).toBeGreaterThan(0)
    expect(pesoVitaminaD(360)).toBe(0)
    expect(pesoEritematico(360)).toBeGreaterThan(0)
  })

  it('y en el pico de la vitamina D la quemadura todavía va al máximo', () => {
    // Por eso una lámpara de 297 nm fabrica mucho y quema deprisa a la vez.
    expect(pesoVitaminaD(297)).toBe(1)
    expect(pesoEritematico(297)).toBe(1)
  })
})

describe('las unidades', () => {
  it('un punto de índice UV son 0,025 W/m² eritemáticos', () => {
    expect(W_M2_POR_UVI).toBe(0.025)
  })

  it('y los mW/cm² de las lámparas son diez veces eso en W/m²', () => {
    expect(mwCm2AWm2(1)).toBe(10)
    expect(mwCm2AWm2(0.05)).toBeCloseTo(0.5, 6)
  })
})
