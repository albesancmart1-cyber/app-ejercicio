/**
 * Dónde está el sol, para ti, hoy.
 *
 * Todo lo demás cuelga de aquí. La app no trabaja con «de día» y «de noche»,
 * porque esas dos palabras esconden justo lo que importa: **la altura del sol
 * sobre el horizonte**, que es lo que decide qué luz llega y qué enciende en el
 * cuerpo. A −6° hay azul suficiente para poner el reloj en hora aunque el sol
 * no haya salido; a +30° la piel puede fabricar vitamina D y por debajo no; y
 * entre medias hay un mundo que un «amanece sobre las siete» no distingue.
 *
 * Se metan las coordenadas una vez y el resto sale solo, cambiando cada día,
 * sin red y sin pedirle permiso de ubicación a nadie.
 *
 * ## De dónde salen los números
 *
 * Es el algoritmo solar de la NOAA, el mismo de su calculadora pública. De la
 * fecha salen dos cosas: la **declinación** —cuánto se inclina la Tierra hacia
 * el sol hoy— y la **ecuación del tiempo**, que corrige que el día solar no
 * dure exactamente veinticuatro horas. Con eso y con tu latitud, el ángulo
 * horario de cualquier altura sale de una sola igualdad:
 *
 *     cos H = (sen h − sen φ · sen δ) / (cos φ · cos δ)
 *
 * Su precisión es de **±1 minuto** por debajo de los 72° de latitud, que es
 * más fina de lo que necesita cualquier decisión que se vaya a tomar con ella.
 *
 * ## Lo que pasa cuando un umbral no ocurre
 *
 * Ese coseno se sale del rango −1 a 1 cuando el sol **no llega** a esa altura
 * ese día, o cuando **nunca baja** de ella. En Madrid, en diciembre, el sol no
 * pasa de 26°: no hay ventana de UVB, y no la hay de verdad. La respuesta
 * entonces es `null` y no una hora inventada — la app dirá que ese día no había
 * nada que coger, que es información y no un fallo del usuario.
 */

/** Grados a radianes y vuelta. La trigonometría de JS trabaja en radianes. */
const RAD = Math.PI / 180
const sen = (grados: number) => Math.sin(grados * RAD)
const cos = (grados: number) => Math.cos(grados * RAD)

/**
 * Dónde estás. La longitud va **con el este positivo**, que es el convenio
 * geográfico: Madrid es −3,70 y Atenas +23,73.
 */
export interface Coordenadas {
  lat: number
  lon: number
}

/**
 * Las alturas del sol que significan algo, de la noche cerrada al mediodía.
 *
 * No son tramos elegidos por gusto: cada uno enciende o apaga una cosa distinta,
 * y por eso la app los lleva por separado en vez de resumirlos en «horas de
 * sol».
 */
export type Umbral = 'astronomico' | 'nautico' | 'civil' | 'orto' | 'uva' | 'uvb'

/**
 * A qué altura ocurre cada uno.
 *
 * El orto y el ocaso van a **−0,833°** y no a cero: el sol se ve cuando su
 * borde superior toca el horizonte, no su centro, y la atmósfera además lo
 * levanta ópticamente un poco. Descontar esos dos efectos es la diferencia
 * entre acertar el amanecer y equivocarlo en cuatro minutos.
 *
 * Los de +10° y +30° son **aproximaciones**, y conviene decirlo: el UVA y el
 * UVB no tienen una frontera física a una altura exacta —dependen del ozono, de
 * la altitud y de las nubes—. Son el umbral por debajo del cual la atmósfera se
 * come prácticamente todo, y por eso la vitamina D se dará siempre como rango.
 */
export const ALTURAS: Record<Umbral, number> = {
  astronomico: -18,
  nautico: -12,
  civil: -6,
  orto: -0.833,
  uva: 10,
  uvb: 30
}

