// Verifica en navegador la progresión de volumen: con un historial de sesiones
// completadas limpiamente y la composición estancada, la app debe subir de nivel
// y explicarlo. Con la recuperación tocada, debe bajar al volumen base.
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const iso = (d) => d.toISOString().slice(0, 10)

/** Siembra perfil, hábitos y un historial de sesiones asimiladas. */
async function sembrar({ sesiones, limpias = true, sueño }) {
  await page.goto(BASE)
  await page.evaluate(
    ({ n, limpias, sueño }) => {
      const iso = (d) => d.toISOString().slice(0, 10)
      const hoy = new Date()
      const menos = (dias) => {
        const d = new Date(hoy)
        d.setDate(d.getDate() - dias)
        return d
      }

      const profile = {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 80,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas', 'bandas', 'banco', 'bici', 'correr'],
        maxWeights: { mancuernas: 24 },
        ketoSince: '2026-06-01',
        dhaPillMg: 1000
      }

      // Hábitos de los últimos 14 días, todos iguales.
      const checkIns = Array.from({ length: 14 }, (_, i) => ({
        date: iso(menos(i)),
        sleep: sueño,
        lightHygiene: sueño >= 4,
        sunrise: sueño >= 4,
        sunsetYesterday: sueño >= 4,
        sunExposure: sueño >= 4,
        keto: true,
        energy: sueño,
        discomfort: 'ninguna',
        wokeHungry: sueño < 4,
        cravings: sueño < 4
      }))

      // Sesiones de fuerza completadas enteras, cada 3 días.
      const grupos = ['pecho', 'espalda', 'cuadriceps_gluteo', 'hombro']
      const sessions = Array.from({ length: n }, (_, i) => ({
        id: `seed-${i}`,
        date: iso(menos(2 + i * 3)),
        kind: 'fuerza',
        title: 'Fuerza',
        completed: true,
        rpe: 4,
        exercises: [
          {
            exerciseId: 'press_banca_mancuernas',
            name: 'Press banca con mancuernas',
            primary: grupos[i % grupos.length],
            plan: { sets: 3, reps: '8-12', weightKg: 14 },
            done: true,
            actualWeightKg: 14,
            logs: [
              { weightKg: 14, reps: limpias ? 11 : 6, done: true },
              { weightKg: 14, reps: limpias ? 11 : 6, done: limpias },
              { weightKg: 14, reps: limpias ? 10 : 6, done: limpias }
            ]
          }
        ]
      }))

      // Composición estancada: mismo peso, misma grasa, mismo músculo.
      const measurements = [0, 1, 2, 3].map((i) => ({
        date: iso(menos((3 - i) * 14)),
        weightKg: 80,
        fatPercent: 20,
        musclePercent: 40
      }))

      localStorage.setItem(
        'ritmo-data-v1',
        JSON.stringify({ version: 1, profile, checkIns, sessions, measurements })
      )
    },
    { n: sesiones, limpias, sueño }
  )
  await page.reload()
  await page.waitForTimeout(500)
}

/** Llega hasta la tarjeta de recomendación y devuelve el texto del bloque de volumen. */
async function verVolumen() {
  // El check-in de hoy ya está sembrado: las respuestas vienen puestas y solo
  // hay que pasar por la pantalla.
  await page.getByText('Empezar', { exact: false }).first().click()
  await page.waitForTimeout(300)
  await page.getByText('Ver qué me conviene').click()
  await page.waitForTimeout(400)

  // Si no tocara fuerza, se pide expresamente.
  const pesas = page.getByText('Prefiero algo con pesas')
  if (await pesas.count()) {
    await pesas.click()
    await page.waitForTimeout(400)
  }

  const bloque = page.locator('.card').filter({ hasText: 'Volumen · nivel' })
  if (!(await bloque.count())) {
    await page.screenshot({ path: `${OUT}/vol-sin-bloque.png`, fullPage: true })
    return null
  }
  await bloque.first().scrollIntoViewIfNeeded()
  return (await bloque.first().textContent()).replace(/\s+/g, ' ')
}

// ── Entrenando pero sin asimilar: volumen base ────────────
await sembrar({ sesiones: 14, limpias: false, sueño: 5 })
const base = await verVolumen()
if (!base || !base.includes('nivel 1 de 4')) {
  console.error('ERROR: con sesiones que no salen completas debería quedarse en el nivel base →', base)
  process.exit(1)
}
console.log('  → sesiones incompletas: nivel 1')
await page.screenshot({ path: `${OUT}/vol-01-base.png` })

// ── Muchas sesiones limpias y composición estancada: sube ──
await sembrar({ sesiones: 14, sueño: 5 })
const subido = await verVolumen()
if (!subido) {
  console.error('ERROR: no aparece el bloque de volumen')
  process.exit(1)
}
const nivel = Number(subido.match(/nivel (\d) de 4/)?.[1])
if (!(nivel > 1)) {
  console.error('ERROR: asimilando y estancado debería subir de nivel →', subido)
  process.exit(1)
}
if (!/serie más/.test(subido)) {
  console.error('ERROR: al subir debe decir exactamente qué cambia →', subido)
  process.exit(1)
}
if (!/asimil|estancad/.test(subido)) {
  console.error('ERROR: al subir debe decir por qué →', subido)
  process.exit(1)
}
console.log('  → asimilando y estancado: nivel', nivel)
console.log('    ', subido.slice(0, 220))
await page.screenshot({ path: `${OUT}/vol-02-subido.png` })

// La sesión construida debe reflejarlo: más series de las de base.
await page.getByText('Preparar la sesión').click()
await page.waitForTimeout(500)
const meta = await page.locator('.item-meta').first().textContent()
const series = Number(meta.match(/^(\d+) ×/)?.[1])
if (!(series > 3)) {
  console.error('ERROR: el plan no refleja las series del nivel alcanzado →', meta)
  process.exit(1)
}
console.log('  → el plan sale con', series, 'series por ejercicio')
await page.screenshot({ path: `${OUT}/vol-03-plan.png` })

// ── Recuperación tocada: baja al volumen base ─────────────
await sembrar({ sesiones: 14, sueño: 1 })
const bajado = await verVolumen()
if (!bajado || !bajado.includes('nivel 1 de 4')) {
  console.error('ERROR: con la recuperación tocada debería bajar al volumen base →', bajado)
  process.exit(1)
}
if (!/bajado el volumen/.test(bajado)) {
  console.error('ERROR: al bajar debe explicarlo →', bajado)
  process.exit(1)
}
console.log('  → recuperación tocada: vuelve al nivel 1 y lo explica')
await page.screenshot({ path: `${OUT}/vol-04-bajado.png` })

await browser.close()
if (errors.length) {
  console.error('ERRORES EN CONSOLA:', errors)
  process.exit(1)
}
console.log('progresión de volumen verificada')
