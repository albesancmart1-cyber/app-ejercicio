/**
 * Migración v1 → v2: taxonomía muscular fina.
 *
 * Reglas que se respetan sin excepción:
 *
 * 1. **No se pierde nada.** Los campos viejos (`primary`, `secondary`) se
 *    quedan donde estaban. La migración solo **añade** `muscleContributions`.
 *    Si hubiera que revertir, basta con volver a leer los campos viejos.
 * 2. **Lo que se deduce se marca.** Un ejercicio del catálogo tiene su mapa
 *    escrito a mano y se copia tal cual. Uno que ya no existe —renombrado,
 *    borrado, inventado por el usuario— se deduce del nombre y se marca con
 *    `needsReview` para que el usuario lo confirme antes de fiarse del número.
 * 3. **Es idempotente.** Volver a pasarla sobre datos ya migrados no cambia
 *    nada, así que ejecutarla en cada arranque es seguro.
 */
import { CONTRIBUTIONS } from '../data/contributions'
import { ALL_MUSCLES } from '../domain/muscles'
import type { Muscle, MuscleContributions } from '../domain/muscles'
import type { AppData, PlannedExercise } from '../domain/types'

export const VERSION_ACTUAL = 2

/**
 * Heurísticas por nombre para los ejercicios que ya no están en el catálogo.
 *
 * El orden importa: se aplica la **primera** que encaje, así que van de lo más
 * específico a lo más general. «Curl femoral» tiene que caer en isquiosurales
 * antes de que «curl» lo mande al bíceps.
 */
export const HEURISTICAS: { patron: RegExp; aporte: MuscleContributions }[] = [
  // Pierna, antes que nada porque comparten palabras con el tren superior.
  { patron: /curl\s*(femoral|nordic|isquio)/i, aporte: { isquiosurales: 1 } },
  { patron: /(peso\s*muerto|rumano|buenos\s*d[ií]as|hip\s*thrust|bisagra)/i, aporte: { isquiosurales: 1, gluteo: 1, erectores_espinales: 0.5 } },
  { patron: /(sentadilla|squat|prensa|zancada|lunge|split|b[uú]lgara|pistol|subida)/i, aporte: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 } },
  { patron: /extensi[oó]n\s*(de\s*)?(cu[aá]driceps|rodilla)/i, aporte: { cuadriceps: 1 } },
  { patron: /(gl[uú]teo|puente|hip\s*abduction|patada\s*de\s*cadera)/i, aporte: { gluteo: 1, isquiosurales: 0.5 } },
  { patron: /(aductor|cosac|sumo)/i, aporte: { aductores: 1, cuadriceps: 0.5 } },
  { patron: /(gemelo|talon|pantorrilla|calf)/i, aporte: { gastrocnemio: 1, soleo: 0.5 } },
  { patron: /(s[oó]leo|sentad[ao]\s*talon)/i, aporte: { soleo: 1 } },

  // Espalda.
  { patron: /(dominad|jal[oó]n|pull[\s-]*up|chin[\s-]*up|pullover)/i, aporte: { dorsal_ancho: 1, biceps_braquial: 0.5, espalda_alta: 0.5 } },
  { patron: /remo/i, aporte: { espalda_alta: 1, dorsal_ancho: 1, biceps_braquial: 0.5 } },
  { patron: /(encogimiento|shrug|trapecio)/i, aporte: { trapecio_superior: 1 } },
  { patron: /(hiperextensi|lumbar|superman|erector|extensi[oó]n\s*de\s*espalda)/i, aporte: { erectores_espinales: 1, gluteo: 0.5 } },
  { patron: /(face\s*pull|p[aá]jaro|deltoides\s*posterior|rotaci[oó]n\s*externa|y-?t-?w)/i, aporte: { deltoides_posterior: 1, espalda_alta: 0.5 } },

  // Pecho.
  { patron: /(apertura|cruce|fly|pec\s*deck)/i, aporte: { pectoral_mayor: 1, deltoides_anterior: 0.5 } },
  { patron: /(press\s*(de\s*)?banca|press\s*inclinado|press\s*declinado|press\s*de\s*pecho|flexion|push[\s-]*up)/i, aporte: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 } },

  // Hombro.
  { patron: /elevaci[oó]n(es)?\s*lateral/i, aporte: { deltoides_lateral: 1 } },
  { patron: /elevaci[oó]n(es)?\s*frontal/i, aporte: { deltoides_anterior: 1 } },
  { patron: /(press\s*militar|press\s*(de\s*)?hombro|arnold|pike|pino)/i, aporte: { deltoides_anterior: 1, triceps_braquial: 0.5, deltoides_lateral: 0.5 } },

  // Brazo.
  { patron: /(fondo|dip|diamante|press\s*franc[eé]s|patada\s*de\s*tr[ií]ceps|extensi[oó]n\s*(de\s*)?tr[ií]ceps|tr[ií]ceps)/i, aporte: { triceps_braquial: 1 } },
  { patron: /curl\s*(inverso|de\s*mu[ñn]eca)/i, aporte: { antebrazo: 1, biceps_braquial: 0.5 } },
  { patron: /(curl|b[ií]ceps)/i, aporte: { biceps_braquial: 1 } },
  { patron: /(antebrazo|agarre|grip)/i, aporte: { antebrazo: 1 } },

  // Core.
  { patron: /(oblicu|lateral\s*plank|plancha\s*lateral|russian|giro|leñador|pallof)/i, aporte: { oblicuos: 1, recto_abdominal: 0.5 } },
  { patron: /(plancha|plank|hollow|dead\s*bug|abdominal|crunch|elevaci[oó]n\s*de\s*piernas|escalador|mountain)/i, aporte: { recto_abdominal: 1, oblicuos: 0.5 } },
  { patron: /bird\s*dog/i, aporte: { erectores_espinales: 1, gluteo: 0.5 } }
]

