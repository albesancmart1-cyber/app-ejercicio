import { describe, expect, it } from 'vitest'
import {
  MINUTOS_QUE_CORRE_LARGO,
  contrasteDiaNoche,
  desplazamientoDeFase,
  leerElReloj,
  loDeHoy,
  rachaDePulsos,
  type DatosDelReloj
} from './esferas'
import type { CheckIn, SalidaAlExterior } from './types'

const MADRID = { lat: 40.4165, lon: -3.7026 }
const HOY = '2026-03-21'
const tz = () => 60

const menos = (n: number) => {
  const d = new Date(`${HOY}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Un rato fuera al amanecer: en marzo, en Madrid, las 07:20 valen. */
const alAmanecer = (fecha: string): SalidaAlExterior => ({
  id: `a${fecha}`,
  date: fecha,
  desde: 7 * 60 + 20,
  minutos: 20,
  filtro: 'ninguno'
})

/** Y uno a mediodía, que no mueve la fase. */
const aMediodia = (fecha: string, minutos = 30): SalidaAlExterior => ({
  id: `m${fecha}`,
  date: fecha,
  desde: 13 * 60,
  minutos,
  filtro: 'ninguno'
})

const base = (extra: Partial<DatosDelReloj> = {}): DatosDelReloj => ({
  hoy: HOY,
  coord: MADRID,
  desfasePara: tz,
  ...extra
})

describe('el período: la racha de mañanas', () => {
  it('cuenta los días seguidos con pulso, empezando por ayer', () => {
    const salidas = [1, 2, 3, 4, 5].map((n) => alAmanecer(menos(n)))
    expect(rachaDePulsos(base({ salidas }))).toBe(5)
  })

  it('no la corta que hoy todavía no hayas salido', () => {
    // Se cuenta desde ayer a propósito: a media mañana el pulso de hoy puede
    // estar aún por llegar, y cortarla ahí sería injusto.
    const salidas = [1, 2, 3].map((n) => alAmanecer(menos(n)))
    expect(rachaDePulsos(base({ salidas }))).toBe(3)
  })

  it('un día sin pulso la parte', () => {
    const salidas = [alAmanecer(menos(1)), aMediodia(menos(2)), alAmanecer(menos(3))]
    expect(rachaDePulsos(base({ salidas }))).toBe(1)
  })

  it('sin salir nunca, cero', () => {
    expect(rachaDePulsos(base({ salidas: [] }))).toBe(0)
  })

  it('salir solo a mediodía no cuenta: la ventana ya pasó', () => {
    const salidas = [1, 2, 3].map((n) => aMediodia(menos(n)))
    expect(rachaDePulsos(base({ salidas }))).toBe(0)
  })
})

describe('la fase y su dirección', () => {
  it('sin pulsos se atrasa, y lo dice', () => {
    const f = desplazamientoDeFase(base({ salidas: [] }))
    expect(f.acumulado).toBeLessThan(0)
    expect(f.direccion).toBe('atrasa')
    expect(f.ayer).toBe(-MINUTOS_QUE_CORRE_LARGO)
  })

  it('con pulsos todos los días se queda en hora', () => {
    const salidas = Array.from({ length: 7 }, (_, i) => alAmanecer(menos(i + 1)))
    const f = desplazamientoDeFase(base({ salidas }))
    expect(f.acumulado).toBe(0)
    expect(f.direccion).toBe('adelanta')
  })

  it('la dirección de ayer se distingue del acumulado', () => {
    // Cinco días malos y ayer bueno: sigue habiendo deuda, pero va mejorando.
    const salidas = [alAmanecer(menos(1))]
    const f = desplazamientoDeFase(base({ salidas }))
    expect(f.acumulado).toBeLessThan(0)
    expect(f.direccion).toBe('adelanta') // ayer sí lo movió hacia delante
  })

  it('el atraso tiene suelo: no crece sin fin', () => {
    const f = desplazamientoDeFase(base({ salidas: [], dias: 60 }))
    expect(f.acumulado).toBeGreaterThanOrEqual(-120)
  })

  it('y nunca se pone en positivo: no se puede ir por delante del sol', () => {
    const salidas = Array.from({ length: 30 }, (_, i) => alAmanecer(menos(i + 1)))
    expect(desplazamientoDeFase(base({ salidas, dias: 30 })).acumulado).toBeLessThanOrEqual(0)
  })
})

describe('la amplitud, que es un cociente', () => {
  it('sin salir y sin noche declarada, sale a medias y no a cero', () => {
    // La noche buena sostiene la mitad del cociente aunque no haya día.
    const c = contrasteDiaNoche(base({ salidas: [] }))
    expect(c.valor).toBeGreaterThan(0.4)
    expect(c.valor).toBeLessThan(0.6)
  })

  it('tres horas fuera al día la suben a tope', () => {
    const salidas = Array.from({ length: 7 }, (_, i) => aMediodia(menos(i), 180))
    expect(contrasteDiaNoche(base({ salidas })).valor).toBeCloseTo(1, 1)
  })

  it('y una noche mala la baja, aunque el día haya sido bueno', () => {
    const salidas = Array.from({ length: 7 }, (_, i) => aMediodia(menos(i), 180))
    const checkIns = Array.from({ length: 7 }, (_, i) => ({
      date: menos(i),
      lightHygiene: false
    })) as unknown as CheckIn[]
    const conMalaNoche = contrasteDiaNoche(base({ salidas, checkIns }))
    const conBuenaNoche = contrasteDiaNoche(base({ salidas }))
    expect(conMalaNoche.valor).toBeLessThan(conBuenaNoche.valor)
  })

  it('no apuntar la noche no cuenta como haberlo hecho mal', () => {
    const sinDato = contrasteDiaNoche(base({ salidas: [] }))
    expect(sinDato.nocheReal).toBeCloseTo(sinDato.nocheQueTocaba, 5)
  })

  it('la noche que tocaba sale del arco del propio sitio', () => {
    const enMarzo = contrasteDiaNoche(base({ salidas: [] }))
    const enJunio = contrasteDiaNoche(base({ hoy: '2026-06-21', desfasePara: () => 120, salidas: [] }))
    // En junio la noche que toca es más corta que en marzo.
    expect(enJunio.nocheQueTocaba).toBeLessThan(enMarzo.nocheQueTocaba)
  })
})

describe('la lectura de las tres esferas', () => {
  it('da tres, y no una nota', () => {
    const l = leerElReloj(base({ salidas: [] }))
    expect(l.esferas.map((e) => e.esfera)).toEqual(['periodo', 'fase', 'amplitud'])
    for (const e of l.esferas) {
      expect(e.valor).toBeGreaterThanOrEqual(0)
      expect(e.valor).toBeLessThanOrEqual(1)
      expect(e.texto.length).toBeGreaterThan(0)
      expect(e.porque.length).toBeGreaterThan(0)
    }
  })

  it('señala la que peor está', () => {
    const l = leerElReloj(base({ salidas: [] }))
    expect(l.laQueFalla).toBeDefined()
  })

  it('son independientes: se puede tener la fase bien y la amplitud mal', () => {
    // Pulso de mañana todos los días, pero cinco minutos y nada más.
    const salidas = Array.from({ length: 7 }, (_, i) => ({
      ...alAmanecer(menos(i + 1)),
      minutos: 5
    }))
    const l = leerElReloj(base({ salidas }))
    const fase = l.esferas.find((e) => e.esfera === 'fase')!
    const amplitud = l.esferas.find((e) => e.esfera === 'amplitud')!
    expect(fase.valor).toBe(1)
    expect(amplitud.valor).toBeLessThan(fase.valor)
  })

  it('con las tres bien no señala ninguna', () => {
    const salidas = Array.from({ length: 8 }, (_, i) => [
      alAmanecer(menos(i)),
      aMediodia(menos(i), 180)
    ]).flat()
    expect(leerElReloj(base({ salidas })).laQueFalla).toBeUndefined()
  })
})

describe('lo de hoy: una sola cosa', () => {
  it('con la fase mal y sin haber salido, da la ventana con su hora', () => {
    const l = leerElReloj(base({ salidas: [] }))
    const frase = loDeHoy(base({ salidas: [] }), l)!
    expect(frase).toMatch(/\d{2}:\d{2}/)
    expect(frase).toContain('Cinco minutos bastan')
  })

  it('si ya se ha cogido la luz, no insiste', () => {
    const salidas = [alAmanecer(HOY)]
    const l = leerElReloj(base({ salidas: [] })) // la fase sigue mal
    expect(loDeHoy(base({ salidas }), l)).toContain('Ya has cogido')
  })

  it('con la amplitud plana propone bajar la noche, no subir el día', () => {
    // Pulso perfecto cada mañana pero cinco minutos: la fase va bien y el
    // contraste no. Lo barato entonces es la noche.
    const salidas = Array.from({ length: 8 }, (_, i) => ({
      ...alAmanecer(menos(i + 1)),
      minutos: 1
    }))
    const d = base({ salidas })
    const l = leerElReloj(d)
    expect(l.laQueFalla).toBe('amplitud')
    expect(loDeHoy(d, l)).toContain('entera tuya')
  })

  it('con las tres bien no propone nada, en vez de inventarse una tarea', () => {
    const salidas = Array.from({ length: 8 }, (_, i) => [
      alAmanecer(menos(i)),
      aMediodia(menos(i), 180)
    ]).flat()
    const d = base({ salidas })
    expect(loDeHoy(d, leerElReloj(d))).toBeNull()
  })

  it('donde no amanece, propone lo único que se puede: la noche', () => {
    const polar = base({ hoy: '2025-12-21', coord: { lat: 69.65, lon: 18.96 }, salidas: [] })
    const frase = loDeHoy(polar, leerElReloj(polar))!
    expect(frase).toContain('Protege la noche')
  })
})

describe('el pulso de la mañana no se confunde con haber salido', () => {
  it('salir a la una de la tarde no cuenta como haber cogido la luz de la mañana', () => {
    // Este era un fallo de verdad: la app felicitaba por el pulso a quien había
    // salido a mediodía. Fuera de su ventana la luz sube la amplitud, no la fase.
    const d = base({ salidas: [aMediodia(HOY, 60)] })
    const frase = loDeHoy(d, leerElReloj(base({ salidas: [] })))!
    expect(frase).not.toContain('Ya has cogido')
    expect(frase).toMatch(/\d{2}:\d{2}/)
  })

  it('y el atraso se escribe con el menos tipográfico, no con un guion', () => {
    const fase = leerElReloj(base({ salidas: [] })).esferas.find((e) => e.esfera === 'fase')!
    expect(fase.texto.startsWith('−')).toBe(true)
    expect(fase.texto.includes('-')).toBe(false)
  })
})
