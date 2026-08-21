/**
 * Hábitos, analíticas y keto-adaptación: las tarjetas de la pestaña «Yo».
 *
 * Los tres hábitos comparten forma —una rampa que solo ofrece el siguiente
 * escalón— y por eso se pintan con el mismo componente. Ofrecer los seis
 * escalones del frío a la vez conseguiría una de dos cosas: que no lo haga
 * nadie, o que alguien se meta en un río el primer día.
 */
import { useState } from 'react'
import {
  AVISO_FRIO,
  NOMBRES_HABITO,
  SUPERFICIES_QUE_NO,
  SUPERFICIES_QUE_VALEN,
  estadoDeHabito,
  faseDeAyuno,
  type Habito
} from '../domain/habitos'
import {
  A_QUIEN_PREGUNTAR,
  NOMBRES_FRANJA,
  estadoKeto,
  indicesDe,
  type Analitica
} from '../domain/analiticas'
import type { RegistroHabito } from '../domain/habitos'
import { actions } from '../store/store'
import { Boton, CampoNumero, Etiqueta, Regla } from './ui'

/* ══════════════════════════════════════════════ HÁBITOS ══ */

export function TarjetaDeHabito({
  habito,
  registros,
  hoy,
  lat
}: {
  habito: Habito
  registros: RegistroHabito[] | undefined
  hoy: string
  lat?: number
}) {
  const e = estadoDeHabito(habito, registros, hoy)
  const hechoHoy = (registros ?? []).some((r) => r.habito === habito && r.date === hoy)
  const [verSuperficies, setVerSuperficies] = useState(false)

  // El ayuno no va por escalones sino por estación.
  const fase = habito === 'ayuno' && lat !== undefined ? faseDeAyuno(hoy, lat) : null

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          {NOMBRES_HABITO[habito]}
        </p>
        {e.racha > 0 && (
          <Etiqueta acento>
            {e.racha} {e.racha === 1 ? 'día' : 'días'}
          </Etiqueta>
        )}
      </div>

      {fase ? (
        <>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="dim">Ventana de esta estación</span>
            <span className="score" style={{ fontSize: 20 }}>
              {fase.ventanaHoras} h
            </span>
          </div>
          <p className="faint" style={{ marginTop: 8 }}>
            {fase.que}
          </p>
        </>
      ) : (
        <>
          {e.actual ? (
            <>
              <div className="row" style={{ marginTop: 10 }}>
                <span className="dim">Vas por</span>
                <span>{e.actual.titulo}</span>
              </div>
              <p className="faint" style={{ marginTop: 6 }}>
                {e.actual.que}
              </p>
            </>
          ) : (
            <p className="dim" style={{ marginTop: 8 }}>
              {e.siguiente?.que}
            </p>
          )}

          {e.siguiente && e.actual && (
            <>
              <Regla />
              <div className="row">
                <span className="dim">Ya puedes subir a</span>
                <span className="accent">{e.siguiente.titulo}</span>
              </div>
              <p className="faint" style={{ marginTop: 6 }}>
                {e.siguiente.que}
              </p>
            </>
          )}
          {e.diasParaElSiguiente !== undefined && e.diasParaElSiguiente > 0 && (
            <p className="faint" style={{ marginTop: 8 }}>
              Faltan {e.diasParaElSiguiente} {e.diasParaElSiguiente === 1 ? 'día' : 'días'} en este
              escalón antes de subir. Se sube de uno en uno a propósito.
            </p>
          )}
        </>
      )}

      {habito === 'frio' && (
        <p className="faint" style={{ marginTop: 10 }}>
          {AVISO_FRIO}
        </p>
      )}

      {habito === 'grounding' && (
        <>
          {!verSuperficies ? (
            <Boton tono="callado" onClick={() => setVerSuperficies(true)}>
              Qué superficies valen
            </Boton>
          ) : (
            <div className="fade-in">
              <Regla />
              <p className="dim" style={{ marginBottom: 4 }}>
                Valen
              </p>
              {SUPERFICIES_QUE_VALEN.map((s) => (
                <p className="faint" key={s} style={{ marginTop: 2 }}>
                  · {s}
                </p>
              ))}
              <p className="dim" style={{ margin: '10px 0 4px' }}>
                No valen
              </p>
              {SUPERFICIES_QUE_NO.map((s) => (
                <p className="faint" key={s} style={{ marginTop: 2 }}>
                  · {s}
                </p>
              ))}
              <p className="faint" style={{ marginTop: 8 }}>
                La condición es que conduzca. Andar descalzo por una tarima es agradable, pero no es
                esto.
              </p>
              <Boton tono="callado" onClick={() => setVerSuperficies(false)}>
                Cerrar
              </Boton>
            </div>
          )}
        </>
      )}

      {!hechoHoy && (
        <Boton
          tono="primario"
          onClick={() =>
            actions.saveHabito({
              date: hoy,
              habito,
              nivel: e.siguiente && !e.actual ? 1 : (e.actual?.nivel ?? 1)
            })
          }
        >
          Hecho hoy
        </Boton>
      )}
      {hechoHoy && e.siguiente && e.actual && (
        <Boton
          tono="callado"
          onClick={() => actions.saveHabito({ date: hoy, habito, nivel: e.siguiente!.nivel })}
        >
          Subir a {e.siguiente.titulo.toLowerCase()}
        </Boton>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════ KETO ══ */

export function CurvaKeto({ desde, hoy }: { desde: string; hoy: string }) {
  const e = estadoKeto(desde, hoy)
  if (!e) return null

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Keto-adaptación
        </p>
        <Etiqueta acento>
          {e.dias} {e.dias === 1 ? 'día' : 'días'}
        </Etiqueta>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="dim">Vas por</span>
        <span>{e.actual.titulo}</span>
      </div>
      <p className="faint" style={{ marginTop: 6 }}>
        {e.actual.que}
      </p>

      {e.siguiente && (
        <>
          <Regla />
          <div className="row">
            <span className="dim">
              En {e.diasParaElSiguiente} {e.diasParaElSiguiente === 1 ? 'día' : 'días'}
            </span>
            <span className="accent">{e.siguiente.titulo}</span>
          </div>
          <p className="faint" style={{ marginTop: 6 }}>
            {e.siguiente.que}
          </p>
        </>
      )}

      <p className="faint" style={{ marginTop: 10 }}>
        Por hitos y no por una barra de progreso: un 60 % no dice nada, y saber que la semana que
        viene se va el cansancio, sí. Los tramos varían mucho entre personas.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════ ANALÍTICAS ══ */

export function Analiticas({ analiticas, hoy }: { analiticas?: Analitica[]; hoy: string }) {
  const ultima = [...(analiticas ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState<Analitica>({ date: hoy })

  const indices = ultima ? indicesDe(ultima) : []

  return (
    <div className="card">
      <p className="eyebrow">Analítica</p>

      {indices.length > 0 ? (
        <>
          <p className="faint" style={{ marginTop: 6 }}>
            La del {ultima.date.split('-').reverse().join('/')}
          </p>
          {indices.map((i) => (
            <div key={i.id} style={{ padding: '9px 0' }}>
              <div className="row">
                <span className="dim">{i.nombre}</span>
                <span className={i.franja === 'optimo' ? 'accent' : ''}>
                  {i.texto} <span className="faint">· {NOMBRES_FRANJA[i.franja]}</span>
                </span>
              </div>
              <p className="faint" style={{ marginTop: 3 }}>
                {i.queDice}
              </p>
            </div>
          ))}
          <p className="faint" style={{ marginTop: 8 }}>
            {A_QUIEN_PREGUNTAR}
          </p>
        </>
      ) : (
        <p className="dim" style={{ marginTop: 8 }}>
          Con la glucosa y la insulina calculo el HOMA-IR, que dice lo que no dice la glucosa sola:
          cuánta insulina hace falta para mantenerla donde está.
        </p>
      )}

      <Regla />
      {!abierto ? (
        <Boton tono="callado" onClick={() => setAbierto(true)}>
          {ultima ? 'Apuntar otra analítica' : 'Apuntar una analítica'}
        </Boton>
      ) : (
        <div className="fade-in">
          <div className="field-row">
            <label className="field">
              <span className="bar-label">Glucosa (mg/dl)</span>
              <CampoNumero valor={f.glucosa} onCambiar={(v) => setF({ ...f, glucosa: v })} decimales />
            </label>
            <label className="field">
              <span className="bar-label">Insulina (µU/ml)</span>
              <CampoNumero valor={f.insulina} onCambiar={(v) => setF({ ...f, insulina: v })} decimales />
            </label>
          </div>
          <div className="field-row" style={{ marginTop: 8 }}>
            <label className="field">
              <span className="bar-label">Triglicéridos</span>
              <CampoNumero valor={f.trigliceridos} onCambiar={(v) => setF({ ...f, trigliceridos: v })} />
            </label>
            <label className="field">
              <span className="bar-label">HDL</span>
              <CampoNumero valor={f.hdl} onCambiar={(v) => setF({ ...f, hdl: v })} />
            </label>
          </div>
          <div className="field-row" style={{ marginTop: 8 }}>
            <label className="field">
              <span className="bar-label">Colesterol total</span>
              <CampoNumero
                valor={f.colesterolTotal}
                onCambiar={(v) => setF({ ...f, colesterolTotal: v })}
              />
            </label>
            <label className="field">
              <span className="bar-label">Vitamina D</span>
              <CampoNumero valor={f.vitaminaD} onCambiar={(v) => setF({ ...f, vitaminaD: v })} decimales />
            </label>
          </div>
          <label className="field" style={{ marginTop: 8 }}>
            <span className="bar-label">Ferritina (ng/ml)</span>
            <CampoNumero valor={f.ferritina} onCambiar={(v) => setF({ ...f, ferritina: v })} />
          </label>
          <p className="faint" style={{ marginTop: 8 }}>
            Lo que dejes en blanco simplemente no sale. No hace falta tenerlo todo.
          </p>
          <Boton
            tono="primario"
            onClick={() => {
              actions.saveAnalitica(f)
              setAbierto(false)
              setF({ date: hoy })
            }}
          >
            Guardar analítica
          </Boton>
          <Boton tono="callado" onClick={() => setAbierto(false)}>
            Cancelar
          </Boton>
        </div>
      )}
    </div>
  )
}

