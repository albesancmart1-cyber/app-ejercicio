/**
 * ¿Elegir por músculo entrena mejor que elegir por zona?
 *
 * Se simulan seis meses dos veces sobre el mismo perfil y el mismo calendario.
 * Lo único que cambia entre las dos es **quién elige los ejercicios**:
 *
 *   - «por zona»: se le quita a la recomendación el campo `focusMuscles`, con lo
 *     que `buildSession` cae en el camino de siempre —grupo con menos series y
 *     cualquier ejercicio de ese grupo—.
 *   - «por músculo»: la recomendación va entera.
 *
 * Todo lo demás es idéntico: la misma cascada decide si toca fuerza, cardio o
 * descanso, y las series se registran igual. Así la diferencia que salga es
 * atribuible a la elección y no a otra cosa.
 *
 * Se mide lo que importa: cuántas semanas pasa cada músculo por debajo de su
 * mínimo eficaz, y cuántos no se tocan nunca.
 *
 *   node scripts/check-foco.mjs
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const GUION = `
import { recommend } from '../src/domain/recommender'
import { computeReadiness } from '../src/domain/readiness'
import { buildSession } from '../src/domain/workoutBuilder'
import { volumePlan } from '../src/domain/progression'
import { weeklyMuscleVolume } from '../src/domain/volume'
import { allLandmarks } from '../src/domain/landmarks'
import { ALL_MUSCLES, MUSCLES } from '../src/domain/muscles'
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

const checkIn = (date) => ({
  date, sleep: 4, lightHygiene: true, sunrise: true, sunsetYesterday: true,
  sunExposure: true, keto: true, energy: 4, discomfort: 'ninguna',
  wokeHungry: false, cravings: false
})

/** Simula seis meses. Con \`porMusculo\` en falso se ignora el foco muscular. */
function simular(porMusculo) {
  const sessions = []
  const semanas = []
  const landmarks = allLandmarks({})

  for (let dia = 0; dia < SEMANAS * 7; dia++) {
    const fecha = new Date(INICIO.getTime() + dia * 86400000)
    const hoy = iso(fecha)
    const dow = fecha.getDay()
    if (![1, 3, 5].includes(dow)) continue

    const readiness = computeReadiness(checkIn(hoy))
    const volumen = volumePlan({ profile: perfil, sessions, checkIns: [], todayIso: hoy })
    const rec = recommend(perfil, readiness, sessions, hoy, volumen)
    const usada = porMusculo ? rec : { ...rec, focusMuscles: undefined }
    const s = buildSession(usada, perfil, sessions, hoy, true)
    s.exercises = s.exercises.map((e) => ({
      ...e, done: true, logs: (e.logs ?? []).map((l) => ({ ...l, done: true }))
    }))
    s.completed = true
    s.rpe = 4
    sessions.push(s)

    if (dow === 5) semanas.push(weeklyMuscleVolume(sessions, hoy))
  }

  const bajoMinimo = {}
  const totalSeries = {}
  for (const m of ALL_MUSCLES) { bajoMinimo[m] = 0; totalSeries[m] = 0 }
  for (const v of semanas) {
    for (const m of ALL_MUSCLES) {
      totalSeries[m] += v[m]
      if (v[m] < landmarks[m].mev) bajoMinimo[m] += 1
    }
  }
  return { semanas: semanas.length, sesiones: sessions.length, bajoMinimo, totalSeries }
}

it('foco por músculo frente a foco por zona', () => {
  console.log('___INFORME___' + JSON.stringify({
    zona: simular(false),
    musculo: simular(true),
    etiquetas: Object.fromEntries(ALL_MUSCLES.map((m) => [m, MUSCLES[m].label]))
  }))
})
`

writeFileSync(new URL('../src/__foco.test.ts', import.meta.url), GUION)
let salida = ''
try {
  salida = execFileSync('npx', ['vitest', 'run', 'src/__foco.test.ts', '--reporter=basic'], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 32
  })
} catch (e) {
  salida = (e.stdout ?? '') + (e.stderr ?? '')
}
execFileSync('rm', ['-f', new URL('../src/__foco.test.ts', import.meta.url).pathname])

const linea = salida.split('\n').find((l) => l.includes('___INFORME___'))
if (!linea) {
  console.error(salida)
  process.exit(1)
}
const r = JSON.parse(linea.slice(linea.indexOf('___INFORME___') + 13))

const musculos = Object.keys(r.etiquetas)
const semanas = r.zona.semanas

console.log(`\n${r.zona.sesiones} sesiones, ${semanas} semanas. Mismo perfil, mismo calendario, misma cascada.\n`)
console.log('SEMANAS POR DEBAJO DEL MÍNIMO EFICAZ (de ' + semanas + ')')
console.log('  músculo                                  por zona   por músculo   series/semana')
let peorZona = 0
let peorMusculo = 0
for (const m of musculos) {
  const a = r.zona.bajoMinimo[m]
  const b = r.musculo.bajoMinimo[m]
  peorZona += a
  peorMusculo += b
  const sa = (r.zona.totalSeries[m] / semanas).toFixed(1)
  const sb = (r.musculo.totalSeries[m] / semanas).toFixed(1)
  const marca = b < a ? ' ✓' : b > a ? ' ✗' : '  '
  console.log(
    `  ${r.etiquetas[m].padEnd(40)} ${String(a).padStart(5)}   ${String(b).padStart(9)}${marca}   ${sa.padStart(5)} → ${sb.padStart(5)}`
  )
}
const total = musculos.length * semanas
const pct = (n) => `${Math.round((n / total) * 100)} %`
console.log(`\n  TOTAL ${String(peorZona).padStart(35)}   ${String(peorMusculo).padStart(9)}     ${pct(peorZona)} → ${pct(peorMusculo)}`)

const nunca = (s) => musculos.filter((m) => s.totalSeries[m] === 0).map((m) => r.etiquetas[m])
console.log(`\n  Sin tocar en seis meses · por zona: ${nunca(r.zona).join(', ') || 'ninguno'}`)
console.log(`                          · por músculo: ${nunca(r.musculo).join(', ') || 'ninguno'}`)
console.log()

if (peorMusculo >= peorZona) {
  console.error('\n✗ Elegir por músculo no mejora la cobertura. Revisar antes de seguir.')
  process.exit(1)
}
console.log('✓ Elegir por músculo deja menos semanas bajo mínimo.\n')
