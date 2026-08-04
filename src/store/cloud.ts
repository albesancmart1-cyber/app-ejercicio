/**
 * La nube: iniciar sesión y guardar los datos donde los vea cualquier
 * dispositivo.
 *
 * Se habla con Supabase por HTTP, sin su biblioteca. Son dos endpoints de
 * autenticación y uno de datos, y la app no tiene ninguna dependencia en tiempo
 * de ejecución más allá de React: meter medio megabyte de SDK para esto sería
 * pagar mucho por muy poco, y encima en una app que tiene que arrancar sin
 * conexión.
 *
 * **Entrar es por enlace al correo.** Ni contraseñas que recordar ni
 * contraseñas que perder, que en una app de una sola persona es todo ventaja.
 * Al volver del enlace, Supabase devuelve los dos tokens en el fragmento de la
 * URL; se guardan y el fragmento se limpia para que no queden en el historial.
 *
 * **Qué se guarda.** Una fila por usuario con el JSON entero. La base de datos
 * tiene activado el aislamiento por filas (ver `supabase/esquema.sql`), así que
 * cada cuenta solo puede leer y escribir la suya. La clave pública que va en el
 * paquete es justo eso, pública: sin sesión no abre nada.
 */
import type { AppData } from '../domain/types'

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const TABLA = 'ritmo_datos'
const CLAVE_SESION = 'ritmo-sesion'

/** ¿Se ha configurado una nube? Sin esto la app funciona igual, pero local. */
export function hayNube(): boolean {
  return URL_BASE.length > 0 && CLAVE.length > 0
}

export interface SesionNube {
  accessToken: string
  refreshToken: string
  /** Época en ms en que caduca el token de acceso. */
  expiraEn: number
  email: string
}

export function sesionGuardada(): SesionNube | null {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    const s = JSON.parse(crudo) as SesionNube
    return s.accessToken && s.refreshToken ? s : null
  } catch {
    return null
  }
}

function guardarSesion(s: SesionNube | null) {
  if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify(s))
  else localStorage.removeItem(CLAVE_SESION)
}

/** Error con el motivo en castellano, para poder enseñarlo tal cual. */
export class ErrorNube extends Error {}

/**
 * Traduce los fallos de la base de datos a algo accionable.
 *
 * Los dos que se ven de verdad son de instalación, no de uso: la tabla que no
 * está porque no se llegó a ejecutar `supabase/esquema.sql`, y el permiso
 * denegado porque falta la política de aislamiento. Decir «error 404» ahí no
 * ayuda a nadie; decir qué paso falta, sí.
 */
function quejaDeDatos(status: number, cuerpo: string): string {
  if (status === 404 || /relation .* does not exist|PGRST205/i.test(cuerpo))
    return 'Falta la tabla ritmo_datos en tu proyecto de Supabase. Ejecuta supabase/esquema.sql en el editor SQL del panel.'
  if (status === 401 || status === 403)
    return 'Tu proyecto no me deja tocar esos datos. Revisa que el paso 2 (supabase/esquema.sql) terminara con el aislamiento por filas activado.'
  return `${cuerpo.slice(0, 140) || 'Error desconocido'} (${status})`
}

