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
const recomendado = await page.locator('.decision-titulo').first().textContent()
console.log('  → recomienda:', recomendado)
await byText('Con todo el detalle').click()
await shot('09-por-que')

// Pesas sin renunciar al cardio: la opción intermedia, cuando lo que tocaba era cardio.
const botonMixto = page.getByText('Pesas sin quitar el cardio')
if (await botonMixto.count()) {
  const minutosAntes = Number(
    (await page.locator('.card').first().textContent()).match(/(\d+)\s*min/)?.[1] ?? 0
  )
  await botonMixto.click()
  await page.waitForTimeout(300)
  const mixto = await page.locator('.eyebrow').nth(1).textContent()
  if (!/pesas y cardio/i.test(mixto)) {
    console.error('ERROR: la opción mixta no cambió la recomendación →', mixto)
    process.exit(1)
  }
  console.log('  → mixta:', mixto)
  await shot('09c-mixta')
  await byText('Empezar entreno').click()
  await page.waitForTimeout(400)
  const nombres = await page.locator('.item-title').allTextContents()
  const filas = await page.locator('.set-row').count()
  const ultimo = nombres[nombres.length - 1]
  if (!/camin|bici|trote|escalera|comba|remo en m|movilidad/i.test(ultimo)) {
    console.error('ERROR: en la mixta el cardio debe ir el último →', nombres.join(' / '))
    process.exit(1)
  }
  if (nombres.length < 3) {
    console.error('ERROR: la mixta debería traer pesas además del cardio →', nombres.join(' / '))
    process.exit(1)
  }
  console.log('  → la mixta trae', nombres.length - 1, 'de fuerza y el cardio al final:', ultimo)
  if (minutosAntes) console.log('  → cardio recortado desde', minutosAntes, 'min')
  await shot('09d-plan-mixto')
  await byText('Hoy no puedo').click()
  await page.waitForTimeout(400)
  // Volver a la recomendación para seguir el recorrido normal.
  await byText('Empezar').click()
  await page.waitForTimeout(200)
  await byText('Ver qué me conviene').click()
  await page.waitForTimeout(300)
}

// Subir el listón: pesas en vez de lo que tocara, si la app lo permite.
const botonPesas = page.getByText('Prefiero algo con pesas')
if (await botonPesas.count()) {
  await botonPesas.click()
  await page.waitForTimeout(300)
  const subido = await page.locator('.decision-titulo').first().textContent()
  console.log('  → tras pedir pesas:', subido)
  // La zona puede seguir siendo la misma —lo que cambia es la intensidad—, así
  // que lo que se comprueba es que la app reconozca que va a petición tuya.
  if (!(await page.getByText('A petición tuya').count())) {
    console.error('ERROR: pedir pesas no cambió la recomendación')
    process.exit(1)
  }
  await shot('09b-con-pesas')
  await byText('Volver a lo que me tocaba').click()
  await page.waitForTimeout(300)
  await botonPesas.click()
  await page.waitForTimeout(300)
}
await byText('Empezar entreno').click()

// ── El plan, antes de arrancar nada ───────────────────────
await shot('10-plan')
if (!(await page.getByText('Empezar entrenamiento').count())) {
  console.error('ERROR: debería mostrar el plan y esperar a que empieces')
  process.exit(1)
}

// Cambiar un ejercicio que no encaja. Un toque, y elige la app.
const nombreOriginal = await page.locator('.item-title').first().textContent()
await page.getByRole('button', { name: 'Cambiar ejercicio' }).first().click()
await page.waitForTimeout(500)
if (await page.locator('.picker').count()) {
  console.error('ERROR: cambiar de un toque no debe abrir ninguna lista')
  process.exit(1)
}
const trasUnToque = await page.locator('.item-title').first().textContent()
if (trasUnToque === nombreOriginal) {
  console.error('ERROR: el toque no cambió el ejercicio →', nombreOriginal)
  process.exit(1)
}
console.log('  → un toque:', nombreOriginal, '→', trasUnToque)
await shot('10a0-cambiado-solo')

// Y si aun así uno quiere elegirlo a mano, la lista sigue estando.
const nombreAntes = await page.locator('.item-title').first().textContent()
await page.getByText('Elegirlo yo de la lista').first().click()
await page.waitForTimeout(400)
if (!(await page.locator('.picker').count())) {
  console.error('ERROR: «elegirlo yo de la lista» debe abrir la lista')
  process.exit(1)
}
const opciones = await page.locator('.picker-pick').count()
if (opciones < 3) {
  console.error('ERROR: la lista debería ofrecer varias opciones; hay', opciones)
  process.exit(1)
}
console.log('  → la lista ofrece', opciones, 'ejercicios para ese músculo')
await shot('10a1-lista')

