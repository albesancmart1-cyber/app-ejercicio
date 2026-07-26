import { describe, expect, it } from 'vitest'
import { EXERCISES, exerciseById } from '../data/exercises'
import { patternOf } from '../data/patterns'
import { alternativesFor, nextAlternative, swapExercise } from './swap'
import { buildSession, hasEquipment } from './workoutBuilder'
import { MUSCLE_GROUPS, type PlannedExercise, type Profile, type Session } from './types'

const TODAY = '2026-07-26'

const conMaterial: Profile = {
  name: 'T',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas'],
  maxWeights: { mancuernas: 24 }
}

const soloCorporal: Profile = {
  name: 'T',
  goal: 'recomposicion',
  equipment: ['peso_corporal'],
  maxWeights: {}
}

function sesionCon(ids: string[]): Session {
  return {
    id: 's',
    date: TODAY,
    kind: 'fuerza',
    title: 'test',
    completed: false,
    exercises: ids.map((id) => {
      const ex = exerciseById(id)!
      return {
        exerciseId: ex.id,
        name: ex.name,
        primary: ex.primary,
        plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120 },
        logs: [{ done: false }, { done: false }, { done: false }]
      } as PlannedExercise
    })
  }
}

const opts = { intensity: 'moderada' as const, volumeScale: 1, keto: false }

