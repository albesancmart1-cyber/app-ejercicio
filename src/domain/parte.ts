/**
 * El parte del día: lo que ha sumado y lo que ha restado, según avanza.
 *
 * Todo lo que la app calcula estaba repartido en once tarjetas de cuatro
 * pantallas. No había ningún sitio donde ver, de un vistazo y a media mañana,
 * qué llevas hecho y qué te queda. Este módulo recorre lo apuntado hoy y
 * devuelve una lista de puntos, para que quien aprieta un botón vea el saldo
 * cambiar en la misma pantalla.
 *
 * ## Cuatro signos, y por qué no dos
 *
 * Con dos signos —bien y mal— esta pantalla se convertiría en una lista de
 * reproches para cualquiera que trabaje encerrado, que es justo la persona a la
 * que la app quiere servir. Así que hay cuatro:
 *
 *  - **`favor`**: lo hiciste y suma.
 *  - **`contra`**: lo hiciste y resta. **Siempre es algo que se hizo** —azul
 *    después del ocaso, comer antes de ver luz, cerrar la mesa muy tarde—,
 *    nunca una ausencia. Esta es la regla que sostiene el tono de la app y la
 *    que hay que defender si alguien añade puntos nuevos aquí.
 *  - **`no_habia`**: ni suma ni resta. Cubre dos cosas que se parecen mucho por
 *    fuera: que el cielo no lo ofreciera —en diciembre, en Madrid, el sol no
 *    llega a los 30° y no hay vitamina D que coger— y que la ventana existiera
 *    y pasara. Ninguna de las dos es un fallo, y por eso comparten sitio: no se
 *    puede saber desde aquí si alguien pudo salir a las ocho o estaba fichado.
 *  - **`aun_puedes`**: todavía está a tiempo, con su hora límite. Es el único
 *    signo sobre el que se puede actuar, y por eso va arriba del todo.
 *
 * ## Lo que este módulo no hace
 *
 * No calcula nada por su cuenta. Cada punto sale de un módulo que ya existe y
 * que ya tiene sus pruebas; aquí solo se decide qué se enseña, con qué signo y
 * en qué orden. Y no puntúa: no hay una nota de 0 a 100 al final, porque
 * promediar la vitamina D con el ratio de omegas no significa nada.
 */
import { arcoDelDia, escribirDuracion, escribirHora, type Coordenadas } from './arcoSolar'
import { MINUTOS_DE_TARDE_QUE_PASAN, ventanaDeFase } from './balanceLuz'
import { dosRelojes, escribirDistancia, huboPulsoDeManana, primeraLuz } from './relojes'
import { skygazing } from './estaciones'
import { leerDia } from './mesa'
import { cobertura, escribirRatio, ratioDelDia, ratioFiable } from './omega'
import { estadoDeHabito, type Habito, type RegistroHabito } from './habitos'
import {
  ELEVACION_MINIMA,
  escribirUI,
  minutosDelDia,
  solDe,
  uiDelDia,
  type QuienToma
} from './vitaminaD'
import { COMPENSACIONES } from './compensaciones'
import type { VentanaYTuJornada } from './jornada'
import type {
  DiaDeComidas,
  DiaDeSol,
  NocheRegistrada,
  SalidaAlExterior,
  SesionPBM,
  Suplemento
} from './types'

export type Signo = 'favor' | 'contra' | 'no_habia' | 'aun_puedes'

export const NOMBRES_SIGNO: Record<Signo, string> = {
  aun_puedes: 'Aún a tiempo',
  favor: 'A favor',
  contra: 'En contra',
  no_habia: 'Ni suma ni resta'
}

/** El orden en que se enseñan: primero lo accionable, al final lo neutro. */
export const ORDEN_SIGNO: Signo[] = ['aun_puedes', 'favor', 'contra', 'no_habia']

export type Area =
  | 'amanecer'
  | 'manana'
  | 'mediodia'
  | 'tarde'
  | 'noche'
  | 'mesa'
  | 'relojes'
  | 'entreno'
  | 'habitos'
  | 'lampara'
  | 'semana'

export const NOMBRES_AREA: Record<Area, string> = {
  amanecer: 'Amanecer',
  manana: 'Mañana',
  mediodia: 'Mediodía',
  tarde: 'Tarde y atardecer',
  noche: 'Noche',
  mesa: 'La mesa',
  relojes: 'Los dos relojes',
  entreno: 'Entreno',
  habitos: 'Hábitos',
  lampara: 'Lámpara',
  semana: 'La semana'
}