// Marcar un favorito desde la propia lista y elegir ese mismo ejercicio.
const elegido = await page.locator('.picker-pick .item-title').nth(1).textContent()
await page.locator('.picker-star').nth(1).click()
await page.waitForTimeout(150)
if ((await page.locator('.picker-star[aria-pressed="true"]').count()) === 0) {
  console.error('ERROR: la estrella no marcó el favorito')
  process.exit(1)
}
// Marcarlo favorito lo sube al principio de la lista: se busca por nombre, no por posición.
if ((await page.locator('.picker-pick .item-title').first().textContent()) !== elegido) {
  console.error('ERROR: marcar favorito debería subirlo al principio de la lista')
  process.exit(1)
}
await page.locator('.picker-pick').filter({ hasText: elegido }).first().click()
await page.waitForTimeout(400)
if (await page.locator('.picker').count()) {
  console.error('ERROR: elegir de la lista debería cerrarla')
  process.exit(1)
}
const nombreDespues = await page.locator('.item-title').first().textContent()
if (nombreAntes === nombreDespues || nombreDespues !== elegido) {
  console.error('ERROR: no puso el ejercicio elegido →', nombreAntes, '/', nombreDespues, '/', elegido)
  process.exit(1)
}
console.log('  → cambia', nombreAntes, '→', nombreDespues, '(elegido a mano)')
await shot('10a-cambiado')

// Buscar por nombre y añadir un ejercicio más a la sesión.
const cuantosAntes = await page.locator('.set-row').count()
await page.getByText('Añadir un ejercicio de la lista').click()
await page.waitForTimeout(300)
// Sin tilde: la búsqueda debe encontrar «Curl de bíceps» igualmente.
await page.getByPlaceholder('Buscar por nombre').fill('biceps')
await page.waitForTimeout(300)
const resultados = await page.locator('.picker-pick').count()
if (resultados === 0) {
  console.error('ERROR: la búsqueda sin tilde no encuentra «bíceps»')
  process.exit(1)
}
// Para añadir hace falta uno que no esté ya en la sesión: los que están salen
// deshabilitados, y desde que la app elige por músculo el curl de bíceps es de
// los primeros que propone sola. Se vacía la búsqueda y se coge el primero libre.
await page.getByPlaceholder('Buscar por nombre').fill('')
await page.waitForTimeout(300)
const libres = page.locator('.picker-pick:not([disabled])')
if ((await libres.count()) === 0) {
  console.error('ERROR: no hay ningún ejercicio disponible para añadir')
  process.exit(1)
}
const anadido = await libres.locator('.item-title').first().textContent()
await libres.first().click()
await page.waitForTimeout(400)
if (!(await page.getByText(anadido, { exact: false }).count())) {
  console.error('ERROR: el ejercicio añadido no aparece en la sesión →', anadido)
  process.exit(1)
}
if ((await page.locator('.set-row').count()) <= cuantosAntes) {
  console.error('ERROR: añadir un ejercicio no sumó series a la sesión')
  process.exit(1)
}
console.log('  → añadido de la lista:', anadido)
await shot('10a2-anadido')

// La forma de hacerlo: con qué y a uno o dos lados. Cambia el peso sugerido.
const conVariantes = page.locator('.card').filter({ has: page.locator('.variant-row') }).first()
if (!(await conVariantes.count())) {
  console.error('ERROR: ningún ejercicio ofrece elegir cómo se hace')
  process.exit(1)
}
await conVariantes.scrollIntoViewIfNeeded()
const metaAntesVariante = await conVariantes.locator('.item-meta').first().textContent()
const unLado = conVariantes.getByText('A un lado cada vez')
if (!(await unLado.count())) {
  console.error('ERROR: falta la opción de hacerlo a un lado cada vez')
  process.exit(1)
}
await unLado.click()
await page.waitForTimeout(300)
const metaConVariante = await conVariantes.locator('.item-meta').first().textContent()
if (!metaConVariante.includes('a un lado cada vez')) {
  console.error('ERROR: la forma elegida no queda anotada en el plan →', metaConVariante)
  process.exit(1)
}
if (metaConVariante === metaAntesVariante) {
  console.error('ERROR: elegir la forma no cambió nada del plan')
  process.exit(1)
}
console.log('  → forma anotada:', metaConVariante.trim())
await shot('10a3-variante')

