/**
 * Qué músculos toca trabajar hoy.
 *
 * Hasta aquí la app elegía **grupos**: miraba cuál llevaba menos series en dos
 * semanas y proponía cualquier ejercicio de ese grupo. Eso deja pasar el fallo
 * que motivó todo el refactor: una semana de empujes deja «brazo» con doce
 * series y el bíceps a cero, y el grupo sale cubierto. Comparar los dos motores
 * sobre seis meses de historial generado por la propia app lo confirmó: en la
 * última semana seguían siete músculos por debajo de su mínimo con todos los
 * grupos aparentemente atendidos.
 *
 * Aquí se elige por músculo. Lo que **no** cambia es la cascada de decisión: si
 * hoy toca descanso, cardio o vuelta progresiva, eso se decide antes y no lo
 * toca este módulo. Tampoco se tocan las dos guardas que ya existían:
 *
 *  - una molestia declarada deja fuera toda su zona, no solo un músculo;
 *  - un grupo entrenado hace menos de 48 h sigue descansando entero.
 *
 * Las dos son deliberadas. La primera porque quien dice «me duele el hombro» no
 * está distinguiendo entre deltoides. La segunda porque el reparto se enseña al
 * usuario por zonas —el título de la sesión es «Fuerza · hombro»—, y proponer
 * pierna al día siguiente de pierna parecería un despiste aunque el músculo
 * concreto estuviera fresco.
 *
 * Lo que sí es nuevo: dentro de lo permitido manda el músculo, y un músculo que
 * ya pasó de su MAV esta semana deja de pedir más series aunque su grupo vaya
 * corto.
 */
import { ALL_MUSCLES, MUSCLES } from './muscles'
import type { Muscle } from './muscles'
import type { MuscleGroup } from './types'
import { MUSCULOS_DEL_GRUPO } from './shadow'
import { weeklyMuscleVolume } from './volume'
import { contributionsOf } from '../data/contributions'
import { allLandmarks } from './landmarks'
import type { LandmarkOpts } from './landmarks'
import type { Session } from './types'

/** Cuántos músculos distintos abre una sesión como mucho. */
export const MUSCULOS_POR_SESION = 4

const GRUPO_DE: Partial<Record<Muscle, MuscleGroup>> = (() => {
  const mapa: Partial<Record<Muscle, MuscleGroup>> = {}
  for (const [grupo, musculos] of Object.entries(MUSCULOS_DEL_GRUPO)) {
    for (const m of musculos) mapa[m] = grupo as MuscleGroup
  }
  return mapa
})()

/** En qué grupo de la taxonomía vieja cae un músculo. */
export function grupoDe(muscle: Muscle): MuscleGroup | undefined {
  return GRUPO_DE[muscle]
}

/** Los grupos de una lista de músculos, sin repetir y en el mismo orden. */
export function gruposDe(musculos: Muscle[]): MuscleGroup[] {
  const vistos: MuscleGroup[] = []
  for (const m of musculos) {
    const g = grupoDe(m)
    if (g && !vistos.includes(g)) vistos.push(g)
  }
  return vistos
}

export interface FocoOpts extends LandmarkOpts {
  /** Grupos que hoy no se tocan: molestias, recuperación, saturación. */
  excluir?: MuscleGroup[]
  /** De esos, los innegociables. Si hay que relajar el filtro, estos se quedan. */
  evitar?: MuscleGroup[]
  limite?: number
}

export interface MusculoPropuesto {
  muscle: Muscle
  label: string
  series: number
  /** Nombre corto, para las frases donde el largo no cabe. */
  corto: string
  /** Mínimo semanal eficaz de este músculo. */
  mev: number
  /** Fracción del volumen productivo semanal ya cubierta (0 = nada). */
  cobertura: number
  /** Desde cuándo no lo trabaja de verdad. `Infinity` si nunca. */
  diasSinTrabajar: number
  /** Le faltan series para llegar al mínimo eficaz. */
  bajoMinimo: boolean
}

export interface Foco {
  musculos: Muscle[]
  /** Los mismos, con el detalle de por qué se han elegido. */
  detalle: MusculoPropuesto[]
  /** Grupos correspondientes, para el título y para lo que aún razona por zonas. */
  grupos: MuscleGroup[]
  /** Hubo que ignorar recuperación o saturación por no quedar nada disponible. */
  relajado: boolean
}

/**
 * Días desde la última vez que cada músculo movió algo, mirando todo el
 * historial. `Infinity` si no lo ha movido nunca.
 *
 * Hace falta como desempate: en una semana normal hay diez músculos a cero
 * series y ordenarlos solo por volumen los deja empatados, con lo que decidiría
 * el orden en que están escritos en el fichero. «Lo que lleva más tiempo sin
 * trabajarse» es el criterio que el usuario espera, y además distingue entre no
 * haberlo tocado esta semana y no haberlo tocado en un mes.
 */
