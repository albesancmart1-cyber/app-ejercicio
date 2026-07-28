/**
 * Reproduce el caso reportado: día de cardio, sesión **ya preparada**, y las
 * ganas de levantar llegan mirando el plan. Desde ahí tiene que poder meterse
 * fuerza sin elegir nada a mano y sin descartar la sesión.
 *
 * Requiere `npm run preview` en marcha. Define OUT_DIR para las capturas.
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

const byText = (t) => page.getByText(t, { exact: false }).first()
const fallar = (...m) => {
  console.error('ERROR:', ...m)
  process.exit(1)
}

await page.clock.install({ time: new Date('2026-07-27T11:00:00') })
await page.goto(BASE)

await page.evaluate(() => {
  const iso = (d) => d.toISOString().slice(0, 10)
  const hoy = new Date('2026-07-27T11:00:00')
  const menos = (n) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - n)
    return d
  }
  const profile = {
    name: 'Alberto',
    goal: 'recomposicion',
    weightKg: 78,
    heightCm: 178,
    equipment: ['peso_corporal', 'mancuernas', 'bandas', 'banco', 'bici', 'correr'],
    maxWeights: { mancuernas: 24 }
  }
  const checkIns = Array.from({ length: 8 }, (_, i) => ({
    date: iso(menos(i)),
    sleep: 4,
    lightHygiene: true,
    sunrise: true,
    sunsetYesterday: true,
    sunExposure: true,
    keto: true,
    energy: 4,
    discomfort: 'ninguna',
    wokeHungry: false,
    cravings: false
  }))
  const sessions = [2, 1].map((d, i) => ({
    id: `s${i}`,
    date: iso(menos(d)),
    kind: 'fuerza',
    title: 'Fuerza',
    completed: true,
    rpe: 4,
    exercises: [
      {
        exerciseId: 'press_banca_mancuernas',
        name: 'Press',
        primary: i === 0 ? 'pecho' : 'espalda',
        plan: { sets: 3, reps: '8-12' },
        done: true,
        logs: [{ weightKg: 14, reps: 12, done: true }]
      }
    ]
  }))
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({ version: 1, profile, checkIns, sessions, measurements: [] })
  )
})
await page.reload()
await page.waitForTimeout(400)

// Preparar la sesión de cardio tal cual la propone la app, sin tocar nada más.
await byText('Empezar').click()
await page.waitForTimeout(250)
await byText('Ver qué me conviene').click()
await page.waitForTimeout(350)
const tocaba = (await page.locator('.eyebrow').nth(1).textContent()).trim()
if (!/cardio/i.test(tocaba)) fallar('el historial debería llevar a cardio; llevó a', tocaba)
await byText('Preparar la sesión').click()
await page.waitForTimeout(450)

const antes = await page.locator('.item-title').allTextContents()
console.log('  → sesión preparada:', antes.join(', '))
if (antes.length !== 1) fallar('la sesión de cardio debería traer solo el cardio →', antes.join(' / '))
const minutosAntes = Number((await page.locator('.item-meta').first().textContent()).match(/(\d+)\s*min/)?.[1] ?? 0)
await page.screenshot({ path: `${OUT}/meter-01-solo-cardio.png` })

// ── Desde el plan ya montado, meter pesas sin elegir nada ──
const boton = page.getByText('Añadir pesas · te las elijo yo')
if (!(await boton.count())) fallar('falta el botón de meter pesas desde el plan de un día de cardio')
const promesa = (await page.locator('.faint').filter({ hasText: 'zonas que llevan más sin trabajarse' }).first().textContent()).replace(/\s+/g, ' ')
console.log('  → ofrece:', promesa.trim())
await boton.click()
await page.waitForTimeout(450)

const despues = await page.locator('.item-title').allTextContents()
const pesas = despues.filter((n) => !/camin|bici|trote|escalera|comba|movilidad/i.test(n))
if (pesas.length < 3) fallar('debería meter 3 o 4 ejercicios de fuerza, metió', pesas.length, '→', despues.join(' / '))
if (new Set(pesas).size !== pesas.length) fallar('no debería repetir ejercicio →', pesas.join(' / '))
if (!/camin|bici|trote|escalera|comba|movilidad/i.test(despues[despues.length - 1])) {
  fallar('el cardio debe quedar el último, detrás de las pesas →', despues.join(' / '))
}
console.log('  → mete', pesas.length, 'de fuerza y deja el cardio al final:', despues.join(', '))

// El cardio se recorta, no se mantiene entero.
const metaCardio = await page.locator('.card').filter({ hasText: despues[despues.length - 1] }).locator('.item-meta').first().textContent()
const minutosDespues = Number(metaCardio.match(/(\d+)\s*min/)?.[1] ?? 0)
if (!(minutosDespues > 0 && minutosDespues < minutosAntes)) {
  fallar('el cardio debería recortarse al repartir el día →', minutosAntes, '→', minutosDespues)
}
console.log(`  → cardio recortado: ${minutosAntes} → ${minutosDespues} min`)

// Y una vez repartido el día, el botón desaparece: ya no hay nada que repartir.
if (await page.getByText('Añadir pesas · te las elijo yo').count()) {
  fallar('con la fuerza ya metida el botón no debería seguir ofreciéndose')
}
await page.screenshot({ path: `${OUT}/meter-02-con-pesas.png`, fullPage: true })

// ── Y lo que sobre se puede quitar ────────────────────────
const aQuitar = pesas[pesas.length - 1]
await page.locator('.card').filter({ hasText: aQuitar }).getByText('Quitar', { exact: true }).click()
await page.waitForTimeout(350)
const trasQuitar = await page.locator('.item-title').allTextContents()
if (trasQuitar.includes(aQuitar)) fallar('quitar no sacó el ejercicio →', trasQuitar.join(' / '))
console.log('  → y lo que sobra se quita:', aQuitar, '· quedan', trasQuitar.length)
await page.screenshot({ path: `${OUT}/meter-03-quitado.png` })

await browser.close()
if (errores.length) {
  console.error('ERRORES EN CONSOLA:', errores)
  process.exit(1)
}
console.log('meter pesas desde el plan verificado')
