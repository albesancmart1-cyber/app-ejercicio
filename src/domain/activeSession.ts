/**
 * Qué sesión está realmente en marcha.
 *
 * Buscarla solo por la fecha de hoy tiene un efecto feo: quien empiece a
 * entrenar a las 23:50 vería desaparecer su sesión a mitad de serie al dar las
 * doce. Por eso una sesión ya empezada sigue contando como activa durante unas
 * horas aunque el día haya cambiado.
 *
 * En cambio, una sesión que se preparó ayer y nunca se empezó **no** bloquea el
 * día nuevo: al entrar toca check-in otra vez, que es justo lo que se busca.
 */
import type { Session } from './types'

/** Margen para que un entreno que cruza la medianoche no se pierda. */
export const HORAS_ARRASTRE = 6

export function findActiveSession(
  sessions: Session[],
  todayIso: string,
  now: number = Date.now()
): Session | undefined {
  const candidatas = sessions.filter((s) => {
    if (s.completed) return false
    if (s.date === todayIso) return true
    // De otro día: solo si se empezó de verdad y sigue siendo razonablemente reciente.
    if (!s.startedAt) return false
    return now - s.startedAt < HORAS_ARRASTRE * 3600 * 1000
  })
  // La más reciente manda.
  return candidatas.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0) || (a.date < b.date ? 1 : -1))[0]
}
