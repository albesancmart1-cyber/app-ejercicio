import { useEffect, useRef, useState } from 'react'
import {
  EQUIPMENT_LABELS,
  SIDE_LABELS,
  type Equipment,
  type Exercise,
  type PlannedExercise,
  type Session,
  type SetLog,
  type SideMode
} from '../domain/types'
import { initLogs, syncExercise, volumeLoad } from '../domain/setLogs'
import { DESCANSO_ENTRE_EJERCICIOS } from '../domain/protocol'
import { changeVariant, swapExercise } from '../domain/swap'
import { prepareExercise } from '../domain/workoutBuilder'
import { implementOptions, sideOptions, variantLabel } from '../domain/variants'
import { exerciseById } from '../data/exercises'
import { actions, useAppData } from '../store/store'
import Icon from '../components/Icon'
import RestTimer from '../components/RestTimer'
import Chrono, { elapsedSeconds } from '../components/Chrono'
import ExerciseAnimation from '../components/ExerciseAnimation'
import ExercisePicker from '../components/ExercisePicker'
import { patternOf } from '../data/patterns'

function planLabel(pe: PlannedExercise): string {
  const parts = [`${pe.plan.sets} × ${pe.plan.reps}`]
  if (pe.plan.rir !== undefined && pe.primary !== 'cardio') parts.push(`RIR ${pe.plan.rir}`)
  if (pe.plan.restSeconds) parts.push(`${Math.round(pe.plan.restSeconds / 60)}′ descanso`)
  const forma = variantLabel(pe.variant)
  if (forma) parts.push(forma)
  return parts.join(' · ')
}

