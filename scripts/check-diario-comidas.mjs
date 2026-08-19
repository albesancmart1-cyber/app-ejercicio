/**
 * El diario de comidas y la crononutrición, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  1. En Cocina se pueden apuntar comidas libres —comida 1, comida 2…— con su
 *     hora y sus etiquetas, y quitarlas.
 *  2. Con dos comidas apuntadas, la tarjeta dice la **ventana de alimentación**
 *     («de 10:30 a 19:30») y avisa de la cena tardía solo cuando la hay.
 *  3. «La he comido» en una receta la manda al diario con su proteína y su DHA
 *     sumados.
 *  4. El diario alimenta la explicación del peso: una cena con «carbohidrato»
 *     apuntada ayer hace que la subida de hoy se explique por el glucógeno
 *     **sin haber contestado nada en el test sobre ayer**.
 *  5. En ninguna parte del diario aparece una caloría.
 *
 *   node scripts/check-diario-comidas.mjs
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

await page.goto(BASE)
await page.evaluate(() => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 103,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas'],
        maxWeights: { mancuernas: 24 }
      },
      // El check-in de hoy existe pero SIN contestar nada de «lo de ayer»: lo
      // del glucógeno tiene que salir solo del diario.
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
        },
        {
          date: menos(1),
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
      sessions: [],
      measurements: [
        { date: menos(1), weightKg: 103 },
        { date: menos(0), weightKg: 104.1 }
      ],
      // Ayer, apuntado en el diario: una cena con carbohidrato.
      comidas: [
        {
          date: menos(1),
          comidas: [
            { hora: '14:00', texto: 'Chuletas', etiquetas: ['proteina'] },
            { hora: '21:00', texto: 'Arroz con pollo', etiquetas: ['carbohidrato'] }
          ]
        }
      ]
    })
  )
})
await page.goto(BASE)
await page.waitForTimeout(800)

// ── 4 · La explicación del peso lee el diario ─────────────
const peso = page.locator('.peso-hoy')
comprobar((await peso.count()) > 0, 'no aparece la tarjeta del peso con báscula de hoy y ayer')
if (await peso.count()) {
  const t = await peso.innerText()
  comprobar(
    /glucógeno|cetosis/i.test(t),
    `la subida no se explica por el carbohidrato apuntado en el diario: ${t.slice(0, 180)}`
  )
}

// ── 1 · Apuntar comidas hoy ───────────────────────────────
await page.getByRole('button', { name: 'Cocina', exact: true }).click()
await page.waitForTimeout(700)
const diario = page.locator('.diario-comidas')
comprobar((await diario.count()) > 0, 'no está la tarjeta del diario en Cocina')

async function apuntar(hora, texto, etiquetas = []) {
  await diario.getByRole('button', { name: 'Añadir comida' }).click()
  await page.waitForTimeout(250)
  await diario.getByLabel('Hora de la comida').fill(hora)
  await diario.getByLabel('Qué has comido').fill(texto)
  for (const e of etiquetas) {
    await diario.getByRole('button', { name: e, exact: true }).click()
  }
  await diario.getByRole('button', { name: 'Guardar comida' }).click()
  await page.waitForTimeout(350)
}

await apuntar('10:30', 'Huevos con jamón', ['Huevos', 'Proteína animal'])
await apuntar('19:30', 'Salmón a la plancha', ['Pescado azul'])

const texto1 = await diario.innerText()
comprobar(/10:30/.test(texto1) && /19:30/.test(texto1), 'las comidas apuntadas no se ven')
comprobar(
  /ventana de 9 h, de 10:30 a 19:30/.test(texto1),
  `no dice la ventana de alimentación: ${texto1.slice(0, 240)}`
)
comprobar(!/tarde/i.test(texto1.split('ventana')[1] ?? ''), 'avisa de cena tardía sin haberla')
comprobar(!/calor[ií]a|kcal/i.test(texto1), 'el diario habla de calorías')
await diario.screenshot({ path: `${OUT}/diario-ventana.png` })

// Una cena tardía sí avisa.
await apuntar('22:30', 'Picoteo')
comprobar(/tarde/i.test(await diario.innerText()), 'una comida a las 22:30 no avisa de cena tardía')

// Y se puede quitar.
await diario.getByLabel('Quitar la comida de las 22:30').click()
await page.waitForTimeout(300)
comprobar(!/22:30/.test(await diario.innerText()), 'quitar la comida no la quita')

// ── 3 · «La he comido» desde una receta ───────────────────
const idea = page.locator('.idea').first()
const nombrePlato = (await idea.locator('.idea-nombre').innerText()).trim()
await idea.click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'La he comido · al diario' }).click()
await page.waitForTimeout(500)
const texto2 = await page.locator('.diario-comidas').innerText()
comprobar(
  texto2.includes(nombrePlato),
  `el plato del recetario no llegó al diario: buscaba «${nombrePlato}»`
)
comprobar(
  /g de proteína/.test(texto2),
  'no suma la proteína del plato enlazado'
)
await page.locator('.diario-comidas').screenshot({ path: `${OUT}/diario-con-plato.png` })

// ── Todo guardado de verdad ───────────────────────────────
const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  return d.comidas?.find((x) => x.date === hoy)
})
comprobar(guardado?.comidas?.length === 3, `deberían quedar 3 comidas hoy y hay ${guardado?.comidas?.length}`)
comprobar(
  guardado?.comidas?.some((c) => c.mealId),
  'la comida del recetario no guarda su enlace'
)

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Diario de comidas: bien. Capturas en ${OUT}`)
