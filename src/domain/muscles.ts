/**
 * Taxonomía muscular de dos niveles.
 *
 * El conteo anterior era demasiado grueso: una serie de tríceps se sumaba a
 * «brazo» igual que una de bíceps, así que el balance podía decir «brazo
 * cubierto» con el tríceps machacado y el bíceps a cero. Aquí se separan las
 * dos cosas:
 *
 * - **Región** — agrupación para navegar y filtrar. No se cuenta volumen sobre
 *   ella; solo se suma para enseñarla plegada.
 * - **Músculo** — la unidad real de conteo. Es donde viven los landmarks y
 *   donde se decide si falta o sobra trabajo.
 *
 * `cardio` no aparece: no es un músculo y no tiene volumen de series. Se sigue
 * llevando aparte, por minutos.
 */

export type Region = 'pecho' | 'espalda' | 'hombro' | 'brazo' | 'pierna' | 'core'

export type Muscle =
  // Pecho
  | 'pectoral_mayor'
  // Espalda
  | 'dorsal_ancho'
  | 'espalda_alta'
  | 'trapecio_superior'
  | 'erectores_espinales'
  // Hombro
  | 'deltoides_anterior'
  | 'deltoides_lateral'
  | 'deltoides_posterior'
  // Brazo
  | 'biceps_braquial'
  | 'triceps_braquial'
  | 'antebrazo'
  // Pierna
  | 'cuadriceps'
  | 'isquiosurales'
  | 'gluteo'
  | 'aductores'
  | 'gastrocnemio'
  | 'soleo'
  // Core
  | 'recto_abdominal'
  | 'oblicuos'

/**
 * Puntos de referencia de volumen, en **series fraccionales por semana**.
 *
 * - `mev` — mínimo con el que ya se ve adaptación.
 * - `mavMin`–`mavMax` — la banda donde el volumen rinde de verdad.
 * - `mrv` — a partir de aquí se acumula más fatiga que estímulo.
 *
 * Son valores de partida, editables por perfil: la respuesta al volumen varía
 * mucho de una persona a otra y estas cifras son una referencia, no una ley.
 */
export interface VolumeLandmarks {
  mev: number
  mavMin: number
  mavMax: number
  mrv: number
}

export interface MuscleInfo {
  region: Region
  /** Nombre para la interfaz. */
  label: string
  /** Versión corta, para barras y etiquetas estrechas. */
  short: string
  landmarks: VolumeLandmarks
}

export const REGIONS: Region[] = ['pecho', 'espalda', 'hombro', 'brazo', 'pierna', 'core']

export const REGION_LABELS: Record<Region, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombro: 'Hombro',
  brazo: 'Brazo',
  pierna: 'Pierna',
  core: 'Core'
}

