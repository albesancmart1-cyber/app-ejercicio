import { compararConHistorial } from '../domain/comparacion'
import type { Session } from '../domain/types'

/**
 * El entreno de hoy frente al último comparable, en la tarjeta de sesión
 * completada. Un número sin referencia no es progreso ni deja de serlo; con la
 * sesión de la semana pasada al lado, sí.
 */
const FLECHA = { sube: '▲', igual: '=', baja: '▼', nuevo: '+' } as const

export default function ResumenComparado({
  session,
  sessions
}: {
  session: Session
  sessions: Session[]
}) {
  const c = compararConHistorial(session, sessions)
  if (!c) return null

  return (
    <div className="comparado">
      <p className="comparado-titular">{c.titular}</p>
      <div className="comparado-lista">
        {c.ejercicios.map((e) => (
          <div className="comparado-fila" key={e.exerciseId}>
            <span className={`comparado-flecha ${e.direccion}`} aria-hidden="true">
              {FLECHA[e.direccion]}
            </span>
            <div className="comparado-cuerpo">
              <span>{e.name}</span>
              <span className="faint">
                {e.detalle}
                {e.matiz ? ` — ${e.matiz}` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
