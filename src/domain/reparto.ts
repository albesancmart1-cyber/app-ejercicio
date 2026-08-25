/**
 * En qué se te ha ido el día.
 *
 * La rejilla de «Medir» dice qué está en marcha y cuánto llevas de cada cosa,
 * pero suelto: once cifras que hay que ir sumando con la cabeza. Esto las pone
 * juntas y a escala, para poder ver de un vistazo dónde se fueron las horas.
 *
 * ## Lo que hace distinto a esto de una simple suma
 *
 * **Los ratos se solapan, y hay que contarlos una vez.** Ver el atardecer *es*
 * estar fuera; estar descalzo en la hierba *es* estar fuera. Si a las diez sales
 * al jardín, te descalzas y te quedas media hora, eso es media hora de calle —
 * no una hora—, aunque haya dos registros de treinta minutos.
 *
 * Sumar los minutos daba justo eso: el doble. Por eso aquí no se suma, se **une
 * el intervalo**: se cogen los tramos, se pegan los que se pisan, y se mide lo
 * que queda. Es la única cuenta que no miente cuando dos cosas ocurren a la vez.
 *
 * ## Y se enseña el anidamiento, no se esconde
 *
 * «Fuera» va como rama principal y las otras cuatro colgando de ella. Así se ve
 * que los veinte minutos de atardecer están **dentro** de los cuarenta de calle
 * y no al lado, que es lo que uno querría saber al mirarlo.
 */
import type {
  Fichaje,
  NocheRegistrada,
  SalidaAlExterior,
  Session,
  SesionPBM,
  TipoEnCurso
} from './types'
import type { RegistroHabito } from './habitos'
import { minutosFueraDelEntreno } from './entornoEntreno'

/** Un rato, en minutos desde la medianoche. `hasta` puede pasar de 1440. */
export interface Tramo {
  desde: number
  hasta: number
}

/**
 * Pega los tramos que se pisan y devuelve los que quedan, en orden.
 *
 * Es toda la aritmética que hace falta para no contar un minuto dos veces, y
 * está aparte para poder probarla sola: los solapes son el sitio donde estas
 * cuentas fallan sin que se note.
 */
export function unir(tramos: Tramo[]): Tramo[] {
  const limpios = tramos
    .map((t) => ({ desde: Math.min(t.desde, t.hasta), hasta: Math.max(t.desde, t.hasta) }))
    .filter((t) => t.hasta > t.desde)
    .sort((a, b) => a.desde - b.desde)

  const out: Tramo[] = []
  for (const t of limpios) {
    const ultimo = out[out.length - 1]
    // Se pegan también los que se tocan justo en el borde: salir a las 10:00
    // durante media hora y otra vez a las 10:30 es una hora seguida de calle.
    if (ultimo && t.desde <= ultimo.hasta) {
      ultimo.hasta = Math.max(ultimo.hasta, t.hasta)
    } else {
      out.push({ ...t })
    }
  }
  return out
}

/** Cuánto suman unos tramos, contando cada minuto una sola vez. */
export function minutosDe(tramos: Tramo[]): number {
  return unir(tramos).reduce((a, t) => a + (t.hasta - t.desde), 0)
}

/** Una línea del reparto, con lo que cuelgue de ella. */
export interface Rama {
  id: string
  nombre: string
  minutos: number
  /** Lo que ocurre **dentro** de esta, no al lado. */
  dentro?: Rama[]
}

export interface Reparto {
  ramas: Rama[]
  /**
   * El día con algo apuntado, sin contar ningún minuto dos veces — ni siquiera
   * entre ramas distintas: estar fichado y salir al patio es un solo minuto.
   */
  minutosApuntados: number
  /** El más largo de todos, para poner las barras a la misma escala. */
  tope: number
}

