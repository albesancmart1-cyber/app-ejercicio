/**
 * Heavy Duty: la filosofía de entreno de la app.
 *
 * Mike Mentzer, *Heavy Duty* (1993) y *High-Intensity Training the Mike Mentzer
 * Way* (2003), sobre el trabajo previo de Arthur Jones.
 *
 * ## La idea, que cabe en tres frases
 *
 * El estímulo que hace crecer un músculo es la **intensidad**, no la cantidad.
 * Una serie llevada al fallo real da ese estímulo entero, y todo lo que se haga
 * después no lo aumenta: solo gasta capacidad de recuperación.
 *
 * Y la capacidad de recuperación es limitada. El músculo no crece en el
 * gimnasio, crece después, y solo si le dejas. Entrenar antes de haberte
 * recuperado no es entrenar de más: es **entrenar en negativo**, porque
 * interrumpes la reparación de la sesión anterior para pedir otra.
 *
 * De ahí lo que hace esta app: series muy pocas, muy duras, y muchos días de
 * por medio. El descanso no es lo que hay entre entrenos — es la mitad del
 * entreno.
 *
 * ## Lo que esto cambia respecto a lo que había
 *
 * El motor anterior era de volumen: 10 a 20 series semanales por músculo,
 * parar a 1–3 repeticiones en reserva, dos sesiones por músculo y semana. No es
 * que estuviera mal —es la lectura mayoritaria de la evidencia de hipertrofia—,
 * es que es **la filosofía contraria**, y las dos no se pueden servir a la vez
 * sin acabar en un híbrido que no es ninguna. Aquí manda esta.
 *
 * ## Lo que la app hace distinto por creérselo
 *
 * **«Hoy no» es una respuesta de primera clase.** No un aviso ni un rodeo: la
 * pantalla lo dice y no ofrece un plan B más suave, porque un plan B más suave
 * es exactamente lo que arruina el ciclo. Ver `descansoQueQueda`.
 *
 * **El descanso crece con lo que levantas.** Un principiante se recupera de una
 * sesión en cuatro días; el mismo cuerpo tres años después, moviendo el doble
 * de peso, tarda una semana o más — porque la carga ha subido y la capacidad de
 * recuperación no. Es la observación central de Mentzer y la razón de que sus
 * rutinas se **espaciaran** con los años en vez de intensificarse. Ver
 * `DIAS_POR_NIVEL`.
 *
 * **Se cuenta el fallo, no las repeticiones.** Una serie que no llegó al fallo
 * no cuenta como estímulo, y la app lo dice en vez de sumarla igual.
 *
 * ## Lo que no se toma de Mentzer
 *
 * Su parte doctrinal. Mentzer defendió lo suyo como la única forma
 * racionalmente válida de entrenar y lo ató a una filosofía entera. Aquí es una
 * forma de entrenar, la que has elegido, y la app la aplica bien sin decir que
 * las demás sean errores.
 */
import type { MuscleGroup, Session } from './types'
import type { Readiness } from './readiness'
import { daysBetween, wasDone } from './muscleBalance'
import { exerciseById } from '../data/exercises'

/* ══════════════════════════════════════════════ LA SESIÓN ══ */

/**
 * Series de trabajo por sesión, sin contar el calentamiento.
 *
 * Tres a siete. Por debajo de tres no se ha tocado el cuerpo entero; por encima
 * de siete ya no queda intensidad que dar, y lo que sobra sale del fondo de
 * recuperación que hace falta para la siguiente.
 */
export const SERIES_POR_SESION = { minimo: 3, objetivo: 5, techo: 7 }

/** Series al fallo por ejercicio. Es uno, y es el corazón de todo esto. */
export const SERIES_POR_EJERCICIO = 1

/**
 * Repeticiones objetivo, por zona.
 *
 * Se dan en repeticiones porque es como se cuenta en la sala, pero lo que se
 * busca es el **tiempo bajo tensión**: entre 40 y 70 segundos de trabajo
 * continuo hasta que el músculo no puede mover el peso. Las piernas piden un
 * rango más alto porque su fibra aguanta más tiempo antes de fallar.
 */
export const REPETICIONES = {
  general: { min: 6, max: 10 },
  piernas: { min: 8, max: 15 }
}

