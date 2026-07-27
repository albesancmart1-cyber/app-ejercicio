// Grupos musculares que la app equilibra como un todo.
export type MuscleGroup =
  | 'cuadriceps_gluteo'
  | 'femoral'
  | 'espalda'
  | 'pecho'
  | 'hombro'
  | 'brazo'
  | 'core'
  | 'cardio'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'cuadriceps_gluteo',
  'femoral',
  'espalda',
  'pecho',
  'hombro',
  'brazo',
  'core',
  'cardio'
]

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  cuadriceps_gluteo: 'Pierna (cuádriceps y glúteo)',
  femoral: 'Femoral',
  espalda: 'Espalda',
  pecho: 'Pecho',
  hombro: 'Hombro',
  brazo: 'Brazo',
  core: 'Core',
  cardio: 'Corazón (cardio)'
}

export type Equipment =
  | 'peso_corporal'
  | 'mancuernas'
  | 'barra'
  | 'kettlebell'
  | 'bandas'
  | 'banco'
  | 'dominadas_barra'
  | 'multipower'
  | 'polea'
  | 'maquina_prensa'
  | 'maquina_remo'
  | 'maquina_pecho'
  | 'maquina_femoral'
  | 'maquina_extension'
  | 'bici'
  | 'correr'

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  peso_corporal: 'Peso corporal',
  mancuernas: 'Mancuernas',
  barra: 'Barra y discos',
  kettlebell: 'Kettlebell',
  bandas: 'Bandas elásticas',
  banco: 'Banco',
  dominadas_barra: 'Barra de dominadas',
  multipower: 'Multipower / jaula',
  polea: 'Polea',
  maquina_prensa: 'Máquina de prensa',
  maquina_remo: 'Máquina de remo',
  maquina_pecho: 'Máquina de pecho',
  maquina_femoral: 'Máquina de femoral',
  maquina_extension: 'Máquina de extensión de cuádriceps',
  bici: 'Bicicleta',
  correr: 'Poder salir a correr / caminar'
}

// Equipos con carga regulable: el usuario indica el peso máximo del que dispone.
export const WEIGHTED_EQUIPMENT: Equipment[] = [
  'mancuernas',
  'barra',
  'kettlebell',
  'multipower',
  'polea',
  'maquina_prensa',
  'maquina_remo',
  'maquina_pecho',
  'maquina_femoral',
  'maquina_extension'
]

export type Goal = 'masa' | 'tonificar' | 'recomposicion'

export const GOAL_LABELS: Record<Goal, string> = {
  masa: 'Ganar masa muscular',
  tonificar: 'Tonificar',
  recomposicion: 'Recomposición corporal'
}

export interface Profile {
  name: string
  age?: number
  weightKg?: number
  goal: Goal
  equipment: Equipment[]
  /** Peso máximo disponible por equipo (kg). */
  maxWeights: Partial<Record<Equipment, number>>
  /** Fecha (ISO) en que empezó la alimentación cetogénica, si la sigue. */
  ketoSince?: string
  /** mg de DHA por pastilla de suplemento, si tiene. */
  dhaPillMg?: number
  /** Altura en cm, necesaria para el FFMI. */
  heightCm?: number
  /** Ejercicios que el usuario ha descartado y no quiere que se le propongan. */
  dislikedExercises?: string[]
}

export type StressLevel = 'bajo' | 'medio' | 'alto'

/** Cronometrado de la sesión. */
export interface SessionTiming {
  /** Época en ms en que se pulsó «empezar». */
  startedAt?: number
  /** Duración final en segundos, al guardar. */
  durationSec?: number
}

export interface Exercise {
  id: string
  name: string
  primary: MuscleGroup
  secondary: MuscleGroup[]
  equipment: Equipment[] // requiere al menos uno de estos
  stress: StressLevel
  /** Fracción del peso máximo disponible con la que sugerir empezar (solo fuerza con carga). */
  loadFactor?: number
  bodyweightOnly?: boolean
}

