import { describe, expect, it } from 'vitest'
import {
  aSesion,
  carpetasDe,
  desdeSesion,
  describirRutina,
  nombreLibre,
  nombrePropuesto,
  nombresDeCarpeta,
  sePuedeGuardar
} from './rutinas'
import { encadenarConSiguiente, gruposDe } from './superseries'
import type { Profile, Routine, Session } from './types'

const perfil: Profile = {
  name: 'Alberto',
  goal: 'masa',
  equipment: ['peso_corporal', 'mancuernas', 'banco'],
  maxWeights: { mancuernas: 24 }
}

function sesion(exercises: Session['exercises'], extra: Partial<Session> = {}): Session {
  return {
    id: 'ses-1',
    date: '2026-03-10',
    kind: 'fuerza',
    title: 'Fuerza · pecho y espalda',
    completed: true,
    exercises,
    ...extra
  }
}

const press = {
  exerciseId: 'press_banca_mancuernas',
  name: 'Press de banca con mancuernas',
  primary: 'pecho' as const,
  plan: { sets: 4, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 16 },
  logs: [
    { weightKg: 16, reps: 10, rir: 1, done: true },
    { weightKg: 16, reps: 9, rir: 1, done: true }
  ],
  done: true,
  actualWeightKg: 16,
  progressNote: 'algo que decir hoy'
}

const remo = {
  exerciseId: 'remo_mancuerna',
  name: 'Remo con mancuerna',
  primary: 'espalda' as const,
  plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 18 },
  logs: [{ weightKg: 18, reps: 10, done: true }]
}

describe('guardar una sesión como rutina', () => {
  it('se queda con la estructura y tira lo que pasó aquel día', () => {
    const r = desdeSesion(sesion([press, remo]), 'Empuje y tirón')
    expect(r.name).toBe('Empuje y tirón')
    expect(r.exercises).toHaveLength(2)
    expect(r.exercises[0].plan.sets).toBe(4)
    expect(r.exercises[0].plan.reps).toBe('8-12')
    expect(r.exercises[0].logs).toBeUndefined()
    expect(r.exercises[0].done).toBeUndefined()
    expect(r.exercises[0].progressNote).toBeUndefined()
  })

  it('no guarda los pesos: los pone la progresión cada vez', () => {
    const r = desdeSesion(sesion([press]), 'Pecho')
    expect(r.exercises[0].plan.weightKg).toBeUndefined()
  })

  it('conserva las superseries', () => {
    const encadenados = encadenarConSiguiente([press, remo], 0)
    const r = desdeSesion(sesion(encadenados), 'Encadenado')
    expect(gruposDe(r.exercises)).toHaveLength(1)
  })

  it('recuerda de qué sesión salió y cuándo se creó', () => {
    const r = desdeSesion(sesion([press]), 'Pecho', { ahora: 1000 })
    expect(r.fromSessionId).toBe('ses-1')
    expect(r.createdAt).toBe(1000)
  })

  it('propone un nombre a partir del título, sin la coletilla', () => {
    expect(nombrePropuesto(sesion([press]))).toBe('pecho y espalda')
  })

  it('una sesión de solo cardio no se ofrece guardar', () => {
    const soloCardio = sesion([
      {
        exerciseId: 'caminar',
        name: 'Caminar',
        primary: 'cardio' as const,
        plan: { sets: 1, reps: '30 min' }
      }
    ])
    expect(sePuedeGuardar(soloCardio)).toBe(false)
    expect(sePuedeGuardar(sesion([press]))).toBe(true)
  })
})

