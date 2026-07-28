/**
 * Landmarks de volumen: los de fábrica, los que edita el usuario, y lo que
 * cambia cuando se entrena en déficit.
 *
 * **Fase de déficit.** Cuando la energía disponible baja, el volumen alto deja
 * de pagar: en un déficit controlado, 20 series semanales de cuádriceps no
 * preservaron más masa magra que 12 (Roth et al., 2023). Así que en déficit el
 * MAV se recorta a `MAV_TOPE_DEFICIT` para todos los músculos —no tiene sentido
 * empujar hacia una banda que ahí no rinde— y el mínimo baja al de
 * mantenimiento: alrededor de un tercio del volumen de acumulación basta para
 * conservar lo ganado (Bickel et al., 2011). Entrenar menos y mejor en esa fase
 * no es conformarse; es lo que dice la evidencia.
 */
import { ALL_MUSCLES, MUSCLES } from './muscles'
import type { Muscle, VolumeLandmarks } from './muscles'

/** Tope de MAV en déficit, en series fraccionales por semana. */
export const MAV_TOPE_DEFICIT = 12

/** Fracción del volumen de acumulación que basta para mantener. */
export const FRACCION_MANTENIMIENTO = 1 / 3

export type LandmarkOverrides = Partial<Record<Muscle, Partial<VolumeLandmarks>>>

export interface LandmarkOpts {
  /** Ajustes del usuario, que mandan sobre los de fábrica. */
  overrides?: LandmarkOverrides
  /** El usuario ha marcado que está en fase de déficit. */
  deficit?: boolean
}

/** Los de fábrica, tal cual. */
export function defaultLandmarks(muscle: Muscle): VolumeLandmarks {
  return { ...MUSCLES[muscle].landmarks }
}

/**
 * Los que valen ahora mismo: fábrica → ajustes del usuario → fase de déficit.
 * El orden importa: el déficit se aplica **al final**, así que recorta también
 * lo que el usuario haya subido a mano. Es una salvaguarda, no una preferencia.
 */
export function landmarksFor(muscle: Muscle, opts: LandmarkOpts = {}): VolumeLandmarks {
  const base = defaultLandmarks(muscle)
  const propio = opts.overrides?.[muscle]
  let l: VolumeLandmarks = propio ? { ...base, ...propio } : base

  if (opts.deficit) {
    const mavMax = Math.min(l.mavMax, MAV_TOPE_DEFICIT)
    const mavMin = Math.min(l.mavMin, mavMax)
    l = {
      // El mínimo pasa a ser el de mantenimiento, no el de crecer.
      mev: Math.max(1, Math.round(base.mavMin * FRACCION_MANTENIMIENTO)),
      mavMin,
      mavMax,
      mrv: Math.min(l.mrv, mavMax)
    }
  }
  return l
}

export function allLandmarks(opts: LandmarkOpts = {}): Record<Muscle, VolumeLandmarks> {
  return Object.fromEntries(ALL_MUSCLES.map((m) => [m, landmarksFor(m, opts)])) as Record<
    Muscle,
    VolumeLandmarks
  >
}

/** Los ajustes del usuario, validados: sin cifras absurdas ni orden imposible. */
export function sanearOverride(parcial: Partial<VolumeLandmarks>, base: VolumeLandmarks): Partial<VolumeLandmarks> {
  const l = { ...base, ...parcial }
  const limpio = (n: number) => Math.max(0, Math.min(60, Math.round(n * 2) / 2))
  const mev = limpio(l.mev)
  const mavMin = Math.max(mev, limpio(l.mavMin))
  const mavMax = Math.max(mavMin, limpio(l.mavMax))
  const mrv = Math.max(mavMax, limpio(l.mrv))
  return { mev, mavMin, mavMax, mrv }
}

/** Por qué los landmarks son los que son ahora mismo, en una frase. */
export function explicarLandmarks(opts: LandmarkOpts = {}): string | null {
  if (!opts.deficit) return null
  return `Estás en fase de déficit, así que el objetivo se recorta a ${MAV_TOPE_DEFICIT} series por músculo: con menos energía disponible, pasar de ahí no conserva más músculo y sí acumula más fatiga.`
}
