/**
 * Las gafas de bloqueo en la higiene nocturna, en navegador.
 *
 * Lo que tiene que pasar: que se pueda decir «me las puse a las nueve», que ese
 * rato sume noche **pero no entero**, que las dos cifras se enseñen por
 * separado —una noche medida y una noche ayudada no pueden salir con el mismo
 * número—, que la tabla de costes traiga las dos columnas, y que la fila que
 * las gafas no arreglan siga sin arreglarse.
 *
 *   node scripts/check-gafas.mjs
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
const datos = () => page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')))

const HOY = new Date().toISOString().slice(0, 10)

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
        heightCm: 178,
        lat: 40.4165,
        lon: -3.7026,
        sitio: 'Madrid'
      },
      checkIns: [],
      sessions: [],
      measurements: []
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Luz' }).click()
await page.waitForTimeout(600)

const higiene = page.locator('.card').filter({ hasText: 'Higiene de luz' }).first()
comprobar(await higiene.count(), 'no aparece la tarjeta de higiene de luz')
if ((await higiene.count()) === 0) {
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}

// ── La barra de oscuridad, antes de apuntar nada ───────────────────────
const suficiente = page.locator('.card').filter({ hasText: '¿Suficiente hoy?' }).first()
await suficiente.scrollIntoViewIfNeeded()
const balanceAntes = await suficiente.innerText()
comprobar(
  /Sin apuntar/i.test(balanceAntes),
  `sin noche apuntada la barra no debería inventarse un cero: ${balanceAntes.slice(0, 200)}`
)

// ── Apuntar la noche con gafas rojas ───────────────────────────────────
await higiene.scrollIntoViewIfNeeded()
await higiene.getByRole('button', { name: /Apuntar la noche/ }).click()
await page.waitForTimeout(300)

comprobar(
  /¿Y antes, con gafas\?/.test(await higiene.innerText()),
  'el formulario debería preguntar por las gafas'
)
// Sin elegir gafas no hay campo de hora: un filtro suelto sin tramo no suma.
comprobar(
  (await higiene.getByLabel('Hora en que me puse las gafas').count()) === 0,
  'el campo de la hora no debería salir antes de elegir unas gafas'
)

await higiene.getByLabel('Hora en que se apagó todo').fill('23:00')
await higiene.getByLabel('Hora en que me levanté').fill('06:00')
await higiene.getByRole('button', { name: 'Gafas rojas', exact: true }).click()
await page.waitForTimeout(300)
comprobar(
  /550 nm/.test(await higiene.innerText()),
  'al elegir las rojas debería decir por dónde cortan'
)
await higiene.getByLabel('Hora en que me puse las gafas').fill('21:00')
await higiene.scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/gafas-1-formulario.png` })
await higiene.getByRole('button', { name: 'Guardar la noche' }).click()
await page.waitForTimeout(500)

const noche = (await datos()).noches?.find((n) => n.date === HOY)
comprobar(noche !== undefined, 'no se ha guardado la noche')
comprobar(
  noche?.gafas === 'rojo' && noche?.gafasDesde === 21 * 60,
  `la noche debería llevar las gafas dentro: ${JSON.stringify(noche)}`
)

// ── Se enseñan las dos cifras, no una sola ─────────────────────────────
const resumen = await higiene.innerText()
comprobar(/7 h/.test(resumen), `debería decir las 7 h a oscuras de verdad: ${resumen.slice(0, 300)}`)
comprobar(/2 h/.test(resumen), 'y las 2 h con las gafas puestas, por separado')
comprobar(
  /Noche que cuenta/.test(resumen),
  'debería decir cuánta noche cuenta al final, con la suma ya hecha'
)
comprobar(
  /no los .* enteros|vale/.test(resumen),
  `debería decir que ese rato no vale entero: ${resumen.slice(0, 400)}`
)
await higiene.scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/gafas-2-noche-guardada.png` })

// ── Y la barra de oscuridad lo recoge, con las dos cosas dichas ────────
await suficiente.scrollIntoViewIfNeeded()
const balance = await suficiente.innerText()
comprobar(
  /a oscuras/.test(balance) && /con gafas/.test(balance),
  `la barra debería decir lo medido y lo ayudado por separado: ${balance.slice(0, 400)}`
)
await page.screenshot({ path: `${OUT}/gafas-3-balance.png` })

// ── Las ámbar valen menos, y se nota ───────────────────────────────────
await higiene.scrollIntoViewIfNeeded()
await higiene.getByRole('button', { name: /Corregir la noche/ }).click()
await page.waitForTimeout(300)
await higiene.getByRole('button', { name: 'Gafas ámbar', exact: true }).click()
await higiene.getByRole('button', { name: 'Guardar la noche' }).click()
await page.waitForTimeout(500)
const conAmbar = await higiene.innerText()
const minutos = (t) => {
  const m = /Noche que cuenta\s*\n?\s*(\d+) h (\d+) min/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
comprobar(
  minutos(conAmbar) !== null && minutos(resumen) !== null,
  `no se lee la noche que cuenta: ${conAmbar.slice(0, 300)}`
)
comprobar(
  minutos(conAmbar) < minutos(resumen),
  `con ámbar debería contar menos que con rojas: ${minutos(conAmbar)} vs ${minutos(resumen)}`
)
console.log('  · la misma noche cuenta', minutos(resumen), 'min con rojas y', minutos(conAmbar), 'con ámbar')

// ── La tabla de costes, con sus dos columnas ───────────────────────────
await higiene.getByRole('button', { name: /Qué cuesta cada cosa encendida/ }).click()
await page.waitForTimeout(300)
const tabla = await higiene.innerText()
comprobar(/Sin gafas · con gafas/.test(tabla), 'la tabla debería traer las dos columnas nombradas')
comprobar(/−90 · −10 min/.test(tabla), `la luz del techo debería bajar mucho con gafas: ${tabla.slice(0, 500)}`)
// La fila que no se arregla con nada: duermes sin ellas.
comprobar(
  /−30 · −30 min/.test(tabla),
  'dormir con luz de la calle entrando no lo tapan las gafas, y tiene que verse'
)
comprobar(/480 nm/.test(tabla), 'debería explicar por qué las gafas bajan tanto')
comprobar(
  /no las llevas puestas en la cama|persiana o antifaz/i.test(tabla),
  'debería decir lo que las gafas no tapan'
)
await higiene.scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/gafas-4-costes.png`, fullPage: true })

// ── Quitar las gafas las quita de verdad ───────────────────────────────
await higiene.getByRole('button', { name: /Corregir la noche/ }).click()
await page.waitForTimeout(300)
await higiene.getByRole('button', { name: 'Sin gafas', exact: true }).click()
await higiene.getByRole('button', { name: 'Guardar la noche' }).click()
await page.waitForTimeout(500)
const sinGafas = (await datos()).noches?.find((n) => n.date === HOY)
comprobar(
  sinGafas?.gafas === undefined && sinGafas?.gafasDesde === undefined,
  `quitar las gafas debería quitarlas del dato: ${JSON.stringify(sinGafas)}`
)
comprobar(
  !/Noche que cuenta/.test(await higiene.innerText()),
  'sin gafas no debería quedar rastro de la cuenta ayudada'
)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log(
  '✓ las gafas se apuntan, suman noche sin valer lo que dura, se enseñan aparte de lo medido, y la fila que no arreglan sigue sin arreglarse'
)
