/**
 * Elegir con qué se hace el cardio, sin cambiar la dosis.
 *
 * Un día de cardio no es «35 minutos», es una cantidad de trabajo. Si la app
 * propone 35 minutos de trote y ese día no apetece correr, andar 35 minutos no
 * es lo mismo: es bastante menos. Aquí se convierte la dosis de una actividad a
 * otra para que puedas elegir la que te apetezca sin quedarte corto ni pasarte.
 *
 * La moneda de cambio son los **MET-minuto**: el coste metabólico de la
 * actividad multiplicado por el tiempo. Es la unidad con la que se escriben las
 * recomendaciones de actividad física —la OMS habla de 150 a 300 minutos
 * semanales de intensidad moderada, que son MET-minuto disfrazados— y los
 * valores por actividad salen del Compendium of Physical Activities (Ainsworth
 * et al., Med Sci Sports Exerc 2011), que es la tabla de referencia.
 *
 * Con eso, 35 minutos de trote (7 MET) son 245 MET-minuto, y andar (3,5 MET) los
 * mismos 245 pide 70 minutos. Sale largo porque **es** largo: caminar cuesta la
 * mitad por minuto.
 *
 * Lo que la conversión **no** hace es subir la intensidad de un día que pedía
 * calma. En un día de descanso activo no se ofrece trote aunque salgan las
 * cuentas: el objetivo de ese día es mover sangre, no acumular MET-minuto.
 */
import { EXERCISES, exerciseById } from '../data/exercises'
import { hasEquipment } from './workoutBuilder'
import type { Exercise, Profile, SessionKind } from './types'

/**
 * Coste metabólico de cada actividad, en MET. Del Compendium of Physical
 * Activities, escogiendo en cada caso el ritmo que describe el nombre: el trote
 * es de zona 2 conversacional (7,0), no una carrera, y la bici tranquila es de
 * paseo (4,0), no de salir a rodar.
 */
export const MET: Record<string, number> = {
  movilidad: 2.3,
  caminar: 3.5,
  bici_suave: 4.0,
  subir_escaleras: 5.0,
  caminar_cuesta: 5.3,
  bici_media: 6.8,
  trote_suave: 7.0,
  remo_ergometro: 7.0,
  comba: 8.8
}

/** Ni menos de esto merece la pena, ni más de esto cabe en un día normal. */
export const MINUTOS_MINIMOS = 10
export const MINUTOS_MAXIMOS = 90

/**
 * Techo de intensidad según lo que pedía el día.
 *
 * Un descanso activo con trote deja de ser un descanso activo. La conversión
 * respeta la dosis, pero el tipo de día manda sobre ella.
 */
const TECHO_MET: Record<SessionKind, number> = {
  descanso_activo: 4.5,
  cardio_suave: 5.5,
  cardio_medio: 99,
  reacondicionamiento: 5.5,
  fuerza: 99
}

export function metDe(exerciseId: string): number | undefined {
  return MET[exerciseId]
}

/**
 * Los minutos de `hasta` que equivalen a `minutos` de `desde`.
 *
 * Se redondea a cinco minutos, que es como se piensa el tiempo de verdad, y se
 * acota: por debajo de diez no da tiempo ni a entrar en calor, y por encima de
 * noventa deja de ser un día de cardio para ser una excursión.
 */
export function minutosEquivalentes(desde: string, hasta: string, minutos: number): number {
  const origen = metDe(desde)
  const destino = metDe(hasta)
  if (!origen || !destino) return minutos
  const equivalente = (minutos * origen) / destino
  const redondeado = Math.round(equivalente / 5) * 5
  return Math.max(MINUTOS_MINIMOS, Math.min(MINUTOS_MAXIMOS, redondeado))
}

export interface OpcionCardio {
  exercise: Exercise
  minutos: number
  /** Es la que la app propone hoy. */
  actual: boolean
  /** Se ha recortado por el tope de noventa minutos. */
  recortada: boolean
}

/**
 * Con qué se puede hacer el cardio de hoy, y cuánto de cada cosa.
 *
 * Se filtra por el material del perfil y por el techo de intensidad del día, y
 * se ordena de menos a más exigente: la lista se lee como una escala, de andar
 * a correr.
 */
export function opcionesDeCardio(
  profile: Profile,
  kind: SessionKind,
  actualId: string,
  minutos: number
): OpcionCardio[] {
  const techo = TECHO_MET[kind] ?? 99
  return EXERCISES.filter((e) => {
    const met = metDe(e.id)
    if (!met || e.primary !== 'cardio') return false
    // La movilidad no es una alternativa aeróbica: es lo que se hace cuando el
    // día pide no hacer nada. Convertir la dosis daría «85 min de
    // estiramientos», que no es una recomendación, es una cuenta.
    if (e.id === 'movilidad' && e.id !== actualId) return false
    // La que ya está puesta se queda aunque pase el techo: si el usuario la
    // eligió a mano, esconderla sería quitarle lo que acaba de decidir.
    if (met > techo && e.id !== actualId) return false
    return hasEquipment(e, profile.equipment)
  })
    .sort((a, b) => metDe(a.id)! - metDe(b.id)!)
    .map((e) => {
      const equivalentes = minutosEquivalentes(actualId, e.id, minutos)
      const sinTope = Math.round(((minutos * (metDe(actualId) ?? 1)) / metDe(e.id)!) / 5) * 5
      return {
        exercise: e,
        minutos: e.id === actualId ? minutos : equivalentes,
        actual: e.id === actualId,
        recortada: sinTope > MINUTOS_MAXIMOS
      }
    })
}

/** Una línea que explique la equivalencia, para no cambiar a ciegas. */
export function explicarEquivalencia(desde: string, hasta: string, minutos: number): string | null {
  const origen = exerciseById(desde)
  const destino = exerciseById(hasta)
  const metOrigen = metDe(desde)
  const metDestino = metDe(hasta)
  if (!origen || !destino || !metOrigen || !metDestino || desde === hasta) return null

  const equivalentes = minutosEquivalentes(desde, hasta, minutos)
  const sinTope = (minutos * metOrigen) / metDestino
  if (sinTope > MINUTOS_MAXIMOS) {
    return `${destino.name.toLowerCase()} cuesta bastante menos por minuto, así que la equivalencia exacta se iría a ${Math.round(sinTope)} min. Lo dejo en ${equivalentes}, que ya es un buen rato.`
  }
  if (metDestino > metOrigen) {
    return `${destino.name.toLowerCase()} cuesta más por minuto, así que con ${equivalentes} min haces el mismo trabajo que con ${minutos} de ${origen.name.toLowerCase()}.`
  }
  return `${destino.name.toLowerCase()} cuesta menos por minuto, así que hacen falta ${equivalentes} min para el mismo trabajo que ${minutos} de ${origen.name.toLowerCase()}.`
}
