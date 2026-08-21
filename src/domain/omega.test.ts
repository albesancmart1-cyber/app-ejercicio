import { describe, expect, it } from 'vitest'
import {
  COBERTURA_MINIMA_FIABLE,
  cobertura,
  escribirMg,
  escribirRatio,
  omegasDeComida,
  omegasDeSuplementos,
  ratioDelDia,
  ratioFiable,
  resumirSuplemento,
  resumirToma
} from './omega'
import { OMEGA_POR_100 } from '../data/omegas'
import { ALIMENTOS } from '../data/alimentos'
import type { ComidaRegistrada, DiaDeComidas, Suplemento } from './types'

const NORDIC: Suplemento = { id: 'nordic', nombre: 'Omega-3 Nordic', dhaMg: 330, epaMg: 110 }
const SIN_OMEGAS: Suplemento = { id: 'magnesio', nombre: 'Magnesio' }

const comida = (extra: Partial<ComidaRegistrada> = {}): ComidaRegistrada => ({
  hora: '14:20',
  texto: 'Comida',
  ...extra
})

const dia = (comidas: ComidaRegistrada[]): DiaDeComidas => ({ date: '2026-08-21', comidas })

describe('el catálogo de omegas', () => {
  it('todos sus identificadores existen de verdad en el catálogo de alimentos', () => {
    const ids = new Set(ALIMENTOS.map((a) => a.id))
    const huerfanos = Object.keys(OMEGA_POR_100).filter((id) => !ids.has(id))
    expect(huerfanos).toEqual([])
  })

  it('no hay cifras negativas ni absurdas', () => {
    for (const [id, o] of Object.entries(OMEGA_POR_100)) {
      expect(o.o3, id).toBeGreaterThanOrEqual(0)
      expect(o.o6, id).toBeGreaterThanOrEqual(0)
      // Nada llega a 100 g por 100 g: eso sería el 100 % de grasa poliinsaturada.
      expect(o.o3, id).toBeLessThan(100000)
      expect(o.o6, id).toBeLessThan(100000)
    }
  })

  it('el pescado azul sale muy a favor del omega-3, y las semillas al revés', () => {
    expect(OMEGA_POR_100.caballa.o3 / OMEGA_POR_100.caballa.o6).toBeGreaterThan(10)
    expect(OMEGA_POR_100.pipas_girasol.o6 / OMEGA_POR_100.pipas_girasol.o3).toBeGreaterThan(100)
  })

  it('la lata en aceite le da la vuelta al atún, que es el aviso que importa', () => {
    expect(OMEGA_POR_100.atun_lata_natural.o3).toBeGreaterThan(OMEGA_POR_100.atun_lata_natural.o6)
    expect(OMEGA_POR_100.atun_lata_aceite.o6).toBeGreaterThan(OMEGA_POR_100.atun_lata_aceite.o3)
  })

  it('y el huevo es omega-6, aunque sorprenda', () => {
    expect(OMEGA_POR_100.huevo_cocido.o6).toBeGreaterThan(OMEGA_POR_100.huevo_cocido.o3 * 10)
  })
})

describe('los omegas de una comida', () => {
  it('escalan con los gramos', () => {
    const r = omegasDeComida(
      comida({ alimentos: [{ nombre: 'Sardinas', alimentoId: 'sardinas', gramos: 150 }] })
    )
    // 1 480 mg por 100 g × 1,5 = 2 220 mg.
    expect(r.omegas.o3).toBeCloseTo(2220, 6)
    expect(r.omegas.o6).toBeCloseTo(165, 6)
    expect(r.gramosConDato).toBe(150)
  })

  it('un alimento sin dato no cuenta, ni a favor ni en contra', () => {
    const r = omegasDeComida(
      comida({
        alimentos: [
          { nombre: 'Sardinas', alimentoId: 'sardinas', gramos: 100 },
          { nombre: 'Lechuga', alimentoId: 'lechuga', gramos: 200 }
        ]
      })
    )
    expect(r.omegas.o3).toBeCloseTo(1480, 6)
    expect(r.gramosConDato).toBe(100)
    expect(r.gramosApuntados).toBe(300) // pero sí se sabe que había 300 g
  })

  it('una comida solo de texto no aporta nada y no revienta', () => {
    const r = omegasDeComida(comida())
    expect(r.omegas).toEqual({ o3: 0, o6: 0 })
    expect(r.gramosApuntados).toBe(0)
  })
})

describe('el suplemento, que no es un alimento', () => {
  it('dos cápsulas suman su DHA y su EPA', () => {
    const o = omegasDeSuplementos([{ suplementoId: 'nordic', capsulas: 2 }], [NORDIC])
    expect(o.o3).toBe(880) // (330 + 110) × 2
    expect(o.o6).toBe(0)
  })

  it('admite media cápsula', () => {
    expect(omegasDeSuplementos([{ suplementoId: 'nordic', capsulas: 0.5 }], [NORDIC]).o3).toBe(220)
  })

  it('uno sin omegas declarados no aporta nada', () => {
    expect(omegasDeSuplementos([{ suplementoId: 'magnesio', capsulas: 1 }], [SIN_OMEGAS])).toEqual({
      o3: 0,
      o6: 0
    })
  })

  it('uno borrado no se cuenta, en vez de suponerle una dosis media', () => {
    expect(omegasDeSuplementos([{ suplementoId: 'fantasma', capsulas: 3 }], [NORDIC])).toEqual({
      o3: 0,
      o6: 0
    })
  })

  it('un número de cápsulas negativo no resta omegas', () => {
    expect(omegasDeSuplementos([{ suplementoId: 'nordic', capsulas: -5 }], [NORDIC]).o3).toBe(0)
  })
})

