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
  /**
   * Dónde vives, para calcular el arco del sol. Se mete una vez y de ahí sale
   * todo: el amanecer exacto, los seis umbrales y la duración del día, cambiando
   * solos cada día. Longitud con el **este positivo**: Madrid es −3,70.
   */
  lat?: number
  lon?: number
  /** Cómo se llama el sitio, solo para enseñarlo: «Madrid». */
  lugar?: string
  /** Metros sobre el nivel del mar. Suben el UV un 10 % por cada mil. */
  altitudM?: number
  /** Fototipo de Fitzpatrick. Decide cuánto sintetiza y cuánto tarda en quemarse. */
  fototipo?: import('./vitaminaD').Fototipo
  /** Lo último que se eligió al apuntar sol, para no volver a preguntarlo. */
  pielHabitual?: PielExpuesta
  cieloHabitual?: import('./cielo').EstadoDelCielo
  /** Qué días se trabaja, de 0 (domingo) a 6 (sábado). Por defecto, de lunes a viernes. */
  diasLaborables?: number[]
  /** El sitio de trabajo habitual, para que fichar sea un solo toque. */
  perfilLuzHabitualId?: string
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
  /** Bajo qué luz se entrenó, y si los descansos fueron a la calle. */
  entorno?: EntornoDeEntreno
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

/**
 * Bajo qué luz entrenaste.
 *
 * ## Por qué la app pregunta esto
 *
 * Porque una hora de entreno es una hora del día, y el día lo mide esta app
 * entero. Entrenar a las siete de la tarde en un sótano con fluorescentes y
 * entrenar a las siete de la tarde en un garaje con la persiana subida no son
 * el mismo día para tu reloj, aunque las series sean idénticas. Antes la app
 * contaba el entreno como un bloque de tiempo sin luz de ninguna clase, que es
 * como decir que ese rato no existió para el reloj.
 *
 * Se reutiliza el **perfil de luz** que ya existe para la jornada —temperatura,
 * lux, si hay ventana y qué filtro llevas— porque un gimnasio es un sitio
 * cerrado más, y describirlo dos veces de dos maneras habría sido pedirle al
 * usuario el mismo dato con otro nombre.
 */
export interface EntornoDeEntreno {
  /** El sitio, con su luz. El mismo `PerfilDeLuz` que usa el trabajo. */
  perfilLuzId?: string
  /**
   * Lámparas encendidas **iluminando la sala**, no aplicadas a una zona.
   *
   * Van aparte de las sesiones de fotobiomodulación a propósito: una lámpara
   * que ilumina un cuarto desde una distancia que nadie ha medido no entrega
   * una dosis que se pueda calcular, y fingir que sí la convertiría en julios
   * inventados. Se apuntan porque describen el ambiente, no porque sumen.
   */
  lamparasAmbiente?: string[]
  /** Si se entrenó al aire libre. Entonces todo el rato cuenta como calle. */
  fuera?: boolean
  /**
   * Si los descansos se pasaron fuera.
   *
   * Es lo que más cambia un entreno de interior: dos minutos entre series,
   * repetidos veinte veces, son media hora de calle que hasta ahora no contaba
   * en ninguna parte.
   */
  descansosFuera?: boolean
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
  /** Lo que pesa una unidad, para los que se cuentan por unidades. */
  gramosPorUnidad?: number
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
   * Las unidades, para lo que se cuenta por unidades —huevos, tortitas—. Los
   * `gramos` se rellenan igual a partir de aquí, así que todo lo que cuenta
   * por peso sigue funcionando sin enterarse.
   */
  unidades?: number
  /** Cómo se llama la unidad, para poder escribir «2 huevos». */
  unidad?: string
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
  /**
   * Las cápsulas tomadas en esta comida.
   *
   * Van aparte de `alimentos` a propósito: un suplemento no es un alimento, no
   * tiene gramos que apuntar, y mezclarlos impediría enseñar el ratio de omegas
   * con y sin él — que es justo la comparación que dice algo.
   */
  suplementos?: TomaDeSuplemento[]
}

/** Cuándo dio el sol: la franja decide cuánto UVB había. */
export type FranjaSolar = 'manana' | 'mediodia' | 'tarde'

/**
 * Cuánta piel recibió: la superficie manda en la síntesis.
 *
 * Los tres primeros son los de siempre y **no se renombran**: hay exposiciones
 * guardadas que los usan, y cambiarlos las dejaría sin leer. Los tres nuevos
 * completan la escala para que `f_piel` de la fórmula tenga con qué trabajar.
 */
