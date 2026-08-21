/**
 * Lo que la app mira de una comida: leucina, calidad, deuterio, minerales y la
 * huella que deja en la insulina.
 *
 * ## La leucina se cuenta por comida, no por día
 *
 * Es la diferencia que hace que este módulo exista. La síntesis de proteína no
 * se enciende con una suma diaria: se enciende con un **bolo** que pase de un
 * umbral, del orden de 2,5 g de leucina de golpe. Cien gramos de proteína
 * repartidos en seis picoteos pueden no encenderla ni una vez, y la misma
 * cantidad en dos comidas la enciende dos.
 *
 * Por eso «llevas 120 g de proteína hoy» es un dato bonito y bastante inútil, y
 * aquí se sustituye por «esta comida llega» o «esta comida se queda corta».
 *
 * ## Los eventos de insulina
 *
 * Cada vez que algo entra en el cuerpo hay una respuesta de insulina, mayor o
 * menor. Lo que importa para el reloj periférico no es su tamaño sino **cuántos
 * hay y cuánto se separan**: seis eventos de picoteo mantienen la señal
 * encendida todo el día, y dos comidas separadas la dejan apagarse en medio.
 *
 * El café solo cuenta como evento aunque no lleve nada: abre la ventana del
 * hígado igual que un plato, y ese detalle cambia por completo cuántas horas de
 * ayuno lleva alguien de verdad.
 */
import { DEUTERIO_ALTO_PPM, DEUTERIO_BAJO_PPM, UMBRAL_LEUCINA_G, nutrientesDe, type NivelAntinutrientes } from '../data/nutrientes'
import { minutosDeHora } from './relojes'
import type { ComidaRegistrada, DiaDeComidas } from './types'

/* ══════════════════════════════════════════════ UNA COMIDA ══ */

export interface LecturaDeComida {
  /** Gramos de leucina de la comida. */
  leucinaG: number
  /** Si pasa el umbral que enciende la síntesis. */
  llegaAlUmbral: boolean
  /** Gramos de proteína, para poder decir cuánto falta. */
  proteinaG: number
  /** DIAAS medio, ponderado por la proteína que aporta cada alimento. */
  diaas?: number
  /** Deuterio medio, ponderado por gramos. */
  deuterioPpm?: number
  /** El nivel más alto de antinutrientes que haya en el plato. */
  antinutrientes?: NivelAntinutrientes
  /** Gramos con dato y gramos apuntados, para no exagerar la precisión. */
  gramosConDato: number
  gramosApuntados: number
}

const ORDEN_ANTI: NivelAntinutrientes[] = ['bajo', 'medio', 'alto']

export function leerComida(comida: ComidaRegistrada): LecturaDeComida {
  let leucinaG = 0
  let proteinaG = 0
  let diaasPonderado = 0
  let proteinaConDiaas = 0
  let deuterioPonderado = 0
  let gramosConDeuterio = 0
  let gramosConDato = 0
  let gramosApuntados = 0
  let anti: NivelAntinutrientes | undefined

  for (const a of comida.alimentos ?? []) {
    const g = a.gramos ?? 0
    gramosApuntados += g
    const n = nutrientesDe(a.alimentoId)
    if (!n || g === 0) continue
    gramosConDato += g

    const prote = ((n.proteinaPor100 ?? 0) * g) / 100
    proteinaG += prote
    leucinaG += ((n.leucinaPor100 ?? 0) * g) / 100

    if (n.diaas !== undefined && prote > 0) {
      // Ponderado por proteína y no por peso: lo que decide la calidad de la
      // comida es de dónde viene la proteína, no cuánta lechuga la acompaña.
      diaasPonderado += n.diaas * prote
      proteinaConDiaas += prote
    }
    if (n.deuterioPpm !== undefined) {
      deuterioPonderado += n.deuterioPpm * g
      gramosConDeuterio += g
    }
    if (n.antinutrientes) {
      if (!anti || ORDEN_ANTI.indexOf(n.antinutrientes) > ORDEN_ANTI.indexOf(anti)) {
        anti = n.antinutrientes
      }
    }
  }

  return {
    leucinaG,
    llegaAlUmbral: leucinaG >= UMBRAL_LEUCINA_G,
    proteinaG,
    diaas: proteinaConDiaas > 0 ? diaasPonderado / proteinaConDiaas : undefined,
    deuterioPpm: gramosConDeuterio > 0 ? deuterioPonderado / gramosConDeuterio : undefined,
    antinutrientes: anti,
    gramosConDato,
    gramosApuntados
  }
}