/** Cuánto se sube cuando se llega al tope del rango. Doble progresión. */
export const SUBIDA_AL_LLEGAR_ARRIBA = { tren_superior: 0.025, tren_inferior: 0.05 }

/* ══════════════════════════════════════════════ EL DESCANSO ══ */

/**
 * Días de descanso mínimos según cuánto tiempo llevas entrenando así.
 *
 * Crece a propósito. Es lo contrario de lo que hace casi todo el mundo —añadir
 * frecuencia según se avanza— y es la conclusión que Mentzer sacó de ver a sus
 * clientes estancarse: cuanto más peso mueves, más profundo es el agujero que
 * abre cada sesión, y la capacidad de repararlo no sube con la fuerza.
 *
 * El nivel no se pregunta: sale de cuántas sesiones llevas hechas.
 */
export const DIAS_POR_NIVEL = [
  { hasta: 20, dias: 3, nombre: 'empezando' },
  { hasta: 60, dias: 4, nombre: 'asentado' },
  { hasta: 150, dias: 5, nombre: 'avanzado' },
  { hasta: Infinity, dias: 7, nombre: 'veterano' }
] as const

/** Tope de días sin entrenar antes de que descansar deje de ser descansar. */
export const DIAS_QUE_YA_SON_PARON = 14

/**
 * Por debajo de esta disposición no se entrena, y no se ofrece nada más suave.
 *
 * En un sistema de volumen, un día regular se resuelve bajando el listón. Aquí
 * no se puede: una serie al fallo con el cuerpo a medias no es media serie al
 * fallo, es la misma factura de recuperación por menos estímulo. O se llega, o
 * se espera.
 */
export const DISPOSICION_MINIMA = 55

export interface NivelHD {
  dias: number
  nombre: string
  sesiones: number
}

/** En qué punto estás, por sesiones completadas. */
export function nivelDe(sessions: Session[]): NivelHD {
  const hechas = sessions.filter((s) => s.completed).length
  const nivel = DIAS_POR_NIVEL.find((n) => hechas < n.hasta) ?? DIAS_POR_NIVEL[DIAS_POR_NIVEL.length - 1]
  return { dias: nivel.dias, nombre: nivel.nombre, sesiones: hechas }
}

/** Días desde la última sesión completada, o `null` si no hay ninguna. */
export function diasDesdeLaUltima(sessions: Session[], hoyIso: string): number | null {
  const hechas = sessions.filter((s) => s.completed).map((s) => s.date).sort()
  const ultima = hechas[hechas.length - 1]
  return ultima === undefined ? null : Math.max(0, daysBetween(ultima, hoyIso))
}

/** Los grupos que tocó la última sesión, que son los que están reparándose. */
export function gruposDeLaUltima(sessions: Session[]): MuscleGroup[] {
  const hechas = sessions.filter((s) => s.completed).sort((a, b) => (a.date < b.date ? -1 : 1))
  const ultima = hechas[hechas.length - 1]
  if (!ultima) return []
  const grupos = new Set<MuscleGroup>()
  for (const pe of ultima.exercises) {
    if (!wasDone(pe.done)) continue
    const ex = exerciseById(pe.exerciseId)
    if (ex && ex.primary !== 'cardio') grupos.add(ex.primary)
  }
  return [...grupos]
}

export interface Veredicto {
  /** Si hoy toca entrenar. */
  entrenar: boolean
  /** Días que faltan, 0 si toca hoy. */
  faltan: number
  diasDescansados: number
  nivel: NivelHD
  /** Por qué, en una frase que se puede enseñar tal cual. */
  porque: string
  /** Lo que sea que convenga decir debajo, si algo. */
  nota?: string
}

/**
 * Si hoy toca entrenar, y si no, cuánto falta.
 *
 * Tres cosas pueden decir que no, y en este orden: no han pasado los días,
 * no llegas de disposición, o llevas tanto sin entrenar que ya no es descanso.
 * El orden importa porque el mensaje cambia: al que le faltan dos días hay que
 * decirle que espere, y al que lleva tres semanas hay que decirle que vuelva.
 */