export const NOMBRES_UMBRAL: Record<Umbral, string> = {
  astronomico: 'Crepúsculo astronómico',
  nautico: 'Crepúsculo náutico',
  civil: 'Crepúsculo civil',
  orto: 'Amanecer',
  uva: 'Sol a 10°',
  uvb: 'Sol a 30°'
}

/** Qué significa cada altura, en una frase. */
export const QUE_TRAE: Record<Umbral, string> = {
  astronomico: 'Oscuridad real. Aquí empieza y acaba la noche biológica.',
  nautico: 'Se distingue el horizonte. Todavía no hay señal circadiana útil.',
  civil: 'Ya hay azul suficiente para poner tu reloj en hora.',
  orto: 'Rojo e infrarrojo, con la refracción de la atmósfera ya descontada.',
  uva: 'Empieza el UVA: óxido nítrico y vasodilatación.',
  uvb: 'La única ventana en que tu piel puede fabricar vitamina D.'
}

/** Los dos momentos de un umbral: subiendo por la mañana y bajando por la tarde. */
export interface Paso {
  /** Minutos desde la medianoche local, o `null` si hoy no ocurre. */
  manana: number | null
  tarde: number | null
}

/** El arco de un día concreto en un sitio concreto. */
export interface ArcoDelDia {
  fecha: string
  /** Minutos desde medianoche local en que el sol está más alto. */
  mediodiaSolar: number
  /** Cuánto sube el sol hoy, como mucho. */
  elevacionMaxima: number
  /** Y cuánto baja de madrugada. Sirve para saber si hay noche de verdad. */
  elevacionMinima: number
  /** Cada umbral con su ida y su vuelta. */
  pasos: Record<Umbral, Paso>
  /**
   * De la salida al ocaso, en minutos. `1440` si el sol no se pone y `0` si no
   * sale — los dos casos existen y no son un error que haya que esconder.
   */
  duracionDiaMin: number
  /** Cuánta noche por debajo de −18°, que es la que de verdad repara. */
  nocheAstronomicaMin: number
}

/**
 * El día juliano a las 0 h UT de una fecha del calendario gregoriano.
 * Meucus, capítulo 7. Enero y febrero cuentan como meses 13 y 14 del año
 * anterior, que es lo que hace que el año bisiesto encaje sin casos especiales.
 */
function diaJuliano(anio: number, mes: number, dia: number): number {
  let a = anio
  let m = mes
  if (m <= 2) {
    a -= 1
    m += 12
  }
  const siglo = Math.floor(a / 100)
  const gregoriano = 2 - siglo + Math.floor(siglo / 4)
  return (
    Math.floor(365.25 * (a + 4716)) + Math.floor(30.6001 * (m + 1)) + dia + gregoriano - 1524.5
  )
}

/** Declinación del sol (grados) y ecuación del tiempo (minutos) para un instante. */
function posicionSolar(jd: number): { declinacion: number; ecuacionTiempo: number } {
  const t = (jd - 2451545) / 36525 // siglos julianos desde J2000

  // Longitud media geométrica y anomalía media del sol.
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const excentricidad = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)

  // Ecuación del centro: la órbita es una elipse, no un círculo.
  const centro =
    sen(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sen(2 * m) * (0.019993 - 0.000101 * t) +
    sen(3 * m) * 0.000289

  const omega = 125.04 - 1934.136 * t // nodo de la órbita lunar, para la nutación
  const lambda = l0 + centro - 0.00569 - 0.00478 * sen(omega)

  const oblicuidadMedia = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const oblicuidad = oblicuidadMedia + 0.00256 * cos(omega)

  const declinacion = Math.asin(sen(oblicuidad) * sen(lambda)) / RAD

  const y = Math.tan((oblicuidad / 2) * RAD) ** 2
  const ecuacionTiempo =
    (4 *
      (y * sen(2 * l0) -
        2 * excentricidad * sen(m) +
        4 * excentricidad * y * sen(m) * cos(2 * l0) -
        0.5 * y * y * sen(4 * l0) -
        1.25 * excentricidad * excentricidad * sen(2 * m))) /
    RAD

  return { declinacion, ecuacionTiempo }
}

