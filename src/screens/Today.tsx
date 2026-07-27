import { useMemo, useState } from 'react'
import { MUSCLE_GROUPS, MUSCLE_LABELS, type CheckIn, type Discomfort, type MuscleGroup } from '../domain/types'
import { computeReadiness } from '../domain/readiness'
import { canIntensify, recommend, withMoreIntensity } from '../domain/recommender'
import { volumePlan } from '../domain/progression'
import { interpretTrend } from '../domain/trend'
import { buildSession } from '../domain/workoutBuilder'
import { actions, useAppData } from '../store/store'
import { useToday } from '../store/clock'
import { findActiveSession } from '../domain/activeSession'
import Icon from '../components/Icon'
import SessionScreen from './Session'

type Scale = 1 | 2 | 3 | 4 | 5
type YesNoKey =
  | 'lightHygiene'
  | 'sunrise'
  | 'sunsetYesterday'
  | 'sunExposure'
  | 'keto'
  | 'wokeHungry'
  | 'cravings'

const HABITS: { q: string; key: YesNoKey }[] = [
  { q: '¿Respetaste anoche la higiene lumínica?', key: 'lightHygiene' },
  { q: '¿Has visto el amanecer hoy?', key: 'sunrise' },
  { q: '¿Viste el atardecer ayer?', key: 'sunsetYesterday' },
  { q: '¿Te dio el sol ayer?', key: 'sunExposure' },
  { q: '¿Sigues en cetosis?', key: 'keto' }
]

/** Señales de leptina: no cambian el entreno de hoy, alimentan la lectura semanal. */
const APPETITE: { q: string; key: YesNoKey }[] = [
  { q: '¿Te despertaste con mucha hambre?', key: 'wokeHungry' },
  { q: '¿Tuviste antojos ayer?', key: 'cravings' }
]

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