// Quitar un ejercicio que sobra.
const antesDeQuitar = await page.locator('.item-title').allTextContents()
const aQuitar = antesDeQuitar[1]
await page.locator('.card').filter({ hasText: aQuitar }).getByText('Quitar', { exact: true }).click()
await page.waitForTimeout(400)
const trasQuitar = await page.locator('.item-title').allTextContents()
if (trasQuitar.length !== antesDeQuitar.length - 1 || trasQuitar.includes(aQuitar)) {
  console.error('ERROR: quitar no sacó el ejercicio →', antesDeQuitar.join(' / '), '→', trasQuitar.join(' / '))
  process.exit(1)
}
if (!(await page.getByText(`Quitado: ${aQuitar}`).count())) {
  console.error('ERROR: quitar debería decir qué ha quitado')
  process.exit(1)
}
console.log('  → quitado de hoy:', aQuitar, '· quedan', trasQuitar.length)
await shot('10a4-quitado')

// Reordenar.
const primeroAntes = await page.locator('.item-title').first().textContent()
await page.locator('.reorder button', { hasText: '↓' }).first().click()
await page.waitForTimeout(300)
const primeroDespues = await page.locator('.item-title').first().textContent()
if (primeroAntes === primeroDespues) {
  console.error('ERROR: reordenar no cambió el orden')
  process.exit(1)
}
console.log('  → reordenado:', primeroAntes, 'baja')

// Arrancar el cronómetro.
await page.getByText('Empezar entrenamiento').click()
await page.waitForTimeout(2200)
const crono = await page.locator('.chrono').textContent()
if (!crono || !/\d+:\d\d/.test(crono)) {
  console.error('ERROR: el cronómetro no arrancó →', crono)
  process.exit(1)
}
console.log('  → cronómetro en marcha:', crono)
await shot('10b-en-marcha')

// ── Sesión: registro serie a serie y descanso ─────────────
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

// Salir a otra pestaña a mitad de entrenamiento no puede borrar lo anotado.
await page.locator('.tab', { hasText: 'Progreso' }).click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(500)
await page.locator('.tab', { hasText: 'Hoy' }).click()
await page.waitForTimeout(500)
const camposTrasVolver = page.locator('.set-row').first().locator('input')
const pesoTrasVolver = await camposTrasVolver.nth(0).inputValue()
const repsTrasVolver = await camposTrasVolver.nth(1).inputValue()
if (pesoTrasVolver !== '12' || repsTrasVolver !== '10') {
  console.error(
    'ERROR: cambiar de pestaña borró lo anotado →',
    `peso "${pesoTrasVolver}", reps "${repsTrasVolver}"`
  )
  process.exit(1)
}
if (!(await page.locator('.chrono').count())) {
  console.error('ERROR: al volver a la pestaña el cronómetro debería seguir en marcha')
  process.exit(1)
}
console.log('  → al volver de otra pestaña se conserva lo anotado y el cronómetro')
await shot('10b2-vuelta-de-pestana')

// La referencia visual del ejercicio, para salir de dudas.
await page.getByText('¿Cómo se hace?').first().click()
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
await shot('10e-como-se-hace')
await byText('¿Cómo se hace?').click()

await primeraFila.locator('.check').click()
await page.waitForTimeout(400)

// El descanso toma la pantalla entera tras completar una serie que no es la
// última, y enseña lo que acabas de hacer y lo que viene.
if (await page.locator('.rest-screen').count()) {
  console.log('  → pantalla de descanso arrancada sola')
  await shot('10f-descanso-serie')
  await byText('Saltar descanso').click()
  await page.waitForTimeout(300)
  if (await page.locator('.rest-screen').count()) {
    console.error('ERROR: el descanso no se puede saltar')
    process.exit(1)
  }
} else {
  console.error('ERROR: el descanso no arrancó al completar una serie')
  process.exit(1)
}

// Terminar el PRIMER ejercicio: al marcar su última serie debe saltar el
// descanso entre ejercicios, anunciando el siguiente. Hay que comprobarlo aquí,
// antes de descartarlo, o el propio recorrido lo salta y no se ve.
const primerEjercicio = page.locator('.card').filter({ has: page.locator('.set-row') }).first()
const seriesPrimero = primerEjercicio.locator('.set-row .check')
const nSeriesPrimero = await seriesPrimero.count()
for (let i = 1; i < nSeriesPrimero; i++) {
  await seriesPrimero.nth(i).click()
  await page.waitForTimeout(250)
  if (i < nSeriesPrimero - 1) {
    const saltar = page.getByText('Saltar descanso')
    if (await saltar.count()) await saltar.click()
  }
}
const anuncioSiguiente = await page.locator('.rest-siguiente').count()
if (!anuncioSiguiente) {
  console.error('ERROR: al terminar un ejercicio el descanso debe anunciar el siguiente')
  process.exit(1)
}
const etiqueta = await page.locator('.rest-siguiente .item-title').first().textContent()
console.log('  → descanso entre ejercicios, viene:', etiqueta.trim())
await shot('10d-descanso-entre-ejercicios')
await byText('Saltar descanso').click()

