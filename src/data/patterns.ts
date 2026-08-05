/**
 * Patrones de movimiento y avisos de técnica.
 *
 * El catálogo entero se reduce a un puñado de patrones: sentadilla, bisagra de
 * cadera, empujar, traccionar, sostener. Animar el patrón —y no cada ejercicio—
 * es lo que hace viable tener una referencia visual para todos sin depender de
 * vídeos externos ni de conexión.
 *
 * Las animaciones son esquemáticas a propósito: resuelven la duda de «¿en qué
 * dirección va esto y qué se mueve?», no sustituyen a que alguien te mire.
 */

export type MovementPattern =
  | 'sentadilla'
  | 'zancada'
  | 'bisagra'
  | 'puente'
  | 'curl_femoral'
  | 'traccion_vertical'
  | 'traccion_horizontal'
  | 'empuje_horizontal'
  | 'empuje_vertical'
  | 'extension_espalda'
  | 'flexion_codo'
  | 'extension_codo'
  | 'isometrico'
  | 'core_dinamico'
  | 'fondo'
  | 'extension_tobillo'
  | 'cardio'

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  sentadilla: 'Sentadilla',
  zancada: 'Zancada',
  bisagra: 'Bisagra de cadera',
  puente: 'Puente de cadera',
  curl_femoral: 'Curl femoral',
  traccion_vertical: 'Tracción vertical',
  traccion_horizontal: 'Tracción horizontal',
  empuje_horizontal: 'Empuje horizontal',
  empuje_vertical: 'Empuje vertical',
  extension_espalda: 'Extensión de espalda',
  flexion_codo: 'Flexión de codo',
  extension_codo: 'Extensión de codo',
  isometrico: 'Sostén isométrico',
  core_dinamico: 'Core dinámico',
  fondo: 'Fondo en paralelas',
  extension_tobillo: 'Extensión de tobillo',
  cardio: 'Cardio'
}

/** Avisos que valen para todo el patrón. */
export const PATTERN_CUES: Record<MovementPattern, string[]> = {
  sentadilla: [
    'Rodillas hacia donde apuntan los pies, sin dejarlas caer hacia dentro.',
    'Baja hasta donde puedas mantener la espalda recta, ni un dedo más.',
    'Peso repartido en todo el pie, no solo en la punta.'
  ],
  zancada: [
    'El tronco vertical: no te inclines hacia delante.',
    'La rodilla de atrás baja hacia el suelo sin llegar a golpearlo.',
    'Da el paso lo bastante largo como para que la rodilla de delante no se adelante al pie.'
  ],
  bisagra: [
    'El movimiento nace en la cadera, que va hacia atrás; no es una sentadilla.',
    'Espalda recta de principio a fin: si se redondea, has bajado de más.',
    'Nota el estiramiento detrás del muslo; ahí es donde tiene que trabajar.'
  ],
  puente: [
    'Empuja con los talones y aprieta el glúteo arriba.',
    'No arquees la zona lumbar para subir más: sube la cadera, no la espalda.',
    'Un segundo de pausa arriba vale más que subir rápido.'
  ],
  curl_femoral: [
    'Cadera quieta: solo se mueve la rodilla.',
    'Baja despacio, que es donde está casi todo el trabajo.',
    'Sin tirones ni impulso.'
  ],
  traccion_vertical: [
    'Empieza bajando los hombros antes de doblar los codos.',
    'Lleva los codos hacia las costillas, no hacia atrás.',
    'Baja controlando; soltarse de golpe es donde se hacen daño los hombros.'
  ],
  traccion_horizontal: [
    'Tira con el codo, no con la mano: la mano solo sujeta.',
    'Junta ligeramente los omóplatos al final del recorrido.',
    'El tronco quieto: si te balanceas para tirar, baja el peso.'
  ],
  empuje_horizontal: [
    'Codos a unos 45° del cuerpo, no abiertos en cruz.',
    'Baja controlado hasta notar estiramiento en el pecho.',
    'Muñecas alineadas con el antebrazo, sin doblarse hacia atrás.'
  ],
  empuje_vertical: [
    'Aprieta glúteo y abdomen para no arquear la lumbar.',
    'Sube en línea sobre la cabeza, no por delante de la cara.',
    'No bloquees el codo de golpe al final.'
  ],
  extension_espalda: [
    'Levanta poco: es un movimiento corto, no un arco.',
    'Mira al suelo para no forzar el cuello.',
    'Aguanta un segundo arriba y baja despacio.'
  ],
  flexion_codo: [
    'Codos pegados al cuerpo y quietos.',
    'Sin balancear el tronco para subir el peso.',
    'Baja controlando hasta estirar del todo.'
  ],
  extension_codo: [
    'Solo se mueve el antebrazo; el codo se queda donde está.',
    'Estira sin llegar a bloquear con tirón.',
    'Si duele el codo, reduce el recorrido o el peso.'
  ],
  isometrico: [
    'Cuerpo en línea recta: ni cadera caída ni culo en alto.',
    'Aprieta abdomen y glúteo y respira con normalidad.',
    'Mejor menos tiempo bien puesto que aguantar deformado.'
  ],
  core_dinamico: [
    'La zona lumbar pegada al suelo durante todo el movimiento.',
    'Ve despacio: la velocidad aquí solo quita trabajo.',
    'Si la espalda se despega, reduce el recorrido.'
  ],
  // Los fondos estaban catalogados como «extensión de codo», cuyo aviso dice que
  // el codo se queda quieto. En un fondo se mueve el cuerpo entero, así que el
  // aviso era exactamente al revés de lo que hay que hacer.
  fondo: [
    'Baja hasta que el brazo quede en ángulo recto, ni un dedo más: por debajo el hombro paga.',
    'Inclínate hacia delante para cargar el pecho, o mantente vertical para cargar el tríceps.',
    'Hombros lejos de las orejas todo el rato; si se te suben, ya has bajado de más.'
  ],
  extension_tobillo: [
    'Sube hasta lo más alto que puedas y baja hasta notar el estiramiento: el recorrido corto es lo que hace que no sirva de nada.',
    'Baja despacio, contando dos segundos; nada de rebotar con el tendón.',
    'De pie trabaja el gemelo; sentado, con la rodilla doblada, el sóleo. No son el mismo ejercicio.'
  ],
  cardio: [
    'Ritmo en el que puedas mantener una conversación.',
    'Si no puedes hablar, estás yendo demasiado rápido para el objetivo de hoy.',
    'Mejor constante y cómodo que a tirones.'
  ]
}

