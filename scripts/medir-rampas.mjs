/** Medición de las dos rampas tal y como están hoy. Solo mide, no cambia nada. */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const GUION = `
import { recommend } from '../src/domain/recommender'
import { computeReadiness } from '../src/domain/readiness'
import { buildSession, suggestWeight } from '../src/domain/workoutBuilder'
import { weeklyMuscleVolume } from '../src/domain/volume'
import { allLandmarks } from '../src/domain/landmarks'
import { ALL_MUSCLES, MUSCLES } from '../src/domain/muscles'
import { reentrySteps, REENTRY_VOLUME_SCALE } from '../src/domain/protocol'
import { exerciseById } from '../src/data/exercises'
import { it } from 'vitest'

const perfil = {
  name: 'A', goal: 'recomposicion', weightKg: 78, heightCm: 178,
  equipment: ['peso_corporal', 'mancuernas', 'bandas', 'banco', 'bici', 'correr'],
  maxWeights: { mancuernas: 24 }
}
const iso = (d) => d.toISOString().slice(0, 10)
const INICIO = new Date('2026-01-05T09:00:00')
const checkIn = (date) => ({ date, sleep: 4, lightHygiene: true, sunrise: true, sunsetYesterday: true, sunExposure: true, keto: false, energy: 4, discomfort: 'ninguna', wokeHungry: false, cravings: false })

/** Simula 8 semanas con el nivel de volumen fijado a mano. */
function conNivel(nivel, diasPorSemana) {
  const NIVELES = { 1: [3, 4, 4], 2: [4, 4, 4], 3: [4, 5, 5], 4: [5, 5, 5] }
  const [sets, ejercicios, foco] = NIVELES[nivel]
  return { ...conNivelLibre(sets, ejercicios, foco, diasPorSemana), nivel }
}

function conNivelLibre(sets, ejercicios, foco, diasPorSemana) {
  const dows = diasPorSemana === 3 ? [1, 3, 5] : [1, 4]
  const nivel = 4
  const volumen = { level: nivel, setsPerExercise: sets, exercisesPerSession: ejercicios, focusMuscles: foco, repBias: nivel === 4 ? 'variado' : 'normal', changes: [], reason: '', evidence: [] }
  const sessions = []
  for (let dia = 0; dia < 56; dia++) {
    const fecha = new Date(INICIO.getTime() + dia * 86400000)
    const hoy = iso(fecha)
    if (!dows.includes(fecha.getDay())) continue
    const rec = recommend(perfil, computeReadiness(checkIn(hoy)), sessions, hoy, volumen)
    const s = buildSession(rec, perfil, sessions, hoy, false)
    s.exercises = s.exercises.map((e) => ({ ...e, done: true, logs: (e.logs ?? []).map((l) => ({ ...l, done: true })) }))
    s.completed = true
    s.rpe = 4
    sessions.push(s)
  }
  const hoy = iso(new Date(INICIO.getTime() + 55 * 86400000))
  // Media de las últimas 4 semanas, para no coger una semana rara.
  const semanas = []
  for (let k = 0; k < 4; k++) {
    const f = iso(new Date(INICIO.getTime() + (55 - k * 7) * 86400000))
    semanas.push(weeklyMuscleVolume(sessions, f))
  }
  const l = allLandmarks({})
  const medio = {}
  for (const m of ALL_MUSCLES) medio[m] = semanas.reduce((a, s) => a + s[m], 0) / semanas.length
  const totalSemana = Object.values(medio).reduce((a, b) => a + b, 0)
  return {
    diasPorSemana, sets, ejercicios, foco,
    seriesSesion: sets * ejercicios,
    totalSemana: Math.round(totalSemana * 10) / 10,
    alcanzanMev: ALL_MUSCLES.filter((m) => medio[m] >= l[m].mev).length,
    alcanzanMav: ALL_MUSCLES.filter((m) => medio[m] >= l[m].mavMin).length,
    sumaMev: ALL_MUSCLES.reduce((a, m) => a + l[m].mev, 0)
  }
}

it('medición', () => {
  const niveles = []
  for (const d of [2, 3]) for (const n of [1, 2, 3, 4]) niveles.push(conNivel(n, d))
  if (process.env.MATRIZ) {
    for (const foco of [4, 5]) for (const [sets, ej] of [[4, 5], [5, 5]]) {
      niveles.push({ ...conNivelLibre(sets, ej, foco, 3), etiqueta: sets + 'x' + ej + ' foco ' + foco })
    }
  }

  // Incremento de carga: qué % sube en cada caso.
  const cargas = []
  for (const [id, peso] of [['curl_biceps', 8], ['press_militar_mancuernas', 12], ['sentadilla_goblet', 20], ['peso_muerto_mancuernas', 24]]) {
    const ex = exerciseById(id)
    const sesion = (fecha, reps) => ({
      id: 'h' + fecha, date: fecha, kind: 'fuerza', title: 't', completed: true, rpe: 3,
      exercises: [{ exerciseId: id, name: id, primary: ex.primary, plan: { sets: 3, reps: '8-12' }, done: true, actualWeightKg: peso, variant: { side: 'bilateral' },
        logs: Array.from({ length: 3 }, () => ({ done: true, weightKg: peso, reps })) }]
    })
    const una = [sesion('2026-01-05', 12)]
    const dos = [sesion('2026-01-05', 12), sesion('2026-01-02', 12)]
    const medio = [sesion('2026-01-05', 10), sesion('2026-01-02', 10)]
    const p = (h) => suggestWeight(ex, perfil, 1, h, { side: 'bilateral' })
    const nuevo = p(dos)
    cargas.push({ id, peso, unaSesion: p(una), medioRango: p(medio), nuevo, pct: Math.round(((nuevo - peso) / peso) * 1000) / 10 })
  }

  // Cuántos días tarda la rampa de vuelta en completarse.
  const rampa = [11, 30, 90].map((d) => ({ diasParado: d, pasos: reentrySteps(d), escala: REENTRY_VOLUME_SCALE.slice(0, reentrySteps(d)) }))

  console.log('___INFORME___' + JSON.stringify({ niveles, cargas, rampa }))
})
`
writeFileSync(new URL('../src/__medir.test.ts', import.meta.url), GUION)
let salida = ''
try {
  salida = execFileSync('npx', ['vitest', 'run', 'src/__medir.test.ts', '--reporter=basic'], {
    cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', maxBuffer: 1024 * 1024 * 32
  })
} catch (e) { salida = (e.stdout ?? '') + (e.stderr ?? '') }
execFileSync('rm', ['-f', new URL('../src/__medir.test.ts', import.meta.url).pathname])
const linea = salida.split('\n').find((l) => l.includes('___INFORME___'))
if (!linea) { console.error(salida); process.exit(1) }
const r = JSON.parse(linea.slice(linea.indexOf('___INFORME___') + 13))

