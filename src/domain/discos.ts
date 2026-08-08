/**
 * Qué discos poner en la barra, y con qué calentar antes de la serie buena.
 *
 * Dos cuentas que se hacen mentalmente en el gimnasio y que se hacen mal:
 * repartir un peso entre dos lados sin equivocarse, y decidir con qué subir
 * hasta la carga de trabajo. Ninguna es difícil; las dos son un impuesto de
 * atención justo cuando uno quiere estar pensando en levantar.
 *
 * Todo esto es aritmética con el material que hay. No hay nada que estimar ni
 * que predecir, y por eso puede ser exacto: si con tus discos no sale el peso
 * exacto, se dice el que sí sale y en cuánto se queda.
 */

/** Discos de gimnasio, en kg, del más pesado al más ligero. */
export const DISCOS_ESTANDAR = [25, 20, 15, 10, 5, 2.5, 1.25] as const

/** Barra olímpica. Las cortas y las Z pesan menos y se pueden ajustar. */
export const BARRA_ESTANDAR = 20

export interface RepartoDiscos {
  /** Peso de la barra sola. */
  barraKg: number
  /** Qué discos van **en cada lado**, del más pesado al más ligero. */
  porLado: number[]
  /** El peso que de verdad se consigue con esos discos. */
  totalKg: number
  /** Lo que falta o sobra respecto a lo pedido. Cero cuando sale exacto. */
  desvioKg: number
  /** No se puede montar: el objetivo no llega ni al peso de la barra. */
  imposible?: boolean
}

/**
 * Reparte un peso en discos por lado.
 *
 * Algoritmo voraz de mayor a menor. Con los discos estándar —que son múltiplos
 * encadenados— el voraz da la solución óptima, y además la que uno montaría a
 * mano: los grandes primero.
 */
export function repartirDiscos(
  objetivoKg: number,
  opts: { barraKg?: number; discos?: readonly number[] } = {}
): RepartoDiscos {
  const barraKg = opts.barraKg ?? BARRA_ESTANDAR
  const discos = [...(opts.discos ?? DISCOS_ESTANDAR)].sort((a, b) => b - a)

  if (objetivoKg < barraKg) {
    return { barraKg, porLado: [], totalKg: barraKg, desvioKg: barraKg - objetivoKg, imposible: true }
  }

  // Lo que hay que poner se reparte entre los dos lados, así que se calcula
  // para uno solo y se duplica al final.
  let restaPorLado = (objetivoKg - barraKg) / 2
  const porLado: number[] = []
  for (const d of discos) {
    while (restaPorLado >= d - 1e-9) {
      porLado.push(d)
      restaPorLado -= d
    }
  }

  const totalKg = barraKg + porLado.reduce((a, b) => a + b, 0) * 2
  return {
    barraKg,
    porLado,
    totalKg: Math.round(totalKg * 100) / 100,
    desvioKg: Math.round((totalKg - objetivoKg) * 100) / 100
  }
}

/** «2×20 + 1×5» — agrupa los repetidos, que es como se lee de un vistazo. */
export function describirReparto(r: RepartoDiscos): string {
  if (r.imposible) return `Solo la barra pesa ${r.barraKg} kg`
  if (r.porLado.length === 0) return 'Solo la barra'
  const cuenta = new Map<number, number>()
  for (const d of r.porLado) cuenta.set(d, (cuenta.get(d) ?? 0) + 1)
  return [...cuenta.entries()].map(([kg, n]) => `${n}×${kg}`).join(' + ')
}

/**
 * Serie de calentamiento: qué peso y cuántas repeticiones.
 */
export interface SerieCalentamiento {
  /** Porcentaje del peso de trabajo. */
  porcentaje: number
  weightKg: number
  reps: number
}

/**
 * Escalones de calentamiento, como porcentaje de la carga de trabajo.
 *
 * Es el esquema clásico de fuerza: pocas series, cada vez más peso y menos
 * repeticiones. Sube la temperatura y ensaya el patrón sin dejar fatiga, que es
 * lo único que tiene que hacer un calentamiento.
 */
export const ESCALONES_CALENTAMIENTO: { porcentaje: number; reps: number }[] = [
  { porcentaje: 0.4, reps: 8 },
  { porcentaje: 0.6, reps: 5 },
  { porcentaje: 0.8, reps: 3 }
]

/** Redondea al salto de peso que se puede montar de verdad. */
export function redondearA(kg: number, salto: number): number {
  if (salto <= 0) return kg
  return Math.round(kg / salto) * salto
}

/**
 * Las series de calentamiento para una carga de trabajo.
 *
 * `salto` es lo que se puede ajustar de verdad: con barra olímpica y discos
 * hasta 1,25, son 2,5 kg —hay que poner el mismo disco a los dos lados—; con
 * mancuernas, lo que salte tu juego.
 *
 * Se descartan los escalones que caen por debajo de lo mínimo montable, y los
 * repetidos: con 20 kg de trabajo, el 40 % y el 60 % redondean al mismo sitio y
 * hacer dos veces la misma serie no calienta más.
 */
export function calentamientoPara(
  trabajoKg: number,
  opts: { salto?: number; minimoKg?: number } = {}
): SerieCalentamiento[] {
  const salto = opts.salto ?? 2.5
  const minimo = opts.minimoKg ?? salto
  if (!Number.isFinite(trabajoKg) || trabajoKg <= 0) return []

  const series: SerieCalentamiento[] = []
  for (const e of ESCALONES_CALENTAMIENTO) {
    const weightKg = redondearA(trabajoKg * e.porcentaje, salto)
    if (weightKg < minimo) continue
    if (weightKg >= trabajoKg) continue
    if (series.some((s) => s.weightKg === weightKg)) continue
    series.push({ porcentaje: e.porcentaje, weightKg, reps: e.reps })
  }
  return series
}
