/**
 * Elegir un ejercicio del catálogo a mano.
 *
 * El botón de cambiar rotaba a ciegas por las alternativas, y con pocos
 * ejercicios por grupo acababa alternando siempre entre los dos mismos. Aquí se
 * ve la lista entera y se elige, que es lo que uno quiere cuando el ejercicio
 * propuesto no encaja por un motivo que la app no puede adivinar.
 *
 * El catálogo es largo a propósito, así que se ordena por lo que importa:
 * **los favoritos primero**, con su estrella para marcarlos y desmarcarlos sin
 * salir de aquí. Buscar por nombre resuelve el resto.
 */
import { useMemo, useState } from 'react'
import { MUSCLE_GROUPS, MUSCLE_LABELS, type Exercise, type MuscleGroup, type Profile } from '../domain/types'
import { catalogFor } from '../domain/swap'
import { patternOf, PATTERN_LABELS } from '../data/patterns'
import { MUSCLES } from '../domain/muscles'
import { formatSeries, impactoDeAnadir, type MuscleVolume } from '../domain/volume'
import { allLandmarks } from '../domain/landmarks'
import type { LandmarkOpts } from '../domain/landmarks'
import Icon from './Icon'
import { Opcion } from './ui'

const GRUPOS = MUSCLE_GROUPS.filter((g) => g !== 'cardio')

export default function ExercisePicker({
  profile,
  title,
  initialGroup,
  inSession,
  volumenActual,
  seriesPrevistas = 3,
  landmarkOpts = {},
  onPick,
  onToggleFavorite,
  onClose
}: {
  profile: Profile
  title: string
  /** Grupo por el que abrir. El usuario puede mirar cualquier otro. */
  initialGroup?: MuscleGroup
  /** Los que ya están en la sesión, para avisar en vez de dejar repetir a ciegas. */
  inSession: string[]
  /**
   * Volumen semanal de cada músculo. Con él, cada ejercicio enseña **a qué
   * dejaría la semana** si se mete: elegir a ciegas entre cien nombres es justo
   * lo que la app quiere evitar.
   */
  volumenActual?: MuscleVolume
  /** Series con las que entraría, para calcular ese impacto. */
  seriesPrevistas?: number
  landmarkOpts?: LandmarkOpts
  onPick: (exercise: Exercise) => void
  onToggleFavorite: (id: string) => void
  onClose: () => void
}) {
  const [group, setGroup] = useState<MuscleGroup | 'todos'>(initialGroup ?? 'todos')
  const [search, setSearch] = useState('')
  const [todoElMaterial, setTodoElMaterial] = useState(false)

  const favoritos = new Set(profile.favoriteExercises ?? [])
  const yaEsta = new Set(inSession)
  const landmarks = allLandmarks(landmarkOpts)

  /**
   * Los dos músculos a los que más aportaría, con el antes y el después. Se
   * marca el caso que de verdad decide: el que cruza el mínimo semanal.
   */
  function impacto(e: Exercise) {
    if (!volumenActual) return null
    const pe = {
      exerciseId: e.id,
      name: e.name,
      primary: e.primary,
      plan: { sets: seriesPrevistas, reps: '' }
    }
    return impactoDeAnadir(volumenActual, pe)
      .slice(0, 2)
      .map((x) => ({
        ...x,
        cruza: x.antes < landmarks[x.musculo].mev && x.despues >= landmarks[x.musculo].mev
      }))
  }

  const lista = useMemo(
    () =>
      catalogFor(profile, {
        group: group === 'todos' ? undefined : group,
        onlyOwned: !todoElMaterial,
        search
      }),
    [profile, group, search, todoElMaterial]
  )

  return (
    <div className="picker">
      <span className="sheet-grabber" aria-hidden="true" />
      <div className="picker-head">
        <div className="row">
          <p className="eyebrow" style={{ margin: 0 }}>
            {title}
          </p>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar la lista">
            <Icon name="close" />
          </button>
        </div>

        <input
          className="picker-search"
          type="search"
          placeholder="Buscar por nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar un ejercicio"
        />

        <div className="options picker-groups">
          <Opcion activa={group === 'todos'} onElegir={() => setGroup('todos')}>
            Todo
          </Opcion>
          {GRUPOS.map((g) => (
            <Opcion key={g} activa={group === g} onElegir={() => setGroup(g)}>
              {MUSCLE_LABELS[g]}
            </Opcion>
          ))}
        </div>
      </div>

      <div className="picker-list">
        {lista.length === 0 && (
          <p className="faint" style={{ padding: '18px 4px' }}>
            Nada con ese nombre. Prueba con otra palabra, o mira todos los grupos.
          </p>
        )}
        {lista.map((e) => {
          const patron = patternOf(e.id)
          const cambio = impacto(e)
          return (
            <div className="picker-item" key={e.id}>
              <button
                className="picker-pick"
                onClick={() => onPick(e)}
                disabled={yaEsta.has(e.id)}
                aria-label={`Elegir ${e.name}`}
              >
                <span className="item-title">{e.name}</span>
                <span className="item-meta">
                  {[
                    // Filtrando por un grupo, repetirlo en cada línea solo estorba.
                    group === 'todos' ? MUSCLE_LABELS[e.primary] : null,
                    patron ? PATTERN_LABELS[patron].toLowerCase() : null,
                    yaEsta.has(e.id) ? 'ya está en la sesión' : null
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {cambio && cambio.length > 0 && (
                  <span className="item-impact">
                    {cambio.map((c) => (
                      <span key={c.musculo} className={c.cruza ? 'crosses' : ''}>
                        {MUSCLES[c.musculo].short} {formatSeries(c.antes)} → {formatSeries(c.despues)}
                      </span>
                    ))}
                  </span>
                )}
              </button>
              <button
                className="picker-star"
                aria-pressed={favoritos.has(e.id)}
                aria-label={`${favoritos.has(e.id) ? 'Quitar de' : 'Añadir a'} favoritos: ${e.name}`}
                onClick={() => onToggleFavorite(e.id)}
              >
                <Icon name="spark" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="picker-foot">
        <Opcion activa={todoElMaterial} onElegir={() => setTodoElMaterial((v) => !v)}>
          {todoElMaterial ? 'Viendo todo el catálogo' : 'Solo lo que puedo hacer con mi material'}
        </Opcion>
        <p className="faint" style={{ margin: '10px 2px 0' }}>
          La estrella marca favoritos: de esos tira la app cuando te propone la sesión.
        </p>
      </div>
    </div>
  )
}
