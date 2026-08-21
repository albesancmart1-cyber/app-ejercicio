import { useState } from 'react'
import { conManual, escribirUI, minutosDelDia, notaDeTemporada, solDe, uiDelDia } from '../domain/vitaminaD'
import type { QuienToma } from '../domain/vitaminaD'
import type { Coordenadas } from '../domain/arcoSolar'
import { arcoDelDia } from '../domain/arcoSolar'
import type { DiaDeSol } from '../domain/types'
import { actions } from '../store/store'
import { Boton, CampoNumero } from './ui'

/**
 * El sol de hoy, apuntado a mano.
 *
 * El usuario ya tiene una app que calcula sus UI de vitamina D con más datos
 * de los que esta maneja, así que aquí no se estima nada: se apuntan **los
 * minutos totales al sol y las UI que diga esa app**, y las dos cifras se
 * guardan tal cual. La cifra manual manda siempre — estimar por encima de un
 * dato mejor sería empeorarlo.
 *
 * Los minutos alimentan además la palanca de sol de la señal de leptina
 * (quince o más anclan el día), y las UI se acumulan en la vista semanal de
 * Progreso · Cuerpo.
 */
export default function SolDeHoy({
  sol,
  todayIso,
  coord,
  quien
}: {
  sol: DiaDeSol[] | undefined
  todayIso: string
  /** Para calcular la síntesis con la altura real del sol, si hay coordenadas. */
  coord?: Coordenadas
  quien?: QuienToma
}) {
  const dia = solDe(sol, todayIso)
  const [editando, setEditando] = useState(false)
  const [minutos, setMinutos] = useState<number | undefined>(dia?.minutos)
  const [ui, setUi] = useState<number | undefined>(dia?.ui)

  const guardadoMin = minutosDelDia(dia)
  const guardadoUi = uiDelDia(dia, coord, quien)
  // La nota de invierno sale del arco de este sitio y no de una lista de meses,
  // así que sin coordenadas no se dice nada en vez de suponer una latitud.
  const nota = coord
    ? notaDeTemporada(todayIso, coord, arcoDelDia(todayIso, coord).elevacionMaxima)
    : undefined
  const hayAlgo = guardadoMin > 0 || guardadoUi !== undefined

  function guardar() {
    actions.saveSol(
      conManual(dia, todayIso, {
        ...(minutos !== undefined ? { minutos } : {}),
        ...(ui !== undefined ? { ui } : {})
      })
    )
    setEditando(false)
  }

  return (
    <div className="card sol-hoy">
      <p className="eyebrow">Sol de hoy</p>

      {hayAlgo && !editando && (
        <p className="comida-resumen">
          {guardadoMin > 0 ? `${guardadoMin} min al sol` : 'Sin minutos apuntados'}
          {guardadoUi !== undefined ? ` · ${escribirUI(guardadoUi)} de vitamina D` : ''}.
        </p>
      )}
      {!hayAlgo && !editando && (
        <p className="dim">
          Apunta los minutos totales que te ha dado el sol y las UI de vitamina D que te calcule tu
          app. Los minutos anclan tu señal de leptina; las UI se acumulan en la semana.
        </p>
      )}
      {/* En invierno la nota solo estorba si ya traes la cifra de fuera. */}
      {nota && guardadoUi === undefined && <p className="faint" style={{ marginTop: 8 }}>{nota}</p>}

      {editando ? (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <div className="bascula-campos">
            <label className="bascula-campo">
              <span className="focus-label">Minutos al sol</span>
              <CampoNumero valor={minutos} onCambiar={setMinutos} placeholder="min" aria-label="Minutos totales al sol hoy" />
            </label>
            <label className="bascula-campo">
              <span className="focus-label">Vitamina D</span>
              <CampoNumero valor={ui} onCambiar={setUi} placeholder="UI" aria-label="UI de vitamina D de hoy" />
            </label>
          </div>
          <Boton
            tono="primario"
            style={{ marginTop: 12 }}
            disabled={minutos === undefined && ui === undefined}
            onClick={guardar}
          >
            Guardar el sol de hoy
          </Boton>
          <Boton tono="callado" onClick={() => setEditando(false)}>
            Cancelar
          </Boton>
        </div>
      ) : (
        <Boton
          tono="secundario"
          style={{ marginTop: 12 }}
          onClick={() => {
            setMinutos(dia?.minutos)
            setUi(dia?.ui)
            setEditando(true)
          }}
        >
          {hayAlgo ? 'Corregir el sol de hoy' : 'Apuntar el sol de hoy'}
        </Boton>
      )}
    </div>
  )
}
