/**
 * Iniciar sesión y sincronizar, en navegador y contra un Firebase de mentira.
 *
 * No hace falta un proyecto real para comprobar lo que importa: se intercepta el
 * tráfico a la nube y se responde como responde Firebase. Así se verifica lo que
 * es nuestro —pedir el enlace, canjear el testigo que vuelve en la URL,
 * descargar, fusionar, subir y no perder nada— sin depender de una cuenta ni de
 * la red.
 *
 * Requiere una build hecha con las variables puestas:
 *   VITE_FIREBASE_API_KEY=clave VITE_FIREBASE_PROJECT_ID=falso npm run build
 *
 *   node scripts/check-nube.mjs
 */
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const PROYECTO = process.env.VITE_FIREBASE_PROJECT_ID ?? 'falso'

const IDENTIDAD = 'https://identitytoolkit.googleapis.com'
const TESTIGOS = 'https://securetoken.googleapis.com'
const DATOS = 'https://firestore.googleapis.com'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  // Un 400 de Firebase **es** la respuesta esperada al probar un enlace
  // gastado: el navegador lo apunta como error de red, pero el flujo lo
  // contempla, lo traduce y sigue. Contarlo como fallo obligaría a no probar
  // el caso, que es justo el que hay que probar.
  if (/status of 400/.test(m.text())) return
  errores.push(m.text())
})

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

/** Yo → Cuenta, que es el grupo donde vive la tarjeta de la cuenta. */
async function irACuenta() {
  await page.getByText('Yo', { exact: true }).first().click()
  await page.waitForTimeout(600)
  await page.getByRole('tab', { name: 'Cuenta' }).click()
  await page.waitForTimeout(400)
}

// ── El Firebase de mentira ────────────────────────────────
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
/** A dónde le pedimos a Firebase que devuelva el enlace del correo. */
let vueltaPedida = null
/** Los canjes que se han intentado, con qué correo y con qué testigo. */
let canjes = []
/** El testigo que llevaría dentro el enlace del correo. */
const TESTIGO = 'abc123def456ghi789jkl000'
const ENLACE = `https://${PROYECTO}.firebaseapp.com/__/auth/action?mode=signIn&oobCode=${TESTIGO}&apiKey=clave&lang=es`
const UID = 'uid-de-prueba'

const json = (route, cuerpo, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) })

await page.route(`${IDENTIDAD}/**`, async (route) => {
  const req = route.request()
  const ruta = new URL(req.url()).pathname
  const c = JSON.parse(req.postData() ?? '{}')

  if (ruta.endsWith('accounts:sendOobCode')) {
    enlacesPedidos.push(c.email)
    vueltaPedida = c.continueUrl
    return json(route, {})
  }
  if (ruta.endsWith('accounts:signInWithEmailLink')) {
    canjes.push({ email: c.email, oobCode: c.oobCode })
    // Como Firebase de verdad: el testigo sirve una vez y hace falta el correo.
    if (c.oobCode !== TESTIGO || !c.email) {
      return json(route, { error: { code: 400, message: 'INVALID_OOB_CODE' } }, 400)
    }
    return json(route, {
      idToken: 'tok-enlace',
      refreshToken: 'ref-enlace',
      expiresIn: '3600',
      email: 'alberto@ejemplo.com',
      localId: UID
    })
  }
  if (ruta.endsWith('accounts:lookup')) {
    return json(route, { users: [{ email: 'alberto@ejemplo.com', localId: UID }] })
  }
  return json(route, { error: { code: 404, message: 'NOT_FOUND' } }, 404)
})

await page.route(`${TESTIGOS}/**`, (route) =>
  json(route, { id_token: 'tok-nuevo', refresh_token: 'ref-nuevo', expires_in: '3600', user_id: UID })
)

