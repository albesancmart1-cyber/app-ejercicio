import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../data/exercises'
import { CONTRIBUTIONS, MUSCULOS_SIN_COBERTURA, contributionsOf } from '../data/contributions'
import { ALL_MUSCLES, MUSCLES, REGIONS, musclesOf } from './muscles'
import type { Muscle } from './muscles'
import {
  RIR_EFECTIVO,
  desglosePorMusculo,
  formatSeries,
  impactoDeAnadir,
  seriesEfectivas,
  volumenDe,
  volumenPorRegion,
  weeklyMuscleVolume,
  zonaDe
} from './volume'
import { MAV_TOPE_DEFICIT, allLandmarks, landmarksFor, sanearOverride } from './landmarks'
import type { PlannedExercise, Session, SetLog } from './types'

const HOY = '2026-07-27'

/** Un ejercicio registrado con N series hechas. */
function hecho(
  exerciseId: string,
  series: number,
  opts: { rir?: number; warmups?: number; done?: boolean } = {}
): PlannedExercise {
  const logs: SetLog[] = [
    ...Array.from({ length: opts.warmups ?? 0 }, () => ({ done: true, warmup: true })),
    ...Array.from({ length: series }, () => ({ done: opts.done ?? true }))
  ]
  return {
    exerciseId,
    name: exerciseId,
    primary: 'pecho',
    plan: { sets: series, reps: '8-12', rir: opts.rir ?? 2 },
    logs
  }
}

function sesion(date: string, exercises: PlannedExercise[]): Session {
  return { id: date, date, kind: 'fuerza', title: 't', completed: true, exercises }
}

// ── El mapa de contribuciones ─────────────────────────────

describe('el catálogo entero tiene mapa muscular', () => {
  const fuerza = EXERCISES.filter((e) => e.primary !== 'cardio')

  it('ningún ejercicio de fuerza se queda sin contribuciones', () => {
    const sinMapa = fuerza.filter((e) => Object.keys(contributionsOf(e.id)).length === 0)
    expect(sinMapa.map((e) => e.id)).toEqual([])
  })

  it('el cardio no aporta series a ningún músculo', () => {
    for (const e of EXERCISES.filter((x) => x.primary === 'cardio')) {
      expect(contributionsOf(e.id), e.id).toEqual({})
    }
  })

  it('todos los músculos citados existen y los factores son 1 o 0,5', () => {
    const validos = new Set<string>(ALL_MUSCLES)
    for (const [id, aporte] of Object.entries(CONTRIBUTIONS)) {
      for (const [m, f] of Object.entries(aporte)) {
        expect(validos.has(m), `${id} cita ${m}`).toBe(true)
        expect([1, 0.5], `${id} → ${m}`).toContain(f)
      }
    }
  })

  it('no hay mapas para ejercicios que no existen', () => {
    const ids = new Set(EXERCISES.map((e) => e.id))
    const huerfanos = Object.keys(CONTRIBUTIONS).filter((id) => !ids.has(id))
    expect(huerfanos).toEqual([])
  })

  it('cada ejercicio tiene al menos un motor primario', () => {
    for (const [id, aporte] of Object.entries(CONTRIBUTIONS)) {
      expect(Object.values(aporte), id).toContain(1)
    }
  })

  it('todo músculo con landmarks tiene ejercicios, salvo la carencia conocida', () => {
    const conEjercicios = new Set<string>()
    for (const aporte of Object.values(CONTRIBUTIONS)) {
      for (const m of Object.keys(aporte)) conEjercicios.add(m)
    }
    const sin = ALL_MUSCLES.filter((m) => !conEjercicios.has(m))
    // Si esto falla es que se ha añadido un músculo sin ejercicios, o que ya se
    // han añadido los de gemelo y toca actualizar la constante.
    expect(sin.sort()).toEqual([...MUSCULOS_SIN_COBERTURA].sort())
  })
})

// ── Los ejemplos de mapeo obligatorios ────────────────────

