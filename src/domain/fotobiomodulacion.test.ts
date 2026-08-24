import { describe, expect, it } from 'vitest'
import {
  dosisAcumulada,
  dosisDeSesion,
  escribirIrradiancia,
  escribirJulios,
  factorDistancia,
  lamparaCalculable,
  lamparasDe,
  picosQueFaltan,
  tramosDe
} from './fotobiomodulacion'
import type { Lampara, SesionPBM } from './types'

/** El panel del ejemplo: cuatro ondas, 60 mW/cm² en total a 15 cm. */
const PANEL: Lampara = {
  id: 'panel',
  nombre: 'Panel del salón',
  distanciaRefCm: 15,
  ondas: [
    { nm: 630, irradiancia: 12 },
    { nm: 660, irradiancia: 18 },
    { nm: 810, irradiancia: 16 },
    { nm: 850, irradiancia: 14 }
  ]
}

const sesion = (extra: Partial<SesionPBM> = {}): SesionPBM => ({
  id: 's1',
  date: '2026-03-21',
  lamparaId: 'panel',
  minutos: 10,
  distanciaCm: 15,
  zona: 'espalda',
  ...extra
})

describe('la dosis de una sesión', () => {
  it('es potencia por tiempo: 60 mW/cm² diez minutos son 36 J/cm²', () => {
    // 60 mW/cm² × 600 s ÷ 1 000 = 36 J/cm². Es la cuenta entera, a mano.
    const d = dosisDeSesion(sesion(), [PANEL])
    expect(d.julios).toBeCloseTo(36, 6)
  })

  it('se reparte por onda, que es lo que hace que el dato sirva', () => {
    const d = dosisDeSesion(sesion(), [PANEL])
    expect(d.porOnda.map((o) => [o.nm, Number(o.julios.toFixed(1))])).toEqual([
      [630, 7.2],
      [660, 10.8],
      [810, 9.6],
      [850, 8.4]
    ])
    // Y las partes suman el todo.
    expect(d.porOnda.reduce((t, o) => t + o.julios, 0)).toBeCloseTo(d.julios, 6)
  })

  it('el doble de distancia entrega la cuarta parte', () => {
    const cerca = dosisDeSesion(sesion({ distanciaCm: 15 }), [PANEL])
    const lejos = dosisDeSesion(sesion({ distanciaCm: 30 }), [PANEL])
    expect(lejos.julios).toBeCloseTo(cerca.julios / 4, 6)
    expect(lejos.julios).toBeCloseTo(9, 6)
  })

  it('y la mitad de distancia, el cuádruple', () => {
    const d = dosisDeSesion(sesion({ distanciaCm: 7.5 }), [PANEL])
    expect(d.julios).toBeCloseTo(144, 6)
  })

  it('el doble de minutos es el doble de dosis, sin más misterio', () => {
    const diez = dosisDeSesion(sesion({ minutos: 10 }), [PANEL])
    const veinte = dosisDeSesion(sesion({ minutos: 20 }), [PANEL])
    expect(veinte.julios).toBeCloseTo(diez.julios * 2, 6)
  })

  it('una sesión de cero minutos no entrega nada', () => {
    expect(dosisDeSesion(sesion({ minutos: 0 }), [PANEL]).julios).toBe(0)
  })

  it('pegar la lámpara a la piel no da una dosis infinita', () => {
    // Sin protección, distancia cero daría Infinity y envenenaría toda suma
    // posterior. Se trata como un centímetro.
    const d = dosisDeSesion(sesion({ distanciaCm: 0 }), [PANEL])
    expect(Number.isFinite(d.julios)).toBe(true)
    expect(d.julios).toBeGreaterThan(0)
  })
})

