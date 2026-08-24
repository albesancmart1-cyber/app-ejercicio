/**
 * Luz: el arco del día, tu jornada, tus lámparas y el balance.
 *
 * Es la pestaña nueva, y su orden no es casual. Arriba va **dónde está el sol
 * ahora mismo**, porque es lo que contesta la pregunta que trae a alguien a
 * abrir esto. Luego la jornada, que es lo que la mayoría de la gente no puede
 * cambiar y por tanto es el marco dentro del cual se decide todo lo demás.
 * Después las lámparas, que son opcionales. Y al final el balance, que resume.
 *
 * La pantalla entera se apoya en una regla: **si no hay coordenadas, no hay
 * nada que enseñar**, y en vez de rellenar con valores por defecto se pide el
 * dato. Un amanecer inventado sería peor que ninguno.
 */
import { useState } from 'react'
import { useAppData, actions } from '../store/store'
import { useToday } from '../store/clock'
import { Boton, Etiqueta, Regla, CampoNumero } from '../components/ui'
import SelectorDeLamparas, {
  lamparasListas,
  type LamparaPuesta
} from '../components/SelectorDeLamparas'
import {
  NOMBRES_UMBRAL,
  QUE_TRAE,
  arcoDelDia,
  cambioDesdeAyer,
  desfaseHorario,
  elevacionSolar,
  escribirDuracion,
  escribirGrados,
  escribirHora,
  minutosDeAhora,
  type Umbral
} from '../domain/arcoSolar'
import {
  FILTROS,
  avisoDeGafas,
  coordenadasDe,
  esLaborable,
  fichajeAbierto,
  filtroCuestaAmplitud,
  nombreDiaSemana,
  queSirve,
  tramosConLuzALaEntrada
} from '../domain/jornada'
import {
  NOMBRES_BANDA4,
  balanceDelDia,
  deudaDeFase,
  planDeAmanecer,
  ventanaDeFase
} from '../domain/balanceLuz'
import { BANDAS, bandaDe, colorDe, escribirNm, nombreDe } from '../domain/luz'
import {
  ZONAS,
  dosisDeSesion,
  lamparasDe,
  escribirIrradiancia,
  escribirJulios,
  picosQueFaltan
} from '../domain/fotobiomodulacion'
import { PICOS_KARU } from '../domain/luz'
import { sumarDiaIso } from '../domain/arcoSolar'
import { dosRelojes, escribirDistancia } from '../domain/relojes'
import { COMPENSACIONES, LO_QUE_LA_LAMPARA_NO_TAPA } from '../domain/compensaciones'
import { MESES_LARGOS } from '../domain/estaciones'
import {
  CalloSolar,
  EstacionesRobadas,
  HigieneDeLuz,
  Skygazing,
  minutosDeNoche
} from '../components/Estaciones'
import type { Filtro, Lampara, OndaLampara, PerfilDeLuz, SesionPBM, ZonaPBM } from '../domain/types'

const UMBRALES_A_ENSEÑAR: Umbral[] = ['civil', 'orto', 'uva', 'uvb']

/**
 * Cuánto ha cambiado el día desde ayer: «+3 min 41 s».
 *
 * Se escribe con signo y con los segundos a la vista porque el dato es pequeño
 * y hace un trabajo grande: en marzo son casi cuatro minutos por día, y ver ese
 * número explica el desconcierto de los cambios de estación mejor que cualquier
 * párrafo.
 */
function escribirSegundos(segundos: number): string {
  const signo = segundos >= 0 ? '+' : '−'
  const s = Math.abs(Math.round(segundos))
  const min = Math.floor(s / 60)
  const resto = s % 60
  if (min === 0) return `${signo}${resto} s`
  return `${signo}${min} min ${resto} s`
}

const nuevoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/* ══════════════════════════════════════════════════ DÓNDE VIVES ══ */

function PedirSitio() {
  const [lat, setLat] = useState<number | undefined>()
  const [lon, setLon] = useState<number | undefined>()
  const [lugar, setLugar] = useState('')
  const data = useAppData()

  return (
    <div className="card">
      <p className="eyebrow">Dónde vives</p>
      <h2 className="score" style={{ fontSize: 26, marginTop: 4 }}>
        Dos números, una vez
      </h2>
      <p className="dim" style={{ marginTop: 8 }}>
        Con tu latitud y tu longitud calculo la posición exacta del sol para tu sitio y para hoy, y
        cambia sola cada día. No hace falta internet ni permiso de ubicación: es astronomía, y se
        hace aquí dentro.
      </p>
      <div className="field-row" style={{ marginTop: 16 }}>
        <label className="field">
          <span className="bar-label">Latitud</span>
          <CampoNumero valor={lat} onCambiar={setLat} decimales placeholder="40,4165" />
        </label>
        <label className="field">
          <span className="bar-label">Longitud</span>
          <CampoNumero valor={lon} onCambiar={setLon} decimales placeholder="-3,7026" />
        </label>
      </div>
      <label className="field" style={{ marginTop: 10 }}>
        <span className="bar-label">Cómo se llama (opcional)</span>
        <input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Madrid" />
      </label>
      <p className="faint" style={{ marginTop: 10 }}>
        La longitud va con el este positivo: Madrid es −3,7026 y Barcelona 2,1734.
      </p>
      <Boton
        tono="primario"
        disabled={lat === undefined || lon === undefined}
        onClick={() => {
          if (lat === undefined || lon === undefined) return
          actions.saveProfile({
            ...(data.profile ?? { name: '', goal: 'recomposicion', equipment: [], maxWeights: {} }),
            lat,
            lon,
            ...(lugar.trim() ? { lugar: lugar.trim() } : {})
          })
        }}
      >
        Guardar mi sitio
      </Boton>
    </div>
  )
}

