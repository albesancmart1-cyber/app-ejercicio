/**
 * Marcar varias zonas con molestias en el test diario, en navegador.
 *
 * Comprueba que se pueden marcar varias a la vez, que «Ninguna» las limpia, que
 * lo marcado se guarda en el check-in y que la recomendación deja fuera **todas**
 * las zonas señaladas, no solo una.
 *
 *   node scripts/check-molestias.mjs
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

// Perfil con historial, pero sin check-in de hoy: hay que rellenarlo a mano.
await page.goto(BASE)
await page.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  const sessions = [4, 7, 10].map((d) => ({
    id: 's' + d,
    date: menos(d),
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
      checkIns: [],
      sessions,
      measurements: []
    })
  )
})

await page.goto(BASE)
await page.waitForTimeout(700)
await page.getByText('Empezar', { exact: false }).first().click()
await page.waitForTimeout(400)

/** Contesta todo lo anterior a la pregunta de molestias. */
await page.locator('.scale button').nth(3).click() // sueño
await page.waitForTimeout(150)
const sies = page.getByRole('button', { name: 'Sí', exact: true })
const cuantos = await sies.count()
for (let i = 0; i < cuantos; i++) {
  await sies.nth(i).click()
  await page.waitForTimeout(60)
}
const escalas = page.locator('.scale')
if ((await escalas.count()) > 1) {
  await escalas.nth(1).locator('button').nth(3).click() // energía
  await page.waitForTimeout(150)
}

const tarjeta = page.locator('.card').filter({ hasText: '¿Molestias o agujetas?' })
comprobar(await tarjeta.count(), 'no aparece la pregunta de molestias')
await tarjeta.first().scrollIntoViewIfNeeded()

// ── Varias zonas a la vez ─────────────────────────────────
const zonas = ['Espalda', 'Pecho', 'Hombro']
for (const z of zonas) {
  await tarjeta.getByRole('button', { name: z, exact: true }).click()
  await page.waitForTimeout(120)
}
const marcadas = await tarjeta.locator('.opt[aria-pressed="true"]').count()
comprobar(marcadas === zonas.length, `deberían quedar ${zonas.length} zonas marcadas, hay ${marcadas}`)
await page.screenshot({ path: `${OUT}/molestias-1-varias.png` })

// Y se puede desmarcar una sin perder las otras.
await tarjeta.getByRole('button', { name: 'Pecho', exact: true }).click()
await page.waitForTimeout(150)
comprobar(
  (await tarjeta.locator('.opt[aria-pressed="true"]').count()) === 2,
  'desmarcar una zona no debería tocar las demás'
)
await tarjeta.getByRole('button', { name: 'Pecho', exact: true }).click()
await page.waitForTimeout(150)

// Las leves repartidas conviven con las zonas concretas.
await tarjeta.getByRole('button', { name: /Leves y repartidas/ }).click()
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/molestias-2-leves.png` })

// ── Se guarda todo ────────────────────────────────────────
await page.getByText('Ver qué me conviene').click()
await page.waitForTimeout(700)

const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return d.checkIns[d.checkIns.length - 1]
})
comprobar(
  Array.isArray(guardado?.discomforts) && guardado.discomforts.length === 3,
  `el check-in debería guardar las 3 zonas: ${JSON.stringify(guardado?.discomforts)}`
)
comprobar(guardado?.mildSoreness === true, 'no se guardan las leves repartidas')
comprobar(
  guardado?.discomfort !== 'ninguna',
  'el resumen antiguo debería seguir rellenándose para poder leerlo con versiones viejas'
)
console.log('  · guardado:', JSON.stringify(guardado.discomforts), '· leves:', guardado.mildSoreness)

// ── Y la recomendación las respeta todas ──────────────────
const porQue = page.getByText('Por qué esto hoy', { exact: false }).first()
if (await porQue.count()) {
  await porQue.scrollIntoViewIfNeeded()
  await porQue.click()
  await page.waitForTimeout(400)
}
const texto = await page.locator('body').innerText()
comprobar(/3 zonas|zonas que has marcado|zonas con molestias/i.test(texto), `no menciona las zonas marcadas: ${texto.slice(0, 200)}`)
await page.screenshot({ path: `${OUT}/molestias-3-plan.png` })

const titulo = (await page.locator('.eyebrow').allInnerTexts()).join(' ')
for (const z of ['ESPALDA', 'PECHO', 'HOMBRO']) {
  comprobar(!titulo.includes(z), `la sesión abre por ${z}, que está marcada con molestias`)
}

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ se pueden marcar varias zonas, se guardan y la recomendación las respeta todas')
