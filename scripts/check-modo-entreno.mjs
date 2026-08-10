/**
 * El modo entreno, en navegador.
 *
 * Lo que tiene que pasar en cuanto se pulsa «Empezar entrenamiento»:
 *
 *  - La pantalla enseña **una serie y nada más**: nombre del ejercicio, peso,
 *    repeticiones, esfuerzo y un botón. Ni rastro de las ocho acciones
 *    secundarias que tenía cada tarjeta de la lista.
 *  - Los steppers **escriben de verdad** en la serie: subir el peso deja el
 *    número puesto, y el paso es de 2,5 kg con barra y de 1 sin ella.
 *  - El RIR se pone de un toque, y **se quita** volviendo a tocarlo.
 *  - «Serie hecha» marca y **avanza**: la siguiente serie aparece sola.
 *  - Lo secundario existe, pero detrás de los tres puntos.
 *  - Y se puede ir a la lista y volver sin perder nada.
 *
 *   node scripts/check-modo-entreno.mjs
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
      sessions: [],
      measurements: []
    })
  )
})

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
await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(800)

// ── Antes de empezar sigue estando la lista, para revisar el plan ──
comprobar(
  (await page.locator('.focus').count()) === 0,
  'el modo foco aparece antes de empezar: el plan hay que poder revisarlo'
)
comprobar(await page.locator('.set-row').count(), 'no se ve el plan con sus series antes de empezar')

await page.getByText('Empezar entrenamiento', { exact: false }).first().click()
await page.waitForTimeout(600)

// ── Al empezar, una serie y nada más ──────────────────────
comprobar(await page.locator('.focus').count(), 'empezar no entra en el modo foco')
comprobar(
  (await page.locator('.set-row').count()) === 0,
  'el modo foco sigue enseñando la lista de series'
)
comprobar(
  (await page.getByText('No me lo propongas más').count()) === 0,
  'las acciones secundarias siguen en la pantalla de entrenar'
)
comprobar(await page.locator('.chrono').count(), 'no se ve el cronómetro mientras se entrena')
const nombre = (await page.locator('.focus-nombre').innerText()).trim()
comprobar(nombre.length > 0, 'el modo foco no dice qué ejercicio toca')
console.log('  · toca:', nombre)
await page.screenshot({ path: `${OUT}/entreno-1-foco.png` })

// ── Los steppers escriben de verdad, y con el paso del material ──
// Los contadores son `NumberField` de Base UI: el número vive en un <input> de
// verdad, así que se lee su `value` y no su texto. Se apunta al de texto porque
// Base UI añade además uno `type="number"` oculto para el envío de formularios.
const peso = page.locator('.focus-campo').first().locator('input[type="text"]')
const reps = page.locator('.focus-campo').nth(1).locator('input[type="text"]')
const num = async (loc) => Number((await loc.inputValue()).replace(',', '.'))

const pesoAntes = await num(peso)
const base = Number.isNaN(pesoAntes) ? 0 : pesoAntes
await page.getByRole('button', { name: /^Subir: el peso/ }).click()
await page.waitForTimeout(250)
const pesoDespues = await num(peso)
const paso = Math.round((pesoDespues - base) * 100) / 100
comprobar(paso === 1 || paso === 2.5, `el paso del peso no es de 1 ni de 2,5 kg: ${paso}`)
console.log('  · peso:', pesoAntes, '→', pesoDespues, `(paso ${paso})`)

const repsAntes = await num(reps)
await page.getByRole('button', { name: /^Subir: las repeticiones/ }).click()
await page.waitForTimeout(250)
comprobar(
  (await num(reps)) === repsAntes + 1,
  `las repeticiones no suben de una en una: ${repsAntes} → ${await num(reps)}`
)

// Los contadores hablan en castellano. No es cosmético: el `NumberField` de la
// librería lleva «Increase value» escrito a fuego y sin prop para cambiarlo, y
// por eso esta app usa el primitivo de Base UI. Si alguien vuelve al de Appica,
// esto lo caza.
for (const etiqueta of ['Subir', 'Bajar']) {
  const botones = await page.getByRole('button', { name: new RegExp(`^${etiqueta}: `) }).count()
  comprobar(botones >= 2, `los contadores deberían decir «${etiqueta}: …» en castellano; hay ${botones}`)
}
comprobar(
  (await page.getByRole('button', { name: /Increase value|Decrease value/ }).count()) === 0,
  'los contadores están anunciándose en inglés'
)

// Y lo escrito llega al almacén: si no, se pierde al cambiar de pestaña.
const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const s = d.sessions[d.sessions.length - 1]
  return s.exercises.flatMap((e) => e.logs ?? []).filter((l) => l.weightKg !== undefined).length
})
comprobar(guardado > 0, 'lo que se toca en el modo foco no se guarda')

// ── El esfuerzo, de un toque; y de otro se quita ──────────
await page.getByRole('button', { name: 'Anotar RIR 1' }).click()
await page.waitForTimeout(250)
comprobar(
  (await page.getByRole('button', { name: 'Anotar RIR 1' }).getAttribute('aria-pressed')) === 'true',
  'el RIR no se queda puesto al tocarlo'
)
await page.getByRole('button', { name: 'Anotar RIR 1' }).click()
await page.waitForTimeout(250)
comprobar(
  (await page.getByRole('button', { name: 'Anotar RIR 1' }).getAttribute('aria-pressed')) === 'false',
  'un RIR puesto por error no se puede quitar'
)
await page.screenshot({ path: `${OUT}/entreno-2-anotado.png` })

// ── Lo secundario, detrás de los tres puntos ──────────────
await page.getByRole('button', { name: 'Más opciones de este ejercicio' }).click()
await page.waitForTimeout(400)
comprobar(await page.locator('.hoja').count(), 'los tres puntos no abren nada')
for (const accion of ['Cambiar ejercicio', 'Mis marcas', 'Descanso y notas', 'Terminar el entreno']) {
  comprobar(
    await page.locator('.hoja').getByText(accion, { exact: false }).count(),
    `falta «${accion}» en el menú del ejercicio`
  )
}
await page.screenshot({ path: `${OUT}/entreno-3-menu.png` })
// El cajón se cierra con su propio botón, que debe hablar en castellano.
comprobar(
  (await page.getByRole('button', { name: /Close/ }).count()) === 0,
  'el cajón se está cerrando con un botón que dice «Close»'
)
await page.getByRole('button', { name: 'Cerrar el menú' }).click()
await page.waitForTimeout(500)
comprobar((await page.locator('.hoja').count()) === 0, 'el menú no se cierra')

// ── «Serie hecha» marca y avanza ──────────────────────────
const antesDeMarcar = (await page.locator('.focus-top .faint').innerText()).trim()
await page.getByRole('button', { name: 'Serie hecha' }).click()
await page.waitForTimeout(700)

// Un récord toma la pantalla, y va por delante del descanso.
const seguir = page.getByRole('button', { name: 'Seguir entrenando' })
if (await seguir.count()) {
  await seguir.click()
  await page.waitForTimeout(400)
}
const saltar = page.getByRole('button', { name: 'Saltar descanso' })
comprobar(await saltar.count(), 'marcar la serie no arranca el descanso')
if (await saltar.count()) {
  await saltar.click()
  await page.waitForTimeout(500)
}
comprobar(await page.locator('.focus').count(), 'tras el descanso no se vuelve al modo foco')
const despuesDeMarcar = (await page.locator('.focus-top .faint').innerText()).trim()
comprobar(
  antesDeMarcar !== despuesDeMarcar,
  `marcar la serie no avanzó la cuenta: sigue en «${antesDeMarcar}»`
)
console.log('  · avance:', antesDeMarcar, '→', despuesDeMarcar)
await page.screenshot({ path: `${OUT}/entreno-4-siguiente.png` })

// ── Ir a la lista y volver ────────────────────────────────
await page.getByRole('button', { name: 'Ver todos los ejercicios' }).click()
await page.waitForTimeout(400)
comprobar(await page.locator('.set-row').count(), 'el botón de la lista no lleva a la lista')
comprobar(
  await page.getByRole('button', { name: 'Volver a la serie que toca' }).count(),
  'desde la lista no hay vuelta al modo foco'
)
const marcadas = await page.locator('.set-row button.check[aria-pressed="true"]').count()
comprobar(marcadas > 0, 'la serie marcada en el modo foco no aparece marcada en la lista')
await page.screenshot({ path: `${OUT}/entreno-5-lista.png` })

await page.getByRole('button', { name: 'Volver a la serie que toca' }).click()
await page.waitForTimeout(400)
comprobar(await page.locator('.focus').count(), 'no se vuelve al modo foco desde la lista')

console.log(errores.length ? `\nErrores de consola:\n  ${errores.join('\n  ')}` : '\nSin errores de consola.')
if (fallos.length) {
  console.error('\nFALLOS:')
  for (const f of fallos) console.error('  ·', f)
  await browser.close()
  process.exit(1)
}
console.log('\nModo entreno: todo en su sitio. Capturas en', OUT)
await browser.close()
