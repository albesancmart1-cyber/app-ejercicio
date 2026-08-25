/**
 * La pestaña de Luz, en navegador.
 *
 * Lo que tiene que pasar: que sin coordenadas pida el sitio en vez de inventarse
 * un amanecer; que con ellas salgan las horas reales del arco; que fichar sea un
 * toque y sepa bajo qué luz estás; que una lámpara se pueda crear con **todas**
 * sus longitudes de onda y que la sesión dé la dosis con la distancia aplicada;
 * y que el balance diga «no había» —y no un cero— cuando el cielo no lo ofrecía.
 *
 *   node scripts/check-luz.mjs
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
const datos = () => page.evaluate(() => JSON.parse(localStorage.getItem('ritmo-data-v1')))
const texto = () => page.locator('.card-wrap').innerText()

// ── Un perfil hecho, pero todavía sin coordenadas ──────────────────────
await page.goto(BASE)
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
        heightCm: 178
      },
      checkIns: [],
      sessions: [],
      measurements: []
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Luz' }).click()
await page.waitForTimeout(500)

comprobar(
  (await texto()).includes('Dos números, una vez'),
  'sin coordenadas debería pedir el sitio en vez de enseñar un arco inventado'
)
await page.screenshot({ path: `${OUT}/luz-01-pedir-sitio.png` })

// ── Se meten con coma decimal, que es como se escriben aquí ────────────
await page.getByPlaceholder('40,4165').fill('40,4165')
await page.getByPlaceholder('-3,7026').fill('-3,7026')
await page.getByPlaceholder('Madrid').fill('Madrid')
await page.getByRole('button', { name: 'Guardar mi sitio' }).click()
await page.waitForTimeout(500)

const perfil = (await datos()).profile
comprobar(
  Math.abs(perfil.lat - 40.4165) < 1e-6 && Math.abs(perfil.lon - -3.7026) < 1e-6,
  `las coordenadas deberían leerse con coma: ${JSON.stringify([perfil.lat, perfil.lon])}`
)

// ── El arco ────────────────────────────────────────────────────────────
const arco = await texto()
comprobar(/\d{2}:\d{2}/.test(arco), 'el arco debería traer horas de verdad')
comprobar(arco.includes('Luz del día'), 'debería decir cuánto dura el día')
comprobar(arco.includes('Desde ayer'), 'y cuánto ha cambiado desde ayer')
comprobar(arco.includes('Crepúsculo civil'), 'con sus umbrales nombrados')
await page.screenshot({ path: `${OUT}/luz-02-arco.png` })

// ── El puesto de trabajo y el fichaje ──────────────────────────────────
await page.getByRole('button', { name: 'Configurar mi puesto' }).click()
await page.getByPlaceholder('El taller').fill('El taller')
await page.getByPlaceholder('5700').fill('5700')
await page.getByPlaceholder('450').fill('450')
await page.getByRole('button', { name: 'Gafas ámbar' }).click()
await page.getByRole('button', { name: 'Guardar el puesto' }).click()
await page.waitForTimeout(400)

const conPuesto = await texto()
comprobar(conPuesto.includes('El taller'), 'el puesto debería quedar guardado y a la vista')
comprobar(
  conPuesto.includes('no te cuesta amplitud'),
  'a 450 lux las gafas no cuestan amplitud, y eso hay que decirlo'
)
await page.screenshot({ path: `${OUT}/luz-03-puesto.png` })

await page.getByRole('button', { name: 'Fichar entrada' }).click()
await page.waitForTimeout(400)
const fichajes = (await datos()).fichajes ?? []
comprobar(fichajes.length === 1, `fichar debería guardar un fichaje, hay ${fichajes.length}`)
comprobar(
  fichajes[0]?.luz?.lux === 450 && fichajes[0]?.luz?.filtro === 'ambar',
  'el fichaje debería congelar la luz del puesto, no referenciarla'
)
comprobar((await texto()).includes('Llevas dentro'), 'y decir cuánto llevas dentro')

// ── Una lámpara con cuatro longitudes de onda ──────────────────────────
await page.getByRole('button', { name: 'Crear una lámpara' }).click()
await page.getByPlaceholder('Panel del salón').fill('Panel del salón')
await page.getByPlaceholder('15').fill('15')

for (const [nm, mw] of [
  ['630', '12'],
  ['660', '18'],
  ['810', '16'],
  ['850', '14']
]) {
  await page.getByPlaceholder('660').fill(nm)
  await page.getByPlaceholder('18').fill(mw)
  await page.getByRole('button', { name: 'Añadir esta onda' }).click()
  await page.waitForTimeout(120)
}

// Una errata típica: 66 en vez de 660. No debe dejarse añadir.
await page.getByPlaceholder('660').fill('66')
const conErrata = await texto()
comprobar(
  conErrata.includes('se sale del rango'),
  'una longitud de onda fuera de rango debería avisar, no colarse'
)
comprobar(
  await page.getByRole('button', { name: 'Añadir esta onda' }).isDisabled(),
  'y el botón de añadirla debería estar apagado'
)
await page.getByPlaceholder('660').fill('')
await page.screenshot({ path: `${OUT}/luz-04-lampara.png` })

await page.getByRole('button', { name: 'Guardar lámpara' }).click()
await page.waitForTimeout(400)

const lamparas = (await datos()).lamparas ?? []
comprobar(lamparas.length === 1, `debería haber una lámpara, hay ${lamparas.length}`)
comprobar(lamparas[0]?.ondas?.length === 4, 'con sus cuatro longitudes de onda')
const conLampara = await texto()
comprobar(conLampara.includes('4 ondas'), 'y decirlo en la lista')
comprobar(conLampara.includes('3 de 4'), 'con los picos de Karu que cubre')

// ── La sesión: la dosis y la ley del inverso del cuadrado ──────────────
await page.getByRole('button', { name: 'Apuntar una sesión' }).click()
await page.waitForTimeout(200)
await page.getByLabel('Minutos').fill('10')
/*
 * La distancia va por lámpara y por eso el campo lleva su nombre: en una sesión
 * con dos aparatos no existe una distancia común, y suponerla multiplicaría o
 * dividiría por cuatro media dosis sin avisar.
 */