console.log('\nVOLUMEN SEMANAL SEGÚN NIVEL (media de 4 semanas, perfil con mancuernas)')
console.log('  días/sem  nivel  series/sesión  series efectivas/semana  músculos ≥ MEV  ≥ MAV')
for (const n of r.niveles) {
  const etiq = n.etiqueta ?? String(n.nivel)
  console.log(`      ${n.diasPorSemana}    ${etiq.padEnd(13)} ${String(n.seriesSesion).padStart(2)}              ${String(n.totalSemana).padStart(6)}                 ${String(n.alcanzanMev).padStart(2)}/19        ${String(n.alcanzanMav).padStart(2)}/19`)
}
console.log(`\n  (la suma de los MEV de los 19 músculos son ${r.niveles[0].sumaMev} series semanales)`)

console.log('\nSUBIDA DE CARGA AL COMPLETAR EL RANGO')
console.log('  ejercicio                        peso   1 sesión  medio rango  2 sesiones  subida')
for (const c of r.cargas) {
  console.log(`  ${c.id.padEnd(30)} ${String(c.peso).padStart(4)} kg ${String(c.unaSesion).padStart(7)}   ${String(c.medioRango).padStart(8)}   ${String(c.nuevo).padStart(8)}  ${String(c.pct).padStart(5)} %`)
}

console.log('\nRAMPA DE VUELTA TRAS UN PARÓN')
for (const x of r.rampa) console.log(`  ${String(x.diasParado).padStart(3)} días parado → ${x.pasos} pasos, escala ${x.escala.join(' → ')}  (se completa en ${x.pasos} SEMANAS)`)
console.log()
