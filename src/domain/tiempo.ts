/**
 * Ajustar el entreno al tiempo que hay de verdad.
 *
 * La app proponía la sesión que el cuerpo pedía y daba por hecho que había hueco
 * para hacerla. En la vida real casi nunca lo hay: se entrena entre dos cosas, y
 * la elección no es «esta sesión o ninguna» sino «esta sesión recortada o
 * ninguna». Sin poder decirle a la app de cuánto dispones, lo que pasaba era que
 * se dejaban los dos últimos ejercicios sin hacer — es decir, el recorte lo hacía
 * el reloj, y siempre por el final, que es justo el peor sitio.
 *
 * Aquí se recorta a propósito y en este orden:
 *
 *  1. **Encadenar en superseries.** Es lo único que quita tiempo sin quitar
 *     trabajo: dos ejercicios que no compiten se hacen en el hueco de descanso
 *     del otro. Se emparejan **grupos musculares distintos** — encadenar dos de
 *     pecho no ahorra nada, porque el segundo llega con el músculo a medias y
 *     acaba haciéndose peor.
 *  2. **Quitar series.** Solo si con las superseries no basta, y empezando por
 *     los músculos que **más volumen llevan ya esta semana**: son los que menos
 *     echan de menos una serie. Los que van cortos conservan las suyas, que es
 *     todo el sentido de recortar con criterio en vez de por el final.
 *
 * Los minutos son una estimación, no un cronómetro: sirven para decidir si cabe
 * antes de cenar, no para cuadrar una agenda.
 */
import { DESCANSO_ENTRE_EJERCICIOS } from './protocol'
import { gruposDe } from './superseries'
import { contributionsOf } from '../data/contributions'
import type { MuscleVolume } from './volume'
import type { PlannedExercise } from './types'
import type { Muscle } from './muscles'

/** Los tres presupuestos que se ofrecen. */
export const MINUTOS_DISPONIBLES = [35, 45, 60] as const
export type MinutosDisponibles = (typeof MINUTOS_DISPONIBLES)[number]

/**
 * Cuánto se tarda en hacer una serie, descanso aparte.
 *
 * Treinta y cinco segundos es lo que dura una serie de ocho a doce repeticiones
 * a tempo normal, más el tiempo de colocarse. No distingue por ejercicio a
 * propósito: la diferencia entre una serie de curl y una de sentadilla es de
 * segundos, y fingir una precisión que no se tiene solo haría el número más
 * difícil de entender.
 */
export const SEGUNDOS_POR_SERIE = 35

/*
 * Entre un ejercicio y el siguiente no se cuenta una «transición» inventada: se
 * cuenta el descanso que la app arranca de verdad al cambiar de ejercicio, que
 * son los DESCANSO_ENTRE_EJERCICIOS del protocolo. Estimar 45 segundos cuando
 * la propia app te va a poner un cronómetro de 120 sería mentir en la cuenta.
 */

export interface OpcionesDeTiempo {
  /** Cuánto descansa cada ejercicio entre series, con las preferencias puestas. */
  descanso: (pe: PlannedExercise) => number | undefined
  /** Minutos de cardio del día, si los hay. */
  cardioMinutos?: number
}

/** Los minutos que lleva un ejercicio suelto: sus series y sus descansos. */
function segundosDe(pe: PlannedExercise, opts: OpcionesDeTiempo): number {
  if (pe.primary === 'cardio') return 0
  const series = pe.plan.sets
  const descanso = opts.descanso(pe) ?? pe.plan.restSeconds ?? 90
  // El descanso va **entre** series, así que hay uno menos que series.
  return series * SEGUNDOS_POR_SERIE + Math.max(0, series - 1) * descanso
}

/**
 * Lo que dura la sesión entera, en minutos.
 *
 * Dentro de una superserie el descanso no se paga entre sus miembros —se pasa de
 * uno al otro— y sí al cerrar la vuelta, que es exactamente lo que hace que
 * encadenar ahorre tiempo.
 */
