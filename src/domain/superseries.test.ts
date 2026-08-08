import { describe, expect, it } from 'vitest'
import {
  deshacerGrupo,
  desencadenar,
  describirGrupo,
  encadenarConSiguiente,
  etiquetaDe,
  gruposDe,
  moverBloque,
  ordenarGrupos,
  puedeEncadenar,
  puedeMover,
  siguePrevio,
  siguientePaso
} from './superseries'
import type { PlannedExercise } from './types'

function ej(id: string, series = 3, extra: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    exerciseId: id,
    name: id,
    primary: 'pecho',
    plan: { sets: series, reps: '8-10', restSeconds: 90 },
    logs: Array.from({ length: series }, () => ({ done: false })),
    ...extra
  }
}

const opts = {
  descanso: (pe: PlannedExercise) => pe.plan.restSeconds,
  entreEjercicios: 120
}

describe('formar y deshacer grupos', () => {
  it('encadena un ejercicio con el de abajo', () => {
    const lista = encadenarConSiguiente([ej('a'), ej('b'), ej('c')], 0)
    expect(lista[0].supersetId).toBeTruthy()
    expect(lista[1].supersetId).toBe(lista[0].supersetId)
    expect(lista[2].supersetId).toBeUndefined()
    expect(gruposDe(lista)).toHaveLength(1)
  })

  it('añadir un tercero amplía el grupo en vez de partirlo', () => {
    let lista = encadenarConSiguiente([ej('a'), ej('b'), ej('c')], 0)
    lista = encadenarConSiguiente(lista, 1)
    expect(gruposDe(lista)[0].indices).toEqual([0, 1, 2])
    expect(new Set(lista.map((e) => e.supersetId)).size).toBe(1)
  })

  it('unir dos grupos los funde en uno solo', () => {
    let lista = encadenarConSiguiente([ej('a'), ej('b'), ej('c'), ej('d')], 0)
    lista = encadenarConSiguiente(lista, 2)
    expect(gruposDe(lista)).toHaveLength(2)
    lista = encadenarConSiguiente(lista, 1)
    const grupos = gruposDe(lista)
    expect(grupos).toHaveLength(1)
    expect(grupos[0].indices).toEqual([0, 1, 2, 3])
  })

  it('el cardio no se encadena', () => {
    const lista = [ej('pesas'), ej('bici', 1, { primary: 'cardio' })]
    expect(puedeEncadenar(lista, 0)).toBe(false)
    expect(encadenarConSiguiente(lista, 0)).toBe(lista)
  })

  it('sacar a uno de tres deja el grupo en pie', () => {
    let lista = encadenarConSiguiente([ej('a'), ej('b'), ej('c')], 0)
    lista = encadenarConSiguiente(lista, 1)
    lista = desencadenar(lista, 2)
    expect(gruposDe(lista)[0].indices).toEqual([0, 1])
    expect(lista[2].supersetId).toBeUndefined()
  })

  it('sacar a uno de dos deshace la superserie: uno solo no es un grupo', () => {
    const lista = desencadenar(encadenarConSiguiente([ej('a'), ej('b')], 0), 0)
    expect(lista.every((e) => e.supersetId === undefined)).toBe(true)
    expect(gruposDe(lista)).toHaveLength(0)
  })

  it('deshacer el grupo libera a todos sus miembros', () => {
    let lista = encadenarConSiguiente([ej('a'), ej('b'), ej('c')], 0)
    lista = encadenarConSiguiente(lista, 1)
    lista = deshacerGrupo(lista, 1)
    expect(lista.every((e) => e.supersetId === undefined)).toBe(true)
  })

  it('un id compartido por uno solo no cuenta como superserie', () => {
    const lista = [ej('a', 3, { supersetId: 'ss1' }), ej('b')]
    expect(gruposDe(lista)).toHaveLength(0)
    expect(etiquetaDe(lista, 0)).toBeUndefined()
  })

  it('arrima a los miembros separados para que el grupo quede seguido', () => {
    const suelto = [ej('a', 3, { supersetId: 'ss1' }), ej('b'), ej('c', 3, { supersetId: 'ss1' })]
    const lista = ordenarGrupos(suelto)
    expect(lista.map((e) => e.exerciseId)).toEqual(['a', 'c', 'b'])
  })
})

describe('etiquetas', () => {
  it('numera dentro del grupo y pone letra por grupo', () => {
    let lista = encadenarConSiguiente([ej('a'), ej('b'), ej('c'), ej('d')], 0)
    lista = encadenarConSiguiente(lista, 2)
    expect(etiquetaDe(lista, 0)).toBe('A1')
    expect(etiquetaDe(lista, 1)).toBe('A2')
    expect(etiquetaDe(lista, 2)).toBe('B1')
    expect(etiquetaDe(lista, 3)).toBe('B2')
  })

  it('sabe cuál va pegado al de arriba', () => {
    const lista = encadenarConSiguiente([ej('a'), ej('b')], 0)
    expect(siguePrevio(lista, 0)).toBe(false)
    expect(siguePrevio(lista, 1)).toBe(true)
  })

  it('describe el grupo con sus vueltas', () => {
    const lista = encadenarConSiguiente([ej('press', 3), ej('remo', 3)], 0)
    const texto = describirGrupo(lista, gruposDe(lista)[0])
    expect(texto).toContain('press')
    expect(texto).toContain('remo')
    expect(texto).toContain('3 vueltas')
  })
})

