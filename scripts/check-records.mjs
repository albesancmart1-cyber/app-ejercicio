/**
 * Récords y ficha de ejercicio, en navegador.
 *
 * Comprueba que una serie que bate una marca se canta en el momento, que la
 * medalla se queda puesta, que no se canta dos veces el mismo récord, y que la
 * ficha del ejercicio enseña las marcas y el historial vez por vez.
 *
 *   node scripts/check-records.mjs
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

const hoy = new Date().toISOString().slice(0, 10)
const hace = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

const pasada = (fecha, pesos) => ({
  id: `s-${fecha}`,
  date: fecha,
  kind: 'fuerza',
  title: 'Fuerza · pecho',
  completed: true,
  exercises: [
    {
      exerciseId: 'press_banca_mancuernas',
      name: 'Press de banca con mancuernas',
      primary: 'pecho',
      plan: { sets: pesos.length, reps: '8-12', rir: 2, restSeconds: 120 },
      logs: pesos.map(([kg, reps]) => ({ weightKg: kg, reps, rir: 2, done: true }))
    }
  ]
})

const semilla = {
  version: 2,
  profile: {
    name: 'Alberto',
    goal: 'recomposicion',
    equipment: ['peso_corporal', 'mancuernas', 'banco'],
    maxWeights: { mancuernas: 24 }
  },
  checkIns: [],
  measurements: [],
  sessions: [
    pasada(hace(21), [
      [12, 10],
      [12, 9],
      [12, 8]
    ]),
    pasada(hace(14), [
      [14, 9],
      [14, 8],
      [14, 8]
    ]),
    pasada(hace(7), [
      [14, 10],
      [14, 10],
      [14, 9]
    ]),
    {
      id: 'de-hoy',
      date: hoy,
      kind: 'fuerza',
      title: 'Fuerza · pecho',
      completed: false,
      startedAt: Date.now(),
      exercises: [
        {
          exerciseId: 'press_banca_mancuernas',
          name: 'Press de banca con mancuernas',
          primary: 'pecho',
          plan: { sets: 2, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 16 },
          logs: [
            { weightKg: 16, reps: 10, done: false },
            { weightKg: 16, reps: 10, done: false }
          ]
        }
      ]
    }
  ]
}

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), semilla)
await page.goto(BASE)
await page.waitForTimeout(1000)

// Una sesión ya en marcha abre en modo foco: aquí se comprueba la lista.
const aLaLista = page.getByRole('button', { name: 'Ver todos los ejercicios' })
if (await aLaLista.count()) {
  await aLaLista.click()
  await page.waitForTimeout(400)
}

const tarjeta = page.locator('.card').filter({ hasText: 'Press de banca con mancuernas' })
if ((await tarjeta.count()) === 0) {
  console.error('✗ no se ha recuperado la sesión en marcha')
  await page.screenshot({ path: `${OUT}/rec-0-sin-sesion.png` })
  await browser.close()
  process.exit(1)
}

// ── Una serie que bate el peso máximo ─────────────────────
await tarjeta.getByRole('button', { name: /Marcar serie 1/ }).click()
await page.waitForTimeout(700)

// Primero se celebra a pantalla completa: es lo único del entreno que uno
// cuenta luego, y una línea de once píxeles no era celebrarlo.
const fiesta = page.locator('.record-screen')
comprobar(await fiesta.count(), 'un récord debería tomar la pantalla')
const textoFiesta = (await fiesta.first().innerText()).toLowerCase()
comprobar(/récord personal/.test(textoFiesta), `debería decirlo con todas las letras: ${textoFiesta.replace(/\n/g, ' · ')}`)
comprobar(/16 kg × 10/.test(textoFiesta), 'con la serie conseguida')
comprobar(/14 kg × \d+/.test(textoFiesta), `y contra qué se ha batido: ${textoFiesta.replace(/\n/g, ' · ')}`)
console.log('  · celebración:', textoFiesta.replace(/\n/g, ' · ').slice(0, 120))
await page.screenshot({ path: `${OUT}/rec-0-celebracion.png`, fullPage: true })
await page.getByRole('button', { name: 'Seguir entrenando' }).click()
await page.waitForTimeout(400)
// Y detrás esperaba el descanso, que también toma la pantalla.
await page.getByRole('button', { name: 'Saltar descanso' }).click()
await page.waitForTimeout(400)

const medalla = page.locator('.record-hint')
comprobar(await medalla.count(), 'una serie que bate el récord debería llevar su medalla')
const texto = (await medalla.first().innerText()).toLowerCase()
comprobar(/peso máximo/.test(texto), `debería decir qué récord es: ${texto}`)
console.log('  · medalla:', texto.replace(/\n/g, ' · '))

const cuerpo = await page.locator('.fade-in').first().innerText()
comprobar(/récord/i.test(cuerpo), 'debería avisarse del récord con palabras, no solo con un icono')
await page.screenshot({ path: `${OUT}/rec-1-medalla.png`, fullPage: true })

// ── La misma serie otra vez no es otro récord ─────────────
await tarjeta.getByRole('button', { name: /Marcar serie 2/ }).click()
await page.waitForTimeout(600)
comprobar(
  (await page.locator('.record-screen').count()) === 0,
  'repetir el mismo peso no debería volver a celebrarse'
)
comprobar(
  (await page.locator('.record-hint').count()) === 1,
  'repetir el mismo peso no es un récord nuevo: solo debería haber una medalla'
)

// ── La ficha del ejercicio ────────────────────────────────
await tarjeta.getByText('Mis marcas', { exact: false }).click()
await page.waitForTimeout(700)

const ficha = await page.locator('.session-detail').innerText()
comprobar(/Peso máximo/i.test(ficha), 'la ficha debería enseñar el peso máximo')
comprobar(/1RM estimado/i.test(ficha), 'la ficha debería enseñar el 1RM estimado')
comprobar(/Mejor serie/i.test(ficha), 'la ficha debería enseñar la mejor serie')
comprobar(
  (await page.locator('.ficha-chart').count()) === 1,
  'con varias veces registradas debería haber curva'
)
comprobar(
  (await page.locator('.detail-ex').count()) === 3,
  `la ficha debería listar las tres veces anteriores: ${await page.locator('.detail-ex').count()}`
)
console.log('  · marcas en la ficha:', ficha.split('\n').slice(2, 10).join(' | '))
await page.screenshot({ path: `${OUT}/rec-2-ficha.png`, fullPage: true })

await page.getByRole('button', { name: 'Cerrar la ficha' }).click()
await page.waitForTimeout(400)
comprobar(
  (await page.locator('.record-hint').count()) === 1,
  'al volver de la ficha la medalla debería seguir puesta'
)

// ── Y en el historial, los récords de aquel día ───────────
await page.getByRole('button', { name: 'Progreso', exact: true }).click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Año' }).click()
await page.waitForTimeout(600)
await page.locator('.item-tap').first().click()
await page.waitForTimeout(600)
const detalle = await page.locator('.session-detail').innerText()
comprobar(/Récords de este día/i.test(detalle), `el detalle debería contar los récords de aquel día: ${detalle.slice(0, 200)}`)
await page.screenshot({ path: `${OUT}/rec-3-detalle.png`, fullPage: true })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ los récords se cantan en el momento, no se repiten, y la ficha del ejercicio enseña marcas e historial')
