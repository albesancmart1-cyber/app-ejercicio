/**
 * Los fallos que aparecieron entrenando, en navegador.
 *
 * Lo que tiene que pasar:
 *
 *  1. Un peso con **coma** se guarda como decimal: «102,5» son ciento dos kilos
 *     y medio, no mil veinticinco. Es el fallo que envenenaba el volumen y los
 *     récords sin que se notase.
 *  2. La cifra del peso y la de las repeticiones **caben enteras**, también con
 *     tres dígitos y coma, y también en una pantalla de 360.
 *  3. Todos los botones del descanso están **dentro de la pantalla** y por
 *     encima de la barra: antes el de seguir se salía por la derecha y solo se
 *     veían ocho de sus píxeles.
 *  4. Hay **−30 s** además de **+30 s**, y los dos mueven el reloj.
 *  5. «Corregir la serie» lleva a la **serie recién hecha**, con su peso y sus
 *     repeticiones, no a la siguiente. Y devuelve al descanso.
 *  6. El descanso **sobrevive** a salirse: irse a otra pestaña y volver sigue
 *     enseñando la cuenta atrás, no la serie siguiente.
 *
 *   node scripts/check-descanso-campos.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = process.env.OUT_DIR ?? '/tmp/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
mkdirSync(OUT, { recursive: true })

const fallos = []
const comprobar = (ok, queja) => {
  if (!ok) fallos.push(queja)
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})

/** Deja la app con perfil y check-in, y llega hasta el plan del día. */
async function hastaElPlan(page) {
  await page.goto(BASE)
  await page.evaluate(() => {
    const hoy = new Date()
    const menos = (d) => {
      const x = new Date(hoy)
      x.setDate(x.getDate() - d)
      return x.toISOString().slice(0, 10)
    }
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
          maxWeights: { mancuernas: 24, barra: 100 }
        },
        checkIns: Array.from({ length: 10 }, (_, i) => ({
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
        })),
        sessions: [],
        measurements: []
      })
    )
  })
  await page.goto(BASE)
  await page.waitForTimeout(800)
  await page.getByText('Empezar', { exact: false }).first().click()
  await page.waitForTimeout(300)
  await page.getByText('Ver qué me conviene').click()
  await page.waitForTimeout(500)
  const pesas = page.getByText('Prefiero algo con pesas')
  if (await pesas.count()) {
    await pesas.click()
    await page.waitForTimeout(400)
  }
  await page.getByText('Empezar entreno', { exact: false }).first().click()
  await page.waitForTimeout(800)
}

// ─────────────────────────────────────────────────────────────
// 1 · El peso con coma, en la lista de series
// ─────────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'es-ES' })
  await hastaElPlan(page)
  const kg = page.locator('.set-row').first().locator('.set-field input').first()
  await kg.click()
  await page.keyboard.type('102,5')
  // El guardado va con retardo: leer antes de que ocurra no prueba nada.
  await page.waitForTimeout(1200)
  const guardado = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
    const s = d.sessions[d.sessions.length - 1]
    return s?.exercises?.[0]?.logs?.[0]?.weightKg
  })
  comprobar(
    guardado === 102.5,
    `escribiendo «102,5» con coma se guardan ${guardado} kg, y deberían ser 102,5`
  )
  comprobar(guardado !== 1025, 'la coma se sigue tirando: 102,5 se guarda como 1025 kg')
  await page.close()
}

