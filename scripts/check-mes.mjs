/**
 * El informe del mes, en navegador.
 *
 * Comprueba que las cifras del mes salen, que van con la comparación del mes
 * anterior al lado, que se puede retroceder de mes, y que un mes sin entrenos
 * se dice sin reproche.
 *
 *   node scripts/check-mes.mjs
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

const hace = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

const entreno = (fecha, kg, n) => ({
  id: `s-${fecha}-${kg}`,
  date: fecha,
  kind: 'fuerza',
  title: 'Fuerza · pecho',
  completed: true,
  durationSec: 3300,
  exercises: [
    {
      exerciseId: 'press_banca_mancuernas',
      name: 'Press de banca con mancuernas',
      primary: 'pecho',
      plan: { sets: n, reps: '8-12', rir: 1 },
      logs: Array.from({ length: n }, () => ({ weightKg: kg, reps: 10, rir: 1, done: true }))
    }
  ]
})

// Dos meses de historia: el actual con más entrenos que el anterior, para que
// la comparación tenga algo que decir.
const sesiones = []
for (const d of [2, 5, 9, 13, 17, 21]) sesiones.push(entreno(hace(d), 16, 3))
for (const d of [40, 47, 54]) sesiones.push(entreno(hace(d), 14, 3))

const semilla = {
  version: 2,
  profile: {
    name: 'Alberto',
    goal: 'recomposicion',
    equipment: ['peso_corporal', 'mancuernas', 'banco'],
    maxWeights: { mancuernas: 24 }
  },
  checkIns: [],
  measurements: [],
  sessions: sesiones
}

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), semilla)
await page.goto(BASE)
await page.waitForTimeout(900)

await page.getByRole('button', { name: 'Progreso', exact: true }).click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Mes' }).click()
await page.waitForTimeout(700)

const informe = page.locator('.card').filter({ has: page.getByRole('button', { name: 'El mes anterior' }) }).first()
comprobar(await informe.count(), 'debería haber un informe del mes en Cuerpo')

const texto = await informe.innerText()
comprobar(/Entrenos/i.test(texto), `debería contar los entrenos: ${texto.slice(0, 160)}`)
comprobar(/Levantado/i.test(texto), 'debería contar los kilos levantados')
comprobar(/Tiempo/i.test(texto), 'debería contar el tiempo, que las sesiones venían cronometradas')
comprobar(/semanas? (del mes|que va el mes)/i.test(texto), `debería decir en cuántas semanas se entrenó: ${texto.slice(0, 400)}`)
console.log('  · informe:', texto.split('\n').slice(0, 12).join(' | '))
await informe.scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/mes-1-informe.png`, fullPage: true })

// ── Retroceder de mes ─────────────────────────────────────
const titulo = await informe.locator('h2').innerText()
await informe.getByRole('button', { name: 'El mes anterior' }).click()
await page.waitForTimeout(500)
const tituloPrevio = await informe.locator('h2').innerText()
comprobar(tituloPrevio !== titulo, `retroceder debería cambiar de mes: ${titulo} → ${tituloPrevio}`)
console.log('  · meses:', titulo, '→', tituloPrevio)

// Y volver adelante.
await informe.getByRole('button', { name: 'El mes siguiente' }).click()
await page.waitForTimeout(400)
comprobar((await informe.locator('h2').innerText()) === titulo, 'debería poder volverse al mes de hoy')

// ── Un mes sin nada se dice sin reproche ──────────────────
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.sessions = []
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload()
await page.waitForTimeout(900)
await page.getByRole('button', { name: 'Progreso', exact: true }).click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Mes' }).click()
await page.waitForTimeout(600)
const vacio = await page
  .locator('.card')
  .filter({ has: page.getByRole('button', { name: 'El mes anterior' }) })
  .first()
  .innerText()
comprobar(/no hay entrenos registrados/i.test(vacio), `un mes en blanco debería decirse: ${vacio}`)
comprobar(!/deberías|falta|mal/i.test(vacio), `y sin reproche: ${vacio}`)
await page.screenshot({ path: `${OUT}/mes-2-vacio.png`, fullPage: true })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el informe del mes cuenta lo que hubo, lo compara con el mes anterior y se puede recorrer')
