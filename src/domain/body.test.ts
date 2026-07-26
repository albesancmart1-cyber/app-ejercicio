import { describe, expect, it } from 'vitest'
import {
  compareComposition,
  computeComposition,
  esMedicionValida,
  formatDelta,
  sortMeasurements
} from './body'
import { completedSets, initLogs, parseRepRange, repVerdict, syncExercise, volumeLoad } from './setLogs'
import type { BodyMeasurement, PlannedExercise } from './types'
import { EXERCISES } from '../data/exercises'
import { PATTERN_CUES, cuesFor, patternOf } from '../data/patterns'

describe('composición corporal: de porcentajes a kilos', () => {
  const medicion: BodyMeasurement = {
    date: '2026-07-26',
    weightKg: 80,
    fatPercent: 20,
    musclePercent: 40
  }

  it('convierte los porcentajes de la báscula a kilos', () => {
    const c = computeComposition(medicion)
    expect(c.fatKg).toBe(16) // 80 × 20 %
    expect(c.muscleKg).toBe(32) // 80 × 40 %
  })

  it('la masa libre de grasa es el peso menos la grasa', () => {
    const c = computeComposition(medicion)
    expect(c.leanKg).toBe(64) // 80 − 16
  })

  it('la masa libre de grasa siempre supera a la muscular', () => {
    // Incluye hueso, órganos y agua: confundirlas es el error clásico.
    for (const musculo of [30, 40, 45]) {
      const c = computeComposition({ ...medicion, musclePercent: musculo })
      expect(c.leanKg!).toBeGreaterThan(c.muscleKg!)
    }
  })

  it('calcula el FFMI y su versión ajustada a 1,80 m', () => {
    const c = computeComposition(medicion, 180)
    // 64 kg / 1,80² = 19,75…
    expect(c.ffmi).toBeCloseTo(19.8, 1)
    // A 1,80 m exactos la corrección es cero.
    expect(c.ffmiAdjusted).toBeCloseTo(c.ffmi!, 1)
  })

  it('el ajuste suma por debajo de 1,80 m y resta por encima', () => {
    // La corrección de Kouri normaliza a 1,80 m: no iguala a dos personas con la
    // misma masa magra, corrige el sesgo por estatura del índice.
    const bajo = computeComposition(medicion, 165)
    const alto = computeComposition(medicion, 195)
    expect(bajo.ffmiAdjusted!).toBeGreaterThan(bajo.ffmi!)
    expect(alto.ffmiAdjusted!).toBeLessThan(alto.ffmi!)
    // La magnitud del ajuste es 6,1 por cada metro de desviación.
    expect(bajo.ffmiAdjusted! - bajo.ffmi!).toBeCloseTo(6.1 * 0.15, 1)
    expect(alto.ffmi! - alto.ffmiAdjusted!).toBeCloseTo(6.1 * 0.15, 1)
  })

  it('sin altura no hay FFMI, pero tampoco se rompe', () => {
    const c = computeComposition(medicion)
    expect(c.ffmi).toBeUndefined()
    expect(c.fatKg).toBe(16)
  })

  it('con una altura absurda tampoco inventa un FFMI', () => {
    expect(computeComposition(medicion, 12).ffmi).toBeUndefined()
  })

  it('funciona con solo el peso, sin porcentajes', () => {
    const c = computeComposition({ date: '2026-07-26', weightKg: 80 })
    expect(c.weightKg).toBe(80)
    expect(c.fatKg).toBeUndefined()
    expect(c.leanKg).toBeUndefined()
  })
})

