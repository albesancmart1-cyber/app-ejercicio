/**
 * El mes, contado.
 *
 * Lo que hay en la app responde bien al día de hoy —qué toca, cómo está el
 * cuerpo— y al ejercicio suelto —tus marcas, tu progresión—, pero no a la
 * pregunta que uno se hace el día 1: **«¿qué tal el mes pasado?»**. Para eso
 * hace falta mirar de más lejos, y sobre todo comparar con el mes anterior: una
 * cifra sola no dice si está bien o mal, y la de al lado sí.
 *
 * Se cuenta lo que se hizo, sin juzgarlo. Ningún objetivo mensual, ninguna
 * medalla por cumplir cuota: el mes que uno descansa más es a veces el mes que
 * más falta le hacía, y una app que lo pinte en rojo está mintiendo.
 */
import { seriesEfectivas, volumenDe, type MuscleVolume } from './volume'
import { recordsDeLaSesion, seriesQueCuentan, type TipoMarca } from './records'
import type { Muscle } from './muscles'
import type { Session } from './types'
import { escribirNumero } from './numeros'

export interface Periodo {
  /** ISO yyyy-mm-dd, incluido. */
  desde: string
  /** ISO yyyy-mm-dd, incluido. */
  hasta: string
}

export interface RecordDelMes {
  exerciseId: string
  name: string
  fecha: string
  tipos: TipoMarca[]
}

export interface EjercicioMasHecho {
  exerciseId: string
  name: string
  /** En cuántos entrenos apareció. */
  dias: number
  /** Series de trabajo registradas. */
  series: number
}

export interface Estadisticas {
  periodo: Periodo
  entrenos: number
  /** Días distintos con algo registrado. Dos sesiones el mismo día son un día. */
  diasEntrenados: number
  /** Minutos cronometrados. Solo cuentan los entrenos que se cronometraron. */
  minutos: number
  /** Cuántos de esos entrenos traían cronómetro, para poder decirlo. */
  entrenosCronometrados: number
  /** Series efectivas: el calentamiento no suma y el drop set suma medio. */
  series: number
  repeticiones: number
  /** Kilos levantados: peso × repeticiones, sumado. */
  cargaTotal: number
  cardioMinutos: number
  porMusculo: Partial<MuscleVolume>
  records: RecordDelMes[]
  masHechos: EjercicioMasHecho[]
  /** Entrenos por semana de media, sobre los días que tiene el periodo. */
  porSemana: number
  /** Semanas del periodo en las que se entrenó al menos una vez. */
  semanasConEntreno: number
  semanas: number
}

const DIA = 86400000

