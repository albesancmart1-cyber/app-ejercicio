import { useState } from 'react'
import { useAppData } from './store/store'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import History from './screens/History'
import Settings from './screens/Settings'

type Tab = 'hoy' | 'historial' | 'ajustes'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hoy', label: 'Hoy', icon: '🌅' },
  { id: 'historial', label: 'Tu cuerpo', icon: '🌗' },
  { id: 'ajustes', label: 'Ajustes', icon: '🌾' }
]

export default function App() {
  const data = useAppData()
  const [tab, setTab] = useState<Tab>('hoy')

  if (!data.profile) {
    return (
      <main className="app-main">
        <Onboarding />
      </main>
    )
  }

  return (
    <>
      <main className="app-main">
        {tab === 'hoy' && <Today />}
        {tab === 'historial' && <History />}
        {tab === 'ajustes' && <Settings />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
