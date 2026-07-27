import type { MuscleGroup, Profile, Recommendation, Session } from './types'
import { MUSCLE_LABELS } from './types'
import type { Readiness } from './readiness'
import {
  computeBalance,
  consecutiveStrengthSessions,
  consecutiveTrainingDays,
  daysBetween,
  daysSinceLastSession,
  neglectedGroups,
  recentlyWorked,
  weeklySets
} from './muscleBalance'
import {
  LONG_BREAK_DAYS,
  MUSCLE_RECOVERY_DAYS,
  REENTRY_VOLUME_SCALE,
  WEEKLY_SETS,
  ketoAdaptationWeeksLeft,
  reentrySteps,
  targetRir,
  type Intensity
} from './protocol'

/** Sesiones de rodaje para quien empieza de cero. */
const BEGINNER_RAMP = 3

export interface ReentryState {
  step: number
  total: number
  scale: number
  /** Días de parón que originaron esta vuelta progresiva (0 si es un inicio). */
  breakDays: number
}

/**
 * ¿Estamos volviendo de un parón? Devuelve en qué paso de la rampa progresiva
 * estamos (regla 50/30/20/10 de la CSCCa/NSCA) o null si el entrenamiento
 * ya está establecido.
 */
export function reentryState(sessions: Session[], todayIso: string): ReentryState | null {
  const dates = sessions
    .filter((s) => s.completed && daysBetween(s.date, todayIso) >= 0)
    .map((s) => s.date)
    .sort()

  // Nunca ha entrenado: rodaje desde cero.
  if (dates.length === 0) {
    return { step: 1, total: BEGINNER_RAMP, scale: REENTRY_VOLUME_SCALE[0], breakDays: 0 }
  }

  // Parón en curso: la última sesión queda lejos.
  const daysSince = daysBetween(dates[dates.length - 1], todayIso)
  if (daysSince > LONG_BREAK_DAYS) {
    return { step: 1, total: reentrySteps(daysSince), scale: REENTRY_VOLUME_SCALE[0], breakDays: daysSince }
  }

  // Vuelta ya iniciada: ¿cuántas sesiones llevamos desde el último parón largo?
  for (let i = dates.length - 1; i > 0; i--) {
    const gap = daysBetween(dates[i - 1], dates[i])
    if (gap > LONG_BREAK_DAYS) {
      const done = dates.length - i // sesiones completadas desde que volvió
      const total = reentrySteps(gap)
      if (done < total) {
        return { step: done + 1, total, scale: REENTRY_VOLUME_SCALE[done] ?? 1, breakDays: gap }
      }
      return null
    }
  }

  // Sin parones en el historial, pero aún con pocas sesiones: seguimos rodando.
  if (dates.length < BEGINNER_RAMP) {
    return {
      step: dates.length + 1,
      total: BEGINNER_RAMP,
      scale: REENTRY_VOLUME_SCALE[dates.length] ?? 1,
      breakDays: 0
    }
  }
  return null
}

/**
 * Decide qué le conviene al cuerpo hoy. Reglas en cascada, de la más protectora
 * a la más exigente:
 *  1. Disposición baja → descanso activo.
 *  2. Tres días seguidos entrenando → descanso activo.
 *  3. Vuelta de un parón → rampa progresiva de volumen.
 *  4. Dos sesiones de fuerza seguidas → cardio.
 *  5. Fuerza, priorizando grupos descompensados y respetando 48 h de recuperación.
 */
export function recommend(
  profile: Profile,
  readiness: Readiness,
  sessions: Session[],
  todayIso: string,
  volume?: Recommendation['volume']
): Recommendation {
  // El nivel de volumen viaja con toda recomendación, también con las de cardio
  // o descanso: si luego el usuario pide pesas, el nivel alcanzado sigue ahí.
  return { ...decidir(profile, readiness, sessions, todayIso, volume), volume }
}

