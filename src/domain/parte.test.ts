import { describe, expect, it } from 'vitest'
import { ORDEN_SIGNO, parteDelDia, puntosDe, type DatosDelParte, type Signo } from './parte'
import type { SalidaAlExterior } from './types'

const MADRID = { lat: 40.4168, lon: -3.7038 }
const TROMSO = { lat: 69.6492, lon: 18.9553 }

const JUNIO = '2026-06-21'
const DICIEMBRE = '2026-12-21'

const base = (extra: Partial<DatosDelParte> = {}): DatosDelParte => ({
  hoy: JUNIO,
  ahoraMin: 12 * 60,
  coord: MADRID,
  desfaseMin: 120,
  ...extra
})

const salida = (desde: number, minutos: number, date = JUNIO): SalidaAlExterior => ({
  id: `s-${desde}`,
  date,
  desde,
  minutos,
  filtro: 'ninguno'
})

const ids = (d: DatosDelParte): string[] => parteDelDia(d).puntos.map((x) => x.id)

describe('el tono: nada entra como «contra» por no haber podido', () => {
  it('un día de diciembre sin UVB da «no había», no un punto negativo', () => {
    const parte = parteDelDia(base({ hoy: DICIEMBRE, desfaseMin: 60 }))
    const uvb = parte.puntos.find((x) => x.id === 'vitamina-d')
    expect(uvb?.signo).toBe('no_habia')
    // Y lo dice sin señalar a nadie: el sol no llegó, y punto.
    expect(uvb?.porque).toMatch(/no es que no salieras/i)
  })

  it('un día entero sin apuntar nada no genera una lista de reproches', () => {
    // Es el caso de quien abre la app por primera vez a media tarde. Si eso
    // devolviera cinco puntos en contra, la app se desinstala esa misma tarde.
    const parte = parteDelDia(base({ ahoraMin: 18 * 60 }))
    expect(parte.contra).toBe(0)
  })

  it('tampoco a medianoche, cuando ya no queda nada a tiempo', () => {
    expect(parteDelDia(base({ ahoraMin: 23 * 60 + 50 })).contra).toBe(0)
  })

  it('no salir por la mañana no es un punto en contra', () => {
    const parte = parteDelDia(base({ ahoraMin: 14 * 60 }))
    const amanecer = parte.puntos.find((x) => x.id === 'amanecer')
    expect(amanecer?.signo).toBe('no_habia')
    expect(amanecer?.porque).toMatch(/si a esa hora estabas dentro/i)
  })

  it('en la noche polar no hay ventana de amanecer y se dice así', () => {
    const parte = parteDelDia(base({ hoy: DICIEMBRE, coord: TROMSO, desfaseMin: 60 }))
    const amanecer = parte.puntos.find((x) => x.id === 'amanecer')
    expect(amanecer?.signo).toBe('no_habia')
    expect(amanecer?.porque).toMatch(/no depende de ti/i)
  })

  it('los únicos «contra» posibles son cosas que se hicieron', () => {
    // Se recorren varias situaciones normales y se comprueba que ningún punto
    // negativo nace de una ausencia.
    const casos: DatosDelParte[] = [
      base(),
      base({ ahoraMin: 8 * 60 }),
      base({ ahoraMin: 22 * 60 }),
      base({ hoy: DICIEMBRE, desfaseMin: 60 }),
      base({ coord: TROMSO }),
      base({ entreno: { hecho: false, tocaba: true } }),
      base({ deudaSemana: { minutos: 36, diasSinPulso: 3 } })
    ]
    for (const c of casos) {
      expect(puntosDe(parteDelDia(c), 'contra'), JSON.stringify(c.hoy)).toEqual([])
    }
  })
})