const NOMBRES: Record<string, string> = {
  fuera: 'Fuera',
  sol: 'Sol',
  amanecer: 'Amanecer',
  atardecer: 'Atardecer',
  grounding: 'Grounding',
  soloFuera: 'Sin nada más',
  lampara: 'Lámpara',
  frio: 'Frío',
  oscuridad: 'A oscuras',
  trabajo: 'Trabajo',
  entreno: 'Entreno'
}

/** Las cuatro que cuelgan de «Fuera», en el orden en que ocurren en el día. */
const BAJO_FUERA: TipoEnCurso[] = ['amanecer', 'sol', 'atardecer', 'grounding']

export interface DatosDelReparto {
  fecha: string
  /** Minutos desde medianoche. Cierra lo que siga abierto. */
  ahoraMin: number
  salidas?: SalidaAlExterior[]
  sesionesPBM?: SesionPBM[]
  habitos?: RegistroHabito[]
  noches?: NocheRegistrada[]
  fichajes?: Fichaje[]
  sessions?: Session[]
  /** Para poder fijar el reloj en las pruebas. */
  ahoraMs?: number
}

const tramoDe = (desde: number, minutos: number): Tramo => ({
  desde,
  hasta: desde + Math.max(0, minutos)
})

/** Los ratos de calle del día, con su tipo. */
function salidasDe(d: DatosDelReparto): { tipo: string; tramo: Tramo }[] {
  return (d.salidas ?? [])
    .filter((s) => s.date === d.fecha)
    .map((s) => ({
      // Los ratos de antes de que existiera `tipo` no se reparten a dedo entre
      // las cuatro ramas: cuentan como calle, y nada más. Adivinar de cuál
      // eran sería inventar el pasado.
      tipo: s.tipo ?? 'soloFuera',
      tramo: tramoDe(s.desde, s.minutos)
    }))
}

/**
 * La noche, que cruza la medianoche y por eso son dos tramos.
 *
 * Se guarda con la fecha de la mañana en que uno se levanta, así que apagar a
 * las 23:30 deja un tramo al final del día anterior y otro al principio de
 * este. Del día que se mira solo cuenta el segundo.
 */
function nocheDe(d: DatosDelReparto): Tramo[] {
  const n = (d.noches ?? []).find((x) => x.date === d.fecha)
  if (!n) return []
  if (n.levantado >= n.apagado) return [{ desde: n.apagado, hasta: n.levantado }]
  return [{ desde: 0, hasta: n.levantado }]
}

function trabajoDe(d: DatosDelReparto): Tramo[] {
  return (d.fichajes ?? [])
    .filter((f) => f.date === d.fecha)
    .map((f) => ({ desde: f.entrada, hasta: f.salida ?? d.ahoraMin }))
}

/**
 * Los ratos del entreno que fueron al aire libre.
 *
 * Cuelgan de «Fuera» como cuelga el sol, porque lo son: entrenar en la calle,
 * o salir a la puerta en los descansos, es estar fuera. Se colocan al principio
 * del bloque del entreno, que es una simplificación y se dice: los descansos
 * están repartidos por toda la sesión, no juntos al empezar, pero para el
 * reparto del día lo que importa es cuántos minutos fueron, no en qué orden.
 */
function entrenoFueraDe(d: DatosDelReparto): Tramo[] {
  return (d.sessions ?? [])
    .filter((s) => s.date === d.fecha && s.startedAt !== undefined)
    .map((s) => {
      const inicio = new Date(s.startedAt!)
      const desde = inicio.getHours() * 60 + inicio.getMinutes()
      return { desde, hasta: desde + minutosFueraDelEntreno(s) }
    })
    .filter((t) => t.hasta > t.desde)
}

function entrenoDe(d: DatosDelReparto): Tramo[] {
  const ahora = d.ahoraMs ?? Date.now()
  return (d.sessions ?? [])
    .filter((s) => s.date === d.fecha && s.startedAt !== undefined)
    .map((s) => {
      const inicio = new Date(s.startedAt!)
      const desde = inicio.getHours() * 60 + inicio.getMinutes()
      const dura = s.durationSec !== undefined
        ? s.durationSec / 60
        : Math.max(0, (ahora - s.startedAt!) / 60000)
      return { desde, hasta: desde + Math.round(dura) }
    })
}