export function duracionEstimada(
  exercises: PlannedExercise[],
  opts: OpcionesDeTiempo
): number {
  const grupos = gruposDe(exercises)
  const enGrupo = new Set(grupos.flatMap((g) => g.indices))

  let segundos = 0
  let bloques = 0

  exercises.forEach((pe, i) => {
    if (enGrupo.has(i) || pe.primary === 'cardio') return
    segundos += segundosDe(pe, opts)
    bloques++
  })

  for (const g of grupos) {
    const miembros = g.indices.map((i) => exercises[i])
    const vueltas = Math.max(...miembros.map((m) => m.plan.sets))
    // Cada vuelta: una serie de cada uno seguidas, y un descanso al final.
    const trabajo = miembros.reduce((a, m) => a + Math.min(m.plan.sets, vueltas) * SEGUNDOS_POR_SERIE, 0)
    const descanso = opts.descanso(miembros[0]) ?? miembros[0].plan.restSeconds ?? 90
    segundos += trabajo + Math.max(0, vueltas - 1) * descanso
    bloques++
  }

  segundos += Math.max(0, bloques - 1) * DESCANSO_ENTRE_EJERCICIOS

  segundos += (opts.cardioMinutos ?? 0) * 60
  return Math.round(segundos / 60)
}

export interface Ajuste {
  /** Qué se ha hecho, dicho para el usuario. */
  texto: string
  tipo: 'superserie' | 'serie'
}

export interface Recorte {
  exercises: PlannedExercise[]
  /** Los minutos a los que ha quedado. */
  minutos: number
  /** Los minutos que duraba antes de tocar nada. */
  minutosAntes: number
  ajustes: Ajuste[]
  /** No se ha podido bajar hasta el presupuesto sin dejar la sesión en nada. */
  seQuedaLargo: boolean
}

/** El músculo que más aporta a un ejercicio: por el que se le juzga. */
function musculoPrincipal(pe: PlannedExercise): Muscle | null {
  const aporte = pe.muscleContributions ?? contributionsOf(pe.exerciseId)
  let mejor: Muscle | null = null
  let max = 0
  for (const [m, f] of Object.entries(aporte)) {
    if ((f ?? 0) > max) {
      max = f ?? 0
      mejor = m as Muscle
    }
  }
  return mejor
}

/**
 * Cuánto volumen lleva ya el músculo principal de este ejercicio.
 *
 * Es la vara de medir del recorte: a más volumen acumulado, menos falta le hace
 * una serie más y antes se le quita.
 */
function cargaAcumulada(pe: PlannedExercise, volumen: MuscleVolume | undefined): number {
  if (!volumen) return 0
  const m = musculoPrincipal(pe)
  return m ? (volumen[m as keyof MuscleVolume] ?? 0) : 0
}

/** Dos ejercicios se pueden encadenar si no se pisan el músculo. */
export function sePuedenEncadenar(a: PlannedExercise, b: PlannedExercise): boolean {
  if (a.primary === 'cardio' || b.primary === 'cardio') return false
  if (a.supersetId || b.supersetId) return false
  if (a.primary === b.primary) return false
  // Y tampoco si comparten el músculo que más trabajan: «espalda» y «brazo» son
  // grupos distintos, pero un remo y un curl se disputan el bíceps.
  //
  // Si de alguno no se conoce el músculo fino —un ejercicio traído de fuera, o
  // uno del catálogo sin reparto—, basta con que los grupos sean distintos: no
  // saber algo no es motivo para negarse.
  const ma = musculoPrincipal(a)
  const mb = musculoPrincipal(b)
  if (ma === null || mb === null) return true
  return ma !== mb
}

/**
 * Ajusta la sesión al tiempo disponible.
 *
 * Devuelve siempre una sesión entrenable: si ni encadenando ni recortando se
 * llega al presupuesto, se entrega lo más corto que se ha conseguido y se avisa
 * con `seQuedaLargo`. Mentir sobre la duración sería peor que quedarse largo.
 */
