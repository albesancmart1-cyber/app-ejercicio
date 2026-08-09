/**
 * Marcas personales: lo mejor que has hecho en cada ejercicio.
 *
 * Un récord no es un adorno. Es la referencia contra la que se mide todo lo
 * demás —«¿esto de hoy ha sido bueno?»— y, sobre todo, es lo único del
 * historial que se recuerda con gusto. Por eso se avisa **en el momento**, con
 * la serie recién marcada, y no en un resumen al final.
 *
 * Cinco marcas, porque cada una responde a una pregunta distinta:
 *
 *  - **Peso máximo**: cuánto has llegado a mover. La que todo el mundo mira.
 *  - **1RM estimado**: cuánto moverías a una repetición. Permite comparar
 *    60×5 con 70×2, que a ojo no se comparan.
 *  - **Mejor serie**: peso × repeticiones de una sola serie. Premia hacer más
 *    con el mismo peso, que es como se progresa de verdad la mayoría del tiempo.
 *  - **Más repeticiones**: el récord de quien entrena sin peso, que si no se
 *    quedaría sin ninguno.
 *  - **Mejor sesión**: todo lo levantado en ese ejercicio en un día.
 *
 * **Qué cuenta**: solo series hechas, de trabajo (ni calentamiento ni la cola de
 * un drop set: van más ligeras y ensuciarían el «más repeticiones»), y de la
 * misma forma —mismo material, mismo lado—, porque veinte kilos a un brazo no
 * son veinte kilos a dos y mezclarlos convierte el récord en ruido.
 */
import { sameVariant } from './variants'
import { esCalentamiento, tipoDe } from './setLogs'
import type { ExerciseVariant, Session, SetLog } from './types'

/**
 * Repetición máxima estimada, por la fórmula de Epley: `peso × (1 + reps/30)`.
 *
 * Es una **estimación**, no una medida, y por eso se corta a las doce
 * repeticiones: por encima, las fórmulas se separan tanto entre ellas —Epley,
 * Brzycki, Lombardi dan resultados muy distintos— que dar una cifra sería
 * inventar. Con series largas no se estima el máximo: se mira la mejor serie.
 */
export const REPS_MAXIMAS_FIABLES = 12

export function unaRepMaxima(pesoKg: number, reps: number): number | undefined {
  if (pesoKg <= 0 || reps <= 0 || reps > REPS_MAXIMAS_FIABLES) return undefined
  if (reps === 1) return pesoKg
  return Math.round(pesoKg * (1 + reps / 30) * 10) / 10
}

/** Una marca: la cifra, cuándo se hizo y de qué serie salió. */
export interface Marca {
  valor: number
  fecha: string
  pesoKg?: number
  reps?: number
}

export interface Records {
  exerciseId: string
  /** Cuántas series de trabajo se han registrado en total. */
  seriesRegistradas: number
  pesoMaximo?: Marca
  unRM?: Marca
  mejorSerie?: Marca
  masReps?: Marca
  mejorSesion?: Marca
}

export type TipoMarca = 'pesoMaximo' | 'unRM' | 'mejorSerie' | 'masReps' | 'mejorSesion'

export const NOMBRE_MARCA: Record<TipoMarca, string> = {
  pesoMaximo: 'Peso máximo',
  unRM: '1RM estimado',
  mejorSerie: 'Mejor serie',
  masReps: 'Más repeticiones',
  mejorSesion: 'Mejor sesión'
}

/** Las series que cuentan para una marca. */
export function seriesQueCuentan(logs: SetLog[] | undefined): SetLog[] {
  return (logs ?? []).filter((l) => l.done && !esCalentamiento(l) && tipoDe(l) !== 'drop')
}

function mejor(a: Marca | undefined, b: Marca | undefined): Marca | undefined {
  if (!a) return b
  if (!b) return a
  // A igualdad de cifra gana la primera vez que se consiguió: el récord es de
  // aquel día, y repetirlo hoy no lo convierte en de hoy.
  if (b.valor > a.valor) return b
  return a
}