/* ══════════════════════════════════════════════════ EL ARCO ══ */

function ArcoDeHoy({ hoy, lat, lon }: { hoy: string; lat: number; lon: number }) {
  const coord = { lat, lon }
  const arco = arcoDelDia(hoy, coord)
  const ahora = minutosDeAhora()
  const elevacion = elevacionSolar(hoy, coord, ahora)
  const cambio = cambioDesdeAyer(hoy, coord)
  const q = queSirve(hoy, coord, ahora)

  // El arco dibujado: el sol en su sitio real dentro del día de hoy.
  const orto = arco.pasos.orto.manana
  const ocaso = arco.pasos.orto.tarde
  const fraccion =
    orto !== null && ocaso !== null && ocaso > orto
      ? Math.max(0, Math.min(1, (ahora - orto) / (ocaso - orto)))
      : 0.5
  const x = 20 + 260 * fraccion
  const alturaRel = Math.max(0, elevacion) / Math.max(1, arco.elevacionMaxima)
  const y = 96 - 78 * alturaRel

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          El arco de hoy
        </p>
        <Etiqueta acento>{escribirGrados(elevacion)}</Etiqueta>
      </div>

      <svg viewBox="0 0 300 112" style={{ width: '100%', height: 'auto', marginTop: 10 }} aria-hidden>
        <line x1="6" y1="96" x2="294" y2="96" stroke="var(--separator)" />
        <path
          d="M20 96 Q150 -4 280 96"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          opacity="0.5"
        />
        {elevacion > 0 && (
          <>
            <circle cx={x} cy={y} r="12" fill="var(--accent)" opacity="0.18" />
            <circle cx={x} cy={y} r="5.5" fill="var(--accent)" />
          </>
        )}
        {elevacion <= 0 && <circle cx={x} cy="96" r="4" fill="var(--label-3)" />}
      </svg>

      <div className="row" style={{ marginTop: 4 }}>
        <span className="faint">{escribirHora(orto)}</span>
        <span className="faint">mediodía {escribirHora(arco.mediodiaSolar)}</span>
        <span className="faint">{escribirHora(ocaso)}</span>
      </div>

      <Regla />

      {UMBRALES_A_ENSEÑAR.map((u) => {
        const paso = arco.pasos[u]
        const ocurre = paso.manana !== null
        return (
          <div className="row" key={u} style={{ padding: '7px 0' }}>
            <span className="dim">{NOMBRES_UMBRAL[u]}</span>
            <span>
              {ocurre ? (
                <>
                  {escribirHora(paso.manana)}
                  {u !== 'orto' && u !== 'civil' && (
                    <span className="faint"> → {escribirHora(paso.tarde)}</span>
                  )}
                </>
              ) : (
                <span className="faint">hoy no ocurre</span>
              )}
            </span>
          </div>
        )
      })}

      {arco.pasos.uvb.manana === null && (
        <p className="faint" style={{ marginTop: 8 }}>
          El sol no pasa hoy de {escribirGrados(arco.elevacionMaxima)}, así que no hay ventana de
          vitamina D. No es nada que hayas hecho mal: es tu latitud en esta fecha.
        </p>
      )}

      <Regla />
      <div className="row">
        <span className="dim">Luz del día</span>
        <span>{escribirDuracion(arco.duracionDiaMin)}</span>
      </div>
      <div className="row" style={{ padding: '7px 0' }}>
        <span className="dim">Desde ayer</span>
        <span className={cambio >= 0 ? 'accent' : 'faint'}>{escribirSegundos(cambio)}</span>
      </div>

      <Regla />
      <p className="dim" style={{ marginBottom: 6 }}>
        Ahora mismo
      </p>
      <div className="row" style={{ padding: '5px 0' }}>
        <span className="dim">Para poner el reloj en hora</span>
        <span className={q.fase ? 'accent' : 'faint'}>{q.fase ? 'sirve' : 'no hay luz'}</span>
      </div>
      <div className="row" style={{ padding: '5px 0' }}>
        <span className="dim">Ultravioleta A</span>
        <span className={q.uva ? 'accent' : 'faint'}>{q.uva ? 'sí' : 'falta altura'}</span>
      </div>
      <div className="row" style={{ padding: '5px 0' }}>
        <span className="dim">Ultravioleta B</span>
        <span className={q.uvb ? 'accent' : 'faint'}>{q.uvb ? 'sí' : 'falta altura'}</span>
      </div>
      <p className="faint" style={{ marginTop: 10 }}>
        {QUE_TRAE[q.uvb ? 'uvb' : q.uva ? 'uva' : q.fase ? 'civil' : 'astronomico']}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════ JORNADA ══ */

function Jornada({ hoy, lat, lon }: { hoy: string; lat: number; lon: number }) {
  const data = useAppData()
  const coord = { lat, lon }
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [kelvin, setKelvin] = useState<number | undefined>(5700)
  const [lux, setLux] = useState<number | undefined>(450)
  const [ventana, setVentana] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('ambar')

  const perfiles = data.perfilesLuz ?? []
  const abierto = fichajeAbierto(data.fichajes, hoy)
  const ahora = minutosDeAhora()
  const laborable = esLaborable(hoy, data.profile)
  const habitual =
    perfiles.find((p) => p.id === data.profile?.perfilLuzHabitualId) ?? perfiles[0]

  const gafas = abierto
    ? avisoDeGafas(hoy, coord, abierto.entrada, abierto.luz.filtro)
    : undefined

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          {nombreDiaSemana(hoy)}
        </p>
        <Etiqueta>{laborable ? 'Día de trabajo' : 'Día libre'}</Etiqueta>
      </div>

      {perfiles.length === 0 && !creando && (
        <>
          <p className="dim" style={{ marginTop: 10 }}>
            No es lo mismo estar con gafas ámbar bajo LED cálidos que con las mismas gafas bajo LED
            fríos, ni que sin gafas bajo LED fríos. Configura tu puesto una vez y lo aplico solo
            cada vez que fiches.
          </p>
          <Boton tono="callado" onClick={() => setCreando(true)}>
            Configurar mi puesto
          </Boton>
        </>
      )}

      {creando && (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <label className="field">
            <span className="bar-label">Cómo se llama</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="El taller" />
          </label>
          <div className="field-row" style={{ marginTop: 10 }}>
            <label className="field">
              <span className="bar-label">Temperatura (K)</span>
              <CampoNumero valor={kelvin} onCambiar={setKelvin} placeholder="5700" />
            </label>
            <label className="field">
              <span className="bar-label">Lux aprox.</span>
              <CampoNumero valor={lux} onCambiar={setLux} placeholder="450" />
            </label>
          </div>
          <p className="faint" style={{ marginTop: 8 }}>
            2 700 K es un LED cálido y 5 700 K uno frío de taller. Si no sabes los lux, 450 es lo
            típico de una nave bien iluminada y 300 el de una oficina.
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="dim">Gafas</span>
            <span>
              {(Object.keys(FILTROS) as Filtro[]).map((f) => (
                <Boton
                  key={f}
                  tono={filtro === f ? 'primario' : 'callado'}
                  onClick={() => setFiltro(f)}
                  style={{ display: 'inline-block', width: 'auto', marginLeft: 6 }}
                >
                  {FILTROS[f]}
                </Boton>
              ))}
            </span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="dim">¿Hay ventana?</span>
            <Boton
              tono="callado"
              onClick={() => setVentana((v) => !v)}
              style={{ width: 'auto' }}
            >
              {ventana ? 'Sí' : 'No'}
            </Boton>
          </div>
          <Boton
            tono="primario"
            disabled={!nombre.trim() || kelvin === undefined || lux === undefined}
            onClick={() => {
              const p: PerfilDeLuz = {
                id: nuevoId(),
                nombre: nombre.trim(),
                temperaturaK: kelvin!,
                lux: lux!,
                ventana,
                filtro
              }
              actions.savePerfilLuz(p)
              if (data.profile) actions.saveProfile({ ...data.profile, perfilLuzHabitualId: p.id })
              setCreando(false)
              setNombre('')
            }}
          >
            Guardar el puesto
          </Boton>
          <Boton tono="callado" onClick={() => setCreando(false)}>
            Cancelar
          </Boton>
        </div>
      )}

      {habitual && !creando && (
        <>
          <Regla />
          <div className="row">
            <span className="dim">{habitual.nombre}</span>
            <span className="faint">
              {habitual.temperaturaK} K · {habitual.lux} lux
            </span>
          </div>
          <div className="row" style={{ padding: '7px 0' }}>
            <span className="dim">{FILTROS[habitual.filtro]}</span>
            <span className={filtroCuestaAmplitud(habitual) ? 'faint' : 'accent'}>
              {filtroCuestaAmplitud(habitual) ? 'aquí sí cuesta amplitud' : 'no te cuesta amplitud'}
            </span>
          </div>
          {!filtroCuestaAmplitud(habitual) && habitual.filtro !== 'ninguno' && (
            <p className="faint" style={{ marginTop: 4 }}>
              Con {habitual.lux} lux esa luz nunca iba a darte contraste. Lo que quita amplitud es
              la falta de día, no el filtro: llévalas sin mala conciencia.
            </p>
          )}

          <Regla />
          {abierto ? (
            <>
              <div className="row">
                <span className="dim">Fichaste a las</span>
                <span>{escribirHora(abierto.entrada)}</span>
              </div>
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Llevas dentro</span>
                <span>{escribirDuracion(Math.max(0, ahora - abierto.entrada))}</span>
              </div>
              {gafas?.filtroEstorba && (
                <p className="faint" style={{ marginTop: 8 }}>
                  Ojo: cuando fichaste el sol ya estaba a {escribirGrados(gafas.elevacion)}. Tu
                  trayecto de hoy era la ventana del amanecer, y las gafas bloquean justo esa señal.
                </p>
              )}
              <TramosDeGafas hoy={hoy} coord={coord} entrada={abierto.entrada} />
              <Boton
                tono="primario"
                onClick={() => actions.saveFichaje({ ...abierto, salida: ahora })}
              >
                Salgo del trabajo
              </Boton>
            </>
          ) : (
            <Boton
              tono="primario"
              onClick={() =>
                actions.saveFichaje({
                  id: nuevoId(),
                  date: hoy,
                  entrada: ahora,
                  perfilLuzId: habitual.id,
                  luz: {
                    nombre: habitual.nombre,
                    temperaturaK: habitual.temperaturaK,
                    lux: habitual.lux,
                    ventana: habitual.ventana,
                    filtro: habitual.filtro
                  }
                })
              }
            >
              Fichar entrada
            </Boton>
          )}

          <Boton
            tono="callado"
            onClick={() =>
              actions.saveSalida({
                id: nuevoId(),
                date: hoy,
                desde: ahora,
                minutos: 10,
                filtro: 'ninguno'
              })
            }
          >
            He salido fuera 10 min
          </Boton>
        </>
      )}
    </div>
  )
}


