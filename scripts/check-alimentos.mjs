/**
 * El catálogo de alimentos básicos, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  1. Escribir en el campo del alimento **busca en el catálogo** y sale una
 *     lista de alimentos básicos. Sin tildes también encuentra.
 *  2. Elegir uno pone su nombre y **sus etiquetas ya interpretadas** — el
 *     salmón sale como proteína y pescado azul sin tocar nada.
 *  3. La ficha dice sus gramos de carbohidrato por 100 y si es de los buenos.
 *  4. Se puede **corregir el alimento para siempre**, y la corrección se guarda
 *     y se aplica la próxima vez que se busque.
 *  5. La cetosis se cuenta **en gramos**: 200 g de melocotón siguen dentro del
 *     margen (30–50 g), y un plato de macarrones se sale.
 *  6. Un alimento que no está en el catálogo se puede apuntar igual, a mano.
 *  7. Lo que se cuenta por unidades —huevos, tortitas de fajita— **pide
 *     unidades, no gramos**, y se enseña como «2 huevos». Los gramos salen
 *     solos por debajo para la cuenta de cetosis.
 *
 *   node scripts/check-alimentos.mjs
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
  const hoy = new Date().toISOString().slice(0, 10)
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 80,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas'],
        maxWeights: { mancuernas: 24 }
      },
      checkIns: [
        {
          date: hoy,
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
      measurements: []
    })
  )
})
await page.goto(BASE)
await page.waitForTimeout(800)
await page.getByRole('button', { name: 'Cocina', exact: true }).click()
await page.waitForTimeout(700)

const diario = page.locator('.diario-comidas')
comprobar((await diario.count()) > 0, 'no está el diario en Cocina')

// ── 1 y 2 · Buscar sin tildes y elegir ────────────────────
await diario.getByRole('button', { name: 'Añadir comida' }).click()
await page.waitForTimeout(300)
await diario.getByLabel('Nombre del alimento').fill('salmon')
await page.waitForTimeout(300)

const resultados = diario.locator('.alimento-resultado')
const cuantos = await resultados.count()
comprobar(cuantos > 0, 'buscar «salmon» sin tilde no devuelve nada del catálogo')
if (cuantos === 0) {
  console.error('Sin buscador no hay nada más que comprobar.')
  await browser.close()
  process.exit(1)
}
await diario.screenshot({ path: `${OUT}/alimentos-buscador.png` })
await resultados.filter({ hasText: 'Salmón' }).first().click()
await page.waitForTimeout(300)

// El nombre va en el `input`, y su valor no sale en `innerText`.
const nombrePuesto = await diario.getByLabel('Nombre del alimento').inputValue()
comprobar(nombrePuesto === 'Salmón', `elegir no pone el nombre: «${nombrePuesto}»`)
// Sus etiquetas quedan marcadas solas.
const marcadas = await diario.locator('.opt[aria-pressed="true"]').allInnerTexts()
comprobar(
  marcadas.includes('Proteína animal') && marcadas.includes('Pescado azul'),
  `el salmón debería traer sus etiquetas puestas y trae: ${JSON.stringify(marcadas)}`
)

// ── 3 · La ficha del alimento ─────────────────────────────
const ficha = diario.locator('.alimento-ficha')
comprobar((await ficha.count()) > 0, 'no aparece la ficha del alimento elegido')
comprobar(/Pescado/.test(await ficha.innerText()), 'la ficha no dice la categoría')

// ── 4 · Corregir para siempre ─────────────────────────────
await diario.getByRole('button', { name: 'Corregir este alimento' }).click()
await page.waitForTimeout(250)
// Al salmón se le marca «muy salada» (por ejemplo, ahumado en casa) y se guarda.
await diario.getByRole('button', { name: 'Muy salada', exact: true }).click()
await diario.getByRole('button', { name: 'Guardar la corrección para siempre' }).click()
await page.waitForTimeout(400)

const edicion = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return d.alimentosEditados?.find((x) => x.id === 'salmon')
})
comprobar(
  edicion?.etiquetas?.includes('salada'),
  `la corrección no se guardó: ${JSON.stringify(edicion)}`
)

// Guardamos la comida con el salmón y sus gramos.
await diario.getByLabel('Peso del alimento en gramos').fill('200')
await diario.getByRole('button', { name: 'Guardar comida' }).click()
await page.waitForTimeout(400)

// La corrección se aplica al volver a buscarlo.
await diario.getByRole('button', { name: 'Añadir comida' }).click()
await page.waitForTimeout(250)
await diario.getByLabel('Nombre del alimento').fill('salmon')
await page.waitForTimeout(300)
await diario.locator('.alimento-resultado').filter({ hasText: 'Salmón' }).first().click()
await page.waitForTimeout(300)
const marcadas2 = await diario.locator('.opt[aria-pressed="true"]').allInnerTexts()
comprobar(
  marcadas2.includes('Muy salada'),
  `la corrección no se aplica al volver a elegirlo: ${JSON.stringify(marcadas2)}`
)

// ── 5 · La cetosis en gramos ──────────────────────────────
// Se cambia por melocotón: 200 g ≈ 18 g de carbohidrato → sigue en cetosis.
await diario.getByLabel('Nombre del alimento').fill('melocoton')
await page.waitForTimeout(300)
await diario.locator('.alimento-resultado').filter({ hasText: 'Melocotón' }).first().click()
await page.waitForTimeout(250)
await diario.getByLabel('Peso del alimento en gramos').fill('200')
await diario.getByRole('button', { name: 'Guardar comida' }).click()
await page.waitForTimeout(500)

const conFruta = await diario.innerText()
comprobar(
  /dentro de cetosis con holgura/.test(conFruta),
  `200 g de melocotón deberían seguir en cetosis: ${conFruta.slice(0, 300)}`
)
comprobar(/≈ 18 g de carbohidrato/.test(conFruta), `la cuenta de gramos no cuadra: ${conFruta.slice(0, 300)}`)
await diario.screenshot({ path: `${OUT}/alimentos-cetosis-dentro.png` })

// Un plato de macarrones sí se sale.
await diario.getByRole('button', { name: 'Añadir comida' }).click()
await page.waitForTimeout(250)
await diario.getByLabel('Nombre del alimento').fill('macarrones')
await page.waitForTimeout(300)
const pasta = diario.locator('.alimento-resultado').first()
comprobar((await pasta.count()) > 0, 'buscar «macarrones» no encuentra la pasta')
await pasta.click()
await page.waitForTimeout(250)
await diario.getByLabel('Peso del alimento en gramos').fill('250')
await diario.getByRole('button', { name: 'Guardar comida' }).click()
await page.waitForTimeout(500)

const conPasta = await diario.innerText()
comprobar(/fuera de cetosis/.test(conPasta), `250 g de pasta deberían sacar de cetosis: ${conPasta.slice(0, 320)}`)
comprobar(!/calor[ií]a|kcal/i.test(conPasta), 'el diario habla de calorías')
await diario.screenshot({ path: `${OUT}/alimentos-cetosis-fuera.png` })

// ── 6 · Un alimento libre, fuera del catálogo ─────────────
await diario.getByRole('button', { name: 'Añadir comida' }).click()
await page.waitForTimeout(250)
await diario.getByLabel('Nombre del alimento').fill('Guiso de la abuela')
await page.waitForTimeout(300)
await diario.getByRole('button', { name: 'Proteína animal', exact: true }).click()
await diario.getByRole('button', { name: 'Guardar comida' }).click()
await page.waitForTimeout(400)
comprobar(
  /Guiso de la abuela/.test(await diario.innerText()),
  'un alimento que no está en el catálogo tiene que poder apuntarse igual'
)

const guardado = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  return d.comidas?.find((x) => x.date === hoy)
})
comprobar(guardado?.comidas?.length === 4, `deberían quedar 4 comidas y hay ${guardado?.comidas?.length}`)
const conId = guardado?.comidas?.flatMap((c) => c.alimentos ?? []).filter((a) => a.alimentoId)
comprobar(conId?.length === 3, `3 alimentos deberían quedar enlazados al catálogo y hay ${conId?.length}`)
const libre = guardado?.comidas?.flatMap((c) => c.alimentos ?? []).find((a) => a.nombre === 'Guiso de la abuela')
comprobar(libre !== undefined && libre.alimentoId === undefined, 'el alimento libre no debe llevar enlace')

// ── 7 · Lo que se cuenta por unidades ─────────────────────
// Los huevos se piden en huevos. Nadie pesa un huevo.
await diario.getByRole('button', { name: 'Añadir comida' }).click()
await page.waitForTimeout(250)
await diario.getByLabel('Nombre del alimento').fill('huevo revuelto')
await page.waitForTimeout(300)
await diario.locator('.alimento-resultado').first().click()
await page.waitForTimeout(300)

comprobar(
  (await diario.getByLabel('Peso del alimento en gramos').count()) === 0,
  'un huevo no debe pedir gramos'
)
const campoHuevos = diario.getByLabel('Cantidad en huevos')
comprobar((await campoHuevos.count()) > 0, 'no aparece el campo de unidades para los huevos')
comprobar((await campoHuevos.inputValue()) === '1', 'las unidades deberían empezar en 1')
await campoHuevos.fill('3')
await page.waitForTimeout(250)
await diario.screenshot({ path: `${OUT}/alimentos-unidades.png` })

// Y las tortitas de fajita, en tortitas, con sus 36 g y sus 18 de hidrato.
await diario.getByRole('button', { name: 'Añadir otro alimento' }).click()
await page.waitForTimeout(250)
await diario.getByLabel('Nombre del alimento').fill('tortita')
await page.waitForTimeout(300)
const tortita = diario.locator('.alimento-resultado').filter({ hasText: 'Tortita' }).first()
comprobar((await tortita.count()) > 0, 'buscar «tortita» no encuentra la de fajitas')
await tortita.click()
await page.waitForTimeout(300)
const ficha2 = await diario.locator('.alimento-ficha').innerText()
comprobar(/36 g por tortita/.test(ficha2), `la ficha no dice lo que pesa una: ${ficha2}`)
comprobar(/18 g de carbohidrato/.test(ficha2), `la ficha no dice los hidratos por unidad: ${ficha2}`)
await diario.getByLabel('Cantidad en tortitas').fill('2')
await diario.getByRole('button', { name: 'Guardar comida' }).click()
await page.waitForTimeout(500)

await diario.screenshot({ path: `${OUT}/alimentos-unidades-guardado.png` })
const conUnidades = await diario.innerText()
comprobar(/3 huevos/.test(conUnidades), `los huevos no se enseñan en huevos: ${conUnidades.slice(0, 400)}`)
comprobar(/2 tortitas/.test(conUnidades), `las tortitas no se enseñan en tortitas: ${conUnidades.slice(0, 400)}`)
comprobar(!/165 g|72 g/.test(conUnidades), 'los gramos de lo contado por unidades no deben enseñarse')

const porUnidades = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  const dia = d.comidas?.find((x) => x.date === hoy)
  return dia?.comidas?.at(-1)?.alimentos
})
comprobar(
  porUnidades?.[0]?.unidades === 3 && porUnidades?.[0]?.gramos === 165,
  `3 huevos deberían guardar 165 g por debajo: ${JSON.stringify(porUnidades?.[0])}`
)
comprobar(
  porUnidades?.[1]?.unidades === 2 && porUnidades?.[1]?.gramos === 72,
  `2 tortitas deberían guardar 72 g por debajo: ${JSON.stringify(porUnidades?.[1])}`
)

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Catálogo de alimentos: bien. Capturas en ${OUT}`)
