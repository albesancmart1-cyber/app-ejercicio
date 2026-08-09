/**
 * Iniciar sesión y sincronizar, en navegador y contra un Supabase de mentira.
 *
 * No hace falta un proyecto real para comprobar lo que importa: se intercepta el
 * tráfico a la nube y se responde como responde Supabase. Así se verifica lo que
 * es nuestro —pedir el enlace, recoger la sesión del fragmento de la URL,
 * descargar, fusionar, subir y no perder nada— sin depender de una cuenta ni de
 * la red.
 *
 * Requiere una build hecha con las variables puestas:
 *   VITE_SUPABASE_URL=https://falso.supabase.co VITE_SUPABASE_ANON_KEY=clave npm run build
 *
 *   node scripts/check-nube.mjs
 */
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const NUBE = 'https://falso.supabase.co'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  // Un 403 del endpoint de validación **es** la respuesta esperada cuando se
  // prueba una etiqueta de código que no era: el navegador lo apunta como error
  // de red, pero el flujo lo contempla y sigue. Contarlo como fallo obligaría a
  // no probar más de una etiqueta, que es justo lo que hay que hacer.
  if (/status of 403/.test(m.text())) return
  errores.push(m.text())
})

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

// ── El Supabase de mentira ────────────────────────────────
/** Lo que «hay en la nube». Empieza con una sesión que este móvil no tiene. */
let enLaNube = {
  version: 2,
  profile: {
    name: 'Alberto',
    goal: 'recomposicion',
    equipment: ['peso_corporal', 'mancuernas'],
    maxWeights: { mancuernas: 24 }
  },
  profileUpdatedAt: 1000,
  checkIns: [],
  sessions: [
    {
      id: 'del-ordenador',
      date: '2026-08-01',
      updatedAt: 5000,
      kind: 'fuerza',
      title: 'Fuerza · desde el ordenador',
      completed: true,
      exercises: []
    }
  ],
  measurements: []
}
let subidas = 0
let enlacesPedidos = []
/** A dónde le pedimos a Supabase que devuelva el enlace del correo. */
let vueltaPedida = null
/** Con qué etiquetas se ha intentado validar el acceso. */
let tiposProbados = []
/** El testigo que llevaría dentro el enlace del correo. */
const TESTIGO = 'pkce_abc123def456ghi789jkl'
const ENLACE = `${NUBE}/auth/v1/verify?token=${TESTIGO}&type=magiclink&redirect_to=${BASE}`

await page.route(`${NUBE}/**`, async (route) => {
  const req = route.request()
  const url = new URL(req.url())
  const ruta = url.pathname

  if (ruta === '/auth/v1/otp') {
    enlacesPedidos.push(JSON.parse(req.postData() ?? '{}').email)
    vueltaPedida = url.searchParams.get('redirect_to')
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  }
  if (ruta === '/auth/v1/verify') {
    const c = JSON.parse(req.postData() ?? '{}')
    tiposProbados.push(c.type)
    // Como una cuenta recién creada: solo vale la etiqueta «signup», que es la
    // que el cliente no puede adivinar desde fuera. Y vale tanto el código
    // tecleado como el testigo sacado de un enlace pegado.
    const valeCodigo = c.token === '424242'
    const valeEnlace = c.token_hash === TESTIGO
    if (c.type !== 'signup' || !(valeCodigo || valeEnlace)) {
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'tok-codigo',
        refresh_token: 'ref-codigo',
        expires_in: 3600,
        user: { email: 'alberto@ejemplo.com' }
      })
    })
  }
  if (ruta === '/auth/v1/user') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ email: 'alberto@ejemplo.com' })
    })
  }
  if (ruta.startsWith('/rest/v1/ritmo_datos')) {
    if (req.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ datos: enLaNube }])
      })
    }
    if (req.method() === 'POST') {
      subidas += 1
      enLaNube = JSON.parse(req.postData() ?? '[]')[0].datos
      return route.fulfill({ status: 201, body: '' })
    }
  }
  return route.fulfill({ status: 404, body: '' })
})

