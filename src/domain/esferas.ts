/**
 * Las tres esferas: período, fase y amplitud.
 *
 * Casi todas las apps de salud dan **una nota del día**, y esa cifra única es
 * el problema: junta cosas que se estropean por separado y se arreglan por
 * separado, y al promediarlas las esconde todas. Se puede tener la fase
 * impecable y la amplitud por los suelos, y eso significa algo muy distinto de
 * lo contrario — pero las dos situaciones dan «7 sobre 10».
 *
 * Así que aquí son tres, y son independientes:
 *
 *  - **Período.** Cuánto dura tu ciclo cuando nadie lo toca: unas 24 h y 12 min,
 *    no 24 exactas. Por eso el reloj necesita que alguien lo ponga en hora cada
 *    mañana; sin esa señal se atrasa un poco cada día. Se mide por la **racha
 *    de mañanas seguidas con pulso**: es lo único que lo mantiene a raya.
 *
 *  - **Fase.** Dónde cae tu mediodía interno respecto al de fuera. Se mueve con
 *    pulsos de luz y basta con minutos si caen en el momento correcto. Es la
 *    esfera que más rápido se corrige y la que un turno de mañana más rompe.
 *
 *  - **Amplitud.** La diferencia entre tu pico y tu valle. **No es cantidad de
 *    luz: es contraste.** Un día gris con una noche negra da más amplitud que
 *    un día radiante con el móvil a las dos de la madrugada.
 *
 * ## Por qué la amplitud se calcula como un cociente
 *
 * Porque lo es, y de ahí sale la única buena noticia que tiene alguien que
 * trabaja sin ventana: si no puedes subir el numerador —las horas de día— puedes
 * bajar el denominador. **Una noche genuinamente oscura sube la amplitud tanto
 * como una hora al aire libre**, y esa mitad es entera tuya, la trabajes donde
 * la trabajes.
 */
import { arcoDelDia, type Coordenadas } from './arcoSolar'
import type { CheckIn, DiaDeComidas, SalidaAlExterior } from './types'
import { huboPulsoDeManana } from './relojes'
import { ATRASO_POR_DIA_SIN_LUZ, ventanaDeFase } from './balanceLuz'
import type { VentanaYTuJornada } from './jornada'

export type Esfera = 'periodo' | 'fase' | 'amplitud'

export const NOMBRES_ESFERA: Record<Esfera, string> = {
  periodo: 'Período',
  fase: 'Fase',
  amplitud: 'Amplitud'
}

/**
 * Cuánto se aleja el ciclo humano libre de las 24 h del reloj de pared.
 *
 * Es la cifra que hace que todo lo demás importe: si durase 24 exactas, la luz
 * de la mañana sería opcional.
 */
export const MINUTOS_QUE_CORRE_LARGO = 12

export interface LecturaEsfera {
  esfera: Esfera
  /** De 0 a 1. Es una posición en el dial, no una nota. */
  valor: number
  /** El número que se enseña: «9 días», «−34 min», «Plana». */
  texto: string
  /** Una línea de por qué. */
  porque: string
}

export interface LecturaDelReloj {
  esferas: LecturaEsfera[]
  /** Cuál está peor. Es lo único que conviene mirar si solo se mira una cosa. */
  laQueFalla?: Esfera
  /** Días mirados hacia atrás para sacar todo esto. */
  dias: number
}

export interface DatosDelReloj {
  hoy: string
  coord: Coordenadas
  salidas?: SalidaAlExterior[]
  checkIns?: CheckIn[]
  comidas?: DiaDeComidas[]
  desfasePara?: (iso: string) => number | undefined
  /** Cuántos días atrás se mira. Una semana es lo que da una lectura estable. */
  dias?: number
  /**
   * De quién es la ventana de la mañana de hoy, de `jornada.ventanaContraTuJornada`.
   *
   * Entra ya resuelta en vez de calcularse aquí porque este módulo no sabe de
   * fichajes ni de perfiles, y no tenía por qué empezar a saberlo. Sin ella,
   * `loDeHoy` da la ventana sin dar por hecho que puedes cogerla.
   */
  ventana?: VentanaYTuJornada
}

