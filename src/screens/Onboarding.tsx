import { useState } from 'react'
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  WEIGHTED_EQUIPMENT,
  type Equipment,
  type Goal,
  type Profile
} from '../domain/types'
import { actions } from '../store/store'
import Icon from '../components/Icon'
import Mark from '../components/Mark'
import { Boton, Opcion, Regla } from '../components/ui'

const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]

const GOAL_HINTS: Record<Goal, string> = {
  masa: 'Cargas algo más altas, 6–10 repeticiones, más descanso entre series.',
  tonificar: 'Repeticiones medias y sesiones más ligeras, sin buscar el fallo.',
  recomposicion: 'Rango intermedio de 8–12, equilibrando fuerza y gasto.'
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>(['peso_corporal'])
  const [maxWeights, setMaxWeights] = useState<Partial<Record<Equipment, number>>>({})
  const [ketoSince, setKetoSince] = useState('')
  const [dhaPillMg, setDhaPillMg] = useState('')

  const ownedWeighted = WEIGHTED_EQUIPMENT.filter((eq) => equipment.includes(eq))
  const total = 5

  function finish() {
    if (!goal) return
    const profile: Profile = {
      name: name.trim() || 'Tú',
      age: age ? Number(age) : undefined,
      weightKg: weight ? Number(weight) : undefined,
      heightCm: height ? Number(height) : undefined,
      goal,
      equipment,
      maxWeights,
      ketoSince: ketoSince || undefined,
      dhaPillMg: dhaPillMg ? Number(dhaPillMg) : undefined
    }
    actions.saveProfile(profile)
  }

  return (
    <div className="fade-in">
      <div className="meter" style={{ marginBottom: 28 }} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <>
          <Mark className="app-mark" />
          <h1>Ritmo</h1>
          <p className="lede">
            El ejercicio como acompañante de tus hábitos, no como una obligación más. La app mira
            cómo estás, qué has trabajado y cuánto llevas parado, y decide por ti.
          </p>
          <div className="card" style={{ marginTop: 28 }}>
            <label className="field">
              <span>¿Cómo te llamas?</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
            </label>
            <div className="field-row" style={{ marginTop: 16 }}>
              <label className="field">
                <span>Edad</span>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Opcional" />
              </label>
              <label className="field">
                <span>Peso (kg)</span>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Opcional" />
              </label>
              <label className="field">
                <span>Altura (cm)</span>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Opcional" />
              </label>
            </div>
          </div>
          <Boton tono="primario" onClick={() => setStep(1)}>
            Continuar
          </Boton>
        </>
      )}

      {step === 1 && (
        <>
          <p className="eyebrow">Paso 2</p>
          <h1>¿Qué buscas?</h1>
          <p className="lede">Ajusta series, repeticiones y cargas para llegar ahí con el mínimo estrés.</p>
          <div className="options options-col" style={{ marginTop: 24 }}>
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <button key={g} className="opt opt-block" aria-pressed={goal === g} onClick={() => setGoal(g)}>
                {GOAL_LABELS[g]}
                <span className="opt-desc">{GOAL_HINTS[g]}</span>
              </button>
            ))}
          </div>
          <div style={{ height: 20 }} />
          <Boton tono="primario" disabled={!goal} onClick={() => setStep(2)}>
            Continuar
          </Boton>
          <Boton tono="callado" onClick={() => setStep(0)}>
            Atrás
          </Boton>
        </>
      )}

      {step === 2 && (
        <>
          <p className="eyebrow">Paso 3</p>
          <h1>¿Qué tienes?</h1>
          <p className="lede">Solo se te propondrán ejercicios que puedas hacer de verdad.</p>
          <div className="options" style={{ marginTop: 24 }}>
            {ALL_EQUIPMENT.map((eq) => (
              <Opcion
                key={eq}
                activa={equipment.includes(eq)}
                onElegir={() =>
                  setEquipment((prev) => (prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]))
                }
              >
                {EQUIPMENT_LABELS[eq]}
              </Opcion>
            ))}
          </div>
          <div style={{ height: 20 }} />
          <Boton tono="primario" onClick={() => setStep(ownedWeighted.length ? 3 : 4)}>
            Continuar
          </Boton>
          <Boton tono="callado" onClick={() => setStep(1)}>
            Atrás
          </Boton>
        </>
      )}

      {step === 3 && (
        <>
          <p className="eyebrow">Paso 4</p>
          <h1>¿Cuánto peso?</h1>
          <p className="lede">El máximo del que dispones en cada equipo, para que las cargas sean realistas.</p>
          <div className="card" style={{ marginTop: 24 }}>
            {ownedWeighted.map((eq, i) => (
              <label className="field" key={eq} style={{ marginTop: i ? 16 : 0 }}>
                <span>{EQUIPMENT_LABELS[eq]}</span>
                <input
                  type="number"
                  placeholder="kg"
                  value={maxWeights[eq] ?? ''}
                  onChange={(e) =>
                    setMaxWeights((prev) => ({
                      ...prev,
                      [eq]: e.target.value ? Number(e.target.value) : undefined
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <Boton tono="primario" onClick={() => setStep(4)}>
            Continuar
          </Boton>
          <Boton tono="callado" onClick={() => setStep(2)}>
            Atrás
          </Boton>
        </>
      )}

      {step === 4 && (
        <>
          <p className="eyebrow">Paso 5</p>
          <h1>Cetosis y DHA</h1>
          <p className="lede">
            Las primeras semanas en cetosis el rendimiento se resiente mientras el cuerpo se adapta.
            Si me dices desde cuándo, bajo la exigencia durante ese periodo.
          </p>
          <div className="card" style={{ marginTop: 24 }}>
            <label className="field">
              <span>Desde cuándo llevas dieta cetogénica</span>
              <input type="date" value={ketoSince} onChange={(e) => setKetoSince(e.target.value)} />
            </label>
            <p className="faint" style={{ marginTop: 12 }}>
              Déjalo vacío si no la sigues o si ya llevas mucho tiempo adaptado.
            </p>
            <Regla />
            <label className="field">
              <span>mg de DHA por pastilla, si tomas</span>
              <input
                type="number"
                placeholder="p. ej. 1000"
                value={dhaPillMg}
                onChange={(e) => setDhaPillMg(e.target.value)}
              />
            </label>
            <p className="faint" style={{ marginTop: 12 }}>
              Con esto calculo cuánto te falta cada día, sin pasar nunca de 1.000 mg de suplemento.
            </p>
          </div>
          <Boton tono="primario" onClick={finish}>
            Empezar
          </Boton>
          <Boton tono="callado" onClick={() => setStep(ownedWeighted.length ? 3 : 2)}>
            Atrás
          </Boton>
        </>
      )}
    </div>
  )
}
