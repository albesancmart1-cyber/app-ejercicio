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
  loQueSeQuedoAbierto,
  minutosAbierto,
  pareceOlvidado
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
  it('los cuatro de luz natural acaban en una salida', () => {
    for (const tipo of ['sol', 'amanecer', 'atardecer', 'fuera'] as TipoEnCurso[]) {
      const r = alParar(enCurso(tipo, 600), 620)
      expect(r.en, tipo).toBe('salida')
      if (r.en === 'salida') {
        expect(r.salida.desde).toBe(600)
        expect(r.salida.minutos).toBe(20)
      }
    }
  })

  it('pero solo el sol deja además su exposición para la vitamina D', () => {
    const sol = alParar(enCurso('sol', 600), 620)
    const fuera = alParar(enCurso('fuera', 600), 620)
    expect(sol.en === 'salida' && sol.exposicionDeSol).toBe(true)
    expect(fuera.en === 'salida' && fuera.exposicionDeSol).toBeUndefined()
  })

  it('el filtro de las gafas viaja hasta la salida', () => {
    const r = alParar(enCurso('amanecer', 400, { filtro: 'rojo' }), 420)
    expect(r.en === 'salida' && r.salida.filtro).toBe('rojo')
  })

  it('sin filtro se guarda «ninguno» y no undefined', () => {
    const r = alParar(enCurso('fuera', 600), 620)
    expect(r.en === 'salida' && r.salida.filtro).toBe('ninguno')
  })

  it('la lámpara guarda su sesión con la hora en que empezó', () => {
    const r = alParar(enCurso('lampara', 1200, { lamparaId: 'panel', distanciaCm: 30 }), 1210)
    expect(r.en).toBe('sesionPBM')
    if (r.en === 'sesionPBM') {
      expect(r.sesion.lamparaId).toBe('panel')
      expect(r.sesion.minutos).toBe(10)
      expect(r.sesion.hora).toBe(1200)
      expect(r.sesion.distanciaCm).toBe(30)
    }
  })

  it('una lámpara sin elegir no guarda nada, en vez de un registro que no cuenta', () => {
    expect(alParar(enCurso('lampara', 1200), 1210).en).toBe('nada')
  })

  it('la oscuridad se guarda con la fecha de la mañana en que uno se levanta', () => {
    // Apagar a las 23:30 del domingo y levantarse a las 07:00 es la noche del
    // lunes: es la que explica el peso del lunes. Ver `NocheRegistrada`.
    const r = alParar(enCurso('oscuridad', 23 * 60 + 30), 7 * 60)
    expect(r.en).toBe('noche')
    if (r.en === 'noche') {
      expect(r.noche.date).toBe('2026-06-22')
      expect(r.noche.apagado).toBe(1410)
      expect(r.noche.levantado).toBe(420)
    }
  })

  it('y si se apaga y se levanta el mismo día, la fecha no cambia', () => {
    const r = alParar(enCurso('oscuridad', 60), 480)
    expect(r.en === 'noche' && r.noche.date).toBe(HOY)
  })

  it('el frío y el grounding guardan su hábito con los minutos', () => {
    const r = alParar(enCurso('frio', 600), 603, { nivelHabito: 2 })
    expect(r.en).toBe('habito')
    if (r.en === 'habito') {
      expect(r.registro.habito).toBe('frio')
      expect(r.registro.nivel).toBe(2)
      expect(r.registro.minutos).toBe(3)
    }
  })

  it('parar antes de empezar no da minutos negativos', () => {
    const r = alParar(enCurso('sol', 600), 500)
    expect(r.en === 'salida' && r.salida.minutos).toBe(0)
  })

  it('todos los tipos tienen nombre para enseñar', () => {
    for (const tipo of Object.keys(NOMBRES_TIPO) as TipoEnCurso[]) {
      expect(NOMBRES_TIPO[tipo].length).toBeGreaterThan(3)
    }
  })
})

describe('cuando se olvida parar', () => {
  it('lo de días anteriores se cierra con una duración conservadora', () => {
    // Media hora, no catorce: apuntar catorce horas de sol envenenaría la
    // vitamina D del día, el balance de luz y la amplitud de la semana de una vez.
    const pendientes = loQueSeQuedoAbierto([{ ...enCurso('sol', 660), date: AYER }], HOY)
    expect(pendientes).toHaveLength(1)
    const r = pendientes[0].resultado
    expect(r.en === 'salida' && r.salida.minutos).toBe(MINUTOS_SI_SE_OLVIDA)
  })

  it('y se marca como estimado, para poder decirlo', () => {
    const pendientes = loQueSeQuedoAbierto([{ ...enCurso('sol', 660), date: AYER }], HOY)
    const r = pendientes[0].resultado
    expect(r.en === 'salida' && r.salida.estimado).toBe(true)
  })

  it('lo parado a mano no se marca como estimado', () => {
    const r = alParar(enCurso('sol', 600), 620)
    expect(r.en === 'salida' && r.salida.estimado).toBeUndefined()
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
      if (p.resultado.en === 'salida') {
        expect(p.resultado.salida.minutos).toBeLessThanOrEqual(MINUTOS_SI_SE_OLVIDA)
      }
    }
  })

  it('sin nada abierto no hay nada que cerrar', () => {
    expect(loQueSeQuedoAbierto(undefined, HOY)).toEqual([])
  })
})
