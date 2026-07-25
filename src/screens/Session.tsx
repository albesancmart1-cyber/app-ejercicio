import { useState } from 'react'
import type { PlannedExercise, Session } from '../domain/types'
import { actions } from '../store/store'
import Icon from '../components/Icon'

function planLabel(pe: PlannedExercise): string {
  const parts = [`${pe.plan.sets} × ${pe.plan.reps}`]
  if (pe.plan.weightKg) parts.push(`${pe.plan.weightKg} kg`)
  if (pe.plan.rir !== undefined && pe.primary !== 'cardio') parts.push(`RIR ${pe.plan.rir}`)
  if (pe.plan.restSeconds) parts.push(`${Math.round(pe.plan.restSeconds / 60)}′ descanso`)
  return parts.join(' · ')
}

export default function SessionScreen({ session }: { session: Session }) {
  const [exercises, setExercises] = useState<PlannedExercise[]>(session.exercises)
  const [rpe, setRpe] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [finishing, setFinishing] = useState(false)

  function toggleDone(i: number) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, done: e.done !== true } : e)))
  }

  function setWeight(i: number, value: string) {
    setExercises((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, actualWeightKg: value ? Number(value) : undefined } : e))
    )
  }

  const doneCount = exercises.filter((e) => e.done).length

  return (
    <div className="fade-in">
      <p className="eyebrow">En marcha</p>
      <h1>{session.title}</h1>
      <p className="lede">
        {doneCount} de {exercises.length} hechos. A tu ritmo: quedarte con ganas de más es la idea.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        {exercises.map((e, i) => (
          <div className="item" key={`${e.exerciseId}-${i}`}>
            <button
              className="check"
              aria-pressed={e.done === true}
              aria-label={`Marcar ${e.name}`}
              onClick={() => toggleDone(i)}
            >
              <Icon name="check" />
            </button>
            <div className="item-body">
              <div className="item-title">{e.name}</div>
              <div className="item-meta">{planLabel(e)}</div>
            </div>
            {e.plan.weightKg !== undefined && (
              <input
                type="number"
                className="weight-input"
                placeholder={`${e.plan.weightKg}`}
                value={e.actualWeightKg ?? ''}
                onChange={(ev) => setWeight(i, ev.target.value)}
                aria-label={`Peso usado en ${e.name}`}
              />
            )}
          </div>
        ))}
      </div>

      {!finishing ? (
        <>
          <button className="btn btn-primary" disabled={doneCount === 0} onClick={() => setFinishing(true)}>
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
            Con esto ajustamos las cargas de la próxima sesión.
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
