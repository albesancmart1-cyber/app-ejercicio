import { useState } from 'react'
import {
  BASE_LABELS,
  DHA_BOOSTERS,
  DHA_LABELS,
  EFFORT_LABELS,
  MEALS,
  bestDhaTier,
  dhaLevel,
  filterMeals,
  suggestMeal,
  type Meal,
  type MealBase,
  type MealEffort
} from '../data/meals'
import { proteinTarget } from '../domain/protocol'
import { complementarConPastillas, esVerano, objetivoDhaDiario } from '../domain/dha'
import { useAppData } from '../store/store'
import { useToday } from '../store/clock'
import Icon from '../components/Icon'

const BASES = Object.keys(BASE_LABELS) as MealBase[]
const EFFORTS = Object.keys(EFFORT_LABELS) as MealEffort[]

function MealCard({ meal, pillMg, today }: { meal: Meal; pillMg: number; today: string }) {
  const nivel = dhaLevel(meal)
  // Un plato que no puede ser alto en DHA por naturaleza al menos dice cómo serlo.
  const booster = nivel === 'alto' ? null : DHA_BOOSTERS[meal.name.length % DHA_BOOSTERS.length]
  const complemento = pillMg > 0 ? complementarConPastillas(meal.dhaMg, pillMg, today) : null

  return (
    <>
      <h2>{meal.name}</h2>
      <div className="tag-row">
        <span className={`tag ${nivel === 'alto' ? 'accent' : ''}`}>
          {DHA_LABELS[nivel]} · {meal.dhaMg} mg
        </span>
        <span className="tag">≈ {meal.proteinG} g de proteína</span>
        <span className="tag">{EFFORT_LABELS[meal.effort]}</span>
      </div>
      <hr className="rule" />
      <ul className="reasons">
        {meal.ingredients.map((ing, i) => (
          <li key={i}>{ing}</li>
        ))}
      </ul>
      <p className="dim" style={{ marginTop: 14 }}>
        {meal.steps}
      </p>
      {booster && (
        <p className="faint" style={{ marginTop: 12 }}>
          Para subirle el DHA: {booster.charAt(0).toLowerCase() + booster.slice(1)}
        </p>
      )}
      {complemento && complemento.nota && (
        <p className="dim" style={{ marginTop: 12 }}>
          {complemento.cubierto ? '✓ ' : ''}
          {complemento.nota}
        </p>
      )}
      {meal.limit && (
        <>
          <hr className="rule" />
          <p className="eyebrow">Máximo {meal.limit.maxPerWeek} por semana</p>
          <p className="faint">{meal.limit.reason}</p>
        </>
      )}
    </>
  )
}

