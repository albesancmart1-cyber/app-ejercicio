import { describe, expect, it } from 'vitest'
import { minutosDe, repartoDelDia, unir, type DatosDelReparto } from './reparto'
import type { SalidaAlExterior } from './types'

const HOY = '2026-06-21'
const AYER = '2026-06-20'

const salida = (tipo: SalidaAlExterior['tipo'], desde: number, minutos: number, date = HOY) => ({
  id: `${tipo}-${desde}`,
  date,
  desde,
  minutos,
  filtro: 'ninguno' as const,
  ...(tipo ? { tipo } : {})
})

const base = (extra: Partial<DatosDelReparto> = {}): DatosDelReparto => ({
  fecha: HOY,
  ahoraMin: 20 * 60,
  ahoraMs: Date.parse('2026-06-21T20:00:00'),
  ...extra
})

const rama = (r: ReturnType<typeof repartoDelDia>, id: string) => r.ramas.find((x) => x.id === id)

describe('unir tramos', () => {
  it('los que se pisan se pegan en uno', () => {
    expect(unir([{ desde: 600, hasta: 660 }, { desde: 630, hasta: 700 }])).toEqual([
      { desde: 600, hasta: 700 }
    ])
  })

  it('los que se tocan justo en el borde también', () => {
    // Salir media hora a las diez y otra media a las diez y media es una hora
    // seguida de calle, no dos ratos.
    expect(unir([{ desde: 600, hasta: 630 }, { desde: 630, hasta: 660 }])).toEqual([
      { desde: 600, hasta: 660 }
    ])
  })

  it('los sueltos se quedan sueltos', () => {
    expect(unir([{ desde: 600, hasta: 630 }, { desde: 800, hasta: 830 }])).toHaveLength(2)
  })

  it('uno dentro de otro no alarga nada', () => {
    expect(minutosDe([{ desde: 600, hasta: 720 }, { desde: 630, hasta: 660 }])).toBe(120)
  })

  it('no importa el orden en que lleguen', () => {
    const a = minutosDe([{ desde: 800, hasta: 830 }, { desde: 600, hasta: 660 }])
    const b = minutosDe([{ desde: 600, hasta: 660 }, { desde: 800, hasta: 830 }])
    expect(a).toBe(b)
  })

  it('los de duración cero no cuentan', () => {
    expect(minutosDe([{ desde: 600, hasta: 600 }])).toBe(0)
    expect(minutosDe([])).toBe(0)
  })

  it('un tramo al revés se endereza en vez de dar negativo', () => {
    expect(minutosDe([{ desde: 660, hasta: 600 }])).toBe(60)
  })
})

