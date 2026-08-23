import { describe, expect, it } from 'vitest'
import {
  MINUTOS_SI_SE_OLVIDA,
  MINUTOS_SOSPECHOSOS,
  NOMBRES_TIPO,
  abierto,
  abiertosDe,
  abrir,
  alParar,
  cerrar,
  IMPLICA_FUERA,
  loQueSeQuedoAbierto,
  minutosAbierto,
  minutosDeHoy,
  pareceOlvidado,
  yaEstaFuera,
  type Escritura
} from './medir'
import type { EnCurso, TipoEnCurso } from './types'

const HOY = '2026-06-21'
const AYER = '2026-06-20'

const enCurso = (tipo: TipoEnCurso, desde: number, extra: Partial<EnCurso> = {}): EnCurso => ({
  tipo,
  date: HOY,
  desde,
  ...extra
})

describe('abrir y cerrar', () => {
  it('abre una actividad y la encuentra', () => {
    const lista = abrir([], enCurso('sol', 600))
    expect(abierto(lista, 'sol', HOY)?.desde).toBe(600)
  })

  it('permite varias a la vez, porque se solapan de verdad', () => {
    // Estás fichado en el taller y sales quince minutos al patio.
    const lista = abrir(abrir([], enCurso('fuera', 585)), enCurso('lampara', 1200))
    expect(abiertosDe(lista, HOY)).toHaveLength(2)
  })

  it('abrir dos veces el mismo tipo sustituye, no duplica', () => {
    const lista = abrir(abrir([], enCurso('sol', 600)), enCurso('sol', 700))
    expect(abiertosDe(lista, HOY)).toHaveLength(1)
    expect(abierto(lista, 'sol', HOY)?.desde).toBe(700)
  })

  it('cerrar una no cierra las otras', () => {
    const lista = abrir(abrir([], enCurso('sol', 600)), enCurso('frio', 700))
    const tras = cerrar(lista, 'sol', HOY)
    expect(abierto(tras, 'sol', HOY)).toBeUndefined()
    expect(abierto(tras, 'frio', HOY)).toBeDefined()
  })

  it('no confunde lo de hoy con lo de ayer', () => {
    const lista = [enCurso('sol', 600), { ...enCurso('sol', 600), date: AYER }]
    expect(abiertosDe(lista, HOY)).toHaveLength(1)
  })

  it('sin nada abierto no revienta', () => {
    expect(abiertosDe(undefined, HOY)).toEqual([])
    expect(abierto(undefined, 'sol', HOY)).toBeUndefined()
    expect(cerrar(undefined, 'sol', HOY)).toEqual([])
  })
})

describe('cuánto lleva abierto', () => {
  it('cuenta los minutos desde que empezó', () => {
    expect(minutosAbierto(enCurso('sol', 600), 640)).toBe(40)
  })

  it('nunca da negativo aunque el reloj se mueva hacia atrás', () => {
    // El cambio de hora o el móvil corrigiendo la hora de red dejarían
    // duraciones imposibles guardadas para siempre.
    expect(minutosAbierto(enCurso('sol', 600), 500)).toBe(0)
  })

  it('avisa de lo que lleva demasiado tiempo abierto', () => {
    expect(pareceOlvidado(enCurso('sol', 600), 600 + MINUTOS_SOSPECHOSOS)).toBe(true)
    expect(pareceOlvidado(enCurso('sol', 600), 660)).toBe(false)
  })
})