describe('lo que aún está a tiempo', () => {
  it('a las siete de la mañana la ventana de fase está abierta', () => {
    const parte = parteDelDia(base({ ahoraMin: 7 * 60 }))
    const amanecer = parte.puntos.find((x) => x.id === 'amanecer')
    expect(amanecer?.signo).toBe('aun_puedes')
    expect(amanecer?.hasta).toBeGreaterThan(7 * 60)
  })

  it('y desaparece al pasar su hora', () => {
    const abierto = parteDelDia(base({ ahoraMin: 7 * 60 }))
    const cerrado = parteDelDia(base({ ahoraMin: 14 * 60 }))
    expect(abierto.puntos.find((x) => x.id === 'amanecer')?.signo).toBe('aun_puedes')
    expect(cerrado.puntos.find((x) => x.id === 'amanecer')?.signo).not.toBe('aun_puedes')
  })

  it('los «aún a tiempo» van los primeros de la lista, porque son los accionables', () => {
    const parte = parteDelDia(base({ ahoraMin: 7 * 60 }))
    expect(parte.aunPuedes).toBeGreaterThan(0)
    const primeros = parte.puntos.slice(0, parte.aunPuedes).map((x) => x.signo)
    expect(new Set(primeros)).toEqual(new Set(['aun_puedes']))
  })

  it('la lista sale siempre en el orden declarado de signos', () => {
    const parte = parteDelDia(
      base({
        ahoraMin: 7 * 60,
        salidas: [salida(6 * 60 + 20, 20)],
        noche: { date: JUNIO, apagado: 1400, levantado: 380 }
      })
    )
    const posiciones = parte.puntos.map((x) => ORDEN_SIGNO.indexOf(x.signo))
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b))
  })
})

describe('la luz de la mañana', () => {
  it('salir dentro de la ventana de fase suma', () => {
    const parte = parteDelDia(base({ salidas: [salida(6 * 60 + 30, 20)] }))
    const amanecer = parte.puntos.find((x) => x.id === 'amanecer')
    expect(amanecer?.signo).toBe('favor')
    expect(amanecer?.cuando).toBeDefined()
  })

  it('salir a mediodía no cuenta como pulso de mañana', () => {
    // El caso que ya rompió una vez la tarjeta de «Hoy»: alguien sale a la una
    // y la app le dice que ya cogió la luz de la mañana.
    const parte = parteDelDia(base({ ahoraMin: 20 * 60, salidas: [salida(13 * 60, 40)] }))
    expect(parte.puntos.find((x) => x.id === 'amanecer')?.signo).not.toBe('favor')
  })

  it('el sol de la mañana suma amplitud, con sus minutos', () => {
    const parte = parteDelDia(base({ salidas: [salida(9 * 60, 45)] }))
    const manana = parte.puntos.find((x) => x.id === 'manana')
    expect(manana?.signo).toBe('favor')
    expect(manana?.titulo).toContain('45 min')
  })

  it('solo cuentan los minutos que caen dentro de la ventana, no el rato entero', () => {
    // El mediodía solar en Madrid en junio es antes de las 15:00.
    const parte = parteDelDia(base({ ahoraMin: 20 * 60, salidas: [salida(15 * 60, 60)] }))
    expect(parte.puntos.find((x) => x.id === 'manana')).toBeUndefined()
  })
})

describe('la vitamina D', () => {
  const conSol = (extra: Partial<DatosDelParte> = {}) =>
    parteDelDia(
      base({
        ahoraMin: 20 * 60,
        sol: [
          {
            date: JUNIO,
            exposiciones: [
              { minutos: 20, franja: 'mediodia', piel: 'banador', desde: 14 * 60, cielo: 'limpio' }
            ]
          }
        ],
        ...extra
      })
    )

  it('con sol de mediodía apuntado, suma y dice las UI', () => {
    const v = conSol().puntos.find((x) => x.id === 'vitamina-d')
    expect(v?.signo).toBe('favor')
    expect(v?.titulo).toMatch(/UI/)
  })

  it('y se presenta como estimación, no como medida', () => {
    expect(conSol().puntos.find((x) => x.id === 'vitamina-d')?.porque).toMatch(
      /estimación, no medida/i
    )
  })

  it('el sol fuera de la ventana cuenta para el reloj pero no para la vitamina D', () => {
    const parte = parteDelDia(
      base({
        ahoraMin: 23 * 60,
        salidas: [salida(7 * 60, 30)],
        sol: [
          {
            date: JUNIO,
            exposiciones: [
              { minutos: 30, franja: 'manana', piel: 'cara_manos', desde: 7 * 60, cielo: 'limpio' }
            ]
          }
        ]
      })
    )
    const v = parte.puntos.find((x) => x.id === 'vitamina-d')
    expect(v?.signo).toBe('no_habia')
    expect(v?.porque).toMatch(/para la vitamina D, no/i)
  })
})

