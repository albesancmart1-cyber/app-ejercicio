import { describe, expect, it } from 'vitest'
import { AFINIDAD_MAX, afinidadDe, pesoDePreferencia, trasCambiar, trasEntrenar } from './affinity'
import { alternativesFor, nextAlternative } from './swap'
import { contributionsOf } from '../data/contributions'
import { exerciseById } from '../data/exercises'
import type { Muscle } from './muscles'
import type { PlannedExercise, Profile, Session } from './types'

const perfil: Profile = {
  name: 'T',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'barra', 'polea'],
  maxWeights: { mancuernas: 24, barra: 60, polea: 60 }
}

function planeado(exerciseId: string): PlannedExercise {
  const ex = exerciseById(exerciseId)!
  return {
    exerciseId,
    name: ex.name,
    primary: ex.primary,
    plan: { sets: 3, reps: '8-12', rir: 2 },
    logs: []
  }
}

const sesion = (ids: string[]): Session => ({
  id: 's',
  date: '2026-07-26',
  kind: 'fuerza',
  title: 't',
  completed: false,
  exercises: ids.map(planeado)
})

const motoresDe = (id: string) =>
  (Object.keys(contributionsOf(id)) as Muscle[]).filter((m) => contributionsOf(id)[m] === 1)

// ── Cambiar de un toque, sin bucles ───────────────────────

describe('cambiar de ejercicio no da vueltas entre dos', () => {
  it('cada toque trae uno distinto', () => {
    const s = sesion(['curl_biceps'])
    const vistos: string[] = []
    let actual = planeado('curl_biceps')
    const salidos: string[] = []
    for (let i = 0; i < 4; i++) {
      const siguiente = nextAlternative(actual, perfil, { ...s, exercises: [actual] }, 'alto', vistos)!
      expect(siguiente, `vuelta ${i}`).toBeDefined()
      expect(salidos, `repite en la vuelta ${i}`).not.toContain(siguiente.id)
      salidos.push(siguiente.id)
      vistos.push(actual.exerciseId)
      actual = planeado(siguiente.id)
    }
    expect(new Set(salidos).size).toBe(4)
  })

  it('sin memoria de lo descartado volvería al de antes', () => {
    // Es exactamente el bucle que había: A → B y el siguiente toque, otra vez A.
    const a = planeado('curl_biceps')
    const b = nextAlternative(a, perfil, sesion(['curl_biceps']), 'alto', [])!
    const vuelta = nextAlternative(planeado(b.id), perfil, sesion([b.id]), 'alto', [])!
    expect(vuelta.id).toBe('curl_biceps')
  })

  it('agotadas las opciones, vuelve a empezar en vez de quedarse mudo', () => {
    const todos = alternativesFor(planeado('curl_biceps'), perfil, sesion(['curl_biceps']))
    const vistos = todos.map((e) => e.id)
    const siguiente = nextAlternative(planeado('curl_biceps'), perfil, sesion(['curl_biceps']), 'alto', vistos)
    expect(siguiente).toBeDefined()
  })
})

describe('el sustituto trabaja los mismos músculos', () => {
  it('un curl nunca se cambia por algo que no mueva el bíceps', () => {
    for (const e of alternativesFor(planeado('curl_biceps'), perfil, sesion(['curl_biceps']))) {
      expect(contributionsOf(e.id).biceps_braquial, `${e.id} no mueve el bíceps`).toBeTruthy()
    }
  })

  it('los que lo mueven de verdad van antes que los que lo acompañan', () => {
    const alt = alternativesFor(planeado('curl_biceps'), perfil, sesion(['curl_biceps']))
    const directo = (id: string) => contributionsOf(id).biceps_braquial === 1
    const primerAcompanante = alt.findIndex((e) => !directo(e.id))
    const ultimoDirecto = alt.map((e) => directo(e.id)).lastIndexOf(true)
    if (primerAcompanante >= 0) expect(ultimoDirecto).toBeLessThan(primerAcompanante)
  })

  it('y hay opciones de sobra, no dos', () => {
    // El bíceps solo tiene tres ejercicios directos con mancuernas: sin admitir
    // los que lo acompañan, cambiar era el bucle de dos que había que evitar.
    const alt = alternativesFor(planeado('curl_biceps'), perfil, sesion(['curl_biceps']))
    expect(alt.length).toBeGreaterThanOrEqual(5)
  })

  it('y un press de banca sigue siendo de pecho', () => {
    const alt = alternativesFor(planeado('press_banca_mancuernas'), perfil, sesion(['press_banca_mancuernas']))
    expect(alt.length).toBeGreaterThan(2)
    for (const e of alt.slice(0, 4)) expect(motoresDe(e.id), e.id).toContain('pectoral_mayor')
  })

  it('no propone lo que ya está en la sesión', () => {
    const s = sesion(['curl_biceps', 'curl_martillo'])
    const ids = alternativesFor(planeado('curl_biceps'), perfil, s).map((e) => e.id)
    expect(ids).not.toContain('curl_martillo')
  })
})

