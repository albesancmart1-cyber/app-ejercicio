import { describe, expect, it } from 'vitest'
import {
  AVISO_FRIO,
  ESCALONES_FRIO,
  ESCALONES_GROUNDING,
  FASES_AYUNO,
  SUPERFICIES_QUE_NO,
  SUPERFICIES_QUE_VALEN,
  escalonesDe,
  estacionDe,
  estadoDeHabito,
  faseDeAyuno,
  type RegistroHabito
} from './habitos'

const reg = (date: string, habito: RegistroHabito['habito'], nivel: number): RegistroHabito => ({
  date,
  habito,
  nivel
})

const dias = (desde: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${desde}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - i)
    return d.toISOString().slice(0, 10)
  })

describe('el grounding', () => {
  it('distingue las superficies que conducen de las que no', () => {
    // Es lo que evita que alguien crea que lo está haciendo cuando no.
    expect(SUPERFICIES_QUE_VALEN.join(' ')).toContain('Tierra')
    expect(SUPERFICIES_QUE_NO.join(' ')).toContain('Asfalto')
    expect(SUPERFICIES_QUE_NO.join(' ')).toContain('goma')
  })

  it('no hay ninguna superficie en las dos listas', () => {
    const valen = new Set(SUPERFICIES_QUE_VALEN.map((s) => s.toLowerCase()))
    for (const n of SUPERFICIES_QUE_NO) expect(valen.has(n.toLowerCase())).toBe(false)
  })

  it('empieza por cinco minutos y no por una hora', () => {
    expect(ESCALONES_GROUNDING[0].titulo).toContain('Cinco')
  })
})

describe('el frío', () => {
  it('tiene seis escalones, del más tonto al más serio', () => {
    expect(ESCALONES_FRIO).toHaveLength(6)
    expect(ESCALONES_FRIO[0].que.toLowerCase()).toContain('treinta segundos')
    expect(ESCALONES_FRIO[5].titulo).toBe('Inmersión')
  })

  it('los escalones van en orden y ninguno se salta un nivel', () => {
    ESCALONES_FRIO.forEach((e, i) => expect(e.nivel).toBe(i + 1))
  })

  it('el aviso es explícito y no es letra pequeña', () => {
    expect(AVISO_FRIO).toContain('corazón')
    expect(AVISO_FRIO).toContain('pregunta antes')
    expect(AVISO_FRIO).toContain('nunca en inmersión estando solo')
  })

  it('el último escalón dice que no se hace solo', () => {
    expect(ESCALONES_FRIO[5].que).toContain('Nunca solo')
  })
})

