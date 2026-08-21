/**
 * Por qué pesas hoy lo que pesas.
 *
 * El número de la báscula sube y baja cada día, y sin explicación cada subida
 * parece un fracaso y cada bajada un triunfo. Ninguna de las dos cosas es
 * verdad casi nunca, y este módulo existe para decir por qué.
 *
 * El ancla de todo es fisiológica: **la grasa se mueve despacio**. Perder o
 * ganar tejido graso real va, como techo, a unos 50–100 g al día. Cualquier
 * salto mayor de un día a otro es agua por definición, y el agua tiene causas
 * con nombre — casi todas apuntadas ya en el check-in y el historial:
 *
 *  - **Glucógeno.** Salir de cetosis rellena los depósitos, y cada gramo de
 *    glucógeno arrastra unos 3 g de agua: 1–2 kg de subida que no es grasa y
 *    que se va sola al volver. En dieta cetogénica es el factor más grande.
 *  - **Entreno duro ayer.** El músculo retiene agua para repararse
 *    (inflamación + glucógeno local). Subir de peso al día siguiente de una
 *    sesión fuerte es señal de reparación.
 *  - **Sal, alcohol, cena tarde.** Retención directa, digestión en marcha.
 *  - **Sueño corto o estrés alto.** Cortisol, y el cortisol retiene sodio.
 *  - **Tránsito.** El contenido intestinal pesa. Es el factor menos glamuroso
 *    y uno de los mayores.
 *
 * Lo que este módulo **no** hace: contar calorías, hablar de déficit o
 * superávit, ni inventarse causas cuando no tiene datos. Si no sabe, lo dice.
 */
import { cargaDeSesion } from './estres'
import { escribirNumero } from './numeros'
import { CETOSIS_G, cenaTardia, diaDe, estadoDeCetosis, llevaEtiqueta } from './crononutricion'
import type {
  BodyMeasurement,
  CheckIn,
  DiaDeComidas,
  EdicionAlimento,
  SalidaAlExterior,
  Session
} from './types'
import type { Coordenadas } from './arcoSolar'
import { arcoDelDia } from './arcoSolar'
import { dosRelojes, escribirDistancia, huboPulsoDeManana, rachaDesincronizada } from './relojes'

/** Techo de tejido graso real que se mueve en un día, en gramos. */
export const TECHO_GRASA_DIA_G = 100

/** Un factor que puede explicar parte del movimiento de hoy. */
export interface FactorPeso {
  id:
    | 'glucogeno-entra'
    | 'glucogeno-parcial'
    | 'glucogeno-sale'
    | 'entreno-duro'
    | 'sal'
    | 'alcohol'
    | 'cena-tarde'
    | 'cortisol'
    | 'transito'
    // Los de la luz. Llegaron los últimos y son los que más explican de todo
    // lo que hay aquí: el resto mueve agua, y estos mueven la señal.
    | 'relojes-desincronizados'
    | 'sin-pulso-manana'
    | 'noche-corta'
  texto: string
  /** Cuánto suele explicar, en gramos. Positivo = empuja el peso hacia arriba. */
  minG: number
  maxG: number
}

export interface ExplicacionPeso {
  /** Hoy frente a la última báscula anterior (± gramos). */
  deltaG?: number
  /** De hace cuántos días es esa referencia. */
  diasDesdeAnterior?: number
  /** Los factores de hoy, del que más explica al que menos. */
  factores: FactorPeso[]
  /** El párrafo principal: qué ha pasado y qué significa. */
  veredicto: string
  /** Dónde va la tendencia, cuando hay datos para decirla. */
  tendencia?: string
  /** Qué falta para poder decir más, cuando falta algo. */
  faltan?: string
}

const DIA = 86400000

/** De la más vieja a la más nueva. Ordenado aquí y con nombre a propósito:
 * `sortMeasurements` de `body.ts` va al revés, y asumirlo costó un fallo. */
function cronologicas(ms: BodyMeasurement[]): BodyMeasurement[] {
  return [...ms].sort((a, b) => (a.date < b.date ? -1 : 1))
}

function aMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function diasEntre(a: string, b: string): number {
  return Math.round((aMs(b) - aMs(a)) / DIA)
}

function sumarDias(iso: string, dias: number): string {
  return new Date(aMs(iso) + dias * DIA).toISOString().slice(0, 10)
}

/** «+400 g» / «−1,2 kg» — gramos hasta un kilo, kilos con coma después. */
export function escribirGramos(g: number): string {
  const signo = g > 0 ? '+' : g < 0 ? '−' : ''
  const abs = Math.abs(g)
  if (abs < 1000) return `${signo}${Math.round(abs / 50) * 50} g`
  return `${signo}${escribirNumero(Math.round(abs / 100) / 10)} kg`
}

/**
 * La pendiente de la tendencia en g/semana, con una regresión sobre los
 * últimos `dias` días de básculas. Con menos de 4 pesadas no se dice nada:
 * una recta por dos puntos no es una tendencia, es una anécdota.
 */
export function pendienteSemanalG(
  measurements: BodyMeasurement[],
  todayIso: string,
  dias = 14
): number | undefined {
  const desde = sumarDias(todayIso, -dias)
  const puntos = cronologicas(measurements).filter((m) => m.date >= desde && m.date <= todayIso)
  if (puntos.length < 4) return undefined
  const xs = puntos.map((p) => diasEntre(desde, p.date))
  const ys = puntos.map((p) => p.weightKg)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  if (den === 0) return undefined
  return Math.round((num / den) * 7 * 1000)
}

/** La carga de entreno de una fecha, sumando sus sesiones completadas. */
function cargaDelDia(sessions: Session[], iso: string): number {
  return sessions
    .filter((s) => s.completed && s.date === iso)
    .reduce((a, s) => a + cargaDeSesion(s).total, 0)
}

/**
 * Los factores activos hoy, mirando el check-in de hoy (que pregunta por ayer)
 * y el entreno de ayer. Cada uno con su magnitud típica: no para sumarlas como
 * una cuenta —no lo son—, sino para ordenar por quién puede explicar más.
 */
/**
 * Lo que hace falta para que la luz entre en la explicación.
 *
 * Va aparte y entero opcional porque quien no haya puesto sus coordenadas
 * tiene que seguir teniendo su explicación de siempre, sin huecos ni avisos de
 * que le falta algo. La luz **añade**, no condiciona.
 */
export interface DatosDeLuz {
  coord: Coordenadas
  salidas?: SalidaAlExterior[]
  desfasePara?: (iso: string) => number | undefined
}