describe('lo que va a la mitocondria', () => {
  it('en un panel de rojo e infrarrojo es casi todo', () => {
    const d = dosisDeSesion(sesion(), [PANEL])
    expect(d.juliosMitocondria).toBeCloseTo(36, 6)
  })

  it('el azul de una lámpara no cuenta como mitocondria', () => {
    const mixta: Lampara = {
      id: 'mixta',
      nombre: 'Mixta',
      distanciaRefCm: 15,
      ondas: [
        { nm: 480, irradiancia: 30 },
        { nm: 660, irradiancia: 30 }
      ]
    }
    const d = dosisDeSesion(sesion({ lamparaId: 'mixta' }), [mixta])
    expect(d.julios).toBeCloseTo(36, 6)
    expect(d.juliosMitocondria).toBeCloseTo(18, 6) // solo la mitad roja
  })

  it('el infrarrojo medio cuenta, pero a peso reducido', () => {
    const estufa: Lampara = {
      id: 'estufa',
      nombre: 'Estufa',
      distanciaRefCm: 15,
      ondas: [{ nm: 1500, irradiancia: 60 }]
    }
    const d = dosisDeSesion(sesion({ lamparaId: 'estufa' }), [estufa])
    expect(d.julios).toBeCloseTo(36, 6)
    expect(d.juliosMitocondria).toBeLessThan(d.julios)
    expect(d.juliosMitocondria).toBeGreaterThan(0)
  })
})

describe('los picos de Karu', () => {
  it('el panel de cuatro ondas cubre tres, y falta el de 760', () => {
    const d = dosisDeSesion(sesion(), [PANEL])
    expect(d.picos).toEqual([620, 680, 820])
    expect(picosQueFaltan(PANEL)).toEqual([760])
  })

  it('una bombilla de una sola onda deja tres sin cubrir', () => {
    const bombilla: Lampara = {
      id: 'b',
      nombre: 'Bombilla',
      distanciaRefCm: 30,
      ondas: [{ nm: 660, irradiancia: 5 }]
    }
    expect(picosQueFaltan(bombilla)).toEqual([620, 760, 820])
  })
})

describe('acumular varias sesiones', () => {
  it('suma las que se pueden calcular', () => {
    const total = dosisAcumulada(
      [sesion({ id: 'a' }), sesion({ id: 'b', minutos: 5 })],
      [PANEL]
    )
    expect(total.sesiones).toBe(2)
    expect(total.minutos).toBe(15)
    expect(total.julios).toBeCloseTo(54, 6)
  })

  it('una sesión cuya lámpara se borró no se cuenta, en vez de inventarle una media', () => {
    const total = dosisAcumulada(
      [sesion({ id: 'a' }), sesion({ id: 'huerfana', lamparaId: 'no-existe' })],
      [PANEL]
    )
    expect(total.sesiones).toBe(1)
    expect(total.julios).toBeCloseTo(36, 6)
  })

  it('sin sesiones, todo a cero y sin reventar', () => {
    expect(dosisAcumulada([], [PANEL])).toEqual({
      julios: 0,
      juliosMitocondria: 0,
      sesiones: 0,
      minutos: 0
    })
  })
})

