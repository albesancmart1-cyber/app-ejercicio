import { describe, expect, it } from 'vitest'
import {
  MI_MATERIAL,
  SIN_MATERIAL,
  conCuerpo,
  describirLocalizacion,
  guardarLocalizacion,
  localizacionPorId,
  localizacionesDe,
  nombreLibreDeSitio,
  perfilEn,
  type Localizacion
} from './localizaciones'
import { hasEquipment } from './workoutBuilder'
import { exerciseById } from '../data/exercises'
import type { Profile } from './types'

const perfil: Profile = {
  name: 'Alberto',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'mancuernas', 'banco'],
  maxWeights: { mancuernas: 24 }
}

const gimnasio: Localizacion = {
  id: 'gim',
  nombre: 'Gimnasio',
  equipment: ['barra', 'polea', 'mancuernas'],
  maxWeights: { mancuernas: 50 }
}

describe('la lista de sitios', () => {
  it('siempre ofrece el material del perfil el primero y el cuerpo el último', () => {
    const todas = localizacionesDe(perfil)
    expect(todas[0].id).toBe(MI_MATERIAL)
    expect(todas[todas.length - 1].id).toBe(SIN_MATERIAL.id)
  })

  it('entrenar sin nada está disponible sin haberlo configurado', () => {
    // Es el caso que más veces salva un día, y pedir que se prevea el
    // imprevisto sería justo lo contrario de resolverlo.
    const todas = localizacionesDe({ ...perfil, locations: [] })
    expect(todas.some((l) => l.id === SIN_MATERIAL.id)).toBe(true)
  })

  it('los sitios propios van en medio', () => {
    const todas = localizacionesDe({ ...perfil, locations: [gimnasio] })
    expect(todas.map((l) => l.id)).toEqual([MI_MATERIAL, 'gim', SIN_MATERIAL.id])
  })

  it('un identificador desconocido cae en el material del perfil', () => {
    expect(localizacionPorId(perfil, 'no-existe').id).toBe(MI_MATERIAL)
    expect(localizacionPorId(perfil, undefined).id).toBe(MI_MATERIAL)
  })
})

describe('el perfil que ve el motor', () => {
  it('cambia el material y los topes por los del sitio', () => {
    const p = perfilEn(perfil, gimnasio)
    expect(p.equipment).toContain('barra')
    expect(p.equipment).not.toContain('banco')
    expect(p.maxWeights.mancuernas).toBe(50)
  })

  it('el cuerpo viaja siempre contigo, aunque el sitio no lo liste', () => {
    // Sin esta garantía, un sitio mal configurado dejaría a la app sin un solo
    // ejercicio que proponer.
    expect(perfilEn(perfil, gimnasio).equipment).toContain('peso_corporal')
    expect(conCuerpo([])).toEqual(['peso_corporal'])
    expect(conCuerpo(['barra'])).toContain('peso_corporal')
  })

  it('no toca nada más del perfil', () => {
    const p = perfilEn({ ...perfil, weightKg: 80 }, gimnasio)
    expect(p.name).toBe('Alberto')
    expect(p.goal).toBe('recomposicion')
    expect(p.weightKg).toBe(80)
  })

  it('en «solo mi cuerpo» el filtro de siempre deja fuera lo que necesita material', () => {
    const p = perfilEn(perfil, SIN_MATERIAL)
    const conBarra = exerciseById('sentadilla_barra')!
    const sinNada = exerciseById('sentadilla_corporal')!
    expect(hasEquipment(conBarra, p.equipment)).toBe(false)
    expect(hasEquipment(sinNada, p.equipment)).toBe(true)
  })
})

describe('cómo se cuenta un sitio', () => {
  it('enumera el material sin repetir el cuerpo', () => {
    expect(describirLocalizacion(gimnasio)).toBe('Barra y discos, polea y mancuernas')
  })

  it('sin material lo dice con todas las letras', () => {
    expect(describirLocalizacion(SIN_MATERIAL)).toMatch(/solo tu cuerpo/i)
  })

  it('con un solo equipo no inventa una lista', () => {
    expect(describirLocalizacion({ id: 'x', nombre: 'x', equipment: ['bandas'] })).toBe(
      'Bandas elásticas'
    )
  })
})

describe('crear y guardar sitios', () => {
  it('no deja dos sitios con el mismo nombre', () => {
    expect(nombreLibreDeSitio([gimnasio], 'Gimnasio')).toBe('Gimnasio 2')
    expect(nombreLibreDeSitio([gimnasio], 'Hotel')).toBe('Hotel')
  })

  it('un nombre en blanco no deja el sitio sin nombre', () => {
    expect(nombreLibreDeSitio([], '   ')).toBe('Sitio nuevo')
  })

  it('guardar uno que ya existe lo reemplaza en su sitio, no lo duplica', () => {
    const cambiado = { ...gimnasio, equipment: ['barra' as const] }
    const lista = guardarLocalizacion([gimnasio], cambiado)
    expect(lista).toHaveLength(1)
    expect(lista[0].equipment).toEqual(['barra'])
  })

  it('guardar uno nuevo lo añade al final', () => {
    const lista = guardarLocalizacion([gimnasio], { id: 'h', nombre: 'Hotel', equipment: [] })
    expect(lista.map((l) => l.id)).toEqual(['gim', 'h'])
  })
})