export function factoresDeHoy(
  checkIns: CheckIn[],
  sessions: Session[],
  todayIso: string,
  comidas?: DiaDeComidas[],
  ediciones?: EdicionAlimento[],
  luz?: DatosDeLuz
): FactorPeso[] {
  const hoy = checkIns.find((c) => c.date === todayIso)
  const ayer = sumarDias(todayIso, -1)
  const checkinAyer = checkIns.find((c) => c.date === ayer)
  /*
   * El diario de comidas de ayer manda sobre las preguntas del test: lo que se
   * apuntó al comer es mejor dato que lo que se recuerda a la mañana siguiente,
   * y lo que el diario ya sabe no hay que volver a preguntarlo.
   */
  const diarioAyer = diaDe(comidas, ayer)
  const f: FactorPeso[] = []

  /*
   * La luz va primero **en el código** aunque se ordene después por tamaño,
   * porque es la que explica de verdad. El resto de factores mueven agua —
   * glucógeno, sal, cortisol— y se resuelven solos en dos días. Los relojes
   * desincronizados no se resuelven solos: siguen ahí mañana.
   */
  if (luz) {
    const tzDe = luz.desfasePara ?? (() => undefined)

    const racha = rachaDesincronizada(ayer, luz.coord, luz.salidas, comidas, tzDe)
    if (racha >= 2) {
      const r = dosRelojes(ayer, luz.coord, luz.salidas, diarioAyer, tzDe(ayer))
      f.push({
        id: 'relojes-desincronizados',
        texto:
          `Llevas ${racha} días comiendo ${escribirDistancia(r)}. El hígado va por delante del ` +
          'cerebro, y con los dos relojes a distinta hora la misma comida se gestiona peor. No es ' +
          'agua: esto no se va solo mañana.',
        minG: 0,
        maxG: 400
      })
    }

    if (!huboPulsoDeManana(ayer, luz.coord, luz.salidas, tzDe(ayer))) {
      f.push({
        id: 'sin-pulso-manana',
        texto:
          'Ayer no hubo pulso de luz por la mañana. Sin esa señal el reloj se atrasa unos doce ' +
          'minutos, y arrastra con él la hora a la que aparecen el hambre y la saciedad.',
        minG: 0,
        maxG: 250
      })
    }

    const checkinDeAyer = checkIns.find((c) => c.date === ayer)
    if (checkinDeAyer?.lightHygiene === false) {
      const arco = arcoDelDia(ayer, luz.coord, tzDe(ayer))
      const nocheQueTocaba = Math.max(0, 1440 - arco.duracionDiaMin)
      f.push({
        id: 'noche-corta',
        texto:
          `Anoche hubo luz hasta tarde. Ayer tocaban ${Math.floor(nocheQueTocaba / 60)} h de ` +
          'oscuridad en tu latitud, y la melatonina no mide si hay luz: mide cuánto dura la noche.',
        minG: 0,
        maxG: 300
      })
    }
  }

  /*
   * Glucógeno: la cetosis se cuenta **en gramos** cuando el diario los trae.
   * Hasta 30 g al día se mantiene con holgura y hasta 50 aguanta según la
   * persona; solo por encima —o con carbohidrato sin gramos, donde asumir poco
   * sería inventar a favor— se considera salida. Sin diario, decide el test.
   */
  const cetosisAyer = estadoDeCetosis(diarioAyer, ediciones)
  const salioAyer = cetosisAyer.estado === 'desconocido' ? undefined : cetosisAyer.estado === 'fuera'
  const ketoHoy = salioAyer !== undefined ? !salioAyer : hoy?.keto
  const ketoAntes = checkinAyer?.keto
  if (ketoHoy === false && ketoAntes === true) {
    const cuanto =
      cetosisAyer.estado === 'fuera' && !cetosisAyer.conCarboSinGramos
        ? `Los ≈ ${cetosisAyer.carbosG} g de carbohidrato de ayer te sacaron del margen de cetosis (${CETOSIS_G.holgura}–${CETOSIS_G.limite} g)`
        : 'Saliste de cetosis'
    f.push({
      id: 'glucogeno-entra',
      texto: `${cuanto}: rellenar el glucógeno arrastra unos 3 g de agua por gramo. Es la subida más grande que existe y no es grasa — se va sola al volver.`,
      minG: 500,
      maxG: 2000
    })
  }
  // Al límite pero dentro: se dice sin drama, porque el glucógeno parcial
  // también pesa algo — y saberlo evita el susto de mañana.
  if (cetosisAyer.estado === 'al_limite' && ketoAntes === true) {
    f.push({
      id: 'glucogeno-parcial',
      texto: `Ayer rozaste el margen de cetosis (≈ ${cetosisAyer.carbosG} g de los ${CETOSIS_G.limite} que aguanta): sigues dentro, pero ese carbohidrato repone algo de glucógeno y su agua.`,
      minG: 100,
      maxG: 500
    })
  }
  if (ketoHoy === true && ketoAntes === false) {
    f.push({
      id: 'glucogeno-sale',
      texto:
        'Has vuelto a cetosis: al vaciarse el glucógeno se va también su agua. Esta bajada rápida tampoco es grasa — la de verdad viene después, más despacio.',
      minG: -2000,
      maxG: -500
    })
  }

  // Entreno duro ayer: por encima de una carga apreciable.
  const carga = cargaDelDia(sessions, ayer)
  if (carga >= 40) {
    f.push({
      id: 'entreno-duro',
      texto:
        'Ayer entrenaste fuerte: el músculo retiene agua para repararse. Pesar más el día después de una buena sesión es señal de reparación, no de grasa.',
      minG: 200,
      maxG: 600
    })
  }

  const salada = llevaEtiqueta(diarioAyer, 'salada') || hoy?.comidaSalada === true
  const alcohol = llevaEtiqueta(diarioAyer, 'alcohol') || hoy?.alcohol === true
  const cenoTarde = cenaTardia(diarioAyer, hoy) ?? hoy?.cenaTarde

  if (salada) {
    f.push({
      id: 'sal',
      texto: 'Comida muy salada ayer: el sodio retiene agua, hasta cerca del kilo, y se va en uno o dos días.',
      minG: 300,
      maxG: 900
    })
  }
  if (alcohol) {
    f.push({
      id: 'alcohol',
      texto: 'Alcohol ayer: deshidrata primero y retiene después, y encima estropea el sueño.',
      minG: 200,
      maxG: 700
    })
  }
  if (cenoTarde === true) {
    f.push({
      id: 'cena-tarde',
      texto: 'Cenaste tarde: por la mañana la digestión sigue en marcha y su contenido pesa. Además desalinea los relojes de la noche.',
      minG: 100,
      maxG: 400
    })
  }
  if ((hoy?.sleep !== undefined && hoy.sleep <= 2) || (hoy?.estres !== undefined && hoy.estres >= 4)) {
    f.push({
      id: 'cortisol',
      texto:
        hoy?.sleep !== undefined && hoy.sleep <= 2
          ? 'Dormiste mal: el cortisol alto retiene sodio y agua, además de bajar la leptina.'
          : 'Estrés alto ayer: el cortisol retiene sodio y agua.',
      minG: 100,
      maxG: 500
    })
  }
  if (hoy?.transito === false) {
    f.push({
      id: 'transito',
      texto: 'Sin ir al baño antes de pesarte: el contenido intestinal pesa, y mañana el número lo dirá solo.',
      minG: 200,
      maxG: 500
    })
  }

  // Del que más puede explicar al que menos.
  return f.sort((a, b) => Math.max(Math.abs(b.minG), Math.abs(b.maxG)) - Math.max(Math.abs(a.minG), Math.abs(a.maxG)))
}

