/**
 * Qué tipo de luz es un número de nanómetros.
 *
 * Las lámparas que tiene la gente no vienen en dos sabores. Hay paneles con
 * cuatro longitudes de onda, cascos con dos, bombillas con una, y aparatos que
 * meten ultravioleta, violeta o verde además del rojo. Si la app obligara a
 * elegir entre «roja» e «infrarroja» estaría tirando a la basura justo el dato
 * que hace que una sesión se pueda calcular.
 *
 * Así que aquí se admite **cualquier** longitud de onda, y el programa sabe qué
 * es. De ahí sale todo lo demás: qué hace en el cuerpo, si cuenta para el
 * reloj, si cuenta para la mitocondria, y a qué banda del balance del día va.
 *
 * ## Las fronteras son convenios, y hay que decirlo
 *
 * El espectro es continuo: a 449 nm no pasa nada distinto que a 451. Los cortes
 * de aquí son los que usa la fotobiología —y en el borde violeta/azul hay
 * literatura para las dos opciones—. Lo que importa no es clavar el nanómetro
 * exacto sino que **el reparto sea estable y explicable**, para que dos lámparas
 * parecidas no acaben contando en sitios distintos.
 */

/** Las nueve bandas, de la más energética a la más térmica. */
export type Banda =
  | 'uvb'
  | 'uva'
  | 'violeta'
  | 'azul'
  | 'verde'
  | 'ambar'
  | 'rojo'
  | 'infrarrojo_cercano'
  | 'infrarrojo_medio'

/**
 * Para qué sirve cada banda en el balance del día.
 *
 * Es el reparto que de verdad importa, porque son objetivos distintos y no
 * intercambiables: la mitocondria no se alimenta de azul y el reloj no se pone
 * en hora con infrarrojo.
 */
export type Proposito = 'mitocondria' | 'reloj' | 'ultravioleta' | 'ninguno'

export interface DefinicionBanda {
  /** Desde (inclusive) y hasta (exclusive), en nanómetros. */
  desde: number
  hasta: number
  nombre: string
  proposito: Proposito
  /**
   * Cuánto cuenta para su propósito, de 0 a 1.
   *
   * El verde tiene efecto circadiano **real pero parcial** —no es azul, y
   * tampoco es nada—, y el violeta cae en la zona de solapamiento. Contarlos a
   * peso completo exageraría, y descartarlos sería falso. Un peso es la forma
   * honesta de decir «cuenta, pero menos».
   */
  peso: number
  queHace: string
}

/**
 * El reparto. El orden importa: se recorre en él y se coge el primero que
 * encaja, así que las bandas van seguidas y sin huecos.
 */
export const BANDAS: Record<Banda, DefinicionBanda> = {
  uvb: {
    desde: 280,
    hasta: 315,
    nombre: 'UVB',
    proposito: 'ultravioleta',
    peso: 1,
    queHace: 'Vitamina D en la piel. No lo sustituye ninguna lámpara ni ninguna pastilla.'
  },
  uva: {
    desde: 315,
    hasta: 400,
    nombre: 'UVA',
    proposito: 'ultravioleta',
    peso: 0.6,
    queHace: 'Óxido nítrico y vasodilatación. Disponible desde los 10° de altura del sol.'
  },
  violeta: {
    desde: 400,
    hasta: 450,
    nombre: 'Violeta',
    proposito: 'reloj',
    peso: 0.7,
    queHace: 'Zona de solapamiento. Para el reloj cuenta como azul, algo por debajo.'
  },
  azul: {
    desde: 450,
    hasta: 495,
    nombre: 'Azul',
    proposito: 'reloj',
    peso: 1,
    queHace: 'La señal del reloj. Necesaria por la mañana y cara después del ocaso.'
  },
  verde: {
    desde: 495,
    hasta: 570,
    nombre: 'Verde',
    proposito: 'reloj',
    peso: 0.3,
    queHace: 'Efecto circadiano real pero parcial. Cuenta menos que el azul, no cero.'
  },
  ambar: {
    desde: 570,
    hasta: 620,
    nombre: 'Ámbar',
    proposito: 'ninguno',
    peso: 0,
    queHace: 'Casi neutro para el reloj. Es lo que dejan pasar las gafas amarillas.'
  },
  rojo: {
    desde: 620,
    hasta: 750,
    nombre: 'Rojo',
    proposito: 'mitocondria',
    peso: 1,
    queHace: 'Citocromo c oxidasa. Lo que el interior no tiene y el cristal filtra.'
  },
  infrarrojo_cercano: {
    desde: 750,
    hasta: 1400,
    nombre: 'Infrarrojo cercano',
    proposito: 'mitocondria',
    peso: 1,
    queHace: 'Penetra centímetros de tejido. Llega donde el rojo se queda.'
  },
  infrarrojo_medio: {
    desde: 1400,
    hasta: 3000,
    nombre: 'Infrarrojo medio',
    proposito: 'mitocondria',
    peso: 0.4,
    queHace: 'Calor radiante. Lo que da una hoguera y no da ninguna pantalla.'
  }
}

