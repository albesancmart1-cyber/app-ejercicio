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
  { id: 'aduccion_cadera_banda', name: 'Aducción de cadera con banda', primary: 'cuadriceps_gluteo', secondary: [], equipment: ['bandas', 'polea'], stress: 'bajo', loadFactor: 0.15, unilateralOption: true },
  { id: 'abduccion_cadera_polea', name: 'Abducción de cadera en polea o banda', primary: 'cuadriceps_gluteo', secondary: [], equipment: ['polea', 'bandas'], stress: 'bajo', loadFactor: 0.15, unilateralOption: true },
  { id: 'sentadilla_hack', name: 'Sentadilla hack en máquina', primary: 'cuadriceps_gluteo', secondary: ['femoral'], equipment: ['maquina_prensa'], stress: 'medio', loadFactor: 0.5 },
  { id: 'patada_gluteo_polea', name: 'Patada de glúteo en polea', primary: 'cuadriceps_gluteo', secondary: ['femoral'], equipment: ['polea', 'bandas'], stress: 'bajo', loadFactor: 0.2, unilateralOption: true },

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
  { id: 'peso_muerto_convencional', name: 'Peso muerto convencional', primary: 'femoral', secondary: ['espalda', 'cuadriceps_gluteo'], equipment: ['barra'], stress: 'alto', loadFactor: 0.5 },
  { id: 'curl_femoral_sentado', name: 'Curl femoral sentado en máquina', primary: 'femoral', secondary: [], equipment: ['maquina_femoral'], stress: 'bajo', loadFactor: 0.45, unilateralOption: true },

  // ── Gemelo ─────────────────────────────────────────────────
  // La pantorrilla no tenía un solo ejercicio en el catálogo. Con la taxonomía
  // vieja no se notaba, porque no había ningún grupo que la nombrara; contando
  // por músculo sale a cero todas las semanas. De pie trabaja sobre todo el
  // gastrocnemio, que cruza la rodilla y necesita tenerla estirada; sentado, con
  // la rodilla doblada, el que queda es el sóleo. Por eso hacen falta las dos.
  { id: 'elevacion_talones_pie', name: 'Elevación de talones de pie', primary: 'gemelo', secondary: [], equipment: ['peso_corporal', 'mancuernas'], stress: 'bajo', loadFactor: 0.4 },
  { id: 'elevacion_talones_una_pierna', name: 'Elevación de talones a una pierna', primary: 'gemelo', secondary: [], equipment: ['peso_corporal', 'mancuernas'], stress: 'bajo', loadFactor: 0.25, unilateralOption: true },
  { id: 'elevacion_talones_sentado', name: 'Elevación de talones sentado (sóleo)', primary: 'gemelo', secondary: [], equipment: ['mancuernas', 'banco', 'barra'], stress: 'bajo', loadFactor: 0.3 },
  { id: 'elevacion_talones_prensa', name: 'Elevación de talones en prensa', primary: 'gemelo', secondary: [], equipment: ['maquina_prensa'], stress: 'bajo', loadFactor: 0.35 },
  { id: 'elevacion_talones_escalon', name: 'Elevación de talones en un escalón', primary: 'gemelo', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'elevacion_talones_multipower', name: 'Elevación de talones en multipower', primary: 'gemelo', secondary: [], equipment: ['multipower', 'barra'], stress: 'bajo', loadFactor: 0.35 },
  { id: 'elevacion_talones_banda', name: 'Elevación de talones sentado con banda', primary: 'gemelo', secondary: [], equipment: ['bandas'], stress: 'bajo', loadFactor: 0.2 },
  { id: 'elevacion_talones_burro', name: 'Elevación de talones inclinado (tipo burro)', primary: 'gemelo', secondary: [], equipment: ['peso_corporal', 'banco'], stress: 'bajo', bodyweightOnly: true },

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
  { id: 'pullover_polea', name: 'Pullover en polea alta', primary: 'espalda', secondary: ['pecho'], equipment: ['polea'], stress: 'bajo', loadFactor: 0.3 },
  { id: 'remo_pendlay', name: 'Remo Pendlay (desde el suelo)', primary: 'espalda', secondary: ['brazo', 'core'], equipment: ['barra'], stress: 'alto', loadFactor: 0.35 },
  { id: 'remo_t', name: 'Remo en T', primary: 'espalda', secondary: ['brazo'], equipment: ['barra', 'maquina_remo'], stress: 'medio', loadFactor: 0.4 },
  { id: 'dominadas_agarre_ancho', name: 'Dominadas con agarre ancho', primary: 'espalda', secondary: ['brazo'], equipment: ['dominadas_barra'], stress: 'medio', bodyweightOnly: true },
  { id: 'encogimientos_polea', name: 'Encogimientos en polea', primary: 'espalda', secondary: [], equipment: ['polea'], stress: 'bajo', loadFactor: 0.5 },
  { id: 'hiperextension_reversa', name: 'Hiperextensión inversa', primary: 'espalda', secondary: ['femoral'], equipment: ['banco'], stress: 'bajo', bodyweightOnly: true },

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
  { id: 'press_inclinado_barra', name: 'Press inclinado con barra', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.4 },
  { id: 'press_declinado_mancuernas', name: 'Press declinado con mancuernas', primary: 'pecho', secondary: ['brazo'], equipment: ['mancuernas', 'banco'], stress: 'medio', loadFactor: 0.45, unilateralOption: true },
  { id: 'aperturas_inclinadas', name: 'Aperturas inclinadas con mancuernas', primary: 'pecho', secondary: ['hombro'], equipment: ['mancuernas', 'banco'], stress: 'bajo', loadFactor: 0.2 },
  { id: 'contractor_pecho', name: 'Contractor de pecho (peck deck)', primary: 'pecho', secondary: [], equipment: ['maquina_pecho'], stress: 'bajo', loadFactor: 0.4 },
  { id: 'fondos_paralelas', name: 'Fondos en paralelas', primary: 'pecho', secondary: ['brazo', 'hombro'], equipment: ['paralelas'], stress: 'medio', bodyweightOnly: true },

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
  { id: 'elevacion_lateral_inclinado', name: 'Elevación lateral inclinado en banco', primary: 'hombro', secondary: [], equipment: ['mancuernas', 'banco', 'polea'], stress: 'bajo', loadFactor: 0.12, unilateralOption: true },
  { id: 'pajaro_maquina', name: 'Pájaros en máquina (contractor inverso)', primary: 'hombro', secondary: ['espalda'], equipment: ['maquina_pecho'], stress: 'bajo', loadFactor: 0.3 },
  { id: 'press_militar_sentado', name: 'Press militar sentado con mancuernas', primary: 'hombro', secondary: ['brazo'], equipment: ['mancuernas', 'banco'], stress: 'medio', loadFactor: 0.35, unilateralOption: true },

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
  { id: 'curl_muneca', name: 'Curl de muñeca', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'barra'], stress: 'bajo', loadFactor: 0.15, unilateralOption: true },
  { id: 'paseo_granjero', name: 'Paseo del granjero', primary: 'brazo', secondary: ['espalda', 'core'], equipment: ['mancuernas', 'kettlebell'], stress: 'medio', loadFactor: 0.6 },
  { id: 'curl_predicador', name: 'Curl predicador (banco Scott)', primary: 'brazo', secondary: [], equipment: ['banco', 'mancuernas', 'barra'], stress: 'bajo', loadFactor: 0.25, unilateralOption: true },
  { id: 'press_cerrado', name: 'Press de banca con agarre cerrado', primary: 'brazo', secondary: ['pecho', 'hombro'], equipment: ['barra', 'multipower'], stress: 'medio', loadFactor: 0.4 },
  { id: 'fondos_paralelas_triceps', name: 'Fondos en paralelas con el tronco vertical', primary: 'brazo', secondary: ['pecho', 'hombro'], equipment: ['paralelas'], stress: 'medio', bodyweightOnly: true },
  { id: 'curl_muneca_inverso', name: 'Curl de muñeca inverso (extensores)', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'barra'], stress: 'bajo', loadFactor: 0.1, unilateralOption: true },
  { id: 'agarre_disco', name: 'Sujeción de disco con pinza', primary: 'brazo', secondary: [], equipment: ['barra', 'mancuernas'], stress: 'bajo', loadFactor: 0.25 },

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
  { id: 'crunch_polea', name: 'Abdominales en polea (de rodillas)', primary: 'core', secondary: [], equipment: ['polea'], stress: 'bajo', loadFactor: 0.3 },
  { id: 'rueda_abdominal', name: 'Rueda abdominal', primary: 'core', secondary: ['espalda', 'hombro'], equipment: ['rueda_abdominal'], stress: 'medio', bodyweightOnly: true },
  { id: 'piernas_colgado', name: 'Elevación de piernas estiradas colgado', primary: 'core', secondary: ['espalda'], equipment: ['dominadas_barra'], stress: 'medio', bodyweightOnly: true },
  { id: 'crunch_abdominal', name: 'Encogimiento abdominal', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'crunch_inverso', name: 'Crunch inverso', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'lenador_polea', name: 'Leñador en polea o banda', primary: 'core', secondary: [], equipment: ['polea', 'bandas'], stress: 'bajo', loadFactor: 0.2, unilateralOption: true },
  // Sin algo que ponerse encima esto es una plancha a secas, así que exige peso:
  // listar «peso_corporal» aquí lo haría aparecer a quien no tiene con qué.
  { id: 'plancha_lastrada', name: 'Plancha con peso encima', primary: 'core', secondary: ['hombro'], equipment: ['mancuernas', 'kettlebell'], stress: 'medio', loadFactor: 0.2 },

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