export function veredictoDelDia(
  sessions: Session[],
  hoyIso: string,
  readiness: Readiness | null
): Veredicto {
  const nivel = nivelDe(sessions)
  const desde = diasDesdeLaUltima(sessions, hoyIso)

  if (desde === null) {
    return {
      entrenar: true,
      faltan: 0,
      diasDescansados: 0,
      nivel,
      porque: 'Primera sesión. A partir de aquí, el descanso lo marca lo que levantes.'
    }
  }

  if (desde >= DIAS_QUE_YA_SON_PARON) {
    return {
      entrenar: true,
      faltan: 0,
      diasDescansados: desde,
      nivel,
      porque: `Llevas ${desde} días. Eso ya no es descanso, es un parón.`,
      nota: 'Vuelve con menos peso del que recuerdas y una serie por ejercicio. La fuerza vuelve en dos sesiones; una lesión por volver de golpe, no.'
    }
  }

  if (desde < nivel.dias) {
    const faltan = nivel.dias - desde
    return {
      entrenar: false,
      faltan,
      diasDescansados: desde,
      nivel,
      porque:
        faltan === 1
          ? 'Mañana. Hoy tu cuerpo todavía está pagando la sesión anterior.'
          : `Faltan ${faltan} días. Tu cuerpo todavía está pagando la sesión anterior.`,
      nota: `A tu nivel —${nivel.nombre}, ${nivel.sesiones} sesiones— hacen falta ${nivel.dias} días entre sesiones. Ese número sube con los años, no baja: cuanto más peso mueves, más hondo es el agujero que abre cada entreno.`
    }
  }

  if (readiness && readiness.score < DISPOSICION_MINIMA) {
    return {
      entrenar: false,
      faltan: 1,
      diasDescansados: desde,
      nivel,
      porque: `Han pasado los días, pero hoy no llegas: ${readiness.score} de disposición.`,
      nota: 'Aquí no se puede bajar el listón y entrenar igual. Una serie al fallo con el cuerpo a medias no es media serie: es la misma factura de recuperación por menos estímulo. Duerme y mañana lo miramos.'
    }
  }

  return {
    entrenar: true,
    faltan: 0,
    diasDescansados: desde,
    nivel,
    porque: `${desde} días de descanso. Toca.`,
    nota:
      desde > nivel.dias + 2
        ? 'Has descansado más de lo que pedías. No pasa nada: de más descanso se sale entrenando, de menos no.'
        : undefined
  }
}

/**
 * Cuánto falta, dicho para una pantalla.
 *
 * Existe aparte del veredicto porque la cifra se enseña en dos sitios con
 * intención distinta —el titular y el detalle— y repetir el formato en cada uno
 * es como acaban diciendo cosas distintas.
 */
export function descansoQueQueda(v: Veredicto): string {
  if (v.entrenar) return 'Hoy toca'
  if (v.faltan === 1) return 'Mañana'
  return `Faltan ${v.faltan} días`
}

/* ══════════════════════════════════════════════ LA SERIE ══ */

/**
 * Lo que hay que hacer en cada serie, dicho una vez y bien.
 *
 * Va aquí y no repartido por las pantallas porque es lo único que de verdad
 * hay que aprender de esta forma de entrenar, y porque una instrucción que se
 * escribe en tres sitios acaba diciendo tres cosas.
 */
export const COMO_ES_UNA_SERIE = [
  'Calienta esa articulación con dos series muy fáciles. No cuentan y no cansan.',
  'Una sola serie de trabajo. Al fallo real: no cuando duele ni cuando te falta poco, sino cuando el peso deja de subir aunque empujes.',
  'Lento. Dos segundos subiendo, cuatro bajando. La bajada es donde está la mitad del estímulo y es la que todo el mundo suelta.',
  'Sin rebote y sin ayuda de la cadera. Si hace falta impulso, el peso es demasiado.',
  'Cuando llegues al tope de repeticiones del rango, sube el peso en la siguiente sesión.'
]

/** Y lo que no hay que hacer, que en Heavy Duty importa igual. */
export const LO_QUE_NO = [
  'Series de más «por si acaso». Si la primera fue al fallo, la segunda no añade estímulo: añade factura.',
  'Entrenar el día que tocaba descansar porque te encontrabas bien. Encontrarse bien es el resultado de haber descansado, no permiso para gastarlo.',
  'Cambiar de ejercicio cada semana. Sin repetir el mismo movimiento no hay forma de saber si has progresado.'
]
