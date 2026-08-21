/**
 * Lo que la app mira de un alimento, y que las demás no miran.
 *
 * Va aparte del catálogo por la misma razón que los omegas: **está incompleto y
 * lo va a seguir estando**. Solo se pone la cifra donde hay una referencia
 * decente, y mezclarlo con `alimentos.ts` daría la impresión de que los 241
 * alimentos tienen todos sus datos, que no es verdad.
 *
 * Las cifras son de tablas de composición al uso, redondeadas. El orden de
 * magnitud es robusto; el decimal exacto no lo es, y por eso la app enseña
 * siempre **cuánto de lo que comiste tenía dato**.
 *
 * ## Los cuatro datos y por qué estos
 *
 * - **Leucina.** Es el aminoácido que enciende la síntesis de proteína, y lo
 *   hace por **umbral**: por debajo de unos 2,5 g en una sola comida no se
 *   dispara, y repartir la misma proteína en picoteos no equivale a un bolo.
 *   Por eso se cuenta por comida y no por día, que es lo que hace todo el mundo.
 *
 * - **DIAAS.** La medida de calidad de proteína de la FAO, que corrige por
 *   digestibilidad real de cada aminoácido. Cien es la referencia; el huevo
 *   pasa de 110 y el trigo se queda en 40. Dos platos con «20 g de proteína» no
 *   son el mismo plato.
 *
 * - **Deuterio.** Un isótopo pesado del hidrógeno que la mitocondria maneja
 *   peor. Alto en lo que crece con azúcar y fotosíntesis —semillas, cereales,
 *   miel—; bajo en grasa animal. Se da en ppm y se mira como tendencia, no como
 *   objetivo: es el dato más especulativo de los cuatro y conviene decirlo.
 *
 * - **Antinutrientes.** Fitatos, oxalatos, lectinas. No son un veneno: son la
 *   defensa química de la planta, y su efecto medible es **secuestrar minerales**
 *   —el zinc y el hierro sobre todo— en la misma comida. Se marca como alto,
 *   medio o bajo, que es toda la precisión que admite el asunto.
 */

export type NivelAntinutrientes = 'bajo' | 'medio' | 'alto'

export interface Nutrientes {
  /** Gramos de proteína por 100 g. */
  proteinaPor100?: number
  /** Gramos de leucina por 100 g. */
  leucinaPor100?: number
  /** DIAAS de la FAO. 100 es la referencia. */
  diaas?: number
  /** Deuterio en partes por millón. El agua del mar ronda 155. */
  deuterioPpm?: number
  antinutrientes?: NivelAntinutrientes
}

/**
 * El umbral de leucina que enciende la síntesis de proteína, en gramos.
 *
 * Es el número que hace que esto se cuente por comida y no por día: 2,5 g de
 * golpe encienden lo que 5 g repartidos en seis picoteos no encienden.
 */
export const UMBRAL_LEUCINA_G = 2.5

/** Y la proteína animal que suele hacer falta para llegar ahí. */
export const PROTEINA_PARA_EL_UMBRAL_G = 30

