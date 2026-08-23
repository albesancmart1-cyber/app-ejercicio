import { describe, expect, it } from 'vitest'
import {
  conMinutosEficaces,
  ELEVACION_MINIMA,
  F_FOTOTIPO,
  MED_J_M2,
  ORDEN_FOTOTIPO,
  ORDEN_PIEL,
  PIEL_PCT,
  conExposicion,
  conManual,
  escribirUI,
  factorAltitud,
  factorEdad,
  indiceUV,
  minutosDelDia,
  minutosParaQuemarse,
  notaDeTemporada,
  resumenSemanal,
  sinExposicion,
  solDe,
  uiDeExposicion,
  uiDelDia,
  uiPorMinuto,
  type Fototipo,
  type QuienToma
} from './vitaminaD'
import { CIELOS, ORDEN_CIELO, factorDeCielo, type EstadoDelCielo } from './cielo'
import { arcoDelDia } from './arcoSolar'
import type { DiaDeSol, ExposicionSolar, PielExpuesta } from './types'

const MADRID = { lat: 40.4165, lon: -3.7026 }
const QUITO = { lat: -0.1807, lon: -78.4678 }
const TROMSO = { lat: 69.6496, lon: 18.956 }

const VERANO = '2026-06-21'
const INVIERNO = '2025-12-21'
const TZ_VERANO = 120
const TZ_INVIERNO = 60

/** El mediodía solar de Madrid en junio cae hacia las 14:16. */
const MEDIODIA_JUNIO = 14 * 60 + 16

const exp = (
  minutos: number,
  desde?: number,
  piel: PielExpuesta = 'brazos_piernas',
  cielo?: ExposicionSolar['cielo']
): ExposicionSolar => ({
  minutos,
  franja: 'mediodia',
  piel,
  ...(desde !== undefined ? { desde } : {}),
  ...(cielo ? { cielo } : {})
})

const dia = (date: string, ...exposiciones: ExposicionSolar[]): DiaDeSol => ({
  date,
  exposiciones
})

/** Fototipo III, 45 años, Madrid a 650 m: el caso que se usa de referencia. */
const ALBERTO: QuienToma = { fototipo: 'III', edad: 45, altitudM: 650 }

describe('el índice UV', () => {
  it('es cero por debajo del umbral de síntesis', () => {
    expect(indiceUV(29.9)).toBe(0)
    expect(indiceUV(10)).toBe(0)
    expect(indiceUV(-5)).toBe(0)
  })

  it('y con el sol alto da valores de verano de verdad', () => {
    // Madrid en junio llega a unos 73°: UVI ~11,7, que es lo que se mide.
    expect(indiceUV(73)).toBeGreaterThan(11)
    expect(indiceUV(73)).toBeLessThan(12.5)
    // Sol en la vertical: el máximo teórico de la fórmula.
    expect(indiceUV(90)).toBeCloseTo(12.5, 5)
  })

  it('crece con la altura del sol', () => {
    expect(indiceUV(60)).toBeGreaterThan(indiceUV(45))
    expect(indiceUV(45)).toBeGreaterThan(indiceUV(31))
  })

  it('tiene un salto en el umbral, y está puesto a propósito', () => {
    // Justo por encima de 30° el valor no es pequeño: es 4,4. Es el corte de la
    // referencia y se respeta; suavizarlo sería inventarse una curva.
    expect(indiceUV(ELEVACION_MINIMA)).toBeGreaterThan(4)
    expect(indiceUV(ELEVACION_MINIMA - 0.1)).toBe(0)
  })
})

