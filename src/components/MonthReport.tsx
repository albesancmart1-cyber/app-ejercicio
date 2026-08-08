import { useState } from 'react'
import {
  estadisticasDe,
  formatVariacion,
  mesAnterior,
  mesDe,
  nombreDeMes,
  resumirMes,
  variacion
} from '../domain/estadisticas'
import { NOMBRE_MARCA } from '../domain/records'
import { formatDuration } from './Chrono'
import BodyMap from './BodyMap'
import Icon from './Icon'
import type { Session } from '../domain/types'

/**
 * El informe del mes.
 *
 * Cada cifra va con la del mes pasado al lado, porque una cifra sola no dice si
 * está bien o mal. Y con eso basta: no hay objetivo mensual que cumplir ni
 * medalla por llegar a una cuota. El mes que uno descansa más es a veces el que
 * más falta le hacía, y pintarlo en rojo sería mentir.
 */

/** Un mes hacia atrás o hacia delante, en formato yyyy-mm. */
function mover(ym: string, delta: number): string {
  const [a, m] = ym.split('-').map(Number)
  const total = a * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function Cifra({
  etiqueta,
  valor,
  cambio
}: {
  etiqueta: string
  valor: string
  cambio?: string
}) {
  return (
    <span className="stat">
      <span className="stat-label">{etiqueta}</span>
      <span className="stat-value">{valor}</span>
      {cambio && <span className="faint">{cambio}</span>}
    </span>
  )
}

export default function MonthReport({
  sessions,
  todayIso
}: {
  sessions: Session[]
  todayIso: string
}) {
  const [ym, setYm] = useState(todayIso.slice(0, 7))
  const primerDia = `${ym}-01`
  const mes = mesDe(primerDia)
  // El mes en curso se corta en hoy. Si no, un día 8 diría «entrenaste en 1 de
  // las 5 semanas del mes» contando cuatro semanas que aún no han pasado.
  const enCurso = mes.hasta > todayIso
  const e = estadisticasDe(sessions, enCurso ? { ...mes, hasta: todayIso } : mes)
  const previo = estadisticasDe(sessions, mesAnterior(primerDia))

  const hayAntes = sessions.some((s) => s.completed && s.date < primerDia)
  const hayDespues = ym < todayIso.slice(0, 7)

  const cambio = (ahora: number, antes: number) => formatVariacion(variacion(ahora, antes))

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          El mes
        </p>
        <div className="reorder">
          <button
            onClick={() => setYm(mover(ym, -1))}
            disabled={!hayAntes}
            aria-label="El mes anterior"
          >
            ‹
          </button>
          <button
            onClick={() => setYm(mover(ym, 1))}
            disabled={!hayDespues}
            aria-label="El mes siguiente"
          >
            ›
          </button>
        </div>
      </div>
      {/* La mayúscula se pone a mano y no con `capitalize`, que pondría también
          la del «de» y dejaría «Agosto De 2026». */}
      <h2 style={{ marginTop: 4 }}>{conMayuscula(nombreDeMes(primerDia))}</h2>

      {e.entrenos === 0 ? (
        <p className="dim" style={{ marginTop: 12 }}>
          {resumirMes(e)}
        </p>
      ) : (
        <>
          <div className="stat-row" style={{ marginTop: 14 }}>
            <Cifra
              etiqueta="Entrenos"
              valor={`${e.entrenos}`}
              cambio={cambio(e.entrenos, previo.entrenos)}
            />
            {e.minutos > 0 && (
              <Cifra
                etiqueta="Tiempo"
                valor={formatDuration(e.minutos * 60)}
                cambio={cambio(e.minutos, previo.minutos)}
              />
            )}
            <Cifra etiqueta="Series" valor={`${e.series}`} cambio={cambio(e.series, previo.series)} />
            {e.cargaTotal > 0 && (
              <Cifra
                etiqueta="Levantado"
                valor={`${e.cargaTotal.toLocaleString('es-ES')} kg`}
                cambio={cambio(e.cargaTotal, previo.cargaTotal)}
              />
            )}
            {e.cardioMinutos > 0 && (
              <Cifra
                etiqueta="Cardio"
                valor={`${e.cardioMinutos} min`}
                cambio={cambio(e.cardioMinutos, previo.cardioMinutos)}
              />
            )}
          </div>

          <p className="dim" style={{ marginTop: 12 }}>
            {resumirMes(e, previo)}
          </p>

          <p className="faint" style={{ marginTop: 6 }}>
            {enCurso
              ? `Llevas ${e.semanasConEntreno} de las ${e.semanas} semanas que va el mes con algún entreno.`
              : `Entrenaste en ${e.semanasConEntreno} de las ${e.semanas} semanas del mes.`}
            {e.entrenosCronometrados < e.entrenos && e.minutos > 0
              ? ` El tiempo sale de ${e.entrenosCronometrados} de los ${e.entrenos} entrenos: los demás no se cronometraron.`
              : ''}
          </p>

          <hr className="rule" />
          <p className="eyebrow">Qué se movió</p>
          <BodyMap volumen={e.porMusculo} />

          {e.records.length > 0 && (
            <>
              <hr className="rule" />
              <p className="eyebrow">Récords del mes</p>
              {e.records.map((r, i) => (
                <p className="record-hint" key={`${r.exerciseId}-${r.fecha}-${i}`}>
                  <Icon name="spark" />
                  {r.name}: {r.tipos.map((t) => NOMBRE_MARCA[t].toLowerCase()).join(', ')}
                </p>
              ))}
            </>
          )}

          {e.masHechos.length > 0 && (
            <>
              <hr className="rule" />
              <p className="eyebrow">Lo que más has hecho</p>
              {e.masHechos.slice(0, 5).map((x) => (
                <div className="row" style={{ padding: '6px 0' }} key={x.exerciseId}>
                  <span className="dim">{x.name}</span>
                  <span className="faint">
                    {x.dias} {x.dias === 1 ? 'día' : 'días'} · {x.series} series
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
