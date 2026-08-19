/**
 * Corregir comidas ya apuntadas y mirar los días de antes, en navegador.
 *
 * Se apunta a toda prisa y luego se recuerda el detalle, así que corregir
 * tiene que costar lo mismo que apuntar; y el diario no puede ser solo el de
 * hoy, porque entender el peso es mirar la semana entera.
 *
 * Lo que tiene que pasar:
 *
 *  1. Cada comida apuntada tiene su botón de corregir, y abre el formulario
 *     **relleno**: su hora y sus alimentos.
 *  2. Un alimento del borrador se toca y **vuelve a los campos** con su ficha:
 *     un huevo sigue contándose en huevos. Cambiar 1 por 3 es un número.
 *  3. Al guardar, la comida se cambia **en su sitio** — no se duplica — y la
 *     cuenta de carbohidratos del día se rehace.
 *  4. Las flechas llevan a los días de antes, y el texto habla en pasado: de
 *     un día cerrado no se dice «se notará en la báscula de mañana».
 *  5. La lista de días apuntados salta a cualquiera de ellos.
 *  6. Una comida añadida mirando un día pasado se guarda **en ese día**.
 *  7. La mayonesa del catálogo es la de aceite de oliva.
 *
 *   node scripts/check-diario-dias.mjs
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

const menos = (d) => {
  const x = new Date()
  x.setDate(x.getDate() - d)
  return x.toISOString().slice(0, 10)
}
const HOY = menos(0)
const AYER = menos(1)
const HACE5 = menos(5)

await page.goto(BASE)
await page.evaluate(
  ([hoy, ayer, hace5]) => {
    localStorage.setItem(
      'ritmo-data-v1',
      JSON.stringify({
        version: 2,
        profile: {
          name: 'Alberto',
          goal: 'recomposicion',
          weightKg: 80,
          heightCm: 180,
          equipment: ['peso_corporal', 'mancuernas'],
          maxWeights: { mancuernas: 24 }
        },
        checkIns: [
          {
            date: hoy,
            sleep: 4,
            lightHygiene: true,
            sunrise: true,
            sunsetYesterday: true,
            sunExposure: true,
            keto: true,
            energy: 4,
            discomfort: 'ninguna'
          }
        ],
        sessions: [],
        measurements: [],
        comidas: [
          {
            date: hoy,
            comidas: [
              {
                hora: '09:30',
                texto: '',
                alimentos: [
                  {
                    nombre: 'Huevo revuelto',
                    unidades: 1,
                    unidad: 'huevo',
                    gramos: 55,
                    alimentoId: 'huevo_revuelto',
                    etiquetas: ['proteina', 'huevos']
                  }
                ]
              }
            ]
          },
          {
            date: ayer,
            comidas: [
              {
                hora: '14:00',
                texto: '',
                alimentos: [
                  {
                    nombre: 'Pasta / macarrones cocidos',
                    gramos: 250,
                    alimentoId: 'pasta',
                    etiquetas: ['carbohidrato']
                  }
                ]
              }
            ]
          },
          {
            date: hace5,
            comidas: [
              { hora: '13:00', texto: '', alimentos: [{ nombre: 'Entrecot', gramos: 300, etiquetas: ['proteina'] }] }
            ]
          }
        ]
      })
    )
  },
  [HOY, AYER, HACE5]
)
await page.goto(BASE)
await page.waitForTimeout(800)
await page.getByRole('button', { name: 'Cocina', exact: true }).click()
await page.waitForTimeout(700)

const diario = page.locator('.diario-comidas')
comprobar(/Hoy has comido/.test(await diario.innerText()), 'el diario no arranca en hoy')

// ── 1 y 2 · Corregir una comida, retocando su alimento ────
await diario.getByRole('button', { name: 'Corregir la comida de las 09:30' }).click()
await page.waitForTimeout(350)
const horaPuesta = await diario.getByLabel('Hora de la comida').inputValue()
comprobar(/^09:30/.test(horaPuesta), `el formulario no trae la hora puesta: «${horaPuesta}»`)
comprobar(
  /Huevo revuelto/.test(await diario.locator('.comida-borrador').innerText()),
  'el formulario no trae los alimentos de la comida'
)
await diario.screenshot({ path: `${OUT}/diario-corrigiendo.png` })

// Se toca el huevo y vuelve a los campos, contándose todavía en huevos.
await diario.getByRole('button', { name: 'Cambiar Huevo revuelto' }).click()
await page.waitForTimeout(300)
const campoHuevos = diario.getByLabel('Cantidad en huevos')
comprobar((await campoHuevos.count()) > 0, 'al retocarlo pierde que se cuenta por unidades')
comprobar((await campoHuevos.inputValue()) === '1', 'no recupera las unidades que tenía')
await campoHuevos.fill('3')
await diario.getByRole('button', { name: 'Guardar los cambios' }).click()
await page.waitForTimeout(500)

// ── 3 · Se cambia en su sitio, no se duplica ──────────────
const trasCorregir = await diario.innerText()
comprobar(/3 huevos/.test(trasCorregir), `la corrección no se ve: ${trasCorregir.slice(0, 250)}`)
const deHoy = await page.evaluate((hoy) => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  return d.comidas?.find((x) => x.date === hoy)?.comidas
}, HOY)
comprobar(deHoy?.length === 1, `corregir no debe duplicar la comida, y hay ${deHoy?.length}`)
comprobar(deHoy?.[0]?.alimentos?.[0]?.gramos === 165, `los gramos no se rehacen: ${JSON.stringify(deHoy?.[0])}`)

// ── 4 · Ir a ayer, y hablar en pasado ─────────────────────
await diario.getByRole('button', { name: 'Ver el día anterior' }).click()
await page.waitForTimeout(500)
const ayer = await diario.innerText()
comprobar(/Ayer comiste/.test(ayer), `la cabecera no dice el día: ${ayer.slice(0, 120)}`)
comprobar(/Pasta/.test(ayer), 'no salen las comidas de ayer')
comprobar(/fuera de cetosis/.test(ayer), 'la cuenta de ayer no se hace')
comprobar(/ese día/.test(ayer), `de un día cerrado no se dice «hoy»: ${ayer.slice(0, 400)}`)
comprobar(!/báscula de mañana/.test(ayer), 'de un día cerrado no se avisa en futuro')
await diario.screenshot({ path: `${OUT}/diario-ayer.png` })

// Y se vuelve a hoy con la otra flecha.
await diario.getByRole('button', { name: 'Ver el día siguiente' }).click()
await page.waitForTimeout(450)
comprobar(/Hoy has comido/.test(await diario.innerText()), 'la flecha de volver no vuelve a hoy')
comprobar(
  await diario.getByRole('button', { name: 'Ver el día siguiente' }).isDisabled(),
  'en hoy no se puede ir hacia delante'
)

// ── 5 · La lista de días apuntados ────────────────────────
await diario.getByRole('button', { name: /Ver los otros \d+ días apuntados/ }).click()
await page.waitForTimeout(400)
const dias = diario.locator('.dia-anterior')
comprobar((await dias.count()) === 2, `deberían listarse los 2 días de antes y hay ${await dias.count()}`)
await diario.screenshot({ path: `${OUT}/diario-dias.png` })
await dias.last().click()
await page.waitForTimeout(500)
const viejo = await diario.innerText()
comprobar(/Entrecot/.test(viejo), `saltar al día viejo no lo abre: ${viejo.slice(0, 200)}`)
comprobar(!/Hoy has comido/.test(viejo), 'saltar al día viejo se queda en hoy')

// ── 6 y 7 · Añadir en un día pasado, con la mayonesa ──────
await diario.getByRole('button', { name: 'Añadir una comida de ese día' }).click()
await page.waitForTimeout(300)
await diario.getByLabel('Nombre del alimento').fill('mayonesa')
await page.waitForTimeout(350)
const mayo = diario.locator('.alimento-resultado').first()
comprobar((await mayo.count()) > 0, 'buscar «mayonesa» no encuentra nada')
comprobar(
  /aceite de oliva/i.test(await mayo.innerText()),
  `la mayonesa del catálogo debe ser la de oliva: ${await mayo.innerText()}`
)
await mayo.click()
await page.waitForTimeout(300)
await diario.getByLabel('Peso del alimento en gramos').fill('20')
await diario.getByRole('button', { name: 'Guardar comida' }).click()
await page.waitForTimeout(500)

const guardado = await page.evaluate(
  ([hoy, hace5]) => {
    const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
    return {
      viejo: d.comidas?.find((x) => x.date === hace5)?.comidas ?? [],
      hoy: d.comidas?.find((x) => x.date === hoy)?.comidas ?? []
    }
  },
  [HOY, HACE5]
)
comprobar(
  guardado.viejo.length === 2,
  `la comida debía ir al día que se estaba mirando y ese día tiene ${guardado.viejo.length}`
)
comprobar(guardado.hoy.length === 1, 'la comida de un día pasado no puede colarse en hoy')
comprobar(
  guardado.viejo.some((c) => (c.alimentos ?? []).some((a) => a.alimentoId === 'mayonesa_oliva')),
  'la mayonesa no quedó enlazada al catálogo'
)

const final = await diario.innerText()
comprobar(!/calor[ií]a|kcal/i.test(final), 'el diario habla de calorías')

await browser.close()

if (errores.length) console.error('Errores de consola:\n - ' + errores.join('\n - '))
if (fallos.length) {
  console.error('FALLA:\n - ' + fallos.join('\n - '))
  process.exit(1)
}
console.log(`Diario por días y correcciones: bien. Capturas en ${OUT}`)
