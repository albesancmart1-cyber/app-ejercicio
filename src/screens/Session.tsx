import { useState } from 'react'
import type { PlannedExercise, Session, SetLog } from '../domain/types'
import { initLogs, syncExercise, volumeLoad } from '../domain/setLogs'
import { DESCANSO_ENTRE_EJERCICIOS } from '../domain/protocol'
import { nextAlternative, swapExercise } from '../domain/swap'
import { actions, useAppData } from '../store/store'
import Icon from '../components/Icon'
import RestTimer from '../components/RestTimer'
import Chrono, { elapsedSeconds } from '../components/Chrono'
import ExerciseAnimation from '../components/ExerciseAnimation'
import { patternOf } from '../data/patterns'

function planLabel(pe: PlannedExercise): string {
  const parts = [`${pe.plan.sets} × ${pe.plan.reps}`]
  if (pe.plan.rir !== undefined && pe.primary !== 'cardio') parts.push(`RIR ${pe.plan.rir}`)
  if (pe.plan.restSeconds) parts.push(`${Math.round(pe.plan.restSeconds / 60)}′ descanso`)
  return parts.join(' · ')
}

/** Dónde está el descanso activo y de qué tipo. */
interface Resting {
  exercise: number
  set: number
  seconds: number
  /** Nombre del ejercicio que viene, cuando el descanso es entre ejercicios. */
  nextName?: string
}

export default function SessionScreen({ session }: { session: Session }) {
  const data = useAppData()
  const profile = data.profile!
  const [exercises, setExercises] = useState<PlannedExercise[]>(() =>
    session.exercises.map((e) => (e.logs ? e : { ...e, logs: initLogs(e.plan) }))
  )
  const [startedAt, setStartedAt] = useState<number | undefined>(session.startedAt)
  const [rpe, setRpe] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [resting, setResting] = useState<Resting | null>(null)
  const [comoSeHace, setComoSeHace] = useState<number | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const keto = data.checkIns.find((c) => c.date === session.date)?.keto ?? false

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
    const marcando = ejercicio.logs?.[si]?.done !== true
    updateSet(ei, si, { done: marcando })

    if (!marcando) {
      setResting(null)
      return
    }
    if (ejercicio.primary === 'cardio') return

    const esUltimaSerie = si === (ejercicio.logs?.length ?? 1) - 1
    const siguiente = exercises[ei + 1]

    if (!esUltimaSerie && ejercicio.plan.restSeconds) {
      setResting({ exercise: ei, set: si, seconds: ejercicio.plan.restSeconds })
    } else if (esUltimaSerie && siguiente) {
      // Antes no había pausa al cambiar de ejercicio: se encadenaba la última
      // serie de uno con la primera del siguiente.
      setResting({
        exercise: ei,
        set: si,
        seconds: DESCANSO_ENTRE_EJERCICIOS,
        nextName: siguiente.name
      })
    }
  }

  function cambiarEjercicio(ei: number) {
    const actual = exercises[ei]
    const alternativa = nextAlternative(actual, profile, { ...session, exercises })
    if (!alternativa) {
      setAviso(
        `No tengo otra opción de ${actual.name.toLowerCase()} con tu material. Añade equipamiento en Ajustes y aparecerán más.`
      )
      return
    }
    const sustituto = swapExercise(actual, alternativa, profile, data.sessions, {
      intensity: 'moderada',
      volumeScale: 1,
      keto
    })
    setExercises((prev) => prev.map((e, i) => (i === ei ? sustituto : e)))
    // Se recuerda para no volver a proponerlo en futuras sesiones.
    actions.saveProfile({
      ...profile,
      dislikedExercises: [...new Set([...(profile.dislikedExercises ?? []), actual.exerciseId])]
    })
    setResting(null)
    setComoSeHace(null)
    setAviso(null)
  }

  function mover(ei: number, delta: number) {
    const destino = ei + delta
    if (destino < 0 || destino >= exercises.length) return
    setExercises((prev) => {
      const copia = [...prev]
      ;[copia[ei], copia[destino]] = [copia[destino], copia[ei]]
      return copia
    })
    setResting(null)
    setComoSeHace(null)
  }

  function empezar() {
    const ahora = Date.now()
    setStartedAt(ahora)
    actions.saveSession({ ...session, exercises, startedAt: ahora })
  }

  function guardar() {
    actions.saveSession({
      ...session,
      exercises,
      rpe: rpe ?? undefined,
      startedAt,
      durationSec: startedAt ? elapsedSeconds(startedAt) : undefined,
      completed: true
    })
  }

  const doneSets = exercises.reduce((acc, e) => acc + (e.logs ?? []).filter((l) => l.done).length, 0)
  const totalSets = exercises.reduce((acc, e) => acc + (e.logs ?? []).length, 0)
  const volumen = exercises.reduce((acc, e) => acc + volumeLoad(e), 0)
  const enMarcha = startedAt !== undefined

  return (
    <div className="fade-in">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          {enMarcha ? 'En marcha' : 'Tu plan de hoy'}
        </p>
        {enMarcha && <Chrono startedAt={startedAt!} />}
      </div>
      <h1>{session.title}</h1>
      <p className="lede">
        {enMarcha
          ? `${doneSets} de ${totalSets} series. A tu ritmo: quedarte con ganas de más es la idea.`
          : 'Revisa el plan con calma: cambia lo que no encaje y ordénalo como quieras. Cuando estés, empezamos.'}
      </p>

      {exercises.map((e, ei) => (
        <div className="card" key={`${e.exerciseId}-${ei}`}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="item-title">{e.name}</div>
              <div className="item-meta">{planLabel(e)}</div>
            </div>
            <div className="reorder">
              <button onClick={() => mover(ei, -1)} disabled={ei === 0} aria-label={`Subir ${e.name}`}>
                ↑
              </button>
              <button
                onClick={() => mover(ei, 1)}
                disabled={ei === exercises.length - 1}
                aria-label={`Bajar ${e.name}`}
              >
                ↓
              </button>
            </div>
          </div>

          <div className="exercise-actions">
            {patternOf(e.exerciseId) && (
              <button
                className="disclose"
                aria-expanded={comoSeHace === ei}
                onClick={() => setComoSeHace(comoSeHace === ei ? null : ei)}
              >
                <Icon name="chevron" />
                ¿Cómo se hace?
              </button>
            )}
            {e.primary !== 'cardio' && (
              <button className="disclose" onClick={() => cambiarEjercicio(ei)}>
                <Icon name="spark" />
                Cambiar ejercicio
              </button>
            )}
          </div>
          {comoSeHace === ei && (
            <div className="how-to fade-in">
              <ExerciseAnimation pattern={patternOf(e.exerciseId)!} />
            </div>
          )}

          <div style={{ height: 10 }} />

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
                        updateSet(ei, si, { weightKg: ev.target.value ? Number(ev.target.value) : undefined })
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
                        updateSet(ei, si, { reps: ev.target.value ? Number(ev.target.value) : undefined })
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
                    label={resting.nextName ? `Descanso · siguiente: ${resting.nextName}` : undefined}
                    onSkip={() => setResting(null)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      ))}

      {aviso && (
        <p className="faint" style={{ margin: '0 4px 14px' }}>
          {aviso}
        </p>
      )}

      {!enMarcha ? (
        <>
          <button className="btn btn-primary" onClick={empezar}>
            Empezar entrenamiento
          </button>
          <button className="btn-quiet" onClick={() => actions.discardSession(session.id)}>
            Hoy no puedo — descartar sin culpa
          </button>
        </>
      ) : !finishing ? (
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
          <button className="btn btn-primary" onClick={guardar}>
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}