/** Deduce el mapa a partir del nombre. Devuelve null si no encaja ninguna. */
export function inferirPorNombre(nombre: string): MuscleContributions | null {
  for (const { patron, aporte } of HEURISTICAS) {
    if (patron.test(nombre)) return { ...aporte }
  }
  return null
}

/** Un cardio no aporta series a ningún músculo, y eso no es un dato a revisar. */
function esCardio(pe: PlannedExercise): boolean {
  return pe.primary === 'cardio'
}

/**
 * Migra un ejercicio registrado. Idempotente: si ya tiene mapa, no se toca.
 */
export function migrarEjercicio(pe: PlannedExercise): PlannedExercise {
  if (pe.muscleContributions) return pe
  if (esCardio(pe)) return pe

  const delCatalogo = CONTRIBUTIONS[pe.exerciseId]
  if (delCatalogo) {
    // Del catálogo: el mapa está escrito a mano, no hay nada que revisar.
    return { ...pe, muscleContributions: { ...delCatalogo } }
  }

  const deducido = inferirPorNombre(pe.name)
  if (deducido) {
    return { ...pe, muscleContributions: deducido, needsReview: true }
  }
  // Ni catálogo ni heurística: se marca para revisar y se deja sin mapa, que es
  // más honesto que inventarse un músculo. Cuenta cero hasta que se confirme.
  return { ...pe, needsReview: true }
}

export interface ResultadoMigracion {
  data: AppData
  /** Cuántos ejercicios registrados se han migrado. */
  migrados: number
  /** Cuántos quedaron marcados para que el usuario los confirme. */
  paraRevisar: number
}

export function migrar(data: AppData): ResultadoMigracion {
  let migrados = 0
  let paraRevisar = 0

  const sessions = data.sessions.map((s) => {
    let cambiada = false
    const exercises = s.exercises.map((pe) => {
      const nuevo = migrarEjercicio(pe)
      if (nuevo !== pe) {
        cambiada = true
        migrados += 1
        if (nuevo.needsReview) paraRevisar += 1
      }
      return nuevo
    })
    return cambiada ? { ...s, exercises } : s
  })

  return {
    data: { ...data, version: VERSION_ACTUAL, sessions },
    migrados,
    paraRevisar
  }
}

/** Los registros que el usuario debería confirmar, agrupados por ejercicio. */
export function pendientesDeRevisar(data: AppData): { exerciseId: string; name: string; veces: number }[] {
  const cuenta = new Map<string, { exerciseId: string; name: string; veces: number }>()
  for (const s of data.sessions) {
    for (const pe of s.exercises) {
      if (!pe.needsReview) continue
      const previo = cuenta.get(pe.exerciseId)
      if (previo) previo.veces += 1
      else cuenta.set(pe.exerciseId, { exerciseId: pe.exerciseId, name: pe.name, veces: 1 })
    }
  }
  return [...cuenta.values()].sort((a, b) => b.veces - a.veces)
}

/** Comprobación de integridad: ningún mapa puede citar un músculo inexistente. */
export function musculosDesconocidos(aporte: MuscleContributions): string[] {
  const validos = new Set<string>(ALL_MUSCLES as string[])
  return Object.keys(aporte).filter((m) => !validos.has(m)) as Muscle[]
}
