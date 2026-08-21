import { describe, expect, it } from 'vitest'
import {
  arcoDelDia,
  cambioDesdeAyer,
  elevacionSolar,
  escribirDuracion,
  escribirGrados,
  escribirHora,
  horaDeElevacion,
  sumarDiaIso,
  type Coordenadas
} from './arcoSolar'

const MADRID: Coordenadas = { lat: 40.4165, lon: -3.7026 }
const REIKIAVIK: Coordenadas = { lat: 64.1466, lon: -21.9426 }
const QUITO: Coordenadas = { lat: -0.1807, lon: -78.4678 }
const TROMSO: Coordenadas = { lat: 69.6496, lon: 18.9560 }

/** Horario español: +1 en invierno, +2 en verano. Se pasa a mano en los tests
 *  para que el resultado no dependa de la zona horaria de quien los ejecute. */
const INVIERNO = 60
const VERANO = 120

const hhmm = (m: number | null) => escribirHora(m)

describe('el arco de un día', () => {
  it('clava el amanecer y el ocaso de Madrid en el solsticio de verano', () => {
    const arco = arcoDelDia('2026-06-21', MADRID, VERANO)
    // Contrastado con la calculadora solar de la NOAA: 06:45 y 21:48.
    expect(hhmm(arco.pasos.orto.manana)).toBe('06:45')
    expect(hhmm(arco.pasos.orto.tarde)).toBe('21:48')
    // Y el mediodía cae justo en medio de los dos, que es lo que significa.
    const medio = (arco.pasos.orto.manana! + arco.pasos.orto.tarde!) / 2
    expect(arco.mediodiaSolar).toBeCloseTo(medio, 6)
  })

  it('y los del solsticio de invierno, con el desfase de invierno', () => {
    const arco = arcoDelDia('2025-12-21', MADRID, INVIERNO)
    expect(hhmm(arco.pasos.orto.manana)).toBe('08:35')
    expect(hhmm(arco.pasos.orto.tarde)).toBe('17:51')
  })

  it('el día más largo del año dura más de quince horas y el más corto menos de diez', () => {
    const junio = arcoDelDia('2026-06-21', MADRID, VERANO)
    const diciembre = arcoDelDia('2025-12-21', MADRID, INVIERNO)
    expect(junio.duracionDiaMin).toBeGreaterThan(15 * 60)
    expect(diciembre.duracionDiaMin).toBeLessThan(10 * 60)
    // Y la diferencia entre ambos es de casi seis horas: eso es el fotoperiodo.
    expect(junio.duracionDiaMin - diciembre.duracionDiaMin).toBeGreaterThan(5 * 60)
  })

  it('los seis umbrales van en orden por la mañana y al revés por la tarde', () => {
    const { pasos } = arcoDelDia('2026-03-21', MADRID, INVIERNO)
    const manana = [
      pasos.astronomico.manana!,
      pasos.nautico.manana!,
      pasos.civil.manana!,
      pasos.orto.manana!,
      pasos.uva.manana!,
      pasos.uvb.manana!
    ]
    expect(manana).toEqual([...manana].sort((a, b) => a - b))

    const tarde = [
      pasos.uvb.tarde!,
      pasos.uva.tarde!,
      pasos.orto.tarde!,
      pasos.civil.tarde!,
      pasos.nautico.tarde!,
      pasos.astronomico.tarde!
    ]
    expect(tarde).toEqual([...tarde].sort((a, b) => a - b))
  })

  it('el mediodía solar de Madrid no cae a las doce, y por eso se calcula', () => {
    // Madrid vive en la hora de Berlín estando en la longitud de Londres: su
    // mediodía real se va más de dos horas del que marca el reloj.
    const arco = arcoDelDia('2026-06-21', MADRID, VERANO)
    expect(arco.mediodiaSolar).toBeGreaterThan(14 * 60)
  })
})

describe('cuando un umbral no ocurre', () => {
  it('en Madrid en diciembre no hay ventana de UVB, y se dice con null', () => {
    const arco = arcoDelDia('2025-12-21', MADRID, INVIERNO)
    expect(arco.pasos.uvb.manana).toBeNull()
    expect(arco.pasos.uvb.tarde).toBeNull()
    // Y el motivo se puede leer: el sol simplemente no llega a 30°.
    expect(arco.elevacionMaxima).toBeLessThan(30)
    expect(arco.elevacionMaxima).toBeGreaterThan(25)
  })

  it('en junio sí la hay, y dura más de nueve horas', () => {
    const arco = arcoDelDia('2026-06-21', MADRID, VERANO)
    expect(arco.pasos.uvb.manana).not.toBeNull()
    expect(arco.pasos.uvb.tarde! - arco.pasos.uvb.manana!).toBeGreaterThan(9 * 60)
  })

  it('en Tromsø en junio el sol no se pone: el día dura las 1 440 del reloj', () => {
    const arco = arcoDelDia('2026-06-21', TROMSO, VERANO)
    expect(arco.pasos.orto.manana).toBeNull()
    expect(arco.duracionDiaMin).toBe(1440)
    expect(arco.elevacionMinima).toBeGreaterThan(0)
  })

  it('y en diciembre no sale: el día dura cero, que también es un dato', () => {
    const arco = arcoDelDia('2025-12-21', TROMSO, INVIERNO)
    expect(arco.pasos.orto.manana).toBeNull()
    expect(arco.duracionDiaMin).toBe(0)
    expect(arco.elevacionMaxima).toBeLessThan(0)
  })

  it('en Reikiavik en verano nunca se hace de noche del todo', () => {
    const arco = arcoDelDia('2026-06-21', REIKIAVIK, 0)
    // El sol se pone, pero no baja de −18°: no hay noche astronómica.
    expect(arco.pasos.orto.manana).not.toBeNull()
    expect(arco.pasos.astronomico.manana).toBeNull()
    expect(arco.nocheAstronomicaMin).toBe(0)
  })
})

