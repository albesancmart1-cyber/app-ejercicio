/**
 * La báscula en el test y la explicación diaria del peso, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  1. El test de la mañana abre con el bloque de la báscula, **opcional**: sin
 *     rellenarlo se puede terminar el test igual.
 *  2. Rellenando peso con coma («104,6») se guarda como medición del día, con
 *     sus porcentajes.
 *  3. Las preguntas de «lo de ayer» son opcionales y lo dicen.
 *  4. Con báscula hoy y ayer, la tarjeta «Por qué pesas hoy esto» aparece, da
 *     el delta y nombra la causa; sin báscula hoy, no aparece.
 *  5. Una subida grande tras salir de cetosis se explica por el glucógeno y
 *     ancla que no es grasa. Nunca aparece la palabra «caloría».
 *
 *   node scripts/check-peso-hoy.mjs
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

/** Historial con báscula de ayer y cetosis de ayer, para que hoy haya delta. */
async function sembrar({ conKetoAyer }) {
  await page.goto(BASE)
  await page.evaluate((ketoAyer) => {
    const hoy = new Date()
    const menos = (d) => {
      const x = new Date(hoy)
      x.setDate(x.getDate() - d)
      return x.toISOString().slice(0, 10)
    }
    const checkIns = Array.from({ length: 9 }, (_, i) => ({
      date: menos(i + 1),
      sleep: 4,
      lightHygiene: true,
      sunrise: true,
      sunsetYesterday: true,
      sunExposure: true,
      keto: ketoAyer,
      energy: 4,
      discomfort: 'ninguna',
      wokeHungry: false,
      cravings: false
    }))
    const measurements = Array.from({ length: 8 }, (_, i) => ({
      date: menos(i + 1),
      weightKg: 103.4 + i * 0.05
    }))
    localStorage.setItem(
      'ritmo-data-v1',
      JSON.stringify({
        version: 2,
        profile: {
          name: 'Alberto',
          goal: 'recomposicion',
          weightKg: 103.4,
          heightCm: 180,
          equipment: ['peso_corporal', 'mancuernas', 'banco'],
          maxWeights: { mancuernas: 24 }
        },
        checkIns,
        sessions: [],
        measurements
      })
    )
  }, conKetoAyer)
  await page.goto(BASE)
  await page.waitForTimeout(800)
}

/** Contesta el test entero. La báscula y «lo de ayer» según se pida. */
async function pasarElTest({ peso, grasa, keto, cenaTarde }) {
  await page.getByText('Empezar', { exact: false }).first().click()
  await page.waitForTimeout(400)

  // 1 · El bloque de la báscula está y es lo primero.
  comprobar(
    (await page.getByText('La báscula', { exact: false }).count()) > 0,
    'el test no abre con el bloque de la báscula'
  )
  if (peso !== undefined) {
    await page.getByLabel('Peso de hoy en kilos').fill(peso)
    if (grasa) await page.getByLabel('Porcentaje de grasa de hoy').fill(grasa)
  }

  // Dormir y energía.
  const escalas = page.locator('[role="radiogroup"], .escala')
  void escalas
  for (const label of ['Muy mal a De maravilla', 'Agotado a A tope']) {
    await page.getByLabel(label).getByRole('button', { name: '4' }).click().catch(async () => {
      // La escala puede no ser un grupo etiquetado: se toca el cuarto botón visible.
      const grupo = page.locator('.card').filter({ hasText: label.startsWith('Muy mal') ? 'dormido' : 'energía' })
      await grupo.getByRole('button', { name: '4', exact: true }).first().click()
    })
    await page.waitForTimeout(150)
  }

  // Rituales: sí a todo menos la cetosis, que va según el caso.
  for (const [q, si] of [
    ['¿Respetaste anoche la higiene lumínica?', true],
    ['¿Has visto el amanecer hoy?', true],
    ['¿Viste el atardecer ayer?', true],
    ['¿Te dio el sol ayer?', true],
    ['¿Sigues en cetosis?', keto],
    ['¿Te despertaste con mucha hambre?', false],
    ['¿Tuviste antojos ayer?', false]
  ]) {
    const fila = page.locator('.row').filter({ hasText: q })
    await fila.getByRole('button', { name: si ? 'Sí' : 'No', exact: true }).click()
    await page.waitForTimeout(80)
  }

  // 3 · Lo de ayer es opcional: solo se contesta la cena si se pide.
  if (cenaTarde !== undefined) {
    const fila = page.locator('.row').filter({ hasText: '¿Cenaste tarde' })
    await fila.getByRole('button', { name: cenaTarde ? 'Sí' : 'No', exact: true }).click()
  }
  comprobar(
    (await page.getByText('Todo esto es opcional', { exact: false }).count()) > 0,
    'no se dice que «lo de ayer» sea opcional'
  )

  // Molestias: ninguna.
  await page.getByRole('button', { name: /Ninguna/ }).first().click()
  await page.waitForTimeout(200)

  const ver = page.getByRole('button', { name: 'Ver qué me conviene' })
  comprobar(await ver.isEnabled(), 'el test no se puede terminar (¿la báscula bloquea?)')
  await ver.click()
  await page.waitForTimeout(700)
}

