import { describe, expect, it } from 'vitest'
import {
  BANDAS,
  NM_MAXIMO,
  NM_MINIMO,
  PICOS_KARU,
  PICO_MELANOPSINA,
  bandaDe,
  colorDe,
  escribirNm,
  nombreDe,
  pesoCircadiano,
  picosCubiertos,
  propositoDe,
  type Banda
} from './luz'

const TODAS = Object.keys(BANDAS) as Banda[]

describe('el reparto en bandas', () => {
  it('no deja huecos ni solapa: cada banda empieza donde acaba la anterior', () => {
    for (let i = 1; i < TODAS.length; i++) {
      expect(BANDAS[TODAS[i]].desde).toBe(BANDAS[TODAS[i - 1]].hasta)
    }
  })

  it('coloca las longitudes de onda que la gente tiene de verdad', () => {
    expect(bandaDe(660)).toBe('rojo')
    expect(bandaDe(850)).toBe('infrarrojo_cercano')
    expect(bandaDe(480)).toBe('azul')
    expect(bandaDe(365)).toBe('uva')
    expect(bandaDe(300)).toBe('uvb')
    expect(bandaDe(415)).toBe('violeta')
    expect(bandaDe(525)).toBe('verde')
    expect(bandaDe(590)).toBe('ambar')
    expect(bandaDe(1500)).toBe('infrarrojo_medio')
  })

  it('en las fronteras manda el borde de abajo, no el de arriba', () => {
    // 450 es el primer azul, no el último violeta: si no, dos bandas se pelean.
    expect(bandaDe(449)).toBe('violeta')
    expect(bandaDe(450)).toBe('azul')
    expect(bandaDe(494)).toBe('azul')
    expect(bandaDe(495)).toBe('verde')
    expect(bandaDe(750)).toBe('infrarrojo_cercano')
  })

  it('barre todo el rango sin dejar un solo nanómetro sin banda', () => {
    for (let nm = NM_MINIMO; nm <= NM_MAXIMO; nm++) {
      expect(bandaDe(nm), `${nm} nm se quedó sin banda`).not.toBeNull()
    }
  })

  it('fuera de rango dice que no, en vez de estirar la banda más cercana', () => {
    // Quien teclea 66 en vez de 660 tiene una errata, y taparla sería peor.
    expect(bandaDe(66)).toBeNull()
    expect(bandaDe(279)).toBeNull()
    expect(bandaDe(50001)).toBeNull()
    expect(bandaDe(NaN)).toBeNull()
    expect(nombreDe(66)).toBe('Fuera de rango')
  })

  it('el infrarrojo lejano entra: una sauna emite a diez micras y eso es luz', () => {
    expect(bandaDe(3000)).toBe('infrarrojo_lejano')
    expect(bandaDe(10000)).toBe('infrarrojo_lejano')
    expect(bandaDe(NM_MAXIMO)).toBe('infrarrojo_lejano')
  })

  it('y es calor, no mitocondria: contarlo como rojo sería contar una cosa por otra', () => {
    // A diez micras el agua absorbe tan fuerte que la luz se para en la primera
    // capa de células. El calor llega hondo, pero por conducción.
    expect(propositoDe(10000)).toBe('calor')
    expect(BANDAS.infrarrojo_lejano.peso).toBe(0)
  })

  it('a partir de las tres micras se escribe en micras, que es como se nombra', () => {
    expect(escribirNm(660)).toBe('660 nm')
    expect(escribirNm(10000)).toBe('10 µm')
    expect(escribirNm(50000)).toBe('50 µm')
  })
})

describe('para qué sirve cada luz', () => {
  it('el rojo y el infrarrojo van a la mitocondria', () => {
    expect(propositoDe(660)).toBe('mitocondria')
    expect(propositoDe(850)).toBe('mitocondria')
  })

  it('el azul, el violeta y el verde van al reloj', () => {
    expect(propositoDe(480)).toBe('reloj')
    expect(propositoDe(420)).toBe('reloj')
    expect(propositoDe(530)).toBe('reloj')
  })

  it('el ultravioleta va aparte, porque no lo sustituye nada', () => {
    expect(propositoDe(300)).toBe('ultravioleta')
    expect(propositoDe(365)).toBe('ultravioleta')
  })

  it('y el ámbar no cuenta para nada, que es justo por lo que sirve de filtro', () => {
    expect(propositoDe(590)).toBe('ninguno')
    expect(BANDAS.ambar.peso).toBe(0)
  })
})

describe('los picos de la citocromo c oxidasa', () => {
  it('un panel de 630, 660, 810 y 850 cubre tres de los cuatro', () => {
    const cubiertos = picosCubiertos([630, 660, 810, 850])
    expect(cubiertos).toEqual([620, 680, 820])
    expect(cubiertos).not.toContain(760)
  })

  it('una bombilla de una sola onda cubre como mucho uno', () => {
    expect(picosCubiertos([660])).toEqual([680])
    expect(picosCubiertos([850])).toEqual([820])
  })

  it('cada pico se cubre a sí mismo', () => {
    for (const p of PICOS_KARU) expect(picosCubiertos([p])).toContain(p)
  })

  it('una onda lejana no cubre ninguno', () => {
    expect(picosCubiertos([480])).toEqual([])
    expect(picosCubiertos([1500])).toEqual([])
  })
})

describe('el peso para el reloj', () => {
  it('es máximo en el pico de la melanopsina', () => {
    const enElPico = pesoCircadiano(PICO_MELANOPSINA)
    expect(enElPico).toBeGreaterThan(pesoCircadiano(440))
    expect(enElPico).toBeGreaterThan(pesoCircadiano(520))
    expect(enElPico).toBeCloseTo(1, 2)
  })

  it('el verde cuenta, pero mucho menos que el azul', () => {
    const verde = pesoCircadiano(530)
    expect(verde).toBeGreaterThan(0)
    expect(verde).toBeLessThan(pesoCircadiano(480) / 2)
  })

  it('el rojo y el infrarrojo no ponen ningún reloj en hora', () => {
    expect(pesoCircadiano(660)).toBe(0)
    expect(pesoCircadiano(850)).toBe(0)
    expect(pesoCircadiano(1500)).toBe(0)
  })

  it('el ámbar tampoco, que es lo que hace útiles las gafas amarillas', () => {
    expect(pesoCircadiano(590)).toBe(0)
  })

  it('nunca se sale de 0 a 1', () => {
    for (let nm = NM_MINIMO; nm <= NM_MAXIMO; nm += 5) {
      const p = pesoCircadiano(nm)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })
})

describe('cómo se enseña', () => {
  it('cada banda tiene color y nombre, porque el color solo no es accesible', () => {
    for (const b of TODAS) {
      expect(BANDAS[b].nombre.length).toBeGreaterThan(0)
      expect(colorDe(BANDAS[b].desde)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('los nanómetros se escriben con su unidad', () => {
    expect(escribirNm(660)).toBe('660 nm')
    expect(escribirNm(1050)).toBe('1050 nm')
  })
})
