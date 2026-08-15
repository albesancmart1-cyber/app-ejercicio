import { useState } from 'react'
import CartaEspanola from '../components/CartaEspanola'
import Icon from '../components/Icon'
import { Boton } from '../components/ui'
import { nombreDe } from '../data/baraja'
import {
  CARTAS_EN_JUEGO,
  FILAS,
  cartaActual,
  filaActual,
  filaDe,
  levantar,
  nuevaPiramide,
  quedanCartas,
  type Piramide as Estado
} from '../domain/piramide'

/**
 * El juego de la pirámide.
 *
 * Quince cartas de la baraja española en cinco filas —cinco, cuatro, tres, dos
 * y la cúspide—, todas boca abajo. Cada turno levanta la siguiente: de
 * izquierda a derecha dentro de la fila, y de la base hacia arriba.
 *
 * La pirámide se dibuja como se ve en la mesa: la cúspide arriba y la fila de
 * cinco abajo, que es al revés del orden en que se levantan. Por eso las filas
 * se recorren del final al principio.
 *
 * La carta recién levantada se enseña además en grande. En la pirámide las
 * cartas caben a 46 px de ancho, que basta para seguir la partida pero no para
 * cantar el palo de un vistazo; la copia grande es la que se mira de verdad.
 */
/*
 * La partida vive fuera del componente a propósito.
 *
 * Las pestañas se montan y desmontan al cambiar de una a otra, así que con el
 * estado dentro, asomarse a Cocina y volver dejaba la pirámide otra vez entera
 * boca abajo. Aquí no hace falta guardarla en disco —una partida no sobrevive
 * a cerrar la app, ni tiene por qué—, pero sí que aguante un vistazo a otra
 * pantalla.
 */
let partida: Estado | null = null

export default function Piramide() {
  const [estado, setEstadoLocal] = useState<Estado>(() => partida ?? nuevaPiramide())
  const setEstado = (p: Estado) => {
    partida = p
    setEstadoLocal(p)
  }
  const carta = cartaActual(estado)
  const quedan = quedanCartas(estado)
  const fila = filaActual(estado)

  /* De arriba abajo en pantalla: la cúspide primero. */
  const filas = Array.from({ length: FILAS.length }, (_, i) => FILAS.length - 1 - i)

  return (
    <div className="fade-in">
      <p className="eyebrow">Baraja española</p>
      <h1>Pirámide</h1>
      <p className="faint piramide-cuenta">
        {estado.levantadas === 0
          ? `${CARTAS_EN_JUEGO} cartas boca abajo. Se levantan de abajo arriba.`
          : `Carta ${estado.levantadas} de ${CARTAS_EN_JUEGO} · fila ${fila + 1} de ${FILAS.length}`}
      </p>

      <div className="piramide">
        {filas.map((f) => (
          <div className="piramide-fila" key={f}>
            {filaDe(estado, f).map(({ carta: c, indice, levantada }) => (
              <CartaEspanola
                key={indice}
                carta={c}
                bocaAbajo={!levantada}
                className={`piramide-carta ${
                  indice === estado.levantadas - 1 ? 'recien' : ''
                }`.trim()}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="piramide-actual">
        {carta ? (
          <>
            <CartaEspanola carta={carta} className="carta-grande" />
            <p className="piramide-nombre">{nombreDe(carta)}</p>
          </>
        ) : (
          <>
            <CartaEspanola bocaAbajo className="carta-grande" />
            <p className="piramide-nombre faint">Sin empezar</p>
          </>
        )}
      </div>

      {quedan ? (
        <Boton onClick={() => setEstado(levantar(estado))}>
          <Icon name="chevron" />
          Levantar carta
        </Boton>
      ) : (
        <>
          <p className="piramide-fin">Pirámide entera. No queda ninguna boca abajo.</p>
          <Boton onClick={() => setEstado(nuevaPiramide())}>Nueva partida</Boton>
        </>
      )}

      {estado.levantadas > 0 && quedan && (
        <Boton tono="callado" onClick={() => setEstado(nuevaPiramide())}>
          Empezar de nuevo
        </Boton>
      )}
    </div>
  )
}