const distanciaDelPanel = page.getByLabel('Distancia de Panel del salón en centímetros')
await distanciaDelPanel.fill('15')
await page.waitForTimeout(200)

const aQuince = await texto()
comprobar(aQuince.includes('36,0 J/cm²'), `60 mW/cm² diez minutos son 36 J/cm²: ${aQuince.match(/[\d,]+ J\/cm²/)?.[0]}`)

await distanciaDelPanel.fill('30')
await page.waitForTimeout(250)
const aTreinta = await texto()
comprobar(
  aTreinta.includes('9,0 J/cm²'),
  'al doble de distancia debería entregar la cuarta parte'
)
comprobar(
  aTreinta.includes('cuadrado de la distancia'),
  'y explicar por qué, que es lo que casi nadie sabe'
)
await page.screenshot({ path: `${OUT}/luz-05-sesion.png` })

await page.getByRole('button', { name: 'Guardar sesión' }).click()
await page.waitForTimeout(400)
comprobar(((await datos()).sesionesPBM ?? []).length === 1, 'la sesión debería guardarse')

// ── Qué hace cada longitud de onda ─────────────────────────────────────
/*
 * La tabla del espectro. Se comprueba que está, que se abre, que dice de dónde
 * sale cada cosa, y —lo que más importa— que empieza por la advertencia de la
 * respuesta bifásica en vez de por una lista de bondades.
 */
await page.getByRole('button', { name: 'Abrir la tabla' }).click()
await page.waitForTimeout(400)
const espectro = page.locator('.card').filter({ hasText: 'Qué hace cada longitud de onda' })
const listaDeOndas = await espectro.innerText()
comprobar(listaDeOndas.includes('bifásica'), 'la tabla debería abrir avisando de que pasarse inhibe')
comprobar(listaDeOndas.includes('UVB corto'), 'y llegar desde el UVB…')
comprobar(listaDeOndas.includes('Infrarrojo lejano'), '…hasta el infrarrojo lejano')

await espectro.getByRole('button', { name: /^UVA/ }).click()
await page.waitForTimeout(400)
const uva = await espectro.innerText()
comprobar(uva.includes('Lo absorbe'), 'cada tramo debería decir qué molécula lo absorbe')
comprobar(uva.includes('Hasta dónde llega'), 'y hasta dónde llega en el tejido')
comprobar(uva.includes('óxido nítrico'), 'con lo documentado del tramo')
comprobar(/\b(19|20)\d{2}\b/.test(uva), 'y su fuente con el año, que es lo que lo hace comprobable')
await page.screenshot({ path: `${OUT}/luz-07-espectro.png`, fullPage: true })

await espectro.getByRole('button', { name: /^Infrarrojo lejano/ }).click()
await page.waitForTimeout(400)
const lejano = await espectro.innerText()
comprobar(
  lejano.includes('micras'),
  'el infrarrojo lejano debería decir que se queda en micras, no en centímetros'
)
comprobar(
  lejano.includes('Ojo'),
  'y desmontar lo que se lee por ahí, que es la mitad de la razón de tener esta tabla'
)
await espectro.getByRole('button', { name: 'Cerrar' }).click()
await page.waitForTimeout(300)

