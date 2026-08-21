/**
 * Analíticas y curva de keto-adaptación.
 *
 * Dos cosas que van juntas porque las dos miran lo mismo a distinta escala: si
 * el cuerpo está aprendiendo a usar la grasa o sigue esperando el azúcar.
 *
 * ## Los índices, y por qué estos cuatro
 *
 * No son los que salen destacados en un informe de laboratorio. Son los que se
 * calculan **a partir de lo que ya trae cualquier analítica básica** y que dicen
 * más que sus componentes por separado:
 *
 *  - **HOMA-IR** = glucosa (mg/dl) × insulina (µU/ml) ⁄ 405. Estima la
 *    resistencia a la insulina. Una glucosa normal con la insulina alta es un
 *    cuerpo trabajando el doble para el mismo resultado, y eso no se ve mirando
 *    la glucosa sola — que es exactamente lo que se suele mirar.
 *  - **TG/HDL.** El más barato de todos y de los más informativos sobre el
 *    tamaño de las partículas de LDL.
 *  - **CT/HDL.** El clásico, para no perder la referencia conocida.
 *  - **Vitamina D y ferritina**, que se apuntan tal cual porque no hay índice
 *    que calcular, pero cierran la foto: la primera es el resumen del año de
 *    sol y la segunda avisa de inflamación cuando sube sin hierro que lo
 *    justifique.
 *
 * ## Lo que este módulo no hace
 *
 * No diagnostica. Calcula los índices, dice en qué franja caen usando cortes
 * publicados, y **manda a mirarlo con quien corresponde** cuando algo se sale.
 * No hay ninguna enfermedad nombrada en este fichero y no la va a haber.
 */

export type Franja = 'optimo' | 'aceptable' | 'vigilar'

export const NOMBRES_FRANJA: Record<Franja, string> = {
  optimo: 'Óptimo',
  aceptable: 'Aceptable',
  vigilar: 'Para mirarlo'
}

export interface Analitica {
  date: string
  updatedAt?: number
  /** mg/dl. */
  glucosa?: number
  /** µU/ml. */
  insulina?: number
  /** mg/dl. */
  trigliceridos?: number
  hdl?: number
  colesterolTotal?: number
  /** ng/ml. */
  vitaminaD?: number
  /** ng/ml. */
  ferritina?: number
}

export interface Indice {
  id: 'homa' | 'tg-hdl' | 'ct-hdl' | 'vitamina-d' | 'ferritina'
  nombre: string
  valor: number
  /** Cómo se escribe: unos llevan decimales y otros no. */
  texto: string
  franja: Franja
  /** Qué significa, en una línea, sin nombrar ninguna enfermedad. */
  queDice: string
}

/** HOMA-IR. Por debajo de 1 es óptimo; por encima de 2,5 conviene mirarlo. */
export function homaIr(glucosa: number, insulina: number): number {
  return (glucosa * insulina) / 405
}

function franjaPorCortes(v: number, optimoHasta: number, aceptableHasta: number): Franja {
  if (v <= optimoHasta) return 'optimo'
  if (v <= aceptableHasta) return 'aceptable'
  return 'vigilar'
}

/** Los índices que se pueden calcular con lo que haya. Lo que falta, no sale. */
export function indicesDe(a: Analitica): Indice[] {
  const out: Indice[] = []

  if (a.glucosa !== undefined && a.insulina !== undefined) {
    const v = homaIr(a.glucosa, a.insulina)
    out.push({
      id: 'homa',
      nombre: 'HOMA-IR',
      valor: v,
      texto: v.toLocaleString('es-ES', { maximumFractionDigits: 2 }),
      franja: franjaPorCortes(v, 1, 2.5),
      queDice:
        'Cuánto insulina hace falta para mantener tu glucosa donde está. Una glucosa normal con la insulina alta es un cuerpo trabajando el doble por el mismo resultado.'
    })
  }

  if (a.trigliceridos !== undefined && a.hdl && a.hdl > 0) {
    const v = a.trigliceridos / a.hdl
    out.push({
      id: 'tg-hdl',
      nombre: 'TG / HDL',
      valor: v,
      texto: v.toLocaleString('es-ES', { maximumFractionDigits: 2 }),
      franja: franjaPorCortes(v, 1.5, 3),
      queDice: 'El más barato de todos, y de los que más dicen sobre el tamaño de tus partículas.'
    })
  }

  if (a.colesterolTotal !== undefined && a.hdl && a.hdl > 0) {
    const v = a.colesterolTotal / a.hdl
    out.push({
      id: 'ct-hdl',
      nombre: 'CT / HDL',
      valor: v,
      texto: v.toLocaleString('es-ES', { maximumFractionDigits: 2 }),
      franja: franjaPorCortes(v, 3.5, 5),
      queDice: 'El cociente clásico, para no perder la referencia conocida.'
    })
  }

  if (a.vitaminaD !== undefined) {
    /*
     * Aquí la franja no va en una sola dirección, y escribirla como si «más es
     * mejor» costaba dar por aceptables 120 ng/ml. Es de las pocas cosas de una
     * analítica que se puede subir a base de pastillas hasta pasarse, así que se
     * marca por arriba igual que por abajo.
     */
    const v = a.vitaminaD
    out.push({
      id: 'vitamina-d',
      nombre: 'Vitamina D',
      valor: v,
      texto: `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} ng/ml`,
      franja: v >= 40 && v <= 80 ? 'optimo' : v >= 30 && v <= 100 ? 'aceptable' : 'vigilar',
      queDice: 'El resumen de tu año de sol. Es el único número de esta lista que se construye en meses.'
    })
  }

  if (a.ferritina !== undefined) {
    const v = a.ferritina
    out.push({
      id: 'ferritina',
      nombre: 'Ferritina',
      valor: v,
      texto: `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} ng/ml`,
      franja: v >= 30 && v <= 150 ? 'optimo' : v >= 15 && v <= 250 ? 'aceptable' : 'vigilar',
      queDice: 'Hierro guardado, y también un aviso: sube cuando hay inflamación aunque el hierro esté bien.'
    })
  }

  return out
}