describe('lo que se guarda al parar', () => {
  /** Lo primero de un tipo, para no repetir el find en cada prueba. */
  const de = <T extends Escritura['en']>(lista: Escritura[], en: T) =>
    lista.find((e): e is Extract<Escritura, { en: T }> => e.en === en)

  it('los cuatro de luz natural dejan un rato fuera', () => {
    for (const tipo of ['sol', 'amanecer', 'atardecer', 'fuera'] as TipoEnCurso[]) {
      const salida = de(alParar(enCurso(tipo, 600), 620), 'salida')
      expect(salida, tipo).toBeDefined()
      expect(salida!.salida.desde).toBe(600)
      expect(salida!.salida.minutos).toBe(20)
      expect(salida!.salida.tipo).toBe(tipo)
    }
  })

  it('pero solo el sol deja además su exposición para la vitamina D', () => {
    expect(de(alParar(enCurso('sol', 600), 620), 'exposicion')).toBeDefined()
    expect(de(alParar(enCurso('fuera', 600), 620), 'exposicion')).toBeUndefined()
  })

  it('la exposición lleva la piel y el cielo de cuando empezó, y su hora', () => {
    const e = de(alParar(enCurso('sol', 600, { piel: 'banador', cielo: 'velado' }), 620), 'exposicion')
    expect(e!.exposicion.piel).toBe('banador')
    expect(e!.exposicion.cielo).toBe('velado')
    expect(e!.exposicion.desde).toBe(600)
    expect(e!.exposicion.minutos).toBe(20)
  })

  it('el grounding deja hábito **y** rato fuera: estar descalzo en la hierba es estar fuera', () => {
    // Antes solo dejaba el hábito, y por eso una hora descalzo no subía la
    // amplitud del día. Es el caso que motivó entrelazar las baldosas.
    const r = alParar(enCurso('grounding', 600), 660, { nivelHabito: 2 })
    expect(de(r, 'habito')!.registro.habito).toBe('grounding')
    expect(de(r, 'salida')!.salida.minutos).toBe(60)
  })

  it('el frío no deja rato fuera: una ducha fría se da dentro de casa', () => {
    const r = alParar(enCurso('frio', 600), 603, { nivelHabito: 2 })
    expect(de(r, 'habito')!.registro.minutos).toBe(3)
    expect(de(r, 'salida')).toBeUndefined()
  })

  it('nada deja dos ratos fuera a la vez, que sería contarlos dos veces', () => {
    for (const tipo of Object.keys(NOMBRES_TIPO) as TipoEnCurso[]) {
      const salidas = alParar(enCurso(tipo, 600), 620).filter((e) => e.en === 'salida')
      expect(salidas.length, tipo).toBeLessThanOrEqual(1)
    }
  })

  it('el filtro de las gafas viaja hasta la salida', () => {
    const r = alParar(enCurso('amanecer', 400, { filtro: 'rojo' }), 420)
    expect(de(r, 'salida')!.salida.filtro).toBe('rojo')
  })

  it('sin filtro se guarda «ninguno» y no undefined', () => {
    expect(de(alParar(enCurso('fuera', 600), 620), 'salida')!.salida.filtro).toBe('ninguno')
  })

  it('la lámpara guarda su sesión con la hora, la zona y la distancia', () => {
    const r = alParar(
      enCurso('lampara', 1200, { lamparaId: 'panel', distanciaCm: 30, zona: 'espalda' }),
      1210
    )
    const s = de(r, 'sesionPBM')!.sesion
    expect(s.lamparaId).toBe('panel')
    expect(s.minutos).toBe(10)
    expect(s.hora).toBe(1200)
    expect(s.distanciaCm).toBe(30)
    expect(s.zona).toBe('espalda')
  })

  it('una lámpara sin elegir no guarda nada, en vez de un registro que no cuenta', () => {
    expect(alParar(enCurso('lampara', 1200), 1210)).toEqual([])
  })

  it('la oscuridad se guarda con la fecha de la mañana en que uno se levanta', () => {
    // Apagar a las 23:30 del domingo y levantarse a las 07:00 es la noche del
    // lunes: es la que explica el peso del lunes. Ver `NocheRegistrada`.
    const n = de(alParar(enCurso('oscuridad', 23 * 60 + 30), 7 * 60), 'noche')!.noche
    expect(n.date).toBe('2026-06-22')
    expect(n.apagado).toBe(1410)
    expect(n.levantado).toBe(420)
  })

  it('y si se apaga y se levanta el mismo día, la fecha no cambia', () => {
    expect(de(alParar(enCurso('oscuridad', 60), 480), 'noche')!.noche.date).toBe(HOY)
  })

  it('parar antes de empezar no da minutos negativos', () => {
    expect(de(alParar(enCurso('sol', 600), 500), 'salida')!.salida.minutos).toBe(0)
  })

  it('todos los tipos tienen nombre para enseñar', () => {
    for (const tipo of Object.keys(NOMBRES_TIPO) as TipoEnCurso[]) {
      expect(NOMBRES_TIPO[tipo].length).toBeGreaterThan(3)
    }
  })
})

describe('lo que implica estar fuera', () => {
  it('el sol, el amanecer, el atardecer y el grounding cuentan como estar fuera', () => {
    expect([...IMPLICA_FUERA].sort()).toEqual(['amanecer', 'atardecer', 'grounding', 'sol'])
  })

  it('el frío no, porque una ducha fría se da dentro', () => {
    // Meterlo apuntaría minutos de calle que nunca ocurrieron.
    expect(IMPLICA_FUERA).not.toContain('frio')
    expect(IMPLICA_FUERA).not.toContain('lampara')
    expect(IMPLICA_FUERA).not.toContain('oscuridad')
  })

  it('sabe decir si ya estás fuera, y por cuál', () => {
    expect(yaEstaFuera([enCurso('sol', 600)], HOY)).toBe('sol')
    expect(yaEstaFuera([enCurso('grounding', 600)], HOY)).toBe('grounding')
  })

  it('el frío corriendo no te pone fuera', () => {
    expect(yaEstaFuera([enCurso('frio', 600)], HOY)).toBeUndefined()
  })

  it('ni lo de ayer, ni una lista vacía', () => {
    expect(yaEstaFuera([{ ...enCurso('sol', 600), date: AYER }], HOY)).toBeUndefined()
    expect(yaEstaFuera(undefined, HOY)).toBeUndefined()
  })
})