describe('la noche', () => {
  it('apagar mucho después del ocaso sí es un «contra»: es algo que se hizo', () => {
    // En diciembre el sol se pone antes de las seis: a las 23:30 llevas casi
    // seis horas de bombilla.
    const parte = parteDelDia(
      base({
        hoy: DICIEMBRE,
        desfaseMin: 60,
        ahoraMin: 20 * 60,
        noche: { date: DICIEMBRE, apagado: 23 * 60 + 30, levantado: 7 * 60 }
      })
    )
    expect(parte.puntos.find((x) => x.id === 'noche-azul')?.signo).toBe('contra')
  })

  it('pero la misma hora en junio no lo es: el ocaso se ha ido a las diez', () => {
    // El umbral se mide contra el ocaso real, no contra un reloj fijo. Apagar
    // a las 23:30 en junio deja vivir una tarde normal.
    const parte = parteDelDia(
      base({ ahoraMin: 20 * 60, noche: { date: JUNIO, apagado: 23 * 60 + 30, levantado: 7 * 60 } })
    )
    expect(parte.puntos.find((x) => x.id === 'noche-azul')).toBeUndefined()
  })

  it('la noche corta se apunta sin reproche', () => {
    const parte = parteDelDia(
      base({ ahoraMin: 20 * 60, noche: { date: JUNIO, apagado: 2 * 60, levantado: 5 * 60 } })
    )
    const n = parte.puntos.find((x) => x.id === 'noche-oscuridad')
    expect(n?.signo).toBe('no_habia')
    expect(n?.porque).toMatch(/sin reproche/i)
  })

  it('una noche entera suma', () => {
    const parte = parteDelDia(
      base({ ahoraMin: 20 * 60, noche: { date: JUNIO, apagado: 22 * 60, levantado: 7 * 60 } })
    )
    expect(parte.puntos.find((x) => x.id === 'noche-oscuridad')?.signo).toBe('favor')
  })

  it('la noche que viene se ofrece mientras quede tarde', () => {
    const dic = (ahoraMin: number) => ids(base({ hoy: DICIEMBRE, desfaseMin: 60, ahoraMin }))
    expect(dic(15 * 60)).toContain('noche-esta')
    expect(dic(22 * 60)).not.toContain('noche-esta')
  })
})

describe('la mesa', () => {
  const comidas = (horas: string[], date = JUNIO) => ({
    date,
    comidas: horas.map((hora) => ({
      hora,
      texto: 'huevos',
      alimentos: [{ nombre: 'huevo', alimentoId: 'huevo', gramos: 100 }]
    }))
  })

  it('sin comidas apuntadas no dice nada de la mesa', () => {
    expect(ids(base()).some((x) => x.startsWith('mesa'))).toBe(false)
  })

  it('una ventana corta suma', () => {
    const parte = parteDelDia(base({ ahoraMin: 20 * 60, comidas: comidas(['12:00', '19:00']) }))
    expect(parte.puntos.find((x) => x.id === 'mesa-ventana')?.signo).toBe('favor')
  })

  it('una ventana de quince horas resta, y eso sí es algo que se hizo', () => {
    const parte = parteDelDia(base({ ahoraMin: 23 * 60, comidas: comidas(['07:00', '22:00']) }))
    expect(parte.puntos.find((x) => x.id === 'mesa-ventana')?.signo).toBe('contra')
  })

  it('cerrar la mesa con el sol ya puesto resta', () => {
    const parte = parteDelDia(
      base({
        hoy: DICIEMBRE,
        desfaseMin: 60,
        ahoraMin: 23 * 60,
        comidas: comidas(['14:00', '22:00'], DICIEMBRE)
      })
    )
    expect(parte.puntos.find((x) => x.id === 'mesa-tarde')?.signo).toBe('contra')
  })

  it('pero cenar a una hora normal de junio, no', () => {
    const d = base({ ahoraMin: 23 * 60, comidas: comidas(['14:00', '21:00']) })
    expect(ids(d)).not.toContain('mesa-tarde')
    expect(parteDelDia(d).contra).toBe(0)
  })

  it('sin cobertura de datos no se inventa un ratio de omegas', () => {
    // Un alimento sin dato de omegas no puede dar un punto sobre omegas.
    const dia = {
      date: JUNIO,
      comidas: [
        { hora: '14:00', texto: 'lo que sea', alimentos: [{ nombre: 'lo que sea', gramos: 200 }] }
      ]
    }
    expect(ids(base({ ahoraMin: 20 * 60, comidas: dia }))).not.toContain('mesa-omegas')
  })
})

