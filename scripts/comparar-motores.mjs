/**
 * Los dos motores sobre historial real, semana a semana.
 *
 * El historial no está inventado: se genera haciendo que la propia app decida.
 * Cada día se llama a `recommend`, se construye la sesión con `buildSession` y
 * se registran todas las series, igual que hace la prueba larga de seis meses
 * pero sin navegador, para poder recorrer muchos meses en segundos.
 *
 * Después se comparan las dos lecturas de cada semana. El objetivo no es «ganar»
 * sino saber **dónde y cuánto** se separan, antes de decidir si el motor nuevo
 * pasa a mandar.
 *
 *   npx tsx scripts/comparar-motores.mjs   (o node, vía el build de vitest)
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

// Se ejecuta a través de vitest, que ya tiene el transpilador de TypeScript
// configurado en el proyecto: así el guion usa el mismo código que la app.
const GUION = `
import { recommend } from '../src/domain/recommender'
import { computeReadiness } from '../src/domain/readiness'
import { buildSession } from '../src/domain/workoutBuilder'
import { volumePlan } from '../src/domain/progression'
import { compararMotores, musculosDescuidados, resumirComparacion, MUSCULOS_HUERFANOS } from '../src/domain/shadow'
import { MUSCLES } from '../src/domain/muscles'
import { weeklySets } from '../src/domain/muscleBalance'
import { weeklyMuscleVolume } from '../src/domain/volume'
import { it } from 'vitest'

const perfil = {
  name: 'Alberto',
  goal: 'recomposicion',
  weightKg: 78,
  heightCm: 178,
  equipment: ['peso_corporal', 'mancuernas', 'bandas', 'banco', 'bici', 'correr'],
  maxWeights: { mancuernas: 24 }
}

const iso = (d) => d.toISOString().slice(0, 10)
const INICIO = new Date('2026-01-05T09:00:00')
const SEMANAS = 26

function checkIn(date) {
  return {
    date, sleep: 4, lightHygiene: true, sunrise: true, sunsetYesterday: true,
    sunExposure: true, keto: true, energy: 4, discomfort: 'ninguna',
    wokeHungry: false, cravings: false
  }
}

it('comparación de motores', () => {
  const sessions = []
  const checkIns = []
  const informe = []

  for (let dia = 0; dia < SEMANAS * 7; dia++) {
    const fecha = new Date(INICIO.getTime() + dia * 86400000)
    const hoy = iso(fecha)
    const dow = fecha.getDay()
    checkIns.push(checkIn(hoy))
    if (![1, 3, 5].includes(dow)) continue

    const readiness = computeReadiness(checkIn(hoy))
    const volumen = volumePlan({ profile: perfil, sessions, checkIns, todayIso: hoy })
    const rec = recommend(perfil, readiness, sessions, hoy, volumen)
    const s = buildSession(rec, perfil, sessions, hoy, true)
    // Se registran todas las series como hechas, en el tope del rango.
    s.exercises = s.exercises.map((e) => ({
      ...e,
      done: true,
      logs: (e.logs ?? []).map((l) => ({ ...l, done: true }))
    }))
    s.completed = true
    s.rpe = 4
    sessions.push(s)

    // Cada domingo se compara la semana cerrada.
    if (dow === 5) {
      const c = compararMotores(sessions, hoy)
      informe.push({ semana: Math.floor(dia / 7), fecha: hoy, ...c })
    }
  }

  const semanas = informe.length
  const cuenta = (k) => informe.filter((i) => i[k].length > 0).length
  const salida = {
    sesiones: sessions.length,
    semanas,
    semanasQueCoinciden: informe.filter((i) => i.coinciden).length,
    semanasConFalsoCubierto: cuenta('falsosCubiertos'),
    semanasConSobrecargaInvisible: cuenta('sobrecargasInvisibles'),
    semanasConFalsaSaturacion: cuenta('falsasSaturaciones'),
    huerfanos: MUSCULOS_HUERFANOS,
    // Los músculos que más veces salieron por debajo de su mínimo.
    masDescuidados: (() => {
      const cuentaM = {}
      for (const i of informe) {
        for (const d of i.falsosCubiertos) {
          for (const m of d.musculos) cuentaM[m.label] = (cuentaM[m.label] ?? 0) + 1
        }
      }
      return Object.entries(cuentaM).sort((a, b) => b[1] - a[1])
    })(),
    ejemplos: informe
      .filter((i) => !i.coinciden)
      .slice(0, 4)
      .map((i) => ({ semana: i.semana, lineas: resumirComparacion(i) })),
    // La foto final de la última semana, para verla músculo a músculo.
    ultimaSemana: (() => {
      const hoy = informe[informe.length - 1].fecha
      const viejo = weeklySets(sessions, hoy)
      const nuevo = weeklyMuscleVolume(sessions, hoy)
      return {
        porGrupo: Object.fromEntries(Object.entries(viejo).filter(([g]) => g !== 'cardio')),
        porMusculo: Object.fromEntries(
          Object.entries(nuevo).map(([m, v]) => [MUSCLES[m].label, { series: v, mev: MUSCLES[m].landmarks.mev, mrv: MUSCLES[m].landmarks.mrv }])
        ),
        descuidados: musculosDescuidados(sessions, hoy).slice(0, 6).map((d) => ({
          musculo: MUSCLES[d.muscle].label, series: d.series, deficit: Math.round(d.deficit * 100) + ' %'
        }))
      }
    })()
  }
  console.log('___INFORME___' + JSON.stringify(salida))
})
`

writeFileSync(new URL('../src/__comparacion.test.ts', import.meta.url), GUION)
let salida = ''
try {
  salida = execFileSync('npx', ['vitest', 'run', 'src/__comparacion.test.ts', '--reporter=basic'], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 32
  })
} catch (e) {
  salida = (e.stdout ?? '') + (e.stderr ?? '')
}
execFileSync('rm', ['-f', new URL('../src/__comparacion.test.ts', import.meta.url).pathname])

const linea = salida.split('\n').find((l) => l.includes('___INFORME___'))
if (!linea) {
  console.error(salida)
  process.exit(1)
}
const r = JSON.parse(linea.slice(linea.indexOf('___INFORME___') + 13))

const pct = (n) => `${Math.round((n / r.semanas) * 100)} %`
console.log(`\nHistorial generado por la propia app: ${r.sesiones} sesiones, ${r.semanas} semanas comparadas.\n`)
console.log('DÓNDE SE SEPARAN LOS DOS MOTORES')
console.log(`  Semanas en que coincidirían .................. ${r.semanasQueCoinciden} (${pct(r.semanasQueCoinciden)})`)
console.log(`  Con grupo «cubierto» y músculo bajo mínimo ... ${r.semanasConFalsoCubierto} (${pct(r.semanasConFalsoCubierto)})`)
console.log(`  Con músculo pasado de MRV sin verlo ......... ${r.semanasConSobrecargaInvisible} (${pct(r.semanasConSobrecargaInvisible)})`)
console.log(`  Con freno por techo sin necesitarlo ......... ${r.semanasConFalsaSaturacion} (${pct(r.semanasConFalsaSaturacion)})`)

if (r.masDescuidados.length) {
  console.log('\nMÚSCULOS QUE EL MOTOR VIEJO TAPABA (semanas bajo su MEV dentro de un grupo dado por cubierto)')
  for (const [nombre, veces] of r.masDescuidados) {
    console.log(`  ${String(veces).padStart(3)} semanas  ${nombre}`)
  }
}

console.log(`\nMÚSCULOS QUE EL MODELO VIEJO NI NOMBRABA: ${r.huerfanos.join(', ')}`)

if (r.ejemplos.length) {
  console.log('\nEJEMPLOS')
  for (const e of r.ejemplos) {
    console.log(`  semana ${e.semana}:`)
    for (const l of e.lineas) console.log(`    · ${l}`)
  }
}

console.log('\nÚLTIMA SEMANA · lo que ve cada motor')
console.log('  Motor viejo, por grupo:')
for (const [g, v] of Object.entries(r.ultimaSemana.porGrupo)) {
  console.log(`    ${g.padEnd(20)} ${v}`)
}
console.log('  Motor nuevo, por músculo (series · mev–mrv):')
for (const [m, v] of Object.entries(r.ultimaSemana.porMusculo)) {
  const marca = v.series < v.mev ? ' ← bajo mínimo' : v.series > v.mrv ? ' ← pasado' : ''
  console.log(`    ${m.padEnd(38)} ${String(v.series).padStart(5)}  (${v.mev}–${v.mrv})${marca}`)
}
console.log('  Lo que priorizaría el motor nuevo:')
for (const d of r.ultimaSemana.descuidados) {
  console.log(`    ${d.musculo.padEnd(38)} ${String(d.series).padStart(5)} series · ${d.deficit} por debajo`)
}
console.log()
