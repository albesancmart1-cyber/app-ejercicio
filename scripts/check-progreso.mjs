/**
 * Los cinco destinos de Progreso, en navegador.
 *
 * Comprueba que la pestaña se llama Progreso, que sus cinco secciones se
 * abren, que la de Semana enseña lo que falta por zona con su umbral, y que
 * la de Ejercicios lleva a la ficha de uno.
 *
 *   node scripts/check-progreso.mjs
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

const entreno = (fecha, ejercicio, nombre, grupo, aporte, series) => ({
  id: `s-${fecha}-${ejercicio}`,
  date: fecha,
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  durationSec: 3000,
  exercises: [
    {
      exerciseId: ejercicio,
      name: nombre,
      primary: grupo,
      plan: { sets: series, reps: '8-12', rir: 1 },
      muscleContributions: aporte,
      logs: Array.from({ length: series }, () => ({ weightKg: 20, reps: 10, rir: 1, done: true }))
    }
  ]
})

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
  sessions: [
    entreno(hace(1), 'press_banca_mancuernas', 'Press de banca con mancuernas', 'pecho', { pectoral_mayor: 1 }, 6),
    entreno(hace(3), 'press_banca_mancuernas', 'Press de banca con mancuernas', 'pecho', { pectoral_mayor: 1 }, 6),
    entreno(hace(5), 'remo_mancuerna', 'Remo con mancuerna', 'espalda', { dorsal_ancho: 1 }, 4),
    entreno(hace(20), 'sentadilla_goblet', 'Sentadilla goblet', 'cuadriceps_gluteo', { cuadriceps: 1 }, 5)
  ]
}

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), semilla)
await page.goto(BASE)
await page.waitForTimeout(900)

comprobar(
  await page.getByRole('button', { name: 'Progreso', exact: true }).count(),
  'la pestaña debería llamarse Progreso, no Cuerpo'
)
comprobar(
  await page.getByRole('button', { name: 'Cocina', exact: true }).count(),
  'y la de comer, Cocina'
)
comprobar(await page.getByRole('button', { name: 'Yo', exact: true }).count(), 'y la de perfil, Yo')

await page.getByRole('button', { name: 'Progreso', exact: true }).click()
await page.waitForTimeout(700)

// ── Semana: la sección nueva, y la que abre ───────────────
const semana = await page.locator('.fade-in').first().innerText()
comprobar(/Series de la semana/i.test(semana), `Semana debería abrir por defecto: ${semana.slice(0, 160)}`)
comprobar(/Qué falta por trabajar/i.test(semana), 'y decir lo que falta por zona')
comprobar((await page.locator('.zona').count()) >= 5, 'con una barra por zona')
comprobar(
  (await page.locator('.zona-minimo').count()) >= 5,
  'y con la marca del mínimo semanal sobre cada barra'
)
// Lo que no se ha tocado esta semana tiene que salir el primero.
const primeraZona = await page.locator('.zona').first().innerText()
comprobar(/0 \//.test(primeraZona), `lo que más falta va primero: ${primeraZona.replace(/\n/g, ' · ')}`)
console.log('  · zona más corta:', primeraZona.replace(/\n/g, ' · '))
await page.screenshot({ path: `${OUT}/prog-1-semana.png`, fullPage: true })

// ── Las cinco secciones se abren ──────────────────────────
for (const [nombre, marca] of [
  ['Mes', /El mes/i],
  ['Año', /Los últimos doce meses/i],
  ['Cuerpo', /Cómo está tu cuerpo/i],
  ['Ejercicios', /Tus ejercicios/i]
]) {
  await page.getByRole('tab', { name: nombre }).click()
  await page.waitForTimeout(500)
  const texto = await page.locator('.fade-in').first().innerText()
  comprobar(marca.test(texto), `la sección ${nombre} no ha abierto: ${texto.slice(0, 120)}`)
}
await page.screenshot({ path: `${OUT}/prog-2-ejercicios.png`, fullPage: true })

// ── De la lista de ejercicios a su ficha ──────────────────
const filas = await page.locator('.item-tap').count()
comprobar(filas >= 3, `deberían listarse los ejercicios entrenados: ${filas}`)
await page.locator('input[aria-label="Buscar un ejercicio"]').fill('remo')
await page.waitForTimeout(400)
comprobar(
  (await page.locator('.item-tap').count()) === 1,
  'el buscador debería filtrar por nombre'
)
await page.locator('.item-tap').first().click()
await page.waitForTimeout(600)
const ficha = await page.locator('.session-detail').innerText()
comprobar(/Remo con mancuerna/.test(ficha), `debería abrirse la ficha del ejercicio: ${ficha.slice(0, 120)}`)
comprobar(/Peso máximo/i.test(ficha), 'con sus marcas')
console.log('  · ficha abierta desde la lista:', ficha.split('\n').slice(1, 4).join(' · '))
await page.screenshot({ path: `${OUT}/prog-3-ficha.png`, fullPage: true })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ Progreso abre por la semana, tiene sus cinco destinos y lleva de la lista a la ficha')