// Completar el resto de series.
const checks = page.locator('.set-row .check')
for (let i = 0; i < (await checks.count()); i++) {
  const marcado = await checks.nth(i).getAttribute('aria-pressed')
  if (marcado === 'true') continue
  await checks.nth(i).click()
  await page.waitForTimeout(150)
  const saltar = page.getByText('Saltar descanso')
  if (await saltar.count()) await saltar.click()
}
await shot('10c-series-registradas')

await byText('Terminar').click()
await page.locator('.scale button').nth(3).click()
await shot('11-sensacion')
await page.getByRole('button', { name: 'Guardar el entreno' }).click()
await shot('12-completada')

// ── Cuerpo: balance muscular y señal de leptina ───────────
await page.locator('.tab', { hasText: 'Progreso' }).click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()

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
await page.locator('.tab', { hasText: 'Progreso' }).click()
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Cuerpo' }).click()
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

// Volumen músculo a músculo: la vista que sustituyó al balance por grupos.
const volumen = page.locator('.card').filter({ hasText: 'Volumen por músculo' })
await volumen.scrollIntoViewIfNeeded()
// Una región llega abierta sola —la primera con algo bajo mínimo—, así que solo
// hay que abrir si no lo está ya.
const region = volumen.locator('.region-head').first()
if ((await region.getAttribute('aria-expanded')) !== 'true') {
  await region.click()
  await page.waitForTimeout(400)
}
if ((await volumen.locator('.zbar').count()) === 0) {
  console.error('ERROR: la región abierta no enseña ninguna barra de volumen')
  process.exit(1)
}
const musculo = volumen.locator('.mrow-head').first()
const seriesTexto = await musculo.locator('.mrow-series').textContent()
if (!/\d,\d/.test(seriesTexto)) {
  console.error('ERROR: las series no se enseñan con decimal →', seriesTexto)
  process.exit(1)
}
await musculo.click()
await page.waitForTimeout(400)
if ((await volumen.locator('.mrow-detail').count()) === 0) {
  console.error('ERROR: el músculo no despliega su desglose')
  process.exit(1)
}
console.log('  → volumen por músculo, primera barra:', seriesTexto.trim())
await shot('13b-volumen-musculo')

await page.locator('.card').filter({ hasText: 'Reparto por zonas' }).scrollIntoViewIfNeeded()
await shot('13c-reparto')

// ── Mesa: idea de comida ──────────────────────────────────
await page.locator('.tab', { hasText: 'Cocina' }).click()
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

await page.locator('.tab', { hasText: 'Yo' }).click()
await shot('18-ajustes')

// Los favoritos marcados durante la sesión deben estar aquí, y poderse ampliar.
const tarjetaFav = page.locator('.card').filter({ hasText: 'Ejercicios favoritos' })
if (!(await tarjetaFav.count())) {
  console.error('ERROR: falta la tarjeta de ejercicios favoritos en Ajustes')
  process.exit(1)
}
await tarjetaFav.scrollIntoViewIfNeeded()
const favGuardado = await tarjetaFav.locator('.item-title').first().textContent()
if (!favGuardado) {
  console.error('ERROR: el favorito marcado durante la sesión no se guardó')
  process.exit(1)
}
console.log('  → favorito guardado:', favGuardado)
await shot('18b-favoritos')

await tarjetaFav.getByText('Elegir favoritos del catálogo').click()
await page.waitForTimeout(400)
if (!(await page.locator('.picker').count())) {
  console.error('ERROR: Ajustes debería abrir el catálogo para marcar favoritos')
  process.exit(1)
}
const marcados = await page.locator('.picker-star[aria-pressed="true"]').count()
if (marcados === 0) {
  console.error('ERROR: el catálogo no refleja los favoritos ya marcados')
  process.exit(1)
}
await shot('18c-catalogo-favoritos')
await page.locator('.picker-close').click()
await page.waitForTimeout(300)

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
