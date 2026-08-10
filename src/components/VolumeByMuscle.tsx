import { useState } from 'react'
import {
  MUSCLES,
  REGIONS,
  REGION_LABELS,
  musclesOf,
  type Muscle,
  type Region,
  type VolumeLandmarks
} from '../domain/muscles'
import {
  VENTANA_DIAS,
  ZONE_LABELS,
  RIR_EFECTIVO,
  desglosePorMusculo,
  formatSeries,
  seriesFueraDeCuenta,
  weeklyMuscleVolume,
  zonaDe,
  type VolumeZone
} from '../domain/volume'
import { allLandmarks, explicarLandmarks } from '../domain/landmarks'
import type { LandmarkOpts } from '../domain/landmarks'
import type { Session } from '../domain/types'
import { Etiqueta } from './ui'

/**
 * El volumen semanal músculo a músculo, con sus zonas.
 *
 * Es la vista que da sentido al refactor: la de grupos decía «brazo: 12 series»
 * y se quedaba tan ancha con el bíceps a cero. Aquí cada músculo se mide contra
 * *sus* landmarks —mínimo, banda que rinde, techo recuperable— y por eso la
 * barra no es un porcentaje de nada: es una escala con tramos.
 *
 * El color no lleva la información solo: cada músculo enseña su número y el
 * nombre de su zona en texto, y los tramos están siempre en el mismo orden. Hace
 * falta porque distinguir verde de ámbar y de rojo es justo lo que no puede dar
 * por hecho quien tiene un daltonismo común.
 *
 * Va plegado por regiones porque diecinueve barras seguidas no se leen; abierta
 * queda la que tenga algún músculo por debajo de su mínimo, que es lo que uno
 * ha venido a mirar.
 */