function aFecha(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

export function diasDelPeriodo(p: Periodo): number {
  return Math.round((aFecha(p.hasta) - aFecha(p.desde)) / DIA) + 1
}

/** El mes al que pertenece una fecha, de su día 1 a su último día. */
export function mesDe(iso: string): Periodo {
  const [a, m] = iso.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { desde: `${a}-${mm}-01`, hasta: `${a}-${mm}-${String(ultimo).padStart(2, '0')}` }
}

/** El mes anterior al de esta fecha. */
export function mesAnterior(iso: string): Periodo {
  const [a, m] = iso.split('-').map(Number)
  return mesDe(m === 1 ? `${a - 1}-12-01` : `${a}-${String(m - 1).padStart(2, '0')}-01`)
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
]

/** «marzo de 2026». */
export function nombreDeMes(iso: string): string {
  const [a, m] = iso.split('-').map(Number)
  return `${MESES[m - 1]} de ${a}`
}

/** Los meses con algo registrado, del más reciente al más antiguo. */
export function mesesConDatos(sessions: Session[]): string[] {
  const meses = new Set(
    sessions.filter((s) => s.completed).map((s) => s.date.slice(0, 7))
  )
  return [...meses].sort().reverse()
}

function enPeriodo(s: Session, p: Periodo): boolean {
  return s.completed && s.date >= p.desde && s.date <= p.hasta
}

/**
 * Cuántas semanas del periodo tuvieron al menos un entreno.
 *
 * Las semanas se cuentan **desde el primer día del periodo**, no por el
 * calendario: para un mes que empieza en jueves, medir contra los lunes daría
 * dos semanas partidas que ensucian la media sin decir nada.
 */
function semanasDe(sesiones: Session[], p: Periodo): { semanas: number; con: number } {
  const semanas = Math.max(1, Math.ceil(diasDelPeriodo(p) / 7))
  const tocadas = new Set<number>()
  for (const s of sesiones) {
    tocadas.add(Math.floor((aFecha(s.date) - aFecha(p.desde)) / DIA / 7))
  }
  return { semanas, con: tocadas.size }
}

export function estadisticasDe(
  sessions: Session[],
  periodo: Periodo,
  /** Todo el historial, para saber qué del periodo fue récord. Por defecto, `sessions`. */
  historia: Session[] = sessions
): Estadisticas {
  const dentro = sessions.filter((s) => enPeriodo(s, periodo)).sort((a, b) => (a.date < b.date ? -1 : 1))

  const porMusculo: Partial<MuscleVolume> = {}
  const cuenta = new Map<string, EjercicioMasHecho>()
  const records: RecordDelMes[] = []

  let series = 0
  let repeticiones = 0
  let cargaTotal = 0
  let minutos = 0
  let entrenosCronometrados = 0
  let cardioMinutos = 0

  for (const s of dentro) {
    if (s.durationSec) {
      minutos += s.durationSec / 60
      entrenosCronometrados++
    }
    if (s.cardioMinutes) cardioMinutos += s.cardioMinutes

    for (const pe of s.exercises) {
      for (const [m, v] of Object.entries(volumenDe(pe)) as [Muscle, number][]) {
        porMusculo[m] = (porMusculo[m] ?? 0) + v
      }
      if (pe.primary === 'cardio') continue

      const hechas = seriesQueCuentan(pe.logs)
      if (hechas.length === 0) continue
      series += seriesEfectivas(pe)
      for (const l of hechas) {
        repeticiones += l.reps ?? 0
        if (typeof l.weightKg === 'number' && typeof l.reps === 'number') {
          cargaTotal += l.weightKg * l.reps
        }
      }
      const ya = cuenta.get(pe.exerciseId)
      if (ya) {
        ya.dias++
        ya.series += hechas.length
      } else {
        cuenta.set(pe.exerciseId, {
          exerciseId: pe.exerciseId,
          name: pe.name,
          dias: 1,
          series: hechas.length
        })
      }
    }

    for (const r of recordsDeLaSesion(s, historia)) {
      records.push({ ...r, fecha: s.date })
    }
  }

  for (const m of Object.keys(porMusculo) as Muscle[]) {
    porMusculo[m] = Math.round(porMusculo[m]! * 2) / 2
  }

  const { semanas, con } = semanasDe(dentro, periodo)

  return {
    periodo,
    entrenos: dentro.length,
    diasEntrenados: new Set(dentro.map((s) => s.date)).size,
    minutos: Math.round(minutos),
    entrenosCronometrados,
    series: Math.round(series * 2) / 2,
    repeticiones,
    cargaTotal: Math.round(cargaTotal),
    cardioMinutos,
    porMusculo,
    records,
    masHechos: [...cuenta.values()].sort((a, b) => b.dias - a.dias || b.series - a.series),
    porSemana: Math.round((dentro.length / semanas) * 10) / 10,
    semanasConEntreno: con,
    semanas
  }
}

/**
 * Cuánto ha cambiado una cifra respecto al mes anterior, en tanto por ciento.
 *
 * Sin mes anterior no hay comparación —y decir «+100 %» porque antes no había
 * nada sería un número inventado—, así que se devuelve `undefined` y quien lo
 * pinta se calla.
 */
export function variacion(ahora: number, antes: number): number | undefined {
  if (antes <= 0) return undefined
  return Math.round(((ahora - antes) / antes) * 100)
}

/** «+12 %», «−8 %», «igual». */
export function formatVariacion(v: number | undefined): string | undefined {
  if (v === undefined) return undefined
  if (v === 0) return 'igual'
  return `${v > 0 ? '+' : '−'}${Math.abs(v)} %`
}

/**
 * El mes en una frase. Describe, no felicita ni regaña: la cifra ya está
 * arriba, y lo que hace falta es saber qué significa.
 */
export function resumirMes(e: Estadisticas, previo?: Estadisticas): string {
  if (e.entrenos === 0) {
    return 'Este mes no hay entrenos registrados. A veces toca, y el mes que viene sigue estando ahí.'
  }
  const partes: string[] = [
    `${e.entrenos} ${e.entrenos === 1 ? 'entreno' : 'entrenos'} en ${e.diasEntrenados} ${
      e.diasEntrenados === 1 ? 'día' : 'días'
    }, ${escribirNumero(e.porSemana)} por semana de media`
  ]
  if (e.series > 0) partes.push(`${escribirNumero(e.series)} series`)
  if (e.cargaTotal > 0) partes.push(`${e.cargaTotal.toLocaleString('es-ES')} kg movidos`)

  const frase = `${partes.join(' · ')}.`
  if (!previo || previo.entrenos === 0) return frase

  const v = variacion(e.entrenos, previo.entrenos)
  if (v === undefined || v === 0) return `${frase} Los mismos entrenos que el mes pasado.`
  return v > 0
    ? `${frase} ${v} % más entrenos que el mes pasado.`
    : `${frase} ${Math.abs(v)} % menos entrenos que el mes pasado, que también es información.`
}
