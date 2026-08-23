/**
 * Que el paquete que va dentro del contenedor nativo funcione de verdad.
 *
 * Es una comprobación que parece de más y no lo es. La app se sirve en GitHub
 * Pages bajo `/app-ejercicio/` y dentro de Capacitor desde la raíz de
 * `capacitor://localhost`. Una sola ruta absoluta que se cuele —un icono, un
 * trozo de JavaScript, una fuente— y la app abre en blanco **solo dentro del
 * móvil**, donde no hay consola que mirar y donde el fallo aparece días después
 * de haberlo cometido.
 *
 * Así que se construye como para iOS, se sirve desde una carpeta con un nombre
 * cualquiera —distinto del de Pages— y se comprueba que arranca entera.
 *
 *   npm run build:web && node scripts/check-ios.mjs
 */
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const DIST = new URL('../dist/', import.meta.url).pathname
const PUERTO = 4199

const TIPOS = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json'
}

// Un servidor que sirve `dist/` en la raíz, como hace el contenedor.
const server = createServer((req, res) => {
  const ruta = decodeURIComponent((req.url ?? '/').split('?')[0])
  const fichero = join(DIST, normalize(ruta === '/' ? '/index.html' : ruta))
  if (!fichero.startsWith(DIST) || !existsSync(fichero)) {
    res.writeHead(404)
    return res.end('no')
  }
  res.writeHead(200, { 'content-type': TIPOS[extname(fichero)] ?? 'application/octet-stream' })
  res.end(readFileSync(fichero))
})
await new Promise((r) => server.listen(PUERTO, r))

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

const errores = []
const noEncontrados = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))
page.on('response', (r) => {
  if (r.status() === 404) noEncontrados.push(new URL(r.url()).pathname)
})

await page.goto(`http://localhost:${PUERTO}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// ── Arranca de verdad, no en blanco ────────────────────────────────────
comprobar(
  (await page.locator('#root').innerText()).length > 20,
  'la app debería pintar algo: en blanco es justo el fallo que este recorrido busca'
)
comprobar(noEncontrados.length === 0, `faltan ficheros: ${noEncontrados.join(', ')}`)

// ── Y llega hasta poder medir, que es lo que va a usar el reloj ────────
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
        lugar: 'Madrid'
      },
      checkIns: [],
      sessions: [],
      measurements: []
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.locator('.tab', { hasText: 'Medir' }).click()
await page.waitForTimeout(500)

const medir = await page.locator('.app-main').innerText()
comprobar(medir.includes('Sol'), 'la rejilla de medir debería estar entera dentro del contenedor')
comprobar(medir.includes('El sol ahora'), 'y el arco del sol, que se calcula sin red')

// Las tipografías son de las que más fácil se quedan atrás con la ruta base.
const fuente = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
comprobar(/nunito/i.test(fuente), `la tipografía no ha cargado: sale «${fuente}»`)

// Y ningún service worker: dentro del contenedor serviría versiones viejas.
comprobar(
  await page.evaluate(() => !document.querySelector('script[src*="registerSW"]')),
  'el paquete de iOS no debería registrar un service worker'
)

await page.screenshot({ path: `${process.env.OUT_DIR ?? '/tmp/shots'}/ios-01-arranca.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()
server.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ iOS: el paquete del contenedor arranca entero desde la raíz, sin rutas absolutas')
