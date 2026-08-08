/**
 * ¿Los umbrales del estrés dicen algo, o son adorno?
 *
 * Un modelo así es fácil de escribir y difícil de calibrar: cualquier par de
 * medias móviles produce una curva bonita. Lo que hay que comprobar antes de
 * enseñársela a nadie es que **distingue situaciones que de verdad son
 * distintas** y que no se dispara con una semana normal.
 *
 * Se simulan cinco maneras de entrenar y se mira dónde cae cada una.
 *
 *   node scripts/medir-estres.mjs
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const GUION = `
import { it } from 'vitest'
import { estadoDeEstres, cargaDeSesion } from '../src/domain/estres'

const HOY = '2026-08-10'
const iso = (d) => d.toISOString().slice(0, 10)
const menos = (n) => iso(new Date(Date.parse(HOY + 'T00:00:00Z') - n * 86400000))

const pesas = (series, rir) => ({
  exerciseId: 'press_banca_mancuernas',
  name: 'Press',
  primary: 'pecho',
  plan: { sets: series, reps: '8-12', rir },
  done: true,
  logs: Array.from({ length: series }, () => ({ weightKg: 20, reps: 10, rir, done: true }))
})

const sesion = (dias, series, rir) => ({
  id: 's' + dias,
  date: menos(dias),
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  exercises: [pesas(series, rir)]
})

/** Entrena cada \`cada\` días durante \`dias\`, con series y RIR dados. */
function rutina({ dias, cada, series, rir, desde = 0 }) {
  const out = []
  for (let d = dias; d >= desde; d -= cada) out.push(sesion(d, series, rir))
  return out
}

const CASOS = {
  'constante, 3 días/semana, RIR 2': rutina({ dias: 84, cada: 2, series: 4, rir: 2 }),
  'constante pero suave, RIR 4': rutina({ dias: 84, cada: 2, series: 4, rir: 4 }),
  'subida progresiva sensata': [
    ...rutina({ dias: 84, cada: 2, series: 3, rir: 3, desde: 30 }),
    ...rutina({ dias: 28, cada: 2, series: 4, rir: 2, desde: 0 })
  ],
  'atracón: dobla el trabajo la última semana': [
    ...rutina({ dias: 84, cada: 2, series: 3, rir: 3, desde: 8 }),
    ...rutina({ dias: 6, cada: 1, series: 6, rir: 0, desde: 0 })
  ],
  'parón: dos semanas sin nada': rutina({ dias: 84, cada: 2, series: 4, rir: 2, desde: 15 })
}

it('mide', () => {
  const filas = Object.entries(CASOS).map(([nombre, sesiones]) => {
    const e = estadoDeEstres(sesiones, HOY)
    return {
      nombre,
      sesiones: sesiones.length,
      fatiga: e.fatiga,
      base: e.base,
      ratio: e.ratio,
      nivel: e.nivel,
      fiable: e.fiable
    }
  })

  const ejemplos = [
    ['4 series a RIR 2', cargaDeSesion(sesion(0, 4, 2)).total],
    ['4 series a RIR 0', cargaDeSesion(sesion(0, 4, 0)).total],
    ['8 series a RIR 2', cargaDeSesion(sesion(0, 8, 2)).total],
    ['4 series a RIR 4', cargaDeSesion(sesion(0, 4, 4)).total]
  ]

  console.log('___INFORME___' + JSON.stringify({ filas, ejemplos }))
})
`

const destino = new URL('../src/__medir_estres.test.ts', import.meta.url)
writeFileSync(destino, GUION)
let salida = ''
try {
  salida = execFileSync('npx', ['vitest', 'run', 'src/__medir_estres.test.ts', '--reporter=basic'], {
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

console.log('\nQUÉ CUESTA UNA SESIÓN')
for (const [nombre, puntos] of r.ejemplos) {
  console.log(`  ${nombre.padEnd(20)} ${String(puntos).padStart(5)} puntos`)
}

console.log('\nDÓNDE CAE CADA FORMA DE ENTRENAR')
console.log('  caso                                    fatiga    base   ratio  nivel')
for (const f of r.filas) {
  console.log(
    `  ${f.nombre.padEnd(38)} ${String(f.fatiga).padStart(6)}  ${String(f.base).padStart(6)}  ${String(
      f.ratio
    ).padStart(5)}  ${f.nivel}${f.fiable ? '' : ' (sin base fiable)'}`
  )
}
console.log()
