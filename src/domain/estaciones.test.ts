import { describe, expect, it } from 'vitest'
import {
  COSTES,
  MESES_CORTOS,
  calloSolar,
  diasEntre,
  distanciaDeMeses,
  estacionRobada,
  higieneDeNoche,
  oscuridadDelAno,
  rachaDeSol,
  skygazing,
  solsticioAnterior
} from './estaciones'
import type { CheckIn, SalidaAlExterior } from './types'

const MADRID = { lat: 40.4165, lon: -3.7026 }
const SIDNEY = { lat: -33.8688, lon: 151.2093 }
const TROMSO = { lat: 69.6496, lon: 18.956 }

const salida = (date: string, minutos = 20): SalidaAlExterior => ({
  id: `s${date}`,
  date,
  desde: 13 * 60,
  minutos,
  filtro: 'ninguno'
})

describe('la oscuridad de los doce meses', () => {
  it('da los doce, con su nombre', () => {
    const meses = oscuridadDelAno(2026, MADRID)
    expect(meses).toHaveLength(12)
    expect(meses.map((m) => m.nombre)).toEqual(MESES_CORTOS)
  })

  it('en el norte, la noche más larga cae en diciembre y la más corta en junio', () => {
    const meses = oscuridadDelAno(2026, MADRID)
    const masLarga = meses.reduce((a, b) => (b.tocaba > a.tocaba ? b : a))
    const masCorta = meses.reduce((a, b) => (b.tocaba < a.tocaba ? b : a))
    expect(masLarga.mes).toBe(12)
    expect(masCorta.mes).toBe(6)
  })

  it('y en el sur, al revés: es media Tierra y no se puede dar por hecho el norte', () => {
    const meses = oscuridadDelAno(2026, SIDNEY)
    const masLarga = meses.reduce((a, b) => (b.tocaba > a.tocaba ? b : a))
    expect(masLarga.mes).toBe(6)
  })

  it('la diferencia entre invierno y verano en Madrid pasa de cinco horas', () => {
    const meses = oscuridadDelAno(2026, MADRID)
    const dic = meses[11].tocaba
    const jun = meses[5].tocaba
    expect(dic - jun).toBeGreaterThan(5 * 60)
  })
})

describe('la estación robada', () => {
  it('ocho horas de oscuridad en enero se viven como verano', () => {
    // Este es el caso que da nombre a la pantalla entera.
    const e = estacionRobada('2026-01-15', MADRID, 8 * 60 + 5)
    expect(e.tuviste).toBe(485)
    expect(e.robada).toBe(true)
    expect(e.vividoComo).toBeGreaterThanOrEqual(5)
    expect(e.vividoComo).toBeLessThanOrEqual(8)
  })

  it('dormir lo que toca en enero no roba nada', () => {
    const tocaba = estacionRobada('2026-01-15', MADRID).tocaba
    const e = estacionRobada('2026-01-15', MADRID, tocaba)
    expect(e.robada).toBe(false)
    expect(e.vividoComo).toBe(1)
  })

  it('sin dato de oscuridad no se inventa una estación', () => {
    const e = estacionRobada('2026-01-15', MADRID)
    expect(e.tuviste).toBeUndefined()
    expect(e.vividoComo).toBeUndefined()
    expect(e.robada).toBe(false)
    expect(e.tocaba).toBeGreaterThan(0)
  })

  it('diciembre y enero son vecinos, no dos meses de distancia', () => {
    // Sin la distancia circular, un desfase de un mes entre dic y ene se
    // contaría como once, y marcaría como robada una noche perfecta.
    expect(distanciaDeMeses(12, 1)).toBe(1)
    expect(distanciaDeMeses(1, 12)).toBe(1)
    expect(distanciaDeMeses(1, 7)).toBe(6)
    expect(distanciaDeMeses(3, 3)).toBe(0)
  })

  it('un mes de desfase es ruido y no se marca', () => {
    const feb = estacionRobada('2026-02-15', MADRID).tocaba
    expect(estacionRobada('2026-01-15', MADRID, feb).robada).toBe(false)
  })
})

describe('el callo solar', () => {
  it('se ancla al solsticio de invierno, no al 1 de enero', () => {
    expect(solsticioAnterior('2026-03-21', MADRID)).toBe('2025-12-21')
    expect(solsticioAnterior('2026-12-25', MADRID)).toBe('2026-12-21')
  })

  it('y en el hemisferio sur el invierno es en junio', () => {
    expect(solsticioAnterior('2026-08-01', SIDNEY)).toBe('2026-06-21')
    expect(solsticioAnterior('2026-03-01', SIDNEY)).toBe('2025-06-21')
  })

  it('pasa por sus cuatro fases según avanza el año', () => {
    expect(calloSolar('2026-01-10', MADRID, []).fase).toBe('invierno')
    expect(calloSolar('2026-02-20', MADRID, []).fase).toBe('despertar')
    expect(calloSolar('2026-04-20', MADRID, []).fase).toBe('construir')
    expect(calloSolar('2026-06-21', MADRID, []).fase).toBe('almacenar')
  })

  it('cuenta los días con sol de verdad, no los del calendario', () => {
    const c = calloSolar('2026-03-21', MADRID, [
      salida('2026-01-10'),
      salida('2026-02-14'),
      salida('2026-03-01')
    ])
    expect(c.diasDesdeSolsticio).toBe(90)
    expect(c.diasConSol).toBe(3)
  })

  it('no cuenta dos veces el mismo día aunque se saliera dos ratos', () => {
    const c = calloSolar('2026-03-21', MADRID, [
      { ...salida('2026-02-14'), id: 'a' },
      { ...salida('2026-02-14'), id: 'b' }
    ])
    expect(c.diasConSol).toBe(1)
  })

  it('ignora lo anterior al solsticio', () => {
    const c = calloSolar('2026-03-21', MADRID, [salida('2025-11-01'), salida('2026-01-05')])
    expect(c.diasConSol).toBe(1)
  })

  it('cada fase dice qué significa, sin dar permiso para tostarse', () => {
    for (const fecha of ['2026-01-10', '2026-02-20', '2026-04-20', '2026-06-21']) {
      const c = calloSolar(fecha, MADRID, [])
      expect(c.queSignifica.length).toBeGreaterThan(20)
    }
    expect(calloSolar('2026-06-21', MADRID, []).queSignifica).toContain('quema')
  })
})

