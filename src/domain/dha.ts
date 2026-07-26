/**
 * Objetivo y límites de seguridad del DHA.
 *
 * El DHA es el ácido graso estructural de las membranas celulares: los segmentos
 * externos de los fotorreceptores rondan el 50 % de DHA, y el tejido nervioso lo
 * concentra más que ningún otro. De ahí que interese comerlo a diario y en la
 * mayor cantidad razonable. «Razonable» tiene número, y son estos:
 *
 * - **EFSA (2026), opinión sobre DHA suplementario:** los aportes de DHA solo, en
 *   forma de suplemento, hasta unos **1.000 mg/día** no plantean problemas de
 *   seguridad en ninguna población, embarazadas incluidas. No es un límite máximo
 *   tolerable —por encima no está demostrado que sea peligroso—, sino el techo que
 *   la evidencia actual permite respaldar. Por eso la app nunca sugiere más de una
 *   pastilla de 1 g al día.
 * - **EFSA (2012), EPA + DHA combinados:** hasta unos 5 g/día de suplemento no
 *   aumentan el sangrado espontáneo ni alteran el control glucémico, la función
 *   inmune o la peroxidación lipídica, siempre que el aceite sea estable.
 * - Entre 2 y 3 g/día de DHA suplementario puede subir el LDL (y también el HDL);
 *   la propia EFSA no considera ese cambio adverso hasta 4 g/día durante 16 semanas.
 *   Aun así, el techo operativo de la app se queda en 3.000 mg diarios totales.
 * - **Vitamina A preformada:** el límite superior en adultos es de 3.000 µg RAE/día.
 *   Manda sobre el hígado de bacalao y sobre cualquier casquería, que son las dos
 *   fuentes de DHA que pueden pasarse de la raya por otro camino.
 *
 * Sobre subir el objetivo en verano: que el DHA sea material de construcción de
 * las membranas está fuera de discusión, y comer más en la época de más sol no
 * supone ningún riesgo dentro de estos límites. Que el cuerpo *necesite* más DHA
 * en verano es una preferencia razonable, no algo que la literatura establezca;
 * queda documentado aquí para no confundir una cosa con la otra.
 */

export const DHA_LIMITS = {
  /** Objetivo diario habitual, en mg. */
  objetivoDiario: 2000,
  /** Objetivo en los meses de más sol. */
  objetivoVerano: 2600,
  /** Techo operativo diario, sumando comida y suplemento. */
  techoDiario: 3000,
  /** EFSA 2026: DHA suplementario seguro. Una pastilla de 1 g. */
  maxSuplementoDiario: 1000
}

/** Límite superior de vitamina A preformada en adultos, en µg RAE al día. */
export const VITAMINA_A_UL_DIARIA = 3000

/** Meses de mayor exposición solar en el hemisferio norte. */
export function esVerano(todayIso: string): boolean {
  const mes = Number(todayIso.slice(5, 7))
  return mes >= 6 && mes <= 8
}

/** Objetivo de DHA para hoy, en mg. */
export function objetivoDhaDiario(todayIso: string): number {
  return esVerano(todayIso) ? DHA_LIMITS.objetivoVerano : DHA_LIMITS.objetivoDiario
}

export interface ComplementoDha {
  /** Pastillas sugeridas, nunca por encima del techo de suplementación. */
  pastillas: number
  /** DHA total del día si se toman, en mg. */
  totalMg: number
  /** Si el plato ya cubre el objetivo por sí solo. */
  cubierto: boolean
  nota: string
}

/**
 * Cuántas pastillas complementan un plato para acercarse al objetivo del día,
 * sin pasar nunca del máximo suplementario que respalda la EFSA.
 */
export function complementarConPastillas(
  dhaComidaMg: number,
  pastillaMg: number,
  todayIso: string
): ComplementoDha {
  const objetivo = objetivoDhaDiario(todayIso)

  if (dhaComidaMg >= objetivo) {
    return {
      pastillas: 0,
      totalMg: dhaComidaMg,
      cubierto: true,
      nota: 'Este plato ya cubre el objetivo del día. La pastilla, para otro día.'
    }
  }
  if (pastillaMg <= 0) {
    return { pastillas: 0, totalMg: dhaComidaMg, cubierto: false, nota: '' }
  }

  const falta = objetivo - dhaComidaMg
  // Tres topes a la vez: lo que falta, el máximo de suplemento diario y el techo
  // total del día. Manda el más restrictivo.
  const porFalta = Math.ceil(falta / pastillaMg)
  const porSuplemento = Math.floor(DHA_LIMITS.maxSuplementoDiario / pastillaMg)
  const porTechoTotal = Math.floor((DHA_LIMITS.techoDiario - dhaComidaMg) / pastillaMg)
  const pastillas = Math.max(0, Math.min(porFalta, porSuplemento, porTechoTotal))
  const totalMg = dhaComidaMg + pastillas * pastillaMg

  let nota: string
  if (pastillas === 0) {
    nota =
      dhaComidaMg + pastillaMg > DHA_LIMITS.techoDiario
        ? 'Este plato ya te deja muy cerca del objetivo: una pastilla entera se pasaría del techo del día.'
        : 'Una pastilla entera se pasaría del suplemento diario que respalda la evidencia.'
  } else {
    const unidad = pastillas === 1 ? 'pastilla' : 'pastillas'
    nota = `Con ${pastillas} ${unidad} llegas a ${totalMg.toLocaleString('es-ES')} mg.`
    if (pastillas * pastillaMg >= DHA_LIMITS.maxSuplementoDiario) {
      nota += ' Es el máximo de suplemento al día; el resto, del mar.'
    }
  }
  return { pastillas, totalMg, cubierto: false, nota }
}
