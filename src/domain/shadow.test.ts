import { describe, expect, it } from 'vitest'
import {
  MUSCULOS_DEL_GRUPO,
  MUSCULOS_HUERFANOS,
  compararMotores,
  musculosDescuidados,
  resumirComparacion
} from './shadow'
import { ALL_MUSCLES, MUSCLES } from './muscles'
import { MUSCLE_GROUPS } from './types'
import type { PlannedExercise, Session } from './types'

const HOY = '2026-07-27'

function hecho(exerciseId: string, series: number): PlannedExercise {
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

describe('el mapa entre las dos taxonomías', () => {
  it('cada músculo cae en un grupo viejo como mucho', () => {
    for (const m of ALL_MUSCLES) {
      const grupos = Object.entries(MUSCULOS_DEL_GRUPO).filter(([, ms]) => ms.includes(m))
      expect(grupos.length, m).toBeLessThanOrEqual(1)
    }
  })

  it('todo grupo viejo salvo cardio tiene músculos', () => {
    for (const g of MUSCLE_GROUPS) {
      if (g === 'cardio') continue
      expect(MUSCULOS_DEL_GRUPO[g]?.length, g).toBeGreaterThan(0)
    }
  })

  it('los huérfanos son los que el modelo viejo no sabía nombrar', () => {
    // Gemelo y sóleo: por eso la app nunca ha propuesto trabajo de pantorrilla.
    expect([...MUSCULOS_HUERFANOS].sort()).toEqual(['gastrocnemio', 'soleo'])
  })
})

describe('el caso que motivó el refactor', () => {
  /** Solo empujes: el brazo sale «cubierto» pero es todo tríceps. */
  const soloEmpujes = [
    sesion('2026-07-26', [hecho('press_banca_barra', 4), hecho('press_militar_barra', 4)]),
    sesion('2026-07-24', [hecho('press_banca_mancuernas', 4), hecho('fondos_banco', 3)])
  ]

  it('el motor viejo da el brazo por cubierto', () => {
    const c = compararMotores(soloEmpujes, HOY)
    const brazo = c.falsosCubiertos.find((d) => d.grupo === 'brazo')
    expect(brazo, 'debería detectarse la divergencia en brazo').toBeDefined()
    expect(brazo!.seriesGrupo).toBeGreaterThanOrEqual(4)
  })

  it('y el nuevo ve que el bíceps está a cero mientras el tríceps va sobrado', () => {
    const c = compararMotores(soloEmpujes, HOY)
    const brazo = c.falsosCubiertos.find((d) => d.grupo === 'brazo')!
    const flojos = brazo.musculos.map((m) => m.muscle)
    expect(flojos).toContain('biceps_braquial')
    expect(flojos).not.toContain('triceps_braquial')
  })

  it('lo mismo con el hombro: todo deltoides anterior', () => {
    const c = compararMotores(soloEmpujes, HOY)
    const hombro = c.falsosCubiertos.find((d) => d.grupo === 'hombro')!
    const flojos = hombro.musculos.map((m) => m.muscle)
    expect(flojos).toContain('deltoides_lateral')
    expect(flojos).toContain('deltoides_posterior')
    expect(flojos).not.toContain('deltoides_anterior')
  })

  it('lo cuenta en una frase que se entiende', () => {
    const lineas = resumirComparacion(compararMotores(soloEmpujes, HOY))
    expect(lineas.join(' ')).toMatch(/sale cubierto con .* series, pero dentro/)
  })
})

describe('una semana equilibrada no genera ruido', () => {
  // Trabajo directo para cada músculo del brazo y del hombro.
  const equilibrada = [
    sesion('2026-07-26', [
      hecho('curl_biceps', 5),
      hecho('extension_triceps', 5),
      hecho('curl_inverso', 4),
      hecho('elevaciones_laterales', 5),
      hecho('pajaros', 5),
      hecho('press_militar_barra', 4)
    ])
  ]

  it('brazo y hombro dejan de aparecer como divergencia', () => {
    const c = compararMotores(equilibrada, HOY)
    const grupos = c.falsosCubiertos.map((d) => d.grupo)
    expect(grupos).not.toContain('brazo')
    expect(grupos).not.toContain('hombro')
  })
})

describe('el motor nuevo no restringe donde el viejo no restringía', () => {
  it('sin nada por encima del MRV no inventa sobrecargas', () => {
    const c = compararMotores([sesion(HOY, [hecho('curl_biceps', 6)])], HOY)
    expect(c.sobrecargasInvisibles).toEqual([])
  })

  it('detecta el exceso que al viejo se le escapa', () => {
    // 18 series directas de erectores: pasan su MRV (16) pero el grupo «espalda»
    // se queda en 18, por debajo del techo de 20 con el que frena el viejo.
    const c = compararMotores([sesion(HOY, [hecho('hiperextensiones', 18)])], HOY)
    const espalda = c.sobrecargasInvisibles.find((d) => d.grupo === 'espalda')
    expect(espalda, 'el viejo no frena y el nuevo sí debería verlo').toBeDefined()
    expect(espalda!.musculos.map((m) => m.muscle)).toContain('erectores_espinales')
  })

  it('lo que el viejo ya frena no se cuenta como divergencia', () => {
    // Con 20 el techo del motor viejo ya salta: los dos ven el problema.
    const c = compararMotores([sesion(HOY, [hecho('hiperextensiones', 20)])], HOY)
    expect(c.sobrecargasInvisibles.find((d) => d.grupo === 'espalda')).toBeUndefined()
    expect(c.falsasSaturaciones.find((d) => d.grupo === 'espalda')).toBeUndefined()
  })
})

describe('a quién priorizaría el motor nuevo', () => {
  it('ordena por déficit relativo, no por series absolutas', () => {
    // Deltoides anterior a 2 de 3 (falta un 33 %) frente a sóleo a 2 de 6 (67 %).
    const s = [sesion(HOY, [hecho('elevaciones_frontales', 2)])]
    const orden = musculosDescuidados(s, HOY).map((d) => d.muscle)
    expect(orden.indexOf('soleo')).toBeLessThan(orden.indexOf('deltoides_anterior'))
  })

  it('los que ya llegan al mínimo no aparecen', () => {
    const s = [sesion(HOY, [hecho('curl_biceps', 6)])]
    expect(musculosDescuidados(s, HOY).map((d) => d.muscle)).not.toContain('biceps_braquial')
  })

  it('con la semana entera cubierta la lista se vacía', () => {
    const todo = ALL_MUSCLES.filter((m) => m !== 'gastrocnemio' && m !== 'soleo')
    const s = [
      sesion(HOY, [
        hecho('curl_biceps', 8),
        hecho('extension_triceps', 8),
        hecho('curl_inverso', 8),
        hecho('elevaciones_laterales', 8),
        hecho('pajaros', 8),
        hecho('elevaciones_frontales', 8),
        hecho('press_banca_barra', 8),
        hecho('remo_barra', 8),
        hecho('dominadas', 8),
        hecho('encogimientos', 8),
        hecho('hiperextensiones', 8),
        hecho('sentadilla_barra', 8),
        hecho('peso_muerto_rumano', 8),
        hecho('sentadilla_sumo', 8),
        hecho('plancha', 8),
        hecho('plancha_lateral', 8)
      ])
    ]
    const pendientes = musculosDescuidados(s, HOY).map((d) => d.muscle)
    for (const m of todo) expect(pendientes, MUSCLES[m].label).not.toContain(m)
    // Salvo los que no tienen ejercicios en el catálogo.
    expect(pendientes.sort()).toEqual(['gastrocnemio', 'soleo'])
  })
})

describe('la comparación describe, no decide', () => {
  it('no toca las sesiones que recibe', () => {
    const s = [sesion(HOY, [hecho('curl_biceps', 4)])]
    const copia = JSON.parse(JSON.stringify(s))
    compararMotores(s, HOY)
    expect(s).toEqual(copia)
  })

  it('con la fase de déficit puesta usa los landmarks recortados', () => {
    // 14 series de tríceps: por debajo del MRV normal (30) pero por encima del
    // objetivo en déficit (12).
    const s = [sesion(HOY, [hecho('extension_triceps', 14)])]
    expect(compararMotores(s, HOY).sobrecargasInvisibles).toEqual([])
    const enDeficit = compararMotores(s, HOY, { deficit: true })
    expect(enDeficit.sobrecargasInvisibles.length).toBeGreaterThan(0)
  })
})