/** Cuánta proteína más haría falta para llegar al umbral, en gramos. */
export function faltaParaElUmbral(l: LecturaDeComida): number {
  if (l.llegaAlUmbral || l.proteinaG === 0) return 0
  // Se extrapola con la proporción de leucina que ya tiene el propio plato.
  const leucinaPorGramo = l.leucinaG / l.proteinaG
  if (leucinaPorGramo <= 0) return 0
  return Math.ceil((UMBRAL_LEUCINA_G - l.leucinaG) / leucinaPorGramo)
}

/** Cómo se lee un DIAAS, en una palabra. */
export function calidadDe(diaas: number): string {
  if (diaas >= 100) return 'completa'
  if (diaas >= 75) return 'buena'
  if (diaas >= 50) return 'incompleta'
  return 'pobre'
}

/** Y un deuterio. */
export function nivelDeuterio(ppm: number): 'bajo' | 'medio' | 'alto' {
  if (ppm <= DEUTERIO_BAJO_PPM) return 'bajo'
  if (ppm >= DEUTERIO_ALTO_PPM) return 'alto'
  return 'medio'
}

export const QUE_HACEN_LOS_ANTINUTRIENTES: Record<NivelAntinutrientes, string> = {
  bajo: 'Poco que secuestre minerales en esta comida.',
  medio: 'Algo de fitatos y oxalatos: parte del zinc y del hierro de esta comida no se absorbe.',
  alto: 'Fitatos y oxalatos altos. Secuestran zinc y hierro de lo que comas a la vez — no es veneno, es que ese mineral no llega.'
}

/* ══════════════════════════════════════════════ EL DÍA ══ */

export interface EventoInsulina {
  /** Minutos desde medianoche. */
  hora: number
  /** Horas desde el evento anterior, si lo hubo. */
  desdeElAnterior?: number
}

export interface RitmoDeInsulina {
  eventos: EventoInsulina[]
  /** El hueco más largo entre dos eventos, en horas. */
  mayorDescanso: number
  /** Cuándo se abrió la ventana y cuándo se cerró. */
  abre?: number
  cierra?: number
  ventanaHoras?: number
}

/**
 * Los eventos de insulina del día, con sus huecos.
 *
 * El café cuenta. Es el detalle que más cambia la cuenta real de ayuno de la
 * gente, y omitirlo por ser «solo un café» sería contar mal a propósito.
 */
export function ritmoDeInsulina(dia: DiaDeComidas | undefined): RitmoDeInsulina {
  const horas = (dia?.comidas ?? [])
    .map((c) => minutosDeHora(c.hora))
    .filter((x): x is number => x !== undefined)
    .sort((a, b) => a - b)

  const eventos: EventoInsulina[] = horas.map((hora, i) => ({
    hora,
    ...(i > 0 ? { desdeElAnterior: (hora - horas[i - 1]) / 60 } : {})
  }))

  const huecos = eventos.map((e) => e.desdeElAnterior ?? 0)
  // El descanso de la noche cuenta como hueco: del último de ayer al primero de
  // hoy. Aquí, sin el día anterior, se aproxima con lo que queda hasta las 24 h.
  const nocturno = horas.length > 0 ? 24 - (horas[horas.length - 1] - horas[0]) / 60 : 24

  return {
    eventos,
    mayorDescanso: Math.max(nocturno, ...huecos, 0),
    abre: horas[0],
    cierra: horas[horas.length - 1],
    ventanaHoras:
      horas.length > 0 ? (horas[horas.length - 1] - horas[0]) / 60 : undefined
  }
}

/**
 * Qué rompe el ayuno y qué no.
 *
 * Hay una zona intermedia real y conviene no fingir que es binaria: el agua no
 * lo rompe, un plato sí, y en medio hay cosas que levantan insulina poco pero la
 * levantan. La app no va a decir que un café con leche «no cuenta».
 */
export type EfectoAyuno = 'no-rompe' | 'zona-gris' | 'rompe'