describe('los factores de la persona', () => {
  it('el fototipo más claro sintetiza más y el más oscuro menos', () => {
    const valores = ORDEN_FOTOTIPO.map((f) => F_FOTOTIPO[f])
    expect(valores).toEqual([...valores].sort((a, b) => b - a))
    expect(F_FOTOTIPO.II).toBe(1) // la referencia de k
  })

  it('la edad resta, pero nunca por debajo de un cuarto', () => {
    expect(factorEdad(20)).toBe(1)
    expect(factorEdad(45)).toBeCloseTo(0.7, 5)
    expect(factorEdad(120)).toBe(0.25)
    expect(factorEdad(undefined)).toBe(1)
  })

  it('la altitud suma un diez por ciento por cada mil metros', () => {
    expect(factorAltitud(0)).toBe(1)
    expect(factorAltitud(1000)).toBeCloseTo(1.1, 5)
    expect(factorAltitud(2850)).toBeCloseTo(1.285, 5) // Quito
    expect(factorAltitud(undefined)).toBe(1)
  })

  it('la piel va en orden de menos a más superficie', () => {
    const pcts = ORDEN_PIEL.map((p) => PIEL_PCT[p])
    expect(pcts).toEqual([...pcts].sort((a, b) => a - b))
  })

  it('y los tres identificadores viejos siguen existiendo', () => {
    // Hay exposiciones guardadas que los usan: renombrarlos las dejaría sin leer.
    for (const viejo of ['cara_manos', 'brazos_piernas', 'torso'] as PielExpuesta[]) {
      expect(PIEL_PCT[viejo]).toBeGreaterThan(0)
    }
  })
})

describe('las UI por minuto', () => {
  it('cuadran con la referencia de Holick a cuerpo entero', () => {
    // 20 min de cuerpo entero al mediodía de junio deberían caer en la horquilla
    // clásica de 10 000–20 000 UI para una dosis eritemal mínima.
    const porMin = uiPorMinuto(73, 'entero', { fototipo: 'II', edad: 30, altitudM: 0 })
    const enVeinte = porMin * 20
    expect(enVeinte).toBeGreaterThan(10000)
    expect(enVeinte).toBeLessThan(20000)
  })

  it('y son cero con el sol por debajo del umbral, por mucha piel que lleves', () => {
    expect(uiPorMinuto(25, 'entero', { fototipo: 'I' })).toBe(0)
  })

  it('el doble de piel es el doble de síntesis', () => {
    const torso = uiPorMinuto(60, 'torso', ALBERTO)
    const cara = uiPorMinuto(60, 'cara_manos', ALBERTO)
    expect(torso / cara).toBeCloseTo(PIEL_PCT.torso / PIEL_PCT.cara_manos, 5)
  })
})

