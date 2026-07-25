import type { Exercise } from '../domain/types'

// Catálogo de ejercicios. loadFactor ≈ fracción del peso máximo disponible
// con la que sugerir la primera sesión (progresión conservadora).
export const EXERCISES: Exercise[] = [
  // ── Pierna: cuádriceps y glúteo ─────────────────────────────
  { id: 'sentadilla_corporal', name: 'Sentadilla con peso corporal', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'sentadilla_goblet', name: 'Sentadilla goblet', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['mancuernas', 'kettlebell'], stress: 'medio', loadFactor: 0.5 },
  { id: 'sentadilla_barra', name: 'Sentadilla con barra', primary: 'cuadriceps_gluteo', secondary: ['core', 'femoral'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.45 },
  { id: 'zancadas', name: 'Zancadas', primary: 'cuadriceps_gluteo', secondary: ['femoral', 'core'], equipment: ['peso_corporal', 'mancuernas'], stress: 'medio', loadFactor: 0.3 },
  { id: 'prensa', name: 'Prensa de piernas', primary: 'cuadriceps_gluteo', secondary: ['femoral'], equipment: ['maquina_prensa'], stress: 'medio', loadFactor: 0.5 },
  { id: 'subida_cajon', name: 'Subidas al cajón o banco', primary: 'cuadriceps_gluteo', secondary: ['core'], equipment: ['banco', 'peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'puente_gluteo', name: 'Puente de glúteo', primary: 'cuadriceps_gluteo', secondary: ['femoral', 'core'], equipment: ['peso_corporal', 'barra'], stress: 'bajo', loadFactor: 0.4 },

  // ── Femoral ────────────────────────────────────────────────
  { id: 'puente_femoral', name: 'Puente de glúteo con talones elevados', primary: 'femoral', secondary: ['cuadriceps_gluteo', 'core'], equipment: ['peso_corporal', 'banco'], stress: 'bajo', bodyweightOnly: true },
  { id: 'curl_femoral_banda', name: 'Curl femoral tumbado con banda', primary: 'femoral', secondary: [], equipment: ['bandas'], stress: 'bajo', loadFactor: 0.2 },
  { id: 'peso_muerto_mancuernas', name: 'Peso muerto rumano con mancuernas', primary: 'femoral', secondary: ['espalda', 'cuadriceps_gluteo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.5 },
  { id: 'peso_muerto_rumano', name: 'Peso muerto rumano con barra', primary: 'femoral', secondary: ['espalda', 'cuadriceps_gluteo'], equipment: ['barra', 'kettlebell'], stress: 'alto', loadFactor: 0.45 },
  { id: 'curl_femoral', name: 'Curl femoral en máquina', primary: 'femoral', secondary: [], equipment: ['maquina_femoral'], stress: 'bajo', loadFactor: 0.5 },
  { id: 'buenos_dias', name: 'Buenos días con banda o barra', primary: 'femoral', secondary: ['espalda'], equipment: ['bandas', 'barra'], stress: 'medio', loadFactor: 0.25 },
  { id: 'curl_nordico_asistido', name: 'Curl nórdico asistido', primary: 'femoral', secondary: ['core'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },
  { id: 'swing_kettlebell', name: 'Swing con kettlebell', primary: 'femoral', secondary: ['cuadriceps_gluteo', 'core', 'cardio'], equipment: ['kettlebell'], stress: 'medio', loadFactor: 0.6 },

  // ── Espalda ────────────────────────────────────────────────
  { id: 'dominadas', name: 'Dominadas (o asistidas)', primary: 'espalda', secondary: ['brazo', 'core'], equipment: ['dominadas_barra'], stress: 'medio', bodyweightOnly: true },
  { id: 'remo_mancuerna', name: 'Remo con mancuerna a una mano', primary: 'espalda', secondary: ['brazo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.5 },
  { id: 'remo_barra', name: 'Remo con barra', primary: 'espalda', secondary: ['brazo', 'core'], equipment: ['barra'], stress: 'alto', loadFactor: 0.4 },
  { id: 'remo_maquina', name: 'Remo en máquina', primary: 'espalda', secondary: ['brazo'], equipment: ['maquina_remo', 'polea'], stress: 'bajo', loadFactor: 0.5 },
  { id: 'jalon_polea', name: 'Jalón al pecho en polea', primary: 'espalda', secondary: ['brazo'], equipment: ['polea'], stress: 'bajo', loadFactor: 0.45 },
  { id: 'remo_banda', name: 'Remo con banda elástica', primary: 'espalda', secondary: ['brazo'], equipment: ['bandas'], stress: 'bajo', bodyweightOnly: true },
  { id: 'superman', name: 'Superman (extensión lumbar)', primary: 'espalda', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },

  // ── Pecho ──────────────────────────────────────────────────
  { id: 'flexiones', name: 'Flexiones', primary: 'pecho', secondary: ['hombro', 'brazo', 'core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'press_banca_mancuernas', name: 'Press de banca con mancuernas', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.45 },
  { id: 'press_banca_barra', name: 'Press de banca con barra', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.45 },
  { id: 'press_maquina', name: 'Press de pecho en máquina', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['maquina_pecho'], stress: 'bajo', loadFactor: 0.5 },
  { id: 'aperturas_mancuernas', name: 'Aperturas con mancuernas', primary: 'pecho', secondary: ['hombro'], equipment: ['mancuernas'], stress: 'bajo', loadFactor: 0.25 },
  { id: 'flexiones_inclinadas', name: 'Flexiones inclinadas en banco', primary: 'pecho', secondary: ['hombro', 'brazo'], equipment: ['banco'], stress: 'bajo', bodyweightOnly: true },

  // ── Hombro ─────────────────────────────────────────────────
  { id: 'press_militar_mancuernas', name: 'Press militar con mancuernas', primary: 'hombro', secondary: ['brazo', 'core'], equipment: ['mancuernas'], stress: 'medio', loadFactor: 0.35 },
  { id: 'press_militar_barra', name: 'Press militar con barra', primary: 'hombro', secondary: ['brazo', 'core'], equipment: ['barra', 'multipower'], stress: 'alto', loadFactor: 0.3 },
  { id: 'elevaciones_laterales', name: 'Elevaciones laterales', primary: 'hombro', secondary: [], equipment: ['mancuernas', 'bandas'], stress: 'bajo', loadFactor: 0.15 },
  { id: 'pajaros', name: 'Pájaros (deltoide posterior)', primary: 'hombro', secondary: ['espalda'], equipment: ['mancuernas', 'bandas'], stress: 'bajo', loadFactor: 0.15 },
  { id: 'face_pull', name: 'Face pull en polea o banda', primary: 'hombro', secondary: ['espalda'], equipment: ['polea', 'bandas'], stress: 'bajo', loadFactor: 0.25 },
  { id: 'pike_pushup', name: 'Flexión pica (hombro)', primary: 'hombro', secondary: ['brazo', 'core'], equipment: ['peso_corporal'], stress: 'medio', bodyweightOnly: true },

  // ── Brazo ──────────────────────────────────────────────────
  { id: 'curl_biceps', name: 'Curl de bíceps', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'barra', 'bandas'], stress: 'bajo', loadFactor: 0.3 },
  { id: 'extension_triceps', name: 'Extensión de tríceps sobre cabeza', primary: 'brazo', secondary: [], equipment: ['mancuernas', 'polea', 'bandas'], stress: 'bajo', loadFactor: 0.25 },
  { id: 'fondos_banco', name: 'Fondos de tríceps en banco', primary: 'brazo', secondary: ['pecho', 'hombro'], equipment: ['banco', 'peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'curl_martillo', name: 'Curl martillo', primary: 'brazo', secondary: [], equipment: ['mancuernas'], stress: 'bajo', loadFactor: 0.3 },

  // ── Core ───────────────────────────────────────────────────
  { id: 'plancha', name: 'Plancha', primary: 'core', secondary: ['hombro'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'plancha_lateral', name: 'Plancha lateral', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'dead_bug', name: 'Dead bug', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'bird_dog', name: 'Bird dog', primary: 'core', secondary: ['espalda'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'elevacion_piernas', name: 'Elevación de piernas tumbado', primary: 'core', secondary: [], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true },
  { id: 'pallof_press', name: 'Press Pallof con banda', primary: 'core', secondary: ['hombro'], equipment: ['bandas', 'polea'], stress: 'bajo', loadFactor: 0.2 },

  // ── Cardio ─────────────────────────────────────────────────
  { id: 'caminar', name: 'Caminata tranquila', primary: 'cardio', secondary: [], equipment: ['peso_corporal', 'correr'], stress: 'bajo', bodyweightOnly: true },
  { id: 'trote_suave', name: 'Trote suave (zona 2, puedes hablar)', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['correr'], stress: 'medio', bodyweightOnly: true },
  { id: 'bici_suave', name: 'Bici tranquila', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['bici'], stress: 'bajo', bodyweightOnly: true },
  { id: 'bici_media', name: 'Bici a ritmo medio', primary: 'cardio', secondary: ['cuadriceps_gluteo'], equipment: ['bici'], stress: 'medio', bodyweightOnly: true },
  { id: 'movilidad', name: 'Movilidad y estiramientos suaves', primary: 'cardio', secondary: ['core'], equipment: ['peso_corporal'], stress: 'bajo', bodyweightOnly: true }
]

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}
