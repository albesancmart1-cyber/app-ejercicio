// Recorrido end-to-end de verificación: onboarding → check-in → recomendación →
// sesión → historial, más las cuatro paletas horarias. Capturas en OUT_DIR.
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

async function shot(name) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('·', name)
}
const byText = (t) => page.getByText(t, { exact: false }).first()

await page.goto(BASE)

// ── Onboarding ────────────────────────────────────────────
await shot('01-bienvenida')
await page.getByPlaceholder('Tu nombre').fill('Alberto')
await page.getByPlaceholder('Opcional').nth(1).fill('78') // peso
await page.getByPlaceholder('Opcional').nth(2).fill('180') // altura, para el FFMI
await byText('Continuar').click()

await byText('Recomposición corporal').click()
await shot('02-objetivo')
await byText('Continuar').click()

for (const eq of ['Mancuernas', 'Bandas elásticas', 'Banco', 'Bicicleta', 'Poder salir a correr']) {
  await byText(eq).click()
}
await shot('03-equipamiento')
await byText('Continuar').click()

await page.getByPlaceholder('kg').first().fill('24')
await shot('04-pesos')
await byText('Continuar').click()

await page.locator('input[type=date]').fill('2026-07-01')
await page.getByPlaceholder('p. ej. 1000').fill('1000')
await shot('05-cetosis')
await byText('Empezar').click()

// ── Check-in ──────────────────────────────────────────────
await shot('06-hoy')
await byText('Empezar').click()

const scales = page.locator('.scale')
await scales.nth(0).locator('button').nth(3).click() // sueño 4
await scales.nth(1).locator('button').nth(3).click() // energía 4

// Selectores por texto, no por índice: así añadir tarjetas no rompe el recorrido.
const card = (titulo) => page.locator('.card').filter({ hasText: titulo })
const answer = async (pregunta, respuesta) =>
  page.locator('.row').filter({ hasText: pregunta }).getByText(respuesta, { exact: true }).click()

for (const q of [
  '¿Respetaste anoche la higiene lumínica?',
  '¿Has visto el amanecer hoy?',
  '¿Viste el atardecer ayer?',
  '¿Te dio el sol ayer?',
  '¿Sigues en cetosis?'
]) {
  await answer(q, 'Sí')
}
// Señales de leptina: sin hambre voraz ni antojos.
await answer('¿Te despertaste con mucha hambre?', 'No')
await answer('¿Tuviste antojos ayer?', 'No')
await shot('07-checkin')
await card('Apetito').scrollIntoViewIfNeeded()
await shot('07b-apetito')

await card('Cuerpo').getByText('Ninguna', { exact: true }).click()
await byText('Ver qué me conviene').click()

// ── Recomendación ─────────────────────────────────────────
await shot('08-recomendacion')
const recomendado = await page.locator('.eyebrow').nth(1).textContent()
console.log('  → recomienda:', recomendado)
await byText('Por qué esto hoy').click()
await shot('09-por-que')

// Subir el listón: pesas en vez de lo que tocara, si la app lo permite.
const botonPesas = page.getByText('Prefiero algo con pesas')
if (await botonPesas.count()) {
  await botonPesas.click()
  await page.waitForTimeout(300)
  const subido = await page.locator('.eyebrow').nth(1).textContent()
  console.log('  → tras pedir pesas:', subido)
  if (subido === recomendado) {
    console.error('ERROR: pedir pesas no cambió la recomendación')
    process.exit(1)
  }
  await shot('09b-con-pesas')
  await byText('Volver a lo que me tocaba').click()
  await page.waitForTimeout(300)
  await botonPesas.click()
  await page.waitForTimeout(300)
}
await byText('Preparar la sesión').click()

// ── Sesión: registro serie a serie y descanso ─────────────
await shot('10-sesion')
const filas = page.locator('.set-row')
const totalSeries = await filas.count()
console.log('  → series a registrar:', totalSeries)
if (totalSeries === 0) {
  console.error('ERROR: la sesión no ofrece series que registrar')
  process.exit(1)
}

// Rellenar peso y repeticiones reales de la primera serie.
const primeraFila = filas.first()
const campos = primeraFila.locator('input')
if (await campos.count()) {
  await campos.nth(0).fill('12')
  await campos.nth(1).fill('10')
}
// La referencia visual del ejercicio, para salir de dudas.
await byText('¿Cómo se hace?').click()
await page.waitForTimeout(400)
if (!(await page.locator('.exercise-anim').count())) {
  console.error('ERROR: no aparece la animación del ejercicio')
  process.exit(1)
}
if (!(await page.locator('.exercise-anim animate').count())) {
  console.error('ERROR: la animación no tiene movimiento')
  process.exit(1)
}
console.log('  → animación del patrón con sus avisos de técnica')
await shot('10a-como-se-hace')
await byText('¿Cómo se hace?').click()