describe('una exposición con hora, que es lo nuevo', () => {
  it('las once de junio y las once de diciembre dejan de dar lo mismo', () => {
    // Este es el fallo que tenía la versión anterior: la franja decía
    // «mediodía» en los dos casos y repartía casi igual.
    const junio = uiDeExposicion(exp(20, 11 * 60), VERANO, MADRID, ALBERTO, TZ_VERANO)
    const diciembre = uiDeExposicion(exp(20, 11 * 60), INVIERNO, MADRID, ALBERTO, TZ_INVIERNO)
    expect(junio.max).toBeGreaterThan(0)
    expect(diciembre.max).toBe(0)
  })

  it('en Madrid en diciembre no hay síntesis a ninguna hora', () => {
    // Y sale solo del arco: no queda ninguna lista de meses en el código.
    for (const hora of [10, 12, 13, 14, 15, 16]) {
      const r = uiDeExposicion(exp(30, hora * 60), INVIERNO, MADRID, ALBERTO, TZ_INVIERNO)
      expect(r.max, `${hora}:00`).toBe(0)
    }
  })

  it('veinte minutos en bañador al mediodía de junio dan una cifra creíble', () => {
    const r = uiDeExposicion(exp(20, MEDIODIA_JUNIO, 'banador'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(r.min).toBeGreaterThan(3000)
    expect(r.max).toBeLessThan(15000)
  })

  it('y media hora de cara y manos, una mucho menor', () => {
    const r = uiDeExposicion(
      exp(30, MEDIODIA_JUNIO, 'cara_manos'),
      VERANO,
      MADRID,
      ALBERTO,
      TZ_VERANO
    )
    expect(r.min).toBeGreaterThan(200)
    expect(r.max).toBeLessThan(3000)
  })

  it('la piel satura: dos horas no dan cuatro veces lo de media hora', () => {
    const media = uiDeExposicion(exp(30, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)
    const dosHoras = uiDeExposicion(exp(120, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(dosHoras.max).toBeLessThan(media.max * 2)
  })

  it('funciona igual de bien en el ecuador y en el círculo polar', () => {
    // Lo que la versión anterior no podía hacer: daba por hecha la latitud de
    // España y repartía «invierno» por meses del hemisferio norte.
    const quito = uiDeExposicion(exp(20, 12 * 60), '2026-01-15', QUITO, ALBERTO, -300)
    expect(quito.max).toBeGreaterThan(0) // en enero, en el ecuador, sí sintetiza

    // En Tromsø el sol llega a 43,8° en el solsticio: sí sintetiza en verano.
    // La versión vieja, con su lista de meses del hemisferio norte, decía que
    // junio era temporada alta allí y en Quito — con un modelo de 40° N.
    const tromsoVerano = uiDeExposicion(exp(20, 12 * 60), VERANO, TROMSO, ALBERTO, TZ_VERANO)
    expect(tromsoVerano.max).toBeGreaterThan(0)

    // Y en diciembre no: allí es noche polar y el sol no sale.
    const tromsoInvierno = uiDeExposicion(exp(20, 12 * 60), INVIERNO, TROMSO, ALBERTO, TZ_INVIERNO)
    expect(tromsoInvierno.max).toBe(0)
  })

  it('un rato de cero minutos no da nada', () => {
    expect(uiDeExposicion(exp(0, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)).toEqual({
      min: 0,
      max: 0
    })
  })
})

describe('el cielo', () => {
  it('atenúa de más a menos, y ninguno se sale de cero a uno', () => {
    const factores = ORDEN_CIELO.map((c) => CIELOS[c].factor)
    expect(factores).toEqual([...factores].sort((a, b) => b - a))
    for (const f of factores) {
      expect(f).toBeGreaterThan(0)
      expect(f).toBeLessThanOrEqual(1)
    }
  })

  it('sin sol no se sintetiza prácticamente nada', () => {
    const limpio = uiDeExposicion(
      exp(30, MEDIODIA_JUNIO, 'torso', 'limpio'),
      VERANO,
      MADRID,
      ALBERTO,
      TZ_VERANO
    )
    const sinSol = uiDeExposicion(
      exp(30, MEDIODIA_JUNIO, 'torso', 'sin_sol'),
      VERANO,
      MADRID,
      ALBERTO,
      TZ_VERANO
    )
    expect(sinSol.max).toBeLessThan(limpio.max * 0.05)
  })

  it('un cielo con estelas o calima quita cerca de un tercio', () => {
    const limpio = uiDeExposicion(exp(30, MEDIODIA_JUNIO, 'torso', 'limpio'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    const estelas = uiDeExposicion(exp(30, MEDIODIA_JUNIO, 'torso', 'estelas'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(estelas.max / limpio.max).toBeCloseTo(0.7, 1)
  })

  it('sin decir nada se supone cielo despejado, que es lo que asume la referencia', () => {
    expect(factorDeCielo(undefined)).toBe(1)
  })
})

describe('lo apuntado antes de este cambio', () => {
  it('sin hora sigue dando exactamente el mismo número que daba', () => {
    // Cifras del cálculo viejo: 30 min de brazos y piernas al mediodía de julio,
    // 150–350 UI/min → 4 500–10 500.
    const r = uiDeExposicion(exp(30), '2026-07-15')
    expect(r).toEqual({ min: 4500, max: 10500 })
  })

  it('y su corrección de invierno se conserva', () => {
    const verano = uiDeExposicion(exp(30), '2026-07-15')
    const invierno = uiDeExposicion(exp(30), '2026-12-15')
    expect(invierno.max).toBeLessThan(verano.max * 0.1)
  })

  it('sin coordenadas también se usa el camino viejo, aunque haya hora', () => {
    const r = uiDeExposicion(exp(30, MEDIODIA_JUNIO), '2026-07-15')
    expect(r).toEqual({ min: 4500, max: 10500 })
  })
})

describe('el día entero', () => {
  it('suma las exposiciones', () => {
    const d = dia(VERANO, exp(15, MEDIODIA_JUNIO), exp(15, MEDIODIA_JUNIO))
    const r = uiDelDia(d, MADRID, ALBERTO, TZ_VERANO)!
    const una = uiDeExposicion(exp(15, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(r.max).toBeCloseTo(una.max * 2, 0)
  })

  it('la cifra manual manda sobre la estimación', () => {
    const d: DiaDeSol = { ...dia(VERANO, exp(30, MEDIODIA_JUNIO)), ui: 6400 }
    expect(uiDelDia(d, MADRID, ALBERTO, TZ_VERANO)).toEqual({ min: 6400, max: 6400 })
  })

  it('sin nada apuntado no hay cifra que dar', () => {
    expect(uiDelDia(undefined)).toBeUndefined()
    expect(uiDelDia(dia(VERANO))).toBeUndefined()
  })

  it('los minutos manuales mandan sobre la suma', () => {
    expect(minutosDelDia({ ...dia(VERANO, exp(30)), minutos: 90 })).toBe(90)
    expect(minutosDelDia(dia(VERANO, exp(30), exp(15)))).toBe(45)
  })
})

describe('cuánto se tarda en quemarse', () => {
  it('con el sol de junio en Madrid da los minutos de las tablas', () => {
    expect(minutosParaQuemarse(73, { fototipo: 'I' })!).toBeGreaterThan(9)
    expect(minutosParaQuemarse(73, { fototipo: 'I' })!).toBeLessThan(13)
    expect(minutosParaQuemarse(73, { fototipo: 'II' })!).toBeGreaterThan(12)
    expect(minutosParaQuemarse(73, { fototipo: 'II' })!).toBeLessThan(17)
  })

  it('la piel más oscura SIEMPRE tarda más que la más clara', () => {
    // La fórmula de partida hacía justo lo contrario para algunos fototipos.
    const tiempos = ORDEN_FOTOTIPO.map((f) => minutosParaQuemarse(60, { fototipo: f })!)
    expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b))
    expect(minutosParaQuemarse(73, { fototipo: 'VI' })!).toBeGreaterThan(40)
  })

  it('un cielo cerrado alarga el tiempo hasta quemarse', () => {
    const limpio = minutosParaQuemarse(73, ALBERTO, 1)!
    const velado = minutosParaQuemarse(73, ALBERTO, 0.4)!
    expect(velado).toBeGreaterThan(limpio * 2)
  })

  it('sin UV no aplica, y se dice con null en vez de con un número enorme', () => {
    expect(minutosParaQuemarse(20, ALBERTO)).toBeNull()
    expect(minutosParaQuemarse(-10, ALBERTO)).toBeNull()
    expect(minutosParaQuemarse(73, ALBERTO, 0)).toBeNull()
  })

  it('la tabla de dosis crece con el fototipo', () => {
    const dosis = ORDEN_FOTOTIPO.map((f) => MED_J_M2[f])
    expect(dosis).toEqual([...dosis].sort((a, b) => a - b))
  })
})

describe('la semana', () => {
  it('cuenta los días con sol y los que de verdad sintetizaron', () => {
    const sol = [
      dia('2026-06-19', exp(30, MEDIODIA_JUNIO)),
      dia('2026-06-20', exp(20, 7 * 60)), // de madrugada: no sintetiza
      dia(VERANO, exp(30, MEDIODIA_JUNIO))
    ]
    const r = resumenSemanal(sol, VERANO, 7, MADRID, ALBERTO)
    expect(r.diasConSol).toBe(3)
    expect(r.diasQueSintetizan).toBe(2)
  })

  it('suma las UI de la ventana', () => {
    const r = resumenSemanal([dia(VERANO, exp(30, MEDIODIA_JUNIO))], VERANO, 7, MADRID, ALBERTO)
    expect(r.ui.max).toBeGreaterThan(0)
  })

  it('sin nada apuntado no revienta', () => {
    const r = resumenSemanal(undefined, VERANO)
    expect(r.ui).toEqual({ min: 0, max: 0 })
    expect(r.diasConSol).toBe(0)
  })
})

describe('la nota de temporada', () => {
  it('sale del arco del sitio, no de una lista de meses', () => {
    const arcoInvierno = arcoDelDia(INVIERNO, MADRID, TZ_INVIERNO)
    const nota = notaDeTemporada(INVIERNO, MADRID, arcoInvierno.elevacionMaxima)!
    expect(nota).toContain('no pasa de')
    expect(nota).toContain('sigue contando')
  })

  it('no sale cuando el sol sí llega al umbral', () => {
    const arcoVerano = arcoDelDia(VERANO, MADRID, TZ_VERANO)
    expect(notaDeTemporada(VERANO, MADRID, arcoVerano.elevacionMaxima)).toBeUndefined()
  })

  it('en Quito no sale en enero, que es lo que la versión vieja no sabía hacer', () => {
    const arco = arcoDelDia('2026-01-15', QUITO, -300)
    expect(notaDeTemporada('2026-01-15', QUITO, arco.elevacionMaxima)).toBeUndefined()
  })

  it('y en Tromsø sale en invierno pero no en verano, que es lo correcto', () => {
    // A 69,6° N el sol llega a 43,8° en el solsticio de verano: hay síntesis.
    const verano = arcoDelDia(VERANO, TROMSO, TZ_VERANO)
    expect(notaDeTemporada(VERANO, TROMSO, verano.elevacionMaxima)).toBeUndefined()

    const invierno = arcoDelDia(INVIERNO, TROMSO, TZ_INVIERNO)
    expect(notaDeTemporada(INVIERNO, TROMSO, invierno.elevacionMaxima)).toBeDefined()
  })

  it('sin coordenadas no dice nada, en vez de suponer una latitud', () => {
    expect(notaDeTemporada(INVIERNO)).toBeUndefined()
  })
})

describe('cómo se escriben las UI', () => {
  it('un rango va redondeado y con «unas»', () => {
    // El español no agrupa los millares de cuatro cifras: 4500 va sin punto y
    // 10.500 con él. Es `toLocaleString('es-ES')` haciendo lo correcto.
    expect(escribirUI({ min: 4500, max: 10500 })).toBe('unas 4500–10.500 UI')
  })

  it('una cifra exacta va tal cual, sin redondear lo que no es nuestro', () => {
    expect(escribirUI({ min: 6400, max: 6400 })).toBe('6400 UI')
  })

  it('y lo residual se dice con palabras', () => {
    expect(escribirUI({ min: 10, max: 40 })).toBe('una síntesis mínima')
  })
})

describe('editar el día de sol', () => {
  it('añade y quita exposiciones sin tocar lo demás', () => {
    const d = conExposicion(undefined, VERANO, exp(20, MEDIODIA_JUNIO))
    expect(d.exposiciones).toHaveLength(1)
    expect(sinExposicion(d, 0).exposiciones).toHaveLength(0)
  })

  it('la cifra manual conserva las exposiciones', () => {
    const d = conExposicion(undefined, VERANO, exp(20, MEDIODIA_JUNIO))
    expect(conManual(d, VERANO, { ui: 5000 }).exposiciones).toHaveLength(1)
  })

  it('y se encuentra el día por su fecha', () => {
    expect(solDe([dia(VERANO)], VERANO)?.date).toBe(VERANO)
    expect(solDe([dia(VERANO)], INVIERNO)).toBeUndefined()
  })
})


describe('partir una sesión no infla la vitamina D', () => {
  const MADRID = { lat: 40.4165, lon: -3.7026 }
  const JUNIO = '2026-06-21'

  const dia = (exposiciones: ExposicionSolar[]): DiaDeSol => ({ date: JUNIO, exposiciones })
  const exp = (desde: number, minutos: number, cielo?: EstadoDelCielo): ExposicionSolar => ({
    minutos,
    franja: 'mediodia',
    piel: 'banador',
    desde,
    ...(cielo ? { cielo } : {})
  })

  it('una hora seguida partida en tres da lo mismo que una hora de una pieza', () => {
    // Es el agujero que abrió poder cambiar el cielo a media sesión: si cada
    // trozo se quedara con su propio tope de cuarenta minutos, mirar al cielo
    // dos veces habría multiplicado la vitamina D del día.
    const entera = uiDelDia(dia([exp(840, 60, 'limpio')]), MADRID, {}, 120)
    const partida = uiDelDia(
      dia([exp(840, 20, 'limpio'), exp(860, 20, 'limpio'), exp(880, 20, 'limpio')]),
      MADRID,
      {},
      120
    )
    expect(partida!.max).toBeCloseTo(entera!.max, -1)
  })

  it('pero dos salidas separadas por horas conservan cada una su tope', () => {
    // En medio la piel ha tenido tiempo de recuperarse: no son la misma
    // exposición y no deben compartir el tope.
    const seguidas = uiDelDia(dia([exp(600, 60, 'limpio'), exp(660, 60, 'limpio')]), MADRID, {}, 120)
    const separadas = uiDelDia(dia([exp(600, 60, 'limpio'), exp(900, 60, 'limpio')]), MADRID, {}, 120)
    expect(separadas!.max).toBeGreaterThan(seguidas!.max)
  })

  it('el reparto respeta el orden: el primer tramo gasta primero', () => {
    const r = conMinutosEficaces([exp(840, 30, 'limpio'), exp(870, 30, 'limpio')])
    expect(r.map((e) => e.minutos)).toEqual([30, 10])
  })

  it('y lo que pase del tope se queda en cero, no en negativo', () => {
    const r = conMinutosEficaces([exp(840, 50, 'limpio'), exp(890, 20, 'limpio')])
    expect(r.map((e) => e.minutos)).toEqual([40, 0])
  })

  it('cada tramo mantiene su cielo al recortarse', () => {
    const r = conMinutosEficaces([exp(840, 30, 'sin_sol'), exp(870, 30, 'limpio')])
    expect(r.map((e) => e.cielo)).toEqual(['sin_sol', 'limpio'])
  })

  it('las exposiciones sin hora no se encadenan con nada', () => {
    // No se puede saber si continúan a otra, así que conservan su tope.
    const sinHora: ExposicionSolar = { minutos: 60, franja: 'mediodia', piel: 'banador' }
    const r = conMinutosEficaces([exp(840, 40, 'limpio'), sinHora])
    expect(r.find((e) => e.desde === undefined)?.minutos).toBe(60)
  })

  it('cinco minutos cubiertos y cincuenta y cinco limpios no es lo mismo que una hora a medias', () => {
    // El factor de cielo multiplica, no se promedia.
    const real = uiDelDia(dia([exp(840, 5, 'sin_sol'), exp(845, 55, 'limpio')]), MADRID, {}, 120)
    const promediado = uiDelDia(dia([exp(840, 60, 'velado')]), MADRID, {}, 120)
    expect(real!.max).not.toBeCloseTo(promediado!.max, -2)
  })
})
