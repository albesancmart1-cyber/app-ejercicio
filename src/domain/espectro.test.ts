import { describe, expect, it } from 'vitest'
import { ESPECTRO, efectosDe, picoCercano } from './espectro'
import { NM_MAXIMO, NM_MINIMO, bandaDe } from './luz'

describe('el espectro, tramo a tramo', () => {
  it('va seguido y sin huecos, del UVB al infrarrojo lejano', () => {
    // Un hueco dejaría longitudes de onda sin explicación, que es peor que no
    // tener la tabla: el usuario teclearía un número y no le diría nada.
    for (let i = 1; i < ESPECTRO.length; i++) {
      expect(ESPECTRO[i].desde, ESPECTRO[i].nombre).toBe(ESPECTRO[i - 1].hasta)
    }
  })

  it('empieza y acaba donde acaba el rango que la app admite', () => {
    expect(ESPECTRO[0].desde).toBe(NM_MINIMO)
    expect(ESPECTRO[ESPECTRO.length - 1].hasta).toBe(NM_MAXIMO)
  })

  it('cada tramo dice qué lo absorbe, hasta dónde llega y qué se ha visto', () => {
    for (const t of ESPECTRO) {
      expect(t.cromoforo.length, t.nombre).toBeGreaterThan(10)
      expect(t.penetracion.length, t.nombre).toBeGreaterThan(10)
      expect(t.efectos.length, t.nombre).toBeGreaterThan(0)
    }
  })

  /*
   * La regla que hace que esto sea una investigación y no una opinión: cada
   * efecto tiene que citar de dónde sale. Se acepta una referencia con año
   * —«(Brainard et al., *J Neurosci* 2001)»— o una norma con su número.
   */
  it('y ningún tramo se queda sin una sola fuente, con año o con norma', () => {
    /*
     * No se exige una referencia en cada frase: hay líneas que solo explican
     * qué hace la app con ese tramo y no afirman nada de la literatura. Lo que
     * no puede pasar es que un tramo entero se sostenga sobre la memoria de
     * quien lo escribió, que es exactamente el fallo que este proyecto ya
     * cometió una vez con la página de producto.
     */
    const conFuente = /\((?:[^()]*\b(?:19|20)\d{2}\b[^()]*)\)|CIE \d+/
    for (const t of ESPECTRO) {
      expect(t.efectos.some((e) => conFuente.test(e)), t.nombre).toBe(true)
    }
  })

  it('los picos que cita cada tramo caen dentro del tramo', () => {
    for (const t of ESPECTRO) {
      for (const p of t.picos) {
        expect(p, `${t.nombre}: ${p}`).toBeGreaterThanOrEqual(t.desde)
        expect(p, `${t.nombre}: ${p}`).toBeLessThan(t.hasta)
      }
    }
  })

  it('no receta: ni dosis, ni minutos, ni protocolos', () => {
    // Es una regla de esta app y no de la literatura, y por eso se comprueba
    // aquí: la app no vende lámparas y no dice cuánto ponerse debajo.
    const receta = /\b(recomendad|deberías|ponte|apliqu|protocolo de|sesiones de \d)/i
    for (const t of ESPECTRO) {
      for (const e of [...t.efectos, t.ojo ?? '']) {
        expect(receta.test(e), `${t.nombre}: «${e.slice(0, 60)}…»`).toBe(false)
      }
    }
  })

  it('ni promete curar nada', () => {
    const cura = /\bcura\b|\bcurar\b|\btrata\b|\bremedio para\b/i
    for (const t of ESPECTRO) {
      for (const e of [...t.efectos, t.ojo ?? '']) {
        expect(cura.test(e), `${t.nombre}: «${e.slice(0, 60)}…»`).toBe(false)
      }
    }
  })
})

describe('encontrar el tramo de una onda', () => {
  it('las longitudes de siempre caen donde tienen que caer', () => {
    expect(efectosDe(297)?.nombre).toBe('UVB corto')
    expect(efectosDe(340)?.nombre).toBe('UVA')
    expect(efectosDe(480)?.nombre).toBe('Azul')
    expect(efectosDe(660)?.nombre).toBe('Rojo')
    expect(efectosDe(810)?.nombre).toBe('Infrarrojo cercano (IR-A)')
    expect(efectosDe(10000)?.nombre).toBe('Infrarrojo lejano (IR-C)')
  })

  it('fuera del espectro no se inventa el tramo más cercano', () => {
    expect(efectosDe(66)).toBeNull()
    expect(efectosDe(279)).toBeNull()
    expect(efectosDe(50001)).toBeNull()
    expect(efectosDe(NaN)).toBeNull()
  })

  it('el extremo de arriba sigue dentro', () => {
    expect(efectosDe(NM_MAXIMO)?.nombre).toBe('Infrarrojo lejano (IR-C)')
  })

  it('coincide con las bandas del balance: son dos vistas de lo mismo', () => {
    // Si una onda tuviera tramo y no banda —o al revés— la app diría dos cosas
    // distintas de la misma luz en dos pantallas.
    for (const nm of [280, 297, 315, 400, 450, 495, 570, 620, 700, 780, 940, 1400, 3000, 50000]) {
      expect(!!efectosDe(nm), `${nm}`).toBe(bandaDe(nm) !== null)
    }
  })
})

describe('el pico más cercano', () => {
  it('reconoce las longitudes que la literatura señala', () => {
    expect(picoCercano(660)).toBe(660)
    expect(picoCercano(658)).toBe(660)
    expect(picoCercano(812)).toBe(810)
  })

  it('y no fuerza una que no lo es', () => {
    expect(picoCercano(700)).toBeUndefined()
    expect(picoCercano(645)).toBeUndefined()
  })

  it('sin tramo no hay pico', () => {
    expect(picoCercano(66)).toBeUndefined()
  })
})
