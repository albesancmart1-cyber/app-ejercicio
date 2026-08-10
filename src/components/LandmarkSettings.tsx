import { useState } from 'react'
import {
  MUSCLES,
  REGIONS,
  REGION_LABELS,
  musclesOf,
  type Muscle,
  type Region,
  type VolumeLandmarks
} from '../domain/muscles'
import {
  MAV_TOPE_DEFICIT,
  defaultLandmarks,
  landmarksFor,
  sanearOverride,
  explicarLandmarks,
  type LandmarkOverrides
} from '../domain/landmarks'
import type { Profile } from '../domain/types'
import { Boton, Regla } from './ui'

/**
 * Los objetivos de volumen, ajustables a mano.
 *
 * Los de fábrica son medias de la literatura y a nadie le encajan del todo: uno
 * recupera el pecho antes de lo normal y a otro el hombro se le carga con la
 * mitad. Por eso son editables y se guardan **en el perfil**.
 *
 * Solo se guarda lo que difiere del valor de fábrica. Así, afinar mañana los
 * valores por defecto sigue llegando a quien no los haya tocado, y el ajuste de
 * quien sí los tocó se respeta.
 */
export default function LandmarkSettings({
  profile,
  onChange
}: {
  profile: Profile
  onChange: (partial: Partial<Profile>) => void
}) {
  const [abierta, setAbierta] = useState<Region | null>(null)
  const overrides = profile.landmarkOverrides ?? {}
  const opts = { overrides, deficit: profile.deficitPhase }
  const nota = explicarLandmarks(opts)

  function guardar(muscle: Muscle, parcial: Partial<VolumeLandmarks>) {
    const base = defaultLandmarks(muscle)
    const combinado = { ...(overrides[muscle] ?? {}), ...parcial }
    const saneado = sanearOverride(combinado, base)
    // Lo que coincide con el valor de fábrica no se guarda: no es un ajuste.
    const limpio = Object.fromEntries(
      Object.entries(saneado).filter(([k, v]) => v !== base[k as keyof VolumeLandmarks])
    ) as Partial<VolumeLandmarks>
    const siguiente: LandmarkOverrides = { ...overrides }
    if (Object.keys(limpio).length === 0) delete siguiente[muscle]
    else siguiente[muscle] = limpio
    onChange({
      landmarkOverrides: Object.keys(siguiente).length > 0 ? siguiente : undefined
    })
  }

  function restaurar(muscle: Muscle) {
    const siguiente = { ...overrides }
    delete siguiente[muscle]
    onChange({ landmarkOverrides: Object.keys(siguiente).length > 0 ? siguiente : undefined })
  }

  const ajustados = Object.keys(overrides).length

  return (
    <div className="card">
      <p className="eyebrow">Objetivos de volumen</p>
      <p className="dim">
        Cuántas series semanales busca la app para cada músculo. Los valores de partida vienen de la
        literatura, que son medias: si notas que un músculo te pide más —o que con menos ya vas
        servido—, cámbialos aquí.
      </p>

      <div className="options options-col" style={{ marginTop: 16 }}>
        <button
          className="opt opt-block"
          aria-pressed={profile.deficitPhase === true}
          onClick={() => onChange({ deficitPhase: profile.deficitPhase ? undefined : true })}
        >
          Estoy perdiendo grasa
          <span className="opt-desc">
            Cuando el cuerpo tira de sus reservas, la leptina baja y con ella lo que puedes
            recuperar. Ahí, pasar de {MAV_TOPE_DEFICIT} series por músculo no conserva más músculo:
            solo suma fatiga. Si no lo tienes claro, la señal de leptina de «Cuerpo» lo dice antes
            que la báscula.
          </span>
        </button>
      </div>

      {nota && <p className="faint">{nota}</p>}

      <Regla />
      <p className="eyebrow">
        Por músculo{ajustados > 0 ? ` · ${ajustados} ajustado${ajustados === 1 ? '' : 's'}` : ''}
      </p>

      <div className="regions">
        {REGIONS.map((region) => {
          const abierto = abierta === region
          const tocados = musclesOf(region).filter((m) => overrides[m]).length
          return (
            <div className="region" key={region}>
              <button
                className="region-head"
                aria-expanded={abierto}
                onClick={() => setAbierta(abierto ? null : region)}
              >
                <span className="region-name">{REGION_LABELS[region]}</span>
                <span className="region-note">{tocados > 0 ? `${tocados} a mano` : 'de fábrica'}</span>
                <span className={`chev ${abierto ? 'open' : ''}`} aria-hidden="true" />
              </button>
              {abierto && (
                <div className="region-body">
                  {musclesOf(region).map((m) => (
                    <LandmarkRow
                      key={m}
                      muscle={m}
                      valores={landmarksFor(m, opts)}
                      tocado={Boolean(overrides[m])}
                      onSave={(parcial) => guardar(m, parcial)}
                      onReset={() => restaurar(m)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CAMPOS: { clave: keyof VolumeLandmarks; label: string }[] = [
  { clave: 'mev', label: 'Mínimo' },
  { clave: 'mavMin', label: 'Rinde desde' },
  { clave: 'mavMax', label: 'Rinde hasta' },
  { clave: 'mrv', label: 'Techo' }
]

function LandmarkRow({
  muscle,
  valores,
  tocado,
  onSave,
  onReset
}: {
  muscle: Muscle
  valores: VolumeLandmarks
  tocado: boolean
  onSave: (parcial: Partial<VolumeLandmarks>) => void
  onReset: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="mrow">
      <button className="mrow-head" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
        <span className="mrow-name">{MUSCLES[muscle].label}</span>
        <span className="mrow-series">
          {valores.mev}–{valores.mavMax}
        </span>
      </button>
      {abierto && (
        <>
          <div className="landmark-fields">
            {CAMPOS.map(({ clave, label }) => (
              <label className="field" key={clave}>
                <span>{label}</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={valores[clave]}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n) && n > 0) onSave({ [clave]: n })
                  }}
                />
              </label>
            ))}
          </div>
          {tocado && (
            <Boton tono="callado" onClick={onReset}>
              Volver a los valores de fábrica
            </Boton>
          )}
        </>
      )}
    </div>
  )
}
