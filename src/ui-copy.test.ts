import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Lo que la app no dice.
 *
 * La app no cuenta calorías ni le pide al usuario que las cuente: la
 * disponibilidad energética se gestiona por la señal de leptina (`leptin.ts`),
 * que es lo que de verdad regula el apetito y la recuperación. Eso ya estaba
 * comprobado módulo a módulo en los textos del dominio —tendencia, nutrición,
 * progresión—, pero no en las pantallas, y por ahí se coló: una tarjeta nueva de
 * Ajustes acabó diciendo «estoy en déficit de calorías».
 *
 * Este test mira el texto de las pantallas y los componentes. Se prohíben las
 * formas **acentuadas** —«déficit», «superávit», «caloría»—, que solo aparecen
 * en castellano escrito para leerse; los identificadores del código
 * (`deficitPhase`, `MAV_TOPE_DEFICIT`) van sin tilde y no se ven, así que pasan.
 * La distinción no es un truco: separa exactamente lo que el usuario lee de lo
 * que solo lee quien mantiene esto.
 */

const PROHIBIDO = /calor[ií]a|kcal|d[eé]ficit\s+cal|déficit|superávit/i

function ficherosDe(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(dir, f))
}

/** Quita comentarios: lo que se le explica al que mantiene el código no se ve. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const PANTALLAS = [...ficherosDe('src/screens'), ...ficherosDe('src/components')]

describe('la app no habla de calorías en ninguna pantalla', () => {
  it('hay pantallas y componentes que revisar', () => {
    expect(PANTALLAS.length).toBeGreaterThan(8)
  })

  for (const fichero of PANTALLAS) {
    it(`${fichero.split('/').pop()} no las menciona`, () => {
      const texto = sinComentarios(readFileSync(fichero, 'utf8'))
      const encontrado = texto.match(PROHIBIDO)
      expect(encontrado?.[0], `${fichero} dice «${encontrado?.[0]}»`).toBeUndefined()
    })
  }

  it('el detector funciona', () => {
    // Si el regex se rompiera, todo lo de arriba pasaría sin comprobar nada.
    expect(sinComentarios('const t = "Estoy en déficit de calorías"')).toMatch(PROHIBIDO)
    expect(sinComentarios('// Estoy en déficit de calorías')).not.toMatch(PROHIBIDO)
    expect(sinComentarios('const deficitPhase = true')).not.toMatch(PROHIBIDO)
  })
})

/**
 * Y los números se escriben como se escriben en español.
 *
 * `toFixed` devuelve siempre punto decimal, venga el idioma que venga. Así se
 * coló que el contador del peso enseñara «102,5» y la pantalla del descanso
 * «102.5» a la vez, y que la fatiga saliera como «0.94». No es una manía
 * tipográfica: en castellano el punto es el separador de millares, así que un
 * «1.300» leído a la carrera son mil trescientos y no uno coma tres.
 *
 * Para escribir un número en pantalla está `escribirNumero`.
 */
describe('los números se escriben con coma decimal', () => {
  const PERMITIDO = new Set([
    // Coordenadas de SVG y cálculos de trazado: no los lee nadie.
    'src/components/BodyMap.tsx'
  ])

  it('ninguna pantalla imprime un decimal con toFixed', () => {
    const culpables = PANTALLAS.filter(
      (f) => !PERMITIDO.has(f) && /\.toFixed\(/.test(sinComentarios(readFileSync(f, 'utf8')))
    )
    expect(
      culpables,
      `estos usan toFixed, que siempre pone punto: ${culpables.join(', ')}. Usa escribirNumero.`
    ).toEqual([])
  })

  it('la comprobación mira ficheros de verdad', () => {
    expect(PANTALLAS.some((f) => f.endsWith('RestScreen.tsx'))).toBe(true)
  })
})
