import { describe, expect, it } from 'vitest'
import {
  aHora,
  describirComida,
  etiquetasDe,
  aMinutos,
  cenaTardia,
  conComida,
  diaDe,
  llevaEtiqueta,
  ordenadas,
  resumenDelDia,
  saleDeCetosis,
  sinComida,
  ventanaDe
} from './crononutricion'
import type { CheckIn, DiaDeComidas } from './types'

const F = '2026-08-19'

function dia(...horas: string[]): DiaDeComidas {
  return { date: F, comidas: horas.map((hora, i) => ({ hora, texto: `comida ${i + 1}` })) }
}

function checkinConCama(horaAcostarse: string): CheckIn {
  return {
    date: F,
    sleep: 4,
    lightHygiene: true,
    sunrise: true,
    sunsetYesterday: true,
    sunExposure: true,
    keto: true,
    energy: 4,
    discomfort: 'ninguna',
    horaAcostarse
  }
}

describe('las horas', () => {
  it('lee «HH:MM» y rechaza lo que no lo es', () => {
    expect(aMinutos('10:30')).toBe(630)
    expect(aMinutos('0:05')).toBe(5)
    expect(aMinutos('25:00')).toBeUndefined()
    expect(aMinutos('10:65')).toBeUndefined()
    expect(aMinutos('mediodía')).toBeUndefined()
    expect(aMinutos(undefined)).toBeUndefined()
  })

  it('ida y vuelta', () => {
    expect(aHora(630)).toBe('10:30')
    expect(aHora(5)).toBe('0:05')
  })

  it('ordena por hora, y la hora rota va al final', () => {
    const d: DiaDeComidas = {
      date: F,
      comidas: [
        { hora: '14:00', texto: 'b' },
        { hora: '¿?', texto: 'z' },
        { hora: '09:00', texto: 'a' }
      ]
    }
    expect(ordenadas(d.comidas).map((c) => c.texto)).toEqual(['a', 'b', 'z'])
  })
})

describe('la ventana de alimentación', () => {
  it('de la primera a la última, con su duración', () => {
    expect(ventanaDe(dia('10:30', '14:00', '19:30'))).toEqual({
      primera: '10:30',
      ultima: '19:30',
      horas: 9
    })
  })

  it('una sola comida es una ventana de cero horas, que también es dato', () => {
    expect(ventanaDe(dia('13:00'))).toEqual({ primera: '13:00', ultima: '13:00', horas: 0 })
  })

  it('sin comidas no hay ventana', () => {
    expect(ventanaDe(undefined)).toBeUndefined()
    expect(ventanaDe(dia())).toBeUndefined()
  })
})

describe('la cena tardía', () => {
  it('a menos de tres horas de acostarse es tarde', () => {
    expect(cenaTardia(dia('10:00', '21:00'), checkinConCama('23:30'))).toBe(true)
    expect(cenaTardia(dia('10:00', '20:00'), checkinConCama('23:30'))).toBe(false)
  })

  it('acostarse de madrugada cuenta como después de la cena, no antes', () => {
    // Cena a las 23:00, cama a la 0:30: hora y media → tarde.
    expect(cenaTardia(dia('14:00', '23:00'), checkinConCama('0:30'))).toBe(true)
    // Cena a las 21:00, cama a la 0:30: tres horas y media → no.
    expect(cenaTardia(dia('14:00', '21:00'), checkinConCama('0:30'))).toBe(false)
  })

  it('sin hora de cama, manda el umbral de las 21:30', () => {
    expect(cenaTardia(dia('10:00', '22:00'))).toBe(true)
    expect(cenaTardia(dia('10:00', '20:30'))).toBe(false)
  })

  it('sin comidas no se afirma nada', () => {
    expect(cenaTardia(undefined)).toBeUndefined()
  })
})

