import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/theme.css'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
