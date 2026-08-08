import { describirSerie, formatCarga, resumirSesion } from '../domain/sessionSummary'
import { formatDuration } from './Chrono'
import BodyMap from './BodyMap'
import { TIPO_SERIE_LABELS, type Session } from '../domain/types'
import { esCalentamiento, tipoDe } from '../domain/setLogs'

/**
 * Lo que se hizo en un entreno, abierto desde el historial.
 *
 * Todo esto estaba guardado desde siempre —serie a serie, con su peso y sus
 * repeticiones— y no había forma de verlo: la lista daba título y fecha y ahí
 * se acababa. Poder volver a mirarlo es lo que convierte el historial en algo
 * que sirve para decidir el peso de mañana.
 *
 * Arriba los totales como bloques de dato, en medio la figura con lo que se
 * movió y debajo el desglose. Ese orden y no otro: de un vistazo se quiere
 * saber cuánto y dónde; el detalle serie a serie se busca después, y solo a
 * veces.
 */
export default function SessionDetail({ session, onClose }: { session: Session; onClose: () => void }) {
  const r = resumirSesion(session)
  const cardio = session.exercises.filter((pe) => pe.primary === 'cardio')

  return (
    <div className="picker session-detail">
      <span className="sheet-grabber" aria-hidden="true" />
      <div className="picker-head">
        <div className="row">
          <p className="eyebrow" style={{ margin: 0 }}>
            {session.date}
          </p>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar el detalle">
            ✕
          </button>
        </div>
        <h2 style={{ marginTop: 4 }}>{session.title}</h2>
      </div>

      <div className="picker-list">
        <div className="stat-row">
          <span className="stat">
            <span className="stat-label">Series</span>
            <span className="stat-value">{r.seriesEfectivas}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Repeticiones</span>
            <span className="stat-value">{r.repsTotales}</span>
          </span>
          {r.cargaTotal > 0 && (
            <span className="stat">
              <span className="stat-label">Levantado</span>
              <span className="stat-value">{formatCarga(r.cargaTotal)}</span>
            </span>
          )}
          {session.durationSec ? (
            <span className="stat">
              <span className="stat-label">Duración</span>
              <span className="stat-value">{formatDuration(session.durationSec)}</span>
            </span>
          ) : null}
          {r.esfuerzo.medida && (
            <span className="stat">
              <span className="stat-label">RIR medio</span>
              <span className="stat-value">{r.esfuerzo.rirMedio}</span>
            </span>
          )}
        </div>

        {r.seriesEfectivas !== r.seriesTotales && (
          <p className="faint" style={{ marginTop: 4 }}>
            Hiciste {r.seriesTotales} series de trabajo y cuentan {r.seriesEfectivas}: el
            calentamiento no suma y un drop set suma medio, porque continúa la serie anterior en
            vez de ser una nueva.
          </p>
        )}

        {r.cargaTotal > 0 && (
          <p className="faint" style={{ marginTop: 4 }}>
            «Levantado» es el peso por las repeticiones de cada serie, sumado. Sirve para comparar
            un entreno con el mismo entreno de la semana pasada, no con otro distinto.
          </p>
        )}

        {r.esfuerzo.medida && (
          <p className="faint" style={{ marginTop: 4 }}>
            {r.esfuerzo.seriesDuras > 0
              ? `${r.esfuerzo.seriesDuras} de ${r.esfuerzo.seriesMedidas} series fueron a una repetición del fallo o menos. Es lo que más cuesta reponer, y lo que la app mira para decidir si mañana toca apretar o descansar.`
              : `Ninguna de las ${r.esfuerzo.seriesMedidas} series medidas llegó cerca del fallo.`}
          </p>
        )}

        {session.rpe && (
          <p className="dim" style={{ marginTop: 12 }}>
            Sensación al terminar: {session.rpe}/5.
          </p>
        )}

        <hr className="rule" />
        <p className="eyebrow">Qué se movió</p>
        <BodyMap volumen={r.musculos} />

        <hr className="rule" />
        <p className="eyebrow">Ejercicio a ejercicio</p>

        {r.ejercicios.length === 0 && cardio.length === 0 && (
          <p className="dim">De esta sesión no quedó nada anotado.</p>
        )}

        {r.ejercicios.map((e, i) => (
          <div className="detail-ex" key={`${e.exerciseId}-${i}`}>
            <div className="row">
              <h3>{e.name}</h3>
              <span className="faint">
                {e.seriesHechas} de {e.seriesPlanificadas}
              </span>
            </div>
            <p className="faint" style={{ marginTop: 2 }}>
              {[
                e.variante?.side === 'unilateral' ? 'a un lado cada vez' : null,
                e.anadido ? 'añadido a mano' : null,
                e.pesoMaximo !== undefined ? `tope ${e.pesoMaximo} kg` : null,
                e.cargaTotal !== undefined ? formatCarga(e.cargaTotal) : null,
                e.rirMedio !== undefined ? `RIR ${e.rirMedio}` : null
              ]
                .filter(Boolean)
                .join(' · ') || 'sin peso'}
            </p>

            {e.series.length > 0 ? (
              <ol className="set-list">
                {e.series.map((l, j) => (
                  <li key={j} className={esCalentamiento(l) ? 'warmup' : ''}>
                    <span className="set-n">{j + 1}</span>
                    <span className="set-val">{describirSerie(l)}</span>
                    {tipoDe(l) !== 'normal' && tipoDe(l) !== 'fallo' && (
                      <span className="faint">{TIPO_SERIE_LABELS[tipoDe(l)].toLowerCase()}</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="faint" style={{ marginTop: 6 }}>
                {e.seriesHechas > 0
                  ? 'De este entreno solo quedó guardado que se hizo, sin el detalle de cada serie.'
                  : 'No llegó a registrarse.'}
              </p>
            )}
          </div>
        ))}

        {cardio.map((pe, i) => (
          <div className="detail-ex" key={`cardio-${i}`}>
            <h3>{pe.name}</h3>
            <p className="faint" style={{ marginTop: 2 }}>
              {pe.plan.reps}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