await primeraFila.locator('.check').click()
await page.waitForTimeout(400)

// El temporizador debe aparecer solo tras completar una serie que no es la última.
if (await page.locator('.rest-timer').count()) {
  console.log('  → temporizador de descanso arrancado solo')
  await shot('10b-descanso')
  await byText('Saltar descanso').click()
  await page.waitForTimeout(200)
  if (await page.locator('.rest-timer').count()) {
    console.error('ERROR: el descanso no se puede saltar')
    process.exit(1)
  }
} else {
  console.error('ERROR: el temporizador no arrancó al completar una serie')
  process.exit(1)
}

// Completar el resto de series.
const checks = page.locator('.set-row .check')
for (let i = 0; i < (await checks.count()); i++) {
  await checks.nth(i).click()
  await page.waitForTimeout(120)
  const saltar = page.getByText('Saltar descanso')
  if (await saltar.count()) await saltar.click()
}
await shot('10c-series-registradas')
await byText('Terminar').click()
await page.locator('.scale button').nth(3).click()
await shot('11-sensacion')
await byText('Guardar').click()
await shot('12-completada')

// ── Cuerpo: balance muscular y señal de leptina ───────────
await page.locator('.tab', { hasText: 'Cuerpo' }).click()

// ── Composición corporal ──────────────────────────────────
await byText('Anotar una medición').click()
const medida = page.locator('.card').filter({ hasText: 'COMPOSICIÓN CORPORAL' }).locator('input')
await medida.nth(0).fill('80')
await medida.nth(1).fill('20')
await medida.nth(2).fill('40')
await byText('Guardar medición').click()
await page.waitForTimeout(400)
// 80 kg con 20 % de grasa y 40 % de músculo → 16 kg de grasa, 32 de músculo, 64 magros.
for (const esperado of ['16 kg', '32 kg', '64 kg']) {
  if (!(await page.getByText(esperado, { exact: false }).count())) {
    console.error('ERROR: no muestra', esperado, 'en la composición corporal')
    process.exit(1)
  }
}
// Con 1,80 m: 64 kg magros / 1,8² = 19,8 de FFMI.
if (!(await page.getByText('FFMI 19.8').count())) {
  console.error('ERROR: el FFMI no cuadra con 64 kg magros y 1,80 m')
  process.exit(1)
}
console.log('  → composición: 16 kg grasa, 32 kg músculo, 64 kg magros, FFMI 19,8')
await shot('13-composicion')

// Sembrar un historial de recomposición para ver gráfica y veredicto.
await page.evaluate(() => {
  const datos = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date()
  datos.measurements = [0, 1, 2, 3].map((i) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - (3 - i) * 14)
    const peso = 80
    const grasa = 19 - i
    const musculo = 31 + i * 0.7
    return {
      date: d.toISOString().slice(0, 10),
      weightKg: peso,
      fatPercent: (grasa / peso) * 100,
      musclePercent: (musculo / peso) * 100
    }
  })
  localStorage.setItem('ritmo-data-v1', JSON.stringify(datos))
})
await page.reload()
await page.locator('.tab', { hasText: 'Cuerpo' }).click()
await page.waitForTimeout(600)

if (!(await page.locator('.trend-chart').count())) {
  console.error('ERROR: no se dibuja la gráfica de tendencia')
  process.exit(1)
}
const series = await page.locator('.trend-chart polyline').count()
const leyenda = await page.locator('.trend-legend').count()
if (series < 2 || !leyenda) {
  console.error('ERROR: la gráfica necesita dos series y leyenda; hay', series, 'y leyenda:', leyenda)
  process.exit(1)
}
const veredicto = await page.locator('.verdict .item-title').textContent()
console.log('  → gráfica con dos series y leyenda; veredicto:', veredicto)
if (!veredicto.toLowerCase().includes('recompon')) {
  console.error('ERROR: con grasa abajo y músculo arriba debería detectar recomposición')
  process.exit(1)
}
await page.locator('.trend-chart').scrollIntoViewIfNeeded()
await shot('13a-tendencia')