describe('la cetosis desde el diario', () => {
  it('una comida con carbohidrato es salir de cetosis', () => {
    const d: DiaDeComidas = {
      date: F,
      comidas: [{ hora: '14:00', texto: 'arroz', etiquetas: ['carbohidrato'] }]
    }
    expect(saleDeCetosis(d)).toBe(true)
    expect(llevaEtiqueta(d, 'carbohidrato')).toBe(true)
  })

  it('un día apuntado sin carbohidrato es seguir en cetosis', () => {
    expect(saleDeCetosis(dia('14:00'))).toBe(false)
  })

  it('sin diario no se sabe, y se dice con undefined', () => {
    expect(saleDeCetosis(undefined)).toBeUndefined()
    expect(saleDeCetosis({ date: F, comidas: [] })).toBeUndefined()
  })
})

describe('el resumen del día', () => {
  it('dice cuántas comidas y en qué ventana', () => {
    expect(resumenDelDia(dia('10:30', '19:30'))).toMatch(/2 comidas en una ventana de 9 h, de 10:30 a 19:30/)
  })

  it('avisa de la cena tardía cuando la hay, y solo entonces', () => {
    expect(resumenDelDia(dia('10:00', '22:00'))).toMatch(/tarde/)
    expect(resumenDelDia(dia('10:00', '19:00'))).not.toMatch(/tarde/)
  })

  it('nunca menciona calorías', () => {
    expect(resumenDelDia(dia('10:00', '22:00'))).not.toMatch(/calor[ií]a|kcal/i)
  })
})

describe('editar el día', () => {
  it('añadir ordena por hora y no toca el día anterior', () => {
    const d = dia('14:00')
    const con = conComida(d, F, { hora: '09:00', texto: 'primera' })
    expect(con.comidas.map((c) => c.hora)).toEqual(['09:00', '14:00'])
    expect(d.comidas).toHaveLength(1)
  })

  it('añadir sobre un día vacío lo crea', () => {
    const con = conComida(undefined, F, { hora: '12:00', texto: 'única' })
    expect(con.date).toBe(F)
    expect(con.comidas).toHaveLength(1)
  })

  it('quitar quita la que es', () => {
    const d = dia('09:00', '14:00', '20:00')
    expect(sinComida(d, 1).comidas.map((c) => c.hora)).toEqual(['09:00', '20:00'])
  })

  it('diaDe encuentra la fecha', () => {
    expect(diaDe([dia('10:00')], F)?.comidas).toHaveLength(1)
    expect(diaDe([dia('10:00')], '2026-01-01')).toBeUndefined()
    expect(diaDe(undefined, F)).toBeUndefined()
  })
})

describe('los alimentos dentro de una comida', () => {
  const cena: import('./types').ComidaRegistrada = {
    hora: '21:00',
    texto: '',
    alimentos: [
      { nombre: 'Pollo', gramos: 250, etiquetas: ['proteina'] },
      { nombre: 'Arroz', gramos: 80, etiquetas: ['carbohidrato', 'salada'] },
      { nombre: 'Aguacate' }
    ]
  }

  it('las etiquetas de la comida son la unión de las de sus alimentos', () => {
    expect(etiquetasDe(cena).sort()).toEqual(['carbohidrato', 'proteina', 'salada'])
  })

  it('un carbohidrato en un alimento saca al día de cetosis, como si fuera de la comida', () => {
    const d: import('./types').DiaDeComidas = { date: F, comidas: [cena] }
    expect(saleDeCetosis(d)).toBe(true)
    expect(llevaEtiqueta(d, 'salada')).toBe(true)
  })

  it('la comida se lee por sus alimentos y sus pesos cuando no hay texto', () => {
    expect(describirComida(cena)).toBe('Pollo 250 g · Arroz 80 g · Aguacate')
  })

  it('con texto propio, manda el texto', () => {
    expect(describirComida({ ...cena, texto: 'Cena de tupper' })).toBe('Cena de tupper')
  })

  it('las etiquetas de la comida entera siguen valiendo, con y sin alimentos', () => {
    const vieja: import('./types').ComidaRegistrada = { hora: '14:00', texto: 'arroz', etiquetas: ['carbohidrato'] }
    expect(etiquetasDe(vieja)).toEqual(['carbohidrato'])
    expect(saleDeCetosis({ date: F, comidas: [vieja] })).toBe(true)
  })
})