function diasAtras(hoy: string, n: number): string[] {
  const out: string[] = []
  const d = new Date(`${hoy}T00:00:00Z`)
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return out
}

/**
 * Período: la racha de mañanas seguidas con pulso de luz.
 *
 * Se cuenta desde ayer y no desde hoy, porque el pulso de hoy puede estar
 * todavía por llegar y cortar la racha injustamente a media mañana.
 */
export function rachaDePulsos(d: DatosDelReloj): number {
  const tz = d.desfasePara ?? (() => undefined)
  let racha = 0
  for (const fecha of diasAtras(d.hoy, 60).slice(1)) {
    if (!huboPulsoDeManana(fecha, d.coord, d.salidas, tz(fecha))) break
    racha++
  }
  return racha
}

/**
 * Fase: minutos de atraso acumulados, y hacia dónde se movió ayer.
 *
 * Negativo es atraso. La dirección importa tanto como la cifra: alguien con
 * −40 min que ayer ganó veinte está en una situación distinta de alguien con
 * −40 min que ayer perdió otros doce, y la nota única los confundiría.
 */
export interface DesplazamientoDeFase {
  /** Minutos acumulados. Negativo = tu reloj va tarde. */
  acumulado: number
  /** Lo de ayer: positivo adelanta, negativo atrasa, cero no lo movió. */
  ayer: number
  direccion: 'adelanta' | 'atrasa' | 'quieta'
}

export function desplazamientoDeFase(d: DatosDelReloj): DesplazamientoDeFase {
  const tz = d.desfasePara ?? (() => undefined)
  const dias = diasAtras(d.hoy, d.dias ?? 7).slice(1)

  let acumulado = 0
  let ayer = 0

  dias.forEach((fecha, i) => {
    const conPulso = huboPulsoDeManana(fecha, d.coord, d.salidas, tz(fecha))
    /*
     * Con pulso, el reloj se pone en hora y además recupera parte de lo perdido.
     * Sin pulso, se atrasa lo que corre largo. Es un modelo simple y se dice:
     * sirve para ordenar y comparar días, no para publicar una cifra.
     */
    const delta = conPulso ? MINUTOS_QUE_CORRE_LARGO : -MINUTOS_QUE_CORRE_LARGO
    acumulado = Math.max(-120, Math.min(0, acumulado + delta))
    if (i === 0) ayer = delta
  })

  return {
    acumulado,
    ayer,
    direccion: ayer > 0 ? 'adelanta' : ayer < 0 ? 'atrasa' : 'quieta'
  }
}

/**
 * Amplitud: el contraste entre el día y la noche, como cociente.
 *
 * El numerador son los minutos de luz exterior que de verdad llegaron; el
 * denominador, la oscuridad que faltó respecto a la que tocaba. Los dos se
 * miden **contra el arco del propio sitio**, así que nadie sale peor parado por
 * vivir donde vive.
 */
export interface Contraste {
  /** De 0 a 1. */
  valor: number
  minutosFuera: number
  /** Cuánta noche tocaba, de media, en los días mirados. */
  nocheQueTocaba: number
  nocheReal: number
}

