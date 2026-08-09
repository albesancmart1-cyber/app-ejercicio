/**
 * La decisión del día, dicha en corto.
 *
 * La recomendación trae un título («Fuerza · hombro»), un mensaje de cuatro
 * líneas y una lista de razones. Eso está bien para leerlo con calma, pero a
 * las siete de la mañana lo que hace falta es **una palabra** —qué toca— y
 * **una línea** —cuánto va a costar—. El resto se pliega.
 *
 * Aquí se destila lo uno de lo otro. Sin inventar nada: todo sale de la propia
 * recomendación.
 */
import type { MuscleGroup, Recommendation } from './types'
import type { Readiness } from './readiness'
import { MUSCLE_LABELS } from './types'

export interface TituloDeHoy {
  /** El rótulo pequeño de arriba: «Hoy toca», «Hoy toca descansar»… */
  gancho: string
  /** El titular, de una o dos palabras. */
  titular: string
}

/** Los grupos que abren la sesión, escritos como se dicen. */
function zonas(focus: MuscleGroup[]): string[] {
  return focus.filter((g) => g !== 'cardio').map((g) => MUSCLE_LABELS[g].toLowerCase())
}

/**
 * Qué toca hoy, en una palabra.
 *
 * Para la fuerza se usa la zona que abre la sesión, no el título entero: «Hombro»
 * cabe en treinta y dos píxeles y «Fuerza · hombro» no. Y para lo demás, el
 * nombre de lo que es: nadie necesita que le adornen un día de descanso.
 */
export function tituloDeHoy(r: Recommendation): TituloDeHoy {
  if (r.kind === 'descanso_activo') {
    return { gancho: 'Hoy toca', titular: 'Descansar' }
  }
  if (r.kind === 'cardio_suave') {
    return { gancho: 'Hoy toca', titular: 'Moverte suave' }
  }
  const grupos = zonas(r.focus)
  if (grupos.length === 0) return { gancho: 'Hoy toca', titular: 'Fuerza' }
  const titular = grupos[0]
  return {
    gancho: 'Hoy toca',
    titular: titular.charAt(0).toUpperCase() + titular.slice(1)
  }
}

/**
 * La línea de debajo: qué zonas se tocan y cuánto va a durar.
 *
 * Los minutos son una **estimación** deliberadamente redonda: series por el
 * tiempo de una serie más su descanso. No es un cronómetro, es una idea de si
 * cabe antes de cenar.
 */
export function resumenDelPlan(r: Recommendation): string {
  if (r.kind === 'descanso_activo') {
    return 'Movilidad y paseo. Hoy el cuerpo construye, no se destruye.'
  }
  if (r.kind === 'cardio_suave') {
    return `Cardio suave${r.cardioMinutes ? ` · ${r.cardioMinutes} min` : ''}`
  }
  const grupos = zonas(r.focus)
  const lista =
    grupos.length <= 1
      ? grupos[0]
      : `${grupos.slice(0, -1).join(', ')} y ${grupos[grupos.length - 1]}`
  const partes = [lista].filter(Boolean)
  if (r.cardioMinutes) partes.push(`${r.cardioMinutes} min de cardio`)
  return partes.join(' · ')
}

export interface RazonCorta {
  texto: string
  /** El color del punto: bueno, atención o neutro. */
  tono: 'bien' | 'ojo' | 'neutro'
}

/**
 * Palabras que delatan de qué va una razón.
 *
 * Los límites de palabra no son decoración: sin ellos, «bien **descansad**o»
 * cae en el patrón de aviso por culpa de «cansad», y la frase más tranquila de
 * la app se pintaría de alarma.
 */
const DE_OJO = /molest|agujet|dolor|\bcarga|fatiga|pasad|\bcansad|dorm(ido)? (mal|poco)|parón|vuelta/i
const DE_BIEN = /bien|descansad|recuperad|listo|margen|asimil|complet|sin sufrir|admite|receptiv/i

/**
 * Las tres razones que caben en una pantalla.
 *
 * Se cogen las de la recomendación —que ya están escritas en lenguaje llano— y
 * se les pone un tono para que el punto de color diga de qué van. Tres y no
 * cinco: a partir de ahí deja de leerse y pasa a ser un párrafo.
 */
export function razonesCortas(r: Recommendation, readiness: Readiness): RazonCorta[] {
  const todas = [...r.reasons, ...readiness.notes]
  return todas.slice(0, 3).map((texto) => ({
    texto,
    tono: DE_OJO.test(texto) ? 'ojo' : DE_BIEN.test(texto) ? 'bien' : 'neutro'
  }))
}
