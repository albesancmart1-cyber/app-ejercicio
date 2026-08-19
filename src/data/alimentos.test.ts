import { describe, expect, it } from 'vitest'
import { ALIMENTOS, alimentoResuelto, buscarAlimentos, escribirUnidades } from './alimentos'
import { CETOSIS_G, carbosDelDia, estadoDeCetosis } from '../domain/crononutricion'
import type { DiaDeComidas, EdicionAlimento } from '../domain/types'

describe('el catálogo', () => {
  it('es grande de verdad y sin ids repetidos', () => {
    expect(ALIMENTOS.length).toBeGreaterThan(180)
    expect(new Set(ALIMENTOS.map((x) => x.id)).size).toBe(ALIMENTOS.length)
  })

  it('todo lo etiquetado como carbohidrato trae sus gramos por 100 y su calidad', () => {
    const carbos = ALIMENTOS.filter((x) => x.etiquetas.includes('carbohidrato'))
    for (const x of carbos) {
      expect(x.carbosPor100, x.id).toBeGreaterThan(0)
      expect(x.carbo, `${x.id} sin calidad`).toBeDefined()
    }
  })

  it('los pescados azules llevan su etiqueta, y la merluza no', () => {
    for (const id of ['salmon', 'sardinas', 'boquerones', 'caballa', 'atun_filete']) {
      expect(alimentoResuelto(id)?.etiquetas, id).toContain('pescado_azul')
    }
    expect(alimentoResuelto('merluza')?.etiquetas).not.toContain('pescado_azul')
  })

  it('los curados llevan la sal: jamón serrano, cecina, anchoas', () => {
    for (const id of ['jamon_serrano', 'cecina', 'anchoas', 'bacon']) {
      expect(alimentoResuelto(id)?.etiquetas, id).toContain('salada')
    }
    expect(alimentoResuelto('ternera_filete')?.etiquetas).not.toContain('salada')
  })

  it('la fruta y la miel son carbohidrato bueno; los macarrones, malo', () => {
    expect(alimentoResuelto('melocoton')?.carbo).toBe('bueno')
    expect(alimentoResuelto('miel')?.carbo).toBe('bueno')
    expect(alimentoResuelto('pasta')?.carbo).toBe('malo')
    expect(alimentoResuelto('pan_blanco')?.carbo).toBe('malo')
  })

  it('nada procesado con nombre de plato: ni pizza ni adobados', () => {
    for (const x of ALIMENTOS) {
      expect(x.nombre.toLowerCase(), x.id).not.toMatch(/pizza|adobad|rebozad|nugget|salchicha de frankfurt/)
    }
  })
})

describe('el buscador', () => {
  it('encuentra sin tildes: «platano» da con el plátano', () => {
    expect(buscarAlimentos('platano')[0]?.id).toBe('platano')
    expect(buscarAlimentos('jamon')[0]?.nombre).toMatch(/Jamón/)
  })

  it('prefiere lo que empieza por lo escrito', () => {
    const r = buscarAlimentos('sal')
    expect(r[0].nombre).toMatch(/^Sal/)
  })

  it('busca por palabra interior: «cabra» encuentra el queso', () => {
    expect(buscarAlimentos('cabra').some((x) => x.id === 'queso_cabra')).toBe(true)
  })

  it('con menos de dos letras no marea', () => {
    expect(buscarAlimentos('s')).toEqual([])
  })

  it('devuelve pocos: es un buscador, no un paseo', () => {
    expect(buscarAlimentos('de').length).toBeLessThanOrEqual(8)
  })
})

describe('las ediciones del usuario', () => {
  it('pisan campo a campo sin borrar lo demás', () => {
    const ed: EdicionAlimento[] = [{ id: 'queso_cabra', etiquetas: ['proteina', 'salada'] }]
    const res = alimentoResuelto('queso_cabra', ed)!
    expect(res.etiquetas).toContain('salada')
    expect(res.carbosPor100).toBe(2)
  })

  it('el buscador devuelve el alimento ya corregido', () => {
    const ed: EdicionAlimento[] = [{ id: 'melocoton', carbosPor100: 12 }]
    const res = buscarAlimentos('melocoton', ed)
    expect(res[0].carbosPor100).toBe(12)
  })
})