await shot('13-leptina')
await page.locator('.card').filter({ hasText: 'Balance muscular' }).scrollIntoViewIfNeeded()
await shot('13b-balance')

// ── Mesa: idea de comida ──────────────────────────────────
await page.locator('.tab', { hasText: 'Mesa' }).click()
await shot('14-mesa')
await byText('Dame una idea').click()
const primera = await page.locator('.card h2').first().textContent()
await shot('15-idea')
// Con pastillas de 1000 mg configuradas, debe decir cómo completar el objetivo.
const complemento = await page.getByText(/pastilla|cubre el objetivo/).count()
if (!complemento) {
  console.error('ERROR: no calcula el complemento con pastillas')
  process.exit(1)
}
await byText('Dame otra idea').click()
const segunda = await page.locator('.card h2').first().textContent()
console.log('  → primera idea:', primera)
console.log('  → segunda idea:', segunda)
if (primera === segunda) {
  console.error('ERROR: la sugerencia repitió el mismo plato')
  process.exit(1)
}
// La tarjeta del plato es la única con h2: así no la confundimos con la del objetivo.
const platoCard = page.locator('.card').filter({ has: page.locator('h2') })

// El DHA manda: sin filtros, toda sugerencia debe ser de DHA alto.
for (let i = 0; i < 6; i++) {
  await byText('Dame otra idea').click()
  await page.waitForTimeout(150)
  const etiqueta = await platoCard.locator('.tag').first().textContent()
  if (!etiqueta.includes('DHA alto')) {
    console.error('ERROR: sugerencia sin DHA alto →', etiqueta)
    process.exit(1)
  }
}
console.log('  → seis sugerencias seguidas, todas de DHA alto')

// Filtro por base y esfuerzo.
await byText('Marisco').click()
await byText('Sin cocinar').click()
await byText('Dame otra idea').click()
await shot('16-idea-filtrada')

// Aun pidiendo carne debe resolver el DHA, acompañándola de algo del mar.
await byText('Carne').click()
await byText('Da igual').click()
await byText('Dame otra idea').click()
await page.waitForTimeout(250)
const etiquetaCarne = await platoCard.locator('.tag').first().textContent()
if (!etiquetaCarne.includes('DHA alto')) {
  console.error('ERROR: con carne debería resolver el DHA con un acompañamiento marino →', etiquetaCarne)
  process.exit(1)
}
console.log('  → con carne resuelve el DHA:', await platoCard.locator('h2').textContent())
await shot('16b-carne-con-dha')

// Los lácteos sí son un callejón sin salida para el DHA: ahí debe avisar.
await byText('Lácteos').click()
await byText('Dame otra idea').click()
await page.waitForTimeout(250)
if (!(await page.getByText('no hay nada con DHA alto').count())) {
  console.error('ERROR: con lácteos debería avisar de que no hay DHA alto')
  process.exit(1)
}
console.log('  → con lácteos avisa honestamente de que no hay DHA alto')
await shot('16c-lacteos-sin-dha')
await byText('Lo que sea').click()

// El hígado de bacalao debe salir con su tope semanal por la vitamina A.
await byText('Pescado').click()
await byText('Ver los ').click()
await page.getByText('Hígado de bacalao en su aceite').first().click()
await page.waitForTimeout(400)
const tope = await page.getByText('Máximo 2 por semana').count()
const motivo = await page.getByText('vitamina A').count()
if (!tope || !motivo) {
  console.error('ERROR: el hígado de bacalao debe avisar del tope por vitamina A')
  process.exit(1)
}
console.log('  → hígado de bacalao con su tope semanal y el motivo')
await page.getByText('Máximo 2 por semana').scrollIntoViewIfNeeded()
await shot('16d-higado-bacalao')

// El recetario sigue abierto desde la comprobación anterior.
await page.locator('.card').filter({ hasText: 'PESCADO' }).first().scrollIntoViewIfNeeded()
await shot('17-recetario')

await page.locator('.tab', { hasText: 'Ajustes' }).click()
await shot('18-ajustes')

// ── Paletas horarias ──────────────────────────────────────
await page.locator('.tab', { hasText: 'Hoy' }).click()
for (const t of ['dawn', 'day', 'dusk', 'night']) {
  await page.evaluate((v) => (document.body.dataset.daytime = v), t)
  await shot(`19-paleta-${t}`)
}

await browser.close()
if (errors.length) {
  console.error('ERRORES EN CONSOLA:', errors)
  process.exit(1)
}
console.log('recorrido completo sin errores')
