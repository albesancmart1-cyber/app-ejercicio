/**
 * Los dos relojes, y la distancia entre ellos.
 *
 * No hay un reloj en el cuerpo: hay dos, y no se hablan si nadie los presenta.
 *
 *  - **El central** vive detrás de los ojos y solo escucha a la luz. Se pone en
 *    hora con el primer azul de la mañana y con nada más: ni con la alarma, ni
 *    con el café, ni con las ganas que tengas de estar despierto.
 *  - **El periférico** está en el hígado, en el páncreas, en el músculo, y
 *    escucha a la comida. Un desayuno a las seis lo pone a las seis, diga lo
 *    que diga el de arriba.
 *
 * Cuando los dos van a horas distintas eso tiene nombre —**desincronización
 * interna**— y consecuencias medibles: la insulina se comporta peor ante la
 * misma comida, la leptina llega tarde con su mensaje de saciedad, y el cuerpo
 * guarda energía a una hora en la que debería gastarla.
 *
 * Este módulo calcula esa distancia. Es, probablemente, el número más útil de
 * toda la app, porque es el único que explica por qué alguien que come lo
 * mismo que el año pasado ha engordado.
 *
 * ## Por qué se mide así y no de otra forma
 *
 * El reloj central se marca con **la primera luz que de verdad sirve**: estar
 * fuera con el sol por encima del crepúsculo civil. No vale encender la
 * lámpara del pasillo, y no vale la ventana con la persiana bajada.
 *
 * El periférico se marca con **la primera cosa que se mete en el cuerpo**, y el
 * café cuenta. Esto sorprende y conviene decirlo: el café solo, sin azúcar y
 * sin leche, abre la ventana del hígado igual que un plato. Quien desayuna a
 * las siete «solo un café» y come a las dos no está haciendo doce horas de
 * ayuno; está haciendo siete.
 */
import { ALTURAS, arcoDelDia, elevacionSolar, type Coordenadas } from './arcoSolar'
import type { ComidaRegistrada, DiaDeComidas, SalidaAlExterior } from './types'

/** «08:18» a minutos desde medianoche. */
export function minutosDeHora(hhmm: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return undefined
  return h * 60 + min
}

export interface DosRelojes {
  /** Minutos desde medianoche en que entró la primera luz útil, si entró. */
  central?: number
  /** Minutos en que se abrió la ventana de comida, si se abrió. */
  periferico?: number
  /**
   * Periférico menos central, en minutos.
   *
   * **Negativo significa que comiste antes de ver luz**, que es el caso que
   * importa y el más común en quien ficha de noche. Positivo y pequeño es lo
   * normal y sano; positivo y enorme es otra cosa —haber visto el amanecer y
   * no comer hasta la tarde— que no es un problema.
   */
  distanciaMin?: number
  /** Si la distancia pasa del umbral que se considera desincronización. */
  desincronizado: boolean
  /** Qué falta para poder decir algo, cuando falta. */
  falta?: 'luz' | 'comida' | 'ambas'
}

/**
 * A partir de cuántos minutos comiendo antes de la luz se considera que los dos
 * relojes van a distinta hora.
 *
 * Hay que elegir un número. Una hora es el orden de magnitud a partir del cual
 * la literatura de crononutrición empieza a ver diferencias en la respuesta a
 * la misma comida, y por debajo de eso señalar a alguien sería ruido. Se marca
 * solo el lado que importa: comer antes de ver luz.
 */
export const MINUTOS_QUE_DESINCRONIZAN = 60

/** La primera luz útil del día: fuera, y con el sol lo bastante alto. */
export function primeraLuz(
  fechaIso: string,
  coord: Coordenadas,
  salidas: SalidaAlExterior[] | undefined,
  desfaseMin?: number
): number | undefined {
  const delDia = (salidas ?? [])
    .filter((s) => s.date === fechaIso)
    .sort((a, b) => a.desde - b.desde)

  for (const s of delDia) {
    // Dentro del rato, el primer minuto en que el sol ya está por encima del
    // crepúsculo civil. Salir a las 06:40 cuando el civil es a las 06:50 cuenta,
    // pero desde las 06:50 y no desde que abriste la puerta.
    const fin = s.desde + Math.max(0, s.minutos)
    for (let m = s.desde; m <= fin; m++) {
      if (elevacionSolar(fechaIso, coord, m, desfaseMin) >= ALTURAS.civil) return m
    }
  }
  return undefined
}

