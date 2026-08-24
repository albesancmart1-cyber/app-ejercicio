import { describe, expect, it } from 'vitest'
import {
  OZONO_DE_REFERENCIA,
  UVI_DE_REFERENCIA,
  diaDelAno,
  indiceUV,
  masaDeAire,
  ozonoDU
} from './atmosfera'
import { arcoDelDia } from './arcoSolar'

const MADRID = { lat: 40.4165, lon: -3.7026 }
const QUITO = { lat: -0.1807, lon: -78.4678 }
const SIDNEY = { lat: -33.8688, lon: 151.2093 }

describe('la masa de aire', () => {
  it('con el sol en la vertical se atraviesa una atmósfera y ni una más', () => {
    expect(masaDeAire(90)).toBeCloseTo(1, 3)
  })

  it('crece según el sol baja', () => {
    expect(masaDeAire(60)).toBeCloseTo(1.154, 2)
    // A 30° la cuenta ingenua daría 2 exactos; la corrección de curvatura ya
    // se nota y da 1,994. Esa diferencia es justo el motivo de usarla.
    expect(masaDeAire(30)).toBeCloseTo(1.994, 2)
    expect(masaDeAire(10)).toBeGreaterThan(5)
  })

  it('y en el horizonte no se dispara al infinito, que es para lo que existe', () => {
    // La cuenta ingenua, 1/cos(z), daría infinito. Kasten y Young dan ~38, que
    // es lo que se mide. Importa: casi todo el sol de quien trabaja es sol bajo.
    const alRas = masaDeAire(0)
    expect(alRas).toBeGreaterThan(30)
    expect(alRas).toBeLessThan(45)
    expect(Number.isFinite(alRas)).toBe(true)
  })
})

describe('el ozono', () => {
  it('crece con la latitud: hay más ozono encima de Oslo que de Quito', () => {
    expect(ozonoDU(0, '2026-03-21')).toBeLessThan(ozonoDU(40, '2026-03-21'))
    expect(ozonoDU(40, '2026-03-21')).toBeLessThan(ozonoDU(60, '2026-03-21'))
  })

  it('en el trópico casi no tiene estación, y en latitudes medias sí', () => {
    const tropico = Math.abs(ozonoDU(0, '2026-03-21') - ozonoDU(0, '2026-10-21'))
    const medias = Math.abs(ozonoDU(40, '2026-03-21') - ozonoDU(40, '2026-10-21'))
    expect(tropico).toBeLessThan(5)
    expect(medias).toBeGreaterThan(50)
  })

  it('tiene su máximo en primavera y su mínimo en otoño', () => {
    const marzo = ozonoDU(MADRID.lat, '2026-03-15')
    const octubre = ozonoDU(MADRID.lat, '2026-10-15')
    expect(marzo).toBeGreaterThan(octubre)
    // Y en el orden de la climatología conocida de Madrid.
    expect(marzo).toBeGreaterThan(345)
    expect(marzo).toBeLessThan(390)
    expect(octubre).toBeGreaterThan(285)
    expect(octubre).toBeLessThan(320)
  })

  it('y en el hemisferio sur la primavera es la otra, sin tocar nada', () => {
    // Es la comprobación que la lista de meses del código viejo nunca podía
    // pasar: allí «marzo» era invierno por decreto.
    const septiembre = ozonoDU(SIDNEY.lat, '2026-09-15')
    const marzo = ozonoDU(SIDNEY.lat, '2026-03-15')
    expect(septiembre).toBeGreaterThan(marzo)
  })

  it('el día del año se cuenta sin líos de zona horaria', () => {
    expect(diaDelAno('2026-01-01')).toBe(1)
    expect(diaDelAno('2026-12-31')).toBe(365)
    expect(diaDelAno('2024-12-31')).toBe(366) // bisiesto
  })
})

describe('el índice UV', () => {
  it('con el sol en la vertical y ozono de referencia da el 12,5 del ajuste', () => {
    expect(indiceUV(90, OZONO_DE_REFERENCIA)).toBeCloseTo(UVI_DE_REFERENCIA, 5)
  })

  /*
   * Las dos comprobaciones que atan el modelo a la realidad. Si alguien toca un
   * exponente, aquí se entera: son valores medidos, publicados todos los años
   * por la AEMET, y no salen de este código.
   */
  it('reproduce el UVI medido en Madrid en junio, que es ~9', () => {
    const elev = arcoDelDia('2026-06-21', MADRID, 120).elevacionMaxima
    const uvi = indiceUV(elev, ozonoDU(MADRID.lat, '2026-06-21'))
    expect(uvi).toBeGreaterThan(8.5)
    expect(uvi).toBeLessThan(11)
  })

  it('y el de diciembre, que es ~2', () => {
    const elev = arcoDelDia('2025-12-21', MADRID, 60).elevacionMaxima
    const uvi = indiceUV(elev, ozonoDU(MADRID.lat, '2025-12-21'))
    expect(uvi).toBeGreaterThan(1)
    expect(uvi).toBeLessThan(2.5)
  })

  it('en Quito, en el ecuador y sin apenas ozono, es mucho más alto', () => {
    const elev = arcoDelDia('2026-03-21', QUITO, -300).elevacionMaxima
    expect(indiceUV(elev, ozonoDU(QUITO.lat, '2026-03-21'))).toBeGreaterThan(12)
  })

  it('más ozono es menos UV', () => {
    expect(indiceUV(60, 400)).toBeLessThan(indiceUV(60, 300))
    expect(indiceUV(60, 250)).toBeGreaterThan(indiceUV(60, 300))
  })

  it('no hay ningún corte: la curva baja sola y no se cae de golpe', () => {
    // El modelo viejo valía 4,4 a 30,0° y cero a 29,9°. Ese acantilado era lo
    // menos preciso que tenía, y ya no está.
    for (let e = 1; e < 89; e++) {
      expect(indiceUV(e + 1)).toBeGreaterThan(indiceUV(e))
      const salto = indiceUV(e + 1) - indiceUV(e)
      expect(salto).toBeLessThan(0.6)
    }
    expect(indiceUV(29.9)).toBeGreaterThan(0)
    expect(indiceUV(1)).toBeGreaterThan(0)
  })

  it('y bajo el horizonte es cero, que ahí sí lo es', () => {
    expect(indiceUV(0)).toBe(0)
    expect(indiceUV(-5)).toBe(0)
  })
})