describe('los mapeos de referencia', () => {
  const casos: [string, Record<string, number>][] = [
    ['press_banca_barra', { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 }],
    ['press_banca_mancuernas', { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 }],
    ['press_militar_barra', { deltoides_anterior: 1, triceps_braquial: 0.5, deltoides_lateral: 0.5 }],
    ['dominadas', { dorsal_ancho: 1, biceps_braquial: 0.5, espalda_alta: 0.5 }],
    ['remo_barra', { espalda_alta: 1, dorsal_ancho: 1, biceps_braquial: 0.5 }],
    ['sentadilla_barra', { cuadriceps: 1, gluteo: 0.5, aductores: 0.5, erectores_espinales: 0.5 }],
    ['peso_muerto_rumano', { isquiosurales: 1, gluteo: 1, erectores_espinales: 0.5 }],
    ['curl_biceps', { biceps_braquial: 1 }],
    ['extension_triceps', { triceps_braquial: 1 }],
    ['elevaciones_laterales', { deltoides_lateral: 1 }]
  ]

  for (const [id, esperado] of casos) {
    it(`${id} mapea como manda la referencia`, () => {
      expect(contributionsOf(id)).toEqual(esperado)
    })
  }
})

// ── Series efectivas ──────────────────────────────────────

describe('qué serie cuenta y cuál no', () => {
  it('cuenta las hechas', () => {
    expect(seriesEfectivas(hecho('curl_biceps', 4))).toBe(4)
  })

  it('las planificadas y no marcadas no cuentan', () => {
    expect(seriesEfectivas(hecho('curl_biceps', 4, { done: false }))).toBe(0)
  })

  it('los calentamientos se excluyen', () => {
    expect(seriesEfectivas(hecho('curl_biceps', 3, { warmups: 2 }))).toBe(3)
  })

  it(`por encima de ${RIR_EFECTIVO} repeticiones en reserva no cuenta`, () => {
    expect(seriesEfectivas(hecho('curl_biceps', 4, { rir: RIR_EFECTIVO }))).toBe(4)
    expect(seriesEfectivas(hecho('curl_biceps', 4, { rir: RIR_EFECTIVO + 1 }))).toBe(0)
  })

  it('un registro antiguo sin series se cuenta por el ejercicio completado', () => {
    const viejo: PlannedExercise = {
      exerciseId: 'curl_biceps',
      name: 'Curl',
      primary: 'brazo',
      plan: { sets: 3, reps: '8-12', rir: 2 },
      done: true
    }
    expect(seriesEfectivas(viejo)).toBe(3)
    expect(seriesEfectivas({ ...viejo, done: false })).toBe(0)
  })
})

// ── El conteo fraccional ──────────────────────────────────

describe('conteo fraccional de volumen', () => {
  it('las directas cuentan enteras y las indirectas la mitad', () => {
    // 4 series de press de banca: 4 al pectoral, 2 al tríceps y 2 al deltoides.
    expect(volumenDe(hecho('press_banca_barra', 4))).toEqual({
      pectoral_mayor: 4,
      triceps_braquial: 2,
      deltoides_anterior: 2
    })
  })

  it('un ejercicio con dos motores primarios los cuenta enteros a los dos', () => {
    expect(volumenDe(hecho('remo_barra', 3))).toEqual({
      espalda_alta: 3,
      dorsal_ancho: 3,
      biceps_braquial: 1.5
    })
  })

  it('suma la semana entera y deja fuera lo anterior', () => {
    const sesiones = [
      sesion('2026-07-26', [hecho('press_banca_barra', 3)]),
      sesion('2026-07-23', [hecho('flexiones', 3)]),
      // Justo fuera de la ventana de siete días.
      sesion('2026-07-19', [hecho('press_banca_barra', 10)])
    ]
    const v = weeklyMuscleVolume(sesiones, HOY)
    expect(v.pectoral_mayor).toBe(6)
    expect(v.triceps_braquial).toBe(3)
  })

  it('el tríceps ya no se confunde con el bíceps', () => {
    // El fallo que motivó todo esto: antes las dos series eran «brazo».
    const v = weeklyMuscleVolume([sesion(HOY, [hecho('extension_triceps', 6)])], HOY)
    expect(v.triceps_braquial).toBe(6)
    expect(v.biceps_braquial).toBe(0)
  })

  it('las sesiones sin completar no suman', () => {
    const s = { ...sesion(HOY, [hecho('curl_biceps', 4)]), completed: false }
    expect(weeklyMuscleVolume([s], HOY).biceps_braquial).toBe(0)
  })

  it('el cardio no aporta volumen a ningún músculo', () => {
    const bici: PlannedExercise = {
      exerciseId: 'bici_media',
      name: 'Bici',
      primary: 'cardio',
      plan: { sets: 1, reps: '30 min' },
      logs: [{ done: true }]
    }
    const v = weeklyMuscleVolume([sesion(HOY, [bici])], HOY)
    expect(ALL_MUSCLES.every((m) => v[m] === 0)).toBe(true)
  })

  it('la suma sale limpia aunque se acumulen medias series', () => {
    const sesiones = Array.from({ length: 3 }, (_, i) =>
      sesion(`2026-07-2${5 + i}`, [hecho('press_banca_barra', 3)])
    )
    // 3 sesiones × 3 series × 0,5 = 4,5 exactos, sin cola de coma flotante.
    expect(weeklyMuscleVolume(sesiones, HOY).triceps_braquial).toBe(4.5)
  })

  it('el mapa guardado con la sesión manda sobre el del catálogo', () => {
    // Así, afinar el catálogo mañana no reescribe el volumen de lo ya hecho.
    const congelado: PlannedExercise = {
      ...hecho('press_banca_barra', 2),
      muscleContributions: { biceps_braquial: 1 }
    }
    expect(volumenDe(congelado)).toEqual({ biceps_braquial: 2 })
  })
})

