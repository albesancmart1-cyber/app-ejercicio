/**
 * Prueba larga de la app: seis meses de entrenamiento reales, conducidos por el
 * navegador día a día como los haría una persona.
 *
 * No se siembra nada en localStorage salvo el reloj: se hace el alta, se
 * contesta el check-in cada día, se prepara la sesión, se anotan todas las
 * series y se guardan las mediciones de la báscula desde la propia pantalla.
 * Lo que se documenta después es lo que la app decidió por su cuenta.
 *
 * El guion de la historia:
 *   · Semana 1  — se parte de parado. Debe imponer la vuelta progresiva.
 *   · Sem. 1-16 — todas las series completas y en el tope del rango, así que la
 *                 carga sube sola y el volumen debería ir escalando de nivel.
 *   · Báscula   — recomposición real: grasa abajo, músculo arriba.
 *   · Sem. 17-26— se sigue entrenando igual de bien, pero la báscula se planta.
 *                 Aquí es donde se ve cómo reacciona la app al estancamiento.
 *
 * Requiere `npm run preview` en marcha. Escribe capturas en OUT_DIR y un
 * registro de todo lo ocurrido en OUT_DIR/bitacora.json.
 */
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

const INICIO = new Date('2026-01-05T09:00:00')
const SEMANAS = Number(process.env.SEMANAS ?? 26)
/** Lunes, miércoles y viernes: constante sin ser heroico. */
const DIAS_ENTRENO = [1, 3, 5]
/**
 * A partir de aquí la báscula deja de moverse aunque el entreno siga igual.
 * Se planta en la semana 12 a propósito: la app juzga la tendencia sobre una
 * ventana de 12 semanas, así que para ver de verdad cómo reacciona a un
 * estancamiento hace falta que la ventana entera esté plana antes de terminar.
 */
const SEMANA_ESTANCAMIENTO = 12

const bitacora = { sesiones: [], mediciones: [], hitos: [] }

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

const iso = (d) => d.toISOString().slice(0, 10)
const byText = (t) => page.getByText(t, { exact: false }).first()

