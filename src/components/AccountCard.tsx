import { useEffect, useState } from 'react'
import { ErrorNube, hayNube, pedirEnlace } from '../store/cloud'
import { escucharSync, esperandoEnlace, estadoDeSync, salir, sincronizar } from '../store/sync'
import { actions } from '../store/store'

/**
 * Entrar con el correo para tener los datos en cualquier dispositivo.
 *
 * Sin contraseña: se pide un enlace al correo y se entra desde ahí. En una app
 * de una sola persona, una contraseña más es una contraseña más que perder.
 *
 * Todo lo de aquí es opcional. Si esta versión no lleva nube configurada, la
 * tarjeta lo dice y la app sigue funcionando exactamente igual, guardando en
 * este dispositivo, que es como ha funcionado siempre.
 */
export default function AccountCard() {
  const [estado, setEstado] = useState(estadoDeSync())
  const [email, setEmail] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => escucharSync(setEstado), [])

  async function enviarEnlace() {
    const limpio = email.trim()
    if (!limpio.includes('@')) {
      setAviso('Escribe un correo válido para poder mandarte el enlace.')
      return
    }
    setEnviando(true)
    setAviso(null)
    try {
      await pedirEnlace(limpio)
      esperandoEnlace(limpio)
      setAviso(`Te he mandado un enlace a ${limpio}. Ábrelo en este dispositivo y ya estarás dentro.`)
    } catch (e) {
      setAviso(e instanceof ErrorNube ? e.message : 'No he podido mandar el enlace.')
    } finally {
      setEnviando(false)
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

  return (
    <div className="card">
      <p className="eyebrow">
        Tu cuenta
        {estado.estado === 'dentro' && estado.pendiente ? ' · pendiente de subir' : ''}
      </p>

      {estado.estado === 'fuera' || estado.estado === 'entrando' || estado.estado === 'error' ? (
        <>
          <p className="dim">
            Entra con tu correo y tus datos estarán en cualquier dispositivo donde entres. Sin
            contraseña: te mando un enlace y listo.
          </p>
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
          <button className="btn btn-primary" disabled={enviando} onClick={enviarEnlace}>
            {enviando ? 'Enviando…' : 'Mandarme el enlace'}
          </button>
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
