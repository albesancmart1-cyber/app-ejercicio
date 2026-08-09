import { useEffect, useRef, useState } from 'react'
import { sonarAlarma } from '../store/alarma'

/**
 * El descanso, a pantalla completa.
 *
 * Antes era una tira de cuarenta píxeles debajo de la serie marcada. Pero son
 * **dos minutos de cada cinco**: la cuarta parte del tiempo que uno pasa dentro
 * de la app, y no tenía sitio propio. Aquí se convierte en lo que es —un
 * momento— y se aprovecha para las tres cosas que hacen falta en él:
 *
 *  - Cuánto queda, legible con el móvil apoyado en el banco y a un metro.
 *  - Qué acabas de hacer, que es justo cuando te acuerdas de que pusiste 9 y no
 *    10; por eso se puede volver a la serie de un toque.
 *  - Qué viene después, para ir montando la barra mientras esperas.
 *
 * La cuenta va contra una marca de tiempo y no restando un contador: si el
 * móvil suspende la pestaña o se bloquea la pantalla, al volver el tiempo
 * restante sigue siendo el correcto.
 */
export interface HechoAhora {
  weightKg?: number
  reps?: number
  rir?: number
  /** Lo mismo de la última vez, para comparar sin salir de aquí. */
  previo?: string
}

const RADIO = 104
const PERIMETRO = 2 * Math.PI * RADIO

export default function RestScreen({
  seconds,
  hecho,
  siguiente,
  conAlarma = true,
  onCorregir,
  onSkip
}: {
  seconds: number
  hecho?: HechoAhora
  /** Qué toca después: etiqueta de superserie, nombre y detalle. */
  siguiente?: { etiqueta?: string; nombre: string; detalle?: string }
  /** Sonar al llegar a cero. Se puede apagar desde el perfil. */
  conAlarma?: boolean
  onCorregir?: () => void
  onSkip: () => void
}) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000)
  const [restante, setRestante] = useState(seconds)
  const [total, setTotal] = useState(seconds)
  const avisado = useRef(false)

  useEffect(() => {
    const tick = () => {
      const queda = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      setRestante(queda)
      if (queda === 0 && !avisado.current) {
        avisado.current = true
        // Los dos avisos, y en este orden: el sonido es el que se oye con el
        // móvil boca abajo en el banco; la vibración es el respaldo para
        // cuando lo llevas encima o el audio está bloqueado.
        if (conAlarma) sonarAlarma()
        // En iOS no existe: el encadenamiento opcional evita que reviente.
        navigator.vibrate?.([120, 60, 120])
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt, conAlarma])

  const minutos = Math.floor(restante / 60)
  const segundos = restante % 60
  const terminado = restante === 0
  const proporcion = Math.max(0, Math.min(1, restante / Math.max(1, total)))

  const totalMin = Math.floor(total / 60)
  const totalSeg = total % 60

  return (
    <div className="rest-screen fade-in">
      <p className="eyebrow" style={{ color: 'var(--accent)', textAlign: 'center' }}>
        {terminado ? 'Descanso terminado' : 'Descanso'}
      </p>

      <svg
        viewBox="0 0 240 240"
        className="rest-ring"
        role="img"
        aria-label={`Quedan ${minutos} minutos y ${segundos} segundos de descanso`}
      >
        <circle cx="120" cy="120" r={RADIO} fill="none" stroke="var(--fill-3)" strokeWidth="12" />
        <circle
          cx="120"
          cy="120"
          r={RADIO}
          fill="none"
          stroke={terminado ? 'var(--st-fresco)' : 'var(--accent)'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={PERIMETRO}
          strokeDashoffset={PERIMETRO * (1 - proporcion)}
          transform="rotate(-90 120 120)"
          style={{ transition: 'stroke-dashoffset .25s linear' }}
        />
        <text x="120" y="130" textAnchor="middle" className="rest-ring-num">
          {minutos}:{String(segundos).padStart(2, '0')}
        </text>
        <text x="120" y="158" textAnchor="middle" className="rest-ring-cap">
          de {totalMin}:{String(totalSeg).padStart(2, '0')}
        </text>
      </svg>

      {hecho && (hecho.reps !== undefined || hecho.weightKg !== undefined) && (
        <div className="card rest-hecho">
          <p className="eyebrow">Acabas de hacer</p>
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="rest-hecho-num">
              {hecho.weightKg !== undefined ? `${hecho.weightKg} kg × ${hecho.reps ?? '—'}` : `${hecho.reps ?? '—'} reps`}
            </span>
            {hecho.rir !== undefined && <span className="tag">RIR {hecho.rir}</span>}
          </div>
          {hecho.previo && (
            <p className="faint" style={{ marginTop: 8 }}>
              La última vez: {hecho.previo}.
            </p>
          )}
          {onCorregir && (
            <button className="btn-quiet" style={{ marginTop: 10 }} onClick={onCorregir}>
              Corregir la serie
            </button>
          )}
        </div>
      )}

      {siguiente && (
        <div style={{ marginTop: 16 }}>
          <p className="eyebrow">Después</p>
          <div className="card rest-siguiente">
            {siguiente.etiqueta && <span className="ss-tag">{siguiente.etiqueta}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="item-title">{siguiente.nombre}</div>
              {siguiente.detalle && <div className="item-meta">{siguiente.detalle}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="spacer-flex" />

      <div className="rest-botones">
        <button
          className="btn btn-secondary"
          onClick={() => {
            avisado.current = false
            setEndsAt((prev) => Math.max(Date.now(), prev) + 30_000)
            setTotal((prev) => prev + 30)
          }}
        >
          +30 s
        </button>
        <button className={terminado ? 'btn btn-primary' : 'btn btn-secondary'} onClick={onSkip}>
          {terminado ? 'Seguir' : 'Saltar descanso'}
        </button>
      </div>
    </div>
  )
}