describe('varias lámparas a la vez', () => {
  /** Una segunda, con un pico que al panel le falta y otro que comparte. */
  const BOMBILLA: Lampara = {
    id: 'bombilla',
    nombre: 'Bombilla de mano',
    distanciaRefCm: 10,
    ondas: [
      { nm: 660, irradiancia: 20 },
      { nm: 760, irradiancia: 10 }
    ]
  }
  const dos = (extra: Partial<SesionPBM> = {}): SesionPBM =>
    sesion({
      lamparas: [
        { lamparaId: 'panel', distanciaCm: 15 },
        { lamparaId: 'bombilla', distanciaCm: 10 }
      ],
      ...extra
    })

  it('los julios se suman, porque es energía y no una nota media', () => {
    // Panel: 60 mW/cm² a su referencia. Bombilla: 30 a la suya. Diez minutos.
    const d = dosisDeSesion(dos(), [PANEL, BOMBILLA])
    expect(d.julios).toBeCloseTo(36 + 18, 6)
  })

  it('cada una con su distancia, que es lo único que puede ser', () => {
    // El panel se va al doble y aporta la cuarta parte; la bombilla no se mueve.
    const d = dosisDeSesion(
      dos({
        lamparas: [
          { lamparaId: 'panel', distanciaCm: 30 },
          { lamparaId: 'bombilla', distanciaCm: 10 }
        ]
      }),
      [PANEL, BOMBILLA]
    )
    expect(d.julios).toBeCloseTo(9 + 18, 6)
  })

  it('lo que coincide en la misma onda se junta, no se enseña dos veces', () => {
    // Las dos tienen 660 nm: 18 mW/cm² del panel más 20 de la bombilla.
    const d = dosisDeSesion(dos(), [PANEL, BOMBILLA])
    const seiscientos60 = d.porOnda.filter((o) => o.nm === 660)
    expect(seiscientos60).toHaveLength(1)
    expect(seiscientos60[0].irradiancia).toBeCloseTo(38, 6)
    // Y las partes siguen sumando el todo.
    expect(d.porOnda.reduce((t, o) => t + o.julios, 0)).toBeCloseTo(d.julios, 6)
  })

  it('las ondas salen ordenadas por longitud, vengan de donde vengan', () => {
    const d = dosisDeSesion(dos(), [PANEL, BOMBILLA])
    expect(d.porOnda.map((o) => o.nm)).toEqual([630, 660, 760, 810, 850])
  })

  it('los picos se unen, que es la razón de encender dos', () => {
    // Al panel le faltaba el de 760 y la bombilla lo trae: juntas, los cuatro.
    expect(dosisDeSesion(sesion(), [PANEL]).picos).toEqual([620, 680, 820])
    expect(dosisDeSesion(dos(), [PANEL, BOMBILLA]).picos).toEqual([620, 680, 760, 820])
  })

  it('se puede ver lo que puso cada una por separado', () => {
    const d = dosisDeSesion(dos(), [PANEL, BOMBILLA])
    expect(d.porLampara.map((l) => l.nombre)).toEqual(['Panel del salón', 'Bombilla de mano'])
    expect(d.porLampara[0].julios).toBeCloseTo(36, 6)
    expect(d.porLampara[1].julios).toBeCloseTo(18, 6)
    expect(d.porLampara.reduce((t, l) => t + l.julios, 0)).toBeCloseTo(d.julios, 6)
  })

  it('si se borra una de las dos se cuenta la que queda, y se dice que falta una', () => {
    // Callarse la que falta sería peor que no contarla: la cifra parecería entera.
    const d = dosisDeSesion(dos(), [PANEL])
    expect(d.julios).toBeCloseTo(36, 6)
    expect(d.lamparasPerdidas).toBe(1)
    expect(d.porLampara).toHaveLength(1)
  })

  it('y si se borran las dos no queda nada que calcular', () => {
    const d = dosisDeSesion(dos(), [])
    expect(d.julios).toBe(0)
    expect(d.porLampara).toHaveLength(0)
    expect(d.lamparasPerdidas).toBe(2)
  })

  it('la sesión con dos cuenta una vez en el acumulado, no dos', () => {
    // Son diez minutos, no veinte: estuviste debajo de las dos a la vez.
    const total = dosisAcumulada([dos()], [PANEL, BOMBILLA])
    expect(total.sesiones).toBe(1)
    expect(total.minutos).toBe(10)
    expect(total.julios).toBeCloseTo(54, 6)
  })

  it('una sesión a la que le queda una lámpara sí se cuenta', () => {
    const total = dosisAcumulada([dos()], [PANEL])
    expect(total.sesiones).toBe(1)
    expect(total.julios).toBeCloseTo(36, 6)
  })
})

