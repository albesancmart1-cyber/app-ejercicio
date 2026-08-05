import { EXERCISES } from '../data/exercises'
import { contributionsOf } from '../data/contributions'
import { pesoDePreferencia } from './affinity'
import type {
  Equipment,
  Exercise,
  ExerciseVariant,
  MuscleGroup,
  PlannedExercise,
  PlannedSet,
  Profile,
  Recommendation,
  Session
} from './types'
import type { Muscle } from './muscles'
import {
  BASE_SETS,
  PASO_MINIMO_CARGA,
  SESIONES_PARA_SUBIR,
  incrementoDeCarga,
  repPrescription
} from './protocol'
import { initLogs, parseRepRange, repVerdict, type RepVerdict } from './setLogs'
import { FACTOR_UNILATERAL, defaultVariant, sameVariant, scaleForSide } from './variants'

let idCounter = 0
function newId(): string {
  idCounter += 1
  return `s-${Date.now().toString(36)}-${idCounter}`
}

export function hasEquipment(exercise: Exercise, owned: Equipment[]): boolean {
  return exercise.equipment.some((eq) => owned.includes(eq) || eq === 'peso_corporal')
}

/** Un básico multiarticular necesita más descanso que un accesorio. */
export function isCompound(exercise: Exercise): boolean {
  return exercise.stress !== 'bajo' && exercise.secondary.length > 0
}

/**
 * Peso máximo disponible entre los equipos válidos para el ejercicio. Si se ha
 * elegido con qué hacerlo, manda ese material: el tope de la polea no tiene por
 * qué ser el de las mancuernas.
 */
function availableMax(exercise: Exercise, profile: Profile, variant?: ExerciseVariant): number | undefined {
  if (variant?.implement && profile.equipment.includes(variant.implement)) {
    const w = profile.maxWeights[variant.implement]
    if (typeof w === 'number' && w > 0) return w
  }
  const maxes = exercise.equipment
    .filter((eq) => profile.equipment.includes(eq))
    .map((eq) => profile.maxWeights[eq])
    .filter((w): w is number => typeof w === 'number' && w > 0)
  if (maxes.length === 0) return undefined
  return Math.max(...maxes)
}

/** Redondeo a discos de 2,5 kg, solo para la primera estimación. */
function roundWeight(kg: number): number {
  return Math.max(1, Math.round(kg / 2.5) * 2.5)
}

/** Al progresar respetamos el peso real que usó el usuario, en pasos de 0,5 kg. */
function roundStep(kg: number): number {
  return Math.max(1, Math.round(kg * 2) / 2)
}

interface LastPerformance {
  weightKg?: number
  rpe?: number
  /** Veredicto de las repeticiones registradas, si las hubo. */
  verdict?: RepVerdict
  /** Cómo se hizo aquella vez, para no comparar peras con manzanas. */
  variant?: ExerciseVariant
}

/**
 * Las últimas veces que se hizo este ejercicio, de la más reciente hacia atrás.
 *
 * Se devuelven varias porque para subir la carga hace falta mirar **dos**
 * sesiones seguidas (regla 2-por-2 de la NSCA), no solo la última. Se prefieren
 * las que se hicieron de esta misma forma; si nunca se ha hecho así, se admiten
 * las demás: mejor una referencia aproximada, que luego se corrige por el lado,
 * que empezar de cero cada vez que se cambia de agarre.
 */
function lastPerformances(
  exerciseId: string,
  history: Session[],
  variant: ExerciseVariant | undefined,
  cuantas: number
): LastPerformance[] {
  const sorted = [...history].filter((s) => s.completed).sort((a, b) => (a.date < b.date ? 1 : -1))
  const mismaForma: LastPerformance[] = []
  const cualquiera: LastPerformance[] = []
  for (const s of sorted) {
    const pe = s.exercises.find((p) => p.exerciseId === exerciseId && p.done === true)
    if (!pe) continue
    const registro: LastPerformance = {
      weightKg: pe.actualWeightKg ?? pe.plan.weightKg,
      rpe: s.rpe,
      verdict: repVerdict(pe),
      variant: pe.variant
    }
    if (sameVariant(variant, pe.variant)) mismaForma.push(registro)
    else cualquiera.push(registro)
    if (mismaForma.length >= cuantas) break
  }
  return mismaForma.length > 0 ? mismaForma.slice(0, cuantas) : cualquiera.slice(0, 1)
}