export function contrasteDiaNoche(d: DatosDelReloj): Contraste {
  const tz = d.desfasePara ?? (() => undefined)
  const dias = diasAtras(d.hoy, d.dias ?? 7)

  let minutosFuera = 0
  let nocheQueTocaba = 0
  let nocheReal = 0

  for (const fecha of dias) {
    minutosFuera += (d.salidas ?? [])
      .filter((s) => s.date === fecha)
      .reduce((t, s) => t + Math.max(0, s.minutos), 0)

    const arco = arcoDelDia(fecha, d.coord, tz(fecha))
    const tocaba = Math.max(0, 1440 - arco.duracionDiaMin)
    nocheQueTocaba += tocaba

    /*
     * Sin dato de higiene de luz se supone la noche que tocaba, no cero: no
     * apuntar algo no puede contar como haberlo hecho mal. Quien declara que su
     * noche fue mala pierde un tercio, que es el orden de lo que una tarde
     * encendida se lleva del contraste.
     */
    const c = (d.checkIns ?? []).find((x) => x.date === fecha)
    nocheReal += c?.lightHygiene === false ? tocaba * 0.66 : tocaba
  }

  const n = Math.max(1, dias.length)
  // Media hora fuera al día es un contraste pobre; tres horas, uno bueno.
  const porLuz = Math.min(1, minutosFuera / n / 180)
  const porOscuridad = nocheQueTocaba > 0 ? nocheReal / nocheQueTocaba : 1

  return {
    // Las dos mitades pesan igual: es lo que significa que sea un cociente.
    valor: Math.max(0, Math.min(1, (porLuz + porOscuridad) / 2)),
    minutosFuera,
    nocheQueTocaba: nocheQueTocaba / n,
    nocheReal: nocheReal / n
  }
}

/** Las tres esferas, listas para pintar. */
export function leerElReloj(d: DatosDelReloj): LecturaDelReloj {
  const dias = d.dias ?? 7
  const racha = rachaDePulsos(d)
  const fase = desplazamientoDeFase(d)
  const contraste = contrasteDiaNoche(d)

  // Una semana de mañanas seguidas es un período bien sujeto.
  const valorPeriodo = Math.min(1, racha / 7)
  // Dos horas de atraso es el suelo: por debajo ya no se distingue nada.
  const valorFase = Math.max(0, 1 + fase.acumulado / 120)

  const esferas: LecturaEsfera[] = [
    {
      esfera: 'periodo',
      valor: valorPeriodo,
      texto: racha === 0 ? 'Sin racha' : `${racha} ${racha === 1 ? 'día' : 'días'}`,
      porque:
        racha === 0
          ? 'Tu ciclo corre largo y sin la luz de la mañana se atrasa un poco cada día.'
          : `${racha} ${racha === 1 ? 'mañana seguida' : 'mañanas seguidas'} con luz. Es lo que mantiene el ciclo pegado a las 24 h.`
    },
    {
      esfera: 'fase',
      valor: valorFase,
      // El menos tipográfico, no el guion: es el que usa el resto de la app.
      texto: fase.acumulado === 0 ? 'En hora' : `−${Math.abs(fase.acumulado)} min`,
      porque:
        fase.direccion === 'adelanta'
          ? 'Ayer la luz de la mañana te la movió hacia delante.'
          : fase.direccion === 'atrasa'
            ? `Ayer se atrasó ${Math.abs(fase.ayer)} min más, por no haber pulso de mañana.`
            : 'Ayer no se movió.'
    },
    {
      esfera: 'amplitud',
      valor: contraste.valor,
      texto: contraste.valor >= 0.66 ? 'Marcada' : contraste.valor >= 0.33 ? 'Media' : 'Plana',
      porque:
        `${Math.round(contraste.minutosFuera / 60)} h de exterior en ${dias} días. ` +
        'La amplitud es un cociente: si no puedes subir el día, baja la noche.'
    }
  ]

  const peor = esferas.reduce((a, b) => (b.valor < a.valor ? b : a))

  return {
    esferas,
    /*
     * Se señala la peor salvo que esté claramente bien, y el listón está en dos
     * tercios y no en la mitad por un caso concreto que apareció al escribir las
     * pruebas: alguien con pulso de mañana perfecto pero que sale un minuto al
     * día tiene la amplitud a 0,503 —una mitad del cociente impecable y la otra
     * por los suelos— y con el listón en la mitad eso salía como «va bien».
     *
     * Promediar dos mitades y llamar bueno al resultado es exactamente lo que se
     * le reprocha aquí a la nota única de las demás apps. Con el listón en dos
     * tercios, una esfera solo se calla cuando de verdad no hay nada que decir.
     */
    laQueFalla: peor.valor < 0.66 ? peor.esfera : undefined,
    dias
  }
}