export function ajustarATiempo(
  exercises: PlannedExercise[],
  minutos: number,
  opts: OpcionesDeTiempo & { volumenSemanal?: MuscleVolume; seriesMinimas?: number }
): Recorte {
  const minimo = opts.seriesMinimas ?? 2
  const minutosAntes = duracionEstimada(exercises, opts)
  let actual = exercises.map((e) => ({ ...e }))
  const ajustes: Ajuste[] = []

  if (minutosAntes <= minutos) {
    return { exercises: actual, minutos: minutosAntes, minutosAntes, ajustes, seQuedaLargo: false }
  }

  // ── 1. Encadenar lo que no compite ────────────────────────
  let n = 0
  for (let i = 0; i < actual.length && duracionEstimada(actual, opts) > minutos; i++) {
    for (let j = i + 1; j < actual.length; j++) {
      if (!sePuedenEncadenar(actual[i], actual[j])) continue
      const id = `ss-tiempo-${++n}`
      actual[i] = { ...actual[i], supersetId: id }
      actual[j] = { ...actual[j], supersetId: id }
      ajustes.push({
        tipo: 'superserie',
        texto: `${actual[i].name} y ${actual[j].name}, encadenados`
      })
      break
    }
  }

  // ── 2. Quitar series por donde menos duele ────────────────
  while (duracionEstimada(actual, opts) > minutos) {
    // El candidato: el que más volumen acumulado tiene y todavía puede ceder.
    let elegido = -1
    let masCarga = -1
    actual.forEach((pe, i) => {
      if (pe.primary === 'cardio' || pe.plan.sets <= minimo) return
      const carga = cargaAcumulada(pe, opts.volumenSemanal)
      if (carga > masCarga) {
        masCarga = carga
        elegido = i
      }
    })
    if (elegido === -1) {
      return {
        exercises: actual,
        minutos: duracionEstimada(actual, opts),
        minutosAntes,
        ajustes,
        seQuedaLargo: true
      }
    }
    const pe = actual[elegido]
    actual[elegido] = { ...pe, plan: { ...pe.plan, sets: pe.plan.sets - 1 } }
    const ya = ajustes.find((a) => a.tipo === 'serie' && a.texto.startsWith(pe.name))
    if (ya) {
      const cuantas = Number(ya.texto.match(/−(\d+)/)?.[1] ?? 1) + 1
      ya.texto = `${pe.name}: −${cuantas} series`
    } else {
      ajustes.push({ tipo: 'serie', texto: `${pe.name}: −1 serie` })
    }
  }

  return {
    exercises: actual,
    minutos: duracionEstimada(actual, opts),
    minutosAntes,
    ajustes,
    seQuedaLargo: false
  }
}

/** El ajuste, contado en una frase. */
export function explicarRecorte(r: Recorte): string {
  if (r.ajustes.length === 0) {
    return `Cabe entero: unos ${r.minutos} minutos.`
  }
  const encadenados = r.ajustes.filter((a) => a.tipo === 'superserie').length
  const recortados = r.ajustes.filter((a) => a.tipo === 'serie').length
  const partes: string[] = []
  if (encadenados > 0) {
    partes.push(
      `${encadenados} ${encadenados === 1 ? 'pareja encadenada' : 'parejas encadenadas'} en superserie`
    )
  }
  if (recortados > 0) {
    partes.push(
      `${recortados} ${recortados === 1 ? 'ejercicio' : 'ejercicios'} con menos series, empezando por lo que más trabajado llevas`
    )
  }
  const cola = r.seQuedaLargo
    ? ` Aun así se va a unos ${r.minutos} minutos: menos que esto ya no sería un entreno.`
    : ''
  return `De ${r.minutosAntes} a ${r.minutos} minutos: ${partes.join(' y ')}.${cola}`
}