describe('la elevación en un momento concreto', () => {
  it('es máxima en el mediodía solar y mínima doce horas después', () => {
    const arco = arcoDelDia('2026-06-21', MADRID, VERANO)
    const enElMediodia = elevacionSolar('2026-06-21', MADRID, arco.mediodiaSolar, VERANO)
    const unaHoraAntes = elevacionSolar('2026-06-21', MADRID, arco.mediodiaSolar - 60, VERANO)
    const unaHoraDespues = elevacionSolar('2026-06-21', MADRID, arco.mediodiaSolar + 60, VERANO)
    expect(enElMediodia).toBeGreaterThan(unaHoraAntes)
    expect(enElMediodia).toBeGreaterThan(unaHoraDespues)
    // Y el arco es simétrico alrededor del mediodía.
    expect(unaHoraAntes).toBeCloseTo(unaHoraDespues, 4)
  })

  it('vale cero justo en el instante del orto, salvo la refracción', () => {
    const arco = arcoDelDia('2026-03-21', MADRID, INVIERNO)
    const alSalir = elevacionSolar('2026-03-21', MADRID, arco.pasos.orto.manana!, INVIERNO)
    expect(alSalir).toBeCloseTo(-0.833, 3)
  })

  it('nunca se sale de −90 a 90 aunque se pregunte por una hora absurda', () => {
    for (const minuto of [-5000, 0, 720, 1439, 9999]) {
      const e = elevacionSolar('2026-06-21', MADRID, minuto, VERANO)
      expect(e).toBeGreaterThanOrEqual(-90)
      expect(e).toBeLessThanOrEqual(90)
    }
  })

  it('resuelve la jornada de taller: a las 06:45 de diciembre aún es noche cerrada', () => {
    // Este es el caso que motivó todo esto. 06:45 son 405 minutos.
    const diciembre = elevacionSolar('2025-12-21', MADRID, 405, INVIERNO)
    expect(diciembre).toBeLessThan(-18) // por debajo del crepúsculo astronómico

    // Y en junio, a esa misma hora, el sol está justo saliendo.
    const junio = elevacionSolar('2026-06-21', MADRID, 405, VERANO)
    expect(junio).toBeGreaterThan(-2)
    expect(junio).toBeLessThan(1)
  })

  it('y el único hueco de las 09:45 sirve para la fase pero no para el UVB', () => {
    const enElHueco = elevacionSolar('2026-03-21', MADRID, 585, INVIERNO)
    expect(enElHueco).toBeGreaterThan(10) // hay UVA
    expect(enElHueco).toBeLessThan(30) // pero no hay UVB
  })
})

describe('la duración del día cambia sola', () => {
  it('en el equinoccio crece varios minutos al día', () => {
    const marzo = cambioDesdeAyer('2026-03-21', MADRID)
    expect(marzo).toBeGreaterThan(150) // más de dos minutos y medio
  })

  it('en el solsticio se para: es lo que significa la palabra', () => {
    expect(Math.abs(cambioDesdeAyer('2026-06-21', MADRID))).toBeLessThan(20)
  })

  it('y en otoño decrece', () => {
    expect(cambioDesdeAyer('2026-09-21', MADRID)).toBeLessThan(-150)
  })
})

describe('el ecuador', () => {
  it('tiene días de doce horas todo el año', () => {
    for (const fecha of ['2026-03-21', '2026-06-21', '2026-09-21', '2026-12-21']) {
      const arco = arcoDelDia(fecha, QUITO, -300)
      expect(Math.abs(arco.duracionDiaMin - 720)).toBeLessThan(15)
    }
  })
})

describe('cómo se escriben los números', () => {
  it('las horas van con dos cifras', () => {
    expect(escribirHora(405)).toBe('06:45')
    expect(escribirHora(0)).toBe('00:00')
    expect(escribirHora(1439)).toBe('23:59')
  })

  it('un umbral que cae fuera del día se envuelve en vez de dar una hora absurda', () => {
    expect(escribirHora(1500)).toBe('01:00')
    expect(escribirHora(-30)).toBe('23:30')
  })

  it('y lo que no ocurre se dice con una raya, no con un cero', () => {
    expect(escribirHora(null)).toBe('—')
    expect(escribirHora(NaN)).toBe('—')
  })

  it('las duraciones se leen en horas y minutos', () => {
    expect(escribirDuracion(904)).toBe('15 h 04 min')
    expect(escribirDuracion(45)).toBe('45 min')
    expect(escribirDuracion(120)).toBe('2 h')
  })

  it('los grados llevan coma decimal, como se escribe aquí', () => {
    expect(escribirGrados(26.14)).toBe('26,1°')
    expect(escribirGrados(-4.8)).toBe('-4,8°')
  })
})

describe('sumar días', () => {
  it('cruza el cambio de mes y el de año', () => {
    expect(sumarDiaIso('2026-01-31', 1)).toBe('2026-02-01')
    expect(sumarDiaIso('2026-01-01', -1)).toBe('2025-12-31')
    expect(sumarDiaIso('2024-02-28', 1)).toBe('2024-02-29') // bisiesto
  })
})
