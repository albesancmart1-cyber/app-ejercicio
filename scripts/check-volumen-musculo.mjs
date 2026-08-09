/**
 * La vista de volumen por músculo, en navegador.
 *
 * Comprueba lo que la vista promete: que cada músculo se mide contra sus
 * propios landmarks, que el desglose explica de dónde salen los decimales, que
 * los objetivos se pueden cambiar a mano y se guardan en el perfil, y que el
 * selector de ejercicios enseña a qué dejaría la semana lo que vas a añadir.
 *
 *   node scripts/check-volumen-musculo.mjs
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

await page.goto(BASE)
await page.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  const ej = (id, sets) => ({
    exerciseId: id,
    name: id,
    primary: 'pecho',
    plan: { sets, reps: '8-12', rir: 2 },
    done: true,
    logs: Array.from({ length: sets }, () => ({ done: true }))
  })
  // Curl de bíceps y press: el bíceps recibe directas, el tríceps solo de
  // acompañante. Es el caso donde el conteo fraccional se ve.
  const sessions = [
    {
      id: 's1',
      date: menos(1),
      kind: 'fuerza',
      title: 'Fuerza',
      completed: true,
      rpe: 3,
      exercises: [ej('curl_biceps', 6), ej('press_banca_mancuernas', 6)]
    }
  ]
  const checkIns = Array.from({ length: 5 }, (_, i) => ({
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
      sessions,
      measurements: []
    })
  )
})

// ── La vista de volumen ───────────────────────────────────
await page.goto(BASE)
await page.waitForTimeout(700)
await page.getByText('Progreso', { exact: true }).first().click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(700)

comprobar(
  await page.getByText('Volumen por músculo').count(),
  'no aparece la tarjeta de volumen por músculo'
)

await page.getByRole('button', { name: /Brazo/ }).first().click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/vm-1-brazo.png` })

const brazo = await page.locator('body').innerText()
comprobar(/Bíceps braquial/.test(brazo), 'el bíceps no sale por su nombre')
comprobar(/Tríceps braquial/.test(brazo), 'el tríceps no sale por su nombre')
// 6 directas de curl → 6,0 al bíceps. 6 de press × 0,5 → 3,0 al tríceps.
comprobar(/6,0/.test(brazo), 'no se ven las 6,0 series directas del bíceps')
comprobar(/3,0/.test(brazo), 'no se ven las 3,0 series de acompañante del tríceps')

// El desglose explica de dónde sale el medio.
await page.getByRole('button', { name: /Tríceps braquial/ }).first().click()
await page.waitForTimeout(400)
const detalle = await page.locator('.mrow-detail').first().innerText()
comprobar(/mitad/i.test(detalle), `el desglose no explica que las de acompañante valen la mitad: ${detalle}`)
comprobar(/Mínimo \d+/.test(detalle), 'el desglose no enseña los landmarks del músculo')
await page.screenshot({ path: `${OUT}/vm-2-desglose.png` })

// ── Los objetivos se ajustan y se guardan ─────────────────
await page.getByText('Yo', { exact: true }).first().click()
await page.waitForTimeout(600)
await page.getByRole('tab', { name: 'Entreno' }).click()
await page.waitForTimeout(400)
comprobar(await page.getByText('Objetivos de volumen').count(), 'no está la tarjeta de objetivos')

await page.getByRole('button', { name: /^Brazo/ }).first().click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Bíceps braquial/ }).first().click()
await page.waitForTimeout(300)
await page.locator('.landmark-fields input').first().fill('7')
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/vm-3-objetivos.png` })

const guardado = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).profile.landmarkOverrides
)
comprobar(
  guardado && guardado.biceps_braquial && guardado.biceps_braquial.mev === 7,
  `el ajuste no se guarda en el perfil: ${JSON.stringify(guardado)}`
)

// Y el cambio se nota donde importa: al recargar, la vista usa el valor propio.
await page.reload()
await page.waitForTimeout(700)
await page.getByText('Progreso', { exact: true }).first().click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(600)
await page.getByRole('button', { name: /Brazo/ }).first().click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Bíceps braquial/ }).first().click()
await page.waitForTimeout(400)
const conAjuste = await page.locator('.mrow-detail').first().innerText()
comprobar(/Mínimo 7/.test(conAjuste), `el mínimo ajustado no llega a la vista: ${conAjuste}`)

// ── El impacto de añadir un ejercicio ─────────────────────
await page.getByText('Hoy', { exact: true }).first().click()
await page.waitForTimeout(600)
const empezar = page.getByText('Empezar', { exact: false }).first()
if (await empezar.count()) {
  await empezar.click()
  await page.waitForTimeout(300)
  await page.getByText('Ver qué me conviene').click()
  await page.waitForTimeout(500)
}
const pesas = page.getByText('Prefiero algo con pesas')
if (await pesas.count()) {
  await pesas.click()
  await page.waitForTimeout(400)
}
await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(700)
await page.getByText('Añadir un ejercicio de la lista').click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/vm-4-impacto.png` })

const impactos = await page.locator('.item-impact').count()
comprobar(impactos > 0, 'el selector no enseña el impacto de añadir el ejercicio')
if (impactos > 0) {
  const primero = await page.locator('.item-impact').first().innerText()
  comprobar(/→/.test(primero), `el impacto no enseña el antes y el después: ${primero}`)
}

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ volumen por músculo: zonas, desglose, objetivos editables e impacto al añadir')
