import { useEffect, useState } from 'react'
import { SALTO_SEGUNDOS, haTerminado, proporcionRestante, reloj, segundosRestantes } from '../domain/descanso'
import { escribirNumero } from '../domain/numeros'
import type { DescansoEnCurso } from '../domain/types'
import { Boton, Etiqueta } from './ui'

/**
 * El descanso, a pantalla completa.
 *
 * Antes era una tira de cuarenta píxeles debajo de la serie marcada. Pero son
 * **dos minutos de cada cinco**: la cuarta parte del tiempo que uno pasa dentro
 * de la app, y no tenía sitio propio. Aquí se convierte en lo que es —un
 * momento— y se aprovecha para las tres cosas que hacen falta en él:
 *
 *  - Cuánto queda, legible con el móvil apoyado en el banco y a un metro.
 *  - Qué acabas de hacer, que es justo cuando te acuerdas de que pusiste 9 y no
 *    10; por eso se puede volver a la serie de un toque.
 *  - Qué viene después, para ir montando la barra mientras esperas.
 *
 * Esta pantalla **solo pinta**. La cuenta atrás vive en la sesión (ver
 * `src/domain/descanso.ts`), y esa es la diferencia que se nota entrenando:
 * salirse de aquí ya no mata el descanso, y el aviso de los cero segundos suena
 * estés donde estés. Lo único que queda dentro es el latido que redibuja.
 */
export interface HechoAhora {
  weightKg?: number
  reps?: number
  rir?: number
  /** Lo mismo de la última vez, para comparar sin salir de aquí. */
  previo?: string
}

const RADIO = 104
const PERIMETRO = 2 * Math.PI * RADIO

export default function RestScreen({
  descanso,
  hecho,
  siguiente,
  onAjustar,
  onCorregir,
  onSkip
}: {
  descanso: DescansoEnCurso
  hecho?: HechoAhora
  /** Qué toca después: etiqueta de superserie, nombre y detalle. */
  siguiente?: { etiqueta?: string; nombre: string; detalle?: string }
  /** Sumar o restar segundos. Lo aplica la sesión, que es de quien es el reloj. */
  onAjustar: (delta: number) => void
  onCorregir?: () => void
  onSkip: () => void
}) {
  /* Solo para redibujar: el dato de verdad es `descanso.endsAt`. */
  const [, latir] = useState(0)
  useEffect(() => {
    const id = setInterval(() => latir((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [])

  const restante = segundosRestantes(descanso)
  const terminado = haTerminado(descanso)
  const proporcion = proporcionRestante(descanso)

  return (
    <div className="rest-screen fade-in">
      <p className="eyebrow rest-titulo">{terminado ? 'Descanso terminado' : 'Descanso'}</p>

      <svg
        viewBox="0 0 240 240"
        className="rest-ring"
        role="img"
        aria-label={`Quedan ${Math.floor(restante / 60)} minutos y ${restante % 60} segundos de descanso`}
      >
        <circle cx="120" cy="120" r={RADIO} fill="none" stroke="var(--fill-3)" strokeWidth="12" />
        <circle
          cx="120"
          cy="120"
          r={RADIO}
          fill="none"
          stroke={terminado ? 'var(--st-fresco)' : 'var(--accent)'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={PERIMETRO}
          strokeDashoffset={PERIMETRO * (1 - proporcion)}
          transform="rotate(-90 120 120)"
          style={{ transition: 'stroke-dashoffset .25s linear' }}
        />
        <text x="120" y="130" textAnchor="middle" className="rest-ring-num">
          {reloj(restante)}
        </text>
        <text x="120" y="158" textAnchor="middle" className="rest-ring-cap">
          de {reloj(descanso.totalSeconds)}
        </text>
      </svg>

      {hecho && (hecho.reps !== undefined || hecho.weightKg !== undefined) && (
        <div className="card rest-hecho">
          <p className="eyebrow">Acabas de hacer</p>
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="rest-hecho-num">
              {hecho.weightKg !== undefined
                ? `${escribirNumero(hecho.weightKg)} kg × ${hecho.reps ?? '—'}`
                : `${hecho.reps ?? '—'} reps`}
            </span>
            {hecho.rir !== undefined && <Etiqueta>RIR {hecho.rir}</Etiqueta>}
          </div>
          {hecho.previo && (
            <p className="faint" style={{ marginTop: 8 }}>
              La última vez: {hecho.previo}.
            </p>
          )}
          {onCorregir && (
            <Boton tono="secundario" className="rest-corregir" onClick={onCorregir}>
              Corregir la serie
            </Boton>
          )}
        </div>
      )}

      {siguiente && (
        <div className="rest-despues">
          <p className="eyebrow">Después</p>
          <div className="card rest-siguiente">
            {siguiente.etiqueta && <span className="ss-tag">{siguiente.etiqueta}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="item-title">{siguiente.nombre}</div>
              {siguiente.detalle && <div className="item-meta">{siguiente.detalle}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="spacer-flex" />

      {/*
        La acción de seguir va **arriba y sola**, y los dos ajustes debajo
        compartiendo fila. Antes iban los tres en línea y el de seguir se salía
        de la pantalla por la derecha: solo se veían ocho píxeles de él. Lo que
        más se toca es «seguir», así que es lo que ocupa el ancho entero y lo que
        cae bajo el pulgar.
      */}
      <div className="rest-botones">
        <Boton tono="primario" onClick={onSkip}>
          {terminado ? 'Seguir' : 'Saltar descanso'}
        </Boton>
        <div className="rest-ajustes">
          <Boton
            tono="secundario"
            disabled={terminado}
            onClick={() => onAjustar(-SALTO_SEGUNDOS)}
            aria-label="Quitar treinta segundos de descanso"
          >
            −{SALTO_SEGUNDOS} s
          </Boton>
          <Boton
            tono="secundario"
            onClick={() => onAjustar(SALTO_SEGUNDOS)}
            aria-label="Añadir treinta segundos de descanso"
          >
            +{SALTO_SEGUNDOS} s
          </Boton>
        </div>
      </div>
    </div>
  )
}
