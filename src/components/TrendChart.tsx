import { useState } from 'react'

/**
 * Tendencia de grasa y músculo.
 *
 * Grasa (~16 kg) y músculo (~32 kg) tienen escalas muy distintas. En vez de
 * recurrir a un doble eje —que es el error clásico y deforma la comparación—,
 * ambas series se indexan a una base común: **el cambio en kg desde la primera
 * medición**, con la línea de cero como referencia. Además de ser correcto, es
 * justo donde la recomposición se ve: dos líneas separándose del origen.
 *
 * Los colores son fijos por serie —la identidad sigue al dato, no al acento
 * horario de la app— y están validados contra las cuatro superficies oscuras
 * (banda de luminosidad, croma, separación para daltonismo y contraste).
 */

export const SERIES_COLORS = {
  grasa: '#cf6d4d',
  musculo: '#5596d0'
}

export interface TrendPoint {
  date: string
  fatKg?: number
  muscleKg?: number
}

const W = 320
const H = 150
const PAD = { top: 14, right: 34, bottom: 20, left: 30 }

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const [activo, setActivo] = useState<number | null>(null)

  const base = points[0]
  const deltas = points.map((p) => ({
    date: p.date,
    grasa: p.fatKg !== undefined && base.fatKg !== undefined ? p.fatKg - base.fatKg : undefined,
    musculo:
      p.muscleKg !== undefined && base.muscleKg !== undefined ? p.muscleKg - base.muscleKg : undefined
  }))

  const valores = deltas.flatMap((d) => [d.grasa, d.musculo]).filter((v): v is number => v !== undefined)
  if (valores.length === 0) return null

  const maxAbs = Math.max(0.5, ...valores.map(Math.abs))
  const yMin = -maxAbs * 1.15
  const yMax = maxAbs * 1.15

  const x = (i: number) =>
    PAD.left + (i / Math.max(1, deltas.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) =>
    PAD.top + ((yMax - v) / (yMax - yMin)) * (H - PAD.top - PAD.bottom)

  const linea = (clave: 'grasa' | 'musculo') =>
    deltas
      .map((d, i) => (d[clave] === undefined ? null : `${x(i)},${y(d[clave]!)}`))
      .filter(Boolean)
      .join(' ')

  const ultimo = deltas[deltas.length - 1]
  const fmt = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-chart" role="img" aria-label="Cambio de grasa y músculo desde la primera medición">
        {/* Cero: la referencia que da sentido a todo lo demás. */}
        <line x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} className="trend-zero" />
        <text x={PAD.left - 6} y={y(0) + 3} textAnchor="end" className="trend-axis-label">
          0
        </text>
        <text x={PAD.left - 6} y={y(maxAbs) + 3} textAnchor="end" className="trend-axis-label">
          {`+${maxAbs.toFixed(1)}`}
        </text>
        <text x={PAD.left - 6} y={y(-maxAbs) + 3} textAnchor="end" className="trend-axis-label">
          {`-${maxAbs.toFixed(1)}`}
        </text>

        <polyline points={linea('grasa')} fill="none" stroke={SERIES_COLORS.grasa} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={linea('musculo')} fill="none" stroke={SERIES_COLORS.musculo} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {deltas.map((d, i) => (
          <g key={d.date}>
            {d.grasa !== undefined && (
              <circle cx={x(i)} cy={y(d.grasa)} r={activo === i ? 5 : 3.5} fill={SERIES_COLORS.grasa} />
            )}
            {d.musculo !== undefined && (
              <rect
                x={x(i) - (activo === i ? 4.5 : 3)}
                y={y(d.musculo) - (activo === i ? 4.5 : 3)}
                width={activo === i ? 9 : 6}
                height={activo === i ? 9 : 6}
                fill={SERIES_COLORS.musculo}
              />
            )}
            {/* Zona de toque generosa, mayor que la marca. */}
            <rect
              x={x(i) - 14}
              y={0}
              width={28}
              height={H}
              fill="transparent"
              onClick={() => setActivo(activo === i ? null : i)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* Etiqueta directa del último punto: la identidad no depende del color. */}
        {ultimo.grasa !== undefined && (
          <text x={W - PAD.right + 4} y={y(ultimo.grasa) + 3} className="trend-end-label">
            {fmt(ultimo.grasa)}
          </text>
        )}
        {ultimo.musculo !== undefined && (
          <text x={W - PAD.right + 4} y={y(ultimo.musculo) + 3} className="trend-end-label">
            {fmt(ultimo.musculo)}
          </text>
        )}

        <text x={PAD.left} y={H - 4} className="trend-axis-label">
          {formatDate(deltas[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="trend-axis-label">
          {formatDate(ultimo.date)}
        </text>
      </svg>

      <div className="trend-legend">
        <span>
          <span className="trend-key trend-key-dot" style={{ background: SERIES_COLORS.grasa }} />
          Grasa
        </span>
        <span>
          <span className="trend-key trend-key-square" style={{ background: SERIES_COLORS.musculo }} />
          Músculo
        </span>
      </div>

      {activo !== null && (
        <p className="faint" style={{ marginTop: 8 }}>
          {formatDate(deltas[activo].date)}: grasa{' '}
          {deltas[activo].grasa !== undefined ? `${fmt(deltas[activo].grasa!)} kg` : '—'}, músculo{' '}
          {deltas[activo].musculo !== undefined ? `${fmt(deltas[activo].musculo!)} kg` : '—'}
        </p>
      )}
      <p className="faint" style={{ marginTop: 8 }}>
        Cambio en kg desde tu primera medición. Las dos series comparten escala, así que la
        recomposición se ve como dos líneas separándose del cero.
      </p>
    </div>
  )
}