/** Parte una fecha ISO en sus tres números, sin pasar por `Date`. */
function partes(fechaIso: string): [number, number, number] {
  const [a, m, d] = fechaIso.split('-').map(Number)
  return [a, m, d]
}

/**
 * Cuántos minutos va tu reloj por delante de UTC ese día.
 *
 * Se lee del propio dispositivo y no de una tabla, para que el cambio de hora
 * se resuelva solo: en Madrid son 60 en enero y 120 en julio, y ni la app ni el
 * usuario tienen que acordarse de nada. Se pregunta **al mediodía** de la fecha
 * porque es la hora que con seguridad no cae dentro del salto.
 */
export function desfaseHorario(fechaIso: string): number {
  const [a, m, d] = partes(fechaIso)
  return -new Date(a, m - 1, d, 12, 0, 0).getTimezoneOffset()
}

/** Estado del sol de un día, ya resuelto, para no recalcularlo en cada pregunta. */
interface Dia {
  declinacion: number
  mediodiaSolar: number
  lat: number
}

function diaDe(fechaIso: string, coord: Coordenadas, desfaseMin: number): Dia {
  const [a, m, d] = partes(fechaIso)
  // El mediodía local expresado en día juliano: es donde la NOAA evalúa el día.
  const jd = diaJuliano(a, m, d) + 0.5 - desfaseMin / 1440
  const { declinacion, ecuacionTiempo } = posicionSolar(jd)
  const mediodiaSolar = 720 - 4 * coord.lon - ecuacionTiempo + desfaseMin
  return { declinacion, mediodiaSolar, lat: coord.lat }
}

/**
 * A qué altura está el sol en un momento del día.
 *
 * `minutos` va desde la medianoche local: las 9:45 son 585.
 */
export function elevacionSolar(
  fechaIso: string,
  coord: Coordenadas,
  minutos: number,
  desfaseMin = desfaseHorario(fechaIso)
): number {
  const dia = diaDe(fechaIso, coord, desfaseMin)
  return elevacionEn(dia, minutos)
}

function elevacionEn(dia: Dia, minutos: number): number {
  // Cada minuto de reloj son cuatro minutos de arco: 360° en 1 440 minutos.
  const anguloHorario = (minutos - dia.mediodiaSolar) / 4
  const s =
    sen(dia.lat) * sen(dia.declinacion) +
    cos(dia.lat) * cos(dia.declinacion) * cos(anguloHorario)
  return Math.asin(Math.max(-1, Math.min(1, s))) / RAD
}

/**
 * A qué hora el sol pasa por una altura dada, subiendo y bajando.
 *
 * Devuelve `null` en los dos casos en que la pregunta no tiene respuesta hoy:
 * cuando el sol **no llega** tan alto y cuando **no baja** tanto. Son cosas
 * distintas y el que llama puede distinguirlas mirando `elevacionMaxima` y
 * `elevacionMinima` del arco.
 */
export function horaDeElevacion(
  fechaIso: string,
  coord: Coordenadas,
  grados: number,
  desfaseMin = desfaseHorario(fechaIso)
): Paso {
  return pasoEn(diaDe(fechaIso, coord, desfaseMin), grados)
}

function pasoEn(dia: Dia, grados: number): Paso {
  const divisor = cos(dia.lat) * cos(dia.declinacion)
  // En los polos exactos el divisor es cero y la igualdad no tiene solución.
  if (Math.abs(divisor) < 1e-12) return { manana: null, tarde: null }

  const c = (sen(grados) - sen(dia.lat) * sen(dia.declinacion)) / divisor
  if (c < -1 || c > 1) return { manana: null, tarde: null }

  const anguloHorario = Math.acos(c) / RAD
  return {
    manana: dia.mediodiaSolar - 4 * anguloHorario,
    tarde: dia.mediodiaSolar + 4 * anguloHorario
  }
}