export function diasSinTrabajar(sessions: Session[], todayIso: string): Record<Muscle, number> {
  const dias = Object.fromEntries(ALL_MUSCLES.map((m) => [m, Infinity])) as Record<Muscle, number>
  for (const s of sessions) {
    if (!s.completed) continue
    const edad = diasEntre(s.date, todayIso)
    if (edad < 0) continue
    for (const pe of s.exercises) {
      const hecho = pe.logs ? pe.logs.some((l) => l.done && !l.warmup) : pe.done === true
      if (!hecho) continue
      const aporte = pe.muscleContributions ?? contributionsOf(pe.exerciseId)
      for (const [m, c] of Object.entries(aporte)) {
        // Acompañar no cuenta como haberlo trabajado.
        if ((c ?? 0) < 1) continue
        const musculo = m as Muscle
        if (edad < dias[musculo]) dias[musculo] = edad
      }
    }
  }
  return dias
}

function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`)
  const b = Date.parse(`${hasta}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

/**
 * Ordena los músculos por lo lejos que están de su volumen productivo.
 *
 * Se mide en **proporción**, no en series: el sóleo pide un mínimo de 6 y el
 * deltoides anterior de 3, así que llevar 2 series es mucho peor en uno que en
 * otro. Y se mide contra el MAV mínimo —el principio del rango donde el volumen
 * rinde— y no contra el MEV, para que la lista siga ordenando con criterio
 * cuando todo el mundo ya pasa del mínimo.
 *
 * A igualdad de volumen manda el tiempo sin trabajarlo, y en último término el
 * tamaño del objetivo semanal: en la primera sesión de alguien que empieza de
 * cero, todo está a cero y a infinitos días, y entonces vale más abrir por lo
 * que más trabajo pide que por lo que quede antes en la lista.
 */
function ordenar(
  candidatos: Muscle[],
  series: Record<Muscle, number>,
  landmarks: ReturnType<typeof allLandmarks>,
  dias: Record<Muscle, number>
): MusculoPropuesto[] {
  return candidatos
    .map((m) => ({
      muscle: m,
      label: MUSCLES[m].label,
      corto: MUSCLES[m].short,
      mev: landmarks[m].mev,
      series: series[m],
      cobertura: series[m] / landmarks[m].mavMin,
      diasSinTrabajar: dias[m],
      bajoMinimo: series[m] < landmarks[m].mev
    }))
    .sort(
      (a, b) =>
        a.cobertura - b.cobertura ||
        b.diasSinTrabajar - a.diasSinTrabajar ||
        landmarks[b.muscle].mavMin - landmarks[a.muscle].mavMin
    )
}

/**
 * Los músculos que abren la sesión de hoy.
 *
 * `excluir` llega ya resuelto por el recomendador —molestias, grupos aún en
 * recuperación y grupos saturados—, para no duplicar aquí una cascada que ya
 * existe. Si al aplicarlo no queda casi nada se relaja hasta `evitar`, que es lo
 * único innegociable: antes una sesión imperfecta que ninguna sesión.
 */
export function elegirFoco(sessions: Session[], todayIso: string, opts: FocoOpts = {}): Foco {
  const { excluir = [], evitar = [], limite = MUSCULOS_POR_SESION } = opts
  const series = weeklyMuscleVolume(sessions, todayIso)
  const landmarks = allLandmarks(opts)

  const disponibles = (fuera: MuscleGroup[], conSaturacion: boolean) =>
    ALL_MUSCLES.filter((m) => {
      const g = grupoDe(m)
      if (!g || fuera.includes(g)) return false
      // Pasado el MAV, más series no rinden: que las reciba otro.
      if (conSaturacion && series[m] >= landmarks[m].mavMax) return false
      return true
    })

  let relajado = false
  let candidatos = disponibles(excluir, true)
  // Mismo criterio que tenía la elección por grupos: con menos de dos zonas
  // disponibles la sesión se queda coja, y entonces se afloja todo salvo las
  // molestias.
  if (candidatos.length < 2) {
    relajado = true
    candidatos = disponibles(evitar, false)
  }

  const detalle = ordenar(candidatos, series, landmarks, diasSinTrabajar(sessions, todayIso)).slice(
    0,
    limite
  )
  return {
    musculos: detalle.map((d) => d.muscle),
    detalle,
    grupos: gruposDe(detalle.map((d) => d.muscle)),
    relajado
  }
}

/** Enumera en castellano: «a, b y c». */
function enumerar(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? ''
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}

/**
 * Frase para el «por qué» de la recomendación.
 *
 * Se nombran los músculos, que es el cambio que hace la explicación útil: «toca
 * brazo» no dice nada cuando el brazo lleva doce series de tríceps y ninguna de
 * bíceps. Se citan tres como mucho: la lista entera se lee como un informe.
 */
export function explicarFoco(foco: Foco): string | null {
  const bajos = foco.detalle.filter((d) => d.bajoMinimo).slice(0, 3)
  if (bajos.length === 0) {
    const primero = foco.detalle[0]
    return primero
      ? `Todo llega al mínimo, así que hoy abrimos por ${primero.corto.toLowerCase()}, que es lo que menos volumen lleva esta semana.`
      : null
  }
  const aCero = bajos.filter((d) => d.series === 0)
  if (aCero.length === bajos.length) {
    return `Esta semana no han recibido ni una serie: ${enumerar(aCero.map((d) => d.corto.toLowerCase()))}.`
  }
  const nombres = bajos.map((d) => `${d.corto.toLowerCase()} (${d.series} de ${d.mev})`)
  return `Van por debajo de su mínimo semanal: ${enumerar(nombres)}.`
}
