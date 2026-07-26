import { useEffect, useState } from 'react'

/** Segundos transcurridos desde una marca de tiempo. */
export function elapsedSeconds(startedAt: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const dosDigitos = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${dosDigitos(m)}:${dosDigitos(s)}` : `${m}:${dosDigitos(s)}`
}

/**
 * Cronómetro de la sesión.
 *
 * Cuenta contra la marca de tiempo guardada en la propia sesión, no con un
 * contador que se va incrementando: como la sesión se persiste, cerrar la app a
 * mitad del entreno y volver no pierde la cuenta, y suspender la pestaña
 * tampoco la retrasa.
 */
export default function Chrono({ startedAt }: { startedAt: number }) {
  const [segundos, setSegundos] = useState(() => elapsedSeconds(startedAt))

  useEffect(() => {
    const tick = () => setSegundos(elapsedSeconds(startedAt))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <span className="chrono" aria-label="Tiempo de entrenamiento">
      {formatDuration(segundos)}
    </span>
  )
}
