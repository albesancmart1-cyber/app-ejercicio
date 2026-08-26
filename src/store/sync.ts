/**
 * Cuándo se habla con la nube, y qué pasa cuando no se puede.
 *
 * La regla de fondo: **manda lo que hay en este dispositivo**. La app tiene que
 * arrancar y funcionar entera sin conexión —se entrena en sitios sin cobertura—,
 * así que la nube no está nunca en el camino crítico. Se lee y se escribe en
 * local como siempre, y la sincronización va por detrás.
 *
 * El ciclo es siempre el mismo, y es el que hace que no se pierda nada:
 *
 *   1. bajar lo que hay en la nube,
 *   2. fusionarlo con lo de aquí (`src/domain/merge.ts`),
 *   3. guardar el resultado aquí,
 *   4. subir ese mismo resultado.
 *
 * Sincronizar dos veces seguidas da lo mismo que hacerlo una, así que reintentar
 * cuando vuelve la conexión es seguro.
 */
import { fusionar, resumirFusion } from '../domain/merge'
import { aplicar, recoger } from '../domain/buzon'
import { estadoDeHabito } from '../domain/habitos'
import type { AppData } from '../domain/types'
import {
  ErrorNube,
  bajarMedidas,
  borrarMedidas,
  cerrarSesion,
  descargar,
  entrarOCrear,
  hayNube,
  ponerNuevaContrasena,
  quienSoy,
  recogerFalloDeLaUrl,
  sesionGuardada,
  sesionValida,
  subir
} from './cloud'

export type EstadoSync =
  | { estado: 'sin_nube' }
  | { estado: 'fuera' }
  | { estado: 'entrando'; email: string }
  | { estado: 'dentro'; email: string; ultima?: number; pendiente: boolean }
  | { estado: 'sincronizando'; email: string }
  | { estado: 'error'; email?: string; mensaje: string }

type Escucha = (e: EstadoSync) => void

let estado: EstadoSync = hayNube() ? { estado: 'fuera' } : { estado: 'sin_nube' }
const escuchas = new Set<Escucha>()

function anunciar(siguiente: EstadoSync) {
  estado = siguiente
  escuchas.forEach((f) => f(estado))
}

export function estadoDeSync(): EstadoSync {
  return estado
}

export function escucharSync(f: Escucha): () => void {
  escuchas.add(f)
  return () => escuchas.delete(f)
}

/** Lo último que ha traído una fusión, para poder contarlo. */
let ultimoResumen: string | null = null
/** Cuántas medidas de otro aparato entraron en la última sincronización. */
let ultimasMedidas = 0
/** Cuántas medidas trajo el buzón la última vez. Para poder decirlo en «Yo». */
export function medidasRecogidas(): number {
  return ultimasMedidas
}

export function ultimaNovedad(): string | null {
  return ultimoResumen
}

/**
 * Arranque: recoge la sesión si venimos del enlace del correo y deja el estado
 * listo. No sincroniza todavía —de eso se encarga quien tenga los datos—.
 */
export async function iniciarSync(): Promise<boolean> {
  if (!hayNube()) return false
  // Si el enlace de contraseña nueva volvió con un fallo hay que mirarlo antes
  // de nada: callárselo deja al usuario sin saber por qué el enlace del correo
  // no ha hecho nada.
  const fallo = recogerFalloDeLaUrl()
  const sesion = sesionGuardada()
  if (!sesion) {
    anunciar(fallo ? { estado: 'error', mensaje: fallo } : { estado: 'fuera' })
    return false
  }
  anunciar({ estado: 'dentro', email: sesion.email, pendiente: true })
  // El correo se confirma aparte, y si falla no pasa nada grave: es solo lo que
  // se enseña en Ajustes.
  try {
    const email = await quienSoy(sesion)
    if (estado.estado === 'dentro') anunciar({ ...estado, email })
  } catch {
    /* sin conexión: ya se sabrá el correo la próxima vez */
  }
  return true
}

/**
 * El ciclo completo. `leer` da lo que hay aquí y `escribir` guarda el resultado
 * de la fusión; así este módulo no depende del almacén y se puede probar.
 */
