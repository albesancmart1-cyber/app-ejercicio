import { describe, expect, it } from 'vitest'
import {
  ELEVACION_MINIMA,
  K_UI_POR_MIN_UVI,
  UI_POR_MED_CUERPO_ENTERO,
  F_FOTOTIPO,
  FOTOTIPO_POR_DEFECTO,
  MED_J_M2,
  factorFototipo,
  medDe,
  ORDEN_FOTOTIPO,
  ORDEN_PIEL,
  PIEL_PCT,
  conExposicion,
  conManual,
  escribirUI,
  factorAltitud,
  factorEdad,
  minutosDelDia,
  minutosParaQuemarse,
  notaDeTemporada,
  resumenSemanal,
  sinExposicion,
  solDe,
  uiDeExposicion,
  uiDelDia,
  uiPorMinuto,
  uiPorMinutoDeLampara,
  uiDeSesionPBM,
  pielDeLaZona,
  tieneUVB,
  minutosParaQuemarseConLampara,
  uviVitaminaD,
  factorVitaminaD,
  type Fototipo,
  type QuienToma
} from './vitaminaD'
import { CIELOS, ORDEN_CIELO, factorDeCielo, type EstadoDelCielo } from './cielo'
import { OZONO_DE_REFERENCIA, indiceUV, ozonoDU } from './atmosfera'
import { arcoDelDia } from './arcoSolar'
import type { DiaDeSol, ExposicionSolar, Lampara, PielExpuesta, SesionPBM } from './types'

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

