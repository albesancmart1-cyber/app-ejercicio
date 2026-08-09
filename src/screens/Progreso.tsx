import { useState } from 'react'
import { MUSCLE_GROUPS, MUSCLE_LABELS, type BodyMeasurement } from '../domain/types'
import {
  compareComposition,
  computeComposition,
  esMedicionValida,
  formatDelta,
  sortMeasurements
} from '../domain/body'
import { actions } from '../store/store'
import { interpretTrend, type TrendReading } from '../domain/trend'
import TrendChart from '../components/TrendChart'
import SessionDetail from '../components/SessionDetail'
import ExerciseSheet from '../components/ExerciseSheet'
import ExerciseList from '../components/ExerciseList'
import SemanaCard from '../components/SemanaCard'
import AnoCard from '../components/AnoCard'
import MonthReport from '../components/MonthReport'
import EstresCard from '../components/EstresCard'
import Icon from '../components/Icon'
import { formatDuration } from '../components/Chrono'
import { computeBalance } from '../domain/muscleBalance'
import VolumeByMuscle from '../components/VolumeByMuscle'
import { computeLeptinSignal } from '../domain/leptin'
import { useAppData } from '../store/store'
import { useToday } from '../store/clock'

/** Los cinco destinos de Progreso, en el orden en que se miran. */
type Seccion = 'semana' | 'mes' | 'ano' | 'cuerpo' | 'ejercicios'

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'ano', label: 'Año' },
  { id: 'cuerpo', label: 'Cuerpo' },
  { id: 'ejercicios', label: 'Ejercicios' }
]

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