export interface Punto {
  id: string
  area: Area
  signo: Signo
  /** Qué pasó, en pocas palabras. */
  titulo: string
  /** Qué hace eso en el cuerpo, o por qué no cuenta. Una línea. */
  porque: string
  /** Minutos desde medianoche, si el punto tiene hora. */
  cuando?: number
  /** Para los `aun_puedes`: hasta cuándo. */
  hasta?: number
}

export interface Parte {
  puntos: Punto[]
  favor: number
  contra: number
  aunPuedes: number
  noHabia: number
  /** «6 a favor · 2 en contra · 1 aún a tiempo». */
  titular: string
}

export interface DatosDelParte {
  hoy: string
  /** Minutos desde medianoche. Decide qué sigue estando a tiempo. */
  ahoraMin: number
  coord: Coordenadas
  desfaseMin?: number
  salidas?: SalidaAlExterior[]
  sol?: DiaDeSol[]
  quien?: QuienToma
  comidas?: DiaDeComidas
  suplementos?: Suplemento[]
  sesionesPBM?: SesionPBM[]
  /** La noche guardada con la fecha de hoy: la de esta madrugada. */
  noche?: NocheRegistrada
  habitos?: RegistroHabito[]
  /** Si hoy se entrenó, y si hoy tocaba. Lo decide quien llame, no esto. */
  entreno?: { hecho: boolean; tocaba?: boolean }
  /** La deuda de fase de la semana, de `balanceLuz.deudaDeFase`. */
  deudaSemana?: { minutos: number; diasSinPulso: number }
  /**
   * De quién es la ventana de la mañana, de `jornada.ventanaContraTuJornada`.
   *
   * Sin esto, el parte ofrecía «aún a tiempo» a quien a esa hora está fichado,
   * que es justo el reproche disfrazado que los cuatro signos existen para
   * evitar. Una ventana que no es tuya no está a tiempo: no la hubo.
   */
  ventanaManana?: VentanaYTuJornada
}

/* ══════════════════════════════════════════════ AYUDAS ══ */

/** El primer rato fuera que pise una ventana, si lo hubo. */
function salidaEntre(
  salidas: SalidaAlExterior[] | undefined,
  fecha: string,
  desde: number,
  hasta: number
): SalidaAlExterior | undefined {
  return (salidas ?? [])
    .filter((s) => s.date === fecha)
    .sort((a, b) => a.desde - b.desde)
    .find((s) => s.desde < hasta && s.desde + Math.max(0, s.minutos) > desde)
}

/** Minutos fuera dentro de una ventana, sumando todos los ratos. */
function minutosEntre(
  salidas: SalidaAlExterior[] | undefined,
  fecha: string,
  desde: number,
  hasta: number
): number {
  return (salidas ?? [])
    .filter((s) => s.date === fecha)
    .reduce((a, s) => {
      const fin = s.desde + Math.max(0, s.minutos)
      return a + Math.max(0, Math.min(fin, hasta) - Math.max(s.desde, desde))
    }, 0)
}

const p = (
  id: string,
  area: Area,
  signo: Signo,
  titulo: string,
  porque: string,
  extra: { cuando?: number; hasta?: number } = {}
): Punto => ({ id, area, signo, titulo, porque, ...extra })

/* ══════════════════════════════════════════════ LOS PUNTOS ══ */