function decidir(
  profile: Profile,
  readiness: Readiness,
  sessions: Session[],
  todayIso: string,
  volume?: Recommendation['volume']
): Recommendation {
  const reasons: string[] = []
  const daysSince = daysSinceLastSession(sessions, todayIso)
  const balance = computeBalance(sessions, todayIso)
  const week = weeklySets(sessions, todayIso)
  const reentry = reentryState(sessions, todayIso)
  const canCardioOut = profile.equipment.includes('correr') || profile.equipment.includes('bici')
  const ketoWeeksLeft = ketoAdaptationWeeksLeft(profile.ketoSince, todayIso)
  const ketoAdapting = ketoWeeksLeft > 0 && readiness.keto

  if (ketoAdapting) {
    reasons.push(
      `Llevas poco en cetosis (quedan ~${ketoWeeksLeft} semanas de adaptación): el trabajo muy exigente aún cuesta más de lo normal.`
    )
  }

  // ── 1. El cuerpo no está para exigirle ──────────────────────
  if (readiness.level === 'bajo') {
    reasons.push(`Tu disposición hoy es de ${readiness.score}/100, sobre todo por descanso y energía.`)
    reasons.push('Entrenar fuerte con poca recuperación suma fatiga, no adaptación.')
    return {
      kind: 'descanso_activo',
      title: 'Descanso activo',
      message:
        'Hoy tu cuerpo pide recuperar, y eso también es entrenar. Un paseo tranquilo, movilidad suave y a otra cosa. Descansar cuando toca es justo lo que hace que el entreno funcione.',
      focus: ['cardio'],
      intensity: 'suave',
      cardioMinutes: 20,
      volumeScale: 0.5,
      rir: 5,
      reasons,
      ketoAdapting
    }
  }

  // ── 2. Demasiados días seguidos ─────────────────────────────
  const streak = consecutiveTrainingDays(sessions, todayIso)
  if (streak >= 3 && readiness.level !== 'alto') {
    reasons.push(`Llevas ${streak} días seguidos entrenando.`)
    reasons.push('Un día de respiro deja que el músculo aproveche lo que ya has hecho.')
    return {
      kind: 'descanso_activo',
      title: 'Día de respiro',
      message:
        `Llevas ${streak} días seguidos moviéndote y eso está muy bien. Hoy toca dejar que el cuerpo asimile: paseo suave, movilidad, y mañana volvemos con más ganas.`,
      focus: ['cardio'],
      intensity: 'suave',
      cardioMinutes: 20,
      volumeScale: 0.5,
      rir: 5,
      reasons,
      ketoAdapting
    }
  }

  // ── 3. Vuelta progresiva tras un parón ──────────────────────
  const recovering = recentlyWorked(sessions, todayIso, MUSCLE_RECOVERY_DAYS)
  const saturated = (Object.keys(week) as MuscleGroup[]).filter(
    (g) => g !== 'cardio' && week[g] >= WEEKLY_SETS.techo
  )
  const exclude = [...new Set([...readiness.avoid, ...recovering, ...saturated])]

  // Solo el primer paso cambia la modalidad de la sesión; los siguientes se limitan
  // a moderar el volumen dentro de la cascada normal.
  if (reentry && reentry.step === 1) {
    const pct = Math.round(reentry.scale * 100)
    if (reentry.breakDays > 0) {
      reasons.push(`Llevabas ${reentry.breakDays} días sin entrenar.`)
      reasons.push(
        `Tras un parón, la recomendación es volver al ${pct} % del volumen habitual e ir subiendo (paso ${reentry.step} de ${reentry.total}).`
      )
      reasons.push('Tu musculatura recupera lo perdido mucho más rápido de lo que costó ganarlo.')
    } else {
      reasons.push(`Estás empezando: sesión ${reentry.step} de ${reentry.total} de rodaje, al ${pct} % de volumen.`)
      reasons.push('Empezar por debajo de tus posibilidades es lo que evita agujetas que te dejen tirado.')
    }

    // Con parones muy largos, arrancamos por el corazón antes que por la carga.
    if (reentry.step === 1 && reentry.breakDays > 21 && canCardioOut) {
      return {
        kind: 'reacondicionamiento',
        title: 'Reacondicionamiento suave',
        message:
          `Después de ${reentry.breakDays} días parado, lo que mejor le sienta al cuerpo es volver por el lado tranquilo: un rato de cardio suave y algo de movimiento con poco peso. Nada de agujetas de tres días.`,
        focus: neglectedGroups(balance, readiness.avoid).slice(0, 3),
        intensity: 'suave',
        cardioMinutes: 20,
        volumeScale: reentry.scale,
        rir: targetRir({ reentryStep: reentry.step, intensity: 'suave' }),
        reasons,
        reentry: { step: reentry.step, total: reentry.total },
        ketoAdapting
      }
    }

    const focus = pickFocus(balance, exclude, readiness.avoid)
    return {
      kind: 'reacondicionamiento',
      title: 'Vuelta progresiva',
      message:
        reentry.breakDays > 0
          ? `Volvemos poco a poco: hoy trabajamos todo el cuerpo con un volumen reducido, dejando ${targetRir({ reentryStep: reentry.step, intensity: 'suave' })} repeticiones en reserva. Vas a acabar con sensación de "podría haber hecho más", y eso es exactamente lo que buscamos.`
          : 'Sesión de rodaje: movimientos sencillos, poco volumen y lejos del fallo, para que el cuerpo coja el hábito sin castigo.',
      focus,
      intensity: 'suave',
      volumeScale: reentry.scale,
      rir: targetRir({ reentryStep: reentry.step, intensity: 'suave' }),
      reasons,
      reentry: { step: reentry.step, total: reentry.total },
      ketoAdapting
    }
  }

  const volumeScale = reentry?.scale ?? 1
  if (reentry) {
    reasons.push(
      `Sigues en la vuelta progresiva (paso ${reentry.step} de ${reentry.total}): volumen al ${Math.round(reentry.scale * 100)} %.`
    )
  }

  // ── 4. Varias sesiones de fuerza seguidas: toca corazón ─────
  // Solo tiene sentido si venimos de entrenar hace poco; tras varios días de
  // descanso lo que pide el cuerpo es volver a la fuerza.
  const strengthRun = consecutiveStrengthSessions(sessions, todayIso)
  const trainedRecently = daysSince !== null && daysSince <= 3
  if (strengthRun >= 2 && trainedRecently && canCardioOut) {
    const medio = readiness.level === 'alto' && !ketoAdapting
    reasons.push(`Llevas ${strengthRun} sesiones de fuerza seguidas esta semana.`)
    reasons.push('El sistema cardiovascular es parte del cuerpo también: hoy le toca a él.')
    if (balance.cardio < 2) reasons.push('Además, el cardio está bajo en tu balance de las últimas dos semanas.')
    return {
      kind: medio ? 'cardio_medio' : 'cardio_suave',
      title: medio ? 'Día de cardio' : 'Cardio suave',
      message:
        'Hoy le damos aire al corazón y descanso a los músculos. Ritmo en el que puedas mantener una conversación: si no puedes hablar, vas demasiado rápido.',
      focus: ['cardio'],
      intensity: medio ? 'moderada' : 'suave',
      cardioMinutes: medio ? Math.round(35 * volumeScale) : Math.round(25 * volumeScale),
      volumeScale,
      rir: 4,
      reasons,
      reentry: reentry ? { step: reentry.step, total: reentry.total } : undefined,
      ketoAdapting
    }
  }

  // ── 5. Fuerza según lo que más lo necesita ──────────────────
  const focus = pickFocus(balance, exclude, readiness.avoid)

  if (focus.length === 0) {
    reasons.push('Todos tus grupos musculares están o bien trabajados o aún recuperándose.')
    return {
      kind: 'cardio_suave',
      title: 'Movimiento suave',
      message:
        'Has cubierto bien todos los grupos musculares estos días y los que quedan aún se están recuperando. Hoy, movimiento tranquilo y a disfrutar.',
      focus: ['cardio'],
      intensity: 'suave',
      cardioMinutes: 25,
      volumeScale,
      rir: 4,
      reasons,
      ketoAdapting
    }
  }

  let intensity: Intensity = readiness.level === 'alto' ? 'media-alta' : 'moderada'
  if (ketoAdapting && intensity === 'media-alta') intensity = 'moderada'
  if (reentry && intensity === 'media-alta') intensity = 'moderada'

  const primaryLabel = MUSCLE_LABELS[focus[0]].toLowerCase()
  reasons.push(`Disposición ${readiness.score}/100: tu cuerpo admite trabajo de fuerza.`)
  reasons.push(`${cap(primaryLabel)} es lo que menos has trabajado estas dos semanas, así que abre la sesión.`)
  if (recovering.length > 0) {
    reasons.push(
      `Dejamos descansar ${recovering.map((g) => MUSCLE_LABELS[g].toLowerCase()).join(', ')}: entrenaste esa zona hace menos de 48 h.`
    )
  }
  if (readiness.keto) {
    reasons.push('Con cetosis evitamos series de muchísimas repeticiones y alargamos los descansos.')
  }
  const rir = targetRir(reentry ? { reentryStep: reentry.step, intensity } : { intensity })
  reasons.push(`Nos quedamos a ${rir} repeticiones del fallo: mismo estímulo, mucha menos fatiga.`)
  // Si el volumen ha cambiado de nivel, se dice aquí mismo y no en letra pequeña.
  if (volume && volume.changes.length > 0) reasons.push(...volume.changes)

  return {
    kind: 'fuerza',
    title: `Fuerza · ${primaryLabel}`,
    message:
      readiness.level === 'alto'
        ? `Tu cuerpo está receptivo. Empezamos por ${primaryLabel}, que es lo que más lo necesita, y completamos con lo que mejor equilibra la semana.`
        : `Sesión de fuerza tranquila abriendo por ${primaryLabel}. Sin buscar el fallo: lo justo para estimular sin que mañana lo notes de más.`,
    focus,
    intensity,
    volumeScale,
    rir,
    reasons,
    reentry: reentry ? { step: reentry.step, total: reentry.total } : undefined,
    ketoAdapting,
    volume
  }
}

