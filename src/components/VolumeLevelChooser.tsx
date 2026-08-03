import { useState } from 'react'
import { NIVEL_MAXIMO, resumenDeNivel, type VolumeLevel } from '../domain/progression'

const NIVELES: VolumeLevel[] = [1, 2, 3, 4]

/** En qué se nota cada nivel, en una línea. */
function comoSeNota(nivel: VolumeLevel): string {
  const r = resumenDeNivel(nivel)
  const partes = [
    `${r.exercisesPerSession} ejercicios · ${r.setsPerExercise} series`,
    `${r.seriesPorSesion} series de trabajo`,
    `${r.focusMuscles} zonas`
  ]
  if (r.repBias === 'variado') partes.push('rango variado')
  return partes.join(' · ')
}

/**
 * Elegir a mano el nivel de volumen.
 *
 * La progresión automática va deliberadamente lenta —seis sesiones limpias por
 * escalón— porque subir volumen por calendario es la forma más rápida de acabar
 * reventado. Pero eso da por hecho que la app sabe de lo que eres capaz, y no lo
 * sabe: no tiene ni idea de si llevas años levantando en otro sitio ni de cómo
 * te has notado hoy. Así que se puede adelantar, y también quedarse por debajo.
 *
 * Lo que la app no hace es callarse: cuando el nivel lo has puesto tú, se sigue
 * enseñando dónde estaría ella, y si la recuperación se tuerce lo dice — pero no
 * te lo baja por la espalda.
 */
export default function VolumeLevelChooser({
  actual,
  automatico,
  elegidoPorTi,
  onElegir,
  onAutomatico
}: {
  actual: number
  automatico?: number
  elegidoPorTi?: boolean
  onElegir: (nivel: VolumeLevel) => void
  onAutomatico: () => void
}) {
  const [abierto, setAbierto] = useState(false)

  if (!abierto) {
    return (
      <div className="level-actions">
        <button className="btn-quiet" onClick={() => setAbierto(true)}>
          {actual >= NIVEL_MAXIMO ? 'Cambiar de nivel' : 'Subir de nivel'}
        </button>
        {elegidoPorTi && (
          <button className="btn-quiet" onClick={onAutomatico}>
            Volver a que decidas tú
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="level-picker">
      <p className="faint" style={{ marginBottom: 10 }}>
        Elige el nivel al que quieres ir. Mandará sobre lo que yo calcule, y lo mantendré mientras te
        salga.
      </p>
      <div className="options options-col">
        {NIVELES.map((n) => {
          const esActual = n === actual
          return (
            <button
              key={n}
              className="opt opt-block"
              aria-pressed={esActual}
              onClick={() => {
                onElegir(n)
                setAbierto(false)
              }}
            >
              Nivel {n}
              {n === automatico ? ' · donde te pondría yo' : ''}
              {esActual && n !== automatico ? ' · el de ahora' : ''}
              <span className="opt-desc">{comoSeNota(n)}</span>
            </button>
          )
        })}
      </div>
      <div className="level-actions">
        {elegidoPorTi && (
          <button className="btn-quiet" onClick={() => { onAutomatico(); setAbierto(false) }}>
            Volver a que decidas tú
          </button>
        )}
        <button className="btn-quiet" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