// ─────────────────────────────────────────────────────────────
// 2 a 6 · El entreno, a 390 y a 360
// ─────────────────────────────────────────────────────────────
for (const ancho of [390, 360]) {
  const page = await browser.newPage({ viewport: { width: ancho, height: 844 }, locale: 'es-ES' })
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

  await hastaElPlan(page)
  /*
   * El peso y las repeticiones se dejan puestos **desde la lista**, y con
   * decimal: el ejercicio que salga puede ir de kilo en kilo, y entonces subir
   * a toques nunca produciría una coma. Sin una cifra larga de verdad, la
   * comprobación de que la cifra cabe no comprobaría nada.
   */
  await page.locator('.set-row').first().locator('.set-field input').first().fill('102,5')
  await page.locator('.set-row').first().locator('.set-field input').nth(1).fill('12')
  await page.waitForTimeout(400)
  await page.getByText('Empezar entrenamiento', { exact: false }).first().click()
  await page.waitForTimeout(700)

  // ── 2 · Las cifras caben ───────────────────────────────────
  const cifras = page.locator('.focus-campo .stepper-num')
  const cuantas = await cifras.count()
  comprobar(cuantas === 2, `esperaba dos contadores en el modo foco y hay ${cuantas}`)
  if (cuantas !== 2) {
    console.error('Sin contadores no hay nada que medir.')
    await browser.close()
    process.exit(1)
  }

  const medidas = await cifras.evaluateAll((els) =>
    els.map((el) => ({
      valor: el.value,
      caja: el.clientWidth,
      necesita: el.scrollWidth,
      cortado: el.scrollWidth > el.clientWidth + 1
    }))
  )
  for (const m of medidas) {
    comprobar(
      !m.cortado,
      `a ${ancho} px la cifra «${m.valor}» se corta: caja de ${m.caja} px para ${m.necesita}`
    )
  }
  comprobar(
    medidas[0].valor === '102,5' && medidas[1].valor === '12',
    `el modo foco debería arrancar con 102,5 × 12 y arranca con ${medidas[0].valor} × ${medidas[1].valor}`
  )
  await page.screenshot({ path: `${OUT}/campos-${ancho}.png` })

  // ── 3 y 4 · Los botones del descanso ───────────────────────
  await page.getByRole('button', { name: 'Serie hecha' }).click()
  await page.waitForTimeout(700)
  comprobar(await page.locator('.rest-screen').count(), 'tras marcar la serie no aparece el descanso')

  const barra = await page.locator('.tabbar').boundingBox()
  const botones = await page.locator('.rest-botones button').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect()
      return { t: e.textContent.trim(), izq: r.x, der: r.x + r.width, abajo: r.y + r.height }
    })
  )
  comprobar(botones.length === 3, `esperaba tres botones de descanso y hay ${botones.length}`)
  for (const b of botones) {
    comprobar(
      b.izq >= -1 && b.der <= ancho + 1,
      `a ${ancho} px el botón «${b.t}» se sale de la pantalla (${Math.round(b.izq)}→${Math.round(b.der)})`
    )
    comprobar(
      !barra || b.abajo <= barra.y + 1,
      `a ${ancho} px el botón «${b.t}» queda bajo la barra (acaba en ${Math.round(b.abajo)}, la barra empieza en ${Math.round(barra?.y ?? 0)})`
    )
  }
  const textos = botones.map((b) => b.t)
  comprobar(
    textos.some((t) => t.includes('−30')),
    `falta el botón de −30 s; hay: ${textos.join(', ')}`
  )
  comprobar(
    textos.some((t) => t.includes('+30')),
    `falta el botón de +30 s; hay: ${textos.join(', ')}`
  )
  await page.screenshot({ path: `${OUT}/descanso-${ancho}.png` })

  // Los ±30 s mueven el reloj de verdad.
  const leerReloj = async () => {
    const t = (await page.locator('.rest-ring-num').textContent()) ?? '0:00'
    const [m, s] = t.trim().split(':').map(Number)
    return m * 60 + s
  }
  const antes = await leerReloj()
  await page.getByRole('button', { name: 'Añadir treinta segundos de descanso' }).click()
  await page.waitForTimeout(350)
  const tras30 = await leerReloj()
  comprobar(tras30 >= antes + 28, `«+30 s» pasó de ${antes} a ${tras30} segundos`)
  await page.getByRole('button', { name: 'Quitar treinta segundos de descanso' }).click()
  await page.waitForTimeout(350)
  const trasMenos = await leerReloj()
  comprobar(
    trasMenos <= tras30 - 28,
    `«−30 s» pasó de ${tras30} a ${trasMenos} segundos, y debería quitar treinta`
  )

  // ── 5 · Corregir lleva a la serie recién hecha ─────────────
  const hecho = ((await page.locator('.rest-hecho-num').textContent()) ?? '').trim()
  const [pesoHecho, repsHechas] = hecho.split('×').map((x) => x.replace(/kg/, '').trim())
  await page.getByRole('button', { name: 'Corregir la serie' }).click()
  // Un rato largo a propósito: es lo que permite comprobar después que el
  // descanso siguió corriendo por debajo mientras se corregía.
  await page.waitForTimeout(2500)
  const enFoco = await page.locator('.focus-campo .stepper-num').evaluateAll((e) => e.map((x) => x.value))
  comprobar(
    enFoco[0] === pesoHecho && enFoco[1] === repsHechas,
    `«Corregir la serie» debería enseñar ${pesoHecho} × ${repsHechas} y enseña ${enFoco[0]} × ${enFoco[1]}`
  )
  comprobar(
    await page.locator('.focus-corrigiendo').count(),
    'corrigiendo no se dice en ningún sitio: parece la serie que toca'
  )
  const volver = page.getByRole('button', { name: /Volver al descanso/ })
  comprobar(await volver.count(), 'no hay forma de volver al descanso desde la corrección')
  await page.screenshot({ path: `${OUT}/corrigiendo-${ancho}.png` })

  // Y el descanso sigue vivo por debajo: volver enseña la cuenta atrás.
  await volver.click()
  await page.waitForTimeout(400)
  comprobar(await page.locator('.rest-screen').count(), 'volver al descanso no devuelve al descanso')
  const alVolver = await leerReloj()
  comprobar(
    alVolver < trasMenos,
    `el descanso no siguió corriendo mientras se corregía: ${trasMenos} → ${alVolver}`
  )

  // ── 6 · Sobrevive a salirse de la pantalla ─────────────────
  await page.getByRole('button', { name: 'Cocina', exact: true }).click()
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Hoy', exact: true }).click()
  await page.waitForTimeout(800)
  comprobar(
    await page.locator('.rest-screen').count(),
    'al volver de otra pestaña el descanso ha desaparecido y planta la serie siguiente'
  )

  if (errores.length) console.error(`Errores de consola a ${ancho}:\n - ` + errores.join('\n - '))
  await page.close()
}

await browser.close()

if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Descanso y campos: bien. Capturas en ${OUT}`)
