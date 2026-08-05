import { MUSCLES } from '../domain/muscles'
import type { Muscle } from '../domain/muscles'

/**
 * Figura humana con lo trabajado encendido.
 *
 * Dos vistas, de frente y de espalda, porque con una sola la mitad de los
 * músculos no tiene dónde pintarse: dorsal, isquios, glúteo y tríceps no se ven
 * por delante, y el pectoral y el cuádriceps no se ven por detrás.
 *
 * Esquemática a propósito, como las animaciones de los patrones: resuelve
 * «¿qué he movido hoy y cuánto?» de un vistazo, y para eso una silueta con
 * manchas es mejor que un atlas anatómico, que a este tamaño se convierte en
 * ruido.
 *
 * La intensidad va con las **series de la sesión**, no con un sí o un no: un
 * ejercicio que mueve el dorsal como motor y el bíceps de acompañante no ha
 * trabajado los dos igual, y la figura tiene que enseñar esa diferencia. Se
 * mide contra el músculo más trabajado de la propia sesión, que es la
 * comparación que tiene sentido dentro de un entreno.
 *
 * El color es el acento de la app, así que sigue la hora del día como todo lo
 * demás; aquí no hay identidad de serie que preservar, solo intensidad.
 */

export interface BodyMapProps {
  /** Series por músculo en esta sesión. Lo que no esté, no se trabajó. */
  volumen: Partial<Record<Muscle, number>>
  /** Se enseña la lista de músculos debajo, con sus series. */
  conLeyenda?: boolean
}

/** Un músculo puede pintarse en las dos vistas: el antebrazo se ve por los dos lados. */
type Vista = 'frente' | 'espalda'

interface Mancha {
  muscle: Muscle
  vista: Vista
  /** Formas simétricas: se pintan dos, una espejada respecto al eje del cuerpo. */
  formas: string[]
}

/*
 * Convención de coordenadas: cada figura vive en una caja de 100 × 220, con el
 * eje del cuerpo en x = 50. La cabeza está arriba (y ≈ 22) y los pies abajo
 * (y ≈ 212). Las dos vistas comparten proporciones para que el mismo músculo
 * caiga a la misma altura en las dos.
 */
const MANCHAS: Mancha[] = [
  // ── De frente ───────────────────────────────────────────
  { muscle: 'deltoides_anterior', vista: 'frente', formas: ['M31,44 q7,-4 12,2 l-2,10 q-8,2 -12,-3 z'] },
  { muscle: 'deltoides_lateral', vista: 'frente', formas: ['M26,47 q5,-3 6,1 l-1,11 q-6,-1 -6,-6 z'] },
  { muscle: 'pectoral_mayor', vista: 'frente', formas: ['M35,50 q12,-2 14,4 l0,12 q-11,3 -15,-4 z'] },
  { muscle: 'biceps_braquial', vista: 'frente', formas: ['M27,62 q6,-1 6,4 l-1,12 q-6,1 -7,-4 z'] },
  { muscle: 'antebrazo', vista: 'frente', formas: ['M24,80 q6,-1 7,4 l-1,16 q-6,1 -7,-4 z'] },
  { muscle: 'recto_abdominal', vista: 'frente', formas: ['M42,69 l8,0 l0,34 q-6,2 -8,-2 z'] },
  { muscle: 'oblicuos', vista: 'frente', formas: ['M36,70 q5,0 5,4 l0,26 q-6,-2 -6,-8 z'] },
  { muscle: 'cuadriceps', vista: 'frente', formas: ['M38,124 q9,-2 11,4 l-1,34 q-9,3 -12,-4 z'] },
  { muscle: 'aductores', vista: 'frente', formas: ['M46,124 q4,0 4,4 l0,24 q-5,0 -5,-5 z'] },

  // ── De espalda ──────────────────────────────────────────
  { muscle: 'trapecio_superior', vista: 'espalda', formas: ['M36,40 q12,-4 14,2 l0,7 q-11,2 -15,-3 z'] },
  { muscle: 'deltoides_posterior', vista: 'espalda', formas: ['M28,46 q7,-3 9,2 l-2,11 q-8,1 -9,-5 z'] },
  { muscle: 'espalda_alta', vista: 'espalda', formas: ['M37,52 q11,-1 13,3 l0,12 q-11,2 -14,-4 z'] },
  { muscle: 'dorsal_ancho', vista: 'espalda', formas: ['M34,64 q14,-1 16,4 l0,16 q-14,3 -18,-5 z'] },
  { muscle: 'triceps_braquial', vista: 'espalda', formas: ['M27,62 q6,-1 6,4 l-1,12 q-6,1 -7,-4 z'] },
  { muscle: 'antebrazo', vista: 'espalda', formas: ['M24,80 q6,-1 7,4 l-1,16 q-6,1 -7,-4 z'] },
  { muscle: 'erectores_espinales', vista: 'espalda', formas: ['M45,66 l5,0 l0,34 l-5,0 z'] },
  { muscle: 'gluteo', vista: 'espalda', formas: ['M36,104 q13,-2 14,6 l0,10 q-13,4 -16,-4 z'] },
  { muscle: 'isquiosurales', vista: 'espalda', formas: ['M38,126 q10,-2 12,4 l-1,30 q-10,3 -13,-4 z'] },
  { muscle: 'gastrocnemio', vista: 'espalda', formas: ['M39,166 q8,-1 9,4 l-1,16 q-8,2 -10,-4 z'] },
  { muscle: 'soleo', vista: 'espalda', formas: ['M40,186 q7,-1 8,3 l-1,12 q-7,1 -8,-4 z'] }
]

