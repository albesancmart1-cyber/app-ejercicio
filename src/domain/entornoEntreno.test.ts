import { describe, expect, it } from 'vitest'
import { hayEntorno, minutosDeDescanso, minutosDeSesion, minutosFueraDelEntreno } from './entornoEntreno'
import { DESCANSO_ENTRE_EJERCICIOS } from './protocol'
import type { EntornoDeEntreno, Session } from './types'

/** Un ejercicio con `series` series registradas y su descanso prescrito. */
const ej = (series: number, restSeconds: number) => ({
  exerciseId: 'x',
  name: 'Ejercicio',
  primary: 'pecho' as const,
  plan: { sets: series, reps: '8-10', restSeconds },
  logs: Array.from({ length: series }, () => ({ reps: 8, done: true }))
})

const sesion = (extra: Partial<Session> = {}): Session => ({
  id: 's1',
  date: '2026-08-25',
  kind: 'fuerza',
  title: 'Empuje',
  exercises: [ej(3, 90), ej(3, 90)],
  completed: false,
  durationSec: 60 * 60,
  ...extra
})

describe('los descansos de un entreno', () => {
  it('suma lo prescrito entre series y entre ejercicios', () => {
    // Dos ejercicios de tres series: dos descansos dentro de cada uno a 90 s,
    // más uno entre ejercicios de 120 s. 4×90 + 120 = 480 s = 8 min.
    expect(minutosDeDescanso(sesion())).toBe(Math.round((4 * 90 + DESCANSO_ENTRE_EJERCICIOS) / 60))
  })

  it('no cuenta descanso tras la última serie del último ejercicio', () => {
    // Ahí ya no se descansa para nada: se termina.
    const uno = sesion({ exercises: [ej(3, 90)] })
    expect(minutosDeDescanso(uno)).toBe(3)
  })

  it('un ejercicio sin series registradas no aporta descanso', () => {
    const conVacio = sesion({ exercises: [ej(3, 90), { ...ej(3, 90), logs: [] }] })
    // Solo los dos descansos del primero: el segundo no se hizo.
    expect(minutosDeDescanso(conVacio)).toBe(3)
  })

  it('y sin descanso prescrito no se inventa uno', () => {
    const sinDescanso = sesion({ exercises: [ej(3, 0)] })
    expect(minutosDeDescanso(sinDescanso)).toBe(0)
  })
})

describe('cuánto de un entreno cuenta como estar fuera', () => {
  it('entrenar al aire libre cuenta entero', () => {
    expect(minutosFueraDelEntreno(sesion({ entorno: { fuera: true } }))).toBe(60)
  })

  it('con los descansos fuera cuentan los descansos', () => {
    const r = minutosFueraDelEntreno(sesion({ entorno: { descansosFuera: true } }))
    expect(r).toBe(minutosDeDescanso(sesion()))
    expect(r).toBeGreaterThan(0)
  })

  it('entrenar dentro sin salir no cuenta nada, y eso también es una respuesta', () => {
    expect(minutosFueraDelEntreno(sesion({ entorno: { perfilLuzId: 'gim' } }))).toBe(0)
    expect(minutosFueraDelEntreno(sesion())).toBe(0)
  })

  it('los descansos nunca pueden pasar de lo que duró la sesión', () => {
    // Un plan con descansos larguísimos y una sesión corta no puede dejar más
    // minutos de calle de los que estuviste entrenando.
    const corta = sesion({ durationSec: 5 * 60, entorno: { descansosFuera: true } })
    expect(minutosFueraDelEntreno(corta)).toBeLessThanOrEqual(5)
  })

  it('estar fuera manda sobre los descansos, no se suman', () => {
    const ambos = sesion({ entorno: { fuera: true, descansosFuera: true } })
    expect(minutosFueraDelEntreno(ambos)).toBe(60)
  })
})

describe('cuánto duró la sesión', () => {
  it('con la duración guardada, exacto', () => {
    expect(minutosDeSesion(sesion({ durationSec: 90 * 60 }))).toBe(90)
  })

  it('y abierta, contra el reloj desde que se pulsó empezar', () => {
    const abierta = sesion({ durationSec: undefined, startedAt: 1_000_000 })
    expect(minutosDeSesion(abierta, 1_000_000 + 30 * 60000)).toBe(30)
  })

  it('sin empezar, cero', () => {
    expect(minutosDeSesion(sesion({ durationSec: undefined }))).toBe(0)
  })
})

describe('si el entorno dice algo', () => {
  it('vacío o ausente, no', () => {
    expect(hayEntorno(undefined)).toBe(false)
    expect(hayEntorno({})).toBe(false)
  })

  it('con cualquiera de sus datos, sí', () => {
    const casos: EntornoDeEntreno[] = [
      { fuera: true },
      { descansosFuera: true },
      { perfilLuzId: 'gim' },
      { lamparasAmbiente: ['panel'] }
    ]
    for (const c of casos) expect(hayEntorno(c), JSON.stringify(c)).toBe(true)
  })
})
