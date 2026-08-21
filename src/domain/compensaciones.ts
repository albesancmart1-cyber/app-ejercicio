/**
 * Qué se compensa, con qué, y qué no se compensa con nada.
 *
 * Esta tabla estaba escrita en la página de producto y no en la app, que es el
 * peor sitio posible: la promesa la lee quien está decidiendo si instalarla, y
 * la necesita quien ya la está usando a las siete menos cuarto de la mañana.
 *
 * ## La regla que la gobierna
 *
 * **Una herramienta que tenga un remedio para todo te está mintiendo en algo.**
 * Por eso cada compensación viene con su letra pequeña —qué es lo que *no*
 * cubre— y por eso hay una fila cuyo remedio es «nada». Quitarla haría la
 * pantalla más agradable y menos cierta.
 *
 * ## Por qué la fase y la amplitud van por separado
 *
 * Porque no se compensan igual ni cuestan lo mismo:
 *
 *  - **La fase se recupera con minutos**, si caen en el momento correcto. Es la
 *    esfera barata. Pero «sal cinco minutos» no es un consejo si no te dejan
 *    salir, así que la app no lo reparte: mira los huecos que de verdad tienes.
 *  - **La amplitud es un cociente**, y ahí está la buena noticia: si no puedes
 *    subir el numerador —las horas de día— puedes bajar el denominador. Una
 *    noche genuinamente oscura sube la amplitud tanto como una hora al aire
 *    libre, y esa mitad es entera tuya.
 */
import type { Banda4 } from './balanceLuz'

export interface Compensacion {
  id: string
  /** Lo que falta. */
  falta: string
  /** Con qué se paga, o `null` cuando no hay con qué. */
  seCompensaCon: string | null
  /** Y lo que eso **no** cubre. Es la parte que hace honesta la tabla. */
  noCubre: string
  /** A qué barra del balance pertenece, para poder enseñar solo lo que toca. */
  banda?: Banda4
}

export const COMPENSACIONES: Compensacion[] = [
  {
    id: 'rojo-ir',
    falta: 'Rojo e infrarrojo',
    seCompensaCon:
      'Fotobiomodulación. Es la única banda que un aparato sustituye de verdad, porque es justo la que el interior no tiene y la que penetra centímetros.',
    noCubre: 'La fase. Un LED rojo no pone tu reloj en hora.',
    banda: 'rojo'
  },
  {
    id: 'fase-manana',
    falta: 'La señal de la mañana',
    seCompensaCon:
      'El hueco que de verdad tengas, sea cual sea. Sirve el crepúsculo civil, así que vale aunque el sol no haya salido — pero solo si en ese momento puedes estar fuera.',
    noCubre:
      'Si tu único hueco cae con el sol por debajo del horizonte, no hay nada que recibir. Se dice, y se pasa al fin de semana.',
    banda: 'azul'
  },
  {
    id: 'amplitud-arriba',
    falta: 'La amplitud, por arriba',
    seCompensaCon:
      'Salidas cortas y repetidas, comer fuera si se puede, el trayecto a pie, la ventana abierta.',
    noCubre: 'Nada iguala una hora de exterior. Se suma lo que se pueda y ya está.'
  },
  {
    id: 'amplitud-abajo',
    falta: 'La amplitud, por abajo',
    seCompensaCon:
      'Una noche de verdad oscura. Luz roja, filtro, la persiana bajada. Es la mitad del cociente que controlas entera.',
    noCubre: '—',
    banda: 'oscuridad'
  },
  {
    id: 'azul-aislado',
    falta: 'El azul aislado del taller',
    seCompensaCon:
      'Filtro ámbar en las gafas y rojo e infrarrojo para devolverle al espectro la mitad que le falta.',
    noCubre: 'No lo convierte en luz solar. Solo le devuelve lo que le habían quitado.'
  },
  {
    id: 'sol-invierno',
    falta: 'El sol del invierno',
    seCompensaCon:
      'Frío. Sube melatonina por otra vía, y cuando en tu latitud no hay UVB es la palanca que ocupa ese sitio.',
    noCubre: 'La vitamina D. Eso no lo hace el frío.'
  },
  {
    id: 'uvb',
    falta: 'La UVB',
    seCompensaCon: null,
    noCubre:
      'Ni lámpara, ni suplemento, ni truco. Se apunta como analítica y se recupera cuando el arco vuelve a subir. La app no te va a ofrecer otra cosa.',
    banda: 'ultravioleta'
  }
]

/** Lo que una lámpara **no** tapa, dicho sin rodeos. */
export const LO_QUE_LA_LAMPARA_NO_TAPA = [
  'La fase: el rojo no mueve tu reloj, por muchos julios que le eches.',
  'La UVB: ninguna lámpara de fotobiomodulación fabrica vitamina D.',
  'El espectro completo del sol, que trae mucho más que dos o tres longitudes de onda.'
]

/** Si una banda tiene remedio, para no ofrecer uno donde no lo hay. */
export function tieneRemedio(banda: Banda4): boolean {
  return COMPENSACIONES.filter((c) => c.banda === banda).some((c) => c.seCompensaCon !== null)
}

/** Lo que se puede hacer por una banda concreta, o nada. */
export function compensacionesDe(banda: Banda4): Compensacion[] {
  return COMPENSACIONES.filter((c) => c.banda === banda)
}

/**
 * Las que no tienen remedio. Existe como función y no como constante para que
 * se lea en el sitio donde importa: cualquiera que añada una fila nueva sin
 * `seCompensaCon` la verá aparecer aquí sola.
 */
export function sinRemedio(): Compensacion[] {
  return COMPENSACIONES.filter((c) => c.seCompensaCon === null)
}