describe('los dos relojes', () => {
  it('comer antes de ver luz resta', () => {
    const parte = parteDelDia(
      base({
        ahoraMin: 20 * 60,
        salidas: [salida(13 * 60, 30)],
        comidas: { date: JUNIO, comidas: [{ hora: '07:00', texto: 'café', alimentos: [] }] }
      })
    )
    const r = parte.puntos.find((x) => x.id === 'relojes')
    expect(r?.signo).toBe('contra')
    expect(r?.titulo).toMatch(/antes de ver luz/)
  })

  it('y hacerlo en el orden bueno suma', () => {
    const parte = parteDelDia(
      base({
        ahoraMin: 20 * 60,
        salidas: [salida(7 * 60, 20)],
        comidas: { date: JUNIO, comidas: [{ hora: '13:00', texto: 'comida', alimentos: [] }] }
      })
    )
    expect(parte.puntos.find((x) => x.id === 'relojes')?.signo).toBe('favor')
  })

  it('sin uno de los dos datos no se opina', () => {
    expect(ids(base({ salidas: [salida(7 * 60, 20)] }))).not.toContain('relojes')
  })
})

describe('la lámpara', () => {
  const sesion = {
    id: 'p1',
    date: JUNIO,
    lamparaId: 'panel',
    hora: 20 * 60,
    minutos: 12,
    distanciaCm: 20,
    zona: 'torso' as const
  }

  it('la sesión suma', () => {
    const parte = parteDelDia(base({ ahoraMin: 21 * 60, sesionesPBM: [sesion] }))
    expect(parte.puntos.find((x) => x.id === 'pbm')?.signo).toBe('favor')
  })

  it('y siempre viene con su letra pequeña: ni fase ni UVB', () => {
    // Una lámpara presentada sin lo que no tapa acaba sustituyendo al sol en la
    // cabeza de quien la usa.
    const parte = parteDelDia(base({ ahoraMin: 21 * 60, sesionesPBM: [sesion] }))
    const nota = parte.puntos.find((x) => x.id === 'pbm-no-tapa')
    expect(nota?.signo).toBe('no_habia')
    expect(nota?.porque).toMatch(/vitamina D/i)
  })

  it('sin sesión no aparece ninguna de las dos', () => {
    expect(ids(base()).some((x) => x.startsWith('pbm'))).toBe(false)
  })
})

describe('la semana', () => {
  it('sin deuda, la semana va en hora', () => {
    const parte = parteDelDia(base({ deudaSemana: { minutos: 0, diasSinPulso: 0 } }))
    expect(parte.puntos.find((x) => x.id === 'semana')?.signo).toBe('favor')
  })

  it('con deuda y la ventana abierta, se ofrece recuperarla', () => {
    const parte = parteDelDia(
      base({ ahoraMin: 7 * 60, deudaSemana: { minutos: 36, diasSinPulso: 3 } })
    )
    expect(parte.puntos.find((x) => x.id === 'semana')?.signo).toBe('aun_puedes')
  })

  it('con deuda y la ventana cerrada, se dice sin culpar y se manda al fin de semana', () => {
    const parte = parteDelDia(
      base({ ahoraMin: 18 * 60, deudaSemana: { minutos: 36, diasSinPulso: 3 } })
    )
    const s = parte.puntos.find((x) => x.id === 'semana')
    expect(s?.signo).toBe('no_habia')
    expect(s?.porque).toMatch(/fin de semana/i)
  })

  it('haber cogido la luz hoy con deuda pendiente cuenta como recuperación', () => {
    const parte = parteDelDia(
      base({
        ahoraMin: 12 * 60,
        salidas: [salida(6 * 60 + 30, 20)],
        deudaSemana: { minutos: 36, diasSinPulso: 3 }
      })
    )
    const s = parte.puntos.find((x) => x.id === 'semana')
    expect(s?.signo).toBe('favor')
    // Sin prometer que se arregla de golpe.
    expect(s?.porque).toMatch(/no de golpe/i)
  })
})

