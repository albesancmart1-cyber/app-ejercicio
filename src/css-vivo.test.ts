import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Que la hoja de estilos no guarde reglas para elementos que ya no existen.
 *
 * Esto no es manía de limpieza: es la prueba que habría cazado dos fallos
 * visibles de la migración a Appica. Los botones del descanso se repartían el
 * ancho con `.rest-botones .btn { flex: 1 }`, y al pasar uno de ellos al botón
 * de la librería —que ya no lleva `.btn`— la regla dejó de alcanzarlo: el botón
 * de seguir se salió de la pantalla y solo se veían ocho de sus píxeles. Lo
 * mismo con `.level-actions .btn-quiet`. En los dos casos el CSS seguía
 * pareciendo correcto porque la regla estaba escrita; lo que faltaba era el
 * elemento.
 *
 * Así que cada clase que la hoja mencione tiene que aparecer en algún sitio del
 * código. Si se deja de emitir una, aquí se entera alguien.
 */

const RAIZ = new URL('.', import.meta.url).pathname

function ficheros(dir: string, ext: string[]): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return ficheros(p, ext)
    return ext.some((e) => n.endsWith(e)) ? [p] : []
  })
}

const css = readFileSync(join(RAIZ, 'styles/theme.css'), 'utf8')
const codigo = ficheros(RAIZ, ['.tsx', '.ts'])
  .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

/**
 * Las clases que la hoja menciona, quitando lo que no es nuestro: los estados
 * de Base UI (`data-…`), los prefijos de Tailwind y las pseudoclases.
 */
function clasesDelCss(): string[] {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const dentro = new Set<string>()
  for (const m of sinComentarios.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) dentro.add(m[1])
  return [...dentro].sort()
}

/**
 * ¿El código escribe esta clase en algún sitio?
 *
 * Vale que aparezca entera —`className="focus-hecha"`— o como el final de un
 * nombre montado a trozos, que es como se pintan los tipos de serie:
 * `set-type-${tipoDe(serie)}`. Por eso también se acepta el prefijo hasta el
 * último guion.
 */
function laEscribeAlguien(clase: string): boolean {
  const suelta = new RegExp(`[\\s"'\`.]${clase}[\\s"'\`\${]`)
  if (suelta.test(codigo)) return true
  const trozos = clase.split('-')
  for (let i = trozos.length - 1; i >= 1; i--) {
    const raiz = trozos.slice(0, i).join('-')
    if (new RegExp(`[\\s"'\`]${raiz}-\\$\\{`).test(codigo)) return true
  }
  return false
}

/**
 * Lo que no sale del código y aun así es legítimo, con su motivo. Cualquier
 * excepción nueva pide una línea aquí explicando por qué.
 */
const CON_PERMISO = new Set([
  // Las pone la librería, no nosotros.
  'group',
  'peer',
  'dark',
  // Del propio CSS: tipografías y variables.
  'woff2',
  'ttf'
])

describe('la hoja de estilos y el código dicen lo mismo', () => {
  it('no quedan reglas para clases que ya nadie escribe', () => {
    const huerfanas = clasesDelCss().filter((c) => !CON_PERMISO.has(c) && !laEscribeAlguien(c))
    expect(huerfanas, `sobran en theme.css: ${huerfanas.map((c) => '.' + c).join(', ')}`).toEqual([])
  })

  it('la comprobación sirve para algo: detecta una clase inventada', () => {
    // Sin esto, un fallo en las expresiones de arriba dejaría la prueba en verde
    // para siempre sin comprobar nada.
    expect(laEscribeAlguien('clase-que-no-existe-en-ningun-sitio')).toBe(false)
    expect(laEscribeAlguien('focus-hecha')).toBe(true)
  })
})
