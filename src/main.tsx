import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Una sola hoja de entrada: ella orquesta Tailwind, Appica y el tema de Ritmo
// en el orden de capas correcto, que es lo único que hace que convivan.
import './styles/appica.css'
import { actions } from './store/store'
import { arrancarLatido, estadoDeSync, iniciarSync, sincronizar } from './store/sync'

/**
 * La interfaz sigue la hora del día. De noche pasa a ámbar y baja el brillo:
 * la app no debería ser la que te rompa la higiene lumínica.
 */
export function daytimeOf(hour: number): 'dawn' | 'day' | 'dusk' | 'night' {
  if (hour >= 5 && hour < 9) return 'dawn'
  if (hour >= 9 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'dusk'
  return 'night'
}

function applyDaytime() {
  document.body.dataset.daytime = daytimeOf(new Date().getHours())
}
applyDaytime()
setInterval(applyDaytime, 5 * 60 * 1000)

/**
 * Si hay nube y sesión, se sincroniza al arrancar: bajar, fusionar, guardar y
 * subir. Va sin bloquear el arranque a propósito —la app tiene que abrirse y
 * funcionar sin conexión— y en silencio, salvo que traiga algo, que entonces lo
 * cuenta la tarjeta de Ajustes.
 */
iniciarSync().then((haySesion) => {
  if (haySesion) sincronizar(actions.snapshot, actions.replaceAll)
})

/*
 * Y se sigue mirando cada poco mientras la app esté a la vista.
 *
 * Es lo que hace que lo que dejaste midiendo en el móvil aparezca en el
 * ordenador —y que pararlo desde allí apague la baldosa del móvil— sin tener
 * que darle a «sincronizar» a mano. Se arranca aquí y no dentro de un
 * componente porque no es de ninguna pantalla: es de la app.
 */
arrancarLatido(actions.snapshot, actions.replaceAll)


// Y al volver la conexión, se reintenta lo que quedó pendiente.
window.addEventListener('online', () => {
  const e = estadoDeSync()
  if (e.estado === 'dentro' && e.pendiente) sincronizar(actions.snapshot, actions.replaceAll)
})

/*
 * Aquí había un oyente de `hashchange`, y ya no hace falta.
 *
 * El proveedor de antes devolvía la sesión en el **fragmento** de la URL, y un
 * fragmento se puede cambiar sin recargar: con la app ya abierta —instalada, el
 * sistema la trae al frente en vez de cargarla de nuevo— el enlace del correo
 * cambiaba el fragmento, no había arranque, y la sesión se quedaba sin recoger.
 *
 * Firebase la devuelve en la **consulta** (`?mode=signIn&oobCode=…`), y ahí no
 * hay ese agujero: cambiar la consulta es siempre una navegación, así que el
 * arranque de arriba corre y `iniciarSync` la recoge. Si algún día el enlace
 * volviera por el fragmento, esto tendría que volver.
 */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
