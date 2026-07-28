/**
 * Los dos motores en paralelo.
 *
 * El motor viejo sigue decidiendo. El nuevo solo mira y apunta. Antes de
 * cambiar quién manda hay que saber **en qué se diferencian sobre el historial
 * real**, porque el motor viejo lleva meses funcionando y no se sustituye algo
 * que funciona por algo que sobre el papel es mejor.
 *
 * Conviene tener claro en qué se parecen, para no buscar diferencias donde no
 * las hay: `weeklySets` ya contaba fraccional —los secundarios a media serie—,
 * así que **el método no es la novedad**. Lo que cambia es de qué se cuenta:
 *
 * 1. **Granularidad.** El viejo cuenta «brazo»; el nuevo, bíceps, tríceps y
 *    antebrazo por separado. De ahí sale el fallo que motivó todo: brazo puede
 *    salir cubierto con el bíceps a cero.
 * 2. **Umbral único frente a landmarks por músculo.** El viejo usa 4 series
 *    para todo y un techo de 20; el nuevo, el MEV y el MRV de cada músculo, que
 *    van de 3 a 6 y de 16 a 30.
 * 3. **Planificado frente a hecho.** El viejo suma `plan.sets` de los
 *    ejercicios marcados; el nuevo cuenta series realmente registradas, sin
 *    calentamientos y descartando las que van lejos del fallo.
 *
 * Las tres diferencias producen divergencias distintas, y este módulo las
 * separa para poder juzgarlas una a una.
 */
import { MUSCLE_LABELS } from './types'
import type { MuscleGroup, Session } from './types'
import { weeklySets } from './muscleBalance'
import { WEEKLY_SETS } from './protocol'
import { ALL_MUSCLES, MUSCLES } from './muscles'
import type { Muscle, VolumeLandmarks } from './muscles'
import { weeklyMuscleVolume, zonaDe } from './volume'
import { allLandmarks } from './landmarks'
import type { LandmarkOpts } from './landmarks'

/**
 * Qué músculos viven dentro de cada grupo de la taxonomía vieja.
 *
 * `gemelo` es el único grupo que no venía de antes: se añadió al descubrir, ya
 * contando por músculo, que gastrocnemio y sóleo no cabían en ninguno y que por
 * eso la app nunca había propuesto trabajo de pantorrilla. Se le dio sitio en
 * los dos modelos —y no solo en el nuevo— para que la comparación mida
 * diferencias de criterio y no el hueco que dejaba un mapa incompleto.
 */
export const MUSCULOS_DEL_GRUPO: Record<Exclude<MuscleGroup, 'cardio'>, Muscle[]> = {
  pecho: ['pectoral_mayor'],
  espalda: ['dorsal_ancho', 'espalda_alta', 'trapecio_superior', 'erectores_espinales'],
  hombro: ['deltoides_anterior', 'deltoides_lateral', 'deltoides_posterior'],
  brazo: ['biceps_braquial', 'triceps_braquial', 'antebrazo'],
  cuadriceps_gluteo: ['cuadriceps', 'gluteo', 'aductores'],
  femoral: ['isquiosurales'],
  gemelo: ['gastrocnemio', 'soleo'],
  core: ['recto_abdominal', 'oblicuos']
}

const GRUPOS = Object.keys(MUSCULOS_DEL_GRUPO) as Exclude<MuscleGroup, 'cardio'>[]

/** Músculos que ningún grupo viejo sabía nombrar. */
export const MUSCULOS_HUERFANOS: Muscle[] = ALL_MUSCLES.filter(
  (m) => !GRUPOS.some((g) => MUSCULOS_DEL_GRUPO[g].includes(m))
)

export interface MusculoEnRiesgo {
  muscle: Muscle
  label: string
  series: number
  landmarks: VolumeLandmarks
}

export interface Divergencia {
  grupo: Exclude<MuscleGroup, 'cardio'>
  label: string
  /** Lo que ve el motor viejo. */
  seriesGrupo: number
  /** Lo que ve el nuevo, músculo a músculo. */
  musculos: MusculoEnRiesgo[]
}

export interface Comparacion {
  /** Grupos que el motor viejo da por cubiertos con algún músculo por debajo de su MEV. */
  falsosCubiertos: Divergencia[]
  /** Músculos por encima de su MRV dentro de un grupo que el viejo no considera saturado. */
  sobrecargasInvisibles: Divergencia[]
  /** Grupos que el viejo considera saturados sin que ningún músculo pase su MRV. */
  falsasSaturaciones: Divergencia[]
  /** Músculos que el modelo viejo no podía ni nombrar. */
  huerfanos: MusculoEnRiesgo[]
  /** Cuánto se separan las dos cuentas del mismo grupo, por si el «hecho vs planificado» pesa. */
  desfases: { grupo: Exclude<MuscleGroup, 'cardio'>; viejo: number; nuevo: number }[]
  /** ¿Los dos motores dirían lo mismo? */
  coinciden: boolean
}

