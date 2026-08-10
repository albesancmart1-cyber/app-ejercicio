import { useEffect, useState } from 'react'
import { ErrorNube, hayNube, pedirEnlace } from '../store/cloud'
import {
  entrarConAccesoYSincronizar,
  escucharSync,
  esperandoEnlace,
  estadoDeSync,
  salir,
  sincronizar
} from '../store/sync'
import { actions } from '../store/store'
import { Boton, Regla } from './ui'
import { Field, FieldLabel } from '@appica/ui-react/field'
import { Input } from '@appica/ui-react/input'

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
 * La salida es no salir de la app: **pegar aquí el enlace en vez de pulsarlo**.
 * El enlace lleva el testigo dentro, y canjearlo es una petición que la app
 * puede hacer ella misma. No hace falta tocar nada en el servidor, que es lo
 * que lo hace viable: enseñar además un código de seis cifras depende de las
 * plantillas de correo, y esas no se dejan editar sin un servidor de correo
 * propio. Si algún día lo hay, el código también se acepta aquí.
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
  const [acceso, setAcceso] = useState('')
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
          ? `Te he mandado un correo a ${limpio}. Ábrelo y sigue los pasos de aquí abajo.`
          : `Te he mandado un correo a ${limpio}. Pulsa el enlace desde este mismo dispositivo.`
      )
    } catch (e) {
      setAviso(e instanceof ErrorNube ? e.message : 'No he podido mandar el correo.')
    } finally {
      setEnviando(false)
    }
  }

  async function validarAcceso() {
    setValidando(true)
    setAviso(null)
    const r = await entrarConAccesoYSincronizar(
      email.trim(),
      acceso,
      actions.snapshot,
      actions.replaceAll
    )
    setValidando(false)
    if (r.ok) {
      setAcceso('')
      setAviso(r.novedad ?? 'Ya estás dentro. Tus datos se han juntado con los de la nube.')
    } else {
      setAviso(r.error ?? 'No he podido entrar con eso.')
    }
  }

  /** Pegar desde el portapapeles, que en el móvil es lo natural. */
  async function pegar() {
    try {
      const texto = await navigator.clipboard.readText()
      if (texto.trim()) setAcceso(texto.trim())
    } catch {
      setAviso('Tu navegador no me deja leer el portapapeles. Pega el enlace a mano en el campo.')
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
              Estás en la app instalada. Aquí el enlace del correo <strong>no lo pulses</strong>:
              se abriría en el navegador, y para iOS el navegador y esta app son dos sitios
              distintos que no comparten nada. <strong>Cópialo y pégalo aquí abajo.</strong>
            </p>
          )}

          {estado.estado === 'error' && (
            <p className="dim" style={{ marginTop: 10 }}>
              {estado.mensaje}
            </p>
          )}

          <Field className="field" style={{ marginTop: 14 }}>
  <FieldLabel>Tu correo</FieldLabel>
  <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
</Field>
          <Boton tono="primario" disabled={enviando} onClick={enviarCorreo}>
            {enviando ? 'Enviando…' : pedido ? 'Mandarme otro correo' : 'Mandarme el acceso'}
          </Boton>

          {pedido && (
            <div className="fade-in" style={{ marginTop: 6 }}>
              <Regla />
              <p className="eyebrow">
                {instalada ? 'Entrar pegando el enlace' : '¿El enlace no te sirve?'}
              </p>
              {!instalada && (
                <p className="dim" style={{ marginBottom: 10 }}>
                  Si estás intentando entrar en la app instalada en el móvil, el enlace no vale
                  ahí. Cópialo y pégalo <strong>dentro de la app</strong>, en esta misma pantalla.
                </p>
              )}
              <ol className="steps">
                <li>Abre el correo que te acabo de mandar.</li>
                <li>
                  <strong>Mantén pulsado</strong> el enlace y elige «Copiar enlace». No lo pulses:
                  sirve una sola vez y abrirlo lo gasta.
                </li>
                <li>Vuelve aquí y pégalo.</li>
              </ol>
              <Field className="field" style={{ marginTop: 12 }}>
  <FieldLabel>El enlace del correo</FieldLabel>
  <Input
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="https://…/auth/v1/verify?token=…"
                  value={acceso}
                  onChange={(e) => setAcceso(e.target.value)}
                />
</Field>
              <Boton tono="secundario" onClick={pegar}>
                Pegar lo copiado
              </Boton>
              <Boton tono="primario"
                disabled={validando || acceso.trim().length < 6}
                onClick={validarAcceso}
              >
                {validando ? 'Comprobando…' : 'Entrar'}
              </Boton>
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
              para iOS son dos sitios distintos. Allí pide otro correo y, en vez de pulsar el
              enlace, cópialo y pégalo dentro de la app.
            </p>
          )}

          <div style={{ marginTop: 14 }}>
            <Boton tono="primario"
              disabled={estado.estado === 'sincronizando'}
              onClick={sincronizarAhora}
            >
              {estado.estado === 'sincronizando' ? 'Sincronizando…' : 'Sincronizar ahora'}
            </Boton>
            <Boton tono="callado" onClick={salir}>
              Cerrar sesión en este dispositivo
            </Boton>
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
