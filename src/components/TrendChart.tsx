import { useMemo, useState } from 'react'
import {
  ETIQUETA_RANGO,
  RANGOS,
  casillasDe,
  haySuficiente,
  promedio,
  rangoPorDefecto,
  repartir,
  type PuntoDeCasilla,
  type RangoTendencia
} from '../domain/trendRange'
import { computeComposition } from '../domain/body'
import type { BodyMeasurement } from '../domain/types'
import { escribirNumero } from '../domain/numeros'

/**
 * Tendencia del cuerpo: peso, grasa, músculo y masa libre de grasa.
 *
 * Las cuatro cifras están en escalas muy distintas —el peso ronda los 78 kg y
 * la grasa los 16—, así que no se pintan tal cual. Todas se convierten al
 * **cambio en kilos desde la primera medición de la ventana**, con la línea de
 * cero como referencia. Además de evitar el doble eje —el error clásico, que
 * deforma la comparación—, es justo donde se ve lo que importa: la
 * recomposición son dos líneas separándose del cero mientras el peso apenas se
 * mueve.
 *
 * El eje horizontal es tiempo de verdad, no una medición por hueco: ver
 * `src/domain/trendRange.ts`.
 *
 * **Los colores no siguen al acento horario de la app**, a diferencia del resto
 * de la interfaz: aquí la identidad tiene que seguir al dato o la leyenda deja
 * de valer al atardecer. Y ninguna serie se distingue solo por color: cada una
 * lleva su marca —círculo, cuadrado, rombo, triángulo—, su trazo y su etiqueta
 * al final de la línea.
 *
 * Masa libre de grasa y músculo son parientes: la primera contiene a la
 * segunda, más hueso, órganos y agua. Por eso comparten familia de color y se
 * separan por trazo, discontinuo el de la magra, en vez de pelearse por un
 * cuarto tono que ya no cabría sin comprometer el daltonismo.
 */

export const SERIES_COLORS = {
  peso: '#b5aea6',
  grasa: '#cf6d4d',
  musculo: '#5596d0',
  magra: '#8fc0e8'
}

type Clave = keyof typeof SERIES_COLORS

const SERIES: { clave: Clave; label: string; marca: 'circulo' | 'cuadrado' | 'rombo' | 'triangulo'; discontinua?: boolean }[] = [
  { clave: 'peso', label: 'Peso', marca: 'triangulo' },
  { clave: 'grasa', label: 'Grasa', marca: 'circulo' },
  { clave: 'musculo', label: 'Músculo', marca: 'cuadrado' },
  { clave: 'magra', label: 'Masa libre de grasa', marca: 'rombo', discontinua: true }
]

const W = 320
const H = 160
const PAD = { top: 14, right: 38, bottom: 24, left: 32 }

/** Los cuatro valores de una casilla, o nada si esa casilla está vacía. */
interface Valores {
  peso?: number
  grasa?: number
  musculo?: number
  magra?: number
}

function valoresDe(punto: PuntoDeCasilla, heightCm?: number): Valores | null {
  if (punto.mediciones.length === 0) return null
  const c = punto.mediciones.map((m) => computeComposition(m, heightCm))
  return {
    peso: promedio(c.map((x) => x.weightKg)),
    grasa: promedio(c.map((x) => x.fatKg)),
    musculo: promedio(c.map((x) => x.muscleKg)),
    magra: promedio(c.map((x) => x.leanKg))
  }
}

