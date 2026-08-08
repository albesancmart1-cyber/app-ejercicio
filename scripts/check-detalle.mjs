/**
 * El detalle de un entreno del historial, en navegador.
 *
 * Comprueba que la fila se puede pulsar, que el detalle enseña los totales, el
 * peso y las repeticiones de cada serie, y que la figura humana enciende los
 * músculos que se trabajaron y **solo** esos.
 *
 *   node scripts/check-detalle.mjs
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

/** Un entreno de pecho y espalda, con pesos y repeticiones distintos por serie. */
const SESION = {
  id: 'la-de-ayer',
  date: '2026-08-04',
  kind: 'fuerza',
  title: 'Fuerza · pecho y espalda',
  completed: true,
  durationSec: 3120,
  rpe: 4,
  exercises: [
    {
      exerciseId: 'press_banca_mancuernas',
      name: 'Press de banca con mancuernas',
      primary: 'pecho',
      plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120 },
      logs: [
        { weightKg: 10, reps: 12, done: true, warmup: true },
        { weightKg: 22, reps: 10, done: true },
        { weightKg: 22, reps: 9, done: true },
        { weightKg: 22, reps: 8, done: true }
      ]
    },
    {
      exerciseId: 'remo_mancuerna',
      name: 'Remo con mancuerna a una mano',
      primary: 'espalda',
      plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120 },
      logs: [
        { weightKg: 24, reps: 10, done: true },
        { weightKg: 24, reps: 10, done: true },
        { weightKg: 24, reps: 9, done: true }
      ]
    }
  ]
}

await page.goto(BASE)
await page.evaluate(
  ([sesion]) => {
    localStorage.setItem(
      'ritmo-data-v1',
      JSON.stringify({
        version: 2,
        profile: {
          name: 'Alberto',
          goal: 'recomposicion',
          equipment: ['peso_corporal', 'mancuernas', 'banco'],
          maxWeights: { mancuernas: 24 }
        },
        checkIns: [],
        sessions: [sesion],
        measurements: []
      })
    )
  },
  [SESION]
)

await page.goto(BASE)
await page.waitForTimeout(800)
await page.getByText('Cuerpo', { exact: true }).first().click()
await page.waitForTimeout(700)

// ── La fila se puede pulsar ───────────────────────────────
const fila = page.locator('.item-tap', { hasText: 'pecho y espalda' })
comprobar(await fila.count(), 'la sesión del historial no se puede pulsar')
if ((await fila.count()) === 0) {
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}
await fila.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/detalle-1-lista.png` })
await fila.first().click()
await page.waitForTimeout(600)

const detalle = page.locator('.session-detail')
comprobar(await detalle.count(), 'no se abre el detalle al pulsar')
const texto = await detalle.first().innerText()

// ── Los totales ───────────────────────────────────────────
// 3 series de press + 3 de remo (el calentamiento no cuenta) = 6.
comprobar(/\b6\b/.test(texto), `deberían salir 6 series: ${texto.slice(0, 300)}`)
// 27 repeticiones de press + 29 de remo = 56.
comprobar(/\b56\b/.test(texto), 'deberían salir 56 repeticiones')
// 22×27 + 24×29 = 594 + 696 = 1290 kg.
comprobar(/1\D?290 kg/.test(texto), `debería salir la carga total: ${texto.slice(0, 400)}`)
comprobar(/52:00|52 min/.test(texto), `debería salir la duración: ${texto.slice(0, 300)}`)

// ── Serie a serie, con su peso y sus repeticiones ─────────
const series = await page.locator('.set-list li').allInnerTexts()
comprobar(series.length === 7, `deberían verse las 7 series anotadas, hay ${series.length}`)
comprobar(
  series.some((s) => s.includes('22 kg') && s.includes('× 9')),
  `falta la serie de 22 kg × 9: ${series.join(' | ')}`
)
comprobar(
  series.some((s) => /calentamiento/i.test(s)),
  `el calentamiento debería distinguirse de las series que cuentan: ${series.join(' | ')}`
)
await page.screenshot({ path: `${OUT}/detalle-2-resumen.png` })

// ── La figura humana ──────────────────────────────────────
const figuras = await page.locator('.bodymap').count()
comprobar(figuras === 2, `deberían verse las dos vistas del cuerpo, hay ${figuras}`)

const encendidos = await page
  .locator('.bodymap-list li')
  .evaluateAll((ns) => ns.map((n) => n.textContent))
const nombres = encendidos.join(' | ')
for (const musculo of ['Pectoral mayor', 'Dorsal ancho', 'Espalda alta']) {
  comprobar(nombres.includes(musculo), `falta ${musculo} entre lo trabajado: ${nombres}`)
}
// Nada de pierna en un día de pecho y espalda.
for (const musculo of ['Cuádriceps', 'Isquiosurales', 'Sóleo']) {
  comprobar(!nombres.includes(musculo), `${musculo} no se trabajó y aparece encendido: ${nombres}`)
}
// El agarre del remo con mancuerna sí cuenta, a media serie.
comprobar(nombres.includes('Antebrazo'), `el remo con mancuerna trabaja el agarre: ${nombres}`)

const manchas = await page.locator('.bodymap-on').count()
comprobar(manchas > 0, 'la figura no enciende ningún músculo')

await page.locator('.bodymap-pair').first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/detalle-3-figura.png` })

// Hasta el final de la hoja: la última línea no puede quedar debajo de la
// cápsula de navegación, que flota por encima.
await page.locator('.picker-list').first().evaluate((n) => (n.scrollTop = n.scrollHeight))
await page.waitForTimeout(400)
const ultima = page.locator('.set-list li').last()
const caja = await ultima.boundingBox()
comprobar(caja !== null && caja.y + caja.height < 844 - 40, 'lo último del resumen queda tapado por la barra')
await page.screenshot({ path: `${OUT}/detalle-4-final.png` })

// ── Se puede cerrar y volver ──────────────────────────────
await page.getByRole('button', { name: /Cerrar el detalle/ }).click()
await page.waitForTimeout(500)
comprobar((await page.locator('.session-detail').count()) === 0, 'no se cierra el detalle')
comprobar(await page.locator('.item-tap').count(), 'al cerrar no se vuelve al historial')

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el entreno se abre, cuenta lo hecho serie a serie y enciende los músculos trabajados')