function luzDeLaManana(d: DatosDelParte, out: Punto[]): void {
  const v = ventanaDeFase(d.hoy, d.coord, d.desfaseMin)

  if (v.desde === null || v.hasta === null) {
    out.push(
      p(
        'amanecer',
        'amanecer',
        'no_habia',
        'Hoy no hay ventana de amanecer',
        'En tu sitio y en esta fecha el sol no cruza el crepúsculo civil por la mañana. No hay pulso de fase que coger, y eso no depende de ti.'
      )
    )
    return
  }

  if (huboPulsoDeManana(d.hoy, d.coord, d.salidas, d.desfaseMin)) {
    const luz = primeraLuz(d.hoy, d.coord, d.salidas, d.desfaseMin)
    out.push(
      p(
        'amanecer',
        'amanecer',
        'favor',
        'Cogiste la luz de la mañana',
        'Es la señal que pone en hora el reloj de detrás de los ojos. Ninguna otra cosa del día hace eso.',
        { cuando: luz }
      )
    )
    return
  }

  /*
   * Una ventana que cae dentro de tu jornada **no está a tiempo**: no la hubo.
   * Ofrecerla como «aún puedes» a quien a esa hora está fichado es el reproche
   * disfrazado de consejo que los cuatro signos existen para evitar.
   */
  if (d.ventanaManana?.de === 'trabajas') {
    out.push(
      p(
        'amanecer',
        'amanecer',
        'no_habia',
        'La ventana de hoy cae dentro de tu jornada',
        `Iba de las ${escribirHora(Math.round(v.desde))} a las ${escribirHora(Math.round(v.hasta))} y tú sueles entrar a las ${escribirHora(d.ventanaManana.entrada!)}. No es tuya hoy, y no es un fallo: esta señal se coge el fin de semana.`,
        { cuando: Math.round(v.desde) }
      )
    )
    return
  }

  // Y si solo te pilla media, el límite es cuando entras, no cuando cierra.
  const cierra =
    d.ventanaManana?.de === 'parte' ? Math.min(v.hasta, d.ventanaManana.hastaQue!) : v.hasta

  if (d.ahoraMin < cierra) {
    out.push(
      p(
        'amanecer',
        'amanecer',
        'aun_puedes',
        d.ventanaManana?.de === 'parte'
          ? `Tienes hasta las ${escribirHora(Math.round(cierra))}, que es cuando sueles entrar`
          : `La ventana de fase se cierra a las ${escribirHora(Math.round(cierra))}`,
        'Basta con estar fuera unos minutos, sin gafas de sol. No hace falta que el sol haya salido: con el crepúsculo civil ya hay azul suficiente.',
        { cuando: Math.round(v.desde), hasta: Math.round(cierra) }
      )
    )
    return
  }

  out.push(
    p(
      'amanecer',
      'amanecer',
      'no_habia',
      'La ventana de fase ya pasó',
      `Iba de las ${escribirHora(Math.round(v.desde))} a las ${escribirHora(Math.round(v.hasta))}. Si a esa hora estabas dentro, no era tuya: se recupera el fin de semana, no a mediodía.`,
      { cuando: Math.round(v.desde) }
    )
  )
}

function amplitudDeLaManana(d: DatosDelParte, out: Punto[]): void {
  const arco = arcoDelDia(d.hoy, d.coord, d.desfaseMin)
  const orto = arco.pasos.orto.manana
  if (orto === null) return

  const min = minutosEntre(d.salidas, d.hoy, orto, arco.mediodiaSolar)
  if (min > 0) {
    out.push(
      p(
        'manana',
        'manana',
        'favor',
        `${escribirDuracion(min)} de sol antes del mediodía`,
        'Sube el techo del día. La diferencia entre el punto más alto y el más bajo es lo que el cuerpo lee como «hay un día», y de eso viven el cortisol de la mañana y la melatonina de la noche.'
      )
    )
    return
  }

  if (d.ahoraMin < arco.mediodiaSolar) {
    out.push(
      p(
        'manana',
        'manana',
        'aun_puedes',
        'Todavía queda mañana',
        'Cualquier rato fuera antes del mediodía sube la amplitud del día. Vale el camino a pie y vale la ventana abierta con la cara al sol.',
        { hasta: Math.round(arco.mediodiaSolar) }
      )
    )
  }
}

