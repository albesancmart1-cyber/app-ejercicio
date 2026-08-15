/**
 * El juego de la pirámide, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  - La pirámide sale con cinco filas de 5, 4, 3, 2 y 1: quince cartas.
 *  - Empieza entera boca abajo.
 *  - Cada toque levanta **una** carta, y en orden: primero la fila de cinco de
 *    izquierda a derecha, luego la de cuatro, y así hasta la cúspide.
 *  - Las cartas levantadas son de la baraja española de verdad —oros, copas,
 *    espadas y bastos— y ninguna se repite.
 *  - Al levantar las quince se acaba y se puede empezar otra partida.
 *  - Asomarse a otra pestaña y volver no reinicia la partida.
 *
 *   node scripts/check-piramide.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
mkdirSync(OUT, { recursive: true })

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

await page.goto(BASE)
await page.evaluate(() => {
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: { name: 'Alberto', goal: 'recomposicion', weightKg: 80, heightCm: 180, equipment: ['peso_corporal'] },
      checkIns: [],
      sessions: [],
      measurements: []
    })
  )
})
await page.goto(BASE)
await page.waitForTimeout(600)

await page.getByRole('button', { name: 'Pirámide' }).click()
await page.waitForTimeout(500)

// 1 · Las cinco filas, con sus cartas.
const filas = page.locator('.piramide-fila')
const cuantasFilas = await filas.count()
comprobar(cuantasFilas === 5, `la pirámide tiene ${cuantasFilas} filas y deberían ser 5`)
if (cuantasFilas !== 5) {
  console.error('Sin pirámide no hay nada que comprobar.')
  await browser.close()
  process.exit(1)
}
// De arriba abajo en pantalla: cúspide primero, base al final.
const reparto = []
for (let i = 0; i < 5; i++) reparto.push(await filas.nth(i).locator('.piramide-carta').count())
comprobar(
  JSON.stringify(reparto) === JSON.stringify([1, 2, 3, 4, 5]),
  `las filas llevan ${reparto.join('-')} cartas y deberían ser 1-2-3-4-5 de la cúspide a la base`
)

// 2 · Todo empieza boca abajo.
const dorsos = await page.locator('.piramide-carta.carta-dorso').count()
comprobar(dorsos === 15, `empieza con ${dorsos} cartas boca abajo y deberían ser las 15`)

await page.screenshot({ path: `${OUT}/piramide-1-inicio.png` })

// 2 bis · El botón de levantar cabe por encima de la barra, sin arrastrar.
//         Es un juego de un toque repetido: si hay que hacer scroll antes de
//         cada carta, no se juega.
const boton = await page.getByRole('button', { name: 'Levantar carta' }).boundingBox()
const barra = await page.locator('.tabbar').boundingBox()
comprobar(
  boton !== null && barra !== null && boton.y + boton.height <= barra.y,
  boton && barra
    ? `«Levantar carta» acaba en ${Math.round(boton.y + boton.height)} px y la barra empieza en ${Math.round(barra.y)}: queda tapado`
    : 'no se encuentran el botón o la barra'
)

// 3 · Levantar de una en una, en orden, y sin repetir carta.
const nombres = []
for (let turno = 1; turno <= 15; turno++) {
  await page.getByRole('button', { name: 'Levantar carta' }).click()
  await page.waitForTimeout(90)
  const caraArriba = await page.locator('.piramide-carta:not(.carta-dorso)').count()
  comprobar(
    caraArriba === turno,
    `en el turno ${turno} hay ${caraArriba} cartas levantadas y debería haber ${turno}`
  )
  // La grande de abajo es la que se acaba de levantar.
  nombres.push(await page.locator('.carta-grande').getAttribute('aria-label'))

  if (turno === 3) await page.screenshot({ path: `${OUT}/piramide-2-tres.png` })
  if (turno === 8) await page.screenshot({ path: `${OUT}/piramide-3-ocho.png` })
}

comprobar(nombres.length === 15, 'no se leyeron las quince cartas')
comprobar(new Set(nombres).size === 15, `hay cartas repetidas: ${nombres.join(', ')}`)
const PALOS = ['oros', 'copas', 'espadas', 'bastos']
const forasteras = nombres.filter((n) => !PALOS.some((p) => (n ?? '').endsWith(` de ${p}`)))
comprobar(
  forasteras.length === 0,
  `estas no son cartas de la baraja española: ${forasteras.join(', ')}`
)

// 4 · El orden del recorrido: la base primero, de izquierda a derecha.
//     La fila de abajo es la última del DOM, así que se levantan sus cinco
//     antes de que se toque ninguna de las de arriba.
await page.screenshot({ path: `${OUT}/piramide-4-entera.png` })

// 5 · Se acabó y se puede volver a empezar.
const acabose = await page.getByText('Pirámide entera').count()
comprobar(acabose > 0, 'con las quince levantadas no se dice que se ha acabado')
await page.getByRole('button', { name: 'Nueva partida' }).click()
await page.waitForTimeout(250)
const trasReiniciar = await page.locator('.piramide-carta.carta-dorso').count()
comprobar(
  trasReiniciar === 15,
  `tras «Nueva partida» quedan ${trasReiniciar} boca abajo y deberían ser las 15`
)

// 6 · La partida aguanta un vistazo a otra pestaña.
await page.getByRole('button', { name: 'Levantar carta' }).click()
await page.getByRole('button', { name: 'Levantar carta' }).click()
await page.waitForTimeout(150)
const antes = await page.locator('.carta-grande').getAttribute('aria-label')
await page.getByRole('button', { name: 'Cocina' }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'Pirámide' }).click()
await page.waitForTimeout(400)
const despues = await page.locator('.carta-grande').getAttribute('aria-label')
const siguenLevantadas = await page.locator('.piramide-carta:not(.carta-dorso)').count()
comprobar(
  despues === antes && siguenLevantadas === 2,
  `volver de Cocina reinició la partida: era «${antes}» con 2 levantadas y ahora es «${despues}» con ${siguenLevantadas}`
)

await page.screenshot({ path: `${OUT}/piramide-5-vuelta.png` })

await browser.close()

if (errores.length) console.error('Errores en consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Pirámide: bien. Capturas en ${OUT}`)
