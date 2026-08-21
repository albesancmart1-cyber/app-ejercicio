/**
 * Suplementación dentro de la comida, en navegador.
 *
 * Lo que tiene que pasar: que un suplemento se cree **una vez** con sus mg por
 * cápsula y quede para siempre; que se añada a una comida con un toque y que
 * volver a tocarlo suba una cápsula; que se guarde en `suplementos` de la
 * comida y **no** entre los alimentos —porque no es un alimento—; y que el
 * ratio de omegas se enseñe solo de comida y con suplemento, con la cobertura
 * al lado.
 *
 *   node scripts/check-suplementos.mjs
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
const datos = () => page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')))

await page.goto(BASE)
await page.evaluate(() => {
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        equipment: ['peso_corporal'],
        maxWeights: {},
        heightCm: 178
      },
      checkIns: [],
      sessions: [],
      measurements: []
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Cocina' }).click()
await page.waitForTimeout(600)

// ── Apuntar una comida con pescado, para que haya omegas de comida ─────
await page.getByRole('button', { name: 'Añadir comida' }).first().click()
await page.waitForTimeout(300)
await page.getByLabel('Nombre del alimento').fill('Huevo frito')
await page.waitForTimeout(400)
await page.getByText('Huevo frito', { exact: true }).last().click()
await page.waitForTimeout(300)

// ── Crear el suplemento: una vez, y ya está para siempre ───────────────
await page.getByRole('button', { name: 'Crear un suplemento' }).click()
await page.getByPlaceholder('Omega-3 Nordic').fill('Omega-3 Nordic')
await page.getByPlaceholder('330').fill('330')
await page.getByPlaceholder('110').fill('110')
await page.screenshot({ path: `${OUT}/sup-01-crear.png` })
await page.getByRole('button', { name: 'Guardar y añadir a esta comida' }).click()
await page.waitForTimeout(400)

const creados = (await datos()).suplementos ?? []
comprobar(creados.length === 1, `debería haber un suplemento creado, hay ${creados.length}`)
comprobar(
  creados[0]?.dhaMg === 330 && creados[0]?.epaMg === 110,
  `con sus mg por cápsula: ${JSON.stringify(creados[0])}`
)

const conUna = await page.locator('.card-wrap, .cards-grid').first().innerText()
comprobar(conUna.includes('Suplem.'), 'debería verse marcado como suplementación, no como alimento')
comprobar(
  conUna.includes('330 mg DHA'),
  `y decir lo que aporta una cápsula: ${conUna.match(/[\d.]+ mg DHA/)?.[0]}`
)

// ── Tocarlo otra vez sube una cápsula ──────────────────────────────────
await page.getByRole('button', { name: '＋ Omega-3 Nordic' }).click()
await page.waitForTimeout(300)
const conDos = await page.locator('.card-wrap, .cards-grid').first().innerText()
comprobar(
  conDos.includes('660 mg DHA'),
  `dos cápsulas deberían ser 660 mg de DHA: ${conDos.match(/[\d.]+ mg DHA/)?.[0]}`
)
await page.screenshot({ path: `${OUT}/sup-02-dos-capsulas.png` })

// ── Guardar la comida ──────────────────────────────────────────────────
await page.getByRole('button', { name: /^Guardar/ }).last().click()
await page.waitForTimeout(600)

const dia = ((await datos()).comidas ?? [])[0]
const comida = dia?.comidas?.[0]
comprobar(comida !== undefined, 'la comida debería haberse guardado')
comprobar(
  comida?.suplementos?.length === 1 && comida.suplementos[0].capsulas === 2,
  `las cápsulas van en su propio sitio: ${JSON.stringify(comida?.suplementos)}`
)
comprobar(
  !(comida?.alimentos ?? []).some((a) => /omega/i.test(a.nombre)),
  'y NO entre los alimentos, porque un suplemento no es un alimento'
)

// ── El ratio, en sus tres versiones ────────────────────────────────────
const pantalla = await page.locator('.cards-grid').first().innerText()
comprobar(pantalla.includes('Omega 3 : 6 de hoy'), 'debería aparecer la tarjeta del ratio')
comprobar(pantalla.includes('Solo de comida'), 'con el ratio solo de comida')
comprobar(pantalla.includes('Con suplemento'), 'y con el del suplemento')

// El huevo es omega-6, así que el suplemento tiene que mejorar el número.
const soloComida = pantalla.match(/Solo de comida\s*\n?\s*1 : ([\d,]+)/)?.[1]
const conSup = pantalla.match(/Con suplemento\s*\n?\s*1 : ([\d,]+)/)?.[1]
comprobar(
  soloComida !== undefined && conSup !== undefined,
  `deberían leerse los dos ratios: comida=${soloComida} suplemento=${conSup}`
)
if (soloComida && conSup) {
  const n = (x) => Number(x.replace(',', '.'))
  comprobar(
    n(conSup) < n(soloComida),
    `el suplemento debería mejorar el ratio: ${soloComida} → ${conSup}`
  )
}
await page.screenshot({ path: `${OUT}/sup-03-ratio.png`, fullPage: true })

const desborde = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
)
comprobar(desborde === 0, `la pantalla se desborda ${desborde} px a lo ancho`)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el suplemento se crea una vez, se añade a la comida y mejora el ratio sin ser comida')