describe('el desglose se puede explicar', () => {
  it('separa directas de indirectas', () => {
    const sesiones = [
      sesion('2026-07-26', [hecho('extension_triceps', 4)]),
      sesion('2026-07-25', [hecho('press_banca_barra', 3)])
    ]
    const d = desglosePorMusculo(sesiones, HOY, 'triceps_braquial')
    expect(d).toEqual({ directas: 4, indirectas: 3, total: 5.5 })
  })

  it('el total del desglose coincide con el del conteo', () => {
    const sesiones = [sesion('2026-07-26', [hecho('remo_barra', 4), hecho('curl_biceps', 3)])]
    const v = weeklyMuscleVolume(sesiones, HOY)
    for (const m of ALL_MUSCLES) {
      expect(desglosePorMusculo(sesiones, HOY, m).total, m).toBe(v[m])
    }
  })

  it('las series fraccionales se escriben con coma y un decimal', () => {
    expect(formatSeries(10.5)).toBe('10,5')
    expect(formatSeries(12)).toBe('12,0')
  })
})

// ── Regiones ──────────────────────────────────────────────

describe('las regiones agrupan, no cuentan', () => {
  it('cada músculo pertenece a una región y a solo una', () => {
    for (const m of ALL_MUSCLES) {
      const enRegiones = REGIONS.filter((r) => musclesOf(r).includes(m))
      expect(enRegiones.length, m).toBe(1)
    }
  })

  it('la suma de la región es la de sus músculos', () => {
    const v = weeklyMuscleVolume([sesion(HOY, [hecho('curl_biceps', 4), hecho('extension_triceps', 6)])], HOY)
    expect(volumenPorRegion(v).brazo).toBe(10)
  })

  it('el desglose del brazo distingue bíceps de tríceps', () => {
    const v = weeklyMuscleVolume([sesion(HOY, [hecho('curl_biceps', 4), hecho('extension_triceps', 6)])], HOY)
    expect(v.biceps_braquial).toBe(4)
    expect(v.triceps_braquial).toBe(6)
  })
})

// ── Landmarks ─────────────────────────────────────────────

