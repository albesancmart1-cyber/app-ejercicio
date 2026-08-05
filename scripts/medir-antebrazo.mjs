/**
 * ¿Cuánto antebrazo se estaba perdiendo la cuenta?
 *
 * El usuario avisó de que la app le exigía trabajo directo de antebrazo justo
 * cuando acababa de hacer peso muerto rumano y abdominales colgado de la barra.
 * Contar el agarre corrige eso, pero pasarse tendría el fallo contrario: dejar
 * el antebrazo permanentemente «cubierto» sin haberlo entrenado nunca.
 *
 * Esto mide las dos cosas sobre ocho semanas simuladas con el propio motor:
 * cuántas series de antebrazo salen por semana y si se quedan dentro de sus
 * landmarks (MEV 3, MAV 6–14, MRV 20).
 *
 *   node scripts/medir-antebrazo.mjs
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const GUION = `
import { it } from 'vitest'
import { recommend } from '../src/domain/recommender'
import { computeReadiness } from '../src/domain/readiness'
import { buildSession } from '../src/domain/workoutBuilder'
import { weeklyMuscleVolume } from '../src/domain/volume'
import { allLandmarks } from '../src/domain/landmarks'
import { ALL_MUSCLES, MUSCLES } from '../src/domain/muscles'
import { CONTRIBUTIONS } from '../src/data/contributions'

const perfil = {
  name: 'A', goal: 'recomposicion', weightKg: 78, heightCm: 178,
  equipment: ['peso_corporal', 'mancuernas', 'barra', 'banco', 'dominadas_barra', 'polea', 'bandas', 'kettlebell', 'bici', 'correr'],
  maxWeights: { mancuernas: 30, barra: 80, polea: 60 }
}
const iso = (d) => d.toISOString().slice(0, 10)
const checkIn = (date) => ({ date, sleep: 4, lightHygiene: true, sunrise: true, sunsetYesterday: true, sunExposure: true, keto: false, energy: 4, discomfort: 'ninguna' })

/** Ocho semanas entrenando cuatro días por semana, con el motor decidiendo. */
function simular() {
  const sesiones = []
  const inicio = new Date('2026-01-05T09:00:00')
  for (let d = 0; d < 56; d++) {
    const fecha = new Date(inicio.getTime() + d * 86400000)
    const hoy = iso(fecha)
    if (![1, 2, 4, 5].includes(fecha.getDay())) continue
    const r = computeReadiness(checkIn(hoy))
    const rec = recommend(perfil, r, sesiones, hoy, { level: 3, setsPerExercise: 4, exercisesPerSession: 5, focusMuscles: 5, repBias: 'normal', changes: [], reason: '', evidence: [] })
    const s = buildSession(rec, perfil, sesiones, hoy)
    // Se da por hecha entera y en rango, que es el caso que más volumen genera.
    s.completed = true
    s.exercises = s.exercises.map((pe) => ({
      ...pe,
      done: true,
      logs: (pe.logs ?? []).map((l) => ({ ...l, done: true, reps: 10, rir: 2 }))
    }))
    sesiones.push(s)
  }
  return sesiones
}

it('mide', () => {
  const sesiones = simular()
  const finales = ['2026-02-01', '2026-02-08', '2026-02-15', '2026-02-22']
  const landmarks = allLandmarks({})
  const semanas = finales.map((f) => weeklyMuscleVolume(sesiones, f))

  const media = {}
  for (const m of ALL_MUSCLES) media[m] = semanas.reduce((a, s) => a + s[m], 0) / semanas.length

  const conAgarre = Object.entries(CONTRIBUTIONS)
    .filter(([, c]) => (c.antebrazo ?? 0) > 0)
    .map(([id, c]) => ({ id, peso: c.antebrazo }))

  console.log('___INFORME___' + JSON.stringify({
    conAgarre,
    musculos: ALL_MUSCLES.map((m) => ({
      m,
      label: MUSCLES[m].short,
      series: Math.round(media[m] * 10) / 10,
      ...landmarks[m]
    }))
  }))
})
`

const destino = new URL('../src/__medir_antebrazo.test.ts', import.meta.url)
writeFileSync(destino, GUION)
let salida = ''
try {
  salida = execFileSync('npx', ['vitest', 'run', 'src/__medir_antebrazo.test.ts', '--reporter=basic'], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8'
  })
} finally {
  execFileSync('rm', ['-f', destino.pathname])
}

const linea = salida.split('\n').find((l) => l.includes('___INFORME___'))
if (!linea) {
  console.error(salida)
  process.exit(1)
}
const r = JSON.parse(linea.slice(linea.indexOf('___INFORME___') + 13))

console.log('\nEJERCICIOS QUE CUENTAN AGARRE')
for (const e of r.conAgarre) console.log(`  ${e.id.padEnd(28)} ${e.peso}`)

console.log('\nVOLUMEN SEMANAL MEDIO (8 semanas simuladas, gimnasio completo, 4 días/semana)')
console.log('  músculo         series   MEV   MAV      MRV   estado')
for (const m of r.musculos) {
  const estado =
    m.series > m.mrv ? '⚠ PASADO DE MRV' : m.series < m.mev ? '· por debajo del MEV' : 'en rango'
  console.log(
    `  ${m.label.padEnd(15)} ${String(m.series).padStart(5)}  ${String(m.mev).padStart(4)}  ${String(m.mavMin).padStart(2)}-${String(m.mavMax).padEnd(3)} ${String(m.mrv).padStart(4)}   ${estado}`
  )
}
console.log()
