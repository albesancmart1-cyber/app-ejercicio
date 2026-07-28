import { describe, expect, it } from 'vitest'
import { diasSinTrabajar, elegirFoco, explicarFoco, grupoDe, gruposDe } from './focus'
import { buildSession, pickForMuscle } from './workoutBuilder'
import { contributionsOf } from '../data/contributions'
import { exerciseById } from '../data/exercises'
import { ALL_MUSCLES } from './muscles'
import type { Muscle } from './muscles'
import type { MuscleGroup, PlannedExercise, Profile, Recommendation, Session } from './types'

const HOY = '2026-07-27'

const profile: Profile = {
  name: 'Test',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas'],
  maxWeights: { mancuernas: 24 }
}

function hecho(exerciseId: string, series = 4): PlannedExercise {
  return {
    exerciseId,
    name: exerciseId,
    primary: 'pecho',
    plan: { sets: series, reps: '8-12', rir: 2 },
    done: true,
    logs: Array.from({ length: series }, () => ({ done: true }))
  }
}

const sesion = (date: string, exercises: PlannedExercise[]): Session => ({
  id: date,
  date,
  kind: 'fuerza',
  title: 't',
  completed: true,
  exercises
})

// ── El caso que motivó todo el refactor ────────────────────

describe('el foco mira el músculo, no la zona', () => {
  /** Una semana entera de empujes: «brazo» y «hombro» salen cubiertos. */
  const soloEmpujes = [
    sesion('2026-07-26', [hecho('press_banca_barra', 4), hecho('press_militar_barra', 4)]),
    sesion('2026-07-24', [hecho('press_banca_mancuernas', 4), hecho('fondos_banco', 4)])
  ]

  it('propone lo que quedó a cero dentro de una zona trabajada', () => {
    const foco = elegirFoco(soloEmpujes, HOY)
    expect(foco.musculos).toContain('biceps_braquial')
  })

  it('y no lo que ya va sobrado en esa misma zona', () => {
    const foco = elegirFoco(soloEmpujes, HOY)
    expect(foco.musculos).not.toContain('triceps_braquial')
    expect(foco.musculos).not.toContain('deltoides_anterior')
  })

  it('dentro del hombro y del brazo, primero los que no ha tocado el empuje', () => {
    // La sesión solo abre cuatro músculos, así que lo que importa no es que
    // entren todos, sino el orden: los que el empuje dejó a cero por delante de
    // los que ya van servidos.
    const orden = elegirFoco(soloEmpujes, HOY, { limite: 19 }).musculos
    expect(orden.indexOf('deltoides_posterior')).toBeLessThan(orden.indexOf('deltoides_anterior'))
    expect(orden.indexOf('biceps_braquial')).toBeLessThan(orden.indexOf('triceps_braquial'))
  })

  it('lo explica nombrando los músculos, no la zona', () => {
    const texto = explicarFoco(elegirFoco(soloEmpujes, HOY))!
    expect(texto.toLowerCase()).toContain('bíceps')
    expect(texto.toLowerCase()).not.toContain('brazo')
  })

  it('cuando ya llevan algo, dice cuánto les falta', () => {
    // Una semana floja pero repartida: nadie está a cero y varios se quedan
    // cortos, que es cuando interesa saber por cuánto.
    const floja = [
      sesion('2026-07-25', [
        hecho('curl_biceps', 2),
        hecho('extension_triceps', 2),
        hecho('elevaciones_laterales', 2),
        hecho('pajaros', 2),
        hecho('elevaciones_frontales', 2),
        hecho('press_banca_barra', 2),
        hecho('remo_barra', 2),
        hecho('dominadas', 2),
        hecho('encogimientos', 2),
        hecho('hiperextensiones', 2),
        hecho('sentadilla_barra', 2),
        hecho('peso_muerto_rumano', 2),
        hecho('sentadilla_sumo', 2),
        hecho('curl_muneca', 2),
        hecho('elevacion_talones_pie', 2),
        hecho('elevacion_talones_sentado', 2),
        hecho('plancha', 2),
        hecho('plancha_lateral', 2)
      ])
    ]
    const texto = explicarFoco(elegirFoco(floja, HOY))!
    expect(texto).toMatch(/\d+ de \d+/)
  })

  it('con todo a cero no repite «0 de 4» cuatro veces', () => {
    const texto = explicarFoco(elegirFoco([], HOY))!
    expect(texto.toLowerCase()).toContain('ni una serie')
    expect(texto).not.toContain('0 de')
  })
})

