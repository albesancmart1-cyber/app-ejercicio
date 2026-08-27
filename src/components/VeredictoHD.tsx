/**
 * Si hoy toca entrenar, dicho antes que nada.
 *
 * En una app de volumen esta tarjeta no tendría sentido: siempre toca algo,
 * como mucho más suave. Bajo Heavy Duty es **la pantalla principal**, porque la
 * mitad de las veces la respuesta correcta es que no, y darla con la misma
 * claridad que un plan de entreno es lo único que hace que se respete.
 *
 * De ahí que cuando no toca no haya un plan B debajo. Ofrecer una sesión más
 * corta el día que tocaba descansar es exactamente lo que rompe el ciclo, y una
 * app que lo ofreciera estaría diciendo con los botones lo contrario de lo que
 * dice con el texto.
 *
 * Sí hay una salida, y va en el tono que le corresponde: un enlace discreto,
 * no un botón. Nadie conoce tu cuerpo mejor que tú y la app no tiene por qué
 * cerrarte la puerta — pero tampoco va a empujarte hacia ella.
 */
import { COMO_ES_UNA_SERIE, LO_QUE_NO, descansoQueQueda, type Veredicto } from '../domain/heavyDuty'
import { Boton, Regla } from './ui'
import Icon from './Icon'
import { useState } from 'react'

export default function VeredictoHD({
  veredicto,
  onEmpezar,
  onIgualmente
}: {
  veredicto: Veredicto
  onEmpezar: () => void
  onIgualmente: () => void
}) {
  const [comoVa, setComoVa] = useState(false)
  const v = veredicto

  return (
    <div className="card" style={{ marginTop: 28 }}>
      <Icon name={v.entrenar ? 'sun' : 'moon'} className="sun-mark" />
      <h2>{descansoQueQueda(v)}</h2>
      <p className="dim" style={{ marginTop: 8 }}>
        {v.porque}
      </p>
      {v.nota && (
        <p className="faint" style={{ marginTop: 10 }}>
          {v.nota}
        </p>
      )}

      <div className="row" style={{ marginTop: 14 }}>
        <span className="faint">Descansados</span>
        <span>
          {v.diasDescansados} {v.diasDescansados === 1 ? 'día' : 'días'}
          <span className="faint"> · pides {v.nivel.dias}</span>
        </span>
      </div>
      <div className="row" style={{ padding: '7px 0' }}>
        <span className="faint">Tu punto</span>
        <span>
          {v.nivel.nombre}
          <span className="faint"> · {v.nivel.sesiones} sesiones</span>
        </span>
      </div>

      {v.entrenar ? (
        <Boton tono="primario" onClick={onEmpezar}>
          Empezar
        </Boton>
      ) : (
        <>
          <p className="faint" style={{ marginTop: 14 }}>
            El músculo no crece en el gimnasio: crece ahora, y solo si le dejas. Esto es la mitad
            del entrenamiento, no la pausa entre dos.
          </p>
          <button type="button" className="enlace-callado" onClick={onIgualmente}>
            Entrenar igualmente
          </button>
        </>
      )}

      <Regla />
      {!comoVa ? (
        <Boton tono="callado" onClick={() => setComoVa(true)}>
          Cómo es una serie
        </Boton>
      ) : (
        <div className="fade-in">
          <p className="eyebrow">Cómo es una serie</p>
          {COMO_ES_UNA_SERIE.map((linea) => (
            <p className="faint" key={linea} style={{ marginTop: 6 }}>
              · {linea}
            </p>
          ))}
          <p className="eyebrow" style={{ marginTop: 14 }}>
            Y lo que no
          </p>
          {LO_QUE_NO.map((linea) => (
            <p className="faint" key={linea} style={{ marginTop: 6 }}>
              · {linea}
            </p>
          ))}
          <Boton tono="callado" onClick={() => setComoVa(false)}>
            Cerrar
          </Boton>
        </div>
      )}
    </div>
  )
}