/** Qué decide la progresión de carga, y por qué. Se enseña al usuario. */
export type DecisionCarga = 'primera_vez' | 'sube' | 'mantiene' | 'esperando_segunda' | 'topado'

export interface ProgresoCarga {
  weightKg?: number
  decision: DecisionCarga
  /** Solo cuando la carga está topada: qué palanca queda. */
  palanca?: 'reps' | 'unilateral'
}

/**
 * Cuánto peso toca hoy, y por qué.
 *
 * Tres reglas, todas de la NSCA:
 *
 * 1. **Doble progresión.** La carga solo sube cuando el rango de repeticiones
 *    está ganado del todo. A media tabla se gana repeticiones, no kilos. Antes la
 *    app subía el peso también a medio rango, que es la forma más silenciosa de
 *    romper la doble progresión: nunca llegabas al tope porque el peso se te
 *    adelantaba.
 * 2. **Dos por dos.** Hacen falta `SESIONES_PARA_SUBIR` sesiones seguidas al tope
 *    del rango. Una puede serlo por haber dormido bien; dos ya es adaptación.
 * 3. **Incremento proporcional.** `incrementoDeCarga` da el porcentaje según la
 *    masa implicada, con un suelo de `PASO_MINIMO_CARGA`. El suelo de un kilo que
 *    había antes convertía un curl de 8 kg en un salto del 12,5 %.
 *
 * Y una cuarta que no es de la NSCA sino de la realidad de entrenar en casa: si
 * la carga ya está en el tope del material disponible, decirlo y pasar a otra
 * palanca. Con unas mancuernas de 24 kg, quedarse callado es condenar el
 * ejercicio a no progresar nunca más.
 */
export function progresoDeCarga(
  exercise: Exercise,
  profile: Profile,
  loadScale: number,
  history: Session[],
  variant?: ExerciseVariant
): ProgresoCarga {
  const max = availableMax(exercise, profile, variant)
  if (max === undefined || !exercise.loadFactor) return { decision: 'primera_vez' }

  const previas = lastPerformances(exercise.id, history, variant, SESIONES_PARA_SUBIR)
  const last = previas[0]

  if (!last?.weightKg) {
    const estimado = roundWeight(max * exercise.loadFactor * loadScale)
    // A un lado cada vez se mueve alrededor de la mitad del peso total.
    const porLado = variant?.side === 'unilateral' ? roundStep(estimado * FACTOR_UNILATERAL) : estimado
    return { weightKg: Math.min(porLado, max), decision: 'primera_vez' }
  }

  // Si el referente es de otra forma de hacerlo, se traduce la carga antes de
  // progresar: la mitad al pasar a un lado, el doble al volver a los dos.
  const base = roundStep(last.weightKg * scaleForSide(variant?.side, last.variant?.side))
  const mantener = (decision: DecisionCarga = 'mantiene'): ProgresoCarga => ({
    weightKg: Math.min(base, max),
    decision
  })

  // Cambiar de material o de lado invalida el veredicto: es otro ejercicio a
  // efectos de carga, así que se parte de la traducción sin subir nada.
  if (!sameVariant(variant, last.variant)) return mantener()

  const subir = (): ProgresoCarga => {
    // Al tope del material no hay kilos que añadir: la progresión cambia de
    // palanca. A un lado cada vez se mueve más peso relativo que a dos, así que
    // es el siguiente escalón natural antes de estirar el rango.
    if (base >= max) {
      return {
        weightKg: max,
        decision: 'topado',
        palanca: exercise.unilateralOption && variant?.side !== 'unilateral' ? 'unilateral' : 'reps'
      }
    }
    const pct = incrementoDeCarga({ primary: exercise.primary, compound: isCompound(exercise) })
    const next = Math.max(base + PASO_MINIMO_CARGA, base * (1 + pct))
    return { weightKg: Math.min(roundStep(next), max), decision: 'sube' }
  }

  // Las repeticiones registradas son dato objetivo: mandan sobre la sensación.
  if (last.verdict === 'sube') {
    const anteriores = previas.slice(1, SESIONES_PARA_SUBIR)
    const todasAlTope =
      anteriores.length >= SESIONES_PARA_SUBIR - 1 && anteriores.every((p) => p.verdict === 'sube')
    return todasAlTope ? subir() : mantener('esperando_segunda')
  }
  // 'mantiene' y 'progresa_suave': el rango aún no está ganado.
  if (last.verdict !== undefined) return mantener()

  // Sin repeticiones anotadas solo queda la sensación, y con eso no se sube a la
  // primera: hacen falta dos sesiones seguidas de sobra.
  const facil = (p: LastPerformance) => p.rpe !== undefined && p.rpe >= 4
  const dosFaciles =
    previas.length >= SESIONES_PARA_SUBIR && previas.slice(0, SESIONES_PARA_SUBIR).every(facil)
  if (!dosFaciles) return mantener(facil(last) ? 'esperando_segunda' : 'mantiene')
  return subir()
}

