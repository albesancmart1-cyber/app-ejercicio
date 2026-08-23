import { describe, expect, it } from 'vitest'
import {
  ATRASO_CON_SOLO_CREPUSCULO,
  MINUTOS_QUE_CORRE_LARGO,
  contrasteDiaNoche,
  desplazamientoDeFase,
  leerElReloj,
  loDeHoy,
  rachaDePulsos,
  type DatosDelReloj
} from './esferas'
import type { CheckIn, SalidaAlExterior } from './types'
import { huboPulsoDeTarde } from './relojes'

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
    const frase = loDeHoy(base({ salidas: [], ventana: { de: 'tuya' } }), l)!
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

describe('a quien no le dejan salir no se le manda salir', () => {
  const sinPulso = () => leerElReloj(base({ salidas: [] }))

  it('si a esa hora estás fichado, da la ventana pero no manda salir', () => {
    // El caso que motivó todo esto: «sal fuera entre las 06:49 y las 08:46» a
    // quien a las siete menos cuarto ya está dentro de una nave sin ventanas.
    const d = base({ salidas: [], ventana: { de: 'trabajas', entrada: 6 * 60 + 45 } })
    const frase = loDeHoy(d, sinPulso())!
    expect(frase).not.toContain('Sal fuera')
    expect(frase).toContain('06:45')
  })

  it('y lo dice sin culpar, mandando la señal al fin de semana', () => {
    const d = base({ salidas: [], ventana: { de: 'trabajas', entrada: 6 * 60 + 45 } })
    const frase = loDeHoy(d, sinPulso())!
    expect(frase).toContain('no es un fallo')
    expect(frase).toContain('fin de semana')
  })

  it('si solo te pilla media ventana, dice hasta cuándo es tuya', () => {
    const d = base({
      salidas: [],
      ventana: { de: 'parte', hastaQue: 7 * 60 + 30, entrada: 7 * 60 + 30 }
    })
    const frase = loDeHoy(d, sinPulso())!
    expect(frase).toContain('07:30')
    expect(frase).toContain('Cinco minutos ahí dentro bastan')
  })

  it('sin fichajes suficientes no supone nada: da la ventana con su condición', () => {
    const frase = loDeHoy(base({ salidas: [], ventana: { de: 'no_se_sabe' } }), sinPulso())!
    expect(frase).not.toContain('Sal fuera')
    expect(frase).toContain('si a esa hora puedes estar fuera')
  })

  it('y sin el dato de la jornada se comporta igual que sin saberlo', () => {
    // No pasar `ventana` no puede volver a la versión que mandaba salir a todo
    // el mundo: el caso por defecto es el prudente, no el cómodo.
    const frase = loDeHoy(base({ salidas: [] }), sinPulso())!
    expect(frase).not.toContain('Sal fuera')
  })

  it('la ventana sale siempre con sus dos horas, mande o no mande salir', () => {
    for (const v of [
      { de: 'tuya' as const },
      { de: 'trabajas' as const, entrada: 400 },
      { de: 'parte' as const, hastaQue: 450, entrada: 450 },
      { de: 'no_se_sabe' as const }
    ]) {
      const frase = loDeHoy(base({ salidas: [], ventana: v }), sinPulso())!
      expect(frase.match(/\d{2}:\d{2}/g)?.length, v.de).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('el pulso de la mañana no se confunde con haber salido', () => {
  it('salir a la una de la tarde no cuenta como haber cogido la luz de la mañana', () => {
    // Este era un fallo de verdad: la app felicitaba por el pulso a quien había
    // salido a mediodía. Fuera de su ventana la luz sube la amplitud, no la fase.
    const d = base({ salidas: [aMediodia(HOY, 60)], ventana: { de: 'tuya' } })
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


describe('el crepúsculo frena la deriva, pero no la revierte', () => {
  /** Un rato al ocaso: en marzo, en Madrid, se pone a las 19:27. */
  const alOcaso = (fecha: string): SalidaAlExterior => ({
    id: `o${fecha}`,
    date: fecha,
    desde: 19 * 60 + 30,
    minutos: 20,
    filtro: 'ninguno'
  })

  it('un día en que coges el atardecer ya no cuenta como un día encerrado', () => {
    // Este era el fallo: salir a ver ponerse el sol valía exactamente lo mismo
    // que no pisar la calle, y la app llevaba desde el principio diciendo que
    // el atardecer es tan informativo como el amanecer.
    const encerrado = desplazamientoDeFase(base({ salidas: [] }))
    const conOcaso = desplazamientoDeFase(
      base({ salidas: Array.from({ length: 8 }, (_, i) => alOcaso(menos(i + 1))) })
    )
    expect(conOcaso.acumulado).toBeGreaterThan(encerrado.acumulado)
  })

  it('pero sigue atrasándose: no sustituye a salir por la mañana', () => {
    const conOcaso = desplazamientoDeFase(
      base({ salidas: Array.from({ length: 8 }, (_, i) => alOcaso(menos(i + 1))) })
    )
    expect(conOcaso.direccion).toBe('atrasa')
    expect(conOcaso.ayer).toBe(-ATRASO_CON_SOLO_CREPUSCULO)
  })

  it('la mitad exacta de lo que se atrasa un día sin nada', () => {
    expect(ATRASO_CON_SOLO_CREPUSCULO * 2).toBe(MINUTOS_QUE_CORRE_LARGO)
  })

  it('y con pulso de mañana manda la mañana, aunque también hubiera ocaso', () => {
    const d = base({
      salidas: Array.from({ length: 8 }, (_, i) => [alAmanecer(menos(i + 1)), alOcaso(menos(i + 1))]).flat()
    })
    expect(desplazamientoDeFase(d).direccion).toBe('adelanta')
  })

  it('un rato de tarde fuera de la ventana del ocaso no cuenta', () => {
    // Salir a las once de la noche no es ver el atardecer.
    const tarde = Array.from({ length: 8 }, (_, i) => ({
      ...alOcaso(menos(i + 1)),
      desde: 23 * 60 + 30
    }))
    expect(desplazamientoDeFase(base({ salidas: tarde })).ayer).toBe(-MINUTOS_QUE_CORRE_LARGO)
  })
})

describe('huboPulsoDeTarde', () => {
  it('mira la ventana del ocaso, no cualquier rato de tarde', () => {
    const ocaso = (desde: number): SalidaAlExterior => ({
      id: 'o',
      date: HOY,
      desde,
      minutos: 20,
      filtro: 'ninguno'
    })
    // En marzo, en Madrid, el sol se pone a las 19:27 y el crepúsculo civil
    // acaba a las 19:55. Esa media hora es la ventana, y nada más.
    expect(huboPulsoDeTarde(HOY, MADRID, [ocaso(19 * 60 + 30)], 60)).toBe(true)
    expect(huboPulsoDeTarde(HOY, MADRID, [ocaso(15 * 60)], 60)).toBe(false)
    expect(huboPulsoDeTarde(HOY, MADRID, [ocaso(22 * 60)], 60)).toBe(false)
  })

  it('con gafas que cortan el azul no cuenta, igual que por la mañana', () => {
    const conGafas: SalidaAlExterior = {
      id: 'g',
      date: HOY,
      desde: 19 * 60 + 30,
      minutos: 20,
      filtro: 'ambar'
    }
    expect(huboPulsoDeTarde(HOY, MADRID, [conGafas], 60)).toBe(false)
  })

  it('donde no se pone el sol no hay crepúsculo que coger', () => {
    const polar = { lat: 69.65, lon: 18.96 }
    const s: SalidaAlExterior = { id: 'p', date: '2025-06-21', desde: 22 * 60, minutos: 30, filtro: 'ninguno' }
    expect(huboPulsoDeTarde('2025-06-21', polar, [s], 120)).toBe(false)
  })

  it('sin salidas, no', () => {
    expect(huboPulsoDeTarde(HOY, MADRID, undefined, 60)).toBe(false)
    expect(huboPulsoDeTarde(HOY, MADRID, [], 60)).toBe(false)
  })
})

describe('lo de hoy reconoce el crepúsculo', () => {
  it('quien coge el atardecer no se queda sin respuesta', () => {
    // El caso real que lo destapó: se mide el atardecer, no se mueve ninguna
    // esfera visiblemente, y la app da la ventana de la mañana como si no
    // hubieras hecho nada. Hiciste algo y hay que decirlo.
    const conOcaso: SalidaAlExterior = {
      id: 'o',
      date: HOY,
      desde: 19 * 60 + 30,
      minutos: 20,
      filtro: 'ninguno'
    }
    const d = base({ salidas: [conOcaso] })
    const frase = loDeHoy(d, leerElReloj(base({ salidas: [] })))!
    expect(frase).toContain('Cogiste el crepúsculo')
  })

  it('y se le dice que eso no es poner el reloj en hora', () => {
    // La honestidad del cambio entero está aquí: frena la deriva, no la
    // revierte. Prometer lo segundo sería vender la puesta de sol como si
    // sustituyera a madrugar.
    const conOcaso: SalidaAlExterior = {
      id: 'o',
      date: HOY,
      desde: 19 * 60 + 30,
      minutos: 20,
      filtro: 'ninguno'
    }
    const frase = loDeHoy(base({ salidas: [conOcaso] }), leerElReloj(base({ salidas: [] })))!
    expect(frase).toMatch(/Ponerlo en hora es otra cosa/)
    expect(frase).toMatch(/\d{2}:\d{2}/)
  })

  it('sin crepúsculo, la respuesta es la de siempre', () => {
    const frase = loDeHoy(base({ salidas: [], ventana: { de: 'tuya' } }), leerElReloj(base({ salidas: [] })))!
    expect(frase).not.toContain('crepúsculo')
    expect(frase).toContain('Sal fuera')
  })
})

describe('hoy cuenta en cuanto se sabe', () => {
  const alOcasoHoy: SalidaAlExterior = {
    id: 'o',
    date: HOY,
    desde: 19 * 60 + 30,
    minutos: 20,
    filtro: 'ninguno'
  }

  it('sin la hora, hoy no cuenta: es como estaba antes', () => {
    const a = desplazamientoDeFase(base({ salidas: [] }))
    expect(a.hoy).toBeNull()
  })

  it('coger la luz de la mañana mueve la esfera hoy mismo', () => {
    // Es lo que hacía que la app pareciera rota: salías, volvías, mirabas, y no
    // se movía nada hasta el día siguiente.
    const d = base({ salidas: [alAmanecer(HOY)], ahoraMin: 12 * 60 })
    const r = desplazamientoDeFase(d)
    expect(r.hoy).toBe(MINUTOS_QUE_CORRE_LARGO)
    expect(r.direccion).toBe('adelanta')
  })

  it('y se enseña en cuanto ocurre, sin esperar a que acabe el día', () => {
    // A las nueve de la mañana, recién vuelto de la calle.
    const d = base({ salidas: [alAmanecer(HOY)], ahoraMin: 9 * 60 })
    expect(desplazamientoDeFase(d).hoy).toBe(MINUTOS_QUE_CORRE_LARGO)
  })

  it('pero a media mañana sin haber salido todavía, hoy no se da por perdido', () => {
    // La ventana sigue abierta. Darlo por fallado sería adelantarse.
    const d = base({ salidas: [], ahoraMin: 8 * 60 })
    expect(desplazamientoDeFase(d).hoy).toBeNull()
  })

  it('con las dos ventanas cerradas y solo el crepúsculo, se atrasa la mitad', () => {
    const d = base({ salidas: [alOcasoHoy], ahoraMin: 23 * 60 })
    expect(desplazamientoDeFase(d).hoy).toBe(-ATRASO_CON_SOLO_CREPUSCULO)
  })

  it('y sin nada, con el día ya cerrado, se atrasa entero', () => {
    const d = base({ salidas: [], ahoraMin: 23 * 60 })
    expect(desplazamientoDeFase(d).hoy).toBe(-MINUTOS_QUE_CORRE_LARGO)
  })

  it('a las diez de la noche, con el crepúsculo aún sin cerrar, todavía no', () => {
    // En marzo el crepúsculo civil acaba a las 19:55, así que a las 19:00
    // queda ventana de ocaso por delante.
    const d = base({ salidas: [], ahoraMin: 19 * 60 })
    expect(desplazamientoDeFase(d).hoy).toBeNull()
  })
})
