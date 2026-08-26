/**
 * El histórico de sesiones de lámpara.
 *
 * Hasta ahora las sesiones se guardaban y se sumaban al día, pero no había
 * dónde verlas una por una. Y una sesión suelta dice cosas que el total del día
 * no dice: con qué lámpara fue, a qué distancia, qué zona, cuántos julios
 * cayeron de verdad. Sin eso no se puede aprender nada de lo que uno hace —que
 * es de lo que va llevar un registro.
 *
 * ## Se enseña la dosis, no los minutos
 *
 * Un rato de lámpara no vale por lo que dura sino por lo que entrega, y eso
 * depende de la distancia al cuadrado: veinte minutos a treinta centímetros son
 * menos de la mitad de veinte minutos a quince. Poner solo los minutos dejaría
 * comparables dos sesiones que no lo son.
 *
 * ## Y la vitamina D, cuando la lámpara la da
 *
 * Si alguna de las lámparas llega al ultravioleta B, esa sesión ha fabricado
 * vitamina D, y se dice con su cifra. No es un extra: es la única forma de que
 * la cuenta del día cuadre cuando parte del ultravioleta vino de una lámpara y
 * no del sol.
 */
import { useState } from 'react'
import type { Lampara, Profile, SesionPBM } from '../domain/types'
import { ZONAS, dosisDeSesion, escribirJulios } from '../domain/fotobiomodulacion'
import { deElPerfil, escribirUI, pielDeLaZona, uiDeSesionPBM } from '../domain/vitaminaD'
import { escribirDuracion, escribirHora } from '../domain/arcoSolar'
import { Boton, Regla } from './ui'

/** Cuántas se enseñan de entrada. Las demás, pulsando. */
const DE_ENTRADA = 8

interface Props {
  sesiones?: SesionPBM[]
  lamparas?: Lampara[]
  perfil: Profile | null
}

/** Una fecha como se lee: «hoy», «ayer», o el día con su mes. */
function escribirFecha(iso: string, hoy: string): string {
  if (iso === hoy) return 'Hoy'
  const ayer = new Date(`${hoy}T12:00:00`)
  ayer.setDate(ayer.getDate() - 1)
  if (iso === ayer.toISOString().slice(0, 10)) return 'Ayer'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  })
}

export default function HistorialPBM({ sesiones, lamparas, perfil }: Props) {
  const [todas, setTodas] = useState(false)
  const catalogo = lamparas ?? []
  const quien = deElPerfil(perfil)
  const hoy = new Date().toISOString().slice(0, 10)

  // De la más reciente a la más antigua, y dentro del día por la hora: es el
  // orden en que a uno le interesa mirar lo que ha hecho.
  const ordenadas = [...(sesiones ?? [])].sort((a, b) =>
    a.date === b.date ? (b.hora ?? 0) - (a.hora ?? 0) : a.date < b.date ? 1 : -1
  )
  if (ordenadas.length === 0) return null

  const visibles = todas ? ordenadas : ordenadas.slice(0, DE_ENTRADA)

  return (
    <div className="card">
      <p className="eyebrow">Tus sesiones de lámpara</p>
      <p className="faint" style={{ marginBottom: 6 }}>
        En julios y no en minutos, porque un rato de lámpara vale por lo que entrega y no por lo
        que dura: la distancia manda al cuadrado.
      </p>

      {visibles.map((s) => {
        const dosis = dosisDeSesion(s, catalogo)
        const ui = uiDeSesionPBM(s, catalogo, pielDeLaZona(s.zona), quien)
        /*
         * La lámpara y su distancia van juntas y no en dos líneas: la distancia
         * es lo que explica la cifra —manda al cuadrado—, así que separarla del
         * nombre obligaba a emparejarlas con la vista. Con una lámpara sola
         * salía además el nombre dos veces.
         */
        const conQue = dosis.porLampara.map((l) => `${l.nombre}, a ${l.distanciaCm} cm`)

        return (
          <div key={s.id} style={{ padding: '10px 0' }}>
            <Regla />
            <div className="row">
              <span>
                {escribirFecha(s.date, hoy)}
                {s.hora !== undefined && <span className="faint"> · {escribirHora(s.hora)}</span>}
              </span>
              <span>{escribirJulios(dosis.julios)}</span>
            </div>
            <p className="faint" style={{ marginTop: 3 }}>
              {ZONAS[s.zona]} · {escribirDuracion(s.minutos)}
            </p>
            {conQue.length > 0 && (
              <p className="faint" style={{ marginTop: 2 }}>
                {conQue.join(' · ')}
              </p>
            )}

            {dosis.juliosMitocondria > 0 && dosis.juliosMitocondria !== dosis.julios && (
              <p className="faint" style={{ marginTop: 2 }}>
                {escribirJulios(dosis.juliosMitocondria)} de rojo e infrarrojo, que es lo que va a
                la mitocondria.
              </p>
            )}

            {ui > 0 && (
              <p className="dim" style={{ marginTop: 4 }}>
                Y <strong>{escribirUI(ui)}</strong> de vitamina D: alguna de estas lámparas llega al
                ultravioleta B.
              </p>
            )}

            {dosis.lamparasPerdidas > 0 && (
              <p className="faint" style={{ marginTop: 2 }}>
                {dosis.lamparasPerdidas === 1
                  ? 'Una lámpara de esta sesión ya no está en tu armario, así que no se ha podido contar.'
                  : `${dosis.lamparasPerdidas} lámparas de esta sesión ya no están en tu armario, así que no se han podido contar.`}
              </p>
            )}
          </div>
        )
      })}

      {ordenadas.length > DE_ENTRADA && (
        <Boton tono="callado" onClick={() => setTodas(!todas)}>
          {todas ? 'Ver solo las últimas' : `Ver las ${ordenadas.length} sesiones`}
        </Boton>
      )}
    </div>
  )
}
