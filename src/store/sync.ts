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
import type { AppData } from '../domain/types'
import {
  ErrorNube,
  cerrarSesion,
  descargar,
  hayNube,
  quienSoy,
  recogerFalloDeLaUrl,
  recogerSesionDeLaUrl,
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
export function ultimaNovedad(): string | null {
  return ultimoResumen
}

/**
 * Arranque: recoge la sesión si venimos del enlace del correo y deja el estado
 * listo. No sincroniza todavía —de eso se encarga quien tenga los datos—.
 */
export async function iniciarSync(): Promise<boolean> {
  if (!hayNube()) return false
  // Si el enlace volvió con un fallo hay que mirarlo antes: viene por el mismo
  // sitio que la sesión, y callárselo deja al usuario sin saber qué ha pasado.
  const fallo = recogerFalloDeLaUrl()
  const deLaUrl = recogerSesionDeLaUrl()
  const sesion = deLaUrl ?? sesionGuardada()
  if (!sesion) {
    anunciar(fallo ? { estado: 'error', mensaje: fallo } : { estado: 'fuera' })
    return false
  }
  anunciar({ estado: 'dentro', email: sesion.email, pendiente: true })
  // El correo no viene en el fragmento de la URL: se pregunta aparte, y si falla
  // no pasa nada grave —es solo lo que se enseña en Ajustes—.
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
      escribir(data)
    }

    await subir(resultado)
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

export function salir(): void {
  cerrarSesion()
  anunciar({ estado: 'fuera' })
}

/** Para la pantalla de Ajustes: entrando, a la espera del enlace. */
export function esperandoEnlace(email: string): void {
  anunciar({ estado: 'entrando', email })
}

export function fallo(mensaje: string): void {
  anunciar({ estado: 'error', mensaje })
}