export type Discomfort = 'ninguna' | 'leves' | MuscleGroup

export interface CheckIn {
  date: string // ISO yyyy-mm-dd
  sleep: 1 | 2 | 3 | 4 | 5
  lightHygiene: boolean
  sunrise: boolean
  sunsetYesterday: boolean
  sunExposure: boolean
  keto: boolean
  energy: 1 | 2 | 3 | 4 | 5
  discomfort: Discomfort
  // Señales de leptina. Opcionales: los check-ins guardados antes de existir
  // estas preguntas siguen siendo válidos y no penalizan el cálculo.
  /** Despertarse con hambre voraz apunta a una señal nocturna alterada. */
  wokeHungry?: boolean
  /** Los antojos son el marcador clásico de leptina que no llega. */
  cravings?: boolean
}

export type SessionKind = 'fuerza' | 'cardio_suave' | 'cardio_medio' | 'reacondicionamiento' | 'descanso_activo'

export interface PlannedSet {
  sets: number
  reps: string // p.ej. "8-10" o "12-15"
  weightKg?: number
  /** Repeticiones en reserva objetivo (cuántas dejas sin hacer). */
  rir?: number
  /** Descanso recomendado entre series. */
  restSeconds?: number
}

/** Lo que realmente se hizo en una serie concreta. */
export interface SetLog {
  /** Peso real usado, en kg. Ausente en ejercicios de peso corporal. */
  weightKg?: number
  /** Repeticiones realmente completadas. */
  reps?: number
  done: boolean
}

export interface PlannedExercise {
  exerciseId: string
  name: string
  primary: MuscleGroup
  plan: PlannedSet
  /**
   * Se mantienen por compatibilidad: el balance muscular y la progresión los leen.
   * Cuando hay `logs`, se recalculan a partir de ellos en `syncExercise`.
   */
  done?: boolean
  actualWeightKg?: number
  /** Registro serie a serie. Ausente en las sesiones guardadas antes de existir. */
  logs?: SetLog[]
}

export interface Session {
  id: string
  date: string // ISO yyyy-mm-dd
  kind: SessionKind
  title: string
  exercises: PlannedExercise[]
  /** Para cardio: minutos sugeridos/registrados. */
  cardioMinutes?: number
  rpe?: 1 | 2 | 3 | 4 | 5
  completed: boolean
  /** Época en ms en que se pulsó «empezar entrenamiento». */
  startedAt?: number
  /** Duración total en segundos, guardada al terminar. */
  durationSec?: number
}

export interface Recommendation {
  kind: SessionKind
  title: string
  message: string
  focus: MuscleGroup[]
  intensity: 'suave' | 'moderada' | 'media-alta'
  cardioMinutes?: number
  /** Multiplicador de volumen (vuelta progresiva tras un parón). */
  volumeScale: number
  /** Repeticiones en reserva objetivo para la sesión. */
  rir: number
  /** Por qué se recomienda esto, en lenguaje llano. */
  reasons: string[]
  /** Paso actual de la vuelta progresiva, si procede. */
  reentry?: { step: number; total: number }
  /** El cuerpo aún se está adaptando a la cetosis. */
  ketoAdapting?: boolean
  /** El usuario pidió subir el listón por encima de lo que tocaba. */
  userOverride?: boolean
  /** Nivel de volumen vigente, con su explicación. */
  volume?: {
    level: number
    setsPerExercise: number
    exercisesPerSession: number
    repBias: 'normal' | 'variado'
    changes: string[]
    reason: string
    evidence: string[]
  }
}

/** Una lectura de la báscula. Los porcentajes vienen tal cual del aparato. */
export interface BodyMeasurement {
  date: string // ISO yyyy-mm-dd
  weightKg: number
  fatPercent?: number
  musclePercent?: number
}

export interface AppData {
  version: 1
  profile: Profile | null
  checkIns: CheckIn[]
  sessions: Session[]
  measurements: BodyMeasurement[]
}
