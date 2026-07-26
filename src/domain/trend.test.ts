import { describe, expect, it } from 'vitest'
import { MINIMO, UMBRAL_RUIDO_KG_MES, interpretTrend, slopePerMonth } from './trend'
import type { BodyMeasurement, CheckIn, Profile, Session } from './types'

const HOY = '2026-07-26'

const perfil: Profile = {
  name: 'Test',
  goal: 'recomposicion',
  weightKg: 80,
  heightCm: 180,
  equipment: ['peso_corporal', 'mancuernas'],
  maxWeights: { mancuernas: 24 }
}

/** Mediciones espaciadas 14 días hacia atrás desde la última. */
function serie(valores: { peso: number; grasa: number; musculo: number }[]): BodyMeasurement[] {
  return valores.map((v, i) => {
    const d = new Date('2026-07-26T12:00:00')
    d.setDate(d.getDate() - (valores.length - 1 - i) * 14)
    return {
      date: d.toISOString().slice(0, 10),
      weightKg: v.peso,
      fatPercent: (v.grasa / v.peso) * 100,
      musclePercent: (v.musculo / v.peso) * 100
    }
  })
}

function checkInsBuenos(): CheckIn[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date('2026-07-26T12:00:00')
    d.setDate(d.getDate() - i)
    return {
      date: d.toISOString().slice(0, 10),
      sleep: 5,
      lightHygiene: true,
      sunrise: true,
      sunsetYesterday: true,
      sunExposure: true,
      keto: true,
      energy: 5,
      discomfort: 'ninguna',
      wokeHungry: false,
      cravings: false
    } as CheckIn
  })
}

function checkInsMalSueno(): CheckIn[] {
  return checkInsBuenos().map((c) => ({ ...c, sleep: 1, energy: 2 }))
}

function sesiones(cuantas: number): Session[] {
  return Array.from({ length: cuantas }, (_, i) => {
    const d = new Date('2026-07-26T12:00:00')
    d.setDate(d.getDate() - i * 3 - 1)
    return {
      id: `s${i}`,
      date: d.toISOString().slice(0, 10),
      kind: 'fuerza' as const,
      title: 'test',
      exercises: [
        {
          exerciseId: 'flexiones',
          name: 'Flexiones',
          primary: 'pecho' as const,
          plan: { sets: 3, reps: '8-12' },
          done: true
        }
      ],
      completed: true
    }
  })
}

describe('pendiente por mínimos cuadrados', () => {
  it('calcula la pendiente mensual de una recta perfecta', () => {
    // 1 kg cada 30 días.
    const puntos = [
      { day: 0, value: 20 },
      { day: 30, value: 21 },
      { day: 60, value: 22 }
    ]
    expect(slopePerMonth(puntos)).toBeCloseTo(1, 2)
  })

  it('detecta bajadas', () => {
    expect(
      slopePerMonth([
        { day: 0, value: 20 },
        { day: 60, value: 18 }
      ])
    ).toBeCloseTo(-1, 2)
  })

  it('sin puntos suficientes no devuelve pendiente', () => {
    expect(slopePerMonth([{ day: 0, value: 20 }])).toBeUndefined()
  })

  it('una medición rara no arrastra la pendiente', () => {
    // Serie plana con un pico aislado: la pendiente sigue siendo casi cero.
    const conRuido = slopePerMonth([
      { day: 0, value: 20 },
      { day: 14, value: 20 },
      { day: 28, value: 22.5 }, // día de mala hidratación
      { day: 42, value: 20 },
      { day: 56, value: 20 }
    ])!
    expect(Math.abs(conRuido)).toBeLessThan(0.5)
  })
})

describe('no opinar sin datos suficientes', () => {
  it('con una sola medición no dice nada', () => {
    const r = interpretTrend(serie([{ peso: 80, grasa: 16, musculo: 32 }]), perfil, [], [], HOY)
    expect(r.state).toBe('pocos_datos')
    expect(r.sugerencias).toHaveLength(0)
  })

  it(`con menos de ${MINIMO.mediciones} mediciones tampoco`, () => {
    const r = interpretTrend(
      serie([
        { peso: 80, grasa: 18, musculo: 31 },
        { peso: 80, grasa: 16, musculo: 32 }
      ]),
      perfil,
      [],
      [],
      HOY
    )
    expect(r.state).toBe('pocos_datos')
  })

  it('con tres mediciones muy juntas en el tiempo tampoco', () => {
    const cerca: BodyMeasurement[] = ['2026-07-20', '2026-07-23', '2026-07-26'].map((date, i) => ({
      date,
      weightKg: 80,
      fatPercent: 20 - i,
      musclePercent: 40 + i
    }))
    const r = interpretTrend(cerca, perfil, [], [], HOY)
    expect(r.state).toBe('pocos_datos')
    expect(r.mensaje.toLowerCase()).toContain('semanas')
  })

  it('el mensaje normaliza la espera en vez de meter prisa', () => {
    const r = interpretTrend(serie([{ peso: 80, grasa: 16, musculo: 32 }]), perfil, [], [], HOY)
    expect(r.mensaje.toLowerCase()).toMatch(/ni caso|hidrataci|no se puede distinguir/)
  })
})

