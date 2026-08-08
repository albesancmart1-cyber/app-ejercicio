/**
 * Lo que el usuario ajusta de cada ejercicio y quiere que se recuerde.
 *
 * Tres cosas pequeñas que en una app de entreno marcan la diferencia entre
 * pelearse con la herramienta y olvidarse de ella: cuánto descansa **él** en
 * ese ejercicio, la nota que se apunta para no volver a buscar el agujero del
 * asiento, y no tener que desbloquear el móvil cada serie.
 *
 * Van en el perfil y no en la sesión a propósito: no describen lo que pasó un
 * día, describen cómo entrena esta persona. Por eso sobreviven a la sesión y se
 * aplican a la siguiente sin que haya que repetirlas.
 */
import type { Profile } from './types'

/** Descansos razonables entre los que elegir, en segundos. */
export const DESCANSOS = [45, 60, 90, 120, 180, 240] as const

export function formatDescanso(segundos: number): string {
  if (segundos < 60) return `${segundos} s`
  const min = Math.floor(segundos / 60)
  const resto = segundos % 60
  return resto === 0 ? `${min}′` : `${min}′${resto}″`
}

/**
 * El descanso que toca para este ejercicio: lo que haya elegido el usuario, y
 * si no, lo que propuso el protocolo al construir la sesión.
 */
export function descansoDe(
  profile: Profile | null | undefined,
  exerciseId: string,
  porDefecto: number | undefined
): number | undefined {
  const propio = profile?.restOverrides?.[exerciseId]
  return typeof propio === 'number' && propio > 0 ? propio : porDefecto
}

export function conDescanso(profile: Profile, exerciseId: string, segundos: number): Profile {
  return { ...profile, restOverrides: { ...(profile.restOverrides ?? {}), [exerciseId]: segundos } }
}

/** Quitar el ajuste devuelve el ejercicio a lo que diga el protocolo. */
export function sinDescanso(profile: Profile, exerciseId: string): Profile {
  const resto = { ...(profile.restOverrides ?? {}) }
  delete resto[exerciseId]
  return { ...profile, restOverrides: resto }
}

export function notaDe(profile: Profile | null | undefined, exerciseId: string): string {
  return profile?.exerciseNotes?.[exerciseId] ?? ''
}

/** Guardar una nota vacía es borrarla: no se acumulan cadenas en blanco. */
export function conNota(profile: Profile, exerciseId: string, texto: string): Profile {
  const notas = { ...(profile.exerciseNotes ?? {}) }
  const limpio = texto.trim()
  if (limpio) notas[exerciseId] = limpio
  else delete notas[exerciseId]
  return { ...profile, exerciseNotes: notas }
}
