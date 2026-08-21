import { describe, expect, it } from 'vitest'
import {
  COMPENSACIONES,
  LO_QUE_LA_LAMPARA_NO_TAPA,
  compensacionesDe,
  sinRemedio,
  tieneRemedio
} from './compensaciones'

describe('la tabla de compensaciones', () => {
  it('cubre las cosas que de verdad faltan en una jornada sin ventana', () => {
    const ids = COMPENSACIONES.map((c) => c.id)
    for (const necesario of ['rojo-ir', 'fase-manana', 'amplitud-abajo', 'uvb']) {
      expect(ids, `falta la fila ${necesario}`).toContain(necesario)
    }
  })

  it('no repite identificadores', () => {
    const ids = COMPENSACIONES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada fila dice lo que su remedio NO cubre', () => {
    // Es la parte que hace honesta la tabla: sin ella sería un catálogo de
    // soluciones, que es justo lo que no queremos.
    for (const c of COMPENSACIONES) {
      expect(c.noCubre.length, `${c.id} no dice qué no cubre`).toBeGreaterThan(0)
    }
  })

  it('y la única que puede tener un guion es la que ya es la mitad de un cociente', () => {
    const conGuion = COMPENSACIONES.filter((c) => c.noCubre === '—')
    expect(conGuion.map((c) => c.id)).toEqual(['amplitud-abajo'])
  })
})

describe('lo que no se compensa con nada', () => {
  it('la UVB no tiene remedio, y se dice con null y no con una excusa', () => {
    const uvb = COMPENSACIONES.find((c) => c.id === 'uvb')!
    expect(uvb.seCompensaCon).toBeNull()
    expect(uvb.noCubre).toContain('Ni lámpara')
  })

  it('hay al menos una fila sin remedio: quitarla haría la tabla más agradable y menos cierta', () => {
    expect(sinRemedio().length).toBeGreaterThan(0)
    expect(sinRemedio().map((c) => c.id)).toContain('uvb')
  })

  it('el ultravioleta no tiene remedio y el rojo sí', () => {
    expect(tieneRemedio('ultravioleta')).toBe(false)
    expect(tieneRemedio('rojo')).toBe(true)
    expect(tieneRemedio('oscuridad')).toBe(true)
  })
})

describe('lo que una lámpara no tapa', () => {
  it('lo dice en tres frases, y las tres nombran algo concreto', () => {
    expect(LO_QUE_LA_LAMPARA_NO_TAPA.length).toBeGreaterThanOrEqual(3)
    const junto = LO_QUE_LA_LAMPARA_NO_TAPA.join(' ')
    expect(junto).toContain('fase')
    expect(junto).toContain('UVB')
  })
})

describe('buscar por banda', () => {
  it('devuelve solo lo que toca a esa banda', () => {
    for (const c of compensacionesDe('rojo')) expect(c.banda).toBe('rojo')
  })

  it('una banda sin filas devuelve lista vacía, no revienta', () => {
    expect(compensacionesDe('azul').every((c) => c.banda === 'azul')).toBe(true)
  })
})

describe('el tono de la tabla', () => {
  it('no promete curar nada ni menciona ninguna enfermedad', () => {
    const todo = COMPENSACIONES.map((c) => `${c.falta} ${c.seCompensaCon ?? ''} ${c.noCubre}`)
      .join(' ')
      .toLowerCase()
    /*
     * Con límites de palabra y no con `includes`. La primera versión de este
     * test buscaba «cura» como subcadena y saltaba con «una noche de verdad
     * oscura», que es exactamente la frase que queremos conservar. Un guardián
     * que salta con el texto bueno acaba desactivándose, y entonces no guarda
     * nada.
     */
    for (const prohibida of ['curar?', 'enfermedad', 'cáncer', 'tratamiento', 'diagnóstic\\w*']) {
      const re = new RegExp(`\\b${prohibida}\\b`, 'i')
      expect(re.test(todo), `la tabla no debería decir «${prohibida}»`).toBe(false)
    }
  })

  it('ni una sola caloría', () => {
    const todo = COMPENSACIONES.map((c) => `${c.seCompensaCon ?? ''} ${c.noCubre}`).join(' ')
    expect(/\bcalor[ií]as?\b/i.test(todo)).toBe(false)
  })

  it('no recomienda marcas ni dosis de aparatos', () => {
    const todo = COMPENSACIONES.map((c) => c.seCompensaCon ?? '')
      .join(' ')
      .toLowerCase()
    expect(todo).not.toMatch(/\bcompra\b|\bmarca\b|\brecomendad/)
  })
})
