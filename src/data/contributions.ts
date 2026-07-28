/**
 * Qué músculos mueve cada ejercicio, y cuánto.
 *
 * `1` es motor primario y `0.5` sinergista con implicación significativa. Los
 * estabilizadores no se listan: si un ejercicio te hace apretar el abdomen para
 * no caerte, eso no es volumen de abdominal.
 *
 * El criterio para el 1 frente al 0,5 es si el músculo se lleva el trabajo o
 * solo acompaña. Un remo mueve dorsal **y** espalda alta a la vez —los dos a 1—
 * mientras que el bíceps acompaña —0,5—. Un press de banca inclinado carga el
 * deltoides anterior tanto como el pectoral, así que ahí sí van los dos a 1.
 *
 * Un test comprueba que ningún ejercicio de fuerza del catálogo se queda sin
 * mapa y que todos los músculos citados existen.
 */
import type { MuscleContributions } from '../domain/muscles'

export const CONTRIBUTIONS: Record<string, MuscleContributions> = {
  // ── Pierna: dominantes de rodilla ─────────────────────────
  sentadilla_corporal: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 },
  sentadilla_goblet: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5, erectores_espinales: 0.5 },
  sentadilla_barra: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5, erectores_espinales: 0.5 },
  sentadilla_frontal: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5, erectores_espinales: 0.5 },
  sentadilla_pared: { cuadriceps: 1 },
  sentadilla_sumo: { cuadriceps: 1, aductores: 1, gluteo: 0.5 },
  sentadilla_cosaco: { aductores: 1, cuadriceps: 1, gluteo: 0.5 },
  pistol_asistida: { cuadriceps: 1, gluteo: 0.5 },
  prensa: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 },
  prensa_una_pierna: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 },
  extension_cuadriceps: { cuadriceps: 1 },

  // Zancadas y variantes: cuádriceps y glúteo se lo reparten a partes iguales.
  zancadas: { cuadriceps: 1, gluteo: 1, isquiosurales: 0.5, aductores: 0.5 },
  zancada_atras: { cuadriceps: 1, gluteo: 1, isquiosurales: 0.5 },
  zancada_caminando: { cuadriceps: 1, gluteo: 1, isquiosurales: 0.5, aductores: 0.5 },
  sentadilla_bulgara: { cuadriceps: 1, gluteo: 1, isquiosurales: 0.5, aductores: 0.5 },
  split_estatico: { cuadriceps: 1, gluteo: 0.5, aductores: 0.5 },
  subida_cajon: { cuadriceps: 1, gluteo: 1, isquiosurales: 0.5 },
  paso_lateral_banda: { gluteo: 1, aductores: 0.5 },

  // ── Pierna: dominantes de cadera ──────────────────────────
  puente_gluteo: { gluteo: 1, isquiosurales: 0.5 },
  puente_femoral: { isquiosurales: 1, gluteo: 1 },
  puente_una_pierna: { gluteo: 1, isquiosurales: 1 },
  hip_thrust: { gluteo: 1, isquiosurales: 0.5 },
  extension_cadera_polea: { gluteo: 1, isquiosurales: 0.5 },
  peso_muerto_mancuernas: { isquiosurales: 1, gluteo: 1, erectores_espinales: 0.5 },
  peso_muerto_rumano: { isquiosurales: 1, gluteo: 1, erectores_espinales: 0.5 },
  peso_muerto_deficit: { isquiosurales: 1, gluteo: 1, erectores_espinales: 0.5 },
  peso_muerto_una_pierna: { isquiosurales: 1, gluteo: 1, erectores_espinales: 0.5 },
  buenos_dias: { isquiosurales: 1, erectores_espinales: 1, gluteo: 0.5 },
  swing_kettlebell: { gluteo: 1, isquiosurales: 1, erectores_espinales: 0.5 },
  curl_femoral: { isquiosurales: 1 },
  curl_femoral_banda: { isquiosurales: 1 },
  curl_femoral_deslizante: { isquiosurales: 1 },
  curl_nordico_asistido: { isquiosurales: 1 },

  // ── Espalda ───────────────────────────────────────────────
  // Traccción vertical: manda el dorsal.
  dominadas: { dorsal_ancho: 1, biceps_braquial: 0.5, espalda_alta: 0.5 },
  dominadas_supinas: { dorsal_ancho: 1, biceps_braquial: 1, espalda_alta: 0.5 },
  dominadas_negativas: { dorsal_ancho: 1, biceps_braquial: 0.5, espalda_alta: 0.5 },
  jalon_polea: { dorsal_ancho: 1, biceps_braquial: 0.5, espalda_alta: 0.5 },
  jalon_neutro: { dorsal_ancho: 1, biceps_braquial: 0.5, espalda_alta: 0.5 },
  pullover_mancuerna: { dorsal_ancho: 1, pectoral_mayor: 0.5, triceps_braquial: 0.5 },

  // Tracción horizontal: dorsal y espalda alta a la vez.
  remo_mancuerna: { espalda_alta: 1, dorsal_ancho: 1, biceps_braquial: 0.5 },
  remo_barra: { espalda_alta: 1, dorsal_ancho: 1, biceps_braquial: 0.5 },
  remo_maquina: { espalda_alta: 1, dorsal_ancho: 1, biceps_braquial: 0.5 },
  remo_polea_sentado: { espalda_alta: 1, dorsal_ancho: 1, biceps_braquial: 0.5 },
  remo_invertido: { espalda_alta: 1, dorsal_ancho: 1, biceps_braquial: 0.5 },
  remo_banda: { espalda_alta: 1, dorsal_ancho: 0.5, biceps_braquial: 0.5 },

  encogimientos: { trapecio_superior: 1, antebrazo: 0.5 },
  hiperextensiones: { erectores_espinales: 1, gluteo: 0.5, isquiosurales: 0.5 },
  superman: { erectores_espinales: 1, gluteo: 0.5 },
  ytw_prono: { espalda_alta: 1, deltoides_posterior: 1, trapecio_superior: 0.5 },

  // ── Pecho ─────────────────────────────────────────────────
  flexiones: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  flexiones_rodillas: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  flexiones_amplias: { pectoral_mayor: 1, deltoides_anterior: 0.5 },
  flexiones_arquero: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  flexiones_inclinadas: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  press_banca_mancuernas: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  press_banca_barra: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  press_maquina: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  press_banda_pecho: { pectoral_mayor: 1, triceps_braquial: 0.5, deltoides_anterior: 0.5 },
  aperturas_mancuernas: { pectoral_mayor: 1, deltoides_anterior: 0.5 },
  aperturas_polea: { pectoral_mayor: 1, deltoides_anterior: 0.5 },
  // Inclinado y declinado desplazan el reparto: arriba carga el deltoides
  // anterior tanto como el pectoral; abajo se va hacia el pectoral y el tríceps.
  press_inclinado_mancuernas: { pectoral_mayor: 1, deltoides_anterior: 1, triceps_braquial: 0.5 },
  flexiones_declinadas: { pectoral_mayor: 1, deltoides_anterior: 0.5, triceps_braquial: 0.5 },

  // ── Hombro ────────────────────────────────────────────────
  press_militar_mancuernas: { deltoides_anterior: 1, triceps_braquial: 0.5, deltoides_lateral: 0.5 },
  press_militar_barra: { deltoides_anterior: 1, triceps_braquial: 0.5, deltoides_lateral: 0.5 },
  press_hombro_multipower: { deltoides_anterior: 1, triceps_braquial: 0.5, deltoides_lateral: 0.5 },
  press_arnold: { deltoides_anterior: 1, deltoides_lateral: 0.5, triceps_braquial: 0.5 },
  pike_pushup: { deltoides_anterior: 1, triceps_braquial: 0.5, deltoides_lateral: 0.5 },
  flexion_pino_pared: { deltoides_anterior: 1, triceps_braquial: 1, deltoides_lateral: 0.5 },
  elevaciones_frontales: { deltoides_anterior: 1 },
  elevaciones_laterales: { deltoides_lateral: 1 },
  remo_menton: { deltoides_lateral: 1, trapecio_superior: 1, biceps_braquial: 0.5 },
  pajaros: { deltoides_posterior: 1, espalda_alta: 0.5 },
  face_pull: { deltoides_posterior: 1, espalda_alta: 1, trapecio_superior: 0.5 },
  rotacion_externa: { deltoides_posterior: 1 },
  // Está catalogado en «hombro» por el legado, pero el trabajo es antirrotación.
  plancha_toque_hombro: { recto_abdominal: 1, oblicuos: 0.5, deltoides_anterior: 0.5 },

  // ── Brazo ─────────────────────────────────────────────────
  curl_biceps: { biceps_braquial: 1 },
  curl_concentrado: { biceps_braquial: 1 },
  curl_martillo: { biceps_braquial: 1, antebrazo: 0.5 },
  curl_inverso: { antebrazo: 1, biceps_braquial: 0.5 },
  extension_triceps: { triceps_braquial: 1 },
  extension_triceps_polea_baja: { triceps_braquial: 1 },
  press_frances: { triceps_braquial: 1 },
  patada_triceps: { triceps_braquial: 1 },
  fondos_banco: { triceps_braquial: 1, pectoral_mayor: 0.5, deltoides_anterior: 0.5 },
  fondos_entre_sillas: { triceps_braquial: 1, pectoral_mayor: 0.5, deltoides_anterior: 0.5 },
  flexiones_diamante: { triceps_braquial: 1, pectoral_mayor: 0.5, deltoides_anterior: 0.5 },

  // ── Core ──────────────────────────────────────────────────
  plancha: { recto_abdominal: 1, oblicuos: 0.5 },
  plancha_lateral: { oblicuos: 1, recto_abdominal: 0.5 },
  plancha_dinamica: { recto_abdominal: 1, oblicuos: 0.5, triceps_braquial: 0.5 },
  hollow_hold: { recto_abdominal: 1 },
  dead_bug: { recto_abdominal: 1 },
  elevacion_piernas: { recto_abdominal: 1 },
  rodillas_colgado: { recto_abdominal: 1, oblicuos: 0.5, antebrazo: 0.5 },
  crunch_bicicleta: { oblicuos: 1, recto_abdominal: 1 },
  russian_twist: { oblicuos: 1, recto_abdominal: 0.5 },
  pallof_press: { oblicuos: 1, recto_abdominal: 0.5 },
  escalador: { recto_abdominal: 1, oblicuos: 0.5 },
  bird_dog: { erectores_espinales: 1, gluteo: 0.5 }
}

/**
 * Músculos con landmarks definidos pero **sin un solo ejercicio en el catálogo**.
 *
 * No es un descuido del mapa: es que la app nunca ha tenido trabajo de gemelo.
 * Con la taxonomía nueva eso deja de ser invisible —el volumen de gemelo sale a
 * cero y por debajo del MEV—, y por eso hay que añadir los ejercicios antes de
 * enseñar la vista de volumen, o la app señalaría un agujero que ella misma no
 * deja tapar. Está planificado en la fase 2b.
 */
export const MUSCULOS_SIN_COBERTURA = ['gastrocnemio', 'soleo'] as const

export function contributionsOf(exerciseId: string): MuscleContributions {
  return CONTRIBUTIONS[exerciseId] ?? {}
}
