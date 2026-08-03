/**
 * Que se comporte como una app en el móvil y como una app de escritorio en el
 * ordenador.
 *
 * En el móvil: escala fija —ni pellizcar ni doble toque—, sin rebote elástico,
 * sin selección de texto al mantener pulsado, el documento no se desplaza y la
 * cápsula de pestañas abajo.
 *
 * En el ordenador: la cápsula se convierte en barra lateral, el contenido ocupa
 * el resto de la pantalla y no aparece desplazamiento horizontal.
 *
 *   node scripts/check-pantalla.mjs
 */
import { chromium } from 'playwright-core'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

const SEMBRAR = () => {
  const hoy = new Date()
  const menos = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() - d)
    return x.toISOString().slice(0, 10)
  }
  const ej = (id, n, primary) => ({
    exerciseId: id,
    name: n,
    primary,
    plan: { sets: 3, reps: '8-12', rir: 2 },
    done: true,
    actualWeightKg: 12,
    logs: Array.from({ length: 3 }, () => ({ done: true, weightKg: 12, reps: 10 }))
  })
  const sessions = [3, 6, 9, 12].map((d) => ({
    id: 's' + d,
    date: menos(d),
    kind: 'fuerza',
    title: 'Fuerza',
    completed: true,
    rpe: 4,
    exercises: [
      ej('press_banca_mancuernas', 'Press de banca', 'pecho'),
      ej('remo_mancuerna', 'Remo', 'espalda'),
      ej('curl_biceps', 'Curl', 'brazo')
    ]
  }))
  const checkIns = Array.from({ length: 10 }, (_, i) => ({
    date: menos(i),
    sleep: 4,
    lightHygiene: true,
    sunrise: true,
    sunsetYesterday: true,
    sunExposure: true,
    keto: false,
    energy: 4,
    discomfort: 'ninguna',
    wokeHungry: false,
    cravings: false
  }))
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 80,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas', 'banco', 'bandas', 'bici', 'correr'],
        maxWeights: { mancuernas: 24 }
      },
      checkIns,
      sessions,
      measurements: []
    })
  )
}

async function abrir(width, height) {
  const page = await browser.newPage({ viewport: { width, height } })
  page.on('pageerror', (e) => fallos.push(`error de página a ${width}px: ${e.message}`))
  await page.goto(BASE)
  await page.evaluate(SEMBRAR)
  await page.goto(BASE)
  await page.waitForTimeout(700)
  return page
}

// ── Móvil: una app, no una web ────────────────────────────
{
  const page = await abrir(390, 844)
  const m = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
    const body = getComputedStyle(document.body)
    const barra = document.querySelector('.tabbar')?.getBoundingClientRect()
    const raiz = document.querySelector('#root')?.getBoundingClientRect()
    return {
      meta,
      touchAction: body.touchAction,
      userSelect: body.webkitUserSelect || body.userSelect,
      overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
      documentoSeDesplaza: document.documentElement.scrollHeight > window.innerHeight + 1,
      barraAbajo: barra ? barra.top > window.innerHeight / 2 : false,
      barraAncha: barra ? barra.width > barra.height : false,
      raizAncho: raiz?.width ?? 0
    }
  })

  comprobar(/maximum-scale=1/.test(m.meta), `la escala no está fijada: «${m.meta}»`)
  comprobar(/user-scalable=no/.test(m.meta), `se puede ampliar con dos dedos: «${m.meta}»`)
  comprobar(/viewport-fit=cover/.test(m.meta), 'el fondo no llega bajo la barra de estado')
  comprobar(m.touchAction === 'manipulation', `el doble toque sigue ampliando: ${m.touchAction}`)
  comprobar(m.userSelect === 'none', `el texto se selecciona al mantener pulsado: ${m.userSelect}`)
  comprobar(m.overscroll === 'none', `queda rebote elástico: ${m.overscroll}`)
  comprobar(!m.documentoSeDesplaza, 'el documento se desplaza: debe hacerlo el contenido por dentro')
  comprobar(m.barraAbajo && m.barraAncha, 'en el móvil la cápsula debe ir abajo y en horizontal')
  comprobar(m.raizAncho <= 390, `la app se sale del ancho del móvil: ${m.raizAncho}`)

  // Lo que se escribe sí se puede seleccionar.
  const enInput = await page.evaluate(() => {
    const i = document.querySelector('input')
    return i ? (getComputedStyle(i).webkitUserSelect || getComputedStyle(i).userSelect) : 'text'
  })
  comprobar(enInput === 'text', `en los campos hay que poder seleccionar: ${enInput}`)

  await page.screenshot({ path: `${OUT}/pantalla-movil.png` })
  await page.close()
}

// ── Escritorio: barra lateral y pantalla aprovechada ──────
for (const ancho of [1280, 1600]) {
  const page = await abrir(ancho, 900)
  const d = await page.evaluate(() => {
    const barra = document.querySelector('.tabbar')?.getBoundingClientRect()
    const main = document.querySelector('.app-main')?.getBoundingClientRect()
    // Lateral = pegada a la izquierda y con las pestañas apiladas, no en fila.
    const tabs = [...document.querySelectorAll('.tab')].map((t) => t.getBoundingClientRect())
    const apiladas = tabs.length > 1 && tabs[1].top > tabs[0].top + 10
    return {
      barraIzquierda: barra ? barra.left < 300 && apiladas : false,
      barraNoEstirada: barra ? barra.height < window.innerHeight * 0.6 : false,
      anchoMain: main?.width ?? 0,
      desplazamientoHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1
    }
  })
  comprobar(d.barraIzquierda, `a ${ancho}px la cápsula debería ser una barra lateral`)
  comprobar(d.barraNoEstirada, `a ${ancho}px la barra lateral se estira hasta abajo sin contenido`)
  comprobar(
    d.anchoMain > ancho * 0.7,
    `a ${ancho}px el contenido solo ocupa ${Math.round(d.anchoMain)}px: no aprovecha la pantalla`
  )
  comprobar(!d.desplazamientoHorizontal, `a ${ancho}px aparece desplazamiento horizontal`)

  // Dos columnas de tarjetas donde son independientes.
  await page.getByText('Ajustes', { exact: true }).first().click()
  await page.waitForTimeout(700)
  const columnas = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.cards-grid > .card')]
    return new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size
  })
  comprobar(
    ancho >= 1180 ? columnas >= 2 : true,
    `a ${ancho}px las tarjetas independientes deberían ir en dos columnas, van en ${columnas}`
  )
  await page.screenshot({ path: `${OUT}/pantalla-${ancho}.png` })
  await page.close()
}

await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ móvil como app instalada y escritorio con barra lateral a pantalla completa')