/**
 * Compara lo que ven los dos motores sobre la misma semana. No decide nada:
 * describe.
 */
export function compararMotores(
  sessions: Session[],
  todayIso: string,
  opts: LandmarkOpts = {}
): Comparacion {
  const viejo = weeklySets(sessions, todayIso)
  const nuevo = weeklyMuscleVolume(sessions, todayIso)
  const landmarks = allLandmarks(opts)

  const enRiesgo = (m: Muscle): MusculoEnRiesgo => ({
    muscle: m,
    label: MUSCLES[m].label,
    series: nuevo[m],
    landmarks: landmarks[m]
  })

  const falsosCubiertos: Divergencia[] = []
  const sobrecargasInvisibles: Divergencia[] = []
  const falsasSaturaciones: Divergencia[] = []
  const desfases: Comparacion['desfases'] = []

  for (const grupo of GRUPOS) {
    const musculos = MUSCULOS_DEL_GRUPO[grupo]
    const seriesGrupo = viejo[grupo]
    const sumaNueva = musculos.reduce((a, m) => a + nuevo[m], 0)
    desfases.push({ grupo, viejo: seriesGrupo, nuevo: Math.round(sumaNueva * 2) / 2 })

    const base = { grupo, label: MUSCLE_LABELS[grupo], seriesGrupo }

    // El grupo va sobrado pero dentro hay un músculo sin trabajo.
    const flojos = musculos.filter((m) => nuevo[m] < landmarks[m].mev)
    if (seriesGrupo >= WEEKLY_SETS.minimoEficaz && flojos.length > 0) {
      falsosCubiertos.push({ ...base, musculos: flojos.map(enRiesgo) })
    }

    // Un músculo pasado de vueltas dentro de un grupo que el viejo ve normal.
    const pasados = musculos.filter((m) => nuevo[m] > landmarks[m].mrv)
    if (seriesGrupo < WEEKLY_SETS.techo && pasados.length > 0) {
      sobrecargasInvisibles.push({ ...base, musculos: pasados.map(enRiesgo) })
    }

    // El viejo frena el grupo y ningún músculo lo necesitaba.
    if (seriesGrupo >= WEEKLY_SETS.techo && pasados.length === 0) {
      falsasSaturaciones.push({ ...base, musculos: musculos.map(enRiesgo) })
    }
  }

  const huerfanos = MUSCULOS_HUERFANOS.map(enRiesgo)

  return {
    falsosCubiertos,
    sobrecargasInvisibles,
    falsasSaturaciones,
    huerfanos,
    desfases,
    coinciden:
      falsosCubiertos.length === 0 &&
      sobrecargasInvisibles.length === 0 &&
      falsasSaturaciones.length === 0
  }
}

/**
 * Lo que el motor nuevo priorizaría: los músculos más lejos de su mínimo,
 * medidos en **déficit relativo** y no en series absolutas.
 *
 * Comparar series a pelo daría siempre los mismos primeros: el sóleo pide 6 de
 * mínimo y el deltoides anterior 3, así que estar a 2 series es mucho peor en
 * uno que en otro. La proporción respecto al MEV es lo que los hace comparables.
 */
export function musculosDescuidados(
  sessions: Session[],
  todayIso: string,
  opts: LandmarkOpts = {}
): { muscle: Muscle; series: number; deficit: number }[] {
  const nuevo = weeklyMuscleVolume(sessions, todayIso)
  const landmarks = allLandmarks(opts)
  return ALL_MUSCLES.map((m) => ({
    muscle: m,
    series: nuevo[m],
    deficit: Math.max(0, (landmarks[m].mev - nuevo[m]) / landmarks[m].mev)
  }))
    .filter((x) => x.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.series - b.series)
}

/** Resumen de una semana en lenguaje llano, para el informe de comparación. */
export function resumirComparacion(c: Comparacion): string[] {
  const lineas: string[] = []
  for (const d of c.falsosCubiertos) {
    const nombres = d.musculos.map((m) => `${m.label} ${m.series}/${m.landmarks.mev}`).join(', ')
    lineas.push(`«${d.label}» sale cubierto con ${d.seriesGrupo} series, pero dentro: ${nombres}`)
  }
  for (const d of c.sobrecargasInvisibles) {
    const nombres = d.musculos.map((m) => `${m.label} ${m.series}>${m.landmarks.mrv}`).join(', ')
    lineas.push(`«${d.label}» parece normal con ${d.seriesGrupo} series, pero se pasa: ${nombres}`)
  }
  for (const d of c.falsasSaturaciones) {
    lineas.push(`«${d.label}» se frena por techo (${d.seriesGrupo}) sin que ningún músculo pase su MRV`)
  }
  return lineas
}
