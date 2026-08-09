/**
 * Cocina y Yo, en navegador.
 *
 * **Cocina**: lo primero que se ve son tres platos, sin haber pedido nada.
 * Antes había que elegir dos filtros y tirar de una palanca para ver *una*
 * idea; elegir de verdad es comparar, y con una sola no se puede. Se comprueba
 * que salen tres, que «otras tres» trae otras, que abrir una lleva a su receta
 * y que la proteína se dice como banda —una zona, no una diana— y no como una
 * barra que se llena.
 *
 * **Yo**: los ajustes eran quinientas líneas de scroll con catorce tarjetas
 * seguidas. Se comprueba que hay cuatro grupos, que cada cosa está en el suyo y
 * que lo que se toca una vez al año no comparte pantalla con lo de cada mes.
 *
 *   node scripts/check-cocina-yo.mjs
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

await page.goto(BASE)
await page.evaluate(() => {
  localStorage.setItem(
    'ritmo-data-v1',
    JSON.stringify({
      version: 2,
      profile: {
        name: 'Alberto',
        goal: 'recomposicion',
        weightKg: 80,
        heightCm: 180,
        equipment: ['peso_corporal', 'mancuernas', 'banco'],
        maxWeights: { mancuernas: 24 },
        favoriteExercises: ['press_banca_mancuernas'],
        dislikedExercises: ['burpees']
      },
      checkIns: [],
      sessions: [],
      measurements: [],
      routines: [
        {
          id: 'r1',
          name: 'Empuje de casa',
          folder: 'Casa',
          createdAt: Date.now(),
          kind: 'fuerza',
          exercises: [
            {
              exerciseId: 'press_banca_mancuernas',
              name: 'Press de banca con mancuernas',
              primary: 'pecho',
              plan: { sets: 3, reps: '8-12', rir: 2, restSeconds: 90 }
            }
          ]
        }
      ]
    })
  )
})
await page.goto(BASE)
await page.waitForTimeout(800)

// ── Cocina ────────────────────────────────────────────────
await page.locator('.tab', { hasText: 'Cocina' }).click()
await page.waitForTimeout(600)

comprobar(
  (await page.locator('h1').first().innerText()).trim() === 'Cocina',
  'la pestaña de comer debería llamarse Cocina'
)
const ideas = page.locator('.idea')
comprobar((await ideas.count()) === 3, `deberían salir tres ideas de entrada, salen ${await ideas.count()}`)

const primeras = await ideas.locator('.idea-nombre').allInnerTexts()
comprobar(new Set(primeras).size === primeras.length, `las tres deben ser distintas: ${primeras}`)
console.log('  · tres ideas:', primeras.join(' | '))
await page.screenshot({ path: `${OUT}/cocina-1-ideas.png` })

// Pedir otras tres trae otras tres.
await page.getByRole('button', { name: 'Otras tres' }).click()
await page.waitForTimeout(500)
const segundas = await page.locator('.idea .idea-nombre').allInnerTexts()
comprobar(
  segundas.every((n) => !primeras.includes(n)),
  `«otras tres» debería traer otras: ${primeras} → ${segundas}`
)
console.log('  · otras tres:', segundas.join(' | '))

// La proteína, como banda y no como barra que se llena.
const banda = page.locator('.banda-zona')
comprobar(await banda.count(), 'no se ve la banda de proteína')
const medidas = await banda.first().evaluate((n) => {
  const p = n.parentElement.getBoundingClientRect()
  const z = n.getBoundingClientRect()
  return { inicio: (z.left - p.left) / p.width, ancho: z.width / p.width }
})
comprobar(medidas.inicio > 0.05, `la banda debería empezar dentro de la regla: ${JSON.stringify(medidas)}`)
comprobar(
  medidas.inicio + medidas.ancho < 0.95,
  `la banda no debería llegar al final: es una zona, no un depósito lleno: ${JSON.stringify(medidas)}`
)
console.log(
  '  · banda de proteína:',
  (await page.locator('.banda-num').first().innerText()).replace(/\n/g, ' ')
)
await page.screenshot({ path: `${OUT}/cocina-2-banda.png` })

// Abrir una idea lleva a su receta, y se vuelve.
await page.locator('.idea').first().click()
await page.waitForTimeout(500)
comprobar(await page.locator('.reasons li').count(), 'la receta no enseña sus ingredientes')
comprobar(
  (await page.locator('h2').first().innerText()).trim() === segundas[0],
  'la receta abierta no es la que se ha tocado'
)
await page.screenshot({ path: `${OUT}/cocina-3-receta.png` })
await page.getByRole('button', { name: 'Volver a las ideas' }).click()
await page.waitForTimeout(400)
comprobar((await page.locator('.idea').count()) === 3, 'volver debería devolver las tres ideas')

// ── Yo ────────────────────────────────────────────────────
await page.locator('.tab', { hasText: 'Yo' }).click()
await page.waitForTimeout(600)

comprobar((await page.locator('h1').first().innerText()).trim() === 'Yo', 'la pestaña debería llamarse Yo')
const grupos = await page.locator('.segmentos [role="tab"]').allInnerTexts()
comprobar(
  grupos.join(',') === 'Perfil,Entreno,Comida,Cuenta',
  `los cuatro grupos deberían ser Perfil, Entreno, Comida y Cuenta: ${grupos}`
)
console.log('  · grupos de Yo:', grupos.join(' | '))

/** Lo que se ve en el grupo abierto. */
const contenido = async () =>
  (await page.locator('.cards-grid').first().textContent()).replace(/\s+/g, ' ')

