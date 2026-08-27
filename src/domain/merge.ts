/**
 * Fusionar dos copias de los datos.
 *
 * Con la misma cuenta en el móvil y en el ordenador, los dos tienen su copia y
 * las dos son válidas: se entrena con el móvil y luego se abre el ordenador, que
 * lleva días sin actualizarse. Sobrescribir con «gana el último en guardar»
 * perdería la sesión de esta mañana, así que aquí se juntan.
 *
 * Se puede juntar porque cada cosa tiene una identidad propia: el check-in es de
 * un día, la medición es de un día, la sesión tiene su identificador. Así que la
 * fusión es la unión de las dos listas, y cuando la **misma** cosa está en las
 * dos, gana la que se tocó más tarde (`updatedAt`).
 *
 * Lo que no se puede resolver con la unión es borrar: si borras una medición en
 * el móvil, el ordenador todavía la tiene y al fusionar volvería a aparecer. Por
 * eso lo borrado deja una **lápida** —qué era y cuándo se borró— y la unión la
 * respeta mientras nadie haya vuelto a crear esa misma cosa después.
 *
 * ## Lo que está en marcha ahora mismo
 *
 * `enCurso` se fusiona como todo lo demás, y eso es lo que hace que empezar a
 * medir el sol en el móvil se vea desde el ordenador y se pueda parar desde
 * allí. Su identidad es `tipo` + `date`, porque no puede haber dos ratos de sol
 * del mismo día corriendo a la vez, y **pararlo deja lápida**: sin ella, el
 * móvil volvería a subir el suyo en la siguiente sincronización y el rato
 * resucitaría un minuto después de haberlo parado.
 *
 * Esas lápidas se podan solas (ver `PODA_DE_CURSOS`), que es lo que las
 * distingue de las de verdad: un rato de sol de hace una semana no es algo que
 * haya que recordar haber borrado, es basura.
 */
import type {
  AppData,
  BodyMeasurement,
  CheckIn,
  Routine,
  Session
} from './types'

/** Qué se borró y cuándo, para que la fusión no lo resucite. */
export interface Lapida {
  /** `sesion:<id>`, `medicion:<fecha>`, `checkin:<fecha>` o `rutina:<id>`. */
  clave: string
  at: number
}

export function claveDeSesion(id: string): string {
  return `sesion:${id}`
}
export function claveDeMedicion(fecha: string): string {
  return `medicion:${fecha}`
}
export function claveDeCheckIn(fecha: string): string {
  return `checkin:${fecha}`
}
export function claveDeRutina(id: string): string {
  return `rutina:${id}`
}

/**
 * Cuánto se guarda la lápida de algo que estaba en marcha.
 *
 * Las lápidas normales son para siempre: haber borrado una sesión es un hecho
 * que no caduca. La de un rato de sol parado, no: lo único que tiene que hacer
 * es sobrevivir a que el otro dispositivo se conecte y se entere. Una semana es
 * de sobra —y si algún aparato tardara más, lo que traería sería un rato
 * abierto de hace días, que la app ya sabe cerrar sola (`medir.ts`,
 * `pareceOlvidado`)—, y a cambio esto impide que la lista crezca para siempre a
 * razón de una lápida por baldosa y día.
 */
export const PODA_DE_CURSOS = 7 * 24 * 60 * 60 * 1000

/** Cuándo se tocó por última vez. Lo que no lo lleva es de antes de sincronizar. */
function cuando(x: { updatedAt?: number }): number {
  return x.updatedAt ?? 0
}

/**
 * Une dos listas por su clave. Con la misma clave en las dos, gana la más
 * reciente; si ninguna dice cuándo se tocó, gana la de `preferida`, que es la
 * copia local: ante la duda, lo que el usuario tiene delante.
 */
function unir<T extends { updatedAt?: number }>(
  preferida: T[],
  otra: T[],
  clave: (x: T) => string
): T[] {
  const porClave = new Map<string, T>()
  for (const x of otra) porClave.set(clave(x), x)
  for (const x of preferida) {
    const rival = porClave.get(clave(x))
    if (!rival || cuando(x) >= cuando(rival)) porClave.set(clave(x), x)
  }
  return [...porClave.values()]
}

/**
 * Une las lápidas de las dos copias, quedándose con el borrado más reciente y
 * tirando las de cosas en marcha que ya no le importan a nadie.
 */
export function unirLapidas(a: Lapida[] = [], b: Lapida[] = [], ahora = Date.now()): Lapida[] {
  const porClave = new Map<string, Lapida>()
  for (const l of [...a, ...b]) {
    if (l.clave.startsWith('curso:') && ahora - l.at > PODA_DE_CURSOS) continue
    const previa = porClave.get(l.clave)
    if (!previa || l.at > previa.at) porClave.set(l.clave, l)
  }
  return [...porClave.values()]
}

export interface ResumenFusion {
  sesionesAnadidas: number
  checkInsAnadidos: number
  diasDeComidasAnadidos: number
  medicionesAnadidas: number
  /** El perfil que ha ganado: el de aquí o el de la nube. */
  perfilDe: 'local' | 'remoto' | 'igual'
}

