/**
 * Entrar con contraseña y sincronizar, en navegador y contra un Firebase de
 * mentira.
 *
 * No hace falta un proyecto real para comprobar lo que importa: se intercepta el
 * tráfico a la nube y se responde como responde Firebase. Así se verifica lo que
 * es nuestro —entrar, crear la cuenta sola la primera vez, fusionar, subir y no
 * perder nada— sin depender de una cuenta ni de la red.
 *
 * Requiere una build hecha con las variables puestas:
 *   VITE_FIREBASE_API_KEY=clave VITE_FIREBASE_PROJECT_ID=falso npm run build
 *
 *   node scripts/check-nube.mjs
 */
import { chromium } from 'playwright-core'
import { montarFirebaseFalso, sesionesDelDia } from './firebase-falso.mjs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  // Un 400 de Firebase **es** la respuesta esperada al probar una contraseña
  // que no vale: el navegador lo apunta como error de red, pero el flujo lo
  // contempla, lo traduce y sigue.
  if (/status of 400/.test(m.text())) return
  errores.push(m.text())
})

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}
const datos = () => page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')))

/**
 * Pulsar dentro de la tarjeta.
 *
 * La barra de pestañas de «Yo» es pegajosa y se queda por encima: sin bajar
 * primero, el clic se lo lleva ella y el recorrido se cae con un «intercepts
 * pointer events» que no dice nada de la app.
 */
async function alCentro(loc) {
  // `scrollIntoViewIfNeeded` deja el elemento dentro de la ventana, pero puede
  // dejarlo justo debajo de la barra. Centrado no lo tapa nada.
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await new Promise((r) => setTimeout(r, 250))
}

async function pulsar(caja, nombre) {
  const boton = caja.getByRole('button', { name: nombre })
  await alCentro(boton)
  await boton.click()
}

async function escribir(caja, selector, texto) {
  const campo = caja.locator(selector)
  await alCentro(campo)
  await campo.fill(texto)
}

/** Yo → Cuenta, que es el grupo donde vive la tarjeta de la cuenta. */
async function irACuenta() {
  await page.getByText('Yo', { exact: true }).first().click()
  await page.waitForTimeout(600)
  const pestana = page.getByRole('tab', { name: 'Cuenta' })
  // Si ya está puesta no se vuelve a pulsar: el contenedor de las pestañas se
  // queda por encima y el clic no llega, que no es un fallo de la app.
  if ((await pestana.getAttribute('aria-selected')) !== 'true') {
    await pestana.click()
    await page.waitForTimeout(400)
  }
}

// ── El Firebase de mentira, compartido ────────────────────
const nube = montarFirebaseFalso({
  // Lo que «hay en la nube»: una sesión que este móvil no tiene.
  datos: sesionesDelDia([{ id: 'del-ordenador', date: '2026-08-01' }]),
  cuentas: { 'alberto@ejemplo.com': 'unacontraseña' }
})
await nube.enchufar(page)

// ── Este dispositivo, con su propia sesión ────────────────
await page.goto(BASE)
await page.evaluate((local) => localStorage.setItem('ritmo-data-v1', JSON.stringify(local)),
  sesionesDelDia([{ id: 'del-movil', date: '2026-08-02' }]))

await page.goto(BASE)
await page.waitForTimeout(700)
await irACuenta()

const tarjeta = page.locator('.card').filter({ hasText: 'Tu cuenta' })
comprobar(await tarjeta.count(), 'no aparece la tarjeta de cuenta en Yo · Cuenta')
if ((await tarjeta.count()) === 0) {
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}
await tarjeta.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/nube-1-fuera.png` })

// ── Una contraseña que no vale se explica y no entra ──────
await escribir(tarjeta, 'input[type="email"]', 'alberto@ejemplo.com')
await escribir(tarjeta, 'input[type="password"]', 'noeslabuena')
await pulsar(tarjeta, /^Entrar$/)
await page.waitForTimeout(900)
const conMala = await tarjeta.innerText()
comprobar(
  /correo o la contraseña/i.test(conMala),
  `una contraseña mala debería explicarse: ${conMala.slice(0, 200)}`
)
comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-sesion'))) === null,
  'una contraseña que no vale no puede dejar sesión guardada'
)

// Y el campo se vacía: la contraseña no se queda en pantalla.
comprobar(
  (await tarjeta.locator('input[type="password"]').inputValue()) === '',
  'la contraseña debería borrarse del campo tras el intento'
)
await page.screenshot({ path: `${OUT}/nube-2-mala.png` })

// ── La buena entra ────────────────────────────────────────
await escribir(tarjeta, 'input[type="password"]', 'unacontraseña')
await pulsar(tarjeta, /^Entrar$/)
await page.waitForTimeout(1500)

comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-sesion'))) !== null,
  'con la contraseña buena debería quedar la sesión guardada'
)
comprobar(
  nube.entradas.some((x) => x.metodo === 'signInWithPassword'),
  `debería entrar por contraseña: ${JSON.stringify(nube.entradas)}`
)
comprobar(
  !JSON.stringify(await page.evaluate(() => ({ ...localStorage }))).includes('unacontraseña'),
  'la contraseña no puede quedarse guardada en el dispositivo'
)

// ── Y al entrar, se han juntado los dos lados ─────────────
const local = await datos()
const ids = local.sessions.map((s) => s.id).sort()
comprobar(
  ids.includes('del-movil') && ids.includes('del-ordenador'),
  `deberían estar las sesiones de los dos dispositivos: ${JSON.stringify(ids)}`
)
console.log('  · tras entrar, aquí hay:', JSON.stringify(ids))

comprobar(nube.subidas > 0, 'no se ha subido nada a la nube')
const idsNube = nube.datos.sessions.map((s) => s.id).sort()
comprobar(
  idsNube.includes('del-movil') && idsNube.includes('del-ordenador'),
  `la nube debería quedarse con las dos: ${JSON.stringify(idsNube)}`
)
console.log('  · y en la nube:', JSON.stringify(idsNube))

await irACuenta()
const dentro = await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().innerText()
comprobar(/alberto@ejemplo.com/.test(dentro), `no dice con qué cuenta se ha entrado: ${dentro.slice(0, 120)}`)
await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/nube-3-dentro.png` })

