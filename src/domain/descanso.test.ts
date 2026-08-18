import { describe, expect, it } from 'vitest'
import {
  OLVIDO_SEGUNDOS,
  SALTO_SEGUNDOS,
  ajustar,
  empezarDescanso,
  haTerminado,
  proporcionRestante,
  recuperarDescanso,
  reloj,
  segundosRestantes
} from './descanso'

/** Un reloj fijo: sin él, una prueba de cuentas atrás no prueba nada. */
const T0 = 1_700_000_000_000
const mas = (segundos: number) => T0 + segundos * 1000

describe('empezar y contar', () => {
  it('arranca con el tiempo entero por delante', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    expect(segundosRestantes(d, T0)).toBe(120)
    expect(haTerminado(d, T0)).toBe(false)
    expect(d.totalSeconds).toBe(120)
  })

  it('cuenta contra el reloj, no restando: medio minuto después quedan 90', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    expect(segundosRestantes(d, mas(30))).toBe(90)
  })

  it('lo que se hizo mientras la pestaña estaba dormida también cuenta', () => {
    // El caso de verdad: el móvil se bloquea y se vuelve tres minutos después.
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    expect(segundosRestantes(d, mas(180))).toBe(0)
    expect(haTerminado(d, mas(180))).toBe(true)
  })

  it('no baja de cero por mucho que se tarde', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    expect(segundosRestantes(d, mas(10_000))).toBe(0)
  })

  it('el anillo va de uno a cero y no se sale', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    expect(proporcionRestante(d, T0)).toBe(1)
    expect(proporcionRestante(d, mas(60))).toBeCloseTo(0.5)
    expect(proporcionRestante(d, mas(999))).toBe(0)
  })

  it('recuerda qué serie fue, que es lo que permite volver a corregirla', () => {
    const d = empezarDescanso(2, 3, 90, 'Remo con banda', T0)
    expect(d.exercise).toBe(2)
    expect(d.set).toBe(3)
    expect(d.nextName).toBe('Remo con banda')
  })
})

describe('sumar y restar tiempo', () => {
  it('«+30 s» añade medio minuto al final y al total', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    const mas30 = ajustar(d, SALTO_SEGUNDOS, T0)
    expect(segundosRestantes(mas30, T0)).toBe(150)
    expect(mas30.totalSeconds).toBe(150)
  })

  it('«+30 s» sobre un descanso ya terminado cuenta desde ahora, no desde el final', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    // Han pasado tres minutos: llevaba un minuto en cero.
    const mas30 = ajustar(d, SALTO_SEGUNDOS, mas(180))
    expect(segundosRestantes(mas30, mas(180))).toBe(30)
  })

  it('«−30 s» quita medio minuto', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    const menos30 = ajustar(d, -SALTO_SEGUNDOS, T0)
    expect(segundosRestantes(menos30, T0)).toBe(90)
    expect(menos30.totalSeconds).toBe(90)
  })

  it('«−30 s» cuando quedan diez deja cero, no menos veinte', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    const casi = mas(110) // quedan 10
    expect(segundosRestantes(d, casi)).toBe(10)
    const menos30 = ajustar(d, -SALTO_SEGUNDOS, casi)
    expect(segundosRestantes(menos30, casi)).toBe(0)
    expect(haTerminado(menos30, casi)).toBe(true)
  })

  it('restar del todo no deja el anillo en un número imposible', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    const menos = ajustar(d, -SALTO_SEGUNDOS, mas(115))
    expect(menos.totalSeconds).toBeGreaterThan(0)
    const p = proporcionRestante(menos, mas(115))
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })

  it('sumar y restar se deshacen', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    const vuelta = ajustar(ajustar(d, SALTO_SEGUNDOS, T0), -SALTO_SEGUNDOS, T0)
    expect(segundosRestantes(vuelta, T0)).toBe(120)
    expect(vuelta.totalSeconds).toBe(120)
  })

  it('ajustar no toca el descanso anterior', () => {
    const d = empezarDescanso(0, 0, 120, undefined, T0)
    ajustar(d, SALTO_SEGUNDOS, T0)
    expect(d.totalSeconds).toBe(120)
  })
})

describe('recuperar el descanso al volver', () => {
  it('uno que sigue corriendo se recupera entero', () => {
    const d = empezarDescanso(1, 1, 120, undefined, T0)
    expect(recuperarDescanso(d, mas(40))).toEqual(d)
  })

  it('uno recién terminado también: es cuando toca seguir', () => {
    const d = empezarDescanso(1, 1, 120, undefined, T0)
    expect(recuperarDescanso(d, mas(130))).toEqual(d)
  })

  it('pero uno de hace media hora se deja ir', () => {
    const d = empezarDescanso(1, 1, 120, undefined, T0)
    expect(recuperarDescanso(d, mas(120 + OLVIDO_SEGUNDOS + 1))).toBeUndefined()
  })

  it('sin descanso guardado no se inventa ninguno', () => {
    expect(recuperarDescanso(undefined, T0)).toBeUndefined()
  })
})

describe('cómo se lee', () => {
  it('siempre con dos cifras en los segundos', () => {
    expect(reloj(72)).toBe('1:12')
    expect(reloj(65)).toBe('1:05')
    expect(reloj(9)).toBe('0:09')
    expect(reloj(0)).toBe('0:00')
    expect(reloj(120)).toBe('2:00')
  })
})
