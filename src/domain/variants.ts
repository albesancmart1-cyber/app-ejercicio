/**
 * Cómo se hizo el ejercicio.
 *
 * Muchos ejercicios admiten varias formas. «Extensión de tríceps sobre cabeza»
 * se puede hacer con mancuerna, con polea o con banda, y a un brazo o a los dos
 * a la vez. No son matices estéticos: **son cargas distintas**. Doce kilos a un
 * brazo en polea no se comparan con doce kilos con mancuerna a dos manos, y si
 * la app los mete en el mismo saco, la progresión de peso empieza a decir
 * tonterías.
 *
 * Por eso la variante se anota con la serie y la sugerencia de peso solo mira
 * el historial de **esa misma forma** de hacerlo.
 */
import { EQUIPMENT_LABELS, SIDE_LABELS } from './types'
import type { Equipment, Exercise, ExerciseVariant, Profile, SideMode } from './types'

/**
 * Materiales entre los que elegir: los del ejercicio que además se tienen. El
 * peso corporal no cuenta como elección; si es lo único, no hay nada que pedir.
 */
export function implementOptions(exercise: Exercise, profile: Profile): Equipment[] {
  const propios = exercise.equipment.filter(
    (eq) => eq !== 'peso_corporal' && profile.equipment.includes(eq)
  )
  return propios.length > 1 ? propios : []
}

/** Si el ejercicio cambia según se haga a un lado o a dos. */
export function sideOptions(exercise: Exercise): SideMode[] {
  return exercise.unilateralOption ? ['bilateral', 'unilateral'] : []
}

/** ¿Hay algo que preguntar sobre este ejercicio? */
export function hasVariants(exercise: Exercise, profile: Profile): boolean {
  return implementOptions(exercise, profile).length > 0 || sideOptions(exercise).length > 0
}

/**
 * Variante de partida. Se elige el material más pesado disponible —que es el
 * que suele dar el mejor estímulo— y las dos manos a la vez, que es la forma
 * por defecto de casi todo.
 */
export function defaultVariant(exercise: Exercise, profile: Profile): ExerciseVariant | undefined {
  const materiales = implementOptions(exercise, profile)
  const lados = sideOptions(exercise)
  if (materiales.length === 0 && lados.length === 0) return undefined

  const variant: ExerciseVariant = {}
  if (materiales.length > 0) {
    const conPeso = materiales.filter((eq) => typeof profile.maxWeights[eq] === 'number')
    variant.implement =
      conPeso.length > 0
        ? conPeso.reduce((a, b) => ((profile.maxWeights[b] ?? 0) > (profile.maxWeights[a] ?? 0) ? b : a))
        : materiales[0]
  }
  if (lados.length > 0) variant.side = 'bilateral'
  return variant
}

/** «Polea · a un lado cada vez», para que quede claro en la sesión y en el historial. */
export function variantLabel(variant?: ExerciseVariant): string {
  if (!variant) return ''
  const partes: string[] = []
  if (variant.implement) partes.push(EQUIPMENT_LABELS[variant.implement])
  if (variant.side) partes.push(SIDE_LABELS[variant.side].toLowerCase())
  return partes.join(' · ')
}

/**
 * ¿Es la misma forma de hacerlo?
 *
 * Una variante **ausente** vale como comodín: las sesiones guardadas antes de
 * que existiera esto no dicen cómo se hicieron, y descartarlas obligaría a
 * empezar de cero con los pesos sin motivo. Lo que sí se exige es que dos
 * variantes declaradas coincidan.
 */
export function sameVariant(a?: ExerciseVariant, b?: ExerciseVariant): boolean {
  if (!a || !b) return true
  if (a.implement && b.implement && a.implement !== b.implement) return false
  if (a.side && b.side && a.side !== b.side) return false
  return true
}

/**
 * El peso a un lado no es el de los dos. Al pasar de bilateral a unilateral la
 * carga por mano ronda la mitad; es una estimación de partida, no una ley, y en
 * cuanto haya una serie registrada con esa forma manda el historial.
 */
export const FACTOR_UNILATERAL = 0.5

export function scaleForSide(side: SideMode | undefined, previo: SideMode | undefined): number {
  if (!side || !previo || side === previo) return 1
  return side === 'unilateral' ? FACTOR_UNILATERAL : 1 / FACTOR_UNILATERAL
}
