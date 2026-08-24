/**
 * Sol de verdad, y la vitamina D que da.
 *
 * ## La fórmula
 *
 * ```
 * UI/min = UVIvitD × k × f_fototipo × f_piel × f_edad × f_altitud × f_cielo
 *
 * UVIvitD = UVI(elevación, ozono) × G(elevación, ozono)
 * k       = 21 UI/min·UVI    referencia: fototipo II, 25 % piel, 20 años,
 *                            sol en la vertical y 300 DU de ozono
 * ```
 *
 * El índice UV sale de `atmosfera.ts` y está pesado con la curva de la
 * quemadura, que es lo que significa. La vitamina D se sintetiza con luz **más
 * corta** —alrededor de 298 nm, contra los ~308 nm efectivos del eritema—, y el
 * ozono absorbe mucho más fuerte ahí. `G` es exactamente esa diferencia: la
 * absorción de ozono *de más* que sufre la banda de la vitamina D a lo largo
 * del camino real por la atmósfera.
 *
 * ```
 * G = exp( Δσ · (300 − Ω · m) )        Δσ = 6,85·10⁻³ por DU
 * ```
 *
 * Que sea una **diferencia** entre dos longitudes de onda vecinas es lo que la
 * hace fiable: el Rayleigh, los aerosoles y la luz difusa son casi iguales a
 * 298 y a 308 nm, así que se cancelan y no hay que modelarlos. Vale 1 en la
 * referencia por construcción.
 *
 * ## Qué arregla esto
 *
 * Antes había un `k` fijo por punto de índice UV, y eso da por hecho que la
 * proporción entre vitamina D y quemadura es siempre la misma. No lo es, ni de
 * lejos: del sol en la vertical al sol a 30° de altura, la vitamina D cae unas
 * ocho veces más deprisa que la quemadura. Ese error era la razón de ser del
 * corte en 30° —un parche para que el modelo no inventara vitamina D por la
 * tarde—, y quitando la causa se puede quitar el parche. Ahora la curva baja
 * sola, sin acantilado, y un rato de sol de invierno da lo poco que da en vez
 * de dar cero.
 *
 * ## Ni tope ni rango
 *
 * **No hay techo diario.** Había uno de 20 000 UI y ya no está. Tampoco se
 * cortan los minutos: se integra minuto a minuto todo el rato que estuviste,
 * con la altura real del sol en cada uno.
 *
 * Lo que sale es entonces la **síntesis bruta**: todo lo que la piel fabricó.
 * Conviene saber lo que eso quiere decir, porque es una decisión y no un
 * descuido. Pasado un rato largo al sol, la propia luz empieza a romper la
 * previtamina D recién hecha, así que lo que acaba llegando a la sangre se
 * aplana aunque sigas fuera. Esta cifra **no descuenta eso**: dice lo
 * fabricado, no lo que sobrevive. En exposiciones cortas son lo mismo; en tres
 * horas al sol de agosto, no.
 *
 * Y sale **un número**, no un intervalo. Antes se daba ±30 %, y buena parte de
 * esa horquilla era el ozono, que ahora se modela en vez de esconderse dentro
 * de ella. Sigue siendo una estimación —la piel, la hidratación y la postura
 * mueven el resultado y nadie lleva un espectrorradiómetro— pero es la mejor
 * cifra que se puede dar con lo que la app sabe, y darla entera permite
 * compararla consigo misma de un día para otro, que es para lo que sirve.
 *
 * ## La comprobación que lo ata todo
 *
 * `k` no está elegido a ojo. Sale de cruzar dos cosas que ya estaban en este
 * fichero: una MED de fototipo II son 250 J/m², y la literatura sitúa la
 * síntesis de una MED a cuerpo entero en torno a 12 000 UI. En la referencia
 * eso da 20 UI/min para el 25 % de piel, contra los 21 que se usan. Está
 * escrito como prueba, así que si alguien mueve una constante y rompe la
 * coherencia, salta.
 *
 * ## Lo que la fórmula no incluye
 *
 * El cielo. La referencia es de cielo despejado y lo dice. Lo que se ve encima
 * se aplica como **un factor nuestro**, desde `domain/cielo.ts`, separado a
 * propósito para que se distinga la referencia publicada de nuestra estimación.
 *
 * Referencias: Webb 2006; Holick; MacLaughlin & Holick 1985; Blumthaler 1997;
 * Kasten & Young 1989.
 */
import type { DiaDeSol, ExposicionSolar, FranjaSolar, PielExpuesta, Profile } from './types'
import { elevacionSolar, type Coordenadas } from './arcoSolar'
import { factorDeCielo } from './cielo'
import { OZONO_DE_REFERENCIA, indiceUV, masaDeAire, ozonoDU } from './atmosfera'

