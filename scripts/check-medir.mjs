/**
 * La pestaña de Medir, en navegador.
 *
 * Lo que tiene que pasar: que empezar el sol pregunte piel y cielo y solo eso;
 * que el cronómetro corra; que al parar, **ese mismo rato** aparezca a la vez en
 * el balance de Luz, en los dos relojes y en la vitamina D de Progreso —que es
 * el punto entero del cambio: un toque que alimenta todo lo ya construido—; y
 * que el parte del día no reproche nada a quien no ha apuntado nada.
 *
 *   node scripts/check-medir.mjs
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
const texto = () => page.locator('.app-main').innerText()
const pestana = async (nombre) => {
  await page.locator('.tab', { hasText: nombre }).click()
  await page.waitForTimeout(400)
}

// ── Un perfil con sitio, para no tener que pedirlo aquí ────────────────
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
        heightCm: 178,
        age: 38,
        lat: 40.4165,
        lon: -3.7026,
        lugar: 'Madrid',
        fototipo: 'III'
      },
      checkIns: [],
      sessions: [],
      measurements: []
    })
  )
})
await page.reload({ waitUntil: 'networkidle' })

// ── La barra tiene seis pestañas y ninguna se sale ─────────────────────
comprobar((await page.locator('.tab').count()) === 6, 'la barra debería tener seis pestañas')
comprobar(
  (await page.locator('.tab', { hasText: 'Medir' }).count()) === 1,
  'y una de ellas debería ser Medir'
)
const primera = await page.locator('.tab').first().innerText()
comprobar(
  primera.includes('Medir'),
  `«Medir» debería ir la primera —es la única que se abre para hacer algo—, y va «${primera.trim()}»`
)

await pestana('Medir')
await page.screenshot({ path: `${OUT}/medir-01-botones.png`, fullPage: true })

const inicio = await texto()
comprobar(inicio.includes('Sol'), 'debería estar la baldosa del sol')
comprobar(inicio.includes('Amanecer'), 'y la del amanecer')
comprobar(inicio.includes('Sin tiempo hoy'), 'con lo que llevas hoy de cada una')
comprobar(inicio.includes('El sol ahora'), 'con lo que ofrece el sol en este momento')
comprobar(inicio.includes('El parte del día'), 'y el parte debajo')

// ── El parte no reprocha nada a quien no ha apuntado nada ──────────────
comprobar(
  !inicio.includes('En contra'),
  'un día sin apuntar nada no puede traer un grupo «En contra»: es la regla de tono del parte'
)

// ── Empezar el sol: pregunta piel y cielo, y nada más ──────────────────
await page.getByRole('button', { name: 'Sol', exact: true }).click()
await page.waitForTimeout(300)
const preguntas = await texto()
comprobar(preguntas.includes('Cuánta piel'), 'el sol debería preguntar cuánta piel')
comprobar(preguntas.includes('Cómo está el cielo'), 'y cómo está el cielo')
comprobar(
  preguntas.includes('no incluye nubes, ozono ni aerosoles'),
  'y decir que el cielo es un añadido nuestro sobre la fórmula, no parte de ella'
)
await page.screenshot({ path: `${OUT}/medir-02-piel-y-cielo.png`, fullPage: true })

await page.getByRole('button', { name: 'En bañador' }).click()
await page.getByRole('button', { name: 'Sol limpio' }).click()
await page.getByRole('button', { name: 'Empezar', exact: true }).click()
await page.waitForTimeout(400)

comprobar(
  (await page.getByRole('button', { name: 'Sol, en marcha' }).count()) === 1,
  'la baldosa del sol debería quedar marcada como en marcha, y decirlo también para un lector de pantalla'
)
comprobar(
  (await page.getByRole('button', { name: 'Sol, en marcha' }).getAttribute('aria-pressed')) ===
    'true',
  'con aria-pressed, que es lo que `ToggleGroup` aporta y no hay que reinventar'
)

const d1 = await datos()
comprobar(d1.enCurso?.length === 1, 'debería haber exactamente una actividad abierta')
comprobar(d1.enCurso?.[0].cielo === 'limpio', 'con el cielo congelado al empezar')
comprobar(
  d1.profile.pielHabitual === 'banador' && d1.profile.cieloHabitual === 'limpio',
  'y las dos respuestas recordadas en el perfil, para que la próxima vez sea un toque'
)
await page.screenshot({ path: `${OUT}/medir-03-en-marcha.png`, fullPage: true })

// ── Se para, y el rato tiene que llegar a los cuatro sitios ────────────
// Se retrasa el inicio media hora a mano: el recorrido no puede esperar
// treinta minutos, y lo que se comprueba es el reparto, no el reloj.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.enCurso[0].desde -= 30
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')
await page.getByRole('button', { name: 'Sol, en marcha' }).click()
await page.waitForTimeout(400)

const d2 = await datos()
comprobar((d2.enCurso ?? []).length === 0, 'al parar no debería quedar nada abierto')
comprobar(d2.salidas?.length === 1, 'debería haber quedado un rato fuera')
comprobar(
  d2.salidas?.[0].minutos >= 29 && d2.salidas?.[0].minutos <= 31,
  `el rato debería durar la media hora real, y dura ${d2.salidas?.[0].minutos}`
)
comprobar(d2.salidas?.[0].estimado === undefined, 'parado a mano no se marca como estimado')
comprobar(
  d2.sol?.[0].exposiciones?.length === 1,
  'y el sol debería dejar además su exposición para la vitamina D'
)
const exp = d2.sol?.[0].exposiciones?.[0]
comprobar(exp?.piel === 'banador' && exp?.cielo === 'limpio', 'con la piel y el cielo de cuando empezó')
comprobar(exp?.desde !== undefined, 'y con la hora, que es lo que permite usar la elevación real')

// ── El cielo se puede cambiar a media sesión ─────────────────────────
await page.getByRole('button', { name: 'Sol', exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Sin sol' }).click()
await page.getByRole('button', { name: 'Empezar', exact: true }).click()
await page.waitForTimeout(400)

comprobar(
  (await texto()).includes('Cómo está el cielo ahora'),
  'con el sol en marcha debería poder cambiarse el cielo'
)

/*
 * Se retrasa el inicio veinte minutos antes de tocar el cielo: si el cambio
 * cae en el mismo minuto que el arranque no hay nada que partir —no ha pasado
 * ningún rato bajo el cielo anterior— y `cambiarCielo` corrige el tramo en vez
 * de abrir otro, que es justo lo que debe hacer.
 */
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const x = d.enCurso.find((y) => y.tipo === 'sol')
  x.desde -= 20
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')

