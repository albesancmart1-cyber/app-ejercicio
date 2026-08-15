import { describe, expect, it } from 'vitest'
import {
  CARTAS_EN_JUEGO,
  FILAS,
  cartaActual,
  filaActual,
  filaDe,
  levantar,
  nuevaPiramide,
  posicionDe,
  quedanCartas
} from './piramide'
import { NUMEROS, PALOS, barajaCompleta } from '../data/baraja'

/** Azar fijo: sin esto, una prueba de un juego de cartas no prueba nada. */
const fijo = () => 0

describe('la baraja española', () => {
  it('tiene cuarenta cartas: sin ochos ni nueves', () => {
    const b = barajaCompleta()
    expect(b).toHaveLength(40)
    expect(NUMEROS).not.toContain(8 as never)
    expect(NUMEROS).not.toContain(9 as never)
  })

  it('cuatro palos con diez cartas cada uno', () => {
    const b = barajaCompleta()
    for (const palo of PALOS) {
      expect(b.filter((c) => c.palo === palo), palo).toHaveLength(10)
    }
  })

  it('ninguna carta se repite', () => {
    const ids = barajaCompleta().map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('la pirámide', () => {
  it('son cinco filas de 5, 4, 3, 2 y 1: quince cartas', () => {
    expect([...FILAS]).toEqual([5, 4, 3, 2, 1])
    expect(CARTAS_EN_JUEGO).toBe(15)
    expect(nuevaPiramide(fijo).cartas).toHaveLength(15)
  })

  it('empieza entera boca abajo', () => {
    const p = nuevaPiramide(fijo)
    expect(p.levantadas).toBe(0)
    expect(cartaActual(p)).toBeNull()
    expect(filaDe(p, 0).every((c) => !c.levantada)).toBe(true)
  })

  it('las quince cartas repartidas son distintas', () => {
    const ids = nuevaPiramide(fijo).cartas.map((c) => c.id)
    expect(new Set(ids).size).toBe(15)
  })

  it('el recorrido va de izquierda a derecha y de la base a la cúspide', () => {
    // Las cinco primeras son la fila de abajo, en orden.
    expect(posicionDe(0)).toEqual({ fila: 0, columna: 0 })
    expect(posicionDe(4)).toEqual({ fila: 0, columna: 4 })
    // La sexta abre la segunda fila.
    expect(posicionDe(5)).toEqual({ fila: 1, columna: 0 })
    expect(posicionDe(8)).toEqual({ fila: 1, columna: 3 })
    // Y la última es la cúspide, ella sola.
    expect(posicionDe(14)).toEqual({ fila: 4, columna: 0 })
  })

  it('cada carta cae en una posición y solo una', () => {
    const vistas = new Set<string>()
    for (let i = 0; i < CARTAS_EN_JUEGO; i++) {
      const { fila, columna } = posicionDe(i)
      expect(columna, `la columna ${columna} no cabe en la fila ${fila}`).toBeLessThan(FILAS[fila])
      vistas.add(`${fila}-${columna}`)
    }
    expect(vistas.size).toBe(CARTAS_EN_JUEGO)
  })

  it('levantar destapa una sola y en orden', () => {
    let p = nuevaPiramide(fijo)
    const primera = p.cartas[0]
    p = levantar(p)
    expect(p.levantadas).toBe(1)
    expect(cartaActual(p)).toEqual(primera)
    expect(filaDe(p, 0)[0].levantada).toBe(true)
    expect(filaDe(p, 0)[1].levantada).toBe(false)
  })

  it('no se puede levantar más allá de la cúspide', () => {
    let p = nuevaPiramide(fijo)
    for (let i = 0; i < CARTAS_EN_JUEGO; i++) p = levantar(p)
    expect(quedanCartas(p)).toBe(false)
    const fin = levantar(p)
    expect(fin.levantadas).toBe(CARTAS_EN_JUEGO)
  })

  it('sabe en qué fila va, para poder decirlo', () => {
    let p = nuevaPiramide(fijo)
    expect(filaActual(p)).toBe(0)
    for (let i = 0; i < 5; i++) p = levantar(p)
    // Con las cinco de abajo levantadas, la última fue de la primera fila.
    expect(filaActual(p)).toBe(0)
    p = levantar(p)
    expect(filaActual(p)).toBe(1)
  })

  it('levantar no toca la pirámide anterior', () => {
    const p = nuevaPiramide(fijo)
    levantar(p)
    expect(p.levantadas).toBe(0)
  })
})