export async function sincronizar(
  leer: () => AppData,
  escribir: (data: AppData) => void
): Promise<{ ok: boolean; novedad: string | null; error?: string }> {
  if (!hayNube()) return { ok: false, novedad: null, error: 'No hay nube configurada.' }
  const sesion = await sesionValida().catch(() => null)
  if (!sesion) {
    anunciar({ estado: 'fuera' })
    return { ok: false, novedad: null, error: 'No has iniciado sesión.' }
  }

  anunciar({ estado: 'sincronizando', email: sesion.email })
  try {
    const remoto = await descargar()
    const local = leer()
    let resultado = local
    ultimoResumen = null

    if (remoto) {
      const { data, resumen } = fusionar(local, remoto)
      resultado = data
      ultimoResumen = resumirFusion(resumen)
    }

    /*
     * Lo que haya medido otro aparato —el reloj, un atajo— entra aquí, después
     * de fusionar y antes de subir, para que suba ya con ello dentro.
     *
     * Se vacía el buzón **después** de haber subido, nunca antes: si algo falla
     * en medio, la próxima sincronización vuelve a recogerlas y, como cada
     * escritura lleva el id de su medida, el resultado es exactamente el mismo.
     */
    let recogidos: string[] = []
    try {
      const buzon = await bajarMedidas()
      const r = recoger(buzon, (t, fecha) =>
        t === 'frio' || t === 'grounding'
          ? (estadoDeHabito(t, resultado.habitos, fecha).actual?.nivel ?? 1)
          : 1
      )
      if (r.escrituras.length > 0) resultado = aplicar(resultado, r.escrituras)
      // Lo que no valía se tira igual: dejarlo ahí lo reintentaría para siempre.
      recogidos = [...r.recogidos, ...r.descartados]
      ultimasMedidas = r.recogidos.length
    } catch {
      // El buzón es un extra. Que falle no puede impedir la sincronización de
      // siempre, que es lo que de verdad no se puede perder.
      ultimasMedidas = 0
    }

    escribir(resultado)
    /*
     * Solo se sube si el resultado difiere de lo que había allí.
     *
     * Importa desde que esto se repite solo cada pocos segundos: sin la
     * comparación, dos dispositivos abiertos y quietos escribirían el mismo
     * documento cientos de veces al día para no cambiar nada. Y el caso de una
     * cuenta recién hecha —sin nada en la nube— entra igual, porque entonces no
     * hay con qué comparar y se sube.
     */
    if (remoto === null || JSON.stringify(resultado) !== JSON.stringify(remoto)) {
      await subir(resultado)
    }
    if (recogidos.length > 0) await borrarMedidas(recogidos).catch(() => {})
    anunciar({ estado: 'dentro', email: sesion.email, ultima: Date.now(), pendiente: false })
    return { ok: true, novedad: ultimoResumen }
  } catch (e) {
    const mensaje = e instanceof ErrorNube ? e.message : 'No he podido conectar con la nube.'
    // Un fallo de red no es un fallo de sesión: se sigue «dentro», con lo de
    // aquí intacto y marcado como pendiente de subir.
    anunciar({ estado: 'dentro', email: sesion.email, pendiente: true })
    return { ok: false, novedad: null, error: mensaje }
  }
}

/**
 * Entrar con correo y contraseña, y traerse lo que haya en la nube.
 *
 * Se sincroniza **inmediatamente** después de entrar, y no en el siguiente
 * ciclo: quien acaba de escribir su contraseña en el ordenador porque se dejó
 * el sol corriendo en el móvil no quiere esperar a nada.
 */
export async function entrarYSincronizar(
  email: string,
  password: string,
  leer: () => AppData,
  escribir: (data: AppData) => void
): Promise<{ ok: boolean; novedad: string | null; error?: string }> {
  return conSesionNueva(() => entrarOCrear(email, password), leer, escribir)
}

/** Poner la contraseña nueva del enlace del correo, y entrar con ella. */
export async function cambiarContrasenaYSincronizar(
  oobCode: string,
  password: string,
  leer: () => AppData,
  escribir: (data: AppData) => void
): Promise<{ ok: boolean; novedad: string | null; error?: string }> {
  return conSesionNueva(() => ponerNuevaContrasena(oobCode, password), leer, escribir)
}

async function conSesionNueva(
  abrir: () => Promise<{ email: string }>,
  leer: () => AppData,
  escribir: (data: AppData) => void
): Promise<{ ok: boolean; novedad: string | null; error?: string }> {
  try {
    const sesion = await abrir()
    anunciar({ estado: 'dentro', email: sesion.email, pendiente: true })
  } catch (e) {
    const mensaje = e instanceof ErrorNube ? e.message : 'No he podido entrar con eso.'
    anunciar({ estado: 'error', mensaje })
    return { ok: false, novedad: null, error: mensaje }
  }
  return sincronizar(leer, escribir)
}

/**
 * Cada cuánto se vuelve a mirar la nube con la app abierta.
 *
 * Es lo que hace que empezar a medir el sol en el móvil se vea en el ordenador,
 * y que pararlo desde el ordenador apague la baldosa del móvil. Veinte segundos
 * es lo bastante rápido para que se sienta inmediato y lo bastante lento para
 * no gastar el cupo gratuito de Firestore: con la comprobación de «no ha
 * cambiado nada» de arriba, un dispositivo quieto solo lee.
 */
export const LATIDO_MS = 20_000

let latido: ReturnType<typeof setInterval> | null = null

/**
 * Mira la nube cada poco **mientras la app está a la vista**.
 *
 * Solo con la pestaña visible: una app en segundo plano no le enseña nada a
 * nadie, y en el móvil sería gastar batería para que no la mire ninguno. Al
 * volver al frente se mira una vez enseguida, que es justo el momento en que
 * uno quiere ver si se dejó algo corriendo en el otro sitio.
 */
export function arrancarLatido(leer: () => AppData, escribir: (data: AppData) => void): void {
  if (!hayNube() || latido !== null) return

  const toca = () => {
    if (document.visibilityState !== 'visible') return
    if (estado.estado !== 'dentro') return
    sincronizar(leer, escribir)
  }

  latido = setInterval(toca, LATIDO_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') toca()
  })
}

export function pararLatido(): void {
  if (latido !== null) clearInterval(latido)
  latido = null
}

export function salir(): void {
  cerrarSesion()
  anunciar({ estado: 'fuera' })
}

/** Para la pantalla de Ajustes: a la espera del correo de contraseña nueva. */
export function esperandoEnlace(email: string): void {
  anunciar({ estado: 'entrando', email })
}

export function fallo(mensaje: string): void {
  anunciar({ estado: 'error', mensaje })
}