/** Solo el peso, para quien no necesita saber por qué. */
export function suggestWeight(
  exercise: Exercise,
  profile: Profile,
  loadScale: number,
  history: Session[],
  variant?: ExerciseVariant
): number | undefined {
  return progresoDeCarga(exercise, profile, loadScale, history, variant).weightKg
}

/** Ejercicios usados en la última sesión, para no repetir siempre lo mismo. */
function recentExerciseIds(history: Session[]): Set<string> {
  const last = [...history]
    .filter((s) => s.completed)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  return new Set(last ? last.exercises.map((e) => e.exerciseId) : [])
}

/**
 * Construye el plan de un ejercicio concreto. Lo usan tanto la creación de la
 * sesión como la sustitución, para que un ejercicio cambiado reciba exactamente
 * el mismo trato que uno propuesto de origen.
 */
export function planFor(
  exercise: Exercise,
  profile: Profile,
  intensity: Recommendation['intensity'],
  volumeScale: number,
  rir: number,
  history: Session[],
  keto: boolean,
  volume?: Recommendation['volume'],
  variant?: ExerciseVariant
): PlannedSet {
  const rx = repPrescription(profile.goal, intensity, keto, isCompound(exercise))
  // El nivel de volumen manda sobre las series base, pero la rampa de vuelta
  // tras un parón sigue teniendo la última palabra: se reduce igual.
  const seriesBase = volume?.setsPerExercise ?? BASE_SETS
  const sets = Math.max(2, Math.round(seriesBase * volumeScale))
  const progreso = progresoDeCarga(exercise, profile, rx.loadScale, history, variant)

  let reps = volume?.repBias === 'variado' ? variarRango(rx.reps) : rx.reps
  // Carga topada por el material: si no se pueden añadir kilos, se añaden
  // repeticiones. A carga fija el estímulo sigue viniendo de llevar la serie
  // cerca del fallo, y eso se consigue estirando el rango.
  if (progreso.decision === 'topado' && progreso.palanca === 'reps') reps = variarRango(reps)

  return {
    sets,
    reps,
    weightKg: progreso.weightKg,
    rir,
    restSeconds: rx.restSeconds
  }
}

/** Qué contarle al usuario sobre la carga de hoy, si hay algo que contar. */
export function notaDeProgreso(progreso: ProgresoCarga): string | undefined {
  if (progreso.decision === 'esperando_segunda') {
    return 'La sesión pasada completaste el rango entero. Repítelo hoy y el próximo día subimos el peso: dos veces seguidas es adaptación, una puede ser un buen día.'
  }
  if (progreso.decision === 'topado') {
    return progreso.palanca === 'unilateral'
      ? 'Estás en el tope de tu material. Prueba a hacerlo a un lado cada vez: con el mismo peso, cada brazo mueve el doble de lo que le tocaba.'
      : 'Estás en el tope de tu material, así que hoy la progresión va por repeticiones: mismo peso, rango más largo.'
  }
  return undefined
}

/**
 * Prepara un ejercicio completo —variante por defecto, plan y series en blanco—
 * para meterlo en una sesión. Lo usan tanto la construcción de la sesión como
 * añadir o cambiar un ejercicio a mano, de modo que un ejercicio elegido por el
 * usuario recibe exactamente el mismo trato que uno propuesto por la app.
 */
