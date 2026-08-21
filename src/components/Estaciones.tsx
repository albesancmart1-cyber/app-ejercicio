/**
 * Las estaciones robadas, el callo solar, la higiene de la noche y el
 * skygazing: las cuatro tarjetas que cierran la pestaña de Luz.
 *
 * Van juntas en un fichero porque cuentan la misma historia desde ángulos
 * distintos —si el cuerpo sabe en qué mes vive— y separarlas en cuatro
 * ficheros de cincuenta líneas no ayudaría a nadie a entenderlas.
 */
import { useState } from 'react'
import { escribirDuracion, escribirHora } from '../domain/arcoSolar'
import {
  MESES_LARGOS,
  NOMBRES_FASE,
  calloSolar,
  estacionRobada,
  higieneDeNoche,
  oscuridadDelAno,
  rachaDeSol,
  skygazing
} from '../domain/estaciones'
import type { CheckIn, NocheRegistrada, SalidaAlExterior } from '../domain/types'
import { minutosDeHora } from '../domain/relojes'
import { actions } from '../store/store'
import { Boton, Etiqueta, Regla } from './ui'

interface Props {
  hoy: string
  lat: number
  lon: number
  salidas?: SalidaAlExterior[]
  checkIns?: CheckIn[]
  /** Minutos de oscuridad de anoche, si se saben. */
  oscuridadReal?: number
  noches?: NocheRegistrada[]
}

/**
 * Cuánto duró una noche, envolviendo la medianoche.
 *
 * Apagar a las 23:00 y levantarse a las 07:00 son ocho horas, no menos dieciséis.
 */
export function minutosDeNoche(n: NocheRegistrada): number {
  return n.levantado >= n.apagado ? n.levantado - n.apagado : 1440 - n.apagado + n.levantado
}

/* ══════════════════════════════════════════════ ESTACIONES ══ */

export function EstacionesRobadas({ hoy, lat, lon, oscuridadReal }: Props) {
  const coord = { lat, lon }
  const e = estacionRobada(hoy, coord, oscuridadReal)
  const meses = oscuridadDelAno(Number(hoy.slice(0, 4)), coord)
  const mesActual = Number(hoy.slice(5, 7))
  const maximo = Math.max(...meses.map((m) => m.tocaba), 1)

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Tus estaciones
        </p>
        {e.robada && e.vividoComo !== undefined && (
          <Etiqueta>Vivido como {MESES_LARGOS[e.vividoComo - 1]}</Etiqueta>
        )}
      </div>

      <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <div>
          <div className="score" style={{ fontSize: 24 }}>
            {e.tuviste !== undefined ? escribirDuracion(e.tuviste) : '—'}
          </div>
          <div className="bar-label">tu oscuridad</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="score" style={{ fontSize: 24, color: 'var(--label-2)' }}>
            {escribirDuracion(e.tocaba)}
          </div>
          <div className="bar-label">la que tocaba</div>
        </div>
      </div>

      <p className="faint" style={{ marginTop: 12 }}>
        {e.robada
          ? 'La melatonina no mide si hay luz: mide cuánto dura la noche. Con esta oscuridad, tu cuerpo está recibiendo la información de otra estación.'
          : e.tuviste !== undefined
            ? 'Tu noche se parece a la que toca en esta fecha. Es la señal que le dice al cuerpo en qué mes vive.'
            : 'Cuando apuntes a qué hora se apagó todo y a qué hora te levantaste, te digo qué estación está viviendo tu cuerpo.'}
      </p>

      <Regla />
      <p className="dim" style={{ marginBottom: 8 }}>
        La oscuridad que toca cada mes aquí
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }} aria-hidden>
        {meses.map((m) => (
          <div
            key={m.mes}
            style={{
              flex: 1,
              height: `${Math.round((m.tocaba / maximo) * 100)}%`,
              borderRadius: '3px 3px 0 0',
              background:
                m.mes === mesActual
                  ? 'var(--accent)'
                  : m.mes === e.vividoComo
                    ? 'var(--st-pasado)'
                    : 'var(--fill-2)'
            }}
          />
        ))}
      </div>
      <div className="row" style={{ marginTop: 4 }}>
        <span className="bar-label">Ene</span>
        <span className="bar-label">
          {e.robada ? 'en ámbar el mes real, en rojo el vivido' : 'en ámbar, el mes de hoy'}
        </span>
        <span className="bar-label">Dic</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════ CALLO SOLAR ══ */

