/**
 * La progresión de carga, en navegador.
 *
 * Comprueba las tres reglas que la sostienen y que el usuario pueda verlas:
 * que una sola sesión al tope del rango no sube el peso y la app lo dice, que
 * dos seguidas sí lo suben y de forma proporcional, y que al llegar al tope del
 * material la progresión cambia de palanca en vez de callarse.
 *
 *   node scripts/check-carga.mjs
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

/**
 * Siembra `veces` sesiones de curl al tope del rango con el peso dado, y devuelve
 * el plan del curl en la sesión de hoy.
 */
async function planDeCurl({ veces, peso, topeMancuernas }) {
  await page.goto(BASE)
  await page.evaluate(
    ({ veces, peso, topeMancuernas }) => {
      const hoy = new Date()
      const menos = (d) => {
        const x = new Date(hoy)
        x.setDate(x.getDate() - d)
        return x.toISOString().slice(0, 10)
      }
      const sesionCurl = (dias) => ({
        id: 'c' + dias,
        date: menos(dias),
        kind: 'fuerza',
        title: 'Fuerza',
        completed: true,
        rpe: 3,
        exercises: [
          {
            exerciseId: 'curl_biceps',
            name: 'Curl de bíceps',
            primary: 'brazo',
            plan: { sets: 3, reps: '8-12', rir: 2 },
            done: true,
            actualWeightKg: peso,
            variant: { implement: 'mancuernas', side: 'bilateral' },
            logs: Array.from({ length: 3 }, () => ({ done: true, weightKg: peso, reps: 12 }))
          }
        ]
      })
      // Sesiones de curl, y una más reciente de otra cosa para que el curl no
      // sea «lo de la última vez» y el constructor lo deje para el final.
      const sessions = Array.from({ length: veces }, (_, i) => sesionCurl(4 + i * 3))
      sessions.push({
        id: 'otra',
        date: menos(2),
        kind: 'fuerza',
        title: 'Fuerza',
        completed: true,
        rpe: 3,
        exercises: [
          {
            exerciseId: 'sentadilla_goblet',
            name: 'Sentadilla goblet',
            primary: 'cuadriceps_gluteo',
            plan: { sets: 3, reps: '8-12', rir: 2 },
            done: true,
            logs: [{ done: true, reps: 10 }]
          }
        ]
      })
      const checkIns = Array.from({ length: 6 }, (_, i) => ({
        date: menos(i),
        sleep: 4,
        lightHygiene: true,
        sunrise: true,
        sunsetYesterday: true,
        sunExposure: true,
        keto: false,
        energy: 4,
        discomfort: 'ninguna',
        wokeHungry: false,
        cravings: false
      }))
      localStorage.setItem(
        'ritmo-data-v1',
        JSON.stringify({
          version: 2,
          profile: {
            name: 'Alberto',
            goal: 'recomposicion',
            weightKg: 80,
            heightCm: 180,
            equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'bici', 'correr'],
            maxWeights: { mancuernas: topeMancuernas }
          },
          checkIns,
          sessions,
          measurements: []
        })
      )
    },
    { veces, peso, topeMancuernas }
  )

  await page.goto(BASE)
  await page.waitForTimeout(700)
  await page.getByText('Empezar', { exact: false }).first().click()
  await page.waitForTimeout(300)
  await page.getByText('Ver qué me conviene').click()
  await page.waitForTimeout(500)
  const pesas = page.getByText('Prefiero algo con pesas')
  if (await pesas.count()) {
    await pesas.click()
    await page.waitForTimeout(400)
  }
  await page.getByText('Empezar entreno', { exact: false }).first().click()
  await page.waitForTimeout(800)

  // El curl no tiene por qué salir propuesto —con el bíceps ya servido, la app
  // atiende a otros—, así que se añade a mano. Da igual: un ejercicio añadido
  // recibe exactamente el mismo trato de la progresión que uno propuesto.
  if ((await page.locator('.card').filter({ hasText: 'Curl de bíceps' }).count()) === 0) {
    await page.getByText('Añadir un ejercicio de la lista').click()
    await page.waitForTimeout(400)
    await page.getByPlaceholder('Buscar por nombre').fill('curl de b')
    await page.waitForTimeout(400)
    const libre = page.locator('.picker-pick:not([disabled])').first()
    if ((await libre.count()) === 0) return null
    await libre.click()
    await page.waitForTimeout(600)
  }

  const tarjeta = page.locator('.card').filter({ hasText: 'Curl de bíceps' }).first()
  if ((await tarjeta.count()) === 0) return null
  await tarjeta.scrollIntoViewIfNeeded()
  // Las casillas de la serie son de texto y no de número: es lo que permite
  // escribir «102,5» con la coma del teclado español sin que se pierda.
  const kg = await tarjeta.locator('.set-field input').first().inputValue()
  const nota = (await tarjeta.locator('.progress-note').count())
    ? await tarjeta.locator('.progress-note').innerText()
    : ''
  // Con coma, como se escriben aquí los kilos.
  return { peso: Number(kg.replace(',', '.')), nota }
}

// ── Una sesión al tope no basta ───────────────────────────
const una = await planDeCurl({ veces: 1, peso: 10, topeMancuernas: 24 })
comprobar(una !== null, 'no se puede meter el curl en la sesión')
if (una) {
  comprobar(una.peso === 10, `una sola sesión al tope ya sube el peso: ${una.peso} kg`)
  comprobar(/seguidas|próximo día/i.test(una.nota), `no avisa de que falta una sesión: «${una.nota}»`)
  console.log('  · una sesión →', una.peso, 'kg ·', una.nota.slice(0, 60))
}
await page.screenshot({ path: `${OUT}/carga-1-espera.png` })

// ── Dos seguidas sí, y de forma proporcional ──────────────
const dos = await planDeCurl({ veces: 2, peso: 10, topeMancuernas: 24 })
if (dos) {
  comprobar(dos.peso > 10, `dos sesiones al tope no suben el peso: ${dos.peso} kg`)
  // 2,5 % de 10 kg son 0,25, que redondea al salto real más pequeño: 0,5 kg.
  comprobar(dos.peso <= 10.5, `la subida es desproporcionada: de 10 a ${dos.peso} kg`)
  console.log('  · dos sesiones →', dos.peso, 'kg')
}
await page.screenshot({ path: `${OUT}/carga-2-sube.png` })

// ── Al tope del material, otra palanca ────────────────────
const topado = await planDeCurl({ veces: 2, peso: 24, topeMancuernas: 24 })
if (topado) {
  comprobar(topado.peso === 24, `debería quedarse en el tope: ${topado.peso} kg`)
  comprobar(
    /tope de tu material/i.test(topado.nota),
    `no avisa de que se ha llegado al tope: «${topado.nota}»`
  )
  console.log('  · topado →', topado.peso, 'kg ·', topado.nota.slice(0, 70))
}
await page.screenshot({ path: `${OUT}/carga-3-topado.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ progresión de carga: 2-por-2, subida proporcional y cambio de palanca al topar')
