/**
 * La atmósfera entre el sol y tu piel.
 *
 * Vive aparte de `vitaminaD.ts` porque no es biología: es lo que le pasa a la
 * luz antes de llegar, y lo usan por igual la síntesis de vitamina D y el
 * tiempo que tardas en quemarte.
 *
 * ## Por qué hizo falta
 *
 * La versión anterior calculaba el índice UV así:
 *
 * ```
 * UVI = 12,5 · cos(SZA)^1,5      y  0 por debajo de 30° de elevación
 * ```
 *
 * Tenía dos problemas y los dos importan cuando lo que se quiere es una cifra
 * y no un rango:
 *
 *  - **El corte en 30° era un acantilado.** A 30,0° de elevación el índice
 *    valía 4,4 y a 29,9° valía cero. Ninguna de las dos cosas es verdad: el UVB
 *    no se apaga de golpe, se desploma. Un acantilado es lo menos preciso que
 *    puede tener un modelo al que se le pide precisión.
 *  - **No había ozono.** Y el ozono es, con mucha diferencia, la variable que
 *    más mueve el UVB: la columna sobre tu cabeza cambia un 25 % entre marzo y
 *    octubre a nuestra latitud, y eso son más de treinta puntos porcentuales de
 *    UVB. Estaba escondido dentro del «±30 %» con el que se daba el resultado.
 *
 * ## Qué se usa ahora
 *
 * La forma empírica de cielo despejado que usa el KNMI para el índice UV, que
 * es la misma de la que salía el 12,5 de antes pero **entera**:
 *
 * ```
 * UVI = 12,5 · μ^2,42 · (Ω/300)^−1,23        μ = cos(SZA), Ω = ozono en DU
 * ```
 *
 * Es un ajuste a medidas, no una derivación, y por eso vale para esto: lleva
 * dentro el Rayleigh, los aerosoles y la luz difusa, que son justo las tres
 * cosas que un Beer-Lambert escrito a mano se deja fuera. Se comprueba sola
 * contra dos valores conocidos —Madrid en junio da ~10 y en diciembre ~1,6— y
 * eso está en las pruebas.
 *
 * No hay corte en ninguna elevación: la curva baja sola hasta hacerse
 * despreciable, que es lo que hace el sol.
 */

const RAD = Math.PI / 180

/* ══════════════════════════════════════════════ EL CAMINO POR LA ATMÓSFERA ══ */

/**
 * Cuántas atmósferas atraviesa la luz con el sol a esa altura.
 *
 * A mediodía vale 1 y crece según el sol baja. La cuenta ingenua sería
 * `1/cos(SZA)`, pero se dispara hasta el infinito en el horizonte porque supone
 * la Tierra plana. Se usa **Kasten y Young (1989)**, que corrige la curvatura y
 * sigue valiendo al ras:
 *
 * ```
 * m = 1 / (cos z + 0,50572 · (96,07995 − z)^−1,6364)
 * ```
 *
 * Importa más de lo que parece: casi todo el rato de sol de una persona con un
 * trabajo ocurre con el sol bajo, que es exactamente donde la cuenta ingenua se
 * equivoca.
 */
export function masaDeAire(elevacionGrados: number): number {
  const z = Math.min(96, 90 - elevacionGrados)
  const cos = Math.cos(z * RAD)
  return 1 / (cos + 0.50572 * (96.07995 - z) ** -1.6364)
}

/* ══════════════════════════════════════════════ EL OZONO ══ */

/** La columna de ozono de referencia, en unidades Dobson. */
export const OZONO_DE_REFERENCIA = 300

/**
 * Cuánto ozono hay encima de un sitio, por climatología.
 *
 * **Es una climatología, no una medida**, y conviene que quede escrito: nadie
 * le está preguntando a un satélite cuánto ozono hay hoy sobre tu casa. Lo que
 * se modela es el patrón que sí es estable año tras año, el de la circulación
 * de Brewer-Dobson: el ozono se fabrica sobre el ecuador y se acumula hacia los
 * polos durante el invierno, así que
 *
 *  - **crece con la latitud** — unos 260 DU en el trópico, unos 335 a 40°, unos
 *    375 a 60°—, y
 *  - **tiene un máximo en primavera** y un mínimo en otoño, con una amplitud
 *    que también crece con la latitud y casi nula en el ecuador.
 *
 * Se aproxima con la primera armónica, que es lo que se puede defender sin
 * datos. El ciclo real no es un coseno perfecto —el invierno sube más despacio
 * de lo que baja el verano—, así que en diciembre esto sobrestima algo. Es un
 * error conocido y pequeño al lado del que había, que era no tener ozono.
 */
export function ozonoDU(lat: number, fechaIso: string): number {
  const abs = Math.min(90, Math.abs(lat))
  const media = 260 + 1.9 * abs
  const amplitud = 0.9 * abs

  // El máximo cae en primavera: mediados de marzo arriba, mediados de
  // septiembre abajo. Medio año de desfase entre los dos hemisferios.
  const pico = lat >= 0 ? 75 : 75 + 182.5
  return media + amplitud * Math.cos((2 * Math.PI * (diaDelAno(fechaIso) - pico)) / 365.25)
}

/** El día del año (1–366) de una fecha ISO, sin líos de zona horaria. */
export function diaDelAno(fechaIso: string): number {
  const t = Date.parse(`${fechaIso}T00:00:00Z`)
  const enero = Date.parse(`${fechaIso.slice(0, 4)}-01-01T00:00:00Z`)
  return Math.round((t - enero) / 86400000) + 1
}

/* ══════════════════════════════════════════════ EL ÍNDICE UV ══ */

/** El 12,5 del ajuste: el índice UV con el sol en la vertical y 300 DU. */
export const UVI_DE_REFERENCIA = 12.5

/** Cuánto castiga el sol bajo. Del ajuste empírico, no elegido por nosotros. */
const EXPONENTE_MU = 2.42

/** Y cuánto castiga el ozono, en la misma referencia. */
const EXPONENTE_OZONO = -1.23

/**
 * El índice UV de cielo despejado, eritémico, a nivel del mar.
 *
 * Eritémico quiere decir pesado con la curva de la quemadura, que es lo que el
 * índice UV significa y lo único que significa. La vitamina D **no** se pesa
 * con esa curva, y de eso se encarga `vitaminaD.ts`.
 *
 * Devuelve cero solo cuando el sol está bajo el horizonte. Con el sol a un
 * grado sale un número minúsculo, que es la verdad.
 */
export function indiceUV(elevacionGrados: number, ozono = OZONO_DE_REFERENCIA): number {
  if (elevacionGrados <= 0) return 0
  const mu = Math.cos((90 - elevacionGrados) * RAD)
  return (
    UVI_DE_REFERENCIA * mu ** EXPONENTE_MU * (ozono / OZONO_DE_REFERENCIA) ** EXPONENTE_OZONO
  )
}
