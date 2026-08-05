import { describe, expect, it } from 'vitest'
import {
  CASILLAS,
  casillasDe,
  claveDe,
  haySuficiente,
  promedio,
  rangoPorDefecto,
  repartir
} from './trendRange'
import type { BodyMeasurement } from './types'

const HOY = '2026-08-05'

const medir = (date: string, weightKg = 78): BodyMeasurement => ({ date, weightKg })

describe('las casillas de cada ventana', () => {
  it('la semana son siete días y el último es hoy', () => {
    const c = casillasDe('semana', HOY)
    expect(c).toHaveLength(7)
    expect(c[6].clave).toBe(HOY)
    expect(c[0].clave).toBe('2026-07-30')
  })

  it('el mes son treinta días, también acabando hoy', () => {
    const c = casillasDe('mes', HOY)
    expect(c).toHaveLength(30)
    expect(c[29].clave).toBe(HOY)
    expect(c[0].clave).toBe('2026-07-07')
  })

  it('el año son doce meses acabando en el actual', () => {
    const c = casillasDe('anio', HOY)
    expect(c).toHaveLength(12)
    expect(c[11].clave).toBe('2026-08')
    expect(c[0].clave).toBe('2025-09')
  })

  it('salen en orden, de lo más viejo a hoy', () => {
    for (const rango of ['semana', 'mes', 'anio'] as const) {
      const claves = casillasDe(rango, HOY).map((c) => c.clave)
      expect([...claves].sort(), rango).toEqual(claves)
    }
  })

  it('cruzar el cambio de año no descoloca los meses', () => {
    const c = casillasDe('anio', '2026-01-15')
    expect(c[11].clave).toBe('2026-01')
    expect(c[0].clave).toBe('2025-02')
  })

  it('y cruzar el cambio de mes tampoco descoloca los días', () => {
    const c = casillasDe('semana', '2026-03-02')
    expect(c[0].clave).toBe('2026-02-24')
    expect(c[6].clave).toBe('2026-03-02')
  })
})

describe('los rótulos del eje', () => {
  it('en la semana lleva rótulo cada día', () => {
    expect(casillasDe('semana', HOY).every((c) => c.destacada)).toBe(true)
  })

  it('en el mes no: treinta números seguidos no se leen', () => {
    const c = casillasDe('mes', HOY)
    const conRotulo = c.filter((x) => x.destacada)
    expect(conRotulo.length).toBeLessThan(10)
    // El de hoy siempre lleva, que es el que se busca primero.
    expect(c[29].destacada).toBe(true)
  })

  it('en el año llevan los doce', () => {
    expect(casillasDe('anio', HOY).every((c) => c.destacada)).toBe(true)
  })

  it('los días llevan la inicial de su día de la semana', () => {
    // 2026-08-05 es miércoles.
    expect(casillasDe('semana', HOY)[6].etiqueta).toBe('X')
  })
})

describe('repartir las mediciones', () => {
  it('cada medición cae en su día', () => {
    const p = repartir([medir('2026-08-05'), medir('2026-08-01')], 'semana', HOY)
    expect(p.find((x) => x.casilla.clave === '2026-08-05')!.mediciones).toHaveLength(1)
    expect(p.find((x) => x.casilla.clave === '2026-08-01')!.mediciones).toHaveLength(1)
  })

  it('en la vista de año, todas las del mismo mes caen juntas', () => {
    const p = repartir([medir('2026-08-01'), medir('2026-08-20')], 'anio', HOY)
    expect(p.find((x) => x.casilla.clave === '2026-08')!.mediciones).toHaveLength(2)
  })

  it('lo que queda fuera de la ventana no entra', () => {
    const p = repartir([medir('2026-01-01')], 'semana', HOY)
    expect(p.every((x) => x.mediciones.length === 0)).toBe(true)
  })

  it('devuelve siempre todas las casillas, tenga datos o no', () => {
    expect(repartir([], 'mes', HOY)).toHaveLength(CASILLAS.mes)
  })

  it('los huecos se quedan vacíos, no se rellenan solos', () => {
    const p = repartir([medir('2026-08-05')], 'semana', HOY)
    expect(p.filter((x) => x.mediciones.length > 0)).toHaveLength(1)
  })
})

describe('el valor de una casilla', () => {
  it('es la media de lo que haya caído dentro', () => {
    expect(promedio([80, 78])).toBe(79)
  })

  it('se salta lo que falta', () => {
    expect(promedio([80, undefined, 78])).toBe(79)
  })

  it('sin nada válido no inventa un cero', () => {
    expect(promedio([undefined, undefined])).toBeUndefined()
    expect(promedio([])).toBeUndefined()
  })
})

describe('con qué rango se abre', () => {
  it('si esta semana hay dos pesadas, con la semana', () => {
    const ms = [medir('2026-08-05'), medir('2026-08-02')]
    expect(rangoPorDefecto(ms, HOY)).toBe('semana')
  })

  it('pesándose una vez por semana, abre con el mes', () => {
    const ms = ['2026-08-05', '2026-07-29', '2026-07-22'].map((d) => medir(d))
    expect(rangoPorDefecto(ms, HOY)).toBe('mes')
  })

  it('con mediciones muy espaciadas, con el año', () => {
    const ms = ['2026-08-05', '2026-05-01', '2026-02-01'].map((d) => medir(d))
    expect(rangoPorDefecto(ms, HOY)).toBe('anio')
  })

  it('sin nada que enseñar no se rompe', () => {
    expect(rangoPorDefecto([], HOY)).toBe('anio')
  })

  it('con una sola medición tampoco hay tendencia', () => {
    expect(haySuficiente(repartir([medir('2026-08-05')], 'semana', HOY))).toBe(false)
  })
})

describe('la clave de una fecha', () => {
  it('por día en semana y mes, por mes en el año', () => {
    expect(claveDe('2026-08-05', 'semana')).toBe('2026-08-05')
    expect(claveDe('2026-08-05', 'mes')).toBe('2026-08-05')
    expect(claveDe('2026-08-05', 'anio')).toBe('2026-08')
  })
})
