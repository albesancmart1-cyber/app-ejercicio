import { useState } from 'react'
import type { PlannedExercise, Session, SetLog } from '../domain/types'
import { initLogs, syncExercise, volumeLoad } from '../domain/setLogs'
import { actions } from '../store/store'
import Icon from '../components/Icon'
import RestTimer from '../components/RestTimer'

function planLabel(pe: PlannedExercise): string {
  const parts = [`${pe.plan.sets} × ${pe.plan.reps}`]
  if (pe.plan.rir !== undefined && pe.primary !== 'cardio') parts.push(`RIR ${pe.plan.rir}`)
  if (pe.plan.restSeconds) parts.push(`${Math.round(pe.plan.restSeconds / 60)}′ descanso`)
  return parts.join(' · ')
}

/** Dónde está el descanso activo: qué ejercicio y tras qué serie. */
interface Resting {
  exercise: number
  set: number
  seconds: number
}

export default function SessionScreen({ session }: { session: Session }) {
  const [exercises, setExercises] = useState<PlannedExercise[]>(() =>
    // Las sesiones creadas antes de existir el registro no traen series.
    session.exercises.map((e) => (e.logs ? e : { ...e, logs: initLogs(e.plan) }))
  )
  const [rpe, setRpe] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [resting, setResting] = useState<Resting | null>(null)

  function updateSet(ei: number, si: number, patch: Partial<SetLog>) {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== ei) return e
        const logs = (e.logs ?? []).map((l, j) => (j === si ? { ...l, ...patch } : l))
        return syncExercise({ ...e, logs })
      })
    )
  }

  function toggleSet(ei: number, si: number) {
    const ejercicio = exercises[ei]
    const serie = ejercicio.logs?.[si]
    const marcando = !serie?.done
    updateSet(ei, si, { done: marcando })

    // El descanso arranca solo al completar una serie que no sea la última.
    const esUltima = si === (ejercicio.logs?.length ?? 1) - 1
    const descanso = ejercicio.plan.restSeconds
    if (marcando && !esUltima && descanso && ejercicio.primary !== 'cardio') {
      setResting({ exercise: ei, set: si, seconds: descanso })
    } else if (!marcando) {
      setResting(null)
    }
  }

  const doneSets = exercises.reduce((acc, e) => acc + (e.logs ?? []).filter((l) => l.done).length, 0)
  const totalSets = exercises.reduce((acc, e) => acc + (e.logs ?? []).length, 0)
  const volumen = exercises.reduce((acc, e) => acc + volumeLoad(e), 0)

  return (
    <div className="fade-in">
      <p className="eyebrow">En marcha</p>
      <h1>{session.title}</h1>
      <p className="lede">
        {doneSets} de {totalSets} series. A tu ritmo: quedarte con ganas de más es la idea.
      </p>

      {exercises.map((e, ei) => (
        <div className="card" key={`${e.exerciseId}-${ei}`}>
          <div className="item-title">{e.name}</div>
          <div className="item-meta" style={{ marginBottom: 14 }}>
            {planLabel(e)}
          </div>

          {e.primary === 'cardio' ? (
            <div className="set-row">
              <span className="set-index">·</span>
              <span className="dim" style={{ flex: 1 }}>
                {e.plan.reps}
              </span>
              <button
                className="check"
                aria-pressed={e.logs?.[0]?.done === true}
                aria-label={`Marcar ${e.name}`}
                onClick={() => toggleSet(ei, 0)}
              >
                <Icon name="check" />
              </button>
            </div>
          ) : (
            (e.logs ?? []).map((serie, si) => (
              <div key={si}>
                <div className="set-row">
                  <span className="set-index">{si + 1}</span>
                  <label className="set-field">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={e.plan.weightKg ? `${e.plan.weightKg}` : '—'}
                      value={serie.weightKg ?? ''}
                      onChange={(ev) =>
                        updateSet(ei, si, {
                          weightKg: ev.target.value ? Number(ev.target.value) : undefined
                        })
                      }
                      aria-label={`Peso de la serie ${si + 1} de ${e.name}`}
                    />
                    <span>kg</span>
                  </label>
                  <label className="set-field">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={e.plan.reps.split('-')[0]}
                      value={serie.reps ?? ''}
                      onChange={(ev) =>
                        updateSet(ei, si, {
                          reps: ev.target.value ? Number(ev.target.value) : undefined
                        })
                      }
                      aria-label={`Repeticiones de la serie ${si + 1} de ${e.name}`}
                    />
                    <span>reps</span>
                  </label>
                  <button
                    className="check"
                    aria-pressed={serie.done}
                    aria-label={`Marcar serie ${si + 1} de ${e.name}`}
                    onClick={() => toggleSet(ei, si)}
                  >
                    <Icon name="check" />
                  </button>
                </div>
                {resting && resting.exercise === ei && resting.set === si && (
                  <RestTimer
                    seconds={resting.seconds}
                    onSkip={() => setResting(null)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      ))}

      {!finishing ? (
        <>
          {volumen > 0 && (
            <p className="faint" style={{ margin: '0 4px 14px' }}>
              Volumen de hoy: {Math.round(volumen).toLocaleString('es-ES')} kg levantados.
            </p>
          )}
          <button className="btn btn-primary" disabled={doneSets === 0} onClick={() => setFinishing(true)}>
            Terminar
          </button>
          <button className="btn-quiet" onClick={() => actions.discardSession(session.id)}>
            Hoy no puedo — descartar sin culpa
          </button>
        </>
      ) : (
        <div className="card fade-in">
          <p className="eyebrow">Última pregunta</p>
          <h2 style={{ marginBottom: 16 }}>¿Cómo te has sentido?</h2>
          <div className="scale">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button key={n} aria-pressed={rpe === n} onClick={() => setRpe(n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="scale-legend">
            <span className="faint">Muy duro</span>
            <span className="faint">Muy cómodo</span>
          </div>
          <p className="faint" style={{ marginTop: 14 }}>
            Con las repeticiones que has anotado y esta sensación ajustamos las cargas de la próxima.
          </p>
          <div style={{ height: 20 }} />
          <button
            className="btn btn-primary"
            onClick={() => actions.saveSession({ ...session, exercises, rpe: rpe ?? undefined, completed: true })}
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}