/**
 * Mete una serie en el marcador y devuelve cómo queda.
 *
 * Existe aparte de `recordsDe` porque mientras se entrena hace falta ir
 * actualizando las marcas serie a serie: sin esto, hacer tres series de 45 kg
 * con el récord en 40 cantaría tres récords seguidos, y el segundo ya no es uno.
 */
export function conSerie(r: Records, l: SetLog, fecha: string): Records {
  const salida: Records = { ...r, seriesRegistradas: r.seriesRegistradas + 1 }
  const reps = l.reps
  const kg = l.weightKg
  if (typeof reps === 'number' && reps > 0) {
    salida.masReps = mejor(salida.masReps, { valor: reps, fecha, pesoKg: kg, reps })
  }
  if (typeof kg !== 'number' || kg <= 0 || typeof reps !== 'number' || reps <= 0) return salida
  salida.pesoMaximo = mejor(salida.pesoMaximo, { valor: kg, fecha, pesoKg: kg, reps })
  salida.mejorSerie = mejor(salida.mejorSerie, { valor: kg * reps, fecha, pesoKg: kg, reps })
  const estimado = unaRepMaxima(kg, reps)
  if (estimado !== undefined) {
    salida.unRM = mejor(salida.unRM, { valor: estimado, fecha, pesoKg: kg, reps })
  }
  return salida
}

/**
 * Lo mejor de este ejercicio en todo el historial.
 *
 * `variant` filtra por forma cuando se pasa: las marcas de la polea a un brazo
 * son otras que las de la mancuerna a dos.
 */
export function recordsDe(
  exerciseId: string,
  history: Session[],
  opts: { variant?: ExerciseVariant; hasta?: string; excluirSesion?: string } = {}
): Records {
  const r: Records = { exerciseId, seriesRegistradas: 0 }
  const sesiones = [...history]
    .filter((s) => s.completed)
    .filter((s) => (opts.hasta ? s.date <= opts.hasta : true))
    .filter((s) => s.id !== opts.excluirSesion)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  for (const s of sesiones) {
    for (const pe of s.exercises) {
      if (pe.exerciseId !== exerciseId) continue
      if (opts.variant !== undefined && !sameVariant(opts.variant, pe.variant)) continue
      const series = seriesQueCuentan(pe.logs)
      if (series.length === 0) continue

      let volumenDelDia = 0
      for (const l of series) {
        Object.assign(r, conSerie(r, l, s.date))
        if (typeof l.weightKg === 'number' && typeof l.reps === 'number') {
          volumenDelDia += l.weightKg * l.reps
        }
      }
      if (volumenDelDia > 0) {
        r.mejorSesion = mejor(r.mejorSesion, { valor: volumenDelDia, fecha: s.date })
      }
    }
  }

  return r
}

/**
 * Qué récords bate esta serie, comparada con lo de antes.
 *
 * Se comprueba en el momento de marcarla, no al guardar la sesión: enterarse
 * media hora después de que aquella serie fue tu mejor press no es enterarse.
 *
 * Con el historial vacío no se canta nada. Todo es un récord el primer día, y
 * un aluvión de medallas por existir no significa nada; hacen falta unas
 * cuantas series registradas para que batir una marca quiera decir algo.
 */
export const SERIES_PARA_QUE_CUENTE = 3

export function marcasDeSerie(l: SetLog, previos: Records): TipoMarca[] {
  if (previos.seriesRegistradas < SERIES_PARA_QUE_CUENTE) return []
  if (!l.done || esCalentamiento(l) || tipoDe(l) === 'drop') return []
  const reps = l.reps
  const kg = l.weightKg
  const marcas: TipoMarca[] = []

  if (typeof reps === 'number' && reps > 0 && reps > (previos.masReps?.valor ?? 0)) {
    marcas.push('masReps')
  }
  if (typeof kg === 'number' && kg > 0 && typeof reps === 'number' && reps > 0) {
    if (kg > (previos.pesoMaximo?.valor ?? 0)) marcas.push('pesoMaximo')
    if (kg * reps > (previos.mejorSerie?.valor ?? 0)) marcas.push('mejorSerie')
    const estimado = unaRepMaxima(kg, reps)
    if (estimado !== undefined && estimado > (previos.unRM?.valor ?? 0)) marcas.push('unRM')
  }
  return marcas
}

