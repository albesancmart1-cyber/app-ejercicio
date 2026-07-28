import { describe, expect, it } from 'vitest'
import {
  HEURISTICAS,
  VERSION_ACTUAL,
  inferirPorNombre,
  migrar,
  migrarEjercicio,
  musculosDesconocidos,
  pendientesDeRevisar
} from './migrate'
import { CONTRIBUTIONS } from '../data/contributions'
import { ALL_MUSCLES } from '../domain/muscles'
import { weeklyMuscleVolume } from '../domain/volume'
import type { AppData, PlannedExercise, Session } from '../domain/types'

const HOY = '2026-07-27'

function viejo(exerciseId: string, name: string, primary: PlannedExercise['primary'] = 'brazo'): PlannedExercise {
  return {
    exerciseId,
    name,
    primary,
    plan: { sets: 3, reps: '8-12', rir: 2 },
    done: true,
    logs: [{ done: true }, { done: true }, { done: true }]
  }
}

function datos(exercises: PlannedExercise[]): AppData {
  const s: Session = { id: 's', date: HOY, kind: 'fuerza', title: 't', completed: true, exercises }
  return { version: 1, profile: null, checkIns: [], sessions: [s], measurements: [] }
}

describe('migración de la taxonomía vieja a la nueva', () => {
  it('sube la versión y no pierde nada de lo que había', () => {
    const antes = datos([viejo('curl_biceps', 'Curl de bíceps')])
    const { data } = migrar(antes)
    expect(data.version).toBe(VERSION_ACTUAL)
    const pe = data.sessions[0].exercises[0]
    // Los campos viejos siguen ahí: se puede revertir.
    expect(pe.primary).toBe('brazo')
    expect(pe.logs).toHaveLength(3)
    expect(pe.plan).toEqual(antes.sessions[0].exercises[0].plan)
  })

  it('los ejercicios del catálogo cogen su mapa escrito a mano, sin marcar', () => {
    const { data, paraRevisar } = migrar(datos([viejo('press_banca_barra', 'Press de banca')]))
    const pe = data.sessions[0].exercises[0]
    expect(pe.muscleContributions).toEqual(CONTRIBUTIONS.press_banca_barra)
    expect(pe.needsReview).toBeUndefined()
    expect(paraRevisar).toBe(0)
  })

  it('los que ya no están en el catálogo se deducen del nombre y se marcan', () => {
    const { data, paraRevisar } = migrar(datos([viejo('press_banca_viejo_id', 'Press de banca con barra')]))
    const pe = data.sessions[0].exercises[0]
    expect(pe.muscleContributions).toEqual({
      pectoral_mayor: 1,
      triceps_braquial: 0.5,
      deltoides_anterior: 0.5
    })
    expect(pe.needsReview).toBe(true)
    expect(paraRevisar).toBe(1)
  })

  it('lo que no encaja en ninguna heurística se marca pero no se inventa', () => {
    const { data } = migrar(datos([viejo('xyz', 'Ejercicio rarísimo de la abuela')]))
    const pe = data.sessions[0].exercises[0]
    expect(pe.muscleContributions).toBeUndefined()
    expect(pe.needsReview).toBe(true)
  })

  it('el cardio no se marca para revisar: no tiene series que contar', () => {
    const bici: PlannedExercise = {
      exerciseId: 'bici_media',
      name: 'Bici a ritmo medio',
      primary: 'cardio',
      plan: { sets: 1, reps: '30 min' },
      logs: [{ done: true }]
    }
    const { data, paraRevisar } = migrar(datos([bici]))
    expect(data.sessions[0].exercises[0].needsReview).toBeUndefined()
    expect(paraRevisar).toBe(0)
  })

  it('es idempotente: pasarla dos veces no cambia nada', () => {
    const primera = migrar(datos([viejo('curl_biceps', 'Curl de bíceps')]))
    const segunda = migrar(primera.data)
    expect(segunda.data).toEqual(primera.data)
    expect(segunda.migrados).toBe(0)
  })

  it('el histórico migrado se puede contar con el motor nuevo', () => {
    const { data } = migrar(
      datos([viejo('extension_triceps', 'Extensión de tríceps'), viejo('curl_biceps', 'Curl de bíceps')])
    )
    const v = weeklyMuscleVolume(data.sessions, HOY)
    // Antes las seis series eran «brazo»; ahora son tres y tres.
    expect(v.triceps_braquial).toBe(3)
    expect(v.biceps_braquial).toBe(3)
  })

  it('deja lista la lista de lo que hay que confirmar', () => {
    const { data } = migrar(
      datos([viejo('raro_1', 'Press de banca antiguo'), viejo('raro_1', 'Press de banca antiguo')])
    )
    const pendientes = pendientesDeRevisar(data)
    expect(pendientes).toEqual([{ exerciseId: 'raro_1', name: 'Press de banca antiguo', veces: 2 }])
  })
})

