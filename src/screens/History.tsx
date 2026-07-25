import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../domain/types'
import { computeBalance } from '../domain/muscleBalance'
import { todayIso, useAppData } from '../store/store'

function lastNDays(n: number): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${d.getFullYear()}-${m}-${day}`)
  }
  return days
}

export default function History() {
  const data = useAppData()
  const today = todayIso()
  const balance = computeBalance(data.sessions, today)
  const maxBalance = Math.max(0.1, ...MUSCLE_GROUPS.map((g) => balance[g]))
  const days = lastNDays(28)
  const trainedDates = new Set(data.sessions.filter((s) => s.completed).map((s) => s.date))
  const completed = data.sessions.filter((s) => s.completed)

  return (
    <div>
      <h1>Tu cuerpo</h1>
      <p className="subtitle">Cómo has trabajado en los últimos 14 días.</p>

      <div className="card">
        <h2>Balance muscular</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Los grupos con menos color son los que la app priorizará en tus próximos entrenos. No hay
          nada que corregir: solo equilibrio que buscar.
        </p>
        {MUSCLE_GROUPS.map((g) => {
          const pct = Math.round((balance[g] / maxBalance) * 100)
          return (
            <div className="balance-row" key={g}>
              <span className="balance-label">{MUSCLE_LABELS[g]}</span>
              <div className="balance-track">
                <div
                  className={`balance-fill ${pct < 35 ? 'low' : ''}`}
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2>Últimas 4 semanas</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Los huecos también forman parte del camino.
        </p>
        <div className="calendar-grid">
          {days.map((d) => (
            <div
              key={d}
              className={`calendar-day ${trainedDates.has(d) ? 'trained' : ''} ${d === today ? 'today' : ''}`}
            >
              {Number(d.slice(8))}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Sesiones</h2>
        {completed.length === 0 && (
          <p className="muted">Aún no hay sesiones registradas. Todo llegará, sin prisa.</p>
        )}
        {[...completed]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, 10)
          .map((s) => (
            <div className="exercise-item" key={s.id}>
              <div className="exercise-info">
                <div className="exercise-name">{s.title}</div>
                <div className="exercise-plan">
                  {s.date}
                  {s.rpe ? ` · sensación ${s.rpe}/5` : ''}
                  {s.cardioMinutes ? ` · ${s.cardioMinutes} min` : ''}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
