import { useEffect, useState } from 'react'
import {
  ErrorNube,
  LARGO_MINIMO_DE_CONTRASENA,
  codigoDeResetEnLaUrl,
  hayNube,
  pedirNuevaContrasena,
  ultimoCorreo
} from '../store/cloud'
import {
  cambiarContrasenaYSincronizar,
  entrarYSincronizar,
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
 * Entrar con el correo y la contraseña para tener los datos —y lo que esté
 * corriendo— en cualquier dispositivo.
 *
 * ## Por qué contraseña y no enlace al correo
 *
 * Aquí había un acceso por enlace mágico, y se ha ido por una razón concreta:
 * **en iOS, una app añadida a la pantalla de inicio tiene su propio almacén**,
 * separado del de Safari, y el enlace del correo siempre abre Safari. Pulsarlo
 * entraba en Safari y dejaba la app instalada viéndote como un dispositivo
 * nuevo. La salida era copiar el enlace y pegarlo aquí dentro: funciona, pero
 * son tres pasos y uno de ellos —«no lo pulses»— va contra el instinto.
 *
 * Una contraseña se teclea dentro de la app, igual en los tres sitios, y no hay
 * nada que copiar ni ventana que caduque. Para el caso que de verdad importa
 * —te dejaste el sol corriendo en el móvil y abres el ordenador para pararlo—
 * es la diferencia entre diez segundos y una excursión por el correo.
 *
 * ## Un solo botón para entrar y para registrarse
 *
 * En una app de una sola persona, «crear cuenta» y «entrar» son la misma
 * intención escrita dos veces, y obligar a elegir el botón correcto solo sirve
 * para equivocarse de botón. Se prueba a entrar y, si el correo no tenía
 * cuenta, se crea. El porqué del orden —y no al revés— está en `entrarOCrear`.
 *
 * Todo esto es opcional. Si esta versión no lleva nube configurada, la tarjeta
 * lo dice y la app sigue funcionando igual, guardando en este dispositivo.
 */

export default function AccountCard() {
  const [estado, setEstado] = useState(estadoDeSync())
  const [email, setEmail] = useState(ultimoCorreo())
  const [password, setPassword] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [pidiendo, setPidiendo] = useState(false)
  /*
   * Si venimos del enlace de contraseña nueva, el testigo se lee **una vez** al
   * montar: sirve una sola vez y lo primero que hace es limpiar la barra de
   * direcciones, así que leerlo en cada render lo perdería.
   */
  const [reset] = useState(() => (hayNube() ? codigoDeResetEnLaUrl() : null))

  useEffect(() => escucharSync(setEstado), [])

  const corto = password.length < LARGO_MINIMO_DE_CONTRASENA

  async function entrarAhora() {
    setEntrando(true)
    setAviso(null)
    const r = reset
      ? await cambiarContrasenaYSincronizar(reset, password, actions.snapshot, actions.replaceAll)
      : await entrarYSincronizar(email.trim(), password, actions.snapshot, actions.replaceAll)
    setEntrando(false)
    // La contraseña no se queda en memoria más de lo necesario, salga bien o mal.
    setPassword('')
    if (r.ok) {
      setAviso(r.novedad ?? 'Ya estás dentro. Tus datos se han juntado con los de la nube.')
    } else {
      setAviso(r.error ?? 'No he podido entrar con eso.')
    }
  }

  async function olvidada() {
    const limpio = email.trim()
    if (!limpio.includes('@')) {
      setAviso('Escribe tu correo aquí arriba y te mando el enlace para ponerte otra.')
      return
    }
    setPidiendo(true)
    setAviso(null)
    try {
      await pedirNuevaContrasena(limpio)
      esperandoEnlace(limpio)
      setAviso(
        `Te he mandado un correo a ${limpio}. Abre el enlace desde este dispositivo y podrás poner una contraseña nueva aquí mismo.`
      )
    } catch (e) {
      setAviso(e instanceof ErrorNube ? e.message : 'No he podido mandar el correo.')
    } finally {
      setPidiendo(false)
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
          {reset ? (
            <p className="dim">
              Vienes del enlace del correo. Escribe aquí la contraseña nueva y entro contigo
              directamente, sin pedírtela dos veces.
            </p>
          ) : (
            <p className="dim">
              Entra con tu correo y tendrás tus datos en cualquier dispositivo donde entres, y lo
              que dejes midiendo en uno lo verás —y lo podrás parar— desde el otro. Si es la
              primera vez, con esto mismo te creo la cuenta.
            </p>
          )}

          {estado.estado === 'error' && (
            <p className="dim" style={{ marginTop: 10 }}>
              {estado.mensaje}
            </p>
          )}

          {!reset && (
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
          )}

          <Field className="field" style={{ marginTop: reset ? 14 : 10 }}>
            <FieldLabel>{reset ? 'Tu contraseña nueva' : 'Tu contraseña'}</FieldLabel>
            <Input
              type="password"
              /*
               * `current-password` cuando entras y `new-password` cuando la
               * cambias: es lo que hace que el gestor de contraseñas del móvil
               * ofrezca la guardada en un caso y proponga una nueva en el otro.
               */
              autoComplete={reset ? 'new-password' : 'current-password'}
              placeholder={`Mínimo ${LARGO_MINIMO_DE_CONTRASENA} caracteres`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !corto && !entrando) entrarAhora()
              }}
            />
          </Field>

          <Boton tono="primario" disabled={entrando || corto} onClick={entrarAhora}>
            {entrando ? 'Entrando…' : reset ? 'Poner esta contraseña y entrar' : 'Entrar'}
          </Boton>

          {!reset && (
            <>
              <Regla />
              <Boton tono="callado" disabled={pidiendo} onClick={olvidada}>
                {pidiendo ? 'Enviando…' : 'No me acuerdo de la contraseña'}
              </Boton>
              <p className="faint" style={{ marginTop: 8 }}>
                Te mando un enlace al correo para ponerte otra. Es el único sitio donde hace falta
                un enlace: es lo que demuestra que ese correo es tuyo.
              </p>
            </>
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

          <p className="faint" style={{ marginTop: 10 }}>
            Si añades la app a la pantalla de inicio, tendrás que entrar otra vez dentro de ella:
            para iOS el navegador y la app instalada son dos sitios distintos con almacenes
            separados. Con el mismo correo y la misma contraseña, y ya está.
          </p>

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
