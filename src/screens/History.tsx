import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../domain/types'
import { computeBalance, weeklySets } from '../domain/muscleBalance'
import { computeLeptinSignal } from '../domain/leptin'
import { WEEKLY_SETS } from '../domain/protocol'
import { todayIso, useAppData } from '../store/store'

function lastNDays(n: number): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    days.push(`${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return days
}

export default function History() {
  const data = useAppData()
  const today = todayIso()
  const balance = computeBalance(data.sessions, today)
  const week = weeklySets(data.sessions, today)
  const maxBalance = Math.max(0.1, ...MUSCLE_GROUPS.map((g) => balance[g]))
  const trained = new Set(data.sessions.filter((s) => s.completed).map((s) => s.date))
  const completed = data.sessions.filter((s) => s.completed)

  const strengthGroups = MUSCLE_GROUPS.filter((g) => g !== 'cardio')
  const covered = strengthGroups.filter((g) => week[g] >= WEEKLY_SETS.minimoEficaz).length
  const leptin = computeLeptinSignal(data.checkIns, today, data.profile?.goal)

  return (
    <div className="fade-in">
      <p className="eyebrow">Cómo vas</p>
      <h1>Tu cuerpo</h1>

      <div className="card" style={{ marginTop: 28 }}>
        <div className="row" style={{ alignItems: 'flex-end', marginBottom: 4 }}>
          <span className="score">
            {covered}
            <small> / {strengthGroups.length}</small>
          </span>
          <span className="tag">grupos cubiertos</span>
        </div>
        <p className="faint" style={{ marginTop: 10 }}>
          Con {WEEKLY_SETS.minimoEficaz} series semanales por grupo ya se sostiene el músculo. Lo que
          buscamos aquí no es acumular, es que no quede ninguno olvidado.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">Señal de leptina</p>
        {leptin.days === 0 ? (
          <p className="dim">{leptin.muscleNote}</p>
        ) : (
          <>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <span className="score">
                {leptin.score}
                <small> / 100</small>
              </span>
              <span className="tag accent">{leptin.level}</span>
            </div>
            <div className="meter" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={i < Math.round(leptin.score / 10) ? 'on' : ''} />
              ))}
            </div>
            <p className="dim" style={{ marginTop: 14 }}>
              {leptin.muscleNote}
            </p>
            {leptin.hurting.length > 0 && (
              <>
                <hr className="rule" />
                <p className="eyebrow">Lo que resta</p>
                <ul className="reasons">
                  {leptin.hurting.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </>
            )}
            {leptin.helping.length > 0 && (
              <>
                <hr className="rule" />
                <p className="eyebrow">Lo que suma</p>
                <ul className="reasons">
                  {leptin.helping.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="faint" style={{ marginTop: 14 }}>
              Calculado sobre {leptin.days} {leptin.days === 1 ? 'día' : 'días'} de la última semana.
              La leptina responde a patrones, no a una noche suelta.
            </p>
          </>
        )}
      </div>

      <div className="card">
        <p className="eyebrow">Balance muscular</p>
        {MUSCLE_GROUPS.map((g) => {
          const pct = Math.round((balance[g] / maxBalance) * 100)
          return (
            <div className="bar" key={g}>
              <span className="bar-label">{MUSCLE_LABELS[g]}</span>
              <div className="bar-track">
                <div className={`bar-fill ${pct < 30 ? 'low' : ''}`} style={{ width: `${Math.max(3, pct)}%` }} />
              </div>
            </div>
          )
        })}
        <p className="faint" style={{ marginTop: 14 }}>
          Últimos 14 días. Los más cortos son los que la app pondrá primero en tus próximos entrenos.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">Cuatro semanas</p>
        <div className="calendar">
          {lastNDays(28).map((d) => (
            <div key={d} className={`day ${trained.has(d) ? 'on' : ''} ${d === today ? 'now' : ''}`}>
              {Number(d.slice(8))}
            </div>
          ))}
        </div>
        <p className="faint" style={{ marginTop: 14 }}>
          Los huecos también forman parte del camino.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">Sesiones</p>
        {completed.length === 0 ? (
          <p className="dim">Aún no hay nada registrado. Todo llegará, sin prisa.</p>
        ) : (
          [...completed]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 12)
            .map((s) => (
              <div className="item" key={s.id}>
                <div className="item-body">
                  <div className="item-title">{s.title}</div>
                  <div className="item-meta">
                    {s.date}
                    {s.rpe ? ` · sensación ${s.rpe}/5` : ''}
                    {s.cardioMinutes ? ` · ${s.cardioMinutes} min` : ''}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