// ── Corregir una lámpara sin borrarla y volver a escribirla ────────────
/*
 * El dato que más se equivoca uno al teclear es la irradiancia, y es justo el
 * que multiplica toda la dosis. Antes la única salida era borrar la lámpara, y
 * eso dejaba sin calcular todas las sesiones que la usaban.
 */
await page.getByRole('button', { name: 'Editar Panel del salón' }).click()
await page.waitForTimeout(300)

const editando = await texto()
comprobar(editando.includes('Corregir la lámpara'), 'debería poder corregirse una lámpara')
comprobar(
  editando.includes('se recalculan'),
  'avisando de que las sesiones ya apuntadas se recalculan: la dosis no va congelada'
)
comprobar(
  editando.includes('Guardar cambios'),
  'y el botón debería decir que corrige, no que crea otra'
)

// Se le cambia el nombre y se guarda: ni se duplica ni se va al final.
await page.getByPlaceholder('Panel del salón').fill('Panel corregido')
await page.getByRole('button', { name: 'Guardar cambios' }).click()
await page.waitForTimeout(400)

const trasEditar = (await datos()).lamparas ?? []
comprobar(trasEditar.length === 1, `corregir no debería duplicar la lámpara, y hay ${trasEditar.length}`)
comprobar(trasEditar[0]?.nombre === 'Panel corregido', 'con el nombre nuevo')
comprobar(
  trasEditar[0]?.ondas?.length === 4,
  'y sus cuatro ondas intactas: corregir el nombre no borra lo demás'
)
comprobar(
  ((await datos()).sesionesPBM ?? []).length === 1,
  'y la sesión que la usaba sigue ahí, en vez de quedarse huérfana'
)

