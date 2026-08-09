/**
 * Elegir el nivel de volumen a mano, en navegador.
 *
 * Comprueba que se puede saltar de nivel desde la tarjeta de volumen, que la
 * elección se guarda en el perfil y manda sobre lo que calcula la app, que se
 * puede volver a lo automático, y que la sesión que se construye después trae de
 * verdad las series del nivel elegido.
 *
 *   node scripts/check-nivel.mjs
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

/** Historial corto y limpio: la app estaría en el nivel base. */
await page.goto(BASE)
await page.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  const sessions = [4, 7, 10, 13].map((d) => ({
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

/** Llega hasta la tarjeta de volumen y devuelve su texto. */
async function verVolumen() {
  await page.goto(BASE)
  await page.waitForTimeout(700)
  await page.getByText('Empezar', { exact: false }).first().click()
  await page.waitForTimeout(300)
  await page.getByText('Ver qué me conviene').click()
  await page.waitForTimeout(500)
  const pesas = page.getByText('Prefiero algo con pesas')
  if (await pesas.count()) {
    await pesas.click()
    await page.waitForTimeout(400)
  }
  const bloque = page.locator('.card').filter({ hasText: 'Volumen · nivel' })
  if ((await bloque.count()) === 0) return null
  await bloque.first().scrollIntoViewIfNeeded()
  return bloque.first()
}

const antes = await verVolumen()
comprobar(antes !== null, 'no aparece la tarjeta de volumen')
const textoAntes = antes ? await antes.innerText() : ''
// La cabecera se pinta en mayúsculas, así que se busca sin distinguir caja.
const nivelAntes = Number((textoAntes.match(/nivel (\d)/i) ?? [])[1])
console.log('  · nivel de partida:', nivelAntes)
await page.screenshot({ path: `${OUT}/nivel-1-antes.png` })

// ── Subir de nivel ────────────────────────────────────────
// El detalle del volumen va plegado: es de leer con calma, no de mirar antes
// de entrenar.
const desplegar = page.getByRole('button', { name: /Volumen · nivel/ }).first()
if (await desplegar.count()) {
  await desplegar.click()
  await page.waitForTimeout(400)
}
const boton = page.getByRole('button', { name: /Subir de nivel|Cambiar de nivel/ }).first()
comprobar(await boton.count(), 'no hay botón para cambiar de nivel')
if (await boton.count()) {
  await boton.scrollIntoViewIfNeeded()
  await boton.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/nivel-2-elegir.png` })

  const opciones = page.locator('.level-picker .opt')
  comprobar((await opciones.count()) === 4, `deberían ofrecerse los 4 niveles, hay ${await opciones.count()}`)
  const texto4 = await opciones.nth(3).innerText()
  comprobar(/series/.test(texto4), `la opción no dice en qué se nota: «${texto4}»`)

  await opciones.nth(3).click()
  await page.waitForTimeout(700)
}

const guardado = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).profile.volumeLevelOverride
)
comprobar(guardado === 4, `el nivel elegido no se guarda en el perfil: ${guardado}`)

const despues = page.locator('.card').filter({ hasText: 'Volumen · nivel' }).first()
await despues.scrollIntoViewIfNeeded()
const textoDespues = await despues.innerText()
comprobar(/nivel 4/i.test(textoDespues), `la tarjeta no refleja el nivel elegido: «${textoDespues.slice(0, 80)}»`)
comprobar(/elegido por ti/i.test(textoDespues), 'no dice que el nivel lo has puesto tú')
comprobar(
  /lo has puesto tú|has elegido tú/i.test(textoDespues),
  'no explica que manda tu elección sobre la suya'
)
await page.screenshot({ path: `${OUT}/nivel-3-elegido.png` })

// ── Volver a lo automático ────────────────────────────────
const volver = page.getByRole('button', { name: /Volver a que decidas tú/ }).first()
comprobar(await volver.count(), 'no hay forma de volver a la progresión automática')
if (await volver.count()) {
  await volver.scrollIntoViewIfNeeded()
  await volver.click()
  await page.waitForTimeout(600)
  const tras = await page.evaluate(
    () => JSON.parse(localStorage.getItem('ritmo-data-v1')).profile.volumeLevelOverride
  )
  comprobar(tras === undefined, `al volver a lo automático debería borrarse la elección: ${tras}`)
  const vuelta = await page.locator('.card').filter({ hasText: 'Volumen · nivel' }).first().innerText()
  comprobar(
    new RegExp(`nivel ${nivelAntes}`, 'i').test(vuelta),
    `al soltar la elección debería volver al nivel ${nivelAntes}: «${vuelta.slice(0, 60)}»`
  )
}
await page.screenshot({ path: `${OUT}/nivel-5-automatico.png` })

// ── Y la sesión trae de verdad el volumen elegido ─────────
const otraVez = page.getByRole('button', { name: /Subir de nivel|Cambiar de nivel/ }).first()
await otraVez.scrollIntoViewIfNeeded()
await otraVez.click()
await page.waitForTimeout(400)
await page.locator('.level-picker .opt').nth(3).click()
await page.waitForTimeout(600)

await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(900)
const filas = await page.locator('.set-row').count()
const conCore = await page.locator('.card').count()
console.log('  · sesión del nivel 4:', filas, 'series en total,', conCore, 'tarjetas')
comprobar(filas >= 20, `el nivel 4 debería traer unas 25 series de trabajo, hay ${filas}`)
await page.screenshot({ path: `${OUT}/nivel-4-sesion.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el nivel de volumen se puede elegir a mano, manda, y se puede deshacer')