export interface AlimentoHerramienta {
  nombre: string
  efecto: EfectoAyuno
  porque: string
}

export const HERRAMIENTAS: AlimentoHerramienta[] = [
  { nombre: 'Agua', efecto: 'no-rompe', porque: 'No hay nada que digerir ni que señalar.' },
  { nombre: 'Sal', efecto: 'no-rompe', porque: 'Electrolitos, sin respuesta de insulina.' },
  {
    nombre: 'Café solo',
    efecto: 'zona-gris',
    porque:
      'No lleva nada que suba la glucosa, pero **abre la ventana del hígado**. Para el reloj periférico, cuenta.'
  },
  {
    nombre: 'Infusión',
    efecto: 'no-rompe',
    porque: 'Igual que el agua, salvo que lleve algo añadido.'
  },
  {
    nombre: 'Café con un chorro de leche',
    efecto: 'rompe',
    porque: 'La lactosa y la proteína levantan insulina. Poco, pero la levantan.'
  },
  {
    nombre: 'Aceite o mantequilla en el café',
    efecto: 'zona-gris',
    porque: 'Grasa pura casi no toca la insulina, pero entra comida y el hígado se entera.'
  },
  {
    nombre: 'Caldo de huesos',
    efecto: 'rompe',
    porque: 'Trae aminoácidos, y los aminoácidos son señal.'
  },
  {
    nombre: 'Vinagre de manzana',
    efecto: 'no-rompe',
    porque: 'No aporta energía; de hecho baja algo la respuesta de la comida siguiente.'
  }
]

export const NOMBRES_EFECTO: Record<EfectoAyuno, string> = {
  'no-rompe': 'No lo rompe',
  'zona-gris': 'Zona gris',
  rompe: 'Lo rompe'
}

/** El día entero, para la tarjeta de resumen. */
export interface LecturaDelDia {
  comidas: number
  /** Cuántas llegaron al umbral de leucina. */
  conUmbral: number
  proteinaG: number
  diaas?: number
  deuterioPpm?: number
  antinutrientes?: NivelAntinutrientes
  insulina: RitmoDeInsulina
  gramosConDato: number
  gramosApuntados: number
}

export function leerDia(dia: DiaDeComidas | undefined): LecturaDelDia {
  const lecturas = (dia?.comidas ?? []).map(leerComida)

  let proteinaG = 0
  let diaasPonderado = 0
  let proteinaConDiaas = 0
  let deuterioPonderado = 0
  let gramosConDeuterio = 0
  let gramosConDato = 0
  let gramosApuntados = 0
  let anti: NivelAntinutrientes | undefined

  for (const l of lecturas) {
    proteinaG += l.proteinaG
    gramosConDato += l.gramosConDato
    gramosApuntados += l.gramosApuntados
    if (l.diaas !== undefined && l.proteinaG > 0) {
      diaasPonderado += l.diaas * l.proteinaG
      proteinaConDiaas += l.proteinaG
    }
    if (l.deuterioPpm !== undefined && l.gramosConDato > 0) {
      deuterioPonderado += l.deuterioPpm * l.gramosConDato
      gramosConDeuterio += l.gramosConDato
    }
    if (l.antinutrientes) {
      if (!anti || ORDEN_ANTI.indexOf(l.antinutrientes) > ORDEN_ANTI.indexOf(anti)) {
        anti = l.antinutrientes
      }
    }
  }

  return {
    comidas: lecturas.length,
    conUmbral: lecturas.filter((l) => l.llegaAlUmbral).length,
    proteinaG,
    diaas: proteinaConDiaas > 0 ? diaasPonderado / proteinaConDiaas : undefined,
    deuterioPpm: gramosConDeuterio > 0 ? deuterioPonderado / gramosConDeuterio : undefined,
    antinutrientes: anti,
    insulina: ritmoDeInsulina(dia),
    gramosConDato,
    gramosApuntados
  }
}

/** Cuánto de lo apuntado tiene dato, de 0 a 1. */
export function coberturaDeDatos(l: { gramosConDato: number; gramosApuntados: number }): number {
  if (l.gramosApuntados <= 0) return 0
  return Math.min(1, l.gramosConDato / l.gramosApuntados)
}