describe('la cetosis contada en gramos', () => {
  const F = '2026-08-19'
  const dia = (alimentos: { id: string; g: number }[]): DiaDeComidas => ({
    date: F,
    comidas: [
      {
        hora: '14:00',
        texto: '',
        alimentos: alimentos.map(({ id, g }) => ({
          nombre: alimentoResuelto(id)!.nombre,
          gramos: g,
          alimentoId: id,
          etiquetas: alimentoResuelto(id)!.etiquetas
        }))
      }
    ]
  })

  it('un melocotón no es un plato de macarrones: 200 g de fruta siguen en cetosis', () => {
    // 200 g de melocotón ≈ 18 g de carbohidrato: dentro con holgura.
    const e = estadoDeCetosis(dia([{ id: 'melocoton', g: 200 }]))
    expect(e.carbosG).toBe(18)
    expect(e.estado).toBe('dentro')
  })

  it('entre 30 y 50 g se está al límite, pero dentro', () => {
    // 25 g de miel (20) + 200 g de fresas (12) + yogur griego 250 (12,5) ≈ 45.
    const e = estadoDeCetosis(
      dia([
        { id: 'miel', g: 25 },
        { id: 'fresa', g: 200 },
        { id: 'yogur_griego', g: 250 }
      ])
    )
    expect(e.carbosG).toBeGreaterThan(CETOSIS_G.holgura)
    expect(e.carbosG).toBeLessThanOrEqual(CETOSIS_G.limite)
    expect(e.estado).toBe('al_limite')
  })

  it('un plato de macarrones se sale: 250 g son ~75 g de carbohidrato', () => {
    const e = estadoDeCetosis(dia([{ id: 'pasta', g: 250 }]))
    expect(e.carbosG).toBeGreaterThan(CETOSIS_G.limite)
    expect(e.estado).toBe('fuera')
  })

  it('carbohidrato sin gramos: no se inventa a favor, cuenta como fuera', () => {
    const d: DiaDeComidas = {
      date: F,
      comidas: [{ hora: '21:00', texto: '', alimentos: [{ nombre: 'Arroz', etiquetas: ['carbohidrato'] }] }]
    }
    const e = estadoDeCetosis(d)
    expect(e.conCarboSinGramos).toBe(true)
    expect(e.estado).toBe('fuera')
  })

  it('la carne y el pescado no suman carbohidrato por muchos gramos que lleven', () => {
    const e = estadoDeCetosis(
      dia([
        { id: 'ternera_entrecot', g: 400 },
        { id: 'salmon', g: 300 }
      ])
    )
    expect(e.carbosG).toBe(0)
    expect(e.estado).toBe('dentro')
  })

  it('las ediciones del usuario cambian la cuenta', () => {
    const ed: EdicionAlimento[] = [{ id: 'melocoton', carbosPor100: 30 }]
    expect(carbosDelDia(dia([{ id: 'melocoton', g: 200 }]), ed)).toBe(60)
    expect(estadoDeCetosis(dia([{ id: 'melocoton', g: 200 }]), ed).estado).toBe('fuera')
  })
})

