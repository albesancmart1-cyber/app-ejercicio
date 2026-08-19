/**
 * Los días sin contestar el test cuentan, en navegador.
 *
 * El fallo: la señal de leptina se calculaba **solo sobre los días
 * contestados**, así que una semana con un par de check-ins buenos y cinco días
 * en blanco salía como «93 sobre 100 · alta · señal limpia». La app premiaba
 * dejar de contestar, y esa cifra inflada alimentaba además la interpretación
 * de la tendencia y la progresión de carga.
 *
 * Lo que tiene que pasar:
 *
 *  - Una semana entera contestada y buena llega a **alta**, dice lo que suma y
 *    no avisa de nada: no falta nada.
 *  - La misma semana con **un solo día contestado** no llega a alta, dice
 *    cuántos días faltan, y **no lista aciertos**: siete afirmaciones sobre la
 *    semana hechas con un día no son información.
 *  - Dejar de contestar **nunca sube** la puntuación.
 *
 *   node scripts/check-dias-sin-contestar.mjs
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'es-ES' })
const errores = []
page.on('pageerror', (e) => errores.push(e.message))
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))

/**
 * Siembra `contestados` días de check-in perfecto dentro de la última semana,
 * con historial de entrenos suficiente para que el resto de la pantalla exista.
 */
async function conCheckIns(contestados) {
  await page.goto(BASE)
  await page.evaluate((n) => {
    const hoy = new Date()
    const menos = (d) => {
      const x = new Date(hoy)
      x.setDate(x.getDate() - d)
      return x.toISOString().slice(0, 10)
    }
    const ej = (id, name, primary) => ({
      exerciseId: id,
      name,
      primary,
      plan: { sets: 4, reps: '8-12', rir: 2, restSeconds: 120, weightKg: 40 },
      done: true,
      logs: Array.from({ length: 4 }, () => ({ done: true, reps: 10, weightKg: 40, rir: 2 }))
    })
    const sessions = []
    for (let i = 1; i < 30; i += 2) {
      sessions.push({
        id: 's' + i,
        date: menos(i),
        kind: 'fuerza',
        title: 'Fuerza',
        completed: true,
        rpe: 3,
        durationSec: 3600,
        exercises: [ej('press_banca_mancuernas', 'Press de banca con mancuernas', 'pecho')]
      })
    }
    // Días perfectos, y solo `n` de los siete últimos.
    const checkIns = Array.from({ length: n }, (_, i) => ({
      date: menos(i),
      sleep: 5,
      lightHygiene: true,
      sunrise: true,
      sunsetYesterday: true,
      sunExposure: true,
      keto: false,
      energy: 5,
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
          equipment: ['peso_corporal', 'mancuernas', 'banco'],
          maxWeights: { mancuernas: 24 }
        },
        checkIns,
        sessions,
        measurements: []
      })
    )
  }, contestados)
  await page.goto(BASE)
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  await page.waitForTimeout(600)
  await page.getByRole('tab', { name: 'Cuerpo' }).click()
  await page.waitForTimeout(800)

  const tarjeta = page.locator('.card').filter({ hasText: 'Señal de leptina' }).first()
  await tarjeta.scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  const texto = await tarjeta.innerText()
  const cifra = Number((texto.match(/^(\d+)\s*\/\s*100/m) ?? [])[1])
  return {
    texto,
    cifra,
    nivel: (texto.match(/\n(baja|media|alta)\b/) ?? [])[1],
    aciertos: await tarjeta.locator('.reasons li').count(),
    aviso: await tarjeta.locator('.leptina-cobertura').count(),
    tarjeta
  }
}

// ── La semana entera contestada ───────────────────────────
const entera = await conCheckIns(7)
comprobar(
  Number.isFinite(entera.cifra),
  `no se lee la cifra de la señal: ${entera.texto.slice(0, 120)}`
)
comprobar(entera.nivel === 'alta', `siete días buenos deberían dar «alta» y dan «${entera.nivel}»`)
comprobar(entera.aciertos > 3, `con la semana entera deberían listarse los aciertos, y hay ${entera.aciertos}`)
comprobar(entera.aviso === 0, 'con la semana entera contestada no debería avisar de días que faltan')
await entera.tarjeta.screenshot({ path: `${OUT}/leptina-semana-entera.png` })

// ── Un solo día contestado ────────────────────────────────
const uno = await conCheckIns(1)
comprobar(Number.isFinite(uno.cifra), `no se lee la cifra con un solo día: ${uno.texto.slice(0, 120)}`)
comprobar(
  uno.nivel !== 'alta',
  `un día bueno y seis en blanco no pueden dar «alta»: da ${uno.cifra}/100 · ${uno.nivel}`
)
comprobar(
  uno.aviso > 0,
  'con seis días sin contestar no se dice en ninguna parte que faltan'
)
comprobar(
  /6 de los últimos 7 días/.test(uno.texto),
  `debería decir cuántos días faltan: ${uno.texto.slice(0, 200)}`
)
comprobar(
  uno.aciertos === 0,
  `con un solo día no se pueden cantar ${uno.aciertos} aciertos sobre la semana`
)
await uno.tarjeta.screenshot({ path: `${OUT}/leptina-un-dia.png` })

// ── Y callarse nunca puntúa mejor ─────────────────────────
comprobar(
  uno.cifra < entera.cifra,
  `dejar de contestar sube la nota: ${uno.cifra} con un día frente a ${entera.cifra} con siete`
)

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(
  `Días sin contestar: bien. Con siete días ${entera.cifra}/100 · ${entera.nivel}; ` +
    `con uno, ${uno.cifra}/100 · ${uno.nivel}. Capturas en ${OUT}`
)