/**
 * Entre qué fechas del año el filtro de la mañana estorba en tu trayecto.
 *
 * El aviso del mismo día llega tarde para organizarse. Esto lo dice con
 * antelación y, sobre todo, dice **también cuándo las gafas están bien
 * puestas**: el resto del año protegen tu melatonina y quitárselas sería peor.
 * Un aviso que solo señala el fallo enseña a ignorarlo.
 */
function TramosDeGafas({
  hoy,
  coord,
  entrada
}: {
  hoy: string
  coord: { lat: number; lon: number }
  entrada: number
}) {
  const tramos = tramosConLuzALaEntrada(Number(hoy.slice(0, 4)), coord, entrada, desfaseHorario)
  // Los cambios de hora parten el año en trozos pequeños que no aportan nada.
  const largos = tramos.filter(
    (t) => (Date.parse(t.hasta) - Date.parse(t.desde)) / 86400000 >= 14
  )
  if (largos.length === 0) return null

  return (
    <p className="faint" style={{ marginTop: 8 }}>
      A tu hora de entrada hay luz aprovechable{' '}
      {largos.map((t, i) => (
        <span key={t.desde}>
          {i > 0 && ' y '}
          del {escribirDiaCorto(t.desde)} al {escribirDiaCorto(t.hasta)}
        </span>
      ))}
      . Fuera de ahí es de noche a esa hora y las gafas están bien puestas: protegen tu melatonina.
    </p>
  )
}

