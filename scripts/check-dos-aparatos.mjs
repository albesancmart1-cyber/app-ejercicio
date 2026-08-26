/**
 * Empezar a medir en un aparato y pararlo desde el otro.
 *
 * Es el recorrido que da sentido a tener cuenta: te dejas el sol corriendo en el
 * móvil, abres el ordenador, y allí no solo lo ves —ves que lleva veinte
 * minutos y **puedes apagarlo**, y al móvil se le apaga solo—.
 *
 * Las dos pestañas hablan con el **mismo** Firebase de mentira, que es la única
 * forma de probar esto de verdad: con dos simulacros separados, cada uno vería
 * lo suyo y no se demostraría nada.
 *
 *   node scripts/check-dos-aparatos.mjs
 */
import { chromium } from 'playwright-core'
import { montarFirebaseFalso, sesionesDelDia } from './firebase-falso.mjs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}
const errores = []

/**
 * Un aparato: su propio contexto, con su propio almacén.
 *
 * Contextos y no pestañas a propósito: dos pestañas del mismo navegador
 * comparten `localStorage`, así que compartirían sesión y datos y esto no
 * probaría nada. Un contexto por aparato es exactamente el móvil y el
 * ordenador.
 */
async function aparato(nube, nombre, ancho) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errores.push(`${nombre}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of 40\d/.test(m.text())) {
      errores.push(`${nombre}: ${m.text()}`)
    }
  })
  await nube.enchufar(page)
  await page.goto(BASE)
  await page.evaluate(
    ([d, n]) => {
      localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
      // El nombre del aparato se fija a mano para que el recorrido pueda
      // comprobar que la app dice de dónde salió cada cosa.
      localStorage.setItem('ritmo-aparato', n)
    },
    [sesionesDelDia([]), nombre]
  )
  await page.goto(BASE)
  await page.waitForTimeout(900)
  return { nombre, page }
}

/** Entrar con el correo y la contraseña, que es lo mismo en los dos sitios. */
async function entrar({ page }) {
  await page.getByText('Yo', { exact: true }).first().click()
  await page.waitForTimeout(600)
  const pestana = page.getByRole('tab', { name: 'Cuenta' })
  if ((await pestana.getAttribute('aria-selected')) !== 'true') {
    await pestana.click()
    await page.waitForTimeout(400)
  }
  const tarjeta = page.locator('.card').filter({ hasText: 'Tu cuenta' }).first()
  for (const [sel, valor] of [
    ['input[type="email"]', 'alberto@ejemplo.com'],
    ['input[type="password"]', 'unacontraseña']
  ]) {
    const campo = tarjeta.locator(sel)
    await campo.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await campo.fill(valor)
  }
  const boton = tarjeta.getByRole('button', { name: /^Entrar$/ })
  await boton.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await boton.click()
  await page.waitForTimeout(1600)
}

async function irAMedir({ page }) {
  await page.locator('.tab', { hasText: 'Medir' }).click()
  await page.waitForTimeout(600)
}

const baldosaSol = (page) => page.getByRole('button', { name: /^Sol/ }).first()

/** Un latido a mano: es el mismo camino que recorre el temporizador de verdad. */
async function latir({ page }) {
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.waitForTimeout(1800)
}

const enCurso = ({ page }) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')).enCurso ?? [])

// ── El mismo Firebase para los dos ────────────────────────
const nube = montarFirebaseFalso({
  datos: null,
  cuentas: { 'alberto@ejemplo.com': 'unacontraseña' }
})

const movil = await aparato(nube, 'el iPhone', 390)
const ordenador = await aparato(nube, 'el ordenador', 1200)

await entrar(movil)
await entrar(ordenador)
comprobar(
  nube.entradas.filter((x) => x.metodo === 'signInWithPassword').length === 2,
  `los dos aparatos deberían entrar con la misma contraseña: ${JSON.stringify(nube.entradas)}`
)

// ── El móvil empieza a tomar el sol ───────────────────────
await irAMedir(movil)
await baldosaSol(movil.page).click()
await movil.page.waitForTimeout(600)
// El sol pregunta piel y cielo antes de empezar: es el contexto del rato.
const empezar = movil.page.getByRole('button', { name: /Empezar/ })
if (await empezar.count()) {
  await empezar.first().click()
  await movil.page.waitForTimeout(600)
}

const enElMovil = await enCurso(movil)
comprobar(
  enElMovil.some((x) => x.tipo === 'sol'),
  `el móvil debería tener el sol en marcha: ${JSON.stringify(enElMovil)}`
)
comprobar(
  enElMovil.find((x) => x.tipo === 'sol')?.aparato === 'el iPhone',
  'el rato debería llevar apuntado en qué aparato empezó'
)
await movil.page.screenshot({ path: `${OUT}/dos-1-movil-midiendo.png` })

// Que llegue a la nube.
await latir(movil)
comprobar(
  (nube.datos?.enCurso ?? []).some((x) => x.tipo === 'sol'),
  `lo que está en marcha tiene que subir a la nube: ${JSON.stringify(nube.datos?.enCurso)}`
)

// ── El ordenador se entera ────────────────────────────────
await latir(ordenador)
const enElOrdenador = await enCurso(ordenador)
comprobar(
  enElOrdenador.some((x) => x.tipo === 'sol'),
  `el ordenador debería ver el sol en marcha: ${JSON.stringify(enElOrdenador)}`
)

await irAMedir(ordenador)
const textoOrdenador = await ordenador.page.locator('.card-wrap').innerText()
comprobar(
  /Ya estabas midiendo/.test(textoOrdenador),
  `el ordenador debería avisar de que esto venía de otro sitio: ${textoOrdenador.slice(0, 300)}`
)
comprobar(
  /el iPhone/.test(textoOrdenador),
  'y decir de qué aparato, que si no parece un fallo de la app'
)
comprobar(
  /parar(lo)? desde aquí/i.test(textoOrdenador),
  'y que se puede parar desde aquí, que es lo que nadie adivina'
)
await ordenador.page.screenshot({ path: `${OUT}/dos-2-ordenador-lo-ve.png` })

// ── Y lo para desde allí ──────────────────────────────────
await baldosaSol(ordenador.page).click()
await ordenador.page.waitForTimeout(800)
const parada = ordenador.page.getByRole('button', { name: /Parar|Dejarlo/ })
if (await parada.count()) {
  await parada.first().click()
  await ordenador.page.waitForTimeout(600)
}

comprobar(
  !(await enCurso(ordenador)).some((x) => x.tipo === 'sol'),
  'el ordenador debería haberlo parado'
)
const salidas = await ordenador.page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).salidas ?? []
)
comprobar(salidas.length > 0, 'al parar debería quedar guardado el rato de sol')

await latir(ordenador)
comprobar(
  (nube.datos?.enCurso ?? []).every((x) => x.tipo !== 'sol'),
  `la nube no debería seguir teniendo el sol en marcha: ${JSON.stringify(nube.datos?.enCurso)}`
)
comprobar(
  (nube.datos?.deleted ?? []).some((l) => l.clave.startsWith('curso:sol:')),
  'parar tiene que dejar lápida, o el móvil lo resucita en la siguiente subida'
)

// ── Y al móvil se le apaga solo ───────────────────────────
await latir(movil)
const alFinal = await enCurso(movil)
comprobar(
  !alFinal.some((x) => x.tipo === 'sol'),
  `al móvil se le tenía que haber apagado el sol: ${JSON.stringify(alFinal)}`
)
const salidasMovil = await movil.page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).salidas ?? []
)
comprobar(
  salidasMovil.length > 0,
  'y el rato medido tiene que estar también en el móvil, no solo donde se paró'
)
await movil.page.screenshot({ path: `${OUT}/dos-3-movil-apagado.png` })
console.log('  · el rato quedó guardado en los dos:', salidasMovil.length, 'y', salidas.length)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log(
  '✓ empezar en el móvil, verlo en el ordenador con su aparato dicho, pararlo desde allí y que al móvil se le apague solo sin perder el rato medido'
)