/** La apertura de la ventana de comida. El café cuenta. */
export function primeraComida(dia: DiaDeComidas | undefined): number | undefined {
  const horas = (dia?.comidas ?? [])
    .map((c: ComidaRegistrada) => minutosDeHora(c.hora))
    .filter((x): x is number => x !== undefined)
  return horas.length > 0 ? Math.min(...horas) : undefined
}

export function dosRelojes(
  fechaIso: string,
  coord: Coordenadas,
  salidas: SalidaAlExterior[] | undefined,
  dia: DiaDeComidas | undefined,
  desfaseMin?: number
): DosRelojes {
  const central = primeraLuz(fechaIso, coord, salidas, desfaseMin)
  const periferico = primeraComida(dia)

  if (central === undefined || periferico === undefined) {
    return {
      central,
      periferico,
      desincronizado: false,
      falta:
        central === undefined && periferico === undefined
          ? 'ambas'
          : central === undefined
            ? 'luz'
            : 'comida'
    }
  }

  const distanciaMin = periferico - central
  return {
    central,
    periferico,
    distanciaMin,
    desincronizado: distanciaMin < -MINUTOS_QUE_DESINCRONIZAN
  }
}

/**
 * Cuántos días seguidos, mirando hacia atrás, se comió antes de ver luz.
 *
 * Un día suelto no significa nada. Cuatro seguidos sí, y es la diferencia entre
 * un dato curioso y una explicación.
 */
export function rachaDesincronizada(
  fechaIso: string,
  coord: Coordenadas,
  salidas: SalidaAlExterior[] | undefined,
  comidas: DiaDeComidas[] | undefined,
  desfasePara: (iso: string) => number | undefined,
  maxDias = 14
): number {
  let racha = 0
  let fecha = fechaIso
  for (let i = 0; i < maxDias; i++) {
    const dia = (comidas ?? []).find((d) => d.date === fecha)
    const r = dosRelojes(fecha, coord, salidas, dia, desfasePara(fecha))
    // Un día sin datos corta la racha en vez de darla por buena o por mala.
    if (r.distanciaMin === undefined) break
    if (!r.desincronizado) break
    racha++
    const d = new Date(`${fecha}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    fecha = d.toISOString().slice(0, 10)
  }
  return racha
}

/**
 * Si hubo pulso de luz de la mañana: el rato fuera que pone el reloj en hora.
 *
 * Es lo que decide si el día empezó bien, y se usa tanto para la deuda de fase
 * como para la explicación del peso.
 */
export function huboPulsoDeManana(
  fechaIso: string,
  coord: Coordenadas,
  salidas: SalidaAlExterior[] | undefined,
  desfaseMin?: number
): boolean {
  const luz = primeraLuz(fechaIso, coord, salidas, desfaseMin)
  if (luz === undefined) return false
  const arco = arcoDelDia(fechaIso, coord, desfaseMin)
  const orto = arco.pasos.orto.manana
  // Vale desde el crepúsculo civil hasta hora y media después de la salida:
  // pasado eso, el pulso pierde la fuerza que tiene para mover la fase.
  return orto === null || luz <= orto + 90
}

/** La distancia, dicha como se dice: «1 h 20 antes de ver luz». */
export function escribirDistancia(d: DosRelojes): string {
  if (d.distanciaMin === undefined) return '—'
  const abs = Math.abs(d.distanciaMin)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const cuanto = h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
  if (d.distanciaMin < 0) return `${cuanto} antes de ver luz`
  if (d.distanciaMin === 0) return 'a la vez'
  return `${cuanto} después de la luz`
}
