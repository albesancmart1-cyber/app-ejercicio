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
import type { CheckIn, Filtro, NocheRegistrada, SalidaAlExterior } from '../domain/types'
import { GAFAS, LO_QUE_NO_TAPAN, gafasDe, oscuridadDeLaNoche } from '../domain/gafasRojas'
import { minutosDeHora } from '../domain/relojes'
import { actions } from '../store/store'
import { Boton, Etiqueta, Opcion, Regla } from './ui'

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
 *
 * Cuenta a secas los minutos con todo apagado. El rato con las gafas puestas va
 * aparte, en `oscuridadDeLaNoche`, para que una noche medida y una noche
 * ayudada no se enseñen nunca con la misma cifra sin decir cuál es cuál.
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
  const [gafas, setGafas] = useState<Filtro | ''>(noche?.gafas ?? '')
  const [gafasDesde, setGafasDesde] = useState(
    noche?.gafasDesde !== undefined ? escribirHora(noche.gafasDesde) : ''
  )
  const cuenta = noche ? oscuridadDeLaNoche(noche) : null

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
        <>
          <div className="row">
            <span className="dim">Anoche</span>
            <span>
              {escribirHora(noche.apagado)} → {escribirHora(noche.levantado)}{' '}
              <span className="faint">({escribirDuracion(minutosDeNoche(noche))})</span>
            </span>
          </div>
          {cuenta && cuenta.valen > 0 && (
            <>
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Antes, con {(gafasDe(cuenta.filtro)?.nombre ?? 'gafas').toLowerCase()}</span>
                <span>
                  {escribirHora(noche.gafasDesde!)} → {escribirHora(noche.apagado)}{' '}
                  <span className="faint">({escribirDuracion(cuenta.conGafas)})</span>
                </span>
              </div>
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Noche que cuenta</span>
                <span>{escribirDuracion(cuenta.total)}</span>
              </div>
              <p className="faint">
                Ese rato con las gafas vale {escribirDuracion(cuenta.valen)} de oscuridad, no los{' '}
                {escribirDuracion(cuenta.conGafas)} enteros. Se enseña por separado a propósito: una
                noche medida y una noche ayudada no pueden salir con la misma cifra.
              </p>
            </>
          )}
        </>
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

          <Regla />
          <p className="eyebrow">¿Y antes, con gafas?</p>
          <p className="faint" style={{ marginBottom: 10 }}>
            Si te las pusiste con la casa todavía encendida, ese rato cuenta. No entero, pero
            cuenta: es la forma de hacer de noche sin apagarlo todo al ocaso.
          </p>
          <div className="options" style={{ marginTop: 10 }}>
            <Opcion activa={gafas === ''} onElegir={() => setGafas('')}>
              Sin gafas
            </Opcion>
            {GAFAS.map((g) => (
              <Opcion key={g.id} activa={gafas === g.id} onElegir={() => setGafas(g.id)}>
                {g.nombre}
              </Opcion>
            ))}
          </div>
          {gafas !== '' && (
            <div className="fade-in">
              <p className="faint" style={{ marginTop: 8 }}>
                {gafasDe(gafas)?.que}
              </p>
              <label className="field" style={{ marginTop: 10 }}>
                <span className="bar-label">Me las puse</span>
                <input
                  type="time"
                  value={gafasDesde}
                  onChange={(e) => setGafasDesde(e.target.value)}
                  aria-label="Hora en que me puse las gafas"
                />
              </label>
            </div>
          )}

          <Boton
            tono="primario"
            disabled={!apagado || !levantado || (gafas !== '' && !gafasDesde)}
            onClick={() => {
              const a = minutosDeHora(apagado)
              const l = minutosDeHora(levantado)
              if (a === undefined || l === undefined) return
              const g = gafas === '' ? undefined : minutosDeHora(gafasDesde)
              actions.saveNoche({
                date: hoy,
                apagado: a,
                levantado: l,
                // Sin hora no hay tramo que contar, así que las gafas tampoco
                // se guardan: dejar el filtro suelto haría creer que algo suma.
                ...(gafas !== '' && g !== undefined ? { gafas, gafasDesde: g } : {})
              })
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
          <div className="row">
            <span className="faint">Cada cosa encendida</span>
            <span className="faint">Sin gafas · con gafas</span>
          </div>
          {h.costes.map((c) => (
            <div key={c.id} style={{ padding: '9px 0' }}>
              <div className="row">
                <span className="dim">{c.que}</span>
                {/* Sin partir: «−90 · −10 min» roto en dos líneas se lee como
                    dos cifras sueltas y deja de ser una comparación. */}
                <span className="faint" style={{ whiteSpace: 'nowrap' }}>
                  −{c.cuesta} · <strong>−{c.conGafas}</strong> min
                </span>
              </div>
              <p className="faint" style={{ marginTop: 3 }}>
                {c.loQueQueda}
              </p>
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

          <Regla />
          <p className="eyebrow">Por qué las gafas bajan tanto</p>
          <p className="faint" style={{ marginTop: 8 }}>
            Porque el reloj central no mide la luz con los conos ni con los bastones: la mide con
            unas células propias de la retina cuya sensibilidad tiene el pico en <strong>480 nm</strong>{' '}
            y ya casi no responde pasados los 550. Es un canal, y un canal se puede tapar antes de
            que la señal entre. Por eso las rojas —que cortan por 550— valen bastante más que las
            ámbar, que cortan por 480 y dejan pasar el verde entero.
          </p>
          <p className="eyebrow" style={{ marginTop: 12 }}>
            Y lo que no tapan
          </p>
          {LO_QUE_NO_TAPAN.map((x) => (
            <p className="faint" key={x} style={{ marginTop: 4 }}>
              · {x}
            </p>
          ))}
          <p className="faint" style={{ marginTop: 8 }}>
            Fíjate en las dos filas donde la segunda cifra casi no baja. No es un descuido: son
            justo los dos sitios donde unas gafas no pueden hacer nada.
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
