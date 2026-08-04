import { describe, expect, it } from 'vitest'
import {
  MET,
  MINUTOS_MAXIMOS,
  MINUTOS_MINIMOS,
  explicarEquivalencia,
  metDe,
  minutosEquivalentes,
  opcionesDeCardio
} from './cardio'
import { EXERCISES } from '../data/exercises'
import type { Profile } from './types'

const perfil: Profile = {
  name: 'T',
  goal: 'recomposicion',
  equipment: ['peso_corporal', 'correr', 'bici'],
  maxWeights: {}
}

describe('el catálogo de cardio tiene su coste metabólico', () => {
  it('ninguna actividad de cardio se queda sin MET', () => {
    const sinMet = EXERCISES.filter((e) => e.primary === 'cardio' && !metDe(e.id))
    expect(sinMet.map((e) => e.id)).toEqual([])
  })

  it('y los valores están en el orden que dicta el sentido común', () => {
    expect(MET.movilidad).toBeLessThan(MET.caminar)
    expect(MET.caminar).toBeLessThan(MET.bici_suave)
    expect(MET.bici_suave).toBeLessThan(MET.trote_suave)
    expect(MET.caminar).toBeLessThan(MET.caminar_cuesta)
  })
})

describe('la misma dosis, con otra actividad', () => {
  it('andar lo que valen 35 minutos de trote es andar bastante más', () => {
    // 35 min × 7,0 MET = 245 MET-min; andando a 3,5 MET son 70 min.
    expect(minutosEquivalentes('trote_suave', 'caminar', 35)).toBe(70)
  })

  it('y al revés, trotar lo que vale un paseo largo es mucho menos rato', () => {
    expect(minutosEquivalentes('caminar', 'trote_suave', 70)).toBe(35)
  })

  it('la bici tranquila queda entre las dos', () => {
    const bici = minutosEquivalentes('trote_suave', 'bici_suave', 35)
    expect(bici).toBeGreaterThan(35)
    expect(bici).toBeLessThan(70)
  })

  it('la misma actividad no cambia nada', () => {
    expect(minutosEquivalentes('caminar', 'caminar', 25)).toBe(25)
  })

  it('se redondea a cinco minutos, que es como se piensa el tiempo', () => {
    for (const desde of Object.keys(MET)) {
      for (const hasta of Object.keys(MET)) {
        expect(minutosEquivalentes(desde, hasta, 33) % 5, `${desde}→${hasta}`).toBe(0)
      }
    }
  })

  it('nunca se va por debajo de diez minutos ni por encima de noventa', () => {
    expect(minutosEquivalentes('comba', 'movilidad', 60)).toBe(MINUTOS_MAXIMOS)
    expect(minutosEquivalentes('movilidad', 'comba', 10)).toBeGreaterThanOrEqual(MINUTOS_MINIMOS)
  })

  it('con una actividad que no está en la tabla, no inventa', () => {
    expect(minutosEquivalentes('press_banca_barra', 'caminar', 30)).toBe(30)
  })
})

describe('qué se ofrece cada día', () => {
  it('un día de cardio medio ofrece desde andar hasta trotar', () => {
    const ops = opcionesDeCardio(perfil, 'cardio_medio', 'trote_suave', 35)
    const ids = ops.map((o) => o.exercise.id)
    expect(ids).toContain('caminar')
    expect(ids).toContain('bici_suave')
    expect(ids).toContain('trote_suave')
  })

  it('y van de menos a más exigente', () => {
    const ops = opcionesDeCardio(perfil, 'cardio_medio', 'trote_suave', 35)
    const mets = ops.map((o) => metDe(o.exercise.id)!)
    expect([...mets].sort((a, b) => a - b)).toEqual(mets)
  })

  it('cada opción trae sus minutos equivalentes', () => {
    const ops = opcionesDeCardio(perfil, 'cardio_medio', 'trote_suave', 35)
    const andar = ops.find((o) => o.exercise.id === 'caminar')!
    const trote = ops.find((o) => o.exercise.id === 'trote_suave')!
    expect(trote.minutos).toBe(35)
    expect(trote.actual).toBe(true)
    expect(andar.minutos).toBe(70)
  })

  it('un descanso activo no ofrece salir a correr por muchas cuentas que salgan', () => {
    const ops = opcionesDeCardio(perfil, 'descanso_activo', 'caminar', 20)
    expect(ops.map((o) => o.exercise.id)).not.toContain('trote_suave')
    expect(ops.map((o) => o.exercise.id)).toContain('caminar')
  })

  it('pero si ya está puesta, no se esconde lo que el usuario eligió', () => {
    const ops = opcionesDeCardio(perfil, 'descanso_activo', 'trote_suave', 15)
    expect(ops.map((o) => o.exercise.id)).toContain('trote_suave')
  })

  it('solo se ofrece lo que se puede hacer con el material que hay', () => {
    const sinBici: Profile = { ...perfil, equipment: ['peso_corporal'] }
    const ids = opcionesDeCardio(sinBici, 'cardio_medio', 'caminar', 30).map((o) => o.exercise.id)
    expect(ids).not.toContain('bici_suave')
    expect(ids).not.toContain('remo_ergometro')
  })

  it('la movilidad no se ofrece como alternativa aeróbica', () => {
    // «85 min de estiramientos» no es una recomendación, es una cuenta.
    const ops = opcionesDeCardio(perfil, 'cardio_medio', 'trote_suave', 35)
    expect(ops.map((o) => o.exercise.id)).not.toContain('movilidad')
  })

  it('pero si es lo que toca hoy, ahí sigue', () => {
    const ops = opcionesDeCardio(perfil, 'descanso_activo', 'movilidad', 15)
    expect(ops.map((o) => o.exercise.id)).toContain('movilidad')
  })

  it('avisa cuando la equivalencia exacta no cabe en un día', () => {
    const ops = opcionesDeCardio(perfil, 'cardio_medio', 'comba', 60)
    const andar = ops.find((o) => o.exercise.id === 'caminar')!
    expect(andar.recortada).toBe(true)
    expect(andar.minutos).toBe(MINUTOS_MAXIMOS)
  })
})

describe('se explica antes de cambiar', () => {
  it('dice cuánto y por qué al pasar a algo más suave', () => {
    const texto = explicarEquivalencia('trote_suave', 'caminar', 35)!
    expect(texto).toContain('70 min')
    expect(texto.toLowerCase()).toContain('menos por minuto')
  })

  it('y al pasar a algo más exigente', () => {
    const texto = explicarEquivalencia('caminar', 'trote_suave', 70)!
    expect(texto).toContain('35 min')
    expect(texto.toLowerCase()).toContain('más por minuto')
  })

  it('cuando se recorta, lo reconoce en vez de disimularlo', () => {
    const texto = explicarEquivalencia('comba', 'movilidad', 60)!
    expect(texto).toMatch(/se iría a \d+ min/)
  })

  it('no dice nada de cambiar a lo mismo', () => {
    expect(explicarEquivalencia('caminar', 'caminar', 30)).toBeNull()
  })
})
