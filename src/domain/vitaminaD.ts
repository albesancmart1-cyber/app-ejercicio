/**
 * Sol de verdad, y la vitamina D que da.
 *
 * ## La fórmula
 *
 * Se calcula la síntesis a partir del índice UV, que a su vez sale de la altura
 * real del sol. Es el modelo de referencia habitual:
 *
 * ```
 * UI/min = UVI × k × f_fototipo × f_piel × f_edad × f_altitud
 *
 * UVI  = 12,5 · cos(SZA)^1,5     con SZA = 90° − elevación (cielo despejado)
 *      = 0                        por debajo de 30° de elevación
 * k    = 21 UI/min·UVI            referencia: fototipo II, 25 % piel, 30 años
 * ```
 *
 * El corte en 30° es la regla de Holick: por debajo de esa altura el camino que
 * la luz recorre por la atmósfera es tan largo que el UVB se absorbe casi
 * entero, y la piel no sintetiza por mucho que se note el calor.
 *
 * Referencias: Webb 2006; Holick; MacLaughlin & Holick 1985; Blumthaler 1997.
 *
 * ## Qué arregla esto respecto a lo que había
 *
 * La versión anterior repartía por franjas horarias —«mediodía» de 12 a 16 h
 * valía uno y el resto un cuarto— y llevaba una función `esInviernoVitaminico()`
 * con los meses de noviembre a febrero **escritos a mano**. Eso significaba dos
 * cosas malas: que el mediodía de diciembre sintetizaba casi como el de junio, y
 * que alguien en Quito o en Tromsø recibía las suposiciones de 40° N.
 *
 * Con la elevación real las dos desaparecen solas. En Madrid en diciembre el sol
 * no pasa de 26°, así que el resultado es cero **sin que nadie tenga que saber
 * que diciembre es invierno**, y en el hemisferio sur funciona sin tocar nada.
 * Por eso `esInviernoVitaminico()` ya no existe.
 *
 * ## Lo que la fórmula no incluye, y lo que hacemos con ello
 *
 * La referencia es de cielo despejado y lo dice: sin nubes, ozono ni aerosoles.
 * Lo que se ve en el cielo se aplica encima como **un factor nuestro**, desde
 * `domain/cielo.ts`, separado a propósito para que se distinga la referencia
 * publicada de nuestra estimación.
 *
 * Y sigue siendo una **estimación, no una medida**. Por eso todo lo que sale de
 * aquí se da como rango y se escribe con «unas».
 */
import type { DiaDeSol, ExposicionSolar, FranjaSolar, PielExpuesta, Profile } from './types'
import { elevacionSolar, type Coordenadas } from './arcoSolar'
import { factorDeCielo } from './cielo'

export const FRANJAS: Record<FranjaSolar, string> = {
  manana: 'Por la mañana',
  mediodia: 'Mediodía (12–16 h)',
  tarde: 'Por la tarde'
}

/* ══════════════════════════════════════════════ CUÁNTA PIEL ══ */

/**
 * Fracción de superficie corporal expuesta, por la regla de los nueves.
 *
 * Los tres primeros identificadores son los de siempre y **no se tocan**: hay
 * exposiciones ya guardadas que los usan, y renombrarlos las dejaría sin leer.
 */
export const PIEL_PCT: Record<PielExpuesta, number> = {
  cara_manos: 5,
  antebrazos: 12,
  brazos_piernas: 30,
  torso: 45,
  banador: 70,
  entero: 90
}

export const PIELES: Record<PielExpuesta, string> = {
  cara_manos: 'Cara y manos',
  antebrazos: 'Cara, manos y antebrazos',
  brazos_piernas: 'Manga corta y pantalón corto',
  torso: 'Torso descubierto',
  banador: 'En bañador',
  entero: 'Cuerpo entero'
}

/** De la menos piel a la más, para ofrecerlas en orden. */
export const ORDEN_PIEL: PielExpuesta[] = [
  'cara_manos',
  'antebrazos',
  'brazos_piernas',
  'torso',
  'banador',
  'entero'
]

/* ══════════════════════════════════════════════ FOTOTIPO ══ */

export type Fototipo = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI'

export const ORDEN_FOTOTIPO: Fototipo[] = ['I', 'II', 'III', 'IV', 'V', 'VI']

