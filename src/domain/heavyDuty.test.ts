import { describe, expect, it } from 'vitest'
import {
  DIAS_POR_NIVEL,
  DIAS_QUE_YA_SON_PARON,
  DISPOSICION_MINIMA,
  LO_QUE_NO,
  SERIES_POR_EJERCICIO,
  SERIES_POR_SESION,
  COMO_ES_UNA_SERIE,
  descansoQueQueda,
  diasDesdeLaUltima,
  nivelDe,
  veredictoDelDia
} from './heavyDuty'
import type { Session } from './types'
import type { Readiness } from './readiness'

const sesion = (date: string): Session => ({
  id: `s-${date}`,
  date,
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  exercises: []
})

/** Tantas sesiones completadas como haga falta para llegar a un nivel. */
const historial = (n: number, ultima = '2026-08-01'): Session[] =>
  Array.from({ length: n }, (_, i) => sesion(`2025-01-${String((i % 28) + 1).padStart(2, '0')}`))
    .concat(n > 0 ? [sesion(ultima)] : [])

const disposicion = (score: number): Readiness => ({
  score,
  level: score < 40 ? 'bajo' : score < 65 ? 'medio' : 'alto',
  avoid: [],
  notes: [],
  keto: false
})

describe('los parámetros dicen lo que dice Heavy Duty', () => {
  it('una serie al fallo por ejercicio, y no dos', () => {
    // Es el corazón de todo esto: si la primera fue al fallo, la segunda no
    // añade estímulo, añade factura de recuperación.
    expect(SERIES_POR_EJERCICIO).toBe(1)
  })

  it('la sesión es corta: entre tres y siete series de trabajo', () => {
    expect(SERIES_POR_SESION.minimo).toBe(3)
    expect(SERIES_POR_SESION.techo).toBeLessThanOrEqual(7)
  })

  it('el descanso crece con el nivel, no baja', () => {
    /*
     * Es lo contrario de lo que hace casi todo el mundo, y es la conclusión de
     * Mentzer: cuanto más peso mueves, más hondo es el agujero de cada sesión,
     * y la capacidad de repararlo no sube con la fuerza.
     */
    const dias = DIAS_POR_NIVEL.map((n) => n.dias)
    expect(dias).toEqual([...dias].sort((a, b) => a - b))
    expect(dias[dias.length - 1]).toBeGreaterThan(dias[0])
  })
})

describe('el nivel sale de las sesiones hechas, no se pregunta', () => {
  it('quien empieza descansa menos que quien lleva años', () => {
    const novato = nivelDe(historial(5))
    const veterano = nivelDe(historial(200))
    expect(veterano.dias).toBeGreaterThan(novato.dias)
  })

  it('y las sesiones sin terminar no cuentan para subir de nivel', () => {
    const aMedias: Session[] = Array.from({ length: 100 }, (_, i) => ({
      ...sesion(`2025-03-${String((i % 28) + 1).padStart(2, '0')}`),
      completed: false
    }))
    expect(nivelDe(aMedias).sesiones).toBe(0)
  })
})

