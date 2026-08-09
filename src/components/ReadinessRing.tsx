import type { Readiness } from '../domain/readiness'

/**
 * La disposición del cuerpo, como anillo.
 *
 * Era «80 / 100» en texto con una barra de diez celdas debajo. Una cifra suelta
 * entre 0 y 100 no se interpreta sola: hay que leer la etiqueta de al lado para
 * saber si está bien. El arco lo resuelve sin leer nada —lo lleno que está y de
 * qué color— y es lo que uno mira a las siete de la mañana.
 *
 * El color no es decorativo: sale de la misma escala de estado del cuerpo que
 * usa la fatiga, y va **siempre** con su palabra debajo, porque el color solo
 * no es accesible.
 */

const RADIO = 50
const PERIMETRO = 2 * Math.PI * RADIO

/** De la puntuación al color de estado. Los cortes son los del propio nivel. */
export function colorDeDisposicion(score: number): string {
  if (score >= 75) return 'var(--st-fresco)'
  if (score >= 50) return 'var(--st-tuyo)'
  if (score >= 30) return 'var(--st-alto)'
  return 'var(--st-pasado)'
}

/** Una palabra, no una frase: es lo que cabe dentro del anillo. */
export function palabraDeDisposicion(score: number): string {
  if (score >= 75) return 'listo'
  if (score >= 50) return 'bien'
  if (score >= 30) return 'justo'
  return 'tocado'
}

export default function ReadinessRing({
  readiness,
  size = 96
}: {
  readiness: Readiness
  size?: number
}) {
  const proporcion = Math.max(0, Math.min(1, readiness.score / 100))
  const color = colorDeDisposicion(readiness.score)

  return (
    <svg
      viewBox="0 0 120 120"
      className="ring-disposicion"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Disposición del cuerpo: ${readiness.score} de 100, ${readiness.level}`}
    >
      <circle cx="60" cy="60" r={RADIO} fill="none" stroke="var(--fill-3)" strokeWidth="9" />
      <circle
        cx="60"
        cy="60"
        r={RADIO}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={PERIMETRO}
        strokeDashoffset={PERIMETRO * (1 - proporcion)}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="59" textAnchor="middle" className="ring-num">
        {readiness.score}
      </text>
      <text x="60" y="77" textAnchor="middle" className="ring-cap">
        {palabraDeDisposicion(readiness.score)}
      </text>
    </svg>
  )
}
