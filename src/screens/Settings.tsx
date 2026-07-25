import { useRef, useState } from 'react'
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  WEIGHTED_EQUIPMENT,
  type Equipment,
  type Goal
} from '../domain/types'
import { actions, useAppData } from '../store/store'

const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]

export default function Settings() {
  const data = useAppData()
  const profile = data.profile!
  const fileInput = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  function update(partial: Partial<typeof profile>) {
    actions.saveProfile({ ...profile, ...partial })
  }

  function toggleEquipment(eq: Equipment) {
    const next = profile.equipment.includes(eq)
      ? profile.equipment.filter((e) => e !== eq)
      : [...profile.equipment, eq]
    update({ equipment: next })
  }

  function exportData() {
    const blob = new Blob([actions.exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ritmo-copia-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(file: File) {
    file.text().then((text) => {
      if (!actions.importData(text)) alert('El archivo no parece una copia válida de Ritmo.')
    })
  }

  const ownedWeighted = WEIGHTED_EQUIPMENT.filter((eq) => profile.equipment.includes(eq))

  return (
    <div>
      <h1>Ajustes</h1>
      <p className="subtitle">Tu perfil, tu material, tus datos.</p>

      <div className="card">
        <h2>Objetivo</h2>
        <div className="chip-row">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <button
              key={g}
              className={`chip ${profile.goal === g ? 'selected' : ''}`}
              onClick={() => update({ goal: g })}
            >
              {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Equipamiento</h2>
        <div className="chip-row">
          {ALL_EQUIPMENT.map((eq) => (
            <button
              key={eq}
              className={`chip ${profile.equipment.includes(eq) ? 'selected' : ''}`}
              onClick={() => toggleEquipment(eq)}
            >
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>
        {ownedWeighted.length > 0 && (
          <>
            <div className="divider" />
            <h3 style={{ marginBottom: 10 }}>Peso máximo disponible (kg)</h3>
            {ownedWeighted.map((eq) => (
              <label className="field" key={eq}>
                <span>{EQUIPMENT_LABELS[eq]}</span>
                <input
                  type="number"
                  placeholder="kg"
                  value={profile.maxWeights[eq] ?? ''}
                  onChange={(e) =>
                    update({
                      maxWeights: {
                        ...profile.maxWeights,
                        [eq]: e.target.value ? Number(e.target.value) : undefined
                      }
                    })
                  }
                />
              </label>
            ))}
          </>
        )}
      </div>

      <div className="card">
        <h2>Tus datos</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Todo se guarda solo en este dispositivo. Haz una copia de vez en cuando.
        </p>
        <button className="btn-primary" onClick={exportData}>
          Exportar copia de seguridad
        </button>
        <button className="btn-ghost" onClick={() => fileInput.current?.click()}>
          Importar copia
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
        />
        <div className="divider" />
        {!confirmReset ? (
          <button className="btn-ghost" onClick={() => setConfirmReset(true)}>
            Borrar todos los datos…
          </button>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 10 }}>
              ¿Seguro? Se borrará el perfil y todo el historial de este dispositivo.
            </p>
            <button className="btn-primary" onClick={() => actions.reset()}>
              Sí, borrar todo
            </button>
            <button className="btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
