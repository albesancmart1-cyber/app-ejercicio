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

const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>(['peso_corporal'])
  const [maxWeights, setMaxWeights] = useState<Partial<Record<Equipment, number>>>({})

  function toggleEquipment(eq: Equipment) {
    setEquipment((prev) => (prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]))
  }

  function finish() {
    if (!goal) return
    const profile: Profile = {
      name: name.trim() || 'Tú',
      age: age ? Number(age) : undefined,
      weightKg: weight ? Number(weight) : undefined,
      goal,
      equipment,
      maxWeights
    }
    actions.saveProfile(profile)
  }

  const ownedWeighted = WEIGHTED_EQUIPMENT.filter((eq) => equipment.includes(eq))

  return (
    <div>
      <h1>Ritmo</h1>
      <p className="subtitle">Entrenar sin estrés, al ritmo de tu cuerpo.</p>

      {step === 0 && (
        <div className="card">
          <span className="big-sun">🌅</span>
          <h2>Bienvenido</h2>
          <p className="muted">
            Esta app no te impone un plan: escucha cómo está tu cuerpo, mira qué has trabajado y te
            propone cada día lo que más te conviene. El ejercicio como acompañante de tus hábitos —
            luz solar, ritmos circadianos, buen descanso — no como una obligación más.
          </p>
          <div className="divider" />
          <label className="field">
            <span>¿Cómo te llamas?</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Edad (opcional)</span>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="—" />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Peso kg (opcional)</span>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" />
            </label>
          </div>
          <button className="btn-primary" onClick={() => setStep(1)}>Continuar</button>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h2>¿Cuál es tu objetivo?</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Los entrenos se diseñarán para lograrlo estresando el cuerpo lo mínimo posible.
          </p>
          <div className="chip-row" style={{ flexDirection: 'column' }}>
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <button
                key={g}
                className={`chip ${goal === g ? 'selected' : ''}`}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px' }}
                onClick={() => setGoal(g)}
              >
                {GOAL_LABELS[g]}
              </button>
            ))}
          </div>
          <div style={{ height: 16 }} />
          <button className="btn-primary" disabled={!goal} onClick={() => setStep(2)}>
            Continuar
          </button>
          <button className="btn-ghost" onClick={() => setStep(0)}>Atrás</button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>¿Qué tienes para entrenar?</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Marca tu equipamiento. Solo te propondremos ejercicios que puedas hacer.
          </p>
          <div className="chip-row">
            {ALL_EQUIPMENT.map((eq) => (
              <button
                key={eq}
                className={`chip ${equipment.includes(eq) ? 'selected' : ''}`}
                onClick={() => toggleEquipment(eq)}
              >
                {EQUIPMENT_LABELS[eq]}
              </button>
            ))}
          </div>
          <div style={{ height: 16 }} />
          <button className="btn-primary" onClick={() => setStep(ownedWeighted.length > 0 ? 3 : 4)}>
            Continuar
          </button>
          <button className="btn-ghost" onClick={() => setStep(1)}>Atrás</button>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2>¿Hasta qué peso llegas?</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Peso máximo disponible en cada equipo (kg). Así las sugerencias serán realistas.
          </p>
          {ownedWeighted.map((eq) => (
            <label className="field" key={eq}>
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
          <button className="btn-primary" onClick={() => setStep(4)}>Continuar</button>
          <button className="btn-ghost" onClick={() => setStep(2)}>Atrás</button>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <span className="big-sun">🌄</span>
          <h2>Todo listo{name ? `, ${name.trim()}` : ''}</h2>
          <p className="muted">
            A partir de ahora, cada día que quieras entrenar te haremos unas preguntas rápidas sobre
            cómo estás — sueño, luz, energía — y te propondremos lo que tu cuerpo necesita: fuerza,
            cardio o descanso. Sin culpas, sin rachas, sin presión.
          </p>
          <div style={{ height: 16 }} />
          <button className="btn-primary" onClick={finish}>Empezar</button>
        </div>
      )}
    </div>
  )
}