// Se despeja: lo que llevaba tiene que quedarse con el cielo que había.
await page.getByRole('button', { name: 'Sol limpio' }).click()
await page.waitForTimeout(400)

const dosTramos = await texto()
comprobar(
  dosTramos.includes('Lo que llevas de cada uno'),
  'y enseñar lo que llevas de cada cielo, no solo el actual'
)
comprobar(
  dosTramos.includes('no se promedia'),
  'diciendo por qué van separados: el factor del cielo multiplica'
)

/*
 * El segundo tramo acaba de empezar, así que se retrasa la sesión entera otros
 * veinte minutos: así cada tramo dura veinte y se puede comprobar el reparto
 * sin esperar cuarenta minutos de reloj. Y se vacía el sol del día, porque
 * antes ya hubo una sesión y sus exposiciones estorbarían la cuenta.
 */
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const x = d.enCurso.find((y) => y.tipo === 'sol')
  x.desde -= 20
  for (const t of x.tramosDeCielo) t.desde -= 20
  d.sol = []
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')
await page.getByRole('button', { name: 'Sol, en marcha' }).click()
await page.waitForTimeout(400)

const hoyIso = new Date().toISOString().slice(0, 10)
const tras = await datos()
const expos = (tras.sol ?? []).find((d) => d.date === hoyIso)?.exposiciones ?? []
comprobar(
  expos.length === 2,
  `deberían quedar dos exposiciones, una por cielo, y quedan ${expos.length}`
)
comprobar(
  expos[0]?.cielo === 'sin_sol' && expos[1]?.cielo === 'limpio',
  `en orden y con su cielo, y traen «${expos.map((e) => e.cielo).join(', ')}»`
)
comprobar(
  expos[0]?.minutos >= 19 && expos[0]?.minutos <= 21,
  `el primer tramo debería durar los veinte minutos que llevaba, y dura ${expos[0]?.minutos}`
)
comprobar(
  expos[1]?.minutos >= 19 && expos[1]?.minutos <= 21,
  `y el segundo los otros veinte, y dura ${expos[1]?.minutos}`
)
comprobar(
  (tras.salidas ?? []).filter((s) => s.tipo === 'sol').length === 2,
  'y un solo rato fuera por sesión: partir el cielo no puede duplicar los minutos de calle'
)
await page.screenshot({ path: `${OUT}/medir-10-cielo.png`, fullPage: true })

