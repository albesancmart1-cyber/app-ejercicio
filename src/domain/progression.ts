/**
 * Cuánto volumen toca, y por qué.
 *
 * La carga sola no basta: llega un punto en que subir peso sin subir volumen
 * deja de producir adaptación. Pero subir volumen por calendario es la forma
 * más rápida de acabar reventado, así que aquí solo se sube cuando **el cuerpo
 * demuestra que asimila lo que ya hace** y hay motivo para pedirle más.
 *
 * Las tres señales que se miran, en este orden:
 *
 * 1. **¿Asimilas?** Sesiones completadas enteras, llegando al rango de
 *    repeticiones prescrito y con sensación cómoda. Si no, no se sube nada.
 * 2. **¿Hace falta?** Si la composición corporal va bien, no se toca lo que
 *    funciona. Si está estancada, es cuando tiene sentido pedir más.
 * 3. **¿Puedes?** Con la recuperación tocada —mal descanso, señal de leptina
 *    baja— se baja, aunque las otras dos digan que sí.
 *
 * Las palancas se usan en el orden que menos estrés añade por unidad de
 * estímulo: primero una serie más, luego un ejercicio más, y solo al final se
 * cambia el rango de repeticiones para variar el estímulo.
 *
 * El techo es el de siempre: 20 series semanales por grupo (`WEEKLY_SETS.techo`).
 */
import { computeLeptinSignal } from './leptin'
import { daysBetween } from './muscleBalance'
import { parseRepRange } from './setLogs'
import { BASE_SETS } from './protocol'
import type { CheckIn, Profile, Session } from './types'

export type VolumeLevel = 1 | 2 | 3 | 4

export interface VolumePlan {
  level: VolumeLevel
  /** Series por ejercicio en una sesión normal. */
  setsPerExercise: number
  /** Ejercicios de fuerza, sin contar el de core. */
  exercisesPerSession: number
  /**
   * Cuántos músculos distintos abre la sesión. Con menos músculos y los mismos
   * ejercicios, a cada uno le tocan más series: es la palanca que mete un músculo
   * en su banda productiva en vez de dejarlo rozando el mínimo.
   */
  focusMuscles: number
  /** Variación del rango de repeticiones para cambiar el estímulo. */
  repBias: 'normal' | 'variado'
  /** Qué ha cambiado respecto al nivel anterior, en lenguaje llano. */
  changes: string[]
  /** Por qué se está en este nivel. */
  reason: string
  /** Señales que sostienen la decisión, para el desplegable de detalle. */
  evidence: string[]
}

/**
 * Cada nivel, con la palanca que añade respecto al anterior.
 *
 * `focusMuscles` —cuántos músculos distintos abre la sesión— entra aquí porque
 * medido por músculo es la palanca que más manda, y no la que parecía. La
 * intuición decía concentrar: menos músculos, más series a cada uno, para meter
 * alguno en la banda de 10 a 20 series semanales donde el volumen rinde
 * (Schoenfeld). Simulando seis meses con `scripts/medir-rampas.mjs` sale lo
 * contrario: con las mismas 25 series de sesión, abrir cinco músculos deja 16 de
 * 19 por encima de su mínimo y 5 en su banda productiva, y abrir solo tres deja
 * 14 y 3. Concentrar reparte peor sin dar más profundidad, porque el que se
 * queda fuera hoy tampoco entra mañana.
 *
 * Así que la rampa ensancha en vez de estrechar. Y cada escalón sube volumen de
 * verdad: antes el nivel 4 era idéntico al 3 salvo el rango de repeticiones, con
 * lo que el último escalón no subía nada.
 */
const NIVELES: Record<VolumeLevel, Omit<VolumePlan, 'changes' | 'reason' | 'evidence' | 'level'>> = {
  1: { setsPerExercise: BASE_SETS, exercisesPerSession: 4, focusMuscles: 4, repBias: 'normal' },
  2: { setsPerExercise: BASE_SETS + 1, exercisesPerSession: 4, focusMuscles: 4, repBias: 'normal' },
  3: { setsPerExercise: BASE_SETS + 1, exercisesPerSession: 5, focusMuscles: 5, repBias: 'normal' },
  4: { setsPerExercise: BASE_SETS + 2, exercisesPerSession: 5, focusMuscles: 5, repBias: 'variado' }
}

