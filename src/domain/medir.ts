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
  ExposicionSolar,
  NocheRegistrada,
  SalidaAlExterior,
  SesionPBM,
  TipoEnCurso
} from './types'
import type { RegistroHabito } from './habitos'
import { minutosDe } from './reparto'

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

/**
 * Lo que **implica estar fuera**.
 *
 * Tomar el sol es estar fuera. Ver el amanecer es estar fuera. Estar descalzo
 * en la hierba es estar fuera. Pedir dos toques para decir una sola cosa es la
 * clase de fricción que hace que la gente deje de apuntar, así que no se pide:
 * cada una de estas cuatro **cuenta ya como rato fuera** y lo enseña.
 *
 * `frio` no está, y es a propósito: una ducha fría se da dentro de casa. Meterla
 * aquí apuntaría minutos de calle que nunca ocurrieron.
 */
export const IMPLICA_FUERA: TipoEnCurso[] = ['sol', 'amanecer', 'atardecer', 'grounding']

/** Si algo de lo que está en marcha ya te está contando como fuera. */
export function yaEstaFuera(enCurso: EnCurso[] | undefined, fecha: string): TipoEnCurso | undefined {
  return abiertosDe(enCurso, fecha).find((x) => IMPLICA_FUERA.includes(x.tipo))?.tipo
}

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
 *
 * Es una **lista** y no una sola cosa porque una actividad puede dejar más de un
 * rastro: un rato descalzo en la hierba es a la vez un hábito y un rato fuera, y
 * un rato de sol es a la vez un rato fuera y una exposición para la vitamina D.
 */
export type Escritura =
  | { en: 'salida'; salida: SalidaAlExterior }
  | { en: 'exposicion'; exposicion: ExposicionSolar }
  | { en: 'sesionPBM'; sesion: SesionPBM }
  | { en: 'noche'; noche: NocheRegistrada }
  | { en: 'habito'; registro: RegistroHabito }

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
): Escritura[] {
  const minutos = Math.max(0, hastaMin - x.desde)

  /** El rato fuera que deja cualquiera de las cuatro que implican estar fuera. */
  const salida = (): Escritura => ({
    en: 'salida',
    salida: {
      id: nuevoId(),
      date: x.date,
      desde: x.desde,
      minutos,
      filtro: x.filtro ?? 'ninguno',
      tipo: x.tipo,
      ...(opciones.estimado ? { estimado: true } : {})
    }
  })

  switch (x.tipo) {
    case 'amanecer':
    case 'atardecer':
    case 'fuera':
      return [salida()]

    // El sol deja dos rastros: el rato fuera y la exposición, con la piel y el
    // cielo de cuando empezó. Van juntos y por eso salen juntos.
    case 'sol':
      return [
        salida(),
        {
          en: 'exposicion',
          exposicion: {
            minutos,
            // La franja solo la leen los registros viejos; aquí manda `desde`.
            franja: 'mediodia',
            piel: x.piel ?? 'brazos_piernas',
            desde: x.desde,
            ...(x.cielo ? { cielo: x.cielo } : {})
          }
        }
      ]

    case 'lampara':
      // Sin lámpara elegida no hay dosis que calcular, y guardar la sesión sin
      // ella dejaría un registro que nunca podrá contar nada.
      if (!x.lamparaId) return []
      return [
        {
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
      ]

    case 'oscuridad':
      /*
       * La noche se guarda con la fecha de la mañana en que uno se levanta —ver
       * el comentario de `NocheRegistrada`—, así que al apagar la luz a las 23:30
       * de un martes el registro es del miércoles.
       */
      return [
        {
          en: 'noche',
          noche: {
            date: hastaMin < x.desde ? siguienteDia(x.date) : x.date,
            apagado: x.desde,
            levantado: hastaMin
          }
        }
      ]

    // El frío es solo un hábito: se hace dentro tan a menudo como fuera.
    case 'frio':
      return [
        { en: 'habito', registro: { date: x.date, habito: 'frio', nivel: opciones.nivelHabito ?? 1, minutos } }
      ]

    // El grounding es un hábito **y** un rato fuera. Antes solo era lo primero,
    // y por eso una hora descalzo en la hierba no subía la amplitud del día.
    case 'grounding':
      return [
        { en: 'habito', registro: { date: x.date, habito: 'grounding', nivel: opciones.nivelHabito ?? 1, minutos } },
        salida()
      ]
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
): { viejo: EnCurso; escrituras: Escritura[] }[] {
  return (enCurso ?? [])
    .filter((x) => x.date < hoy)
    .map((viejo) => ({
      viejo,
      escrituras: alParar(viejo, viejo.desde + MINUTOS_SI_SE_OLVIDA, { estimado: true })
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
    /*
     * «Fuera» es el paraguas: enseña **todo** el rato de calle del día, venga
     * del botón que venga. Las otras tres enseñan lo suyo. El mismo rato de sol
     * sale así en las dos baldosas, que es justo lo que se quiere ver.
     *
     * Y se **une**, no se suma. Sales al jardín, te descalzas y te quedas media
     * hora: eso es media hora de calle, no una, aunque haya dos registros de
     * treinta minutos. Sumarlos daba justo el doble.
     */
    case 'fuera':
      return minutosDe(
        (d.salidas ?? [])
          .filter((s) => s.date === fecha)
          .map((s) => ({ desde: s.desde, hasta: s.desde + Math.max(0, s.minutos) }))
      )
    case 'sol':
    case 'amanecer':
    case 'atardecer':
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