describe('cuando se olvida parar', () => {
  it('lo de días anteriores se cierra con una duración conservadora', () => {
    // Media hora, no catorce: apuntar catorce horas de sol envenenaría la
    // vitamina D del día, el balance de luz y la amplitud de la semana de una vez.
    const pendientes = loQueSeQuedoAbierto([{ ...enCurso('sol', 660), date: AYER }], HOY)
    expect(pendientes).toHaveLength(1)
    const salida = pendientes[0].escrituras.find((e) => e.en === 'salida')
    expect(salida?.en === 'salida' && salida.salida.minutos).toBe(MINUTOS_SI_SE_OLVIDA)
  })

  it('y se marca como estimado, para poder decirlo', () => {
    const pendientes = loQueSeQuedoAbierto([{ ...enCurso('sol', 660), date: AYER }], HOY)
    const salida = pendientes[0].escrituras.find((e) => e.en === 'salida')
    expect(salida?.en === 'salida' && salida.salida.estimado).toBe(true)
  })

  it('lo parado a mano no se marca como estimado', () => {
    const salida = alParar(enCurso('sol', 600), 620).find((e) => e.en === 'salida')
    expect(salida?.en === 'salida' && salida.salida.estimado).toBeUndefined()
  })

  it('lo de hoy no se toca: sigue en curso', () => {
    expect(loQueSeQuedoAbierto([enCurso('sol', 600)], HOY)).toEqual([])
  })

  it('nunca sale una duración de catorce horas por un despiste', () => {
    const pendientes = loQueSeQuedoAbierto(
      [
        { ...enCurso('sol', 480), date: '2026-06-15' },
        { ...enCurso('fuera', 540), date: AYER }
      ],
      HOY
    )
    for (const p of pendientes) {
      for (const e of p.escrituras) {
        if (e.en === 'salida') expect(e.salida.minutos).toBeLessThanOrEqual(MINUTOS_SI_SE_OLVIDA)
      }
    }
  })

  it('sin nada abierto no hay nada que cerrar', () => {
    expect(loQueSeQuedoAbierto(undefined, HOY)).toEqual([])
  })
})


describe('lo que llevas hoy de cada cosa', () => {
  const salida = (tipo: TipoEnCurso | undefined, minutos: number, date = HOY) => ({
    id: `${tipo}-${minutos}`,
    date,
    desde: 600,
    minutos,
    filtro: 'ninguno' as const,
    ...(tipo ? { tipo } : {})
  })

  it('cada baldosa cuenta lo suyo, no lo de las otras', () => {
    const salidas = [salida('sol', 20), salida('amanecer', 10), salida('sol', 15)]
    expect(minutosDeHoy('sol', HOY, { salidas })).toBe(35)
    expect(minutosDeHoy('amanecer', HOY, { salidas })).toBe(10)
  })

  it('pero «Fuera» es el paraguas y las enseña todas', () => {
    // El mismo rato de sol sale en las dos baldosas, que es justo lo que se
    // quiere ver al entrelazarlas. Guardado va una sola vez, y en las cuentas
    // del día entra una sola vez: aquí solo se está leyendo.
    const salidas = [salida('sol', 20), salida('amanecer', 10), salida('fuera', 15)]
    expect(minutosDeHoy('fuera', HOY, { salidas })).toBe(45)
  })

  it('los ratos de antes de que existiera el tipo no se reparten a dedo', () => {
    // Adivinar de qué botón salieron sería inventar el pasado.
    expect(minutosDeHoy('sol', HOY, { salidas: [salida(undefined, 40)] })).toBe(0)
  })

  it('no cuenta lo de otros días', () => {
    expect(minutosDeHoy('sol', HOY, { salidas: [salida('sol', 30, AYER)] })).toBe(0)
  })

  it('la lámpara suma sus sesiones del día', () => {
    const sesionesPBM = [
      { id: 'a', date: HOY, lamparaId: 'p', minutos: 10, distanciaCm: 15, zona: 'torso' as const },
      { id: 'b', date: HOY, lamparaId: 'p', minutos: 8, distanciaCm: 15, zona: 'cara' as const }
    ]
    expect(minutosDeHoy('lampara', HOY, { sesionesPBM })).toBe(18)
  })

  it('la noche cuenta aunque cruce la medianoche', () => {
    const noches = [{ date: HOY, apagado: 23 * 60, levantado: 7 * 60 }]
    expect(minutosDeHoy('oscuridad', HOY, { noches })).toBe(8 * 60)
  })

  it('el frío y el grounding cuentan sus minutos, y cada uno el suyo', () => {
    const habitos = [
      { date: HOY, habito: 'frio' as const, nivel: 2, minutos: 3 },
      { date: HOY, habito: 'grounding' as const, nivel: 1, minutos: 12 }
    ]
    expect(minutosDeHoy('frio', HOY, { habitos })).toBe(3)
    expect(minutosDeHoy('grounding', HOY, { habitos })).toBe(12)
  })

  it('sin nada apuntado da cero, no undefined', () => {
    for (const t of Object.keys(NOMBRES_TIPO) as TipoEnCurso[]) {
      expect(minutosDeHoy(t, HOY, {}), t).toBe(0)
    }
  })
})
