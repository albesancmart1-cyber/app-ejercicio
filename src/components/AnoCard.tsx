import { useState } from 'react'
import { estadisticasDe, nombreDeMes } from '../domain/estadisticas'
import { NOMBRE_MARCA } from '../domain/records'
import { formatDuration } from './Chrono'
import SessionDetail from './SessionDetail'
import Icon from './Icon'
import type { Session } from '../domain/types'
import { escribirNumero } from '../domain/numeros'

/**
 * El año: los doce meses de un vistazo y lo que has conseguido.
 *
 * Existe por una razón concreta: el mes se olvida y el día no cuenta nada. Al
 * cabo de un año de entrenar, lo que uno quiere ver no es una media sino
 * **los hitos** —cuándo batiste cada marca— y la forma de la constancia: qué
 * meses apretaste y cuáles no.
 *
 * Nada de esto pide dato nuevo: sale entero del historial que ya hay.
 */
function mesesDelAno(todayIso: string): string[] {
  const [a, m] = todayIso.split('-').map(Number)
  return Array.from({ length: 12 }, (_, i) => {
    const total = a * 12 + (m - 1) - (11 - i)
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
  })
}

export default function AnoCard({
  sessions,
  todayIso
}: {
  sessions: Session[]
  todayIso: string
}) {
  const [abierta, setAbierta] = useState<string | null>(null)
  const meses = mesesDelAno(todayIso)
  const porMes = meses.map((primero) => ({
    primero,
    stats: estadisticasDe(sessions, {
      desde: primero,
      hasta: primero.slice(0, 8) + '31'
    })
  }))
  const maximo = Math.max(1, ...porMes.map((m) => m.stats.entrenos))

  const desde = meses[0]
  const total = estadisticasDe(sessions, { desde, hasta: todayIso })
  const completed = sessions.filter((s) => s.completed && s.date >= desde)

  const sesionAbierta = abierta ? sessions.find((s) => s.id === abierta) : undefined
  if (sesionAbierta) {
    return (
      <SessionDetail
        session={sesionAbierta}
        history={sessions}
        onClose={() => setAbierta(null)}
      />
    )
  }

  return (
    <>
      <div className="card">
        <p className="eyebrow">Los últimos doce meses</p>
        <div className="stat-row" style={{ marginTop: 4 }}>
          <span className="stat">
            <span className="stat-label">Entrenos</span>
            <span className="stat-value">{total.entrenos}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Series</span>
            <span className="stat-value">{escribirNumero(total.series)}</span>
          </span>
          {total.cargaTotal > 0 && (
            <span className="stat">
              <span className="stat-label">Levantado</span>
              <span className="stat-value">
                {Math.round(total.cargaTotal / 1000).toLocaleString('es-ES')}
                <small> t</small>
              </span>
            </span>
          )}
        </div>

        <div className="ano-meses" style={{ marginTop: 20 }}>
          {porMes.map((m) => (
            <div className="ano-mes" key={m.primero}>
              <div className="ano-track" aria-hidden="true">
                <div
                  className={`ano-bar ${m.stats.entrenos > 0 ? 'on' : ''}`}
                  style={{ height: `${Math.max(6, (m.stats.entrenos / maximo) * 100)}%` }}
                />
              </div>
              <span className="ano-ini">{nombreDeMes(m.primero).charAt(0).toUpperCase()}</span>
            </div>
          ))}
        </div>
        <p className="faint" style={{ marginTop: 10 }}>
          Entrenos por mes. Los meses flojos también cuentan la historia: casi siempre hay un
          motivo, y casi nunca es falta de ganas.
        </p>
      </div>

      {total.records.length > 0 && (
        <div className="card">
          <p className="eyebrow">Tus hitos del año</p>
          {total.records.slice(0, 12).map((r, i) => (
            <div className="hito" key={`${r.exerciseId}-${r.fecha}-${i}`}>
              <span className="hito-fecha">{r.fecha}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="item-title">{r.name}</div>
                <div className="item-meta">
                  {r.tipos.map((t) => NOMBRE_MARCA[t].toLowerCase()).join(', ')}
                </div>
              </div>
              <Icon name="spark" />
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <p className="eyebrow">Todos los entrenos</p>
        <p className="faint" style={{ marginBottom: 10 }}>
          Toca cualquiera para ver qué peso y qué repeticiones hiciste.
        </p>
        {completed.length === 0 ? (
          <p className="dim">Aún no hay nada registrado. Todo llegará, sin prisa.</p>
        ) : (
          [...completed]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 30)
            .map((s) => (
              <button className="item item-tap" key={s.id} onClick={() => setAbierta(s.id)}>
                <div className="item-body">
                  <div className="item-title">{s.title}</div>
                  <div className="item-meta">
                    {s.date}
                    {s.durationSec ? ` · ${formatDuration(s.durationSec)}` : ''}
                    {s.rpe ? ` · sensación ${s.rpe}/5` : ''}
                  </div>
                </div>
                <span className="chev" aria-hidden="true" />
              </button>
            ))
        )}
      </div>
    </>
  )
}
