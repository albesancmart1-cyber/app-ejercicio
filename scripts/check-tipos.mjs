/**
 * Los tipos de serie, en navegador.
 *
 * Comprueba que el número de la serie cicla entre normal, calentamiento, al
 * fallo y drop set; que lo elegido se guarda; y que cada tipo cuenta como debe
 * en el volumen —el calentamiento nada, el drop medio—.
 *
 *   node scripts/check-tipos.mjs
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

await page.goto(BASE)
await page.evaluate(
  ([fecha]) => {
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
        measurements: [],
        sessions: [
          {
            id: 'de-hoy',
            date: fecha,
            kind: 'fuerza',
            title: 'Fuerza · pecho',
            completed: false,
            startedAt: Date.now(),
            exercises: [
              {
                exerciseId: 'press_banca_mancuernas',
                name: 'Press de banca con mancuernas',
                primary: 'pecho',
                plan: { sets: 4, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 14 },
                logs: [
                  { weightKg: 14, done: false },
                  { weightKg: 14, done: false },
                  { weightKg: 14, done: false },
                  { weightKg: 14, done: false }
                ]
              }
            ]
          }
        ]
      })
    )
  },
  [hoy]
)

await page.goto(BASE)
await page.waitForTimeout(1000)

const tarjeta = page.locator('.card').filter({ hasText: 'Press de banca con mancuernas' })
if ((await tarjeta.count()) === 0) {
  console.error('✗ no se ha recuperado la sesión en marcha')
  await page.screenshot({ path: `${OUT}/tipos-0-sin-sesion.png` })
  await browser.close()
  process.exit(1)
}

const botonTipo = (i) => tarjeta.locator('.set-type').nth(i)

// ── Empieza en normal y cicla ─────────────────────────────
comprobar((await botonTipo(0).innerText()) === '1', 'la primera serie debería empezar como normal, con su número')

await botonTipo(0).click()
await page.waitForTimeout(200)
comprobar((await botonTipo(0).innerText()) === 'C', 'un toque debería dejarla en calentamiento')

await botonTipo(1).click()
await botonTipo(1).click()
await page.waitForTimeout(200)
comprobar((await botonTipo(1).innerText()) === 'F', 'dos toques deberían dejarla al fallo')

await botonTipo(2).click()
await botonTipo(2).click()
await botonTipo(2).click()
await page.waitForTimeout(200)
comprobar((await botonTipo(2).innerText()) === 'D', 'tres toques deberían dejarla como drop set')

await botonTipo(3).click()
await botonTipo(3).click()
await botonTipo(3).click()
await botonTipo(3).click()
await page.waitForTimeout(200)
comprobar((await botonTipo(3).innerText()) === '4', 'cuatro toques deberían volver a normal')
await tarjeta.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/tipos-1-ciclado.png` })

// ── Lo elegido se guarda ──────────────────────────────────
const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const s = d.sessions.find((x) => !x.completed)
  return s.exercises[0].logs.map((l) => l.tipo ?? 'normal')
})
comprobar(
  guardado.join(',') === 'calentamiento,fallo,drop,normal',
  `los tipos deberían guardarse: ${JSON.stringify(guardado)}`
)
console.log('  · tipos guardados:', JSON.stringify(guardado))

// ── Y cuentan como deben en el volumen ────────────────────
for (let i = 0; i < 4; i++) {
  await tarjeta.getByRole('button', { name: new RegExp(`Marcar serie ${i + 1}`) }).click()
  await page.waitForTimeout(150)
}
await page.waitForTimeout(400)

const series = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const s = d.sessions.find((x) => !x.completed)
  s.completed = true
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
  return s.exercises[0].logs.filter((l) => l.done).length
})
comprobar(series === 4, `deberían quedar las cuatro series marcadas, hay ${series}`)

await page.goto(BASE)
await page.waitForTimeout(900)
await page.getByText('Cuerpo', { exact: true }).first().click()
await page.waitForTimeout(700)
await page.locator('.item-tap').first().click()
await page.waitForTimeout(700)

const detalle = await page.locator('.session-detail').first().innerText()
// Calentamiento 0 + fallo 1 + drop 0,5 + normal 1 = 2,5
comprobar(/2[.,]5/.test(detalle), `el total de series debería ser 2,5: ${detalle.slice(0, 260)}`)
comprobar(/calentamiento/i.test(detalle), 'el calentamiento debería identificarse en el desglose')
comprobar(/drop set/i.test(detalle), 'el drop set debería identificarse en el desglose')
comprobar(/al fallo/i.test(detalle), 'la serie al fallo debería identificarse')
await page.screenshot({ path: `${OUT}/tipos-2-historial.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ los cuatro tipos de serie se eligen, se guardan y cuentan cada uno lo suyo')