describe('landmarks de volumen', () => {
  it('los de fábrica están ordenados de menos a más', () => {
    for (const m of ALL_MUSCLES) {
      const l = MUSCLES[m].landmarks
      expect(l.mev, m).toBeLessThanOrEqual(l.mavMin)
      expect(l.mavMin, m).toBeLessThanOrEqual(l.mavMax)
      expect(l.mavMax, m).toBeLessThanOrEqual(l.mrv)
    }
  })

  it('la zona sale de comparar con los landmarks del músculo', () => {
    const l = { mev: 4, mavMin: 12, mavMax: 18, mrv: 22 }
    expect(zonaDe(2, l)).toBe('bajo')
    expect(zonaDe(8, l)).toBe('suficiente')
    expect(zonaDe(15, l)).toBe('optimo')
    expect(zonaDe(25, l)).toBe('excesivo')
  })

  it('el usuario puede ajustarlos y su ajuste manda', () => {
    const propio = landmarksFor('pectoral_mayor', { overrides: { pectoral_mayor: { mrv: 30 } } })
    expect(propio.mrv).toBe(30)
    expect(propio.mev).toBe(MUSCLES.pectoral_mayor.landmarks.mev)
  })

  it('un ajuste incoherente se sanea en vez de romper la escala', () => {
    const base = MUSCLES.pectoral_mayor.landmarks
    const saneado = sanearOverride({ mev: 30, mavMin: 2 }, base)
    expect(saneado.mev!).toBeLessThanOrEqual(saneado.mavMin!)
    expect(saneado.mavMin!).toBeLessThanOrEqual(saneado.mavMax!)
    expect(saneado.mavMax!).toBeLessThanOrEqual(saneado.mrv!)
  })
})

describe('fase de déficit', () => {
  it(`ningún músculo pide más de ${MAV_TOPE_DEFICIT} series`, () => {
    const l = allLandmarks({ deficit: true })
    for (const m of ALL_MUSCLES) {
      expect(l[m].mavMax, m).toBeLessThanOrEqual(MAV_TOPE_DEFICIT)
    }
  })

  it('el mínimo pasa a ser el de mantenimiento: un tercio del de acumulación', () => {
    for (const m of ALL_MUSCLES) {
      const acumulacion = MUSCLES[m].landmarks.mavMin
      const l = landmarksFor(m, { deficit: true })
      expect(l.mev, m).toBe(Math.max(1, Math.round(acumulacion / 3)))
      expect(l.mev, m).toBeGreaterThan(0)
      // Y sigue por debajo del objetivo, o la escala no tendría sentido.
      expect(l.mev, m).toBeLessThanOrEqual(l.mavMin)
    }
  })

  it('en la mayoría de músculos el mínimo baja respecto a la fase normal', () => {
    const bajan = ALL_MUSCLES.filter(
      (m) => landmarksFor(m, { deficit: true }).mev <= landmarksFor(m).mev
    )
    expect(bajan.length).toBeGreaterThan(ALL_MUSCLES.length / 2)
  })

  it('el tope se aplica también sobre lo que el usuario haya subido a mano', () => {
    const l = landmarksFor('triceps_braquial', {
      overrides: { triceps_braquial: { mavMax: 40, mrv: 50 } },
      deficit: true
    })
    expect(l.mavMax).toBeLessThanOrEqual(MAV_TOPE_DEFICIT)
    expect(l.mrv).toBeLessThanOrEqual(MAV_TOPE_DEFICIT)
  })

  it('sin déficit no se toca nada', () => {
    expect(landmarksFor('cuadriceps')).toEqual(MUSCLES.cuadriceps.landmarks)
  })
})

// ── Previsualización ──────────────────────────────────────

describe('previsualizar el impacto de añadir un ejercicio', () => {
  it('dice a qué músculos afecta y cuánto suben', () => {
    const actual = weeklyMuscleVolume([sesion(HOY, [hecho('press_banca_barra', 4)])], HOY)
    const impacto = impactoDeAnadir(actual, hecho('curl_biceps', 3))
    expect(impacto).toEqual([{ musculo: 'biceps_braquial', antes: 0, despues: 3 }])
  })

  it('cuenta las indirectas a la mitad también al previsualizar', () => {
    const actual = weeklyMuscleVolume([], HOY)
    const impacto = impactoDeAnadir(actual, hecho('press_banca_barra', 4))
    const triceps = impacto.find((i) => i.musculo === 'triceps_braquial')
    expect(triceps).toEqual({ musculo: 'triceps_braquial', antes: 0, despues: 2 })
  })
})
