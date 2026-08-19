import type { Localizacion } from './localizaciones'
import type { LandmarkOverrides } from './landmarks'
import type { Lapida } from './merge'
import type { UltimaVez } from './ultimaVez'
import type { Muscle, MuscleContributions } from './muscles'

/**
 * @deprecated Taxonomía gruesa de grupos musculares.
 *
 * Se mantiene una versión entera para poder revertir y para que el motor de
 * recomendación siga funcionando mientras se migra. La unidad real de conteo
 * de volumen es ahora el músculo (`src/domain/muscles.ts`).
 */
export type MuscleGroup =
  | 'cuadriceps_gluteo'
  | 'femoral'
  | 'espalda'
  | 'pecho'
  | 'hombro'
  | 'brazo'
  | 'gemelo'
  | 'core'
  | 'cardio'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'cuadriceps_gluteo',
  'femoral',
  'espalda',
  'pecho',
  'hombro',
  'brazo',
  'gemelo',
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
  gemelo: 'Gemelo',
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
  // Dos cacharros baratos y muy comunes que el catálogo no sabía nombrar, y por
  // eso no tenía ni fondos en paralelas ni rueda abdominal.
  | 'paralelas'
  | 'rueda_abdominal'
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
  paralelas: 'Paralelas o barras de fondos',
  rueda_abdominal: 'Rueda abdominal',
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
  /**
   * Los sitios donde entrenas, cada uno con su material y sus topes.
   *
   * El perfil daba por hecho que uno entrena siempre en el mismo sitio, y
   * cambiar significaba marcar y desmarcar una docena de botones —y acordarse
   * de deshacerlo—. Ver `src/domain/localizaciones.ts`.
   */
  locations?: Localizacion[]
  /** El último sitio elegido, para que la próxima vez venga puesto. */
  lastLocationId?: string
  /** Fecha (ISO) en que empezó la alimentación cetogénica, si la sigue. */
  ketoSince?: string
  /** mg de DHA por pastilla de suplemento, si tiene. */
  dhaPillMg?: number
  /** Altura en cm, necesaria para el FFMI. */
  heightCm?: number
  /** Ejercicios que el usuario ha descartado y no quiere que se le propongan. */
  dislikedExercises?: string[]
  /**
   * Landmarks de volumen ajustados a mano. Solo se guardan los que difieren de
   * los de fábrica, así que afinar los valores por defecto sigue llegando a
   * quien no los haya tocado.
   */
  landmarkOverrides?: LandmarkOverrides
  /**
   * El usuario ha declarado que está perdiendo grasa. Recorta el objetivo de
   * volumen: con la leptina baja se recupera peor y pasar de doce series por
   * músculo no conserva más. El nombre del campo se queda por compatibilidad
   * con lo ya guardado; de cara al usuario nunca se habla de déficit calórico.
   */
  deficitPhase?: boolean
  /**
   * Los que más le gustan. Con un catálogo grande, marcar cuatro o cinco es lo
   * que hace que las sesiones se parezcan a lo que uno quiere entrenar sin
   * tener que elegir cada día.
   */
  favoriteExercises?: string[]
  /**
   * Notas propias por ejercicio: el agujero del asiento, el agarre que no
   * molesta la muñeca, la máquina que está descalibrada. Van en el perfil y no
   * en la sesión porque valen para siempre, no para un día.
   */
  exerciseNotes?: Record<string, string>
  /**
   * Descanso preferido por ejercicio, en segundos. Lo que propone el protocolo
   * es un buen punto de partida, pero cuánto necesita cada uno entre series de
   * un ejercicio concreto solo lo sabe quien lo hace.
   */
  restOverrides?: Record<string, number>
  /**
   * Que la pantalla no se apague mientras se entrena. Desactivado por defecto:
   * gasta batería, y hay quien prefiere bloquear el móvil entre series.
   */
  keepAwake?: boolean
  /**
   * Alarma sonora al terminar el descanso.
   *
   * Activada de partida, y a propósito: el móvil suele estar boca abajo en el
   * banco o en el bolsillo, y la vibración sola no se oye. No es una
   * notificación —no pide permiso, no puede llegar tarde y no la silencia el
   * modo concentración—: es un pitido que sale del móvil ahí mismo.
   */
  alarmaDescanso?: boolean
  /**
   * Nivel de volumen elegido a mano. La app decide sola por defecto —solo sube
   * cuando el cuerpo demuestra que asimila—, pero quien se nota preparado puede
   * adelantarlo —o quedarse por debajo—. Manda mientras diga algo distinto del
   * automático; cuando coinciden deja de ser una elección y no se marca como
   * tal.
   */
  volumeLevelOverride?: 1 | 2 | 3 | 4
  /**
   * Lo que la app ha aprendido de qué ejercicios te gustan, sin que los hayas
   * marcado: sube el que entrenas y baja el que cambias por otro. Ver
   * `src/domain/affinity.ts`.
   */
  exerciseAffinity?: Record<string, number>
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
  /** @deprecated Taxonomía de grupos gruesos. La sustituye `muscleContributions`. */
  primary: MuscleGroup
  /** @deprecated Igual que `primary`: se conserva una versión para poder revertir. */
  secondary: MuscleGroup[]
  equipment: Equipment[] // requiere al menos uno de estos
  stress: StressLevel
  /** Fracción del peso máximo disponible con la que sugerir empezar (solo fuerza con carga). */
  loadFactor?: number
  bodyweightOnly?: boolean
  /**
   * El ejercicio se puede hacer a un lado cada vez o con los dos a la vez, y la
   * diferencia importa: el peso de una mano no es el de las dos. Cuando es así,
   * la app pregunta cómo se hizo y lo guarda con la serie.
   */
  unilateralOption?: boolean
}