async function shot(nombre, nota) {
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${OUT}/${nombre}.png` })
  bitacora.hitos.push({ captura: `${nombre}.png`, nota })
  console.log('  📸', nombre, '—', nota)
}

/** Sitúa el reloj del navegador en una fecha y recarga para empezar el día. */
async function irAlDia(fecha) {
  await page.clock.setSystemTime(fecha)
  await page.reload()
  await page.waitForTimeout(250)
}

// ── Alta ──────────────────────────────────────────────────
await page.clock.install({ time: INICIO })
await page.goto(BASE)

await page.getByPlaceholder('Tu nombre').fill('Alberto')
await page.getByPlaceholder('Opcional').nth(1).fill('78')
await page.getByPlaceholder('Opcional').nth(2).fill('178')
await byText('Continuar').click()
await byText('Recomposición corporal').click()
await byText('Continuar').click()
for (const eq of ['Mancuernas', 'Bandas elásticas', 'Banco', 'Bicicleta', 'Poder salir a correr']) {
  await byText(eq).click()
}
await byText('Continuar').click()
await page.getByPlaceholder('kg').first().fill('24')
await byText('Continuar').click()
await page.locator('input[type=date]').fill('2025-12-01')
await page.getByPlaceholder('p. ej. 1000').fill('1000')
await byText('Empezar').click()
await shot('sim-00-alta', 'Perfil recién creado: 78 kg, 1,78 m, mancuernas de hasta 24 kg, en cetosis desde diciembre')

// ── Utilidades del día ────────────────────────────────────

/** Contesta el check-in. `mal` simula una noche horrible. */
async function checkIn({ mal }) {
  await byText('Empezar').click()
  const scales = page.locator('.scale')
  await scales.nth(0).locator('button').nth(mal ? 0 : 3).click()
  await scales.nth(1).locator('button').nth(mal ? 0 : 3).click()

  const responder = async (pregunta, respuesta) =>
    page.locator('.row').filter({ hasText: pregunta }).getByText(respuesta, { exact: true }).click()

  const si = mal ? 'No' : 'Sí'
  for (const q of [
    '¿Respetaste anoche la higiene lumínica?',
    '¿Has visto el amanecer hoy?',
    '¿Viste el atardecer ayer?',
    '¿Te dio el sol ayer?'
  ]) {
    await responder(q, si)
  }
  await responder('¿Sigues en cetosis?', 'Sí')
  await responder('¿Te despertaste con mucha hambre?', mal ? 'Sí' : 'No')
  await responder('¿Tuviste antojos ayer?', mal ? 'Sí' : 'No')
  await page.locator('.card').filter({ hasText: 'Cuerpo' }).getByText('Ninguna', { exact: true }).click()
  await byText('Ver qué me conviene').click()
  await page.waitForTimeout(200)
}

/** Lee de la tarjeta de recomendación qué propone y con qué nivel de volumen. */
async function leerRecomendacion() {
  const titulo = (await page.locator('.eyebrow').nth(1).textContent()) ?? ''
  const bloque = page.locator('.card').filter({ hasText: 'Volumen · nivel' })
  let nivel = null
  let motivo = null
  if (await bloque.count()) {
    const texto = (await bloque.first().textContent()) ?? ''
    nivel = Number(texto.match(/nivel (\d) de 4/)?.[1]) || null
    motivo = texto.replace(/\s+/g, ' ')
  }
  return { titulo: titulo.trim(), nivel, motivo }
}

/** Anota todas las series de la sesión, siempre en el tope del rango. */
async function registrarSesion() {
  const tarjetas = page.locator('.card').filter({ has: page.locator('.set-row') })
  const nEjercicios = await tarjetas.count()
  const registro = []

  for (let i = 0; i < nEjercicios; i++) {
    const tarjeta = tarjetas.nth(i)
    const nombre = (await tarjeta.locator('.item-title').first().textContent()) ?? ''
    const meta = (await tarjeta.locator('.item-meta').first().textContent()) ?? ''
    // «3 × 8-12 · RIR 2 · 2′ descanso» → tope del rango.
    const rango = meta.match(/×\s*(\d+)\s*-\s*(\d+)/)
    const tope = rango ? Number(rango[2]) : null

    const filas = tarjeta.locator('.set-row')
    const nSeries = await filas.count()
    let pesoUsado = null

    for (let s = 0; s < nSeries; s++) {
      const fila = filas.nth(s)
      const campos = fila.locator('input')
      if (await campos.count()) {
        // El peso sugerido vive en el placeholder: se usa tal cual, que es lo
        // que haría alguien que sigue la app.
        const sugerido = await campos.nth(0).getAttribute('placeholder')
        if (sugerido && sugerido !== '—') {
          await campos.nth(0).fill(sugerido)
          pesoUsado = Number(sugerido)
        }
        if (tope) await campos.nth(1).fill(String(tope))
      }
      await fila.locator('.check').click()
      const saltar = page.getByText('Saltar descanso')
      if (await saltar.count()) await saltar.click()
    }
    registro.push({ ejercicio: nombre.trim(), series: nSeries, repeticiones: tope, pesoKg: pesoUsado })
  }
  return registro
}

/** Un día de entreno completo, de la primera pregunta al «guardar». */
async function entrenar(fecha, { mal = false, capturas = [], nivelAnterior = null } = {}) {
  await irAlDia(fecha)
  await checkIn({ mal })

  const rec = await leerRecomendacion()
  for (const c of capturas.filter((c) => c.cuando === 'recomendacion')) await shot(c.nombre, c.nota)

  // Un cambio de nivel de volumen hay que fotografiarlo aquí, que es donde la
  // app lo cuenta: en la tarjeta de la recomendación, antes de preparar nada.
  if (rec.nivel && rec.nivel !== nivelAnterior && rec.nivel >= 2) {
    const tarjeta = page.locator('.card').filter({ hasText: 'Volumen · nivel' }).first()
    await tarjeta.scrollIntoViewIfNeeded()
    await shot(`sim-nivel-${rec.nivel}`,
      `Sube a nivel ${rec.nivel} de 4: la app dice qué cambia, por qué y en qué se basa`)
  }

  await byText('Preparar la sesión').click()
  await page.waitForTimeout(250)
  for (const c of capturas.filter((c) => c.cuando === 'plan')) await shot(c.nombre, c.nota)

  await page.getByText('Empezar entrenamiento').click()
  await page.waitForTimeout(150)
  const registro = await registrarSesion()
  for (const c of capturas.filter((c) => c.cuando === 'sesion')) await shot(c.nombre, c.nota)

  await byText('Terminar').click()
  await page.locator('.scale button').nth(3).click() // sensación 4 sobre 5
  await byText('Guardar').click()
  await page.waitForTimeout(200)

  bitacora.sesiones.push({ fecha: iso(fecha), ...rec, ejercicios: registro })
  return rec
}

/** Mediciones de la báscula, desde la pantalla de Cuerpo. */
async function medir(fecha, { pesoKg, grasaPct, musculoPct, capturas = [] }) {
  await irAlDia(fecha)
  await page.locator('.tab', { hasText: 'Cuerpo' }).click()
  await page.waitForTimeout(200)
  await byText('Anotar una medición').click()
  const campos = page.locator('.card').filter({ hasText: 'COMPOSICIÓN CORPORAL' }).locator('input')
  await campos.nth(0).fill(String(pesoKg))
  await campos.nth(1).fill(String(grasaPct))
  await campos.nth(2).fill(String(musculoPct))
  await byText('Guardar medición').click()
  await page.waitForTimeout(300)

  let veredicto = null
  const v = page.locator('.verdict')
  if (await v.count()) veredicto = (await v.first().textContent())?.replace(/\s+/g, ' ').trim()

  for (const c of capturas) {
    if (c.scroll) {
      // Centrar de verdad: `scrollIntoViewIfNeeded` no mueve nada si ya se ve,
      // y entonces dos capturas distintas salían idénticas.
      await page.locator(c.scroll).first().evaluate((el) =>
        el.scrollIntoView({ block: 'center' })
      )
      await page.waitForTimeout(200)
    }
    await shot(c.nombre, c.nota)
  }

  bitacora.mediciones.push({ fecha: iso(fecha), pesoKg, grasaPct, musculoPct, veredicto })
  await page.locator('.tab', { hasText: 'Hoy' }).click()
  await page.waitForTimeout(150)
  return veredicto
}

// ── La historia, semana a semana ──────────────────────────

/**
 * Composición corporal simulada. Primero recomposición de verdad —grasa abajo,
 * músculo arriba, peso casi igual—; a partir de la semana 16, plano.
 */
function composicion(semana) {
  const avance = Math.min(semana, SEMANA_ESTANCAMIENTO) / SEMANA_ESTANCAMIENTO
  const grasa = 22 - 4.2 * avance
  const musculo = 38 + 3.4 * avance
  const peso = 78 - 0.6 * avance
  // Un poco de ruido, que ninguna báscula da tres decimales iguales dos veces.
  const ruido = (n) => Math.round((n + (((semana * 7919) % 11) - 5) / 25) * 10) / 10
  return { pesoKg: ruido(peso), grasaPct: ruido(grasa), musculoPct: ruido(musculo) }
}

/** Resumen de carga de la sesión, para seguir la progresión en la consola. */
function registroCarga(rec, sesion) {
  const conPeso = (sesion?.ejercicios ?? []).filter((e) => e.pesoKg)
  if (conPeso.length === 0) return ''
  const total = conPeso.reduce((a, e) => a + e.pesoKg * e.series * (e.repeticiones ?? 0), 0)
  return ` · ${conPeso.map((e) => `${e.pesoKg}kg`).join('/')} · ${Math.round(total)} kg movidos`
}

/** Noches malas repartidas: la vida real no es una hoja de cálculo. */
const NOCHES_MALAS = new Set(['2026-02-11', '2026-03-25', '2026-05-13'])

const capturasPorFecha = new Map([
  [
    '2026-01-05',
    [
      { cuando: 'recomendacion', nombre: 'sim-01-primer-dia', nota: 'Día 1 desde parado: la app impone vuelta progresiva, no fuerza' },
      { cuando: 'plan', nombre: 'sim-02-primer-plan', nota: 'El primer plan: volumen recortado al 50 %, dos series por ejercicio' }
    ]
  ],
  [
    '2026-01-09',
    [{ cuando: 'sesion', nombre: 'sim-03-registro', nota: 'Registro serie a serie con el peso que sugiere la app' }]
  ],
  [
    '2026-02-11',
    [
      { cuando: 'recomendacion', nombre: 'sim-06-mala-noche', nota: 'Noche mala y hambre voraz: la app baja el listón ese día' }
    ]
  ],
  [
    // Semana 24, ya con el estancamiento detectado y el volumen al máximo.
    '2026-06-22',
    [
      { cuando: 'plan', nombre: 'sim-09-plan-maximo', nota: 'El plan en el nivel máximo: más ejercicios, cuatro series y cargas de 24 kg' },
      { cuando: 'sesion', nombre: 'sim-10-sesion-maxima', nota: 'La misma sesión con todo anotado, seis meses después de empezar con peso corporal' }
    ]
  ]
])

let semana = 0
let fecha = new Date(INICIO)
let ultimoNivel = null
let ultimaMedicion = -99

console.log('\n── Seis meses de entrenamiento ──')

for (let dia = 0; dia < SEMANAS * 7; dia++) {
  fecha = new Date(INICIO.getTime() + dia * 86400000)
  fecha.setHours(9, 0, 0, 0)
  semana = Math.floor(dia / 7)
  const clave = iso(fecha)

  // Báscula cada dos semanas, en domingo.
  if (fecha.getDay() === 0 && semana - ultimaMedicion >= 2) {
    ultimaMedicion = semana
    const c = composicion(semana)
    const capturas = []
    if (semana === 10) {
      capturas.push({
        nombre: 'sim-07-tendencia-buena',
        nota: 'Semana 8: la gráfica ya tiene datos suficientes y detecta recomposición',
        scroll: '.trend-chart'
      })
    }
    if (semana === 22) {
      capturas.push({
        nombre: 'sim-11-estancamiento',
        nota: 'Semana 22: doce semanas planas, y la app lo dice sin dramatizar ni hablar de calorías',
        scroll: '.verdict'
      })
      capturas.push({
        nombre: 'sim-12-tendencia-plana',
        nota: 'La gráfica del mismo momento: sube hasta la semana 12 y ahí se aplana',
        scroll: '.trend-chart'
      })
    }
    const veredicto = await medir(fecha, { ...c, capturas })
    console.log(`  semana ${semana} · báscula ${c.pesoKg} kg / ${c.grasaPct} % grasa / ${c.musculoPct} % músculo → ${veredicto ?? '—'}`)
    continue
  }

  if (!DIAS_ENTRENO.includes(fecha.getDay())) continue

  const rec = await entrenar(fecha, {
    mal: NOCHES_MALAS.has(clave),
    capturas: capturasPorFecha.get(clave) ?? [],
    nivelAnterior: ultimoNivel
  })

  // Cada vez que sube de nivel de volumen, se guarda la prueba.
  if (rec.nivel && rec.nivel !== ultimoNivel) {
    ultimoNivel = rec.nivel
    bitacora.hitos.push({
      fecha: clave,
      nota: `Nivel de volumen ${rec.nivel} de 4`,
      motivo: rec.motivo
    })
    console.log(`  semana ${semana} · ${clave} · ${rec.titulo} → NIVEL ${rec.nivel}`)
  } else {
    const carga = registroCarga(rec, bitacora.sesiones.at(-1))
    console.log(`  s${semana} · ${clave} · ${rec.titulo}${rec.nivel ? ` (nivel ${rec.nivel})` : ''}${carga}`)
  }
}

// ── Foto final ────────────────────────────────────────────
await irAlDia(new Date(fecha.getTime() + 86400000))
await page.locator('.tab', { hasText: 'Cuerpo' }).click()
await page.waitForTimeout(400)
await page.locator('.card').filter({ hasText: 'Balance muscular' }).first().scrollIntoViewIfNeeded()
await shot('sim-13-balance-final', 'Balance muscular tras seis meses: ningún grupo abandonado')

writeFileSync(`${OUT}/bitacora.json`, JSON.stringify(bitacora, null, 2))

await browser.close()
console.log('\nSesiones registradas:', bitacora.sesiones.length)
console.log('Mediciones:', bitacora.mediciones.length)
if (errores.length) {
  console.error('ERRORES EN CONSOLA:', errores.slice(0, 5))
  process.exit(1)
}
console.log('Simulación completa sin errores de consola')