function Marca({ tipo, cx, cy, r, color }: { tipo: string; cx: number; cy: number; r: number; color: string }) {
  if (tipo === 'circulo') return <circle cx={cx} cy={cy} r={r} fill={color} />
  if (tipo === 'cuadrado') return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={color} />
  if (tipo === 'rombo')
    return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} fill={color} />
  return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`} fill={color} />
}

export default function TrendChart({
  measurements,
  heightCm,
  todayIso
}: {
  measurements: BodyMeasurement[]
  heightCm?: number
  todayIso: string
}) {
  const [rango, setRango] = useState<RangoTendencia>(() => rangoPorDefecto(measurements, todayIso))
  const [activo, setActivo] = useState<number | null>(null)
  const [ocultas, setOcultas] = useState<Clave[]>([])

  const puntos = useMemo(() => repartir(measurements, rango, todayIso), [measurements, rango, todayIso])

  const cambiarRango = (r: RangoTendencia) => {
    setRango(r)
    setActivo(null)
  }

  const selector = (
    <div className="scale trend-range" role="group" aria-label="Periodo de la gráfica">
      {RANGOS.map((r) => (
        <button key={r} aria-pressed={rango === r} onClick={() => cambiarRango(r)}>
          {ETIQUETA_RANGO[r]}
        </button>
      ))}
    </div>
  )

  if (!haySuficiente(puntos)) {
    return (
      <div>
        {selector}
        <p className="faint" style={{ marginTop: 12 }}>
          En {ETIQUETA_RANGO[rango].toLowerCase()} no hay dos pesadas con las que trazar una
          tendencia. Prueba con un periodo más largo.
        </p>
      </div>
    )
  }

  // Todo se mide contra la primera casilla con dato de la ventana: cambiar de
  // periodo cambia la referencia, que es lo que hace que «1 semana» conteste a
  // «¿qué ha pasado esta semana?» y no a «¿qué ha pasado desde que empecé?».
  const crudos = puntos.map((p) => valoresDe(p, heightCm))
  const base = crudos.find((v) => v !== null) ?? null

  const deltas = crudos.map((v) => {
    if (!v || !base) return null
    const d: Valores = {}
    for (const { clave } of SERIES) {
      const actual = v[clave]
      const inicial = base[clave]
      if (actual !== undefined && inicial !== undefined) d[clave] = actual - inicial
    }
    return d
  })

  const visibles = SERIES.filter((s) => !ocultas.includes(s.clave))
  const valores = deltas.flatMap((d) =>
    d ? visibles.map((s) => d[s.clave]).filter((v): v is number => v !== undefined) : []
  )
  const maxAbs = Math.max(0.5, ...valores.map(Math.abs))
  const yMin = -maxAbs * 1.15
  const yMax = maxAbs * 1.15

  const x = (i: number) => PAD.left + (i / Math.max(1, puntos.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * (H - PAD.top - PAD.bottom)

  /** Une solo las casillas con dato: los huecos se saltan, no cortan la línea. */
  const linea = (clave: Clave) =>
    deltas
      .map((d, i) => (d && d[clave] !== undefined ? `${x(i)},${y(d[clave]!)}` : null))
      .filter(Boolean)
      .join(' ')

  const ultimoConDato = (clave: Clave) => {
    for (let i = deltas.length - 1; i >= 0; i--) {
      const d = deltas[i]
      if (d && d[clave] !== undefined) return { i, v: d[clave]! }
    }
    return null
  }

  const fmt = (v: number) => `${v > 0 ? '+' : ''}${escribirNumero(Math.round(v * 10) / 10)}`
  const casillas = casillasDe(rango, todayIso)

  const alternar = (clave: Clave) =>
    setOcultas((o) => (o.includes(clave) ? o.filter((c) => c !== clave) : [...o, clave]))

  return (
    <div>
      {selector}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-chart"
        role="img"
        aria-label={`Cambio de peso, grasa, músculo y masa libre de grasa en ${ETIQUETA_RANGO[rango]}`}
      >
        {/* Cero: la referencia que da sentido a todo lo demás. */}
        <line x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} className="trend-zero" />
        <text x={PAD.left - 6} y={y(0) + 3} textAnchor="end" className="trend-axis-label">
          0
        </text>
        <text x={PAD.left - 6} y={y(maxAbs) + 3} textAnchor="end" className="trend-axis-label">
          {`+${escribirNumero(Math.round(maxAbs * 10) / 10)}`}
        </text>
        <text x={PAD.left - 6} y={y(-maxAbs) + 3} textAnchor="end" className="trend-axis-label">
          {`−${escribirNumero(Math.round(maxAbs * 10) / 10)}`}
        </text>

        {visibles.map((s) => (
          <polyline
            key={s.clave}
            points={linea(s.clave)}
            fill="none"
            stroke={SERIES_COLORS[s.clave]}
            strokeWidth="2"
            strokeDasharray={s.discontinua ? '5 3' : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {deltas.map((d, i) => (
          <g key={casillas[i].clave}>
            {d &&
              visibles.map(
                (s) =>
                  d[s.clave] !== undefined && (
                    <Marca
                      key={s.clave}
                      tipo={s.marca}
                      cx={x(i)}
                      cy={y(d[s.clave]!)}
                      r={activo === i ? 4.5 : 3}
                      color={SERIES_COLORS[s.clave]}
                    />
                  )
              )}
            {/* Zona de toque generosa, mayor que la marca. */}
            {d && (
              <rect
                x={x(i) - 10}
                y={0}
                width={20}
                height={H}
                fill="transparent"
                onClick={() => setActivo(activo === i ? null : i)}
                style={{ cursor: 'pointer' }}
              />
            )}
          </g>
        ))}

        {/* Etiqueta directa al final de cada línea: la identidad no depende del color. */}
        {visibles.map((s) => {
          const u = ultimoConDato(s.clave)
          return u ? (
            <text key={s.clave} x={W - PAD.right + 4} y={y(u.v) + 3} className="trend-end-label">
              {fmt(u.v)}
            </text>
          ) : null
        })}

        {casillas.map((c, i) =>
          c.destacada ? (
            <text
              key={c.clave}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 ? 'start' : i === casillas.length - 1 ? 'end' : 'middle'}
              className="trend-axis-label"
            >
              {c.etiqueta}
            </text>
          ) : null
        )}
      </svg>

      {/* La leyenda además enciende y apaga: con cuatro líneas, poder quedarse
          con dos es lo que hace legible una gráfica de 320 píxeles de ancho. */}
      <div className="trend-legend">
        {SERIES.map((s) => (
          <button
            key={s.clave}
            className="trend-key-btn"
            aria-pressed={!ocultas.includes(s.clave)}
            onClick={() => alternar(s.clave)}
          >
            <span
              className={`trend-key trend-key-${s.marca}`}
              style={{ background: SERIES_COLORS[s.clave] }}
            />
            {s.label}
          </button>
        ))}
      </div>

      {activo !== null && deltas[activo] && (
        <p className="faint" style={{ marginTop: 8 }}>
          {casillas[activo].clave}:{' '}
          {visibles
            .map((s) => {
              const v = deltas[activo]![s.clave]
              return `${s.label.toLowerCase()} ${v !== undefined ? `${fmt(v)} kg` : '—'}`
            })
            .join(', ')}
        </p>
      )}

      <p className="faint" style={{ marginTop: 8 }}>
        Cambio en kilos desde la primera pesada del periodo. Las cuatro series comparten escala, así
        que la recomposición se ve como grasa y músculo separándose del cero con el peso casi
        quieto. Toca una serie de la leyenda para esconderla.
      </p>
    </div>
  )
}
