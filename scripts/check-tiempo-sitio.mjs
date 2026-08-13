/**
 * Tiempo disponible, dónde entrenas y peso corporal, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  - Antes de generar el entreno se puede decir **de cuánto tiempo dispones** y
 *    **dónde estás**, y las dos cosas cambian el plan que sale.
 *  - Pidiendo 35 minutos, el plan sale más corto que sin tope: encadenado en
 *    superseries y, si hace falta, con menos series.
 *  - Las superseries que forma **no repiten grupo muscular**: encadenar dos de
 *    pecho no ahorra tiempo, empeora el trabajo.
 *  - En «solo mi cuerpo» no aparece ni un ejercicio que necesite material.
 *  - Un sitio nuevo se crea en Yo y aparece luego al preparar el día.
 *  - Marcar «peso corporal» en una serie le pone kilos de verdad: la sentadilla
 *    búlgara sin mancuernas deja de contar como cero.
 *
 *   node scripts/check-tiempo-sitio.mjs
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

/** Deja el perfil listo y el check-in de hoy contestado. */
async function sembrar() {
  await page.goto(BASE)
  await page.evaluate(() => {
    const hoy = new Date()
    const menos = (d) => {
      const x = new Date(hoy)
      x.setDate(x.getDate() - d)
      return x.toISOString().slice(0, 10)
    }
    const checkIns = Array.from({ length: 8 }, (_, i) => ({
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
          equipment: ['peso_corporal', 'mancuernas', 'banco', 'barra', 'bandas', 'bici', 'correr'],
          maxWeights: { mancuernas: 24, barra: 80 },
          // Volumen al máximo a propósito: con el nivel base la sesión ya cabe
          // en 35 minutos y esta comprobación no comprobaría nada.
          volumeLevelOverride: 4
        },
        checkIns,
        sessions: [],
        measurements: []
      })
    )
  })
  await page.goto(BASE)
  await page.waitForTimeout(800)
}

/** Llega hasta la tarjeta de decisión, pidiendo pesas si hoy no tocaban. */
async function hastaLaDecision() {
  await page.getByText('Empezar', { exact: false }).first().click()
  await page.waitForTimeout(300)
  await page.getByText('Ver qué me conviene').click()
  await page.waitForTimeout(500)
  const pesas = page.getByText('Prefiero algo con pesas')
  if (await pesas.count()) {
    await pesas.click()
    await page.waitForTimeout(400)
  }
}

/** Los ejercicios del plan y sus series, leídos del almacén. */
const planGuardado = () =>
  page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
    const s = d.sessions.find((x) => !x.completed)
    if (!s) return null
    return {
      minutosPedidos: s.minutosPedidos ?? null,
      ejercicios: s.exercises.map((e) => ({
        id: e.exerciseId,
        nombre: e.name,
        primary: e.primary,
        series: e.plan.sets,
        superset: e.supersetId ?? null
      }))
    }
  })

async function descartar() {
  const boton = page.getByText('Hoy no puedo', { exact: false })
  if (await boton.count()) {
    await boton.first().click()
    await page.waitForTimeout(500)
  }
}

// ── 1. Sin tope de tiempo: el plan completo ───────────────
await sembrar()
await hastaLaDecision()
comprobar(
  await page.getByText('¿Cuánto tiempo tienes?').count(),
  'no se pregunta el tiempo disponible antes de generar'
)
await page.screenshot({ path: `${OUT}/tiempo-1-decision.png` })
await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(800)
const completo = await planGuardado()
comprobar(completo !== null, 'no se ha generado ningún plan')
const seriesCompletas = completo.ejercicios.reduce((a, e) => a + e.series, 0)
console.log(
  '  · sin tope:',
  completo.ejercicios.length,
  'ejercicios y',
  seriesCompletas,
  'series'
)
await descartar()

// ── 2. Con 35 minutos: más corto y encadenado ─────────────
await hastaLaDecision()
await page.getByRole('button', { name: '35 min' }).click()
await page.waitForTimeout(300)
await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(800)
const corto = await planGuardado()
comprobar(corto?.minutosPedidos === 35, `la sesión debería recordar los 35 min: ${corto?.minutosPedidos}`)

const seriesCortas = corto.ejercicios.reduce((a, e) => a + e.series, 0)
const encadenados = corto.ejercicios.filter((e) => e.superset).length
console.log('  · con 35 min:', seriesCortas, 'series y', encadenados, 'ejercicios encadenados')
comprobar(
  encadenados > 0 || seriesCortas < seriesCompletas,
  `pedir 35 minutos no ha cambiado nada: ${seriesCortas} series, ${encadenados} encadenados`
)
// Y que el plan de partida era largo: si ya cabía, lo de arriba no comprueba
// nada y esta comprobación pasaría en vacío.
comprobar(
  seriesCompletas >= 12,
  `el plan sin tope es demasiado corto (${seriesCompletas} series) para que el recorte se note`
)

// Y las parejas que forma no repiten grupo muscular.
const porGrupo = new Map()
for (const e of corto.ejercicios.filter((x) => x.superset)) {
  const ya = porGrupo.get(e.superset) ?? []
  porGrupo.set(e.superset, [...ya, e.primary])
}
for (const [id, grupos] of porGrupo) {
  comprobar(
    new Set(grupos).size === grupos.length,
    `la superserie ${id} repite grupo muscular: ${grupos.join(', ')}`
  )
}
if (porGrupo.size) console.log('  · parejas:', [...porGrupo.values()].map((g) => g.join(' + ')).join(' | '))
await page.screenshot({ path: `${OUT}/tiempo-2-plan-corto.png` })
await descartar()