// ── Varias a la vez, que es lo que la rejilla tiene que permitir ──────
await page.getByRole('button', { name: 'Frío', exact: true }).click()
await page.getByRole('button', { name: 'Grounding', exact: true }).click()
await page.waitForTimeout(300)
comprobar(
  (await page.getByRole('button', { name: /, en marcha$/ }).count()) === 2,
  'dos baldosas deberían poder estar en marcha a la vez: el día se solapa de verdad'
)
await page.getByRole('button', { name: 'Frío, en marcha' }).click()
await page.waitForTimeout(200)
comprobar(
  (await page.getByRole('button', { name: 'Grounding, en marcha' }).count()) === 1,
  'y parar una no puede parar la otra'
)
await page.getByRole('button', { name: 'Grounding, en marcha' }).click()
await page.waitForTimeout(300)

// ── Entrelazado: estar descalzo ya es estar fuera ─────────────────────
await page.getByRole('button', { name: 'Grounding', exact: true }).click()
await page.waitForTimeout(400)
comprobar(
  (await page.getByRole('button', { name: /^Fuera/ }).getAttribute('aria-label')) ===
    'Fuera, incluida',
  'con el grounding en marcha, «Fuera» debería quedar incluida: estar descalzo en la hierba es estar fuera'
)
comprobar(
  await page.getByRole('button', { name: 'Fuera, incluida' }).isDisabled(),
  'y no poder pulsarse, porque pulsarla apuntaría el mismo rato dos veces'
)
await page.getByRole('button', { name: 'Grounding, en marcha' }).click()
await page.waitForTimeout(400)
const trasDescalzo = await datos()
comprobar(
  (trasDescalzo.habitos ?? []).some((h) => h.habito === 'grounding'),
  'parar el grounding debería dejar su hábito'
)
comprobar(
  (trasDescalzo.salidas ?? []).some((s) => s.tipo === 'grounding'),
  'y también su rato fuera — antes solo dejaba el hábito, y una hora descalzo no subía la amplitud'
)
comprobar(
  (await page.getByRole('button', { name: 'Fuera', exact: true }).count()) === 1,
  'y al pararlo, «Fuera» vuelve a poder pulsarse'
)