describe('las heurísticas por nombre', () => {
  const casos: [string, string][] = [
    ['Curl femoral tumbado', 'isquiosurales'],
    ['Peso muerto rumano', 'isquiosurales'],
    ['Sentadilla trasera', 'cuadriceps'],
    ['Extensión de cuádriceps', 'cuadriceps'],
    ['Elevación de talones de pie', 'gastrocnemio'],
    ['Dominadas con lastre', 'dorsal_ancho'],
    ['Remo Pendlay', 'espalda_alta'],
    ['Encogimientos de hombros', 'trapecio_superior'],
    ['Hiperextensiones', 'erectores_espinales'],
    ['Aperturas en banco plano', 'pectoral_mayor'],
    ['Press de banca declinado', 'pectoral_mayor'],
    ['Elevaciones laterales con cable', 'deltoides_lateral'],
    ['Elevaciones frontales', 'deltoides_anterior'],
    ['Press militar sentado', 'deltoides_anterior'],
    ['Fondos en paralelas', 'triceps_braquial'],
    ['Press francés con barra Z', 'triceps_braquial'],
    ['Curl de muñeca', 'antebrazo'],
    ['Curl martillo', 'biceps_braquial'],
    ['Plancha lateral', 'oblicuos'],
    ['Crunch abdominal', 'recto_abdominal'],
    ['Face pull', 'deltoides_posterior']
  ]

  for (const [nombre, esperado] of casos) {
    it(`«${nombre}» → ${esperado}`, () => {
      const aporte = inferirPorNombre(nombre)
      expect(aporte, nombre).not.toBeNull()
      expect(Object.keys(aporte!), nombre).toContain(esperado)
    })
  }

  it('el orden importa: «curl femoral» no cae en el bíceps', () => {
    expect(inferirPorNombre('Curl femoral')).toEqual({ isquiosurales: 1 })
    expect(inferirPorNombre('Curl de bíceps')).toEqual({ biceps_braquial: 1 })
  })

  it('un nombre sin sentido no se fuerza', () => {
    expect(inferirPorNombre('Movimiento innombrable')).toBeNull()
  })

  it('ninguna heurística cita un músculo que no existe', () => {
    for (const { patron, aporte } of HEURISTICAS) {
      expect(musculosDesconocidos(aporte), String(patron)).toEqual([])
    }
  })

  it('toda heurística deja al menos un motor primario', () => {
    for (const { patron, aporte } of HEURISTICAS) {
      expect(Object.values(aporte), String(patron)).toContain(1)
    }
  })
})

describe('la integridad del modelo', () => {
  it('ningún mapa del catálogo cita músculos inexistentes', () => {
    for (const [id, aporte] of Object.entries(CONTRIBUTIONS)) {
      expect(musculosDesconocidos(aporte), id).toEqual([])
    }
  })

  it('los músculos no se repiten entre sí', () => {
    expect(new Set(ALL_MUSCLES).size).toBe(ALL_MUSCLES.length)
  })
})
