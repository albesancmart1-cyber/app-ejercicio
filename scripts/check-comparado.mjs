/**
 * El resumen comparado al terminar, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  1. Con una sesión de hoy completada y otra comparable en el historial, la
 *     tarjeta de «Sesión completada» dice **cuánto se movió hoy frente a
 *     entonces**, en porcentaje.
 *  2. El ejercicio que subió de peso sale con su «40 → 42,5 kg», y si el RIR
 *     acompaña, con el matiz de «progreso doble».
 *  3. Sin historial comparable, el resumen no aparece — no se inventa.
 *
 *   node scripts/check-comparado.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
mkdirSync(OUT, { recursive: true })

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'es-ES' })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

/** Siembra hoy completada y, si se pide, una comparable de hace una semana. */
async function sembrar({ conHistorial }) {
  await page.goto(BASE)
  await page.evaluate((conH) => {
    const hoy = new Date()
    const menos = (d) => {
      const x = new Date(hoy)
      x.setDate(x.getDate() - d)
      return x.toISOString().slice(0, 10)
    }
    const ej = (id, name, w, rir) => ({
      exerciseId: id,
      name,
      primary: 'pecho',
      plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 120 },
      done: true,
      logs: Array.from({ length: 3 }, () => ({ done: true, reps: 10, weightKg: w, rir }))
    })
    const sessions = [
      {
        id: 'de-hoy',
        date: menos(0),
        kind: 'fuerza',
        title: 'Fuerza',
        completed: true,
        rpe: 3,
        durationSec: 3600,
        exercises: [
          ej('press_banca_mancuernas', 'Press de banca con mancuernas', 42.5, 2),
          ej('remo_mancuerna', 'Remo con mancuerna a una mano', 30, 2)
        ]
      }
    ]
    if (conH) {
      sessions.unshift({
        id: 'previa',
        date: menos(7),
        kind: 'fuerza',
        title: 'Fuerza',
        completed: true,
        rpe: 3,
        durationSec: 3500,
        exercises: [
          ej('press_banca_mancuernas', 'Press de banca con mancuernas', 40, 2),
          ej('remo_mancuerna', 'Remo con mancuerna a una mano', 30, 2)
        ]
      })
    }
    localStorage.setItem(
      'ritmo-data-v1',
      JSON.stringify({
        version: 2,
        profile: {
          name: 'Alberto',
          goal: 'recomposicion',
          weightKg: 80,
          heightCm: 180,
          equipment: ['peso_corporal', 'mancuernas', 'banco'],
          maxWeights: { mancuernas: 45 }
        },
        checkIns: [
          {
            date: menos(0),
            sleep: 4,
            lightHygiene: true,
            sunrise: true,
            sunsetYesterday: true,
            sunExposure: true,
            keto: true,
            energy: 4,
            discomfort: 'ninguna'
          }
        ],
        sessions,
        measurements: []
      })
    )
  }, conHistorial)
  await page.goto(BASE)
  await page.waitForTimeout(900)
}

// ── 1 y 2 · Con historial comparable ──────────────────────
await sembrar({ conHistorial: true })
const resumen = page.locator('.comparado')
comprobar((await resumen.count()) > 0, 'no aparece el resumen comparado con historial que compara')
if (await resumen.count()) {
  const t = await resumen.innerText()
  // Volumen: hoy 42,5×10×3 + 30×10×3 = 2175; antes 40×10×3 + 30×10×3 = 2100 → +4 %.
  // El español no separa millares en cifras de cuatro dígitos: «2175» está bien.
  comprobar(/2\.?175 kg/.test(t), `los kilos de hoy no cuadran: ${t.slice(0, 140)}`)
  comprobar(/4 % más/.test(t), `el porcentaje no cuadra: ${t.slice(0, 140)}`)
  comprobar(/hace 7 días|la semana pasada/.test(t), 'no dice de cuándo es la referencia')
  comprobar(/40 → 42,5 kg/.test(t), `la subida del press no sale con sus kilos: ${t}`)
  comprobar(/progreso doble/.test(t), 'subir con el mismo RIR no lleva su matiz de progreso doble')
  comprobar(/igual: 30 kg × 10/.test(t), `el remo igualado no se dice: ${t}`)
  comprobar(!/calor[ií]a|kcal/i.test(t), 'habla de calorías')
  await page.locator('.card').filter({ hasText: 'Sesión completada' }).screenshot({ path: `${OUT}/comparado.png` })
}

// ── 3 · Sin historial no se inventa ───────────────────────
await sembrar({ conHistorial: false })
comprobar(
  (await page.locator('.comparado').count()) === 0,
  'sin sesión comparable no debería haber resumen'
)
comprobar(
  (await page.getByText('Sesión completada').count()) > 0,
  'la tarjeta de sesión completada tiene que seguir estando'
)

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Resumen comparado: bien. Capturas en ${OUT}`)
