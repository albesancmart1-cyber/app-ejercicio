import { describe, expect, it } from 'vitest'
import {
  TECHO_GRASA_DIA_G,
  escribirGramos,
  explicarPeso,
  factoresDeHoy,
  pendienteSemanalG
} from './explicacionPeso'
import type { BodyMeasurement, CheckIn, Session } from './types'

const HOY = '2026-08-19'

function menos(dias: number): string {
  const d = new Date(`${HOY}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - dias)
  return d.toISOString().slice(0, 10)
}

function checkin(dias: number, extra: Partial<CheckIn> = {}): CheckIn {
  return {
    date: menos(dias),
    sleep: 4,
    lightHygiene: true,
    sunrise: true,
    sunsetYesterday: true,
    sunExposure: true,
    keto: true,
    energy: 4,
    discomfort: 'ninguna',
    ...extra
  }
}

function bascula(dias: number, kg: number, extra: Partial<BodyMeasurement> = {}): BodyMeasurement {
  return { date: menos(dias), weightKg: kg, ...extra }
}

/** Una sesión de ayer con carga de verdad: 4 ejercicios × 4 series a RIR 2. */
function sesionDura(dias: number): Session {
  const ej = (id: string) => ({
    exerciseId: id,
    name: id,
    primary: 'pecho' as const,
    plan: { sets: 4, reps: '8-12', rir: 2, restSeconds: 120 },
    done: true,
    logs: Array.from({ length: 4 }, () => ({ done: true, reps: 10, weightKg: 40, rir: 2 }))
  })
  return {
    id: `s${dias}`,
    date: menos(dias),
    kind: 'fuerza',
    title: 'Fuerza',
    completed: true,
    exercises: [ej('a'), ej('b'), ej('c'), ej('d')]
  }
}

describe('los factores del día', () => {
  it('salir de cetosis es el factor más grande y se ordena primero', () => {
    const f = factoresDeHoy([checkin(0, { keto: false, comidaSalada: true }), checkin(1, { keto: true })], [], HOY)
    expect(f[0].id).toBe('glucogeno-entra')
    expect(f.some((x) => x.id === 'sal')).toBe(true)
  })

  it('volver a cetosis explica una bajada rápida', () => {
    const f = factoresDeHoy([checkin(0, { keto: true }), checkin(1, { keto: false })], [], HOY)
    expect(f[0].id).toBe('glucogeno-sale')
    expect(f[0].minG).toBeLessThan(0)
  })

  it('seguir en cetosis no dispara el factor del glucógeno', () => {
    const f = factoresDeHoy([checkin(0), checkin(1)], [], HOY)
    expect(f.some((x) => x.id.startsWith('glucogeno'))).toBe(false)
  })

  it('el entreno duro de ayer cuenta; un día sin entrenar, no', () => {
    expect(factoresDeHoy([checkin(0)], [sesionDura(1)], HOY).some((x) => x.id === 'entreno-duro')).toBe(true)
    expect(factoresDeHoy([checkin(0)], [sesionDura(3)], HOY).some((x) => x.id === 'entreno-duro')).toBe(false)
  })

  it('mal sueño o estrés alto activan el cortisol; los dos a la vez, una sola vez', () => {
    expect(factoresDeHoy([checkin(0, { sleep: 2 })], [], HOY).filter((x) => x.id === 'cortisol')).toHaveLength(1)
    expect(factoresDeHoy([checkin(0, { estres: 4 })], [], HOY).filter((x) => x.id === 'cortisol')).toHaveLength(1)
    expect(
      factoresDeHoy([checkin(0, { sleep: 1, estres: 5 })], [], HOY).filter((x) => x.id === 'cortisol')
    ).toHaveLength(1)
  })

  it('sin contestar no se inventa: un check-in sin las preguntas nuevas da lo suyo y nada más', () => {
    expect(factoresDeHoy([checkin(0)], [], HOY)).toEqual([])
  })
})

describe('la explicación', () => {
  it('sin báscula hoy no hay tarjeta', () => {
    expect(explicarPeso({ measurements: [bascula(1, 80)], checkIns: [], sessions: [] }, HOY)).toBeNull()
  })

  it('la primera báscula pide compañía en vez de inventar', () => {
    const e = explicarPeso({ measurements: [bascula(0, 80)], checkIns: [], sessions: [] }, HOY)!
    expect(e.deltaG).toBeUndefined()
    expect(e.faltan).toMatch(/días seguidos/)
  })

  it('una subida grande con causa la nombra y ancla que no es grasa', () => {
    const e = explicarPeso(
      {
        measurements: [bascula(1, 80), bascula(0, 81.2)],
        checkIns: [checkin(0, { keto: false }), checkin(1, { keto: true })],
        sessions: []
      },
      HOY
    )!
    expect(e.deltaG).toBe(1200)
    expect(e.veredicto).toMatch(/cetosis/i)
    expect(e.veredicto).toMatch(/agua por definición/)
    expect(e.veredicto).not.toMatch(/calor/i)
  })

  it('una subida sin causas apuntadas lo reconoce en vez de culparte', () => {
    const e = explicarPeso(
      { measurements: [bascula(1, 80), bascula(0, 80.5)], checkIns: [checkin(0), checkin(1)], sessions: [] },
      HOY
    )!
    expect(e.veredicto).toMatch(/[Nn]inguna de las causas habituales/)
  })

  it('una bajada rápida no se celebra entera: por encima del techo es agua', () => {
    const e = explicarPeso(
      {
        measurements: [bascula(1, 81.5), bascula(0, 80)],
        checkIns: [checkin(0, { keto: true }), checkin(1, { keto: false })],
        sessions: []
      },
      HOY
    )!
    expect(e.deltaG).toBe(-1500)
    expect(e.veredicto).toMatch(/agua/)
    expect(e.veredicto).toMatch(new RegExp(`${TECHO_GRASA_DIA_G} g`))
  })

  it('entrenar fuerte ayer explica la subida de hoy como reparación', () => {
    const e = explicarPeso(
      {
        measurements: [bascula(1, 80), bascula(0, 80.4)],
        checkIns: [checkin(0), checkin(1)],
        sessions: [sesionDura(1)]
      },
      HOY
    )!
    expect(e.veredicto).toMatch(/repara/)
  })

  it('plano con composición mejorando es recomposición, no estancamiento', () => {
    const basculas = Array.from({ length: 12 }, (_, i) =>
      bascula(i, 80, { fatPercent: 18 + i * 0.1, musclePercent: 41 - i * 0.05 })
    )
    const e = explicarPeso({ measurements: basculas, checkIns: [checkin(0)], sessions: [] }, HOY)!
    expect(e.veredicto).toMatch(/recomposición/)
  })

  it('plano sin composición dice qué le falta para distinguir', () => {
    const basculas = Array.from({ length: 12 }, (_, i) => bascula(i, 80))
    const e = explicarPeso({ measurements: basculas, checkIns: [checkin(0)], sessions: [] }, HOY)!
    expect(e.faltan).toMatch(/grasa/)
  })

  it('una referencia de hace muchos días no se lee como día a día', () => {
    const e = explicarPeso(
      { measurements: [bascula(9, 80), bascula(0, 80.8)], checkIns: [checkin(0)], sessions: [] },
      HOY
    )!
    expect(e.diasDesdeAnterior).toBe(9)
    expect(e.faltan).toMatch(/seguidos/)
  })

  it('nunca habla de calorías', () => {
    const casos = [
      explicarPeso(
        {
          measurements: [bascula(1, 80), bascula(0, 81.5)],
          checkIns: [checkin(0, { keto: false, comidaSalada: true, alcohol: true, cenaTarde: true, sleep: 1, transito: false }), checkin(1)],
          sessions: [sesionDura(1)]
        },
        HOY
      ),
      explicarPeso({ measurements: [bascula(1, 81), bascula(0, 80)], checkIns: [checkin(0)], sessions: [] }, HOY)
    ]
    for (const e of casos) {
      expect(e!.veredicto).not.toMatch(/calor[ií]a|kcal|déficit|superávit/i)
      for (const f of e!.factores) expect(f.texto).not.toMatch(/calor[ií]a|kcal|déficit|superávit/i)
    }
  })
})

describe('la tendencia', () => {
  it('con menos de cuatro básculas no hay pendiente', () => {
    expect(pendienteSemanalG([bascula(0, 80), bascula(3, 80.4), bascula(6, 80.8)], HOY)).toBeUndefined()
  })

  it('una bajada sostenida sale en g/semana negativos', () => {
    const basculas = Array.from({ length: 14 }, (_, i) => bascula(i, 80 + i * 0.04))
    const p = pendienteSemanalG(basculas, HOY)!
    expect(p).toBeLessThan(-200)
    expect(p).toBeGreaterThan(-360)
  })

  it('el ruido diario alrededor de una media plana da tendencia plana', () => {
    const basculas = Array.from({ length: 14 }, (_, i) => bascula(i, 80 + (i % 2 === 0 ? 0.3 : -0.3)))
    expect(Math.abs(pendienteSemanalG(basculas, HOY)!)).toBeLessThan(120)
  })
})

describe('cómo se escriben los gramos', () => {
  it('gramos hasta el kilo, kilos con coma después', () => {
    expect(escribirGramos(400)).toBe('+400 g')
    expect(escribirGramos(-250)).toBe('−250 g')
    expect(escribirGramos(1200)).toBe('+1,2 kg')
    expect(escribirGramos(-1500)).toBe('−1,5 kg')
    expect(escribirGramos(0)).toBe('0 g')
  })

  it('redondea a 50 g: la báscula de casa no da más', () => {
    expect(escribirGramos(430)).toBe('+450 g')
    expect(escribirGramos(-380)).toBe('−400 g')
  })
})

describe('el diario de comidas manda sobre el test', () => {
  const diario = (etiquetas: import('./types').EtiquetaComida[], hora = '22:30') => [
    { date: menos(1), comidas: [{ hora, texto: 'cena', etiquetas }] }
  ]

  it('un carbohidrato apuntado ayer activa el glucógeno sin preguntar nada', () => {
    const f = factoresDeHoy(
      [checkin(0), checkin(1, { keto: true })],
      [],
      HOY,
      diario(['carbohidrato'])
    )
    expect(f.some((x) => x.id === 'glucogeno-entra')).toBe(true)
  })

  it('la sal y el alcohol del diario cuentan aunque el test no se contestara', () => {
    const f = factoresDeHoy([checkin(0)], [], HOY, diario(['salada', 'alcohol'], '14:00'))
    expect(f.some((x) => x.id === 'sal')).toBe(true)
    expect(f.some((x) => x.id === 'alcohol')).toBe(true)
  })

  it('una cena a las 22:30 del diario es cena tardía sin preguntarlo', () => {
    const f = factoresDeHoy([checkin(0)], [], HOY, diario([]))
    expect(f.some((x) => x.id === 'cena-tarde')).toBe(true)
  })

  it('el diario dice «sin carbohidrato» y gana al recuerdo del test', () => {
    // El test de hoy dice que se salió de cetosis, pero el diario de ayer no
    // tiene ni un carbohidrato: manda lo apuntado al comer.
    const f = factoresDeHoy(
      [checkin(0, { keto: false }), checkin(1, { keto: true })],
      [],
      HOY,
      diario([], '14:00')
    )
    expect(f.some((x) => x.id === 'glucogeno-entra')).toBe(false)
  })
})

describe('el diario por alimentos también alimenta al motor', () => {
  // El formato nuevo: la comida sin etiquetas propias, y cada alimento con las
  // suyas. Es la cadena completa que le importa al usuario: apuntar el arroz
  // dentro de la cena y que la báscula de mañana se explique sola.
  const cenaConArroz: import('./types').DiaDeComidas[] = [
    {
      date: menos(1),
      comidas: [
        {
          hora: '21:00',
          texto: '',
          alimentos: [
            { nombre: 'Pollo', gramos: 250, etiquetas: ['proteina'] },
            { nombre: 'Arroz', gramos: 80, etiquetas: ['carbohidrato'] }
          ]
        }
      ]
    }
  ]

  it('un carbohidrato en un alimento de ayer activa el glucógeno', () => {
    const f = factoresDeHoy([checkin(0), checkin(1, { keto: true })], [], HOY, cenaConArroz)
    expect(f.some((x) => x.id === 'glucogeno-entra')).toBe(true)
  })

  it('la sal y el alcohol de un alimento cuentan igual que los de la comida', () => {
    const diario: import('./types').DiaDeComidas[] = [
      {
        date: menos(1),
        comidas: [
          {
            hora: '14:00',
            texto: '',
            alimentos: [
              { nombre: 'Jamón', gramos: 100, etiquetas: ['salada'] },
              { nombre: 'Vino', etiquetas: ['alcohol'] }
            ]
          }
        ]
      }
    ]
    const f = factoresDeHoy([checkin(0)], [], HOY, diario)
    expect(f.some((x) => x.id === 'sal')).toBe(true)
    expect(f.some((x) => x.id === 'alcohol')).toBe(true)
  })

  it('la explicación entera, de la báscula al veredicto, con el formato nuevo', () => {
    const e = explicarPeso(
      {
        measurements: [bascula(1, 80), bascula(0, 81.2)],
        checkIns: [checkin(0), checkin(1, { keto: true })],
        sessions: [],
        comidas: cenaConArroz
      },
      HOY
    )!
    expect(e.deltaG).toBe(1200)
    expect(e.veredicto).toMatch(/glucógeno|cetosis/i)
    expect(e.veredicto).toMatch(/agua/)
  })

  it('un día por alimentos sin carbohidrato mantiene la cetosis y no inventa subidas', () => {
    const sinCarbo: import('./types').DiaDeComidas[] = [
      {
        date: menos(1),
        comidas: [
          { hora: '14:00', texto: '', alimentos: [{ nombre: 'Pollo', gramos: 300, etiquetas: ['proteina'] }] }
        ]
      }
    ]
    const f = factoresDeHoy([checkin(0), checkin(1, { keto: true })], [], HOY, sinCarbo)
    expect(f.some((x) => x.id === 'glucogeno-entra')).toBe(false)
  })
})

/* ══════════════════════════════════════════════════ LA LUZ EN EL PESO ══ */

describe('la luz entra en la explicación del peso', () => {
  const MADRID = { lat: 40.4165, lon: -3.7026 }
  const tz = () => 60
  const salida = (fecha: string, desde: number) => ({
    id: `s${fecha}${desde}`,
    date: fecha,
    desde,
    minutos: 20,
    filtro: 'ninguno' as const
  })
  const comiendo = (fecha: string, hora: string) => ({
    date: fecha,
    comidas: [{ hora, texto: 'algo' }]
  })
  /** Cinco días seguidos comiendo a las 07:10 y sin pisar la calle hasta las 10. */
  const DIAS = ['2026-03-20', '2026-03-19', '2026-03-18', '2026-03-17', '2026-03-16']
  const luz = {
    coord: MADRID,
    salidas: DIAS.map((d) => salida(d, 10 * 60)),
    desfasePara: tz
  }
  const comidas = DIAS.map((d) => comiendo(d, '07:10'))

  it('sin coordenadas, la explicación es la de siempre y no falta nada', () => {
    const sinLuz = factoresDeHoy([], [], '2026-03-21', comidas, undefined)
    expect(sinLuz.some((f) => f.id === 'relojes-desincronizados')).toBe(false)
    expect(sinLuz.some((f) => f.id === 'sin-pulso-manana')).toBe(false)
  })

  it('con ellas, cuatro días comiendo antes de ver luz salen como factor', () => {
    const f = factoresDeHoy([], [], '2026-03-21', comidas, undefined, luz)
    const relojes = f.find((x) => x.id === 'relojes-desincronizados')
    expect(relojes).toBeDefined()
    expect(relojes!.texto).toContain('días comiendo')
    expect(relojes!.texto).toContain('antes de ver luz')
  })

  it('y se dice que eso no es agua, porque no se va solo mañana', () => {
    const f = factoresDeHoy([], [], '2026-03-21', comidas, undefined, luz)
    expect(f.find((x) => x.id === 'relojes-desincronizados')!.texto).toContain('no se va solo')
  })

  it('un solo día no basta para señalar a nadie', () => {
    const unDia = { coord: MADRID, salidas: [salida('2026-03-20', 10 * 60)], desfasePara: tz }
    const f = factoresDeHoy([], [], '2026-03-21', [comiendo('2026-03-20', '07:10')], undefined, unDia)
    expect(f.some((x) => x.id === 'relojes-desincronizados')).toBe(false)
  })

  it('no haber salido por la mañana también cuenta, y dice cuánto atrasa', () => {
    const f = factoresDeHoy([], [], '2026-03-21', comidas, undefined, luz)
    const pulso = f.find((x) => x.id === 'sin-pulso-manana')
    expect(pulso).toBeDefined()
    expect(pulso!.texto).toContain('doce minutos')
  })

  it('pero salir al amanecer lo quita', () => {
    const conAmanecer = {
      coord: MADRID,
      salidas: [salida('2026-03-20', 7 * 60 + 20)],
      desfasePara: tz
    }
    const f = factoresDeHoy([], [], '2026-03-21', comidas, undefined, conAmanecer)
    expect(f.some((x) => x.id === 'sin-pulso-manana')).toBe(false)
  })

  it('la noche corta se cuenta contra la que tocaba en tu latitud', () => {
    const checkIns = [
      { date: '2026-03-20', sleep: 3, energy: 3, soreness: [], lightHygiene: false } as never
    ]
    const f = factoresDeHoy(checkIns, [], '2026-03-21', comidas, undefined, luz)
    const noche = f.find((x) => x.id === 'noche-corta')
    expect(noche).toBeDefined()
    expect(noche!.texto).toContain('en tu latitud')
  })

  it('y ninguno de los factores de luz habla de calorías', () => {
    const f = factoresDeHoy([], [], '2026-03-21', comidas, undefined, luz)
    for (const x of f) expect(x.texto.toLowerCase()).not.toContain('calor')
  })
})