function lamparaDe(d: DatosDelReparto): Tramo[] {
  return (d.sesionesPBM ?? [])
    .filter((s) => s.date === d.fecha && s.hora !== undefined)
    .map((s) => tramoDe(s.hora!, s.minutos))
}

/** El reparto del día. */
export function repartoDelDia(d: DatosDelReparto): Reparto {
  const salidas = salidasDe(d)
  /*
   * El entreno al aire libre —o sus descansos— es calle igual que el resto, y
   * cuelga de «Fuera» como cuelga el sol. Antes se contaba solo como entreno,
   * así que salir a la puerta entre series no aparecía en ninguna parte.
   */
  const delEntreno = entrenoFueraDe(d)
  const fuera = minutosDe([...salidas.map((s) => s.tramo), ...delEntreno])

  const dentro: Rama[] = []
  for (const t of [...BAJO_FUERA, 'soloFuera' as const]) {
    const suyos = salidas.filter((s) => s.tipo === t).map((s) => s.tramo)
    const min = minutosDe(suyos)
    if (min > 0) dentro.push({ id: t, nombre: NOMBRES[t], minutos: min })
  }
  if (minutosDe(delEntreno) > 0) {
    dentro.push({ id: 'entreno', nombre: NOMBRES.entreno, minutos: minutosDe(delEntreno) })
  }

  const ramas: Rama[] = []
  if (fuera > 0) {
    ramas.push({ id: 'fuera', nombre: NOMBRES.fuera, minutos: fuera, dentro })
  }

  const lampara = lamparaDe(d)
  // La lámpara sin hora —las apuntadas antes de que se guardara— no tiene tramo,
  // pero sus minutos sí cuentan: se suman aparte para no perderlos.
  const sinHora = (d.sesionesPBM ?? [])
    .filter((s) => s.date === d.fecha && s.hora === undefined)
    .reduce((a, s) => a + Math.max(0, s.minutos), 0)
  const minLampara = minutosDe(lampara) + sinHora
  if (minLampara > 0) ramas.push({ id: 'lampara', nombre: NOMBRES.lampara, minutos: minLampara })

  // El frío solo guarda minutos, sin hora a la que empezó: entra como línea
  // propia pero no puede participar en la unión del día. Se dice en la pantalla.
  const frio = (d.habitos ?? [])
    .filter((h) => h.date === d.fecha && h.habito === 'frio')
    .reduce((a, h) => a + (h.minutos ?? 0), 0)
  if (frio > 0) ramas.push({ id: 'frio', nombre: NOMBRES.frio, minutos: frio })

  const noche = nocheDe(d)
  if (minutosDe(noche) > 0) {
    ramas.push({ id: 'oscuridad', nombre: NOMBRES.oscuridad, minutos: minutosDe(noche) })
  }

  const trabajo = trabajoDe(d)
  if (minutosDe(trabajo) > 0) {
    ramas.push({ id: 'trabajo', nombre: NOMBRES.trabajo, minutos: minutosDe(trabajo) })
  }

  const entreno = entrenoDe(d)
  if (minutosDe(entreno) > 0) {
    ramas.push({ id: 'entreno', nombre: NOMBRES.entreno, minutos: minutosDe(entreno) })
  }

  return {
    ramas,
    // Todo junto y unido: estar fichado y salir al patio son los mismos minutos
    // del día, no dos veces los mismos.
    minutosApuntados: minutosDe([
      ...salidas.map((s) => s.tramo),
      ...lampara,
      ...noche,
      ...trabajo,
      ...entreno
    ]),
    tope: Math.max(1, ...ramas.map((r) => r.minutos))
  }
}