/** Cuánto sintetiza cada fototipo respecto al II, que es la referencia de `k`. */
export const F_FOTOTIPO: Record<Fototipo, number> = {
  I: 1.5,
  II: 1,
  III: 0.7,
  IV: 0.5,
  V: 0.3,
  VI: 0.2
}

export const FOTOTIPOS: Record<Fototipo, string> = {
  I: 'Muy clara. Siempre se quema, nunca se broncea',
  II: 'Clara. Se quema con facilidad, se broncea poco',
  III: 'Media. A veces se quema, se broncea poco a poco',
  IV: 'Morena. Se quema poco, se broncea bien',
  V: 'Oscura. Rara vez se quema',
  VI: 'Muy oscura. No se quema'
}

export const FOTOTIPO_POR_DEFECTO: Fototipo = 'III'

/* ══════════════════════════════════════════════ LA FÓRMULA ══ */

const RAD = Math.PI / 180

/** UI por minuto y por unidad de índice UV, en la referencia. */
export const K_UI_POR_MIN_UVI = 21

/** La altura mínima a la que hay síntesis. Regla de Holick. */
export const ELEVACION_MINIMA = 30

/** El porcentaje de piel de la referencia de `k`. */
const PIEL_DE_REFERENCIA = 25

/**
 * El índice UV de cielo despejado a una altura del sol.
 *
 * Por debajo de 30° devuelve cero, y ahí hay un salto: justo en el umbral el
 * valor no es pequeño, es 4,4. El corte es el de la referencia y se respeta tal
 * cual — suavizarlo sería inventarse una curva que nadie ha publicado — pero
 * queda dicho para que nadie lo lea como un error.
 */
export function indiceUV(elevacionGrados: number): number {
  if (elevacionGrados < ELEVACION_MINIMA) return 0
  const sza = 90 - elevacionGrados
  return 12.5 * Math.cos(sza * RAD) ** 1.5
}

/** Cuánto pierde la piel con la edad. Nunca baja de un cuarto. */
export function factorEdad(edad: number | undefined): number {
  if (edad === undefined || !Number.isFinite(edad)) return 1
  return Math.max(0.25, 1 - 0.012 * (edad - 20))
}

/** La altitud suma UV: un 10 % por cada mil metros. */
export function factorAltitud(metros: number | undefined): number {
  if (metros === undefined || !Number.isFinite(metros)) return 1
  return 1 + 0.1 * (Math.max(0, metros) / 1000)
}

export function factorPiel(piel: PielExpuesta): number {
  return PIEL_PCT[piel] / PIEL_DE_REFERENCIA
}

/** Quién toma el sol: lo que la fórmula necesita saber de la persona. */
export interface QuienToma {
  fototipo?: Fototipo
  edad?: number
  altitudM?: number
}

export function deElPerfil(p: Profile | null | undefined): QuienToma {
  return { fototipo: p?.fototipo, edad: p?.age, altitudM: p?.altitudM }
}

/**
 * UI por minuto con el sol a una altura dada.
 *
 * Es la fórmula entera en una línea, y de aquí sale todo lo demás.
 */
export function uiPorMinuto(
  elevacionGrados: number,
  piel: PielExpuesta,
  quien: QuienToma,
  factorCielo = 1
): number {
  const uvi = indiceUV(elevacionGrados)
  if (uvi === 0) return 0
  return (
    uvi *
    K_UI_POR_MIN_UVI *
    F_FOTOTIPO[quien.fototipo ?? FOTOTIPO_POR_DEFECTO] *
    factorPiel(piel) *
    factorEdad(quien.edad) *
    factorAltitud(quien.altitudM) *
    factorCielo
  )
}

export interface RangoUI {
  min: number
  max: number
}

/**
 * El rango alrededor de la cifra.
 *
 * La fórmula da un número, pero la piel, la hidratación, el ozono del día y la
 * postura mueven el resultado tanto que darlo con decimales sería mentir. Se
 * abre un ±30 %, que es el orden de la dispersión que reconocen las propias
 * referencias.
 */
const DISPERSION = 0.3

function comoRango(ui: number): RangoUI {
  return { min: Math.round(ui * (1 - DISPERSION)), max: Math.round(ui * (1 + DISPERSION)) }
}

/**
 * La piel satura: pasada media hora eficaz, la propia piel degrada la
 * previtamina D y seguir al sol ya no suma en proporción.
 */