function vitaminaDelDia(d: DatosDelParte, out: Punto[]): void {
  const arco = arcoDelDia(d.hoy, d.coord, d.desfaseMin)

  if (arco.elevacionMaxima < ELEVACION_MINIMA) {
    out.push(
      p(
        'vitamina-d',
        'mediodia',
        'no_habia',
        'Hoy no había UVB',
        `El sol no pasa de ${arco.elevacionMaxima.toLocaleString('es-ES', { maximumFractionDigits: 0 })}° en tu sitio, y por debajo de ${ELEVACION_MINIMA}° la atmósfera se come el UVB entero. No es que no salieras: es que hoy no estaba.`
      )
    )
    return
  }

  const dia = solDe(d.sol, d.hoy)
  const ui = uiDelDia(dia, d.coord, d.quien ?? {}, d.desfaseMin)
  if (ui && ui.max > 100) {
    out.push(
      p(
        'vitamina-d',
        'mediodia',
        'favor',
        `Sintetizaste ${escribirUI(ui)}`,
        'La vitamina D que fabrica la piel viene con sulfato y dura semanas en sangre, cosa que la de la cápsula no hace. Es estimación, no medida.'
      )
    )
    return
  }

  const uvbHasta = arco.pasos.uvb.tarde
  if (uvbHasta !== null && d.ahoraMin < uvbHasta) {
    const desde = arco.pasos.uvb.manana
    out.push(
      p(
        'vitamina-d',
        'mediodia',
        'aun_puedes',
        `Hay UVB hasta las ${escribirHora(Math.round(uvbHasta))}`,
        'Es la única ventana del día en que tu piel puede fabricar vitamina D, y cuanta más piel lleves menos rato hace falta.',
        { cuando: desde !== null ? Math.round(desde) : undefined, hasta: Math.round(uvbHasta) }
      )
    )
    return
  }

  out.push(
    p(
      'vitamina-d',
      'mediodia',
      'no_habia',
      'La ventana de UVB ya cerró',
      minutosDelDia(dia) > 0
        ? 'Hubo sol apuntado hoy, pero fuera de las horas en que el sol sube lo suficiente. Cuenta para el reloj y para la amplitud; para la vitamina D, no.'
        : 'El sol subió lo bastante, pero ya se ha ido. Mañana vuelve a estar.'
    )
  )
}

function atardecer(d: DatosDelParte, out: Punto[]): void {
  const s = skygazing(d.hoy, d.coord)
  if (!s.hayVentana || s.desde === null || s.hasta === null) {
    out.push(
      p(
        'atardecer',
        'tarde',
        'no_habia',
        'Hoy no hay atardecer que mirar',
        'En tu sitio y en esta fecha el sol no se pone como para dar la ventana. Vuelve cuando el arco cambie.'
      )
    )
    return
  }

  if (salidaEntre(d.salidas, d.hoy, s.desde, s.hasta)) {
    out.push(
      p(
        'atardecer',
        'tarde',
        'favor',
        'Viste el atardecer',
        'El cambio de proporción entre el rojo y el azul en esos minutos es lo que le dice al cuerpo que viene la noche. Es tan informativo como el amanecer y dura menos.',
        { cuando: Math.round(s.desde) }
      )
    )
    return
  }

  if (d.ahoraMin < s.hasta) {
    out.push(
      p(
        'atardecer',
        'tarde',
        'aun_puedes',
        `El atardecer va de las ${escribirHora(Math.round(s.desde))} a las ${escribirHora(Math.round(s.hasta))}`,
        'Sin gafas y sin pantalla. Es la segunda señal del día, y es la que prepara la melatonina de esta noche.',
        { cuando: Math.round(s.desde), hasta: Math.round(s.hasta) }
      )
    )
    return
  }

  out.push(
    p(
      'atardecer',
      'tarde',
      'no_habia',
      'El atardecer ya pasó',
      `Fue de las ${escribirHora(Math.round(s.desde))} a las ${escribirHora(Math.round(s.hasta))}. Mañana vuelve, unos minutos corrido.`
    )
  )
}