function ScaleInput({
  value,
  onChange,
  low,
  high
}: {
  value: Scale | null
  onChange: (v: Scale) => void
  low: string
  high: string
}) {
  return (
    <>
      <div className="scale">
        {([1, 2, 3, 4, 5] as Scale[]).map((n) => (
          <button key={n} aria-pressed={value === n} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="scale-legend">
        <span className="faint">{low}</span>
        <span className="faint">{high}</span>
      </div>
    </>
  )
}

export default function Today() {
  const data = useAppData()
  const profile = data.profile!
  const today = useToday()

  // Tolera el cruce de medianoche: un entreno empezado a las 23:50 no se pierde.
  const activeSession = findActiveSession(data.sessions, today)
  const doneToday = data.sessions.find((s) => s.date === today && s.completed)
  const saved = data.checkIns.find((c) => c.date === today)

  const [phase, setPhase] = useState<'inicio' | 'checkin' | 'plan'>('inicio')
  const [showWhy, setShowWhy] = useState(false)
  const [intensified, setIntensified] = useState(false)
  const [sleep, setSleep] = useState<Scale | null>(saved?.sleep ?? null)
  const [energy, setEnergy] = useState<Scale | null>(saved?.energy ?? null)
  const [habits, setHabits] = useState<Record<YesNoKey, boolean | null>>({
    lightHygiene: saved?.lightHygiene ?? null,
    sunrise: saved?.sunrise ?? null,
    sunsetYesterday: saved?.sunsetYesterday ?? null,
    sunExposure: saved?.sunExposure ?? null,
    keto: saved?.keto ?? null,
    wokeHungry: saved?.wokeHungry ?? null,
    cravings: saved?.cravings ?? null
  })
  const [discomfort, setDiscomfort] = useState<Discomfort | null>(saved?.discomfort ?? null)

  const complete =
    sleep !== null && energy !== null && discomfort !== null && Object.values(habits).every((v) => v !== null)

  const checkIn: CheckIn | null = useMemo(() => {
    if (!complete) return null
    return {
      date: today,
      sleep: sleep!,
      energy: energy!,
      lightHygiene: habits.lightHygiene!,
      sunrise: habits.sunrise!,
      sunsetYesterday: habits.sunsetYesterday!,
      sunExposure: habits.sunExposure!,
      keto: habits.keto!,
      wokeHungry: habits.wokeHungry!,
      cravings: habits.cravings!,
      discomfort: discomfort!
    }
  }, [complete, today, sleep, energy, habits, discomfort])

  const renderYesNo = ({ q, key }: { q: string; key: YesNoKey }, i: number) => (
    <div key={key} style={{ marginTop: i === 0 ? 0 : 18 }}>
      <div className="row">
        <span style={{ fontSize: '0.9rem' }}>{q}</span>
        <div className="options" style={{ flexWrap: 'nowrap' }}>
          <button
            className="opt"
            aria-pressed={habits[key] === true}
            onClick={() => setHabits((p) => ({ ...p, [key]: true }))}
          >
            Sí
          </button>
          <button
            className="opt"
            aria-pressed={habits[key] === false}
            onClick={() => setHabits((p) => ({ ...p, [key]: false }))}
          >
            No
          </button>
        </div>
      </div>
    </div>
  )

  const readiness = checkIn ? computeReadiness(checkIn) : null

  // Cuánto volumen toca hoy, según lo que el cuerpo viene demostrando y si la
  // composición corporal está estancada.
  const volumen = volumePlan({
    profile,
    sessions: data.sessions,
    checkIns: data.checkIns,
    trendState: interpretTrend(data.measurements, profile, data.checkIns, data.sessions, today).state,
    todayIso: today
  })

  const suggested =
    readiness && phase === 'plan' ? recommend(profile, readiness, data.sessions, today, volumen) : null
  // El usuario puede pedir pesas aunque tocara paseo; los guardas siguen puestos.
  const recommendation =
    suggested && intensified && readiness
      ? withMoreIntensity(suggested, profile, readiness, data.sessions, today)
      : suggested

  function startSession() {
    if (!recommendation) return
    actions.saveSession(buildSession(recommendation, profile, data.sessions, today, checkIn?.keto ?? false))
    setPhase('inicio')
  }

  if (activeSession) return <SessionScreen session={activeSession} />

  return (
    <div className="fade-in">
      {phase !== 'plan' && (
        <>
          <p className="eyebrow">{greeting()}</p>
          <h1>{profile.name !== 'Tú' ? profile.name : 'Hoy'}</h1>
        </>
      )}

      {phase === 'inicio' && (
        <div style={{ marginTop: 28 }}>
          {doneToday ? (
            <div className="card">
              <Icon name="moon" className="sun-mark" />
              <h2>Sesión completada</h2>
              <p className="dim" style={{ marginTop: 8 }}>
                «{doneToday.title}» queda registrada. Ahora el descanso es la parte que construye:
                nos vemos cuando tu cuerpo quiera.
              </p>
            </div>
          ) : (
            <div className="card">
              <Icon name="sun" className="sun-mark" />
              <h2>¿Cómo estás hoy?</h2>
              <p className="dim" style={{ marginTop: 8 }}>
                Antes de proponerte nada, cuéntame en medio minuto cómo has dormido y cómo andas de
                energía. Con eso decidimos si hoy toca empujar o recuperar.
              </p>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setPhase('checkin')}>
            {doneToday ? 'Preparar otra sesión' : 'Empezar'}
          </button>
        </div>
      )}

      {phase === 'checkin' && (
        <div className="stack" style={{ marginTop: 28 }}>
          <div className="card">
            <p className="eyebrow">Descanso</p>
            <h2 style={{ marginBottom: 16 }}>¿Cómo has dormido?</h2>
            <ScaleInput value={sleep} onChange={setSleep} low="Muy mal" high="De maravilla" />
            <hr className="rule" />
            <h2 style={{ marginBottom: 16 }}>¿Cuánta energía tienes?</h2>
            <ScaleInput value={energy} onChange={setEnergy} low="Agotado" high="A tope" />
          </div>

          <div className="card">
            <p className="eyebrow">Ritmos</p>
            {HABITS.map(renderYesNo)}
          </div>

          <div className="card">
            <p className="eyebrow">Apetito</p>
            {APPETITE.map(renderYesNo)}
            <p className="faint" style={{ marginTop: 16 }}>
              Estas dos no deciden tu entreno de hoy: son las señales con las que leo tu leptina a
              lo largo de la semana.
            </p>
          </div>

          <div className="card">
            <p className="eyebrow">Cuerpo</p>
            <h2 style={{ marginBottom: 14 }}>¿Molestias o agujetas?</h2>
            <div className="options">
              <button className="opt" aria-pressed={discomfort === 'ninguna'} onClick={() => setDiscomfort('ninguna')}>
                Ninguna
              </button>
              <button className="opt" aria-pressed={discomfort === 'leves'} onClick={() => setDiscomfort('leves')}>
                Leves
              </button>
              {MUSCLE_GROUPS.filter((g) => g !== 'cardio').map((g: MuscleGroup) => (
                <button key={g} className="opt" aria-pressed={discomfort === g} onClick={() => setDiscomfort(g)}>
                  {MUSCLE_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            disabled={!complete}
            onClick={() => {
              if (checkIn) actions.saveCheckIn(checkIn)
              setPhase('plan')
            }}
          >
            Ver qué me conviene
          </button>
          <button className="btn-quiet" onClick={() => setPhase('inicio')}>
            Ahora no
          </button>
        </div>
      )}

      {phase === 'plan' && recommendation && readiness && (
        <div className="fade-in">
          <p className="eyebrow">Disposición del cuerpo</p>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <span className="score">
              {readiness.score}
              <small> / 100</small>
            </span>
            <span className="tag accent">{readiness.level}</span>
          </div>
          <div className="meter" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < Math.round(readiness.score / 10) ? 'on' : ''} />
            ))}
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <p className="eyebrow">{recommendation.title}</p>
            <p>{recommendation.message}</p>

            <div className="tag-row">
              <span className="tag">Intensidad {recommendation.intensity}</span>
              {recommendation.kind !== 'descanso_activo' && recommendation.kind !== 'cardio_suave' && (
                <span className="tag">{recommendation.rir} reps en reserva</span>
              )}
              {recommendation.reentry && (
                <span className="tag">
                  Vuelta {recommendation.reentry.step}/{recommendation.reentry.total}
                </span>
              )}
              {recommendation.ketoAdapting && <span className="tag">Adaptación cetogénica</span>}
              {recommendation.userOverride && <span className="tag accent">A petición tuya</span>}
            </div>

            {canIntensify(recommendation) && !intensified && (
              <>
                <hr className="rule" />
                <button className="btn btn-secondary" onClick={() => setIntensified(true)}>
                  Prefiero algo con pesas
                </button>
                <p className="faint" style={{ marginTop: 10 }}>
                  Te lo cambio por fuerza contenida, respetando igualmente tus molestias y las 48 h
                  de recuperación.
                </p>
              </>
            )}
            {intensified && (
              <>
                <hr className="rule" />
                <button className="btn-quiet" onClick={() => setIntensified(false)}>
                  Volver a lo que me tocaba
                </button>
              </>
            )}

            {recommendation.volume && recommendation.kind === 'fuerza' && (
              <>
                <hr className="rule" />
                <p className="eyebrow">
                  Volumen · nivel {recommendation.volume.level} de 4
                </p>
                {recommendation.volume.changes.length > 0 && (
                  <>
                    <p className="faint" style={{ fontSize: '0.8rem', margin: '0 0 4px' }}>
                      Qué cambia respecto al volumen base
                    </p>
                    <ul className="reasons" style={{ marginBottom: 12 }}>
                      {recommendation.volume.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="dim">{recommendation.volume.reason}</p>
                {recommendation.volume.evidence.length > 0 && (
                  <>
                    <p className="faint" style={{ fontSize: '0.8rem', margin: '12px 0 4px' }}>
                      En qué me baso
                    </p>
                    <ul className="reasons">
                      {recommendation.volume.evidence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}

            <hr className="rule" />
            <button className="disclose" aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>
              <Icon name="chevron" />
              Por qué esto hoy
            </button>
            {showWhy && (
              <ul className="reasons">
                {recommendation.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
                {readiness.notes.map((n, i) => (
                  <li key={`n${i}`}>{n}</li>
                ))}
              </ul>
            )}
          </div>

          <button className="btn btn-primary" onClick={startSession}>
            Preparar la sesión
          </button>
          <button className="btn-quiet" onClick={() => setPhase('checkin')}>
            Revisar mis respuestas
          </button>
        </div>
      )}
    </div>
  )
}