export function prepareExercise(
  exercise: Exercise,
  profile: Profile,
  opts: {
    intensity: Recommendation['intensity']
    volumeScale: number
    rir: number
    history: Session[]
    keto: boolean
    volume?: Recommendation['volume']
    variant?: ExerciseVariant
    addedByUser?: boolean
  }
): PlannedExercise {
  const variant = opts.variant ?? defaultVariant(exercise, profile)
  const plan = planFor(
    exercise,
    profile,
    opts.intensity,
    opts.volumeScale,
    opts.rir,
    opts.history,
    opts.keto,
    opts.volume,
    variant
  )
  const rx = repPrescription(profile.goal, opts.intensity, opts.keto, isCompound(exercise))
  const nota = notaDeProgreso(
    progresoDeCarga(exercise, profile, rx.loadScale, opts.history, variant)
  )
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    primary: exercise.primary,
    plan,
    variant,
    logs: initLogs(plan),
    ...(nota ? { progressNote: nota } : {}),
    ...(opts.addedByUser ? { addedByUser: true } : {})
  }
}

export const STRESS_RANK = { bajo: 0, medio: 1, alto: 2 }

/**
 * Desplaza el rango de repeticiones para variar el estímulo cuando el volumen
 * ya está alto y hace falta cambiar algo más que la cantidad.
 */
export function variarRango(reps: string): string {
  const rango = parseRepRange(reps)
  if (!rango) return reps
  return `${rango.min + 4}-${rango.max + 4}`
}

function pickForGroup(
  group: MuscleGroup,
  profile: Profile,
  maxStress: 'bajo' | 'medio' | 'alto',
  exclude: Set<string>,
  recent: Set<string>
): Exercise | undefined {
  const stressRank = STRESS_RANK
  const base = (e: Exercise) =>
    e.primary === group &&
    e.primary !== 'cardio' &&
    !exclude.has(e.id) &&
    hasEquipment(e, profile.equipment) &&
    stressRank[e.stress] <= stressRank[maxStress]

  // Los descartados dejan de proponerse… salvo que descartarlos todos dejara al
  // grupo sin nada. Antes un ejercicio que no entusiasma que una sesión coja.
  const descartados = new Set(profile.dislikedExercises ?? [])
  let candidates = EXERCISES.filter((e) => base(e) && !descartados.has(e.id))
  if (candidates.length === 0) candidates = EXERCISES.filter(base)
  if (candidates.length === 0) return undefined

  // Con un catálogo grande, lo que hace que las sesiones se parezcan a lo que
  // uno quiere entrenar es la preferencia: los favoritos marcados y lo que la
  // app ha aprendido de lo que entrenas y de lo que cambias. Después, no repetir
  // lo de la última sesión —así se rota en vez de caer siempre en el mismo—, y
  // por último el mayor estímulo permitido.
  candidates.sort((a, b) => {
    const prefA = pesoDePreferencia(profile, a.id)
    const prefB = pesoDePreferencia(profile, b.id)
    if (prefA !== prefB) return prefB - prefA
    const repeatA = recent.has(a.id) ? 1 : 0
    const repeatB = recent.has(b.id) ? 1 : 0
    if (repeatA !== repeatB) return repeatA - repeatB
    return stressRank[b.stress] - stressRank[a.stress]
  })
  return candidates[0]
}

/**
 * Un ejercicio que trabaje **este músculo concreto**, no su zona.
 *
 * Es la diferencia que motivó el refactor: pedir «algo de brazo» podía devolver
 * otro tríceps cuando lo que estaba a cero era el bíceps. Aquí solo entran los
 * ejercicios en los que el músculo es motor principal (aporte 1). Si con el
 * material disponible no hay ninguno se admite el trabajo como sinergista, que
 * rinde la mitad pero es mejor que dejar el músculo sin nada.
 *
 * A igualdad de lo demás gana el que además toque **otros músculos del foco de
 * hoy**: cubrir cuatro zonas con cuatro ejercicios sale mejor que con seis.
 */
