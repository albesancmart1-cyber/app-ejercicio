/**
 * La tarjeta de estrés corporal, en navegador.
 *
 * Comprueba que sin historial no se inventa un diagnóstico, que con historial
 * enseña el cociente y las dos curvas, que un atracón se detecta, y que la
 * racha **no se rompe al descansar**, que es la idea de la que sale todo esto.
 *
 *   node scripts/check-estres.mjs
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

const hoy = new Date()
const menos = (n) => new Date(hoy.getTime() - n * 86400000).toISOString().slice(0, 10)

const sesion = (dias, series, rir) => ({
  id: `s-${dias}`,
  date: menos(dias),
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  exercises: [
    {
      exerciseId: 'press_banca_mancuernas',
      name: 'Press',
      primary: 'pecho',
      plan: { sets: series, reps: '8-12', rir },
      done: true,
      logs: Array.from({ length: series }, () => ({ weightKg: 20, reps: 10, rir, done: true }))
    }
  ]
})

const datos = (sessions) => ({
  version: 2,
  profile: {
    name: 'Alberto',
    goal: 'recomposicion',
    equipment: ['peso_corporal', 'mancuernas'],
    maxWeights: { mancuernas: 24 }
  },
  checkIns: [],
  measurements: [],
  sessions
})

const irACuerpo = async () => {
  await page.goto(BASE)
  await page.waitForTimeout(900)
  await page.getByText('Progreso', { exact: true }).first().click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
  await page.waitForTimeout(700)
}

const tarjeta = () => page.locator('.card').filter({ hasText: 'Cómo está tu cuerpo' })

// ── Sin historial: no se inventa nada ─────────────────────
await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), datos([]))
await irACuerpo()

comprobar(await tarjeta().count(), 'no aparece la tarjeta de estrés')
if ((await tarjeta().count()) === 0) {
  await page.screenshot({ path: `${OUT}/estres-0-sin-tarjeta.png` })
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}
const vacia = await tarjeta().first().innerText()
comprobar(/no hay suficientes/i.test(vacia), `sin historial debería decirlo: ${vacia.slice(0, 200)}`)
comprobar(
  (await tarjeta().locator('.estres-chart').count()) === 0,
  'sin base fiable no debería dibujar curvas'
)
await tarjeta().first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/estres-1-sin-datos.png` })

// ── Entrenando constante: en su sitio ─────────────────────
const constante = []
for (let d = 84; d >= 0; d -= 2) constante.push(sesion(d, 4, 2))
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), datos(constante))
await irACuerpo()

const normal = await tarjeta().first().innerText()
comprobar(/En tu sitio/i.test(normal), `entrenando constante debería salir «en tu sitio»: ${normal.slice(0, 220)}`)
comprobar(await tarjeta().locator('.estres-chart').count(), 'debería dibujar las curvas')
comprobar(await tarjeta().locator('.estres-fatiga').count(), 'falta la curva de fatiga')
comprobar(await tarjeta().locator('.estres-base').count(), 'falta la curva de base')
comprobar(/Fatiga de estos días/.test(normal), 'la leyenda debería nombrar las dos curvas')
console.log('  · constante →', normal.split('\n').slice(1, 3).join(' '))
await tarjeta().first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/estres-2-en-tu-sitio.png` })

// La racha no se rompe: entrena días alternos y hoy descansa.
comprobar(/no se rompe por descansar/i.test(normal), 'debería explicar que la racha no castiga descansar')

// ── Un atracón se detecta ─────────────────────────────────
const atracon = []
for (let d = 84; d >= 8; d -= 2) atracon.push(sesion(d, 3, 3))
for (let d = 6; d >= 0; d--) atracon.push(sesion(d, 6, 0))
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), datos(atracon))
await irACuerpo()

const pasado = await tarjeta().first().innerText()
comprobar(
  /por encima de tu base/i.test(pasado),
  `doblar el trabajo de golpe debería detectarse: ${pasado.slice(0, 220)}`
)
comprobar(
  !/lesi[oó]n/i.test(pasado),
  'no puede hablar de riesgo de lesión: el modelo no da para eso'
)
console.log('  · atracón →', pasado.split('\n').slice(1, 3).join(' '))
await tarjeta().first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/estres-3-pasado.png` })

// ── La racha aguanta el descanso ──────────────────────────
// Entrenó anteayer y ayer descansó: hoy tiene que seguir contando.
await page.evaluate(
  (d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)),
  datos([sesion(1, 4, 2), sesion(3, 4, 2), sesion(5, 4, 2)])
)
await irACuerpo()
const conDescanso = await tarjeta().first().innerText()
comprobar(/descanso ganado/i.test(conDescanso), `hoy debería contar como descanso ganado: ${conDescanso.slice(-300)}`)
comprobar(
  !/0\s*$/m.test(conDescanso.split('Días seguidos')[1]?.split('\n')[1] ?? ''),
  'la racha no debería estar a cero habiendo entrenado ayer'
)
await page.screenshot({ path: `${OUT}/estres-4-racha.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el estrés se mide contra tu base, el atracón se detecta y la racha no castiga descansar')
