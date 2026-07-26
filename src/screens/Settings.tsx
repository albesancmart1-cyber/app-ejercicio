import { useRef, useState } from 'react'
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  WEIGHTED_EQUIPMENT,
  type Equipment,
  type Goal
} from '../domain/types'
import { ketoAdaptationWeeksLeft, proteinTarget } from '../domain/protocol'
import { esVerano, objetivoDhaDiario } from '../domain/dha'
import { actions, todayIso, useAppData } from '../store/store'

const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]

export default function Settings() {
  const data = useAppData()
  const profile = data.profile!
  const fileInput = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  function update(partial: Partial<typeof profile>) {
    actions.saveProfile({ ...profile, ...partial })
  }

  function exportData() {
    const blob = new Blob([actions.exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ritmo-${todayIso()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const ownedWeighted = WEIGHTED_EQUIPMENT.filter((eq) => profile.equipment.includes(eq))
  const protein = profile.weightKg ? proteinTarget(profile.weightKg, profile.goal) : null
  const ketoWeeks = ketoAdaptationWeeksLeft(profile.ketoSince, todayIso())
  const objetivoDha = objetivoDhaDiario(todayIso())

  return (
    <div className="fade-in">
      <p className="eyebrow">Tu configuración</p>
      <h1>Ajustes</h1>

      <div className="card" style={{ marginTop: 28 }}>
        <p className="eyebrow">Objetivo</p>
        <div className="options">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <button key={g} className="opt" aria-pressed={profile.goal === g} onClick={() => update({ goal: g })}>
              {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Equipamiento</p>
        <div className="options">
          {ALL_EQUIPMENT.map((eq) => (
            <button
              key={eq}
              className="opt"
              aria-pressed={profile.equipment.includes(eq)}
              onClick={() =>
                update({
                  equipment: profile.equipment.includes(eq)
                    ? profile.equipment.filter((e) => e !== eq)
                    : [...profile.equipment, eq]
                })
              }
            >
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>
        {ownedWeighted.length > 0 && (
          <>
            <hr className="rule" />
            <p className="eyebrow">Peso máximo disponible</p>
            {ownedWeighted.map((eq, i) => (
              <label className="field" key={eq} style={{ marginTop: i ? 14 : 0 }}>
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
        <p className="eyebrow">Cetosis y descanso</p>
        <label className="field">
          <span>Dieta cetogénica desde</span>
          <input
            type="date"
            value={profile.ketoSince ?? ''}
            onChange={(e) => update({ ketoSince: e.target.value || undefined })}
          />
        </label>
        {ketoWeeks > 0 && (
          <p className="faint" style={{ marginTop: 10 }}>
            Quedan unas {ketoWeeks} semanas de adaptación: durante este periodo la app mantiene la
            intensidad por debajo del máximo.
          </p>
        )}
        <hr className="rule" />
        <p className="eyebrow">DHA</p>
        <label className="field">
          <span>mg de DHA por pastilla</span>
          <input
            type="number"
            placeholder="p. ej. 1000"
            value={profile.dhaPillMg ?? ''}
            onChange={(e) => update({ dhaPillMg: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <p className="faint" style={{ marginTop: 10 }}>
          Objetivo de hoy: {objetivoDha.toLocaleString('es-ES')} mg
          {esVerano(todayIso()) ? ' (subido por ser verano)' : ''}. Nunca te sugeriré más de
          1.000 mg de suplemento al día: es el techo que la EFSA respalda para el DHA aislado.
        </p>
        <hr className="rule" />
        <p className="dim">
          {protein ? (
            <>
              Con {profile.weightKg} kg, apunta a <span className="accent">{protein.min}–{protein.max} g de proteína al día</span>.
              En cetosis es lo que sostiene el músculo. Del resto no lleves cuentas: come hasta
              saciarte de verdad y deja que la leptina regule lo demás.
            </>
          ) : (
            'Añade tu peso al perfil para calcular tu objetivo diario de proteína.'
          )}
        </p>
        <p className="faint" style={{ marginTop: 12 }}>
          Sube el agua y la sal los días de entreno: en cetosis se retiene menos líquido y se pierde
          más sodio. Si el peso salta al día siguiente de una sesión fuerte, casi siempre es agua de
          la reparación muscular, no grasa.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">Tus datos</p>
        <p className="dim" style={{ marginBottom: 16 }}>
          Todo vive solo en este dispositivo. Haz una copia de vez en cuando.
        </p>
        <button className="btn btn-secondary" onClick={exportData}>
          Exportar copia
        </button>
        <div style={{ height: 8 }} />
        <button className="btn-quiet" onClick={() => fileInput.current?.click()}>
          Importar copia
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) =>
            e.target.files?.[0] &&
            e.target.files[0].text().then((t) => {
              if (!actions.importData(t)) alert('El archivo no parece una copia válida de Ritmo.')
            })
          }
        />
        <hr className="rule" />
        {!confirmReset ? (
          <button className="btn-quiet" onClick={() => setConfirmReset(true)}>
            Borrar todos los datos
          </button>
        ) : (
          <>
            <p className="dim" style={{ marginBottom: 14 }}>
              Se borrará el perfil y todo el historial de este dispositivo. No hay vuelta atrás.
            </p>
            <button className="btn btn-secondary" onClick={() => actions.reset()}>
              Sí, borrar todo
            </button>
            <button className="btn-quiet" onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