export type SideMode = 'unilateral' | 'bilateral'

export const SIDE_LABELS: Record<SideMode, string> = {
  unilateral: 'A un lado cada vez',
  bilateral: 'Con los dos a la vez'
}

/**
 * Cómo se hizo el ejercicio, cuando admite varias formas. Un mismo ejercicio
 * con polea a un brazo y con mancuerna a dos brazos son cargas distintas: sin
 * anotar la variante, la progresión compararía cosas que no se parecen.
 */
export interface ExerciseVariant {
  /** Con qué se hizo, si el ejercicio admite más de un material. */
  implement?: Equipment
  /** A un lado cada vez, o con los dos a la vez. */
  side?: SideMode
}

/** @deprecated Una sola zona. La sustituye `CheckIn.discomforts`. */
export type Discomfort = 'ninguna' | 'leves' | MuscleGroup

export interface CheckIn {
  date: string // ISO yyyy-mm-dd
  /** Cuándo se guardó por última vez. Lo usa la fusión entre dispositivos. */
  updatedAt?: number
  sleep: 1 | 2 | 3 | 4 | 5
  lightHygiene: boolean
  sunrise: boolean
  sunsetYesterday: boolean
  sunExposure: boolean
  keto: boolean
  energy: 1 | 2 | 3 | 4 | 5
  /**
   * @deprecated Solo admitía **una** zona, y el cuerpo no funciona así: se sale
   * de una sesión de empujes con el pecho y el tríceps cargados a la vez.
   * Se conserva como resumen —lo leen los check-ins guardados de antes— y se
   * recalcula al guardar; quien manda es `discomforts`.
   */
  discomfort: Discomfort
  /**
   * Zonas con molestias o agujetas, tantas como haga falta. Cada una se deja
   * descansar hoy, y cuantas más haya, menos exigente es la sesión: tener tres
   * zonas cargadas no es lo mismo que tener una.
   */
  discomforts?: MuscleGroup[]
  /** Agujetas leves repartidas, sin una zona clara a la que señalar. */
  mildSoreness?: boolean
  // Señales de leptina. Opcionales: los check-ins guardados antes de existir
  // estas preguntas siguen siendo válidos y no penalizan el cálculo.
  /** Despertarse con hambre voraz apunta a una señal nocturna alterada. */
  wokeHungry?: boolean
  /** Los antojos son el marcador clásico de leptina que no llega. */
  cravings?: boolean
  // Lo que alimenta la explicación diaria del peso (`explicacionPeso.ts`).
  // Todo opcional: los check-ins de antes siguen valiendo, y un día sin
  // contestar algo no rompe nada — solo deja ese factor sin mirar.
  /** A qué hora te acostaste anoche, «HH:MM». */
  horaAcostarse?: string
  /** A qué hora te levantaste hoy, «HH:MM». */
  horaLevantarse?: string
  /** Cenaste tarde ayer (a menos de ~3 h de acostarte). */
  cenaTarde?: boolean
  /** Alcohol ayer. */
  alcohol?: boolean
  /** Comida muy salada ayer. */
  comidaSalada?: boolean
  /**
   * Has ido al baño antes de pesarte. Suena prosaico y es uno de los mayores
   * factores del número de la báscula de un día a otro.
   */
  transito?: boolean
  /** Estrés de ayer, 1 (tranquilo) a 5 (muy alto). El cortisol retiene agua. */
  estres?: 1 | 2 | 3 | 4 | 5
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
/**
 * Qué clase de serie es. No es una etiqueta decorativa: cada tipo cuenta
 * distinto para el volumen y para el esfuerzo.
 *
 *  - `calentamiento`: prepara, no estimula. No cuenta.
 *  - `normal`: la serie de trabajo de siempre.
 *  - `fallo`: se llegó al punto de no poder completar otra repetición. Vale una
 *    serie, y su RIR es cero por definición aunque no se anote.
 *  - `drop`: se bajó el peso y se siguió sin descansar. **Continúa** la serie
 *    anterior en vez de ser una nueva, así que cuenta media.
 */
export type TipoSerie = 'calentamiento' | 'normal' | 'fallo' | 'drop'

export const TIPO_SERIE_LABELS: Record<TipoSerie, string> = {
  calentamiento: 'Calentamiento',
  normal: 'Normal',
  fallo: 'Al fallo',
  drop: 'Drop set'
}

/** Lo que se pinta en el botón de la serie: una letra basta y ocupa poco. */
export const TIPO_SERIE_CORTO: Record<TipoSerie, string> = {
  calentamiento: 'C',
  normal: '',
  fallo: 'F',
  drop: 'D'
}

export interface SetLog {
  /** Peso real usado, en kg. Ausente si no se ha anotado nada. */
  weightKg?: number
  /**
   * La serie se hizo con el propio cuerpo.
   *
   * Cuando está marcada, `weightKg` lleva **los kilos que ese ejercicio mueve de
   * tu cuerpo** —no el campo vacío de antes—, calculados al marcarla y
   * congelados ahí: es lo que levantaste ese día, y que mañana peses otra cosa
   * no cambia lo que hiciste. Así el volumen, los récords y la progresión de
   * carga funcionan sin enterarse de que no había mancuernas de por medio.
   *
   * Ver `src/domain/pesoCorporal.ts`.
   */
  pesoCorporal?: boolean
  /** Repeticiones realmente completadas. */
  reps?: number
  /**
   * Repeticiones en reserva **reales** de esta serie: las que se habrían podido
   * hacer más antes de fallar.
   *
   * No confundir con `plan.rir`, que es a lo que la app pedía ir. El plan es una
   * intención y esto es lo que pasó, y la diferencia entre ambos es justo la
   * información que hacía falta: dos sesiones con el mismo peso y las mismas
   * repeticiones dejan un estrés muy distinto si una se hizo a dos de fallar y
   * la otra al fallo. Sin este dato, la app estimaba el estrés por lo que había
   * pedido, no por lo que se había hecho.
   */
  rir?: number
  done: boolean
  /**
   * Qué clase de serie. Ausente en los registros de antes de que existiera: ahí
   * manda `warmup`, y a falta de los dos se asume normal.
   */
  tipo?: TipoSerie
  /**
   * @deprecated Lo sustituye `tipo: 'calentamiento'`. Se conserva porque lo
   * llevan las sesiones ya guardadas y porque `tipoDe()` lo sigue leyendo.
   */
  warmup?: boolean
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
  /** Cómo se hizo, cuando el ejercicio admite varias formas. */
  variant?: ExerciseVariant
  /** Añadido a mano durante la sesión, no propuesto por la app. */
  addedByUser?: boolean
  /**
   * Con qué otros ejercicios va encadenado sin descanso. Los que comparten este
   * identificador forman una superserie: se hace una serie de cada uno seguida y
   * el descanso llega al cerrar la vuelta. Ver `src/domain/superseries.ts`.
   *
   * Solo cambia el **orden** en que se recorren y cuándo se descansa: una serie
   * cuenta lo mismo encadenada que suelta, así que el volumen y el estrés ni se
   * enteran.
   */
  supersetId?: string
  /**
   * Qué se hizo la última vez en este mismo ejercicio, congelado al construir
   * la sesión. Es la base desde la que decidir hoy: sin ella hay que adivinar,
   * y adivinar hacia abajo es la forma más silenciosa de no progresar.
   */
  previous?: UltimaVez
  /**
   * Qué músculos mueve y cuánto, congelado en el momento de registrar. Se
   * guarda con la sesión —en vez de mirarlo siempre en el catálogo— para que
   * afinar el mapa mañana no reescriba el volumen de lo que ya entrenaste.
   */
  muscleContributions?: MuscleContributions
  /**
   * El mapa se dedujo del nombre al migrar y conviene que el usuario lo
   * confirme. Solo lo llevan los registros anteriores a la taxonomía nueva.
   */
  needsReview?: boolean
  /**
   * Qué está haciendo hoy la progresión de carga con este ejercicio, cuando hay
   * algo que explicar: que falta una sesión para subir, o que se ha llegado al
   * tope del material y toca cambiar de palanca.
   */
  progressNote?: string
}

export interface Session {
  /**
   * Los minutos que se pidieron al prepararla, si se pidió un tope.
   *
   * Se guarda para poder decir en la propia sesión por qué está recortada: sin
   * esto, uno abre el entreno tres horas después y no entiende por qué el plan
   * lleva superseries que no pidió.
   */
  minutosPedidos?: number
  id: string
  date: string // ISO yyyy-mm-dd
  /** Cuándo se guardó por última vez. Lo usa la fusión entre dispositivos. */
  updatedAt?: number
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
  /**
   * El descanso que está corriendo ahora mismo, si lo hay.
   *
   * Va aquí y no en el estado de la pantalla porque un descanso de dos minutos
   * es justo el rato en que uno se sale a mirar otra cosa, y antes eso lo
   * mataba: al volver, ni cuenta atrás ni aviso, y la app ya te había pasado a
   * la serie siguiente. Guardado con la sesión, cerrar la app y volver tampoco
   * lo pierde. Es la misma idea que `startedAt`: una marca de tiempo absoluta,
   * no un contador que haya que ir restando.
   */
  descanso?: DescansoEnCurso
}

/** Un descanso corriendo: contra el reloj, no contra un contador. */
export interface DescansoEnCurso {
  /** Qué serie se acaba de hacer, para poder volver a corregirla. */
  exercise: number
  set: number
  /** Cuándo termina, en época ms. */
  endsAt: number
  /** Cuánto dura en total, en segundos. Cambia con los ±30 s. */
  totalSeconds: number
  /** El ejercicio que viene, cuando el descanso es entre ejercicios. */
  nextName?: string
}

/**
 * Un entreno guardado para repetirlo.
 *
 * Guarda **la estructura** —qué ejercicios, en qué orden, con qué series y
 * repeticiones— y no los pesos: esos los pone la progresión cada vez, mirando
 * lo que hiciste la última vez. Ver `src/domain/rutinas.ts`.
 */
export interface Routine {
  id: string
  name: string
  /** Carpeta en la que se guarda, si el usuario la ha puesto en alguna. */
  folder?: string
  kind: SessionKind
  exercises: PlannedExercise[]
  createdAt: number
  /** Cuándo se tocó por última vez. Lo usa la fusión entre dispositivos. */
  updatedAt?: number
  /** De qué sesión salió. */
  fromSessionId?: string
}

export interface Recommendation {
  kind: SessionKind
  title: string
  message: string
  /**
   * @deprecated Se deriva de `focusMuscles`. Sigue aquí porque el título de la
   * sesión y las pantallas que aún razonan por zonas lo leen.
   */
  focus: MuscleGroup[]
  /**
   * Los músculos concretos que abren la sesión, en orden de necesidad. Es lo que
   * de verdad decide qué ejercicios se proponen; `focus` es su resumen por zonas.
   * Opcional: una recomendación construida a mano (o guardada antes de existir
   * este campo) sigue siendo válida y cae en la elección por grupo.
   */
  focusMuscles?: Muscle[]
  /**
   * Zonas que hoy no se tocan: molestias declaradas, grupos aún en recuperación
   * y grupos saturados. Al elegir por músculo hace falta decirlo explícitamente,
   * porque un ejercicio bueno para el bíceps puede ser una dominada, y con la
   * espalda dolorida esa no es la respuesta.
   */
  avoidGroups?: MuscleGroup[]
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
  /**
   * Sesión mixta: pesas **y** cardio el mismo día, a petición del usuario. La
   * fuerza va primero y el cardio se recorta, que es como menos se estorban.
   */
  mixed?: boolean
  /** Nivel de volumen vigente, con su explicación. */
  volume?: {
    level: number
    setsPerExercise: number
    exercisesPerSession: number
    /** Cuántos músculos distintos abre la sesión en este nivel. */
    focusMuscles: number
    repBias: 'normal' | 'variado'
    changes: string[]
    reason: string
    evidence: string[]
    /** El nivel lo ha elegido el usuario, no la progresión automática. */
    chosenByUser?: boolean
    /** Dónde estaría la app si decidiera ella. Para poder compararlo. */
    autoLevel?: number
  }
}

/** Una lectura de la báscula. Los porcentajes vienen tal cual del aparato. */
export interface BodyMeasurement {
  date: string // ISO yyyy-mm-dd
  /** Cuándo se guardó por última vez. Lo usa la fusión entre dispositivos. */
  updatedAt?: number
  weightKg: number
  fatPercent?: number
  musclePercent?: number
}

/**
 * Etiquetas rápidas de una comida: un toque cada una, cero tecleo obligatorio.
 *
 * No hay caloría ni gramo por ninguna parte a propósito: lo que se registra es
 * **qué, cuándo y de qué tipo**. «carbohidrato» existe porque en cetogénica es
 * el dato que explica el peso del día siguiente (glucógeno + su agua), no para
 * contar nada.
 */
export type EtiquetaComida =
  | 'proteina'
  | 'pescado_azul'
  | 'huevos'
  | 'verdura'
  | 'carbohidrato'
  | 'salada'
  | 'alcohol'

export const ETIQUETAS_COMIDA: Record<EtiquetaComida, string> = {
  proteina: 'Proteína animal',
  pescado_azul: 'Pescado azul',
  huevos: 'Huevos',
  verdura: 'Verdura',
  carbohidrato: 'Carbohidrato',
  salada: 'Muy salada',
  alcohol: 'Alcohol'
}

/**
 * La calidad de un carbohidrato: el de una fruta o la miel («bueno») no es el
 * de un plato de macarrones («malo» = refinado, de pico rápido). No es un
 * juicio moral, es fisiología: distinta velocidad, distinta compañía de fibra.
 */
export type CalidadCarbo = 'bueno' | 'malo'

/**
 * Una corrección del usuario sobre un alimento del catálogo. Solo guarda los
 * campos que cambió: lo demás sigue viniendo de fábrica, y el catálogo puede
 * mejorar de versión en versión sin machacar sus correcciones.
 */
export interface EdicionAlimento {
  /** El id del alimento del catálogo (`src/data/alimentos.ts`). */
  id: string
  updatedAt?: number
  etiquetas?: EtiquetaComida[]
  carbosPor100?: number
  carbo?: CalidadCarbo
}

/**
 * Un alimento dentro de una comida: su nombre, su peso si se quiere apuntar, y
 * sus propias etiquetas. El peso va en gramos y es **peso**, no una cuenta de
 * energía: sirve para saber qué cantidad de qué, nada más.
 */
export interface AlimentoRegistrado {
  nombre: string
  gramos?: number
  /**
   * El alimento del catálogo del que salió, si salió de él. Con el enlace y
   * los gramos, la app cuenta los carbohidratos del día contra el margen de
   * cetosis (30–50 g) en vez de tratar cualquier carbohidrato como salida.
   */
  alimentoId?: string
  etiquetas?: EtiquetaComida[]
}

/** Una comida del día. Sin desayuno/comida/cena: comida 1, comida 2, las que sean. */
export interface ComidaRegistrada {
  /** «HH:MM». La hora es el dato central: crononutrición. */
  hora: string
  /** Qué fue, en texto libre o el nombre de un plato del recetario. */
  texto: string
  /** El plato del recetario del que vino, si vino de ahí: suma DHA y proteína solas. */
  mealId?: string
  /**
   * Los alimentos de la comida, cada uno con su peso y sus etiquetas. Una
   * comida puede seguir siendo solo `texto` —apuntar rápido vale más que
   * apuntar completo—; los alimentos son el detalle para quien lo quiera.
   */
  alimentos?: AlimentoRegistrado[]
  /** Etiquetas de la comida entera. Con alimentos, cada uno lleva las suyas. */
  etiquetas?: EtiquetaComida[]
}

/** Cuándo dio el sol: la franja decide cuánto UVB había. */
export type FranjaSolar = 'manana' | 'mediodia' | 'tarde'

/** Cuánta piel recibió: la superficie manda en la síntesis. */
export type PielExpuesta = 'cara_manos' | 'brazos_piernas' | 'torso'

/** Un rato de sol: minutos, franja y piel. Se pueden apuntar varios al día. */
export interface ExposicionSolar {
  minutos: number
  franja: FranjaSolar
  piel: PielExpuesta
}

/**
 * El sol de un día, con su marca para la fusión entre dispositivos.
 *
 * Dos maneras de apuntarlo, y la manual manda:
 *
 *  - **Manual**: minutos totales y las UI de vitamina D que diga la app que el
 *    usuario ya usa para calcularlas. Cifra exacta, sin estimar nada.
 *  - **Por ratos** (`exposiciones`): el detalle de franja y piel, del que la
 *    app estima un rango de UI. Queda para quien no traiga la cifra de fuera.
 */
export interface DiaDeSol {
  date: string
  updatedAt?: number
  /** Minutos totales al sol, apuntados a mano. Manda sobre las exposiciones. */
  minutos?: number
  /** UI de vitamina D del día, traídas de fuera. Cifra exacta, no estimación. */
  ui?: number
  exposiciones: ExposicionSolar[]
}

/** Las comidas de un día, con su marca para la fusión entre dispositivos. */
export interface DiaDeComidas {
  date: string
  updatedAt?: number
  comidas: ComidaRegistrada[]
}

export interface AppData {
  /** 1 = taxonomía de grupos gruesos. 2 = taxonomía muscular con conteo fraccional. */
  version: 1 | 2
  profile: Profile | null
  /** Cuándo se guardó el perfil. El perfil es uno solo y no se puede unir por
   * partes, así que en la fusión gana el más reciente. */
  profileUpdatedAt?: number
  checkIns: CheckIn[]
  sessions: Session[]
  measurements: BodyMeasurement[]
  /** El diario de comidas, día a día. Ausente hasta que se apunta la primera. */
  comidas?: DiaDeComidas[]
  /** El sol de cada día. Se apunta cuando ocurre, no en el test de la mañana. */
  sol?: DiaDeSol[]
  /** Las correcciones del usuario sobre alimentos del catálogo. */
  alimentosEditados?: EdicionAlimento[]
  /** Entrenos guardados para repetir. Ausente hasta que se guarda el primero. */
  routines?: Routine[]
  /**
   * Lo que se ha borrado, para que sincronizar no lo resucite. Ver
   * `src/domain/merge.ts`.
   */
  deleted?: Lapida[]
}
