import type { JSX } from 'react'
import { TIPO_SERIE_CORTO, type PlannedExercise, type SetLog, type TipoSerie } from '../domain/types'
import { tipoDe } from '../domain/setLogs'
import Icon from './Icon'
import { Boton } from './ui'

/**
 * El modo foco: un ejercicio, una serie, un botón.
 *
 * La pantalla de sesión era una lista con ocho acciones secundarias en texto
 * —cómo se hace, mis marcas, cambiar, elegir, quitar, superserie, calentamiento,
 * descanso y notas— por encima de los campos donde se anota. Con las
 * pulsaciones a 140 se usa el 10 % de esa interfaz, y el 90 % estorba.
 *
 * Aquí se ve lo que toca ahora y nada más. Tres decisiones de fondo:
 *
 *  - **Steppers en vez de campos.** El peso casi nunca cambia y las
 *    repeticiones se mueven de una en una. Botones de 44 px en vez de teclado
 *    numérico y precisión de dedo.
 *  - **El RIR en cinco botones**, con el objetivo señalado. Es el dato que
 *    alimenta la fatiga: cuanto más fácil de poner, más veces se anota.
 *  - **«Serie hecha» de ancho completo**, en la zona del pulgar. Antes era un
 *    círculo de veintiocho píxeles al final de la fila.
 */
const PASOS_RIR = [0, 1, 2, 3, 4] as const

/** El salto del peso: 2,5 kg en barra, 1 en el resto. */
export function pasoDePeso(conBarra: boolean): number {
  return conBarra ? 2.5 : 1
}

export default function FocusMode({
  ejercicio,
  etiqueta,
  set,
  totalSeries,
  serieN,
  totalSerieN,
  conBarra,
  crono,
  pesoSugerido,
  repsSugeridas,
  ultimaVez,
  discos,
  siguiente,
  onCambiarPeso,
  onCambiarReps,
  onCambiarRir,
  onCambiarTipo,
  onHecha,
  onMenu,
  onVerTodo
}: {
  ejercicio: PlannedExercise
  etiqueta?: string
  set: SetLog
  /** Series de este ejercicio. */
  totalSeries: number
  /** Cuál es esta serie dentro del ejercicio, empezando en 1. */
  serieN: number
  /** Series hechas y totales de la sesión, para la barra de arriba. */
  totalSerieN: { hechas: number; total: number }
  conBarra: boolean
  /** El cronómetro de la sesión, que aquí es la única referencia de tiempo. */
  crono?: JSX.Element
  /** Lo que propone el plan, mientras no se haya anotado nada. */
  pesoSugerido?: number
  repsSugeridas?: number
  ultimaVez?: string
  discos?: string
  siguiente?: { etiqueta?: string; nombre: string; sinDescanso: boolean }
  onCambiarPeso: (delta: number) => void
  onCambiarReps: (delta: number) => void
  onCambiarRir: (rir: number) => void
  onCambiarTipo: () => void
  onHecha: () => void
  onMenu: () => void
  onVerTodo: () => void
}) {
  const tipo: TipoSerie = tipoDe(set)
  const progreso = Math.round((totalSerieN.hechas / Math.max(1, totalSerieN.total)) * 100)
  const objetivo = ejercicio.plan.rir

  return (
    <div className="focus fade-in">
      <div className="row focus-top">
        <div className="focus-cuenta">
          <span className="faint">
            Serie {totalSerieN.hechas + 1} de {totalSerieN.total}
          </span>
          {crono}
        </div>
        <div className="focus-acciones">
          <button className="icon-btn" onClick={onVerTodo} aria-label="Ver todos los ejercicios">
            <Icon name="list" />
          </button>
          <button className="icon-btn" onClick={onMenu} aria-label="Más opciones de este ejercicio">
            <Icon name="dots" />
          </button>
        </div>
      </div>
      <div className="focus-track" aria-hidden="true">
        <div className="focus-fill" style={{ width: `${progreso}%` }} />
      </div>

      {etiqueta && <span className="ss-tag focus-ss">{etiqueta} · superserie</span>}
      <h1 className="focus-nombre">{ejercicio.name}</h1>
      {ultimaVez && <p className="focus-ultima">{ultimaVez}</p>}

      <div className="card focus-card">
        <div className="row" style={{ marginBottom: 18 }}>
          <button className="focus-tipo" onClick={onCambiarTipo}>
            {tipo === 'normal' ? `Serie ${serieN} de ${totalSeries}` : TIPO_SERIE_CORTO[tipo]}
          </button>
          <div className="focus-puntos" aria-hidden="true">
            {Array.from({ length: totalSeries }, (_, i) => (
              <span
                key={i}
                className={`focus-punto ${i < serieN - 1 ? 'hecha' : i === serieN - 1 ? 'ahora' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="focus-campos">
          <div className="focus-campo">
            <p className="focus-label">Peso</p>
            <div className="stepper">
              <button
                onClick={() => onCambiarPeso(-pasoDePeso(conBarra))}
                aria-label="Bajar el peso"
              >
                −
              </button>
              {/* Mientras no se haya anotado nada se enseña lo que propone el
                  plan, en gris: es el número desde el que van a contar los
                  botones, y esconderlo tras un guion obligaba a adivinarlo. */}
              <span className={`stepper-num ${set.weightKg === undefined ? 'sugerido' : ''}`}>
                {set.weightKg ?? pesoSugerido ?? '—'}
              </span>
              <button
                onClick={() => onCambiarPeso(pasoDePeso(conBarra))}
                aria-label="Subir el peso"
              >
                +
              </button>
            </div>
            <p className="focus-unidad">kg</p>
          </div>

          <div className="focus-campo">
            <p className="focus-label">Reps</p>
            <div className="stepper">
              <button onClick={() => onCambiarReps(-1)} aria-label="Bajar las repeticiones">
                −
              </button>
              <span className={`stepper-num ${set.reps === undefined ? 'sugerido' : ''}`}>
                {set.reps ?? repsSugeridas ?? '—'}
              </span>
              <button onClick={() => onCambiarReps(1)} aria-label="Subir las repeticiones">
                +
              </button>
            </div>
            <p className="focus-unidad">repeticiones</p>
          </div>
        </div>

        {discos && <p className="plate-hint focus-discos">{discos}</p>}

        <p className="focus-label" style={{ marginTop: 20 }}>
          Esfuerzo real{objetivo !== undefined ? ` · te pedía RIR ${objetivo}` : ''}
        </p>
        <div className="focus-rir">
          {PASOS_RIR.map((n) => (
            <button
              key={n}
              className={`focus-rir-op ${set.rir === n ? 'on' : ''} ${
                set.rir === undefined && objetivo === n ? 'objetivo' : ''
              }`}
              onClick={() => onCambiarRir(n)}
              aria-label={`Anotar RIR ${n}${n === 4 ? ' o más' : ''}`}
              aria-pressed={set.rir === n}
            >
              {n === 4 ? '4+' : n}
            </button>
          ))}
        </div>
      </div>

      <Boton tono="primario" className="focus-hecha" onClick={onHecha}>
        <Icon name="check" />
        Serie hecha
      </Boton>

      {siguiente && (
        <div className="focus-siguiente">
          <div>
            <p className="faint">{siguiente.sinDescanso ? 'Sigue sin descanso' : 'Después'}</p>
            <p className="focus-siguiente-nombre">
              {siguiente.etiqueta ? `${siguiente.etiqueta} · ` : ''}
              {siguiente.nombre}
            </p>
          </div>
          <Icon name="chevron" />
        </div>
      )}
    </div>
  )
}
