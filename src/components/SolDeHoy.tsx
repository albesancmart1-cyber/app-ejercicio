import { useState } from 'react'
import {
  FRANJAS,
  PIELES,
  conExposicion,
  escribirUI,
  notaDeTemporada,
  sinExposicion,
  solDe,
  uiDelDia
} from '../domain/vitaminaD'
import type { DiaDeSol, FranjaSolar, PielExpuesta } from '../domain/types'
import { actions } from '../store/store'
import Icon from './Icon'
import { Boton, Opcion } from './ui'

/**
 * El sol de hoy, apuntado cuando ocurre.
 *
 * No va en el test de la mañana a propósito: el sol de hoy todavía no ha
 * pasado cuando uno se levanta. Aquí se apunta cada rato con tres toques
 * —minutos, franja, piel— y la app estima la vitamina D sintetizada, siempre
 * como rango y con la temporada en cuenta: en pleno invierno no reparte UI
 * imaginarias, dice que no las hay.
 */
const MINUTOS = [5, 15, 30, 60] as const

export default function SolDeHoy({
  sol,
  todayIso
}: {
  sol: DiaDeSol[] | undefined
  todayIso: string
}) {
  const dia = solDe(sol, todayIso)
  const [abierto, setAbierto] = useState(false)
  const [minutos, setMinutos] = useState<number | null>(null)
  const [franja, setFranja] = useState<FranjaSolar | null>(null)
  const [piel, setPiel] = useState<PielExpuesta | null>(null)

  const ui = uiDelDia(dia)
  const nota = notaDeTemporada(todayIso)

  function guardar() {
    if (minutos === null || franja === null || piel === null) return
    actions.saveSol(conExposicion(dia, todayIso, { minutos, franja, piel }))
    setMinutos(null)
    setFranja(null)
    setPiel(null)
    setAbierto(false)
  }

  return (
    <div className="card sol-hoy">
      <p className="eyebrow">Sol de hoy</p>

      {(dia?.exposiciones ?? []).map((e, i) => (
        <div className="comida-fila" key={i}>
          <span className="comida-hora">{e.minutos} min</span>
          <div className="comida-cuerpo">
            <span className="comida-texto">
              {FRANJAS[e.franja]} · {PIELES[e.piel].toLowerCase()}
            </span>
          </div>
          <button
            className="icon-btn"
            aria-label={`Quitar el rato de sol de ${e.minutos} minutos`}
            onClick={() => actions.saveSol(sinExposicion(dia!, i))}
          >
            <Icon name="close" />
          </button>
        </div>
      ))}

      {ui && (
        <p className="comida-resumen">
          Hoy has sintetizado {escribirUI(ui)} de vitamina D, según minutos, franja y piel. Es una
          estimación con márgenes reales, no una medida.
        </p>
      )}
      {!dia?.exposiciones.length && !abierto && (
        <p className="dim">
          Apunta cada rato de sol con tres toques y te digo cuánta vitamina D has sintetizado. El
          que cuenta de verdad es el del mediodía.
        </p>
      )}
      {nota && <p className="faint" style={{ marginTop: 8 }}>{nota}</p>}

      {abierto ? (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <p className="focus-label">¿Cuánto rato?</p>
          <div className="options">
            {MINUTOS.map((m) => (
              <Opcion key={m} activa={minutos === m} onElegir={() => setMinutos(m)}>
                {m} min
              </Opcion>
            ))}
          </div>
          <p className="focus-label" style={{ marginTop: 12 }}>¿Cuándo?</p>
          <div className="options">
            {(Object.keys(FRANJAS) as FranjaSolar[]).map((f) => (
              <Opcion key={f} activa={franja === f} onElegir={() => setFranja(f)}>
                {FRANJAS[f]}
              </Opcion>
            ))}
          </div>
          <p className="focus-label" style={{ marginTop: 12 }}>¿Cuánta piel?</p>
          <div className="options">
            {(Object.keys(PIELES) as PielExpuesta[]).map((p) => (
              <Opcion key={p} activa={piel === p} onElegir={() => setPiel(p)}>
                {PIELES[p]}
              </Opcion>
            ))}
          </div>
          <Boton
            tono="primario"
            style={{ marginTop: 12 }}
            disabled={minutos === null || franja === null || piel === null}
            onClick={guardar}
          >
            Apuntar el sol
          </Boton>
          <Boton tono="callado" onClick={() => setAbierto(false)}>
            Cancelar
          </Boton>
        </div>
      ) : (
        <Boton tono="secundario" style={{ marginTop: 12 }} onClick={() => setAbierto(true)}>
          He estado al sol
        </Boton>
      )}
    </div>
  )
}
