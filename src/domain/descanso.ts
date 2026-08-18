import type { DescansoEnCurso } from './types'

/**
 * El descanso entre series, como dato y no como pantalla.
 *
 * Antes la cuenta atrás vivía dentro del componente que la dibujaba, y eso
 * tenía tres consecuencias que se notaban entrenando:
 *
 *  - Salirse del descanso —a corregir la serie, o a mirar otra pestaña— lo
 *    mataba, y al volver ya no había descanso ni forma de recuperarlo.
 *  - El aviso de los cero segundos solo sonaba si estabas mirando esa pantalla.
 *    Justo el caso en que menos falta hace.
 *  - Cerrar la app perdía la cuenta.
 *
 * Aquí el descanso es un dato con una marca de tiempo absoluta: se guarda con
 * la sesión, se recupera al volver y lo que queda se calcula restando al reloj.
 * Si el móvil suspende la pestaña o se bloquea la pantalla, al volver el tiempo
 * restante sigue siendo el correcto.
 */

/** Lo que se añade o se quita de un toque. */
export const SALTO_SEGUNDOS = 30

/**
 * Pasado este rato desde que acabó, un descanso guardado ya no se recupera.
 *
 * Volver a la app diez minutos después no es volver de un descanso: es volver
 * de otra cosa. Reaparecer con un «descanso terminado» de hace media hora sería
 * ruido, y peor: taparía la serie que toca.
 */
export const OLVIDO_SEGUNDOS = 10 * 60

/** Arranca un descanso de `segundos` a partir de ahora. */
export function empezarDescanso(
  exercise: number,
  set: number,
  segundos: number,
  nextName?: string,
  ahora: number = Date.now()
): DescansoEnCurso {
  const total = Math.max(0, Math.round(segundos))
  return { exercise, set, endsAt: ahora + total * 1000, totalSeconds: total, nextName }
}

/** Lo que queda, en segundos. Nunca negativo. */
export function segundosRestantes(d: DescansoEnCurso, ahora: number = Date.now()): number {
  return Math.max(0, Math.round((d.endsAt - ahora) / 1000))
}

/** ¿Ya ha llegado a cero? */
export function haTerminado(d: DescansoEnCurso, ahora: number = Date.now()): boolean {
  return segundosRestantes(d, ahora) === 0
}

/** Cuánto queda del anillo, entre 0 y 1. */
export function proporcionRestante(d: DescansoEnCurso, ahora: number = Date.now()): number {
  if (d.totalSeconds <= 0) return 0
  return Math.max(0, Math.min(1, segundosRestantes(d, ahora) / d.totalSeconds))
}

/**
 * Suma o resta tiempo.
 *
 * Al restar solo se quita lo que de verdad queda: pedir treinta segundos menos
 * cuando faltan diez deja el descanso en cero, no en menos veinte. Y el total
 * se mueve con él, que es lo que mantiene el anillo diciendo la verdad.
 */
export function ajustar(
  d: DescansoEnCurso,
  deltaSegundos: number,
  ahora: number = Date.now()
): DescansoEnCurso {
  const restante = segundosRestantes(d, ahora)
  if (deltaSegundos >= 0) {
    // Sobre lo que quede, no sobre un final ya pasado: añadir treinta segundos
    // a un descanso terminado hace dos minutos son treinta segundos desde ahora.
    const base = Math.max(ahora, d.endsAt)
    return { ...d, endsAt: base + deltaSegundos * 1000, totalSeconds: d.totalSeconds + deltaSegundos }
  }
  const quitado = Math.min(-deltaSegundos, restante)
  return {
    ...d,
    endsAt: d.endsAt - quitado * 1000,
    totalSeconds: Math.max(1, d.totalSeconds - quitado)
  }
}

/**
 * El descanso guardado que merece la pena recuperar al volver a la app.
 * Los que acabaron hace mucho se dejan ir.
 */
export function recuperarDescanso(
  d: DescansoEnCurso | undefined,
  ahora: number = Date.now()
): DescansoEnCurso | undefined {
  if (!d) return undefined
  if ((ahora - d.endsAt) / 1000 > OLVIDO_SEGUNDOS) return undefined
  return d
}

/** «1:12» — lo que se lee en el anillo y en el botón de volver. */
export function reloj(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
