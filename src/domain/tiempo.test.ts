import { describe, expect, it } from 'vitest'
import {
  MINUTOS_DISPONIBLES,
  SEGUNDOS_POR_SERIE,
  ajustarATiempo,
  duracionEstimada,
  explicarRecorte,
  sePuedenEncadenar
} from './tiempo'
import { gruposDe } from './superseries'
import { DESCANSO_ENTRE_EJERCICIOS } from './protocol'
import type { MuscleGroup, PlannedExercise } from './types'

function ej(
  id: string,
  primary: MuscleGroup,
  sets = 3,
  extra: Partial<PlannedExercise> = {}
): PlannedExercise {
  return {
    exerciseId: id,
    name: id,
    primary,
    plan: { sets, reps: '8-12', restSeconds: 90 },
    ...extra
  }
}

const opts = { descanso: (pe: PlannedExercise) => pe.plan.restSeconds }

describe('cuánto dura la sesión', () => {
  it('cuenta series, descansos entre ellas y el salto al siguiente ejercicio', () => {
    // Un ejercicio de 3×90 s: 3 series y 2 descansos.
    const uno = duracionEstimada([ej('a', 'pecho', 3)], opts)
    expect(uno).toBe(Math.round((3 * SEGUNDOS_POR_SERIE + 2 * 90) / 60))

    // Dos: lo de arriba por dos, más el descanso entre ejercicios.
    const dos = duracionEstimada([ej('a', 'pecho', 3), ej('b', 'espalda', 3)], opts)
    expect(dos).toBe(
      Math.round((2 * (3 * SEGUNDOS_POR_SERIE + 2 * 90) + DESCANSO_ENTRE_EJERCICIOS) / 60)
    )
  })

  it('encadenar acorta: es lo que hace que una superserie sea útil', () => {
    const sueltos = [ej('a', 'pecho', 3), ej('b', 'espalda', 3)]
    const juntos = sueltos.map((e) => ({ ...e, supersetId: 'ss1' }))
    expect(duracionEstimada(juntos, opts)).toBeLessThan(duracionEstimada(sueltos, opts))
  })

  it('el cardio suma sus minutos y no sus series', () => {
    const conCardio = duracionEstimada([ej('a', 'pecho', 3)], { ...opts, cardioMinutos: 20 })
    const sinCardio = duracionEstimada([ej('a', 'pecho', 3)], opts)
    expect(conCardio - sinCardio).toBe(20)
  })

  it('una sesión vacía dura cero', () => {
    expect(duracionEstimada([], opts)).toBe(0)
  })
})

describe('qué se puede encadenar', () => {
  it('dos grupos distintos, sí', () => {
    expect(sePuedenEncadenar(ej('press', 'pecho'), ej('remo', 'espalda'))).toBe(true)
  })

  it('dos del mismo grupo, no: el segundo llegaría a medias', () => {
    expect(sePuedenEncadenar(ej('press', 'pecho'), ej('aperturas', 'pecho'))).toBe(false)
  })

  it('el cardio no se encadena', () => {
    expect(sePuedenEncadenar(ej('bici', 'cardio', 1), ej('press', 'pecho'))).toBe(false)
  })

  it('lo que ya está en una superserie no se vuelve a encadenar', () => {
    const ya = ej('press', 'pecho', 3, { supersetId: 'ss1' })
    expect(sePuedenEncadenar(ya, ej('remo', 'espalda'))).toBe(false)
  })
})