describe('el veredicto del día', () => {
  it('sin historial, se entrena: no hay nada de lo que recuperarse', () => {
    const v = veredictoDelDia([], '2026-08-10', disposicion(80))
    expect(v.entrenar).toBe(true)
    expect(v.porque).toMatch(/primera sesión/i)
  })

  it('al día siguiente de entrenar, no', () => {
    const v = veredictoDelDia([sesion('2026-08-09')], '2026-08-10', disposicion(90))
    expect(v.entrenar).toBe(false)
    expect(v.faltan).toBeGreaterThan(0)
  })

  it('y no se ofrece nada más suave: o se llega, o se espera', () => {
    // En un sistema de volumen un día regular se arregla bajando el listón.
    // Aquí no: media serie al fallo no existe.
    const v = veredictoDelDia([sesion('2026-08-09')], '2026-08-10', disposicion(90))
    expect(v.nota).toMatch(/días entre sesiones|todavía está pagando/i)
    expect(JSON.stringify(v)).not.toMatch(/suave|más ligero|a media/i)
  })

  it('pasados los días del nivel, toca', () => {
    const v = veredictoDelDia([sesion('2026-08-01')], '2026-08-10', disposicion(80))
    expect(v.entrenar).toBe(true)
    expect(v.diasDescansados).toBe(9)
  })

  it('con los días cumplidos pero sin disposición, tampoco', () => {
    const v = veredictoDelDia([sesion('2026-08-01')], '2026-08-10', disposicion(DISPOSICION_MINIMA - 1))
    expect(v.entrenar).toBe(false)
    expect(v.porque).toMatch(/no llegas/i)
  })

  it('justo en el umbral de disposición sí se entrena', () => {
    const v = veredictoDelDia([sesion('2026-08-01')], '2026-08-10', disposicion(DISPOSICION_MINIMA))
    expect(v.entrenar).toBe(true)
  })

  it('los días mandan sobre la disposición, no al revés', () => {
    /*
     * Encontrarse estupendamente al día siguiente no es permiso para entrenar:
     * encontrarse bien es el resultado de estar recuperándose, y gastarlo es
     * justo lo que rompe el ciclo.
     */
    const v = veredictoDelDia([sesion('2026-08-09')], '2026-08-10', disposicion(100))
    expect(v.entrenar).toBe(false)
    expect(v.porque).not.toMatch(/disposición/i)
  })

  it('a las dos semanas deja de ser descanso y pasa a ser un parón', () => {
    const v = veredictoDelDia(
      [sesion('2026-08-01')],
      `2026-08-${String(1 + DIAS_QUE_YA_SON_PARON).padStart(2, '0')}`,
      disposicion(80)
    )
    expect(v.entrenar).toBe(true)
    expect(v.porque).toMatch(/parón/i)
    expect(v.nota).toMatch(/menos peso/i)
  })

  it('descansar de más se dice sin regañar', () => {
    const v = veredictoDelDia([sesion('2026-08-01')], '2026-08-09', disposicion(80))
    expect(v.entrenar).toBe(true)
    expect(v.nota).toMatch(/no pasa nada|de más descanso/i)
  })

  it('sin check-in contestado, los días deciden solos', () => {
    // No haber contestado no puede impedir entrenar: sería castigar el silencio.
    const v = veredictoDelDia([sesion('2026-08-01')], '2026-08-10', null)
    expect(v.entrenar).toBe(true)
  })
})

describe('cómo se dice cuánto falta', () => {
  it('hoy, mañana, o los días que sean', () => {
    expect(descansoQueQueda(veredictoDelDia([], '2026-08-10', disposicion(80)))).toBe('Hoy toca')
    expect(
      descansoQueQueda(veredictoDelDia([sesion('2026-08-09')], '2026-08-10', disposicion(80)))
    ).toMatch(/Faltan|Mañana/)
  })
})

describe('días desde la última', () => {
  it('cuenta desde la más reciente, no desde la primera', () => {
    const s = [sesion('2026-01-01'), sesion('2026-08-08'), sesion('2026-03-03')]
    expect(diasDesdeLaUltima(s, '2026-08-10')).toBe(2)
  })

  it('sin sesiones completadas, no hay desde cuándo', () => {
    expect(diasDesdeLaUltima([], '2026-08-10')).toBeNull()
  })
})

describe('las instrucciones', () => {
  it('dicen lo que hay que hacer y lo que no', () => {
    expect(COMO_ES_UNA_SERIE.length).toBeGreaterThanOrEqual(4)
    expect(LO_QUE_NO.length).toBeGreaterThanOrEqual(3)
  })

  it('el fallo está definido, no dado por supuesto', () => {
    // «Al fallo» es la instrucción que todo el mundo cree entender y casi nadie
    // ejecuta: la mayoría para cuando duele, no cuando el peso no sube.
    expect(COMO_ES_UNA_SERIE.join(' ')).toMatch(/deja de subir|no puede/i)
  })

  it('y se avisa de la trampa: entrenar el día de descanso porque uno se encuentra bien', () => {
    expect(LO_QUE_NO.join(' ')).toMatch(/encontrarse bien|encontrabas bien/i)
  })
})