describe('repetir una rutina', () => {
  const rutina = desdeSesion(sesion([press, remo]), 'Empuje y tirón')

  it('construye la sesión de hoy con los mismos ejercicios y en el mismo orden', () => {
    const s = aSesion(rutina, perfil, [], { date: '2026-03-17' })
    expect(s.exercises.map((e) => e.exerciseId)).toEqual([
      'press_banca_mancuernas',
      'remo_mancuerna'
    ])
    expect(s.date).toBe('2026-03-17')
    expect(s.title).toBe('Empuje y tirón')
    expect(s.completed).toBe(false)
  })

  it('respeta la dosis de la rutina', () => {
    const s = aSesion(rutina, perfil, [], { date: '2026-03-17' })
    expect(s.exercises[0].plan.sets).toBe(4)
    expect(s.exercises[0].plan.reps).toBe('8-12')
    expect(s.exercises[0].logs).toHaveLength(4)
  })

  it('el peso lo pone la progresión, no la rutina', () => {
    const s = aSesion(rutina, perfil, [], { date: '2026-03-17' })
    // Sin historial, la app sugiere de su propio cálculo; lo importante es que
    // haya salido de ahí y no del kilaje congelado en la rutina.
    expect(s.exercises[0].plan.weightKg).toBeDefined()
  })

  it('trae la referencia de la última vez de cada ejercicio', () => {
    const historia = [sesion([press])]
    const s = aSesion(rutina, perfil, historia, { date: '2026-03-17' })
    expect(s.exercises[0].previous?.date).toBe('2026-03-10')
    expect(s.exercises[0].previous?.series).toHaveLength(2)
  })

  it('conserva las superseries al repetirla', () => {
    const encadenada = desdeSesion(sesion(encadenarConSiguiente([press, remo], 0)), 'Encadenada')
    const s = aSesion(encadenada, perfil, [], { date: '2026-03-17' })
    expect(gruposDe(s.exercises)).toHaveLength(1)
  })

  it('un ejercicio que ya no está en el catálogo no rompe la rutina', () => {
    const rara: Routine = {
      ...rutina,
      exercises: [
        {
          exerciseId: 'ejercicio_que_no_existe',
          name: 'Invento',
          primary: 'pecho',
          plan: { sets: 3, reps: '10' }
        }
      ]
    }
    const s = aSesion(rara, perfil, [], { date: '2026-03-17' })
    expect(s.exercises).toHaveLength(1)
    expect(s.exercises[0].logs).toHaveLength(3)
  })
})

describe('carpetas y nombres', () => {
  const r = (id: string, name: string, folder?: string): Routine => ({
    id,
    name,
    folder,
    kind: 'fuerza',
    exercises: [],
    createdAt: 1
  })

  it('agrupa por carpeta y deja las sueltas al final', () => {
    const carpetas = carpetasDe([
      r('1', 'Torso', 'Casa'),
      r('2', 'Pierna'),
      r('3', 'Espalda', 'Gimnasio'),
      r('4', 'Brazo', 'Casa')
    ])
    expect(carpetas.map((c) => c.nombre)).toEqual(['Casa', 'Gimnasio', undefined])
    expect(carpetas[0].rutinas.map((x) => x.name)).toEqual(['Brazo', 'Torso'])
    expect(carpetas[2].rutinas.map((x) => x.name)).toEqual(['Pierna'])
  })

  it('sin carpetas no inventa ninguna', () => {
    expect(carpetasDe([r('1', 'Torso')])).toEqual([{ rutinas: [r('1', 'Torso')] }])
    expect(carpetasDe([])).toEqual([])
  })

  it('lista los nombres de carpeta que ya existen', () => {
    expect(nombresDeCarpeta([r('1', 'A', 'Casa'), r('2', 'B'), r('3', 'C', 'Casa')])).toEqual([
      'Casa'
    ])
  })

  it('no deja dos rutinas con el mismo nombre', () => {
    const ya = [r('1', 'Torso'), r('2', 'Torso 2')]
    expect(nombreLibre(ya, 'Pierna')).toBe('Pierna')
    expect(nombreLibre(ya, 'Torso')).toBe('Torso 3')
    // Renombrar una rutina con su propio nombre no la considera un choque.
    expect(nombreLibre(ya, 'Torso', '1')).toBe('Torso')
  })

  it('describe la rutina en una línea', () => {
    const rut = desdeSesion(sesion([press, remo]), 'Empuje y tirón')
    const texto = describirRutina(rut)
    expect(texto).toContain('2 ejercicios')
    expect(texto).toContain('7 series')
    expect(texto.toLowerCase()).toContain('pecho')
  })
})
