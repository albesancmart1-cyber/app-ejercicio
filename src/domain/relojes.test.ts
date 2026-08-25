import { describe, expect, it } from 'vitest'
import {
  MINUTOS_QUE_DESINCRONIZAN,
  dosRelojes,
  escribirDistancia,
  huboPulsoDeManana,
  minutosDeHora,
  primeraComida,
  primeraLuz,
  rachaDesincronizada
} from './relojes'
import type { DiaDeComidas, SalidaAlExterior } from './types'
import type { Coordenadas } from './arcoSolar'

const MADRID: Coordenadas = { lat: 40.4165, lon: -3.7026 }
const INVIERNO = 60
const tz = () => INVIERNO

/** El 21 de marzo en Madrid: civil a las 06:49, amanece a las 07:16. */
const DIA = '2026-03-21'

const salida = (fecha: string, desde: number, minutos = 15): SalidaAlExterior => ({
  id: `s-${fecha}-${desde}`,
  date: fecha,
  desde,
  minutos,
  filtro: 'ninguno'
})

const comidas = (fecha: string, ...horas: string[]): DiaDeComidas => ({
  date: fecha,
  comidas: horas.map((hora) => ({ hora, texto: 'algo' }))
})

describe('leer una hora', () => {
  it('convierte «08:18» en minutos', () => {
    expect(minutosDeHora('08:18')).toBe(498)
    expect(minutosDeHora('00:00')).toBe(0)
    expect(minutosDeHora('23:59')).toBe(1439)
  })

  it('acepta una cifra en la hora', () => {
    expect(minutosDeHora('7:05')).toBe(425)
  })

  it('y rechaza lo que no es una hora, en vez de devolver un número raro', () => {
    expect(minutosDeHora('')).toBeUndefined()
    expect(minutosDeHora('25:00')).toBeUndefined()
    expect(minutosDeHora('08:70')).toBeUndefined()
    expect(minutosDeHora('mañana')).toBeUndefined()
  })
})

describe('el reloj central: la primera luz que sirve', () => {
  it('no cuenta salir de noche cerrada', () => {
    // Las cinco de la mañana: el sol está muy por debajo del horizonte.
    expect(primeraLuz(DIA, MADRID, [salida(DIA, 5 * 60, 30)], INVIERNO)).toBeUndefined()
  })

  it('cuenta desde el minuto en que el sol cruza el crepúsculo civil', () => {
    // Salir a las 06:40, con el civil a las 06:49: cuenta, pero desde las 06:49.
    const luz = primeraLuz(DIA, MADRID, [salida(DIA, 6 * 60 + 40, 30)], INVIERNO)
    expect(luz).toBeGreaterThanOrEqual(6 * 60 + 48)
    expect(luz).toBeLessThanOrEqual(6 * 60 + 51)
  })

  it('coge la primera de varias salidas, no la más larga', () => {
    const luz = primeraLuz(
      DIA,
      MADRID,
      [salida(DIA, 13 * 60, 120), salida(DIA, 9 * 60, 10)],
      INVIERNO
    )
    expect(luz).toBe(9 * 60)
  })

  it('sin salir de casa no hay luz que valga, aunque fuera hiciera sol', () => {
    expect(primeraLuz(DIA, MADRID, [], INVIERNO)).toBeUndefined()
    expect(primeraLuz(DIA, MADRID, undefined, INVIERNO)).toBeUndefined()
  })

  it('ignora las salidas de otros días', () => {
    expect(primeraLuz(DIA, MADRID, [salida('2026-03-20', 10 * 60)], INVIERNO)).toBeUndefined()
  })
})

