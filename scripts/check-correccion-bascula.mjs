/**
 * Corregir una lectura de la báscula ya guardada, en navegador.
 *
 * Existe porque faltaba lo más básico: la báscula solo se podía anotar **hoy**.
 * Los dos sitios que la guardaban fijaban `date: today`, así que un porcentaje
 * mal tecleado el martes se quedaba mal para siempre y envenenaba la tendencia
 * y la masa libre de grasa sin que hubiera forma de arreglarlo.
 *
 * Lo que tiene que pasar: que se vean las lecturas anteriores; que al tocar una
 * se abra con **sus** números puestos; que se guarde en **su** día y no en hoy;
 * que **«19,9» sean 19,9 y no 199** —la casilla usaba `Number()`, que con el
 * teclado español se come la coma en silencio—; y que se pueda borrar.
 *
 *   node scripts/check-correccion-bascula.mjs
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
const medidas = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')).measurements)

// ── Tres lecturas, y la de ayer con la grasa mal ────────────────────────
await page.goto(BASE)
await page.evaluate(() => {
  const menos = (d) => {
    const x = new Date()
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        heightCm: 178,
        weightKg: 82,
        goal: 'recomposicion',
        equipment: ['peso_corporal'],
        maxWeights: {}
      },
      checkIns: [],
      sessions: [],
      measurements: [
        { date: menos(5), weightKg: 83, fatPercent: 20.4 },
        { date: menos(1), weightKg: 82.4, fatPercent: 29.9, musclePercent: 40 },
        { date: menos(0), weightKg: 82.1, fatPercent: 19.8, musclePercent: 40.2 }
      ]
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Progreso' }).click()
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(400)

// ── El historial ───────────────────────────────────────────────────────
await page.getByRole('button', { name: 'Corregir un día pasado' }).click()
await page.waitForTimeout(250)
const filas = await page.locator('.fade-in button.row').count()
comprobar(filas === 3, `deberían verse las tres lecturas, se ven ${filas}`)
await page.screenshot({ path: `${OUT}/bascula-historial.png` })

// ── Se abre con sus números, no con los de hoy ──────────────────────────
await page.locator('button.row', { hasText: 'Ayer' }).click()
await page.waitForTimeout(250)
const cabecera = await page.locator('.eyebrow', { hasText: 'La báscula' }).first().textContent()
comprobar(cabecera.includes('ayer'), `la cabecera debería decir de qué día es: «${cabecera}»`)
const precargado = {
  peso: await page.getByLabel('Peso (kg)').inputValue(),
  grasa: await page.getByLabel('Grasa (%)').inputValue()
}
comprobar(
  precargado.peso === '82,4' && precargado.grasa === '29,9',
  `debería venir con lo de ayer puesto, vino con ${JSON.stringify(precargado)}`
)

// ── La coma: «19,9» son 19,9 ───────────────────────────────────────────
await page.getByLabel('Grasa (%)').fill('19,9')
await page.screenshot({ path: `${OUT}/bascula-corrigiendo.png` })
await page.getByRole('button', { name: 'Guardar medición' }).click()
await page.waitForTimeout(400)

const tras = await medidas()
const hoyIso = new Date().toISOString().slice(0, 10)
const ayerIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const deAyer = tras.find((m) => m.date === ayerIso)
const deHoy = tras.find((m) => m.date === hoyIso)

comprobar(deAyer?.fatPercent === 19.9, `ayer debería quedar en 19,9 y quedó en ${deAyer?.fatPercent}`)
comprobar(deAyer?.weightKg === 82.4, `el peso de ayer no se toca: ${deAyer?.weightKg}`)
comprobar(deHoy?.fatPercent === 19.8, `la de hoy no se toca: ${deHoy?.fatPercent}`)
comprobar(tras.length === 3, `no debería aparecer una cuarta lectura: hay ${tras.length}`)
console.log('  · ayer queda en', deAyer?.fatPercent, '% — la coma se lee bien')

// ── Un día viejo se llama por su nombre, y se puede borrar ──────────────
await page.locator('button.row').last().click()
await page.waitForTimeout(250)
const vieja = await page.locator('.eyebrow', { hasText: 'La báscula' }).first().textContent()
comprobar(/de \w+/.test(vieja), `un día lejano se dice entero: «${vieja}»`)
comprobar(
  (await page.getByRole('button', { name: 'Borrar la de ese día' }).count()) === 1,
  'debería poder borrarse una lectura ya guardada'
)
await page.getByRole('button', { name: 'Borrar la de ese día' }).click()
await page.waitForTimeout(400)
comprobar((await medidas()).length === 2, 'borrar debería dejar dos lecturas')
await page.screenshot({ path: `${OUT}/bascula-despues.png` })

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
console.log('✓ la báscula de cualquier día se corrige, se borra, y la coma se respeta')
