import { useState } from 'react'
import type { PlannedExercise, Session } from '../domain/types'
import { actions } from '../store/store'

export default function SessionScreen({ session }: { session: Session }) {
  const [exercises, setExercises] = useState<PlannedExercise[]>(session.exercises)
  const [rpe, setRpe] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [finishing, setFinishing] = useState(false)

  function toggleDone(i: number) {
    setExercises((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, done: e.done === true ? false : true } : e))
    )
  }

  function setWeight(i: number, value: string) {
    setExercises((prev) =>
      prev.map((e, idx) =>
        idx === i ? { ...e, actualWeightKg: value ? Number(value) : undefined } : e
      )
    )
  }

  const anyDone = exercises.some((e) => e.done)

  function finish() {
    actions.saveSession({
      ...session,
      exercises,
      rpe: rpe ?? undefined,
      completed: true
    })
  }

  function discard() {
    actions.discardSession(session.id)
  }

  return (
    <div>
      <h1>{session.title}</h1>
      <p className="subtitle">A tu ritmo. Si algo no sale hoy, no pasa nada.</p>

      <div className="card">
        {exercises.map((e, i) => (
          <div className="exercise-item" key={`${e.exerciseId}-${i}`}>
            <button className={`exercise-check ${e.done ? 'done' : ''}`} onClick={() => toggleDone(i)}>
              ✓
            </button>
            <div className="exercise-info">
              <div className="exercise-name">{e.name}</div>
              <div className="exercise-plan">
                {e.plan.sets} × {e.plan.reps}
                {e.plan.weightKg ? ` · sugerido ${e.plan.weightKg} kg` : ''}
              </div>
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
          <button className="btn-primary" disabled={!anyDone} onClick={() => setFinishing(true)}>
            Terminar sesión
          </button>
          <button className="btn-ghost" onClick={discard}>
            Hoy no puedo — descartar sin culpa
          </button>
        </>
      ) : (
        <div className="card">
          <h2>¿Cómo te has sentido?</h2>
          <p className="muted" style={{ marginBottom: 10 }}>1 = muy duro · 5 = muy cómodo</p>
          <div className="scale-row">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button key={n} className={`scale-dot ${rpe === n ? 'selected' : ''}`} onClick={() => setRpe(n)}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ height: 16 }} />
          <button className="btn-primary" onClick={finish}>
            Guardar sesión
          </button>
        </div>
      )}
    </div>
  )
}
