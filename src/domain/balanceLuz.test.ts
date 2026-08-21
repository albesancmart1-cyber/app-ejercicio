import { describe, expect, it } from 'vitest'
import {
  ATRASO_POR_DIA_SIN_LUZ,
  balanceDelDia,
  deudaDeFase,
  hayLuzQueSirve,
  planDeAmanecer,
  ventanaDeFase,
  type Banda4,
  type DatosDelDia
} from './balanceLuz'
import type { Lampara, SalidaAlExterior } from './types'
import type { Coordenadas } from './arcoSolar'

const MADRID: Coordenadas = { lat: 40.4165, lon: -3.7026 }
const TROMSO: Coordenadas = { lat: 69.6496, lon: 18.956 }
const INVIERNO = 60
const VERANO = 120

const PANEL: Lampara = {
  id: 'panel',
  nombre: 'Panel',
  distanciaRefCm: 15,
  ondas: [
    { nm: 660, irradiancia: 30 },
    { nm: 850, irradiancia: 30 }
  ]
}

const salida = (desde: number, minutos: number, filtro: SalidaAlExterior['filtro'] = 'ninguno'): SalidaAlExterior => ({
  id: `s${desde}`,
  date: '2026-03-21',
  desde,
  minutos,
  filtro
})

const dia = (extra: Partial<DatosDelDia> = {}): DatosDelDia => ({
  fecha: '2026-03-21',
  coord: MADRID,
  desfaseMin: INVIERNO,
  ...extra
})

const barra = (b: ReturnType<typeof balanceDelDia>, banda: Banda4) =>
  b.barras.find((x) => x.banda === banda)!

describe('la barra de rojo e infrarrojo', () => {
  it('sin salir ni encender nada, está a cero', () => {
    expect(barra(balanceDelDia(dia()), 'rojo').fraccion).toBe(0)
  })

  it('sube con los minutos al aire libre', () => {
    const poco = barra(balanceDelDia(dia({ salidas: [salida(600, 15)] })), 'rojo').fraccion!
    const mucho = barra(balanceDelDia(dia({ salidas: [salida(600, 120)] })), 'rojo').fraccion!
    expect(mucho).toBeGreaterThan(poco)
    expect(poco).toBeGreaterThan(0)
  })

  it('la lámpara cuenta, pero no sustituye al día entero', () => {
    const soloLampara = balanceDelDia(
      dia({
        sesionesPBM: [
          { id: 'p', date: '2026-03-21', lamparaId: 'panel', minutos: 10, distanciaCm: 15, zona: 'espalda' }
        ],
        lamparas: [PANEL]
      })
    )
    const f = barra(soloLampara, 'rojo').fraccion!
    expect(f).toBeGreaterThan(0)
    expect(f).toBeLessThan(1) // no llega a tapar un día entero de sol
    expect(barra(soloLampara, 'rojo').detalle).toContain('lámpara')
  })

  it('nunca pasa de uno, por mucha lámpara que se acumule', () => {
    const exagerado = balanceDelDia(
      dia({
        salidas: [salida(500, 600)],
        sesionesPBM: Array.from({ length: 20 }, (_, i) => ({
          id: `p${i}`,
          date: '2026-03-21',
          lamparaId: 'panel',
          minutos: 30,
          distanciaCm: 10,
          zona: 'torso' as const
        })),
        lamparas: [PANEL]
      })
    )
    expect(barra(exagerado, 'rojo').fraccion).toBe(1)
  })

  it('en la noche polar no hay barra: no había nada que coger', () => {
    const polar = balanceDelDia(dia({ fecha: '2025-12-21', coord: TROMSO }))
    expect(barra(polar, 'rojo').fraccion).toBeNull()
    expect(barra(polar, 'rojo').detalle).toContain('no llega a salir')
  })
})