/** Los factores que empujan en la misma dirección que el movimiento de hoy. */
function aFavorDe(deltaG: number, factores: FactorPeso[]): FactorPeso[] {
  if (deltaG > 0) return factores.filter((x) => x.maxG > 0)
  if (deltaG < 0) return factores.filter((x) => x.minG < 0)
  return []
}

export function explicarPeso(
  datos: {
    measurements: BodyMeasurement[]
    checkIns: CheckIn[]
    sessions: Session[]
    comidas?: DiaDeComidas[]
    alimentosEditados?: EdicionAlimento[]
    /** La luz, si el usuario ha puesto sus coordenadas. Opcional a propósito. */
    luz?: DatosDeLuz
  },
  todayIso: string
): ExplicacionPeso | null {
  const ordenadas = cronologicas(datos.measurements).filter((m) => m.date <= todayIso)
  const deHoy = ordenadas.find((m) => m.date === todayIso)
  // Sin báscula hoy no hay nada que explicar: la tarjeta ni aparece.
  if (!deHoy) return null

  const anteriores = ordenadas.filter((m) => m.date < todayIso)
  const anterior = anteriores[anteriores.length - 1]
  const factores = factoresDeHoy(
    datos.checkIns,
    datos.sessions,
    todayIso,
    datos.comidas,
    datos.alimentosEditados,
    datos.luz
  )
  const pendiente = pendienteSemanalG(datos.measurements, todayIso)
  const tendencia =
    pendiente === undefined
      ? undefined
      : Math.abs(pendiente) < 80
        ? 'Tu tendencia de dos semanas está plana.'
        : `Tu tendencia de dos semanas va a ${escribirGramos(pendiente)} por semana.`

  if (!anterior) {
    return {
      factores,
      veredicto:
        'Primera báscula anotada. Con la de mañana ya puedo empezar a explicarte los movimientos; con una semana, la tendencia.',
      tendencia,
      faltan: 'Pésate unos días seguidos, a la misma hora y en las mismas condiciones.'
    }
  }

  const dias = diasEntre(anterior.date, deHoy.date)
  const deltaG = Math.round((deHoy.weightKg - anterior.weightKg) * 1000)
  // Sin `veredicto` a propósito: cada rama de abajo pone el suyo.
  const base = { deltaG, diasDesdeAnterior: dias, factores, tendencia }

  // Referencia vieja: el día a día ya no se puede leer, solo la dirección.
  if (dias > 3) {
    return {
      ...base,
      veredicto: `Tu última báscula es de hace ${dias} días. Con tanto hueco no se puede separar el agua de lo demás: pésate unos días seguidos y te lo desgloso.`,
      faltan: 'Básculas de días seguidos.'
    }
  }

  const porDia = deltaG / Math.max(1, dias)
  const explicables = aFavorDe(deltaG, factores)
  const esAgua = Math.abs(porDia) > TECHO_GRASA_DIA_G

  // ── Subida ────────────────────────────────────────────────
  if (porDia > 60) {
    const ancla = esAgua
      ? ` La grasa real se mueve a ${TECHO_GRASA_DIA_G} g al día como mucho: un salto así es agua por definición.`
      : ''
    if (explicables.length > 0) {
      return {
        ...base,
        veredicto: `Lo más probable: ${explicables[0].texto.charAt(0).toLowerCase()}${explicables[0].texto.slice(1)}${ancla}`
      }
    }
    return {
      ...base,
      veredicto: `Ninguna de las causas habituales apuntada.${ancla || ' Puede ser agua sin más — el cuerpo baila hasta un 1 % al día.'} Si se repite varios días seguidos, eso ya es tendencia y lo veremos ahí.`
    }
  }

  // ── Bajada ────────────────────────────────────────────────
  if (porDia < -60) {
    const partes: string[] = []
    if (explicables.length > 0) partes.push(explicables[0].texto)
    if (esAgua) {
      partes.push(
        `Ojo con celebrarlo entero: por encima de ${TECHO_GRASA_DIA_G} g al día lo que se mueve es agua. La parte de verdad es la que confirma la tendencia.`
      )
    }
    return { ...base, veredicto: partes.join(' ') || 'Bajada clara desde la última báscula.' }
  }

  // ── Plano ─────────────────────────────────────────────────
  const compo = deHoy.fatPercent !== undefined && anterior.fatPercent !== undefined
  if (pendiente !== undefined && Math.abs(pendiente) < 80) {
    if (compo) {
      const grasaBaja = deHoy.fatPercent! < anterior.fatPercent! - 0.05
      const musculoSube =
        deHoy.musclePercent !== undefined &&
        anterior.musclePercent !== undefined &&
        deHoy.musclePercent > anterior.musclePercent + 0.05
      if (grasaBaja || musculoSube) {
        return {
          ...base,
          veredicto:
            'El peso está plano pero la composición se mueve: menos grasa con el mismo peso es recomposición, no estancamiento. La báscula sola no sabe contar esto; los porcentajes sí.'
        }
      }
      return {
        ...base,
        veredicto:
          'Peso y composición planos estos días. Si las señales de la semana van bien —sueño, luz, sin antojos— es una meseta normal; si la leptina anda apagada, empieza por ahí antes de tocar la comida.'
      }
    }
    return {
      ...base,
      veredicto:
        'El peso lleva días plano. Solo con la báscula no puedo distinguir una meseta de una recomposición — perder grasa y ganar músculo pesa lo mismo. Anota el % de grasa que te dé la báscula unos días y te lo digo.',
      faltan: 'El % de grasa de tu báscula, unos días seguidos.'
    }
  }

  return {
    ...base,
    veredicto: 'Dentro del baile normal del agua de un día a otro. Lo que cuenta es la tendencia, no el día.'
  }
}
