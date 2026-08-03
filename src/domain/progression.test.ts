import { describe, expect, it } from 'vitest'
import { esSesionLimpia, porQueNoCuentan, revisarSesion, seriesPorSesion, volumePlan } from './progression'
import { computeReadiness } from './readiness'
import { recommend, withMoreIntensity } from './recommender'
import { buildSession, variarRango } from './workoutBuilder'
import type { CheckIn, Profile, Recommendation, Session } from './types'

const HOY = '2026-07-26'

const perfil: Profile = {
  name: 'T',
  goal: 'masa',
  weightKg: 80,
  equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas'],
  maxWeights: { mancuernas: 24 }
}

/** Sesión de fuerza con sus series anotadas. */
function sesion(
  diasAtras: number,
  opts: { completa?: boolean; reps?: number; rpe?: 1 | 2 | 3 | 4 | 5 } = {}
): Session {
  const d = new Date('2026-07-26T12:00:00')
  d.setDate(d.getDate() - diasAtras)
  const completa = opts.completa ?? true
  const reps = opts.reps ?? 10
  return {
    id: `s${diasAtras}`,
    date: d.toISOString().slice(0, 10),
    kind: 'fuerza',
    title: 'test',
    completed: true,
    rpe: opts.rpe ?? 4,
    exercises: [
      {
        exerciseId: 'press_banca_mancuernas',
        name: 'Press',
        primary: 'pecho',
        plan: { sets: 3, reps: '8-12' },
        done: true,
        logs: [
          { weightKg: 14, reps, done: true },
          { weightKg: 14, reps, done: completa },
          { weightKg: 14, reps, done: completa }
        ]
      }
    ]
  }
}

function checkIns(sleep: 1 | 2 | 3 | 4 | 5): CheckIn[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date('2026-07-26T12:00:00')
    d.setDate(d.getDate() - i)
    return {
      date: d.toISOString().slice(0, 10),
      sleep,
      lightHygiene: sleep >= 4,
      sunrise: sleep >= 4,
      sunsetYesterday: sleep >= 4,
      sunExposure: sleep >= 4,
      keto: true,
      energy: sleep,
      discomfort: 'ninguna',
      wokeHungry: sleep < 4,
      cravings: sleep < 4
    } as CheckIn
  })
}

const buenos = checkIns(5)
const malos = checkIns(1)

/** Varias sesiones limpias, espaciadas cada 3 días. */
const limpias = (n: number) => Array.from({ length: n }, (_, i) => sesion(3 + i * 3))

describe('qué cuenta como sesión asimilada', () => {
  /** Sesión de N ejercicios × 3 series, con control fino de lo que falla. */
  function sesionDe(opts: { ejercicios?: number; sinMarcar?: number; cortas?: number }): Session {
    const { ejercicios = 5, sinMarcar = 0, cortas = 0 } = opts
    let quedanSinMarcar = sinMarcar
    let quedanCortas = cortas
    return {
      id: 'x',
      date: '2026-07-23',
      kind: 'fuerza',
      title: 't',
      completed: true,
      rpe: 4,
      exercises: Array.from({ length: ejercicios }, (_, i) => ({
        exerciseId: 'press_banca_mancuernas',
        name: 'Press ' + i,
        primary: 'pecho' as const,
        plan: { sets: 3, reps: '8-12' },
        logs: Array.from({ length: 3 }, () => {
          if (quedanSinMarcar > 0) {
            quedanSinMarcar -= 1
            return { weightKg: 14, reps: 10, done: false }
          }
          if (quedanCortas > 0) {
            quedanCortas -= 1
            return { weightKg: 14, reps: 6, done: true }
          }
          return { weightKg: 14, reps: 10, done: true }
        })
      }))
    }
  }

  it('una serie corta de quince no tira la sesión entera', () => {
    // Era el fallo que hacía que el volumen no subiera nunca: con «todas o
    // ninguna», la última serie de la última tabla invalidaba el día completo.
    expect(esSesionLimpia(sesionDe({ cortas: 1 }))).toBe(true)
  })

  it('pero si la mayoría se quedan cortas, no cuenta', () => {
    expect(esSesionLimpia(sesionDe({ cortas: 10 }))).toBe(false)
  })

  it('una serie sin marcar tampoco la tira', () => {
    expect(esSesionLimpia(sesionDe({ sinMarcar: 1 }))).toBe(true)
  })

  it('dejarse un ejercicio entero sí', () => {
    expect(esSesionLimpia(sesionDe({ sinMarcar: 3 }))).toBe(false)
  })

  it('dice qué falló, no solo que falló', () => {
    expect(revisarSesion(sesionDe({ sinMarcar: 5 })).motivo).toBe('series_sin_marcar')
    expect(revisarSesion(sesionDe({ cortas: 10 })).motivo).toBe('repeticiones_cortas')
    expect(revisarSesion({ ...sesionDe({}), rpe: 1 }).motivo).toBe('costo_mucho')
  })

  it('y lo cuenta con números para poder corregirlo', () => {
    const texto = porQueNoCuentan([sesionDe({ sinMarcar: 5 })])!
    expect(texto).toMatch(/\d+ de \d+/)
    expect(texto.toLowerCase()).toContain('marcar')
  })

  it('completa, dentro del rango y sin sufrir', () => {
    expect(esSesionLimpia(sesion(3))).toBe(true)
  })

  it('con series sin marcar, no cuenta', () => {
    expect(esSesionLimpia(sesion(3, { completa: false }))).toBe(false)
  })

  it('quedándose por debajo del rango, no cuenta', () => {
    expect(esSesionLimpia(sesion(3, { reps: 5 }))).toBe(false)
  })

  it('si costó demasiado, no cuenta', () => {
    expect(esSesionLimpia(sesion(3, { rpe: 1 }))).toBe(false)
  })

  it('sin sensación anotada no penaliza', () => {
    const s = sesion(3)
    delete s.rpe
    expect(esSesionLimpia(s)).toBe(true)
  })
})