export type PielExpuesta =
  | 'cara_manos'
  | 'antebrazos'
  | 'brazos_piernas'
  | 'torso'
  | 'banador'
  | 'entero'

/**
 * Un rato de sol.
 *
 * `franja` se conserva para los registros de antes de que la app supiera la
 * altura del sol; con `desde` se calcula con la elevación real, que es mucho
 * mejor. Ver `domain/vitaminaD.ts`.
 */
export interface ExposicionSolar {
  minutos: number
  franja: FranjaSolar
  piel: PielExpuesta
  /** Minutos desde medianoche en que empezó. Sin esto se usa la franja. */
  desde?: number
  /** Cómo se veía el sol: atenúa la síntesis. Ver `domain/cielo.ts`. */
  cielo?: import('./cielo').EstadoDelCielo
  /**
   * Identificador, cuando la exposición vino de fuera —del reloj, de un atajo—.
   *
   * Las exposiciones de siempre se añaden a la lista y no lo necesitan. Las que
   * llegan por el buzón sí: es lo que permite recoger dos veces sin acabar con
   * el mismo rato de sol apuntado dos veces. Ver `domain/buzon.ts`.
   */
  id?: string
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

/* ────────────────────────────────────────────────────────────────────────────
 * Luz: lámparas, sesiones, jornada y el sitio donde vives
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Una longitud de onda de una lámpara, con lo que entrega.
 *
 * La irradiancia va en mW/cm² **a la distancia de referencia** de la propia
 * lámpara, que es como vienen las hojas de datos. Sin ella no hay dosis que
 * calcular, así que se pide — y si el fabricante no la da, la app lo dirá en
 * vez de inventarse un número.
 */
export interface OndaLampara {
  /** Nanómetros. Cualquier valor de 280 a 3 000: ver `domain/luz.ts`. */
  nm: number
  /** mW/cm² a `distanciaRefCm`. */
  irradiancia: number
}

/** Una lámpara del usuario, con el nombre que él le haya puesto. */
export interface Lampara {
  id: string
  updatedAt?: number
  /** Libre: «Panel del salón», «Casco», «Lámpara 1». */
  nombre: string
  ondas: OndaLampara[]
  /** A qué distancia están medidas las irradiancias. Casi siempre 15 o 30 cm. */
  distanciaRefCm: number
}

/** Las zonas del cuerpo que se pueden iluminar. Sirven para no repetir la misma. */
export type ZonaPBM = 'cara' | 'cuello' | 'torso' | 'espalda' | 'abdomen' | 'piernas' | 'articulacion'

/** Una sesión de fotobiomodulación ya hecha. */
/**
 * Una lámpara puesta en una sesión, con la distancia a la que estuvo.
 *
 * La distancia va **por lámpara** y no por sesión porque es lo único que puede
 * ser: si tienes el panel grande a cuarenta centímetros y el pequeño apoyado en
 * la rodilla, no hay una «distancia de la sesión» que signifique nada. Y como
 * la irradiancia cae con el cuadrado, suponer una común multiplicaría o
 * dividiría la dosis por cuatro sin avisar.
 */
export interface LamparaEnSesion {
  lamparaId: string
  distanciaCm: number
}

export interface SesionPBM {
  id: string
  date: string
  updatedAt?: number
  /**
   * La primera lámpara, y la única cuando solo hubo una.
   *
   * Se conserva aunque exista `lamparas` porque hay sesiones guardadas que solo
   * tienen esto, y porque es lo que viaja por el buzón del reloj. Quien quiera
   * la lista completa usa `lamparasDe()`, que se encarga de las dos formas.
   */
  lamparaId: string
  /** Minutos desde la medianoche local en que se hizo. */
  hora?: number
  minutos: number
  /** A qué distancia real se puso, que casi nunca es la de referencia. */
  distanciaCm: number
  zona: ZonaPBM
  /**
   * Todas las lámparas cuando hubo **más de una a la vez**, la primera
   * incluida. Ausente cuando solo hubo una, para no repetir lo que ya está
   * arriba.
   */
  lamparas?: LamparaEnSesion[]
  /**
   * Los trozos de la sesión, cuando se encendió o se apagó alguna a mitad.
   *
   * Presente solo si hubo cambios: una sesión en la que las lámparas fueron
   * las mismas de principio a fin no lo lleva, porque `lamparas` ya lo dice
   * todo. Los minutos de los tramos suman `minutos`.
   */
  tramos?: TramoDeLamparas[]
}

/** Un trozo de sesión con las mismas lámparas encendidas. */
export interface TramoDeLamparas {
  /** Minutos desde medianoche en que empezó, si se sabe. */
  desde?: number
  minutos: number
  /** Las que estaban encendidas. Puede estar vacío: cambiar de una a otra. */
  lamparas: LamparaEnSesion[]
}

/**
 * Bajo qué luz estás cuando estás dentro.
 *
 * Existe porque no da igual, y hasta ahora ninguna app lo distinguía: gafas
 * ámbar con LED cálido, gafas ámbar con LED frío y sin gafas con LED frío son
 * tres días distintos para el reloj, y el usuario solo tiene que configurarlo
 * una vez.
 */
export type Filtro = 'ninguno' | 'ambar' | 'rojo'

export interface PerfilDeLuz {
  id: string
  updatedAt?: number
  nombre: string
  /** Kelvin. 2 700 es un LED cálido, 5 700 uno frío de taller. */
  temperaturaK: number
  /** Lux aproximados a la altura de los ojos. Un taller bien iluminado ronda 450. */
  lux: number
  /** Si entra luz natural por algún sitio. Cambia el cálculo por completo. */
  ventana: boolean
  filtro: Filtro
}

/**
 * Un fichaje: entrar o salir del sitio de trabajo.
 *
 * Se guarda la hora y **qué luz había**, no una referencia al perfil, porque el
 * perfil puede cambiar después y eso reescribiría el pasado.
 */
export interface Fichaje {
  id: string
  date: string
  updatedAt?: number
  /** Minutos desde medianoche local. */
  entrada: number
  /** Ausente mientras se sigue dentro. */
  salida?: number
  perfilLuzId?: string
  /** El perfil congelado tal y como estaba al fichar. */
  luz: Omit<PerfilDeLuz, 'id' | 'updatedAt'>
}

/** Un rato fuera, dentro de la jornada: el hueco del descanso. */
export interface SalidaAlExterior {
  id: string
  date: string
  updatedAt?: number
  /** Minutos desde medianoche local. */
  desde: number
  minutos: number
  /** Si llevaba puesto algún filtro, porque entonces cuenta distinto. */
  filtro: Filtro
  /**
   * La duración no se paró a mano: la cerró la app porque se olvidó.
   *
   * Se marca para poder decirlo. Un rato estimado y uno cronometrado valen
   * distinto, y presentarlos igual sería falsa precisión.
   */
  estimado?: boolean
  /**
   * Con qué botón se apuntó: sol, amanecer, atardecer o simplemente fuera.
   *
   * Los cuatro son el mismo rato fuera y así se siguen contando —el balance,
   * los relojes y la amplitud no se enteran de esto—. Está solo para poder
   * enseñar cada baldosa con su propio tiempo de hoy, y para que dentro de un
   * año se pueda saber cuántos amaneceres se cogieron de verdad.
   */
  tipo?: TipoEnCurso
}

/**
 * Un suplemento creado una vez para reutilizarlo siempre.
 *
 * **No es un alimento**, y por eso vive aparte del catálogo: se añade a una
 * comida como suplementación, cuenta para el ratio de omegas del día, y el
 * ratio se enseña con y sin él para que se vea de dónde viene cada cosa.
 */
export interface Suplemento {
  id: string
  updatedAt?: number
  nombre: string
  /** mg de DHA por cápsula. */
  dhaMg?: number
  /** mg de EPA por cápsula. */
  epaMg?: number
  /** mg de omega 6 por cápsula, si los trae. Casi ninguno. */
  omega6Mg?: number
}

/** Un suplemento tomado dentro de una comida concreta. */
export interface TomaDeSuplemento {
  suplementoId: string
  /** Cuántas cápsulas. Admite media. */
  capsulas: number
}

/**
 * La noche de un día: cuándo se apagó todo y cuándo se levantó uno.
 *
 * Es el dato que faltaba para que la oscuridad deje de ser una suposición. La
 * app lo pedía —«cuando apuntes a qué hora se apagó todo»— sin dar ninguna
 * forma de apuntarlo, que es la clase de agujero que hace que una pantalla
 * parezca completa y no lo esté.
 *
 * La fecha es la de **la mañana en que uno se levanta**, que es como se habla:
 * «anoche» dicho el miércoles es la noche que acabó el miércoles por la mañana.
 * Guardarla con la fecha del martes sería más exacto astronómicamente y
 * completamente contraintuitivo al apuntarla, que se hace por la mañana.
 *
 * Es además la noche que explica el peso de ese día, así que las dos lecturas
 * —la báscula y el balance— van con la misma fecha y no hay que traducir nada.
 */
export interface NocheRegistrada {
  date: string
  updatedAt?: number
  /** Minutos desde medianoche en que se apagó la última luz. */
  apagado: number
  /** Y en que se levantó, ya del día siguiente. */
  levantado: number
  /**
   * La puso la app al cerrar algo que se quedó abierto, no el usuario.
   *
   * Una noche inventada por un despiste no puede parecerse a una medida: se
   * enseña marcada y se dice de dónde salió.
   */
  estimado?: boolean
}

/**
 * Lo que se puede tener en marcha ahora mismo.
 *
 * `trabajo` no está en la lista a propósito: el fichaje ya sabía estar abierto
 * desde el principio, con su `salida?` sin rellenar, y meterlo aquí sería tener
 * dos formas de decir lo mismo.
 */
export type TipoEnCurso =
  | 'sol'
  | 'amanecer'
  | 'atardecer'
  | 'fuera'
  | 'lampara'
  | 'oscuridad'
  | 'frio'
  | 'grounding'

/**
 * Una actividad empezada y todavía sin parar.
 *
 * Hasta aquí, apuntar algo era decir cuánto había durado **después**. Con la
 * vitamina D dependiendo de la hora exacta y de la altura del sol eso ya no
 * vale: hace falta poder decir «estoy tomando el sol» y pararlo al entrar.
 *
 * El contexto se congela **al empezar**, no al parar: si sales a las ocho y
 * paras a las nueve, la piel que llevabas y el cielo que había son los de las
 * ocho, no los de ahora.
 */
export interface EnCurso {
  tipo: TipoEnCurso
  date: string
  /** Minutos desde la medianoche local en que empezó. */
  desde: number
  piel?: PielExpuesta
  /**
   * El cielo con el que se empezó. Se conserva para lo ya guardado y para lo
   * que no cambie en toda la sesión; cuando cambia, manda `tramosDeCielo`.
   */
  cielo?: import('./cielo').EstadoDelCielo
  /**
   * Cómo ha ido cambiando el cielo durante la sesión.
   *
   * El sol no se está quieto: empiezas con el cielo cubierto, a los cinco
   * minutos se despeja y el resto del rato es sol limpio. Guardar un único
   * estado obligaba a elegir cuál de los dos mentir.
   *
   * Cada tramo vale desde su `desde` hasta el del siguiente, y el último hasta
   * que se para. Al parar, cada tramo se guarda como **su propia exposición**,
   * con su cielo y sus minutos.
   */
  tramosDeCielo?: { desde: number; cielo: import('./cielo').EstadoDelCielo }[]
  filtro?: Filtro
  lamparaId?: string
  distanciaCm?: number
  zona?: ZonaPBM
  /** Las lámparas puestas a la vez, cuando hay más de una. */
  lamparas?: LamparaEnSesion[]
  /**
   * Los cambios de lámpara mientras la sesión corre.
   *
   * Mismo mecanismo que `tramosDeCielo`, y por la misma razón: apagar una y
   * encender otra a mitad no reescribe lo que llevabas, abre un trozo nuevo.
   */
  tramosDeLamparas?: { desde: number; lamparas: LamparaEnSesion[] }[]
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
  /** Las lámparas del usuario. Ausente hasta que crea la primera. */
  lamparas?: Lampara[]
  /** Las sesiones de fotobiomodulación hechas. */
  sesionesPBM?: SesionPBM[]
  /** Los sitios con su iluminación: el taller, la oficina, casa. */
  perfilesLuz?: PerfilDeLuz[]
  /** Los fichajes, día a día. */
  fichajes?: Fichaje[]
  /** Los ratos fuera durante la jornada. */
  salidas?: SalidaAlExterior[]
  /** Los suplementos creados, para reutilizarlos en cualquier comida. */
  suplementos?: Suplemento[]
  /** Las noches apuntadas: a qué hora se apagó todo y a qué hora se levantó. */
  noches?: NocheRegistrada[]
  /** Las analíticas apuntadas, con sus índices calculados al vuelo. */
  analiticas?: import('./analiticas').Analitica[]
  /** Los hábitos hechos, día a día: grounding, frío, ayuno. */
  habitos?: import('./habitos').RegistroHabito[]
  /**
   * Lo que está en marcha ahora mismo. Varios a la vez, porque se solapan de
   * verdad: estás fichado en el taller **y** sales quince minutos al patio.
   */
  enCurso?: EnCurso[]
  /**
   * Lo que se ha borrado, para que sincronizar no lo resucite. Ver
   * `src/domain/merge.ts`.
   */
  deleted?: Lapida[]
}