export { OZONO_DE_REFERENCIA, indiceUV, masaDeAire, ozonoDU } from './atmosfera'

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

/** UI por minuto y por unidad de índice UV efectivo, en la referencia. */
export const K_UI_POR_MIN_UVI = 21

/**
 * La altura por debajo de la cual la síntesis es residual.
 *
 * **Ya no es un corte**: la fórmula no la usa para nada y devuelve la cifra que
 * toque a cualquier altura. Se conserva como umbral *de aviso*, para decidir
 * cuándo la app menciona que hoy el sol no da para vitamina D, y ese es el
 * único sitio donde aparece.
 */
export const ELEVACION_MINIMA = 30

/** El porcentaje de piel de la referencia de `k`. */
const PIEL_DE_REFERENCIA = 25

/**
 * La absorción de ozono *de más* que sufre la banda de la vitamina D, por DU.
 *
 * Sale de la diferencia de sección eficaz del ozono entre las dos longitudes de
 * onda efectivas —unos 2,55·10⁻¹⁹ cm² entre 298 y 308 nm— multiplicada por las
 * 2,687·10¹⁶ moléculas por cm² que tiene una unidad Dobson.
 */
const DELTA_TAU_POR_DU = 6.85e-3

/**
 * Cuánto se aparta la vitamina D del índice UV en estas condiciones.
 *
 * Vale 1 con el sol en la vertical y 300 DU, y baja deprisa según el sol cae o
 * el ozono sube, porque el camino se alarga y la banda de la vitamina D paga
 * ese camino mucho más cara que la de la quemadura.
 */
export function factorVitaminaD(elevacionGrados: number, ozono = OZONO_DE_REFERENCIA): number {
  if (elevacionGrados <= 0) return 0
  return Math.exp(DELTA_TAU_POR_DU * (OZONO_DE_REFERENCIA - ozono * masaDeAire(elevacionGrados)))
}

/**
 * El índice UV *pesado para la vitamina D*: lo que de verdad la sintetiza.
 *
 * No es el índice UV que dan los partes, y no debe enseñarse como si lo fuera.
 * El de los partes está pesado con la curva de la quemadura y es el que usa
 * `minutosParaQuemarse`.
 */
export function uviVitaminaD(elevacionGrados: number, ozono = OZONO_DE_REFERENCIA): number {
  return indiceUV(elevacionGrados, ozono) * factorVitaminaD(elevacionGrados, ozono)
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
  factorCielo = 1,
  ozono = OZONO_DE_REFERENCIA
): number {
  const uvi = uviVitaminaD(elevacionGrados, ozono)
  if (uvi <= 0) return 0
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
): number {
  const minutos = Math.max(0, Math.round(e.minutos))
  if (minutos === 0) return 0

  // Camino viejo: sin hora o sin coordenadas no hay elevación que calcular.
  if (e.desde === undefined || !coord) return porFranja(e, minutos, mesDe(fecha))

  const cielo = factorDeCielo(e.cielo)
  const ozono = ozonoDU(coord.lat, fecha)
  let ui = 0
  for (let i = 0; i < minutos; i++) {
    const elev = elevacionSolar(fecha, coord, e.desde + i, desfaseMin)
    ui += uiPorMinuto(elev, e.piel, quien, cielo, ozono)
  }
  return ui
}

/**
 * El cálculo de antes de este cambio, conservado tal cual.
 *
 * Vive aquí y no se borra porque hay exposiciones guardadas que no tienen hora,
 * y recalcularlas con la fórmula nueva les inventaría un dato que nadie apuntó.
 * Lo viejo se lee como se escribió.
 *
 * Lo único que cambia es que aquello daba una horquilla y ahora hay que dar un
 * número: se toma **el centro** de la que daba. No se elige el extremo bajo ni
 * el alto porque las dos cosas serían una opinión sobre datos que ya no se
 * pueden mejorar.
 */
const UI_POR_MINUTO_VIEJO: Record<PielExpuesta, { min: number; max: number }> = {
  cara_manos: { min: 40, max: 100 },
  antebrazos: { min: 90, max: 220 },
  brazos_piernas: { min: 150, max: 350 },
  torso: { min: 300, max: 650 },
  banador: { min: 450, max: 1000 },
  entero: { min: 600, max: 1300 }
}