/** La silueta: la misma para las dos vistas, que a este esquema le sobra el detalle. */
function Silueta() {
  return (
    <g className="bodymap-outline">
      <circle cx="50" cy="22" r="10" />
      {/* Tronco */}
      <path d="M39,36 q11,-4 22,0 l5,10 q3,26 1,44 q-1,14 -3,22 l-25,0 q-2,-8 -3,-22 q-2,-18 1,-44 z" />
      {/* Brazos */}
      <path d="M34,44 q-8,3 -10,12 l-3,42 q4,3 8,0 l4,-40 z" />
      <path d="M66,44 q8,3 10,12 l3,42 q-4,3 -8,0 l-4,-40 z" />
      {/* Piernas */}
      <path d="M37,112 l11,0 l1,48 l-2,50 l-9,0 l-2,-50 z" />
      <path d="M63,112 l-11,0 l-1,48 l2,50 l9,0 l2,-50 z" />
    </g>
  )
}

function Figura({
  vista,
  volumen,
  maximo,
  titulo
}: {
  vista: Vista
  volumen: Partial<Record<Muscle, number>>
  maximo: number
  titulo: string
}) {
  const manchas = MANCHAS.filter((m) => m.vista === vista)
  return (
    <figure className="bodymap-fig">
      <svg viewBox="0 0 100 220" className="bodymap" role="img" aria-label={titulo}>
        <Silueta />
        {manchas.map((m) => {
          const series = volumen[m.muscle] ?? 0
          if (series <= 0) return null
          // Un suelo de opacidad para que media serie de acompañante se vea, y
          // un techo por debajo de 1 para que la silueta no desaparezca debajo.
          const fuerza = 0.3 + 0.6 * Math.min(1, series / maximo)
          return m.formas.map((d, i) => (
            <g key={`${m.muscle}-${i}`}>
              <path d={d} className="bodymap-on" style={{ opacity: fuerza }}>
                <title>{`${MUSCLES[m.muscle].label}: ${series} series`}</title>
              </path>
              {/* La mitad derecha es la izquierda espejada respecto al eje. */}
              <path
                d={d}
                className="bodymap-on"
                style={{ opacity: fuerza }}
                transform="translate(100,0) scale(-1,1)"
              />
            </g>
          ))
        })}
      </svg>
      <figcaption className="faint">{titulo}</figcaption>
    </figure>
  )
}

export default function BodyMap({ volumen, conLeyenda = true }: BodyMapProps) {
  const trabajados = (Object.entries(volumen) as [Muscle, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
  const maximo = Math.max(1, ...trabajados.map(([, v]) => v))

  if (trabajados.length === 0) {
    return <p className="faint">De esta sesión no hay músculos anotados.</p>
  }

  return (
    <div>
      <div className="bodymap-pair">
        <Figura vista="frente" volumen={volumen} maximo={maximo} titulo="De frente" />
        <Figura vista="espalda" volumen={volumen} maximo={maximo} titulo="De espalda" />
      </div>

      {conLeyenda && (
        <ul className="bodymap-list">
          {trabajados.map(([m, series]) => (
            <li key={m}>
              <span
                className="bodymap-key"
                style={{ opacity: 0.3 + 0.6 * Math.min(1, series / maximo) }}
                aria-hidden="true"
              />
              <span className="bodymap-name">{MUSCLES[m].label}</span>
              <span className="bodymap-series">{series} {series === 1 ? 'serie' : 'series'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