export const MINUTOS_EFICACES = 40

/** Techo diario razonable de síntesis. */
export const TOPE_UI_DIA = 20000

/* ══════════════════════════════════════════════ UNA EXPOSICIÓN ══ */

/** Fuera del mediodía el UVB cae en picado. Solo para registros sin hora. */
const FACTOR_FRANJA: Record<FranjaSolar, number> = {
  manana: 0.25,
  mediodia: 1,
  tarde: 0.25
}

/** El mes (1–12) de una fecha ISO. */
export function mesDe(iso: string): number {
  return Number(iso.slice(5, 7))
}

/**
 * Las UI de un rato de sol.
 *
 * Con `desde` se integra **minuto a minuto** con la altura real del sol, que es
 * lo que hace que las once de la mañana de junio y las once de diciembre dejen
 * de dar lo mismo. Sin `desde` —los registros de antes de este cambio— se usa
 * el camino viejo de la franja, para que lo ya apuntado **siga dando
 * exactamente el mismo número que daba**.
 */
export function uiDeExposicion(
  e: ExposicionSolar,
  fecha: string,
  coord?: Coordenadas,
  quien: QuienToma = {},
  desfaseMin?: number
): RangoUI {
  const minutos = Math.min(Math.max(0, e.minutos), MINUTOS_EFICACES)
  if (minutos === 0) return { min: 0, max: 0 }

  // Camino viejo: sin hora o sin coordenadas no hay elevación que calcular.
  if (e.desde === undefined || !coord) return porFranja(e, minutos, mesDe(fecha))

  const cielo = factorDeCielo(e.cielo)
  let ui = 0
  for (let i = 0; i < minutos; i++) {
    const elev = elevacionSolar(fecha, coord, e.desde + i, desfaseMin)
    ui += uiPorMinuto(elev, e.piel, quien, cielo)
  }
  return comoRango(ui)
}

/**
 * El cálculo de antes de este cambio, conservado tal cual.
 *
 * Vive aquí y no se borra porque hay exposiciones guardadas que no tienen hora,
 * y recalcularlas con la fórmula nueva les inventaría un dato que nadie apuntó.
 * Lo viejo se lee como se escribió.
 */
const UI_POR_MINUTO_VIEJO: Record<PielExpuesta, RangoUI> = {
  cara_manos: { min: 40, max: 100 },
  antebrazos: { min: 90, max: 220 },
  brazos_piernas: { min: 150, max: 350 },
  torso: { min: 300, max: 650 },
  banador: { min: 450, max: 1000 },
  entero: { min: 600, max: 1300 }
}

function porFranja(e: ExposicionSolar, minutos: number, mes: number): RangoUI {
  const base = UI_POR_MINUTO_VIEJO[e.piel]
  // La misma corrección de temporada que tenía: de noviembre a febrero, a
  // nuestra latitud, la síntesis era residual.
  const invierno = mes === 11 || mes === 12 || mes === 1 || mes === 2
  const factor = FACTOR_FRANJA[e.franja] * (invierno ? 0.05 : 1)
  return {
    min: Math.round(base.min * minutos * factor),
    max: Math.round(base.max * minutos * factor)
  }
}

/* ══════════════════════════════════════════════ EL DÍA ══ */

/**
 * Las UI del día. La cifra manual manda: si el usuario la trae de una app que
 * la calcula con más datos que nosotros, estimar por encima sería empeorarla.
 */
export function uiDelDia(
  dia: DiaDeSol | undefined,
  coord?: Coordenadas,
  quien: QuienToma = {},
  desfaseMin?: number
): RangoUI | undefined {
  if (!dia) return undefined
  if (dia.ui !== undefined) return { min: dia.ui, max: dia.ui }
  if (dia.exposiciones.length === 0) return undefined

  const suma = conMinutosEficaces(dia.exposiciones).reduce(
    (a, e) => {
      const r = uiDeExposicion(e, dia.date, coord, quien, desfaseMin)
      return { min: a.min + r.min, max: a.max + r.max }
    },
    { min: 0, max: 0 }
  )
  return { min: Math.min(suma.min, TOPE_UI_DIA), max: Math.min(suma.max, TOPE_UI_DIA) }
}

