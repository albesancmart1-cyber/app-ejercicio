/**
 * Superseries: dos o más ejercicios encadenados sin descanso entre medias.
 *
 * La idea es vieja y sencilla —haces una serie de A, pasas a B sin sentarte, y
 * el descanso llega al cerrar la vuelta—, y sirve para dos cosas distintas:
 * meter más trabajo en el mismo rato cuando se encadenan músculos que no se
 * estorban (pecho y espalda, cuádriceps y femoral), o subir la exigencia
 * cuando sí se estorban.
 *
 * Aquí solo vive **el orden**: qué toca después de marcar una serie y cuánto se
 * descansa. Nada de esto cambia el volumen ni el estrés —una serie es una serie
 * la hagas encadenada o no—, así que el resto del motor no se entera.
 *
 * Dos invariantes que este módulo mantiene:
 *
 *  - Un grupo es **contiguo** en la lista. Un grupo partido en dos trozos no se
 *    puede recorrer sin saltos raros, y sobre todo no se puede *enseñar*: la
 *    tarjeta de al lado tiene que ser la que viene.
 *  - Un grupo tiene **al menos dos** miembros. Uno solo no es una superserie, es
 *    un ejercicio; en cuanto se queda solo, se le quita la marca.
 */
import type { PlannedExercise } from './types'

