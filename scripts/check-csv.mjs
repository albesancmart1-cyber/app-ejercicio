/**
 * CSV: salir e importar de otra app, en navegador.
 *
 * Comprueba que se descarga el CSV con lo entrenado, que un CSV de Hevy se lee
 * y se enseña qué va a entrar **antes** de tocar nada, que al confirmar entra
 * en el historial sin pisar lo que ya había, y que importar dos veces el mismo
 * archivo no duplica.
 *
 *   node scripts/check-csv.mjs
 */
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const TMP = process.env.TMPDIR ?? '/tmp'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

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
      id: 'ya-registrada',
      date: '2026-02-01',
      kind: 'fuerza',
      title: 'Fuerza · pecho',
      completed: true,
      durationSec: 3000,
      exercises: [
        {
          exerciseId: 'press_banca_mancuernas',
          name: 'Press de banca con mancuernas',
          primary: 'pecho',
          plan: { sets: 2, reps: '8-12', rir: 2 },
          logs: [
            { weightKg: 14, reps: 10, rir: 2, done: true },
            { weightKg: 14, reps: 9, rir: 1, done: true }
          ]
        }
      ]
    }
  ]
}

// Un CSV como el que exporta Hevy.
const HEVY = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Push,2026-01-10 18:00:00,2026-01-10 19:00:00,,Bench Press (Dumbbell),,,0,warmup,10,12,,,
Push,2026-01-10 18:00:00,2026-01-10 19:00:00,,Bench Press (Dumbbell),,,1,normal,16,10,,,8
Push,2026-01-10 18:00:00,2026-01-10 19:00:00,,Lateral Raise (Dumbbell),,,1,normal,8,15,,,
Pull,2026-01-12 18:00:00,2026-01-12 19:00:00,,Bent Over Row (Dumbbell),,,1,normal,20,10,,,9`

const RUTA = `${TMP}/hevy-de-prueba.csv`
writeFileSync(RUTA, HEVY)

await page.goto(BASE)
await page.evaluate((d) => localStorage.setItem('ritmo-data-v1', JSON.stringify(d)), semilla)
await page.goto(BASE)
await page.waitForTimeout(900)

await page.getByRole('button', { name: /Ajustes/ }).click()
await page.waitForTimeout(600)

// ── Sacarlo en CSV ────────────────────────────────────────
const descarga = page.waitForEvent('download')
await page.getByRole('button', { name: 'Exportar a CSV' }).click()
const fichero = await descarga
const contenido = await fichero.createReadStream().then(async (s) => {
  let t = ''
  for await (const trozo of s) t += trozo
  return t
})
comprobar(/fecha,entreno/.test(contenido), `el CSV debería llevar cabecera: ${contenido.slice(0, 80)}`)
comprobar(
  /Press de banca con mancuernas/.test(contenido) && /14/.test(contenido),
  'y lo entrenado, serie a serie'
)
comprobar(contenido.split('\n').length === 3, `una fila por serie: ${contenido.split('\n').length}`)
console.log('  · exportado:', contenido.split('\n')[1])

// ── Importar el de Hevy ───────────────────────────────────
await page.locator('input[aria-label="Archivo CSV para importar"]').setInputFiles(RUTA)
await page.waitForTimeout(700)

const previa = await page.locator('.card').filter({ hasText: 'Hoja de cálculo' }).innerText()
comprobar(/2 entrenos/.test(previa), `debería contar qué va a entrar antes de tocar nada: ${previa}`)
comprobar(/2026-01-10/.test(previa), 'con las fechas que abarca')
comprobar(
  (await page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')).sessions.length)) === 1,
  'y no haber tocado todavía nada'
)
console.log('  · previa:', previa.split('\n').filter((l) => /entrenos|ejercicio/.test(l)).join(' · '))
await page.screenshot({ path: `${OUT}/csv-1-previa.png`, fullPage: true })

await page.getByRole('button', { name: 'Añadirlo a mi historial' }).click()
await page.waitForTimeout(700)

const tras = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return {
    total: d.sessions.length,
    fechas: d.sessions.map((s) => s.date).sort(),
    press: d.sessions
      .flatMap((s) => s.exercises)
      .filter((e) => e.exerciseId === 'press_banca_mancuernas').length
  }
})
comprobar(tras.total === 3, `deberían entrar los dos entrenos: ${JSON.stringify(tras)}`)
comprobar(tras.fechas.includes('2026-02-01'), 'sin pisar lo que ya había')
comprobar(
  tras.press === 2,
  `el «Bench Press (Dumbbell)» de Hevy debería reconocerse como nuestro press: ${tras.press}`
)
console.log('  · tras importar:', JSON.stringify(tras))
await page.screenshot({ path: `${OUT}/csv-2-importado.png`, fullPage: true })

// ── El mismo archivo dos veces no duplica ─────────────────
await page.locator('input[aria-label="Archivo CSV para importar"]').setInputFiles(RUTA)
await page.waitForTimeout(600)
await page.getByRole('button', { name: 'Añadirlo a mi historial' }).click()
await page.waitForTimeout(600)
const repetido = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).sessions.length
)
comprobar(repetido === 3, `importar dos veces el mismo archivo no debería duplicar: ${repetido}`)

// ── Y lo importado cuenta en el historial ─────────────────
await page.getByRole('button', { name: 'Cuerpo', exact: true }).click()
await page.waitForTimeout(700)
const cuerpo = await page.locator('.fade-in').first().innerText()
comprobar(/Push|Pull/.test(cuerpo), `los entrenos importados deberían salir en el historial: ${cuerpo.slice(-400)}`)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el historial sale en CSV, y el de Hevy entra tras enseñar qué trae, sin pisar ni duplicar')