/**
 * Reparte los minutos eficaces entre las exposiciones **seguidas**.
 *
 * Existe por un agujero que abrió el poder cambiar el cielo a media sesión. La
 * piel satura a los cuarenta minutos, y ese tope se aplicaba por exposición:
 * partir una hora de sol en tres trozos —porque el cielo cambió dos veces—
 * habría dado tres topes de cuarenta en vez de uno, y la vitamina D del día
 * habría salido inflada por haber mirado al cielo.
 *
 * Lo que define «la misma exposición» no es un identificador sino el reloj:
 * dos ratos son el mismo si uno **empieza justo donde acaba el otro**. Así el
 * tope se reparte entre los trozos de una sesión y, en cambio, dos salidas
 * separadas por horas conservan cada una su cuarenta, que es lo correcto — la
 * piel ha tenido tiempo de recuperarse en medio.
 *
 * Las exposiciones sin hora —las de antes de que se guardara— no pueden
 * encadenarse con nada y se quedan cada una con su tope, como siempre.
 */
export function conMinutosEficaces(exposiciones: ExposicionSolar[]): ExposicionSolar[] {
  const conHora = exposiciones
    .filter((e) => e.desde !== undefined)
    .sort((a, b) => a.desde! - b.desde!)
  const sinHora = exposiciones.filter((e) => e.desde === undefined)

  const out: ExposicionSolar[] = []
  let finDeLaTanda: number | undefined
  let gastados = 0

  for (const e of conHora) {
    // Una tanda nueva empieza cuando esta exposición no continúa la anterior.
    if (finDeLaTanda === undefined || e.desde! !== finDeLaTanda) gastados = 0
    const queda = Math.max(0, MINUTOS_EFICACES - gastados)
    const minutos = Math.min(Math.max(0, e.minutos), queda)
    gastados += minutos
    finDeLaTanda = e.desde! + Math.max(0, e.minutos)
    out.push({ ...e, minutos })
  }

  return [...out, ...sinHora]
}

/** Los minutos totales de sol del día: los manuales si están, si no la suma. */
export function minutosDelDia(dia: DiaDeSol | undefined): number {
  if (dia?.minutos !== undefined) return Math.max(0, dia.minutos)
  return (dia?.exposiciones ?? []).reduce((a, e) => a + Math.max(0, e.minutos), 0)
}

/**
 * Cómo se escriben las UI. Un rango estimado va redondeado y con «unas» —la
 * precisión sería mentira—; una cifra exacta (min = max: la trajo el usuario)
 * se escribe tal cual, sin redondear lo que no es nuestro.
 */
export function escribirUI(r: RangoUI): string {
  if (r.min === r.max) return `${r.min.toLocaleString('es-ES')} UI`
  const red = (n: number) => (Math.round(n / 100) * 100).toLocaleString('es-ES')
  if (r.max < 100) return 'una síntesis mínima'
  return `unas ${red(r.min)}–${red(r.max)} UI`
}

/* ══════════════════════════════════════════════ QUEMARSE ══ */

/**
 * La dosis eritemática mínima de cada fototipo, en J/m².
 *
 * **Aquí nos apartamos de la fórmula de referencia a propósito, y conviene
 * dejarlo escrito.** La que venía era `MED_min = 25 / (UVI × f_fototipo)`, que
 * con un índice UV de 11,7 da 2,1 minutos para el fototipo II. Las tablas
 * publicadas de tiempo de quemadura dan unos catorce para ese caso, así que un
 * aviso construido sobre esa versión saltaría a los dos minutos casi cualquier
 * día de verano — y un aviso que salta siempre se ignora, que es lo contrario
 * de lo que debe hacer un aviso de quemadura.
 *
 * Se usa entonces la dosis en J/m² por fototipo sobre la irradiancia
 * eritemática del índice UV, que es de donde salen esas tablas.
 */
export const MED_J_M2: Record<Fototipo, number> = {
  I: 200,
  II: 250,
  III: 350,
  IV: 450,
  V: 600,
  VI: 1000
}

/** Un punto de índice UV son 0,025 W/m² de irradiancia eritemática. */
const W_POR_UVI = 0.025

/**
 * Minutos hasta empezar a enrojecer con el sol a esa altura.
 *
 * `null` cuando no hay UV que queme: de noche, o con el sol tan bajo que el
 * índice es cero. Devolver un número enorme sería peor que decir que no aplica.
 */
