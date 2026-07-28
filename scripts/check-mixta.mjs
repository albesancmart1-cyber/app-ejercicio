/**
 * Comprueba en navegador la sesión mixta: el día que la app manda cardio y el
 * usuario se nota con cuerpo para levantar, debe poder quedarse con las dos
 * cosas —pesas primero, cardio recortado— sin que eso sea una paliza.
 *
 * Se siembra un historial que fuerza la recomendación de cardio: dos sesiones
 * de fuerza seguidas y recientes, que es justo cuando la cascada alterna.
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

await page.clock.install({ time: new Date('2026-07-27T10:00:00') })
await page.goto(BASE)

// ── Historial que hace que hoy toque cardio ───────────────
await page.evaluate(() => {
  const iso = (d) => d.toISOString().slice(0, 10)
  const hoy = new Date('2026-07-27T10:00:00')
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
  // Dos de fuerza seguidas y recientes: la cascada pasa a cardio.
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
        logs: [
          { weightKg: 14, reps: 12, done: true },
          { weightKg: 14, reps: 12, done: true },
          { weightKg: 14, reps: 12, done: true }
        ]
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

// El check-in de hoy ya está sembrado: basta pasar por la pantalla.
await byText('Empezar').click()
await page.waitForTimeout(250)
await byText('Ver qué me conviene').click()
await page.waitForTimeout(400)

const tocaba = (await page.locator('.eyebrow').nth(1).textContent()).trim()
if (!/cardio/i.test(tocaba)) fallar('el historial debería llevar a cardio; llevó a', tocaba)
console.log('  → lo que tocaba:', tocaba)
await page.screenshot({ path: `${OUT}/mix-01-tocaba-cardio.png` })

// ── Las dos opciones deben estar ahí ──────────────────────
const mixto = page.getByText('Pesas sin quitar el cardio')
const soloPesas = page.getByText('Prefiero algo con pesas')
if (!(await mixto.count())) fallar('falta la opción de pesas sin quitar el cardio')
if (!(await soloPesas.count())) fallar('falta la opción de cambiarlo por pesas')
console.log('  → ofrece las dos: repartir, o cambiarlo del todo')

// ── La mixta ──────────────────────────────────────────────
await mixto.click()
await page.waitForTimeout(350)
const titulo = (await page.locator('.eyebrow').nth(1).textContent()).trim()
if (!/pesas y cardio/i.test(titulo)) fallar('la opción mixta no cambió la recomendación →', titulo)

// La propia app dice cuánto cardio conserva y de cuánto venía.
const tarjeta = (await page.locator('.card').filter({ hasText: 'cardio tranquilo' }).first().textContent())
  .replace(/\s+/g, ' ')
const minutosDespues = Number(tarjeta.match(/(\d+)\s*min de cardio/)?.[1] ?? 0)
if (!(minutosDespues > 0)) fallar('la mixta no dice cuánto cardio conserva →', tarjeta)
if (!/a petición tuya/i.test(tarjeta)) fallar('debería quedar claro que lo pediste tú')
console.log('  → mixta:', titulo, `· conserva ${minutosDespues} min de cardio`)
await page.screenshot({ path: `${OUT}/mix-02-mixta.png` })

await byText('Por qué esto hoy').click()
await page.waitForTimeout(250)
// En esta pantalla hay varias listas «.reasons» —los cambios de volumen, la
// evidencia y el porqué del día—: se miran todas juntas.
const porQue = (await page.locator('.reasons').allTextContents()).join(' ').replace(/\s+/g, ' ')
if (!/has pedido/i.test(porQue)) fallar('el «por qué» debe decir que fue decisión tuya →', porQue)
if (!/primero las pesas/i.test(porQue)) fallar('el «por qué» debe explicar el orden →', porQue)
const recorte = porQue.match(/se queda en (\d+) min de los (\d+)/)
if (!recorte) fallar('el «por qué» debe decir de cuánto a cuánto se recorta el cardio →', porQue)
if (!(Number(recorte[1]) < Number(recorte[2]))) {
  fallar('el cardio debería recortarse, no mantenerse →', recorte[0])
}
console.log(`  → cardio recortado: ${recorte[2]} → ${recorte[1]} min`)
console.log('  → lo explica:', porQue.slice(0, 150))
await page.screenshot({ path: `${OUT}/mix-03-por-que.png` })

// ── Se puede deshacer ─────────────────────────────────────
await byText('Volver a lo que me tocaba').click()
await page.waitForTimeout(300)
const vuelto = (await page.locator('.eyebrow').nth(1).textContent()).trim()
if (vuelto !== tocaba) fallar('volver atrás debería devolver la recomendación original →', vuelto)
console.log('  → se puede deshacer: vuelve a', vuelto)
await page.getByText('Pesas sin quitar el cardio').click()
await page.waitForTimeout(300)

// ── El plan que sale ──────────────────────────────────────
await byText('Preparar la sesión').click()
await page.waitForTimeout(450)
const nombres = await page.locator('.item-title').allTextContents()
if (nombres.length < 3) fallar('la mixta debería traer pesas además del cardio →', nombres.join(' / '))
const ultimo = nombres[nombres.length - 1]
if (!/camin|bici|trote|escalera|comba|remo en m|movilidad/i.test(ultimo)) {
  fallar('el cardio debe ir el último, después de las pesas →', nombres.join(' / '))
}
const conMinutos = await page.getByText(`${minutosDespues} min`).count()
if (!conMinutos) fallar('el plan no muestra los minutos de cardio recortados')
console.log('  → plan:', nombres.slice(0, -1).join(', '), '+', ultimo)
await page.screenshot({ path: `${OUT}/mix-04-plan.png`, fullPage: true })

// ── El caso que fallaba: un día de descanso activo ────────
//
// Con la disposición por los suelos la app manda descanso activo. Se ofrecía
// cambiarlo entero por pesas y en cambio no la versión suave, que es al revés
// de como debería.
// Queda una sesión preparada de la comprobación anterior: se descarta antes.
await byText('Hoy no puedo').click()
await page.waitForTimeout(400)

await page.evaluate(() => {
  const datos = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  // Una racha de noches horribles: sueño y energía al mínimo, hambre y antojos.
  // Se cambian todas, no la primera: al guardar el check-in del día la app
  // reordena la lista y el índice 0 deja de ser hoy.
  datos.checkIns = datos.checkIns.map((c) => ({
    ...c,
    sleep: 1,
    energy: 1,
    lightHygiene: false,
    sunrise: false,
    sunsetYesterday: false,
    sunExposure: false,
    wokeHungry: true,
    cravings: true
  }))
  localStorage.setItem('ritmo-data-v1', JSON.stringify(datos))
})
await page.reload()
await page.waitForTimeout(400)
await byText('Empezar').click()
await page.waitForTimeout(250)
await byText('Ver qué me conviene').click()
await page.waitForTimeout(400)

const flojo = (await page.locator('.eyebrow').nth(1).textContent()).trim()
console.log('  → con mala disposición toca:', flojo, '· disposición:', await page.locator('.score').first().textContent())
if (!(await page.getByText('Prefiero algo con pesas').count())) {
  fallar('debería seguir ofreciendo el cambio completo')
}
if (!(await page.getByText('Pesas sin quitar el cardio').count())) {
  fallar('también debe ofrecer la mixta: repartir exige menos que cambiarlo entero →', flojo)
}
await page.getByText('Pesas sin quitar el cardio').click()
await page.waitForTimeout(350)
const suave = (await page.locator('.card').filter({ hasText: 'cardio tranquilo' }).first().textContent())
  .replace(/\s+/g, ' ')
if (!/intensidad suave/i.test(suave)) fallar('con mala disposición no debe pasar de suave →', suave)
console.log('  → y en un día flojo la mixta sale suave, no media-alta')
await page.screenshot({ path: `${OUT}/mix-05-dia-flojo.png` })

await browser.close()
if (errores.length) {
  console.error('ERRORES EN CONSOLA:', errores)
  process.exit(1)
}
console.log('sesión mixta verificada')
