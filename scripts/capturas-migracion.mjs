/**
 * Capturas de las cuatro pestañas, para mirar la migración a Appica UI.
 *
 * No comprueba nada: existe para poder **ver** el resultado, que es la única
 * forma de juzgar un cambio de interfaz. Los recorridos que sí comprueban son
 * los `check-*.mjs`.
 *
 *   node scripts/capturas-migracion.mjs
 */
import { chromium } from 'playwright-core'

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const errores = []
p.on('pageerror', (e) => errores.push(e.message))
p.on('console', (m) => m.type() === 'error' && errores.push(m.text().slice(0, 160)))

await p.goto('http://localhost:4173/')
await p.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  const checkIns = Array.from({ length: 8 }, (_, i) => ({
    date: menos(i), sleep: 4, lightHygiene: true, sunrise: true, sunsetYesterday: true,
    sunExposure: true, keto: false, energy: 4, discomfort: 'ninguna', wokeHungry: false, cravings: false
  }))
  const sessions = [3, 6, 9].map((d) => ({
    id: 's' + d, date: menos(d), kind: 'fuerza', title: 'Fuerza', completed: true, rpe: 4,
    exercises: [{
      exerciseId: 'press_banca_mancuernas', name: 'Press de banca con mancuernas', primary: 'pecho',
      plan: { sets: 3, reps: '8-12', rir: 2 }, done: true, actualWeightKg: 14,
      logs: Array.from({ length: 3 }, () => ({ done: true, weightKg: 14, reps: 10 }))
    }]
  }))
  localStorage.setItem('ritmo-data-v1', JSON.stringify({
    version: 2,
    profile: { name: 'Alberto', goal: 'recomposicion', weightKg: 80, heightCm: 180,
      equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'bici', 'correr'],
      maxWeights: { mancuernas: 24 } },
    checkIns, sessions, measurements: []
  }))
})
await p.goto('http://localhost:4173/')
await p.waitForTimeout(900)

await p.screenshot({ path: '/tmp/shots/m-hoy.png' })
for (const [tab, nombre] of [['Progreso', 'progreso'], ['Cocina', 'cocina'], ['Yo', 'yo']]) {
  await p.locator('.tab', { hasText: tab }).click()
  await p.waitForTimeout(700)
  await p.screenshot({ path: `/tmp/shots/m-${nombre}.png` })
}
console.log(errores.length ? 'ERRORES:\n  ' + errores.join('\n  ') : 'sin errores de consola')
await b.close()
