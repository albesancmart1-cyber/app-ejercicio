/**
 * El sol apuntado a mano, en navegador.
 *
 * El usuario trae las UI de vitamina D de otra app que las calcula con más
 * datos, así que aquí no se estima: se apuntan minutos totales y UI exactas.
 *
 * Lo que tiene que pasar:
 *
 *  1. En Hoy se apuntan los minutos y las UI a mano, y se guardan tal cual.
 *  2. La cifra manual se enseña **exacta** («6400 UI»), sin «unas» ni redondeo.
 *  3. Se puede corregir lo apuntado.
 *  4. En Progreso · Cuerpo la semana acumula las UI manuales exactas.
 *  5. Los días viejos apuntados por ratos (franja y piel) siguen contando.
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
      sol: [
        // Anteayer, a mano: minutos y UI exactas de la otra app.
        { date: menos(2), minutos: 40, ui: 6000, exposiciones: [] },
        // Ayer, del formato viejo por ratos: tiene que seguir contando.
        { date: menos(1), exposiciones: [{ minutos: 15, franja: 'mediodia', piel: 'brazos_piernas' }] }
      ]
    })
  )
})
await page.goto(BASE)
await page.waitForTimeout(800)

// ── 1 y 2 · Apuntar a mano ────────────────────────────────
const tarjeta = page.locator('.sol-hoy')
comprobar((await tarjeta.count()) > 0, 'no está la tarjeta del sol en Hoy')
await tarjeta.getByRole('button', { name: 'Apuntar el sol de hoy' }).click()
await page.waitForTimeout(300)
await tarjeta.getByLabel('Minutos totales al sol hoy').fill('55')
await tarjeta.getByLabel('UI de vitamina D de hoy').fill('6400')
await tarjeta.getByRole('button', { name: 'Guardar el sol de hoy' }).click()
await page.waitForTimeout(400)

const texto = await tarjeta.innerText()
comprobar(/55 min al sol/.test(texto), `los minutos no se ven: ${texto.slice(0, 160)}`)
comprobar(/6400 UI/.test(texto), `la cifra manual no sale exacta: ${texto.slice(0, 160)}`)
comprobar(!/unas 6/.test(texto), 'una cifra exacta no debe llevar «unas»')
await tarjeta.screenshot({ path: `${OUT}/sol-manual.png` })

const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  return d.sol?.find((x) => x.date === hoy)
})
comprobar(guardado?.minutos === 55 && guardado?.ui === 6400, `no se guardó bien: ${JSON.stringify(guardado)}`)

// ── 3 · Corregir ──────────────────────────────────────────
await tarjeta.getByRole('button', { name: 'Corregir el sol de hoy' }).click()
await page.waitForTimeout(300)
await tarjeta.getByLabel('UI de vitamina D de hoy').fill('7100')
await tarjeta.getByRole('button', { name: 'Guardar el sol de hoy' }).click()
await page.waitForTimeout(400)
comprobar(/7100 UI/.test(await tarjeta.innerText()), 'corregir las UI no las corrige')

// ── 4 y 5 · La semana acumula manual y ratos viejos ───────
await page.getByRole('button', { name: 'Progreso', exact: true }).click()
await page.waitForTimeout(600)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(700)
const semana = page.locator('.card').filter({ hasText: 'Sol y vitamina D' }).first()
comprobar((await semana.count()) > 0, 'no está la tarjeta semanal en Cuerpo')
if (await semana.count()) {
  await semana.scrollIntoViewIfNeeded()
  const t = await semana.innerText()
  comprobar(/3 de 7 días con sol/.test(t), `la cuenta de días no cuadra: ${t.slice(0, 180)}`)
  // 6000 + 7100 manuales más el rango estimado del día por ratos.
  comprobar(/1[0-9]\.\d{3}|1[0-9]\d{3}/.test(t.replace(/\s/g, '')), `las UI acumuladas no cuadran: ${t.slice(0, 220)}`)
  await semana.screenshot({ path: `${OUT}/sol-semana.png` })
}

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Sol manual: bien. Capturas en ${OUT}`)
