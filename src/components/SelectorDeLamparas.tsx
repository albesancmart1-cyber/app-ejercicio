/**
 * Elegir con qué lámparas, y a qué distancia cada una.
 *
 * ## Por qué varias
 *
 * Porque es lo que se hace. Quien tiene dos aparatos los enciende los dos: el
 * panel grande contra la espalda y el pequeño apoyado en la rodilla, o los dos
 * apuntando a lo mismo para acabar antes. Obligar a partirlo en dos sesiones
 * seguidas habría sido pedirle al usuario que mienta sobre su rato — y además
 * habría contado el doble de minutos de los que estuvo.
 *
 * ## Por qué la distancia va por lámpara
 *
 * Porque cada una está donde está. La irradiancia cae con el **cuadrado** de la
 * distancia, así que una común no sería una simplificación: sería multiplicar o
 * dividir por cuatro la mitad de la dosis sin avisar. Por eso el campo aparece
 * debajo de cada lámpara encendida y no una sola vez arriba.
 *
 * Vive en `components` y no dentro de una pantalla porque lo usan las tres
 * puertas por las que se puede empezar una sesión —la baldosa de Medir, el rato
 * apuntado a mano y la tarjeta de Luz— y tener tres copias de esto era la forma
 * segura de que acabaran comportándose distinto.
 */
import { Opcion, Regla, CampoNumero } from './ui'
import type { Lampara, LamparaEnSesion } from '../domain/types'

/** Una lámpara elegida mientras se está eligiendo: la distancia puede faltar. */
export interface LamparaPuesta {
  lamparaId: string
  distanciaCm: number | undefined
}

/** Empieza con la primera lámpara puesta a su distancia de referencia. */
export function puestaInicial(lamparas: Lampara[]): LamparaPuesta[] {
  const primera = lamparas[0]
  return primera ? [{ lamparaId: primera.id, distanciaCm: primera.distanciaRefCm }] : []
}

/**
 * Las que están listas para guardarse.
 *
 * Una lámpara encendida sin distancia no se cuela: sin ella la dosis sería un
 * número inventado, que es justo lo que esta pantalla existe para evitar.
 */
export function lamparasListas(puestas: LamparaPuesta[]): LamparaEnSesion[] {
  return puestas
    .filter((p) => p.distanciaCm !== undefined && p.distanciaCm > 0)
    .map((p) => ({ lamparaId: p.lamparaId, distanciaCm: p.distanciaCm! }))
}

export default function SelectorDeLamparas({
  lamparas,
  puestas,
  onCambiar
}: {
  lamparas: Lampara[]
  puestas: LamparaPuesta[]
  onCambiar: (puestas: LamparaPuesta[]) => void
}) {
  const distanciaDe = (id: string) => puestas.find((p) => p.lamparaId === id)?.distanciaCm
  const encendida = (id: string) => puestas.some((p) => p.lamparaId === id)

  /* Se recorre `lamparas` para reconstruir la lista: así el orden en que se
   * guardan es el del armario y no el de los toques, y apagar y volver a
   * encender una no la manda al final. */
  const alternar = (l: Lampara) => {
    const ya = encendida(l.id)
    const siguiente = lamparas
      .filter((x) => (x.id === l.id ? !ya : encendida(x.id)))
      .map((x) => ({
        lamparaId: x.id,
        distanciaCm: x.id === l.id && !ya ? x.distanciaRefCm : distanciaDe(x.id)
      }))
    onCambiar(siguiente)
  }

  const cambiarDistancia = (id: string, cm: number | undefined) => {
    onCambiar(puestas.map((p) => (p.lamparaId === id ? { ...p, distanciaCm: cm } : p)))
  }

  return (
    <>
      <div className="options-col" style={{ marginTop: 10 }}>
        {lamparas.map((l) => (
          <div key={l.id}>
            <Opcion activa={encendida(l.id)} onElegir={() => alternar(l)}>
              {l.nombre}
            </Opcion>
            {encendida(l.id) && (
              <div style={{ marginTop: 8, marginBottom: 4, paddingLeft: 12 }}>
                <label className="field">
                  <span className="bar-label">A qué distancia (cm)</span>
                  <CampoNumero
                    valor={distanciaDe(l.id)}
                    onCambiar={(cm) => cambiarDistancia(l.id, cm)}
                    placeholder={String(l.distanciaRefCm)}
                    aria-label={`Distancia de ${l.nombre} en centímetros`}
                  />
                </label>
                <p className="faint" style={{ marginTop: 6 }}>
                  Sus datos están medidos a {l.distanciaRefCm} cm.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {puestas.length > 1 && (
        <>
          <Regla />
          <p className="faint">
            Con {puestas.length} encendidas los julios se suman, porque es energía y no una
            nota media. Lo que coincida en la misma longitud de onda se junta, y entre las
            dos pueden cubrir picos que ninguna cubre sola.
          </p>
        </>
      )}
      {puestas.length === 0 && (
        <p className="dim" style={{ marginTop: 10 }}>
          Enciende al menos una. Sin lámpara no hay dosis que calcular.
        </p>
      )}
    </>
  )
}