describe('el volumen no sube porque sí', () => {
  it('sin historial se queda en el nivel base', () => {
    const p = volumePlan({ profile: perfil, sessions: [], checkIns: buenos, todayIso: HOY })
    expect(p.level).toBe(1)
    expect(p.setsPerExercise).toBe(3)
    expect(p.exercisesPerSession).toBe(4)
  })

  it('con sesiones que no salen completas tampoco sube', () => {
    const fallidas = Array.from({ length: 8 }, (_, i) => sesion(3 + i * 3, { completa: false }))
    expect(volumePlan({ profile: perfil, sessions: fallidas, checkIns: buenos, todayIso: HOY }).level).toBe(1)
  })

  it('sube cuando el cuerpo demuestra que asimila', () => {
    const p = volumePlan({ profile: perfil, sessions: limpias(8), checkIns: buenos, todayIso: HOY })
    expect(p.level).toBeGreaterThan(1)
    expect(p.setsPerExercise).toBeGreaterThan(3)
    expect(p.changes.join(' ')).toContain('serie más')
  })

  it('si la composición va bien, no toca lo que funciona', () => {
    const bien = volumePlan({
      profile: perfil,
      sessions: limpias(8),
      checkIns: buenos,
      trendState: 'recomposicion',
      todayIso: HOY
    })
    const sinDatos = volumePlan({ profile: perfil, sessions: limpias(8), checkIns: buenos, todayIso: HOY })
    expect(bien.level).toBeLessThan(sinDatos.level)
    expect(bien.evidence.join(' ')).toContain('no toco lo que está funcionando')
  })

  it('con estancamiento y cuerpo que asimila, sube antes', () => {
    const estancado = volumePlan({
      profile: perfil,
      sessions: limpias(8),
      checkIns: buenos,
      trendState: 'estable',
      todayIso: HOY
    })
    const sinDatos = volumePlan({ profile: perfil, sessions: limpias(8), checkIns: buenos, todayIso: HOY })
    expect(estancado.level).toBeGreaterThan(sinDatos.level)
    expect(estancado.evidence.join(' ')).toContain('estancado')
  })

  it('con estancamiento pero sin asimilar, no sube', () => {
    const fallidas = Array.from({ length: 8 }, (_, i) => sesion(3 + i * 3, { completa: false }))
    const p = volumePlan({
      profile: perfil,
      sessions: fallidas,
      checkIns: buenos,
      trendState: 'estable',
      todayIso: HOY
    })
    expect(p.level).toBe(1)
  })

  it('con la recuperación tocada baja al volumen base, digan lo que digan las demás señales', () => {
    const p = volumePlan({
      profile: perfil,
      sessions: limpias(12),
      checkIns: malos,
      trendState: 'estable',
      todayIso: HOY
    })
    expect(p.level).toBe(1)
    expect(p.reason).toContain('bajado el volumen')
  })

  it('nunca pasa del nivel máximo', () => {
    const p = volumePlan({
      profile: perfil,
      sessions: limpias(40),
      checkIns: buenos,
      trendState: 'estable',
      todayIso: HOY
    })
    expect(p.level).toBeLessThanOrEqual(4)
    expect(p.exercisesPerSession).toBeLessThanOrEqual(5)
    expect(p.setsPerExercise).toBeLessThanOrEqual(5)
    expect(p.focusMuscles).toBeLessThanOrEqual(5)
  })
})

describe('las palancas se usan en orden', () => {
  const nivel = (n: number) =>
    volumePlan({ profile: perfil, sessions: limpias(n), checkIns: buenos, todayIso: HOY })

  it('primero series, después ejercicios, y por último variar el rango', () => {
    const l1 = nivel(0)
    const l2 = nivel(8)
    expect(l1.setsPerExercise).toBeLessThan(l2.setsPerExercise)
    // El nivel más alto es el único que toca el rango de repeticiones.
    const alto = volumePlan({
      profile: perfil,
      sessions: limpias(40),
      checkIns: buenos,
      trendState: 'estable',
      todayIso: HOY
    })
    expect(alto.repBias).toBe('variado')
    expect(l2.repBias).toBe('normal')
  })

  it('variar el rango desplaza las repeticiones, no las inventa', () => {
    expect(variarRango('6-10')).toBe('10-14')
    expect(variarRango('30-45 s')).toBe('30-45 s')
  })
})

