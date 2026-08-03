/**
 * Lo que la app aprende de lo que aceptas y de lo que descartas.
 *
 * Marcar favoritos a mano funciona, pero es trabajo, y el propósito de esto es
 * no tener que pensar. Así que además se aprende de lo que ya haces: cada
 * ejercicio que entrenas suma, y cada uno que cambias por otro resta. Con eso,
 * la próxima vez que haga falta uno de esos músculos, los que te gustan salen
 * antes que los que no.
 *
 * Es deliberadamente lento y acotado. Un solo cambio no condena a un ejercicio
 * —puede que ese día no tuvieras sitio, o que te doliera algo— y una sola sesión
 * no lo consagra. Hace falta repetirlo, y ni el mejor ni el peor se salen de la
 * banda: la afinidad no puede tapar lo que de verdad decide qué toca hoy, que es
 * qué músculo lleva más tiempo sin trabajarse.
 */
import type { Profile, Session } from './types'

/** Tope de la escala, arriba y abajo. */
export const AFINIDAD_MAX = 3

export type Afinidades = Record<string, number>

export function afinidadDe(profile: Profile | null | undefined, exerciseId: string): number {
  return profile?.exerciseAffinity?.[exerciseId] ?? 0
}

function acotar(n: number): number {
  return Math.max(-AFINIDAD_MAX, Math.min(AFINIDAD_MAX, n))
}

/** Suma `delta` a un ejercicio, dentro de la banda. Devuelve el mapa entero. */
export function conAfinidad(
  actuales: Afinidades | undefined,
  cambios: Record<string, number>
): Afinidades {
  const siguiente: Afinidades = { ...(actuales ?? {}) }
  for (const [id, delta] of Object.entries(cambios)) {
    const valor = acotar((siguiente[id] ?? 0) + delta)
    if (valor === 0) delete siguiente[id]
    else siguiente[id] = valor
  }
  return siguiente
}

/**
 * Has cambiado este ejercicio por otro: baja el descartado y sube el que te
 * quedas. El que entra sube menos de lo que baja el que sale, porque quedarse
 * con lo primero que aparece dice menos que rechazar algo activamente.
 */
export function trasCambiar(profile: Profile, descartado: string, elegido?: string): Afinidades {
  const cambios: Record<string, number> = { [descartado]: -1 }
  if (elegido && elegido !== descartado) cambios[elegido] = 0.5
  return conAfinidad(profile.exerciseAffinity, cambios)
}

/**
 * Has entrenado esta sesión: los ejercicios que hiciste suben.
 *
 * Solo los que tienen alguna serie marcada. Uno que aparece en el plan y se
 * queda sin tocar no dice nada bueno del ejercicio, así que no suma.
 */
export function trasEntrenar(profile: Profile, session: Session): Afinidades {
  const cambios: Record<string, number> = {}
  for (const pe of session.exercises) {
    if (pe.primary === 'cardio') continue
    const hecho = pe.logs ? pe.logs.some((l) => l.done) : pe.done === true
    if (hecho) cambios[pe.exerciseId] = (cambios[pe.exerciseId] ?? 0) + 0.5
  }
  return conAfinidad(profile.exerciseAffinity, cambios)
}

/**
 * Cuánto pesa un ejercicio a la hora de proponerlo, de mayor a menor.
 *
 * Un favorito marcado a mano manda sobre lo aprendido: es una preferencia
 * declarada y no una deducción. Después la afinidad, y por último el desempate
 * que traiga cada sitio.
 */
export function pesoDePreferencia(profile: Profile | null | undefined, exerciseId: string): number {
  const favorito = profile?.favoriteExercises?.includes(exerciseId) ? 10 : 0
  return favorito + afinidadDe(profile, exerciseId)
}
