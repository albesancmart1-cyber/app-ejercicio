/**
 * La calculadora de discos y la de calentamiento, en navegador.
 *
 * Comprueba que con barra se dice qué discos poner por lado, que con mancuernas
 * no aparece esa ayuda —no hay nada que repartir—, y que el botón de
 * calentamiento mete series por porcentajes delante de las de trabajo, marcadas
 * como calentamiento para que no cuenten como volumen.
 *
 *   node scripts/check-calculadoras.mjs
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

const conBarra = {
  exerciseId: 'sentadilla_barra',
  name: 'Sentadilla con barra',
  primary: 'cuadriceps_gluteo',
  plan: { sets: 3, reps: '6-10', rir: 2, restSeconds: 180, weightKg: 60 },
  variant: { implement: 'barra' },
  logs: [
    { weightKg: 60, done: false },
    { weightKg: 60, done: false },
    { weightKg: 60, done: false }
  ]
}

const conMancuernas = {
  exerciseId: 'curl_biceps',
  name: 'Curl de bíceps',
  primary: 'brazo',
  plan: { sets: 2, reps: '8-12', rir: 2, restSeconds: 90, weightKg: 12 },
  variant: { implement: 'mancuernas' },
  logs: [
    { weightKg: 12, done: false },
    { weightKg: 12, done: false }
  ]
}

await page.goto(BASE)
await page.evaluate(
  ([fecha, a, b]) => {
    localStorage.setItem(
      'ritmo-data-v1',
      JSON.stringify({
        version: 2,
        profile: {
          name: 'Alberto',
          goal: 'masa',
          equipment: ['peso_corporal', 'mancuernas', 'barra', 'banco'],
          maxWeights: { mancuernas: 24, barra: 100 }
        },
        checkIns: [],
        measurements: [],
        sessions: [
          {
            id: 'de-hoy',
            date: fecha,
            kind: 'fuerza',
            title: 'Fuerza · pierna',
            completed: false,
            startedAt: Date.now(),
            exercises: [a, b]
          }
        ]
      })
    )
  },
  [hoy, conBarra, conMancuernas]
)

await page.goto(BASE)
await page.waitForTimeout(1000)

const sentadilla = page.locator('.card').filter({ hasText: 'Sentadilla con barra' })
// Una sesión ya en marcha abre en modo foco: aquí se comprueba la lista.
const aLaLista = page.getByRole('button', { name: 'Ver todos los ejercicios' })
if (await aLaLista.count()) {
  await aLaLista.click()
  await page.waitForTimeout(400)
}

const curl = page.locator('.card').filter({ hasText: 'Curl de bíceps' })
if ((await sentadilla.count()) === 0) {
  console.error('✗ no se ha recuperado la sesión en marcha')
  await page.screenshot({ path: `${OUT}/calc-0-sin-sesion.png` })
  await browser.close()
  process.exit(1)
}

// ── Los discos, solo donde hay barra ──────────────────────
const pista = await sentadilla.locator('.plate-hint').first().innerText()
// 60 kg = barra de 20 + 20 por lado.
comprobar(/1×20/.test(pista), `debería decir qué discos poner: ${pista}`)
comprobar(/por lado/.test(pista), `debería aclarar que es por lado: ${pista}`)
console.log('  · con 60 kg:', pista)

comprobar(
  (await curl.locator('.plate-hint').count()) === 0,
  'con mancuernas no hay discos que repartir y no debería salir la ayuda'
)

// Cambiar el peso cambia los discos: se calcula sobre lo que se va a levantar.
await sentadilla.locator('input[aria-label*="Peso de la serie 1"]').first().fill('100')
await page.waitForTimeout(400)
const pista100 = await sentadilla.locator('.plate-hint').first().innerText()
comprobar(/1×25/.test(pista100) && /1×15/.test(pista100), `100 kg deberían ser 25+15 por lado: ${pista100}`)
console.log('  · con 100 kg:', pista100)

// Un peso que no se puede montar exacto se dice, no se disimula.
await sentadilla.locator('input[aria-label*="Peso de la serie 1"]').first().fill('61')
await page.waitForTimeout(400)
const pista61 = await sentadilla.locator('.plate-hint').first().innerText()
comprobar(/60 kg/.test(pista61), `debería decir en qué peso se queda de verdad: ${pista61}`)
console.log('  · con 61 kg:', pista61)
await sentadilla.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/calc-1-discos.png` })

// ── El calentamiento ──────────────────────────────────────
await sentadilla.locator('input[aria-label*="Peso de la serie 1"]').first().fill('60')
await page.waitForTimeout(300)
const antes = await sentadilla.locator('.set-row').count()
await sentadilla.getByText('Añadir calentamiento', { exact: false }).click()
await page.waitForTimeout(600)
const despues = await sentadilla.locator('.set-row').count()
comprobar(despues > antes, `debería añadir series de calentamiento: ${antes} → ${despues}`)

const tipos = await sentadilla.locator('.set-type').evaluateAll((ns) => ns.map((n) => n.textContent))
comprobar(
  tipos.slice(0, despues - antes).every((t) => t === 'C'),
  `las nuevas deberían ir marcadas como calentamiento: ${JSON.stringify(tipos)}`
)

const pesos = await sentadilla
  .locator('input[aria-label*="Peso de la serie"]')
  .evaluateAll((ns) => ns.map((n) => Number(n.value)))
const calentamiento = pesos.slice(0, despues - antes)
// 40 %, 60 % y 80 % de 60 = 24, 36, 48 → redondeados a 2,5: 25, 35, 47,5.
comprobar(
  calentamiento.every((w) => w < 60),
  `ningún calentamiento puede pesar tanto como la serie buena: ${JSON.stringify(calentamiento)}`
)
comprobar(
  calentamiento.every((w, i) => i === 0 || w > calentamiento[i - 1]),
  `el calentamiento tiene que ir subiendo: ${JSON.stringify(calentamiento)}`
)
console.log('  · calentamiento:', JSON.stringify(calentamiento))
await page.screenshot({ path: `${OUT}/calc-2-calentamiento.png` })

// ── Y no cuenta como volumen ──────────────────────────────
const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const s = d.sessions.find((x) => !x.completed)
  return s.exercises[0].logs.map((l) => l.tipo ?? 'normal')
})
comprobar(
  guardado.filter((t) => t === 'calentamiento').length === despues - antes,
  `deberían guardarse como calentamiento: ${JSON.stringify(guardado)}`
)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ los discos se calculan solo donde hay barra, y el calentamiento entra por porcentajes')