/** Cada ejercicio del catálogo a su patrón. Un test comprueba que no falta ninguno. */
export const EXERCISE_PATTERNS: Record<string, MovementPattern> = {
  // Sentadilla
  sentadilla_corporal: 'sentadilla',
  sentadilla_goblet: 'sentadilla',
  sentadilla_barra: 'sentadilla',
  prensa: 'sentadilla',
  subida_cajon: 'sentadilla',
  sentadilla_pared: 'sentadilla',
  sentadilla_bulgara: 'zancada',
  extension_cuadriceps: 'curl_femoral',
  zancadas: 'zancada',
  sentadilla_frontal: 'sentadilla',
  sentadilla_sumo: 'sentadilla',
  sentadilla_cosaco: 'sentadilla',
  pistol_asistida: 'sentadilla',
  prensa_una_pierna: 'sentadilla',
  zancada_atras: 'zancada',
  zancada_caminando: 'zancada',
  split_estatico: 'zancada',
  paso_lateral_banda: 'zancada',

  // Cadena posterior
  puente_gluteo: 'puente',
  puente_femoral: 'puente',
  puente_una_pierna: 'puente',
  curl_femoral: 'curl_femoral',
  curl_femoral_banda: 'curl_femoral',
  curl_nordico_asistido: 'curl_femoral',
  peso_muerto_mancuernas: 'bisagra',
  peso_muerto_rumano: 'bisagra',
  buenos_dias: 'bisagra',
  swing_kettlebell: 'bisagra',
  hip_thrust: 'puente',
  extension_cadera_polea: 'puente',
  curl_femoral_deslizante: 'curl_femoral',
  peso_muerto_una_pierna: 'bisagra',
  peso_muerto_deficit: 'bisagra',

  // Espalda
  dominadas: 'traccion_vertical',
  jalon_polea: 'traccion_vertical',
  remo_mancuerna: 'traccion_horizontal',
  remo_barra: 'traccion_horizontal',
  remo_maquina: 'traccion_horizontal',
  remo_banda: 'traccion_horizontal',
  face_pull: 'traccion_horizontal',
  superman: 'extension_espalda',
  ytw_prono: 'extension_espalda',
  remo_invertido: 'traccion_horizontal',
  pajaros: 'extension_espalda',
  jalon_neutro: 'traccion_vertical',
  dominadas_supinas: 'traccion_vertical',
  dominadas_negativas: 'traccion_vertical',
  pullover_mancuerna: 'traccion_vertical',
  remo_polea_sentado: 'traccion_horizontal',
  encogimientos: 'traccion_horizontal',
  hiperextensiones: 'extension_espalda',

  // Pecho y hombro
  flexiones: 'empuje_horizontal',
  flexiones_inclinadas: 'empuje_horizontal',
  flexiones_rodillas: 'empuje_horizontal',
  flexiones_amplias: 'empuje_horizontal',
  press_banca_mancuernas: 'empuje_horizontal',
  press_banca_barra: 'empuje_horizontal',
  press_maquina: 'empuje_horizontal',
  aperturas_mancuernas: 'empuje_horizontal',
  press_militar_mancuernas: 'empuje_vertical',
  press_militar_barra: 'empuje_vertical',
  pike_pushup: 'empuje_vertical',
  plancha_toque_hombro: 'isometrico',
  elevaciones_laterales: 'empuje_vertical',
  press_inclinado_mancuernas: 'empuje_horizontal',
  aperturas_polea: 'empuje_horizontal',
  press_banda_pecho: 'empuje_horizontal',
  flexiones_declinadas: 'empuje_horizontal',
  flexiones_arquero: 'empuje_horizontal',
  press_arnold: 'empuje_vertical',
  press_hombro_multipower: 'empuje_vertical',
  flexion_pino_pared: 'empuje_vertical',
  elevaciones_frontales: 'empuje_vertical',
  remo_menton: 'traccion_horizontal',
  rotacion_externa: 'traccion_horizontal',

  // Brazo
  curl_biceps: 'flexion_codo',
  curl_martillo: 'flexion_codo',
  extension_triceps: 'extension_codo',
  fondos_banco: 'fondo',
  flexiones_diamante: 'extension_codo',
  fondos_entre_sillas: 'fondo',
  curl_concentrado: 'flexion_codo',
  curl_inverso: 'flexion_codo',
  extension_triceps_polea_baja: 'extension_codo',
  press_frances: 'extension_codo',
  patada_triceps: 'extension_codo',

  // Core
  plancha: 'isometrico',
  plancha_lateral: 'isometrico',
  pallof_press: 'isometrico',
  dead_bug: 'core_dinamico',
  bird_dog: 'core_dinamico',
  elevacion_piernas: 'core_dinamico',
  hollow_hold: 'isometrico',
  plancha_dinamica: 'isometrico',
  crunch_bicicleta: 'core_dinamico',
  russian_twist: 'core_dinamico',
  escalador: 'core_dinamico',
  rodillas_colgado: 'core_dinamico',

  // Tobillo
  elevacion_talones_pie: 'extension_tobillo',
  elevacion_talones_una_pierna: 'extension_tobillo',
  elevacion_talones_sentado: 'extension_tobillo',
  elevacion_talones_prensa: 'extension_tobillo',
  elevacion_talones_escalon: 'extension_tobillo',
  elevacion_talones_multipower: 'extension_tobillo',
  elevacion_talones_banda: 'extension_tobillo',

  // Añadidos para cubrir músculos que se quedaban sin trabajo directo
  curl_muneca: 'flexion_codo',
  paseo_granjero: 'isometrico',
  elevacion_lateral_inclinado: 'empuje_vertical',
  aduccion_cadera_banda: 'zancada',

  // Ampliación del catálogo: pullover en polea, abdominales en polea, rueda
  // abdominal y demás huecos que el usuario echaba en falta.
  abduccion_cadera_polea: 'zancada',
  sentadilla_hack: 'sentadilla',
  patada_gluteo_polea: 'puente',
  peso_muerto_convencional: 'bisagra',
  curl_femoral_sentado: 'curl_femoral',
  elevacion_talones_burro: 'extension_tobillo',
  pullover_polea: 'traccion_vertical',
  remo_pendlay: 'traccion_horizontal',
  remo_t: 'traccion_horizontal',
  dominadas_agarre_ancho: 'traccion_vertical',
  encogimientos_polea: 'traccion_horizontal',
  hiperextension_reversa: 'extension_espalda',
  press_inclinado_barra: 'empuje_horizontal',
  press_declinado_mancuernas: 'empuje_horizontal',
  aperturas_inclinadas: 'empuje_horizontal',
  contractor_pecho: 'empuje_horizontal',
  fondos_paralelas: 'fondo',
  fondos_paralelas_triceps: 'fondo',
  pajaro_maquina: 'extension_espalda',
  press_militar_sentado: 'empuje_vertical',
  curl_predicador: 'flexion_codo',
  press_cerrado: 'empuje_horizontal',
  curl_muneca_inverso: 'flexion_codo',
  agarre_disco: 'isometrico',
  crunch_polea: 'core_dinamico',
  rueda_abdominal: 'core_dinamico',
  piernas_colgado: 'core_dinamico',
  crunch_abdominal: 'core_dinamico',
  crunch_inverso: 'core_dinamico',
  lenador_polea: 'core_dinamico',
  plancha_lastrada: 'isometrico',

  // Cardio
  caminar: 'cardio',
  trote_suave: 'cardio',
  bici_suave: 'cardio',
  bici_media: 'cardio',
  movilidad: 'cardio',
  caminar_cuesta: 'cardio',
  subir_escaleras: 'cardio',
  comba: 'cardio',
  remo_ergometro: 'cardio'
}

export function patternOf(exerciseId: string): MovementPattern | undefined {
  return EXERCISE_PATTERNS[exerciseId]
}

export function cuesFor(exerciseId: string): string[] {
  const p = patternOf(exerciseId)
  return p ? PATTERN_CUES[p] : []
}
