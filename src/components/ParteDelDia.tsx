/**
 * El parte del día, tal y como se pinta debajo de los botones de «Medir».
 *
 * Es el sitio donde la causa y el efecto se ven juntos: aprietas un botón y el
 * saldo cambia sin cambiar de pantalla. Todo lo que enseña sale de
 * `domain/parte.ts`; aquí solo se reúnen los datos del store y se ordena la
 * lista.
 *
 * Dos decisiones de forma que sostienen el tono:
 *
 *  - Los **«aún a tiempo» van arriba y abiertos**, porque son los únicos sobre
 *    los que se puede actuar. Los demás grupos se pliegan.
 *  - El color nunca va solo: cada grupo lleva su etiqueta escrita. Un semáforo
 *    de puntitos no se lee bien con daltonismo ni al sol de la calle, que es
 *    justo donde se va a mirar esta pantalla.
 */
import { useState } from 'react'
import { useAppData } from '../store/store'
import { coordenadasDe, ventanaContraTuJornada } from '../domain/jornada'
import { desfaseHorario, escribirHora, minutosDeAhora, sumarDiaIso } from '../domain/arcoSolar'
import { deudaDeFase, ventanaDeFase } from '../domain/balanceLuz'
import { huboPulsoDeManana } from '../domain/relojes'
import { deElPerfil } from '../domain/vitaminaD'
import { diaDe } from '../domain/crononutricion'
import { resumenDeSemana } from '../domain/semana'
import {
  NOMBRES_SIGNO,
  ORDEN_SIGNO,
  parteDelDia,
  puntosDe,
  type Parte,
  type Punto,
  type Signo
} from '../domain/parte'
import { Etiqueta, Regla } from './ui'

/** Cuántos días atrás se mira para la deuda de fase de la semana. */
const DIAS_DE_SEMANA = 7

export default function ParteDelDia({ hoy }: { hoy: string }) {
  const data = useAppData()
  const coord = coordenadasDe(data.profile)

  if (!coord) {
    return (
      <div className="card">
        <p className="eyebrow" style={{ margin: 0 }}>
          El parte del día
        </p>
        <p className="lede">
          Falta tu sitio. Sin latitud y longitud no se puede saber a qué hora sale el sol donde
          estás, y sin eso el parte serían suposiciones de otro país. Se pone una vez, en «Luz».
        </p>
      </div>
    )
  }

  // La deuda de fase de la semana: días de atrás sin pulso de mañana. Se cuenta
  // desde ayer, porque el pulso de hoy puede estar todavía por llegar.
  const dias: { fecha: string; huboPulso: boolean }[] = []
  for (let i = 1; i <= DIAS_DE_SEMANA; i++) {
    const fecha = sumarDiaIso(hoy, -i)
    dias.push({
      fecha,
      huboPulso: huboPulsoDeManana(fecha, coord, data.salidas, desfaseHorario(fecha))
    })
  }

  const parte = parteDelDia({
    hoy,
    ahoraMin: minutosDeAhora(),
    coord,
    desfaseMin: desfaseHorario(hoy),
    salidas: data.salidas,
    sol: data.sol,
    quien: deElPerfil(data.profile),
    comidas: diaDe(data.comidas, hoy),
    suplementos: data.suplementos,
    sesionesPBM: data.sesionesPBM,
    lamparas: data.lamparas,
    noche: (data.noches ?? []).find((n) => n.date === hoy),
    habitos: data.habitos,
    entreno: {
      hecho: data.sessions.some((s) => s.date === hoy && s.completed),
      // «Tocaba» no es una casilla del calendario: es que alguna zona vaya
      // corta de series esta semana. Sin eso, un día de descanso bien tomado
      // aparecería como algo pendiente, que es justo lo contrario de lo que es.
      tocaba: resumenDeSemana(data.sessions, hoy).masCorta !== undefined
    },
    deudaSemana: deudaDeFase(dias),
    // Una ventana que cae dentro de tu jornada no está «aún a tiempo»: no la hubo.
    ventanaManana: ventanaContraTuJornada(
      hoy,
      ventanaDeFase(hoy, coord, desfaseHorario(hoy)),
      data.profile,
      data.fichajes
    )
  })

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          El parte del día
        </p>
        <Etiqueta acento={parte.aunPuedes > 0}>{parte.titular}</Etiqueta>
      </div>

      {parte.puntos.length === 0 ? (
        <p className="lede">
          Todavía no hay nada apuntado hoy. En cuanto empieces algo con los botones de arriba, esto
          se llena solo.
        </p>
      ) : (
        <Grupos parte={parte} />
      )}

      <Regla />
      <p className="faint">
        Esto no es una nota del día. No se promedia la vitamina D con el ratio de omegas porque ese
        número no significaría nada: se enseña cada cosa por su lado y se dice de dónde sale.
      </p>
    </div>
  )
}

function Grupos({ parte }: { parte: Parte }) {
  return (
    <div className="parte">
      {ORDEN_SIGNO.map((signo) => {
        const puntos = puntosDe(parte, signo)
        if (puntos.length === 0) return null
        return <Grupo key={signo} signo={signo} puntos={puntos} />
      })}
    </div>
  )
}

/**
 * Un grupo de puntos. El de «aún a tiempo» arranca abierto y los demás
 * plegados: quien mira el parte a media mañana quiere lo que puede hacer, no la
 * lista de lo que ya no.
 */
function Grupo({ signo, puntos }: { signo: Signo; puntos: Punto[] }) {
  const [abierto, setAbierto] = useState(signo === 'aun_puedes')

  return (
    <section className={`parte-grupo parte-${signo}`}>
      <button
        type="button"
        className="parte-cabecera"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span className="parte-marca" aria-hidden="true" />
        <span className="parte-titulo">{NOMBRES_SIGNO[signo]}</span>
        <span className="parte-cuenta">{puntos.length}</span>
        <span className={`chev ${abierto ? 'open' : ''}`} aria-hidden="true" />
      </button>

      {abierto && (
        <ul className="parte-lista">
          {puntos.map((punto) => (
            <li key={punto.id} className="parte-punto">
              <p className="parte-punto-titulo">
                {punto.titulo}
                {punto.cuando !== undefined && (
                  <span className="parte-hora"> · {escribirHora(punto.cuando)}</span>
                )}
              </p>
              <p className="parte-punto-porque">{punto.porque}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