async function pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${URL_BASE}${ruta}`, {
    ...init,
    headers: { apikey: CLAVE, 'Content-Type': 'application/json', ...(init.headers ?? {}) }
  })
  return res
}

/**
 * A dónde tiene que volver el enlace del correo: a esta misma app, que es lo
 * único que sabe qué hacer con los tokens. Tiene que coincidir con lo que haya
 * en la lista de direcciones permitidas del panel de Supabase, o el enlace
 * acaba en la raíz del dominio —donde no hay nada— en vez de aquí.
 */
export function dondeVuelve(): string {
  return location.origin + location.pathname.replace(/index\.html$/, '')
}

/**
 * Pide el enlace de acceso al correo.
 *
 * Ojo con dónde va la dirección de vuelta: la biblioteca de Supabase la acepta
 * como `options.emailRedirectTo`, pero eso es azúcar suyo. La API de verdad la
 * quiere como parámetro `redirect_to` **en la URL**, y lo que va en el cuerpo
 * que no reconoce lo ignora en silencio. Mandándola en el cuerpo, el enlace
 * volvía al «Site URL» del proyecto en vez de a la app.
 */
export async function pedirEnlace(email: string): Promise<void> {
  if (!hayNube()) throw new ErrorNube('No hay ninguna nube configurada en esta versión de la app.')
  const res = await pedir(`/auth/v1/otp?redirect_to=${encodeURIComponent(dondeVuelve())}`, {
    method: 'POST',
    body: JSON.stringify({ email, create_user: true })
  })
  if (!res.ok) {
    const cuerpo = await res.text()
    throw new ErrorNube(
      // El correo de cortesía de Supabase va muy justo: unos pocos envíos por
      // hora y a compartir con todo el mundo. Decir «espera un minuto» era
      // mandarte a reintentar en balde; el que ya te llegó sigue valiendo.
      res.status === 429
        ? 'Supabase solo manda unos pocos correos por hora, y ya has gastado el cupo. Busca el último enlace que te llegó, que probablemente siga sirviendo, y si no espera un rato largo antes de pedir otro.'
        : `No he podido enviar el enlace (${res.status}). ${cuerpo.slice(0, 120)}`
    )
  }
}

function desdeRespuestaDeToken(json: Record<string, unknown>): SesionNube {
  const usuario = json.user as { email?: string } | undefined
  return {
    accessToken: String(json.access_token ?? ''),
    refreshToken: String(json.refresh_token ?? ''),
    expiraEn: Date.now() + Number(json.expires_in ?? 3600) * 1000,
    email: usuario?.email ?? ''
  }
}

/**
 * Recoge la sesión que viene en el fragmento de la URL tras pulsar el enlace, y
 * limpia la barra de direcciones. Devuelve la sesión si la había.
 */
export function recogerSesionDeLaUrl(): SesionNube | null {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
  if (!hash) return null
  const p = new URLSearchParams(hash)
  const accessToken = p.get('access_token')
  const refreshToken = p.get('refresh_token')
  if (!accessToken || !refreshToken) return null

  const sesion: SesionNube = {
    accessToken,
    refreshToken,
    expiraEn: Date.now() + Number(p.get('expires_in') ?? 3600) * 1000,
    email: ''
  }
  guardarSesion(sesion)
  // Fuera de la barra de direcciones: un token en el historial es un token que
  // se comparte sin querer al copiar el enlace.
  history.replaceState(null, '', location.pathname + location.search)
  return sesion
}

/**
 * Si el enlace volvió con un fallo en vez de con la sesión, lo cuenta en
 * castellano y limpia la barra de direcciones.
 *
 * Supabase manda el error por el mismo sitio que mandaría los tokens, en el
 * fragmento de la URL. Sin mirarlo aquí, la app se quedaba callada y parecía
 * que el enlace no hacía nada.
 */
export function recogerFalloDeLaUrl(): string | null {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
  if (!hash) return null
  const p = new URLSearchParams(hash)
  const codigo = p.get('error_code') ?? p.get('error')
  if (!codigo) return null
  history.replaceState(null, '', location.pathname + location.search)

  if (/otp_expired|access_denied/.test(codigo))
    return 'Ese enlace ya no vale: solo sirve una vez y caduca al poco de mandarlo. Pide otro y ábrelo en cuanto llegue, en este mismo dispositivo.'
  const detalle = (p.get('error_description') ?? '').replace(/\+/g, ' ')
  return `El enlace ha fallado (${codigo}). ${detalle}`
}

/** Renueva el token cuando está a punto de caducar. */
async function renovar(sesion: SesionNube): Promise<SesionNube> {
  const res = await pedir('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: sesion.refreshToken })
  })
  if (!res.ok) {
    guardarSesion(null)
    throw new ErrorNube('Tu sesión ha caducado. Vuelve a entrar con tu correo.')
  }
  const nueva = desdeRespuestaDeToken(await res.json())
  const conEmail = { ...nueva, email: nueva.email || sesion.email }
  guardarSesion(conEmail)
  return conEmail
}

/** La sesión utilizable ahora mismo, renovándola si hace falta. */
export async function sesionValida(): Promise<SesionNube | null> {
  const s = sesionGuardada()
  if (!s) return null
  // Un minuto de margen: si caduca a mitad de la petición, no vale de nada.
  if (s.expiraEn > Date.now() + 60_000) return s
  return renovar(s)
}

/** Quién ha entrado, para poder enseñarlo. */
export async function quienSoy(sesion: SesionNube): Promise<string> {
  const res = await pedir('/auth/v1/user', {
    headers: { Authorization: `Bearer ${sesion.accessToken}` }
  })
  if (!res.ok) return sesion.email
  const json = (await res.json()) as { email?: string }
  const email = json.email ?? sesion.email
  guardarSesion({ ...sesion, email })
  return email
}

export function cerrarSesion(): void {
  guardarSesion(null)
}

/** Lo que hay guardado en la nube, o `null` si esta cuenta aún no tiene nada. */
export async function descargar(): Promise<AppData | null> {
  const sesion = await sesionValida()
  if (!sesion) throw new ErrorNube('No has iniciado sesión.')
  const res = await pedir(`/rest/v1/${TABLA}?select=datos`, {
    headers: { Authorization: `Bearer ${sesion.accessToken}` }
  })
  if (!res.ok) throw new ErrorNube(`No he podido leer tus datos. ${quejaDeDatos(res.status, await res.text())}`)
  const filas = (await res.json()) as { datos: AppData }[]
  return filas.length > 0 ? filas[0].datos : null
}

/** Sube los datos, pisando lo que hubiera: lo que sube ya viene fusionado. */
export async function subir(data: AppData): Promise<void> {
  const sesion = await sesionValida()
  if (!sesion) throw new ErrorNube('No has iniciado sesión.')
  // `on_conflict` explícito: la fila lleva por clave al usuario y ese campo no
  // viaja en el cuerpo —lo pone la base de datos sola—, así que más vale no
  // depender de que PostgREST lo adivine.
  const res = await pedir(`/rest/v1/${TABLA}?on_conflict=user_id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sesion.accessToken}`,
      // La fila lleva por clave el usuario, así que insertar y actualizar son la
      // misma operación: el «upsert» de PostgREST.
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify([{ datos: data, actualizado_en: new Date().toISOString() }])
  })
  if (!res.ok) {
    throw new ErrorNube(`No he podido guardar en la nube. ${quejaDeDatos(res.status, await res.text())}`)
  }
}
