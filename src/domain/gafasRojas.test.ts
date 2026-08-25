import { describe, expect, it } from 'vitest'
import {
  CUENTA_COMO_OSCURO,
  GAFAS,
  LO_QUE_NO_TAPAN,
  PASO_MELANOPICO,
  gafasDe,
  minutosConGafas,
  minutosQueValen,
  oscuridadDeLaNoche,
  pctDeAzulQueCorta,
  pctMelanopicoQueCorta
} from './gafasRojas'
import { PASO_DE_AZUL } from './jornada'

/**
 * Las gafas son la única salida real de la higiene nocturna, y por eso son
 * también la más fácil de convertir en excusa. Lo que se prueba aquí es sobre
 * todo lo segundo: que no valgan más de lo que valen.
 */

describe('cuánto vale un minuto con gafas', () => {
  it('unas rojas valen casi un minuto de oscuridad, pero no uno entero', () => {
    expect(CUENTA_COMO_OSCURO.rojo).toBeGreaterThan(0.85)
    expect(CUENTA_COMO_OSCURO.rojo).toBeLessThan(1)
  })

  it('unas ámbar valen cerca de la mitad, y esa diferencia es el asunto', () => {
    // No es prudencia: la melanopsina tiene el pico en 480 nm y sigue
    // respondiendo al verde, que es justo lo que las ámbar dejan pasar.
    expect(CUENTA_COMO_OSCURO.ambar).toBeGreaterThan(0.4)
    expect(CUENTA_COMO_OSCURO.ambar).toBeLessThan(0.6)
    expect(CUENTA_COMO_OSCURO.rojo).toBeGreaterThan(CUENTA_COMO_OSCURO.ambar * 1.5)
  })

  it('no llevarlas no vale nada, que es lo obvio y hay que dejarlo escrito', () => {
    expect(CUENTA_COMO_OSCURO.ninguno).toBe(0)
    expect(minutosQueValen(120, 'ninguno')).toBe(0)
    expect(minutosQueValen(120, undefined)).toBe(0)
  })

  it('ningún filtro llega a valer un minuto entero: siempre queda el descuento de uso', () => {
    // Se las levanta uno un momento, y por el hueco de la patilla entra luz
    // hacia la retina periférica. Si esto llegara a 1, la barra diría que una
    // noche con la casa encendida es igual que una noche a oscuras.
    for (const v of Object.values(CUENTA_COMO_OSCURO)) expect(v).toBeLessThan(1)
  })

  it('dos horas con las rojas son casi dos horas; con las ámbar, una', () => {
    expect(minutosQueValen(120, 'rojo')).toBeGreaterThanOrEqual(105)
    expect(minutosQueValen(120, 'ambar')).toBeLessThanOrEqual(65)
  })
})

describe('cortar azul y cortar lo que mide el reloj no son lo mismo', () => {
  it('unas ámbar cortan casi todo el azul y solo la mitad de lo que cuenta', () => {
    // Es la trampa de las cifras que esta pantalla tiene que deshacer: mirar
    // solo el azul haría creer que unas ámbar son casi unas rojas.
    expect(pctDeAzulQueCorta('ambar')).toBeGreaterThan(85)
    expect(pctMelanopicoQueCorta('ambar')).toBeLessThan(75)
  })

  it('con las rojas las dos cifras van juntas, porque cortan más allá del pico', () => {
    expect(pctDeAzulQueCorta('rojo')).toBeGreaterThan(95)
    expect(pctMelanopicoQueCorta('rojo')).toBeGreaterThan(95)
  })

  it('el paso melanópico nunca es mejor que el del azul: no se puede tapar de más', () => {
    for (const f of ['ninguno', 'ambar', 'rojo'] as const) {
      expect(PASO_MELANOPICO[f]).toBeGreaterThanOrEqual(PASO_DE_AZUL[f])
    }
  })
})

