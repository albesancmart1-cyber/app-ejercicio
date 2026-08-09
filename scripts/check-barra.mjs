/**
 * La barra de navegación tiene que quedarse abajo pase lo que pase.
 *
 * El fallo reportado: con la barra en `position: fixed` sobre el documento, al
 * desplazarse aparecía plantada a media pantalla. Aquí se mide su posición real
 * —arriba del todo, a mitad de recorrido y al final— y se exige que siga pegada
 * al borde inferior, con el contenido pasando por debajo.
 *
 * Requiere `npm run preview` en marcha. Define OUT_DIR para las capturas.
 */
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const errores = []
const fallar = (...m) => {
  console.error('ERROR:', ...m)
  process.exit(1)
}

/** Alto de pantalla de varios móviles reales, del más pequeño al más grande. */
const PANTALLAS = [
  { nombre: 'iPhone SE', width: 375, height: 667 },
  { nombre: 'iPhone 15', width: 393, height: 852 },
  { nombre: 'iPhone 15 Pro Max', width: 430, height: 932 }
]

for (const pantalla of PANTALLAS) {
  const page = await browser.newPage({ viewport: { width: pantalla.width, height: pantalla.height } })
  page.on('pageerror', (e) => errores.push(`${pantalla.nombre}: ${e.message}`))

  await page.goto(BASE)
  await page.evaluate(() => {
    const iso = (d) => d.toISOString().slice(0, 10)
    const hoy = new Date()
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
    const sessions = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      date: iso(menos(3 + i * 3)),
      kind: 'fuerza',
      title: 'Fuerza',
      completed: true,
      rpe: 4,
      exercises: [
        {
          exerciseId: 'press_banca_mancuernas',
          name: 'Press',
          primary: ['pecho', 'espalda', 'hombro', 'brazo'][i % 4],
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

  // Una pantalla larga de verdad: el plan de la sesión.
  const byText = (t) => page.getByText(t, { exact: false }).first()
  await byText('Empezar').click()
  await page.waitForTimeout(250)
  await byText('Ver qué me conviene').click()
  await page.waitForTimeout(350)
  await byText('Empezar entreno').click()
  await page.waitForTimeout(450)

  const alto = pantalla.height
  const medir = async () => {
    const caja = await page.locator('.tabbar').boundingBox()
    if (!caja) fallar(pantalla.nombre, '— la barra no está en pantalla')
    return caja
  }

  // El documento no debe desplazarse: quien lo hace es el contenido.
  const scrollDocumento = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  if (scrollDocumento > 1) {
    fallar(pantalla.nombre, '— el documento entero se desplaza; debería hacerlo solo el contenido')
  }

  const posiciones = []
  const contenedor = page.locator('.app-main')
  let total = await contenedor.evaluate((el) => el.scrollHeight - el.clientHeight)
  // Si el plan del día sale corto, se mide en «Cuerpo», que siempre es larga.
  if (total < 200) {
    await page.locator('.tab', { hasText: 'Progreso' }).click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Año' }).click()
    await page.waitForTimeout(400)
    total = await contenedor.evaluate((el) => el.scrollHeight - el.clientHeight)
  }
  if (total < 200) fallar(pantalla.nombre, '— no hay contenido bastante para probar el desplazamiento')

  for (const fraccion of [0, 0.5, 1]) {
    await contenedor.evaluate((el, f) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * f
    }, fraccion)
    await page.waitForTimeout(200)
    const caja = await medir()
    posiciones.push({ fraccion, top: Math.round(caja.y), bottom: Math.round(caja.y + caja.height) })
  }

  // Siempre pegada abajo: el hueco al borde inferior no puede pasar de 40 px.
  for (const p of posiciones) {
    const hueco = alto - p.bottom
    if (hueco < 0 || hueco > 40) {
      fallar(
        pantalla.nombre,
        `— con el contenido al ${Math.round(p.fraccion * 100)} % la barra queda a ${hueco} px del borde inferior`,
        JSON.stringify(posiciones)
      )
    }
  }
  // Y en el mismo sitio en los tres momentos.
  const tops = new Set(posiciones.map((p) => p.top))
  if (tops.size !== 1) {
    fallar(pantalla.nombre, '— la barra se mueve al desplazar el contenido:', JSON.stringify(posiciones))
  }

  console.log(
    `  → ${pantalla.nombre} (${pantalla.width}×${alto}): barra fija a ${alto - posiciones[0].bottom} px del borde, ` +
      `con ${total} px de contenido desplazable`
  )
  await page.screenshot({ path: `${OUT}/barra-${pantalla.width}.png` })
  await page.close()
}

await browser.close()
if (errores.length) {
  console.error('ERRORES EN CONSOLA:', errores)
  process.exit(1)
}
console.log('la barra se queda abajo en todas las pantallas')