function noche(d: DatosDelParte, out: Punto[]): void {
  const arco = arcoDelDia(d.hoy, d.coord, d.desfaseMin)
  const ocaso = arco.pasos.orto.tarde
  const nocheQueToca = Math.max(60, 1440 - arco.duracionDiaMin)

  if (d.noche) {
    const { apagado, levantado } = d.noche
    const minutos = levantado >= apagado ? levantado - apagado : 1440 - apagado + levantado

    if (ocaso !== null && apagado > ocaso + MINUTOS_DE_TARDE_QUE_PASAN) {
      out.push(
        p(
          'noche-azul',
          'noche',
          'contra',
          `Anoche apagaste a las ${escribirHora(apagado)}`,
          `Más de ${Math.round(MINUTOS_DE_TARDE_QUE_PASAN / 60)} horas de luz después del ocaso. El azul de esas horas retrasa la melatonina y aplana el contraste entre el día y la noche, que es la mitad del cociente que sí controlas entera.`,
          { cuando: apagado }
        )
      )
    }

    out.push(
      minutos >= nocheQueToca * 0.9
        ? p(
            'noche-oscuridad',
            'noche',
            'favor',
            `${escribirDuracion(minutos)} a oscuras`,
            `La oscuridad no es la ausencia de trabajo: es cuando se repara, se consolida y se limpia. Y hoy tocaban unas ${escribirDuracion(nocheQueToca)}.`,
            { cuando: apagado }
          )
        : p(
            'noche-oscuridad',
            'noche',
            'no_habia',
            `La noche se quedó en ${escribirDuracion(minutos)}`,
            `Hoy, en tu sitio, la noche que tocaba era de ${escribirDuracion(nocheQueToca)}. Se apunta como está, sin reproche: hay turnos y hay críos.`,
            { cuando: apagado }
          )
    )
  }

  if (ocaso !== null && d.ahoraMin < ocaso + MINUTOS_DE_TARDE_QUE_PASAN) {
    out.push(
      p(
        'noche-esta',
        'noche',
        'aun_puedes',
        `Esta noche te tocan ${escribirDuracion(nocheQueToca)} de oscuridad`,
        `El ocaso es a las ${escribirHora(Math.round(ocaso))}. A partir de ahí, cuanto más ámbar y menos pantalla, mejor llega la melatonina.`,
        { cuando: Math.round(ocaso), hasta: Math.round(ocaso + MINUTOS_DE_TARDE_QUE_PASAN) }
      )
    )
  }
}

function mesa(d: DatosDelParte, out: Punto[]): void {
  const l = leerDia(d.comidas)
  if (l.comidas === 0) return

  const { abre, cierra, ventanaHoras } = l.insulina
  if (abre !== undefined && cierra !== undefined && ventanaHoras !== undefined) {
    out.push(
      ventanaHoras <= 12
        ? p(
            'mesa-ventana',
            'mesa',
            'favor',
            `Ventana de ${ventanaHoras.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`,
            `De las ${escribirHora(abre)} a las ${escribirHora(cierra)}. Fuera de esa ventana el hígado y el páncreas descansan, y ese descanso es lo que la insulina lee.`,
            { cuando: abre }
          )
        : p(
            'mesa-ventana',
            'mesa',
            'contra',
            `Ventana de ${ventanaHoras.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`,
            `De las ${escribirHora(abre)} a las ${escribirHora(cierra)}. Con la mesa abierta tantas horas la insulina casi no baja, y el reloj del hígado no llega a tener una hora propia.`,
            { cuando: abre }
          )
    )
  }

  const arco = arcoDelDia(d.hoy, d.coord, d.desfaseMin)
  const ocaso = arco.pasos.orto.tarde
  if (cierra !== undefined && ocaso !== null && cierra > ocaso + 120) {
    out.push(
      p(
        'mesa-tarde',
        'mesa',
        'contra',
        `Cerraste la mesa a las ${escribirHora(cierra)}`,
        `El ocaso fue a las ${escribirHora(Math.round(ocaso))}. Comer con el sol ya puesto le pide al páncreas un turno que a esa hora no tiene: la misma comida sube más y baja peor de noche que de día.`,
        { cuando: cierra }
      )
    )
  }

  out.push(
    l.conUmbral === l.comidas
      ? p(
          'mesa-leucina',
          'mesa',
          'favor',
          `${l.conUmbral} de ${l.comidas} comidas con leucina suficiente`,
          'El músculo no se construye con el total del día: cada comida tiene que llegar sola al umbral para encender la señal. Repartir la misma proteína en migas no la enciende.'
        )
      : p(
          'mesa-leucina',
          'mesa',
          'no_habia',
          `${l.conUmbral} de ${l.comidas} comidas llegaron al umbral de leucina`,
          'Cada comida enciende la señal del músculo por su cuenta o no la enciende. Es un dato, no una falta: falta ver qué llevan las que quedan.'
        )
  )

  const r = ratioDelDia(d.comidas, d.suplementos)
  if (ratioFiable(r)) {
    const veces = r.total.o3 > 0 ? r.total.o6 / r.total.o3 : Infinity
    const pct = Math.round(cobertura(r) * 100)
    out.push(
      veces <= 4
        ? p(
            'mesa-omegas',
            'mesa',
            'favor',
            `Omegas ${escribirRatio(r.total)}`,
            `Con dato para el ${pct} % de lo que apuntaste. En esa proporción las membranas se mantienen flexibles y la señal de la insulina entra mejor en la célula.`
          )
        : veces >= 10
          ? p(
              'mesa-omegas',
              'mesa',
              'contra',
              `Omegas ${escribirRatio(r.total)}`,
              `Con dato para el ${pct} % de lo que apuntaste. Un exceso de omega 6 endurece la membrana y deja el ambiente inflamatorio; se arregla bajando aceites de semilla, no añadiendo cápsulas.`
            )
          : p(
              'mesa-omegas',
              'mesa',
              'no_habia',
              `Omegas ${escribirRatio(r.total)}`,
              `Con dato para el ${pct} % de lo que apuntaste. Está en la zona media: ni suma ni resta.`
            )
    )
  }
}

