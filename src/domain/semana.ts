/**
 * La semana: la unidad que le faltaba a la app.
 *
 * Se saltaba del día al mes, pero el volumen de entrenamiento **se planifica
 * por semanas** —las diez o veinte series por músculo son semanales, no
 * diarias—, así que la pregunta más frecuente de quien progresa no tenía dónde
 * responderse: «¿voy bien esta semana o me falta algo?».
 *
 * Aquí vive el cálculo; las pantallas solo lo pintan.
 */
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from './types'
import { landmarksFor, type LandmarkOpts } from './landmarks'
import { musclesOf, type Region } from './muscles'
import { seriesEfectivas, volumenDe } from './volume'
import { rachaAmable } from './estres'
import type { Session } from './types'

const DIA = 86400000

function aFecha(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function isoDe(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Los siete días que acaban hoy.
 *
 * De hoy hacia atrás y no de lunes a domingo: la pregunta es «¿cómo llevo la
 * semana?», y un lunes por la mañana el calendario diría que no llevas nada
 * cuando en realidad acabas de entrenar el domingo.
 */
export function ultimosSieteDias(todayIso: string): string[] {
  const fin = aFecha(todayIso)
  return Array.from({ length: 7 }, (_, i) => isoDe(fin - (6 - i) * DIA))
}

export type EstadoDia = 'entrenado' | 'descanso' | 'vacio' | 'hoy'

export interface DiaDeLaSemana {
  fecha: string
  /** L, M, X, J, V, S, D. */
  inicial: string
  entrenado: boolean
  esHoy: boolean
  /** Series efectivas de ese día, para dar altura a la barra. */
  series: number
}

const INICIALES = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export function diasDeLaSemana(sessions: Session[], todayIso: string): DiaDeLaSemana[] {
  const hechas = sessions.filter((s) => s.completed)
  return ultimosSieteDias(todayIso).map((fecha) => {
    const delDia = hechas.filter((s) => s.date === fecha)
    const series =
      Math.round(
        delDia.reduce(
          (a, s) =>
            a + s.exercises.filter((pe) => pe.primary !== 'cardio').reduce((b, pe) => b + seriesEfectivas(pe), 0),
          0
        ) * 2
      ) / 2
    return {
      fecha,
      inicial: INICIALES[new Date(`${fecha}T00:00:00Z`).getUTCDay()],
      entrenado: delDia.length > 0,
      esHoy: fecha === todayIso,
      series
    }
  })
}

export interface ZonaDeLaSemana {
  grupo: MuscleGroup
  nombre: string
  series: number
  /** El mínimo que hace falta para que la zona progrese. */
  minimo: number
  /** El máximo que se asimila. */
  maximo: number
  estado: 'corto' | 'bien' | 'pasado'
}

/**
 * Cuánto lleva cada zona esta semana, frente a lo que necesita.
 *
 * Se agrega por zona y no por los diecinueve músculos: en una pantalla de
 * vistazo, diecinueve barras no son información, son un muro. El detalle fino
 * sigue estando en el volumen por músculo.
 */
export function zonasDeLaSemana(
  sessions: Session[],
  todayIso: string,
  opts: LandmarkOpts = {}
): ZonaDeLaSemana[] {
  const dias = new Set(ultimosSieteDias(todayIso))
  const porGrupo = new Map<MuscleGroup, number>()

  for (const s of sessions) {
    if (!s.completed || !dias.has(s.date)) continue
    for (const pe of s.exercises) {
      if (pe.primary === 'cardio') continue
      for (const [musculo, valor] of Object.entries(volumenDe(pe))) {
        const grupo = grupoDeMusculo(musculo as Parameters<typeof grupoDeMusculo>[0])
        porGrupo.set(grupo, (porGrupo.get(grupo) ?? 0) + (valor ?? 0))
      }
    }
  }

  return MUSCLE_GROUPS.filter((g) => g !== 'cardio')
    .map((grupo) => {
      const series = Math.round((porGrupo.get(grupo) ?? 0) * 2) / 2
      // El umbral de la zona es el del músculo más exigente que la compone: si
      // el pectoral pide diez series, el pecho no está cubierto con seis.
      const musculos = musculosDeGrupo(grupo)
      const marcas = musculos.map((m) => landmarksFor(m, opts))
      const minimo = marcas.length > 0 ? Math.max(...marcas.map((l) => l.mev)) : 0
      const maximo = marcas.length > 0 ? Math.max(...marcas.map((l) => l.mrv)) : 0
      return {
        grupo,
        nombre: MUSCLE_LABELS[grupo],
        series,
        minimo,
        maximo,
        estado: series > maximo ? ('pasado' as const) : series >= minimo ? ('bien' as const) : ('corto' as const)
      }
    })
    .sort((a, b) => a.series / Math.max(1, a.minimo) - b.series / Math.max(1, b.minimo))
}

/** De músculo fino a zona gruesa, que es como se enseña en la vista de semana. */
function grupoDeMusculo(musculo: Parameters<typeof musclesOf>[0] extends never ? never : string): MuscleGroup {
  const region = REGION_DE.get(musculo)
  if (!region) return 'core'
  if (region !== 'pierna') return region as MuscleGroup
  if (musculo === 'isquiosurales') return 'femoral'
  if (musculo === 'gastrocnemio' || musculo === 'soleo') return 'gemelo'
  return 'cuadriceps_gluteo'
}

const REGIONES: Region[] = ['pecho', 'espalda', 'hombro', 'brazo', 'pierna', 'core']
const REGION_DE = new Map<string, Region>(
  REGIONES.flatMap((r) => musclesOf(r).map((m) => [m as string, r] as const))
)

function musculosDeGrupo(grupo: MuscleGroup) {
  return REGIONES.flatMap((r) => musclesOf(r)).filter((m) => grupoDeMusculo(m) === grupo)
}

export interface ResumenSemana {
  dias: DiaDeLaSemana[]
  diasEntrenados: number
  /** Series efectivas de los últimos siete días. */
  series: number
  /** Las de la semana anterior, para saber si se va a más o a menos. */
  seriesPrevias: number
  zonas: ZonaDeLaSemana[]
  /** La zona que va más corta, si alguna lo está. */
  masCorta?: ZonaDeLaSemana
  rachaDias: number
}

export function resumenDeSemana(
  sessions: Session[],
  todayIso: string,
  opts: LandmarkOpts = {}
): ResumenSemana {
  const dias = diasDeLaSemana(sessions, todayIso)
  const zonas = zonasDeLaSemana(sessions, todayIso, opts)

  const anterior = new Set(
    ultimosSieteDias(isoDe(aFecha(todayIso) - 7 * DIA))
  )
  const seriesPrevias =
    Math.round(
      sessions
        .filter((s) => s.completed && anterior.has(s.date))
        .reduce(
          (a, s) =>
            a +
            s.exercises
              .filter((pe) => pe.primary !== 'cardio')
              .reduce((b, pe) => b + seriesEfectivas(pe), 0),
          0
        ) * 2
    ) / 2

  const corta = zonas.find((z) => z.estado === 'corto')

  return {
    dias,
    diasEntrenados: dias.filter((d) => d.entrenado).length,
    series: Math.round(dias.reduce((a, d) => a + d.series, 0) * 2) / 2,
    seriesPrevias,
    zonas,
    masCorta: corta,
    rachaDias: rachaAmable(sessions, todayIso).dias
  }
}

/**
 * La semana en una frase. Describe, no regaña: un mes flojo suele ser un mes
 * que hacía falta, y una app que lo pinte en rojo está mintiendo.
 */
export function explicarSemana(r: ResumenSemana): string {
  if (r.diasEntrenados === 0) {
    return 'Esta semana todavía no hay nada registrado. Cuando entrenes, aquí verás lo que llevas y lo que falta.'
  }
  const cuantos = `${r.diasEntrenados} ${r.diasEntrenados === 1 ? 'día' : 'días'} y ${r.series} series`
  if (r.masCorta) {
    return `Llevas ${cuantos}. Lo que va más corto es ${r.masCorta.nombre.toLowerCase()}: ${r.masCorta.series} de ${r.masCorta.minimo} series.`
  }
  return `Llevas ${cuantos}, y todas las zonas están cubiertas. Buena semana.`
}
