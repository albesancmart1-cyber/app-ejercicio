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
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

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

await page.route(`${NUBE}/**`, async (route) => {
  const req = route.request()
  const url = new URL(req.url())
  const ruta = url.pathname

  if (ruta === '/auth/v1/otp') {
    enlacesPedidos.push(JSON.parse(req.postData() ?? '{}').email)
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
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
await page.getByText('Ajustes', { exact: true }).first().click()
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
await tarjeta.getByRole('button', { name: /Mandarme el enlace/ }).click()
await page.waitForTimeout(700)
comprobar(
  enlacesPedidos.includes('alberto@ejemplo.com'),
  `no se pidió el enlace: ${JSON.stringify(enlacesPedidos)}`
)
const trasPedir = await tarjeta.innerText()
comprobar(/enlace a alberto@ejemplo.com/i.test(trasPedir), `no confirma el envío: ${trasPedir.slice(0, 120)}`)
await page.screenshot({ path: `${OUT}/nube-2-enlace.png` })

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

await page.getByText('Ajustes', { exact: true }).first().click()
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
await page.getByText('Ajustes', { exact: true }).first().click()
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

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ entrar por enlace, fusionar los dos dispositivos, no resucitar lo borrado y salir sin perder nada')
