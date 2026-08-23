/**
 * El buzón de medidas: cómo entra en la app algo medido desde otro sitio.
 *
 * El reloj no puede escribir en la nube como lo hace el móvil. El móvil guarda
 * **el JSON entero de la cuenta en una sola fila** y lo fusiona en el
 * dispositivo (`merge.ts`) antes de subirlo; para hacer eso desde el reloj
 * habría que bajarse todo, entender el esquema entero y volver a subirlo, y dos
 * aparatos escribiendo la misma fila acabarían pisándose.
 *
 * Así que el reloj no toca esa fila. Escribe **eventos sueltos** —«empecé sol a
 * las 10:14», «lo paré a las 10:41»— en una tabla aparte que solo crece, y el
 * móvil los recoge y los mete donde van la próxima vez que sincroniza. El reloj
 * no necesita saber nada del esquema de la app: solo mandar cinco campos.
 *
 * ## Por qué se puede recoger dos veces sin miedo
 *
 * Cada medida trae su `id`, y ese `id` **es** el de lo que se guarda. Como las
 * acciones del store sustituyen por `id` en vez de añadir, recoger el mismo
 * evento dos veces deja exactamente el mismo resultado que recogerlo una. Es lo
 * que permite que el móvil no tenga que llevar la cuenta de lo ya recogido, y
 * que un fallo de red a mitad no duplique un rato de sol.
 */
import { alParar, type Escritura } from './medir'
import type { AppData, DiaDeSol, EnCurso, TipoEnCurso } from './types'

/** Los tipos que el buzón acepta. Es la lista de `TipoEnCurso`, sin más. */
const TIPOS: TipoEnCurso[] = [
  'sol',
  'amanecer',
  'atardecer',
  'fuera',
  'lampara',
  'oscuridad',
  'frio',
  'grounding'
]

/**
 * Una medida tal y como llega de fuera.
 *
 * Todo lo que no sea `id`, `tipo`, `date` y `desde` es opcional, porque quien
 * escribe puede ser un atajo del reloj con cuatro campos. Lo que falte se
 * resuelve con lo mismo que usa la app cuando el usuario no lo dice.
 */
export interface MedidaDeFuera {
  id: string
  tipo: string
  /** Fecha ISO del día al que pertenece. */
  date: string
  /** Minutos desde medianoche en que empezó. */
  desde: number
  /** Y en que se paró. Sin esto, la medida sigue abierta y no se recoge aún. */
  hasta?: number | null
  piel?: string | null
  cielo?: string | null
  filtro?: string | null
  lamparaId?: string | null
  zona?: string | null
  distanciaCm?: number | null
  /** De dónde vino, solo para poder decirlo: «reloj», «atajo». */
  origen?: string | null
}

/**
 * Si una medida se puede usar.
 *
 * Se es estricto a propósito: esto viene de fuera, y una fila con el tipo mal
 * escrito o con una hora imposible metería basura en el diario de alguien sin
 * que se entere. Lo que no encaje se descarta y se dice cuántas fueron.
 */
export function valeLaMedida(m: MedidaDeFuera): boolean {
  if (!m.id || typeof m.id !== 'string') return false
  if (!TIPOS.includes(m.tipo as TipoEnCurso)) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) return false
  if (!Number.isFinite(m.desde) || m.desde < 0 || m.desde >= 1440) return false
  // Sin hora de parada sigue en marcha: no es un error, es que aún no ha acabado.
  if (m.hasta === undefined || m.hasta === null) return false
  if (!Number.isFinite(m.hasta) || m.hasta < 0 || m.hasta > 1440) return false
  return true
}

/** Reconstruye el `EnCurso` que el reloj tenía abierto. */
function comoEnCurso(m: MedidaDeFuera): EnCurso {
  return {
    tipo: m.tipo as TipoEnCurso,
    date: m.date,
    desde: m.desde,
    ...(m.piel ? { piel: m.piel as EnCurso['piel'] } : {}),
    ...(m.cielo ? { cielo: m.cielo as EnCurso['cielo'] } : {}),
    ...(m.filtro ? { filtro: m.filtro as EnCurso['filtro'] } : {}),
    ...(m.lamparaId ? { lamparaId: m.lamparaId } : {}),
    ...(m.zona ? { zona: m.zona as EnCurso['zona'] } : {}),
    ...(m.distanciaCm ? { distanciaCm: m.distanciaCm } : {})
  }
}

export interface Recogida {
  /** Lo que hay que escribir, ya en el formato de siempre. */
  escrituras: { fecha: string; escritura: Escritura }[]
  /** Los ids que se han podido usar, para poder borrarlos del buzón. */
  recogidos: string[]
  /** Y los que no valían. Se dicen, no se esconden. */
  descartados: string[]
}

