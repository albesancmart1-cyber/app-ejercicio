/**
 * Crononutrición: cuándo se come importa tanto como qué se come.
 *
 * La leptina y los relojes periféricos se sincronizan con los horarios de
 * comida además de con la luz. De un diario con horas salen tres cosas sin
 * preguntar nada más:
 *
 *  - **La ventana de alimentación**: de la primera comida a la última. Comer
 *    alineado con el día —ventana contenida y de día— es la parte de la
 *    crononutrición que se puede medir con un reloj.
 *  - **La cena tardía**: última comida a menos de tres horas de acostarse.
 *    Desalinea los relojes de la noche y es el factor clásico del peso matinal.
 *  - **La salida de cetosis**: una comida etiquetada con carbohidrato.
 *
 * Nada de calorías: se registra qué, cuándo y de qué tipo.
 */
import type { CheckIn, ComidaRegistrada, DiaDeComidas, EtiquetaComida } from './types'

/** A menos de estas horas de acostarse, una cena es tardía. */
export const HORAS_CENA_TARDIA = 3

/** Sin saber a qué hora te acuestas, comer a partir de esta hora cuenta como tarde. */
export const CENA_TARDE_POR_DEFECTO = '21:30'

/** «HH:MM» a minutos desde medianoche, o undefined si no es una hora. */
export function aMinutos(hora: string | undefined): number | undefined {
  if (!hora) return undefined
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim())
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return undefined
  return h * 60 + min
}

/** Minutos desde medianoche a «H:MM». */
export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24
  const m = minutos % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/** Las comidas del día ordenadas por hora; las de hora ilegible, al final. */
export function ordenadas(comidas: ComidaRegistrada[]): ComidaRegistrada[] {
  return [...comidas].sort((a, b) => (aMinutos(a.hora) ?? 9999) - (aMinutos(b.hora) ?? 9999))
}

export interface VentanaDeAlimentacion {
  primera: string
  ultima: string
  /** Duración en horas, con un decimal. */
  horas: number
}

/**
 * La ventana de alimentación del día. Con una sola comida la ventana es un
 * punto (cero horas), que también es información.
 */
export function ventanaDe(dia: DiaDeComidas | undefined): VentanaDeAlimentacion | undefined {
  const horas = (dia?.comidas ?? [])
    .map((c) => aMinutos(c.hora))
    .filter((m): m is number => m !== undefined)
  if (horas.length === 0) return undefined
  const primera = Math.min(...horas)
  const ultima = Math.max(...horas)
  return {
    primera: aHora(primera),
    ultima: aHora(ultima),
    horas: Math.round(((ultima - primera) / 60) * 10) / 10
  }
}

/**
 * ¿La última comida fue una cena tardía?
 *
 * Se mide contra la hora de acostarse del check-in si está; si no, contra las
 * 21:30 — mejor un umbral honesto y dicho que fingir que se sabe la hora.
 */
export function cenaTardia(dia: DiaDeComidas | undefined, checkIn?: CheckIn): boolean | undefined {
  const v = ventanaDe(dia)
  if (!v) return undefined
  const ultima = aMinutos(v.ultima)!
  const acostarse = aMinutos(checkIn?.horaAcostarse)
  if (acostarse !== undefined) {
    // Acostarse «de madrugada» (0:30) va después de una cena de las 23:00.
    const cama = acostarse < 6 * 60 ? acostarse + 24 * 60 : acostarse
    return cama - ultima < HORAS_CENA_TARDIA * 60
  }
  return ultima >= aMinutos(CENA_TARDE_POR_DEFECTO)!
}

/** ¿Alguna comida del día lleva la etiqueta? */
export function llevaEtiqueta(dia: DiaDeComidas | undefined, etiqueta: EtiquetaComida): boolean {
  return (dia?.comidas ?? []).some((c) => c.etiquetas?.includes(etiqueta))
}

/** ¿El día salió de cetosis? Solo se afirma si hay diario: sin comidas no se sabe. */
export function saleDeCetosis(dia: DiaDeComidas | undefined): boolean | undefined {
  if (!dia || dia.comidas.length === 0) return undefined
  return llevaEtiqueta(dia, 'carbohidrato')
}

/**
 * El resumen del día en una frase, para la tarjeta del diario.
 * Dice la ventana, y solo avisa cuando hay algo que avisar.
 */
export function resumenDelDia(dia: DiaDeComidas | undefined, checkIn?: CheckIn): string | undefined {
  const v = ventanaDe(dia)
  if (!v) return undefined
  const n = dia!.comidas.length
  const cuenta = `${n} ${n === 1 ? 'comida' : 'comidas'}`
  if (n === 1) return `${cuenta}, a las ${v.primera}.`
  const base = `${cuenta} en una ventana de ${v.horas === Math.round(v.horas) ? v.horas : v.horas.toLocaleString('es-ES')} h, de ${v.primera} a ${v.ultima}.`
  if (cenaTardia(dia, checkIn)) {
    return `${base} La última cae tarde: comer cerca de acostarte desalinea los relojes de la noche y se nota en la báscula de mañana.`
  }
  return base
}

/** Añade o sustituye una comida en el día, ordenando por hora. */
export function conComida(
  dia: DiaDeComidas | undefined,
  fecha: string,
  comida: ComidaRegistrada
): DiaDeComidas {
  const previas = dia?.comidas ?? []
  return { date: fecha, comidas: ordenadas([...previas, comida]) }
}

/** Quita la comida en la posición dada. */
export function sinComida(dia: DiaDeComidas, indice: number): DiaDeComidas {
  return { ...dia, comidas: dia.comidas.filter((_, i) => i !== indice) }
}

/** Las comidas de una fecha, del diario completo. */
export function diaDe(comidas: DiaDeComidas[] | undefined, fecha: string): DiaDeComidas | undefined {
  return comidas?.find((d) => d.date === fecha)
}