const CAMBIO_AL_SUBIR: Record<VolumeLevel, string[]> = {
  1: [],
  2: [`Una serie más por ejercicio: de ${BASE_SETS} a ${BASE_SETS + 1}.`],
  3: ['Un ejercicio más por sesión: de 4 a 5, y una zona más que atender, para que no se quede nada sin tocar.'],
  4: [`Otra serie más por ejercicio: de ${BASE_SETS + 1} a ${BASE_SETS + 2}, y rango de repeticiones variado.`]
}

/**
 * Todo lo que difiere del volumen base, no solo el último escalón: si se sube
 * de golpe del nivel 1 al 3, la serie extra no puede pasar en silencio.
 */
function cambiosAcumulados(nivel: VolumeLevel): string[] {
  const lista: string[] = []
  for (let n = 2; n <= nivel; n++) lista.push(...CAMBIO_AL_SUBIR[n as VolumeLevel])
  return lista
}

/**
 * Sesiones limpias que hacen falta por escalón. Deliberadamente lento: a dos
 * entrenos por semana son tres semanas por nivel, que es tiempo de sobra para
 * que se note si el volumen anterior se estaba asimilando de verdad.
 */
const SESIONES_POR_NIVEL = 6

/** Series de trabajo que suma una sesión completa en este nivel. */
export function seriesPorSesion(nivel: VolumeLevel): number {
  const n = NIVELES[nivel]
  return n.setsPerExercise * n.exercisesPerSession
}

