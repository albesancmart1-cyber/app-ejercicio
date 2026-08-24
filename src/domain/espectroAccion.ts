/**
 * Cuánto pesa cada longitud de onda para quemar y para fabricar vitamina D.
 *
 * Existe por un fallo que se veía a simple vista: la app daba por hecho que
 * **ninguna lámpara emite UVB**, y por eso una sesión de lámpara nunca producía
 * vitamina D. Eso era verdad de la mayoría de los paneles de rojo e infrarrojo
 * que se venden, y falso en cuanto alguien compra una lámpara de UVB — que las
 * hay, y hacen exactamente lo que dicen: 7-dehidrocolesterol más un fotón de
 * UVB da previtamina D₃, y a la piel le da igual si el fotón viene del sol o de
 * un tubo.
 *
 * ## Las dos curvas, y por qué son distintas
 *
 * Una longitud de onda no «hace UV» a secas: hace una cosa u otra según la
 * curva con la que se pese. Las dos que importan aquí:
 *
 *  - **Eritemática**, la de la quemadura. Es la que define el índice UV.
 *  - **Previtamina D₃**, la de la síntesis. Está más corta y se acaba antes.
 *
 * Por eso el mismo aparato puede ser bueno para una cosa y peligroso para la
 * otra, y por eso hay que pesarlas por separado en vez de multiplicar el UVB
 * por una constante.
 */

/* ══════════════════════════════════════════════ LA QUEMADURA ══ */

/**
 * El espectro de acción eritemático de la CIE, tal cual está publicado.
 *
 * Es una **fórmula**, no una tabla, y por eso se puede escribir aquí entera y
 * comprobar: McKinlay & Diffey (1987), adoptada como norma CIE. Vale 1 hasta
 * los 298 nm y cae en dos tramos exponenciales.
 *
 * ```
 * λ ≤ 298          →  1
 * 298 < λ ≤ 328    →  10^(0,094 · (298 − λ))
 * 328 < λ ≤ 400    →  10^(0,015 · (139 − λ))
 * λ > 400          →  0
 * ```
 */
export function pesoEritematico(nm: number): number {
  if (!Number.isFinite(nm) || nm <= 0 || nm > 400) return 0
  if (nm <= 298) return 1
  if (nm <= 328) return 10 ** (0.094 * (298 - nm))
  return 10 ** (0.015 * (139 - nm))
}

/* ══════════════════════════════════════════════ LA VITAMINA D ══ */

/**
 * El espectro de acción de la previtamina D₃, **reconstruido a trazo grueso**.
 *
 * Y esto hay que decirlo antes que el número: la curva oficial es la CIE
 * 174:2006, que es una tabla de pago y no está aquí. Lo que hay es una
 * reconstrucción a partir de lo que sí está publicado y se puede citar:
 *
 *  - el máximo está en **297 nm** (CIE 174:2006),
 *  - prácticamente toda la síntesis ocurre entre **295 y 300 nm**, y
 *  - por encima de **315 nm** no queda nada apreciable
 *    (Webb et al., *PNAS* 2021, y la propia CIE).
 *
 * Entre esos puntos se interpola. La consecuencia, dicha sin adornos: **esto
 * es bueno para un factor, no para un porcentaje.** Una lámpara centrada en
 * 297 nm y otra en 310 nm salen bien separadas, que es lo que hace falta para
 * no confundir una con otra; pedirle a esta curva la diferencia entre 296 y 298
 * sería pedirle lo que no tiene.
 *
 * Se prefiere esto a lo que había, que era un cero: decir que una lámpara de
 * UVB no fabrica vitamina D es más falso que decir cuánta con un margen ancho.
 * Y quien tenga una cifra mejor —porque su lámpara la trae medida— puede meter
 * las UI del día a mano, y esa manda sobre cualquier estimación.
 */
const CURVA_VITAMINA_D: [nm: number, peso: number][] = [
  [275, 0.4],
  [280, 0.55],
  [285, 0.72],
  [290, 0.87],
  [295, 0.98],
  [297, 1],
  [300, 0.92],
  [305, 0.45],
  [310, 0.13],
  [315, 0.025],
  [320, 0.004],
  [325, 0.0005],
  [330, 0]
]

export const NM_PICO_VITAMINA_D = 297

/** Por encima de aquí no se cuenta síntesis: la curva ya es cero. */
export const NM_SIN_VITAMINA_D = 330

/**
 * El peso de una longitud de onda para la síntesis, con 297 nm valiendo 1.
 *
 * Se interpola en logaritmo entre los puntos de la curva, no en línea recta,
 * porque la caída es de órdenes de magnitud: entre 305 y 310 nm el peso se
 * divide por tres y medio, y una recta entre esos dos puntos daría el doble de
 * lo que toca justo en medio.
 */
export function pesoVitaminaD(nm: number): number {
  if (!Number.isFinite(nm)) return 0
  const primero = CURVA_VITAMINA_D[0]
  const ultimo = CURVA_VITAMINA_D[CURVA_VITAMINA_D.length - 1]
  if (nm <= primero[0]) return 0
  if (nm >= ultimo[0]) return 0

  for (let i = 1; i < CURVA_VITAMINA_D.length; i++) {
    const [x1, y1] = CURVA_VITAMINA_D[i - 1]
    const [x2, y2] = CURVA_VITAMINA_D[i]
    if (nm > x2) continue
    const t = (nm - x1) / (x2 - x1)
    // En logaritmo mientras los dos extremos sean positivos; si uno es cero, en
    // recta, que es lo único que se puede hacer y solo pasa en la cola.
    if (y1 > 0 && y2 > 0) return Math.exp(Math.log(y1) * (1 - t) + Math.log(y2) * t)
    return y1 * (1 - t) + y2 * t
  }
  return 0
}

/* ══════════════════════════════════════════════ UNIDADES ══ */

/**
 * Un punto de índice UV son 0,025 W/m² de irradiancia eritemática.
 *
 * Es la definición del índice, y sirve de puente: convierte la irradiancia
 * pesada de cualquier fuente —el sol o una lámpara— en la misma unidad con la
 * que está calibrado el resto de la app.
 */
export const W_M2_POR_UVI = 0.025

/** Los mW/cm² con que se declaran las lámparas, en W/m². */
export function mwCm2AWm2(mw: number): number {
  return mw * 10
}
