import { explicarSemana, resumenDeSemana } from '../domain/semana'
import type { LandmarkOpts } from '../domain/landmarks'
import type { Session } from '../domain/types'
import WeekStrip from './WeekStrip'

/**
 * La semana, con lo que llevas y lo que falta.
 *
 * La app saltaba del día al mes, pero **el volumen se planifica por semanas**:
 * las diez o veinte series por músculo son semanales, no diarias. Así que la
 * pregunta más frecuente de quien progresa no tenía dónde responderse.
 *
 * Y responde lo que ningún registro responde: no cuándo entrenaste —eso ya lo
 * cuentan la tira de Hoy y el mes— sino **qué te falta**. La diferencia entre
 * una app que apunta y una que entrena está justo ahí.
 */
export default function SemanaCard({
  sessions,
  todayIso,
  opts
}: {
  sessions: Session[]
  todayIso: string
  opts?: LandmarkOpts
}) {
  const r = resumenDeSemana(sessions, todayIso, opts)
  const masVale = Math.max(1, ...r.zonas.map((z) => z.maximo))

  const diferencia = r.series - r.seriesPrevias

  return (
    <>
      <WeekStrip sessions={sessions} todayIso={todayIso} />

      <div className="card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <span className="stat">
            <span className="stat-label">Series de la semana</span>
            <span className="stat-value">{r.series}</span>
          </span>
          {r.seriesPrevias > 0 && (
            <span className={`tag ${diferencia >= 0 ? 'accent' : ''}`}>
              {diferencia === 0
                ? 'igual que la semana pasada'
                : `${diferencia > 0 ? '+' : '−'}${Math.abs(diferencia)} frente a la semana pasada`}
            </span>
          )}
        </div>
        <p className="dim" style={{ marginTop: 12 }}>
          {explicarSemana(r)}
        </p>

        <hr className="rule" />
        <p className="eyebrow">Qué falta por trabajar</p>
        {r.zonas.map((z) => (
          <div className="zona" key={z.grupo}>
            <div className="row">
              <span className="zona-nombre">{z.nombre}</span>
              <span className="faint">
                {z.series} / {z.minimo} series
              </span>
            </div>
            <div className="zona-track" aria-hidden="true">
              {/* El mínimo marcado sobre la barra: sin la referencia, una barra
                  al 60 % no dice si vas bien o mal. */}
              <span className="zona-minimo" style={{ left: `${(z.minimo / masVale) * 100}%` }} />
              <div
                className={`zona-fill ${z.estado}`}
                style={{ width: `${Math.min(100, (z.series / masVale) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        <p className="faint" style={{ marginTop: 14 }}>
          La marca sobre cada barra es el mínimo que esa zona necesita a la semana para progresar.
          Pasarse de vez en cuando no rompe nada; quedarse corto todas las semanas, sí.
        </p>
      </div>

      {r.masCorta && (
        <div className="card">
          <p className="eyebrow">Lo que voy a proponerte</p>
          <p className="dim">
            {r.masCorta.nombre} va corto esta semana. En cuanto el cuerpo lo permita, la próxima
            sesión abrirá por ahí — salvo que el descanso, una molestia o la fatiga digan otra cosa,
            que en esta app siempre mandan.
          </p>
        </div>
      )}
    </>
  )
}
