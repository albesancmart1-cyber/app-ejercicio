/**
 * Superseries, en navegador.
 *
 * Comprueba lo que de verdad importa de la función: que encadenar dos
 * ejercicios los pinta como un bloque, que al marcar una serie **no** salta el
 * descanso sino que pasa al siguiente del grupo, que al cerrar la vuelta sí
 * descansa y vuelve arriba, y que reordenar mueve la pareja entera.
 *
 *   node scripts/check-superseries.mjs
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

const serie = (kg) => [
  { weightKg: kg, done: false },
  { weightKg: kg, done: false }
]

const semilla = {
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
      date: hoy,
      kind: 'fuerza',
      title: 'Fuerza · empuje y tirón',
      completed: false,
      startedAt: Date.now(),
      exercises: [
        {
          exerciseId: 'press_banca_mancuernas',
          name: 'Press de banca con mancuernas',
          primary: 'pecho',
          plan: { sets: 2, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 14 },
          logs: serie(14)
        },
        {
          exerciseId: 'remo_mancuerna',
          name: 'Remo con mancuerna',
          primary: 'espalda',
          plan: { sets: 2, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 16 },
          logs: serie(16)
        },
        {
          exerciseId: 'curl_biceps_mancuernas',
          name: 'Curl de bíceps con mancuernas',
          primary: 'brazo',
          plan: { sets: 2, reps: '10-12', rir: 2, restSeconds: 90, weightKg: 10 },
          logs: serie(10)
        }
      ]
    }
  ]
}

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), semilla)
await page.goto(BASE)
await page.waitForTimeout(1000)

// Una sesión ya en marcha abre en modo foco: aquí se comprueba la lista.
const aLaLista = page.getByRole('button', { name: 'Ver todos los ejercicios' })
if (await aLaLista.count()) {
  await aLaLista.click()
  await page.waitForTimeout(400)
}

const press = page.locator('.card').filter({ hasText: 'Press de banca con mancuernas' })
const remo = page.locator('.card').filter({ hasText: 'Remo con mancuerna' })
if ((await press.count()) === 0) {
  console.error('✗ no se ha recuperado la sesión en marcha')
  await page.screenshot({ path: `${OUT}/ss-0-sin-sesion.png` })
  await browser.close()
  process.exit(1)
}

// ── Encadenar ─────────────────────────────────────────────
await press.getByText('Encadenar con el siguiente', { exact: false }).click()
await page.waitForTimeout(500)

const etiquetas = await page.locator('.ss-tag').allInnerTexts()
comprobar(
  etiquetas[0] === 'A1' && etiquetas[1] === 'A2',
  `deberían quedar etiquetados A1 y A2: ${JSON.stringify(etiquetas)}`
)
comprobar(
  await press.first().evaluate((n) => n.classList.contains('en-superserie')),
  'la primera tarjeta debería pintarse como parte del bloque'
)
comprobar(
  await remo.first().evaluate((n) => n.classList.contains('sigue-superserie')),
  'la segunda debería ir pegada a la primera'
)
const meta = await press.locator('.item-meta').first().innerText()
comprobar(
  /sin descanso hasta cerrar la vuelta/.test(meta),
  `el plan debería decir que no hay descanso entre medias: ${meta}`
)
const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return d.sessions[0].exercises.map((e) => e.supersetId ?? null)
})
comprobar(
  guardado[0] !== null && guardado[0] === guardado[1] && guardado[2] === null,
  `la superserie debería guardarse en la sesión: ${JSON.stringify(guardado)}`
)
console.log('  · guardado:', JSON.stringify(guardado))
await page.screenshot({ path: `${OUT}/ss-1-encadenado.png`, fullPage: true })

// ── Marcar la primera: ni descanso, ni quedarse quieto ────
await press.getByRole('button', { name: /Marcar serie 1/ }).click()
await page.waitForTimeout(700)
comprobar(
  (await page.locator('.rest-screen').count()) === 0,
  'una superserie no descansa entre sus ejercicios: no debería salir el temporizador'
)
const ahora = await page.locator('.ahora-toca').allInnerTexts()
comprobar(ahora.length === 1 && /serie 1/.test(ahora[0]), `debería señalar a dónde ir: ${JSON.stringify(ahora)}`)
comprobar(
  await remo.first().evaluate((n) => n.classList.contains('toca-ahora')),
  'lo que toca ahora es el segundo del grupo, y debe verse'
)
await page.screenshot({ path: `${OUT}/ss-2-salta.png`, fullPage: true })

// ── Cerrar la vuelta: ahora sí, descanso y vuelta arriba ──
await remo.getByRole('button', { name: /Marcar serie 1/ }).click()
await page.waitForTimeout(700)
const timer = await page.locator('.rest-screen').first().innerText()
comprobar(/2:0\d|1:5\d/.test(timer), `al cerrar la vuelta toca descansar: ${timer.replace(/\n/g, ' · ')}`)
comprobar(
  // El rótulo va en versalitas por CSS, así que se compara sin distinguir caja.
  /press de banca/i.test(timer),
  `el descanso debería nombrar a dónde se vuelve: ${timer.replace(/\n/g, ' · ')}`
)
console.log('  · descanso de vuelta:', timer.replace(/\n/g, ' · '))
await page.screenshot({ path: `${OUT}/ss-3-vuelta.png`, fullPage: true })

// El descanso ocupa la pantalla entera, así que la lista vuelve al saltarlo.
await page.getByRole('button', { name: 'Saltar descanso' }).click()
await page.waitForTimeout(500)
comprobar(
  await press.first().evaluate((n) => n.classList.contains('toca-ahora')),
  'tras la vuelta se señala otra vez el primero del grupo'
)

// ── Reordenar mueve la pareja entera ──────────────────────
// Por aria-label exacta: el nombre del press aparece también dentro del
// temporizador de la otra tarjeta, y filtrar por texto cogería las dos.
await page.getByRole('button', { name: 'Bajar Press de banca con mancuernas' }).click()
await page.waitForTimeout(500)
const orden = await page.locator('.item-title').allInnerTexts()
comprobar(
  /Curl de bíceps/.test(orden[0]) && /Press de banca/.test(orden[1]) && /Remo/.test(orden[2]),
  `la superserie debería viajar entera: ${JSON.stringify(orden)}`
)
console.log('  · orden tras bajar la pareja:', orden.map((t) => t.replace(/\s+/g, ' ')).join(' | '))

// ── Y se puede soltar ─────────────────────────────────────
await page.getByText('Sacar de la superserie').first().click()
await page.waitForTimeout(500)
comprobar(
  (await page.locator('.ss-tag').count()) === 0,
  'al sacar a uno de una pareja, el grupo se deshace: uno solo no es una superserie'
)
await page.screenshot({ path: `${OUT}/ss-4-suelto.png`, fullPage: true })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ las superseries encadenan sin descanso, descansan al cerrar la vuelta y se mueven en bloque')