describe('validación de la lectura de báscula', () => {
  const base: BodyMeasurement = { date: '2026-07-26', weightKg: 80 }

  it('acepta lecturas plausibles', () => {
    expect(esMedicionValida({ ...base, fatPercent: 18, musclePercent: 42 })).toBe(true)
  })

  it('rechaza porcentajes imposibles', () => {
    expect(esMedicionValida({ ...base, fatPercent: 95 })).toBe(false)
    expect(esMedicionValida({ ...base, fatPercent: 0 })).toBe(false)
    expect(esMedicionValida({ ...base, musclePercent: 5 })).toBe(false)
  })

  it('rechaza que grasa y músculo sumen más que el cuerpo entero', () => {
    expect(esMedicionValida({ ...base, fatPercent: 60, musclePercent: 55 })).toBe(false)
  })

  it('rechaza pesos fuera de lo humano', () => {
    expect(esMedicionValida({ ...base, weightKg: 0 })).toBe(false)
    expect(esMedicionValida({ ...base, weightKg: 500 })).toBe(false)
  })
})

describe('evolución entre mediciones', () => {
  const antes = computeComposition({ date: '2026-06-01', weightKg: 80, fatPercent: 22, musclePercent: 38 })
  const despues = computeComposition({ date: '2026-07-26', weightKg: 80, fatPercent: 19, musclePercent: 40 })

  it('detecta recomposición aunque el peso no se mueva', () => {
    const d = compareComposition(despues, antes)
    expect(d.weightKg).toBe(0)
    expect(d.fatKg).toBeLessThan(0)
    expect(d.muscleKg).toBeGreaterThan(0)
    expect(d.recomposicion).toBe(true)
  })

  it('no llama recomposición a ganar grasa y músculo a la vez', () => {
    const engorde = computeComposition({ date: '2026-07-26', weightKg: 84, fatPercent: 24, musclePercent: 39 })
    expect(compareComposition(engorde, antes).recomposicion).toBe(false)
  })

  it('sin porcentajes solo compara el peso', () => {
    const a = computeComposition({ date: '2026-06-01', weightKg: 80 })
    const b = computeComposition({ date: '2026-07-26', weightKg: 78 })
    const d = compareComposition(b, a)
    expect(d.weightKg).toBe(-2)
    expect(d.fatKg).toBeUndefined()
    expect(d.recomposicion).toBe(false)
  })

  it('ordena las mediciones de la más reciente a la más antigua', () => {
    const lista: BodyMeasurement[] = [
      { date: '2026-06-01', weightKg: 80 },
      { date: '2026-07-26', weightKg: 79 },
      { date: '2026-07-01', weightKg: 79.5 }
    ]
    expect(sortMeasurements(lista).map((m) => m.date)).toEqual([
      '2026-07-26',
      '2026-07-01',
      '2026-06-01'
    ])
  })

  it('formatea las variaciones con su signo', () => {
    expect(formatDelta(-1.2)).toBe('-1,2 kg')
    expect(formatDelta(0.8)).toBe('+0,8 kg')
    expect(formatDelta(undefined)).toBe('—')
  })
})

// ── Registro serie a serie ────────────────────────────────────

function ejercicio(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    exerciseId: 'press_banca_mancuernas',
    name: 'Press de banca',
    primary: 'pecho',
    plan: { sets: 3, reps: '8-12', weightKg: 14, rir: 2, restSeconds: 150 },
    ...overrides
  }
}

describe('registro serie a serie', () => {
  it('crea una entrada por serie con el peso sugerido', () => {
    const logs = initLogs({ sets: 3, reps: '8-12', weightKg: 14 })
    expect(logs).toHaveLength(3)
    expect(logs.every((l) => l.weightKg === 14 && !l.done)).toBe(true)
  })

  it('mantiene done y actualWeightKg coherentes para el resto del motor', () => {
    const pe = ejercicio({
      logs: [
        { weightKg: 14, reps: 12, done: true },
        { weightKg: 16, reps: 10, done: true },
        { weightKg: 16, reps: 8, done: false }
      ]
    })
    const s = syncExercise(pe)
    expect(s.done).toBe(true)
    expect(s.actualWeightKg).toBe(16) // la serie completada más pesada
    expect(completedSets(s)).toHaveLength(2)
  })

  it('sin ninguna serie hecha, el ejercicio no cuenta como hecho', () => {
    const s = syncExercise(ejercicio({ logs: initLogs({ sets: 3, reps: '8-12', weightKg: 14 }) }))
    expect(s.done).toBe(false)
    expect(s.actualWeightKg).toBeUndefined()
  })

  it('un ejercicio antiguo sin registro se queda como está', () => {
    const viejo = ejercicio({ done: true, actualWeightKg: 12 })
    expect(syncExercise(viejo)).toEqual(viejo)
  })

  it('calcula el volumen de trabajo de las series hechas', () => {
    const pe = ejercicio({
      logs: [
        { weightKg: 14, reps: 10, done: true },
        { weightKg: 14, reps: 8, done: true },
        { weightKg: 14, reps: 8, done: false }
      ]
    })
    expect(volumeLoad(pe)).toBe(252) // 140 + 112, la no hecha no suma
  })
})

