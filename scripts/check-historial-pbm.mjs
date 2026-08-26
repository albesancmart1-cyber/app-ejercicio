/**
 * El histórico de sesiones de lámpara, en navegador.
 *
 * Lo que tiene que pasar: que cada sesión se vea con su dosis en julios y no
 * solo con sus minutos —la distancia manda al cuadrado, así que los minutos
 * solos no son comparables—, que la distancia de cada lámpara se diga porque es
 * lo que explica la cifra, y que la vitamina D **aparezca solo cuando alguna de
 * las lámparas llega al ultravioleta B**.
 *
 *   node scripts/check-historial-pbm.mjs
 */
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

const hoy = new Date().toISOString().slice(0, 10)
const ayer = (() => {
  const d = new Date(`${hoy}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
})()

await page.goto(BASE)
await page.evaluate(
  ([hoy, ayer]) => {
    localStorage.setItem(
      'ritmo-data-v1',
      JSON.stringify({
        version: 2,
        profile: {
          name: 'Alberto',
          goal: 'recomposicion',
          equipment: ['peso_corporal'],
          maxWeights: {},
          lat: 40.4165,
          lon: -3.7026,
          sitio: 'Madrid',
          fototipo: 'III',
          age: 35
        },
        checkIns: [],
        sessions: [],
        measurements: [],
        lamparas: [
          {
            id: 'panel',
            nombre: 'Panel rojo',
            distanciaRefCm: 15,
            ondas: [
              { nm: 660, irradiancia: 30 },
              { nm: 850, irradiancia: 30 }
            ]
          },
          {
            id: 'uvb',
            nombre: 'Lámpara UVB',
            distanciaRefCm: 30,
            ondas: [
              { nm: 297, irradiancia: 0.05 },
              { nm: 365, irradiancia: 2 },
              { nm: 660, irradiancia: 5 }
            ]
          }
        ],
        // Dos sesiones iguales en minutos y distintas en distancia: es lo que
        // demuestra que la cifra no son los minutos.
        sesionesPBM: [
          { id: 'a', date: hoy, hora: 8 * 60, minutos: 20, lamparaId: 'panel', distanciaCm: 15, zona: 'torso' },
          { id: 'b', date: ayer, hora: 21 * 60, minutos: 20, lamparaId: 'panel', distanciaCm: 45, zona: 'torso' },
          { id: 'c', date: ayer, hora: 12 * 60, minutos: 15, lamparaId: 'uvb', distanciaCm: 30, zona: 'torso' }
        ]
      })
    )
  },
  [hoy, ayer]
)
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Luz' }).click()
await page.waitForTimeout(900)

const tarjeta = page.locator('.card').filter({ hasText: 'Tus sesiones de lámpara' }).first()
comprobar(await tarjeta.count(), 'no aparece el histórico de sesiones')
if ((await tarjeta.count()) === 0) {
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}
await tarjeta.scrollIntoViewIfNeeded()
const texto = await tarjeta.innerText()

comprobar(/Hoy/.test(texto) && /Ayer/.test(texto), `las fechas deberían leerse: ${texto.slice(0, 200)}`)
comprobar(/Torso/.test(texto), 'debería decir la zona')
comprobar(/a 15 cm/.test(texto) && /a 45 cm/.test(texto), 'debería decir a qué distancia fue cada una')

// Los julios de las dos del panel: mismos minutos, distinta distancia.
const julios = [...texto.matchAll(/([\d,]+)\s*J\/cm²/g)].map((m) => Number(m[1].replace(',', '.')))
comprobar(julios.length >= 2, `deberían salir las dosis en julios: ${texto.slice(0, 300)}`)
comprobar(
  julios[0] > julios[1] * 2,
  `a 15 cm tiene que dar bastante más que a 45: ${JSON.stringify(julios)}`
)
console.log('  · misma lámpara y mismos minutos, a 15 y a 45 cm:', julios[0], 'y', julios[1], 'J/cm²')

// La vitamina D solo donde la hay.
const bloques = await tarjeta.locator('> div').allInnerTexts()
const conUVB = bloques.filter((b) => /Lámpara UVB/.test(b))
const sinUVB = bloques.filter((b) => /Panel rojo/.test(b))
// El nombre de la lámpara sale una sola vez por sesión, junto a su distancia.
comprobar(
  conUVB.every((b) => (b.match(/Lámpara UVB/g) ?? []).length === 1),
  `el nombre de la lámpara no debería salir dos veces: ${conUVB[0]?.slice(0, 200)}`
)
comprobar(conUVB.length === 1, `debería haber una sesión con la lámpara de UVB: ${bloques.length}`)
comprobar(
  conUVB.every((b) => /vitamina D/i.test(b)),
  `la sesión con UVB debería decir su vitamina D: ${conUVB.join(' | ').slice(0, 300)}`
)
comprobar(
  sinUVB.every((b) => !/vitamina D/i.test(b)),
  'una lámpara sin ultravioleta B no puede decir que ha hecho vitamina D'
)
const ui = /([\d.]+)\s*UI/.exec(conUVB[0] ?? '')
comprobar(ui !== null, `debería dar una cifra de UI: ${conUVB[0]?.slice(0, 200)}`)
console.log('  · la sesión con UVB dice:', ui?.[0])

// El rojo e infrarrojo se separa del total, que es lo que va a la mitocondria.
comprobar(/mitocondria/.test(texto), 'debería separar lo que va a la mitocondria')

await page.screenshot({ path: `${OUT}/pbm-historial.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log(
  '✓ el histórico enseña cada sesión con su dosis y su distancia, y la vitamina D solo donde hay ultravioleta B'
)