function relojes(d: DatosDelParte, out: Punto[]): void {
  const r = dosRelojes(d.hoy, d.coord, d.salidas, d.comidas, d.desfaseMin)
  if (r.distanciaMin === undefined) return

  out.push(
    r.desincronizado
      ? p(
          'relojes',
          'relojes',
          'contra',
          `Comiste ${escribirDistancia(r)}`,
          'El reloj de detrás de los ojos escucha a la luz y el del hígado escucha a la comida. Cuando el segundo arranca antes, los dos van a horas distintas y la misma comida se maneja peor.',
          { cuando: r.periferico }
        )
      : p(
          'relojes',
          'relojes',
          'favor',
          `Comiste ${escribirDistancia(r)}`,
          'Los dos relojes en el mismo orden: primero la luz, luego el plato. Es lo que hace que la insulina y la leptina lleguen a su hora.',
          { cuando: r.periferico }
        )
  )
}

function entreno(d: DatosDelParte, out: Punto[]): void {
  if (!d.entreno) return

  if (d.entreno.hecho) {
    out.push(
      p(
        'entreno',
        'entreno',
        'favor',
        'Entrenaste',
        'El músculo que se usa pide glucosa sin necesitar tanta insulina, y esa sensibilidad dura horas después de haber salido del gimnasio.'
      )
    )
    return
  }

  if (d.entreno.tocaba) {
    out.push(
      p(
        'entreno',
        'entreno',
        'aun_puedes',
        'Hay alguna zona corta esta semana',
        'Queda día. Y si no cabe, la app lo recoloca mañana sin pasar factura: la carga se reparte por semanas, no por casillas.'
      )
    )
  }
}

function habitos(d: DatosDelParte, out: Punto[]): void {
  const hechos = (d.habitos ?? []).filter((r) => r.date === d.hoy)

  for (const h of ['frio', 'grounding'] as Habito[]) {
    const reg = hechos.find((r) => r.habito === h)
    if (!reg) continue
    const e = estadoDeHabito(h, d.habitos, d.hoy)
    const cuanto = reg.minutos ? `, ${escribirDuracion(reg.minutos)}` : ''
    const racha = `Escalón ${e.actual?.nivel ?? reg.nivel}, ${e.racha} ${e.racha === 1 ? 'día' : 'días'} seguidos.`
    out.push(
      p(
        `habito-${h}`,
        'habitos',
        'favor',
        h === 'frio' ? `Frío${cuanto}` : `Descalzo en el suelo${cuanto}`,
        h === 'frio'
          ? `${racha} El frío sube noradrenalina y melatonina por una vía que no es la luz, y es la palanca que ocupa ese sitio cuando en tu latitud no hay sol.`
          : `${racha} Contacto directo con tierra, hierba o agua salada; la suela de goma no vale.`
      )
    )
  }
}

function lampara(d: DatosDelParte, out: Punto[]): void {
  const hoy = (d.sesionesPBM ?? []).filter((s) => s.date === d.hoy)
  if (hoy.length === 0) return

  const minutos = hoy.reduce((a, s) => a + Math.max(0, s.minutos), 0)
  out.push(
    p(
      'pbm',
      'lampara',
      'favor',
      `${hoy.length === 1 ? 'Una sesión' : `${hoy.length} sesiones`} de lámpara, ${escribirDuracion(minutos)}`,
      'El rojo y el infrarrojo penetran centímetros y trabajan en la mitocondria. Es la única banda que un aparato sustituye de verdad, porque es justo la que el interior no tiene.',
      { cuando: hoy[0].hora }
    )
  )

  // Y lo que esa sesión no tapa. Va siempre, no solo cuando conviene: una
  // lámpara que se presenta sin su letra pequeña acaba sustituyendo al sol en
  // la cabeza de quien la usa.
  const uvb = COMPENSACIONES.find((c) => c.id === 'uvb')
  out.push(
    p(
      'pbm-no-tapa',
      'lampara',
      'no_habia',
      'La lámpara no da fase ni UVB',
      `Un LED rojo no pone tu reloj en hora y ninguna lámpara de fotobiomodulación fabrica vitamina D. ${uvb?.noCubre ?? ''}`.trim()
    )
  )
}

