import { useEffect, useRef, useState } from 'react'

/**
 * Cuenta atrás del descanso entre series.
 *
 * Se calcula contra una marca de tiempo en vez de ir restando un contador: si el
 * móvil suspende la pestaña o se apaga la pantalla, al volver el tiempo restante
 * sigue siendo el correcto.
 */
export default function RestTimer({
  seconds,
  onDone,
  onSkip
}: {
  seconds: number
  onDone?: () => void
  onSkip: () => void
}) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000)
  const [restante, setRestante] = useState(seconds)
  // Crece con cada «+30 s», para que la barra de progreso siga cuadrando.
  const [total, setTotal] = useState(seconds)
  const avisado = useRef(false)

  useEffect(() => {
    const tick = () => {
      const queda = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setRestante(queda)
      if (queda === 0 && !avisado.current) {
        avisado.current = true
        // En iOS no existe: el encadenamiento opcional evita que reviente.
        navigator.vibrate?.([120, 60, 120])
        onDone?.()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt, onDone])

  const minutos = Math.floor(restante / 60)
  const segundos = restante % 60
  const progreso = Math.min(100, Math.max(0, (1 - restante / Math.max(1, total)) * 100))
  const terminado = restante === 0

  return (
    <div className="rest-timer fade-in">
      <div className="row">
        <span className="eyebrow" style={{ margin: 0 }}>
          {terminado ? 'Descanso terminado' : 'Descansando'}
        </span>
        <span className={`rest-clock ${terminado ? 'done' : ''}`}>
          {minutos}:{String(segundos).padStart(2, '0')}
        </span>
      </div>
      <div className="rest-track" aria-hidden="true">
        <div className="rest-fill" style={{ width: `${progreso}%` }} />
      </div>
      <div className="rest-actions">
        <button
          className="opt"
          onClick={() => {
            avisado.current = false
            setEndsAt((prev) => Math.max(Date.now(), prev) + 30_000)
            setTotal((prev) => prev + 30)
          }}
        >
          +30 s
        </button>
        <button className="opt" onClick={onSkip}>
          {terminado ? 'Seguir' : 'Saltar descanso'}
        </button>
      </div>
    </div>
  )
}
