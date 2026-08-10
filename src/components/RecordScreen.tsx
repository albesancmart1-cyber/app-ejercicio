import { useEffect } from 'react'
import { NOMBRE_MARCA, type TipoMarca } from '../domain/records'
import Icon from './Icon'
import { Boton } from './ui'

/**
 * El récord, a pantalla completa y un segundo.
 *
 * Batir una marca es lo único del entreno que uno cuenta luego, y hasta ahora
 * se resolvía con una línea de once píxeles que desaparecía al hacer scroll.
 *
 * Tres decisiones deliberadas:
 *
 *  - **Se va sola.** No bloquea ni obliga a tocar nada para seguir: quien esté
 *    a mitad de superserie no quiere un diálogo.
 *  - **Enseña el antes.** Un récord sin referencia no emociona: «20×10 → 22×10»
 *    dice en dos cifras lo que un párrafo no.
 *  - **Nada de gamificación.** Ni puntos, ni insignias, ni niveles. Se celebra
 *    el hecho real —moviste más peso que nunca—, y por eso no se gasta: no hay
 *    forma de inflarlo.
 */
export const SEGUNDOS_EN_PANTALLA = 4

export default function RecordScreen({
  serie,
  anterior,
  ejercicio,
  tipos,
  onCerrar
}: {
  /** Lo conseguido, ya formateado: «22 kg × 10». */
  serie: string
  /** Lo que había antes, si había algo. */
  anterior?: string
  ejercicio: string
  tipos: TipoMarca[]
  onCerrar: () => void
}) {
  useEffect(() => {
    navigator.vibrate?.([40, 60, 120])
    const id = setTimeout(onCerrar, SEGUNDOS_EN_PANTALLA * 1000)
    return () => clearTimeout(id)
  }, [onCerrar])

  return (
    <div className="record-screen fade-in" role="status">
      <div className="record-star">
        <Icon name="spark" />
      </div>

      <p className="eyebrow" style={{ color: 'var(--accent)' }}>
        Récord personal
      </p>
      <p className="record-num">{serie}</p>
      <p className="dim record-frase">
        {anterior
          ? `Nunca habías movido tanto en ${ejercicio.toLowerCase()}.`
          : `Es tu mejor marca en ${ejercicio.toLowerCase()}.`}
      </p>

      {anterior && (
        <div className="card record-antes">
          <div className="row">
            <span className="stat">
              <span className="stat-label">Antes</span>
              <span className="record-antes-num">{anterior}</span>
            </span>
            <Icon name="chevron" />
            <span className="stat" style={{ textAlign: 'right' }}>
              <span className="stat-label">Hoy</span>
              <span className="record-antes-num accent">{serie}</span>
            </span>
          </div>
        </div>
      )}

      <div className="tag-row" style={{ justifyContent: 'center', marginTop: 18 }}>
        {tipos.map((t) => (
          <span className="tag" key={t}>
            {NOMBRE_MARCA[t]}
          </span>
        ))}
      </div>

      <div className="spacer-flex" />

      <Boton tono="primario" onClick={onCerrar}>
        Seguir entrenando
      </Boton>
      <p className="faint" style={{ textAlign: 'center', marginTop: 12 }}>
        Se guarda en tu ficha del ejercicio
      </p>
    </div>
  )
}