function semana(d: DatosDelParte, out: Punto[]): void {
  if (!d.deudaSemana) return
  const { minutos, diasSinPulso } = d.deudaSemana

  if (minutos === 0) {
    out.push(
      p(
        'semana',
        'semana',
        'favor',
        'La semana va en hora',
        'Ni un día sin pulso de mañana. El reloj humano corre algo largo, y sin esa señal se va atrasando solo.'
      )
    )
    return
  }

  if (huboPulsoDeManana(d.hoy, d.coord, d.salidas, d.desfaseMin)) {
    out.push(
      p(
        'semana',
        'semana',
        'favor',
        `Hoy recuperaste parte de los ${escribirDuracion(minutos)} de atraso`,
        `${diasSinPulso} ${diasSinPulso === 1 ? 'día' : 'días'} de esta semana se quedaron sin luz de mañana. Un pulso bueno recupera buena parte, pero no de golpe: la fase se mueve poco a poco.`
      )
    )
    return
  }

  const v = ventanaDeFase(d.hoy, d.coord, d.desfaseMin)
  if (v.desde !== null && v.hasta !== null && d.ahoraMin < v.hasta) {
    out.push(
      p(
        'semana',
        'semana',
        'aun_puedes',
        `Llevas ${escribirDuracion(minutos)} de atraso acumulado`,
        `Se recupera con la luz de la mañana, y la de hoy está abierta hasta las ${escribirHora(Math.round(v.hasta))}.`,
        { hasta: Math.round(v.hasta) }
      )
    )
    return
  }

  out.push(
    p(
      'semana',
      'semana',
      'no_habia',
      `Llevas ${escribirDuracion(minutos)} de atraso acumulado`,
      `${diasSinPulso} ${diasSinPulso === 1 ? 'día' : 'días'} sin luz de mañana. Se recupera con el amanecer del fin de semana, que es la única herramienta que revierte de verdad cinco días de techo encendido.`
    )
  )
}

/* ══════════════════════════════════════════════ EL PARTE ══ */

/**
 * El parte de hoy.
 *
 * El orden de la lista es el de `ORDEN_SIGNO` —lo accionable primero— y dentro
 * de cada signo se conserva el orden en que se generan, que va siguiendo el día
 * de la mañana a la noche.
 */
export function parteDelDia(d: DatosDelParte): Parte {
  const sinOrdenar: Punto[] = []
  luzDeLaManana(d, sinOrdenar)
  amplitudDeLaManana(d, sinOrdenar)
  vitaminaDelDia(d, sinOrdenar)
  atardecer(d, sinOrdenar)
  noche(d, sinOrdenar)
  relojes(d, sinOrdenar)
  mesa(d, sinOrdenar)
  entreno(d, sinOrdenar)
  habitos(d, sinOrdenar)
  lampara(d, sinOrdenar)
  semana(d, sinOrdenar)

  const puntos = ORDEN_SIGNO.flatMap((s) => sinOrdenar.filter((x) => x.signo === s))
  const cuenta = (s: Signo) => puntos.filter((x) => x.signo === s).length

  const favor = cuenta('favor')
  const contra = cuenta('contra')
  const aunPuedes = cuenta('aun_puedes')

  const trozos = [`${favor} a favor`]
  if (contra > 0) trozos.push(`${contra} en contra`)
  if (aunPuedes > 0) trozos.push(`${aunPuedes} aún a tiempo`)

  return {
    puntos,
    favor,
    contra,
    aunPuedes,
    noHabia: cuenta('no_habia'),
    titular: trozos.join(' · ')
  }
}

/** Los puntos de un signo, para pintarlos agrupados. */
export function puntosDe(parte: Parte, signo: Signo): Punto[] {
  return parte.puntos.filter((x) => x.signo === signo)
}