/** El aviso, en una línea: qué has batido y por cuánto. */
export function celebrar(marcas: TipoMarca[], l: SetLog, previos: Records): string | undefined {
  if (marcas.length === 0) return undefined
  const serie =
    l.weightKg !== undefined ? `${l.weightKg} kg × ${l.reps}` : `${l.reps} repeticiones`

  if (marcas.includes('pesoMaximo')) {
    const antes = previos.pesoMaximo?.valor
    return antes
      ? `Récord: ${serie}. Nunca habías movido tanto aquí — lo anterior eran ${antes} kg.`
      : `Récord: ${serie}. Es el peso más alto que te consta en este ejercicio.`
  }
  if (marcas.includes('masReps') && l.weightKg === undefined) {
    const antes = previos.masReps?.valor
    return antes
      ? `Récord: ${serie}. Tu tope estaba en ${antes}.`
      : `Récord: ${serie}. Es tu mejor marca aquí.`
  }
  if (marcas.includes('mejorSerie')) {
    return `Récord: ${serie} es la mejor serie que has hecho en este ejercicio.`
  }
  if (marcas.includes('unRM')) {
    const estimado = unaRepMaxima(l.weightKg!, l.reps!)
    return `Récord: ${serie} sale a ${estimado} kg a una repetición, tu mejor estimación hasta hoy.`
  }
  return `Récord: ${serie}.`
}

/**
 * La serie que se acaba de hacer, en corto: «22 kg × 10».
 * Sin peso —dominadas, fondos— se cuentan repeticiones y ya.
 */
export function describirSerieCorta(l: SetLog): string {
  if (typeof l.weightKg === 'number' && l.weightKg > 0) {
    return `${l.weightKg} kg × ${l.reps ?? '—'}`
  }
  return `${l.reps ?? '—'} reps`
}

/**
 * Contra qué se ha batido el récord, para poder enseñar el antes y el después.
 *
 * Un récord sin referencia no emociona: «22 kg × 10» solo significa algo al
 * lado de «20 kg × 10». Se elige la marca **más representativa** de las que se
 * han batido, en el mismo orden en que se enseñan.
 */
export function marcaPrevia(tipos: TipoMarca[], previos: Records): string | undefined {
  if (tipos.includes('pesoMaximo') && previos.pesoMaximo) {
    const m = previos.pesoMaximo
    return m.reps !== undefined ? `${m.pesoKg} kg × ${m.reps}` : `${m.valor} kg`
  }
  if (tipos.includes('masReps') && previos.masReps) {
    const m = previos.masReps
    return m.pesoKg !== undefined ? `${m.pesoKg} kg × ${m.valor}` : `${m.valor} reps`
  }
  if (tipos.includes('mejorSerie') && previos.mejorSerie) {
    return origenDeMarca(previos.mejorSerie)
  }
  if (tipos.includes('unRM') && previos.unRM) {
    return origenDeMarca(previos.unRM)
  }
  return undefined
}

/** Un día de este ejercicio, para pintar su historial y su curva. */
export interface DiaDeEjercicio {
  fecha: string
  sessionId: string
  series: SetLog[]
  variante?: ExerciseVariant
  /** Peso × repeticiones de ese día. */
  carga: number
  /** La mejor estimación de 1RM de ese día, si la hay. */
  unRM?: number
  pesoMaximo?: number
  rirMedio?: number
}