describe('el tramo con las gafas puestas', () => {
  it('va de ponérselas a apagar la luz, y no más allá', () => {
    // Desde que se apaga todo ya hay oscuridad de verdad: sumar las gafas ahí
    // sería contar el mismo minuto dos veces.
    expect(minutosConGafas(21 * 60, 23 * 60 + 30)).toBe(150)
  })

  it('envuelve la medianoche', () => {
    expect(minutosConGafas(23 * 60, 1 * 60)).toBe(120)
  })

  it('sin hora de ponérselas no hay tramo', () => {
    expect(minutosConGafas(undefined, 23 * 60)).toBe(0)
  })

  it('media noche entera con gafas antes de apagar se descarta: es un dedo mal puesto', () => {
    // Ponérselas a las nueve de la mañana para apagar a las once de la noche no
    // es un dato. Contarlo habría llenado la barra de oscuridad sola.
    expect(minutosConGafas(9 * 60, 23 * 60)).toBe(0)
  })
})

describe('la cuenta de una noche', () => {
  const noche = { apagado: 23 * 60 + 30, levantado: 7 * 60 }

  it('sin gafas es lo de siempre, y no aparece nada nuevo', () => {
    const c = oscuridadDeLaNoche(noche)
    expect(c.reales).toBe(450)
    expect(c.conGafas).toBe(0)
    expect(c.valen).toBe(0)
    expect(c.total).toBe(450)
  })

  it('con gafas suma, pero enseña por separado lo medido y lo ayudado', () => {
    // Que las dos cifras salgan sueltas es el punto: una noche medida y una
    // noche ayudada no pueden acabar siendo el mismo número sin decirlo.
    const c = oscuridadDeLaNoche({ ...noche, gafasDesde: 21 * 60, gafas: 'rojo' })
    expect(c.reales).toBe(450)
    expect(c.conGafas).toBe(150)
    expect(c.valen).toBeLessThan(c.conGafas)
    expect(c.total).toBe(c.reales + c.valen)
  })

  it('el filtro sin hora no suma nada: no hay tramo que contar', () => {
    const c = oscuridadDeLaNoche({ ...noche, gafas: 'rojo' })
    expect(c.total).toBe(450)
  })

  it('y la misma noche con ámbar cuenta bastante menos que con rojas', () => {
    const rojas = oscuridadDeLaNoche({ ...noche, gafasDesde: 21 * 60, gafas: 'rojo' })
    const ambar = oscuridadDeLaNoche({ ...noche, gafasDesde: 21 * 60, gafas: 'ambar' })
    expect(ambar.total).toBeLessThan(rojas.total)
    expect(rojas.valen - ambar.valen).toBeGreaterThan(50)
  })
})

describe('el catálogo', () => {
  it('las rojas cortan más arriba que las ámbar, que es de dónde sale todo lo demás', () => {
    expect(gafasDe('rojo')!.corte).toBeGreaterThan(gafasDe('ambar')!.corte)
    // Y por encima del pico de la melanopsina, que está en 480.
    expect(gafasDe('rojo')!.corte).toBeGreaterThan(480)
  })

  it('«sin gafas» no está en el catálogo: no es unas gafas', () => {
    expect(gafasDe('ninguno')).toBeUndefined()
    expect(GAFAS.map((g) => g.id)).toEqual(['rojo', 'ambar'])
  })

  it('cada una dice qué deja pasar, no solo cómo se llama', () => {
    for (const g of GAFAS) expect(g.que.length).toBeGreaterThan(40)
  })
})

describe('la letra pequeña', () => {
  it('está y dice las cuatro cosas que no tapan', () => {
    expect(LO_QUE_NO_TAPAN.length).toBeGreaterThanOrEqual(4)
  })

  it('y una de ellas es que duermes sin ellas, que es la que se olvida', () => {
    expect(LO_QUE_NO_TAPAN.join(' ')).toMatch(/duermes|cama/i)
  })
})
