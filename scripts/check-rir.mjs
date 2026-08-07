/**
 * El RIR real y la referencia de la última vez, en navegador.
 *
 * Comprueba lo que pidió el usuario: que al llegar a un ejercicio ya hecho se
 * vea con qué peso y cuántas repeticiones lo dejó, que las repeticiones vengan
 * precargadas, y que pueda anotar el RIR **al que fue de verdad** —no solo leer
 * el que la app le pedía— y que eso quede guardado en el historial.
 *
 *   node scripts/check-rir.mjs
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

const iso = (d) => d.toISOString().slice(0, 10)
const hoy = new Date()
const haceDias = (n) => iso(new Date(hoy.getTime() - n * 86400000))

/** Historial con un press hecho hace seis días, serie a serie. */
const PRESS = {
  exerciseId: 'press_banca_mancuernas',
  name: 'Press de banca con mancuernas',
  primary: 'pecho',
  plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 14 },
  variant: { side: 'bilateral' },
  done: true,
  actualWeightKg: 14,
  logs: [
    { weightKg: 14, reps: 11, rir: 2, done: true },
    { weightKg: 14, reps: 10, rir: 1, done: true },
    { weightKg: 14, reps: 9, rir: 0, done: true }
  ]
}

const datos = {
  version: 2,
  profile: {
    name: 'Alberto',
    goal: 'recomposicion',
    equipment: ['peso_corporal', 'mancuernas', 'banco'],
    maxWeights: { mancuernas: 24 },
    favoriteExercises: ['press_banca_mancuernas']
  },
  checkIns: [],
  measurements: [],
  sessions: [
    {
      id: 'la-de-antes',
      date: haceDias(6),
      kind: 'fuerza',
      title: 'Fuerza · pecho',
      completed: true,
      exercises: [PRESS]
    },
    {
      id: 'la-de-en-medio',
      date: haceDias(3),
      kind: 'fuerza',
      title: 'Fuerza · pierna',
      completed: true,
      exercises: [
        {
          exerciseId: 'sentadilla_goblet',
          name: 'Sentadilla goblet',
          primary: 'cuadriceps_gluteo',
          plan: { sets: 3, reps: '8-12', rir: 2 },
          done: true,
          logs: [{ weightKg: 16, reps: 10, done: true }]
        }
      ]
    }
  ]
}

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), datos)
await page.goto(BASE)
await page.waitForTimeout(900)

// ── El test diario, para llegar a la sesión ───────────────
await page.getByText('Empezar', { exact: false }).first().click()
await page.waitForTimeout(600)

const scales = page.locator('.scale')
await scales.nth(0).locator('button').nth(3).click() // sueño 4
await scales.nth(1).locator('button').nth(3).click() // energía 4

const responder = (pregunta, respuesta) =>
  page.locator('.row').filter({ hasText: pregunta }).getByText(respuesta, { exact: true }).click()

for (const q of [
  '¿Respetaste anoche la higiene lumínica?',
  '¿Has visto el amanecer hoy?',
  '¿Viste el atardecer ayer?',
  '¿Te dio el sol ayer?',
  '¿Sigues en cetosis?'
]) {
  await responder(q, 'Sí')
}
await responder('¿Te despertaste con mucha hambre?', 'No')
await responder('¿Tuviste antojos ayer?', 'No')
await page.locator('.card').filter({ hasText: 'Cuerpo' }).getByText('Ninguna', { exact: true }).click()
await page.getByText('Ver qué me conviene', { exact: false }).first().click()
await page.waitForTimeout(800)

// Puede tocar cardio: en ese caso se piden pesas, que es lo que hay que mirar.
for (const etiqueta of ['Pesas sin quitar el cardio', 'Prefiero hacer pesas', 'Añadir pesas']) {
  const boton = page.getByText(etiqueta, { exact: false }).first()
  if (await boton.count()) {
    await boton.click()
    await page.waitForTimeout(700)
    break
  }
}
const irAlPlan = page.getByText('Preparar la sesión', { exact: false }).first()
if (await irAlPlan.count()) {
  await irAlPlan.click()
  await page.waitForTimeout(900)
}

// Qué ejercicios propone el motor hoy depende del reparto de la semana, así que
// el press se elige a mano desde la lista. De paso se comprueba ese camino: un
// ejercicio elegido por el usuario también tiene que traer su referencia.
if ((await page.locator('.card').filter({ hasText: 'Press de banca con mancuernas' }).count()) === 0) {
  const elegir = page.getByText('Elegirlo yo de la lista', { exact: false }).first()
  if ((await elegir.count()) === 0) {
    console.error('✗ no se ha llegado al plan de la sesión')
    await page.screenshot({ path: `${OUT}/rir-0-sin-plan.png` })
    await browser.close()
    process.exit(1)
  }
  await elegir.click()
  await page.waitForTimeout(700)
  // La lista se abre filtrada por el grupo del ejercicio que se cambia; sin
  // quitar el filtro, buscar un press desde un ejercicio de espalda no da nada.
  await page.locator('.picker-groups').getByText('Todo', { exact: true }).click()
  await page.waitForTimeout(300)
  await page.locator('.picker-search').fill('Press de banca con mancuernas')
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Elegir Press de banca con mancuernas' }).click()
  await page.waitForTimeout(900)
}

