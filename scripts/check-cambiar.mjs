/**
 * Cambiar de ejercicio, en navegador.
 *
 * Lo que tiene que pasar: que un toque **cambie el ejercicio**, sin abrir
 * ninguna lista; que cada toque traiga uno distinto en vez de ir y venir entre
 * dos; que el sustituto trabaje lo mismo; y que la app aprenda —lo descartado
 * baja y lo que te quedas sube, y eso se guarda en el perfil—.
 *
 *   node scripts/check-cambiar.mjs
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

await page.goto(BASE)
await page.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  const checkIns = Array.from({ length: 8 }, (_, i) => ({
    date: menos(i),
    sleep: 4,
    lightHygiene: true,
    sunrise: true,
    sunsetYesterday: true,
    sunExposure: true,
    keto: false,
    energy: 4,
    discomfort: 'ninguna',
    wokeHungry: false,
    cravings: false
  }))
  const sessions = [3, 6, 9, 12].map((d) => ({
    id: 's' + d,
    date: menos(d),
    kind: 'fuerza',
    title: 'Fuerza',
    completed: true,
    rpe: 4,
    exercises: [
      {
        exerciseId: 'press_banca_mancuernas',
        name: 'Press de banca con mancuernas',
        primary: 'pecho',
        plan: { sets: 3, reps: '8-12', rir: 2 },
        done: true,
        actualWeightKg: 12,
        logs: Array.from({ length: 3 }, () => ({ done: true, weightKg: 12, reps: 10 }))
      }
    ]
  }))
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 80,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'bici', 'correr'],
        maxWeights: { mancuernas: 24 }
      },
      checkIns,
      sessions,
      measurements: []
    })
  )
})

await page.goto(BASE)
await page.waitForTimeout(700)
await page.getByText('Empezar', { exact: false }).first().click()
await page.waitForTimeout(300)
await page.getByText('Ver qué me conviene').click()
await page.waitForTimeout(500)
const pesas = page.getByText('Prefiero algo con pesas')
if (await pesas.count()) {
  await pesas.click()
  await page.waitForTimeout(400)
}
await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(800)

/** Nombre del primer ejercicio de la sesión. */
const primerNombre = () => page.locator('.card .item-title').first().innerText()

const nombres = [await primerNombre()]
const cambiar = page.getByRole('button', { name: 'Cambiar ejercicio' }).first()
comprobar(await cambiar.count(), 'no está el botón de cambiar ejercicio')

// ── Un toque cambia, sin abrir ninguna lista ──────────────
await cambiar.scrollIntoViewIfNeeded()
await cambiar.click()
await page.waitForTimeout(600)
comprobar(
  (await page.locator('.picker').count()) === 0,
  'cambiar abre una lista para que elija el usuario: debe elegir la app'
)
nombres.push(await primerNombre())
comprobar(nombres[1] !== nombres[0], `el ejercicio no cambió: sigue siendo ${nombres[0]}`)
await page.screenshot({ path: `${OUT}/cambiar-1.png` })

// ── Y cada toque trae uno distinto, no un bucle de dos ────
for (let i = 0; i < 3; i++) {
  const b = page.getByRole('button', { name: 'Cambiar ejercicio' }).first()
  await b.scrollIntoViewIfNeeded()
  await b.click()
  await page.waitForTimeout(500)
  nombres.push(await primerNombre())
}
console.log('  · rotación:', nombres.join(' → '))
comprobar(
  new Set(nombres).size === nombres.length,
  `se repite un ejercicio al rotar: ${nombres.join(' → ')}`
)
await page.screenshot({ path: `${OUT}/cambiar-2.png` })

// ── La app aprende de lo descartado y de lo aceptado ──────
const afinidad = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).profile.exerciseAffinity ?? {}
)
const valores = Object.values(afinidad)
comprobar(Object.keys(afinidad).length > 0, 'la app no ha aprendido nada de los cambios')
comprobar(
  valores.some((v) => v < 0),
  `lo descartado debería bajar: ${JSON.stringify(afinidad)}`
)
console.log('  · afinidad aprendida:', JSON.stringify(afinidad))

// Y el que queda puesto sube al entrenarlo.
const antes = afinidad
await page.getByText('Empezar entrenamiento', { exact: false }).first().click()
await page.waitForTimeout(400)
/** Marca una serie y, si salta el descanso a pantalla completa, lo salta. */
async function marcarSerie(n) {
  await page.locator('.set-row button.check').nth(n).click()
  await page.waitForTimeout(400)
  // Un récord también toma la pantalla, y va por delante del descanso.
  const seguir = page.getByRole('button', { name: 'Seguir entrenando' })
  if (await seguir.count()) {
    await seguir.click()
    await page.waitForTimeout(300)
  }
  const saltar = page.getByRole('button', { name: 'Saltar descanso' })
  if (await saltar.count()) {
    await saltar.click()
    await page.waitForTimeout(300)
  }
}

const n = await page.locator('.set-row button.check').count()
for (let i = 0; i < n; i++) {
  await marcarSerie(i)
}
await page.getByText('Terminar', { exact: false }).first().click()
await page.waitForTimeout(500)
const sens = page.locator('.scale button')
if (await sens.count()) {
  await sens.nth(3).click()
  await page.waitForTimeout(300)
}
const guardar = page.getByRole('button', { name: 'Guardar el entreno' }).first()
if (await guardar.count()) {
  await guardar.click()
  await page.waitForTimeout(800)
}
const despues = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).profile.exerciseAffinity ?? {}
)
const subieron = Object.keys(despues).filter((k) => (despues[k] ?? 0) > (antes[k] ?? 0))
comprobar(subieron.length > 0, `entrenar debería subir la afinidad: ${JSON.stringify(despues)}`)
console.log('  · tras entrenar suben:', subieron.join(', '))

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ cambiar elige la app, rota sin repetir y aprende de lo que te quedas')