// ── Este dispositivo, con su propia sesión ────────────────
await page.goto(BASE)
await page.evaluate(() => {
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        equipment: ['peso_corporal', 'mancuernas'],
        maxWeights: { mancuernas: 24 }
      },
      profileUpdatedAt: 500,
      checkIns: [],
      sessions: [
        {
          id: 'del-movil',
          date: '2026-08-02',
          updatedAt: 9000,
          kind: 'fuerza',
          title: 'Fuerza · desde el móvil',
          completed: true,
          exercises: []
        }
      ],
      measurements: []
    })
  )
})

// ── Pedir el enlace ───────────────────────────────────────
await page.goto(BASE)
await page.waitForTimeout(700)
await page.getByText('Yo', { exact: true }).first().click()
await page.waitForTimeout(600)

const tarjeta = page.locator('.card').filter({ hasText: 'Tu cuenta' })
comprobar(await tarjeta.count(), 'no aparece la tarjeta de cuenta en Ajustes')
if ((await tarjeta.count()) === 0) {
  console.error('✗ ' + fallos.join('\n✗ '))
  await browser.close()
  process.exit(1)
}
await tarjeta.first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/nube-1-fuera.png` })

await tarjeta.locator('input[type="email"]').fill('alberto@ejemplo.com')
await tarjeta.getByRole('button', { name: /Mandarme el acceso/ }).click()
await page.waitForTimeout(700)
comprobar(
  enlacesPedidos.includes('alberto@ejemplo.com'),
  `no se pidió el enlace: ${JSON.stringify(enlacesPedidos)}`
)
const trasPedir = await tarjeta.innerText()
comprobar(
  /a alberto@ejemplo\.com/i.test(trasPedir),
  `no confirma el envío: ${trasPedir.slice(0, 160)}`
)
await page.screenshot({ path: `${OUT}/nube-2-enlace.png` })

// La dirección de vuelta va en la URL, que es donde la API la lee. Mandarla en
// el cuerpo —como acepta la biblioteca de Supabase— la ignora en silencio y el
// enlace acaba en la raíz del dominio, con un 404 de GitHub Pages.
comprobar(vueltaPedida !== null, 'no se le dice a Supabase a dónde tiene que volver el enlace')
comprobar(
  vueltaPedida === new URL(BASE).origin + new URL(BASE).pathname,
  `la vuelta del enlace no apunta a la app: ${vueltaPedida}`
)
console.log('  · el enlace volverá a:', vueltaPedida)

// ── Volver desde el enlace del correo ─────────────────────
// Como si se abriera desde el correo: carga limpia con el fragmento puesto.
await page.goto('about:blank')
await page.goto(`${BASE}#access_token=tok-123&refresh_token=ref-456&expires_in=3600&token_type=bearer`)
await page.waitForTimeout(1800)

const urlLimpia = page.url()
comprobar(!urlLimpia.includes('access_token'), `el token se queda en la barra de direcciones: ${urlLimpia}`)

const sesionGuardada = await page.evaluate(() => localStorage.getItem('ritmo-sesion'))
comprobar(sesionGuardada !== null, 'no se guardó la sesión al volver del enlace')

// ── Y al entrar, se han juntado los dos lados ─────────────
const local = await page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')))
const ids = local.sessions.map((s) => s.id).sort()
comprobar(
  ids.includes('del-movil') && ids.includes('del-ordenador'),
  `deberían estar las sesiones de los dos dispositivos: ${JSON.stringify(ids)}`
)
console.log('  · tras entrar, aquí hay:', JSON.stringify(ids))

