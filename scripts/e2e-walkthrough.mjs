// Recorrido end-to-end de verificación: onboarding → check-in →
// recomendación → sesión → historial. Guarda capturas en OUT_DIR.
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message))

async function shot(name) {
  await page.waitForTimeout(700) // deja terminar la animación de entrada
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}
async function clickText(text) {
  await page.getByText(text, { exact: false }).first().click()
}

await page.goto('http://localhost:4173/')

// ── Onboarding ──
await shot('01-onboarding')
await page.getByPlaceholder('Tu nombre').fill('Alberto')
await clickText('Continuar')
await clickText('Recomposición corporal')
await shot('02-objetivo')
await clickText('Continuar')
for (const eq of ['Mancuernas', 'Bandas elásticas', 'Banco', 'Bicicleta', 'Poder salir a correr']) {
  await clickText(eq)
}
await shot('03-equipamiento')
await clickText('Continuar')
await page.getByPlaceholder('kg').first().fill('24')
await clickText('Continuar')
await shot('04-listo')
await clickText('Empezar')

// ── Check-in ──
await shot('05-hoy')
await clickText('Empezar el check-in')
const scaleGroups = page.locator('.scale-row')
await scaleGroups.nth(0).locator('.scale-dot').nth(3).click() // sueño 4
const chips = page.locator('.checkin-q .chip-row')
for (let i = 0; i < 5; i++) await chips.nth(i).getByText('Sí', { exact: true }).click()
await scaleGroups.nth(1).locator('.scale-dot').nth(3).click() // energía 4
await page.locator('.checkin-q').last().getByText('Ninguna', { exact: true }).click()
await shot('06-checkin')
await clickText('Ver qué me conviene hoy')

// ── Recomendación ──
await shot('07-recomendacion')
const recoText = await page.locator('.reco-kind').textContent()
console.log('RECOMENDACION:', recoText)
await clickText('Preparar la sesión')

// ── Sesión ──
await shot('08-sesion')
const checks = page.locator('.exercise-check')
const n = await checks.count()
console.log('ejercicios propuestos:', n)
for (let i = 0; i < n; i++) await checks.nth(i).click()
await clickText('Terminar sesión')
await page.locator('.scale-dot').nth(3).click()
await shot('09-fin-sesion')
await clickText('Guardar sesión')
await shot('10-completado')

// ── Historial ──
await page.locator('nav .tab', { hasText: 'Tu cuerpo' }).click()
await page.waitForTimeout(900)
await shot('11-historial')

await browser.close()
console.log('walkthrough OK')
