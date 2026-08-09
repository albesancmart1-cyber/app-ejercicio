import { diasDeLaSemana } from '../domain/semana'
import type { Session } from '../domain/types'

/**
 * Los siete últimos días, en una tira.
 *
 * Da contexto sin ocupar sitio: entre «hoy» y «el mes» faltaba la unidad en la
 * que uno piensa de verdad. La altura de cada barra son las series de ese día,
 * así que se ve de un vistazo si la semana va equilibrada o si el martes se
 * hizo el triple que el jueves.
 *
 * Los días sin entrenar no se dejan en blanco ni se pintan de rojo: se enseñan
 * apagados. Descansar es parte del trabajo, no un hueco.
 */
export default function WeekStrip({
  sessions,
  todayIso,
  onOpen
}: {
  sessions: Session[]
  todayIso: string
  onOpen?: () => void
}) {
  const dias = diasDeLaSemana(sessions, todayIso)
  const maximo = Math.max(4, ...dias.map((d) => d.series))
  const entrenados = dias.filter((d) => d.entrenado).length

  const contenido = (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="eyebrow" style={{ margin: 0 }}>
          Tu semana
        </span>
        <span className="faint">
          {entrenados} {entrenados === 1 ? 'día' : 'días'}
        </span>
      </div>
      <div className="week-strip">
        {dias.map((d) => (
          <div className="week-day" key={d.fecha}>
            <div className="week-track" aria-hidden="true">
              <div
                className={`week-bar ${d.entrenado ? 'on' : ''} ${d.esHoy ? 'hoy' : ''}`}
                style={{ height: d.entrenado ? `${Math.max(22, (d.series / maximo) * 100)}%` : '18%' }}
              />
            </div>
            <span className={`week-ini ${d.esHoy ? 'hoy' : ''}`}>{d.inicial}</span>
          </div>
        ))}
      </div>
    </>
  )

  if (!onOpen) return <div className="card week-card">{contenido}</div>

  return (
    <button className="card week-card week-tap" onClick={onOpen} aria-label="Ver tu semana">
      {contenido}
    </button>
  )
}
