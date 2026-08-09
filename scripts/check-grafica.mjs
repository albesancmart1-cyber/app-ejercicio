/**
 * La gráfica del cuerpo, en navegador.
 *
 * Comprueba lo que la vista promete: las cuatro series —peso, grasa, músculo y
 * masa libre de grasa—, el selector de periodo con sus tres ventanas, que el
 * eje de cada ventana tenga las casillas que le tocan y que apagar una serie
 * desde la leyenda la quite de verdad del dibujo.
 *
 *   node scripts/check-grafica.mjs
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

/** Un año de pesadas: semanales de cerca y mensuales de lejos. */
function historial(hoy) {
  const ms = []
  const base = new Date(`${hoy}T00:00:00Z`)
  for (let i = 0; i < 60; i++) {
    const d = new Date(base.getTime() - i * 6 * 86400000)
    ms.push({
      date: d.toISOString().slice(0, 10),
      // Recomposición de libro: el peso casi quieto, la grasa bajando y el
      // músculo subiendo, que es lo que la gráfica tiene que dejar ver.
      weightKg: 78 - i * 0.02,
      fatPercent: 18 + i * 0.06,
      musclePercent: 42 - i * 0.05
    })
  }
  return ms
}

await page.goto(BASE)
const hoy = await page.evaluate(() => new Date().toISOString().slice(0, 10))
await page.evaluate(
  ([mediciones]) => {
    localStorage.setItem(
      'ritmo-data-v1',
      JSON.stringify({
        version: 2,
        profile: {
          name: 'Alberto',
          goal: 'recomposicion',
          heightCm: 178,
          equipment: ['peso_corporal', 'mancuernas'],
          maxWeights: { mancuernas: 24 }
        },
        checkIns: [],
        sessions: [],
        measurements: mediciones
      })
    )
  },
  [historial(hoy)]
)

await page.goto(BASE)
await page.waitForTimeout(800)
await page.getByText('Progreso', { exact: true }).first().click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(700)

// ── Las cuatro series ─────────────────────────────────────
const leyenda = page.locator('.trend-legend')
comprobar(await leyenda.count(), 'no aparece la gráfica de composición')
if ((await leyenda.count()) === 0) {
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}
const textoLeyenda = await leyenda.first().innerText()
for (const serie of ['Peso', 'Grasa', 'Músculo', 'Masa libre de grasa']) {
  comprobar(textoLeyenda.includes(serie), `falta la serie «${serie}» en la leyenda: ${textoLeyenda}`)
}

const lineas = () => page.locator('.trend-chart polyline').count()
comprobar((await lineas()) === 4, `deberían dibujarse cuatro líneas, hay ${await lineas()}`)
await page.locator('.trend-chart').first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/grafica-1-cuatro-series.png` })

// ── El selector de periodo ────────────────────────────────
const selector = page.locator('.trend-range')
comprobar(await selector.count(), 'no hay selector de periodo')
const opciones = await selector.first().innerText()
for (const r of ['1 semana', '1 mes', '1 año']) {
  comprobar(opciones.includes(r), `falta el periodo «${r}»: ${opciones}`)
}

/** Los rótulos del eje horizontal, que es donde se ve la ventana elegida. */
const rotulos = async () => {
  // `innerText` no vale dentro de un SVG: los `<text>` no tienen presentación
  // de caja y devuelve cadena vacía. Hay que leer el contenido a secas.
  const todos = await page
    .locator('.trend-chart .trend-axis-label')
    .evaluateAll((ns) => ns.map((n) => n.textContent.trim()))
  // Los tres primeros son la escala vertical (+x, 0, -x).
  return todos.slice(3)
}

await selector.getByRole('button', { name: '1 semana' }).click()
await page.waitForTimeout(400)
const semana = await rotulos()
comprobar(
  semana.length === 7,
  `en «1 semana» tienen que verse los siete días, hay ${semana.length}: ${semana.join(',')}`
)
comprobar(
  semana.every((d) => /^[LMXJVSD]$/.test(d)),
  `los rótulos de la semana deberían ser días: ${semana.join(',')}`
)
await page.screenshot({ path: `${OUT}/grafica-2-semana.png` })

await selector.getByRole('button', { name: '1 mes' }).click()
await page.waitForTimeout(400)
const mes = await rotulos()
comprobar(mes.length >= 5 && mes.length <= 9, `el mes debería rotular unos pocos días, hay ${mes.length}`)
comprobar(
  mes.every((d) => /^\d{1,2}$/.test(d)),
  `los rótulos del mes deberían ser números de día: ${mes.join(',')}`
)
const puntosMes = await page.locator('.trend-chart g').count()
comprobar(puntosMes === 30, `el mes tiene que tener treinta casillas, tiene ${puntosMes}`)
await page.screenshot({ path: `${OUT}/grafica-3-mes.png` })

await selector.getByRole('button', { name: '1 año' }).click()
await page.waitForTimeout(400)
const anio = await rotulos()
comprobar(anio.length === 12, `en «1 año» tienen que verse los doce meses, hay ${anio.length}`)
const puntosAnio = await page.locator('.trend-chart g').count()
comprobar(puntosAnio === 12, `el año tiene que tener doce casillas, tiene ${puntosAnio}`)
await page.screenshot({ path: `${OUT}/grafica-4-anio.png` })

// ── Apagar una serie desde la leyenda ─────────────────────
await page.locator('.trend-key-btn', { hasText: 'Peso' }).first().click()
await page.waitForTimeout(300)
comprobar((await lineas()) === 3, `apagar «Peso» debería dejar tres líneas, hay ${await lineas()}`)
await page.locator('.trend-key-btn', { hasText: 'Peso' }).first().click()
await page.waitForTimeout(300)
comprobar((await lineas()) === 4, 'volver a encenderla debería devolver la cuarta línea')

// ── Sin datos suficientes lo dice, no se rompe ────────────
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.measurements = d.measurements.slice(0, 2).map((m, i) => ({
    ...m,
    date: i === 0 ? m.date : '2025-01-01'
  }))
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload()
await page.waitForTimeout(800)
await page.getByText('Progreso', { exact: true }).first().click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(600)
await page.locator('.trend-range').first().getByRole('button', { name: '1 semana' }).click()
await page.waitForTimeout(400)
const cuerpo = await page.locator('.card').filter({ hasText: 'Composición' }).first().innerText()
comprobar(
  /no hay dos pesadas/i.test(cuerpo),
  `sin datos en la ventana debería explicarlo: ${cuerpo.slice(0, 200)}`
)
await page.screenshot({ path: `${OUT}/grafica-5-sin-datos.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ cuatro series, tres periodos con sus casillas, y apagar series desde la leyenda')