/** «1 de mayo», para decir un tramo del año sin repetirlo entero. */
function escribirDiaCorto(iso: string): string {
  const dia = Number(iso.slice(8, 10))
  return `${dia} de ${MESES_LARGOS[Number(iso.slice(5, 7)) - 1]}`
}

/* ══════════════════════════════════════════════════ FIN DE SEMANA ══ */

function DiaDeReparar({ hoy, lat, lon }: { hoy: string; lat: number; lon: number }) {
  const data = useAppData()
  const coord = { lat, lon }

  // Los cinco días anteriores: cuántos tuvieron pulso de mañana.
  const dias = Array.from({ length: 5 }, (_, i) => {
    const fecha = sumarDiaIso(hoy, -(i + 1))
    const v = ventanaDeFase(fecha, coord)
    const huboPulso = (data.salidas ?? []).some(
      (s) =>
        s.date === fecha &&
        v.desde !== null &&
        v.hasta !== null &&
        s.desde + s.minutos > v.desde &&
        s.desde < v.hasta
    )
    return { fecha, huboPulso }
  })

  const deuda = deudaDeFase(dias)
  const manana = sumarDiaIso(hoy, 1)
  const plan = planDeAmanecer(manana, coord, deuda.minutos)
  const libreManana = !esLaborable(manana, data.profile)

  if (deuda.minutos === 0 || !plan || !libreManana) return null

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Mañana no trabajas
        </p>
        <Etiqueta acento>Día de reparar</Etiqueta>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="dim">Deuda de fase de la semana</span>
        <span className="score" style={{ fontSize: 22 }}>
          −{deuda.minutos} min
        </span>
      </div>
      <p className="dim" style={{ marginTop: 8 }}>
        {deuda.diasSinPulso} {deuda.diasSinPulso === 1 ? 'día' : 'días'} sin pulso de mañana. El
        reloj humano corre largo y sin esa señal se va atrasando.
      </p>
      <Regla />
      <div className="row">
        <span className="dim">Sal mañana entre</span>
        <span>
          {escribirHora(plan.desde)} y {escribirHora(plan.hasta)}
        </span>
      </div>
      <div className="row" style={{ padding: '7px 0' }}>
        <span className="dim">Con eso recuperas</span>
        <span className="accent">≈ {plan.recupera} min</span>
      </div>
      <p className="faint" style={{ marginTop: 10 }}>
        Es la única herramienta que revierte de verdad una semana de LED, y solo la tienes dos días.
        Si esta noche te acuestas dos horas más tarde, mañana pierdes la ventana.
      </p>
    </div>
  )
}


