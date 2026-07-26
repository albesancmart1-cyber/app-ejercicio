/**
 * Verifica que la app cambia de día sola al cruzar la medianoche.
 *
 * Se comprueban los dos caminos, porque en el móvil el segundo es el habitual:
 *  1. La app abierta cuando dan las doce → el temporizador la despierta.
 *  2. La app en segundo plano toda la noche → los temporizadores no corren
 *     mientras el móvil duerme, así que la fecha se revisa al volver a ella.
 *
 * Requiere `npm run preview` en marcha. Define OUT_DIR para las capturas.
 */
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const DATOS = {
  version: 1,
  profile: {
    name: 'Alberto',
    goal: 'recomposicion',
    equipment: ['peso_corporal', 'mancuernas'],
    maxWeights: { mancuernas: 24 }
  },
  checkIns: [
    {
      date: '2026-07-26',
      sleep: 4,
      lightHygiene: true,
      sunrise: true,
      sunsetYesterday: true,
      sunExposure: true,
      keto: true,
      energy: 4,
      discomfort: 'ninguna',
      wokeHungry: false,
      cravings: false
    }
  ],
  sessions: [
    { id: 'ayer', date: '2026-07-26', kind: 'fuerza', title: 'Fuerza', completed: true, exercises: [], rpe: 4 }
  ],
  measurements: []
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})

async function preparar() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.clock.install({ time: new Date('2026-07-26T23:58:00') })
  await page.goto(BASE)
  await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), DATOS)
  await page.reload()
  await page.waitForTimeout(700)
  return page
}

const titulo = (page) => page.locator('h2').first().textContent().catch(() => null)

function exigirCheckIn(texto, caso) {
  if (!/cómo estás hoy/i.test(texto ?? '')) {
    console.error(`ERROR (${caso}): debería volver a pedir el check-in del día nuevo; muestra:`, texto)
    process.exit(1)
  }
}

// ── 1. Con la app abierta ─────────────────────────────────
{
  const page = await preparar()
  const antes = await titulo(page)
  console.log('abierta · 23:58 →', antes)
  await page.clock.fastForward('00:05:00')
  await page.waitForTimeout(1500)
  const despues = await titulo(page)
  console.log('abierta · 00:03 →', despues)
  if (antes === despues) {
    console.error('ERROR (abierta): al cruzar la medianoche sigue mostrando lo de ayer')
    process.exit(1)
  }
  exigirCheckIn(despues, 'abierta')
  await page.screenshot({ path: `${OUT}/20-medianoche.png` })
}

// ── 2. Recuperada de segundo plano ────────────────────────
{
  const page = await preparar()
  console.log('en segundo plano · 23:58 →', await titulo(page))
  // El móvil duerme: el reloj avanza pero los temporizadores no se disparan.
  await page.clock.setSystemTime(new Date('2026-07-27T08:30:00'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.waitForTimeout(800)
  const despues = await titulo(page)
  console.log('en segundo plano · 08:30 del día siguiente →', despues)
  exigirCheckIn(despues, 'segundo plano')
}

await browser.close()
console.log('OK: el día cambia solo por las dos vías')
