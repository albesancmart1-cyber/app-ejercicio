import { useState } from 'react'
import { historialDe, recordsDe } from '../domain/records'
import { cuandoFue } from '../domain/ultimaVez'
import { MUSCLE_LABELS } from '../domain/types'
import type { MuscleGroup, Session } from '../domain/types'

/**
 * Tus ejercicios, como sección con nombre.
 *
 * La ficha de un ejercicio existía desde hace tiempo, pero solo se llegaba a
 * ella **desde una sesión en curso**: para saber cómo vas en press de banca
 * había que estar entrenando press de banca. Aquí se puede mirar cuando a uno
 * le apetece, que es casi siempre entre entrenos.
 *
 * Se listan los que has hecho de verdad, no el catálogo entero: un buscador
 * sobre 149 ejercicios que nunca has tocado no responde a ninguna pregunta.
 */
interface Fila {
  exerciseId: string
  name: string
  primary: MuscleGroup
  veces: number
  ultima: string
  /** Para ordenar por reciente. */
  fecha: string
  tope?: number
}

function filasDe(sessions: Session[], todayIso: string): Fila[] {
  const vistos = new Map<string, { name: string; primary: MuscleGroup }>()
  for (const s of sessions) {
    if (!s.completed) continue
    for (const pe of s.exercises) {
      if (pe.primary === 'cardio') continue
      if (!vistos.has(pe.exerciseId)) {
        vistos.set(pe.exerciseId, { name: pe.name, primary: pe.primary })
      }
    }
  }

  return [...vistos.entries()]
    .map(([exerciseId, { name, primary }]) => {
      const dias = historialDe(exerciseId, sessions)
      const marcas = recordsDe(exerciseId, sessions)
      return {
        exerciseId,
        name,
        primary,
        veces: dias.length,
        fecha: dias[0]?.fecha ?? '',
        ultima: dias[0] ? cuandoFue(dias[0].fecha, todayIso) : 'nunca',
        tope: marcas.pesoMaximo?.valor
      }
    })
    .filter((f) => f.veces > 0)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
}

/** Sin tildes ni mayúsculas, para que buscar «biceps» encuentre «bíceps». */
function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function ExerciseList({
  sessions,
  todayIso,
  onOpen
}: {
  sessions: Session[]
  todayIso: string
  onOpen: (exerciseId: string, name: string) => void
}) {
  const [busca, setBusca] = useState('')
  const todas = filasDe(sessions, todayIso)
  const filtradas = busca.trim()
    ? todas.filter(
        (f) =>
          normalizar(f.name).includes(normalizar(busca)) ||
          normalizar(MUSCLE_LABELS[f.primary]).includes(normalizar(busca))
      )
    : todas

  if (todas.length === 0) {
    return (
      <div className="card">
        <p className="eyebrow">Tus ejercicios</p>
        <p className="dim">
          Cuando entrenes, aquí tendrás la ficha de cada ejercicio: tus marcas, tu curva de fuerza y
          todas las veces que lo has hecho.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="eyebrow">Tus ejercicios</p>
      <label className="field">
        <span>Buscar</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Press, espalda, curl…"
          aria-label="Buscar un ejercicio"
        />
      </label>

      <p className="faint" style={{ margin: '12px 0 4px' }}>
        {filtradas.length} de {todas.length}, del más reciente al más antiguo.
      </p>

      {filtradas.map((f) => (
        <button
          className="item item-tap"
          key={f.exerciseId}
          onClick={() => onOpen(f.exerciseId, f.name)}
        >
          <div className="item-body">
            <div className="item-title">{f.name}</div>
            <div className="item-meta">
              {MUSCLE_LABELS[f.primary]} · {f.veces} {f.veces === 1 ? 'vez' : 'veces'} ·{' '}
              {f.ultima}
              {f.tope ? ` · tope ${f.tope} kg` : ''}
            </div>
          </div>
          <span className="chev" aria-hidden="true" />
        </button>
      ))}

      {filtradas.length === 0 && <p className="dim">Nada con ese nombre entre lo que has hecho.</p>}
    </div>
  )
}
