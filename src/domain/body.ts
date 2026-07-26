/**
 * Composición corporal a partir de lo que da una báscula de bioimpedancia.
 *
 * La báscula devuelve porcentajes; aquí se pasan a kilos, que es lo único que
 * permite ver si estás recomponiendo. Dos precisiones que evitan malinterpretar
 * los números:
 *
 * - **Masa muscular y masa libre de grasa no son lo mismo.** La masa libre de
 *   grasa es todo lo que no es grasa: músculo, hueso, órganos y agua. Siempre es
 *   mayor que la muscular, así que ver las dos por separado evita creer que se
 *   ha ganado músculo cuando lo que ha subido es agua.
 * - **La bioimpedancia tiene un error del orden de ±3–5 %** y depende muchísimo
 *   del estado de hidratación. Una lectura suelta no significa nada; la
 *   tendencia entre varias medidas tomadas en las mismas condiciones, sí.
 *
 * El FFMI (índice de masa libre de grasa) normaliza la masa magra por la altura,
 * y su versión ajustada la corrige a 1,80 m con la fórmula habitual para poder
 * comparar entre estaturas distintas.
 */
import type { BodyMeasurement } from './types'

/** Rangos fisiológicamente plausibles para una lectura de báscula. */
export const RANGOS = {
  pesoKg: { min: 25, max: 350 },
  grasaPct: { min: 2, max: 70 },
  musculoPct: { min: 10, max: 70 },
  alturaCm: { min: 120, max: 230 }
}

export interface BodyComposition {
  weightKg: number
  /** Kilos de grasa. */
  fatKg?: number
  /** Kilos de músculo, según lo que reporte la báscula. */
  muscleKg?: number
  /** Peso menos grasa: incluye músculo, hueso, órganos y agua. */
  leanKg?: number
  /** Masa libre de grasa dividida por la altura al cuadrado. */
  ffmi?: number
  /** FFMI corregido a 1,80 m de estatura. */
  ffmiAdjusted?: number
}

function redondear(n: number, decimales = 1): number {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

function enRango(valor: number | undefined, r: { min: number; max: number }): boolean {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= r.min && valor <= r.max
}

/** ¿Es una lectura que tiene sentido físico? */
export function esMedicionValida(m: BodyMeasurement): boolean {
  if (!enRango(m.weightKg, RANGOS.pesoKg)) return false
  if (m.fatPercent !== undefined && !enRango(m.fatPercent, RANGOS.grasaPct)) return false
  if (m.musclePercent !== undefined && !enRango(m.musclePercent, RANGOS.musculoPct)) return false
  // Grasa y músculo no pueden sumar más que el cuerpo entero.
  if (m.fatPercent !== undefined && m.musclePercent !== undefined) {
    if (m.fatPercent + m.musclePercent > 100) return false
  }
  return true
}

export function computeComposition(m: BodyMeasurement, heightCm?: number): BodyComposition {
  const composicion: BodyComposition = { weightKg: m.weightKg }

  if (m.fatPercent !== undefined) {
    composicion.fatKg = redondear((m.weightKg * m.fatPercent) / 100)
    composicion.leanKg = redondear(m.weightKg - composicion.fatKg)
  }
  if (m.musclePercent !== undefined) {
    composicion.muscleKg = redondear((m.weightKg * m.musclePercent) / 100)
  }

  if (composicion.leanKg !== undefined && enRango(heightCm, RANGOS.alturaCm)) {
    const alturaM = heightCm! / 100
    const ffmi = composicion.leanKg / (alturaM * alturaM)
    composicion.ffmi = redondear(ffmi)
    // Corrección habitual para comparar entre estaturas distintas.
    composicion.ffmiAdjusted = redondear(ffmi + 6.1 * (1.8 - alturaM))
  }

  return composicion
}

export interface CompositionDelta {
  weightKg: number
  fatKg?: number
  muscleKg?: number
  leanKg?: number
  /** Grasa abajo y músculo arriba a la vez: recomposición de libro. */
  recomposicion: boolean
}

/** Diferencia entre dos lecturas, de la antigua a la nueva. */
export function compareComposition(
  actual: BodyComposition,
  anterior: BodyComposition
): CompositionDelta {
  const dif = (a?: number, b?: number) =>
    a !== undefined && b !== undefined ? redondear(a - b) : undefined

  const fatKg = dif(actual.fatKg, anterior.fatKg)
  const muscleKg = dif(actual.muscleKg, anterior.muscleKg)

  return {
    weightKg: redondear(actual.weightKg - anterior.weightKg),
    fatKg,
    muscleKg,
    leanKg: dif(actual.leanKg, anterior.leanKg),
    recomposicion: fatKg !== undefined && muscleKg !== undefined && fatKg < 0 && muscleKg > 0
  }
}

/** Mediciones ordenadas de la más reciente a la más antigua. */
export function sortMeasurements(measurements: BodyMeasurement[]): BodyMeasurement[] {
  return [...measurements].sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Formatea una variación con su signo, para mostrarla tal cual. */
export function formatDelta(valor: number | undefined, unidad = 'kg'): string {
  if (valor === undefined) return '—'
  const signo = valor > 0 ? '+' : ''
  return `${signo}${valor.toLocaleString('es-ES')} ${unidad}`
}
