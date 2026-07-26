// Recorrido end-to-end de verificación: onboarding → check-in → recomendación →
// sesión → historial, más las cuatro paletas horarias. Capturas en OUT_DIR.
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

async function shot(name) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('·', name)
}
const byText = (t) => page.getByText(t, { exact: false }).first()

await page.goto(BASE)

// ── Onboarding ────────────────────────────────────────────
await shot('01-bienvenida')
await page.getByPlaceholder('Tu nombre').fill('Alberto')
await page.getByPlaceholder('Opcional').nth(1).fill('78')
await byText('Continuar').click()

await byText('Recomposición corporal').click()
await shot('02-objetivo')
await byText('Continuar').click()

for (const eq of ['Mancuernas', 'Bandas elásticas', 'Banco', 'Bicicleta', 'Poder salir a correr']) {
  await byText(eq).click()
}
await shot('03-equipamiento')
await byText('Continuar').click()

await page.getByPlaceholder('kg').first().fill('24')
await shot('04-pesos')
await byText('Continuar').click()

await page.locator('input[type=date]').fill('2026-07-01')
await shot('05-cetosis')
await byText('Empezar').click()

// ── Check-in ──────────────────────────────────────────────
await shot('06-hoy')
await byText('Empezar').click()

const scales = page.locator('.scale')
await scales.nth(0).locator('button').nth(3).click() // sueño 4
await scales.nth(1).locator('button').nth(3).click() // energía 4

// Selectores por texto, no por índice: así añadir tarjetas no rompe el recorrido.
const card = (titulo) => page.locator('.card').filter({ hasText: titulo })
const answer = async (pregunta, respuesta) =>
  page.locator('.row').filter({ hasText: pregunta }).getByText(respuesta, { exact: true }).click()

for (const q of [
  '¿Respetaste anoche la higiene lumínica?',
  '¿Has visto el amanecer hoy?',
  '¿Viste el atardecer ayer?',
  '¿Te dio el sol ayer?',
  '¿Sigues en cetosis?'
]) {
  await answer(q, 'Sí')
}
// Señales de leptina: sin hambre voraz ni antojos.
await answer('¿Te despertaste con mucha hambre?', 'No')
await answer('¿Tuviste antojos ayer?', 'No')
await shot('07-checkin')
await card('Apetito').scrollIntoViewIfNeeded()
await shot('07b-apetito')

await card('Cuerpo').getByText('Ninguna', { exact: true }).click()
await byText('Ver qué me conviene').click()

// ── Recomendación ─────────────────────────────────────────
await shot('08-recomendacion')
console.log('  → recomienda:', await page.locator('.eyebrow').nth(1).textContent())
await byText('Por qué esto hoy').click()
await shot('09-por-que')
await byText('Preparar la sesión').click()

// ── Sesión ────────────────────────────────────────────────
await shot('10-sesion')
const checks = page.locator('.check')
const n = await checks.count()
console.log('  → ejercicios propuestos:', n)
for (let i = 0; i < n; i++) await checks.nth(i).click()
const weights = page.locator('.weight-input')
if ((await weights.count()) > 0) await weights.first().fill('12')
await byText('Terminar').click()
await page.locator('.scale button').nth(3).click()
await shot('11-sensacion')
await byText('Guardar').click()
await shot('12-completada')

// ── Cuerpo: balance muscular y señal de leptina ───────────
await page.locator('.tab', { hasText: 'Cuerpo' }).click()
await shot('13-leptina')
await page.locator('.card').filter({ hasText: 'Balance muscular' }).scrollIntoViewIfNeeded()
await shot('13b-balance')

// ── Mesa: idea de comida ──────────────────────────────────
await page.locator('.tab', { hasText: 'Mesa' }).click()
await shot('14-mesa')
await byText('Dame una idea').click()
const primera = await page.locator('.card h2').first().textContent()
await shot('15-idea')
await byText('Dame otra idea').click()
const segunda = await page.locator('.card h2').first().textContent()
console.log('  → primera idea:', primera)
console.log('  → segunda idea:', segunda)
if (primera === segunda) {
  console.error('ERROR: la sugerencia repitió el mismo plato')
  process.exit(1)
}
// Filtro por base y esfuerzo.
await byText('Marisco').click()
await byText('Sin cocinar').click()
await byText('Dame otra idea').click()
await shot('16-idea-filtrada')
await byText('Ver los ').click()
await shot('17-recetario')

await page.locator('.tab', { hasText: 'Ajustes' }).click()
await shot('18-ajustes')

// ── Paletas horarias ──────────────────────────────────────
await page.locator('.tab', { hasText: 'Hoy' }).click()
for (const t of ['dawn', 'day', 'dusk', 'night']) {
  await page.evaluate((v) => (document.body.dataset.daytime = v), t)
  await shot(`19-paleta-${t}`)
}

await browser.close()
if (errors.length) {
  console.error('ERRORES EN CONSOLA:', errors)
  process.exit(1)
}
console.log('recorrido completo sin errores')
