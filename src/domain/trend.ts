/**
 * Lectura honesta de la tendencia de composición corporal.
 *
 * Dos principios gobiernan este módulo:
 *
 * 1. **No inventar señal donde no la hay.** La bioimpedancia se mueve ±3–5 % con
 *    la hidratación, así que la pendiente se calcula por mínimos cuadrados sobre
 *    todas las mediciones (una lectura rara no puede cambiar el veredicto) y por
 *    debajo de un umbral se considera plano. Y no se opina hasta tener suficientes
 *    semanas: decir «te has estancado» con dos pesadas sería generar ansiedad a
 *    partir de ruido.
 * 2. **Quitar carga mental, no añadirla.** Cuando algo no funciona se dice claro y
 *    se señala *una* palanca concreta, sacada de lo que la app ya sabe de ti. Nunca
 *    una lista de diez cosas, nunca en clave de culpa, y nunca hablando de calorías.
 */
import { computeLeptinSignal } from './leptin'
import { consecutiveTrainingDays, daysBetween, weeklySets } from './muscleBalance'
import { WEEKLY_SETS, proteinTarget } from './protocol'
import { computeComposition } from './body'
import { MUSCLE_LABELS, MUSCLE_GROUPS, type BodyMeasurement, type CheckIn, type Profile, type Session } from './types'

/** Mínimos para poder decir algo con sentido. */
export const MINIMO = { mediciones: 3, dias: 21 }

/**
 * Por debajo de esto se considera plano. Deliberadamente conservador: más vale
 * decir «aún no se ve nada» que mandarte a cambiar hábitos por ruido de báscula.
 */
export const UMBRAL_RUIDO_KG_MES = 0.3

export type TrendState = 'pocos_datos' | 'recomposicion' | 'progreso' | 'estable' | 'atencion'

export interface TrendReading {
  state: TrendState
  titular: string
  mensaje: string
  /** Como mucho dos, y salidas de tus datos reales. */
  sugerencias: string[]
  /** Cambio en kg al mes; positivo es subir. */
  fatSlope?: number
  muscleSlope?: number
  weightSlope?: number
  weeks: number
  measurements: number
}

/** Pendiente por mínimos cuadrados en kg por cada 30 días. */
export function slopePerMonth(puntos: { day: number; value: number }[]): number | undefined {
  if (puntos.length < 2) return undefined
  const n = puntos.length
  const mediaX = puntos.reduce((a, p) => a + p.day, 0) / n
  const mediaY = puntos.reduce((a, p) => a + p.value, 0) / n
  let num = 0
  let den = 0
  for (const p of puntos) {
    num += (p.day - mediaX) * (p.value - mediaY)
    den += (p.day - mediaX) ** 2
  }
  if (den === 0) return undefined
  return Math.round((num / den) * 30 * 100) / 100
}

function esPlano(pendiente: number | undefined): boolean {
  return pendiente === undefined || Math.abs(pendiente) < UMBRAL_RUIDO_KG_MES
}

/**
 * La palanca de hábitos que peor está, sacada de la señal de leptina y de la
 * consistencia real de entrenamiento. Devuelve como mucho dos.
 */
function sugerenciasReales(
  checkIns: CheckIn[],
  sessions: Session[],
  profile: Profile | null,
  todayIso: string
): string[] {
  const sugerencias: string[] = []
  const leptina = computeLeptinSignal(checkIns, todayIso, profile?.goal)

  // 1. Lo que la señal de leptina dice que está fallando, que es lo más de fondo.
  if (leptina.hurting.length > 0) sugerencias.push(leptina.hurting[0])

  // 2. Consistencia: sin sesiones no hay estímulo que interpretar.
  const ultimasCuatroSemanas = sessions.filter((s) => {
    const edad = daysBetween(s.date, todayIso)
    return s.completed && edad >= 0 && edad < 28
  }).length
  if (ultimasCuatroSemanas < 4) {
    sugerencias.push(
      `Llevas ${ultimasCuatroSemanas} ${ultimasCuatroSemanas === 1 ? 'sesión' : 'sesiones'} en cuatro semanas. Con dos a la semana ya bastaría: el cuerpo necesita el estímulo para tener algo que construir.`
    )
  } else {
    // 3. Grupos que se quedan fuera, que es lo que frena la parte de músculo.
    const semana = weeklySets(sessions, todayIso)
    const olvidados = MUSCLE_GROUPS.filter(
      (g) => g !== 'cardio' && semana[g] < WEEKLY_SETS.minimoEficaz
    )
    if (olvidados.length >= 3) {
      sugerencias.push(
        `Esta semana se han quedado fuera ${olvidados.slice(0, 3).map((g) => MUSCLE_LABELS[g].toLowerCase()).join(', ')}. Deja que la app elija por ti y se reparte solo.`
      )
    }
  }

  // 4. Proteína, que es lo único que la app pide vigilar.
  if (sugerencias.length < 2 && profile?.weightKg) {
    const p = proteinTarget(profile.weightKg, profile.goal)
    sugerencias.push(
      `Asegura los ${p.min}–${p.max} g de proteína al día: sin material no hay músculo que construir, por bien que entrenes.`
    )
  }

  if (sugerencias.length < 2 && consecutiveTrainingDays(sessions, todayIso) >= 4) {
    sugerencias.push('Llevas muchos días seguidos entrenando. Un par de días de descanso real suelen desatascar más que insistir.')
  }

  return sugerencias.slice(0, 2)
}