describe('siempre explica qué pasa y por qué', () => {
  it('cada nivel trae motivo y evidencia', () => {
    for (const n of [0, 4, 8, 20]) {
      const p = volumePlan({ profile: perfil, sessions: limpias(n), checkIns: buenos, todayIso: HOY })
      expect(p.reason.length, `nivel ${p.level}`).toBeGreaterThan(30)
      expect(p.evidence.length, `nivel ${p.level}`).toBeGreaterThan(0)
    }
  })

  it('al subir dice exactamente qué ha cambiado', () => {
    const p = volumePlan({ profile: perfil, sessions: limpias(8), checkIns: buenos, todayIso: HOY })
    expect(p.changes.length).toBeGreaterThan(0)
  })

  it('nunca culpabiliza ni habla de calorías', () => {
    for (const cis of [buenos, malos]) {
      for (const t of ['estable', 'recomposicion', 'atencion', undefined] as const) {
        const p = volumePlan({
          profile: perfil,
          sessions: limpias(8),
          checkIns: cis,
          trendState: t,
          todayIso: HOY
        })
        const texto = [p.reason, ...p.changes, ...p.evidence].join(' ').toLowerCase()
        expect(texto).not.toMatch(/calor[ií]a|d[eé]ficit|super[aá]vit|culpa|fracas|vago/)
      }
    }
  })
})

describe('la sesión refleja el nivel de volumen', () => {
  const rec = (volume?: Recommendation['volume']): Recommendation => ({
    kind: 'fuerza',
    title: 't',
    message: '',
    focus: ['pecho', 'espalda', 'hombro', 'brazo'],
    intensity: 'media-alta',
    volumeScale: 1,
    rir: 2,
    reasons: [],
    volume
  })

  it('el nivel base da 4 ejercicios y 3 series', () => {
    const s = buildSession(rec(), perfil, [], HOY)
    const fuerza = s.exercises.filter((e) => e.primary !== 'core')
    expect(fuerza.length).toBe(4)
    expect(fuerza[0].plan.sets).toBe(3)
  })

  it('un nivel alto da más ejercicios y más series', () => {
    const alto = volumePlan({
      profile: perfil,
      sessions: limpias(40),
      checkIns: buenos,
      trendState: 'estable',
      todayIso: HOY
    })
    const s = buildSession(rec(alto), perfil, [], HOY)
    const fuerza = s.exercises.filter((e) => e.primary !== 'core')
    expect(fuerza.length).toBe(5)
    expect(fuerza[0].plan.sets).toBe(5)
  })

  it('cada escalón sube el volumen de verdad, ninguno se repite', () => {
    // El nivel 4 era idéntico al 3 salvo el rango de repeticiones: el último
    // escalón de la rampa no subía nada.
    const series = ([1, 2, 3, 4] as const).map((n) => seriesPorSesion(n))
    for (let i = 1; i < series.length; i++) {
      expect(series[i], `nivel ${i + 1}`).toBeGreaterThan(series[i - 1])
    }
  })

  it('pedir pesas un día de paseo conserva el nivel alcanzado', () => {
    const historial = limpias(40)
    const alto = volumePlan({
      profile: perfil,
      sessions: historial,
      checkIns: buenos,
      trendState: 'estable',
      todayIso: HOY
    })
    expect(alto.level).toBeGreaterThan(1)

    // Con la disposición por los suelos lo que toca es descanso activo.
    const readiness = computeReadiness(malos[0])
    const base = recommend(perfil, readiness, historial, HOY, alto)
    expect(base.kind).not.toBe('fuerza')

    // Aun así el usuario pide pesas: el nivel alcanzado viaja con la sesión.
    const subida = withMoreIntensity(base, perfil, readiness, historial, HOY)
    expect(subida.kind).toBe('fuerza')
    expect(subida.volume?.level).toBe(alto.level)

    // Y se nota en el plan: más series que si estuviera en el nivel base.
    const conNivel = buildSession(subida, perfil, historial, HOY)
    const conBase = buildSession({ ...subida, volume: undefined }, perfil, historial, HOY)
    const series = (s: Session) => s.exercises.filter((e) => e.primary !== 'core')[0].plan.sets
    expect(series(conNivel)).toBeGreaterThan(series(conBase))
  })

  it('la vuelta tras un parón sigue mandando sobre el nivel alcanzado', () => {
    const alto = volumePlan({
      profile: perfil,
      sessions: limpias(40),
      checkIns: buenos,
      trendState: 'estable',
      todayIso: HOY
    })
    // Aunque el nivel sea 4, con la rampa al 50 % las series se recortan.
    const s = buildSession({ ...rec(alto), volumeScale: 0.5 }, perfil, [], HOY)
    const sinRampa = buildSession(rec(alto), perfil, [], HOY)
    for (const pe of s.exercises) expect(pe.plan.sets).toBeLessThanOrEqual(3)
    expect(s.exercises[0].plan.sets).toBeLessThan(sinRampa.exercises[0].plan.sets)
  })
})
