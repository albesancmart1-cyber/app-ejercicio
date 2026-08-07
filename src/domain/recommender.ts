import type { MuscleGroup, Profile, Recommendation, Session } from './types'
import { MUSCLE_GROUPS, MUSCLE_LABELS } from './types'
import type { Readiness } from './readiness'
import { esfuerzoReciente, explicarEsfuerzo, pideAflojar } from './effort'
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
  CARDIO_EN_SESION_MIXTA,
  CARDIO_MINIMO_MIXTO,
  DIAS_POR_PASO_VUELTA,
  LONG_BREAK_DAYS,
  MUSCLE_RECOVERY_DAYS,
  REENTRY_VOLUME_SCALE,
  WEEKLY_SETS,
  ketoAdaptationWeeksLeft,
  reentrySteps,
  targetRir,
  type Intensity
} from './protocol'
import { elegirFoco, explicarFoco } from './focus'
import type { Foco } from './focus'

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

  // Vuelta ya iniciada: cada paso dura una semana desde que se volvió, no una
  // sesión. Contarlo por sesiones despachaba una rampa de cuatro pasos en once
  // días, y la guía de la CSCCa/NSCA está escrita en semanas justamente porque
  // lo que se readapta despacio es el tejido, no la voluntad.
  for (let i = dates.length - 1; i > 0; i--) {
    const gap = daysBetween(dates[i - 1], dates[i])
    if (gap > LONG_BREAK_DAYS) {
      const semanas = Math.floor(daysBetween(dates[i], todayIso) / DIAS_POR_PASO_VUELTA)
      const total = reentrySteps(gap)
      if (semanas < total) {
        return {
          step: semanas + 1,
          total,
          scale: REENTRY_VOLUME_SCALE[semanas] ?? 1,
          breakDays: gap
        }
      }
      return null
    }
  }

  // Sin parones en el historial, pero aún con pocas sesiones: seguimos rodando.
  // Aquí sí manda el número de sesiones y no el calendario, porque lo que hay
  // que rodar es el hábito de alguien que empieza de cero.
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

  // ── 2b. El cuerpo ya ha cobrado bastante ────────────────────
  // Esto no lo decide el calendario sino el RIR que el usuario anotó: llevar
  // muchas series cerca del fallo en dos días es fatiga que hay que reponer,
  // aunque no se acumulen días seguidos y aunque hoy se sienta bien. Solo actúa
  // cuando hay medida —sin RIR anotado no se penaliza por sospecha— y nunca
  // sobre una disposición alta, que ahí manda cómo se siente.
  const esfuerzo = esfuerzoReciente(sessions, todayIso)
  if (pideAflojar(esfuerzo) && readiness.level !== 'alto') {
    const detalle = explicarEsfuerzo(esfuerzo)
    if (detalle) reasons.push(detalle)
    reasons.push('Eso se repone descansando, no apretando más.')
    return {
      kind: 'descanso_activo',
      title: 'Hoy toca reponer',
      message:
        'Has apretado de verdad estos días y el cuerpo aún lo está pagando. Hoy, movimiento suave: es lo que convierte ese esfuerzo en adaptación en vez de en un agujero.',
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

    const foco = pickFocus(sessions, todayIso, profile, exclude, readiness.avoid, volume)
    return {
      kind: 'reacondicionamiento',
      title: 'Vuelta progresiva',
      message:
        reentry.breakDays > 0
          ? `Volvemos poco a poco: hoy trabajamos todo el cuerpo con un volumen reducido, dejando ${targetRir({ reentryStep: reentry.step, intensity: 'suave' })} repeticiones en reserva. Vas a acabar con sensación de "podría haber hecho más", y eso es exactamente lo que buscamos.`
          : 'Sesión de rodaje: movimientos sencillos, poco volumen y lejos del fallo, para que el cuerpo coja el hábito sin castigo.',
      focus: foco.grupos,
      focusMuscles: foco.musculos,
      avoidGroups: exclude,
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
  const foco = pickFocus(sessions, todayIso, profile, exclude, readiness.avoid, volume)
  const focus = foco.grupos

  if (focus.length === 0) {
    // Puede pasar por dos motivos muy distintos, y decir el que no es suena a
    // que la app no se ha enterado: o está todo cubierto, o has marcado tantas
    // zonas con molestias que no queda nada que se pueda entrenar hoy.
    const todoDolorido = readiness.avoid.length > 0 && exclude.length >= MUSCLE_GROUPS.length - 1
    reasons.push(
      todoDolorido
        ? `Has marcado ${readiness.avoid.length} zonas con molestias: hoy no queda nada a lo que pedirle trabajo de fuerza.`
        : 'Todos tus grupos musculares están o bien trabajados o aún recuperándose.'
    )
    return {
      kind: 'cardio_suave',
      title: todoDolorido ? 'Hoy toca recuperar' : 'Movimiento suave',
      message: todoDolorido
        ? 'Con casi todo el cuerpo cargado, entrenar fuerza hoy es sumar fatiga a la que ya tienes. Un paseo tranquilo mueve sangre y ayuda a que las agujetas se vayan antes.'
        : 'Has cubierto bien todos los grupos musculares estos días y los que quedan aún se están recuperando. Hoy, movimiento tranquilo y a disfrutar.',
      focus: ['cardio'],
      intensity: 'suave',
      cardioMinutes: todoDolorido ? 20 : 25,
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
  // Se nombra el músculo, no solo la zona: es la diferencia entre «toca brazo»
  // —que puede acabar en otro tríceps— y «el bíceps lleva dos series».
  const porQueEsteFoco = explicarFoco(foco)
  if (porQueEsteFoco) reasons.push(porQueEsteFoco)
  reasons.push(`Por eso abrimos por ${primaryLabel}.`)
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
    focusMuscles: foco.musculos,
    avoidGroups: exclude,
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
/**
 * Los guardas comunes a cualquier petición del usuario de meter pesas. Se
 * calculan una sola vez y mandan igual tanto si cambia el cardio por fuerza como
 * si pide las dos cosas: el usuario decide **qué** entrena, no con cuánto se
 * castiga.
 */
function marcoParaPesas(
  base: Recommendation,
  profile: Profile,
  readiness: Readiness,
  sessions: Session[],
  todayIso: string,
  techo: Intensity = 'media-alta'
) {
  const balance = computeBalance(sessions, todayIso)
  const recovering = recentlyWorked(sessions, todayIso, MUSCLE_RECOVERY_DAYS)
  const reentry = reentryState(sessions, todayIso)
  const foco = pickFocus(
    sessions,
    todayIso,
    profile,
    [...readiness.avoid, ...recovering],
    readiness.avoid,
    base.volume
  )

  // Un escalón por encima de lo que tocaba, con techo según el estado real.
  let intensity: Intensity
  if (readiness.level === 'bajo') intensity = 'suave'
  else if (base.intensity === 'suave') intensity = 'moderada'
  else if (base.intensity === 'moderada') intensity = readiness.level === 'alto' ? 'media-alta' : 'moderada'
  else intensity = 'media-alta'
  if (base.ketoAdapting && intensity === 'media-alta') intensity = 'moderada'
  if (reentry && intensity === 'media-alta') intensity = 'moderada'
  if (techo === 'moderada' && intensity === 'media-alta') intensity = 'moderada'

  const rir = Math.max(2, targetRir(reentry ? { reentryStep: reentry.step, intensity } : { intensity }))
  const heredadas = base.reasons.filter(
    (r) => r.includes('molestias') || r.includes('recuperación') || r.includes('48')
  )
  const descansando =
    recovering.length > 0
      ? `Seguimos dejando descansar ${recovering.map((g) => MUSCLE_LABELS[g].toLowerCase()).join(', ')}.`
      : null

  return {
    foco,
    focus: foco.grupos,
    evitar: [...new Set([...readiness.avoid, ...recovering])],
    intensity,
    rir,
    reentry,
    recovering,
    heredadas,
    descansando
  }
}

export function withMoreIntensity(
  base: Recommendation,
  profile: Profile,
  readiness: Readiness,
  sessions: Session[],
  todayIso: string
): Recommendation {
  const g = marcoParaPesas(base, profile, readiness, sessions, todayIso)

  const porQueEsteFoco = explicarFoco(g.foco)
  const reasons = [
    'Has pedido tú subir el listón, así que lo subimos.',
    `Lo que tocaba era «${base.title.toLowerCase()}», y ese motivo sigue ahí.`,
    `Por eso lo hacemos con pesas pero a intensidad ${g.intensity}, dejando ${g.rir} repeticiones en reserva.`,
    // Qué se ha elegido y por qué: pedir pesas no convierte la sesión en una
    // lista opaca de ejercicios.
    ...(porQueEsteFoco ? [porQueEsteFoco] : []),
    ...g.heredadas
  ]
  if (readiness.level === 'bajo') {
    reasons.push('Con tu disposición de hoy no subo de suave: mover peso sí, machacarte no.')
  }
  if (g.descansando) reasons.push(g.descansando)

  const primary = g.focus[0]
  return {
    kind: 'fuerza',
    title: primary ? `Fuerza suave · ${MUSCLE_LABELS[primary].toLowerCase()}` : 'Fuerza suave',
    message:
      readiness.level === 'bajo'
        ? 'Vamos con pesas, pero de verdad ligeras y sin acercarnos al fallo. Si a mitad notas que no toca, dejarlo también es ganar.'
        : 'Pesas en vez de caminata, con carga contenida y lejos del fallo. Suficiente para sentir que has entrenado, sin la factura de mañana.',
    focus: g.focus.length > 0 ? g.focus : base.focus.filter((gr) => gr !== 'cardio'),
    focusMuscles: g.foco.musculos,
    avoidGroups: g.evitar,
    intensity: g.intensity,
    volumeScale: g.reentry?.scale ?? (readiness.level === 'bajo' ? 0.7 : 1),
    rir: g.rir,
    reasons,
    reentry: g.reentry ? { step: g.reentry.step, total: g.reentry.total } : undefined,
    ketoAdapting: base.ketoAdapting,
    userOverride: true,
    // El nivel de volumen alcanzado sigue siendo el mismo: pedir pesas un día
    // que tocaba paseo no borra lo que el cuerpo lleva demostrando. La rampa y
    // el `volumeScale` de arriba ya se encargan de contener la carga.
    volume: base.volume
  }
}

/**
 * «Hoy quiero pesas, pero sin renunciar al cardio.»
 *
 * A veces la app propone cardio y uno se nota con cuerpo para levantar, pero no
 * quiere quedarse sin el trabajo cardiovascular del día. En vez de elegir, se
 * reparte: **la fuerza primero y el cardio a la mitad**, que es el orden y la
 * dosis con los que menos se estorban (`CARDIO_EN_SESION_MIXTA`).
 *
 * Como el día carga con las dos cosas, la sesión de fuerza es más corta que una
 * normal y la intensidad no pasa de moderada. Sigue sin acercarse al fallo, y
 * los guardas de molestias, 48 h y rampa de vuelta son exactamente los mismos.
 */
export function withSomeStrength(
  base: Recommendation,
  profile: Profile,
  readiness: Readiness,
  sessions: Session[],
  todayIso: string
): Recommendation {
  // Techo en moderada: el día ya lleva cardio encima.
  const g = marcoParaPesas(base, profile, readiness, sessions, todayIso, 'moderada')

  const original = base.cardioMinutes ?? 25
  const minutos = Math.max(
    CARDIO_MINIMO_MIXTO,
    Math.round(original * CARDIO_EN_SESION_MIXTA)
  )

  // Qué ha elegido la app y por qué: el usuario no tiene que decidirlo, pero sí
  // tiene derecho a saberlo, y con el nombre del músculo se entiende mejor por
  // qué hoy toca eso y no «hombro» otra vez.
  const zonas = g.foco.detalle.map((d) => d.label.toLowerCase())
  const listaZonas =
    zonas.length > 1 ? `${zonas.slice(0, -1).join(', ')} y ${zonas[zonas.length - 1]}` : zonas[0]

  const reasons = [
    'Has pedido tú meter pesas sin dejar el cardio, así que hacemos las dos cosas.',
    `Lo que tocaba era «${base.title.toLowerCase()}», y ese motivo sigue ahí: por eso el cardio no desaparece, se queda en ${minutos} min de los ${original}.`,
    'Primero las pesas y después el cardio, que es el orden en el que menos se estorban.',
    listaZonas
      ? `He elegido ${listaZonas}: son las zonas que llevan más tiempo sin trabajarse, así que tú no tienes que decidir nada.`
      : 'Elijo yo los ejercicios según lo que lleve más tiempo sin trabajarse.',
    `Sesión de fuerza más corta de lo normal y a intensidad ${g.intensity}, dejando ${g.rir} repeticiones en reserva: el día ya lleva las dos cosas.`,
    ...g.heredadas
  ]
  if (readiness.level === 'bajo') {
    reasons.push('Con tu disposición de hoy no subo de suave: mover peso sí, machacarte no.')
  }
  if (g.descansando) reasons.push(g.descansando)

  const primary = g.focus[0]
  return {
    kind: 'fuerza',
    title: primary ? `Pesas y cardio · ${MUSCLE_LABELS[primary].toLowerCase()}` : 'Pesas y cardio',
    message: `Unos pocos ejercicios de fuerza y luego ${minutos} min de cardio tranquilo. Te llevas las dos cosas sin que el día se convierta en una paliza: la fuerza va primero, con carga contenida, y el cardio a ritmo de poder hablar.`,
    focus: g.focus.length > 0 ? g.focus : base.focus.filter((gr) => gr !== 'cardio'),
    focusMuscles: g.foco.musculos,
    avoidGroups: g.evitar,
    intensity: g.intensity,
    cardioMinutes: minutos,
    volumeScale: g.reentry?.scale ?? (readiness.level === 'bajo' ? 0.7 : 1),
    rir: g.rir,
    reasons,
    reentry: g.reentry ? { step: g.reentry.step, total: g.reentry.total } : undefined,
    ketoAdapting: base.ketoAdapting,
    userOverride: true,
    mixed: true,
    volume: base.volume
  }
}

/** ¿Tiene sentido ofrecer la opción de subir el listón? */
export function canIntensify(rec: Recommendation): boolean {
  return rec.kind !== 'fuerza' || rec.intensity !== 'media-alta'
}

/**
 * ¿Tiene sentido ofrecer «pesas sin quitar el cardio»?
 *
 * Siempre que el día traiga cardio, incluido el descanso activo. Al principio
 * esto exigía además que fuera un día de cardio «de los grandes», y dejaba
 * fuera dos situaciones en las que la opción es justo la que hace falta:
 *
 *  - **El descanso activo.** Se ofrecía cambiarlo entero por pesas y en cambio
 *    no se ofrecía la versión suave. Al revés de como debería: repartir es
 *    menos exigente que cambiarlo del todo, así que bloquear lo suave mientras
 *    se permite lo fuerte no protege de nada.
 *  - **La vuelta tras un parón.** La rampa recorta los minutos de cardio, y con
 *    ellos el umbral dejaba de cumplirse: la opción desaparecía precisamente
 *    los días en que uno vuelve con ganas.
 *
 * Lo que contiene la carga no es esconder el botón, son los guardas de
 * `marcoParaPesas`: intensidad, repeticiones en reserva, molestias, 48 h y la
 * propia rampa.
 */
export function canMix(rec: Recommendation): boolean {
  // Si ya toca fuerza no hay nada que repartir.
  if (rec.kind === 'fuerza' || rec.kind === 'reacondicionamiento') return false
  // Y hace falta que quede cardio que recortar: por debajo del suelo, repartir
  // no cambiaría nada.
  return (rec.cardioMinutes ?? 0) > CARDIO_MINIMO_MIXTO
}

/**
 * Elige los grupos de la sesión: primero los descompensados que estén disponibles;
 * si la recuperación deja fuera a todos, se relaja el filtro antes que no entrenar.
 */
/**
 * Qué se trabaja hoy. La elección es por músculo —quien lo decide es
 * `elegirFoco`— y los grupos salen de ahí, no al revés: siguen haciendo falta
 * para el título de la sesión y para lo que aún razona por zonas.
 *
 * Cuatro músculos y no tres: en el nivel de volumen alto una sesión pide cinco
 * ejercicios, y la mixta reparte por zonas distintas, así que necesita margen.
 */
function pickFocus(
  sessions: Session[],
  todayIso: string,
  profile: Profile,
  exclude: MuscleGroup[],
  avoid: MuscleGroup[],
  volume?: Recommendation['volume']
): Foco {
  return elegirFoco(sessions, todayIso, {
    excluir: exclude,
    evitar: avoid,
    overrides: profile.landmarkOverrides,
    deficit: profile.deficitPhase,
    // El nivel de volumen decide cuántos músculos abre la sesión: concentrar en
    // menos es lo que mete a alguno en su banda productiva.
    limite: volume?.focusMuscles
  })
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