// Perfil: quién eres y con qué cuentas.
const perfil = await contenido()
for (const cosa of ['Objetivo', 'Tus medidas', 'Equipamiento']) {
  comprobar(perfil.includes(cosa), `«${cosa}» debería estar en Perfil`)
}
comprobar(!perfil.includes('Borrar todos los datos'), 'borrarlo todo no puede estar en Perfil')
comprobar(!perfil.includes('Tus rutinas'), 'las rutinas no van en Perfil')
await page.screenshot({ path: `${OUT}/yo-1-perfil.png` })

// Entreno: todo lo que decide cómo se entrena.
await page.getByRole('tab', { name: 'Entreno' }).click()
await page.waitForTimeout(400)
const entreno = await contenido()
for (const cosa of [
  'Nivel de volumen',
  'Objetivos de volumen',
  'Ejercicios favoritos',
  'Tus rutinas',
  'Ejercicios descartados'
]) {
  comprobar(entreno.includes(cosa), `«${cosa}» debería estar en Entreno`)
}
await page.screenshot({ path: `${OUT}/yo-2-entreno.png` })

// Comida: cetosis, DHA y proteína.
await page.getByRole('tab', { name: 'Comida' }).click()
await page.waitForTimeout(400)
const comida = await contenido()
comprobar(/cetog[eé]nica/i.test(comida), 'la cetosis debería estar en Comida')
comprobar(/DHA/.test(comida), 'el DHA debería estar en Comida')
comprobar(/prote[ií]na/i.test(comida), 'la proteína debería estar en Comida')
await page.screenshot({ path: `${OUT}/yo-3-comida.png` })

// Cuenta: la cuenta, la versión y los datos.
await page.getByRole('tab', { name: 'Cuenta' }).click()
await page.waitForTimeout(400)
const cuenta = await contenido()
for (const cosa of ['Versión', 'Tus datos', 'Exportar copia', 'Borrar todos los datos']) {
  comprobar(cuenta.includes(cosa), `«${cosa}» debería estar en Cuenta`)
}
await page.screenshot({ path: `${OUT}/yo-4-cuenta.png` })

// Y lo que se ajusta sigue guardándose.
await page.getByRole('tab', { name: 'Perfil' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Ganar masa muscular' }).click()
await page.waitForTimeout(500)
const guardado = await page.evaluate(
  () => JSON.parse(localStorage.getItem('ritmo-data-v1')).profile.goal
)
comprobar(guardado === 'masa', `cambiar el objetivo debería guardarse, hay «${guardado}»`)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ Cocina abre con tres ideas y su banda de proteína, y Yo tiene sus cuatro grupos')