describe('lo que se cuenta por unidades', () => {
  const F = '2026-08-19'
  /** Un día compuesto contando unidades, como lo guarda el diario. */
  const diaPorUnidades = (cosas: { id: string; n: number }[]): DiaDeComidas => ({
    date: F,
    comidas: [
      {
        hora: '14:00',
        texto: '',
        alimentos: cosas.map(({ id, n }) => {
          const x = alimentoResuelto(id)!
          return {
            nombre: x.nombre,
            unidades: n,
            unidad: x.unidad!,
            gramos: Math.round(n * x.gramosPorUnidad!),
            alimentoId: id,
            etiquetas: x.etiquetas
          }
        })
      }
    ]
  })

  it('los huevos se cuentan en huevos, no en gramos', () => {
    for (const id of ['huevo_cocido', 'huevo_frito', 'huevo_revuelto', 'tortilla_francesa']) {
      const x = alimentoResuelto(id)!
      expect(x.unidad, id).toBe('huevo')
      expect(x.gramosPorUnidad, id).toBeGreaterThan(0)
    }
  })

  it('la tortita de trigo pesa 36 g y lleva 18 g de hidratos por unidad', () => {
    const t = alimentoResuelto('tortita_trigo')!
    expect(t.gramosPorUnidad).toBe(36)
    expect(t.unidad).toBe('tortita')
    // 50 g por 100 g de producto: la mitad de sus 36 g son carbohidrato.
    expect((t.gramosPorUnidad! * t.carbosPor100!) / 100).toBe(18)
    expect(carbosDelDia(diaPorUnidades([{ id: 'tortita_trigo', n: 1 }]))).toBe(18)
  })

  it('dos fajitas dejan el día al límite, y tres lo sacan de cetosis', () => {
    expect(estadoDeCetosis(diaPorUnidades([{ id: 'tortita_trigo', n: 2 }])).carbosG).toBe(36)
    expect(estadoDeCetosis(diaPorUnidades([{ id: 'tortita_trigo', n: 2 }])).estado).toBe('al_limite')
    expect(estadoDeCetosis(diaPorUnidades([{ id: 'tortita_trigo', n: 3 }])).estado).toBe('fuera')
  })

  it('tres huevos no suman carbohidrato por muchos que sean', () => {
    const e = estadoDeCetosis(diaPorUnidades([{ id: 'huevo_revuelto', n: 3 }]))
    expect(e.carbosG).toBe(0)
    expect(e.estado).toBe('dentro')
  })

  it('la mayonesa es la de aceite de oliva, no la de semillas', () => {
    const m = alimentoResuelto('mayonesa_oliva')!
    expect(m.nombre).toBe('Mayonesa de aceite de oliva')
    expect(m.categoria).toBe('grasas')
    // Un gramo por cada 100: no mueve el margen de cetosis y no lleva etiqueta.
    expect(m.etiquetas).not.toContain('carbohidrato')
    expect(buscarAlimentos('mayonesa')[0]?.id).toBe('mayonesa_oliva')
    // Y no hay ninguna de aceite de soja rondando el catálogo.
    expect(ALIMENTOS.some((x) => /soja/i.test(x.nombre) && x.categoria === 'grasas')).toBe(false)
  })

  it('el fuet está, y lleva su sal', () => {
    const f = alimentoResuelto('fuet')!
    expect(f.nombre).toBe('Fuet')
    expect(f.etiquetas).toContain('salada')
    expect(buscarAlimentos('fuet')[0]?.id).toBe('fuet')
  })

  it('se escriben en cristiano, y con coma decimal', () => {
    expect(escribirUnidades(1, 'huevo')).toBe('1 huevo')
    expect(escribirUnidades(2, 'huevo')).toBe('2 huevos')
    expect(escribirUnidades(1, 'tortita')).toBe('1 tortita')
    expect(escribirUnidades(0.5, 'tortita')).toBe('0,5 tortitas')
  })

  it('corregir lo que pesa una unidad cambia la cuenta del día', () => {
    // Si las tortitas de casa son de 50 g, el margen se gasta antes.
    const ed: EdicionAlimento[] = [{ id: 'tortita_trigo', gramosPorUnidad: 50 }]
    expect(alimentoResuelto('tortita_trigo', ed)!.gramosPorUnidad).toBe(50)
    expect(alimentoResuelto('tortita_trigo', ed)!.carbosPor100).toBe(50)
  })
})