comprobar(subidas > 0, 'no se ha subido nada a la nube')
const idsNube = enLaNube.sessions.map((s) => s.id).sort()
comprobar(
  idsNube.includes('del-movil') && idsNube.includes('del-ordenador'),
  `la nube debería quedarse con las dos: ${JSON.stringify(idsNube)}`
)
console.log('  · y en la nube:', JSON.stringify(idsNube))

await page.getByText('Yo', { exact: true }).first().click()
await page.waitForTimeout(600)
const dentro = await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().innerText()
comprobar(/alberto@ejemplo.com/.test(dentro), `no dice con qué cuenta se ha entrado: ${dentro.slice(0, 120)}`)
await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/nube-3-dentro.png` })

// ── Lo borrado no vuelve ──────────────────────────────────
// La nube todavía tiene una sesión que aquí se descarta: al sincronizar otra
// vez no debe reaparecer.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.sessions = d.sessions.filter((s) => s.id !== 'del-ordenador')
  d.deleted = [{ clave: 'sesion:del-ordenador', at: Date.now() }]
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
enLaNube.sessions.push({
  id: 'del-ordenador',
  date: '2026-08-01',
  updatedAt: 5000,
  kind: 'fuerza',
  title: 'Fuerza · desde el ordenador',
  completed: true,
  exercises: []
})
await page.reload()
await page.waitForTimeout(1500)
const trasBorrar = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('ritmo-data-v1')).sessions.map((s) => s.id)
)
comprobar(
  !trasBorrar.includes('del-ordenador'),
  `lo borrado ha resucitado al sincronizar: ${JSON.stringify(trasBorrar)}`
)
console.log('  · tras borrar y sincronizar:', JSON.stringify(trasBorrar))

// ── Cerrar sesión no borra nada de aquí ───────────────────
await page.getByText('Yo', { exact: true }).first().click()
await page.waitForTimeout(600)
const cuenta = page.locator('.card').filter({ hasText: 'Tu cuenta' }).first()
await cuenta.scrollIntoViewIfNeeded()
await cuenta.getByRole('button', { name: /Cerrar sesión/ }).click()
await page.waitForTimeout(600)
const quedan = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).sessions.length
)
comprobar(quedan > 0, 'cerrar sesión ha borrado los datos de este dispositivo')
comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-sesion'))) === null,
  'cerrar sesión no ha soltado los tokens'
)
await page.screenshot({ path: `${OUT}/nube-4-fuera.png` })

// ── Y también si la app ya estaba abierta ─────────────────
// Instalada, el sistema puede traerla al frente en vez de recargarla: entonces
// el enlace solo cambia el fragmento y no hay carga que valga.
await page.evaluate(() => localStorage.removeItem('ritmo-sesion'))
await page.evaluate(() => {
  location.hash = 'access_token=tok-789&refresh_token=ref-789&expires_in=3600&token_type=bearer'
})
await page.waitForTimeout(1200)
comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-sesion'))) !== null,
  'con la app ya abierta, el enlace del correo no llega a iniciar sesión'
)

// ── Un enlace caducado se explica, no se calla ────────────
// Es lo que pasa al abrir un enlace viejo, o el mismo dos veces: Supabase
// devuelve el fallo por el mismo sitio por donde mandaría los tokens. Se
// prueba sin sesión, que es cuando importa: con sesión ya iniciada, un enlace
// caducado no cambia nada y no hay nada que contar.
await page.evaluate(() => localStorage.removeItem('ritmo-sesion'))
await page.goto('about:blank')
await page.goto(`${BASE}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`)
await page.waitForTimeout(1500)
comprobar(
  !page.url().includes('error_code'),
  `el error se queda en la barra de direcciones: ${page.url()}`
)
await page.getByText('Yo', { exact: true }).first().click()
await page.waitForTimeout(600)
const conFallo = page.locator('.card').filter({ hasText: 'Tu cuenta' }).first()
await conFallo.scrollIntoViewIfNeeded()
const textoFallo = await conFallo.innerText()
comprobar(
  /ya no vale|pide otro/i.test(textoFallo),
  `no se explica que el enlace ha caducado: ${textoFallo.slice(0, 160)}`
)
await page.screenshot({ path: `${OUT}/nube-5-caducado.png` })

// ── Entrar con el código, que es la vía de la app instalada ──
// En iOS, una app añadida a la pantalla de inicio tiene su propio almacén y el
// enlace del correo siempre abre Safari: por enlace no se puede entrar ahí.
// Se simula ese caso arrancando sin ninguna sesión guardada.
await page.evaluate(() => localStorage.removeItem('ritmo-sesion'))
await page.reload()
await page.waitForTimeout(900)
await page.getByText('Yo', { exact: true }).first().click()
await page.waitForTimeout(600)

const cuentaFuera = page.locator('.card').filter({ hasText: 'Tu cuenta' }).first()
await cuentaFuera.scrollIntoViewIfNeeded()
comprobar(
  (await cuentaFuera.locator('input[type="text"]').count()) === 0,
  'el campo del código no debería salir antes de pedir el correo'
)

await cuentaFuera.locator('input[type="email"]').fill('alberto@ejemplo.com')
await cuentaFuera.getByRole('button', { name: /Mandarme el acceso/ }).click()
await page.waitForTimeout(700)

const campoAcceso = cuentaFuera.locator('input[inputmode="url"]')
comprobar(await campoAcceso.count(), 'tras pedir el correo debería poder pegarse el enlace')
const pasos = await cuentaFuera.innerText()
comprobar(
  /no lo pulses|Copiar enlace/i.test(pasos),
  `debería avisar de copiar el enlace en vez de pulsarlo: ${pasos.slice(0, 260)}`
)
await cuentaFuera.scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/nube-6-pegar-enlace.png` })

