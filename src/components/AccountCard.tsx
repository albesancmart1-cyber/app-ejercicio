import { useEffect, useState } from 'react'
import { ErrorNube, hayNube, pedirEnlace } from '../store/cloud'
import {
  entrarConCodigoYSincronizar,
  escucharSync,
  esperandoEnlace,
  estadoDeSync,
  salir,
  sincronizar
} from '../store/sync'
import { actions } from '../store/store'

/**
 * Entrar con el correo para tener los datos en cualquier dispositivo.
 *
 * Sin contraseña: se pide un correo y se entra desde ahí. En una app de una
 * sola persona, una contraseña más es una contraseña más que perder.
 *
 * **Hay dos formas de entrar y no es por gusto.** El enlace es lo cómodo, pero
 * en la app instalada en iOS no sirve, y no hay manera de que sirva: una app
 * añadida a la pantalla de inicio tiene su propio almacén, separado del de
 * Safari, y el enlace del correo siempre abre Safari porque iOS no sabe abrir
 * un enlace dentro de una app instalada. Resultado: entras en Safari, la sesión
 * se guarda allí, y la app instalada te sigue viendo como un dispositivo nuevo.
 * Por eso el mismo correo trae además un código de seis cifras, que se teclea
 * aquí dentro y sí funciona.
 *
 * Todo esto es opcional. Si esta versión no lleva nube configurada, la tarjeta
 * lo dice y la app sigue funcionando igual, guardando en este dispositivo.
 */

/** ¿Se está viendo la app instalada, y no una pestaña del navegador? */
function esAppInstalada(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // Safari en iOS no implementa `display-mode` y usa esto en su lugar.
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export default function AccountCard() {
  const [estado, setEstado] = useState(estadoDeSync())
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [validando, setValidando] = useState(false)
  const [pedido, setPedido] = useState(false)
  const instalada = esAppInstalada()

  useEffect(() => escucharSync(setEstado), [])

  async function enviarCorreo() {
    const limpio = email.trim()
    if (!limpio.includes('@')) {
      setAviso('Escribe un correo válido para poder mandarte el acceso.')
      return
    }
    setEnviando(true)
    setAviso(null)
    try {
      await pedirEnlace(limpio)
      esperandoEnlace(limpio)
      setPedido(true)
      setAviso(
        instalada
          ? `Te he mandado un correo a ${limpio}. Ábrelo, copia el código de seis cifras y escríbelo aquí abajo.`
          : `Te he mandado un correo a ${limpio}, con un enlace y un código. Cualquiera de los dos vale.`
      )
    } catch (e) {
      setAviso(e instanceof ErrorNube ? e.message : 'No he podido mandar el correo.')
    } finally {
      setEnviando(false)
    }
  }

  async function validarCodigo() {
    setValidando(true)
    setAviso(null)
    const r = await entrarConCodigoYSincronizar(
      email.trim(),
      codigo,
      actions.snapshot,
      actions.replaceAll
    )
    setValidando(false)
    if (r.ok) {
      setCodigo('')
      setAviso(r.novedad ?? 'Ya estás dentro. Tus datos se han juntado con los de la nube.')
    } else {
      setAviso(r.error ?? 'No he podido entrar con ese código.')
    }
  }

  async function sincronizarAhora() {
    setAviso(null)
    const r = await sincronizar(actions.snapshot, actions.replaceAll)
    setAviso(r.ok ? (r.novedad ?? 'Todo al día en los dos sitios.') : (r.error ?? 'No he podido sincronizar.'))
  }

  if (!hayNube() || estado.estado === 'sin_nube') {
    return (
      <div className="card">
        <p className="eyebrow">Tus datos</p>
        <p className="dim">
          Esta versión guarda todo en este dispositivo. No sale nada a ningún servidor, y por eso no
          hay forma de verlo desde otro sitio: para pasarlo a otro dispositivo, usa exportar e
          importar aquí abajo.
        </p>
      </div>
    )
  }

  const fuera =
    estado.estado === 'fuera' || estado.estado === 'entrando' || estado.estado === 'error'

  return (
    <div className="card">
      <p className="eyebrow">
        Tu cuenta
        {estado.estado === 'dentro' && estado.pendiente ? ' · pendiente de subir' : ''}
      </p>

      {fuera ? (
        <>
          <p className="dim">
            Entra con tu correo y tus datos estarán en cualquier dispositivo donde entres. Sin
            contraseña: te mando un correo y listo.
          </p>

          {instalada && (
            <p className="dim" style={{ marginTop: 10 }}>
              Estás en la app instalada. Aquí <strong>usa el código</strong>, no el enlace: el
              enlace del correo se abre en el navegador, y para iOS el navegador y esta app son dos
              sitios distintos que no comparten nada.
            </p>
          )}

          {estado.estado === 'error' && (
            <p className="dim" style={{ marginTop: 10 }}>
              {estado.mensaje}
            </p>
          )}

          <label className="field" style={{ marginTop: 14 }}>
            <span>Tu correo</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={enviando} onClick={enviarCorreo}>
            {enviando ? 'Enviando…' : pedido ? 'Mandarme otro correo' : 'Mandarme el acceso'}
          </button>

          {pedido && (
            <div className="fade-in" style={{ marginTop: 6 }}>
              <hr className="rule" />
              <p className="eyebrow">Entrar con el código</p>
              <label className="field">
                <span>Las seis cifras del correo</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <button
                className="btn btn-secondary"
                disabled={validando || codigo.length < 6}
                onClick={validarCodigo}
              >
                {validando ? 'Comprobando…' : 'Entrar'}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="dim">
            Dentro como <strong>{estado.email || 'tu cuenta'}</strong>. Tus datos se guardan aquí y en
            la nube, y al entrar en otro dispositivo se juntan los dos lados sin perder nada.
          </p>
          {estado.estado === 'dentro' && estado.ultima && (
            <p className="faint" style={{ marginTop: 8 }}>
              Última sincronización: {new Date(estado.ultima).toLocaleString('es-ES')}.
            </p>
          )}
          {estado.estado === 'dentro' && estado.pendiente && (
            <p className="faint" style={{ marginTop: 8 }}>
              Hay cambios sin subir. Se suben solos en cuanto haya conexión.
            </p>
          )}

          {!instalada && (
            <p className="faint" style={{ marginTop: 10 }}>
              Si añades la app a la pantalla de inicio, tendrás que volver a entrar dentro de ella:
              para iOS son dos sitios distintos. Allí usa el código del correo, que el enlace se
              abre siempre aquí.
            </p>
          )}

          <div style={{ marginTop: 14 }}>
            <button
              className="btn btn-primary"
              disabled={estado.estado === 'sincronizando'}
              onClick={sincronizarAhora}
            >
              {estado.estado === 'sincronizando' ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <button className="btn-quiet" onClick={salir}>
              Cerrar sesión en este dispositivo
            </button>
          </div>
          <p className="faint" style={{ marginTop: 10 }}>
            Cerrar sesión no borra nada de aquí: los datos siguen en este dispositivo.
          </p>
        </>
      )}

      {aviso && (
        <p className="dim" style={{ marginTop: 12 }}>
          {aviso}
        </p>
      )}
    </div>
  )
}