/** Todo lo que se ha hecho en un ejercicio, del día más reciente hacia atrás. */
export function historialDe(
  exerciseId: string,
  history: Session[],
  opts: { variant?: ExerciseVariant } = {}
): DiaDeEjercicio[] {
  const dias: DiaDeEjercicio[] = []
  for (const s of history) {
    if (!s.completed) continue
    for (const pe of s.exercises) {
      if (pe.exerciseId !== exerciseId) continue
      if (opts.variant !== undefined && !sameVariant(opts.variant, pe.variant)) continue
      const series = seriesQueCuentan(pe.logs)
      if (series.length === 0) continue
      const conPeso = series.filter(
        (l) => typeof l.weightKg === 'number' && typeof l.reps === 'number'
      )
      const rires = series.map((l) => l.rir).filter((x): x is number => typeof x === 'number')
      const estimaciones = conPeso
        .map((l) => unaRepMaxima(l.weightKg!, l.reps!))
        .filter((x): x is number => x !== undefined)
      dias.push({
        fecha: s.date,
        sessionId: s.id,
        series: series.map((l) => ({ ...l })),
        variante: pe.variant,
        carga: conPeso.reduce((a, l) => a + l.weightKg! * l.reps!, 0),
        unRM: estimaciones.length > 0 ? Math.max(...estimaciones) : undefined,
        pesoMaximo:
          conPeso.length > 0 ? Math.max(...conPeso.map((l) => l.weightKg!)) : undefined,
        rirMedio:
          rires.length > 0
            ? Math.round((rires.reduce((a, b) => a + b, 0) / rires.length) * 10) / 10
            : undefined
      })
    }
  }
  return dias.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
}

/** Cómo se lee una marca: «42 kg», «1.240 kg», «14 repeticiones». */
export function formatMarca(tipo: TipoMarca, m: Marca): string {
  if (tipo === 'masReps') return `${m.valor} reps`
  if (tipo === 'mejorSerie' || tipo === 'mejorSesion') {
    return `${Math.round(m.valor).toLocaleString('es-ES')} kg`
  }
  // Con coma decimal: «18,7 kg». Un punto ahí se lee como millar.
  return `${m.valor.toLocaleString('es-ES')} kg`
}

/** De dónde salió: «42 kg × 8», para no tener que fiarse de la cifra a ciegas. */
export function origenDeMarca(m: Marca): string | undefined {
  if (m.pesoKg === undefined || m.reps === undefined) return undefined
  return `${m.pesoKg} kg × ${m.reps}`
}

/** Las marcas que existen, en el orden en que se enseñan. */
export function marcasDe(r: Records): { tipo: TipoMarca; marca: Marca }[] {
  const orden: TipoMarca[] = ['pesoMaximo', 'unRM', 'mejorSerie', 'masReps', 'mejorSesion']
  return orden
    .map((tipo) => ({ tipo, marca: r[tipo] }))
    .filter((x): x is { tipo: TipoMarca; marca: Marca } => x.marca !== undefined)
}

/**
 * Los récords conseguidos en una sesión ya guardada, para el resumen del mes.
 * Se compara cada ejercicio contra lo anterior a esa fecha.
 */
export function recordsDeLaSesion(
  session: Session,
  history: Session[]
): { exerciseId: string; name: string; tipos: TipoMarca[] }[] {
  const salida: { exerciseId: string; name: string; tipos: TipoMarca[] }[] = []
  for (const pe of session.exercises) {
    const previos = recordsDe(pe.exerciseId, history, {
      variant: pe.variant,
      hasta: session.date,
      excluirSesion: session.id
    })
    const tipos = new Set<TipoMarca>()
    for (const l of seriesQueCuentan(pe.logs)) {
      for (const t of marcasDeSerie(l, previos)) tipos.add(t)
    }
    if (tipos.size > 0) {
      salida.push({ exerciseId: pe.exerciseId, name: pe.name, tipos: [...tipos] })
    }
  }
  return salida
}

/** ¿Cuántos días se ha entrenado este ejercicio? */
export function vecesEntrenado(exerciseId: string, history: Session[]): number {
  return historialDe(exerciseId, history).length
}