export function minutosParaQuemarse(
  elevacionGrados: number,
  quien: QuienToma,
  cieloFactor = 1
): number | null {
  const uvi = indiceUV(elevacionGrados) * cieloFactor
  if (uvi <= 0) return null
  const med = MED_J_M2[quien.fototipo ?? FOTOTIPO_POR_DEFECTO]
  return med / (uvi * W_POR_UVI) / 60
}

/* ══════════════════════════════════════════════ LA SEMANA ══ */

/** El día de una fecha, del registro completo. */
export function solDe(sol: DiaDeSol[] | undefined, fecha: string): DiaDeSol | undefined {
  return sol?.find((d) => d.date === fecha)
}

/** Fija los minutos y las UI manuales del día, conservando lo demás. */
export function conManual(
  dia: DiaDeSol | undefined,
  fecha: string,
  manual: { minutos?: number; ui?: number }
): DiaDeSol {
  return {
    date: fecha,
    exposiciones: dia?.exposiciones ?? [],
    ...(manual.minutos !== undefined ? { minutos: manual.minutos } : {}),
    ...(manual.ui !== undefined ? { ui: manual.ui } : {})
  }
}

/** Añade una exposición al día. */
export function conExposicion(
  dia: DiaDeSol | undefined,
  fecha: string,
  e: ExposicionSolar
): DiaDeSol {
  return { ...(dia ?? {}), date: fecha, exposiciones: [...(dia?.exposiciones ?? []), e] }
}

/** Quita la exposición en esa posición. */
export function sinExposicion(dia: DiaDeSol, indice: number): DiaDeSol {
  return { ...dia, exposiciones: dia.exposiciones.filter((_, i) => i !== indice) }
}

export interface ResumenSolar {
  /** UI acumuladas en la ventana, como rango. */
  ui: RangoUI
  /** Días con al menos un rato de sol apuntado. */
  diasConSol: number
  /** Días con síntesis de verdad: con el sol por encima del umbral. */
  diasQueSintetizan: number
  /** La ventana mirada, en días. */
  dias: number
}

/** La semana de sol: cuánta vitamina D y cuántos días sintetizaron. */
export function resumenSemanal(
  sol: DiaDeSol[] | undefined,
  todayIso: string,
  dias = 7,
  coord?: Coordenadas,
  quien: QuienToma = {}
): ResumenSolar {
  const desde = new Date(Date.parse(`${todayIso}T00:00:00Z`) - (dias - 1) * 86400000)
    .toISOString()
    .slice(0, 10)
  const ventana = (sol ?? []).filter((d) => d.date >= desde && d.date <= todayIso)
  const ui = ventana.reduce(
    (a, d) => {
      const r = uiDelDia(d, coord, quien)
      return r ? { min: a.min + r.min, max: a.max + r.max } : a
    },
    { min: 0, max: 0 }
  )
  return {
    ui,
    diasConSol: ventana.filter((d) => minutosDelDia(d) > 0).length,
    // Con la fórmula nueva «día que sintetiza» ya no es una franja horaria:
    // es que de verdad hubiera UVB, que es lo único que importaba de la franja.
    diasQueSintetizan: ventana.filter((d) => {
      const r = uiDelDia(d, coord, quien)
      return r !== undefined && r.max > 100
    }).length,
    dias
  }
}

/**
 * La nota de temporada, cuando toca.
 *
 * Ya no sale de una lista de meses: sale de que hoy, en este sitio, el arco no
 * llegue al umbral. Así aparece en Noruega en septiembre y no aparece en Quito
 * en enero, que es lo correcto y lo que la versión anterior no podía hacer.
 */
export function notaDeTemporada(
  todayIso: string,
  coord?: Coordenadas,
  elevacionMaxima?: number
): string | undefined {
  if (!coord || elevacionMaxima === undefined) return undefined
  if (elevacionMaxima >= ELEVACION_MINIMA) return undefined
  return `Hoy el sol no pasa de ${elevacionMaxima.toLocaleString('es-ES', { maximumFractionDigits: 0 })}° en tu sitio, y por debajo de ${ELEVACION_MINIMA}° la piel no sintetiza vitamina D. El rato fuera sigue contando —ancla tu reloj y tu leptina— pero la vitamina D de estos días sale de lo que guardaste en verano, del pescado azul o de un suplemento.`
}