// Se le devuelve el nombre, que el resto del recorrido lo busca por él.
await page.getByRole('button', { name: 'Editar Panel corregido' }).click()
await page.waitForTimeout(300)
await page.getByPlaceholder('Panel del salón').fill('Panel del salón')
await page.getByRole('button', { name: 'Guardar cambios' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/luz-05c-editar.png`, fullPage: true })

// ── Dos lámparas a la vez en la misma sesión ───────────────────────────
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.lamparas = [
    ...d.lamparas,
    {
      id: 'bombilla',
      nombre: 'Bombilla de mano',
      distanciaRefCm: 10,
      ondas: [
        { nm: 660, irradiancia: 20 },
        { nm: 760, irradiancia: 10 }
      ]
    }
  ]
  d.sesionesPBM = []
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Luz' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Apuntar una sesión' }).first().click()
await page.waitForTimeout(300)
await page.getByLabel('Minutos').fill('10')
await page.getByRole('button', { name: 'Bombilla de mano', exact: true }).click()
await page.waitForTimeout(300)

const conDos = await texto()
comprobar(
  conDos.includes('54,0 J/cm²'),
  `los julios de las dos deberían sumarse: 36 + 18 = 54, y sale ${conDos.match(/[\d,]+ J\/cm²/)?.[0]}`
)
comprobar(conDos.includes('Lo que pone cada una'), 'y poder verse lo que pone cada una')
comprobar(
  conDos.includes('4 de 4') || conDos.includes('Picos'),
  'la lista de lámparas sigue enseñando sus picos'
)

await page.getByRole('button', { name: 'Guardar sesión' }).click()
await page.waitForTimeout(400)
const conDosPBM = ((await datos()).sesionesPBM ?? []).at(-1)
comprobar(conDosPBM?.lamparas?.length === 2, 'y guardarse las dos lámparas de la sesión')
comprobar(
  (await texto()).includes('Panel del salón + Bombilla de mano'),
  'y la lista de hoy debería nombrar las dos, no solo la primera'
)
await page.screenshot({ path: `${OUT}/luz-05b-dos-lamparas.png`, fullPage: true })

// ── Una lámpara con UVB sí fabrica vitamina D ──────────────────────────
/*
 * Era un fallo, no una limitación: la app daba por hecho que ninguna lámpara
 * emite UVB. A la piel le da igual si el fotón viene del sol o de un tubo.
 */
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.lamparas = [
    ...d.lamparas,
    {
      id: 'uvb',
      nombre: 'Lámpara de UVB',
      distanciaRefCm: 30,
      ondas: [
        { nm: 297, irradiancia: 0.05 },
        { nm: 310, irradiancia: 0.03 }
      ]
    }
  ]
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.tab', { hasText: 'Luz' }).click()
await page.waitForTimeout(400)

const conUVB = await texto()
comprobar(
  conUVB.includes('Vitamina D, con el torso descubierto'),
  'una lámpara con UVB debería decir cuánta vitamina D fabrica'
)
comprobar(
  /\d+ UI\/min/.test(conUVB),
  'con su cifra por minuto'
)
comprobar(
  conUVB.includes('Empezarías a enrojecer'),
  'y al lado, en cuánto quema: sin atmósfera delante quema antes de lo que uno intuye'
)
comprobar(
  conUVB.includes('frena la síntesis sola'),
  'diciendo lo que una lámpara de banda estrecha no trae'
)
comprobar(
  conUVB.includes('0,05 mW/cm²'),
  'y la irradiancia sin redondearse a cero, que es lo que pasaba con un decimal'
)
await page.screenshot({ path: `${OUT}/luz-08-uvb.png`, fullPage: true })

// El panel de rojo e infrarrojo sigue sin decir nada de vitamina D, y ahí sí
// es verdad: no emite en esa banda.
comprobar(
  (conUVB.match(/Vitamina D, con el torso descubierto/g) ?? []).length === 1,
  'y un panel de rojo e infrarrojo no debería decirlo: ahí el cero es verdad'
)


// ── El balance ─────────────────────────────────────────────────────────
const balance = await texto()
comprobar(balance.includes('Rojo e infrarrojo'), 'el balance debería traer sus cuatro barras')
comprobar(balance.includes('Ultravioleta'), 'incluida la de ultravioleta')
comprobar(balance.includes('Oscuridad de noche'), 'y la de oscuridad')
comprobar(
  balance.includes('media jornada al aire libre'),
  'y decir contra qué se mide el cien por cien: media jornada fuera, no el día entero'
)
comprobar(
  balance.includes('92 %'),
  'con el dato que lo justifica: el 92 % del tiempo en interiores'
)
comprobar(
  balance.includes('El 100 % es media jornada de sol fuera'),
  'y cada barra con su referencia en minutos, no solo el texto general'
)
comprobar(
  balance.includes('no es un objetivo'),
  'diciendo que la de ultravioleta no hay que llenarla: manda el tiempo hasta enrojecer'
)
await page.screenshot({ path: `${OUT}/luz-06-balance.png`, fullPage: true })

// ── La distinción que hace honesto el balance ──────────────────────────
// Cero es «no lo aprovechaste» y «no había» es «el cielo no lo ofrecía». Se
// comprueba aquí que se pintan distinto, porque de eso depende que la app no
// riña a nadie por su latitud ni por su turno. Que en diciembre la ventana de
// UVB sea nula lo cubren las pruebas de `balanceLuz.test.ts`, donde la fecha sí
// se puede fijar; aquí lo que se verifica es cómo se enseña.
comprobar(
  /Oscuridad de noche\s*\n\s*no había/.test(balance),
  'una barra sin dato debería decir «no había» y no un cero que suena a reproche'
)
comprobar(
  /Ultravioleta\s*\n\s*\d+ %/.test(balance),
  'y una que sí tenía disponible debería dar su porcentaje'
)

// ── La tabla de compensaciones, con la fila que no tiene remedio ───────
await page.getByRole('button', { name: 'Ver la tabla' }).click()
await page.waitForTimeout(300)
const tabla = await texto()
comprobar(tabla.includes('Rojo e infrarrojo'), 'la tabla debería traer sus filas')
comprobar(
  tabla.includes('Nada lo tapa'),
  'la fila de la UVB debería decir que no la tapa nada — quitarla haría la tabla más agradable y menos cierta'
)
comprobar(
  tabla.includes('No cubre:'),
  'cada compensación debería decir qué NO cubre, que es lo que hace honesta la tabla'
)
comprobar(
  tabla.includes('Un LED rojo no pone tu reloj en hora'),
  'y decirse en concreto qué es lo que la lámpara no tapa'
)
await page.screenshot({ path: `${OUT}/luz-08-compensaciones.png`, fullPage: true })

const desborde = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
)
comprobar(desborde === 0, `la pantalla se desborda ${desborde} px a lo ancho`)

if (errores.length) fallos.push(`errores en consola: ${errores.join(' | ')}`)
await browser.close()

if (fallos.length) {
  console.error('✗ ' + fallos.join('\n✗ '))
  process.exit(1)
}
console.log('✓ Luz: el arco, el fichaje, las lámparas con sus ondas y el balance honesto')
