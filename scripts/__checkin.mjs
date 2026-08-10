import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await p.goto('http://localhost:4173/')
await p.evaluate(() =>
  localStorage.setItem('ritmo-data-v1', JSON.stringify({
    version: 2,
    profile: { name: 'Alberto', goal: 'recomposicion', weightKg: 80, heightCm: 180,
      equipment: ['peso_corporal', 'mancuernas', 'banco'], maxWeights: { mancuernas: 24 } },
    checkIns: [], sessions: [], measurements: []
  }))
)
await p.goto('http://localhost:4173/')
await p.waitForTimeout(800)
await p.getByText('Empezar', { exact: false }).first().click()
await p.waitForTimeout(600)
// Marca sueño 4 con la escala nueva y comprueba que el estado se lee.
await p.locator('.scale').first().getByRole('button', { name: '4', exact: true }).click()
await p.waitForTimeout(400)
console.log('sueño 4 pulsado:',
  await p.locator('.scale').first().getByRole('button', { name: '4', exact: true }).getAttribute('aria-pressed'))
await p.screenshot({ path: '/tmp/shots/m-checkin.png' })
await b.close()