describe('la barra de ultravioleta', () => {
  it('en Madrid en diciembre no existe, y se dice por qué', () => {
    const b = barra(balanceDelDia(dia({ fecha: '2025-12-21' })), 'ultravioleta')
    // Esto es lo que hace honesto todo el balance: null y no cero.
    expect(b.fraccion).toBeNull()
    expect(b.detalle).toContain('No hay ventana de UVB')
  })

  it('en junio sí existe, y estar fuera dentro de ella la sube', () => {
    const fuera: SalidaAlExterior = { ...salida(13 * 60, 60), date: '2026-06-21' }
    const b = barra(
      balanceDelDia(dia({ fecha: '2026-06-21', desfaseMin: VERANO, salidas: [fuera] })),
      'ultravioleta'
    )
    expect(b.fraccion).toBeGreaterThan(0)
    expect(b.detalle).toContain('60 min dentro')
  })

  it('salir fuera de la ventana no cuenta, por mucho sol que diera', () => {
    // Las ocho de la mañana en junio: hay sol de sobra, pero no hay UVB.
    const temprano: SalidaAlExterior = { ...salida(8 * 60, 90), date: '2026-06-21' }
    const b = barra(
      balanceDelDia(dia({ fecha: '2026-06-21', desfaseMin: VERANO, salidas: [temprano] })),
      'ultravioleta'
    )
    expect(b.fraccion).toBe(0)
  })

  it('a quien fichó, no se le echa la culpa', () => {
    const b = barra(
      balanceDelDia(
        dia({
          fecha: '2026-06-21',
          desfaseMin: VERANO,
          fichaje: {
            id: 'f',
            date: '2026-06-21',
            entrada: 405,
            luz: { nombre: 'Taller', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ambar' }
          }
        })
      ),
      'ultravioleta'
    )
    expect(b.detalle).toContain('No es un fallo tuyo')
  })
})

describe('la barra de azul, que va por ventanas y no por cantidad', () => {
  it('salir en la ventana del amanecer gana el pulso de fase', () => {
    const v = ventanaDeFase('2026-03-21', MADRID, INVIERNO)
    const b = barra(balanceDelDia(dia({ salidas: [salida(Math.round(v.desde!) + 10, 15)] })), 'azul')
    expect(b.detalle).toContain('pulso de fase sí')
  })

  it('salir solo a mediodía no lo gana: la ventana ya pasó', () => {
    const b = barra(balanceDelDia(dia({ salidas: [salida(13 * 60, 60)] })), 'azul')
    expect(b.detalle).toContain('pulso de fase no')
  })

  it('salir al amanecer con gafas de filtro tampoco: eso es lo que bloquean', () => {
    const v = ventanaDeFase('2026-03-21', MADRID, INVIERNO)
    const b = barra(
      balanceDelDia(dia({ salidas: [salida(Math.round(v.desde!) + 10, 15, 'rojo')] })),
      'azul'
    )
    expect(b.detalle).toContain('pulso de fase no')
  })

  it('no apuntar la noche no penaliza a nadie', () => {
    // Sin dato de oscuridad se conserva el tercio: no se castiga el silencio.
    const sinDato = barra(balanceDelDia(dia()), 'azul').fraccion!
    const conBuenaNoche = barra(
      balanceDelDia(dia({ oscuridadDesde: 22 * 60, oscuridadHasta: 6 * 60 })),
      'azul'
    ).fraccion!
    expect(sinDato).toBe(conBuenaNoche)
  })

  it('pero trasnochar con luz mucho después del ocaso sí resta', () => {
    const b = barra(balanceDelDia(dia({ oscuridadDesde: 23 * 60 + 59 })), 'azul')
    expect(b.detalle).toContain('azul después del ocaso')
    expect(b.fraccion).toBeLessThan(1)
  })

  it('el mejor día posible llega a uno', () => {
    const v = ventanaDeFase('2026-03-21', MADRID, INVIERNO)
    const b = barra(
      balanceDelDia(
        dia({
          salidas: [salida(Math.round(v.desde!) + 10, 30), salida(13 * 60, 60)],
          oscuridadDesde: 21 * 60,
          oscuridadHasta: 6 * 60
        })
      ),
      'azul'
    )
    expect(b.fraccion).toBe(1)
  })
})

describe('la barra de oscuridad', () => {
  it('se mide contra la noche que tocaba, no contra ocho horas fijas', () => {
    // Nueve horas a oscuras en junio, cuando la noche dura menos, es un pleno.
    const junio = barra(
      balanceDelDia(
        dia({ fecha: '2026-06-21', desfaseMin: VERANO, oscuridadDesde: 22 * 60, oscuridadHasta: 7 * 60 })
      ),
      'oscuridad'
    )
    expect(junio.fraccion).toBe(1)
  })

  it('y en diciembre, con noches largas, esas mismas nueve horas no bastan', () => {
    const diciembre = barra(
      balanceDelDia(
        dia({ fecha: '2025-12-21', oscuridadDesde: 22 * 60, oscuridadHasta: 7 * 60 })
      ),
      'oscuridad'
    )
    expect(diciembre.fraccion).toBeLessThan(1)
  })

  it('cuenta bien una noche que cruza la medianoche', () => {
    const b = barra(
      balanceDelDia(dia({ oscuridadDesde: 23 * 60, oscuridadHasta: 6 * 60 })),
      'oscuridad'
    )
    expect(b.detalle).toBe('7 h 00 min a oscuras')
  })

  it('sin apuntar, no hay barra, en vez de un cero injusto', () => {
    expect(barra(balanceDelDia(dia()), 'oscuridad').fraccion).toBeNull()
  })
})

describe('la deuda de fase de la semana', () => {
  it('cada día sin pulso son doce minutos de atraso', () => {
    const d = deudaDeFase([
      { fecha: '2026-03-16', huboPulso: false },
      { fecha: '2026-03-17', huboPulso: false },
      { fecha: '2026-03-18', huboPulso: true }
    ])
    expect(d.diasSinPulso).toBe(2)
    expect(d.minutos).toBe(2 * ATRASO_POR_DIA_SIN_LUZ)
  })

  it('una semana entera de taller son más de media hora', () => {
    const semana = Array.from({ length: 5 }, (_, i) => ({ fecha: `d${i}`, huboPulso: false }))
    expect(deudaDeFase(semana).minutos).toBe(60)
  })

  it('sin días, cero y sin reventar', () => {
    expect(deudaDeFase([])).toEqual({ minutos: 0, diasSinPulso: 0 })
  })
})

describe('el plan del fin de semana', () => {
  it('da una ventana de verdad, con su hora', () => {
    const p = planDeAmanecer('2026-03-21', MADRID, 34, INVIERNO)!
    expect(p.desde).toBeLessThan(p.hasta)
    expect(p.recupera).toBeGreaterThan(0)
    expect(p.recupera).toBeLessThan(34) // no promete arreglarlo todo de golpe
  })

  it('la ventana empieza en el crepúsculo civil, antes de que salga el sol', () => {
    const p = planDeAmanecer('2026-03-21', MADRID, 30, INVIERNO)!
    expect(hayLuzQueSirve('2026-03-21', MADRID, p.desde + 1, INVIERNO)).toBe(true)
    expect(hayLuzQueSirve('2026-03-21', MADRID, p.desde - 20, INVIERNO)).toBe(false)
  })

  it('donde no amanece, no hay plan que ofrecer, y se dice con null', () => {
    expect(planDeAmanecer('2025-12-21', TROMSO, 40, INVIERNO)).toBeNull()
  })
})