describe('el reloj periférico: la primera comida', () => {
  it('es la más temprana, esté donde esté en la lista', () => {
    expect(primeraComida(comidas(DIA, '14:00', '08:18', '20:30'))).toBe(498)
  })

  it('el café cuenta, porque abre la ventana igual que un plato', () => {
    // Aquí no hay distinción entre café y comida a propósito: si se apuntó, cuenta.
    expect(primeraComida(comidas(DIA, '07:00'))).toBe(420)
  })

  it('sin comidas no hay hora que dar', () => {
    expect(primeraComida(undefined)).toBeUndefined()
    expect(primeraComida(comidas(DIA))).toBeUndefined()
  })
})

describe('la distancia entre los dos relojes', () => {
  it('comer antes de ver luz da negativo, que es el caso que importa', () => {
    // Salir a las 07:30 sí cae en la ventana del pulso —civil 06:49, orto 07:16—
    // así que hay reloj central contra el que medir, y la comida llegó antes.
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 7 * 60 + 30)], comidas(DIA, '06:00'), INVIERNO)
    expect(r.distanciaMin).toBeLessThan(0)
    expect(r.desincronizado).toBe(true)
  })

  /*
   * El caso de quien entra a trabajar antes de que amanezca, que es medio
   * mundo. Antes salía «has comido cinco horas antes de ver luz», que suena a
   * reproche y no lo es: la app ya sabe que a esa hora no había amanecido.
   */
  it('sin pulso de mañana no se da distancia, porque no hay contra qué medirla', () => {
    // Sale a las tres de la tarde: hubo luz, pero muy fuera de la ventana.
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 15 * 60)], comidas(DIA, '09:45'), INVIERNO)
    expect(r.distanciaMin).toBeUndefined()
    expect(r.falta).toBe('pulso')
    // Y sobre todo: no se marca como desincronizado. No es una falta suya.
    expect(r.desincronizado).toBe(false)
  })

  it('pero las dos horas se siguen enseñando: lo que falta es la conclusión', () => {
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 15 * 60)], comidas(DIA, '09:45'), INVIERNO)
    expect(r.central).toBe(15 * 60)
    expect(r.periferico).toBe(9 * 60 + 45)
  })

  it('y la luz de media mañana tampoco vale: la ventana se cierra en el orto más hora y media', () => {
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 10 * 60)], comidas(DIA, '07:10'), INVIERNO)
    expect(r.falta).toBe('pulso')
  })

  it('ver luz y luego comer es lo normal, y no se marca', () => {
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 7 * 60 + 30)], comidas(DIA, '09:00'), INVIERNO)
    expect(r.distanciaMin).toBeGreaterThan(0)
    expect(r.desincronizado).toBe(false)
  })

  it('desayunar tardísimo tras ver el amanecer tampoco se marca: eso no es un problema', () => {
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 7 * 60)], comidas(DIA, '15:00'), INVIERNO)
    expect(r.distanciaMin).toBeGreaterThan(4 * 60)
    expect(r.desincronizado).toBe(false)
  })

  it('media hora antes de la luz no basta para marcar a nadie', () => {
    const luz = primeraLuz(DIA, MADRID, [salida(DIA, 8 * 60)], INVIERNO)!
    const antes = luz - (MINUTOS_QUE_DESINCRONIZAN - 20)
    const hhmm = `${String(Math.floor(antes / 60)).padStart(2, '0')}:${String(antes % 60).padStart(2, '0')}`
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 8 * 60)], comidas(DIA, hhmm), INVIERNO)
    expect(r.desincronizado).toBe(false)
  })

  it('sin luz apuntada dice qué falta, en vez de suponerlo', () => {
    const r = dosRelojes(DIA, MADRID, [], comidas(DIA, '08:00'), INVIERNO)
    expect(r.distanciaMin).toBeUndefined()
    expect(r.desincronizado).toBe(false)
    expect(r.falta).toBe('luz')
  })

  it('sin comida apuntada, igual', () => {
    const r = dosRelojes(DIA, MADRID, [salida(DIA, 10 * 60)], undefined, INVIERNO)
    expect(r.falta).toBe('comida')
  })

  it('y sin nada de nada, lo dice también', () => {
    expect(dosRelojes(DIA, MADRID, [], undefined, INVIERNO).falta).toBe('ambas')
  })
})