// ── Guardas que no cambian ─────────────────────────────────

describe('las guardas de siempre siguen mandando', () => {
  it('una molestia deja fuera la zona entera, no un músculo suelto', () => {
    const foco = elegirFoco([], HOY, { excluir: ['hombro'], evitar: ['hombro'] })
    for (const m of foco.musculos) expect(grupoDe(m)).not.toBe('hombro')
  })

  it('un grupo en recuperación tampoco aparece', () => {
    const foco = elegirFoco([], HOY, { excluir: ['cuadriceps_gluteo'] })
    expect(foco.grupos).not.toContain('cuadriceps_gluteo')
  })

  it('si al excluir no queda casi nada se relaja, pero nunca las molestias', () => {
    const todosMenosHombro = (['pecho', 'espalda', 'brazo', 'cuadriceps_gluteo', 'femoral', 'gemelo', 'core'] as MuscleGroup[])
    const foco = elegirFoco([], HOY, { excluir: [...todosMenosHombro, 'hombro'], evitar: ['hombro'] })
    expect(foco.relajado).toBe(true)
    expect(foco.musculos.length).toBeGreaterThan(0)
    for (const m of foco.musculos) expect(grupoDe(m)).not.toBe('hombro')
  })
})

// ── Lo que sí es nuevo ─────────────────────────────────────

describe('un músculo servido deja de pedir', () => {
  it('pasado su MAV no se propone aunque su zona vaya corta', () => {
    // 20 series de curl: el bíceps llega a su MAV máximo y el brazo, como
    // grupo, sigue teniendo el tríceps a cero.
    const s = [sesion('2026-07-26', [hecho('curl_biceps', 20)])]
    const foco = elegirFoco(s, HOY, { limite: 19 })
    expect(foco.musculos).not.toContain('biceps_braquial')
    expect(foco.musculos).toContain('triceps_braquial')
  })

  it('en fase de déficit el listón baja: se llega antes al tope', () => {
    const s = [sesion('2026-07-26', [hecho('curl_biceps', 13)])]
    expect(elegirFoco(s, HOY, { limite: 19 }).musculos).toContain('biceps_braquial')
    expect(elegirFoco(s, HOY, { limite: 19, deficit: true }).musculos).not.toContain('biceps_braquial')
  })
})

describe('con todo a cero decide el tiempo sin trabajar', () => {
  const historia = [
    // Pecho hace tres semanas, pierna hace dos meses: los dos están a cero
    // series esta semana, pero no llevan lo mismo sin tocarse.
    sesion('2026-07-06', [hecho('press_banca_mancuernas', 4)]),
    sesion('2026-05-20', [hecho('sentadilla_goblet', 4)])
  ]

  it('cuenta los días desde el último trabajo directo', () => {
    const dias = diasSinTrabajar(historia, HOY)
    expect(dias.pectoral_mayor).toBe(21)
    expect(dias.cuadriceps).toBe(68)
    expect(dias.gastrocnemio).toBe(Infinity)
  })

  it('acompañar no cuenta como haberlo trabajado', () => {
    // El press de banca da 0,5 al tríceps: eso no es haberlo entrenado.
    expect(contributionsOf('press_banca_mancuernas').triceps_braquial).toBe(0.5)
    expect(diasSinTrabajar(historia, HOY).triceps_braquial).toBe(Infinity)
  })

  it('lo que lleva más tiempo parado abre la sesión', () => {
    const foco = elegirFoco(historia, HOY, { limite: 2 })
    expect(foco.musculos).not.toContain('pectoral_mayor')
  })
})

describe('los grupos salen de los músculos, y no al revés', () => {
  it('se deduplican conservando el orden', () => {
    expect(gruposDe(['deltoides_lateral', 'biceps_braquial', 'deltoides_posterior'])).toEqual([
      'hombro',
      'brazo'
    ])
  })

  it('todo músculo tiene grupo', () => {
    for (const m of ALL_MUSCLES) expect(grupoDe(m), m).toBeDefined()
  })
})

// ── De músculo a ejercicio ─────────────────────────────────