// Algo que no es un enlace: se dice y no se molesta al servidor.
const antesDeNada = tiposProbados.length
await campoAcceso.fill('esto no es un enlace')
await cuentaFuera.getByRole('button', { name: /^Entrar$/ }).click()
await page.waitForTimeout(600)
comprobar(
  tiposProbados.length === antesDeNada,
  'pegar algo que no es un enlace no debería llegar a pedir nada'
)

// Un enlace ya gastado: se explica y no se entra.
await campoAcceso.fill(`${NUBE}/auth/v1/verify?token=pkce_gastado0000000000000&type=magiclink`)
await cuentaFuera.getByRole('button', { name: /^Entrar$/ }).click()
await page.waitForTimeout(900)
const conMalo = await cuentaFuera.innerText()
comprobar(
  /una sola vez|gastado|c[oó]pialo/i.test(conMalo),
  `un enlace gastado debería explicarse: ${conMalo.slice(0, 240)}`
)
comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-sesion'))) === null,
  'un enlace que no vale no puede dejar sesión guardada'
)

// El bueno: entra sin pasar por el navegador.
await campoAcceso.fill(ENLACE)
await cuentaFuera.getByRole('button', { name: /^Entrar$/ }).click()
await page.waitForTimeout(1500)
comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-sesion'))) !== null,
  'con el enlace bueno debería quedar la sesión guardada'
)
comprobar(
  tiposProbados.includes('magiclink') && tiposProbados.includes('signup'),
  `debería probar el tipo del enlace y luego los demás: ${JSON.stringify(tiposProbados)}`
)
const dentroPorCodigo = await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().innerText()
comprobar(
  /alberto@ejemplo.com/.test(dentroPorCodigo),
  `tras entrar pegando el enlace debería decir con qué cuenta: ${dentroPorCodigo.slice(0, 160)}`
)
console.log('  · etiquetas probadas para el acceso:', JSON.stringify(tiposProbados))
await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/nube-7-dentro-por-enlace-pegado.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ entrar por enlace, pegando el enlace sin salir de la app, fusionar los dos dispositivos, no resucitar lo borrado y salir sin perder nada')
