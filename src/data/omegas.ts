/**
 * Omega-3 y omega-6 de los alimentos, en mg por 100 g.
 *
 * Va aparte del catálogo a propósito. Los alimentos de `alimentos.ts` llevan lo
 * que hace falta para apuntar una comida —nombre, etiquetas, carbohidratos— y
 * eso está completo para los 241. Esto de aquí, en cambio, **está incompleto y
 * lo va a seguir estando**, porque solo tiene sentido poner la cifra donde
 * existe una referencia decente. Mezclarlo con el catálogo daría la impresión
 * de que todo alimento tiene su dato, y no es verdad.
 *
 * ## De dónde salen y qué precisión tienen
 *
 * Son valores de tablas de composición de alimentos al uso, redondeados. La
 * cifra exacta de una sardina depende de la época, de lo que haya comido y de
 * si estaba en aceite de oliva o de girasol, así que **el número no es el
 * dato: el orden de magnitud sí**. Que la caballa esté por encima de diez a uno
 * y las pipas de girasol por debajo de uno a trescientos es robusto; que la
 * caballa dé 2 600 y no 2 400 no lo es.
 *
 * Por eso el ratio del día se enseña siempre junto a **cuánto de lo que comiste
 * tenía dato**. Un «1 : 1,2» calculado sobre el 30 % de la comida no es un
 * 1 : 1,2, y la app no lo va a presentar como si lo fuera.
 *
 * ## Dos avisos que cambian el número entero
 *
 * - **El aceite de la lata manda sobre el pescado.** Unas sardinas en aceite de
 *   girasol pueden pasar de 10:1 a favor del omega-3 a estar empatadas. Por eso
 *   las conservas están separadas de su versión fresca.
 * - **El huevo es omega-6.** Sorprende a mucha gente: un huevo normal tiene
 *   quince veces más omega-6 que omega-3. Los enriquecidos son otra cosa, y
 *   quien los coma tiene la edición de alimentos para corregirlo.
 */

export interface Omegas {
  /** mg de omega-3 total por 100 g. */
  o3: number
  /** mg de omega-6 total por 100 g. */
  o6: number
}

/**
 * Lo conocido. Un alimento que no esté aquí **no cuenta** para el ratio, ni a
 * favor ni en contra: se refleja en la cobertura y ya está.
 */