// ── La lámpara pregunta las tres cosas que hacen falta ────────────────
// Hace falta una creada: sin sus ondas no hay dosis, y la baldosa lo dice en
// vez de guardar una sesión que nunca podría contar nada.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.lamparas = [
    {
      id: 'l1',
      nombre: 'Panel del salón',
      distanciaRefCm: 15,
      ondas: [
        { nm: 660, irradiancia: 40 },
        { nm: 850, irradiancia: 60 }
      ]
    }
  ]
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')
await page.getByRole('button', { name: 'Lámpara', exact: true }).click()
await page.waitForTimeout(400)
const lampara = await texto()
comprobar(lampara.includes('Con cuál'), 'la lámpara debería preguntar con cuál')
comprobar(lampara.includes('Qué zona'), 'y qué zona')
comprobar(lampara.includes('A qué distancia'), 'y a qué distancia')
comprobar(
  lampara.includes('cuadrado de la distancia'),
  'diciendo por qué se pregunta: la irradiancia cae con el cuadrado, y suponerla inventaría la dosis'
)
await page.getByRole('button', { name: 'Espalda' }).click()
await page.getByRole('button', { name: 'Empezar', exact: true }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Lámpara, en marcha' }).click()
await page.waitForTimeout(400)
const conPBM = (await datos()).sesionesPBM ?? []
comprobar(conPBM.length === 1, 'la sesión de fotobiomodulación debería quedar guardada')
comprobar(conPBM[0]?.zona === 'espalda', `con la zona elegida, y trae «${conPBM[0]?.zona}»`)
comprobar(conPBM[0]?.distanciaCm === 15, 'y la distancia, no una supuesta')
comprobar(
  conPBM[0]?.lamparas === undefined,
  'con una sola lámpara no se guarda la lista, para no repetir lo que ya está'
)

// ── Dos lámparas a la vez, que es lo que se hace de verdad ────────────
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
await pestana('Medir')
await page.getByRole('button', { name: 'Lámpara', exact: true }).click()
await page.waitForTimeout(400)

const dosLamparas = page.locator('.card').filter({ hasText: 'Con cuál o con cuáles' })
await dosLamparas.getByRole('button', { name: 'Bombilla de mano' }).click()
await page.waitForTimeout(300)

const conDos = await dosLamparas.innerText()
comprobar(
  (conDos.match(/A qué distancia/g) ?? []).length === 2,
  'cada lámpara encendida debería pedir su propia distancia: la irradiancia cae con el cuadrado'
)
comprobar(
  conDos.includes('los julios se suman'),
  'y decirse que con dos los julios se suman, porque es energía y no una nota media'
)

await page.getByRole('button', { name: 'Empezar', exact: true }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Lámpara, en marcha' }).click()
await page.waitForTimeout(400)

const conDosGuardada = ((await datos()).sesionesPBM ?? []).at(-1)
comprobar(
  conDosGuardada?.lamparas?.length === 2,
  `una sesión con dos lámparas debería guardar las dos, y guarda ${conDosGuardada?.lamparas?.length}`
)
comprobar(
  conDosGuardada?.lamparas?.[1]?.distanciaCm === 10,
  'cada una con su distancia de referencia puesta de partida, no una común'
)
comprobar(
  conDosGuardada?.lamparaId === 'l1',
  'y la primera suelta arriba, para que lo que leía una lámpara siga leyendo'
)
comprobar(
  ((await datos()).sesionesPBM ?? []).length === 1,
  'y una sola sesión: estuviste debajo de las dos a la vez, no dos ratos seguidos'
)
await page.screenshot({ path: `${OUT}/medir-12-dos-lamparas.png`, fullPage: true })

// ── Un rato a mano, con su hora ───────────────────────────────────────
/*
 * La hora se elige lejos de las sesiones de sol de antes, que ocupan los
 * cuarenta minutos anteriores a ahora mismo. Si se dejara fija, el recorrido
 * pasaría o fallaría según la hora a la que se ejecutara: a las ocho de la
 * tarde un rato a las 06:30 está suelto, y a las siete de la mañana se pisa con
 * ellas. Media noche vale salvo de madrugada, y entonces vale el mediodía.
 */
const ahoraMin = await page.evaluate(() => new Date().getHours() * 60 + new Date().getMinutes())
const sueltoMin = ahoraMin >= 120 ? 0 : 12 * 60
const suelto = `${String(Math.floor(sueltoMin / 60)).padStart(2, '0')}:${String(sueltoMin % 60).padStart(2, '0')}`

await page.getByRole('button', { name: 'Apuntar un rato a mano' }).click()
await page.waitForTimeout(300)
await page.getByLabel('Hora a la que empezó').fill(suelto)
await page.getByRole('button', { name: 'Guardar el rato' }).click()
await page.waitForTimeout(400)
const aMano = ((await datos()).salidas ?? []).find((s) => s.desde === sueltoMin)
comprobar(aMano !== undefined, 'el rato apuntado a mano debería guardarse con la hora que se puso')
comprobar(aMano?.minutos === 30, `y con sus minutos, y trae ${aMano?.minutos}`)
comprobar(
  aMano?.estimado === undefined,
  'y sin marcarse como estimado: lo puso el usuario, no lo adivinó la app'
)

// ── La jornada, a mano, porque fichar se olvida ───────────────────────
/*
 * Hace falta un sitio de trabajo con su luz: lo que se guarda con el tramo es
 * la luz congelada, no una referencia al perfil, que podría cambiar después.
 */
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  d.perfilesLuz = [
    { id: 'taller', nombre: 'Taller', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ambar' }
  ]
  d.profile.perfilLuzHabitualId = 'taller'
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')

const panel = () => page.locator('.card').filter({ hasText: 'Apuntar un rato a mano' })
await page.getByRole('button', { name: 'Apuntar un rato a mano' }).click()
await page.waitForTimeout(300)
await panel().getByRole('button', { name: 'Trabajo' }).click()
await page.waitForTimeout(300)

const conTrabajo = await panel().innerText()
comprobar(conTrabajo.includes('Entré a las'), 'el trabajo debería pedir la hora de entrar')
comprobar(
  conTrabajo.includes('Salí a las'),
  'y la de salir, no una duración: de un turno uno se acuerda por sus dos horas'
)

await page.getByLabel('Hora a la que entré').fill('06:45')
await page.getByLabel('Hora a la que salí').fill('08:48')
await page.getByRole('button', { name: 'Guardar el tramo de trabajo' }).click()
await page.waitForTimeout(400)

const conFichaje = await datos()
const puesto = (conFichaje.fichajes ?? []).find((f) => f.entrada === 405)
comprobar(puesto !== undefined, 'el tramo de trabajo debería guardarse con la hora que se puso')
comprobar(puesto?.salida === 528, `y con la de salir, y trae ${puesto?.salida}`)
comprobar(
  puesto?.luz?.lux === 450 && puesto?.luz?.filtro === 'ambar',
  'con la luz del sitio congelada dentro, no con una referencia que el perfil pueda cambiar'
)

/*
 * Y tiene que verse: antes la baldosa apagada decía «Fichar» y nada más, así
 * que un tramo apuntado a mano no aparecía por ninguna parte.
 */
const rejillaConTrabajo = await texto()
comprobar(
  rejillaConTrabajo.includes('2 h 03 min'),
  'la baldosa de Trabajo debería enseñar la jornada de hoy, como las demás'
)

// Y el reparto del día tiene que contarlo como trabajo.
comprobar(
  rejillaConTrabajo.includes('Trabajo'),
  'y el reparto del día debería tener su rama de trabajo'
)

// ── Dos tramos que se pisan no se guardan, y se dice con cuál ─────────
await page.getByRole('button', { name: 'Apuntar un rato a mano' }).click()
await page.waitForTimeout(300)
await panel().getByRole('button', { name: 'Trabajo' }).click()
await page.getByLabel('Hora a la que entré').fill('08:00')
await page.getByLabel('Hora a la que salí').fill('10:00')
await page.waitForTimeout(300)

const pisado = await panel().innerText()
comprobar(pisado.includes('Se pisa con el tramo'), 'un tramo que se pisa con otro debería quejarse')
comprobar(pisado.includes('06:45'), 'diciendo con cuál, por sus horas')
comprobar(
  await panel().getByRole('button', { name: 'Guardar el tramo de trabajo' }).isDisabled(),
  'y no dejar guardarlo'
)

// Corregido, sí entra: un segundo turno que empieza donde acabó el primero.
await page.getByLabel('Hora a la que entré').fill('16:00')
await page.getByLabel('Hora a la que salí').fill('20:00')
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Guardar el tramo de trabajo' }).click()
await page.waitForTimeout(400)
comprobar(
  ((await datos()).fichajes ?? []).length === 2,
  'dos turnos en el mismo día son normales y tienen que caber'
)
comprobar(
  (await texto()).includes('6 h 03 min'),
  'y la baldosa tiene que sumar los dos, no enseñar solo el último'
)
await page.screenshot({ path: `${OUT}/medir-11-trabajo.png`, fullPage: true })

// ── Sin color: encendida se distingue por fondo y tinta, no por tono ──
await page.getByRole('button', { name: 'Frío', exact: true }).click()
await page.waitForTimeout(300)
const contraste = await page.evaluate(() => {
  const viva = document.querySelector('.baldosa-viva')
  const muerta = [...document.querySelectorAll('.baldosa')].find(
    (b) => !b.classList.contains('baldosa-viva') && !b.classList.contains('baldosa-incluida')
  )
  const fondo = (e) => (e ? getComputedStyle(e).backgroundColor : null)
  const tinta = (e) => (e ? getComputedStyle(e).color : null)
  return {
    viva: fondo(viva),
    muerta: fondo(muerta),
    tinta: tinta(viva),
    tintaMuerta: tinta(muerta)
  }
})
comprobar(
  contraste.viva !== null && contraste.viva !== contraste.muerta,
  'una baldosa en marcha tiene que distinguirse por el fondo, que es lo único que se ve al sol de la calle'
)
comprobar(
  contraste.tinta !== null && contraste.tinta !== contraste.tintaMuerta,
  'y también por la tinta: se da la vuelta entera, no cambia de tono'
)
await page.getByRole('button', { name: 'Frío, en marcha' }).click()
await page.waitForTimeout(300)

// ── La rejilla es una rejilla de verdad, no una fila que se desborda ───
const rejilla = await page.evaluate(() => {
  const g = document.querySelector('.baldosas')
  const cs = getComputedStyle(g)
  const uno = g.firstElementChild.getBoundingClientRect()
  return {
    display: cs.display,
    columnas: cs.gridTemplateColumns.split(' ').length,
    ancho: Math.round(uno.width),
    alto: Math.round(uno.height)
  }
})
comprobar(rejilla.display === 'grid', `la rejilla debería ser grid y es ${rejilla.display}`)
comprobar(rejilla.columnas === 2, `a 390 px deberían caber dos columnas, y salen ${rejilla.columnas}`)
comprobar(
  Math.abs(rejilla.ancho - rejilla.alto) <= 2,
  `las baldosas deberían ser cuadradas, y miden ${rejilla.ancho}×${rejilla.alto}`
)

// ── El mismo rato, visto desde las otras pantallas ─────────────────────
await pestana('Luz')
const luz = await texto()
comprobar(/\d{2}:\d{2}/.test(luz), 'Luz debería seguir enseñando el arco')
/*
 * A estas alturas hay tres ratos de calle: la media hora del primer sol, los
 * cuarenta minutos de la sesión partida por el cielo —que empezó antes y acabó
 * a la vez, o sea que se solapan— y la media hora apuntada a mano en una hora
 * suelta. Sumados salen cien minutos; unidos, setenta, que son los buenos. El
 * solape no puede contarse dos veces, y los ratos de grounding parados al
 * instante duran cero.
 */
comprobar(
  luz.includes('70 min fuera'),
  `el balance de Luz debería unir los ratos de calle en setenta minutos, y dice «${
    luz.split('\n').find((l) => l.includes('min fuera')) ?? 'nada de fuera'
  }»`
)
await page.screenshot({ path: `${OUT}/medir-04-en-luz.png`, fullPage: true })

await pestana('Progreso')
// La vitamina D vive en la sección «Cuerpo» de Progreso.
await page.getByRole('tab', { name: 'Cuerpo' }).click()
await page.waitForTimeout(400)
const progreso = await texto()
comprobar(
  progreso.includes('Sol y vitamina D'),
  'Progreso debería traer su tarjeta de sol y vitamina D'
)
comprobar(
  progreso.includes('1 de 7 días con sol'),
  'y contar el día de hoy — es el punto entero del cambio: un toque en Medir llega hasta aquí'
)
comprobar(/UI/.test(progreso), 'con su cifra de vitamina D acumulada')
await page.screenshot({ path: `${OUT}/medir-05-en-progreso.png`, fullPage: true })

// ── El parte lo recoge, y como punto a favor ───────────────────────────
await pestana('Medir')
const conParte = await texto()
comprobar(conParte.includes('A favor'), 'el parte debería tener ya puntos a favor')
comprobar(
  !/En contra/.test(conParte),
  'y seguir sin reprochar nada: solo se ha apuntado algo bueno'
)
await page.screenshot({ path: `${OUT}/medir-06-parte.png`, fullPage: true })

// ── La noche, con la fecha de la mañana en que uno se levanta ──────────
await page.getByRole('button', { name: 'A oscuras', exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'A oscuras, en marcha' }).click()
await page.waitForTimeout(300)
const d3 = await datos()
comprobar(d3.noches?.length === 1, 'la noche debería quedar apuntada')

// ── El reparto del día, con el anidamiento a la vista ─────────────────
// Dos ratos a la vez —al sol y descalzo— para comprobar lo que más importa:
// que el total de calle NO es la suma de lo que cuelga.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  d.salidas = [
    { id: 'x1', date: hoy, desde: 840, minutos: 30, filtro: 'ninguno', tipo: 'sol' },
    { id: 'x2', date: hoy, desde: 850, minutos: 15, filtro: 'ninguno', tipo: 'grounding' },
    { id: 'x3', date: hoy, desde: 1240, minutos: 20, filtro: 'ninguno', tipo: 'atardecer' }
  ]
  d.sol = []
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')
const reparto = await page.locator('.card', { hasText: 'En qué se te va el día' }).innerText()

comprobar(reparto.includes('Fuera'), 'el reparto debería tener la rama de calle')
comprobar(
  /Fuera\s*\n?\s*50 min/.test(reparto.replace(/\s+/g, ' ')) || reparto.includes('50 min'),
  `el rato de calle debería ser 50 min —30 de sol con 15 de descalzo dentro, más 20 de atardecer—, y pone «${reparto.replace(/\n/g, ' · ').slice(0, 120)}»`
)
comprobar(
  reparto.includes('ocurrieron a la vez'),
  'y avisar de que lo de dentro suma más que el total porque se solaparon'
)

// El anidamiento tiene que estar en el marcado, no solo en el texto: es lo que
// dice que el atardecer ocurre DENTRO del rato de calle y no al lado.
const anidado = await page.evaluate(() => {
  const dentro = document.querySelector('.reparto-dentro')
  if (!dentro) return null
  return {
    hijas: dentro.querySelectorAll('.reparto-hija').length,
    // Una hija nunca puede pintar más ancho que su madre: eso es estar dentro.
    masAnchaQueLaMadre: [...dentro.querySelectorAll('.reparto-relleno')].some(
      (e) => parseFloat(e.style.width) > 100
    )
  }
})
comprobar(anidado !== null, 'las ramas de dentro deberían ir indentadas, no al mismo nivel')
comprobar(anidado?.hijas === 3, `deberían colgar tres: sol, atardecer y descalzo — cuelgan ${anidado?.hijas}`)
comprobar(
  anidado?.masAnchaQueLaMadre === false,
  'ninguna hija puede pintar más ancha que su madre: eso es lo que significa estar dentro'
)
await page.screenshot({ path: `${OUT}/medir-09-reparto.png`, fullPage: true })

// ── El entreno empezado en «Hoy» se ve corriendo aquí ─────────────────
// No se apunta dos veces: la sesión ya guarda cuándo empezó, así que el
// cronómetro de la baldosa sale de ahí y no de un segundo registro.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const hoy = new Date().toISOString().slice(0, 10)
  d.sessions = [
    {
      id: 'e1',
      date: hoy,
      kind: 'fuerza',
      title: 'Empuje',
      exercises: [],
      completed: false,
      startedAt: Date.now() - 25 * 60 * 1000
    }
  ]
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')
const conEntreno = await page.getByRole('button', { name: /^Entreno/ }).innerText()
comprobar(
  /2[45] min/.test(conEntreno),
  `la baldosa del entreno debería llevar el tiempo de la sesión en marcha, y pone «${conEntreno.replace(/\n/g, ' · ')}»`
)
comprobar(
  (await page.getByRole('button', { name: /^Entreno/ }).getAttribute('aria-pressed')) === 'true',
  'y marcarse como encendida mientras la sesión siga abierta'
)

// ── A quien a esa hora está fichado no se le ofrece «aún a tiempo» ─────
// Tres fichajes con entrada muy temprana: la ventana de la mañana queda
// entera dentro de la jornada. Con `diasLaborables` a los siete días, el
// recorrido no depende de en qué día de la semana se ejecute.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('ritmo-data-v1'))
  const luz = { nombre: 'Nave', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ninguno' }
  const hoy = new Date()
  d.profile.diasLaborables = [0, 1, 2, 3, 4, 5, 6]
  d.fichajes = [1, 2, 3].map((i) => {
    const f = new Date(hoy.getTime() - i * 86400000).toISOString().slice(0, 10)
    return { id: `f${i}`, date: f, entrada: 3 * 60, salida: 11 * 60, luz }
  })
  // Y sin haber salido hoy, para que el punto del amanecer siga vivo.
  d.salidas = []
  d.sol = []
  // Sin el entreno de la prueba anterior: con una sesión en marcha, «Hoy»
  // enseña el entreno y no la tarjeta de los tres relojes.
  d.sessions = []
  localStorage.setItem('ritmo-data-v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await pestana('Medir')
await page.getByRole('button', { name: /Ni suma ni resta/ }).click()
await page.waitForTimeout(300)
const conJornada = await texto()
comprobar(
  conJornada.includes('cae dentro de tu jornada'),
  'con la ventana dentro de la jornada, el parte debería decirlo en vez de ofrecerla'
)
comprobar(
  conJornada.includes('no es un fallo'),
  'y decirlo sin culpar — es la regla de tono entera del parte'
)
comprobar(
  !/La ventana de fase se cierra a las/.test(conJornada),
  'y no ofrecer «aún a tiempo» algo que a esa hora no se puede hacer'
)
await page.screenshot({ path: `${OUT}/medir-07-ventana-no-es-tuya.png`, fullPage: true })

// Y en «Hoy», la misma corrección: la tarjeta de los tres relojes no manda
// salir a quien a esa hora está dentro.
await pestana('Hoy')
const hoyTexto = await texto()
comprobar(
  !/Sal fuera entre las/.test(hoyTexto),
  'la tarjeta de los tres relojes tampoco debería mandar salir a esa hora'
)
comprobar(
  hoyTexto.includes('sueles entrar a las 03:00'),
  'sino decir a qué hora sueles entrar, que es lo que la app sabe de verdad'
)
await page.screenshot({ path: `${OUT}/medir-08-hoy-no-manda-salir.png`, fullPage: true })

// ── Y nada se desborda a lo ancho, que es el riesgo de seis pestañas ───
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
console.log('✓ Medir: un toque que llega al balance, a los relojes, a la vitamina D y al parte')
