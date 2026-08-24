/**
 * Qué hace la longitud de onda que estás tecleando.
 *
 * Aparece mientras se crea o se corrige una lámpara, debajo del campo de los
 * nanómetros. Existe porque el momento en que alguien escribe «810» es
 * exactamente el momento en que le sirve saber qué absorbe eso, qué se ha
 * documentado y hasta dónde llega — y no una pantalla de ayuda a la que hay que
 * ir a propósito.
 *
 * Todo lo que enseña sale de `domain/espectro.ts`, con su referencia dentro de
 * cada línea. Aquí no hay ni una frase escrita a ojo.
 */
import { useState } from 'react'
import { ESPECTRO, efectosDe, picoCercano } from '../domain/espectro'
import { escribirNm } from '../domain/luz'
import { Regla } from './ui'

export default function QueHaceEstaOnda({ nm }: { nm: number }) {
  const [abierto, setAbierto] = useState(false)
  const tramo = efectosDe(nm)
  if (!tramo) return null
  const pico = picoCercano(nm)

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setAbierto((x) => !x)}
        aria-expanded={abierto}
        className="enlace-sobrio"
      >
        {abierto ? 'Ocultar' : `Qué hace ${escribirNm(nm)}`}
      </button>

      {abierto && (
        <div className="fade-in" style={{ marginTop: 8 }}>
          <TramoDetallado nm={nm} pico={pico} />
        </div>
      )}
    </div>
  )
}

/** El detalle de un tramo, que se reutiliza en la tabla del espectro entero. */
export function TramoDetallado({
  nm,
  pico,
  conTitulo = true
}: {
  nm?: number
  pico?: number
  /** En la tabla el título ya lo pone la fila que se ha pulsado. */
  conTitulo?: boolean
}) {
  const tramo = nm !== undefined ? efectosDe(nm) : null
  if (!tramo) return null

  return (
    <>
      {conTitulo && (
        <div className="row">
          <span className="item-title">{tramo.nombre}</span>
          <span className="faint">
            {escribirNm(tramo.desde)}–{escribirNm(tramo.hasta)}
          </span>
        </div>
      )}
      {pico !== undefined && pico !== nm && (
        <p className="faint" style={{ marginTop: 4 }}>
          {escribirNm(nm!)} cae junto a {escribirNm(pico)}, que es uno de los picos que la
          literatura señala en este tramo.
        </p>
      )}
      <p className="dim" style={{ marginTop: 8 }}>
        <strong>Lo absorbe:</strong> {tramo.cromoforo}.
      </p>
      <p className="dim" style={{ marginTop: 4 }}>
        <strong>Hasta dónde llega:</strong> {tramo.penetracion}
      </p>
      <ul className="lista-efectos">
        {tramo.efectos.map((e, i) => (
          <li key={i}>{conNegritas(e)}</li>
        ))}
      </ul>
      {tramo.ojo && (
        <p className="faint" style={{ marginTop: 6 }}>
          <strong>Ojo:</strong> {conNegritas(tramo.ojo)}
        </p>
      )}
    </>
  )
}

/**
 * El espectro entero, del UVB al infrarrojo lejano.
 *
 * Va en «Luz», debajo de las lámparas, y se abre solo si se pide: es una
 * referencia para consultar, no algo que deba estorbar cada día.
 */
export function TablaDelEspectro() {
  const [abierta, setAbierta] = useState(false)
  const [cual, setCual] = useState<number | null>(null)

  return (
    <div className="card">
      <p className="eyebrow">Qué hace cada longitud de onda</p>
      {!abierta ? (
        <>
          <p className="dim" style={{ marginTop: 8 }}>
            Del ultravioleta B al infrarrojo lejano, tramo a tramo: qué molécula lo absorbe, hasta
            dónde llega en el tejido y qué se ha documentado. Con su referencia cada línea.
          </p>
          <button onClick={() => setAbierta(true)} className="enlace-sobrio">
            Abrir la tabla
          </button>
        </>
      ) : (
        <div className="fade-in">
          <p className="faint" style={{ marginTop: 8 }}>
            Antes que nada: la respuesta a la luz es <strong>bifásica</strong>. Poca no hace nada,
            la adecuada estimula y pasarse <strong>inhibe</strong> — no es que sobre, es que resta.
            Por eso aquí no hay ni una dosis recomendada.
          </p>
          <Regla />
          {ESPECTRO.map((t) => (
            <div key={t.desde} style={{ marginTop: 6 }}>
              <button
                onClick={() => setCual(cual === t.desde ? null : t.desde)}
                aria-expanded={cual === t.desde}
                className="fila-espectro"
              >
                <span className="dim">{t.nombre}</span>
                <span className="faint">
                  {escribirNm(t.desde)}–{escribirNm(t.hasta)}
                </span>
              </button>
              {cual === t.desde && (
                <div className="fade-in" style={{ marginTop: 6, marginBottom: 10 }}>
                  <TramoDetallado nm={t.desde} conTitulo={false} />
                </div>
              )}
            </div>
          ))}
          <Regla />
          <button onClick={() => setAbierta(false)} className="enlace-sobrio">
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Los `**dobles asteriscos**` se pintan en negrita y los `*sueltos*` en cursiva.
 *
 * Es lo mínimo para que las frases del espectro puedan destacar la palabra que
 * importa y poner en cursiva el nombre de la revista, sin meter HTML en un
 * fichero de dominio, que es donde no debe estar.
 */
function conNegritas(texto: string) {
  return texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((trozo, i) => {
    if (trozo.startsWith('**') && trozo.endsWith('**')) {
      return <strong key={i}>{trozo.slice(2, -2)}</strong>
    }
    if (trozo.startsWith('*') && trozo.endsWith('*') && trozo.length > 2) {
      return <em key={i}>{trozo.slice(1, -1)}</em>
    }
    return <span key={i}>{trozo}</span>
  })
}
