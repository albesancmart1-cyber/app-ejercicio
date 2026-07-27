import type { Exercise } from '../domain/types'

// Catálogo de ejercicios. loadFactor ≈ fracción del peso máximo disponible
// con la que sugerir la primera sesión (progresión conservadora).
//
// La lista es deliberadamente larga: al cambiar un ejercicio que no encaja hay
// que tener a dónde ir, y con pocas opciones por grupo la sustitución acababa
// alternando siempre entre los dos mismos. Que sea larga no la hace pesada de
// usar: la app propone sola, y de todo esto se priorizan los marcados como
// favoritos en el perfil.
//
// `unilateralOption` marca los que cambian de verdad según se hagan a un lado o
// a dos, para que la app pregunte y la progresión no mezcle cargas distintas.
export const EXERCISES: Exercise[] = [
  // ── Pierna: cuádriceps y glúteo ─────────────────────────────
  { id: 'sentadilla_corporal', name: 'Sentadilla con peso corporal', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'sentadilla_goblet', name: 'Sentadilla goblet', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['mancuernas', 'kettlebell'], stress: 'medio', loadFactor: 0.5 },
  { id: 'sentadilla_barra', name: 'Sentadilla con barra', primary: 'cuadriceps_gluteo', secondary: ['core', 'femoral'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.45 },
  { id: 'zancadas', name: 'Zancadas', primary: 'cuadriceps_gluteo', secondary: ['femoral', 'core'], equipment: ['peso_corporal', 'mancuernas'], stress: 'medio', loadFactor: 0.3 },
  { id: 'prensa', name: 'Prensa de piernas', primary: 'cuadriceps_gluteo', secondary: ['femoral'], equipment: ['maquina_prensa'], stress: 'medio', loadFactor: 0.5 },
  { id: 'subida_cajon', name: 'Subidas al cajón o banco', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['banco'], stress: 'bajo', bodyweightOnly: true },
  { id: 'sentadilla_pared', name: 'Sentadilla isométrica en pared', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'sentadilla_bulgara', name: 'Sentadilla búlgara', primary: 'cuadriceps_gluteo', secondary: ['femoral', 'core'], equipment: ['banco'], stress: 'medio', loadFactor: 0.3 },
  { id: 'extension_cuadriceps', name: 'Extensión de cuádriceps en máquina', primary: 'cuadriceps_gluteo', secondary: [], equipment: ['maquina_extension'], stress: 'bajo', loadFactor: 0.4, unilateralOption: true },
  { id: 'puente_gluteo', name: 'Puente de glúteo', primary: 'cuadriceps_gluteo', secondary: ['femoral', 'core'], equipment: ['peso_corporal', 'barra'], stress: 'bajo', loadFactor: 0.4 },
  { id: 'sentadilla_frontal', name: 'Sentadilla frontal con barra', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.35 },
  { id: 'sentadilla_sumo', name: 'Sentadilla sumo', primary: 'cuadriceps_gluteo', secondary: ['femoral'], equipment: ['mancuernas', 'kettlebell'], stress: 'medio', loadFactor: 0.5 },
  { id: 'zancada_atras', name: 'Zancada hacia atrás', primary: 'cuadriceps_gluteo', secondary: ['femoral', 'core'], equipment: ['peso_corporal', 'mancuernas'], stress: 'medio', loadFactor: 0.3 },
  { id: 'zancada_caminando', name: 'Zancadas caminando', primary: 'cuadriceps_gluteo', secondary: ['femoral', 'core'], equipment: ['peso_corporal', 'mancuernas'], stress: 'medio', loadFactor: 0.3 },
  { id: 'split_estatico', name: 'Sentadilla split estática', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['peso_corporal', 'mancuernas'], stress: 'medio', loadFactor: 0.3 },
  { id: 'sentadilla_cosaco', name: 'Sentadilla cosaca (lateral)', primary: 'cuadriceps_gluteo', secondary: ['femoral'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'pistol_asistida', name: 'Sentadilla a una pierna asistida', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'prensa_una_pierna', name: 'Prensa a una pierna', primary: 'cuadriceps_gluteo', secondary: ['femoral'], equipment: ['maquina_prensa'], stress: 'medio', loadFactor: 0.3 },
  { id: 'paso_lateral_banda', name: 'Pasos laterales con banda', primary: 'cuadriceps_gluteo', secondary: [], equipment: ['bandas'], stress: 'bajo', bodyweightOnly: true },

  // ── Femoral ────────────────────────────────────────────────
  { id: 'puente_femoral', name: 'Puente de glúteo con talones elevados', primary: 'femoral', secondary: ['cuadriceps_gluteo', 'core'], equipment: ['peso_corporal', 'banco'], stress: 'bajo', bodyweightOnly: true },
  { id: 'puente_una_pierna', name: 'Puente de glúteo a una pierna', primary: 'femoral', secondary: ['cuadriceps_gluteo', 'core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'curl_femoral_banda', name: 'Curl femoral tumbado con banda', primary: 'femoral', secondary: [], equipment: ['bandas'], stress: 'bajo', loadFactor: 0.2 },
  { id: 'peso_muerto_mancuernas', name: 'Peso muerto rumano con mancuernas', primary: 'femoral', secondary: ['espalda', 'cuadriceps_gluteo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.5 },
  { id: 'peso_muerto_rumano', name: 'Peso muerto rumano con barra', primary: 'femoral', secondary: ['espalda', 'cuadriceps_gluteo'], equipment: ['barra', 'kettlebell'], stress: 'alto', loadFactor: 0.45 },
  { id: 'curl_femoral', name: 'Curl femoral en máquina', primary: 'femoral', secondary: [], equipment: ['maquina_femoral'], stress: 'bajo', loadFactor: 0.5, unilateralOption: true },
  { id: 'peso_muerto_una_pierna', name: 'Peso muerto a una pierna', primary: 'femoral', secondary: ['cuadriceps_gluteo', 'core'], equipment: ['peso_corporal', 'mancuernas', 'kettlebell'], stress: 'medio', loadFactor: 0.3 },
  { id: 'hip_thrust', name: 'Hip thrust apoyado en banco', primary: 'femoral', secondary: ['cuadriceps_gluteo'], equipment: ['banco', 'barra'], stress: 'medio', loadFactor: 0.6 },
  { id: 'curl_femoral_deslizante', name: 'Curl femoral deslizando los talones', primary: 'femoral', secondary: ['core'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'extension_cadera_polea', name: 'Extensión de cadera en polea', primary: 'femoral', secondary: ['cuadriceps_gluteo'], equipment: ['polea'], stress: 'bajo', loadFactor: 0.3, unilateralOption: true },
  { id: 'peso_muerto_deficit', name: 'Peso muerto rumano desde déficit', primary: 'femoral', secondary: ['espalda', 'cuadriceps_gluteo'], equipment: ['mancuernas', 'barra'], stress: 'alto', loadFactor: 0.4 },
  { id: 'buenos_dias', name: 'Buenos días con banda o barra', primary: 'femoral', secondary: ['espalda'], equipment: ['bandas', 'barra'], stress: 'medio', loadFactor: 0.25 },
  { id: 'curl_nordico_asistido', name: 'Curl nórdico asistido', primary: 'femoral', secondary: ['core'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'swing_kettlebell', name: 'Swing con kettlebell', primary: 'femoral', secondary: ['cuadriceps_gluteo', 'core', 'cardio'], equipment: ['kettlebell'], stress: 'medio', loadFactor: 0.6 },

  // ── Espalda ────────────────────────────────────────────────
  { id: 'dominadas', name: 'Dominadas (o asistidas)', primary: 'espalda', secondary: ['brazo', 'core'], equipment: ['dominadas_barra'], stress: 'medio', bodyweightOnly: true },
  { id: 'remo_mancuerna', name: 'Remo con mancuerna a una mano', primary: 'espalda', secondary: ['brazo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.5 },
  { id: 'remo_barra', name: 'Remo con barra', primary: 'espalda', secondary: ['brazo', 'core'], equipment: ['barra'], stress: 'alto', loadFactor: 0.4 },
  { id: 'remo_maquina', name: 'Remo en máquina', primary: 'espalda', secondary: ['brazo'], equipment: ['maquina_remo', 'polea'], stress: 'bajo', loadFactor: 0.5, unilateralOption: true },
  { id: 'jalon_polea', name: 'Jalón al pecho en polea', primary: 'espalda', secondary: ['brazo'], equipment: ['polea'], stress: 'bajo', loadFactor: 0.45, unilateralOption: true },
  { id: 'jalon_neutro', name: 'Jalón con agarre neutro', primary: 'espalda', secondary: ['brazo'], equipment: ['polea'], stress: 'bajo', loadFactor: 0.45, unilateralOption: true },
  { id: 'dominadas_supinas', name: 'Dominadas supinas (agarre invertido)', primary: 'espalda', secondary: ['brazo', 'core'], equipment: ['dominadas_barra'], stress: 'medio', bodyweightOnly: true },
  { id: 'dominadas_negativas', name: 'Dominadas negativas (solo la bajada)', primary: 'espalda', secondary: ['brazo'], equipment: ['dominadas_barra'], stress: 'medio', bodyweightOnly: true },
  { id: 'pullover_mancuerna', name: 'Pullover con mancuerna', primary: 'espalda', secondary: ['pecho'], equipment: ['mancuernas'], stress: 'bajo', loadFactor: 0.3 },
  { id: 'remo_polea_sentado', name: 'Remo sentado en polea', primary: 'espalda', secondary: ['brazo'], equipment: ['polea'], stress: 'bajo', loadFactor: 0.5, unilateralOption: true },
  { id: 'encogimientos', name: 'Encogimientos de hombros (trapecio)', primary: 'espalda', secondary: ['hombro'], equipment: ['mancuernas', 'barra'], stress: 'bajo', loadFactor: 0.6 },
  { id: 'hiperextensiones', name: 'Hiperextensiones en banco', primary: 'espalda', secondary: ['femoral'], equipment: ['banco'], stress: 'bajo', bodyweightOnly: true },
  { id: 'remo_banda', name: 'Remo con banda elástica', primary: 'espalda', secondary: ['brazo'], equipment: ['bandas'], stress: 'bajo', bodyweightOnly: true },
  { id: 'remo_invertido', name: 'Remo invertido bajo una barra', primary: 'espalda', secondary: ['brazo', 'core'], equipment: ['dominadas_barra', 'multipower'], stress: 'medio', bodyweightOnly: true },
  { id: 'ytw_prono', name: 'Elevaciones Y-T-W tumbado boca abajo', primary: 'espalda', secondary: ['hombro'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'superman', name: 'Superman (extensión lumbar)', primary: 'espalda', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },

  // ── Pecho ──────────────────────────────────────────────────
  { id: 'flexiones', name: 'Flexiones', primary: 'pecho', secondary: ['hombro', 'brazo', 'core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'flexiones_rodillas', name: 'Flexiones con rodillas apoyadas', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'flexiones_amplias', name: 'Flexiones con manos abiertas', primary: 'pecho', secondary: ['hombro'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'press_banca_mancuernas', name: 'Press de banca con mancuernas', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.45, unilateralOption: true },
  { id: 'press_inclinado_mancuernas', name: 'Press inclinado con mancuernas', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.4, unilateralOption: true },
  { id: 'aperturas_polea', name: 'Cruces en polea', primary: 'pecho', secondary: ['hombro'], equipment: ['polea'], stress: 'bajo', loadFactor: 0.25, unilateralOption: true },
  { id: 'press_banda_pecho', name: 'Press de pecho con banda', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['bandas'], stress: 'bajo', loadFactor: 0.3, unilateralOption: true },
  { id: 'flexiones_declinadas', name: 'Flexiones con los pies elevados', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['banco'], stress: 'medio', bodyweightOnly: true },
  { id: 'flexiones_arquero', name: 'Flexiones arquero', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'press_banca_barra', name: 'Press de banca con barra', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.45 },
  { id: 'press_maquina', name: 'Press de pecho en máquina', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['maquina_pecho'], stress: 'bajo', loadFactor: 0.5, unilateralOption: true },
  { id: 'aperturas_mancuernas', name: 'Aperturas con mancuernas', primary: 'pecho', secondary: ['hombro'], equipment: ['mancuernas'], stress: 'bajo', loadFactor: 0.25 },
  { id: 'flexiones_inclinadas', name: 'Flexiones inclinadas en banco', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['banco'], stress: 'bajo', bodyweightOnly: true },

  // ── Hombro ─────────────────────────────────────────────────
  { id: 'press_militar_mancuernas', name: 'Press militar con mancuernas', primary: 'hombro', secondary: ['brazo', 'core'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.35, unilateralOption: true },
  { id: 'press_militar_barra', name: 'Press militar con barra', primary: 'hombro', secondary: ['brazo', 'core'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.3 },
  { id: 'elevaciones_laterales', name: 'Elevaciones laterales', primary: 'hombro', secondary: [], equipment: ['mancuernas', 'bandas', 'polea'], stress: 'bajo', loadFactor: 0.15, unilateralOption: true },
  { id: 'pajaros', name: 'Pájaros (deltoide posterior)', primary: 'hombro', secondary: ['espalda'], equipment: ['mancuernas', 'bandas', 'polea'], stress: 'bajo', loadFactor: 0.15, unilateralOption: true },
  { id: 'press_arnold', name: 'Press Arnold', primary: 'hombro', secondary: ['brazo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.3, unilateralOption: true },
  { id: 'elevaciones_frontales', name: 'Elevaciones frontales', primary: 'hombro', secondary: [], equipment: ['mancuernas', 'bandas', 'polea'], stress: 'bajo', loadFactor: 0.15, unilateralOption: true },
  { id: 'remo_menton', name: 'Remo al mentón', primary: 'hombro', secondary: ['espalda', 'brazo'], equipment: ['mancuernas', 'barra', 'bandas'], stress: 'medio', loadFactor: 0.25 },
  { id: 'rotacion_externa', name: 'Rotación externa de hombro con banda', primary: 'hombro', secondary: [], equipment: ['bandas', 'polea'], stress: 'bajo', loadFactor: 0.1, unilateralOption: true },
  { id: 'press_hombro_multipower', name: 'Press de hombro en multipower', primary: 'hombro', secondary: ['brazo'], equipment: ['multipower'], stress: 'medio', loadFactor: 0.3 },
  { id: 'flexion_pino_pared', name: 'Flexión en pino contra la pared', primary: 'hombro', secondary: ['brazo', 'core'], equipment: ['peso_corporal'], stress: 'alto', bodyweightOnly: true },
  { id: 'face_pull', name: 'Face pull en polea o banda', primary: 'hombro', secondary: ['espalda'], equipment: ['polea', 'bandas'], stress: 'bajo', loadFactor: 0.25 },
  { id: 'plancha_toque_hombro', name: 'Plancha con toque de hombro', primary: 'hombro', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'pike_pushup', name: 'Flexión pica (hombro)', primary: 'hombro', secondary: ['brazo', 'core'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },

  // ── Brazo ──────────────────────────────────────────────────
  { id: 'curl_biceps', name: 'Curl de bíceps', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'barra', 'bandas', 'polea'], stress: 'bajo', loadFactor: 0.3, unilateralOption: true },
  { id: 'extension_triceps', name: 'Extensión de tríceps sobre cabeza', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'polea', 'bandas'], stress: 'bajo', loadFactor: 0.25, unilateralOption: true },
  { id: 'extension_triceps_polea_baja', name: 'Extensión de tríceps en polea alta', primary: 'brazo', secondary: [], equipment: ['polea', 'bandas'], stress: 'bajo', loadFactor: 0.3, unilateralOption: true },
  { id: 'press_frances', name: 'Press francés', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'barra'], stress: 'bajo', loadFactor: 0.25 },
  { id: 'patada_triceps', name: 'Patada de tríceps', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'bandas', 'polea'], stress: 'bajo', loadFactor: 0.15, unilateralOption: true },
  { id: 'curl_concentrado', name: 'Curl concentrado', primary: 'brazo', secondary: [], equipment: ['mancuernas'], stress: 'bajo', loadFactor: 0.25 },
  { id: 'curl_inverso', name: 'Curl inverso (antebrazo)', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'barra', 'bandas'], stress: 'bajo', loadFactor: 0.2, unilateralOption: true },
  { id: 'fondos_banco', name: 'Fondos de tríceps en banco', primary: 'brazo', secondary: ['pecho', 'hombro'], equipment: ['banco'], stress: 'bajo', bodyweightOnly: true },
  { id: 'flexiones_diamante', name: 'Flexiones diamante (tríceps)', primary: 'brazo', secondary: ['pecho', 'hombro'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'fondos_entre_sillas', name: 'Fondos de tríceps entre dos sillas', primary: 'brazo', secondary: ['pecho', 'hombro'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'curl_martillo', name: 'Curl martillo', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'bandas'], stress: 'bajo', loadFactor: 0.3, unilateralOption: true },

  // ── Core ───────────────────────────────────────────────────
  { id: 'plancha', name: 'Plancha', primary: 'core', secondary: ['hombro'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'plancha_lateral', name: 'Plancha lateral', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'dead_bug', name: 'Dead bug', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'bird_dog', name: 'Bird dog', primary: 'core', secondary: ['espalda'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'elevacion_piernas', name: 'Elevación de piernas tumbado', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'pallof_press', name: 'Press Pallof con banda', primary: 'core', secondary: ['hombro'], equipment: ['bandas', 'polea'], stress: 'bajo', loadFactor: 0.2, unilateralOption: true },
  { id: 'hollow_hold', name: 'Hollow hold', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'crunch_bicicleta', name: 'Crunch bicicleta', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'plancha_dinamica', name: 'Plancha subiendo y bajando a las manos', primary: 'core', secondary: ['hombro', 'brazo'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'russian_twist', name: 'Giros rusos sentado', primary: 'core', secondary: [], equipment: ['peso_corporal', 'mancuernas', 'kettlebell'], stress: 'bajo', loadFactor: 0.15 },
  { id: 'escalador', name: 'Escalador (mountain climbers)', primary: 'core', secondary: ['hombro', 'cardio'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'rodillas_colgado', name: 'Elevación de rodillas colgado', primary: 'core', secondary: ['espalda'], equipment: ['dominadas_barra'], stress: 'medio', bodyweightOnly: true },

  // ── Cardio ─────────────────────────────────────────────────
  { id: 'caminar', name: 'Caminata tranquila', primary: 'cardio', secondary: [], equipment: ['peso_corporal', 'correr'], stress: 'bajo', bodyweightOnly: true },
  { id: 'trote_suave', name: 'Trote suave (zona 2, puedes hablar)', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['correr'], stress: 'medio', bodyweightOnly: true },
  { id: 'bici_suave', name: 'Bici tranquila', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['bici'], stress: 'bajo', bodyweightOnly: true },
  { id: 'bici_media', name: 'Bici a ritmo medio', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['bici'], stress: 'medio', bodyweightOnly: true },
  { id: 'movilidad', name: 'Movilidad y estiramientos suaves', primary: 'cardio', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'caminar_cuesta', name: 'Caminata en cuesta', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['correr'], stress: 'medio', bodyweightOnly: true },
  { id: 'subir_escaleras', name: 'Subir escaleras a ritmo tranquilo', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'comba', name: 'Saltar a la comba suave', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'remo_ergometro', name: 'Remo en máquina, ritmo continuo', primary: 'cardio', secondary: ['espalda', 'cuadriceps_gluteo'], equipment: ['maquina_remo'], stress: 'medio', bodyweightOnly: true }
]

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}
