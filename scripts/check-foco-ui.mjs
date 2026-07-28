/**
 * En el navegador: con un historial de solo empujes, la app debe proponer lo que
 * el empuje deja a cero —bíceps, deltoides posterior— y **decirlo por su
 * nombre**, no con un «toca brazo» que puede acabar en otro tríceps.
 *
 *   node scripts/check-foco-ui.mjs
 */
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(BASE)
await page.evaluate(() => {
  const iso = (d) => d.toISOString().slice(0, 10)
  const hoy = new Date()
  const menos = (dias) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - dias)
    return iso(d)
  }

  const ej = (exerciseId, name, primary, sets = 4) => ({
    exerciseId,
    name,
    primary,
    plan: { sets, reps: '8-12', rir: 2, restSeconds: 120 },
    done: true,
    logs: Array.from({ length: sets }, () => ({ done: true, reps: 10, weightKg: 12 }))
  })

  // Cuatro semanas de empujes y nada más: el brazo y el hombro salen «cubiertos».
  const sessions = []
  for (let i = 2; i < 26; i += 2) {
    sessions.push({
      id: `s${i}`,
      date: menos(i),
      kind: 'fuerza',
      title: 'Fuerza',
      completed: true,
      rpe: 3,
      exercises: [
        ej('press_banca_mancuernas', 'Press de banca con mancuernas', 'pecho'),
        ej('press_militar_mancuernas', 'Press militar con mancuernas', 'hombro'),
        ej('flexiones_diamante', 'Flexiones diamante (tríceps)', 'brazo')
      ]
    })
  }

  const checkIns = []
  for (let i = 0; i < 10; i++) {
    checkIns.push({
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
    })
  }

  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 80,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas', 'bandas', 'banco', 'bici', 'correr'],
        maxWeights: { mancuernas: 24 }
      },
      checkIns,
      sessions,
      measurements: []
    })
  )
})

await page.goto(BASE)
await page.waitForTimeout(800)

// El check-in de hoy ya está sembrado: solo hay que pasar por la pantalla.
await page.getByText('Empezar', { exact: false }).first().click()
await page.waitForTimeout(300)
await page.getByText('Ver qué me conviene').click()
await page.waitForTimeout(500)

// Si hoy no tocara fuerza, se piden las pesas expresamente.
const pesas = page.getByText('Prefiero algo con pesas')
if (await pesas.count()) {
  await pesas.click()
  await page.waitForTimeout(400)
}

// Abrir el «por qué».
const porQue = page.getByText('Por qué esto hoy', { exact: false }).first()
if (await porQue.count()) {
  await porQue.scrollIntoViewIfNeeded()
  await porQue.click()
  await page.waitForTimeout(500)
}
await page.screenshot({ path: `${OUT}/foco-por-que.png`, fullPage: true })

const texto = await page.locator('body').innerText()
for (const l of texto.split('\n')) {
  if (/mínimo semanal|ni una serie|abrimos por/i.test(l)) console.log('  ·', l)
}

const fallos = []
// La explicación tiene que nombrar músculos, no solo zonas.
if (!/bíceps|deltoides|antebrazo|sóleo|gemelo|glúteo|dorsal/i.test(texto)) {
  fallos.push('la explicación no nombra ningún músculo concreto')
}
if (/menos has trabajado estas dos semanas/i.test(texto)) {
  fallos.push('sigue apareciendo la explicación vieja por zonas')
}

// Y la sesión que prepara tiene que traer trabajo de lo que estaba a cero.
const prepara = page.getByText('Preparar la sesión', { exact: false }).first()
if (await prepara.count()) {
  await prepara.click()
  await page.waitForTimeout(800)
  const plan = await page.locator('body').innerText()
  if (/press|flexiones diamante/i.test(plan) && !/curl|remo|jalón|pájaros|elevaci/i.test(plan)) {
    fallos.push('la sesión repite empujes en vez de cubrir lo que estaba a cero')
  }
  await page.screenshot({ path: `${OUT}/foco-plan.png`, fullPage: true })
}

if (errors.length) fallos.push(`errores en consola: ${errors.join(' | ')}`)

await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ la app propone por músculo y lo explica por su nombre')
