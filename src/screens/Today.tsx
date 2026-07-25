import { useMemo, useState } from 'react'
import { MUSCLE_GROUPS, MUSCLE_LABELS, type CheckIn, type Discomfort, type MuscleGroup } from '../domain/types'
import { computeReadiness } from '../domain/readiness'
import { recommend } from '../domain/recommender'
import { buildSession } from '../domain/workoutBuilder'
import { actions, todayIso, useAppData } from '../store/store'
import SessionScreen from './Session'

type Scale = 1 | 2 | 3 | 4 | 5

const YESNO: { q: string; key: 'lightHygiene' | 'sunrise' | 'sunsetYesterday' | 'sunExposure' | 'keto' }[] = [
  { q: '¿Respetaste anoche la higiene lumínica (sin pantallas ni luz azul)?', key: 'lightHygiene' },
  { q: '¿Has visto el amanecer hoy?', key: 'sunrise' },
  { q: '¿Viste el atardecer ayer?', key: 'sunsetYesterday' },
  { q: '¿Te expusiste al sol adecuadamente ayer?', key: 'sunExposure' },
  { q: '¿Estás respetando la alimentación cetogénica?', key: 'keto' }
]

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Today() {
  const data = useAppData()
  const profile = data.profile!
  const today = todayIso()

  const activeSession = data.sessions.find((s) => s.date === today && !s.completed)
  const doneToday = data.sessions.find((s) => s.date === today && s.completed)
  const existingCheckIn = data.checkIns.find((c) => c.date === today)

  const [phase, setPhase] = useState<'inicio' | 'checkin' | 'recomendacion'>('inicio')
  const [sleep, setSleep] = useState<Scale | null>(existingCheckIn?.sleep ?? null)
  const [energy, setEnergy] = useState<Scale | null>(existingCheckIn?.energy ?? null)
  const [yesno, setYesno] = useState<Record<string, boolean | null>>({
    lightHygiene: existingCheckIn?.lightHygiene ?? null,
    sunrise: existingCheckIn?.sunrise ?? null,
    sunsetYesterday: existingCheckIn?.sunsetYesterday ?? null,
    sunExposure: existingCheckIn?.sunExposure ?? null,
    keto: existingCheckIn?.keto ?? null
  })
  const [discomfort, setDiscomfort] = useState<Discomfort | null>(existingCheckIn?.discomfort ?? null)

  const checkInComplete =
    sleep !== null && energy !== null && discomfort !== null && Object.values(yesno).every((v) => v !== null)

  const checkIn: CheckIn | null = useMemo(() => {
    if (!checkInComplete) return null
    return {
      date: today,
      sleep: sleep!,
      energy: energy!,
      lightHygiene: yesno.lightHygiene!,
      sunrise: yesno.sunrise!,
      sunsetYesterday: yesno.sunsetYesterday!,
      sunExposure: yesno.sunExposure!,
      keto: yesno.keto!,
      discomfort: discomfort!
    }
  }, [checkInComplete, today, sleep, energy, yesno, discomfort])

  const readiness = checkIn ? computeReadiness(checkIn) : null
  const recommendation =
    readiness && phase === 'recomendacion' && !activeSession
      ? recommend(profile, readiness, data.sessions, today)
      : null

  function confirmCheckIn() {
    if (!checkIn) return
    actions.saveCheckIn(checkIn)
    setPhase('recomendacion')
  }

  function startSession() {
    if (!recommendation) return
    const session = buildSession(recommendation, profile, data.sessions, today)
    actions.saveSession(session)
    // Al terminar o descartar la sesión volvemos a la vista de inicio.
    setPhase('inicio')
  }

  if (activeSession) {
    return <SessionScreen session={activeSession} />
  }

  return (
    <div>
      <h1>{greeting()}{profile.name !== 'Tú' ? `, ${profile.name}` : ''}</h1>
      <p className="subtitle">Hoy es un buen día para escuchar a tu cuerpo.</p>

      {doneToday && phase === 'inicio' && (
        <div className="card reco-card">
          <span className="big-sun">🌇</span>
          <h2>Sesión de hoy completada</h2>
          <p className="muted">
            «{doneToday.title}» ya está registrada. Tu cuerpo agradece ahora el descanso — nos vemos
            mañana, o cuando tú y tu cuerpo queráis.
          </p>
        </div>
      )}

      {phase === 'inicio' && !doneToday && (
        <div className="card reco-card">
          <span className="big-sun">☀️</span>
          <h2>¿Quieres moverte hoy?</h2>
          <p className="muted">
            Antes de proponerte nada, cuéntanos en 30 segundos cómo estás. Con eso diseñamos el
            entreno que hoy te suma salud sin robarte energía.
          </p>
          <div style={{ height: 16 }} />
          <button className="btn-primary" onClick={() => setPhase('checkin')}>
            Empezar el check-in
          </button>
        </div>
      )}

      {phase === 'inicio' && doneToday && (
        <button className="btn-ghost" onClick={() => setPhase('checkin')}>
          Quiero hacer otra sesión hoy
        </button>
      )}

      {phase === 'checkin' && (
        <div className="card">
          <h2>¿Cómo estás hoy?</h2>
          <div className="divider" />

          <div className="checkin-q">
            <p>¿Cómo has dormido?</p>
            <div className="scale-row">
              {([1, 2, 3, 4, 5] as Scale[]).map((n) => (
                <button key={n} className={`scale-dot ${sleep === n ? 'selected' : ''}`} onClick={() => setSleep(n)}>
                  {n}
                </button>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 5, fontSize: '0.78rem' }}>1 = muy mal · 5 = de maravilla</p>
          </div>

          {YESNO.map(({ q, key }) => (
            <div className="checkin-q" key={key}>
              <p>{q}</p>
              <div className="chip-row">
                <button
                  className={`chip ${yesno[key] === true ? 'selected' : ''}`}
                  onClick={() => setYesno((p) => ({ ...p, [key]: true }))}
                >
                  Sí
                </button>
                <button
                  className={`chip ${yesno[key] === false ? 'selected' : ''}`}
                  onClick={() => setYesno((p) => ({ ...p, [key]: false }))}
                >
                  No
                </button>
              </div>
            </div>
          ))}

          <div className="checkin-q">
            <p>¿Cuánta energía tienes?</p>
            <div className="scale-row">
              {([1, 2, 3, 4, 5] as Scale[]).map((n) => (
                <button key={n} className={`scale-dot ${energy === n ? 'selected' : ''}`} onClick={() => setEnergy(n)}>
                  {n}
                </button>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 5, fontSize: '0.78rem' }}>1 = agotado · 5 = a tope</p>
          </div>

          <div className="checkin-q">
            <p>¿Agujetas o molestias?</p>
            <div className="chip-row">
              <button className={`chip ${discomfort === 'ninguna' ? 'selected' : ''}`} onClick={() => setDiscomfort('ninguna')}>
                Ninguna
              </button>
              <button className={`chip ${discomfort === 'leves' ? 'selected' : ''}`} onClick={() => setDiscomfort('leves')}>
                Leves
              </button>
              {MUSCLE_GROUPS.filter((g) => g !== 'cardio').map((g: MuscleGroup) => (
                <button
                  key={g}
                  className={`chip ${discomfort === g ? 'selected' : ''}`}
                  onClick={() => setDiscomfort(g)}
                >
                  {MUSCLE_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" disabled={!checkInComplete} onClick={confirmCheckIn}>
            Ver qué me conviene hoy
          </button>
        </div>
      )}

      {phase === 'recomendacion' && recommendation && readiness && (
        <>
          <div className="card reco-card">
            <span className="reco-kind">{recommendation.title}</span>
            <h2 style={{ marginBottom: 8 }}>
              Disposición del cuerpo: {readiness.score}/100
            </h2>
            <p>{recommendation.message}</p>
            {readiness.notes.length > 0 && (
              <ul className="note-list">
                {readiness.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
            <div style={{ height: 16 }} />
            <button className="btn-primary" onClick={startSession}>
              Preparar la sesión
            </button>
            <button className="btn-ghost" onClick={() => setPhase('checkin')}>
              Revisar mis respuestas
            </button>
          </div>
        </>
      )}
    </div>
  )
}