// ── Lo que la app aprende ─────────────────────────────────

describe('la app aprende de lo que aceptas y lo que descartas', () => {
  it('cambiar un ejercicio lo baja, y sube el que te quedas', () => {
    const a = trasCambiar(perfil, 'curl_biceps', 'curl_martillo')
    expect(a.curl_biceps).toBeLessThan(0)
    expect(a.curl_martillo).toBeGreaterThan(0)
  })

  it('entrenarlo lo sube', () => {
    const s: Session = {
      ...sesion(['curl_biceps']),
      completed: true,
      exercises: [{ ...planeado('curl_biceps'), logs: [{ done: true }] }]
    }
    expect(trasEntrenar(perfil, s).curl_biceps).toBeGreaterThan(0)
  })

  it('lo que aparece en el plan pero no se toca, ni suma ni resta', () => {
    const s: Session = {
      ...sesion(['curl_biceps']),
      completed: true,
      exercises: [{ ...planeado('curl_biceps'), logs: [{ done: false }] }]
    }
    expect(trasEntrenar(perfil, s).curl_biceps).toBeUndefined()
  })

  it('ni el mejor ni el peor se salen de la banda', () => {
    let perfilN = perfil
    for (let i = 0; i < 20; i++) {
      perfilN = { ...perfilN, exerciseAffinity: trasCambiar(perfilN, 'curl_biceps', 'curl_martillo') }
    }
    expect(afinidadDe(perfilN, 'curl_biceps')).toBe(-AFINIDAD_MAX)
    expect(afinidadDe(perfilN, 'curl_martillo')).toBe(AFINIDAD_MAX)
  })

  it('un favorito marcado a mano manda sobre lo aprendido', () => {
    const conFavorito: Profile = {
      ...perfil,
      favoriteExercises: ['curl_concentrado'],
      exerciseAffinity: { curl_martillo: AFINIDAD_MAX }
    }
    expect(pesoDePreferencia(conFavorito, 'curl_concentrado')).toBeGreaterThan(
      pesoDePreferencia(conFavorito, 'curl_martillo')
    )
  })

  /** Los que trabajan el bíceps como motor principal, que compiten entre sí. */
  const directos = () =>
    alternativesFor(planeado('curl_biceps'), perfil, sesion(['curl_biceps'])).filter(
      (e) => contributionsOf(e.id).biceps_braquial === 1
    )

  it('lo que te gusta se propone antes al cambiar', () => {
    const ultimo = directos()[directos().length - 1].id
    const aprendido: Profile = { ...perfil, exerciseAffinity: { [ultimo]: AFINIDAD_MAX } }
    const conGusto = alternativesFor(planeado('curl_biceps'), aprendido, sesion(['curl_biceps']))
    expect(conGusto[0].id).toBe(ultimo)
  })

  it('y lo que rechazas repetidamente cae por detrás de los suyos', () => {
    const lista = directos()
    const primero = lista[0].id
    const harto: Profile = { ...perfil, exerciseAffinity: { [primero]: -AFINIDAD_MAX } }
    const conRechazo = alternativesFor(planeado('curl_biceps'), harto, sesion(['curl_biceps'])).filter(
      (e) => contributionsOf(e.id).biceps_braquial === 1
    )
    expect(conRechazo[conRechazo.length - 1].id).toBe(primero)
  })
})