describe('encender y apagar a mitad de sesión', () => {
  const BOMBILLA: Lampara = {
    id: 'bombilla',
    nombre: 'Bombilla de mano',
    distanciaRefCm: 10,
    ondas: [
      { nm: 660, irradiancia: 20 },
      { nm: 760, irradiancia: 10 }
    ]
  }

  /** Diez minutos con el panel, diez con los dos, diez solo con la bombilla. */
  const enTres = (): SesionPBM =>
    sesion({
      minutos: 30,
      tramos: [
        { minutos: 10, lamparas: [{ lamparaId: 'panel', distanciaCm: 15 }] },
        {
          minutos: 10,
          lamparas: [
            { lamparaId: 'panel', distanciaCm: 15 },
            { lamparaId: 'bombilla', distanciaCm: 10 }
          ]
        },
        { minutos: 10, lamparas: [{ lamparaId: 'bombilla', distanciaCm: 10 }] }
      ]
    })

  it('cada tramo entrega los julios de las lámparas que tenía', () => {
    // Panel 60 mW/cm² veinte minutos = 72 J. Bombilla 30 mW/cm² veinte = 36 J.
    const d = dosisDeSesion(enTres(), [PANEL, BOMBILLA])
    expect(d.julios).toBeCloseTo(72 + 36, 6)
  })

  it('y no los del primer tramo repetidos, que es lo que pasaba antes', () => {
    /*
     * Congelar el conjunto inicial —treinta minutos de solo panel— da aquí los
     * mismos 108 J por pura casualidad aritmética, así que el total no sirve
     * para distinguirlos. Lo que sí distingue es **de qué están hechos** esos
     * julios: sin la bombilla no hay ni un julio a 760 nm, y con ella el panel
     * aporta un tercio menos porque estuvo apagado el último tercio.
     */
    const congelado = dosisDeSesion(sesion({ minutos: 30 }), [PANEL, BOMBILLA])
    const real = dosisDeSesion(enTres(), [PANEL, BOMBILLA])

    expect(congelado.porOnda.find((o) => o.nm === 760)).toBeUndefined()
    expect(real.porOnda.find((o) => o.nm === 760)?.julios).toBeCloseTo(12, 6)

    const delPanel = (d: typeof real) => d.porLampara.find((l) => l.lamparaId === 'panel')!.julios
    expect(delPanel(congelado)).toBeCloseTo(108, 6)
    expect(delPanel(real)).toBeCloseTo(72, 6)
  })

  it('cada lámpara dice cuántos minutos estuvo encendida', () => {
    const d = dosisDeSesion(enTres(), [PANEL, BOMBILLA])
    expect(d.porLampara.map((l) => [l.nombre, l.minutos])).toEqual([
      ['Panel del salón', 20],
      ['Bombilla de mano', 20]
    ])
  })

  it('moverla de sitio a mitad son dos filas, no un factor promediado', () => {
    // Promediar daría un factor que no ocurrió en ningún momento.
    const movida = sesion({
      minutos: 20,
      tramos: [
        { minutos: 10, lamparas: [{ lamparaId: 'panel', distanciaCm: 15 }] },
        { minutos: 10, lamparas: [{ lamparaId: 'panel', distanciaCm: 30 }] }
      ]
    })
    const d = dosisDeSesion(movida, [PANEL])
    expect(d.porLampara).toHaveLength(2)
    expect(d.porLampara.map((l) => l.distanciaCm)).toEqual([15, 30])
    // Diez minutos a 15 cm son 36 J; diez a 30 cm, la cuarta parte: 9.
    expect(d.julios).toBeCloseTo(45, 6)
  })

  it('un tramo sin ninguna encendida no entrega nada, pero tampoco revienta', () => {
    const conHueco = sesion({
      minutos: 20,
      tramos: [
        { minutos: 10, lamparas: [{ lamparaId: 'panel', distanciaCm: 15 }] },
        { minutos: 10, lamparas: [] }
      ]
    })
    const d = dosisDeSesion(conHueco, [PANEL])
    expect(d.julios).toBeCloseTo(36, 6)
    expect(d.porLampara[0].minutos).toBe(10)
  })

  it('la irradiancia que se enseña es la media del rato, no la de un tramo', () => {
    // La bombilla estuvo encendida veinte de los treinta minutos, así que su
    // 760 nm no te estuvo dando 10 mW/cm² todo el rato: te dio dos tercios.
    const d = dosisDeSesion(enTres(), [PANEL, BOMBILLA])
    const setecientos60 = d.porOnda.find((o) => o.nm === 760)!
    expect(setecientos60.irradiancia).toBeCloseTo((10 * 20) / 30, 6)
    // Y los julios siguen siendo los de verdad: 10 mW/cm² × 1200 s ÷ 1000.
    expect(setecientos60.julios).toBeCloseTo(12, 6)
  })

  it('los picos se unen a lo largo de la sesión, aunque nunca coincidieran', () => {
    // El panel cubre 620, 680 y 820; la bombilla trae el de 760. En esta sesión
    // los cuatro se cubrieron, aunque el tercer tramo ya no tuviera el panel.
    expect(dosisDeSesion(enTres(), [PANEL, BOMBILLA]).picos).toEqual([620, 680, 760, 820])
  })

  it('una sesión con tramos sigue contando como una en el acumulado', () => {
    const total = dosisAcumulada([enTres()], [PANEL, BOMBILLA])
    expect(total.sesiones).toBe(1)
    expect(total.minutos).toBe(30)
  })

  it('las lámparas de la sesión son todas las que se encendieron alguna vez', () => {
    expect(lamparasDe(enTres()).map((l) => l.lamparaId)).toEqual(['panel', 'bombilla'])
  })

  it('y una sin tramos se lee como un tramo único, para no tener dos caminos', () => {
    expect(tramosDe(sesion())).toEqual([
      { minutos: 10, lamparas: [{ lamparaId: 'panel', distanciaCm: 15 }] }
    ])
  })
})