// ─────────────────────────────────────────────────────────────
// A · Salir de cetosis y subir 1,2 kg: glucógeno, no grasa
// ─────────────────────────────────────────────────────────────
await sembrar({ conKetoAyer: true })
await pasarElTest({ peso: '104,6', grasa: '24,5', keto: false })

const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  return {
    medicion: d.measurements.find((m) => m.date === hoy),
    checkin: d.checkIns.find((c) => c.date === hoy)
  }
})
comprobar(guardado.medicion?.weightKg === 104.6, `el peso con coma no se guardó bien: ${JSON.stringify(guardado.medicion)}`)
comprobar(guardado.medicion?.fatPercent === 24.5, `la grasa no se guardó: ${JSON.stringify(guardado.medicion)}`)
comprobar(guardado.checkin?.keto === false, 'el check-in no guarda la cetosis')

// 4 y 5 · La tarjeta, tras el test (fase del plan).
const tarjeta = page.locator('.peso-hoy')
comprobar((await tarjeta.count()) > 0, 'tras el test con báscula no aparece «Por qué pesas hoy esto»')
if (await tarjeta.count()) {
  const texto = await tarjeta.innerText()
  comprobar(/\+1,1 kg|\+1,2 kg/.test(texto), `el delta no cuadra: ${texto.slice(0, 160)}`)
  comprobar(/cetosis|glucógeno/i.test(texto), `no nombra el glucógeno: ${texto.slice(0, 200)}`)
  comprobar(/agua/i.test(texto), 'no ancla que el salto es agua')
  comprobar(!/calor[ií]a|kcal|déficit/i.test(texto), 'habla de calorías')
  await tarjeta.screenshot({ path: `${OUT}/peso-hoy-glucogeno.png` })
}

// La tarjeta también está al volver a la portada de Hoy.
await page.getByRole('button', { name: 'Cocina', exact: true }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'Hoy', exact: true }).click()
await page.waitForTimeout(700)
comprobar(
  (await page.locator('.peso-hoy').count()) > 0,
  'la tarjeta no está en la portada de Hoy tras el test'
)
await page.screenshot({ path: `${OUT}/peso-hoy-inicio.png` })

// ─────────────────────────────────────────────────────────────
// B · Sin báscula hoy: el test sale igual y no hay tarjeta
// ─────────────────────────────────────────────────────────────
await sembrar({ conKetoAyer: true })
await pasarElTest({ keto: true, cenaTarde: false })
comprobar(
  (await page.locator('.peso-hoy').count()) === 0,
  'sin báscula hoy la tarjeta no debería aparecer'
)

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Peso de hoy: bien. Capturas en ${OUT}`)
