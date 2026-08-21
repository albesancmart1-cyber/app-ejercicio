/**
 * Estaciones robadas, callo solar, higiene y skygazing, en navegador.
 *
 * Lo que tiene que pasar: que las cuatro tarjetas salgan; que apuntar la noche
 * sea posible —la app la pedía sin dar forma de darla, que es la clase de
 * agujero que hace que una pantalla parezca completa y no lo esté—; que ocho
 * horas de oscuridad en invierno se marquen como otra estación; y que la barra
 * de oscuridad del balance deje de decir «no había» en cuanto hay dato.
 *
 *   node scripts/check-estaciones.mjs
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
const texto = () => page.locator('.card-wrap').innerText()

const iso = (d) => d.toISOString().slice(0, 10)
const menos = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return iso(d)
}
const dias = [0, 1, 2, 3, 4, 5, 6].map(menos)

await page.goto(BASE)
await page.evaluate(
  ([d]) =>
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
          heightCm: 178
        },
        checkIns: [],
        sessions: [],
        measurements: [],
        salidas: d.map((x, i) => ({
          id: 's' + i,
          date: x,
          desde: 13 * 60,
          minutos: 25,
          filtro: 'ninguno'
        }))
      })
    ),
  [dias]
)
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Luz' }).click()
await page.waitForTimeout(700)

// ── Las cuatro tarjetas ────────────────────────────────────────────────
const t = await texto()
for (const clave of ['Tus estaciones', 'Callo solar', 'Mirar al cielo', 'Higiene de luz']) {
  comprobar(t.includes(clave), `falta la tarjeta «${clave}»`)
}
comprobar(t.includes('no un permiso'), 'el callo solar debería decir que no es un permiso')
comprobar(
  t.includes('Desde el solsticio'),
  'el callo debería anclarse al solsticio, no al 1 de enero'
)
await page.screenshot({ path: `${OUT}/est-01-tarjetas.png`, fullPage: true })

// ── Apuntar la noche: el agujero que había ─────────────────────────────
comprobar(
  await page.getByRole('button', { name: 'Apuntar la noche' }).isVisible(),
  'la app pedía la noche sin dar ninguna forma de apuntarla'
)
await page.getByRole('button', { name: 'Apuntar la noche' }).click()
await page.getByLabel('Hora en que se apagó todo').fill('00:30')
await page.getByLabel('Hora en que me levanté').fill('06:30')
await page.getByRole('button', { name: 'Guardar la noche' }).click()
await page.waitForTimeout(500)

const noches = (await datos()).noches ?? []
comprobar(noches.length === 1, `la noche debería guardarse, hay ${noches.length}`)
comprobar(
  noches[0]?.apagado === 30 && noches[0]?.levantado === 390,
  `con sus horas en minutos: ${JSON.stringify(noches[0])}`
)

const conNoche = await texto()
comprobar(
  conNoche.includes('6 h'),
  `una noche de 00:30 a 06:30 son seis horas, no menos dieciocho: ${conNoche.match(/\(\d+ h[^)]*\)/)?.[0]}`
)
await page.screenshot({ path: `${OUT}/est-02-noche.png` })

// ── El balance ya no supone la oscuridad: la sabe ──────────────────────
comprobar(
  /Oscuridad de noche\s*\n?\s*\d+ %/.test(conNoche),
  'con la noche apuntada, la barra de oscuridad debería dar un porcentaje y no «no había»'
)

// ── Y las estaciones dejan de estar en blanco ──────────────────────────
const soloEstaciones = (conNoche.split('Tus estaciones')[1] ?? '').split('Callo solar')[0]
comprobar(
  !soloEstaciones.trimStart().startsWith('—'),
  'con la noche de ayer apuntada, «tu oscuridad» debería tener una cifra'
)

// ── Los costes de la noche, con su alternativa ─────────────────────────
await page.getByRole('button', { name: 'Qué cuesta cada cosa encendida' }).click()
await page.waitForTimeout(300)
const conCostes = await texto()
comprobar(conCostes.includes('−90 min'), 'los costes deberían darse en minutos de oscuridad')
comprobar(
  conCostes.includes('Lámparas bajas'),
  'y cada uno con su alternativa barata, no solo el reproche'
)
await page.screenshot({ path: `${OUT}/est-03-costes.png`, fullPage: true })

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
console.log('✓ estaciones, callo solar, higiene con la noche apuntable, y skygazing')
