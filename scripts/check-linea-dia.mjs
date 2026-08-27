/**
 * La línea del día, en navegador.
 *
 * Lo que tiene que pasar: que las nueve horas del día salgan **en orden**, que
 * cada una diga qué cambia y no cómo se llama el fenómeno, que lo ya pasado se
 * vea apagado, y que las dos que abren y cierran la vitamina D —el ultravioleta
 * B— estén marcadas, porque son la ventana corta de verdad.
 *
 *   node scripts/check-linea-dia.mjs
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

// Un mediodía de agosto en Madrid, con el reloj fijado para que lo «pasado» y
// lo «por venir» sean siempre los mismos y el recorrido no dependa de la hora.
await page.clock.setFixedTime(new Date('2026-08-26T12:30:00'))
await page.goto(BASE)
await page.evaluate(() => {
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        equipment: ['peso_corporal'],
        maxWeights: {},
        lat: 40.4165,
        lon: -3.7026,
        sitio: 'Madrid',
        fototipo: 'III'
      },
      checkIns: [],
      sessions: [],
      measurements: []
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Luz' }).click()
await page.waitForTimeout(900)

const tarjeta = page.locator('.card').filter({ hasText: 'Tu día, hora a hora' }).first()
comprobar(await tarjeta.count(), 'no aparece la línea del día')
if ((await tarjeta.count()) === 0) {
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}
await tarjeta.scrollIntoViewIfNeeded()
const texto = await tarjeta.innerText()

// Las nueve, cada una con su nombre.
for (const nombre of [
  'Primera luz',
  'Sale el sol',
  'Empieza el ultravioleta A',
  'Empieza el ultravioleta B',
  'Lo más alto',
  'Se acaba el ultravioleta B',
  'Se acaba el ultravioleta A',
  'Sal a ver el atardecer',
  'Se pone el sol',
  'Última luz'
]) {
  comprobar(texto.includes(nombre), `falta el hito «${nombre}»`)
}

// Y en el orden en que ocurren, que es el único que sirve para decidir.
const horas = [...texto.matchAll(/(\d{2}):(\d{2})/g)].map((m) => Number(m[1]) * 60 + Number(m[2]))
comprobar(horas.length >= 10, `deberían salir al menos diez horas: ${horas.length}`)
comprobar(
  horas.every((h, i) => i === 0 || h >= horas[i - 1]),
  `las horas tienen que ir en orden: ${JSON.stringify(horas)}`
)
console.log('  · el día, en orden:', horas.map((h) => `${String(Math.floor(h / 60)).padStart(2, '0')}:${String(h % 60).padStart(2, '0')}`).join(' → '))

// La ventana de ultravioleta B es mucho más corta que el día: es el punto.
const uvbDesde = horas[3]
const uvbHasta = horas[5]
const dia = horas[8] - horas[1]
comprobar(uvbHasta - uvbDesde < dia * 0.75, `la ventana de UVB debería ser bastante más corta que el día: ${uvbHasta - uvbDesde} vs ${dia} min`)
console.log('  · día', dia, 'min · ventana de vitamina D', uvbHasta - uvbDesde, 'min')

// Dice qué cambia, no cómo se llama el fenómeno.
comprobar(/vitamina D/i.test(texto), 'el ultravioleta B tiene que decir que ahí empieza la vitamina D')
comprobar(/gafas/i.test(texto), 'la última luz tiene que decir lo de las gafas')
comprobar(/sol a 30°/.test(texto) && /sol a 10°/.test(texto), 'debería decir de qué altura sale cada umbral')

// Lo pasado, apagado; y lo que viene, señalado.
const opacidades = await tarjeta.locator('> div').evaluateAll((els) =>
  els.map((el) => ({ t: el.textContent?.slice(0, 30), o: Number(getComputedStyle(el).opacity) }))
)
const apagados = opacidades.filter((x) => x.o < 0.6)
comprobar(apagados.length > 0, 'a las 12:30 ya ha pasado media mañana: debería haber hitos apagados')
comprobar(
  opacidades.some((x) => x.o >= 0.9),
  'y lo que queda por delante tiene que verse entero'
)
comprobar(/ahora viene esto/.test(texto), 'debería señalar cuál es el siguiente')
console.log('  · pasados', apagados.length, 'de', opacidades.length)

await page.screenshot({ path: `${OUT}/linea-dia.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el día entero en orden, con lo que cambia en cada hito y lo ya pasado apagado')
