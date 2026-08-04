import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/theme.css'
import { actions } from './store/store'
import { estadoDeSync, iniciarSync, sincronizar } from './store/sync'

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

// Y al volver la conexión, se reintenta lo que quedó pendiente.
window.addEventListener('online', () => {
  const e = estadoDeSync()
  if (e.estado === 'dentro' && e.pendiente) sincronizar(actions.snapshot, actions.replaceAll)
})

/*
 * El enlace del correo puede caer con la app ya abierta —instalada, el sistema
 * la trae al frente en vez de cargarla de nuevo—, y entonces solo cambia el
 * fragmento de la URL: no hay recarga y la sesión se quedaría sin recoger.
 */
window.addEventListener('hashchange', () => {
  if (!/access_token|error/.test(location.hash)) return
  iniciarSync().then((haySesion) => {
    if (haySesion) sincronizar(actions.snapshot, actions.replaceAll)
  })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