describe('cobertura de patrones de movimiento', () => {
  // Sin esto, añadir un ejercicio al catálogo lo dejaría sin animación ni avisos
  // de técnica, y el usuario se quedaría con la duda justo donde la app promete
  // resolverla.
  it('los 49 ejercicios tienen patrón asignado', () => {
    for (const ex of EXERCISES) {
      expect(patternOf(ex.id), `${ex.id} sin patrón`).toBeDefined()
    }
  })

  it('todo ejercicio tiene avisos de técnica', () => {
    for (const ex of EXERCISES) {
      expect(cuesFor(ex.id).length, ex.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('todos los patrones declarados tienen sus avisos', () => {
    for (const [patron, avisos] of Object.entries(PATTERN_CUES)) {
      expect(avisos.length, patron).toBeGreaterThanOrEqual(3)
    }
  })

  it('no hay patrones huérfanos que nadie use', () => {
    const usados = new Set(EXERCISES.map((e) => patternOf(e.id)))
    for (const patron of Object.keys(PATTERN_CUES)) {
      expect(usados.has(patron as never), `${patron} no lo usa ningún ejercicio`).toBe(true)
    }
  })
})

describe('interpretación del rango de repeticiones', () => {
  it('entiende los rangos numéricos', () => {
    expect(parseRepRange('8-12')).toEqual({ min: 8, max: 12 })
    expect(parseRepRange('10')).toEqual({ min: 10, max: 10 })
  })

  it('ignora los que no son repeticiones', () => {
    expect(parseRepRange('30-45 s')).toBeUndefined()
    expect(parseRepRange('25 min')).toBeUndefined()
  })
})

describe('doble progresión', () => {
  it('llegar al tope del rango en todas las series manda subir', () => {
    const pe = ejercicio({
      logs: [
        { weightKg: 14, reps: 12, done: true },
        { weightKg: 14, reps: 12, done: true }
      ]
    })
    expect(repVerdict(pe)).toBe('sube')
  })

  it('quedarse por debajo del mínimo manda mantener', () => {
    const pe = ejercicio({
      logs: [
        { weightKg: 14, reps: 10, done: true },
        { weightKg: 14, reps: 6, done: true }
      ]
    })
    expect(repVerdict(pe)).toBe('mantiene')
  })

  it('dentro del rango, progresión suave', () => {
    const pe = ejercicio({
      logs: [
        { weightKg: 14, reps: 10, done: true },
        { weightKg: 14, reps: 9, done: true }
      ]
    })
    expect(repVerdict(pe)).toBe('progresa_suave')
  })

  it('sin repeticiones registradas no hay veredicto', () => {
    expect(repVerdict(ejercicio())).toBeUndefined()
    expect(repVerdict(ejercicio({ logs: [{ weightKg: 14, done: true }] }))).toBeUndefined()
  })

  it('no opina sobre ejercicios medidos en segundos', () => {
    const plancha = ejercicio({
      plan: { sets: 2, reps: '30-45 s' },
      logs: [{ reps: 40, done: true }]
    })
    expect(repVerdict(plancha)).toBeUndefined()
  })
})