export const MUSCLES: Record<Muscle, MuscleInfo> = {
  pectoral_mayor: {
    region: 'pecho',
    label: 'Pectoral mayor',
    short: 'Pectoral',
    landmarks: { mev: 4, mavMin: 12, mavMax: 18, mrv: 22 }
  },

  dorsal_ancho: {
    region: 'espalda',
    label: 'Dorsal ancho',
    short: 'Dorsal',
    landmarks: { mev: 4, mavMin: 12, mavMax: 20, mrv: 25 }
  },
  espalda_alta: {
    region: 'espalda',
    label: 'Espalda alta (trapecio medio y romboides)',
    short: 'Espalda alta',
    landmarks: { mev: 4, mavMin: 10, mavMax: 18, mrv: 22 }
  },
  trapecio_superior: {
    region: 'espalda',
    label: 'Trapecio superior',
    short: 'Trapecio',
    landmarks: { mev: 3, mavMin: 6, mavMax: 14, mrv: 20 }
  },
  erectores_espinales: {
    region: 'espalda',
    label: 'Erectores espinales',
    short: 'Erectores',
    landmarks: { mev: 3, mavMin: 6, mavMax: 12, mrv: 16 }
  },

  deltoides_anterior: {
    region: 'hombro',
    label: 'Deltoides anterior',
    short: 'Delt. anterior',
    landmarks: { mev: 3, mavMin: 6, mavMax: 12, mrv: 16 }
  },
  deltoides_lateral: {
    region: 'hombro',
    label: 'Deltoides lateral',
    short: 'Delt. lateral',
    landmarks: { mev: 4, mavMin: 12, mavMax: 20, mrv: 26 }
  },
  deltoides_posterior: {
    region: 'hombro',
    label: 'Deltoides posterior',
    short: 'Delt. posterior',
    landmarks: { mev: 4, mavMin: 10, mavMax: 18, mrv: 24 }
  },

  biceps_braquial: {
    region: 'brazo',
    label: 'Bíceps braquial',
    short: 'Bíceps',
    landmarks: { mev: 4, mavMin: 12, mavMax: 20, mrv: 26 }
  },
  triceps_braquial: {
    region: 'brazo',
    label: 'Tríceps braquial',
    short: 'Tríceps',
    landmarks: { mev: 4, mavMin: 16, mavMax: 24, mrv: 30 }
  },
  antebrazo: {
    region: 'brazo',
    label: 'Antebrazo',
    short: 'Antebrazo',
    landmarks: { mev: 3, mavMin: 6, mavMax: 14, mrv: 20 }
  },

  cuadriceps: {
    region: 'pierna',
    label: 'Cuádriceps',
    short: 'Cuádriceps',
    landmarks: { mev: 4, mavMin: 12, mavMax: 20, mrv: 26 }
  },
  isquiosurales: {
    region: 'pierna',
    label: 'Isquiosurales',
    short: 'Isquios',
    landmarks: { mev: 4, mavMin: 10, mavMax: 16, mrv: 20 }
  },
  gluteo: {
    region: 'pierna',
    label: 'Glúteo',
    short: 'Glúteo',
    landmarks: { mev: 4, mavMin: 10, mavMax: 18, mrv: 24 }
  },
  aductores: {
    region: 'pierna',
    label: 'Aductores',
    short: 'Aductores',
    landmarks: { mev: 3, mavMin: 6, mavMax: 12, mrv: 16 }
  },
  gastrocnemio: {
    region: 'pierna',
    label: 'Gastrocnemio',
    short: 'Gemelo',
    landmarks: { mev: 6, mavMin: 9, mavMax: 16, mrv: 22 }
  },
  soleo: {
    region: 'pierna',
    label: 'Sóleo',
    short: 'Sóleo',
    landmarks: { mev: 6, mavMin: 9, mavMax: 16, mrv: 22 }
  },

  recto_abdominal: {
    region: 'core',
    label: 'Recto abdominal',
    short: 'Abdominal',
    landmarks: { mev: 4, mavMin: 8, mavMax: 16, mrv: 22 }
  },
  oblicuos: {
    region: 'core',
    label: 'Oblicuos',
    short: 'Oblicuos',
    landmarks: { mev: 3, mavMin: 6, mavMax: 12, mrv: 16 }
  }
}

export const ALL_MUSCLES = Object.keys(MUSCLES) as Muscle[]

/** Los músculos de una región, en el orden en que se enseñan. */
export function musclesOf(region: Region): Muscle[] {
  return ALL_MUSCLES.filter((m) => MUSCLES[m].region === region)
}

export function regionOf(muscle: Muscle): Region {
  return MUSCLES[muscle].region
}

/**
 * Contribución de un ejercicio a un músculo.
 *
 * - `1` — motor primario: la serie cuenta entera.
 * - `0.5` — sinergista con implicación significativa: cuenta media.
 *
 * Los estabilizadores no se listan. El método fraccional —contar las indirectas
 * como media serie— es el que mejor predijo hipertrofia y fuerza frente a
 * contarlas enteras o no contarlas (Pelland et al., Sports Medicine 2025).
 */
export type Contribution = 1 | 0.5

export type MuscleContributions = Partial<Record<Muscle, Contribution>>
