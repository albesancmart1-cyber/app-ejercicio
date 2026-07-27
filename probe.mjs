import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await p.clock.install({ time: new Date('2026-03-16T09:00:00') })
await p.goto('http://localhost:4173/')
await p.evaluate(() => {
  const iso = (d) => d.toISOString().slice(0, 10)
  const hoy = new Date('2026-03-16T09:00:00')
  const menos = (n) => { const d = new Date(hoy); d.setDate(d.getDate() - n); return d }
  const profile = { name: 'A', goal: 'recomposicion', weightKg: 78, heightCm: 178,
    equipment: ['peso_corporal','mancuernas','bandas','banco','bici','correr'], maxWeights: { mancuernas: 24 } }
  const checkIns = Array.from({length: 10}, (_, i) => ({ date: iso(menos(i)), sleep: 4, lightHygiene: true,
    sunrise: true, sunsetYesterday: true, sunExposure: true, keto: true, energy: 4, discomfort: 'ninguna',
    wokeHungry: false, cravings: false }))
  const sessions = Array.from({length: 12}, (_, i) => ({ id: 's'+i, date: iso(menos(4 + i*3)), kind: 'fuerza',
    title: 'Fuerza', completed: true, rpe: 4, exercises: [{ exerciseId: 'press_banca_mancuernas', name: 'P',
    primary: ['pecho','espalda','cuadriceps_gluteo','hombro'][i%4], plan: { sets: 3, reps: '8-12' }, done: true,
    logs: [{weightKg:14,reps:12,done:true},{weightKg:14,reps:12,done:true},{weightKg:14,reps:12,done:true}] }] }))
  localStorage.setItem('ritmo-data-v1', JSON.stringify({ version: 1, profile, checkIns, sessions, measurements: [] }))
})
await p.reload(); await p.waitForTimeout(400)
await p.getByText('Empezar', { exact: false }).first().click(); await p.waitForTimeout(200)
await p.getByText('Ver qué me conviene').click(); await p.waitForTimeout(500)
console.log('titulo:', await p.locator('.eyebrow').nth(1).textContent())
console.log('eyebrows:', await p.locator('.eyebrow').allTextContents())
console.log('cards con Volumen:', await p.locator('.card').filter({ hasText: 'Volumen · nivel' }).count())
console.log('texto tiene Volumen:', (await p.locator('body').innerText()).includes('Volumen'))
console.log('cuerpo:', (await p.locator('body').innerText()).replace(/\n+/g,' | ').slice(0,600))
await b.close()