export const NUTRIENTES: Record<string, Nutrientes> = {
  // ── Huevos: la referencia de calidad de proteína ──────────────────────
  huevo_cocido: { proteinaPor100: 12.6, leucinaPor100: 1.09, diaas: 113, deuterioPpm: 145, antinutrientes: 'bajo' },
  huevo_frito: { proteinaPor100: 13.6, leucinaPor100: 1.18, diaas: 113, deuterioPpm: 145, antinutrientes: 'bajo' },
  huevo_plancha: { proteinaPor100: 13.6, leucinaPor100: 1.18, diaas: 113, deuterioPpm: 145, antinutrientes: 'bajo' },
  huevo_revuelto: { proteinaPor100: 12.9, leucinaPor100: 1.12, diaas: 113, deuterioPpm: 145, antinutrientes: 'bajo' },
  tortilla_francesa: { proteinaPor100: 12.0, leucinaPor100: 1.04, diaas: 113, deuterioPpm: 145, antinutrientes: 'bajo' },
  huevo_codorniz: { proteinaPor100: 13.1, leucinaPor100: 1.13, diaas: 113, deuterioPpm: 145, antinutrientes: 'bajo' },
  claras: { proteinaPor100: 10.9, leucinaPor100: 0.92, diaas: 113, deuterioPpm: 148, antinutrientes: 'bajo' },
  yema: { proteinaPor100: 15.9, leucinaPor100: 1.4, diaas: 113, deuterioPpm: 138, antinutrientes: 'bajo' },

  // ── Carne ─────────────────────────────────────────────────────────────
  ternera_filete: { proteinaPor100: 22, leucinaPor100: 1.76, diaas: 112, deuterioPpm: 132, antinutrientes: 'bajo' },
  ternera_entrecot: { proteinaPor100: 20, leucinaPor100: 1.6, diaas: 112, deuterioPpm: 130, antinutrientes: 'bajo' },
  ternera_chuleton: { proteinaPor100: 19, leucinaPor100: 1.52, diaas: 112, deuterioPpm: 129, antinutrientes: 'bajo' },
  ternera_solomillo: { proteinaPor100: 22, leucinaPor100: 1.76, diaas: 112, deuterioPpm: 132, antinutrientes: 'bajo' },
  ternera_picada: { proteinaPor100: 20, leucinaPor100: 1.6, diaas: 112, deuterioPpm: 131, antinutrientes: 'bajo' },
  ternera_higado: { proteinaPor100: 20, leucinaPor100: 1.8, diaas: 112, deuterioPpm: 133, antinutrientes: 'bajo' },
  cerdo_lomo: { proteinaPor100: 22, leucinaPor100: 1.8, diaas: 114, deuterioPpm: 133, antinutrientes: 'bajo' },
  cerdo_solomillo: { proteinaPor100: 22, leucinaPor100: 1.8, diaas: 114, deuterioPpm: 133, antinutrientes: 'bajo' },
  cerdo_panceta: { proteinaPor100: 12, leucinaPor100: 0.98, diaas: 114, deuterioPpm: 126, antinutrientes: 'bajo' },
  cerdo_secreto: { proteinaPor100: 17, leucinaPor100: 1.39, diaas: 114, deuterioPpm: 129, antinutrientes: 'bajo' },
  pollo_pechuga: { proteinaPor100: 23, leucinaPor100: 1.73, diaas: 108, deuterioPpm: 134, antinutrientes: 'bajo' },
  pollo_muslo: { proteinaPor100: 18, leucinaPor100: 1.35, diaas: 108, deuterioPpm: 132, antinutrientes: 'bajo' },
  pollo_contramuslo: { proteinaPor100: 18, leucinaPor100: 1.35, diaas: 108, deuterioPpm: 132, antinutrientes: 'bajo' },
  pavo_pechuga: { proteinaPor100: 24, leucinaPor100: 1.8, diaas: 108, deuterioPpm: 134, antinutrientes: 'bajo' },
  cordero_chuletillas: { proteinaPor100: 18, leucinaPor100: 1.44, diaas: 110, deuterioPpm: 130, antinutrientes: 'bajo' },
  cordero_pierna: { proteinaPor100: 20, leucinaPor100: 1.6, diaas: 110, deuterioPpm: 131, antinutrientes: 'bajo' },
  conejo: { proteinaPor100: 21, leucinaPor100: 1.66, diaas: 110, deuterioPpm: 132, antinutrientes: 'bajo' },
  jamon_iberico: { proteinaPor100: 30, leucinaPor100: 2.4, diaas: 114, deuterioPpm: 130, antinutrientes: 'bajo' },
  jamon_serrano: { proteinaPor100: 31, leucinaPor100: 2.5, diaas: 114, deuterioPpm: 131, antinutrientes: 'bajo' },
  cecina: { proteinaPor100: 39, leucinaPor100: 3.1, diaas: 112, deuterioPpm: 130, antinutrientes: 'bajo' },

  // ── Pescado y marisco ─────────────────────────────────────────────────
  salmon: { proteinaPor100: 20, leucinaPor100: 1.6, diaas: 100, deuterioPpm: 136, antinutrientes: 'bajo' },
  sardinas: { proteinaPor100: 21, leucinaPor100: 1.68, diaas: 100, deuterioPpm: 137, antinutrientes: 'bajo' },
  boquerones: { proteinaPor100: 20, leucinaPor100: 1.6, diaas: 100, deuterioPpm: 137, antinutrientes: 'bajo' },
  caballa: { proteinaPor100: 19, leucinaPor100: 1.52, diaas: 100, deuterioPpm: 136, antinutrientes: 'bajo' },
  atun_filete: { proteinaPor100: 23, leucinaPor100: 1.84, diaas: 100, deuterioPpm: 138, antinutrientes: 'bajo' },
  atun_lata_natural: { proteinaPor100: 26, leucinaPor100: 2.08, diaas: 100, deuterioPpm: 139, antinutrientes: 'bajo' },
  bacalao_fresco: { proteinaPor100: 18, leucinaPor100: 1.44, diaas: 100, deuterioPpm: 140, antinutrientes: 'bajo' },
  merluza: { proteinaPor100: 17, leucinaPor100: 1.36, diaas: 100, deuterioPpm: 140, antinutrientes: 'bajo' },
  lubina: { proteinaPor100: 18, leucinaPor100: 1.44, diaas: 100, deuterioPpm: 139, antinutrientes: 'bajo' },
  dorada: { proteinaPor100: 18, leucinaPor100: 1.44, diaas: 100, deuterioPpm: 139, antinutrientes: 'bajo' },
  gambas: { proteinaPor100: 20, leucinaPor100: 1.6, diaas: 100, deuterioPpm: 141, antinutrientes: 'bajo' },
  langostinos: { proteinaPor100: 20, leucinaPor100: 1.6, diaas: 100, deuterioPpm: 141, antinutrientes: 'bajo' },
  mejillones: { proteinaPor100: 12, leucinaPor100: 0.96, diaas: 100, deuterioPpm: 142, antinutrientes: 'bajo' },
  pulpo: { proteinaPor100: 15, leucinaPor100: 1.2, diaas: 100, deuterioPpm: 141, antinutrientes: 'bajo' },
  calamar: { proteinaPor100: 16, leucinaPor100: 1.28, diaas: 100, deuterioPpm: 141, antinutrientes: 'bajo' },

  // ── Lácteos ───────────────────────────────────────────────────────────
  yogur_griego: { proteinaPor100: 9, leucinaPor100: 0.9, diaas: 105, deuterioPpm: 148, antinutrientes: 'bajo' },
  yogur_natural: { proteinaPor100: 3.5, leucinaPor100: 0.35, diaas: 105, deuterioPpm: 150, antinutrientes: 'bajo' },
  kefir: { proteinaPor100: 3.3, leucinaPor100: 0.33, diaas: 105, deuterioPpm: 150, antinutrientes: 'bajo' },
  queso_manchego: { proteinaPor100: 26, leucinaPor100: 2.5, diaas: 118, deuterioPpm: 142, antinutrientes: 'bajo' },
  queso_parmesano: { proteinaPor100: 36, leucinaPor100: 3.5, diaas: 118, deuterioPpm: 140, antinutrientes: 'bajo' },
  queso_cabra: { proteinaPor100: 22, leucinaPor100: 2.1, diaas: 118, deuterioPpm: 143, antinutrientes: 'bajo' },
  queso_fresco: { proteinaPor100: 12, leucinaPor100: 1.15, diaas: 118, deuterioPpm: 148, antinutrientes: 'bajo' },
  requeson: { proteinaPor100: 11, leucinaPor100: 1.1, diaas: 118, deuterioPpm: 149, antinutrientes: 'bajo' },
  leche_entera: { proteinaPor100: 3.2, leucinaPor100: 0.32, diaas: 116, deuterioPpm: 150, antinutrientes: 'bajo' },

  // ── Legumbres, cereales y semillas: DIAAS bajo y antinutrientes altos ──
  lentejas: { proteinaPor100: 9, leucinaPor100: 0.65, diaas: 65, deuterioPpm: 152, antinutrientes: 'alto' },
  garbanzos: { proteinaPor100: 9, leucinaPor100: 0.63, diaas: 83, deuterioPpm: 152, antinutrientes: 'alto' },
  alubias: { proteinaPor100: 9, leucinaPor100: 0.72, diaas: 60, deuterioPpm: 152, antinutrientes: 'alto' },
  arroz_blanco: { proteinaPor100: 2.7, leucinaPor100: 0.22, diaas: 60, deuterioPpm: 154, antinutrientes: 'medio' },
  arroz_integral: { proteinaPor100: 2.6, leucinaPor100: 0.21, diaas: 60, deuterioPpm: 154, antinutrientes: 'alto' },
  pan_blanco: { proteinaPor100: 8, leucinaPor100: 0.55, diaas: 40, deuterioPpm: 155, antinutrientes: 'medio' },
  pan_integral: { proteinaPor100: 9, leucinaPor100: 0.62, diaas: 40, deuterioPpm: 155, antinutrientes: 'alto' },
  pasta: { proteinaPor100: 5, leucinaPor100: 0.36, diaas: 40, deuterioPpm: 155, antinutrientes: 'medio' },
  avena: { proteinaPor100: 13, leucinaPor100: 0.98, diaas: 54, deuterioPpm: 154, antinutrientes: 'alto' },
  quinoa: { proteinaPor100: 4.4, leucinaPor100: 0.26, diaas: 83, deuterioPpm: 153, antinutrientes: 'medio' },

  // ── Frutos secos y semillas ───────────────────────────────────────────
  almendras: { proteinaPor100: 21, leucinaPor100: 1.47, diaas: 40, deuterioPpm: 150, antinutrientes: 'alto' },
  nueces: { proteinaPor100: 15, leucinaPor100: 1.17, diaas: 40, deuterioPpm: 148, antinutrientes: 'alto' },
  cacahuetes: { proteinaPor100: 26, leucinaPor100: 1.67, diaas: 43, deuterioPpm: 150, antinutrientes: 'alto' },
  pistachos: { proteinaPor100: 20, leucinaPor100: 1.54, diaas: 40, deuterioPpm: 150, antinutrientes: 'alto' },
  semillas_chia: { proteinaPor100: 17, leucinaPor100: 1.37, diaas: 40, deuterioPpm: 152, antinutrientes: 'alto' },
  semillas_lino: { proteinaPor100: 18, leucinaPor100: 1.24, diaas: 40, deuterioPpm: 152, antinutrientes: 'alto' },
  pipas_calabaza: { proteinaPor100: 30, leucinaPor100: 2.42, diaas: 40, deuterioPpm: 151, antinutrientes: 'alto' },

  // ── Verdura y fruta ───────────────────────────────────────────────────
  espinacas: { proteinaPor100: 2.9, leucinaPor100: 0.22, deuterioPpm: 153, antinutrientes: 'alto' },
  acelgas: { proteinaPor100: 1.8, leucinaPor100: 0.13, deuterioPpm: 153, antinutrientes: 'alto' },
  brocoli: { proteinaPor100: 2.8, leucinaPor100: 0.13, deuterioPpm: 152, antinutrientes: 'medio' },
  lechuga: { proteinaPor100: 1.4, leucinaPor100: 0.07, deuterioPpm: 154, antinutrientes: 'bajo' },
  tomate: { proteinaPor100: 0.9, leucinaPor100: 0.03, deuterioPpm: 154, antinutrientes: 'bajo' },
  aguacate: { proteinaPor100: 2, leucinaPor100: 0.14, deuterioPpm: 146, antinutrientes: 'bajo' },
  patata_cocida: { proteinaPor100: 2, leucinaPor100: 0.1, diaas: 100, deuterioPpm: 154, antinutrientes: 'medio' },
  patata_asada: { proteinaPor100: 2.3, leucinaPor100: 0.12, diaas: 100, deuterioPpm: 154, antinutrientes: 'medio' },
  boniato: { proteinaPor100: 1.6, leucinaPor100: 0.09, deuterioPpm: 154, antinutrientes: 'medio' },
  platano: { proteinaPor100: 1.1, leucinaPor100: 0.07, deuterioPpm: 155, antinutrientes: 'bajo' },
  manzana: { proteinaPor100: 0.3, leucinaPor100: 0.01, deuterioPpm: 155, antinutrientes: 'bajo' },
  miel: { proteinaPor100: 0.3, deuterioPpm: 158, antinutrientes: 'bajo' },

  // ── Grasas ────────────────────────────────────────────────────────────
  mantequilla: { proteinaPor100: 0.9, deuterioPpm: 128, antinutrientes: 'bajo' },
  ghee: { proteinaPor100: 0.3, deuterioPpm: 126, antinutrientes: 'bajo' },
  aceite_oliva: { deuterioPpm: 140, antinutrientes: 'bajo' },
  aceite_coco: { deuterioPpm: 132, antinutrientes: 'bajo' },
  coco: { proteinaPor100: 3.3, deuterioPpm: 133, antinutrientes: 'medio' }
}

export function nutrientesDe(alimentoId: string | undefined): Nutrientes | undefined {
  return alimentoId ? NUTRIENTES[alimentoId] : undefined
}

/** Cuántos alimentos del catálogo llevan estos datos. */
export const ALIMENTOS_CON_NUTRIENTES = Object.keys(NUTRIENTES).length

/**
 * El deuterio del agua del mar, que es la referencia de la escala.
 *
 * Por debajo de 150 ppm se considera bajo y por encima de 154, alto. Es la
 * franja en que se mueve la comida de verdad; no hay nada a 50 ni a 300.
 */
export const DEUTERIO_REFERENCIA_PPM = 155
export const DEUTERIO_BAJO_PPM = 150
export const DEUTERIO_ALTO_PPM = 154
