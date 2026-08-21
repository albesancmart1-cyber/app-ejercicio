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
    // Las pantallas son .tsx y el dominio .ts; los tests se quedan fuera, que
    // si no el guardián se encontraría a sí mismo nombrando lo que prohíbe.
    .filter((f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('.test.'))
    .map((f) => join(dir, f))
}

/** Solo las pantallas, que es donde vive lo que el usuario lee de corrido. */
function pantallasDe(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(dir, f))
}

/** Quita comentarios: lo que se le explica al que mantiene el código no se ve. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const PANTALLAS = [...pantallasDe('src/screens'), ...pantallasDe('src/components')]

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

/**
 * Las tres promesas de «lo que Ritmo no hace» que faltaban por vigilar.
 *
 * Una promesa de no hacer algo no se cumple escribiéndola en una página de
 * producto: se cumple cuando romperla rompe la suite. Estas tres son fáciles de
 * incumplir sin darse cuenta —basta una frase entusiasta en una tarjeta nueva—
 * y por eso valía la pena ponerles guardián.
 *
 * Van con límites de palabra y no con `includes`, por una razón aprendida: un
 * guardián que salta con «una noche de verdad oscura» al buscar «cura» acaba
 * desactivándose, y entonces no guarda nada.
 */
const TEXTO_DE_LAS_PANTALLAS = PANTALLAS.map((f) => sinComentarios(readFileSync(f, 'utf-8'))).join(
  '\n'
)

describe('la app no diagnostica', () => {
  it('ninguna pantalla nombra una enfermedad ni promete curar nada', () => {
    for (const patron of [
      /\bcurar?\b/i,
      /\bcura\s+(el|la|los|las)\b/i,
      /\benfermedad(es)?\b/i,
      /\bc[áa]ncer\b/i,
      /\bdiagn[óo]stic\w*/i,
      /\bpatolog\w*/i,
      /\bs[íi]ndrome\b/i
    ]) {
      const m = TEXTO_DE_LAS_PANTALLAS.match(patron)
      expect(m?.[0], `una pantalla dice «${m?.[0]}»`).toBeUndefined()
    }
  })

  it('ni sugiere tocar una medicación', () => {
    for (const patron of [/\bdeja\w*\s+(la\s+)?medicaci/i, /\bsustituye\w*\s+(el\s+)?tratamiento/i]) {
      expect(patron.test(TEXTO_DE_LAS_PANTALLAS)).toBe(false)
    }
  })
})

describe('la app no te asigna un cronotipo', () => {
  it('no hay búhos ni alondras en ninguna pantalla', () => {
    // Existen y son genéticos, pero el búho extremo real es una minoría muy
    // pequeña y a los demás no les cambia el consejo. Etiquetar a alguien de
    // «búho» le da permiso para no intentarlo, que es lo contrario de esto.
    for (const patron of [/\bcronotipo\b/i, /\bb[úu]ho\b/i, /\balondra\b/i, /\bmatutino\b/i]) {
      const m = TEXTO_DE_LAS_PANTALLAS.match(patron)
      expect(m?.[0], `una pantalla dice «${m?.[0]}»`).toBeUndefined()
    }
  })
})

describe('la app no te dice que dejes tu trabajo', () => {
  it('ninguna pantalla propone cambiar de turno ni de empleo', () => {
    // Uno de los libros lo propone en serio para quien hace turnos. Ritmo no:
    // da por hecha la jornada y trabaja con los huecos que hay.
    for (const patron of [
      /\bdeja\w*\s+(tu\s+)?trabajo\b/i,
      /\bcambia\w*\s+de\s+(trabajo|empleo)\b/i,
      /\bbusca\w*\s+otro\s+(trabajo|turno)\b/i
    ]) {
      expect(patron.test(TEXTO_DE_LAS_PANTALLAS), `una pantalla lo sugiere`).toBe(false)
    }
  })

  it('y el turno se trata como un dato, no como un defecto', () => {
    /*
     * Esta frase se busca en todo `src` y no solo en las pantallas porque el
     * texto tranquilizador se **redacta en el dominio** —donde se sabe por qué
     * la barra está a cero— y las pantallas se limitan a pintarlo. Buscarlo
     * solo en `screens` daría un fallo que no significa nada.
     */
    const todo = [...ficherosDe('src/domain'), ...PANTALLAS]
      .map((f) => readFileSync(f, 'utf-8'))
      .join('\n')
    expect(todo).toMatch(/no es un fallo tuyo|es tu turno|los huecos que/i)
  })
})
