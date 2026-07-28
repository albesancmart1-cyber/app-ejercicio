/**
 * La migración v1 → v2 sobre datos reales, en el navegador.
 *
 * Los tests de unidad cubren la función; esto cubre el cableado: que al abrir
 * la app con datos guardados en el formato viejo se migren solos, sin perder
 * nada y sin que el usuario tenga que hacer nada.
 *
 * Requiere `npm run preview` en marcha.
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

const fallar = (...m) => {
  console.error('ERROR:', ...m)
  process.exit(1)
}

await page.goto(BASE)

// Datos en formato v1: sin `muscleContributions` por ninguna parte, con un
// ejercicio del catálogo y otro que ya no existe.
const V1 = await page.evaluate(() => {
  const iso = (d) => d.toISOString().slice(0, 10)
  const hoy = new Date()
  const menos = (n) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - n)
    return d
  }
  const serie = () => [
    { weightKg: 14, reps: 10, done: true },
    { weightKg: 14, reps: 10, done: true },
    { weightKg: 14, reps: 9, done: true }
  ]
  const datos = {
    version: 1,
    profile: {
      name: 'Alberto',
      goal: 'recomposicion',
      weightKg: 78,
      equipment: ['peso_corporal', 'mancuernas', 'bandas'],
      maxWeights: { mancuernas: 24 }
    },
    checkIns: [],
    measurements: [],
    sessions: [
      {
        id: 'vieja-1',
        date: iso(menos(2)),
        kind: 'fuerza',
        title: 'Fuerza',
        completed: true,
        rpe: 4,
        exercises: [
          {
            exerciseId: 'extension_triceps',
            name: 'Extensión de tríceps sobre cabeza',
            primary: 'brazo',
            plan: { sets: 3, reps: '8-12', rir: 2 },
            done: true,
            logs: serie()
          },
          {
            exerciseId: 'curl_biceps',
            name: 'Curl de bíceps',
            primary: 'brazo',
            plan: { sets: 3, reps: '8-12', rir: 2 },
            done: true,
            logs: serie()
          },
          {
            // Ya no existe en el catálogo: hay que deducirlo del nombre.
            exerciseId: 'press_banca_antiguo',
            name: 'Press de banca con barra',
            primary: 'pecho',
            plan: { sets: 3, reps: '8-12', rir: 2 },
            done: true,
            logs: serie()
          }
        ]
      }
    ]
  }
  localStorage.setItem('ritmo-data-v1', JSON.stringify(datos))
  return datos
})

await page.reload()
await page.waitForTimeout(600)

const despues = await page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')))

// ── Nada se pierde ────────────────────────────────────────
if (despues.sessions.length !== V1.sessions.length) fallar('se ha perdido alguna sesión')
const antesEj = V1.sessions[0].exercises
const despuesEj = despues.sessions[0].exercises
if (despuesEj.length !== antesEj.length) fallar('se ha perdido algún ejercicio')

for (let i = 0; i < antesEj.length; i++) {
  const a = antesEj[i]
  const d = despuesEj[i]
  if (d.primary !== a.primary) fallar('el campo viejo `primary` debe conservarse para poder revertir')
  if (JSON.stringify(d.logs) !== JSON.stringify(a.logs)) fallar('las series registradas han cambiado')
  if (JSON.stringify(d.plan) !== JSON.stringify(a.plan)) fallar('el plan ha cambiado')
}
console.log('  → nada perdido:', despuesEj.length, 'ejercicios con sus series y sus campos viejos')

// ── Lo del catálogo coge su mapa, sin marcar ──────────────
const triceps = despuesEj[0]
if (JSON.stringify(triceps.muscleContributions) !== JSON.stringify({ triceps_braquial: 1 })) {
  fallar('el ejercicio del catálogo no cogió su mapa →', JSON.stringify(triceps.muscleContributions))
}
if (triceps.needsReview) fallar('lo que viene del catálogo no hay que revisarlo')

// ── Lo que ya no existe se deduce y se marca ──────────────
const legacy = despuesEj[2]
if (!legacy.muscleContributions?.pectoral_mayor) {
  fallar('el ejercicio sin catálogo no se dedujo →', JSON.stringify(legacy.muscleContributions))
}
if (legacy.needsReview !== true) fallar('lo deducido debe quedar marcado para revisar')
console.log('  → deducido del nombre y marcado:', legacy.name, JSON.stringify(legacy.muscleContributions))

// ── Sube la versión y es idempotente ──────────────────────
if (despues.version !== 2) fallar('la versión debería ser 2, es', despues.version)
await page.reload()
await page.waitForTimeout(500)
const otraVez = await page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')))
if (JSON.stringify(otraVez) !== JSON.stringify(despues)) {
  fallar('volver a abrir la app ha vuelto a cambiar los datos: la migración no es idempotente')
}
console.log('  → versión 2 y estable al reabrir')

// ── Y la app sigue funcionando ────────────────────────────
if (!(await page.getByText('Alberto').count())) fallar('la app no arrancó con los datos migrados')
console.log('  → la app arranca con normalidad tras migrar')

await browser.close()
if (errores.length) {
  console.error('ERRORES EN CONSOLA:', errores)
  process.exit(1)
}
console.log('migración v1 → v2 verificada en navegador')
