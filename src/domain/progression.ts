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
  /** El nivel lo ha puesto el usuario a mano, no la progresión automática. */
  chosenByUser?: boolean
  /** Dónde estaría la app decidiendo ella, para poder comparar. */
  autoLevel?: VolumeLevel
}

export const NIVEL_MAXIMO: VolumeLevel = 4

/**
 * ¿Manda el nivel elegido a mano?
 *
 * Mientras esté puesto y diga algo distinto del automático, sí: tanto para
 * adelantar como para quedarse por debajo, que también es una decisión legítima
 * —hay semanas en las que uno sabe que no quiere más volumen aunque el cuerpo
 * aguante—. Cuando coinciden deja de ser una elección: es el mismo nivel, y
 * seguir marcándolo como «elegido por ti» solo confundiría.
 */
export function overrideVigente(elegido: VolumeLevel | undefined, automatico: VolumeLevel): boolean {
  return elegido !== undefined && elegido !== automatico
}

/** Lo que cambia al ponerse en un nivel, para enseñarlo antes de elegirlo. */
export function resumenDeNivel(nivel: VolumeLevel): {
  nivel: VolumeLevel
  setsPerExercise: number
  exercisesPerSession: number
  focusMuscles: number
  seriesPorSesion: number
  repBias: 'normal' | 'variado'
} {
  const n = NIVELES[nivel]
  return { nivel, ...n, seriesPorSesion: seriesPorSesion(nivel) }
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
 * Qué proporción de la sesión hay que haber hecho para que cuente como asimilada.
 *
 * No es «todo o nada», y esto era un fallo de verdad: exigir que **cada** serie
 * de **cada** ejercicio llegara al mínimo del rango hacía que una sesión de
 * veinte series se cayera entera porque la última se quedó a una repetición. En
 * series rectas con un rango, que las últimas se queden cortas es la forma
 * normal de la fatiga, no un fallo de adaptación. Con ese listón la puerta no se
 * abría nunca y el volumen no subía jamás: el usuario veía «0 de tus últimas 3
 * sesiones» semana tras semana sin saber por qué.
 */
export const PROPORCION_SERIES_HECHAS = 0.85
export const PROPORCION_SERIES_EN_RANGO = 2 / 3

export type MotivoNoLimpia = 'sin_series' | 'series_sin_marcar' | 'repeticiones_cortas' | 'costo_mucho'

export interface RevisionSesion {
  limpia: boolean
  motivo?: MotivoNoLimpia
  /** Series marcadas y planificadas, para poder decirlo con números. */
  hechas: number
  total: number
  /** Series con repeticiones anotadas que llegaron al mínimo del rango. */
  enRango: number
  conReps: number
}

/**
 * Si una sesión demuestra que el cuerpo asimila, y si no, por qué no.
 *
 * El motivo importa tanto como el veredicto: «no sube el volumen» sin decir qué
 * falta es exactamente la queja que destapó lo anterior.
 */
export function revisarSesion(s: Session): RevisionSesion {
  const fuerza = s.exercises.filter((e) => e.primary !== 'cardio' && e.logs && e.logs.length > 0)
  const vacio = { hechas: 0, total: 0, enRango: 0, conReps: 0 }
  if (fuerza.length === 0) return { limpia: false, motivo: 'sin_series', ...vacio }

  const logs = fuerza.flatMap((e) => e.logs!.map((l) => ({ log: l, plan: e.plan })))
  const total = logs.length
  const hechas = logs.filter((x) => x.log.done).length

  const conRango = logs.filter((x) => x.log.done && typeof x.log.reps === 'number' && parseRepRange(x.plan.reps))
  const conReps = conRango.length
  const enRango = conRango.filter((x) => x.log.reps! >= parseRepRange(x.plan.reps)!.min).length

  const cuenta = { hechas, total, enRango, conReps }

  if (hechas / total < PROPORCION_SERIES_HECHAS) {
    return { limpia: false, motivo: 'series_sin_marcar', ...cuenta }
  }
  if (conReps > 0 && enRango / conReps < PROPORCION_SERIES_EN_RANGO) {
    return { limpia: false, motivo: 'repeticiones_cortas', ...cuenta }
  }
  // Sensación: 1–2 es que costó demasiado. Sin dato, no penaliza.
  if (s.rpe !== undefined && s.rpe < 3) return { limpia: false, motivo: 'costo_mucho', ...cuenta }

  return { limpia: true, ...cuenta }
}

/** Una sesión «limpia» es la prueba de que el cuerpo asimila lo que hace. */
export function esSesionLimpia(s: Session): boolean {
  return revisarSesion(s).limpia
}

const EXPLICACION: Record<MotivoNoLimpia, string> = {
  sin_series: 'no llegó a registrarse ninguna serie de fuerza',
  series_sin_marcar: 'quedaron series sin marcar',
  repeticiones_cortas: 'las repeticiones se quedaron por debajo del rango',
  costo_mucho: 'costó más de la cuenta'
}

/** Por qué las últimas sesiones no cuentan, en lenguaje llano. */
export function porQueNoCuentan(sesiones: Session[]): string | null {
  const fallidas = sesiones.map(revisarSesion).filter((r) => !r.limpia)
  if (fallidas.length === 0) return null
  // Se cuenta el motivo más repetido: es el que hay que corregir.
  const cuenta = new Map<MotivoNoLimpia, number>()
  for (const f of fallidas) cuenta.set(f.motivo!, (cuenta.get(f.motivo!) ?? 0) + 1)
  const [motivo] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]
  if (motivo === 'series_sin_marcar') {
    const r = fallidas.find((f) => f.motivo === 'series_sin_marcar')!
    return `En las que no cuentan, ${EXPLICACION[motivo]}: la última vez, ${r.hechas} de ${r.total}. Marcar la serie es lo que me dice que la has hecho.`
  }
  if (motivo === 'repeticiones_cortas') {
    const r = fallidas.find((f) => f.motivo === 'repeticiones_cortas')!
    return `En las que no cuentan, ${EXPLICACION[motivo]}: llegaron ${r.enRango} de ${r.conReps}. Si pasa siempre, el peso va por delante de lo que toca.`
  }
  return `En las que no cuentan, ${EXPLICACION[motivo]}.`
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
    const porQue = porQueNoCuentan(ultimasCuatro)
    if (porQue) evidence.push(porQue)
  }

  // ── ¿Puedes? ──────────────────────────────────────────────
  if (recuperacionTocada) {
    evidence.push('Tu señal de leptina está baja: no es momento de añadir carga, sino de recuperar.')
    // Con un nivel elegido a mano no se baja por la espalda: se respeta y se
    // dice claramente lo que la app haría, con el botón de volver a lo
    // automático a un toque. Bajarlo en silencio sería decidir por el usuario
    // justo después de que él haya decidido.
    const elegido = profile?.volumeLevelOverride
    if (elegido && elegido > 1) {
      return {
        level: elegido,
        ...NIVELES[elegido],
        changes: cambiosAcumulados(elegido),
        chosenByUser: true,
        autoLevel: 1,
        reason: `Mantengo el nivel ${elegido} porque lo has elegido tú, pero con la señal de leptina baja yo bajaría al volumen base: con la recuperación tocada, añadir series no construye músculo, solo acumula fatiga. Tú decides.`,
        evidence
      }
    }
    const nivel: VolumeLevel = 1
    return {
      level: nivel,
      ...NIVELES[nivel],
      changes: ['Volvemos al volumen base mientras se recupera el descanso.'],
      autoLevel: 1,
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

  // ── ¿Lo has decidido tú? ──────────────────────────────────
  // La app va deliberadamente lenta: seis sesiones limpias por escalón. Quien se
  // nota preparado puede adelantarlo, y entonces manda su elección. No es una
  // excepción al criterio, es el criterio: el que entrena eres tú, y la app no
  // tiene forma de saber que llevas años levantando en otro sitio.
  //
  // Se sigue calculando el automático y se enseña al lado, para poder comparar
  // sin discutir. Y en cuanto el automático alcanza al elegido, el adelanto
  // sobra: `overrideVigente` deja de darlo por bueno y la app vuelve a decidir.
  const automatico = nivel
  const elegido = profile?.volumeLevelOverride
  const elegidoPorTi = overrideVigente(elegido, automatico)
  if (elegidoPorTi) nivel = elegido as VolumeLevel

  const cambios = cambiosAcumulados(nivel)
  const n = NIVELES[nivel]
  const total = seriesPorSesion(nivel)

  if (elegidoPorTi) {
    evidence.push(
      automatico < nivel
        ? `Has elegido tú el nivel ${nivel}. Por sesiones limpias yo estaría en el ${automatico}, así que vas por delante de lo que te habría propuesto.`
        : `Has elegido tú el nivel ${nivel}, por debajo del ${automatico} al que habrías llegado.`
    )
    return {
      level: nivel,
      ...n,
      changes: cambios,
      chosenByUser: true,
      autoLevel: automatico,
      reason: `Nivel ${nivel} porque lo has puesto tú: ${n.exercisesPerSession} ejercicios y ${n.setsPerExercise} series, ${total} series de trabajo entre ${n.focusMuscles} zonas. Lo mantengo mientras te salga; si las sesiones dejan de salir completas te lo diré, pero no te lo bajo yo.`,
      evidence
    }
  }

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

  return { level: nivel, ...n, changes: cambios, autoLevel: automatico, reason, evidence }
}
