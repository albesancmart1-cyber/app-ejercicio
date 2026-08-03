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
import { exerciseById } from '../data/exercises'
import ExercisePicker from '../components/ExercisePicker'
import LandmarkSettings from '../components/LandmarkSettings'
import VolumeLevelChooser from '../components/VolumeLevelChooser'
import { NIVEL_MAXIMO, volumePlan } from '../domain/progression'
import { interpretTrend } from '../domain/trend'
import { actions, todayIso, useAppData } from '../store/store'

const ALL_EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[]

export default function Settings() {
  const data = useAppData()
  const profile = data.profile!
  const fileInput = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [eligiendoFavorito, setEligiendoFavorito] = useState(false)
  const [buscando, setBuscando] = useState(false)

  /** Cuándo se construyó lo que hay instalado, en lenguaje de calendario. */
  function versionInstalada(): string {
    const d = new Date(__BUILD_TIME__)
    return d.toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  }

  /**
   * Fuerza la comprobación de versión nueva. Al estar instalada, la app sirve
   * sus propios archivos desde la caché: sin esto puede pasar un rato hasta que
   * el móvil se entera de que hay algo nuevo, y da la impresión de que un
   * cambio no ha llegado cuando en realidad sí está publicado.
   */
  async function buscarActualizacion() {
    setBuscando(true)
    try {
      const registros = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
      await Promise.all(registros.map((r) => r.update()))
    } catch {
      // Sin service worker —navegador normal— no hay nada que actualizar.
    }
    location.reload()
  }

  function update(partial: Partial<typeof profile>) {
    actions.saveProfile({ ...profile, ...partial })
  }

  /** Marcar y desmarcar favoritos desde el catálogo, sin salir de Ajustes. */
  function alternarFavorito(id: string) {
    const favoritos = profile.favoriteExercises ?? []
    update({
      favoriteExercises: favoritos.includes(id) ? favoritos.filter((f) => f !== id) : [...favoritos, id],
      dislikedExercises: (profile.dislikedExercises ?? []).filter((d) => d !== id)
    })
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

  // El nivel de volumen también se cambia desde aquí, y no solo desde la
  // tarjeta de «Hoy»: esa solo aparece los días de fuerza, y querer subir de
  // nivel no tiene por qué coincidir con que hoy toquen pesas.
  const hoy = todayIso()
  const plan = volumePlan({
    profile,
    sessions: data.sessions,
    checkIns: data.checkIns,
    trendState: interpretTrend(data.measurements, profile, data.checkIns, data.sessions, hoy).state,
    todayIso: hoy
  })

  const ownedWeighted = WEIGHTED_EQUIPMENT.filter((eq) => profile.equipment.includes(eq))
  const protein = profile.weightKg ? proteinTarget(profile.weightKg, profile.goal) : null
  const ketoWeeks = ketoAdaptationWeeksLeft(profile.ketoSince, todayIso())
  const objetivoDha = objetivoDhaDiario(todayIso())

  if (eligiendoFavorito) {
    return (
      <ExercisePicker
        profile={profile}
        title="Marca tus favoritos"
        inSession={[]}
        onPick={(e) => alternarFavorito(e.id)}
        onToggleFavorite={alternarFavorito}
        onClose={() => setEligiendoFavorito(false)}
      />
    )
  }

  return (
    <div className="fade-in cards-grid">
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
        <p className="eyebrow">Tus medidas</p>
        <div className="field-row">
          <label className="field">
            <span>Peso (kg)</span>
            <input
              type="number"
              placeholder="—"
              value={profile.weightKg ?? ''}
              onChange={(e) => update({ weightKg: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
          <label className="field">
            <span>Altura (cm)</span>
            <input
              type="number"
              placeholder="—"
              value={profile.heightCm ?? ''}
              onChange={(e) => update({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
        </div>
        <p className="faint" style={{ marginTop: 10 }}>
          La altura solo se usa para calcular el FFMI en la pestaña Cuerpo.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">
          Nivel de volumen · {plan.level} de {NIVEL_MAXIMO}
          {plan.chosenByUser ? ' · elegido por ti' : ''}
        </p>
        <p className="dim">{plan.reason}</p>
        <VolumeLevelChooser
          actual={plan.level}
          automatico={plan.autoLevel}
          elegidoPorTi={plan.chosenByUser}
          onElegir={(n) => update({ volumeLevelOverride: n })}
          onAutomatico={() => {
            const { volumeLevelOverride: _fuera, ...resto } = profile
            actions.saveProfile(resto)
          }}
        />
      </div>

      <LandmarkSettings profile={profile} onChange={update} />

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
        <p className="eyebrow">Ejercicios favoritos</p>
        <p className="dim" style={{ marginBottom: 14 }}>
          El catálogo es largo a propósito, para que cambiar un ejercicio tenga a dónde ir. Marca los
          que más te gusten y la app tirará de ellos al proponerte la sesión, sin que tengas que
          elegir cada día.
        </p>
        {(profile.favoriteExercises ?? []).length === 0 ? (
          <p className="faint" style={{ marginBottom: 14 }}>
            Aún no has marcado ninguno. Sin favoritos se elige por lo que mejor equilibra la semana,
            que también funciona.
          </p>
        ) : (
          (profile.favoriteExercises ?? []).map((id) => (
            <div className="item" key={id}>
              <div className="item-body">
                <div className="item-title">{exerciseById(id)?.name ?? id}</div>
              </div>
              <button
                className="opt"
                onClick={() =>
                  update({ favoriteExercises: (profile.favoriteExercises ?? []).filter((x) => x !== id) })
                }
              >
                Quitar
              </button>
            </div>
          ))
        )}
        <div style={{ height: 14 }} />
        <button className="btn btn-secondary" onClick={() => setEligiendoFavorito(true)}>
          Elegir favoritos del catálogo
        </button>
      </div>

      {(profile.dislikedExercises ?? []).length > 0 && (
        <div className="card">
          <p className="eyebrow">Ejercicios descartados</p>
          <p className="dim" style={{ marginBottom: 14 }}>
            Estos ya no se te proponen. Si quieres recuperar alguno, quítalo de la lista.
          </p>
          {(profile.dislikedExercises ?? []).map((id) => (
            <div className="item" key={id}>
              <div className="item-body">
                <div className="item-title">{exerciseById(id)?.name ?? id}</div>
              </div>
              <button
                className="opt"
                onClick={() =>
                  update({ dislikedExercises: (profile.dislikedExercises ?? []).filter((x) => x !== id) })
                }
              >
                Readmitir
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <p className="eyebrow">Versión</p>
        <p className="dim" style={{ marginBottom: 14 }}>
          Instalada en el móvil, la app guarda una copia para funcionar sin conexión y puede tardar
          en enterarse de que hay algo nuevo. Esta es de <b>{versionInstalada()}</b>.
        </p>
        <button className="btn btn-secondary" onClick={buscarActualizacion}>
          {buscando ? 'Buscando…' : 'Buscar actualización'}
        </button>
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
