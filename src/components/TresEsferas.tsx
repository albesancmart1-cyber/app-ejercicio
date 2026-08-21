/**
 * Las tres esferas del reloj, en la pantalla de Hoy.
 *
 * Tres diales y no una nota. El color no dice nada por sí solo —siempre lleva
 * su texto al lado— y ninguno de los tres se promedia con los otros: se pueden
 * leer por separado porque se estropean por separado.
 *
 * Debajo, **una sola cosa que hacer hoy**, y solo si de verdad hay algo que
 * decir. Una lista de diez hábitos no la sigue nadie; una frase con su hora, sí.
 */
import { NOMBRES_ESFERA, leerElReloj, loDeHoy, type DatosDelReloj } from '../domain/esferas'
import { Etiqueta, Regla } from './ui'

/** El arco del dial: 180° de izquierda a derecha, como un cuentakilómetros. */
function Dial({ valor, color }: { valor: number; color: string }) {
  const R = 24
  const CX = 30
  const CY = 34
  // Un semicírculo completo mide π·R; la parte pintada es la fracción de eso.
  const largo = Math.PI * R
  return (
    <svg viewBox="0 0 60 40" style={{ width: '100%', height: 'auto' }} aria-hidden>
      <path
        d={`M${CX - R} ${CY}a${R} ${R} 0 0 1 ${R * 2} 0`}
        fill="none"
        stroke="var(--fill-2)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d={`M${CX - R} ${CY}a${R} ${R} 0 0 1 ${R * 2} 0`}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${largo * Math.max(0, Math.min(1, valor))} ${largo}`}
      />
    </svg>
  )
}

/** Los cuatro colores de estado de la app, elegidos por lo que significan. */
function colorDe(valor: number): string {
  if (valor >= 0.66) return 'var(--st-fresco)'
  if (valor >= 0.33) return 'var(--st-tuyo)'
  return 'var(--st-pasado)'
}

export default function TresEsferas({ datos }: { datos: DatosDelReloj }) {
  const lectura = leerElReloj(datos)
  const hacer = loDeHoy(datos, lectura)
  const falla = lectura.esferas.find((e) => e.esfera === lectura.laQueFalla)

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Tu reloj, hoy
        </p>
        {lectura.laQueFalla ? (
          <Etiqueta>{NOMBRES_ESFERA[lectura.laQueFalla]}</Etiqueta>
        ) : (
          <Etiqueta acento>Las tres en su sitio</Etiqueta>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        {lectura.esferas.map((e) => (
          <div
            key={e.esfera}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              minWidth: 0
            }}
          >
            <Dial valor={e.valor} color={colorDe(e.valor)} />
            <span style={{ fontSize: 14, color: colorDe(e.valor) }}>{e.texto}</span>
            <span className="bar-label" style={{ fontSize: 12 }}>
              {NOMBRES_ESFERA[e.esfera]}
            </span>
          </div>
        ))}
      </div>

      {falla && (
        <p className="faint" style={{ marginTop: 14 }}>
          {falla.porque}
        </p>
      )}

      {hacer && (
        <>
          <Regla />
          <p className="dim" style={{ marginBottom: 4 }}>
            Lo de hoy
          </p>
          <p style={{ margin: 0 }}>{hacer}</p>
        </>
      )}
    </div>
  )
}