describe('la racha de días desincronizados', () => {
  const dias = ['2026-03-21', '2026-03-20', '2026-03-19', '2026-03-18']
  /* Salen dentro de la ventana del pulso, así que hay reloj central que medir. */
  const conPulso = dias.map((d) => salida(d, 7 * 60 + 30))
  const comiendoTemprano = dias.map((d) => comidas(d, '06:00'))

  it('cuenta los días seguidos en que se comió antes de ver luz', () => {
    expect(rachaDesincronizada('2026-03-21', MADRID, conPulso, comiendoTemprano, tz)).toBe(4)
  })

  it('un día bueno la corta', () => {
    const conUnoBueno = comiendoTemprano.map((c) =>
      c.date === '2026-03-20' ? comidas(c.date, '13:00') : c
    )
    expect(rachaDesincronizada('2026-03-21', MADRID, conPulso, conUnoBueno, tz)).toBe(1)
  })

  it('un día sin datos también la corta, en vez de darlo por bueno o por malo', () => {
    const conHueco = comiendoTemprano.filter((c) => c.date !== '2026-03-20')
    expect(rachaDesincronizada('2026-03-21', MADRID, conPulso, conHueco, tz)).toBe(1)
  })

  it('y un día sin pulso de mañana también, porque ahí no se sabe nada', () => {
    // Quien no pudo ver el amanecer no entra en una racha de días malos: no hay
    // dato, y una racha construida sobre «no se sabe» sería un reproche vacío.
    const sinPulsoUnDia = conPulso.map((s) =>
      s.date === '2026-03-20' ? salida(s.date, 15 * 60) : s
    )
    expect(rachaDesincronizada('2026-03-21', MADRID, sinPulsoUnDia, comiendoTemprano, tz)).toBe(1)
  })

  it('sin nada apuntado, cero', () => {
    expect(rachaDesincronizada('2026-03-21', MADRID, [], [], tz)).toBe(0)
  })
})

describe('el pulso de la mañana', () => {
  it('salir al amanecer lo da', () => {
    expect(huboPulsoDeManana(DIA, MADRID, [salida(DIA, 7 * 60 + 20)], INVIERNO)).toBe(true)
  })

  it('y salir en el crepúsculo civil también, aunque el sol no haya salido', () => {
    expect(huboPulsoDeManana(DIA, MADRID, [salida(DIA, 6 * 60 + 50)], INVIERNO)).toBe(true)
  })

  it('pero salir solo a mediodía no: la ventana ya pasó', () => {
    expect(huboPulsoDeManana(DIA, MADRID, [salida(DIA, 13 * 60)], INVIERNO)).toBe(false)
  })

  it('y no salir en todo el día, tampoco', () => {
    expect(huboPulsoDeManana(DIA, MADRID, [], INVIERNO)).toBe(false)
  })
})

describe('cómo se dice la distancia', () => {
  it('el caso que importa se dice con todas las letras', () => {
    expect(escribirDistancia({ distanciaMin: -80, desincronizado: true })).toBe(
      '1 h 20 antes de ver luz'
    )
  })

  it('los minutos sueltos sin horas', () => {
    expect(escribirDistancia({ distanciaMin: -45, desincronizado: false })).toBe(
      '45 min antes de ver luz'
    )
  })

  it('el orden sano se dice al revés', () => {
    expect(escribirDistancia({ distanciaMin: 95, desincronizado: false })).toBe(
      '1 h 35 después de la luz'
    )
  })

  it('y a la vez es a la vez', () => {
    expect(escribirDistancia({ distanciaMin: 0, desincronizado: false })).toBe('a la vez')
  })

  it('sin dato, una raya', () => {
    expect(escribirDistancia({ desincronizado: false })).toBe('—')
  })
})