export const OMEGA_POR_100: Record<string, Omegas> = {
  // ── Pescado azul: la razón por la que este módulo existe ───────────────
  caballa: { o3: 2600, o6: 220 },
  caballa_lata: { o3: 2200, o6: 900 },
  arenque: { o3: 2400, o6: 130 },
  salmon: { o3: 2260, o6: 1650 },
  salmon_ahumado: { o3: 1600, o6: 1200 },
  sardinas: { o3: 1480, o6: 110 },
  sardinas_lata: { o3: 1400, o6: 600 },
  boquerones: { o3: 1500, o6: 100 },
  boquerones_vinagre: { o3: 1400, o6: 250 },
  anchoas: { o3: 1450, o6: 200 },
  jurel: { o3: 1400, o6: 150 },
  atun_filete: { o3: 1300, o6: 60 },
  bonito: { o3: 1300, o6: 60 },
  huevas_pescado: { o3: 2000, o6: 200 },
  trucha: { o3: 1100, o6: 700 },
  pez_espada: { o3: 800, o6: 30 },
  // La lata en aceite de girasol le da la vuelta al alimento entero.
  atun_lata_natural: { o3: 250, o6: 50 },
  atun_lata_aceite: { o3: 300, o6: 2500 },

  // ── Pescado blanco: poco de los dos, y el ratio sigue siendo bueno ─────
  bacalao_fresco: { o3: 200, o6: 5 },
  bacalao_salado: { o3: 200, o6: 10 },
  merluza: { o3: 250, o6: 20 },
  lubina: { o3: 700, o6: 100 },
  dorada: { o3: 700, o6: 120 },
  rape: { o3: 150, o6: 10 },
  lenguado: { o3: 150, o6: 10 },
  rodaballo: { o3: 300, o6: 20 },
  besugo: { o3: 400, o6: 60 },
  corvina: { o3: 400, o6: 60 },
  salmonete: { o3: 400, o6: 60 },

  // ── Marisco ────────────────────────────────────────────────────────────
  calamar: { o3: 250, o6: 10 },
  sepia: { o3: 200, o6: 10 },
  pulpo: { o3: 250, o6: 10 },
  gambas: { o3: 300, o6: 25 },
  langostinos: { o3: 300, o6: 25 },
  cigalas: { o3: 300, o6: 25 },
  mejillones: { o3: 700, o6: 20 },
  almejas: { o3: 150, o6: 15 },
  berberechos: { o3: 150, o6: 15 },
  ostras: { o3: 700, o6: 30 },
  vieiras: { o3: 200, o6: 5 },
  navajas: { o3: 200, o6: 10 },
  necora: { o3: 300, o6: 20 },
  bogavante: { o3: 300, o6: 20 },
  percebes: { o3: 200, o6: 15 },

  // ── Huevos: aquí la sorpresa es que son omega-6 ────────────────────────
  huevo_cocido: { o3: 100, o6: 1560 },
  huevo_plancha: { o3: 100, o6: 1600 },
  huevo_revuelto: { o3: 100, o6: 1700 },
  huevo_frito: { o3: 120, o6: 2400 },
  tortilla_francesa: { o3: 110, o6: 2000 },
  huevo_codorniz: { o3: 130, o6: 1600 },
  yema: { o3: 230, o6: 3500 },
  claras: { o3: 0, o6: 0 },

  // ── Carne: depende muchísimo de cómo se crió el animal ─────────────────
  ternera_filete: { o3: 40, o6: 250 },
  ternera_entrecot: { o3: 60, o6: 400 },
  ternera_chuleta: { o3: 60, o6: 400 },
  ternera_chuleton: { o3: 70, o6: 450 },
  ternera_solomillo: { o3: 40, o6: 250 },
  ternera_picada: { o3: 60, o6: 400 },
  ternera_hamburguesa: { o3: 60, o6: 400 },
  ternera_higado: { o3: 60, o6: 400 },
  cordero_chuletillas: { o3: 250, o6: 800 },
  cordero_pierna: { o3: 200, o6: 600 },
  cordero_paletilla: { o3: 220, o6: 700 },
  cerdo_lomo: { o3: 30, o6: 700 },
  cerdo_chuleta: { o3: 40, o6: 900 },
  cerdo_solomillo: { o3: 25, o6: 500 },
  cerdo_costillas: { o3: 60, o6: 1800 },
  cerdo_panceta: { o3: 100, o6: 3500 },
  cerdo_secreto: { o3: 80, o6: 2500 },
  cerdo_presa: { o3: 70, o6: 2000 },
  cerdo_picada: { o3: 50, o6: 1200 },
  pollo_pechuga: { o3: 30, o6: 450 },
  pollo_muslo: { o3: 80, o6: 2200 },
  pollo_contramuslo: { o3: 80, o6: 2200 },
  pollo_alitas: { o3: 90, o6: 2600 },
  pollo_entero: { o3: 90, o6: 2500 },
  pavo_pechuga: { o3: 30, o6: 400 },
  pavo_picada: { o3: 50, o6: 900 },
  conejo: { o3: 200, o6: 800 },
  codorniz: { o3: 150, o6: 2000 },
  pato_magret: { o3: 100, o6: 1500 },
  bacon: { o3: 100, o6: 3500 },
  jamon_iberico: { o3: 90, o6: 2000 },
  jamon_serrano: { o3: 60, o6: 1400 },
  chorizo: { o3: 100, o6: 2800 },
  salchichon: { o3: 100, o6: 2800 },

  // ── Frutos secos y semillas: donde el omega-6 se dispara ───────────────
  semillas_lino: { o3: 22810, o6: 5910 },
  semillas_chia: { o3: 17830, o6: 5840 },
  nueces: { o3: 9080, o6: 38090 },
  macadamias: { o3: 206, o6: 1300 },
  pistachos: { o3: 254, o6: 13200 },
  avellanas: { o3: 87, o6: 7830 },
  pipas_girasol: { o3: 74, o6: 23050 },
  anacardos: { o3: 62, o6: 7780 },
  pipas_calabaza: { o3: 120, o6: 20700 },
  pinones: { o3: 112, o6: 33150 },
  almendras: { o3: 3, o6: 12320 },
  cacahuetes: { o3: 3, o6: 15560 },
  cacahuetes_saladas: { o3: 3, o6: 15560 },
  crema_cacahuete: { o3: 60, o6: 12000 },
  crema_almendra: { o3: 5, o6: 12000 },

  // ── Grasas ─────────────────────────────────────────────────────────────
  aceite_oliva: { o3: 760, o6: 9760 },
  aceitunas: { o3: 60, o6: 1220 },
  aguacate: { o3: 110, o6: 1690 },
  mantequilla: { o3: 315, o6: 2170 },
  ghee: { o3: 350, o6: 2250 },
  coco: { o3: 0, o6: 180 },
  aceite_coco: { o3: 0, o6: 1800 },
  mayonesa_oliva: { o3: 800, o6: 18000 },

  // ── Lácteos ────────────────────────────────────────────────────────────
  nata: { o3: 200, o6: 700 },
  leche_entera: { o3: 20, o6: 90 },
  yogur_griego: { o3: 40, o6: 130 },
  yogur_natural: { o3: 20, o6: 70 },
  kefir: { o3: 20, o6: 70 },
  queso_manchego: { o3: 350, o6: 800 },
  queso_oveja: { o3: 350, o6: 800 },
  queso_cabra: { o3: 300, o6: 700 },
  queso_vaca: { o3: 300, o6: 600 },
  queso_parmesano: { o3: 400, o6: 800 },
  queso_azul: { o3: 300, o6: 800 },
  mozzarella: { o3: 200, o6: 400 },
  burrata: { o3: 250, o6: 500 },
  queso_fresco: { o3: 100, o6: 200 },
  requeson: { o3: 40, o6: 100 }
}

/** Lo que se sabe de un alimento del catálogo, o nada. */
export function omegasDe(alimentoId: string | undefined): Omegas | undefined {
  return alimentoId ? OMEGA_POR_100[alimentoId] : undefined
}

/** Cuántos alimentos del catálogo llevan cifra. Sirve para no exagerar. */
export const ALIMENTOS_CON_OMEGAS = Object.keys(OMEGA_POR_100).length
