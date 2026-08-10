import {
  NOMBRE_MARCA,
  formatMarca,
  historialDe,
  marcasDe,
  origenDeMarca,
  recordsDe,
  type DiaDeEjercicio
} from '../domain/records'
import { describirSerie } from '../domain/sessionSummary'
import { cuandoFue } from '../domain/ultimaVez'
import { variantLabel } from '../domain/variants'
import { TIPO_SERIE_LABELS } from '../domain/types'
import { tipoDe } from '../domain/setLogs'
import type { Session } from '../domain/types'
import { Regla } from './ui'
import { Sparkline, SparklineChart } from '@appica/ui-react/sparkline'

/**
 * La ficha de un ejercicio: tus marcas y todo lo que has hecho en él.
 *
 * El historial de la app estaba ordenado por días, y eso responde a «qué hice
 * el martes» pero no a la pregunta que uno se hace de verdad delante de la
 * máquina: «¿voy a más en esto?». Aquí se mira al revés —un ejercicio, todas
 * sus veces— y la respuesta se ve en la curva sin tener que sumar nada.
 *
 * La curva es de **1RM estimado** y no de peso a secas porque el peso solo sube
 * a saltos: pasar de 40×8 a 40×11 es progresar y en un gráfico de kilos se ve
 * plano. Donde no hay peso —fondos, dominadas— se dibujan las repeticiones, que
 * es lo que allí progresa.
 */

type Punto = { fecha: string; valor: number }

/**
 * La curva del ejercicio, sobre `Sparkline`.
 *
 * Sustituye a un SVG a mano con su propia escala. Además de la línea, la
 * librería trae lo que aquello no tenía: un indicador que sigue al dedo y un
 * globo con el valor de cada sesión, que es justo lo que uno quiere al mirar
 * una progresión —«¿cuánto moví el 3 de marzo?»— y que en un dibujo plano no
 * había forma de responder.
 *
 * Va en `line` y no en `area`: el relleno bajo la curva insinúa un volumen
 * acumulado, y esto no acumula nada, es una serie de marcas sueltas.
 */
function Curva({ puntos, unidad }: { puntos: Punto[]; unidad: string }) {
  return (
    <Sparkline
      className="ficha-chart"
      data={puntos.map((p) => p.valor)}
      labels={puntos.map((p) => p.fecha)}
      locale="es-ES"
      color="var(--accent)"
    >
      <SparklineChart
        variant="line"
        height={120}
        strokeWidth={2}
        indicator
        tooltip
        aria-label={`Progresión en ${unidad}, de lo más antiguo a lo más reciente`}
      />
    </Sparkline>
  )
}

/** Los puntos de la curva: 1RM estimado si hay peso, repeticiones si no. */
function puntosDe(dias: DiaDeEjercicio[]): { puntos: Punto[]; unidad: string } {
  const viejoPrimero = [...dias].reverse()
  const conEstimacion = viejoPrimero.filter((d) => d.unRM !== undefined)
  if (conEstimacion.length >= 2) {
    return {
      puntos: conEstimacion.map((d) => ({ fecha: d.fecha, valor: d.unRM! })),
      unidad: 'kilos a una repetición'
    }
  }
  const conReps = viejoPrimero
    .map((d) => ({
      fecha: d.fecha,
      valor: Math.max(...d.series.map((l) => l.reps ?? 0))
    }))
    .filter((p) => p.valor > 0)
  return { puntos: conReps, unidad: 'repeticiones' }
}

export default function ExerciseSheet({
  exerciseId,
  name,
  sessions,
  todayIso,
  onClose
}: {
  exerciseId: string
  name: string
  sessions: Session[]
  todayIso: string
  onClose: () => void
}) {
  const records = recordsDe(exerciseId, sessions)
  const dias = historialDe(exerciseId, sessions)
  const marcas = marcasDe(records)
  const { puntos, unidad } = puntosDe(dias)

  return (
    <div className="picker session-detail">
      <span className="sheet-grabber" aria-hidden="true" />
      <div className="picker-head">
        <div className="row">
          <p className="eyebrow" style={{ margin: 0 }}>
            Tus marcas
          </p>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar la ficha">
            ✕
          </button>
        </div>
        <h2 style={{ marginTop: 4 }}>{name}</h2>
      </div>

      <div className="picker-list">
        {dias.length === 0 ? (
          <p className="dim">
            Todavía no has registrado ninguna serie de este ejercicio. En cuanto lo entrenes una vez,
            aquí tendrás con qué comparar.
          </p>
        ) : (
          <>
            {marcas.length > 0 && (
              <div className="stat-row">
                {marcas.map(({ tipo, marca }) => (
                  <span className="stat" key={tipo}>
                    <span className="stat-label">{NOMBRE_MARCA[tipo]}</span>
                    <span className="stat-value">{formatMarca(tipo, marca)}</span>
                    <span className="faint">
                      {[origenDeMarca(marca), cuandoFue(marca.fecha, todayIso)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {records.unRM && (
              <p className="faint" style={{ marginTop: 4 }}>
                El 1RM es una estimación a partir de tus series, no una medida: sirve para comparar
                un día con otro, no para ir a intentarlo.
              </p>
            )}

            {puntos.length >= 2 && (
              <>
                <Regla />
                <p className="eyebrow">Cómo va</p>
                <Curva puntos={puntos} unidad={unidad} />
                <p className="faint">
                  {unidad === 'repeticiones'
                    ? 'Las repeticiones de tu mejor serie de cada día, de la primera vez a la última.'
                    : 'Kilos a una repetición estimados a partir de tu mejor serie de cada día, de la primera vez a la última.'}
                </p>
              </>
            )}

            <Regla />
            <p className="eyebrow">Vez por vez</p>
            {dias.map((d) => (
              <div className="detail-ex" key={`${d.sessionId}-${d.fecha}`}>
                <div className="row">
                  <h3>{cuandoFue(d.fecha, todayIso)}</h3>
                  <span className="faint">{d.fecha}</span>
                </div>
                <p className="faint" style={{ marginTop: 2 }}>
                  {[
                    variantLabel(d.variante),
                    d.carga > 0 ? `${Math.round(d.carga).toLocaleString('es-ES')} kg` : null,
                    d.rirMedio !== undefined ? `RIR ${d.rirMedio}` : null
                  ]
                    .filter(Boolean)
                    .join(' · ') || `${d.series.length} series`}
                </p>
                <ol className="set-list">
                  {d.series.map((l, j) => (
                    <li key={j}>
                      <span className="set-n">{j + 1}</span>
                      <span className="set-val">{describirSerie(l)}</span>
                      {tipoDe(l) === 'fallo' && (
                        <span className="faint">{TIPO_SERIE_LABELS.fallo.toLowerCase()}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