/**
 * «Hoy quiero pesas, no un paseo.» Convierte la recomendación en algo más
 * exigente sin saltarse los guardas: nunca se acerca al fallo, respeta las
 * molestias y las 48 h de recuperación, y mantiene el volumen reducido si
 * estamos en una vuelta progresiva. La decisión es del usuario; el trabajo de
 * la app es que esa decisión no le pase factura.
 */
export function withMoreIntensity(
  base: Recommendation,
  profile: Profile,
  readiness: Readiness,
  sessions: Session[],
  todayIso: string
): Recommendation {
  const balance = computeBalance(sessions, todayIso)
  const recovering = recentlyWorked(sessions, todayIso, MUSCLE_RECOVERY_DAYS)
  const reentry = reentryState(sessions, todayIso)
  const focus = pickFocus(balance, [...readiness.avoid, ...recovering], readiness.avoid)

  // Un escalón por encima de lo que tocaba, con techo según el estado real.
  let intensity: Intensity
  if (readiness.level === 'bajo') intensity = 'suave'
  else if (base.intensity === 'suave') intensity = 'moderada'
  else if (base.intensity === 'moderada') intensity = readiness.level === 'alto' ? 'media-alta' : 'moderada'
  else intensity = 'media-alta'
  if (base.ketoAdapting && intensity === 'media-alta') intensity = 'moderada'
  if (reentry && intensity === 'media-alta') intensity = 'moderada'

  const rir = Math.max(2, targetRir(reentry ? { reentryStep: reentry.step, intensity } : { intensity }))

  const reasons = [
    'Has pedido tú subir el listón, así que lo subimos.',
    `Lo que tocaba era «${base.title.toLowerCase()}», y ese motivo sigue ahí.`,
    `Por eso lo hacemos con pesas pero a intensidad ${intensity}, dejando ${rir} repeticiones en reserva.`,
    ...base.reasons.filter((r) => r.includes('molestias') || r.includes('recuperación') || r.includes('48'))
  ]
  if (readiness.level === 'bajo') {
    reasons.push('Con tu disposición de hoy no subo de suave: mover peso sí, machacarte no.')
  }
  if (recovering.length > 0) {
    reasons.push(
      `Seguimos dejando descansar ${recovering.map((g) => MUSCLE_LABELS[g].toLowerCase()).join(', ')}.`
    )
  }

  const primary = focus[0]
  return {
    kind: 'fuerza',
    title: primary ? `Fuerza suave · ${MUSCLE_LABELS[primary].toLowerCase()}` : 'Fuerza suave',
    message:
      readiness.level === 'bajo'
        ? 'Vamos con pesas, pero de verdad ligeras y sin acercarnos al fallo. Si a mitad notas que no toca, dejarlo también es ganar.'
        : 'Pesas en vez de caminata, con carga contenida y lejos del fallo. Suficiente para sentir que has entrenado, sin la factura de mañana.',
    focus: focus.length > 0 ? focus : base.focus.filter((g) => g !== 'cardio'),
    intensity,
    volumeScale: reentry?.scale ?? (readiness.level === 'bajo' ? 0.7 : 1),
    rir,
    reasons,
    reentry: reentry ? { step: reentry.step, total: reentry.total } : undefined,
    ketoAdapting: base.ketoAdapting,
    userOverride: true,
    // El nivel de volumen alcanzado sigue siendo el mismo: pedir pesas un día
    // que tocaba paseo no borra lo que el cuerpo lleva demostrando. La rampa y
    // el `volumeScale` de arriba ya se encargan de contener la carga.
    volume: base.volume
  }
}

/** ¿Tiene sentido ofrecer la opción de subir el listón? */
export function canIntensify(rec: Recommendation): boolean {
  return rec.kind !== 'fuerza' || rec.intensity !== 'media-alta'
}

/**
 * Elige los grupos de la sesión: primero los descompensados que estén disponibles;
 * si la recuperación deja fuera a todos, se relaja el filtro antes que no entrenar.
 */
function pickFocus(
  balance: ReturnType<typeof computeBalance>,
  exclude: MuscleGroup[],
  avoid: MuscleGroup[]
): MuscleGroup[] {
  const available = neglectedGroups(balance, exclude)
  if (available.length >= 2) return available.slice(0, 3)
  // Solo las molestias son innegociables.
  const relaxed = neglectedGroups(balance, avoid)
  return relaxed.slice(0, 3)
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
