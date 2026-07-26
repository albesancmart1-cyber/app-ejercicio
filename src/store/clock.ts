/**
 * El día de la app.
 *
 * Todo lo que hace Ritmo cuelga de «qué día es hoy»: el check-in, la sesión, el
 * objetivo de DHA. Calcular la fecha al renderizar no basta, porque nada obliga
 * a volver a renderizar cuando pasa la medianoche: con la app abierta o
 * recuperada de segundo plano —lo normal en el móvil— seguiría creyendo que es
 * ayer y daría el check-in por hecho.
 *
 * Aquí el día es una fuente externa a la que los componentes se suscriben, y que
 * se actualiza en tres momentos:
 *  - justo al cruzar la medianoche, con un temporizador ajustado al milisegundo
 *    que falta (no un sondeo cada minuto);
 *  - al volver a la app desde segundo plano, porque el temporizador puede no
 *    haber corrido mientras el móvil dormía;
 *  - al recuperar el foco de la ventana.
 */
import { useSyncExternalStore } from 'react'

/** Fecha local en ISO, que es como se guardan check-ins y sesiones. */
export function todayIsoAt(now: Date): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

/** Milisegundos que faltan para la próxima medianoche local. */
export function msUntilNextMidnight(now: Date): number {
  const manana = new Date(now)
  manana.setHours(24, 0, 0, 0)
  return Math.max(0, manana.getTime() - now.getTime())
}

let actual = todayIsoAt(new Date())
const listeners = new Set<() => void>()
let temporizador: ReturnType<typeof setTimeout> | undefined

function comprobar() {
  const nuevo = todayIsoAt(new Date())
  if (nuevo !== actual) {
    actual = nuevo
    listeners.forEach((l) => l())
  }
}

function programarMedianoche() {
  if (temporizador !== undefined) clearTimeout(temporizador)
  // Un segundo de margen para caer del lado correcto del cambio de día.
  temporizador = setTimeout(() => {
    comprobar()
    programarMedianoche()
  }, msUntilNextMidnight(new Date()) + 1000)
}

function despertar() {
  comprobar()
  programarMedianoche()
}

function suscribir(listener: () => void): () => void {
  const primero = listeners.size === 0
  listeners.add(listener)
  if (primero) {
    programarMedianoche()
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', despertar)
      window.addEventListener('focus', despertar)
    }
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      if (temporizador !== undefined) clearTimeout(temporizador)
      temporizador = undefined
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', despertar)
        window.removeEventListener('focus', despertar)
      }
    }
  }
}

/** El día de hoy, que se actualiza solo al cruzar la medianoche. */
export function useToday(): string {
  return useSyncExternalStore(suscribir, () => actual, () => actual)
}
