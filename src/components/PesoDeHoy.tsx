import { escribirGramos, explicarPeso } from '../domain/explicacionPeso'
import type { BodyMeasurement, CheckIn, Session } from '../domain/types'
import { escribirNumero } from '../domain/numeros'

/**
 * La tarjeta que responde a «¿por qué peso hoy esto?».
 *
 * Es la razón de ser de media app: el número de la báscula sin explicación
 * convierte cada mañana en una lotería emocional. Aquí se enseña el movimiento,
 * la causa más probable con su porqué fisiológico, y dónde va la tendencia —
 * que es la única cifra que de verdad habla de grasa.
 *
 * Solo aparece si hoy hay báscula: sin dato no hay nada que explicar, y una
 * tarjeta pidiendo cosas sería una tarjeta más que ignorar.
 */
export default function PesoDeHoy({
  measurements,
  checkIns,
  sessions,
  todayIso
}: {
  measurements: BodyMeasurement[]
  checkIns: CheckIn[]
  sessions: Session[]
  todayIso: string
}) {
  const e = explicarPeso({ measurements, checkIns, sessions }, todayIso)
  if (!e) return null
  const deHoy = measurements.find((m) => m.date === todayIso)

  return (
    <div className="card peso-hoy">
      <p className="eyebrow">Por qué pesas hoy esto</p>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <span className="stat">
          <span className="stat-value">
            {deHoy ? escribirNumero(deHoy.weightKg) : '—'}
            <small> kg</small>
          </span>
        </span>
        {e.deltaG !== undefined && (
          <span className={`peso-delta ${e.deltaG > 0 ? 'sube' : e.deltaG < 0 ? 'baja' : ''}`}>
            {escribirGramos(e.deltaG)}
            {e.diasDesdeAnterior === 1 ? ' desde ayer' : ` en ${e.diasDesdeAnterior} días`}
          </span>
        )}
      </div>

      <p className="dim" style={{ marginTop: 12 }}>
        {e.veredicto}
      </p>

      {/* Los demás factores del día, cuando hay más de uno que decir. */}
      {e.factores.length > 1 && (
        <ul className="reasons" style={{ marginTop: 10 }}>
          {e.factores.slice(1, 3).map((f) => (
            <li key={f.id}>{f.texto}</li>
          ))}
        </ul>
      )}

      {e.tendencia && (
        <p className="peso-tendencia">
          {e.tendencia} {e.deltaG !== undefined && Math.abs(e.deltaG) > 300 ? 'Esa es la cifra que habla de grasa; lo de hoy es agua.' : ''}
        </p>
      )}
      {e.faltan && <p className="faint" style={{ marginTop: 8 }}>{e.faltan}</p>}
    </div>
  )
}