const tarjetaPress = page.locator('.card').filter({ hasText: 'Press de banca con mancuernas' })
if ((await tarjetaPress.count()) === 0) {
  console.error('✗ no se ha podido poner el press en la sesión')
  await page.screenshot({ path: `${OUT}/rir-0-sin-press.png` })
  await browser.close()
  process.exit(1)
}

// ── La referencia de la última vez ────────────────────────
const referencia = await tarjetaPress.locator('.last-time').first().innerText()
comprobar(/hace 6 días/.test(referencia), `debería decir cuándo fue: ${referencia}`)
comprobar(/14×11/.test(referencia), `debería enseñar la primera serie: ${referencia}`)
comprobar(/14×10/.test(referencia) && /14×9/.test(referencia), `deberían salir las tres series: ${referencia}`)
comprobar(/RIR 1/.test(referencia), `debería salir el RIR medio de aquel día: ${referencia}`)
console.log('  · referencia:', referencia.replace(/\n/g, ' '))

// ── El plan dice a qué RIR ir, no lo da por hecho ─────────
const cabecera = await tarjetaPress.locator('.item-meta').first().innerText()
comprobar(/ve a RIR/i.test(cabecera), `el plan debería decir a qué RIR ir: ${cabecera}`)

// ── Las repeticiones vienen precargadas ───────────────────
const repsPrecargadas = await tarjetaPress
  .locator('input[aria-label*="Repeticiones de la serie"]')
  .evaluateAll((ns) => ns.map((n) => n.value))
// Cuántas series toquen hoy lo decide el nivel de volumen, así que se comprueba
// que lo precargado sea el principio de lo de aquel día, no una cifra fija.
const esperadas = ['11', '10', '9'].slice(0, repsPrecargadas.length)
comprobar(
  repsPrecargadas.join(',') === esperadas.join(','),
  `las repeticiones deberían venir de la última vez: ${JSON.stringify(repsPrecargadas)}`
)
console.log('  · repeticiones precargadas:', JSON.stringify(repsPrecargadas))

// ── Y hay dónde anotar el RIR real ────────────────────────
const camposRir = tarjetaPress.locator('input[aria-label*="reserva reales"]')
comprobar(await camposRir.count(), 'no hay dónde anotar el RIR real de cada serie')
await tarjetaPress.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/rir-1-referencia.png` })

// ── Se registra una serie con su RIR ──────────────────────
await tarjetaPress.locator('input[aria-label*="Peso de la serie 1"]').first().fill('16')
await tarjetaPress.locator('input[aria-label*="Repeticiones de la serie 1"]').first().fill('12')
await camposRir.first().fill('0')
await tarjetaPress.getByRole('button', { name: /Marcar serie 1/ }).click()
await page.waitForTimeout(500)

const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const s = d.sessions.find((x) => !x.completed) ?? d.sessions[d.sessions.length - 1]
  const pe = s.exercises.find((e) => e.exerciseId === 'press_banca_mancuernas')
  return pe?.logs?.[0]
})
comprobar(guardado?.rir === 0, `el RIR real debería quedar guardado: ${JSON.stringify(guardado)}`)
comprobar(guardado?.weightKg === 16 && guardado?.reps === 12, `el peso y las repeticiones también: ${JSON.stringify(guardado)}`)
console.log('  · serie guardada:', JSON.stringify(guardado))
await page.screenshot({ path: `${OUT}/rir-2-anotado.png` })

// ── Y se ve en el historial ───────────────────────────────
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const s = d.sessions[d.sessions.length - 1]
  s.completed = true
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.goto(BASE)
await page.waitForTimeout(900)
await page.getByText('Cuerpo', { exact: true }).first().click()
await page.waitForTimeout(700)
await page.locator('.item-tap').first().click()
await page.waitForTimeout(700)

const detalle = await page.locator('.session-detail').first().innerText()
comprobar(/RIR medio/i.test(detalle), `el resumen debería dar el RIR medio: ${detalle.slice(0, 300)}`)
comprobar(/RIR 0/.test(detalle), `cada serie debería enseñar su RIR: ${detalle.slice(0, 400)}`)
comprobar(
  /fallo/i.test(detalle),
  `debería explicar cuántas series fueron cerca del fallo: ${detalle.slice(0, 400)}`
)
await page.screenshot({ path: `${OUT}/rir-3-historial.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ la referencia de la última vez, el RIR real por serie y todo ello guardado en el historial')