describe('elegir el ejercicio por el músculo', () => {
  const vacio = new Set<string>()

  it('lo trabaja de verdad, no de refilón', () => {
    for (const m of ALL_MUSCLES) {
      const ex = pickForMuscle(m, { ...profile, equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'barra', 'polea', 'dominadas_barra'] }, 'alto', vacio, vacio)
      expect(ex, m).toBeDefined()
      expect(contributionsOf(ex!.id)[m], `${m} → ${ex!.id}`).toBe(1)
    }
  })

  it('un bíceps a cero no se arregla con otro tríceps', () => {
    const ex = pickForMuscle('biceps_braquial', profile, 'alto', vacio, vacio)!
    expect(contributionsOf(ex.id).biceps_braquial).toBe(1)
  })

  it('respeta la zona vetada aunque el músculo esté fuera de ella', () => {
    // Las dominadas supinas son un ejercicio de bíceps excelente, pero cuelgan
    // de la espalda: con la espalda dolorida, no.
    const conBarra: Profile = { ...profile, equipment: [...profile.equipment, 'dominadas_barra'] }
    const ex = pickForMuscle('biceps_braquial', conBarra, 'alto', vacio, vacio, [], ['espalda'])!
    expect(exerciseById(ex.id)!.primary).not.toBe('espalda')
  })

  it('a igualdad, gana el que cubre más músculos del foco de hoy', () => {
    const foco: Muscle[] = ['pectoral_mayor', 'triceps_braquial', 'deltoides_anterior']
    const solo = pickForMuscle('pectoral_mayor', profile, 'alto', vacio, vacio)!
    const conFoco = pickForMuscle('pectoral_mayor', profile, 'alto', vacio, vacio, foco)!
    const cubre = (id: string) =>
      foco.slice(1).reduce((a, m) => a + (contributionsOf(id)[m] ?? 0), 0)
    expect(cubre(conFoco.id)).toBeGreaterThanOrEqual(cubre(solo.id))
    expect(cubre(conFoco.id)).toBeGreaterThan(0)
  })

  it('los descartados no vuelven', () => {
    const sinCurl: Profile = { ...profile, dislikedExercises: ['curl_biceps'] }
    const ex = pickForMuscle('biceps_braquial', sinCurl, 'alto', vacio, vacio)!
    expect(ex.id).not.toBe('curl_biceps')
  })

  it('no repite uno que ya está en la sesión', () => {
    const usado = new Set(['curl_biceps'])
    const ex = pickForMuscle('biceps_braquial', profile, 'alto', usado, vacio)!
    expect(ex.id).not.toBe('curl_biceps')
  })
})

// ── La sesión completa ─────────────────────────────────────

describe('la sesión que sale de todo esto', () => {
  const rec = (extra: Partial<Recommendation> = {}): Recommendation => ({
    kind: 'fuerza',
    title: 'Fuerza',
    message: '',
    focus: ['brazo', 'hombro'],
    intensity: 'moderada',
    volumeScale: 1,
    rir: 2,
    reasons: [],
    ...extra
  })

  it('cubre los músculos del foco', () => {
    const s = buildSession(
      rec({ focusMuscles: ['biceps_braquial', 'deltoides_lateral', 'deltoides_posterior'] }),
      profile,
      [],
      HOY
    )
    const cubiertos = new Set<string>()
    for (const pe of s.exercises) {
      for (const [m, c] of Object.entries(contributionsOf(pe.exerciseId))) {
        if (c === 1) cubiertos.add(m)
      }
    }
    expect(cubiertos).toContain('biceps_braquial')
    expect(cubiertos).toContain('deltoides_lateral')
    expect(cubiertos).toContain('deltoides_posterior')
  })

  it('una recomendación sin músculos sigue funcionando por zonas', () => {
    // Compatibilidad: las sesiones guardadas y las construidas a mano no llevan
    // el campo, y tienen que seguir dando una sesión válida.
    const s = buildSession(rec(), profile, [], HOY)
    expect(s.exercises.length).toBeGreaterThan(0)
    expect(s.exercises.some((e) => e.primary === 'brazo')).toBe(true)
  })

  it('no mete dos veces el mismo ejercicio', () => {
    const s = buildSession(
      rec({ focusMuscles: ['triceps_braquial', 'pectoral_mayor', 'deltoides_anterior'] }),
      profile,
      [],
      HOY
    )
    const ids = s.exercises.map((e) => e.exerciseId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
