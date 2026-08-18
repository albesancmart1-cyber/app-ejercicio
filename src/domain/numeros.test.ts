import { describe, expect, it } from 'vitest'
import { escribirKg, escribirNumero, leerNumero, textoEnCurso } from './numeros'

describe('leer lo que se escribe en una casilla', () => {
  it('la coma española es un decimal, no basura que tirar', () => {
    // El fallo que motiva todo esto: «102,5» se guardaba como 1025.
    expect(leerNumero('102,5')).toBe(102.5)
    expect(leerNumero('102,5')).not.toBe(1025)
  })

  it('el punto también vale, que es lo que sale de algunos teclados', () => {
    expect(leerNumero('102.5')).toBe(102.5)
  })

  it('los enteros pasan tal cual', () => {
    expect(leerNumero('40')).toBe(40)
    expect(leerNumero('0')).toBe(0)
  })

  it('los espacios no estorban', () => {
    expect(leerNumero(' 22,5 ')).toBe(22.5)
  })

  it('lo que no es un número no se inventa', () => {
    for (const basura of ['', '   ', 'ocho', '12a', '1.2.3', '1,2,3', ',', '.', '-']) {
      expect(leerNumero(basura), basura).toBeUndefined()
    }
  })

  it('vacío es «no lo he anotado», no «pesaba cero»', () => {
    expect(leerNumero('')).toBeUndefined()
    expect(leerNumero('')).not.toBe(0)
  })

  it('deja escribir a medias: «102,» todavía no es un decimal', () => {
    // No es un número aún, pero tampoco puede convertirse en 1020.
    expect(leerNumero('102,')).toBe(102)
  })
})

describe('escribir números', () => {
  it('la coma es la nuestra', () => {
    expect(escribirNumero(102.5)).toBe('102,5')
    expect(escribirKg(102.5)).toBe('102,5 kg')
  })

  it('sin ceros de relleno', () => {
    expect(escribirNumero(40)).toBe('40')
    expect(escribirNumero(40.0)).toBe('40')
    expect(escribirKg(40)).toBe('40 kg')
  })

  it('ida y vuelta: lo escrito se vuelve a leer igual', () => {
    for (const n of [0, 1, 2.5, 40, 102.5, 22.25]) {
      expect(leerNumero(escribirNumero(n)), `${n}`).toBe(n)
    }
  })
})

describe('el texto mientras se teclea', () => {
  it('respeta lo que se está escribiendo si dice lo mismo que el valor', () => {
    expect(textoEnCurso('102,', 102)).toBe('102,')
    expect(textoEnCurso('102,5', 102.5)).toBe('102,5')
  })

  it('pero si el valor cambió por fuera, manda el valor', () => {
    expect(textoEnCurso('102,5', 40)).toBe('40')
  })

  it('sin valor, se deja la casilla como está', () => {
    expect(textoEnCurso('', undefined)).toBe('')
    expect(textoEnCurso(',', undefined)).toBe(',')
  })
})
