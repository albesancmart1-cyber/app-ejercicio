import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/theme.css'

function applyDaytime() {
  const h = new Date().getHours()
  const daytime = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 21 ? 'evening' : 'night'
  document.body.dataset.daytime = daytime
}
applyDaytime()
setInterval(applyDaytime, 10 * 60 * 1000)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
