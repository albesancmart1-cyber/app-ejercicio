/**
 * El sol y la vitamina D, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  1. En Hoy se apunta un rato de sol con tres toques —minutos, franja, piel—
 *     y la tarjeta estima la vitamina D **como rango**, nunca como cifra exacta.
 *  2. Dos ratos se acumulan, y se puede quitar uno.
 *  3. En Progreso · Cuerpo, la semana dice días con sol, días de mediodía y
 *     las UI acumuladas.
 *  4. En pleno invierno la app no reparte UI imaginarias: avisa del invierno
 *     vitamínico. (Se comprueba el texto según el mes que sea hoy.)
 *
 *   node scripts/check-sol.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
mkdirSync(OUT, { recursive: true })

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'es-ES' })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

await page.goto(BASE)
await page.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 80,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas'],
        maxWeights: { mancuernas: 24 }
      },
      checkIns: [
        {
          date: menos(0),
          sleep: 4,
          lightHygiene: true,
          sunrise: true,
          sunsetYesterday: true,
          sunExposure: true,
          keto: true,
          energy: 4,
          discomfort: 'ninguna'
        }
      ],
      sessions: [],
      measurements: [],
      // Dos días de sol ya apuntados esta semana, para la vista de Progreso.
      sol: [
        { date: menos(2), exposiciones: [{ minutos: 30, franja: 'mediodia', piel: 'brazos_piernas' }] },
        { date: menos(1), exposiciones: [{ minutos: 15, franja: 'tarde', piel: 'cara_manos' }] }
      ]
    })
  )
})
await page.goto(BASE)
await page.waitForTimeout(800)

// ── 1 · Apuntar un rato de hoy ────────────────────────────
const tarjeta = page.locator('.sol-hoy')
comprobar((await tarjeta.count()) > 0, 'no está la tarjeta del sol en Hoy')
await tarjeta.getByRole('button', { name: 'He estado al sol' }).click()
await page.waitForTimeout(300)
await tarjeta.getByRole('button', { name: '15 min', exact: true }).click()
await tarjeta.getByRole('button', { name: 'Mediodía (12–16 h)' }).click()
await tarjeta.getByRole('button', { name: 'Brazos o piernas' }).click()
await tarjeta.getByRole('button', { name: 'Apuntar el sol' }).click()
await page.waitForTimeout(400)

let texto = await tarjeta.innerText()
comprobar(/15 min/.test(texto), 'el rato apuntado no se ve')
const esInvierno = [11, 12, 1, 2].includes(new Date().getMonth() + 1)
if (esInvierno) {
  // 4 · En invierno no se venden UI: se avisa del invierno vitamínico.
  comprobar(/apenas sintetiza/.test(texto), 'en invierno no avisa del invierno vitamínico')
} else {
  comprobar(
    /unas [\d.]+–[\d.]+ UI/.test(texto),
    `la estimación no sale como rango: ${texto.slice(0, 220)}`
  )
  comprobar(/estimación/.test(texto), 'no dice que es una estimación')
}
await tarjeta.screenshot({ path: `${OUT}/sol-hoy.png` })

// ── 2 · Acumular y quitar ─────────────────────────────────
await tarjeta.getByRole('button', { name: 'He estado al sol' }).click()
await page.waitForTimeout(250)
await tarjeta.getByRole('button', { name: '30 min', exact: true }).click()
await tarjeta.getByRole('button', { name: 'Por la tarde' }).click()
await tarjeta.getByRole('button', { name: 'Cara y manos' }).click()
await tarjeta.getByRole('button', { name: 'Apuntar el sol' }).click()
await page.waitForTimeout(400)
comprobar(/30 min/.test(await tarjeta.innerText()), 'el segundo rato no se acumula')

await tarjeta.getByLabel('Quitar el rato de sol de 30 minutos').click()
await page.waitForTimeout(300)
comprobar(!/30 min/.test(await tarjeta.innerText()), 'quitar el rato no lo quita')

// Guardado de verdad.
const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  return d.sol?.find((x) => x.date === hoy)
})
comprobar(guardado?.exposiciones?.length === 1, `debería quedar 1 rato hoy y hay ${guardado?.exposiciones?.length}`)

// ── 3 · La semana en Progreso · Cuerpo ────────────────────
await page.getByRole('button', { name: 'Progreso', exact: true }).click()
await page.waitForTimeout(600)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(700)
const semana = page.locator('.card').filter({ hasText: 'Sol y vitamina D' }).first()
comprobar((await semana.count()) > 0, 'no está la tarjeta semanal de sol en Cuerpo')
if (await semana.count()) {
  await semana.scrollIntoViewIfNeeded()
  const t = await semana.innerText()
  comprobar(/3 de 7 días con sol/.test(t), `la cuenta de días no cuadra: ${t.slice(0, 160)}`)
  comprobar(/2 de ellos al mediodía/.test(t), `los días de mediodía no cuadran: ${t.slice(0, 200)}`)
  await semana.screenshot({ path: `${OUT}/sol-semana.png` })
}

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Sol y vitamina D: bien. Capturas en ${OUT}`)