/** Lo que la app dice cuando algo se sale de franja. Siempre lo mismo. */
export const A_QUIEN_PREGUNTAR =
  'Esto no es un diagnóstico y la app no lo va a interpretar más allá de calcular el cociente. Si algo se sale, llévalo a quien sepa mirarlo contigo.'

/* ══════════════════════════════════════════════ KETO-ADAPTACIÓN ══ */

export interface HitoKeto {
  /** Días desde el inicio. */
  dia: number
  titulo: string
  que: string
}

/**
 * La curva de adaptación, por hitos y no por una barra de progreso.
 *
 * Una barra al 60 % no dice nada; saber que la semana que viene se va el
 * cansancio, sí. Los tramos son órdenes de magnitud y varían mucho entre
 * personas — se dice, en vez de fingir un calendario exacto.
 */
export const HITOS: HitoKeto[] = [
  {
    dia: 0,
    titulo: 'Se vacía el glucógeno',
    que: 'Los primeros kilos son agua: cada gramo de glucógeno arrastra unos tres de agua. No es grasa, y volverá si vuelve el carbohidrato.'
  },
  {
    dia: 3,
    titulo: 'El bache',
    que: 'Cansancio, dolor de cabeza, poca chispa. El cuerpo ya no tiene azúcar fácil y todavía no maneja bien la grasa. Sal y agua ayudan más de lo que parece.'
  },
  {
    dia: 14,
    titulo: 'Vuelve la cabeza',
    que: 'Los cuerpos cetónicos empiezan a llegar al cerebro en cantidad. Suele ser lo primero que la gente nota de verdad.'
  },
  {
    dia: 28,
    titulo: 'Vuelve la fuerza',
    que: 'El rendimiento en fuerza se recupera. El de alta intensidad tarda más y puede no volver del todo sin algo de carbohidrato alrededor del entreno.'
  },
  {
    dia: 60,
    titulo: 'Flexibilidad metabólica',
    que: 'Cambiar entre grasa y azúcar deja de costar. Es el punto en que saltarse una comida deja de ser un drama.'
  },
  {
    dia: 90,
    titulo: 'Adaptado',
    que: 'Electrolitos estables y hambre predecible. A partir de aquí lo que manda es la constancia, no la fase.'
  }
]

export interface EstadoKeto {
  dias: number
  /** El hito ya alcanzado. */
  actual: HitoKeto
  /** Y el siguiente, si queda alguno. */
  siguiente?: HitoKeto
  diasParaElSiguiente?: number
}

export function estadoKeto(desdeIso: string, hoyIso: string): EstadoKeto | null {
  const dias = Math.floor(
    (Date.parse(`${hoyIso}T00:00:00Z`) - Date.parse(`${desdeIso}T00:00:00Z`)) / 86400000
  )
  if (!Number.isFinite(dias) || dias < 0) return null

  const alcanzados = HITOS.filter((h) => dias >= h.dia)
  const actual = alcanzados[alcanzados.length - 1] ?? HITOS[0]
  const siguiente = HITOS.find((h) => h.dia > dias)

  return {
    dias,
    actual,
    siguiente,
    diasParaElSiguiente: siguiente ? siguiente.dia - dias : undefined
  }
}
