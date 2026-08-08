/**
 * Rutinas guardadas, en navegador.
 *
 * Comprueba que una sesión se guarda como rutina, que la rutina aparece al
 * preparar el día **debajo** de lo que propone la app —y diciendo por qué—,
 * que repetirla crea la sesión con los mismos ejercicios, y que se puede
 * borrar desde Ajustes.
 *
 *   node scripts/check-rutinas.mjs
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
    {
      id: 'de-hoy',
      date: hoy,
      kind: 'fuerza',
      title: 'Fuerza · pecho y espalda',
      completed: false,
      exercises: [
        {
          exerciseId: 'press_banca_mancuernas',
          name: 'Press de banca con mancuernas',
          primary: 'pecho',
          plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 16 },
          logs: [{ done: false }, { done: false }, { done: false }]
        },
        {
          exerciseId: 'remo_mancuerna',
          name: 'Remo con mancuerna',
          primary: 'espalda',
          plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 18 },
          logs: [{ done: false }, { done: false }, { done: false }]
        }
      ]
    }
  ]
}

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), semilla)
await page.goto(BASE)
await page.waitForTimeout(1000)

// ── Guardar la sesión como rutina ─────────────────────────
await page.getByText('Guardar esto como rutina').click()
await page.waitForTimeout(400)
await page.locator('input[aria-label="Nombre de la rutina"]').fill('Empuje y tirón')
await page.locator('input[aria-label="Carpeta de la rutina"]').fill('Casa')
await page.getByRole('button', { name: 'Guardar rutina' }).click()
await page.waitForTimeout(600)

const guardada = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return d.routines
})
comprobar(guardada?.length === 1, `debería guardarse la rutina: ${JSON.stringify(guardada)}`)
comprobar(guardada?.[0].name === 'Empuje y tirón', 'con el nombre que se le puso')
comprobar(guardada?.[0].folder === 'Casa', 'y en su carpeta')
comprobar(
  guardada?.[0].exercises.every((e) => e.plan.weightKg === undefined),
  `la rutina no debería congelar los pesos: ${JSON.stringify(guardada?.[0].exercises.map((e) => e.plan))}`
)
comprobar(
  guardada?.[0].exercises.every((e) => e.logs === undefined),
  'ni arrastrar las series de aquel día'
)
console.log('  · rutina guardada:', guardada?.[0].name, '·', guardada?.[0].exercises.length, 'ejercicios')
await page.screenshot({ path: `${OUT}/rut-1-guardada.png`, fullPage: true })

// ── Descartar la sesión y preparar el día ─────────────────
await page.getByText('Hoy no puedo', { exact: false }).click()
await page.waitForTimeout(600)
await page.getByRole('button', { name: /^Empezar$/ }).click()
await page.waitForTimeout(500)

// Check-in exprés: todo lo que hace falta para llegar al plan.
for (const escala of await page.locator('.scale').all()) {
  await escala.getByRole('button', { name: '4' }).click()
}
for (const fila of await page.locator('.options').all()) {
  const si = fila.getByRole('button', { name: 'Sí', exact: true })
  if (await si.count()) await si.first().click()
}
await page.getByRole('button', { name: 'Ninguna', exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Ver qué me conviene/ }).first().click()
await page.waitForTimeout(800)

const plan = await page.locator('.fade-in').first().innerText()
comprobar(/O repite una rutina tuya/i.test(plan), `la rutina debería ofrecerse al preparar el día: ${plan.slice(0, 300)}`)
comprobar(
  /Empuje y tirón/.test(plan),
  'con su nombre'
)
// Los rótulos van en versalitas por CSS: se compara sin distinguir caja.
comprobar(/casa/i.test(plan), `y bajo su carpeta: ${plan.slice(0, 400)}`)
// El orden importa: primero lo que propone la app, después las rutinas.
const posiciones = await page.evaluate(() => {
  const texto = document.body.innerText.toLowerCase()
  return { propuesta: texto.indexOf('preparar la sesión'), rutinas: texto.indexOf('o repite una rutina') }
})
comprobar(
  posiciones.propuesta >= 0 && posiciones.rutinas > posiciones.propuesta,
  `las rutinas van después de la propuesta del día: ${JSON.stringify(posiciones)}`
)
await page.screenshot({ path: `${OUT}/rut-2-en-el-plan.png`, fullPage: true })

// ── Repetirla ─────────────────────────────────────────────
await page.getByText('Empuje y tirón').click()
await page.waitForTimeout(800)
const sesion = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const s = d.sessions.find((x) => !x.completed)
  return s && { title: s.title, ejercicios: s.exercises.map((e) => e.exerciseId), pesos: s.exercises.map((e) => e.plan.weightKg) }
})
comprobar(sesion?.title === 'Empuje y tirón', `la sesión debería salir de la rutina: ${JSON.stringify(sesion)}`)
comprobar(
  JSON.stringify(sesion?.ejercicios) === JSON.stringify(['press_banca_mancuernas', 'remo_mancuerna']),
  `con sus ejercicios y en su orden: ${JSON.stringify(sesion?.ejercicios)}`
)
comprobar(
  sesion?.pesos.every((p) => typeof p === 'number'),
  `y con el peso puesto por la progresión: ${JSON.stringify(sesion?.pesos)}`
)
console.log('  · sesión desde la rutina:', JSON.stringify(sesion))
await page.screenshot({ path: `${OUT}/rut-3-repetida.png`, fullPage: true })

// ── Borrarla desde Ajustes ────────────────────────────────
await page.getByRole('button', { name: /Ajustes/ }).click()
await page.waitForTimeout(600)
const ajustes = await page.locator('.fade-in').first().innerText()
comprobar(/Tus rutinas/i.test(ajustes), 'las rutinas deberían gestionarse desde Ajustes')
await page.getByRole('button', { name: 'Borrar la rutina Empuje y tirón' }).click()
await page.waitForTimeout(500)
const tras = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return { rutinas: d.routines?.length ?? 0, lapidas: (d.deleted ?? []).map((l) => l.clave) }
})
comprobar(tras.rutinas === 0, 'borrarla debería quitarla')
comprobar(
  tras.lapidas.some((c) => c.startsWith('rutina:')),
  `y dejar lápida para que sincronizar no la resucite: ${JSON.stringify(tras.lapidas)}`
)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ las rutinas se guardan sin congelar los pesos, se ofrecen después de lo que propone la app y se repiten')
