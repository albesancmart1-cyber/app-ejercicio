import { useState } from 'react'
import { useAppData } from './store/store'
import Icon from './components/Icon'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import History from './screens/History'
import Meals from './screens/Meals'
import Settings from './screens/Settings'

type Tab = 'hoy' | 'cuerpo' | 'mesa' | 'ajustes'

const TABS: { id: Tab; label: string; icon: 'horizon' | 'body' | 'plate' | 'leaf' }[] = [
  { id: 'hoy', label: 'Hoy', icon: 'horizon' },
  { id: 'cuerpo', label: 'Cuerpo', icon: 'body' },
  { id: 'mesa', label: 'Mesa', icon: 'plate' },
  { id: 'ajustes', label: 'Ajustes', icon: 'leaf' }
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
        {tab === 'cuerpo' && <History />}
        {tab === 'mesa' && <Meals />}
        {tab === 'ajustes' && <Settings />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tab"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
