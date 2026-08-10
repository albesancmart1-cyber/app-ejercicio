import { Suspense, lazy, useState } from 'react'
import { useAppData } from './store/store'
import { useToday } from './store/clock'
import Icon from './components/Icon'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import { Navigation, NavigationItem, NavigationList } from '@appica/ui-react/navigation'

/*
 * Progreso, Cocina y Yo llegan aparte.
 *
 * «Hoy» es la pantalla que se abre siempre y la única que hace falta para
 * decidir si hoy se entrena; las otras tres se visitan de vez en cuando y se
 * llevan lo más pesado de la librería —el cajón de la sesión, los medidores, la
 * curva—. Cargándolas a demanda, quien abre la app por la mañana para ver qué
 * le toca no descarga nada de eso.
 *
 * Sin pantalla de carga a propósito: los trozos se sirven desde la caché del
 * service worker y el cambio es inmediato; un destello de «cargando…» sería peor
 * que el parpadeo que evita.
 */
const Progreso = lazy(() => import('./screens/Progreso'))
const Meals = lazy(() => import('./screens/Meals'))
const Settings = lazy(() => import('./screens/Settings'))

type Tab = 'hoy' | 'progreso' | 'cocina' | 'yo'

/*
 * Cuatro destinos con nombre, no cuatro cajones.
 *
 * «Cuerpo» pasa a «Progreso» porque dentro conviven rendimiento y composición,
 * y el nombre solo prometía la mitad. «Ajustes» pasa a «Yo» porque ahí no solo
 * hay ajustes: hay perfil, material, rutinas y cuenta, y con el nombre viejo
 * mucha gente no entraba a configurar lo que más cambia sus entrenos.
 */
const TABS: { id: Tab; label: string; icon: 'horizon' | 'body' | 'plate' | 'leaf' }[] = [
  { id: 'hoy', label: 'Hoy', icon: 'horizon' },
  { id: 'progreso', label: 'Progreso', icon: 'body' },
  { id: 'cocina', label: 'Cocina', icon: 'plate' },
  { id: 'yo', label: 'Yo', icon: 'leaf' }
]

/**
 * ¿Esto es la cata o la app de verdad?
 *
 * Las dos se publican en el mismo dominio —la app en `/app-ejercicio/` y la
 * cata en `/app-ejercicio/cata/`— y el puente de tokens hace que se parezcan
 * mucho a propósito: la gracia era que Appica UI vistiera la ropa de Ritmo. El
 * problema es que entonces no hay forma de saber cuál estás mirando, y con un
 * service worker de por medio que puede servirte una creyendo que pides la
 * otra, «lo veo igual» es un diagnóstico imposible.
 *
 * Se mira la base con la que se construyó, así que no hace falta configurar
 * nada: la cata es la única que se sirve bajo `/cata/`.
 */
const ES_CATA = import.meta.env.BASE_URL.includes('/cata/')

export default function App() {
  const data = useAppData()
  const today = useToday()
  const [tab, setTab] = useState<Tab>('hoy')
  const indice = TABS.findIndex((t) => t.id === tab)

  if (!data.profile) {
    return (
      <>
        {ES_CATA && <div className="cinta-cata">Cata · Appica UI</div>}
        <main className="app-main">
          <Onboarding />
        </main>
      </>
    )
  }

  return (
    <>
      {ES_CATA && (
        <div className="cinta-cata">
          Cata · Appica UI · <b>Cocina</b> es la única pantalla convertida
        </div>
      )}
      <main className="app-main">
        {/* La clave por fecha rearranca las pantallas al cruzar la medianoche:
            el check-in del día nuevo empieza en blanco en vez de heredar las
            respuestas de ayer, que viven en el estado local del componente. */}
        <Suspense fallback={null}>
          {tab === 'hoy' && <Today key={today} />}
          {tab === 'progreso' && <Progreso key={today} />}
          {tab === 'cocina' && <Meals key={today} />}
          {tab === 'yo' && <Settings />}
        </Suspense>
      </main>
      {/*
        La barra, sobre la estructura de `Navigation` de Appica —nav, lista y
        elementos— pero conservando la cápsula de cristal líquido de Ritmo.
        Y esto último es una decisión, no un olvido: `Navigation` resultó ser
        **solo maquetación**, un `<ul>` con `display:flex` y un hueco entre
        elementos; no trae ni forma ni estado activo, así que cambiar el cristal
        por él no habría sido rediseñar, habría sido borrar. Lo que sí gana la
        app es el marcado correcto —una lista de navegación de verdad en vez de
        cuatro botones sueltos dentro de un div—, que es lo que leen los
        lectores de pantalla.

        El indicador va aparte y por debajo de los botones: así se desliza de una
        pestaña a otra en vez de aparecer y desaparecer, que es lo que hace que
        el cristal se lea como una pieza física.
      */}
      <Navigation
        className="tabbar"
        activeLink={indice}
        aria-label="Secciones de la app"
        style={{ '--tab-count': TABS.length, '--tab-index': indice } as React.CSSProperties}
      >
        <span className="tab-indicator" aria-hidden="true" />
        <NavigationList className="tabbar-lista">
          {TABS.map((t) => (
            <NavigationItem key={t.id}>
              <button
                className="tab"
                aria-current={tab === t.id ? 'page' : undefined}
                aria-label={t.label}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} />
                <span>{t.label}</span>
              </button>
            </NavigationItem>
          ))}
        </NavigationList>
      </Navigation>
    </>
  )
}