describe('ajustar al tiempo disponible', () => {
  it('si ya cabe, no toca nada', () => {
    const lista = [ej('a', 'pecho', 3)]
    const r = ajustarATiempo(lista, 60, opts)
    expect(r.ajustes).toHaveLength(0)
    expect(r.exercises.map((e) => e.plan.sets)).toEqual([3])
    expect(r.seQuedaLargo).toBe(false)
  })

  it('primero encadena y solo después recorta series', () => {
    // Tres de cuatro series son unos 24 minutos: con quince hay que ajustar sí
    // o sí, que es lo que esta prueba quiere observar.
    const lista = [ej('a', 'pecho', 4), ej('b', 'espalda', 4), ej('c', 'hombro', 4)]
    const r = ajustarATiempo(lista, 15, opts)
    expect(r.ajustes.some((a) => a.tipo === 'superserie')).toBe(true)
    // Y encadenar debe haber pasado antes que quitar la primera serie.
    const primerRecorte = r.ajustes.findIndex((a) => a.tipo === 'serie')
    const primerEncadenado = r.ajustes.findIndex((a) => a.tipo === 'superserie')
    if (primerRecorte !== -1) expect(primerEncadenado).toBeLessThan(primerRecorte)
  })

  it('las parejas que forma no repiten grupo muscular', () => {
    const lista = [
      ej('press', 'pecho', 4),
      ej('aperturas', 'pecho', 4),
      ej('remo', 'espalda', 4),
      ej('curl', 'brazo', 4)
    ]
    const r = ajustarATiempo(lista, 25, opts)
    for (const g of gruposDe(r.exercises)) {
      const grupos = g.indices.map((i) => r.exercises[i].primary)
      expect(new Set(grupos).size, `una superserie repite grupo: ${grupos}`).toBe(grupos.length)
    }
  })

  it('recorta por donde más volumen se lleva ya, no por el final', () => {
    // «press» tiene el pectoral cargadísimo esta semana; «sentadilla» va a cero.
    const lista = [
      ej('press_banca_mancuernas', 'pecho', 4),
      ej('sentadilla_goblet', 'cuadriceps_gluteo', 4)
    ]
    // Identificadores reales: así el reparto muscular sale del catálogo de
    // verdad y la prueba no depende de datos inventados.
    // Seis minutos: encadenarlos los deja en nueve, así que hay que recortar
    // series por fuerza y se ve por dónde empieza.
    const r = ajustarATiempo(lista, 6, {
      ...opts,
      volumenSemanal: { pectoral_medio: 30, pectoral_inferior: 30, cuadriceps: 0 } as never
    })
    const press = r.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')!
    const sentadilla = r.exercises.find((e) => e.exerciseId === 'sentadilla_goblet')!
    expect(press.plan.sets).toBeLessThan(sentadilla.plan.sets)
  })

  it('nunca baja de dos series: por debajo deja de ser trabajo', () => {
    const lista = [ej('a', 'pecho', 4), ej('b', 'espalda', 4)]
    const r = ajustarATiempo(lista, 1, opts)
    for (const e of r.exercises) expect(e.plan.sets).toBeGreaterThanOrEqual(2)
  })

  it('si no llega, lo dice en vez de mentir sobre la duración', () => {
    const lista = [ej('a', 'pecho', 4), ej('b', 'espalda', 4), ej('c', 'hombro', 4)]
    const r = ajustarATiempo(lista, 1, opts)
    expect(r.seQuedaLargo).toBe(true)
    expect(r.minutos).toBeGreaterThan(1)
  })

  it('el resultado cabe de verdad en el presupuesto', () => {
    for (const minutos of MINUTOS_DISPONIBLES) {
      const lista = [
        ej('a', 'pecho', 4),
        ej('b', 'espalda', 4),
        ej('c', 'hombro', 3),
        ej('d', 'brazo', 3)
      ]
      const r = ajustarATiempo(lista, minutos, opts)
      if (!r.seQuedaLargo) expect(r.minutos, `con ${minutos} min`).toBeLessThanOrEqual(minutos)
    }
  })

  it('no toca la lista original', () => {
    const lista = [ej('a', 'pecho', 4), ej('b', 'espalda', 4)]
    ajustarATiempo(lista, 10, opts)
    expect(lista.map((e) => e.plan.sets)).toEqual([4, 4])
    expect(lista.every((e) => e.supersetId === undefined)).toBe(true)
  })

  it('el cardio no se recorta ni se encadena', () => {
    const lista = [ej('bici', 'cardio', 1), ej('a', 'pecho', 4)]
    const r = ajustarATiempo(lista, 10, { ...opts, cardioMinutos: 20 })
    const cardio = r.exercises.find((e) => e.primary === 'cardio')!
    expect(cardio.plan.sets).toBe(1)
    expect(cardio.supersetId).toBeUndefined()
  })
})

describe('cómo se cuenta el ajuste', () => {
  it('sin ajustes dice que cabe entero', () => {
    const r = ajustarATiempo([ej('a', 'pecho', 3)], 60, opts)
    expect(explicarRecorte(r)).toMatch(/cabe entero/i)
  })

  it('con ajustes dice de cuánto a cuánto y qué ha hecho', () => {
    const r = ajustarATiempo([ej('a', 'pecho', 4), ej('b', 'espalda', 4)], 15, opts)
    const texto = explicarRecorte(r)
    expect(texto).toContain(`${r.minutosAntes}`)
    expect(texto).toContain(`${r.minutos}`)
  })
})