/** Un grupo encadenado, ya ordenado y con su letra. */
export interface Grupo {
  id: string
  /** Índices en la lista de ejercicios, de menor a mayor. */
  indices: number[]
  /** A, B, C… por orden de aparición. */
  letra: string
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Los grupos que hay en la sesión, por orden de aparición.
 *
 * Se agrupa por `supersetId` sin exigir contiguidad: una sesión que llegue
 * partida de una fusión entre dispositivos se sigue entendiendo, aunque las
 * funciones que editan la lista la dejen siempre contigua.
 */
export function gruposDe(exercises: PlannedExercise[]): Grupo[] {
  const porId = new Map<string, number[]>()
  exercises.forEach((e, i) => {
    if (!e.supersetId) return
    const ya = porId.get(e.supersetId)
    if (ya) ya.push(i)
    else porId.set(e.supersetId, [i])
  })
  return [...porId.entries()]
    // Un «grupo» de uno no es un grupo. Puede quedar así al quitar un ejercicio
    // de la sesión, y no debe pintarse como superserie.
    .filter(([, indices]) => indices.length >= 2)
    .sort((a, b) => a[1][0] - b[1][0])
    .map(([id, indices], n) => ({ id, indices, letra: LETRAS[n % LETRAS.length] }))
}

/** El grupo al que pertenece un ejercicio, si está encadenado. */
export function grupoDeIndice(exercises: PlannedExercise[], i: number): Grupo | null {
  return gruposDe(exercises).find((g) => g.indices.includes(i)) ?? null
}

/** «A1», «A2»… Lo que se pinta junto al nombre. Vacío si no está encadenado. */
export function etiquetaDe(exercises: PlannedExercise[], i: number): string | undefined {
  const g = grupoDeIndice(exercises, i)
  if (!g) return undefined
  return `${g.letra}${g.indices.indexOf(i) + 1}`
}

/** ¿Está encadenado con el de arriba? Sirve para dibujar la unión. */
export function siguePrevio(exercises: PlannedExercise[], i: number): boolean {
  const g = grupoDeIndice(exercises, i)
  return g !== null && g.indices.indexOf(i) > 0
}

function idLibre(exercises: PlannedExercise[]): string {
  const usados = new Set(exercises.map((e) => e.supersetId).filter(Boolean))
  let n = 1
  while (usados.has(`ss${n}`)) n++
  return `ss${n}`
}

/**
 * Deja juntos a los miembros de cada grupo, arrimándolos al primero.
 *
 * Sin esto, encadenar dos ejercicios separados dejaría la sesión con un grupo
 * partido y el recorrido daría saltos por la pantalla.
 */
export function ordenarGrupos(exercises: PlannedExercise[]): PlannedExercise[] {
  const grupos = gruposDe(exercises)
  if (grupos.length === 0) return exercises
  const salida: PlannedExercise[] = []
  const puestos = new Set<number>()
  exercises.forEach((e, i) => {
    if (puestos.has(i)) return
    const g = grupos.find((x) => x.indices.includes(i))
    if (!g) {
      salida.push(e)
      puestos.add(i)
      return
    }
    // Al llegar al primero del grupo se vuelcan todos sus miembros seguidos.
    for (const k of g.indices) {
      salida.push(exercises[k])
      puestos.add(k)
    }
  })
  return salida
}

/** ¿Tiene sentido ofrecer «encadenar con el siguiente» aquí? */
export function puedeEncadenar(exercises: PlannedExercise[], i: number): boolean {
  const a = exercises[i]
  const b = exercises[i + 1]
  if (!a || !b) return false
  // El cardio no se encadena: sus «series» son minutos, y una superserie de
  // treinta minutos de bici con curl de bíceps no significa nada.
  if (a.primary === 'cardio' || b.primary === 'cardio') return false
  return !(a.supersetId && a.supersetId === b.supersetId)
}

/**
 * Encadena un ejercicio con el que tiene debajo.
 *
 * Si alguno de los dos ya iba en un grupo, se absorbe entero en vez de partirlo:
 * añadir un tercero a una superserie es lo natural, y sacar a uno de su grupo
 * por hacer esto sería una sorpresa desagradable.
 */
export function encadenarConSiguiente(
  exercises: PlannedExercise[],
  i: number
): PlannedExercise[] {
  if (!puedeEncadenar(exercises, i)) return exercises
  const a = exercises[i]
  const b = exercises[i + 1]
  const id = a.supersetId ?? b.supersetId ?? idLibre(exercises)
  const absorbidos = new Set([a.supersetId, b.supersetId].filter(Boolean) as string[])
  const marcados = exercises.map((e, k) => {
    if (k === i || k === i + 1) return { ...e, supersetId: id }
    if (e.supersetId && absorbidos.has(e.supersetId)) return { ...e, supersetId: id }
    return e
  })
  return ordenarGrupos(marcados)
}

/**
 * Saca un ejercicio de su superserie. Si el grupo se queda con uno solo, se
 * deshace del todo: no hay superserie de un ejercicio.
 */
export function desencadenar(exercises: PlannedExercise[], i: number): PlannedExercise[] {
  const id = exercises[i]?.supersetId
  if (!id) return exercises
  const sinEl = exercises.map((e, k) => (k === i ? { ...e, supersetId: undefined } : e))
  const quedan = sinEl.filter((e) => e.supersetId === id).length
  if (quedan >= 2) return sinEl
  return sinEl.map((e) => (e.supersetId === id ? { ...e, supersetId: undefined } : e))
}

/** Deshace la superserie entera a la que pertenece el ejercicio. */
export function deshacerGrupo(exercises: PlannedExercise[], i: number): PlannedExercise[] {
  const id = exercises[i]?.supersetId
  if (!id) return exercises
  return exercises.map((e) => (e.supersetId === id ? { ...e, supersetId: undefined } : e))
}

/**
 * Mueve un ejercicio arriba o abajo **por bloques**.
 *
 * Reordenar de uno en uno rompería la contigüidad de los grupos —o peor, metería
 * un ejercicio suelto en medio de una superserie sin querer—. Así que lo que se
 * mueve es el bloque entero al que pertenece, y salta por encima del bloque
 * vecino completo.
 */
export function moverBloque(
  exercises: PlannedExercise[],
  i: number,
  delta: number
): PlannedExercise[] {
  const bloques = bloquesDe(exercises)
  const bi = bloques.findIndex((b) => b.includes(i))
  const destino = bi + Math.sign(delta)
  if (bi < 0 || destino < 0 || destino >= bloques.length) return exercises
  const orden = [...bloques]
  ;[orden[bi], orden[destino]] = [orden[destino], orden[bi]]
  return orden.flat().map((k) => exercises[k])
}

/** ¿Se puede mover el bloque de este ejercicio en esa dirección? */
export function puedeMover(exercises: PlannedExercise[], i: number, delta: number): boolean {
  const bloques = bloquesDe(exercises)
  const bi = bloques.findIndex((b) => b.includes(i))
  const destino = bi + Math.sign(delta)
  return bi >= 0 && destino >= 0 && destino < bloques.length
}

/** La sesión vista como bloques: cada superserie es uno, cada suelto es otro. */
function bloquesDe(exercises: PlannedExercise[]): number[][] {
  const grupos = gruposDe(exercises)
  const bloques: number[][] = []
  const puestos = new Set<number>()
  exercises.forEach((_, i) => {
    if (puestos.has(i)) return
    const g = grupos.find((x) => x.indices.includes(i))
    if (g) {
      bloques.push(g.indices)
      g.indices.forEach((k) => puestos.add(k))
    } else {
      bloques.push([i])
      puestos.add(i)
    }
  })
  return bloques
}

/**
 * Qué toca justo después de marcar una serie.
 *
 *  - `encadena`: pasar ya al siguiente del grupo, sin descanso. Es la superserie.
 *  - `descanso`: parar los segundos que diga, y con el nombre de lo que viene
 *    después para que la cuenta atrás informe además de contar.
 *  - `null`: no hay nada después. Se acabó.
 */
export type Paso =
  | { tipo: 'encadena'; exercise: number; set: number; nombre: string }
  | { tipo: 'descanso'; seconds: number; exercise?: number; set?: number; nombre?: string }
  | null

export interface OpcionesDePaso {
  /** Cuánto descansa este ejercicio entre series, con las preferencias ya aplicadas. */
  descanso: (pe: PlannedExercise, i: number) => number | undefined
  /** Cuánto se descansa al cambiar de ejercicio. */
  entreEjercicios: number
}

function seriesDe(pe: PlannedExercise): number {
  return pe.logs?.length ?? 1
}

export function siguientePaso(
  exercises: PlannedExercise[],
  ei: number,
  si: number,
  opts: OpcionesDePaso
): Paso {
  const e = exercises[ei]
  if (!e || e.primary === 'cardio') return null
  const grupo = grupoDeIndice(exercises, ei)

  if (!grupo) {
    if (si < seriesDe(e) - 1) {
      const d = opts.descanso(e, ei)
      return d ? { tipo: 'descanso', seconds: d, exercise: ei, set: si + 1 } : null
    }
    const siguiente = exercises[ei + 1]
    return siguiente
      ? {
          tipo: 'descanso',
          seconds: opts.entreEjercicios,
          exercise: ei + 1,
          set: 0,
          nombre: siguiente.name
        }
      : null
  }

  // Dentro de una superserie: primero se busca a quién le toca esta misma vuelta.
  const pos = grupo.indices.indexOf(ei)
  const enLaVuelta = grupo.indices.slice(pos + 1).find((k) => seriesDe(exercises[k]) > si)
  if (enLaVuelta !== undefined) {
    return {
      tipo: 'encadena',
      exercise: enLaVuelta,
      set: si,
      nombre: exercises[enLaVuelta].name
    }
  }

  // Vuelta cerrada: si a alguien le quedan series, se descansa y se vuelve arriba.
  const otraVuelta = grupo.indices.find((k) => seriesDe(exercises[k]) > si + 1)
  if (otraVuelta !== undefined) {
    // El descanso de la vuelta es el del ejercicio que la abre: es el que marca
    // el ritmo del grupo.
    const d = opts.descanso(exercises[otraVuelta], otraVuelta)
    const nombre = exercises[otraVuelta].name
    return d
      ? { tipo: 'descanso', seconds: d, exercise: otraVuelta, set: si + 1, nombre }
      : { tipo: 'encadena', exercise: otraVuelta, set: si + 1, nombre }
  }

  // Grupo terminado: lo que venga después de él.
  const ultimo = grupo.indices[grupo.indices.length - 1]
  const siguiente = exercises[ultimo + 1]
  return siguiente
    ? {
        tipo: 'descanso',
        seconds: opts.entreEjercicios,
        exercise: ultimo + 1,
        set: 0,
        nombre: siguiente.name
      }
    : null
}

/** Cómo se cuenta esta superserie, en una línea. */
export function describirGrupo(exercises: PlannedExercise[], g: Grupo): string {
  const nombres = g.indices.map((i) => exercises[i].name.toLowerCase())
  const vueltas = Math.max(...g.indices.map((i) => seriesDe(exercises[i])))
  const lista =
    nombres.length === 2
      ? `${nombres[0]} y ${nombres[1]}`
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
  return `Superserie ${g.letra}: ${lista}, sin descanso entre medias. ${vueltas} vueltas.`
}

/**
 * Dónde está uno ahora mismo: la primera serie sin marcar, siguiendo el
 * recorrido real —que en una superserie no es de arriba abajo—.
 *
 * Es lo que necesita el modo foco para saber qué enseñar al abrir la sesión, y
 * también para recuperarla a mitad: quien cierra la app con siete series hechas
 * espera volver a la octava, no a la primera.
 */
export function serieEnCurso(
  exercises: PlannedExercise[]
): { exercise: number; set: number } | null {
  const hecha = (ei: number, si: number) => exercises[ei]?.logs?.[si]?.done === true

  // Se recorre vuelta a vuelta: primero la serie 1 de todo el grupo, luego la
  // 2… Fuera de una superserie el grupo es de uno solo, así que sale el orden
  // normal de arriba abajo.
  const maxSeries = Math.max(0, ...exercises.map((e) => e.logs?.length ?? 0))
  const bloques = gruposDe(exercises)

  for (let i = 0; i < exercises.length; i++) {
    if (exercises[i].primary === 'cardio') continue
    const grupo = bloques.find((g) => g.indices.includes(i))
    // Un ejercicio ya recorrido dentro de su grupo se salta: lo cubre su primero.
    if (grupo && grupo.indices[0] !== i) continue
    const miembros = grupo ? grupo.indices : [i]
    for (let si = 0; si < maxSeries; si++) {
      for (const k of miembros) {
        if ((exercises[k].logs?.length ?? 0) <= si) continue
        if (!hecha(k, si)) return { exercise: k, set: si }
      }
    }
  }
  return null
}