/** El color de estado va acompañado de icono y texto, nunca solo. */
function Verdict({ reading }: { reading: TrendReading }) {
  const clase =
    reading.state === 'recomposicion' || reading.state === 'progreso'
      ? 'verdict verdict-good'
      : reading.state === 'atencion'
        ? 'verdict verdict-warn'
        : 'verdict'
  const icono = reading.state === 'recomposicion' || reading.state === 'progreso' ? 'check' : 'sun'

  return (
    <>
      <div className={clase}>
        <Icon name={icono} className="verdict-icon" />
        <div>
          <div className="item-title">{reading.titular}</div>
          <p className="dim" style={{ marginTop: 6 }}>
            {reading.mensaje}
          </p>
        </div>
      </div>
      {reading.sugerencias.length > 0 && (
        <>
          <p className="eyebrow" style={{ marginTop: 18 }}>
            Por dónde empezar
          </p>
          <ul className="reasons">
            {reading.sugerencias.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <p className="faint" style={{ marginTop: 10 }}>
            Una cosa cada vez. No hace falta cambiarlo todo a la vez, ni pesarse más a menudo.
          </p>
        </>
      )}
    </>
  )
}

function BodyCompositionCard({
  measurements,
  heightCm,
  today,
  reading
}: {
  measurements: BodyMeasurement[]
  heightCm?: number
  today: string
  reading: TrendReading
}) {
  const [abierto, setAbierto] = useState(false)
  const [peso, setPeso] = useState('')
  const [grasa, setGrasa] = useState('')
  const [musculo, setMusculo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ordenadas = sortMeasurements(measurements)
  const ultima = ordenadas[0]
  const anterior = ordenadas[1]
  const primera = ordenadas[ordenadas.length - 1]

  const actual = ultima ? computeComposition(ultima, heightCm) : null
  const vsAnterior = actual && anterior ? compareComposition(actual, computeComposition(anterior, heightCm)) : null
  const vsPrimera =
    actual && primera && primera !== ultima
      ? compareComposition(actual, computeComposition(primera, heightCm))
      : null

  function guardar() {
    const medicion: BodyMeasurement = {
      date: today,
      weightKg: Number(peso),
      fatPercent: grasa ? Number(grasa) : undefined,
      musclePercent: musculo ? Number(musculo) : undefined
    }
    if (!esMedicionValida(medicion)) {
      setError('Esos números no cuadran. Revisa el peso y que grasa y músculo no sumen más de 100 %.')
      return
    }
    actions.saveMeasurement(medicion)
    setPeso('')
    setGrasa('')
    setMusculo('')
    setError(null)
    setAbierto(false)
  }

  return (
    <div className="card">
      <p className="eyebrow">Composición corporal</p>

      {actual ? (
        <>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <span className="score">
              {actual.weightKg.toLocaleString('es-ES')}
              <small> kg</small>
            </span>
            {actual.ffmi !== undefined && <span className="tag accent">FFMI {actual.ffmi}</span>}
          </div>

          <div style={{ marginTop: 16 }}>
            {actual.fatKg !== undefined && (
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Grasa</span>
                <span>
                  {actual.fatKg} kg{' '}
                  {vsAnterior?.fatKg !== undefined && (
                    <span className={vsAnterior.fatKg <= 0 ? 'accent' : 'faint'}>
                      ({formatDelta(vsAnterior.fatKg)})
                    </span>
                  )}
                </span>
              </div>
            )}
            {actual.muscleKg !== undefined && (
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Músculo</span>
                <span>
                  {actual.muscleKg} kg{' '}
                  {vsAnterior?.muscleKg !== undefined && (
                    <span className={vsAnterior.muscleKg >= 0 ? 'accent' : 'faint'}>
                      ({formatDelta(vsAnterior.muscleKg)})
                    </span>
                  )}
                </span>
              </div>
            )}
            {actual.leanKg !== undefined && (
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Masa libre de grasa</span>
                <span>{actual.leanKg} kg</span>
              </div>
            )}
          </div>

          {ordenadas.length >= 2 && (
            <div style={{ marginTop: 18 }}>
              <TrendChart measurements={measurements} heightCm={heightCm} todayIso={today} />
            </div>
          )}

          <hr className="rule" />
          <Verdict reading={reading} />

          {vsPrimera && (
            <p className="faint" style={{ marginTop: 14 }}>
              Desde la primera medida: peso {formatDelta(vsPrimera.weightKg)}, grasa{' '}
              {formatDelta(vsPrimera.fatKg)}, músculo {formatDelta(vsPrimera.muscleKg)}.
            </p>
          )}
          <p className="faint" style={{ marginTop: 14 }}>
            La masa libre de grasa incluye hueso, órganos y agua, por eso siempre supera a la
            muscular. La bioimpedancia se mueve ±3–5 % según la hidratación: mide siempre en las
            mismas condiciones y fíjate en la tendencia, no en una lectura suelta.
          </p>
        </>
      ) : (
        <p className="dim">
          Cuando te peses, anota aquí el peso y los porcentajes de grasa y músculo que te dé la
          báscula, y te los paso a kilos. Es la única forma de ver si estás recomponiendo.
        </p>
      )}

      <hr className="rule" />
      {!abierto ? (
        <button className="btn-quiet" onClick={() => setAbierto(true)}>
          Anotar una medición
        </button>
      ) : (
        <div className="fade-in">
          <div className="field-row">
            <label className="field">
              <span>Peso (kg)</span>
              <input type="number" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </label>
            <label className="field">
              <span>Grasa (%)</span>
              <input type="number" inputMode="decimal" value={grasa} onChange={(e) => setGrasa(e.target.value)} />
            </label>
            <label className="field">
              <span>Músculo (%)</span>
              <input type="number" inputMode="decimal" value={musculo} onChange={(e) => setMusculo(e.target.value)} />
            </label>
          </div>
          {error && (
            <p className="faint" style={{ marginTop: 10 }}>
              {error}
            </p>
          )}
          <div style={{ height: 14 }} />
          <button className="btn btn-primary" disabled={!peso} onClick={guardar}>
            Guardar medición
          </button>
          <button className="btn-quiet" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

export default function Progreso() {
  const data = useAppData()
  const today = useToday()
  // Qué entreno se está mirando por dentro, si alguno.
  const [abierta, setAbierta] = useState<string | null>(null)
  // Y qué ejercicio tiene abierta su ficha de marcas.
  const [ficha, setFicha] = useState<{ exerciseId: string; name: string } | null>(null)
  const [seccion, setSeccion] = useState<Seccion>('semana')
  const balance = computeBalance(data.sessions, today)
  const maxBalance = Math.max(0.1, ...MUSCLE_GROUPS.map((g) => balance[g]))
  const trained = new Set(data.sessions.filter((s) => s.completed).map((s) => s.date))
  const completed = data.sessions.filter((s) => s.completed)

  const leptin = computeLeptinSignal(data.checkIns, today, data.profile?.goal)

  if (ficha) {
    return (
      <ExerciseSheet
        exerciseId={ficha.exerciseId}
        name={ficha.name}
        sessions={data.sessions}
        todayIso={today}
        onClose={() => setFicha(null)}
      />
    )
  }

  const sesionAbierta = abierta ? data.sessions.find((s) => s.id === abierta) : undefined
  if (sesionAbierta) {
    return (
      <SessionDetail
        session={sesionAbierta}
        history={data.sessions}
        onExercise={(exerciseId, name) => setFicha({ exerciseId, name })}
        onClose={() => setAbierta(null)}
      />
    )
  }

  return (
    <div className="fade-in cards-grid">
      <p className="eyebrow">Cómo vas</p>
      <h1>Progreso</h1>

      {/*
        Cinco destinos con nombre en vez de un scroll de ocho tarjetas.
        «Cuerpo» era un cajón de sastre: estrés, mes, volumen, composición,
        leptina, reparto, calendario e historial, todo seguido y sin relación
        entre ello. Nadie llegaba abajo, y lo que se mira a diario —cómo va la
        semana— estaba enterrado.
      */}
      <div className="segmentos" role="tablist" aria-label="Qué mirar">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={seccion === s.id}
            className={`segmento ${seccion === s.id ? 'on' : ''}`}
            onClick={() => setSeccion(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {seccion === 'semana' && (
        <SemanaCard
          sessions={data.sessions}
          todayIso={today}
          opts={{ overrides: data.profile?.landmarkOverrides, deficit: data.profile?.deficitPhase }}
        />
      )}

      {seccion === 'mes' && (
        <>
      {/* El mes, para la pregunta que uno se hace el día 1 y que ninguna otra
          tarjeta responde: «¿qué tal fue?». */}
      <div className="card-wrap">
        <MonthReport sessions={data.sessions} todayIso={today} />
      </div>

        </>
      )}

      {seccion === 'ano' && <AnoCard sessions={data.sessions} todayIso={today} />}

      {seccion === 'cuerpo' && (
        <>
      {/* Cómo está el cuerpo va lo primero: es la pregunta que uno trae al
          abrir esta pestaña, antes que el detalle de volumen por músculo. */}
      <div className="card-wrap" style={{ marginTop: 28 }}>
        <EstresCard sessions={data.sessions} todayIso={today} />
      </div>

      <BodyCompositionCard
        measurements={data.measurements}
        heightCm={data.profile?.heightCm}
        today={today}
        reading={interpretTrend(data.measurements, data.profile, data.checkIns, data.sessions, today)}
      />

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

      <div className="card-wrap">
        <VolumeByMuscle
          sessions={data.sessions}
          todayIso={today}
          opts={{ overrides: data.profile?.landmarkOverrides, deficit: data.profile?.deficitPhase }}
        />
      </div>

      <div className="card">
        <p className="eyebrow">Reparto por zonas</p>
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
          Últimos 14 días, en grueso. Sirve para ver de un vistazo si la semana ha estado repartida;
          para saber si algo se está quedando corto, el que manda es el detalle por músculo de
          arriba.
        </p>
      </div>

        </>
      )}

      {seccion === 'ejercicios' && (
        <ExerciseList
          sessions={data.sessions}
          todayIso={today}
          onOpen={(exerciseId, name) => setFicha({ exerciseId, name })}
        />
      )}
    </div>
  )
}