export function interpretTrend(
  measurements: BodyMeasurement[],
  profile: Profile | null,
  checkIns: CheckIn[],
  sessions: Session[],
  todayIso: string
): TrendReading {
  const orden = [...measurements].sort((a, b) => (a.date < b.date ? -1 : 1))
  const primera = orden[0]
  const ultima = orden[orden.length - 1]
  const dias = primera && ultima ? daysBetween(primera.date, ultima.date) : 0
  const weeks = Math.round((dias / 7) * 10) / 10

  if (orden.length < MINIMO.mediciones || dias < MINIMO.dias) {
    const faltan = Math.max(0, MINIMO.mediciones - orden.length)
    return {
      state: 'pocos_datos',
      titular: 'Aún es pronto para decir nada',
      mensaje:
        faltan > 0
          ? `Con ${orden.length} ${orden.length === 1 ? 'medición' : 'mediciones'} no se puede distinguir un cambio real del vaivén normal de la báscula. Con ${faltan} más y unas tres semanas te digo por dónde vas. Mientras tanto, ni caso al número.`
          : 'Llevas poco tiempo midiendo. Dale unas tres semanas: por debajo de eso, lo que se ve es hidratación, no composición.',
      sugerencias: [],
      weeks,
      measurements: orden.length
    }
  }

  const puntos = (extraer: (c: ReturnType<typeof computeComposition>) => number | undefined) =>
    orden
      .map((m) => ({ day: daysBetween(primera.date, m.date), value: extraer(computeComposition(m, profile?.heightCm)) }))
      .filter((p): p is { day: number; value: number } => typeof p.value === 'number')

  const fatSlope = slopePerMonth(puntos((c) => c.fatKg))
  const muscleSlope = slopePerMonth(puntos((c) => c.muscleKg))
  const weightSlope = slopePerMonth(puntos((c) => c.weightKg))

  const grasaBaja = fatSlope !== undefined && fatSlope <= -UMBRAL_RUIDO_KG_MES
  const grasaSube = fatSlope !== undefined && fatSlope >= UMBRAL_RUIDO_KG_MES
  const musculoSube = muscleSlope !== undefined && muscleSlope >= UMBRAL_RUIDO_KG_MES
  const musculoBaja = muscleSlope !== undefined && muscleSlope <= -UMBRAL_RUIDO_KG_MES

  const base = { fatSlope, muscleSlope, weightSlope, weeks, measurements: orden.length }
  const sugerencias = () => sugerenciasReales(checkIns, sessions, profile, todayIso)

  if (grasaBaja && musculoSube) {
    return {
      ...base,
      state: 'recomposicion',
      titular: 'Estás recomponiendo',
      mensaje:
        `En estas ${weeks} semanas la grasa baja y el músculo sube a la vez. Eso es exactamente lo que buscas, y es lo que el peso solo nunca te habría contado${
          weightSlope !== undefined && Math.abs(weightSlope) < 0.5 ? ' —de hecho, apenas se ha movido—' : ''
        }. No cambies nada: sigue con lo que estás haciendo.`,
      sugerencias: []
    }
  }

  if (grasaBaja || musculoSube) {
    return {
      ...base,
      state: 'progreso',
      titular: grasaBaja ? 'Vas bien: la grasa baja' : 'Vas bien: el músculo sube',
      mensaje: grasaBaja
        ? 'La grasa va bajando y el músculo se mantiene. Es buen camino: estás conservando lo que tienes mientras te quitas lo que sobra.'
        : 'El músculo va subiendo y la grasa se mantiene. Buen camino: estás construyendo sin acumular.',
      sugerencias: []
    }
  }

  if (grasaSube && musculoBaja) {
    return {
      ...base,
      state: 'atencion',
      titular: 'Esto no está yendo bien',
      mensaje:
        `Llevas ${weeks} semanas con la grasa subiendo y el músculo bajando. Te lo digo claro porque para eso está la app, pero no es un drama ni hace falta que cambies diez cosas: casi siempre se arregla tirando de una sola palanca.`,
      sugerencias: sugerencias()
    }
  }

  return {
    ...base,
    state: 'estable',
    titular: 'Todo plano de momento',
    mensaje:
      `En ${weeks} semanas ni la grasa ni el músculo se han movido de forma apreciable. Un estancamiento no es mala señal: es información. Y no se desatasca contando nada, sino ajustando lo que sostiene el resultado.`,
    sugerencias: sugerencias()
  }
}