describe('el UV que sintetiza vitamina D', () => {
  it('en la referencia vale exactamente lo que el índice UV, por construcción', () => {
    // Sol en la vertical y 300 DU: es donde está calibrado `k`. No sale 1
    // clavado sino 1,0006, porque Kasten y Young dan 0,9991 atmósferas en el
    // cenit y no 1 exacto — la Tierra no es plana ni siquiera mirando arriba.
    expect(factorVitaminaD(90, OZONO_DE_REFERENCIA)).toBeCloseTo(1, 2)
    expect(uviVitaminaD(90, OZONO_DE_REFERENCIA)).toBeCloseTo(indiceUV(90), 1)
  })

  it('cae mucho más deprisa que la quemadura según el sol baja', () => {
    // Es el error que tenía el `k` fijo por punto de índice UV: daba por hecho
    // que la proporción entre vitamina D y quemadura no cambia. Cambia, y mucho.
    const caidaUvi = indiceUV(30) / indiceUV(90)
    const caidaVitD = uviVitaminaD(30) / uviVitaminaD(90)
    expect(caidaVitD).toBeLessThan(caidaUvi / 5)
  })

  it('y más ozono la castiga más a ella que a la quemadura', () => {
    // La banda de la vitamina D está diez nanómetros más corta, donde el ozono
    // absorbe mucho más fuerte. Eso es todo lo que `factorVitaminaD` dice.
    const uvi = indiceUV(60, 400) / indiceUV(60, 280)
    const vitd = uviVitaminaD(60, 400) / uviVitaminaD(60, 280)
    expect(vitd).toBeLessThan(uvi)
  })

  it('no tiene ningún corte, y esto es lo que cambia respecto a lo de antes', () => {
    // El modelo viejo devolvía 4,4 a 30,0° de elevación y exactamente cero a
    // 29,9°. Ahora la curva baja sola: a 30° es poquísimo, pero no es cero.
    expect(uviVitaminaD(ELEVACION_MINIMA - 0.1)).toBeGreaterThan(0)
    expect(uviVitaminaD(ELEVACION_MINIMA)).toBeLessThan(uviVitaminaD(90) * 0.05)
    for (let e = 1; e < 89; e++) {
      expect(uviVitaminaD(e + 1)).toBeGreaterThan(uviVitaminaD(e))
    }
  })

  it('bajo el horizonte sí es cero', () => {
    expect(uviVitaminaD(0)).toBe(0)
    expect(uviVitaminaD(-5)).toBe(0)
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
    /*
     * Veinte minutos de cuerpo entero al mediodía de junio en Madrid son algo
     * más de una MED —la quemadura llega a los quince—, así que la cifra tiene
     * que salir por encima de la horquilla de una MED y no muy por encima.
     */
    const porMin = uiPorMinuto(73, 'entero', { fototipo: 'II', edad: 30, altitudM: 0 })
    const enVeinte = porMin * 20
    expect(enVeinte).toBeGreaterThan(15000)
    expect(enVeinte).toBeLessThan(30000)
  })

  /*
   * La comprobación que ata `k` a algo. No está elegido a ojo: sale de cruzar
   * las dos cifras que ya estaban en este fichero —una MED de fototipo II son
   * 250 J/m², y la literatura sitúa una MED a cuerpo entero en torno a 12 000
   * UI— con la referencia en la que `k` está definido. Si alguien mueve una
   * constante y rompe la coherencia entre las dos mitades del modelo, salta.
   */
  /*
   * La prueba que ata `k` a la literatura, y que además guarda la esquina en la
   * que estuvo mal: **el anclaje tiene que estar donde se midió el dato**.
   *
   * La equivalencia «una MED a cuerpo entero ≈ 10 000–20 000 UI» se midió con
   * gente al sol de verano a media latitud, no con el sol en la vertical.
   * Anclarla en el cenit —donde el factor de la vitamina D vale 1 por
   * construcción— y aplicar después ese factor descontaba dos veces lo mismo, y
   * la cifra salía cerca de la mitad de lo que debía.
   */
  it('y `k` cuadra con la MED en el sol donde esa MED se midió', () => {
    const uvi = indiceUV(60, OZONO_DE_REFERENCIA)
    const minutosDeUnaMed = MED_J_M2.II / (uvi * 0.025) / 60
    const enUnaMed =
      uiPorMinuto(60, 'entero', { fototipo: 'II', edad: 20, altitudM: 0 }, 1, OZONO_DE_REFERENCIA) *
      minutosDeUnaMed
    expect(enUnaMed).toBeCloseTo(UI_POR_MED_CUERPO_ENTERO, -2)
    // Y sigue dentro de la horquilla publicada, que es de 10 000 a 20 000.
    expect(enUnaMed).toBeGreaterThan(10000)
    expect(enUnaMed).toBeLessThan(20000)
  })

  it('con el sol más alto se saca más vitamina D por cada MED, y eso es el punto', () => {
    /*
     * Es lo que `factorVitaminaD` aporta y lo que un `k` fijo por punto de
     * índice UV no podía decir: la proporción entre lo que sintetizas y lo que
     * te quemas mejora cuando el sol sube, porque la banda de la vitamina D
     * paga el camino por la atmósfera mucho más cara que la de la quemadura.
     */
    const porMed = (elev: number) => {
      const min = MED_J_M2.II / (indiceUV(elev, OZONO_DE_REFERENCIA) * 0.025) / 60
      return uiPorMinuto(elev, 'entero', { fototipo: 'II', edad: 20 }, 1, OZONO_DE_REFERENCIA) * min
    }
    expect(porMed(80)).toBeGreaterThan(porMed(60))
    expect(porMed(60)).toBeGreaterThan(porMed(40))
  })

  it('`k` no es un número escrito a mano: se despeja del anclaje', () => {
    // Si alguien mueve el anclaje, `k` se mueve solo. Y si alguien vuelve a
    // ponerlo en el cenit, esto baja a ~21 y la prueba de arriba salta.
    expect(K_UI_POR_MIN_UVI).toBeGreaterThan(30)
    expect(K_UI_POR_MIN_UVI).toBeLessThan(40)
  })

  it('con el sol bajo son poquísimas, pero ya no son cero', () => {
    // Antes había un corte en 30° y esto valía exactamente cero. La síntesis de
    // un mediodía de diciembre es ridícula, pero existe, y ahora se dice.
    const bajo = uiPorMinuto(25, 'entero', { fototipo: 'I' })
    const alto = uiPorMinuto(73, 'entero', { fototipo: 'I' })
    expect(bajo).toBeGreaterThan(0)
    expect(bajo).toBeLessThan(alto * 0.05)
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
    expect(junio).toBeGreaterThan(0)
    expect(diciembre).toBeLessThan(junio * 0.01)
  })

  it('en Madrid en diciembre la síntesis es residual a cualquier hora', () => {
    // Y sale solo del arco: no queda ninguna lista de meses en el código.
    // «Residual» y no «cero»: el corte en 30° se fue, y con él la mentira de
    // que a las 13:00 del 21 de diciembre la piel no fabrica absolutamente nada.
    for (const hora of [10, 12, 13, 14, 15, 16]) {
      const r = uiDeExposicion(exp(30, hora * 60), INVIERNO, MADRID, ALBERTO, TZ_INVIERNO)
      expect(r, `${hora}:00`).toBeLessThan(100)
    }
    // Pero al mediodía no es literalmente cero, y eso también se comprueba.
    expect(uiDeExposicion(exp(30, 13 * 60), INVIERNO, MADRID, ALBERTO, TZ_INVIERNO)).toBeGreaterThan(0)
  })

  it('veinte minutos en bañador al mediodía de junio dan una cifra creíble', () => {
    const r = uiDeExposicion(exp(20, MEDIODIA_JUNIO, 'banador'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(r).toBeGreaterThan(3000)
    expect(r).toBeLessThan(15000)
  })

  it('y media hora de cara y manos, una mucho menor', () => {
    const r = uiDeExposicion(
      exp(30, MEDIODIA_JUNIO, 'cara_manos'),
      VERANO,
      MADRID,
      ALBERTO,
      TZ_VERANO
    )
    expect(r).toBeGreaterThan(200)
    expect(r).toBeLessThan(3000)
  })

  it('dos horas dan menos de cuatro veces lo de media hora, pero por el arco', () => {
    // Antes esto se cumplía porque la piel saturaba a los cuarenta minutos. Ya
    // no hay tope de ninguna clase: lo que hace que no salgan cuatro veces es
    // que el sol se va poniendo, que es la razón de verdad.
    const media = uiDeExposicion(exp(30, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)
    const dosHoras = uiDeExposicion(exp(120, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(dosHoras).toBeLessThan(media * 4)
    // Y sin embargo dos horas dan más que media hora, que con el tope de antes
    // no era verdad: a partir de los cuarenta minutos daba exactamente igual.
    expect(dosHoras).toBeGreaterThan(media * 2)
  })

  it('un rato largo nunca deja de sumar: no hay techo ni corte de minutos', () => {
    const cuarenta = uiDeExposicion(exp(40, MEDIODIA_JUNIO, 'entero'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    const cuarentaYUno = uiDeExposicion(exp(41, MEDIODIA_JUNIO, 'entero'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(cuarentaYUno).toBeGreaterThan(cuarenta)
    // Y muy por encima de las 20 000 UI del techo que había.
    const tresHoras = uiDeExposicion(exp(180, 11 * 60, 'entero'), VERANO, MADRID, { fototipo: 'I', edad: 20 }, TZ_VERANO)
    expect(tresHoras).toBeGreaterThan(20000)
  })

  it('funciona igual de bien en el ecuador y en el círculo polar', () => {
    // Lo que la versión anterior no podía hacer: daba por hecha la latitud de
    // España y repartía «invierno» por meses del hemisferio norte.
    const quito = uiDeExposicion(exp(20, 12 * 60), '2026-01-15', QUITO, ALBERTO, -300)
    expect(quito).toBeGreaterThan(1000) // en enero, en el ecuador, sí sintetiza

    // En Tromsø el sol llega a 43,8° en el solsticio: sí sintetiza en verano.
    // La versión vieja, con su lista de meses del hemisferio norte, decía que
    // junio era temporada alta allí y en Quito — con un modelo de 40° N.
    const tromsoVerano = uiDeExposicion(exp(20, 12 * 60), VERANO, TROMSO, ALBERTO, TZ_VERANO)
    expect(tromsoVerano).toBeGreaterThan(0)

    // Y en diciembre no: allí es noche polar y el sol no sale.
    // Y en diciembre no: allí el sol no sale, y bajo el horizonte sí es cero.
    const tromsoInvierno = uiDeExposicion(exp(20, 12 * 60), INVIERNO, TROMSO, ALBERTO, TZ_INVIERNO)
    expect(tromsoInvierno).toBe(0)
  })

  it('un rato de cero minutos no da nada', () => {
    expect(uiDeExposicion(exp(0, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)).toBe(0)
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
    expect(sinSol).toBeLessThan(limpio * 0.05)
  })

  it('un cielo con estelas o calima quita cerca de un tercio', () => {
    const limpio = uiDeExposicion(exp(30, MEDIODIA_JUNIO, 'torso', 'limpio'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    const estelas = uiDeExposicion(exp(30, MEDIODIA_JUNIO, 'torso', 'estelas'), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(estelas / limpio).toBeCloseTo(0.7, 1)
  })

  it('sin decir nada se supone cielo despejado, que es lo que asume la referencia', () => {
    expect(factorDeCielo(undefined)).toBe(1)
  })
})

describe('lo apuntado antes de este cambio', () => {
  it('sin hora sigue dando exactamente el mismo número que daba', () => {
    // Cifras del cálculo viejo: 30 min de brazos y piernas al mediodía de julio,
    // 150–350 UI/min → 4 500–10 500. Como ahora hay que dar un número, se toma
    // el centro de aquella horquilla: 7 500.
    expect(uiDeExposicion(exp(30), '2026-07-15')).toBe(7500)
  })

  it('y su corrección de invierno se conserva', () => {
    const verano = uiDeExposicion(exp(30), '2026-07-15')
    const invierno = uiDeExposicion(exp(30), '2026-12-15')
    expect(invierno).toBeLessThan(verano * 0.1)
  })

  it('sin coordenadas también se usa el camino viejo, aunque haya hora', () => {
    expect(uiDeExposicion(exp(30, MEDIODIA_JUNIO), '2026-07-15')).toBe(7500)
  })
})

describe('el día entero', () => {
  it('suma las exposiciones', () => {
    const d = dia(VERANO, exp(15, MEDIODIA_JUNIO), exp(15, MEDIODIA_JUNIO))
    const r = uiDelDia(d, MADRID, ALBERTO, TZ_VERANO)!
    const una = uiDeExposicion(exp(15, MEDIODIA_JUNIO), VERANO, MADRID, ALBERTO, TZ_VERANO)
    expect(r).toBeCloseTo(una * 2, 5)
  })

  it('la cifra manual manda sobre la estimación', () => {
    const d: DiaDeSol = { ...dia(VERANO, exp(30, MEDIODIA_JUNIO)), ui: 6400 }
    expect(uiDelDia(d, MADRID, ALBERTO, TZ_VERANO)).toBe(6400)
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

  it('sin UV que queme no aplica, y se dice con null en vez de con un número enorme', () => {
    // El null ya no sale del corte en 30° —que no existe— sino de un índice UV
    // por debajo de 1, que es el escalón más bajo que se reporta. Decir «te
    // quemas en cuatro horas» sería verdad y no serviría de nada.
    expect(minutosParaQuemarse(20, ALBERTO)).toBeNull()
    expect(minutosParaQuemarse(-10, ALBERTO)).toBeNull()
    expect(minutosParaQuemarse(73, ALBERTO, 0)).toBeNull()
  })

  it('y con más ozono se tarda más en quemarse', () => {
    const pocoOzono = minutosParaQuemarse(73, ALBERTO, 1, 260)!
    const muchoOzono = minutosParaQuemarse(73, ALBERTO, 1, 400)!
    expect(muchoOzono).toBeGreaterThan(pocoOzono)
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
    expect(r.ui).toBeGreaterThan(0)
  })

  it('sin nada apuntado no revienta', () => {
    const r = resumenSemanal(undefined, VERANO)
    expect(r.ui).toBe(0)
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
  it('la cifra entera, sin redondear a cientos y sin «unas» delante', () => {
    // El español no agrupa los millares de cuatro cifras: 4500 va sin punto y
    // 10.500 con él. Es `toLocaleString('es-ES')` haciendo lo correcto.
    expect(escribirUI(4567)).toBe('4567 UI')
    expect(escribirUI(10500)).toBe('10.500 UI')
  })

  it('los decimales se redondean, que UI con coma no significan nada', () => {
    expect(escribirUI(4567.4)).toBe('4567 UI')
    expect(escribirUI(4567.6)).toBe('4568 UI')
  })

  it('y lo pequeño se dice con su número, no con un eufemismo', () => {
    // Antes esto era «una síntesis mínima». Si el usuario pide la cifra, la
    // cifra: 37 UI son 37 UI y él sabrá qué hacer con ellas.
    expect(escribirUI(37)).toBe('37 UI')
    expect(escribirUI(0)).toBe('0 UI')
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

  /*
   * Esto era el agujero que abrió poder cambiar el cielo a media sesión: con un
   * tope de cuarenta minutos por exposición, partir una hora en tres trozos
   * habría dado tres topes en vez de uno. Se resolvía repartiendo el tope entre
   * los trozos seguidos, con `conMinutosEficaces`.
   *
   * Al quitar el tope, el agujero se cierra **solo**: cada minuto real se
   * integra una vez con la altura que tenía el sol en ese minuto, así que
   * partir la sesión no puede cambiar el total. Ya no hay nada que repartir, y
   * por eso `conMinutosEficaces` no existe. Las pruebas se quedan: la propiedad
   * que garantizaban sigue siendo obligatoria, aunque ahora la garantice la
   * forma del cálculo y no un mecanismo aparte.
   */
  it('una hora seguida partida en tres da exactamente lo mismo que una de una pieza', () => {
    const entera = uiDelDia(dia([exp(840, 60, 'limpio')]), MADRID, {}, 120)!
    const partida = uiDelDia(
      dia([exp(840, 20, 'limpio'), exp(860, 20, 'limpio'), exp(880, 20, 'limpio')]),
      MADRID,
      {},
      120
    )!
    expect(partida).toBeCloseTo(entera, 6)
  })

  it('partirla en sesenta trozos de un minuto tampoco la mueve', () => {
    const entera = uiDelDia(dia([exp(840, 60, 'limpio')]), MADRID, {}, 120)!
    const trozos = uiDelDia(
      dia(Array.from({ length: 60 }, (_, i) => exp(840 + i, 1, 'limpio'))),
      MADRID,
      {},
      120
    )!
    expect(trozos).toBeCloseTo(entera, 6)
  })

  it('y dos salidas separadas por horas suman las dos, cada una con su sol', () => {
    const manana = uiDelDia(dia([exp(600, 60, 'limpio')]), MADRID, {}, 120)!
    const tarde = uiDelDia(dia([exp(900, 60, 'limpio')]), MADRID, {}, 120)!
    const ambas = uiDelDia(dia([exp(600, 60, 'limpio'), exp(900, 60, 'limpio')]), MADRID, {}, 120)!
    expect(ambas).toBeCloseTo(manana + tarde, 6)
  })

  it('cinco minutos cubiertos y cincuenta y cinco limpios no es lo mismo que una hora a medias', () => {
    // El factor de cielo multiplica, no se promedia.
    const real = uiDelDia(dia([exp(840, 5, 'sin_sol'), exp(845, 55, 'limpio')]), MADRID, {}, 120)!
    const promediado = uiDelDia(dia([exp(840, 60, 'velado')]), MADRID, {}, 120)!
    expect(real).not.toBeCloseTo(promediado, -2)
  })
})

describe('las lámparas con UVB también fabrican vitamina D', () => {
  const UVB: Lampara = {
    id: 'uvb',
    nombre: 'Lámpara de UVB',
    distanciaRefCm: 30,
    ondas: [
      { nm: 297, irradiancia: 0.05 },
      { nm: 310, irradiancia: 0.03 }
    ]
  }
  const ROJA: Lampara = {
    id: 'roja',
    nombre: 'Panel rojo',
    distanciaRefCm: 15,
    ondas: [
      { nm: 660, irradiancia: 18 },
      { nm: 850, irradiancia: 14 }
    ]
  }
  const sesion = (extra: Partial<SesionPBM> = {}): SesionPBM => ({
    id: 's1',
    date: VERANO,
    lamparaId: 'uvb',
    minutos: 10,
    distanciaCm: 30,
    zona: 'torso',
    ...extra
  })

  it('una lámpara de UVB da una cifra creíble, no cero', () => {
    // Es el fallo que esto arregla: la app daba por hecho que ninguna lámpara
    // emite UVB, y a la piel le da igual si el fotón viene del sol o de un tubo.
    const porMin = uiPorMinutoDeLampara(UVB, 30, 'torso', ALBERTO)
    expect(porMin).toBeGreaterThan(100)
    expect(porMin).toBeLessThan(2000)
  })

  it('y un panel de rojo e infrarrojo sigue dando cero, que ahí sí es verdad', () => {
    expect(uiPorMinutoDeLampara(ROJA, 15, 'entero', ALBERTO)).toBe(0)
    expect(tieneUVB(ROJA)).toBe(false)
    expect(tieneUVB(UVB)).toBe(true)
  })

  it('al doble de distancia, la cuarta parte: la luz cae con el cuadrado', () => {
    const cerca = uiPorMinutoDeLampara(UVB, 30, 'torso', ALBERTO)
    const lejos = uiPorMinutoDeLampara(UVB, 60, 'torso', ALBERTO)
    expect(lejos).toBeCloseTo(cerca / 4, 5)
  })

  it('más piel descubierta, más síntesis, en la misma proporción que con el sol', () => {
    const torso = uiPorMinutoDeLampara(UVB, 30, 'torso', ALBERTO)
    const cara = uiPorMinutoDeLampara(UVB, 30, 'cara_manos', ALBERTO)
    expect(torso / cara).toBeCloseTo(PIEL_PCT.torso / PIEL_PCT.cara_manos, 5)
  })

  it('la zona de la sesión decide cuánta piel, sin volver a preguntarlo', () => {
    expect(pielDeLaZona('torso')).toBe('torso')
    expect(pielDeLaZona('cara')).toBe('cara_manos')
    expect(pielDeLaZona('piernas')).toBe('brazos_piernas')
  })

  it('una sesión suma sus minutos, y los tramos los suyos', () => {
    const diez = uiDeSesionPBM(sesion(), [UVB], 'torso', ALBERTO)
    expect(diez).toBeCloseTo(uiPorMinutoDeLampara(UVB, 30, 'torso', ALBERTO) * 10, 5)

    // Con tramos: cinco minutos con la UVB y cinco con la roja.
    const partida = uiDeSesionPBM(
      sesion({
        minutos: 10,
        tramos: [
          { minutos: 5, lamparas: [{ lamparaId: 'uvb', distanciaCm: 30 }] },
          { minutos: 5, lamparas: [{ lamparaId: 'roja', distanciaCm: 15 }] }
        ]
      }),
      [UVB, ROJA],
      'torso',
      ALBERTO
    )
    expect(partida).toBeCloseTo(diez / 2, 5)
  })

  it('se suman a las del sol en el día, en vez de vivir en otro sitio', () => {
    const soloSol = uiDelDia(dia(VERANO, exp(20, MEDIODIA_JUNIO)), MADRID, ALBERTO, TZ_VERANO)!
    const conLampara = uiDelDia(dia(VERANO, exp(20, MEDIODIA_JUNIO)), MADRID, ALBERTO, TZ_VERANO, {
      sesiones: [sesion()],
      catalogo: [UVB]
    })!
    expect(conLampara).toBeGreaterThan(soloSol)
    expect(conLampara - soloSol).toBeCloseTo(uiDeSesionPBM(sesion(), [UVB], 'torso', ALBERTO), 5)
  })

  it('un día sin sol pero con lámpara de UVB ya no es un día sin cifra', () => {
    const r = uiDelDia(undefined, MADRID, ALBERTO, TZ_VERANO, {
      sesiones: [sesion()],
      catalogo: [UVB],
      fecha: VERANO
    })
    expect(r).toBeGreaterThan(0)
  })

  it('pero un día con solo panel rojo sigue sin cifra que dar', () => {
    const r = uiDelDia(undefined, MADRID, ALBERTO, TZ_VERANO, {
      sesiones: [sesion({ lamparaId: 'roja', distanciaCm: 15 })],
      catalogo: [ROJA],
      fecha: VERANO
    })
    expect(r).toBeUndefined()
  })

  it('la cifra manual sigue mandando sobre todo, lámpara incluida', () => {
    const d: DiaDeSol = { ...dia(VERANO, exp(30, MEDIODIA_JUNIO)), ui: 6400 }
    expect(uiDelDia(d, MADRID, ALBERTO, TZ_VERANO, { sesiones: [sesion()], catalogo: [UVB] })).toBe(
      6400
    )
  })
})

describe('quemarse con una lámpara', () => {
  const UVB: Lampara = {
    id: 'uvb',
    nombre: 'Lámpara de UVB',
    distanciaRefCm: 30,
    ondas: [{ nm: 297, irradiancia: 0.05 }]
  }

  it('una de UVB quema, y hay que decir en cuánto', () => {
    // Sin atmósfera delante, una lámpara de UVB quema mucho antes de lo que
    // uno intuye: es la cifra que tiene que ir al lado de la de vitamina D.
    const min = minutosParaQuemarseConLampara(UVB, 30, { fototipo: 'III' })!
    expect(min).toBeGreaterThan(1)
    expect(min).toBeLessThan(60)
  })

  it('la piel más oscura tarda más, como con el sol', () => {
    const tiempos = ORDEN_FOTOTIPO.map(
      (f) => minutosParaQuemarseConLampara(UVB, 30, { fototipo: f })!
    )
    expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b))
  })

  it('al doble de distancia se tarda cuatro veces más', () => {
    const cerca = minutosParaQuemarseConLampara(UVB, 30, { fototipo: 'III' })!
    const lejos = minutosParaQuemarseConLampara(UVB, 60, { fototipo: 'III' })!
    expect(lejos).toBeCloseTo(cerca * 4, 3)
  })

  it('y un panel de rojo e infrarrojo no quema: no aplica, en vez de un número', () => {
    const roja: Lampara = {
      id: 'r',
      nombre: 'Panel',
      distanciaRefCm: 15,
      ondas: [{ nm: 660, irradiancia: 18 }]
    }
    expect(minutosParaQuemarseConLampara(roja, 15, { fototipo: 'III' })).toBeNull()
  })
})

describe('un fototipo que no es ninguno de los seis no rompe la cifra', () => {
  it('cae al fototipo por defecto en vez de dar NaN', () => {
    /*
     * El fototipo sale de `localStorage`, y ahí puede haber lo que dejara una
     * versión vieja, una copia importada a mano o un dato editado. Con el
     * acceso directo a la tabla, cualquiera de esas tres cosas convertía todas
     * las cifras de vitamina D del día en NaN, y la app las pintaba tal cual:
     * «NaN UI». Un número raro se discute; un NaN no se puede ni mirar.
     */
    const raro = 3 as unknown as Fototipo

    expect(factorFototipo(raro)).toBe(F_FOTOTIPO[FOTOTIPO_POR_DEFECTO])
    expect(medDe(raro)).toBe(MED_J_M2[FOTOTIPO_POR_DEFECTO])
    expect(Number.isNaN(factorFototipo(raro))).toBe(false)
  })

  it('y sin fototipo dicho, lo mismo: es lo que hace la app cuando aún no lo sabe', () => {
    expect(factorFototipo(undefined)).toBe(F_FOTOTIPO[FOTOTIPO_POR_DEFECTO])
    expect(medDe(undefined)).toBe(MED_J_M2[FOTOTIPO_POR_DEFECTO])
  })

  it('la cifra de una lámpara con un fototipo raro sale finita, que es lo que importa', () => {
    const uvb: Lampara = {
      id: 'uvb',
      nombre: 'UVB',
      distanciaRefCm: 30,
      ondas: [
        { nm: 297, irradiancia: 0.05 },
        { nm: 365, irradiancia: 2 }
      ]
    }
    const ui = uiPorMinutoDeLampara(uvb, 30, 'torso', { fototipo: 3 as unknown as Fototipo })

    expect(Number.isFinite(ui)).toBe(true)
    expect(ui).toBeGreaterThan(0)
  })
})