describe('el reparto no cuenta un minuto dos veces', () => {
  it('sol y descalzo a la vez son media hora de calle, no una', () => {
    // Es el fallo que tenía la cuenta de «Fuera»: sumaba los dos registros.
    // Sales al jardín, te descalzas, y eso es media hora de calle.
    const r = repartoDelDia(
      base({ salidas: [salida('sol', 600, 30), salida('grounding', 600, 30)] })
    )
    expect(rama(r, 'fuera')?.minutos).toBe(30)
  })

  it('pero cada rama de dentro sigue enseñando lo suyo entero', () => {
    // Los dos ocurrieron de verdad, y los dos duraron media hora. Lo que no se
    // puede es sumarlos para el total de calle.
    const r = repartoDelDia(
      base({ salidas: [salida('sol', 600, 30), salida('grounding', 600, 30)] })
    )
    const dentro = rama(r, 'fuera')?.dentro ?? []
    expect(dentro.find((x) => x.id === 'sol')?.minutos).toBe(30)
    expect(dentro.find((x) => x.id === 'grounding')?.minutos).toBe(30)
  })

  it('el atardecer cuelga de fuera, no va al lado', () => {
    const r = repartoDelDia(base({ salidas: [salida('atardecer', 1200, 20)] }))
    expect(r.ramas.map((x) => x.id)).toEqual(['fuera'])
    expect(rama(r, 'fuera')?.dentro?.map((x) => x.id)).toEqual(['atardecer'])
  })

  it('dos ratos seguidos se cuentan una vez cada uno', () => {
    const r = repartoDelDia(
      base({ salidas: [salida('fuera', 600, 30), salida('fuera', 800, 20)] })
    )
    expect(rama(r, 'fuera')?.minutos).toBe(50)
  })

  it('estar fichado y salir al patio son los mismos minutos del día', () => {
    // Aquí es donde una suma daría más de veinticuatro horas.
    const r = repartoDelDia(
      base({
        ahoraMin: 15 * 60,
        salidas: [salida('fuera', 600, 15)],
        fichajes: [
          {
            id: 'f',
            date: HOY,
            entrada: 7 * 60,
            salida: 15 * 60,
            luz: { nombre: 'Nave', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ninguno' }
          }
        ]
      })
    )
    expect(rama(r, 'trabajo')?.minutos).toBe(8 * 60)
    expect(rama(r, 'fuera')?.minutos).toBe(15)
    // Ocho horas, no ocho y cuarto: el patio estaba dentro de la jornada.
    expect(r.minutosApuntados).toBe(8 * 60)
  })
})

describe('de dónde sale cada rama', () => {
  it('la lámpara, de sus sesiones', () => {
    const r = repartoDelDia(
      base({
        sesionesPBM: [
          { id: 'a', date: HOY, lamparaId: 'p', hora: 1200, minutos: 12, distanciaCm: 20, zona: 'torso' }
        ]
      })
    )
    expect(rama(r, 'lampara')?.minutos).toBe(12)
  })

  it('y las de antes de que se guardara la hora también cuentan', () => {
    // No tienen tramo, así que no entran en la unión del día, pero perderlas
    // sería peor: se suman a su rama y ya.
    const r = repartoDelDia(
      base({
        sesionesPBM: [
          { id: 'a', date: HOY, lamparaId: 'p', minutos: 10, distanciaCm: 20, zona: 'torso' }
        ]
      })
    )
    expect(rama(r, 'lampara')?.minutos).toBe(10)
  })

  it('el frío, de su hábito: solo guarda minutos, sin hora', () => {
    const r = repartoDelDia(base({ habitos: [{ date: HOY, habito: 'frio', nivel: 2, minutos: 3 }] }))
    expect(rama(r, 'frio')?.minutos).toBe(3)
    // Sin hora no puede entrar en la unión del día, y no entra.
    expect(r.minutosApuntados).toBe(0)
  })

  it('la noche que cruza la medianoche solo cuenta lo que cae en este día', () => {
    // Apagar a las 23:30 del domingo y levantarse a las 07:00 se guarda con la
    // fecha del lunes. Del lunes son las siete horas de madrugada.
    const r = repartoDelDia(base({ noches: [{ date: HOY, apagado: 1410, levantado: 420 }] }))
    expect(rama(r, 'oscuridad')?.minutos).toBe(420)
  })

  it('y la que no la cruza cuenta entera', () => {
    const r = repartoDelDia(base({ noches: [{ date: HOY, apagado: 60, levantado: 480 }] }))
    expect(rama(r, 'oscuridad')?.minutos).toBe(420)
  })

  it('el trabajo sin fichar la salida llega hasta ahora', () => {
    const r = repartoDelDia(
      base({
        ahoraMin: 12 * 60,
        fichajes: [
          {
            id: 'f',
            date: HOY,
            entrada: 7 * 60,
            luz: { nombre: 'Nave', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ninguno' }
          }
        ]
      })
    )
    expect(rama(r, 'trabajo')?.minutos).toBe(5 * 60)
  })

  it('el entreno terminado, de su duración guardada', () => {
    const r = repartoDelDia(
      base({
        sessions: [
          {
            id: 's',
            date: HOY,
            kind: 'fuerza',
            title: 'Empuje',
            exercises: [],
            completed: true,
            startedAt: Date.parse('2026-06-21T18:00:00'),
            durationSec: 55 * 60
          }
        ]
      })
    )
    expect(rama(r, 'entreno')?.minutos).toBe(55)
  })

  it('y el que sigue en marcha, hasta ahora', () => {
    const r = repartoDelDia(
      base({
        ahoraMs: Date.parse('2026-06-21T19:30:00'),
        sessions: [
          {
            id: 's',
            date: HOY,
            kind: 'fuerza',
            title: 'Empuje',
            exercises: [],
            completed: false,
            startedAt: Date.parse('2026-06-21T19:00:00')
          }
        ]
      })
    )
    expect(rama(r, 'entreno')?.minutos).toBe(30)
  })
})

describe('lo que no se enseña', () => {
  it('un día sin nada apuntado no tiene ramas', () => {
    const r = repartoDelDia(base())
    expect(r.ramas).toEqual([])
    expect(r.minutosApuntados).toBe(0)
  })

  it('lo de otro día no entra', () => {
    const r = repartoDelDia(base({ salidas: [salida('sol', 600, 30, AYER)] }))
    expect(r.ramas).toEqual([])
  })

  it('una rama a cero no aparece, en vez de una barra vacía', () => {
    const r = repartoDelDia(base({ habitos: [{ date: HOY, habito: 'frio', nivel: 1, minutos: 0 }] }))
    expect(rama(r, 'frio')).toBeUndefined()
  })

  it('los ratos de antes de que existiera el tipo cuentan como calle, sin repartirse', () => {
    // Adivinar de qué botón salieron sería inventar el pasado.
    const r = repartoDelDia(base({ salidas: [salida(undefined, 600, 40)] }))
    expect(rama(r, 'fuera')?.minutos).toBe(40)
    expect(rama(r, 'fuera')?.dentro?.map((x) => x.id)).toEqual(['soloFuera'])
  })
})

describe('la escala de las barras', () => {
  it('el tope es la rama más larga, para que todas midan lo mismo', () => {
    const r = repartoDelDia(
      base({
        salidas: [salida('sol', 600, 30)],
        noches: [{ date: HOY, apagado: 0, levantado: 480 }]
      })
    )
    expect(r.tope).toBe(480)
  })

  it('sin nada apuntado el tope no es cero, que dividiría por cero', () => {
    expect(repartoDelDia(base()).tope).toBe(1)
  })
})