describe('la rampa: solo el siguiente escalón, y a su tiempo', () => {
  it('quien no ha empezado recibe el primero', () => {
    const e = estadoDeHabito('frio', [], '2026-03-21')
    expect(e.actual).toBeNull()
    expect(e.siguiente!.nivel).toBe(1)
  })

  it('con tres días en el primer escalón, todavía no se ofrece el segundo', () => {
    const registros = dias('2026-03-21', 3).map((d) => reg(d, 'frio', 1))
    const e = estadoDeHabito('frio', registros, '2026-03-21')
    expect(e.actual!.nivel).toBe(1)
    expect(e.siguiente).toBeUndefined()
    expect(e.diasParaElSiguiente).toBe(4)
  })

  it('y con siete, sí', () => {
    const registros = dias('2026-03-21', 7).map((d) => reg(d, 'frio', 1))
    const e = estadoDeHabito('frio', registros, '2026-03-21')
    expect(e.siguiente!.nivel).toBe(2)
    expect(e.diasParaElSiguiente).toBeUndefined()
  })

  it('nunca ofrece el sexto a quien va por el primero', () => {
    // Esta es la regla que convierte esto en una rampa y no en un menú.
    const registros = dias('2026-03-21', 60).map((d) => reg(d, 'frio', 1))
    const e = estadoDeHabito('frio', registros, '2026-03-21')
    expect(e.siguiente!.nivel).toBe(2)
    expect(e.siguiente!.nivel).not.toBe(6)
  })

  it('cuenta la racha de días seguidos', () => {
    const registros = dias('2026-03-21', 5).map((d) => reg(d, 'grounding', 1))
    expect(estadoDeHabito('grounding', registros, '2026-03-21').racha).toBe(5)
  })

  it('la racha sigue viva si hoy aún no se ha hecho pero ayer sí', () => {
    // Castigar a alguien a las nueve de la mañana por no haberlo hecho todavía
    // sería absurdo.
    const registros = dias('2026-03-20', 4).map((d) => reg(d, 'grounding', 1))
    expect(estadoDeHabito('grounding', registros, '2026-03-21').racha).toBe(4)
  })

  it('un hueco la corta', () => {
    const registros = [reg('2026-03-21', 'frio', 1), reg('2026-03-19', 'frio', 1)]
    expect(estadoDeHabito('frio', registros, '2026-03-21').racha).toBe(1)
  })

  it('en el último escalón no hay siguiente que ofrecer', () => {
    const registros = dias('2026-03-21', 40).map((d) => reg(d, 'frio', 6))
    const e = estadoDeHabito('frio', registros, '2026-03-21')
    expect(e.actual!.nivel).toBe(6)
    expect(e.siguiente).toBeUndefined()
  })

  it('los registros de otro hábito no se mezclan', () => {
    const registros = [...dias('2026-03-21', 9).map((d) => reg(d, 'frio', 1))]
    expect(estadoDeHabito('grounding', registros, '2026-03-21').actual).toBeNull()
  })

  it('el ayuno no tiene rampa, y no se le inventa una', () => {
    expect(escalonesDe('ayuno')).toEqual([])
    expect(estadoDeHabito('ayuno', [], '2026-03-21').siguiente).toBeUndefined()
  })
})

describe('el ayuno por estaciones', () => {
  it('la ventana más estrecha es la del invierno y la más ancha la del verano', () => {
    const invierno = FASES_AYUNO.find((f) => f.estacion === 'invierno')!
    const verano = FASES_AYUNO.find((f) => f.estacion === 'verano')!
    expect(invierno.ventanaHoras).toBeLessThan(verano.ventanaHoras)
  })

  it('en el norte, enero es invierno y julio verano', () => {
    expect(estacionDe('2026-01-15', 40)).toBe('invierno')
    expect(estacionDe('2026-07-15', 40)).toBe('verano')
  })

  it('y en el sur, al revés', () => {
    expect(estacionDe('2026-01-15', -33)).toBe('verano')
    expect(estacionDe('2026-07-15', -33)).toBe('invierno')
  })

  it('la primavera y el otoño también se invierten', () => {
    expect(estacionDe('2026-04-15', 40)).toBe('primavera')
    expect(estacionDe('2026-04-15', -33)).toBe('otono')
  })

  it('da la ventana que toca hoy', () => {
    expect(faseDeAyuno('2026-01-15', 40).ventanaHoras).toBe(8)
    expect(faseDeAyuno('2026-07-15', 40).ventanaHoras).toBe(12)
  })

  it('y explica por qué en verano se abre, en vez de dejarlo en una cifra', () => {
    expect(faseDeAyuno('2026-07-15', 40).que).toContain('luz')
  })

  it('las cuatro estaciones están cubiertas', () => {
    expect(FASES_AYUNO.map((f) => f.estacion).sort()).toEqual([
      'invierno',
      'otono',
      'primavera',
      'verano'
    ])
  })
})

describe('el tono de los hábitos', () => {
  it('ninguno promete curar nada ni nombra una enfermedad', () => {
    const todo = [...ESCALONES_FRIO, ...ESCALONES_GROUNDING]
      .map((e) => `${e.titulo} ${e.que}`)
      .concat(FASES_AYUNO.map((f) => f.que))
      .join(' ')
      .toLowerCase()
    for (const palabra of ['curar', 'enfermedad', 'cáncer', 'inmunidad', 'desintoxic']) {
      expect(todo, `no debería decir «${palabra}»`).not.toContain(palabra)
    }
  })

  it('cada escalón explica qué hacer, no solo cómo se llama', () => {
    for (const e of [...ESCALONES_FRIO, ...ESCALONES_GROUNDING]) {
      expect(e.que.length, e.titulo).toBeGreaterThan(30)
    }
  })
})