describe('qué toca después de marcar una serie', () => {
  it('sin superserie: descanso entre series, y entre ejercicios al acabar', () => {
    const lista = [ej('a', 2), ej('b', 2)]
    expect(siguientePaso(lista, 0, 0, opts)).toMatchObject({ tipo: 'descanso', seconds: 90 })
    expect(siguientePaso(lista, 0, 1, opts)).toMatchObject({
      tipo: 'descanso',
      seconds: 120,
      nombre: 'b'
    })
    // Tras la última serie del último ejercicio no queda nada que preparar.
    expect(siguientePaso(lista, 1, 1, opts)).toBeNull()
  })

  it('en superserie: salta al siguiente del grupo sin descanso', () => {
    const lista = encadenarConSiguiente([ej('a', 3), ej('b', 3)], 0)
    expect(siguientePaso(lista, 0, 0, opts)).toEqual({
      tipo: 'encadena',
      exercise: 1,
      set: 0,
      nombre: 'b'
    })
  })

  it('al cerrar la vuelta se descansa y se vuelve al primero del grupo', () => {
    const lista = encadenarConSiguiente([ej('a', 3), ej('b', 3)], 0)
    expect(siguientePaso(lista, 1, 0, opts)).toMatchObject({
      tipo: 'descanso',
      seconds: 90,
      exercise: 0,
      set: 1,
      nombre: 'a'
    })
  })

  it('recorre las tres posiciones de un grupo de tres antes de descansar', () => {
    let lista = encadenarConSiguiente([ej('a', 2), ej('b', 2), ej('c', 2)], 0)
    lista = encadenarConSiguiente(lista, 1)
    expect(siguientePaso(lista, 0, 0, opts)).toMatchObject({ tipo: 'encadena', exercise: 1 })
    expect(siguientePaso(lista, 1, 0, opts)).toMatchObject({ tipo: 'encadena', exercise: 2 })
    expect(siguientePaso(lista, 2, 0, opts)).toMatchObject({ tipo: 'descanso', exercise: 0, set: 1 })
  })

  it('salta al que aún tenga esa vuelta cuando uno del grupo tiene menos series', () => {
    let lista = encadenarConSiguiente([ej('a', 3), ej('b', 1), ej('c', 3)], 0)
    lista = encadenarConSiguiente(lista, 1)
    // En la segunda vuelta, «b» ya no tiene serie: se pasa de largo hasta «c».
    expect(siguientePaso(lista, 0, 1, opts)).toMatchObject({ tipo: 'encadena', exercise: 2, set: 1 })
  })

  it('acabado el grupo, descanso entre ejercicios hacia el que viene detrás', () => {
    const lista = [...encadenarConSiguiente([ej('a', 1), ej('b', 1)], 0), ej('c', 2)]
    expect(siguientePaso(lista, 1, 0, opts)).toMatchObject({
      tipo: 'descanso',
      seconds: 120,
      exercise: 2,
      nombre: 'c'
    })
  })

  it('acabado el último grupo de la sesión, no queda nada', () => {
    const lista = encadenarConSiguiente([ej('a', 1), ej('b', 1)], 0)
    expect(siguientePaso(lista, 1, 0, opts)).toBeNull()
  })

  it('el cardio no arranca descansos', () => {
    const lista = [ej('bici', 1, { primary: 'cardio' }), ej('a', 2)]
    expect(siguientePaso(lista, 0, 0, opts)).toBeNull()
  })
})

describe('reordenar por bloques', () => {
  it('mueve la superserie entera, no a uno de sus miembros', () => {
    const lista = [...encadenarConSiguiente([ej('a'), ej('b')], 0), ej('c')]
    const movida = moverBloque(lista, 0, 1)
    expect(movida.map((e) => e.exerciseId)).toEqual(['c', 'a', 'b'])
    // Y el grupo sigue entero y seguido.
    expect(gruposDe(movida)[0].indices).toEqual([1, 2])
  })

  it('un ejercicio suelto salta por encima del grupo completo', () => {
    const lista = [ej('c'), ...encadenarConSiguiente([ej('a'), ej('b')], 0)]
    const movida = moverBloque(lista, 0, 1)
    expect(movida.map((e) => e.exerciseId)).toEqual(['a', 'b', 'c'])
  })

  it('conserva las series ya anotadas al reordenar', () => {
    const lista = [
      ej('a', 2, { logs: [{ done: true, reps: 10, weightKg: 40 }, { done: false }] }),
      ej('b')
    ]
    const movida = moverBloque(lista, 0, 1)
    expect(movida[1].logs?.[0]).toEqual({ done: true, reps: 10, weightKg: 40 })
  })

  it('no se sale de los bordes', () => {
    const lista = [ej('a'), ej('b')]
    expect(puedeMover(lista, 0, -1)).toBe(false)
    expect(puedeMover(lista, 1, 1)).toBe(false)
    expect(moverBloque(lista, 0, -1)).toBe(lista)
  })
})
