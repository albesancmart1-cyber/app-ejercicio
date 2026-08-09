/**
 * El descanso propio de cada ejercicio y las notas, en navegador.
 *
 * Comprueba que se pueden ajustar, que se guardan en el perfil —no en la sesión,
 * así que valen para la próxima vez—, que el temporizador respeta lo elegido y
 * que la nota se ve sin tener que abrir nada.
 *
 *   node scripts/check-preferencias.mjs
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

const semilla = (fecha) => ({
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
          plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 14 },
          logs: [
            { weightKg: 14, done: false },
            { weightKg: 14, done: false },
            { weightKg: 14, done: false }
          ]
        }
      ]
    }
  ]
})

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), semilla(hoy))
await page.goto(BASE)
await page.waitForTimeout(1000)

const tarjeta = page.locator('.card').filter({ hasText: 'Press de banca con mancuernas' })
if ((await tarjeta.count()) === 0) {
  console.error('✗ no se ha recuperado la sesión en marcha')
  await page.screenshot({ path: `${OUT}/prefs-0-sin-sesion.png` })
  await browser.close()
  process.exit(1)
}

// De partida, el descanso es el del protocolo.
comprobar(/2′ descanso/.test(await tarjeta.locator('.item-meta').first().innerText()), 'debería partir del descanso del protocolo')

// ── Ajustar el descanso ───────────────────────────────────
await tarjeta.getByText('Descanso y notas', { exact: false }).click()
await page.waitForTimeout(500)
const panel = tarjeta.locator('.ex-prefs')
comprobar(await panel.count(), 'no se abre el panel de ajustes del ejercicio')
await panel.getByText('3′', { exact: true }).click()
await page.waitForTimeout(400)

const cabecera = await tarjeta.locator('.item-meta').first().innerText()
comprobar(/3′ descanso/.test(cabecera), `el encabezado debería reflejar lo elegido: ${cabecera}`)

// ── Y una nota ────────────────────────────────────────────
await panel.locator('input[aria-label*="Nota para"]').fill('Banco en el agujero 4')
await panel.locator('input[aria-label*="Nota para"]').blur()
await page.waitForTimeout(400)

const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return { rest: d.profile.restOverrides, notas: d.profile.exerciseNotes }
})
comprobar(guardado.rest?.press_banca_mancuernas === 180, `el descanso debería guardarse en el perfil: ${JSON.stringify(guardado.rest)}`)
comprobar(
  guardado.notas?.press_banca_mancuernas === 'Banco en el agujero 4',
  `la nota debería guardarse en el perfil: ${JSON.stringify(guardado.notas)}`
)
console.log('  · guardado en el perfil:', JSON.stringify(guardado))
await tarjeta.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/prefs-1-panel.png` })

// ── Cerrado, la nota se sigue viendo ──────────────────────
await tarjeta.getByText('Cerrar los ajustes', { exact: false }).click()
await page.waitForTimeout(400)
comprobar(
  /Banco en el agujero 4/.test(await tarjeta.locator('.ex-note').first().innerText()),
  'la nota debería verse sin abrir los ajustes'
)
await page.screenshot({ path: `${OUT}/prefs-2-nota.png` })

// ── El temporizador respeta lo elegido ────────────────────
await tarjeta.getByRole('button', { name: /Marcar serie 1/ }).click()
await page.waitForTimeout(700)
const timer = await page.locator('.rest-screen').first().innerText()
comprobar(/2:5\d|3:00/.test(timer), `el descanso debería arrancar en 3 minutos: ${timer}`)
console.log('  · temporizador:', timer.split('\n')[0])

// ── Y sobrevive a la sesión: es del perfil ────────────────
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.sessions = []
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload()
await page.waitForTimeout(900)
const tras = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return d.profile.restOverrides?.press_banca_mancuernas
})
comprobar(tras === 180, `el ajuste tiene que sobrevivir a la sesión: ${tras}`)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el descanso y la nota de cada ejercicio se ajustan, se guardan en el perfil y mandan sobre el protocolo')
