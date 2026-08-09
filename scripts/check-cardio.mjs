/**
 * Elegir con qué se hace el cardio, en navegador.
 *
 * Un día de cardio tiene que ofrecer andar, bici o trote, y al cambiar de una a
 * otra los minutos se ajustan para que el trabajo sea el mismo: si tocaban 35
 * minutos de trote, andar son bastantes más.
 *
 *   node scripts/check-cardio.mjs
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

// Dos sesiones de fuerza seguidas: al tercer día la app manda cardio.
await page.goto(BASE)
await page.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  const fuerza = (dias) => ({
    id: 's' + dias,
    date: menos(dias),
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
  })
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
    discomforts: [],
    mildSoreness: false,
    wokeHungry: false,
    cravings: false
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
      sessions: [fuerza(1), fuerza(3)],
      measurements: []
    })
  )
})

await page.goto(BASE)
await page.waitForTimeout(700)
await page.getByText('Empezar', { exact: false }).first().click()
await page.waitForTimeout(300)
await page.getByText('Ver qué me conviene').click()
await page.waitForTimeout(600)

const recomendacion = await page.locator('body').innerText()
comprobar(/cardio|paseo|movimiento/i.test(recomendacion), `hoy no tocaba cardio: ${recomendacion.slice(0, 120)}`)

await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(800)

const selector = page.locator('.cardio-swap')
comprobar(await selector.count(), 'la sesión de cardio no ofrece elegir con qué hacerlo')
await selector.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/cardio-1-opciones.png` })

const opciones = selector.locator('.opt')
const textos = await opciones.allInnerTexts()
console.log('  · opciones:', textos.join(' | '))
comprobar(textos.length >= 3, `deberían ofrecerse al menos tres actividades, hay ${textos.length}`)
comprobar(textos.some((t) => /camin/i.test(t)), 'falta andar entre las opciones')
comprobar(textos.some((t) => /bici/i.test(t)), 'falta la bici entre las opciones')

// Cada opción trae sus propios minutos, y no son todos iguales.
const minutos = textos.map((t) => Number((t.match(/(\d+)\s*min/) ?? [])[1]))
comprobar(minutos.every((m) => m > 0), `alguna opción no dice los minutos: ${textos.join(' | ')}`)
comprobar(
  new Set(minutos).size > 1,
  `todas las opciones dan los mismos minutos, no se está convirtiendo la dosis: ${textos.join(' | ')}`
)

// Andar debe pedir más minutos que trotar: cuesta menos por minuto.
const deAndar = minutos[textos.findIndex((t) => /camin/i.test(t))]
const iTrote = textos.findIndex((t) => /trote/i.test(t))
if (iTrote >= 0) {
  comprobar(
    deAndar > minutos[iTrote],
    `andar debería llevar más minutos que trotar: ${deAndar} vs ${minutos[iTrote]}`
  )
}

// ── Cambiar de actividad ──────────────────────────────────
const antes = await page.locator('.card .item-title').first().innerText()
const iAndar = textos.findIndex((t) => /camin/i.test(t))
await opciones.nth(iAndar).click()
await page.waitForTimeout(600)

const despues = await page.locator('.card .item-title').first().innerText()
comprobar(/camin/i.test(despues), `al elegir andar debería quedarse andando: ${despues}`)
const plan = await page.locator('.card .item-meta').first().innerText()
comprobar(
  plan.includes(`${deAndar} min`),
  `el plan debería quedar en ${deAndar} min: «${plan}»`
)
const aviso = await page.locator('body').innerText()
comprobar(/por minuto/i.test(aviso), 'no explica por qué cambian los minutos')
console.log('  ·', antes, '→', despues, '·', plan)
await page.screenshot({ path: `${OUT}/cardio-2-cambiado.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el cardio se puede elegir, y los minutos se ajustan para que la dosis sea la misma')