describe('las lámparas de una sesión, en sus dos formas', () => {
  it('una sesión de las de antes trae la suya suelta y se lee igual', () => {
    expect(lamparasDe(sesion())).toEqual([{ lamparaId: 'panel', distanciaCm: 15 }])
  })

  it('una con varias trae la lista, y la primera está dentro', () => {
    const puestas = [
      { lamparaId: 'panel', distanciaCm: 15 },
      { lamparaId: 'otra', distanciaCm: 40 }
    ]
    expect(lamparasDe(sesion({ lamparas: puestas }))).toEqual(puestas)
  })

  it('una lista vacía no borra la lámpara suelta', () => {
    // Guardar `lamparas: []` sería un error de otro sitio, y perder la sesión
    // por eso sería peor que leer lo que sí está.
    expect(lamparasDe(sesion({ lamparas: [] }))).toHaveLength(1)
  })
})

describe('el factor de distancia', () => {
  it('vale uno en la distancia de referencia', () => {
    expect(factorDistancia(15, 15)).toBe(1)
  })

  it('y sigue el cuadrado en ambas direcciones', () => {
    expect(factorDistancia(30, 15)).toBeCloseTo(0.25, 6)
    expect(factorDistancia(60, 15)).toBeCloseTo(0.0625, 6)
    expect(factorDistancia(15, 30)).toBeCloseTo(4, 6)
  })
})

describe('si una lámpara se puede calcular', () => {
  it('el panel completo sí', () => {
    expect(lamparaCalculable(PANEL)).toBe(true)
  })

  it('una sin ondas no', () => {
    expect(lamparaCalculable({ ...PANEL, ondas: [] })).toBe(false)
  })

  it('una con una onda fuera de rango tampoco: eso es una errata', () => {
    expect(lamparaCalculable({ ...PANEL, ondas: [{ nm: 66, irradiancia: 10 }] })).toBe(false)
  })

  it('ni una sin irradiancia, que es justo el dato que falta para la dosis', () => {
    expect(lamparaCalculable({ ...PANEL, ondas: [{ nm: 660, irradiancia: 0 }] })).toBe(false)
  })
})

describe('cómo se escribe', () => {
  it('los julios con un decimal y coma', () => {
    expect(escribirJulios(36)).toBe('36,0 J/cm²')
    expect(escribirJulios(7.24)).toBe('7,2 J/cm²')
  })

  it('la irradiancia con su unidad', () => {
    expect(escribirIrradiancia(12)).toBe('12 mW/cm²')
    expect(escribirIrradiancia(4.5)).toBe('4,5 mW/cm²')
  })
})