export function CalloSolar({ hoy, lat, lon, salidas }: Props) {
  const c = calloSolar(hoy, { lat, lon }, salidas)
  const racha = rachaDeSol(hoy, salidas)

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Callo solar
        </p>
        <Etiqueta acento>{NOMBRES_FASE[c.fase]}</Etiqueta>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="dim">Desde el solsticio</span>
        <span>
          {c.diasDesdeSolsticio} {c.diasDesdeSolsticio === 1 ? 'día' : 'días'}
        </span>
      </div>
      <div className="row" style={{ padding: '7px 0' }}>
        <span className="dim">Con sol en la piel</span>
        <span className="accent">
          {c.diasConSol} {c.diasConSol === 1 ? 'día' : 'días'}
        </span>
      </div>
      {racha > 0 && (
        <div className="row" style={{ padding: '7px 0' }}>
          <span className="dim">Racha ahora mismo</span>
          <span>
            {racha} {racha === 1 ? 'día' : 'días'}
          </span>
        </div>
      )}

      <p className="faint" style={{ marginTop: 10 }}>
        {c.queSignifica}
      </p>
      <p className="faint" style={{ marginTop: 8 }}>
        Esto es una racha de exposición, no un permiso. Que lleves meses tomando el sol no
        significa que puedas tumbarte tres horas en agosto.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════ HIGIENE ══ */

export function HigieneDeLuz({ hoy, lat, lon, checkIns, noches }: Props) {
  const h = higieneDeNoche(hoy, { lat, lon }, checkIns)
  const noche = (noches ?? []).find((n) => n.date === hoy)
  const [abierto, setAbierto] = useState(false)
  const [apuntando, setApuntando] = useState(false)
  const [apagado, setApagado] = useState(noche ? escribirHora(noche.apagado) : '23:00')
  const [levantado, setLevantado] = useState(noche ? escribirHora(noche.levantado) : '07:00')

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Higiene de luz
        </p>
        {h.cuidada !== undefined && (
          <Etiqueta acento={h.cuidada}>{h.cuidada ? 'Cuidada anoche' : 'Anoche no'}</Etiqueta>
        )}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="dim">Empieza a contar</span>
        <span>{escribirHora(h.ocaso)}</span>
      </div>
      <div className="row" style={{ padding: '7px 0' }}>
        <span className="dim">Oscuridad que toca hoy</span>
        <span>{escribirDuracion(h.nocheQueToca)}</span>
      </div>

      <Regla />
      {noche ? (
        <div className="row">
          <span className="dim">Anoche</span>
          <span>
            {escribirHora(noche.apagado)} → {escribirHora(noche.levantado)}{' '}
            <span className="faint">({escribirDuracion(minutosDeNoche(noche))})</span>
          </span>
        </div>
      ) : null}

      {!apuntando ? (
        <Boton tono="callado" onClick={() => setApuntando(true)}>
          {noche ? 'Corregir la noche' : 'Apuntar la noche'}
        </Boton>
      ) : (
        <div className="fade-in">
          <div className="field-row">
            <label className="field">
              <span className="bar-label">Se apagó todo</span>
              <input
                type="time"
                value={apagado}
                onChange={(e) => setApagado(e.target.value)}
                aria-label="Hora en que se apagó todo"
              />
            </label>
            <label className="field">
              <span className="bar-label">Me levanté</span>
              <input
                type="time"
                value={levantado}
                onChange={(e) => setLevantado(e.target.value)}
                aria-label="Hora en que me levanté"
              />
            </label>
          </div>
          <p className="faint" style={{ marginTop: 8 }}>
            La última luz que se apagó, no la hora de meterse en la cama. Con esto dejo de suponer
            tu oscuridad y paso a saberla.
          </p>
          <Boton
            tono="primario"
            disabled={!apagado || !levantado}
            onClick={() => {
              const a = minutosDeHora(apagado)
              const l = minutosDeHora(levantado)
              if (a === undefined || l === undefined) return
              actions.saveNoche({ date: hoy, apagado: a, levantado: l })
              setApuntando(false)
            }}
          >
            Guardar la noche
          </Boton>
          <Boton tono="callado" onClick={() => setApuntando(false)}>
            Cancelar
          </Boton>
        </div>
      )}

      {!abierto ? (
        <Boton tono="callado" onClick={() => setAbierto(true)}>
          Qué cuesta cada cosa encendida
        </Boton>
      ) : (
        <div className="fade-in">
          <Regla />
          {h.costes.map((c) => (
            <div key={c.id} style={{ padding: '9px 0' }}>
              <div className="row">
                <span className="dim">{c.que}</span>
                <span className="faint">−{c.cuesta} min</span>
              </div>
              {c.enVezDe && (
                <p className="faint" style={{ marginTop: 3 }}>
                  {c.enVezDe}
                </p>
              )}
            </div>
          ))}
          <p className="faint" style={{ marginTop: 6 }}>
            En minutos de oscuridad y no en una nota, porque los minutos son la unidad en que se
            mide la amplitud. Son órdenes de magnitud, no medidas de laboratorio.
          </p>
          <Boton tono="callado" onClick={() => setAbierto(false)}>
            Cerrar
          </Boton>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════ SKYGAZING ══ */

export function Skygazing({ hoy, lat, lon }: Props) {
  const s = skygazing(hoy, { lat, lon })
  if (!s.hayVentana) return null

  return (
    <div className="card">
      <p className="eyebrow">Mirar al cielo</p>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="dim">Al amanecer</span>
        <span>
          {escribirHora(s.amanecerDesde)} → {escribirHora(s.amanecerHasta)}
        </span>
      </div>
      <div className="row" style={{ padding: '7px 0' }}>
        <span className="dim">Al atardecer</span>
        <span>
          {escribirHora(s.desde)} → {escribirHora(s.hasta)}
        </span>
      </div>
      <p className="faint" style={{ marginTop: 10 }}>
        Sin gafas y sin pantalla. El atardecer no es solo bonito: el cambio de proporción entre el
        rojo y el azul en esos minutos es lo que le dice al cuerpo que la noche viene, y es tan
        informativo como el amanecer. Dura poco y no vuelve hasta mañana.
      </p>
    </div>
  )
}