export default function VolumeByMuscle({
  sessions,
  todayIso,
  opts = {}
}: {
  sessions: Session[]
  todayIso: string
  opts?: LandmarkOpts
}) {
  const volumen = weeklyMuscleVolume(sessions, todayIso)
  const landmarks = allLandmarks(opts)
  // `null` = aún no se ha tocado nada, y decide la heurística de abajo.
  // `'ninguna'` = el usuario ha cerrado la que estaba abierta, y se respeta.
  const [abierta, setAbierta] = useState<Region | 'ninguna' | null>(null)
  const [detalle, setDetalle] = useState<Muscle | null>(null)

  const bajos = (Object.keys(MUSCLES) as Muscle[]).filter(
    (m) => volumen[m] < landmarks[m].mev
  )
  const enBanda = (Object.keys(MUSCLES) as Muscle[]).filter((m) => {
    const z = zonaDe(volumen[m], landmarks[m])
    return z === 'optimo' || z === 'suficiente'
  })
  const total = (Object.keys(MUSCLES) as Muscle[]).length
  const nota = explicarLandmarks(opts)
  const fuera = seriesFueraDeCuenta(sessions, todayIso)

  /** Una región está abierta si se ha tocado, o si es la primera con carencias. */
  const primeraConCarencia = REGIONS.find((r) => musclesOf(r).some((m) => bajos.includes(m)))
  const estaAbierta = (r: Region) => (abierta === null ? r === primeraConCarencia : abierta === r)

  return (
    <div className="card">
      <p className="eyebrow">Volumen por músculo</p>
      <div className="row" style={{ alignItems: 'flex-end', marginBottom: 4 }}>
        <span className="score">
          {enBanda.length}
          <small> / {total}</small>
        </span>
        <Etiqueta>en su banda</Etiqueta>
      </div>
      <p className="faint" style={{ marginTop: 10 }}>
        Últimos {VENTANA_DIAS} días. Una serie cuenta entera para el músculo que manda el
        movimiento y media para el que acompaña, así que salen números con decimales.
        {nota ? ` ${nota}` : ''}
      </p>
      {fuera > 0 && (
        <p className="faint">
          {fuera} {fuera === 1 ? 'serie hecha esta semana no cuenta' : 'series hechas esta semana no cuentan'}{' '}
          aquí: se planificaron a más de {RIR_EFECTIVO} repeticiones del fallo, que es trabajo de
          rodaje. Suma para coger el hábito, no para el volumen que hace crecer.
        </p>
      )}

      <div className="regions">
        {REGIONS.map((region) => {
          const musculos = musclesOf(region)
          const cortos = musculos.filter((m) => bajos.includes(m)).length
          const abiertaAhora = estaAbierta(region)
          return (
            <div className="region" key={region}>
              <button
                className="region-head"
                aria-expanded={abiertaAhora}
                onClick={() => setAbierta(abiertaAhora ? 'ninguna' : region)}
              >
                <span className="region-name">{REGION_LABELS[region]}</span>
                <span className={`region-note ${cortos > 0 ? 'short' : ''}`}>
                  {cortos > 0 ? `${cortos} bajo mínimo` : 'al día'}
                </span>
                <span className={`chev ${abiertaAhora ? 'open' : ''}`} aria-hidden="true" />
              </button>
              {abiertaAhora && (
                <div className="region-body">
                  {musculos.map((m) => (
                    <MuscleRow
                      key={m}
                      muscle={m}
                      series={volumen[m]}
                      landmarks={landmarks[m]}
                      abierto={detalle === m}
                      onToggle={() => setDetalle(detalle === m ? null : m)}
                      sessions={sessions}
                      todayIso={todayIso}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MuscleRow({
  muscle,
  series,
  landmarks,
  abierto,
  onToggle,
  sessions,
  todayIso
}: {
  muscle: Muscle
  series: number
  landmarks: VolumeLandmarks
  abierto: boolean
  onToggle: () => void
  sessions: Session[]
  todayIso: string
}) {
  const zona = zonaDe(series, landmarks)
  const info = MUSCLES[muscle]
  const desglose = abierto ? desglosePorMusculo(sessions, todayIso, muscle) : null

  return (
    <div className="mrow">
      <button className="mrow-head" onClick={onToggle} aria-expanded={abierto}>
        <span className="mrow-name">{info.label}</span>
        <span className={`mrow-series zone-${zona}`}>{formatSeries(series)}</span>
      </button>
      <ZoneBar series={series} landmarks={landmarks} zona={zona} />
      <div className="mrow-zone">{ZONE_LABELS[zona]}</div>
      {abierto && desglose && (
        <div className="mrow-detail">
          <p>
            {desglose.directas === 0 && desglose.indirectas === 0
              ? 'Nada esta semana.'
              : `${formatSeries(desglose.directas)} series directas` +
                (desglose.indirectas > 0
                  ? ` + ${formatSeries(desglose.indirectas)} de acompañante, que cuentan la mitad = ${formatSeries(desglose.total)}`
                  : '')}
          </p>
          <p className="faint">
            Mínimo {landmarks.mev} · rinde entre {landmarks.mavMin} y {landmarks.mavMax} · techo{' '}
            {landmarks.mrv}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * La barra con los cuatro tramos. La escala llega hasta el MRV —o hasta donde
 * hayas llegado tú, si te has pasado— para que la posición signifique lo mismo
 * en todos los músculos aunque sus números sean muy distintos.
 */
function ZoneBar({
  series,
  landmarks,
  zona
}: {
  series: number
  landmarks: VolumeLandmarks
  zona: VolumeZone
}) {
  const tope = Math.max(landmarks.mrv, series) * 1.05
  const pct = (v: number) => `${Math.min(100, (v / tope) * 100)}%`
  return (
    <div className="zbar" aria-hidden="true">
      <div className="zbar-track">
        <span className="zband bajo" style={{ left: 0, width: pct(landmarks.mev) }} />
        <span
          className="zband suficiente"
          style={{ left: pct(landmarks.mev), width: pct(landmarks.mavMin - landmarks.mev) }}
        />
        <span
          className="zband optimo"
          style={{ left: pct(landmarks.mavMin), width: pct(landmarks.mavMax - landmarks.mavMin) }}
        />
        <span
          className="zband alto"
          style={{ left: pct(landmarks.mavMax), width: pct(landmarks.mrv - landmarks.mavMax) }}
        />
        <span
          className="zband excesivo"
          style={{ left: pct(landmarks.mrv), right: 0, width: 'auto' }}
        />
      </div>
      <span className={`zmark zone-${zona}`} style={{ left: pct(series) }} />
    </div>
  )
}
