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

// El titular de la decisión y el resumen del plan: lo que antes decía el
// segundo `.eyebrow` vive ahora en la tarjeta de decisión.
const tocaba = (
  await page.locator('.decision-titulo, .decision-meta').allInnerTexts()
).join(' · ').trim()
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
const titulo = (await page.locator('.decision-titulo, .decision-meta').allInnerTexts()).join(' · ').trim()
// La decisión ya no se rotula «pesas y cardio»: lo dice el propio plan, que
// nombra las zonas de fuerza y los minutos que quedan de cardio. Se comprueba
// eso, que además es más difícil de cumplir por accidente.
const minutosAntes = Number(tocaba.match(/(\d+)\s*min de cardio/)?.[1] ?? 0)
const minutosAhora = Number(titulo.match(/(\d+)\s*min de cardio/)?.[1] ?? 0)
if (!(minutosAhora > 0)) fallar('la mixta debe conservar algo de cardio →', titulo)
if (!(minutosAhora < minutosAntes)) {
  fallar(`la mixta debe recortar el cardio (${minutosAntes} → ${minutosAhora}) →`, titulo)
}
if (!/pierna|pecho|espalda|hombro|brazo|core|femoral|gemelo|cuádriceps/i.test(titulo)) {
  fallar('la mixta debe traer también trabajo de fuerza →', titulo)
}

// La propia app dice cuánto cardio conserva y de cuánto venía. El párrafo
// largo vive dentro del detalle: la decisión de arriba es de una línea.
await byText('Con todo el detalle').click()
await page.waitForTimeout(300)
const tarjeta = (await page.locator('.razones').first().textContent()).replace(/\s+/g, ' ')
const minutosDespues = Number(tarjeta.match(/(\d+)\s*min de cardio/)?.[1] ?? 0)
if (!(minutosDespues > 0)) fallar('la mixta no dice cuánto cardio conserva →', tarjeta)
// Que fue decisión tuya se dice arriba, en la propia decisión, y no enterrado
// en el detalle: es lo que separa «te lo propongo» de «me lo has pedido».
const decision = (await page.locator('.decision').first().textContent()).replace(/\s+/g, ' ')
if (!/a petición tuya/i.test(decision)) fallar('debería quedar claro que lo pediste tú →', decision)
console.log('  → mixta:', titulo, `· conserva ${minutosDespues} min de cardio`)
await page.screenshot({ path: `${OUT}/mix-02-mixta.png` })

// En esta pantalla hay varias listas «.reasons» —los cambios de volumen, la
// evidencia y el porqué del día—: se miran todas juntas.
const porQue = (await page.locator('.reasons').allTextContents()).join(' ').replace(/\s+/g, ' ')
if (!/has pedido/i.test(porQue)) fallar('el «por qué» debe decir que fue decisión tuya →', porQue)
if (!/primero las pesas/i.test(porQue)) fallar('el «por qué» debe explicar el orden →', porQue)
if (!/he elegido .* zonas que llevan más tiempo sin trabajarse/i.test(porQue)) {
  fallar('debe decir qué zonas ha elegido y por qué →', porQue)
}
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
const vuelto = (await page.locator('.decision-titulo, .decision-meta').allInnerTexts()).join(' · ').trim()
if (vuelto !== tocaba) fallar('volver atrás debería devolver la recomendación original →', vuelto)
console.log('  → se puede deshacer: vuelve a', vuelto)
await page.getByText('Pesas sin quitar el cardio').click()
await page.waitForTimeout(300)

// ── El plan que sale ──────────────────────────────────────
await byText('Empezar entreno').click()
await page.waitForTimeout(450)
const nombres = await page.locator('.item-title').allTextContents()
const pesas = nombres.slice(0, -1)
// El propósito de la app es no tener que pensar qué hacer: la mixta tiene que
// traer los ejercicios ya elegidos, tres o cuatro, no un hueco para añadirlos.
if (pesas.length < 3) {
  fallar('la mixta debe recomendar 3 o 4 ejercicios de fuerza, no', pesas.length, '→', nombres.join(' / '))
}
if (pesas.length > 4) fallar('la mixta no debería pasar de 4 ejercicios de fuerza →', pesas.join(' / '))
if (new Set(pesas).size !== pesas.length) {
  fallar('en una sesión corta conviene repartir por zonas, no repetir →', pesas.join(' / '))
}
const ultimo = nombres[nombres.length - 1]
if (!/camin|bici|trote|escalera|comba|remo en m|movilidad/i.test(ultimo)) {
  fallar('el cardio debe ir el último, después de las pesas →', nombres.join(' / '))
}
const conMinutos = await page.getByText(`${minutosDespues} min`).count()
if (!conMinutos) fallar('el plan no muestra los minutos de cardio recortados')
console.log('  → plan:', nombres.slice(0, -1).join(', '), '+', ultimo)
await page.screenshot({ path: `${OUT}/mix-04-plan.png`, fullPage: true })

// ── Quitar ejercicios, sin poder vaciar la sesión ─────────
let quedan = nombres.length
while (quedan > 1) {
  await page.locator('.card').filter({ has: page.locator('.item-title') })
    .first().getByText('Quitar', { exact: true }).click()
  await page.waitForTimeout(250)
  const ahora = (await page.locator('.item-title').allTextContents()).length
  if (ahora !== quedan - 1) fallar('quitar no redujo la lista →', quedan, '→', ahora)
  quedan = ahora
}
// Con uno solo debe negarse y proponer descartar la sesión entera.
await page.locator('.card').filter({ has: page.locator('.item-title') })
  .first().getByText('Quitar', { exact: true }).click()
await page.waitForTimeout(250)
if ((await page.locator('.item-title').allTextContents()).length !== 1) {
  fallar('no debería poder quedarse sin ningún ejercicio')
}
if (!(await page.getByText('descarta la sesión sin culpa').count())) {
  fallar('al quedarse con uno debería proponer descartar en vez de vaciar')
}
console.log('  → se pueden quitar uno a uno, y con el último se niega y propone descartar')
await page.screenshot({ path: `${OUT}/mix-06-ultimo.png` })

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

const flojo = (await page.locator('.decision-titulo, .decision-meta').allInnerTexts()).join(' · ').trim()
console.log('  → con mala disposición toca:', flojo, '· disposición:', await page.locator('.ring-num').first().textContent())
if (!(await page.getByText('Prefiero algo con pesas').count())) {
  fallar('debería seguir ofreciendo el cambio completo')
}
if (!(await page.getByText('Pesas sin quitar el cardio').count())) {
  fallar('también debe ofrecer la mixta: repartir exige menos que cambiarlo entero →', flojo)
}
await page.getByText('Pesas sin quitar el cardio').click()
await page.waitForTimeout(350)
const suave = (await page.locator('.decision').first().textContent()).replace(/\s+/g, ' ')
if (!/intensidad suave/i.test(suave)) fallar('con mala disposición no debe pasar de suave →', suave)
console.log('  → y en un día flojo la mixta sale suave, no media-alta')
await page.screenshot({ path: `${OUT}/mix-05-dia-flojo.png` })

await browser.close()
if (errores.length) {
  console.error('ERRORES EN CONSOLA:', errores)
  process.exit(1)
}
console.log('sesión mixta verificada')
