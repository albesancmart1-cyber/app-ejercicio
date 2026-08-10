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

const W = 320
const H = 120
const PAD = { top: 12, right: 10, bottom: 18, left: 10 }

type Punto = { fecha: string; valor: number }

function Curva({ puntos, unidad }: { puntos: Punto[]; unidad: string }) {
  const maximo = Math.max(...puntos.map((p) => p.valor))
  const minimo = Math.min(...puntos.map((p) => p.valor))
  // Un margen abajo para que la línea no se pegue al canto, y para que una
  // progresión pequeña no parezca un despegue: la escala arranca por debajo del
  // mínimo, no en él.
  const suelo = minimo - Math.max(1, (maximo - minimo) * 0.35)
  const techo = maximo + Math.max(1, (maximo - minimo) * 0.15)
  const x = (i: number) =>
    PAD.left + (i / Math.max(1, puntos.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) =>
    PAD.top + (1 - (v - suelo) / Math.max(0.001, techo - suelo)) * (H - PAD.top - PAD.bottom)

  const linea = puntos.map((p, i) => `${x(i)},${y(p.valor)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="ficha-chart"
      role="img"
      aria-label={`Progresión en ${unidad}, de lo más antiguo a lo más reciente`}
    >
      <polyline points={linea} className="ficha-linea" fill="none" />
      {puntos.map((p, i) => (
        <circle key={p.fecha} cx={x(i)} cy={y(p.valor)} r={i === puntos.length - 1 ? 3.5 : 2} className="ficha-punto" />
      ))}
    </svg>
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