/**
 * Lo más barato que arregla más, en una frase.
 *
 * Una lista de diez hábitos no la sigue nadie. Aquí se mira qué esfera está
 * peor y se propone **la única cosa** que la mueve, con su hora si la tiene.
 */
export function loDeHoy(d: DatosDelReloj, lectura: LecturaDelReloj): string | null {
  if (!lectura.laQueFalla) return null
  const v = ventanaDeFase(d.hoy, d.coord, d.desfasePara?.(d.hoy))
  /*
   * Aquí no vale «¿has salido hoy?», y confundirlo costaba decirle «ya has
   * cogido la luz de la mañana» a alguien que salió a la una de la tarde. Lo
   * que cierra el asunto es el pulso, que tiene hora: fuera de su ventana, la
   * luz sube la amplitud pero no mueve la fase.
   */
  const yaSalio = huboPulsoDeManana(d.hoy, d.coord, d.salidas, d.desfasePara?.(d.hoy))

  switch (lectura.laQueFalla) {
    case 'periodo':
    case 'fase':
      if (yaSalio) return 'Ya has cogido la luz de la mañana. Mañana, otra vez a la misma hora.'
      if (v.desde === null || v.hasta === null) {
        return 'Hoy no amanece en tu latitud. Protege la noche, que es la mitad que sí controlas.'
      }
      return queHacerConLaVentana(v.desde, v.hasta, d.ventana)
    case 'amplitud':
      return 'Tu contraste está plano. Lo más barato no es más día: es una noche más oscura, y esa mitad es entera tuya.'
  }
}

/**
 * Qué se dice de la ventana de la mañana, según de quién sea.
 *
 * La versión anterior decía «sal fuera entre las 05:04 y las 07:03» a todo el
 * mundo. A quien a las seis y media ya está fichado en una nave sin ventanas
 * eso no le sirve de nada, y además le deja con la sensación de estar
 * haciéndolo mal — que es exactamente lo que esta app no hace. Así que la
 * ventana se dice siempre, pero **solo se manda salir a quien puede**.
 */
function queHacerConLaVentana(
  desde: number,
  hasta: number,
  ventana: VentanaYTuJornada | undefined
): string {
  const rango = `de las ${horaCorta(desde)} a las ${horaCorta(hasta)}`

  switch (ventana?.de) {
    case 'trabajas':
      return `La ventana de hoy va ${rango} y tú sueles entrar a las ${horaCorta(ventana.entrada!)}. Hoy no es tuya, y eso no es un fallo: esta señal se coge el fin de semana, que es cuando de verdad la tienes.`

    case 'parte':
      return `La ventana va ${rango}, pero la tuya acaba a las ${horaCorta(ventana.hastaQue!)}, que es cuando sueles entrar. Cinco minutos ahí dentro bastan: lo que cuenta es la hora, no el rato.`

    case 'tuya':
      return `Sal fuera entre las ${horaCorta(desde)} y las ${horaCorta(hasta)}. Cinco minutos bastan: lo que cuenta es la hora, no el rato.`

    // Sin fichajes suficientes no se sabe si a esa hora puedes estar fuera, así
    // que se da el dato y se deja la decisión donde está: en quien conoce su día.
    default:
      return `La ventana de hoy va ${rango}. Cinco minutos dentro de ella bastan —lo que cuenta es la hora, no el rato— si a esa hora puedes estar fuera.`
  }
}

function horaCorta(minutos: number): string {
  const m = ((Math.round(minutos) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** El atraso que la app usa por día sin luz, reexportado para que no se dupliquen cifras. */
export { ATRASO_POR_DIA_SIN_LUZ }