describe('el entreno y los hábitos', () => {
  it('entrenar suma', () => {
    expect(
      parteDelDia(base({ entreno: { hecho: true } })).puntos.find((x) => x.id === 'entreno')?.signo
    ).toBe('favor')
  })

  it('no entrenar con una zona corta se ofrece, no se reprocha', () => {
    const parte = parteDelDia(base({ entreno: { hecho: false, tocaba: true } }))
    expect(parte.puntos.find((x) => x.id === 'entreno')?.signo).toBe('aun_puedes')
  })

  it('un día con todo al día no genera punto', () => {
    expect(ids(base({ entreno: { hecho: false, tocaba: false } }))).not.toContain('entreno')
  })

  it('el frío y el grounding suman con su escalón y su racha', () => {
    const parte = parteDelDia(
      base({
        habitos: [
          { date: JUNIO, habito: 'frio', nivel: 2, minutos: 3 },
          { date: JUNIO, habito: 'grounding', nivel: 1, minutos: 10 }
        ]
      })
    )
    expect(parte.puntos.find((x) => x.id === 'habito-frio')?.signo).toBe('favor')
    expect(parte.puntos.find((x) => x.id === 'habito-grounding')?.titulo).toContain('10 min')
  })

  it('los hábitos de otro día no cuentan hoy', () => {
    expect(ids(base({ habitos: [{ date: '2026-06-01', habito: 'frio', nivel: 2 }] }))).not.toContain(
      'habito-frio'
    )
  })
})

describe('el titular', () => {
  it('cuenta lo que hay y calla lo que no', () => {
    const parte = parteDelDia(base({ ahoraMin: 23 * 60 }))
    expect(parte.titular).toContain('a favor')
    expect(parte.titular).not.toContain('en contra')
  })

  it('los cuatro recuentos cuadran con la lista', () => {
    const parte = parteDelDia(
      base({
        ahoraMin: 7 * 60,
        salidas: [salida(6 * 60 + 30, 30)],
        noche: { date: JUNIO, apagado: 23 * 60 + 45, levantado: 6 * 60 },
        deudaSemana: { minutos: 24, diasSinPulso: 2 }
      })
    )
    expect(parte.favor + parte.contra + parte.aunPuedes + parte.noHabia).toBe(parte.puntos.length)
  })

  it('cada punto tiene un id distinto', () => {
    const lista = ids(
      base({
        ahoraMin: 12 * 60,
        salidas: [salida(6 * 60 + 30, 30)],
        noche: { date: JUNIO, apagado: 23 * 60, levantado: 7 * 60 },
        entreno: { hecho: true },
        habitos: [{ date: JUNIO, habito: 'frio', nivel: 1, minutos: 2 }],
        deudaSemana: { minutos: 12, diasSinPulso: 1 }
      })
    )
    expect(new Set(lista).size).toBe(lista.length)
  })

  it('todos los puntos traen su porqué, no solo un título', () => {
    for (const punto of parteDelDia(base({ ahoraMin: 9 * 60 })).puntos) {
      expect(punto.porque.length, punto.id).toBeGreaterThan(20)
    }
  })

  it('no aparece ninguna doble cuenta del mismo rato de sol', () => {
    // Un mismo rato fuera alimenta el amanecer, la amplitud y la vitamina D,
    // pero cada uno aporta un punto y solo uno.
    const lista = ids(
      base({ ahoraMin: 20 * 60, salidas: [salida(6 * 60 + 30, 30), salida(9 * 60, 20)] })
    )
    expect(lista.filter((x) => x === 'manana')).toHaveLength(1)
    expect(lista.filter((x) => x === 'amanecer')).toHaveLength(1)
  })
})