/**
 * Convierte lo que haya en el buzón en escrituras de las de siempre.
 *
 * No escribe nada: devuelve qué escribir, igual que `alParar`, para que esto se
 * pueda probar sin store, sin red y sin navegador. Y pasa por `alParar`, o sea
 * que una medida del reloj deja **exactamente los mismos rastros** que si la
 * hubieras hecho con el dedo en el móvil: un rato de sol deja su salida y su
 * exposición, y estar descalzo deja hábito y rato fuera.
 */
export function recoger(
  medidas: MedidaDeFuera[] | undefined,
  nivelDeHabito: (t: TipoEnCurso, fecha: string) => number = () => 1
): Recogida {
  const escrituras: { fecha: string; escritura: Escritura }[] = []
  const recogidos: string[] = []
  const descartados: string[] = []

  for (const m of medidas ?? []) {
    if (!valeLaMedida(m)) {
      // Las que siguen en marcha no son basura: se quedan en el buzón para la
      // próxima. Solo se marcan como descartadas las que nunca van a valer.
      if (m.id && (m.hasta === undefined || m.hasta === null)) continue
      if (m.id) descartados.push(m.id)
      continue
    }

    const x = comoEnCurso(m)
    for (const e of alParar(x, m.hasta as number, { nivelHabito: nivelDeHabito(x.tipo, x.date) })) {
      escrituras.push({ fecha: x.date, escritura: conId(e, m.id) })
    }
    recogidos.push(m.id)
  }

  return { escrituras, recogidos, descartados }
}

/**
 * Le pone a lo que se escribe el `id` de la medida que lo trajo.
 *
 * Es lo que hace que recoger dos veces no duplique nada: las acciones del store
 * sustituyen por `id`. Sin esto, un fallo de red entre recoger y borrar del
 * buzón dejaría dos ratos de sol iguales el mismo día.
 */
function conId(e: Escritura, id: string): Escritura {
  switch (e.en) {
    case 'salida':
      return { en: 'salida', salida: { ...e.salida, id } }
    case 'sesionPBM':
      return { en: 'sesionPBM', sesion: { ...e.sesion, id } }
    case 'exposicion':
      return { en: 'exposicion', exposicion: { ...e.exposicion, id } }
    // La noche va por fecha y el hábito por fecha y tipo: los dos sustituyen
    // solos, así que no necesitan que se les ponga nada.
    case 'noche':
    case 'habito':
      return e
  }
}


/* ══════════════════════════════════════════════ METERLO EN LOS DATOS ══ */

/**
 * Mete en los datos lo que traía el buzón.
 *
 * Es la versión pura de lo que hacen las acciones del store, y existe porque la
 * sincronización trabaja sobre un `AppData` suelto —el que acaba de salir de la
 * fusión— y no sobre el estado vivo. Sustituye por `id` igual que el store, así
 * que aplicar dos veces deja lo mismo que aplicar una.
 */
export function aplicar(
  data: AppData,
  escrituras: { fecha: string; escritura: Escritura }[]
): AppData {
  let out = data

  for (const { fecha, escritura: e } of escrituras) {
    switch (e.en) {
      case 'salida':
        out = {
          ...out,
          salidas: [...(out.salidas ?? []).filter((x) => x.id !== e.salida.id), e.salida]
        }
        break

      case 'sesionPBM':
        out = {
          ...out,
          sesionesPBM: [
            ...(out.sesionesPBM ?? []).filter((x) => x.id !== e.sesion.id),
            e.sesion
          ]
        }
        break

      case 'exposicion': {
        const dia = (out.sol ?? []).find((d) => d.date === fecha)
        const previas = (dia?.exposiciones ?? []).filter(
          (x) => !e.exposicion.id || x.id !== e.exposicion.id
        )
        const nuevo: DiaDeSol = {
          ...(dia ?? {}),
          date: fecha,
          exposiciones: [...previas, e.exposicion],
          updatedAt: Date.now()
        }
        out = {
          ...out,
          sol: [...(out.sol ?? []).filter((d) => d.date !== fecha), nuevo].sort((a, b) =>
            a.date < b.date ? -1 : 1
          )
        }
        break
      }

      case 'noche':
        out = {
          ...out,
          noches: [...(out.noches ?? []).filter((n) => n.date !== e.noche.date), e.noche]
        }
        break

      case 'habito':
        out = {
          ...out,
          habitos: [
            ...(out.habitos ?? []).filter(
              (h) => !(h.date === e.registro.date && h.habito === e.registro.habito)
            ),
            e.registro
          ]
        }
        break
    }
  }

  return out
}