const ORDEN = Object.keys(BANDAS) as Banda[]

/** El rango que la app admite. Fuera de aquí no es luz que sirva para esto. */
export const NM_MINIMO = BANDAS.uvb.desde
export const NM_MAXIMO = BANDAS.infrarrojo_medio.hasta

/**
 * En qué banda cae una longitud de onda, o `null` si se sale del rango.
 *
 * Devolver `null` y no la banda más cercana es deliberado: quien teclea 66 en
 * vez de 660 tiene una errata, y estirar la banda más próxima para taparla
 * convertiría un fallo evidente en una dosis silenciosamente absurda.
 */
export function bandaDe(nm: number): Banda | null {
  if (!Number.isFinite(nm)) return null
  for (const b of ORDEN) {
    const d = BANDAS[b]
    if (nm >= d.desde && nm < d.hasta) return b
  }
  // El extremo superior entra en la última banda: 3 000 nm sigue siendo luz.
  return nm === NM_MAXIMO ? 'infrarrojo_medio' : null
}

/** El nombre de la banda de una longitud de onda, para enseñarlo al lado. */
export function nombreDe(nm: number): string {
  const b = bandaDe(nm)
  return b ? BANDAS[b].nombre : 'Fuera de rango'
}

export function propositoDe(nm: number): Proposito {
  const b = bandaDe(nm)
  return b ? BANDAS[b].proposito : 'ninguno'
}

/**
 * Los cuatro picos de absorción de la citocromo c oxidasa.
 *
 * Son las longitudes de onda donde la enzima que respira dentro de la
 * mitocondria absorbe mejor. Sirven para una cosa concreta y modesta: decirle a
 * alguien **qué cubre su lámpara y qué no**, sin recomendarle que compre otra.
 */
export const PICOS_KARU = [620, 680, 760, 820] as const

/**
 * Cuánto margen se da para considerar que una onda «cubre» un pico.
 *
 * Los picos son anchos, no líneas: un LED de 660 nm trabaja el de 680 de sobra,
 * y uno de 850 el de 820. Treinta nanómetros a cada lado recoge eso sin llegar
 * a decir que cualquier cosa vale.
 */
export const MARGEN_PICO = 30

/** Qué picos de Karu cubre un conjunto de longitudes de onda. */
export function picosCubiertos(nms: number[]): number[] {
  return PICOS_KARU.filter((pico) => nms.some((nm) => Math.abs(nm - pico) <= MARGEN_PICO))
}

/**
 * El pico de la melanopsina: donde el ojo mide la hora del día.
 *
 * No es el pico de la visión —eso está en el verde— sino el del pigmento que
 * informa al reloj. Por eso una luz puede parecer tenue y desajustarte, o
 * parecer intensa y no hacerlo.
 */
export const PICO_MELANOPSINA = 480

/**
 * Cuánto pesa una longitud de onda para el reloj, de 0 a 1.
 *
 * Cae con la distancia al pico de la melanopsina y se apoya en el peso de su
 * banda, de modo que 480 vale uno, 520 bastante menos y 660 nada. Es una
 * aproximación de la curva de sensibilidad, no la curva: sirve para ordenar y
 * comparar, no para publicar.
 */
export function pesoCircadiano(nm: number): number {
  const banda = bandaDe(nm)
  if (!banda) return 0
  const d = BANDAS[banda]
  if (d.proposito !== 'reloj') return 0
  // Una campana ancha alrededor de 480 nm, recortada por el peso de la banda.
  const caida = Math.exp(-(((nm - PICO_MELANOPSINA) / 60) ** 2))
  return Math.min(1, d.peso * caida)
}

/** Un color aproximado para pintar la onda en pantalla, siempre con su nombre al lado. */
export function colorDe(nm: number): string {
  const banda = bandaDe(nm)
  switch (banda) {
    case 'uvb':
    case 'uva':
      return '#8b6fd6'
    case 'violeta':
      return '#7c6bd8'
    case 'azul':
      return '#5b8fd6'
    case 'verde':
      return '#6fb87e'
    case 'ambar':
      return '#e0a03c'
    case 'rojo':
      return '#d1483f'
    case 'infrarrojo_cercano':
      return '#8f2f2a'
    case 'infrarrojo_medio':
      return '#5e211d'
    default:
      return '#6b6b70'
  }
}

/** Una longitud de onda como se escribe: «660 nm». */
export function escribirNm(nm: number): string {
  return `${nm.toLocaleString('es-ES', { maximumFractionDigits: 0 })} nm`
}