/* ══════════════════════════════════════════════════ LOS DOS RELOJES ══ */

/**
 * La distancia entre el reloj de la luz y el de la comida.
 *
 * Es, probablemente, el número más útil de la app: el único que explica por qué
 * alguien que come lo mismo que el año pasado ha engordado. Cuando falta un
 * dato se dice cuál falta, en vez de suponerlo — suponer aquí sería inventar la
 * conclusión entera.
 */
function DosRelojesCard({ hoy, lat, lon }: { hoy: string; lat: number; lon: number }) {
  const data = useAppData()
  const coord = { lat, lon }
  const r = dosRelojes(
    hoy,
    coord,
    data.salidas,
    (data.comidas ?? []).find((d) => d.date === hoy),
    desfaseHorario(hoy)
  )

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Tus dos relojes
        </p>
        {r.distanciaMin !== undefined && (
          <Etiqueta acento={!r.desincronizado}>
            {r.desincronizado ? 'A distinta hora' : 'En hora'}
          </Etiqueta>
        )}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="dim">Central · lo pone la luz</span>
        <span>{r.central !== undefined ? escribirHora(r.central) : '—'}</span>
      </div>
      <div className="row" style={{ padding: '7px 0' }}>
        <span className="dim">Periférico · lo pone la comida</span>
        <span>{r.periferico !== undefined ? escribirHora(r.periferico) : '—'}</span>
      </div>

      {r.distanciaMin !== undefined ? (
        <>
          <Regla />
          <div className="row">
            <span className="dim">Comiste</span>
            <span className={r.desincronizado ? 'faint' : 'accent'}>{escribirDistancia(r)}</span>
          </div>
          <p className="faint" style={{ marginTop: 10 }}>
            {r.desincronizado
              ? 'El hígado va por delante del cerebro. Con los dos relojes a distinta hora, la misma comida se gestiona peor y la saciedad llega tarde. Lo más barato de cambiar suele ser retrasar la primera comida, no comer menos.'
              : 'Los dos van a la misma hora. Es el orden que hace que la comida caiga cuando el cuerpo la espera.'}
          </p>
        </>
      ) : (
        <p className="faint" style={{ marginTop: 10 }}>
          {r.falta === 'luz'
            ? 'Falta apuntar algún rato fuera para saber cuándo se puso en hora tu reloj central.'
            : r.falta === 'comida'
              ? 'Falta apuntar la primera comida del día — el café cuenta.'
              : 'Apunta un rato fuera y tu primera comida, y te digo la distancia entre los dos.'}
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════ LÁMPARAS ══ */

function Lamparas({ hoy }: { hoy: string }) {
  const data = useAppData()
  const lamparas = data.lamparas ?? []
  const [creando, setCreando] = useState(false)
  /** El id que se está corrigiendo, o null si es una lámpara nueva. */
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [refCm, setRefCm] = useState<number | undefined>(15)
  const [ondas, setOndas] = useState<OndaLampara[]>([])
  const [nm, setNm] = useState<number | undefined>()
  const [mw, setMw] = useState<number | undefined>()

  const cerrarFormulario = () => {
    setCreando(false)
    setEditandoId(null)
    setNombre('')
    setRefCm(15)
    setOndas([])
    setNm(undefined)
    setMw(undefined)
  }

  /**
   * Abre el formulario con los datos de una lámpara para corregirlos.
   *
   * Hace falta porque el dato que más se equivoca uno al teclear —la
   * irradiancia— es justo el que multiplica toda la dosis, y hasta ahora la
   * única salida era borrar la lámpara y volver a escribirla entera, lo que
   * dejaba sin calcular todas las sesiones que la usaban.
   */
  const editar = (l: Lampara) => {
    setEditandoId(l.id)
    setNombre(l.nombre)
    setRefCm(l.distanciaRefCm)
    setOndas([...l.ondas].sort((a, b) => a.nm - b.nm))
    setNm(undefined)
    setMw(undefined)
    setCreando(true)
  }

  /* Abierto o cerrado. Se abre desde una lámpara concreta, que queda encendida
   * de partida, pero dentro se pueden encender las demás: una sesión puede
   * tener varias a la vez. */
  const [abierto, setAbierto] = useState(false)
  const [puestas, setPuestas] = useState<LamparaPuesta[]>([])
  const [minutos, setMinutos] = useState<number | undefined>(10)
  const [zona, setZona] = useState<ZonaPBM>('espalda')

  const deHoy = (data.sesionesPBM ?? []).filter((s) => s.date === hoy)
  const listas = lamparasListas(puestas)

  const previa: SesionPBM | null =
    abierto && listas.length > 0 && minutos !== undefined
      ? {
          id: 'previa',
          date: hoy,
          lamparaId: listas[0].lamparaId,
          minutos,
          distanciaCm: listas[0].distanciaCm,
          zona,
          ...(listas.length > 1 ? { lamparas: listas } : {})
        }
      : null
  const dosis = previa ? dosisDeSesion(previa, lamparas) : null

  const abrirCon = (l: Lampara) => {
    if (abierto) return setAbierto(false)
    setPuestas([{ lamparaId: l.id, distanciaCm: l.distanciaRefCm }])
    setAbierto(true)
  }

  return (
    <div className="card">
      <p className="eyebrow">Tus lámparas</p>

      {lamparas.length === 0 && !creando && (
        <p className="dim" style={{ marginTop: 8 }}>
          Crea la tuya con el nombre que quieras y todas sus longitudes de onda con su irradiancia.
          Vale cualquier valor de 280 a 3 000 nm: ultravioleta, violeta, verde, rojo o infrarrojo.
          Con eso calculo lo que te ha dado de verdad cada sesión.
        </p>
      )}

      {lamparas.map((l) => {
        const faltan = picosQueFaltan(l)
        return (
          <div key={l.id} style={{ marginTop: 12 }}>
            <div className="row">
              <span className="item-title">{l.nombre}</span>
              <span className="faint">
                {l.ondas.length} {l.ondas.length === 1 ? 'onda' : 'ondas'} · {l.distanciaRefCm} cm
              </span>
            </div>
            {l.ondas.map((o) => (
              <div className="row" key={o.nm} style={{ padding: '4px 0' }}>
                <span className="dim">
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: colorDe(o.nm),
                      marginRight: 7
                    }}
                  />
                  {escribirNm(o.nm)} · {nombreDe(o.nm)}
                </span>
                <span className="faint">{escribirIrradiancia(o.irradiancia)}</span>
              </div>
            ))}
            <div className="row" style={{ padding: '4px 0' }}>
              <span className="faint">Picos de la citocromo c oxidasa</span>
              <span className={faltan.length === 0 ? 'accent' : 'faint'}>
                {PICOS_KARU.length - faltan.length} de {PICOS_KARU.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Boton tono="callado" suelto onClick={() => abrirCon(l)} style={{ flex: 1 }}>
                {abierto ? 'Cerrar' : 'Apuntar una sesión'}
              </Boton>
              <Boton
                tono="callado"
                suelto
                onClick={() => editar(l)}
                aria-label={`Editar ${l.nombre}`}
                style={{ flex: 1 }}
              >
                Editar
              </Boton>
            </div>
          </div>
        )
      })}

      {abierto && (
        <div className="fade-in" style={{ marginTop: 10 }}>
          <Regla />
          <p className="eyebrow">Con cuál o con cuáles</p>
          <SelectorDeLamparas lamparas={lamparas} puestas={puestas} onCambiar={setPuestas} />

          <Regla />
          <label className="field">
            <span className="bar-label">Minutos</span>
            <CampoNumero valor={minutos} onCambiar={setMinutos} />
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 10
            }}
          >
            {(Object.keys(ZONAS) as ZonaPBM[]).map((z) => (
              <Boton
                key={z}
                tono={zona === z ? 'primario' : 'callado'}
                onClick={() => setZona(z)}
                style={{ width: 'auto' }}
              >
                {ZONAS[z]}
              </Boton>
            ))}
          </div>

          {dosis && (
            <>
              <Regla />
              <div className="row">
                <span className="dim">Dosis entregada</span>
                <span className="score" style={{ fontSize: 22 }}>
                  {escribirJulios(dosis.julios)}
                </span>
              </div>
              {dosis.porOnda.map((o) => (
                <div className="row" key={o.nm} style={{ padding: '4px 0' }}>
                  <span className="faint">{escribirNm(o.nm)}</span>
                  <span className="faint">{escribirJulios(o.julios)}</span>
                </div>
              ))}
              {dosis.porLampara.length > 1 && (
                <>
                  <p className="eyebrow" style={{ marginTop: 12 }}>
                    Lo que pone cada una
                  </p>
                  {dosis.porLampara.map((l) => (
                    <div className="row" key={l.lamparaId} style={{ padding: '4px 0' }}>
                      <span className="faint">
                        {l.nombre} · {l.distanciaCm} cm
                      </span>
                      <span className="faint">{escribirJulios(l.julios)}</span>
                    </div>
                  ))}
                </>
              )}
              {dosis.porLampara
                .filter((l) => Math.abs(l.factorDistancia - 1) > 0.01)
                .map((l) => (
                  <p className="faint" key={l.lamparaId} style={{ marginTop: 8 }}>
                    De {l.nombre}, a {l.distanciaCm} cm, llega el{' '}
                    {Math.round(l.factorDistancia * 100)} % de su irradiancia. La luz cae con el
                    cuadrado de la distancia.
                  </p>
                ))}
            </>
          )}

          <Boton
            tono="primario"
            disabled={!previa}
            onClick={() => {
              if (!previa) return
              actions.saveSesionPBM({ ...previa, id: nuevoId(), hora: minutosDeAhora() })
              setAbierto(false)
            }}
          >
            Guardar sesión
          </Boton>
        </div>
      )}

      {deHoy.length > 0 && (
        <>
          <Regla />
          <p className="dim" style={{ marginBottom: 6 }}>
            Hoy
          </p>
          {deHoy.map((s) => {
            const d = dosisDeSesion(s, lamparas)
            const nombres = lamparasDe(s)
              .map((x) => lamparas.find((l) => l.id === x.lamparaId)?.nombre ?? 'Lámpara borrada')
              .join(' + ')
            return (
              <div className="row" key={s.id} style={{ padding: '5px 0' }}>
                <span className="dim">
                  {nombres} · {ZONAS[s.zona]}
                </span>
                <span className="faint">
                  {s.minutos} min
                  {d.porLampara.length > 0 ? ` · ${escribirJulios(d.julios)}` : ''}
                </span>
              </div>
            )
          })}
        </>
      )}

      <Regla />
      {!creando ? (
        <Boton tono="callado" onClick={() => setCreando(true)}>
          Crear una lámpara
        </Boton>
      ) : (
        <div className="fade-in">
          {editandoId !== null && (
            <>
              <p className="eyebrow">Corregir la lámpara</p>
              <p className="faint" style={{ marginTop: 6, marginBottom: 10 }}>
                Las sesiones ya apuntadas con ella <strong>se recalculan</strong>: la dosis se
                saca de la lámpara cada vez, no se guarda congelada. Es lo que quieres si
                estás arreglando una errata, y conviene saberlo si no.
              </p>
            </>
          )}
          <label className="field">
            <span className="bar-label">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Panel del salón"
            />
          </label>
          <label className="field" style={{ marginTop: 10 }}>
            <span className="bar-label">Distancia a la que está medida (cm)</span>
            <CampoNumero valor={refCm} onCambiar={setRefCm} placeholder="15" />
          </label>

          {ondas.map((o) => (
            <div className="row" key={o.nm} style={{ padding: '5px 0' }}>
              <span className="dim">
                {escribirNm(o.nm)} · {nombreDe(o.nm)}
              </span>
              <span className="faint">
                {escribirIrradiancia(o.irradiancia)}
                <button
                  onClick={() => setOndas((xs) => xs.filter((x) => x.nm !== o.nm))}
                  aria-label={`Quitar ${escribirNm(o.nm)}`}
                  style={{
                    background: 'none',
                    border: 0,
                    color: 'var(--label-3)',
                    marginLeft: 10,
                    cursor: 'pointer',
                    font: 'inherit'
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}

          <div className="field-row" style={{ marginTop: 10 }}>
            <label className="field">
              <span className="bar-label">Longitud de onda (nm)</span>
              <CampoNumero valor={nm} onCambiar={setNm} placeholder="660" />
            </label>
            <label className="field">
              <span className="bar-label">mW/cm²</span>
              <CampoNumero valor={mw} onCambiar={setMw} decimales placeholder="18" />
            </label>
          </div>
          {nm !== undefined && bandaDe(nm) === null && (
            <p className="faint" style={{ marginTop: 6 }}>
              {escribirNm(nm)} se sale del rango que sirve para esto (280 a 3 000 nm). Revísalo: es
              fácil escribir 66 en vez de 660.
            </p>
          )}
          {nm !== undefined && bandaDe(nm) !== null && (
            <p className="faint" style={{ marginTop: 6 }}>
              {nombreDe(nm)}. {BANDAS[bandaDe(nm)!].queHace}
            </p>
          )}
          <Boton
            tono="callado"
            disabled={nm === undefined || bandaDe(nm) === null || !mw || mw <= 0}
            onClick={() => {
              if (nm === undefined || mw === undefined) return
              setOndas((xs) => [...xs.filter((x) => x.nm !== nm), { nm, irradiancia: mw }].sort((a, b) => a.nm - b.nm))
              setNm(undefined)
              setMw(undefined)
            }}
          >
            Añadir esta onda
          </Boton>

          <Boton
            tono="primario"
            disabled={!nombre.trim() || ondas.length === 0 || !refCm}
            onClick={() => {
              const l: Lampara = {
                id: editandoId ?? nuevoId(),
                nombre: nombre.trim(),
                distanciaRefCm: refCm!,
                ondas
              }
              actions.saveLampara(l)
              cerrarFormulario()
            }}
          >
            {editandoId !== null ? 'Guardar cambios' : 'Guardar lámpara'}
          </Boton>
          <Boton tono="callado" onClick={cerrarFormulario}>
            Cancelar
          </Boton>
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════════ COMPENSACIONES ══ */

/**
 * Qué se compensa, con qué, y qué no se compensa con nada.
 *
 * Estaba escrita en la página de producto y no en la app, que es el peor sitio
 * posible: la promesa la lee quien está decidiendo si instalarla, y la necesita
 * quien ya la está usando a las siete menos cuarto de la mañana.
 */
function Compensaciones() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="card">
      <p className="eyebrow">Qué se puede compensar</p>

      {!abierto ? (
        <>
          <p className="dim" style={{ marginTop: 8 }}>
            Una herramienta que tenga un remedio para todo te está mintiendo en algo. Aquí está la
            tabla honesta, con la letra pequeña de cada compensación.
          </p>
          <Boton tono="callado" onClick={() => setAbierto(true)}>
            Ver la tabla
          </Boton>
        </>
      ) : (
        <div className="fade-in">
          {COMPENSACIONES.map((c) => (
            <div key={c.id} style={{ padding: '11px 0', borderTop: '1px solid var(--separator)' }}>
              <div className="row">
                <span className="item-title">{c.falta}</span>
                {c.seCompensaCon === null && <Etiqueta>Nada lo tapa</Etiqueta>}
              </div>
              {c.seCompensaCon && (
                <p className="dim" style={{ margin: '5px 0 0', fontSize: 15 }}>
                  {c.seCompensaCon}
                </p>
              )}
              {c.noCubre !== '—' && (
                <p className="faint" style={{ marginTop: 5 }}>
                  No cubre: {c.noCubre}
                </p>
              )}
            </div>
          ))}

          <Regla />
          <p className="dim" style={{ marginBottom: 6 }}>
            Y lo que una lámpara no tapa
          </p>
          {LO_QUE_LA_LAMPARA_NO_TAPA.map((linea) => (
            <p className="faint" key={linea} style={{ marginTop: 4 }}>
              · {linea}
            </p>
          ))}

          <Boton tono="callado" onClick={() => setAbierto(false)}>
            Cerrar
          </Boton>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════ BALANCE ══ */

function Balance({ hoy, lat, lon }: { hoy: string; lat: number; lon: number }) {
  const data = useAppData()
  const noche = (data.noches ?? []).find((n) => n.date === hoy)
  const balance = balanceDelDia({
    fecha: hoy,
    coord: { lat, lon },
    desfaseMin: desfaseHorario(hoy),
    salidas: (data.salidas ?? []).filter((s) => s.date === hoy),
    sol: (data.sol ?? []).find((s) => s.date === hoy),
    sesionesPBM: (data.sesionesPBM ?? []).filter((s) => s.date === hoy),
    lamparas: data.lamparas,
    fichaje: (data.fichajes ?? []).find((f) => f.date === hoy),
    ...(noche ? { oscuridadDesde: noche.apagado, oscuridadHasta: noche.levantado } : {})
  })

  return (
    <div className="card">
      <p className="eyebrow">¿Suficiente hoy?</p>

      {balance.barras.map((b) => (
        <div key={b.banda} style={{ marginTop: 12 }}>
          <div className="row">
            <span className="bar-label">{NOMBRES_BANDA4[b.banda]}</span>
            <span className={b.fraccion === null ? 'faint' : b.fraccion > 0.7 ? 'accent' : 'dim'}>
              {b.fraccion === null ? 'no había' : `${Math.round(b.fraccion * 100)} %`}
            </span>
          </div>
          <div className="bar-track" style={{ marginTop: 5 }}>
            <div
              className={`bar-fill${b.fraccion !== null && b.fraccion <= 0.4 ? ' low' : ''}`}
              style={{ width: `${Math.round((b.fraccion ?? 0) * 100)}%` }}
            />
          </div>
          <p className="faint" style={{ marginTop: 4 }}>
            {b.detalle}
          </p>
        </div>
      ))}

      <Regla />
      <p className="faint">
        El cien por cien no es una cifra de manual: es lo que el sol te ofrecía hoy en tu sitio y en
        esta fecha. No hay consenso sobre cuántos julios de luz roja necesita alguien al día, y
        poner un número inventado sería venderte algo. Cuando una barra dice «no había», es que no
        había: en diciembre, aquí, la vitamina D no es posible y no es culpa tuya.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════ LA PANTALLA ══ */

export default function Luz() {
  const data = useAppData()
  const hoy = useToday()
  const coord = coordenadasDe(data.profile)

  if (!coord) {
    return (
      <div className="card-wrap fade-in">
        <PedirSitio />
      </div>
    )
  }

  /* Lo que comparten las cuatro tarjetas del final, para no repetirlo cuatro veces. */
  // La noche se guarda con la fecha de la mañana en que uno se levanta, así que
  // «anoche» es la de hoy. Ver el comentario de `NocheRegistrada`.
  const nocheDeAnoche = (data.noches ?? []).find((n) => n.date === hoy)
  const comunes = {
    hoy,
    lat: coord.lat,
    lon: coord.lon,
    salidas: data.salidas,
    checkIns: data.checkIns,
    noches: data.noches,
    // Las estaciones se leen con la noche **de anoche**, que es la que ya pasó.
    oscuridadReal: nocheDeAnoche ? minutosDeNoche(nocheDeAnoche) : undefined
  }

  return (
    <div className="card-wrap fade-in">
      <ArcoDeHoy hoy={hoy} lat={coord.lat} lon={coord.lon} />
      <Jornada hoy={hoy} lat={coord.lat} lon={coord.lon} />
      <DosRelojesCard hoy={hoy} lat={coord.lat} lon={coord.lon} />
      <DiaDeReparar hoy={hoy} lat={coord.lat} lon={coord.lon} />
      <Lamparas hoy={hoy} />
      <Balance hoy={hoy} lat={coord.lat} lon={coord.lon} />
      <Compensaciones />
      <EstacionesRobadas {...comunes} />
      <CalloSolar {...comunes} />
      <Skygazing {...comunes} />
      <HigieneDeLuz {...comunes} />
    </div>
  )
}