describe('el material se respeta de verdad', () => {
  it('subida al cajón y fondos en banco exigen banco', () => {
    // Antes se ofrecían a todo el mundo por listar «peso corporal», que es
    // justo lo que llevó a proponer subidas al cajón sin tener cajón.
    for (const id of ['subida_cajon', 'fondos_banco']) {
      const ex = exerciseById(id)!
      expect(ex.equipment, id).toContain('banco')
      expect(hasEquipment(ex, ['peso_corporal']), id).toBe(false)
    }
  })

  it('ningún ejercicio propuesto a quien solo tiene su cuerpo requiere material', () => {
    for (const grupo of MUSCLE_GROUPS.filter((g) => g !== 'cardio')) {
      const s = buildSession(
        { kind: 'fuerza', title: 't', message: '', focus: [grupo], intensity: 'media-alta', volumeScale: 1, rir: 2, reasons: [] },
        soloCorporal,
        [],
        TODAY
      )
      for (const pe of s.exercises) {
        expect(hasEquipment(exerciseById(pe.exerciseId)!, ['peso_corporal']), pe.name).toBe(true)
      }
    }
  })

  it('cada grupo tiene al menos dos opciones solo con peso corporal', () => {
    // Es el mínimo para que cambiar un ejercicio signifique algo.
    for (const grupo of MUSCLE_GROUPS.filter((g) => g !== 'cardio')) {
      const opciones = EXERCISES.filter(
        (e) => e.primary === grupo && hasEquipment(e, ['peso_corporal'])
      )
      expect(opciones.length, `${grupo}: ${opciones.map((o) => o.id).join(', ')}`).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('alternativas', () => {
  it('el sustituto trabaja el mismo grupo y se puede hacer con tu material', () => {
    const sesion = sesionCon(['sentadilla_goblet'])
    const alt = nextAlternative(sesion.exercises[0], conMaterial, sesion)!
    expect(alt.primary).toBe('cuadriceps_gluteo')
    expect(hasEquipment(alt, conMaterial.equipment)).toBe(true)
  })

  it('prefiere un patrón de movimiento distinto: lo mismo pero de otra manera', () => {
    const sesion = sesionCon(['sentadilla_goblet']) // patrón «sentadilla»
    const alt = nextAlternative(sesion.exercises[0], conMaterial, sesion)!
    expect(patternOf(alt.id)).not.toBe(patternOf('sentadilla_goblet'))
  })

  it('nunca propone uno que ya está en la sesión', () => {
    const sesion = sesionCon(['sentadilla_corporal', 'zancadas', 'puente_gluteo'])
    const alts = alternativesFor(sesion.exercises[0], conMaterial, sesion)
    for (const a of alts) {
      expect(['sentadilla_corporal', 'zancadas', 'puente_gluteo']).not.toContain(a.id)
    }
  })

  it('rotar recorre las opciones y vuelve a empezar', () => {
    const sesion = sesionCon(['sentadilla_goblet'])
    let actual = sesion.exercises[0]
    const vistos: string[] = []
    for (let i = 0; i < 4; i++) {
      const alt = nextAlternative(actual, conMaterial, { ...sesion, exercises: [actual] })
      if (!alt) break
      vistos.push(alt.id)
      actual = swapExercise(actual, alt, conMaterial, [], opts)
    }
    expect(vistos.length).toBeGreaterThan(1)
    // Al rotar se vuelve a pasar por opciones ya vistas: no se agota en un callejón.
    expect(new Set(vistos).size).toBeGreaterThan(1)
  })

  it('respeta el tope de estrés de la sesión', () => {
    const conBarra: Profile = { ...conMaterial, equipment: [...conMaterial.equipment, 'barra'], maxWeights: { mancuernas: 24, barra: 60 } }
    const sesion = sesionCon(['sentadilla_goblet'])
    const alts = alternativesFor(sesion.exercises[0], conBarra, sesion, 'bajo')
    for (const a of alts) expect(a.stress).toBe('bajo')
  })

  it('si no hay alternativas con tu material, devuelve nada en vez de inventar', () => {
    const sinNada: Profile = { ...soloCorporal, equipment: ['maquina_prensa'], maxWeights: {} }
    const sesion = sesionCon(['prensa'])
    const alts = alternativesFor(sesion.exercises[0], sinNada, sesion)
    for (const a of alts) expect(hasEquipment(a, sinNada.equipment)).toBe(true)
  })
})

describe('el sustituto recibe su propio plan', () => {
  it('recalcula peso y descanso según el ejercicio nuevo', () => {
    const sesion = sesionCon(['sentadilla_goblet'])
    const original = sesion.exercises[0]
    const alt = exerciseById('puente_gluteo')!
    const nuevo = swapExercise(original, alt, conMaterial, [], opts)

    expect(nuevo.exerciseId).toBe('puente_gluteo')
    expect(nuevo.name).toBe(alt.name)
    expect(nuevo.plan.restSeconds).toBeGreaterThan(0)
  })

  it('un accesorio descansa menos que un básico', () => {
    const sesion = sesionCon(['sentadilla_goblet'])
    const basico = swapExercise(sesion.exercises[0], exerciseById('zancadas')!, conMaterial, [], opts)
    const accesorio = swapExercise(sesion.exercises[0], exerciseById('sentadilla_pared')!, conMaterial, [], opts)
    expect(basico.plan.restSeconds!).toBeGreaterThan(accesorio.plan.restSeconds!)
  })

  it('mantiene el número de series: cambia el ejercicio, no la dosis', () => {
    const sesion = sesionCon(['sentadilla_goblet'])
    const nuevo = swapExercise(sesion.exercises[0], exerciseById('puente_gluteo')!, conMaterial, [], opts)
    expect(nuevo.plan.sets).toBe(sesion.exercises[0].plan.sets)
  })

  it('las series del sustituto empiezan en blanco', () => {
    const sesion = sesionCon(['sentadilla_goblet'])
    sesion.exercises[0].logs = [{ weightKg: 20, reps: 10, done: true }, { done: false }, { done: false }]
    const nuevo = swapExercise(sesion.exercises[0], exerciseById('puente_gluteo')!, conMaterial, [], opts)
    expect(nuevo.logs!.every((l) => !l.done)).toBe(true)
    expect(nuevo.logs).toHaveLength(nuevo.plan.sets)
  })
})

describe('ejercicios descartados', () => {
  it('dejan de proponerse en sesiones nuevas', () => {
    const perfil: Profile = { ...conMaterial, dislikedExercises: ['sentadilla_goblet', 'zancadas'] }
    for (let i = 0; i < 5; i++) {
      const s = buildSession(
        { kind: 'fuerza', title: 't', message: '', focus: ['cuadriceps_gluteo'], intensity: 'media-alta', volumeScale: 1, rir: 2, reasons: [] },
        perfil,
        [],
        TODAY
      )
      for (const pe of s.exercises) {
        expect(['sentadilla_goblet', 'zancadas']).not.toContain(pe.exerciseId)
      }
    }
  })

  it('descartarlos todos no deja la sesión coja', () => {
    // Antes una sesión sin pierna que un usuario que descartó de más.
    const todosLosDePierna = EXERCISES.filter((e) => e.primary === 'cuadriceps_gluteo').map((e) => e.id)
    const perfil: Profile = { ...conMaterial, dislikedExercises: todosLosDePierna }
    const s = buildSession(
      { kind: 'fuerza', title: 't', message: '', focus: ['cuadriceps_gluteo'], intensity: 'media-alta', volumeScale: 1, rir: 2, reasons: [] },
      perfil,
      [],
      TODAY
    )
    expect(s.exercises.some((pe) => pe.primary === 'cuadriceps_gluteo')).toBe(true)
  })
})