export function pickForMuscle(
  muscle: Muscle,
  profile: Profile,
  maxStress: 'bajo' | 'medio' | 'alto',
  exclude: Set<string>,
  recent: Set<string>,
  tambien: Muscle[] = [],
  zonasVetadas: MuscleGroup[] = []
): Exercise | undefined {
  const stressRank = STRESS_RANK
  const disponible = (e: Exercise) =>
    e.primary !== 'cardio' &&
    // Un buen ejercicio de bíceps puede ser una dominada, y con la espalda
    // dolorida esa no es la respuesta: la zona vetada lo sigue estando aunque
    // el músculo que buscamos esté fuera de ella.
    !zonasVetadas.includes(e.primary) &&
    !exclude.has(e.id) &&
    hasEquipment(e, profile.equipment) &&
    stressRank[e.stress] <= stressRank[maxStress]

  const aporte = (e: Exercise) => contributionsOf(e.id)[muscle] ?? 0
  const descartados = new Set(profile.dislikedExercises ?? [])

  // Primero los que lo trabajan de verdad; solo si no hay, los que lo acompañan.
  const porAporte = (minimo: number) => EXERCISES.filter((e) => disponible(e) && aporte(e) >= minimo)
  let candidates = porAporte(1).filter((e) => !descartados.has(e.id))
  if (candidates.length === 0) candidates = porAporte(1)
  if (candidates.length === 0) candidates = porAporte(0.5).filter((e) => !descartados.has(e.id))
  if (candidates.length === 0) candidates = porAporte(0.5)
  if (candidates.length === 0) return undefined

  const otros = tambien.filter((m) => m !== muscle)
  const cubre = (e: Exercise) => {
    const c = contributionsOf(e.id)
    return otros.reduce((a, m) => a + (c[m] ?? 0), 0)
  }
  candidates.sort((a, b) => {
    const prefA = pesoDePreferencia(profile, a.id)
    const prefB = pesoDePreferencia(profile, b.id)
    if (prefA !== prefB) return prefB - prefA
    const repeatA = recent.has(a.id) ? 1 : 0
    const repeatB = recent.has(b.id) ? 1 : 0
    if (repeatA !== repeatB) return repeatA - repeatB
    if (cubre(b) !== cubre(a)) return cubre(b) - cubre(a)
    return stressRank[b.stress] - stressRank[a.stress]
  })
  return candidates[0]
}

function cardioExercise(profile: Profile, medium: boolean): Exercise | undefined {
  const prefer = medium
    ? ['bici_media', 'trote_suave', 'bici_suave', 'caminar']
    : ['caminar', 'bici_suave', 'trote_suave']
  for (const id of prefer) {
    const ex = EXERCISES.find((e) => e.id === id)
    if (ex && hasEquipment(ex, profile.equipment)) return ex
  }
  return EXERCISES.find((e) => e.id === 'movilidad')
}