describe('los días entre fechas', () => {
  it('cuenta bien cruzando meses y años', () => {
    expect(diasEntre('2025-12-21', '2026-03-21')).toBe(90)
    expect(diasEntre('2026-01-31', '2026-02-01')).toBe(1)
    expect(diasEntre('2024-02-28', '2024-03-01')).toBe(2) // bisiesto
  })
})

describe('la higiene de la noche', () => {
  it('dice cuánta oscuridad toca hoy en tu latitud', () => {
    const h = higieneDeNoche('2026-01-15', MADRID, [])
    expect(h.nocheQueToca).toBeGreaterThan(13 * 60)
    expect(h.ocaso).not.toBeNull()
  })

  it('trae los costes en minutos, que es la unidad de la amplitud', () => {
    const h = higieneDeNoche('2026-03-21', MADRID, [])
    expect(h.costes.length).toBeGreaterThan(3)
    for (const c of h.costes) {
      expect(c.cuesta).toBeGreaterThan(0)
      expect(c.que.length).toBeGreaterThan(5)
    }
  })

  it('casi todos traen una alternativa barata, no solo el reproche', () => {
    const conAlternativa = COSTES.filter((c) => c.enVezDe).length
    expect(conAlternativa).toBe(COSTES.length)
  })

  it('cada uno dice también lo que cuesta con las gafas puestas', () => {
    // La primera columna sola es una lista de reproches: en enero, apagarlo
    // todo al ocaso es no hacer nada desde las seis de la tarde.
    for (const c of COSTES) {
      expect(c.conGafas).toBeGreaterThanOrEqual(0)
      expect(c.conGafas).toBeLessThanOrEqual(c.cuesta)
    }
  })

  it('y ninguno baja a cero: siempre queda algo, y se dice qué', () => {
    for (const c of COSTES) {
      expect(c.conGafas).toBeGreaterThan(0)
      expect(c.loQueQueda.length).toBeGreaterThan(20)
    }
  })

  it('hay al menos uno que las gafas no arreglan en absoluto', () => {
    /*
     * Es la regla de la casa: una herramienta que tenga un remedio para todo
     * está mintiendo en algo. Dormir con luz de la calle entrando no lo tapan,
     * porque a esa hora las gafas están en la mesilla y no en tu cara.
     */
    const sinRemedio = COSTES.filter((c) => c.conGafas === c.cuesta)
    expect(sinRemedio.length).toBeGreaterThanOrEqual(1)
  })

  it('el móvil baja menos que la luz del techo, y no es un descuido', () => {
    // El techo es luz y nada más; el móvil engancha por lo que sale en él, y
    // eso no lo apaga ningún filtro.
    const techo = COSTES.find((c) => c.id === 'techo')!
    const movil = COSTES.find((c) => c.id === 'movil')!
    expect(movil.conGafas / movil.cuesta).toBeGreaterThan(techo.conGafas / techo.cuesta)
  })

  it('recoge lo declarado en el test de la mañana, si se declaró', () => {
    const checkIns = [{ date: '2026-03-21', lightHygiene: true }] as unknown as CheckIn[]
    expect(higieneDeNoche('2026-03-21', MADRID, checkIns).cuidada).toBe(true)
    expect(higieneDeNoche('2026-03-21', MADRID, []).cuidada).toBeUndefined()
  })
})

describe('el skygazing', () => {
  it('da la ventana del atardecer: del ocaso al fin del crepúsculo civil', () => {
    const s = skygazing('2026-03-21', MADRID)
    expect(s.hayVentana).toBe(true)
    expect(s.desde!).toBeLessThan(s.hasta!)
    // Dura poco: media hora larga en Madrid.
    expect(s.hasta! - s.desde!).toBeLessThan(60)
  })

  it('y la del amanecer, que es su espejo', () => {
    const s = skygazing('2026-03-21', MADRID)
    expect(s.amanecerDesde!).toBeLessThan(s.amanecerHasta!)
  })

  it('donde no se pone el sol, no hay ventana que ofrecer', () => {
    expect(skygazing('2026-06-21', TROMSO).hayVentana).toBe(false)
  })
})

describe('la racha de días con sol', () => {
  it('cuenta los días seguidos hacia atrás', () => {
    const salidas = ['2026-03-21', '2026-03-20', '2026-03-19'].map((d) => salida(d))
    expect(rachaDeSol('2026-03-21', salidas)).toBe(3)
  })

  it('un día sin salir la corta', () => {
    const salidas = ['2026-03-21', '2026-03-19'].map((d) => salida(d))
    expect(rachaDeSol('2026-03-21', salidas)).toBe(1)
  })

  it('una salida de cero minutos no cuenta como haber salido', () => {
    expect(rachaDeSol('2026-03-21', [salida('2026-03-21', 0)])).toBe(0)
  })

  it('sin nada apuntado, cero y sin reventar', () => {
    expect(rachaDeSol('2026-03-21', undefined)).toBe(0)
  })
})