describe('veredictos', () => {
  const buenos = checkInsBuenos()

  it('grasa abajo y músculo arriba con el peso plano es recomposición', () => {
    const r = interpretTrend(
      serie([
        { peso: 80, grasa: 19, musculo: 31 },
        { peso: 80, grasa: 18, musculo: 31.6 },
        { peso: 80, grasa: 17, musculo: 32.2 },
        { peso: 80, grasa: 16, musculo: 33 }
      ]),
      perfil,
      buenos,
      sesiones(8),
      HOY
    )
    expect(r.state).toBe('recomposicion')
    expect(r.fatSlope!).toBeLessThan(0)
    expect(r.muscleSlope!).toBeGreaterThan(0)
    // Si va bien no hay nada que sugerir: no se toca lo que funciona.
    expect(r.sugerencias).toHaveLength(0)
  })

  it('cambios por debajo del ruido son estancamiento, no progreso', () => {
    const r = interpretTrend(
      serie([
        { peso: 80, grasa: 16.0, musculo: 32.0 },
        { peso: 80, grasa: 15.95, musculo: 32.05 },
        { peso: 80, grasa: 16.05, musculo: 31.95 },
        { peso: 80, grasa: 16.0, musculo: 32.0 }
      ]),
      perfil,
      buenos,
      sesiones(8),
      HOY
    )
    expect(r.state).toBe('estable')
    expect(Math.abs(r.fatSlope!)).toBeLessThan(UMBRAL_RUIDO_KG_MES)
  })

  it('grasa arriba y músculo abajo se dice claro', () => {
    const r = interpretTrend(
      serie([
        { peso: 80, grasa: 15, musculo: 33 },
        { peso: 81, grasa: 16.5, musculo: 32.4 },
        { peso: 82, grasa: 18, musculo: 31.8 },
        { peso: 83, grasa: 19.5, musculo: 31 }
      ]),
      perfil,
      buenos,
      sesiones(8),
      HOY
    )
    expect(r.state).toBe('atencion')
    expect(r.titular.toLowerCase()).toContain('no está yendo bien')
    expect(r.sugerencias.length).toBeGreaterThan(0)
  })

  it('solo grasa abajo ya es buen camino', () => {
    const r = interpretTrend(
      serie([
        { peso: 82, grasa: 19, musculo: 32 },
        { peso: 81, grasa: 18, musculo: 32 },
        { peso: 80, grasa: 17, musculo: 32 },
        { peso: 79, grasa: 16, musculo: 32 }
      ]),
      perfil,
      buenos,
      sesiones(8),
      HOY
    )
    expect(r.state).toBe('progreso')
  })
})

describe('sugerencias: salen de tus datos, no de una lista', () => {
  const estancado = serie([
    { peso: 80, grasa: 16, musculo: 32 },
    { peso: 80, grasa: 16, musculo: 32 },
    { peso: 80, grasa: 16, musculo: 32 },
    { peso: 80, grasa: 16, musculo: 32 }
  ])

  it('si lo que falla es el sueño, la sugerencia habla del sueño', () => {
    const r = interpretTrend(estancado, perfil, checkInsMalSueno(), sesiones(8), HOY)
    expect(r.sugerencias.join(' ').toLowerCase()).toContain('sueño')
  })

  it('si apenas entrenas, la sugerencia habla de consistencia', () => {
    const r = interpretTrend(estancado, perfil, checkInsBuenos(), sesiones(1), HOY)
    expect(r.sugerencias.join(' ').toLowerCase()).toMatch(/sesion|sesión|semana/)
  })

  it('nunca da más de dos cosas a la vez', () => {
    for (const cis of [checkInsBuenos(), checkInsMalSueno(), []]) {
      for (const ss of [sesiones(0), sesiones(1), sesiones(10)]) {
        const r = interpretTrend(estancado, perfil, cis, ss, HOY)
        expect(r.sugerencias.length).toBeLessThanOrEqual(2)
      }
    }
  })

  it('sin perfil ni historial no revienta', () => {
    const r = interpretTrend(estancado, null, [], [], HOY)
    expect(r.state).toBe('estable')
    expect(r.sugerencias.length).toBeLessThanOrEqual(2)
  })
})

describe('nunca habla de calorías', () => {
  const escenarios: BodyMeasurement[][] = [
    serie([
      { peso: 80, grasa: 16, musculo: 32 },
      { peso: 80, grasa: 16, musculo: 32 },
      { peso: 80, grasa: 16, musculo: 32 },
      { peso: 80, grasa: 16, musculo: 32 }
    ]),
    serie([
      { peso: 80, grasa: 15, musculo: 33 },
      { peso: 81, grasa: 17, musculo: 32 },
      { peso: 82, grasa: 19, musculo: 31 },
      { peso: 83, grasa: 20, musculo: 30 }
    ]),
    serie([
      { peso: 80, grasa: 19, musculo: 31 },
      { peso: 80, grasa: 18, musculo: 32 },
      { peso: 80, grasa: 17, musculo: 32.5 },
      { peso: 80, grasa: 16, musculo: 33 }
    ])
  ]

  it('en ningún estado menciona calorías, déficit ni superávit', () => {
    for (const m of escenarios) {
      for (const cis of [checkInsBuenos(), checkInsMalSueno()]) {
        const r = interpretTrend(m, perfil, cis, sesiones(2), HOY)
        const texto = [r.titular, r.mensaje, ...r.sugerencias].join(' ').toLowerCase()
        expect(texto, r.state).not.toMatch(/calor[ií]a|d[eé]ficit|super[aá]vit|kcal/)
      }
    }
  })

  it('tampoco culpabiliza ni habla de rachas', () => {
    for (const m of escenarios) {
      const r = interpretTrend(m, perfil, checkInsMalSueno(), sesiones(1), HOY)
      const texto = [r.titular, r.mensaje, ...r.sugerencias].join(' ').toLowerCase()
      expect(texto).not.toMatch(/culpa|fracas|racha|vago|excusa/)
    }
  })
})