export default function Meals() {
  const data = useAppData()
  const profile = data.profile!
  const [base, setBase] = useState<MealBase | null>(null)
  const [effort, setEffort] = useState<MealEffort | null>(null)
  const [current, setCurrent] = useState<Meal | null>(null)
  const [browsing, setBrowsing] = useState(false)

  const today = useToday()
  const pillMg = profile.dhaPillMg ?? 0
  const objetivoDha = objetivoDhaDiario(today)
  const protein = profile.weightKg ? proteinTarget(profile.weightKg, profile.goal) : null
  const available = filterMeals(base, effort)
  // Qué DHA es capaz de dar el filtro elegido, para avisar antes de sugerir.
  const mejorNivel = available.length > 0 ? dhaLevel(bestDhaTier(available)[0]) : null

  function roll() {
    setCurrent(suggestMeal(base, effort, current?.id) ?? null)
  }

  return (
    <div className="fade-in cards-grid">
      <p className="eyebrow">Cuando no sabes qué comer</p>
      <h1>Mesa</h1>
      <p className="lede">
        Platos completos, de base animal y sin frutos secos, priorizando siempre el DHA. Come hasta
        saciarte de verdad: la proteína por delante y el resto se regula solo.
      </p>

      <div className="card" style={{ marginTop: 28 }}>
        <div className="row" style={{ alignItems: 'flex-end', marginBottom: 4 }}>
          <span className="score">
            {objetivoDha.toLocaleString('es-ES')}
            <small> mg</small>
          </span>
          <span className="tag accent">{esVerano(today) ? 'objetivo de verano' : 'objetivo del día'}</span>
        </div>
        <p className="faint" style={{ marginTop: 10 }}>
          {esVerano(today)
            ? 'En los meses de más sol subimos el DHA: es el material con el que se construyen las membranas.'
            : 'DHA a diario, que es el ácido graso estructural de tus membranas celulares.'}
          {pillMg > 0
            ? ` Tus pastillas son de ${pillMg.toLocaleString('es-ES')} mg y nunca te sugeriré pasar de 1.000 mg de suplemento al día.`
            : ' Si tomas pastillas de DHA, dímelo en Ajustes y te calculo el complemento.'}
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">¿Qué te apetece?</p>
        <div className="options">
          <button className="opt" aria-pressed={base === null} onClick={() => setBase(null)}>
            Lo que sea
          </button>
          {BASES.map((b) => (
            <button key={b} className="opt" aria-pressed={base === b} onClick={() => setBase(b)}>
              {BASE_LABELS[b]}
            </button>
          ))}
        </div>

        <hr className="rule" />
        <p className="eyebrow">¿Cuánto tiempo tienes?</p>
        <div className="options">
          <button className="opt" aria-pressed={effort === null} onClick={() => setEffort(null)}>
            Da igual
          </button>
          {EFFORTS.map((e) => (
            <button key={e} className="opt" aria-pressed={effort === e} onClick={() => setEffort(e)}>
              {EFFORT_LABELS[e]}
            </button>
          ))}
        </div>

        {available.length === 0 && (
          <p className="faint" style={{ marginTop: 16 }}>
            Con esa combinación no tengo nada. Prueba a soltar uno de los dos filtros.
          </p>
        )}
        {mejorNivel && mejorNivel !== 'alto' && (
          <p className="faint" style={{ marginTop: 16 }}>
            Ojo: por aquí no hay nada con DHA alto — solo el pescado azul y el marisco lo tienen de
            verdad. Te doy lo mejor que hay y cómo enriquecerlo.
          </p>
        )}
      </div>

      <button className="btn btn-primary" disabled={available.length === 0} onClick={roll}>
        {current ? 'Dame otra idea' : 'Dame una idea'}
      </button>

      {current && (
        <div className="card fade-in" style={{ marginTop: 16 }} key={current.id}>
          <MealCard meal={current} pillMg={pillMg} today={today} />
        </div>
      )}

      {protein && (
        <p className="faint" style={{ margin: '18px 4px' }}>
          Referencia del día: {protein.min}–{protein.max} g de proteína. No hace falta que la
          apuntes; con dos o tres platos como estos sale sola.
        </p>
      )}

      <button className="btn-quiet" onClick={() => setBrowsing(!browsing)}>
        {browsing ? 'Ocultar el recetario' : `Ver los ${MEALS.length} platos`}
      </button>

      {browsing && (
        <div className="fade-in" style={{ marginTop: 16 }}>
          {BASES.map((b) => {
            const meals = MEALS.filter((m) => m.base === b)
            return (
              <div className="card" key={b}>
                <p className="eyebrow">{BASE_LABELS[b]}</p>
                {meals.map((m) => (
                  <button
                    className="item"
                    key={m.id}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      setCurrent(m)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    <div className="item-body">
                      <div className="item-title">{m.name}</div>
                      <div className="item-meta">
                        {DHA_LABELS[dhaLevel(m)]} · {EFFORT_LABELS[m.effort]} · ≈ {m.proteinG} g de proteína
                      </div>
                    </div>
                    <Icon name="chevron" className="check" />
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