/**
 * Junta la copia local con la de la nube.
 *
 * `local` va primero a propósito: en los empates —dos cosas con la misma clave
 * y sin marca de tiempo— se queda lo que el usuario tiene delante, que es lo
 * menos sorprendente.
 */
export function fusionar(local: AppData, remoto: AppData): { data: AppData; resumen: ResumenFusion } {
  const lapidas = unirLapidas(local.deleted, remoto.deleted)
  const borradoEn = new Map(lapidas.map((l) => [l.clave, l.at]))

  /** Sobrevive lo que no se ha borrado, o lo que se ha vuelto a tocar después. */
  const vivo = <T extends { updatedAt?: number }>(clave: (x: T) => string) => (x: T) => {
    const borrado = borradoEn.get(clave(x))
    return borrado === undefined || cuando(x) > borrado
  }

  const claveSesion = (s: Session) => claveDeSesion(s.id)
  const claveCheckIn = (c: CheckIn) => claveDeCheckIn(c.date)
  const claveMedicion = (m: BodyMeasurement) => claveDeMedicion(m.date)

  const claveRutina = (r: Routine) => claveDeRutina(r.id)

  const sessions = unir(local.sessions, remoto.sessions, claveSesion).filter(vivo(claveSesion))
  const routines = unir(local.routines ?? [], remoto.routines ?? [], claveRutina).filter(
    vivo(claveRutina)
  )
  const checkIns = unir(local.checkIns, remoto.checkIns, claveCheckIn).filter(vivo(claveCheckIn))
  const measurements = unir(local.measurements, remoto.measurements, claveMedicion).filter(
    vivo(claveMedicion)
  )

  // El perfil es uno solo: no se puede unir por partes sin inventarse cosas, así
  // que gana el que se guardó más tarde.
  const perfilLocalEn = local.profileUpdatedAt ?? 0
  const perfilRemotoEn = remoto.profileUpdatedAt ?? 0
  const perfilDe: ResumenFusion['perfilDe'] =
    perfilRemotoEn > perfilLocalEn ? 'remoto' : perfilLocalEn > perfilRemotoEn ? 'local' : 'igual'
  const profile = perfilDe === 'remoto' ? remoto.profile : (local.profile ?? remoto.profile)

  const habia = {
    sesiones: new Set(local.sessions.map(claveSesion)),
    checkIns: new Set(local.checkIns.map(claveCheckIn)),
    mediciones: new Set(local.measurements.map(claveMedicion))
  }

  return {
    data: {
      ...local,
      version: Math.max(local.version, remoto.version) as AppData['version'],
      profile,
      profileUpdatedAt: Math.max(perfilLocalEn, perfilRemotoEn) || undefined,
      // Ordenadas por fecha: da igual para el motor, pero hace que exportar los
      // datos o mirarlos a mano no dependa del orden en que llegaron.
      sessions: [...sessions].sort((a, b) => (a.date < b.date ? -1 : 1)),
      checkIns: [...checkIns].sort((a, b) => (a.date < b.date ? -1 : 1)),
      measurements: [...measurements].sort((a, b) => (a.date < b.date ? -1 : 1)),
      routines: routines.length > 0 ? routines : undefined,
      /*
       * El archivo —el sol, la lámpara, la comida, los hábitos— viaja tal cual
       * viene de `...local` y no se fusiona por clave: nada lo escribe ya, así
       * que no hay dos versiones que reconciliar. Lo que sí hace falta es que
       * no desaparezca, y por eso no se toca. Ver `AppData` en `types.ts`.
       */
      deleted: lapidas.length > 0 ? lapidas : undefined
    },
    resumen: {
      sesionesAnadidas: sessions.filter((s) => !habia.sesiones.has(claveSesion(s))).length,
      checkInsAnadidos: checkIns.filter((c) => !habia.checkIns.has(claveCheckIn(c))).length,
      medicionesAnadidas: measurements.filter((m) => !habia.mediciones.has(claveMedicion(m))).length,
      diasDeComidasAnadidos: 0,
      perfilDe
    }
  }
}

/** Lo que ha traído la fusión, en una frase. `null` si no ha traído nada. */
export function resumirFusion(r: ResumenFusion): string | null {
  const partes: string[] = []
  if (r.sesionesAnadidas > 0) {
    partes.push(`${r.sesionesAnadidas} ${r.sesionesAnadidas === 1 ? 'sesión' : 'sesiones'}`)
  }
  if (r.medicionesAnadidas > 0) {
    partes.push(`${r.medicionesAnadidas} ${r.medicionesAnadidas === 1 ? 'medición' : 'mediciones'}`)
  }
  if (r.checkInsAnadidos > 0) {
    partes.push(`${r.checkInsAnadidos} ${r.checkInsAnadidos === 1 ? 'check-in' : 'check-ins'}`)
  }
  if (r.diasDeComidasAnadidos > 0) {
    partes.push(
      `${r.diasDeComidasAnadidos} ${r.diasDeComidasAnadidos === 1 ? 'día de comidas' : 'días de comidas'}`
    )
  }
  if (partes.length === 0) return r.perfilDe === 'remoto' ? 'Traído tu perfil desde la nube.' : null
  const lista =
    partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0]
  return `Recuperado de tu otro dispositivo: ${lista}.`
}