/** Construye la sesión concreta a partir de la recomendación. */
export function buildSession(
  recommendation: Recommendation,
  profile: Profile,
  history: Session[],
  todayIso: string,
  keto = false
): Session {
  const exercises: PlannedExercise[] = []
  const used = new Set<string>()
  const recent = recentExerciseIds(history)

  const maxStress =
    recommendation.intensity === 'suave'
      ? 'bajo'
      : recommendation.intensity === 'moderada'
        ? 'medio'
        : 'alto'

  if (recommendation.kind === 'fuerza' || recommendation.kind === 'reacondicionamiento') {
    const groups = recommendation.focus.filter((g) => g !== 'cardio')
    // Cuántos ejercicios de fuerza caben, según el nivel de volumen alcanzado.
    // En la mixta se recorta uno —el día también lleva cardio—, con un suelo de
    // tres: con dos la sesión se queda en nada y deja de merecer la pena.
    const base = recommendation.volume?.exercisesPerSession ?? 4
    const cuantos = recommendation.mixed ? Math.max(3, base - 1) : base
    // Cómo se reparten los ejercicios entre lo que abre la sesión.
    //
    // Cuando hay más ejercicios que músculos, sobra trabajo que colocar y se da
    // por orden de necesidad: primero uno a cada uno, y las vueltas siguientes
    // vuelven a empezar por el que más falta le hace. Es lo que convierte «cinco
    // ejercicios entre tres músculos» en dosis de verdad para los dos primeros,
    // en vez de doblar siempre el mismo y dejar el tercero suelto.
    //
    // En la vuelta progresiva y en la mixta no se reparte de más: son sesiones
    // cortas y lo que interesa es tocar varios sitios descansados.
    const concentra = recommendation.kind === 'fuerza' && !recommendation.mixed
    const repartir = <T,>(xs: T[]): T[] => {
      if (xs.length === 0) return []
      if (!concentra) return xs.slice(0, cuantos)
      return Array.from({ length: cuantos }, (_, i) => xs[i % xs.length])
    }

    // La elección es por músculo cuando la recomendación dice cuáles. Una
    // recomendación construida a mano —o guardada antes de que existiera el
    // campo— sigue funcionando por grupos.
    const musculos = recommendation.focusMuscles ?? []
    const elegidos: Exercise[] = []
    if (musculos.length > 0) {
      for (const muscle of repartir(musculos)) {
        const ex = pickForMuscle(
          muscle,
          profile,
          maxStress,
          used,
          recent,
          musculos,
          recommendation.avoidGroups ?? []
        )
        if (!ex) continue
        used.add(ex.id)
        elegidos.push(ex)
      }
    } else {
      for (const group of repartir(groups)) {
        const ex = pickForGroup(group, profile, maxStress, used, recent)
        if (!ex) continue
        used.add(ex.id)
        elegidos.push(ex)
      }
    }

    for (const ex of elegidos) {
      exercises.push(
        prepareExercise(ex, profile, {
          intensity: recommendation.intensity,
          volumeScale: recommendation.volumeScale,
          rir: recommendation.rir,
          history,
          keto,
          volume: recommendation.volume
        })
      )
    }

    // Un poco de core para rematar, siempre que la sesión no se haya alargado.
    // En la mixta no, que el hueco lo ocupa el cardio.
    //
    // Dos condiciones que antes faltaban y hacían daño:
    //
    //  - **Si el core es una de las zonas vetadas, no se añade.** Este remate se
    //    colaba al margen de la cascada de molestias, así que marcar agujetas de
    //    abdomen en el test diario seguía dando abdomen. Era el único sitio del
    //    constructor que no miraba `avoidGroups`.
    //  - **Si la sesión ya trae core, tampoco.** Antes se miraba solo si estaba
    //    la plancha; eligiendo por músculo, el recto abdominal puede abrir la
    //    sesión y entonces se doblaba el trabajo sin querer.
    const coreVetado = (recommendation.avoidGroups ?? []).includes('core')
    const yaHayCore = exercises.some((pe) => pe.primary === 'core')
    if (!coreVetado && !yaHayCore && !recommendation.mixed && exercises.length < cuantos + 1) {
      const core = pickForGroup('core', profile, 'bajo', used, recent)
      if (core) {
        used.add(core.id)
        exercises.push({
          exerciseId: core.id,
          name: core.name,
          primary: 'core',
          plan: { sets: 2, reps: '30-45 s', rir: recommendation.rir, restSeconds: 60 }
        })
      }
    }

    // Sesión mixta: el cardio va **al final**, después de las pesas. Hacerlo al
    // revés deja las piernas cansadas para levantar y es donde el efecto de
    // interferencia se nota de verdad.
    if (recommendation.mixed && recommendation.cardioMinutes) {
      const cardio = cardioExercise(profile, recommendation.intensity !== 'suave')
      if (cardio) {
        exercises.push({
          exerciseId: cardio.id,
          name: cardio.name,
          primary: 'cardio',
          plan: { sets: 1, reps: `${recommendation.cardioMinutes} min` }
        })
      }
    }
  } else {
    const cardio = cardioExercise(profile, recommendation.kind === 'cardio_medio')
    if (cardio) {
      exercises.push({
        exerciseId: cardio.id,
        name: cardio.name,
        primary: 'cardio',
        plan: { sets: 1, reps: `${recommendation.cardioMinutes ?? 25} min` }
      })
    }
    if (recommendation.kind === 'descanso_activo') {
      exercises.push({
        exerciseId: 'movilidad',
        name: 'Movilidad y estiramientos suaves',
        primary: 'cardio',
        plan: { sets: 1, reps: '10 min' }
      })
    }
  }

  return {
    id: newId(),
    date: todayIso,
    kind: recommendation.kind,
    title: recommendation.title,
    // Cada ejercicio nace con sus series listas para rellenar.
    exercises: exercises.map((pe) => ({ ...pe, logs: initLogs(pe.plan) })),
    cardioMinutes: recommendation.cardioMinutes,
    completed: false
  }
}