/** Qué está abierto sobre la sesión: cambiar un ejercicio, o añadir uno nuevo. */
type Eligiendo = { modo: 'cambiar'; indice: number } | { modo: 'anadir' }

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
  const [eligiendo, setEligiendo] = useState<Eligiendo | null>(null)

  const keto = data.checkIns.find((c) => c.date === session.date)?.keto ?? false
  // Con qué se planificó la sesión, para que un ejercicio elegido a mano reciba
  // el mismo trato que los propuestos.
  const contexto = { intensity: 'moderada' as const, volumeScale: 1, keto }

  /**
   * Lo anotado vivía solo en el estado del componente, así que cambiar de
   * pestaña lo desmontaba y se perdían pesos y repeticiones. Ahora se persiste
   * según se escribe —con un pequeño retardo para no guardar en cada tecla— y
   * se vuelca sí o sí al salir de la pantalla.
   */
  const ultimo = useRef({ exercises, startedAt })
  ultimo.current = { exercises, startedAt }
  // Una vez terminada o descartada, no debe resucitarla el volcado de salida.
  const cerrada = useRef(false)

  useEffect(() => {
    if (cerrada.current) return
    const id = setTimeout(() => {
      actions.saveSession({ ...session, exercises, startedAt })
    }, 300)
    return () => clearTimeout(id)
  }, [exercises, startedAt])

  useEffect(
    () => () => {
      if (!cerrada.current) {
        actions.saveSession({ ...session, ...ultimo.current })
      }
    },
    []
  )

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

  /**
   * Antes esto rotaba a ciegas por las alternativas, y con dos opciones en el
   * grupo acababa yendo y viniendo entre las mismas dos. Ahora se abre la lista
   * y se elige, que es lo que uno quiere cuando el motivo del cambio la app no
   * lo puede adivinar.
   */
  function elegido(exercise: Exercise) {
    if (!eligiendo) return
    if (eligiendo.modo === 'cambiar') {
      const actual = exercises[eligiendo.indice]
      const sustituto = swapExercise(actual, exercise, profile, data.sessions, contexto)
      setExercises((prev) => prev.map((e, i) => (i === eligiendo.indice ? sustituto : e)))
      setAviso(`Cambiado: ${actual.name} → ${exercise.name}.`)
    } else {
      const nuevo = prepareExercise(exercise, profile, {
        ...contexto,
        rir: exercises[0]?.plan.rir ?? 2,
        history: data.sessions,
        addedByUser: true
      })
      setExercises((prev) => [...prev, nuevo])
      setAviso(`Añadido: ${exercise.name}.`)
    }
    setEligiendo(null)
    setResting(null)
    setComoSeHace(null)
  }

  /** Que no se lo proponga más. Es una decisión aparte de cambiarlo hoy. */
  function noProponerMas(ei: number) {
    const actual = exercises[ei]
    actions.saveProfile({
      ...profile,
      dislikedExercises: [...new Set([...(profile.dislikedExercises ?? []), actual.exerciseId])],
      favoriteExercises: (profile.favoriteExercises ?? []).filter((id) => id !== actual.exerciseId)
    })
    setAviso(`${actual.name} ya no aparecerá en próximas sesiones. Puedes recuperarlo en Ajustes.`)
  }

  function alternarFavorito(id: string) {
    const favoritos = profile.favoriteExercises ?? []
    actions.saveProfile({
      ...profile,
      favoriteExercises: favoritos.includes(id)
        ? favoritos.filter((f) => f !== id)
        : [...favoritos, id],
      // Marcar algo como favorito lo saca de los descartados: es contradictorio.
      dislikedExercises: (profile.dislikedExercises ?? []).filter((d) => d !== id)
    })
  }

  /** Con qué y de qué forma se ha hecho. Cambia el peso sugerido, no lo anotado. */
  function ajustarVariante(ei: number, patch: { implement?: Equipment; side?: SideMode }) {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== ei) return e
        const variant = { ...e.variant, ...patch } as PlannedExercise['variant']
        return changeVariant(e, variant!, profile, data.sessions, contexto)
      })
    )
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

  function descartar() {
    cerrada.current = true
    actions.discardSession(session.id)
  }

  function guardar() {
    cerrada.current = true
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

  if (eligiendo) {
    const actual = eligiendo.modo === 'cambiar' ? exercises[eligiendo.indice] : undefined
    return (
      <ExercisePicker
        profile={profile}
        title={actual ? `En lugar de ${actual.name.toLowerCase()}` : 'Añadir un ejercicio'}
        initialGroup={actual?.primary}
        inSession={exercises.map((e) => e.exerciseId)}
        onPick={elegido}
        onToggleFavorite={alternarFavorito}
        onClose={() => setEligiendo(null)}
      />
    )
  }

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
              <>
                <button
                  className="disclose"
                  onClick={() => setEligiendo({ modo: 'cambiar', indice: ei })}
                >
                  <Icon name="spark" />
                  Cambiar ejercicio
                </button>
                <button className="btn-quiet btn-inline" onClick={() => noProponerMas(ei)}>
                  No me lo propongas más
                </button>
              </>
            )}
          </div>
          {comoSeHace === ei && (
            <div className="how-to fade-in">
              <ExerciseAnimation pattern={patternOf(e.exerciseId)!} />
            </div>
          )}

          {(() => {
            const ex = exerciseById(e.exerciseId)
            if (!ex) return null
            const materiales = implementOptions(ex, profile)
            const lados = sideOptions(ex)
            if (materiales.length === 0 && lados.length === 0) return null
            return (
              <>
                <p className="faint" style={{ fontSize: '0.76rem', margin: '12px 0 0' }}>
                  ¿Cómo lo haces? Se guarda con la serie, y el peso que te sugiera la próxima vez
                  será el de esta misma forma.
                </p>
                {materiales.length > 0 && (
                  <div className="variant-row">
                    {materiales.map((eq) => (
                      <button
                        key={eq}
                        className="opt"
                        aria-pressed={e.variant?.implement === eq}
                        onClick={() => ajustarVariante(ei, { implement: eq })}
                      >
                        {EQUIPMENT_LABELS[eq]}
                      </button>
                    ))}
                  </div>
                )}
                {lados.length > 0 && (
                  <div className="variant-row">
                    {lados.map((s) => (
                      <button
                        key={s}
                        className="opt"
                        aria-pressed={e.variant?.side === s}
                        onClick={() => ajustarVariante(ei, { side: s })}
                      >
                        {SIDE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )
          })()}

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

      <button className="btn btn-secondary" onClick={() => setEligiendo({ modo: 'anadir' })}>
        Añadir un ejercicio de la lista
      </button>

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
          <button className="btn-quiet" onClick={() => descartar()}>
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
          <button className="btn-quiet" onClick={() => descartar()}>
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