const UMBRALES = Object.keys(ALTURAS) as Umbral[]

/** El día entero, resuelto de una vez. */
export function arcoDelDia(
  fechaIso: string,
  coord: Coordenadas,
  desfaseMin = desfaseHorario(fechaIso)
): ArcoDelDia {
  const dia = diaDe(fechaIso, coord, desfaseMin)

  const pasos = {} as Record<Umbral, Paso>
  for (const u of UMBRALES) pasos[u] = pasoEn(dia, ALTURAS[u])

  const elevacionMaxima = elevacionEn(dia, dia.mediodiaSolar)
  // La medianoche solar cae doce horas de la otra: ahí es donde el sol está más bajo.
  const elevacionMinima = elevacionEn(dia, dia.mediodiaSolar + 720)

  const orto = pasos.orto
  const duracionDiaMin =
    orto.manana !== null && orto.tarde !== null
      ? orto.tarde - orto.manana
      : elevacionMaxima > ALTURAS.orto
        ? 1440 // sol de medianoche: no llega a ponerse
        : 0 // noche polar: no llega a salir

  const astro = pasos.astronomico
  const nocheAstronomicaMin =
    astro.manana !== null && astro.tarde !== null
      ? 1440 - (astro.tarde - astro.manana)
      : elevacionMinima < ALTURAS.astronomico
        ? 1440 // no amanece en todo el día
        : 0 // nunca llega a hacerse de noche del todo

  return {
    fecha: fechaIso,
    mediodiaSolar: dia.mediodiaSolar,
    elevacionMaxima,
    elevacionMinima,
    pasos,
    duracionDiaMin,
    nocheAstronomicaMin
  }
}

/**
 * Cuánto ha cambiado la duración del día desde ayer, en segundos.
 *
 * Es un dato pequeño y hace un trabajo grande: en marzo son casi cuatro minutos
 * **por día**, y ver ese número explica por qué el cuerpo va a remolque en los
 * cambios de estación mejor que cualquier explicación.
 */
export function cambioDesdeAyer(fechaIso: string, coord: Coordenadas): number {
  const hoy = arcoDelDia(fechaIso, coord)
  const ayer = arcoDelDia(sumarDiaIso(fechaIso, -1), coord)
  return Math.round((hoy.duracionDiaMin - ayer.duracionDiaMin) * 60)
}

/** Suma días a una fecha ISO sin arrastrar la zona horaria. */
export function sumarDiaIso(fechaIso: string, dias: number): string {
  const [a, m, d] = partes(fechaIso)
  const x = new Date(Date.UTC(a, m - 1, d))
  x.setUTCDate(x.getUTCDate() + dias)
  return x.toISOString().slice(0, 10)
}

/** Minutos desde medianoche a «06:45», que es como se leen. */
export function escribirHora(minutos: number | null): string {
  if (minutos === null || !Number.isFinite(minutos)) return '—'
  // Un umbral puede caer antes de medianoche o después: se envuelve el día.
  const m = ((Math.round(minutos) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Una duración en minutos a «15 h 04 min». */
export function escribirDuracion(minutos: number): string {
  const m = Math.round(minutos)
  const horas = Math.floor(m / 60)
  const resto = m % 60
  if (horas === 0) return `${resto} min`
  if (resto === 0) return `${horas} h`
  return `${horas} h ${String(resto).padStart(2, '0')} min`
}

/** Una altura del sol como se dice en español: «26,1°». */
export function escribirGrados(grados: number): string {
  return `${grados.toLocaleString('es-ES', { maximumFractionDigits: 1 })}°`
}

/** La hora actual como minutos desde la medianoche local. */
export function minutosDeAhora(ahora = new Date()): number {
  return ahora.getHours() * 60 + ahora.getMinutes()
}