// ── Sincronizar sin cambios no vuelve a escribir ──────────
// Con la app mirando la nube cada pocos segundos, dos dispositivos abiertos y
// quietos escribirían el mismo documento cientos de veces al día para nada.
const antesDeQuieto = nube.subidas
await pulsar(page.locator('.card').filter({ hasText: 'Tu cuenta' }).first(), /Sincronizar ahora/)
await page.waitForTimeout(1200)
comprobar(
  nube.subidas === antesDeQuieto,
  `sincronizar sin cambios no debería escribir: ${antesDeQuieto} → ${nube.subidas}`
)

// ── Lo borrado no vuelve ──────────────────────────────────
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.sessions = d.sessions.filter((s) => s.id !== 'del-ordenador')
  d.deleted = [{ clave: 'sesion:del-ordenador', at: Date.now() }]
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
nube.datos.sessions.push({
  id: 'del-ordenador',
  date: '2026-08-01',
  updatedAt: 5000,
  kind: 'fuerza',
  title: 'Fuerza · desde el ordenador',
  completed: true,
  exercises: []
})
await page.reload()
await page.waitForTimeout(1800)
const trasBorrar = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('ritmo-data-v1')).sessions.map((s) => s.id)
)
comprobar(
  !trasBorrar.includes('del-ordenador'),
  `lo borrado ha resucitado al sincronizar: ${JSON.stringify(trasBorrar)}`
)
console.log('  · tras borrar y sincronizar:', JSON.stringify(trasBorrar))

// ── Cerrar sesión no borra nada de aquí ───────────────────
await irACuenta()
const cuenta = page.locator('.card').filter({ hasText: 'Tu cuenta' }).first()
await cuenta.scrollIntoViewIfNeeded()
await pulsar(cuenta, /Cerrar sesión/)
await page.waitForTimeout(600)
const quedan = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).sessions.length
)
comprobar(quedan > 0, 'cerrar sesión ha borrado los datos de este dispositivo')
comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-sesion'))) === null,
  'cerrar sesión no ha soltado los testigos'
)

// El correo se queda para no volver a teclearlo; la contraseña, no.
comprobar(
  (await cuenta.locator('input[type="email"]').inputValue()) === 'alberto@ejemplo.com',
  'debería recordar el correo para la próxima vez'
)
await page.screenshot({ path: `${OUT}/nube-4-fuera.png` })

// ── Un correo nuevo se registra solo, sin botón aparte ────
// «Crear cuenta» y «entrar» son la misma intención escrita dos veces, y
// obligar a elegir el botón correcto solo sirve para equivocarse.
await escribir(cuenta, 'input[type="email"]', 'otra@ejemplo.com')
await escribir(cuenta, 'input[type="password"]', 'otracontraseña')
await pulsar(cuenta, /^Entrar$/)
await page.waitForTimeout(1500)
comprobar(
  nube.entradas.some((x) => x.metodo === 'signUp' && x.email === 'otra@ejemplo.com'),
  `un correo sin cuenta debería crearla: ${JSON.stringify(nube.entradas)}`
)
comprobar(
  nube.entradas.findIndex((x) => x.email === 'otra@ejemplo.com') >= 0 &&
    nube.entradas.filter((x) => x.email === 'otra@ejemplo.com')[0].metodo === 'signInWithPassword',
  'debería probar a entrar antes de crear, o cualquiera podría averiguar qué correos existen'
)
await page.screenshot({ path: `${OUT}/nube-5-cuenta-nueva.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log(
  '✓ entrar con contraseña, crear la cuenta sola la primera vez, fusionar los dos dispositivos, no escribir de más, no resucitar lo borrado y salir sin perder nada'
)