// ── 3. Solo mi cuerpo: nada que necesite material ─────────
await hastaLaDecision()
await page.getByRole('button', { name: 'Solo mi cuerpo' }).click()
await page.waitForTimeout(300)
await page.getByText('Empezar entreno', { exact: false }).first().click()
await page.waitForTimeout(800)
const sinNada = await planGuardado()
const conMaterial = await page.evaluate(
  (ids) =>
    ids.filter((id) => {
      // El catálogo vive en el bundle; se comprueba por el nombre, que es lo
      // único accesible desde fuera.
      return /barra|mancuerna|banda|polea|m[áa]quina|kettlebell/i.test(id.nombre)
    }),
  sinNada.ejercicios
)
comprobar(
  conMaterial.length === 0,
  `en «solo mi cuerpo» no debería haber nada con material: ${conMaterial.map((e) => e.nombre).join(', ')}`
)
console.log('  · solo mi cuerpo:', sinNada.ejercicios.map((e) => e.nombre).join(' | '))
await page.screenshot({ path: `${OUT}/tiempo-3-sin-material.png` })

// ── 4. Peso corporal en la serie ──────────────────────────
await page.getByText('Empezar entrenamiento', { exact: false }).first().click()
await page.waitForTimeout(700)
const corporal = page.getByRole('button', { name: 'Esta serie va con mi peso corporal' })
comprobar(await corporal.count(), 'no está la casilla de peso corporal en el modo foco')
if (await corporal.count()) {
  await corporal.click()
  await page.waitForTimeout(600)
  const kg = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
    const s = d.sessions.find((x) => !x.completed)
    const l = s.exercises.flatMap((e) => e.logs ?? []).find((x) => x.pesoCorporal)
    return l?.weightKg ?? null
  })
  comprobar(kg !== null && kg > 0, `marcar peso corporal debería poner kilos de verdad: ${kg}`)
  console.log('  · peso corporal anotado:', kg, 'kg de los 80 del usuario')
}
await page.screenshot({ path: `${OUT}/tiempo-4-peso-corporal.png` })

// Y también desde la lista, que es donde se corrige lo de antes y se rellenan
// varias series seguidas. Estuvo solo en el modo foco y la función quedaba a
// medias: quien anota desde la lista no tenía forma de decirlo.
await page.getByRole('button', { name: 'Ver todos los ejercicios' }).click()
await page.waitForTimeout(500)
const enLaLista = page.getByRole('button', { name: /con mi peso corporal$/ })
comprobar(await enLaLista.count(), 'no está la casilla de peso corporal en la lista de series')
if (await enLaLista.count()) {
  const antes = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
    const s = d.sessions.find((x) => !x.completed)
    return s.exercises.flatMap((e) => e.logs ?? []).filter((l) => l.pesoCorporal).length
  })
  await enLaLista.last().click()
  await page.waitForTimeout(600)
  const despues = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
    const s = d.sessions.find((x) => !x.completed)
    return s.exercises
      .flatMap((e) => e.logs ?? [])
      .filter((l) => l.pesoCorporal && (l.weightKg ?? 0) > 0).length
  })
  comprobar(
    despues > antes,
    `marcarlo desde la lista no ha anotado kilos: ${antes} → ${despues} series con peso corporal`
  )
  console.log('  · desde la lista:', antes, '→', despues, 'series con peso corporal y kilos')
}
await page.screenshot({ path: `${OUT}/tiempo-4b-lista-corporal.png` })

// ── 5. Un sitio creado en Yo aparece al preparar el día ───
// La sesión de arriba sigue en marcha: si no se descarta, «Hoy» enseña el
// entreno y no la decisión, y esta comprobación miraría la pantalla que no es.
await descartar()

await page.locator('.tab', { hasText: 'Yo' }).click()
await page.waitForTimeout(600)
comprobar(await page.getByText('Dónde entrenas').count(), 'no está la tarjeta de sitios en Yo · Perfil')
await page.getByRole('button', { name: 'Añadir un sitio' }).click()
await page.waitForTimeout(400)
await page.getByLabel('Nombre del sitio').fill('Hotel')
const tarjetaSitios = page.locator('.card').filter({ hasText: 'Dónde entrenas' })
await tarjetaSitios.getByRole('button', { name: 'Bandas elásticas', exact: true }).click()
await page.waitForTimeout(200)
await tarjetaSitios.getByRole('button', { name: 'Guardar este sitio' }).click()
await page.waitForTimeout(600)
const guardado = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).profile.locations ?? []
)
comprobar(guardado.length === 1 && guardado[0].nombre === 'Hotel', `el sitio no se ha guardado: ${JSON.stringify(guardado)}`)
comprobar(
  guardado[0]?.equipment?.includes('bandas'),
  `el material del sitio no se ha guardado: ${JSON.stringify(guardado[0]?.equipment)}`
)
console.log('  · sitio creado:', JSON.stringify(guardado[0]?.nombre), 'con', guardado[0]?.equipment?.join(', '))
await page.screenshot({ path: `${OUT}/tiempo-5-sitios.png` })

await page.locator('.tab', { hasText: 'Hoy' }).click()
await page.waitForTimeout(700)
await hastaLaDecision()
comprobar(
  await page.getByRole('button', { name: 'Hotel' }).count(),
  'el sitio creado no aparece al preparar el día'
)
await page.screenshot({ path: `${OUT}/tiempo-6-sitio-en-hoy.png` })

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ el entreno se ajusta al tiempo y al sitio, y el peso corporal cuenta')