/** Sesiones de fuerza completadas en las últimas semanas, de la más reciente hacia atrás. */
function sesionesRecientes(sessions: Session[], todayIso: string, semanas: number): Session[] {
  return sessions
    .filter((s) => {
      if (!s.completed) return false
      if (s.kind !== 'fuerza' && s.kind !== 'reacondicionamiento') return false
      const edad = daysBetween(s.date, todayIso)
      return edad >= 0 && edad < semanas * 7
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/**
 * Una sesión «limpia» es la prueba de que el cuerpo asimila: todas las series
 * marcadas, dentro o por encima del rango de repeticiones, y sin que costara
 * la vida.
 */
export function esSesionLimpia(s: Session): boolean {
  const fuerza = s.exercises.filter((e) => e.primary !== 'cardio' && e.logs && e.logs.length > 0)
  if (fuerza.length === 0) return false

  const todasHechas = fuerza.every((e) => e.logs!.every((l) => l.done))
  if (!todasHechas) return false

  // Si se anotaron repeticiones, deben alcanzar al menos el mínimo del rango.
  const llegaAlRango = fuerza.every((e) => {
    const rango = parseRepRange(e.plan.reps)
    if (!rango) return true
    const conReps = e.logs!.filter((l) => typeof l.reps === 'number')
    if (conReps.length === 0) return true
    return conReps.every((l) => l.reps! >= rango.min)
  })
  if (!llegaAlRango) return false

  // Sensación: 1–2 es que costó demasiado. Sin dato, no penaliza.
  return s.rpe === undefined || s.rpe >= 3
}

export interface ProgressionInput {
  profile: Profile | null
  sessions: Session[]
  checkIns: CheckIn[]
  /** Estado de la composición corporal, si hay datos suficientes. */
  trendState?: 'pocos_datos' | 'recomposicion' | 'progreso' | 'estable' | 'atencion'
  todayIso: string
}

export function volumePlan({
  profile,
  sessions,
  checkIns,
  trendState,
  todayIso
}: ProgressionInput): VolumePlan {
  const recientes = sesionesRecientes(sessions, todayIso, 8)
  const limpias = recientes.filter(esSesionLimpia)
  const ultimasCuatro = recientes.slice(0, 4)
  const limpiasDeLasUltimas = ultimasCuatro.filter(esSesionLimpia).length

  const leptina = computeLeptinSignal(checkIns, todayIso, profile?.goal)
  const recuperacionTocada = leptina.days >= 3 && leptina.level === 'baja'

  const evidence: string[] = []

  // ── ¿Asimilas? ────────────────────────────────────────────
  const asimila = ultimasCuatro.length >= 3 && limpiasDeLasUltimas >= 3
  if (ultimasCuatro.length < 3) {
    evidence.push(`Solo ${ultimasCuatro.length} sesiones de fuerza recientes: aún no hay con qué juzgar.`)
  } else if (asimila) {
    evidence.push(`${limpiasDeLasUltimas} de tus últimas ${ultimasCuatro.length} sesiones salieron completas y sin sufrir.`)
  } else {
    evidence.push(`Solo ${limpiasDeLasUltimas} de tus últimas ${ultimasCuatro.length} sesiones salieron completas: aún no toca pedir más.`)
  }

  // ── ¿Puedes? ──────────────────────────────────────────────
  if (recuperacionTocada) {
    evidence.push('Tu señal de leptina está baja: no es momento de añadir carga, sino de recuperar.')
    const nivel: VolumeLevel = 1
    return {
      level: nivel,
      ...NIVELES[nivel],
      changes: ['Volvemos al volumen base mientras se recupera el descanso.'],
      reason:
        'He bajado el volumen a propósito. Con la recuperación tocada, añadir series no construye músculo: solo acumula fatiga. En cuanto el descanso vuelva a su sitio, subimos otra vez.',
      evidence
    }
  }

  // ── ¿Hace falta? ──────────────────────────────────────────
  // Un nivel por cada `SESIONES_POR_NIVEL` sesiones limpias acumuladas, y el
  // estancamiento de la composición adelanta uno: es justo cuando pedir más
  // tiene sentido.
  let nivel = Math.min(4, 1 + Math.floor(limpias.length / SESIONES_POR_NIVEL)) as VolumeLevel

  if (trendState === 'recomposicion' || trendState === 'progreso') {
    // No se toca lo que funciona.
    nivel = Math.min(nivel, Math.max(1, nivel - 1)) as VolumeLevel
    evidence.push('Tu composición corporal va bien, así que no toco lo que está funcionando.')
  } else if (trendState === 'estable' && asimila) {
    nivel = Math.min(4, nivel + 1) as VolumeLevel
    evidence.push('Llevas semanas estancado y el cuerpo asimila lo que haces: es el momento de pedirle un poco más.')
  }

  // Si las sesiones dejan de salir se baja **un escalón**, no hasta el suelo.
  // Tirar de golpe toda la adaptación acumulada por cuatro sesiones flojas no lo
  // sostiene nada, y además se recupera solo: como el nivel sale de las sesiones
  // limpias de las últimas ocho semanas, si la cosa no mejora seguirá bajando.
  if (!asimila) nivel = Math.max(1, nivel - 1) as VolumeLevel

  const cambios = cambiosAcumulados(nivel)
  const n = NIVELES[nivel]
  const total = seriesPorSesion(nivel)

  let reason: string
  if (nivel === 1) {
    reason = asimila
      ? `Volumen base: ${n.exercisesPerSession} ejercicios y ${n.setsPerExercise} series, ${total} series de trabajo repartidas entre ${n.focusMuscles} zonas. Es la dosis mínima que sostiene el músculo, y de momento no hay motivo para pedir más.`
      : 'Volumen base mientras el cuerpo coge el hábito. Cuando encadenes sesiones completas y sin sufrir, empezaré a subirlo.'
  } else if (nivel === 4) {
    reason = `Nivel máximo de la app: ${n.exercisesPerSession} ejercicios y ${n.setsPerExercise} series —${total} series de trabajo entre ${n.focusMuscles} zonas— con el rango de repeticiones variado. Es el volumen con el que más músculos llegan a su banda productiva sin que la sesión se haga interminable.`
  } else {
    reason = `He subido el volumen porque lo estás asimilando: ${n.exercisesPerSession} ejercicios y ${n.setsPerExercise} series, ${total} series de trabajo entre ${n.focusMuscles} zonas. Si en algún momento las sesiones dejan de salir completas, bajo un escalón solo.`
  }

  return { level: nivel, ...n, changes: cambios, reason, evidence }
}
