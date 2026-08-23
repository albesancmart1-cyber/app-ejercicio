/**
 * Empezar y parar: el modelo de lo que está ocurriendo ahora mismo.
 *
 * Hasta aquí, apuntar algo era decir cuánto había durado **después**, y el
 * único botón de sol de la app daba diez minutos fijos, sin gafas y sin
 * preguntar cuánta piel llevabas. Con la fórmula de vitamina D dependiendo de
 * la hora exacta y de la altura del sol, eso ya no vale: hace falta poder decir
 * «estoy tomando el sol» y pararlo al entrar.
 *
 * ## Lo que este módulo NO hace
 *
 * No inventa una estructura de almacenamiento nueva. Cuando algo se para, se
 * escribe **en el tipo que ya existe** —`SalidaAlExterior`, `SesionPBM`,
 * `NocheRegistrada`, `RegistroHabito`— y por eso el balance de luz, las tres
 * esferas, los dos relojes, la explicación del peso y las estaciones siguen
 * funcionando sin tocar una línea. Lo único que faltaba era el estado
 * intermedio, y eso es todo lo que hay aquí.
 *
 * `Fichaje` no pasa por aquí: ya sabía estar abierto desde el principio, con su
 * `salida?` sin rellenar.
 *
 * ## Se permite más de una cosa a la vez
 *
 * Porque se solapan de verdad: estás fichado en el taller **y** sales quince
 * minutos al patio. Cerrar una no cierra la otra.
 */
import type {
  EnCurso,
  NocheRegistrada,
  SalidaAlExterior,
  SesionPBM,
  TipoEnCurso
} from './types'
import type { RegistroHabito } from './habitos'

export const NOMBRES_TIPO: Record<TipoEnCurso, string> = {
  sol: 'Tomando el sol',
  amanecer: 'Viendo el amanecer',
  atardecer: 'Viendo el atardecer',
  fuera: 'Fuera',
  lampara: 'Lámpara',
  oscuridad: 'A oscuras',
  frio: 'Frío',
  grounding: 'Descalzo en el suelo'
}

/**
 * Cuánto se da por hecho que duró algo que se dejó abierto.
 *
 * Media hora, y **marcado como estimado**. Es la parte que más importa acertar
 * de todo el módulo: alguien que aprieta «tomando el sol» a las once y se olvida
 * no ha estado catorce horas al sol, y apuntarlo así envenenaría la vitamina D
 * del día, el balance de luz y la amplitud de la semana de una sola vez.
 */
export const MINUTOS_SI_SE_OLVIDA = 30

/** A partir de aquí la pantalla avisa de que algo lleva demasiado abierto. */
export const MINUTOS_SOSPECHOSOS = 240

/** Lo que está abierto de un tipo, si lo está. */
export function abierto(
  enCurso: EnCurso[] | undefined,
  tipo: TipoEnCurso,
  fecha: string
): EnCurso | undefined {
  return (enCurso ?? []).find((x) => x.tipo === tipo && x.date === fecha)
}

/** Todo lo abierto hoy, para pintar los cronómetros. */
export function abiertosDe(enCurso: EnCurso[] | undefined, fecha: string): EnCurso[] {
  return (enCurso ?? []).filter((x) => x.date === fecha)
}

/**
 * Cuánto lleva abierto, en minutos.
 *
 * Nunca negativo: si el reloj se mueve hacia atrás —cambio de hora, o el móvil
 * corrigiendo la hora de red— devolver un número negativo dejaría duraciones
 * imposibles guardadas para siempre.
 */
export function minutosAbierto(x: EnCurso, ahoraMin: number): number {
  return Math.max(0, ahoraMin - x.desde)
}

/** Si algo lleva tanto tiempo abierto que seguramente se olvidó. */
export function pareceOlvidado(x: EnCurso, ahoraMin: number): boolean {
  return minutosAbierto(x, ahoraMin) >= MINUTOS_SOSPECHOSOS
}

/** Abre una actividad, sustituyendo la del mismo tipo si ya hubiera una. */
export function abrir(enCurso: EnCurso[] | undefined, nueva: EnCurso): EnCurso[] {
  return [...(enCurso ?? []).filter((x) => !(x.tipo === nueva.tipo && x.date === nueva.date)), nueva]
}

/** Y la cierra, sin tocar las demás. */
export function cerrar(
  enCurso: EnCurso[] | undefined,
  tipo: TipoEnCurso,
  fecha: string
): EnCurso[] {
  return (enCurso ?? []).filter((x) => !(x.tipo === tipo && x.date === fecha))
}

/**
 * Lo que hay que guardar al parar una actividad.
 *
 * Se devuelve como una descripción de qué escribir y dónde, en vez de escribir
 * directamente, para que esto se pueda probar sin store y sin navegador.
 */
export type Resultado =
  | { en: 'salida'; salida: SalidaAlExterior; exposicionDeSol?: true }
  | { en: 'sesionPBM'; sesion: SesionPBM }
  | { en: 'noche'; noche: NocheRegistrada }
  | { en: 'habito'; registro: RegistroHabito }
  | { en: 'nada' }

const nuevoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Qué se guarda al parar.
 *
 * `estimado` viaja hasta el resultado para que quien lo pinte pueda decirlo: un
 * rato que la app cerró sola no es lo mismo que uno que se paró a mano, y
 * presentarlos igual sería falsa precisión.
 */
export function alParar(
  x: EnCurso,
  hastaMin: number,
  opciones: { estimado?: boolean; nivelHabito?: number } = {}
): Resultado {
  const minutos = Math.max(0, hastaMin - x.desde)

  switch (x.tipo) {
    // Los cuatro de luz natural acaban en el mismo sitio. El sol además deja su
    // exposición para la vitamina D, con la piel y el cielo de cuando empezó.
    case 'sol':
    case 'amanecer':
    case 'atardecer':
    case 'fuera':
      return {
        en: 'salida',
        salida: {
          id: nuevoId(),
          date: x.date,
          desde: x.desde,
          minutos,
          filtro: x.filtro ?? 'ninguno',
          tipo: x.tipo,
          ...(opciones.estimado ? { estimado: true } : {})
        },
        ...(x.tipo === 'sol' ? { exposicionDeSol: true as const } : {})
      }

    case 'lampara':
      // Sin lámpara elegida no hay dosis que calcular, y guardar la sesión sin
      // ella dejaría un registro que nunca podrá contar nada.
      if (!x.lamparaId) return { en: 'nada' }
      return {
        en: 'sesionPBM',
        sesion: {
          id: nuevoId(),
          date: x.date,
          lamparaId: x.lamparaId,
          hora: x.desde,
          minutos,
          distanciaCm: x.distanciaCm ?? 15,
          zona: x.zona ?? 'torso'
        }
      }

    case 'oscuridad':
      /*
       * La noche se guarda con la fecha de la mañana en que uno se levanta —ver
       * el comentario de `NocheRegistrada`—, así que al apagar la luz a las 23:30
       * de un martes el registro es del miércoles.
       */
      return {
        en: 'noche',
        noche: {
          date: hastaMin < x.desde ? siguienteDia(x.date) : x.date,
          apagado: x.desde,
          levantado: hastaMin
        }
      }

    case 'frio':
    case 'grounding':
      return {
        en: 'habito',
        registro: {
          date: x.date,
          habito: x.tipo,
          nivel: opciones.nivelHabito ?? 1,
          minutos
        }
      }
  }
}

function siguienteDia(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Lo que quedó abierto de días anteriores, para cerrarlo al arrancar.
 *
 * Se cierra con `MINUTOS_SI_SE_OLVIDA` y marcado como estimado. Nunca se
 * arrastra a hoy: un «tomando el sol» de anteayer no es una actividad en curso,
 * es un despiste, y tratarlo como en curso haría que el cronómetro de la
 * pantalla enseñara cuarenta horas.
 */
export function loQueSeQuedoAbierto(
  enCurso: EnCurso[] | undefined,
  hoy: string
): { viejo: EnCurso; resultado: Resultado }[] {
  return (enCurso ?? [])
    .filter((x) => x.date < hoy)
    .map((viejo) => ({
      viejo,
      resultado: alParar(viejo, viejo.desde + MINUTOS_SI_SE_OLVIDA, { estimado: true })
    }))
}

/**
 * Cuánto llevas hoy de una cosa concreta, en minutos.
 *
 * Cada baldosa de «Medir» enseña lo suyo, y por eso hace falta saber de qué
 * botón salió cada rato. Los ratos de antes de que existiera `tipo` no se
 * reparten entre las cuatro baldosas de luz: se dejan fuera, porque adivinar
 * de cuál eran sería inventar el pasado.
 */
export function minutosDeHoy(
  tipo: TipoEnCurso,
  fecha: string,
  d: {
    salidas?: SalidaAlExterior[]
    sesionesPBM?: SesionPBM[]
    noches?: NocheRegistrada[]
    habitos?: RegistroHabito[]
  }
): number {
  const suma = (n: number[]) => n.reduce((a, b) => a + Math.max(0, b), 0)

  switch (tipo) {
    case 'sol':
    case 'amanecer':
    case 'atardecer':
    case 'fuera':
      return suma(
        (d.salidas ?? []).filter((s) => s.date === fecha && s.tipo === tipo).map((s) => s.minutos)
      )
    case 'lampara':
      return suma((d.sesionesPBM ?? []).filter((s) => s.date === fecha).map((s) => s.minutos))
    case 'oscuridad': {
      const n = (d.noches ?? []).find((x) => x.date === fecha)
      if (!n) return 0
      return n.levantado >= n.apagado ? n.levantado - n.apagado : 1440 - n.apagado + n.levantado
    }
    case 'frio':
    case 'grounding':
      return suma(
        (d.habitos ?? [])
          .filter((h) => h.date === fecha && h.habito === tipo)
          .map((h) => h.minutos ?? 0)
      )
  }
}