describe('el ratio del día, en sus tres versiones', () => {
  const almuerzo = comida({
    alimentos: [
      { nombre: 'Huevo frito', alimentoId: 'huevo_frito', gramos: 120 },
      { nombre: 'Aguacate', alimentoId: 'aguacate', gramos: 90 }
    ],
    suplementos: [{ suplementoId: 'nordic', capsulas: 2 }]
  })

  it('separa lo que viene de la comida de lo que viene del bote', () => {
    const r = ratioDelDia(dia([almuerzo]), [NORDIC])
    expect(r.suplemento.o3).toBe(880)
    expect(r.comida.o3).toBeGreaterThan(0)
    expect(r.total.o3).toBeCloseTo(r.comida.o3 + r.suplemento.o3, 6)
    expect(r.total.o6).toBeCloseTo(r.comida.o6 + r.suplemento.o6, 6)
  })

  it('y el suplemento mejora el ratio de verdad, que es de lo que se trata', () => {
    const r = ratioDelDia(dia([almuerzo]), [NORDIC])
    const vecesComida = r.comida.o6 / r.comida.o3
    const vecesTotal = r.total.o6 / r.total.o3
    expect(vecesTotal).toBeLessThan(vecesComida)
  })

  it('un día sin apuntar nada da ceros y no infinitos', () => {
    const r = ratioDelDia(undefined, [NORDIC])
    expect(r.total).toEqual({ o3: 0, o6: 0 })
    expect(escribirRatio(r.total)).toBe('—')
  })

  it('suma varias comidas del día', () => {
    const r = ratioDelDia(dia([almuerzo, almuerzo]), [NORDIC])
    expect(r.suplemento.o3).toBe(1760)
  })
})

describe('cómo se escribe el ratio', () => {
  it('normaliza el omega-3 a uno, que es como se habla de esto', () => {
    expect(escribirRatio({ o3: 1000, o6: 2400 })).toBe('1 : 2,4')
    expect(escribirRatio({ o3: 1000, o6: 1200 })).toBe('1 : 1,2')
  })

  it('le da la vuelta cuando gana el omega-3, para no escribir «1 : 0,4»', () => {
    expect(escribirRatio({ o3: 2500, o6: 1000 })).toBe('2,5 : 1')
  })

  it('sin datos, una raya y no un infinito', () => {
    expect(escribirRatio({ o3: 0, o6: 0 })).toBe('—')
  })

  it('y los casos de solo uno de los dos se dicen con palabras', () => {
    expect(escribirRatio({ o3: 0, o6: 500 })).toBe('solo omega 6')
    expect(escribirRatio({ o3: 500, o6: 0 })).toBe('solo omega 3')
  })
})

describe('la cobertura, para no exagerar', () => {
  it('es uno cuando todo lo apuntado tiene dato', () => {
    const r = ratioDelDia(
      dia([comida({ alimentos: [{ nombre: 'Sardinas', alimentoId: 'sardinas', gramos: 150 }] })]),
      []
    )
    expect(cobertura(r)).toBe(1)
    expect(ratioFiable(r)).toBe(true)
  })

  it('baja cuando la mitad del plato no tiene cifra, y entonces el ratio no es fiable', () => {
    const r = ratioDelDia(
      dia([
        comida({
          alimentos: [
            { nombre: 'Sardinas', alimentoId: 'sardinas', gramos: 50 },
            { nombre: 'Arroz', alimentoId: 'arroz', gramos: 200 }
          ]
        })
      ]),
      []
    )
    expect(cobertura(r)).toBeCloseTo(0.2, 6)
    expect(cobertura(r)).toBeLessThan(COBERTURA_MINIMA_FIABLE)
    expect(ratioFiable(r)).toBe(false)
  })

  it('sin nada apuntado la cobertura es cero y no una división por cero', () => {
    expect(cobertura(ratioDelDia(undefined, []))).toBe(0)
  })
})

describe('cómo se resume un suplemento', () => {
  it('en una línea, con lo que lleva', () => {
    expect(resumirSuplemento(NORDIC)).toBe('330 mg DHA · 110 mg EPA')
  })

  it('uno sin omegas lo dice en vez de fingir', () => {
    expect(resumirSuplemento(SIN_OMEGAS)).toBe('Sin omegas declarados')
  })

  it('y una toma dice cuántas cápsulas y cuánto suman', () => {
    expect(resumirToma({ suplementoId: 'nordic', capsulas: 2 }, NORDIC)).toBe(
      '2 cáps. · 660 mg DHA · 220 mg EPA'
    )
  })

  it('los miligramos con separador de miles español', () => {
    expect(escribirMg(660)).toBe('660 mg')
    expect(escribirMg(2200)).toBe('2200 mg')
  })
})
