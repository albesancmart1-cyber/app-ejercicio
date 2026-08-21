/**
 * El contrato con la página de producto, comprobado a máquina.
 *
 * Existe por un fallo real de este proyecto: se anunció una app entera en una
 * página de producto, se construyó la mitad, y la otra mitad se dio por hecha
 * **de memoria**. Al auditarlo después aparecieron seis funciones prometidas que
 * no existían y —peor— cinco módulos nuevos que solo se usaban a sí mismos.
 *
 * La memoria no sirve para esto, así que aquí no se usa. `docs/PROMESAS.md`
 * lleva la lista extraída del HTML publicado, y este test se encarga de que la
 * lista no pueda mentir:
 *
 *  - Una promesa marcada como hecha **tiene que enseñar dónde**: fichero y
 *    símbolo. Marcar la casilla sin escribir el código rompe la suite.
 *  - El símbolo tiene que aparecer de verdad en ese fichero. Renombrar una
 *    función y olvidarse de la promesa que la citaba también rompe la suite.
 *  - **El total va escrito al final del documento.** Quitar una promesa
 *    incómoda de la lista obliga a bajar ese número a mano, y eso se ve en el
 *    diff. Es la única regla que protege de la trampa más fácil de todas:
 *    cumplir el contrato borrando la cláusula.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const RAIZ = resolve(__dirname, '..')
const DOC = resolve(RAIZ, 'docs/PROMESAS.md')

interface Promesa {
  id: string
  hecha: boolean
  texto: string
  fichero?: string
  simbolo?: string
  linea: number
}

function leerPromesas(): { promesas: Promesa[]; total: number | null } {
  const lineas = readFileSync(DOC, 'utf-8').split('\n')
  const promesas: Promesa[] = []
  let total: number | null = null

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]

    const m = /^- \[([ x])\] ([a-z0-9-]+) · (.+)$/.exec(l.trim())
    if (m) {
      const promesa: Promesa = {
        id: m[2],
        hecha: m[1] === 'x',
        texto: m[3].trim(),
        linea: i + 1
      }
      // La prueba, si la hay, va en la línea siguiente.
      const prueba = /^→ (.+?) :: (.+)$/.exec((lineas[i + 1] ?? '').trim())
      if (prueba) {
        promesa.fichero = prueba[1].trim()
        promesa.simbolo = prueba[2].trim()
      }
      promesas.push(promesa)
      continue
    }

    const t = /^TOTAL: (\d+)$/.exec(l.trim())
    if (t) total = Number(t[1])
  }

  return { promesas, total }
}

const { promesas, total } = leerPromesas()
const hechas = promesas.filter((p) => p.hecha)
const pendientes = promesas.filter((p) => !p.hecha)

describe('el documento de promesas', () => {
  it('existe y se puede leer', () => {
    expect(existsSync(DOC), `falta ${DOC}`).toBe(true)
    expect(promesas.length).toBeGreaterThan(0)
  })

  it('declara su total, y el total cuadra', () => {
    // Esta es la regla que impide cumplir el contrato borrando la cláusula.
    expect(total, 'falta la línea «TOTAL: n» al final de docs/PROMESAS.md').not.toBeNull()
    expect(
      promesas.length,
      `el documento dice TOTAL: ${total} pero tiene ${promesas.length} promesas. ` +
        'Si de verdad quieres quitar una, baja el número a mano para que se vea en el diff.'
    ).toBe(total)
  })

  it('no repite ningún identificador', () => {
    const vistos = new Map<string, number>()
    const repetidos: string[] = []
    for (const p of promesas) {
      if (vistos.has(p.id)) repetidos.push(`${p.id} (líneas ${vistos.get(p.id)} y ${p.linea})`)
      else vistos.set(p.id, p.linea)
    }
    expect(repetidos).toEqual([])
  })
})

describe('cada promesa marcada como hecha', () => {
  it('enseña dónde está cumplida', () => {
    const sinPrueba = hechas.filter((p) => !p.fichero || !p.simbolo)
    expect(
      sinPrueba.map((p) => `${p.id} (línea ${p.linea})`),
      'marcar la casilla sin escribir la línea «→ fichero :: símbolo» no vale'
    ).toEqual([])
  })

  it('apunta a un fichero que existe', () => {
    const perdidos = hechas
      .filter((p) => p.fichero && !existsSync(resolve(RAIZ, p.fichero)))
      .map((p) => `${p.id} → ${p.fichero}`)
    expect(perdidos).toEqual([])
  })

  it('y ese fichero contiene de verdad el símbolo que dice', () => {
    const rotos: string[] = []
    for (const p of hechas) {
      if (!p.fichero || !p.simbolo) continue
      const ruta = resolve(RAIZ, p.fichero)
      if (!existsSync(ruta)) continue
      const contenido = readFileSync(ruta, 'utf-8')
      if (!contenido.includes(p.simbolo)) rotos.push(`${p.id}: «${p.simbolo}» no está en ${p.fichero}`)
    }
    expect(rotos).toEqual([])
  })
})

describe('el estado del contrato', () => {
  it('deja por escrito cuánto falta, para que no se olvide', () => {
    // No falla nunca: su trabajo es dejar el número a la vista en cada `npm test`.
    const porcentaje = Math.round((hechas.length / promesas.length) * 100)
    console.info(
      `\n  Promesas: ${hechas.length} de ${promesas.length} cumplidas (${porcentaje} %).` +
        (pendientes.length > 0
          ? `\n  Faltan: ${pendientes.map((p) => p.id).join(', ')}\n`
          : '\n  Están todas.\n')
    )
    expect(promesas.length).toBe(hechas.length + pendientes.length)
  })
})