function porFranja(e: ExposicionSolar, minutos: number, mes: number): number {
  const base = UI_POR_MINUTO_VIEJO[e.piel]
  // La misma corrección de temporada que tenía: de noviembre a febrero, a
  // nuestra latitud, la síntesis era residual.
  const invierno = mes === 11 || mes === 12 || mes === 1 || mes === 2
  const factor = FACTOR_FRANJA[e.franja] * (invierno ? 0.05 : 1)
  return ((base.min + base.max) / 2) * minutos * factor
}

/* ══════════════════════════════════════════════ EL DÍA ══ */

/**
 * Las UI del día. La cifra manual manda: si el usuario la trae de una app que
 * la calcula con más datos que nosotros, estimar por encima sería empeorarla.
 *
 * Se suman las exposiciones y ya está: **sin techo y sin repartir nada**. Antes
 * había que repartir cuarenta minutos eficaces entre las exposiciones seguidas,
 * porque el tope se aplicaba a cada una y partir una sesión en trozos —al
 * cambiar el cielo— la habría multiplicado. Sin tope no hay nada que repartir:
 * cada minuto real cuenta una vez, así que partir la sesión no puede inflar
 * nada por construcción. `conMinutosEficaces` se fue con el tope.
 */
export function uiDelDia(
  dia: DiaDeSol | undefined,
  coord?: Coordenadas,
  quien: QuienToma = {},
  desfaseMin?: number
): number | undefined {
  if (!dia) return undefined
  if (dia.ui !== undefined) return dia.ui
  if (dia.exposiciones.length === 0) return undefined
  return dia.exposiciones.reduce(
    (a, e) => a + uiDeExposicion(e, dia.date, coord, quien, desfaseMin),
    0
  )
}

/** Los minutos totales de sol del día: los manuales si están, si no la suma. */
export function minutosDelDia(dia: DiaDeSol | undefined): number {
  if (dia?.minutos !== undefined) return Math.max(0, dia.minutos)
  return (dia?.exposiciones ?? []).reduce((a, e) => a + Math.max(0, e.minutos), 0)
}

/**
 * Cómo se escriben las UI: la cifra entera, sin redondear a cientos y sin
 * «unas» delante.
 *
 * Antes se redondeaba al centenar porque lo que había detrás era una horquilla
 * de ±30 % y fingir precisión habría sido mentir. Ahora hay una cifra, así que
 * esconderle los dos últimos dígitos sería tirar información que el usuario ha
 * pedido ver. Sigue siendo una estimación —eso se dice donde toca— pero es
 * *esta* estimación y no un rango que él tenga que promediar de cabeza.
 */
export function escribirUI(ui: number): string {
  return `${Math.round(ui).toLocaleString('es-ES')} UI`
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
 * Por debajo de este índice UV no se habla de quemarse.
 *
 * Uno es el escalón más bajo que reportan los servicios meteorológicos, y por
 * debajo de él no es que tardes mucho: es que no te quemas.
 */
const UVI_QUE_QUEMA = 1

/**
 * Minutos hasta empezar a enrojecer con el sol a esa altura.
 *
 * `null` cuando no hay UV que queme de verdad: de noche, o con el sol tan bajo
 * que harían falta horas. Antes ese `null` salía del corte en 30°, que ya no
 * existe; ahora sale de un índice UV mínimo, que es la razón de verdad. Decir
 * «te quemas en once horas» es peor que decir que no aplica.
 */
export function minutosParaQuemarse(
  elevacionGrados: number,
  quien: QuienToma,
  cieloFactor = 1,
  ozono = OZONO_DE_REFERENCIA
): number | null {
  const uvi = indiceUV(elevacionGrados, ozono) * cieloFactor
  if (uvi < UVI_QUE_QUEMA) return null
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
  /** UI acumuladas en la ventana. */
  ui: number
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
  const ui = ventana.reduce((a, d) => a + (uiDelDia(d, coord, quien) ?? 0), 0)
  return {
    ui,
    diasConSol: ventana.filter((d) => minutosDelDia(d) > 0).length,
    // Con la fórmula nueva «día que sintetiza» ya no es una franja horaria:
    // es que de verdad hubiera UVB, que es lo único que importaba de la franja.
    diasQueSintetizan: ventana.filter((d) => (uiDelDia(d, coord, quien) ?? 0) > 100).length,
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
  return `Hoy el sol no pasa de ${elevacionMaxima.toLocaleString('es-ES', { maximumFractionDigits: 0 })}° en tu sitio, y por debajo de ${ELEVACION_MINIMA}° el camino por la atmósfera es tan largo que la piel apenas sintetiza: lo que salga hoy serán unas pocas decenas de UI, no miles. El rato fuera sigue contando —ancla tu reloj y tu leptina— pero la vitamina D de estos días sale de lo que guardaste en verano, del pescado azul o de un suplemento.`
}