await page.route(`${DATOS}/**`, async (route) => {
  const req = route.request()
  const ruta = new URL(req.url()).pathname

  // El buzón de medidas: vacío, que aquí no se prueba.
  if (ruta.endsWith('/medidas')) return json(route, {})

  if (req.method() === 'GET') {
    return json(route, {
      name: ruta.slice(1),
      fields: { datos: { stringValue: JSON.stringify(enLaNube) } }
    })
  }
  if (req.method() === 'PATCH') {
    subidas += 1
    const cuerpo = JSON.parse(req.postData() ?? '{}')
    enLaNube = JSON.parse(cuerpo.fields.datos.stringValue)
    return json(route, { name: ruta.slice(1) })
  }
  if (req.method() === 'DELETE') return json(route, {})
  return json(route, { error: { code: 404, message: 'NOT_FOUND' } }, 404)
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

// La dirección de vuelta tiene que apuntar a la app. Si no se manda, Firebase
// devuelve el enlace a su propia página de acción y ahí no hay nada nuestro.
comprobar(vueltaPedida !== null, 'no se le dice a Firebase a dónde tiene que volver el enlace')
comprobar(
  vueltaPedida === new URL(BASE).origin + new URL(BASE).pathname,
  `la vuelta del enlace no apunta a la app: ${vueltaPedida}`
)
console.log('  · el enlace volverá a:', vueltaPedida)

// El correo se guarda al pedirlo: Firebase lo exige al canjear y el enlace no
// lo trae dentro. Sin esto, volver del correo no podría entrar.
comprobar(
  (await page.evaluate(() => localStorage.getItem('ritmo-correo-pendiente'))) ===
    'alberto@ejemplo.com',
  'no se ha guardado a qué correo se mandó el enlace'
)

// ── Volver desde el enlace del correo ─────────────────────
// Como si se abriera desde el correo: carga limpia con la consulta puesta.
await page.goto('about:blank')
await page.goto(`${BASE}?mode=signIn&oobCode=${TESTIGO}&apiKey=clave&lang=es`)
await page.waitForTimeout(1800)

const urlLimpia = page.url()
comprobar(!urlLimpia.includes('oobCode'), `el testigo se queda en la barra de direcciones: ${urlLimpia}`)

const sesionGuardada = await page.evaluate(() => localStorage.getItem('ritmo-sesion'))
comprobar(sesionGuardada !== null, 'no se guardó la sesión al volver del enlace')
comprobar(
  canjes.some((c) => c.oobCode === TESTIGO && c.email === 'alberto@ejemplo.com'),
  `el canje debería llevar testigo y correo: ${JSON.stringify(canjes)}`
)

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

await irACuenta()
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
await irACuenta()
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

// ── Un enlace gastado se explica, no se calla ─────────────
// Es lo que pasa al abrir un enlace viejo, o el mismo dos veces: Firebase lo
// rechaza al canjearlo y la app tiene que contarlo. Se prueba sin sesión, que
// es cuando importa.
await page.evaluate(() => {
  localStorage.removeItem('ritmo-sesion')
  localStorage.setItem('ritmo-correo-pendiente', 'alberto@ejemplo.com')
})
await page.goto('about:blank')
await page.goto(`${BASE}?mode=signIn&oobCode=gastado000000000000000000`)
await page.waitForTimeout(1500)
comprobar(!page.url().includes('oobCode'), `el testigo gastado se queda en la barra: ${page.url()}`)
await irACuenta()
const conFallo = page.locator('.card').filter({ hasText: 'Tu cuenta' }).first()
await conFallo.scrollIntoViewIfNeeded()
const textoFallo = await conFallo.innerText()
comprobar(
  /ya no vale|pide otro|c[oó]pialo/i.test(textoFallo),
  `no se explica que el enlace ha caducado: ${textoFallo.slice(0, 200)}`
)
await page.screenshot({ path: `${OUT}/nube-5-caducado.png` })

// ── Y el enlace abierto en otro dispositivo ───────────────
// Firebase pide el correo además del testigo. Si el enlace se pide en un sitio
// y se abre en otro, aquí no consta: hay que decirlo, no quedarse en blanco.
await page.evaluate(() => {
  localStorage.removeItem('ritmo-sesion')
  localStorage.removeItem('ritmo-correo-pendiente')
})
await page.goto('about:blank')
await page.goto(`${BASE}?mode=signIn&oobCode=${TESTIGO}`)
await page.waitForTimeout(1500)
await irACuenta()
const sinCorreo = await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().innerText()
comprobar(
  /correo/i.test(sinCorreo) && /escribe|pega/i.test(sinCorreo),
  `debería pedir el correo al abrir el enlace en otro dispositivo: ${sinCorreo.slice(0, 220)}`
)

// ── Entrar pegando el enlace, que es la vía de la app instalada ──
// En iOS, una app añadida a la pantalla de inicio tiene su propio almacén y el
// enlace del correo siempre abre Safari: pulsándolo no se puede entrar ahí.
await page.evaluate(() => {
  localStorage.removeItem('ritmo-sesion')
  localStorage.removeItem('ritmo-correo-pendiente')
})
await page.goto(BASE)
await page.waitForTimeout(900)
await irACuenta()

const cuentaFuera = page.locator('.card').filter({ hasText: 'Tu cuenta' }).first()
await cuentaFuera.scrollIntoViewIfNeeded()
comprobar(
  (await cuentaFuera.locator('input[inputmode="url"]').count()) === 0,
  'el campo del enlace no debería salir antes de pedir el correo'
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
const antesDeNada = canjes.length
await campoAcceso.fill('esto no es un enlace')
await cuentaFuera.getByRole('button', { name: /^Entrar$/ }).click()
await page.waitForTimeout(600)
comprobar(
  canjes.length === antesDeNada,
  'pegar algo que no es un enlace no debería llegar a pedir nada'
)

// Un enlace ya gastado: se explica y no se entra.
await campoAcceso.fill(
  `https://${PROYECTO}.firebaseapp.com/__/auth/action?mode=signIn&oobCode=gastado000000000000000000`
)
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
const dentroPorEnlace = await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().innerText()
comprobar(
  /alberto@ejemplo.com/.test(dentroPorEnlace),
  `tras entrar pegando el enlace debería decir con qué cuenta: ${dentroPorEnlace.slice(0, 160)}`
)
console.log('  · canjes intentados:', canjes.length)
await page.locator('.card').filter({ hasText: 'Tu cuenta' }).first().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/nube-7-dentro-por-enlace-pegado.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ entrar por enlace, pegando el enlace sin salir de la app, fusionar los dos dispositivos, no resucitar lo borrado y salir sin perder nada')
