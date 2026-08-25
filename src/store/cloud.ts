/**
 * La nube: entrar con el correo y dejar los datos donde los vea cualquier
 * dispositivo.
 *
 * Se habla con Firebase por HTTP, sin su biblioteca. Son tres endpoints de
 * autenticación y dos de datos, y la app no tiene ninguna dependencia en
 * tiempo de ejecución más allá de React: meter el SDK de Firebase —que son
 * varios cientos de kilobytes— para esto sería pagar mucho por muy poco, y
 * encima en una app que tiene que arrancar sin conexión.
 *
 * **Aquí «la nube» no es la base de datos de la app.** Los datos viven en el
 * dispositivo, en `localStorage`, y la app funciona entera sin conexión y sin
 * cuenta. Esto de aquí es solo el sitio de paso para que dos dispositivos se
 * pongan de acuerdo: se baja lo de allí, se fusiona con lo de aquí
 * (`src/domain/merge.ts`) y se vuelve a subir el resultado. Por eso cambiar de
 * proveedor no puede perder nada mientras el móvil conserve su almacén.
 *
 * **Entrar es por enlace al correo.** Ni contraseñas que recordar ni
 * contraseñas que perder, que en una app de una sola persona es todo ventaja.
 * Firebase no manda códigos de seis cifras por correo —no existe esa vía en su
 * API—, así que la única forma de entrar es el enlace, y hay dos maneras de
 * usarlo: pulsarlo, o pegarlo aquí dentro. La segunda es la que salva a la app
 * instalada en iOS; ver `entrarConEnlace`.
 *
 * **Qué se guarda.** Un documento por cuenta en `usuarios/{uid}` con el JSON
 * entero dentro de un solo campo de texto. Las reglas de seguridad
 * (`firebase/firestore.rules`) atan cada documento a su dueño, así que la clave
 * que va en el paquete es justo eso, pública: sin sesión no abre nada.
 */
import type { AppData } from '../domain/types'
import type { MedidaDeFuera } from '../domain/buzon'

const CLAVE_API = import.meta.env.VITE_FIREBASE_API_KEY ?? ''
const PROYECTO = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? ''

const IDENTIDAD = 'https://identitytoolkit.googleapis.com/v1'
const TESTIGOS = 'https://securetoken.googleapis.com/v1/token'
const DATOS = 'https://firestore.googleapis.com/v1'

const COLECCION = 'usuarios'
const SUBCOLECCION_MEDIDAS = 'medidas'

const CLAVE_SESION = 'ritmo-sesion'
/**
 * El correo con el que se pidió el enlace, guardado aquí porque Firebase lo
 * exige al canjearlo y el enlace no lo trae dentro. Es su forma de que un
 * enlace interceptado no sirva por sí solo: hace falta además saber a quién se
 * mandó.
 */
const CLAVE_CORREO = 'ritmo-correo-pendiente'

/** ¿Se ha configurado una nube? Sin esto la app funciona igual, pero local. */
export function hayNube(): boolean {
  return CLAVE_API.length > 0 && PROYECTO.length > 0
}

export interface SesionNube {
  accessToken: string
  refreshToken: string
  /** Época en ms en que caduca el token de acceso. */
  expiraEn: number
  email: string
  /** A quién pertenece: es el nombre del documento en Firestore. */
  uid: string
  /**
   * De quién es esta sesión. Está para que una sesión guardada por la versión
   * anterior de la app —que hablaba con otro proveedor— no se intente usar
   * contra este: se descarta al leerla y la app pide entrar otra vez, en vez
   * de fallar con un error raro a la primera petición.
   */
  proveedor: 'firebase'
}

export function sesionGuardada(): SesionNube | null {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    const s = JSON.parse(crudo) as SesionNube
    if (s.proveedor !== 'firebase') return null
    return s.accessToken && s.refreshToken && s.uid ? s : null
  } catch {
    return null
  }
}

function guardarSesion(s: SesionNube | null) {
  if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify(s))
  else localStorage.removeItem(CLAVE_SESION)
}

function correoPendiente(): string {
  try {
    return localStorage.getItem(CLAVE_CORREO) ?? ''
  } catch {
    return ''
  }
}

function guardarCorreoPendiente(email: string | null) {
  try {
    if (email) localStorage.setItem(CLAVE_CORREO, email)
    else localStorage.removeItem(CLAVE_CORREO)
  } catch {
    /* almacén lleno o bloqueado: se pedirá el correo a mano */
  }
}

/** Error con el motivo en castellano, para poder enseñarlo tal cual. */
export class ErrorNube extends Error {}

/* ══════════════════════════════════════════════════ AUTENTICACIÓN ══ */

/**
 * Una llamada a Identity Toolkit. Devuelve el JSON, o lanza con el motivo ya
 * traducido: los errores que se ven de verdad son de instalación, no de uso.
 */
async function identidad(metodo: string, cuerpo: unknown): Promise<Record<string, unknown>> {
  if (!hayNube()) throw new ErrorNube('No hay ninguna nube configurada en esta versión de la app.')
  const res = await fetch(`${IDENTIDAD}/accounts:${metodo}?key=${encodeURIComponent(CLAVE_API)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ErrorNube(quejaDeIdentidad(res.status, json))
  return json
}

/** El código que devuelve Firebase cuando algo va mal, si lo hay. */
function codigoDeError(json: Record<string, unknown>): string {
  const e = json.error as { message?: string } | undefined
  return String(e?.message ?? '')
}

/**
 * Traduce los fallos de autenticación a algo accionable.
 *
 * Los dos primeros son los que se ven al montar el proyecto y no se adivinan
 * nunca por el número del error: el método de acceso por enlace viene apagado
 * de fábrica, y el dominio desde el que se pide tiene que estar en la lista de
 * dominios autorizados o Firebase se niega a mandar el correo.
 */
function quejaDeIdentidad(status: number, json: Record<string, unknown>): string {
  const codigo = codigoDeError(json)

  if (/OPERATION_NOT_ALLOWED/.test(codigo))
    return 'Tu proyecto de Firebase tiene apagado el acceso por enlace al correo. Panel → Authentication → Sign-in method → «Email/Password» → activa «Email link (passwordless sign-in)».'
  if (/UNAUTHORIZED_DOMAIN|INVALID_CONTINUE_URI|MISSING_CONTINUE_URI/.test(codigo))
    return `Firebase no reconoce el sitio desde el que estás entrando (${location.hostname}). Panel → Authentication → Settings → Authorized domains → añade ese dominio.`
  if (/CONFIGURATION_NOT_FOUND/.test(codigo))
    return 'Ese proyecto de Firebase no tiene la autenticación activada todavía. Panel → Authentication → «Comenzar».'
  if (/API key not valid|API_KEY_INVALID/i.test(codigo))
    return 'La clave de Firebase que lleva esta versión no vale para ningún proyecto. Revisa VITE_FIREBASE_API_KEY.'
  if (/INVALID_EMAIL|MISSING_EMAIL/.test(codigo))
    return 'Ese correo no tiene buena pinta. Míralo otra vez.'
  if (/EXPIRED_OOB_CODE|INVALID_OOB_CODE|MISSING_OOB_CODE/.test(codigo))
    return 'Ese enlace ya no vale. Sirve una sola vez y caduca al rato, así que si lo pulsaste antes ya está gastado: pide otro correo y esta vez cópialo sin abrirlo.'
  if (/USER_DISABLED/.test(codigo)) return 'Esa cuenta está desactivada en el panel de Firebase.'
  if (/TOO_MANY_ATTEMPTS_TRY_LATER|QUOTA_EXCEEDED/.test(codigo))
    return 'Firebase ha cortado por exceso de intentos. Espera un rato largo antes de volver a pedir otro correo; el último que te llegó, si no lo has usado, sigue sirviendo.'
  if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND/.test(codigo))
    return 'Tu sesión ha caducado. Vuelve a entrar con tu correo.'

  return `${codigo || 'Error desconocido'} (${status})`
}

/**
 * A dónde tiene que volver el enlace del correo: a esta misma app, que es lo
 * único que sabe qué hacer con el testigo. El dominio tiene que estar en la
 * lista de dominios autorizados del panel de Firebase, o el correo ni se manda.
 */
export function dondeVuelve(): string {
  return location.origin + location.pathname.replace(/index\.html$/, '')
}

/**
 * Pide el enlace de acceso al correo.
 *
 * `canHandleCodeInApp` tiene que ir en `true` aunque esto no sea una app
 * nativa: es lo que hace que Firebase mande un enlace que vuelve a
 * `continueUrl` con el testigo dentro, en vez de uno que se canjea solo en su
 * propia página y no deja nada aquí.
 *
 * El correo se guarda antes de pedir nada, porque hará falta al volver:
 * Firebase exige mandar el correo junto al testigo, y el enlace no lo trae.
 */
export async function pedirEnlace(email: string): Promise<void> {
  const limpio = email.trim()
  guardarCorreoPendiente(limpio)
  await identidad('sendOobCode', {
    requestType: 'EMAIL_SIGNIN',
    email: limpio,
    continueUrl: dondeVuelve(),
    canHandleCodeInApp: true
  })
}

/**
 * Lo que hay que sacar de un enlace del correo para poder canjearlo aquí.
 *
 * El enlace de Firebase es una dirección a su propia página de acción con el
 * testigo dentro: `…/__/auth/action?mode=signIn&oobCode=<testigo>&apiKey=…`.
 * Ese `oobCode` es lo único que hace falta; el resto de la dirección es el
 * paseo por el navegador que aquí precisamente queremos evitar.
 *
 * Se acepta el enlace entero pegado tal cual —con espacios o saltos de línea
 * que meta el correo al copiar—, y también el testigo suelto, por si alguien
 * lo extrae a mano. Y se mira también dentro de `continueUrl`, porque cuando
 * el enlace ya ha rebotado una vez el testigo acaba anidado ahí dentro.
 */
export function testigoDeEnlace(texto: string): { testigo: string } | null {
  const limpio = texto.trim().replace(/\s+/g, '')
  if (!limpio) return null

  if (/[?&#]/.test(limpio)) {
    const testigo = testigoDeParametros(limpio)
    return testigo ? { testigo } : null
  }

  // Un testigo suelto: lo bastante largo como para no confundirlo con nada.
  return /^[A-Za-z0-9_-]{20,}$/.test(limpio) ? { testigo: limpio } : null
}

/**
 * Busca el testigo en los parámetros de una dirección, entrando también en los
 * que a su vez son direcciones (`continueUrl`, `link`). Firebase anida el
 * enlace bueno dentro del suyo cuando pasa por la página de acción, así que
 * mirar solo el primer nivel se dejaba fuera el caso más común al copiar.
 */
function testigoDeParametros(url: string, profundidad = 0): string | null {
  const trozos = url.split(/[?#]/).slice(1).join('&')
  if (!trozos) return null
  const p = new URLSearchParams(trozos)
  const directo = p.get('oobCode')
  if (directo) return directo
  if (profundidad >= 3) return null
  for (const clave of ['continueUrl', 'link', 'url']) {
    const anidado = p.get(clave)
    if (anidado && /[?&#]/.test(anidado)) {
      const dentro = testigoDeParametros(anidado, profundidad + 1)
      if (dentro) return dentro
    }
  }
  return null
}

/**
 * Entrar pegando el enlace del correo, sin salir de la app.
 *
 * Existe por una limitación de iOS que no tiene vuelta: **una app añadida a la
 * pantalla de inicio tiene su propio almacén, separado del de Safari**. No
 * comparten ni sesión ni datos. Y el enlace del correo siempre se abre en
 * Safari, porque iOS no sabe abrir un enlace dentro de una app instalada. Con
 * lo cual, pulsando el enlace es imposible entrar en la app instalada: entras
 * en Safari, la sesión se guarda ahí, y la app de la pantalla de inicio sigue
 * viéndote como un dispositivo nuevo.
 *
 * Pegarlo sí funciona, porque el canje ocurre dentro de la propia app. Y no
 * hace falta configurar nada extra para ello: el enlace ya trae el testigo.
 *
 * **El enlace hay que copiarlo, no pulsarlo**: sirve una sola vez, así que
 * abrirlo primero en el navegador lo gasta.
 */
export async function entrarConEnlace(email: string, texto: string): Promise<SesionNube> {
  const encontrado = testigoDeEnlace(texto)
  if (!encontrado) {
    throw new ErrorNube(
      'Eso no parece el enlace del correo. Mantén pulsado el enlace, elige «Copiar enlace» y pégalo aquí entero.'
    )
  }
  const correo = email.trim() || correoPendiente()
  if (!correo) {
    throw new ErrorNube(
      'Me falta saber a qué correo se mandó ese enlace: Firebase lo pide junto al enlace para que uno solo no baste. Escríbelo arriba y vuelve a darle a «Entrar».'
    )
  }
  return canjear(encontrado.testigo, correo)
}

/**
 * Entrar con lo que sea que haya pegado el usuario. Antes había dos vías —el
 * enlace y un código de seis cifras— y esto elegía; con Firebase el código no
 * existe, así que solo queda una. Se mantiene la función porque es la que usa
 * la pantalla, y porque decir «eso no es un enlace» aquí es mejor que dejar
 * que falle el servidor.
 */
export async function entrarConAcceso(email: string, texto: string): Promise<SesionNube> {
  const soloCifras = texto.replace(/\D/g, '')
  if (!texto.includes('/') && soloCifras.length >= 4 && soloCifras.length <= 8) {
    throw new ErrorNube(
      'Firebase no manda códigos de cifras, solo el enlace. Copia el enlace entero del correo —manteniéndolo pulsado, sin abrirlo— y pégalo aquí.'
    )
  }
  return entrarConEnlace(email, texto)
}

/** Canjea el testigo por una sesión y la guarda. */
async function canjear(oobCode: string, email: string): Promise<SesionNube> {
  const json = await identidad('signInWithEmailLink', { email, oobCode })
  const sesion: SesionNube = {
    accessToken: String(json.idToken ?? ''),
    refreshToken: String(json.refreshToken ?? ''),
    expiraEn: Date.now() + Number(json.expiresIn ?? 3600) * 1000,
    email: String(json.email ?? email),
    uid: String(json.localId ?? ''),
    proveedor: 'firebase'
  }
  if (!sesion.accessToken || !sesion.uid) {
    throw new ErrorNube('Firebase ha aceptado el enlace pero no ha devuelto una sesión utilizable.')
  }
  guardarSesion(sesion)
  guardarCorreoPendiente(null)
  return sesion
}

/**
 * Lo que dejó el intento de recoger la sesión de la URL, para que
 * `recogerFalloDeLaUrl` lo cuente. Es una variable de módulo y no un lanzamiento
 * porque quien llama a esto está arrancando la app: que el arranque no siga
 * porque el enlace estaba gastado sería peor que enseñarlo y seguir.
 */
let falloPendiente: string | null = null

/**
 * Recoge la sesión que viene en la URL tras pulsar el enlace del correo, y
 * limpia la barra de direcciones. Devuelve la sesión si la había.
 *
 * **Es asíncrona, y con Supabase no lo era.** Supabase mandaba los tokens ya
 * hechos en el fragmento de la URL: bastaba leerlos. Firebase manda un testigo
 * de un solo uso (`?mode=signIn&oobCode=…`) que hay que canjear con una
 * petición. Es más trabajo y a cambio es más seguro: un enlace que se quede en
 * el historial ya no lleva la sesión dentro, y canjearlo exige además el correo.
 */
export async function recogerSesionDeLaUrl(): Promise<SesionNube | null> {
  falloPendiente = null
  const p = new URLSearchParams(location.search)
  const oobCode = p.get('oobCode')
  if (!oobCode || p.get('mode') !== 'signIn') return null

  // Fuera de la barra de direcciones antes de canjear: sirve una sola vez, y
  // dejarlo ahí solo consigue que recargar la página dé un error confuso.
  limpiarUrl()

  const email = correoPendiente()
  if (!email) {
    falloPendiente =
      'He recibido el enlace, pero en este dispositivo no consta a qué correo se mandó. Escribe tu correo aquí abajo y pega el enlace en el campo de acceso, o pide otro desde este mismo dispositivo.'
    return null
  }

  try {
    return await canjear(oobCode, email)
  } catch (e) {
    falloPendiente = e instanceof ErrorNube ? e.message : 'No he podido validar el enlace del correo.'
    return null
  }
}

function limpiarUrl() {
  const quedan = new URLSearchParams(location.search)
  for (const clave of ['mode', 'oobCode', 'apiKey', 'continueUrl', 'lang', 'tenantId']) {
    quedan.delete(clave)
  }
  const cola = quedan.toString()
  history.replaceState(null, '', location.pathname + (cola ? `?${cola}` : ''))
}

/**
 * Si el enlace volvió con un fallo en vez de con la sesión, lo cuenta en
 * castellano y limpia la barra de direcciones.
 *
 * Hay dos sitios de donde puede venir: lo que dejó `recogerSesionDeLaUrl` al
 * intentar canjear, y un error que Firebase haya puesto en la propia URL.
 * Callárselo dejaba al usuario sin saber por qué el enlace no hacía nada.
 */
export function recogerFalloDeLaUrl(): string | null {
  if (falloPendiente) {
    const x = falloPendiente
    falloPendiente = null
    return x
  }

  const p = new URLSearchParams(location.search)
  const codigo = p.get('error_code') ?? p.get('error')
  if (!codigo) return null
  limpiarUrl()

  if (/expired|invalid|access_denied/i.test(codigo))
    return 'Ese enlace ya no vale: solo sirve una vez y caduca al poco de mandarlo. Pide otro y ábrelo en cuanto llegue, en este mismo dispositivo.'
  const detalle = (p.get('error_description') ?? '').replace(/\+/g, ' ')
  return `El enlace ha fallado (${codigo}). ${detalle}`
}

/**
 * Renueva el token cuando está a punto de caducar.
 *
 * Este es el único endpoint de Firebase que no habla JSON: quiere el cuerpo en
 * formato de formulario. Mandarle JSON devuelve un 400 seco sin explicar nada.
 */
async function renovar(sesion: SesionNube): Promise<SesionNube> {
  const res = await fetch(`${TESTIGOS}?key=${encodeURIComponent(CLAVE_API)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: sesion.refreshToken
    }).toString()
  })
  if (!res.ok) {
    guardarSesion(null)
    throw new ErrorNube('Tu sesión ha caducado. Vuelve a entrar con tu correo.')
  }
  const json = (await res.json()) as Record<string, unknown>
  const nueva: SesionNube = {
    accessToken: String(json.id_token ?? ''),
    refreshToken: String(json.refresh_token ?? sesion.refreshToken),
    expiraEn: Date.now() + Number(json.expires_in ?? 3600) * 1000,
    email: sesion.email,
    uid: String(json.user_id ?? sesion.uid),
    proveedor: 'firebase'
  }
  guardarSesion(nueva)
  return nueva
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
  try {
    const json = await identidad('lookup', { idToken: sesion.accessToken })
    const usuarios = (json.users as { email?: string }[] | undefined) ?? []
    const email = usuarios[0]?.email ?? sesion.email
    guardarSesion({ ...sesion, email })
    return email
  } catch {
    return sesion.email
  }
}

export function cerrarSesion(): void {
  guardarSesion(null)
  guardarCorreoPendiente(null)
}

/* ═════════════════════════════════════════════════════ LOS DATOS ══ */

/** La dirección del documento de esta cuenta dentro de Firestore. */
function documento(uid: string, ...resto: string[]): string {
  const trozos = [COLECCION, uid, ...resto].map(encodeURIComponent).join('/')
  return `${DATOS}/projects/${encodeURIComponent(PROYECTO)}/databases/(default)/documents/${trozos}`
}

function coleccionDeMedidas(uid: string): string {
  return documento(uid, SUBCOLECCION_MEDIDAS)
}

/**
 * Traduce los fallos de Firestore a algo accionable.
 *
 * Los dos que se ven de verdad son de instalación, no de uso: la base de datos
 * que no se llegó a crear, y las reglas que no se publicaron. Decir «error 403»
 * ahí no ayuda a nadie; decir qué paso falta, sí.
 */
function quejaDeDatos(status: number, cuerpo: string): string {
  if (status === 404 && /database.*does not exist|NOT_FOUND.*database/i.test(cuerpo))
    return 'Tu proyecto de Firebase no tiene creada la base de datos. Panel → Firestore Database → «Crear base de datos» (modo producción, la región más cercana).'
  if (status === 403 || status === 401)
    return 'Tus reglas de Firestore no me dejan tocar esos datos. Publica el contenido de firebase/firestore.rules en Panel → Firestore Database → Reglas.'
  if (status === 400 && /exceeds the maximum allowed size|too large/i.test(cuerpo))
    return 'Tus datos ya no caben en un documento de Firestore (el tope es 1 MB). Exporta una copia desde Ajustes y avísame, que hay que partirlos.'
  return `${cuerpo.slice(0, 140) || 'Error desconocido'} (${status})`
}

async function conDatos(url: string, sesion: SesionNube, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${sesion.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  })
}

async function dentro(): Promise<SesionNube> {
  const sesion = await sesionValida()
  if (!sesion) throw new ErrorNube('No has iniciado sesión.')
  return sesion
}

/**
 * Un valor de Firestore, desenvuelto.
 *
 * Firestore no guarda JSON: guarda cada campo etiquetado con su tipo
 * (`{stringValue: "x"}`, `{integerValue: "3"}` —sí, el entero viene como
 * cadena—). Esto lo deshace para el puñado de tipos que usamos.
 */
function valor(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return undefined
  const campo = v as Record<string, unknown>
  if ('nullValue' in campo) return null
  if ('stringValue' in campo) return String(campo.stringValue)
  if ('integerValue' in campo) return Number(campo.integerValue)
  if ('doubleValue' in campo) return Number(campo.doubleValue)
  if ('booleanValue' in campo) return Boolean(campo.booleanValue)
  if ('timestampValue' in campo) return String(campo.timestampValue)
  return undefined
}

function campos(doc: unknown): Record<string, unknown> {
  const f = (doc as { fields?: Record<string, unknown> } | undefined)?.fields ?? {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(f)) out[k] = valor(v)
  return out
}

/** El último trozo del nombre completo de un documento, que es su id. */
function idDeDocumento(doc: unknown): string {
  const nombre = String((doc as { name?: string } | undefined)?.name ?? '')
  return nombre.slice(nombre.lastIndexOf('/') + 1)
}

/**
 * Lo que hay guardado en la nube, o `null` si esta cuenta aún no tiene nada.
 *
 * El JSON entero va en un solo campo de texto y no repartido en campos de
 * Firestore, a propósito: `AppData` es un árbol con listas de objetos dentro
 * de objetos, y traducirlo al formato con tipos de Firestore en los dos
 * sentidos sería un serializador entero que mantener, con una forma de fallar
 * por cada tipo. Guardado como texto, lo que sube es exactamente lo que baja.
 */
export async function descargar(): Promise<AppData | null> {
  const sesion = await dentro()
  const res = await conDatos(documento(sesion.uid), sesion)
  // Un documento que aún no existe también es un 404, y ese no es un error:
  // es una cuenta nueva que todavía no ha subido nada.
  if (res.status === 404) {
    const cuerpo = await res.text()
    if (!/database/i.test(cuerpo)) return null
    throw new ErrorNube(`No he podido leer tus datos. ${quejaDeDatos(res.status, cuerpo)}`)
  }
  if (!res.ok) throw new ErrorNube(`No he podido leer tus datos. ${quejaDeDatos(res.status, await res.text())}`)
  const datos = campos(await res.json()).datos
  if (typeof datos !== 'string' || datos.length === 0) return null
  try {
    return JSON.parse(datos) as AppData
  } catch {
    throw new ErrorNube('Lo que hay en la nube no se puede leer. No he tocado nada de este dispositivo.')
  }
}

/**
 * Sube los datos, pisando lo que hubiera: lo que sube ya viene fusionado.
 *
 * `PATCH` con máscara hace de insertar y actualizar a la vez —crea el
 * documento si no estaba—, y la máscara está para que escribir estos dos
 * campos no borre ningún otro que hubiera en el documento.
 */
export async function subir(data: AppData): Promise<void> {
  const sesion = await dentro()
  const texto = JSON.stringify(data)

  const url =
    `${documento(sesion.uid)}?updateMask.fieldPaths=datos&updateMask.fieldPaths=actualizado_en`
  const res = await conDatos(url, sesion, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        datos: { stringValue: texto },
        actualizado_en: { timestampValue: new Date().toISOString() }
      }
    })
  })
  if (!res.ok) {
    throw new ErrorNube(`No he podido guardar en la nube. ${quejaDeDatos(res.status, await res.text())}`)
  }
}

/* ══════════════════════════════════════════════ EL BUZÓN DE MEDIDAS ══ */

/**
 * Las medidas que otro aparato haya dejado en el buzón.
 *
 * Se piden las cerradas y las abiertas por igual: `recoger` sabe distinguirlas
 * y deja las que siguen en marcha donde estaban. Pedir solo las cerradas
 * obligaría a filtrar aquí lo mismo que ya se decide allí, y a mantener las dos
 * reglas en sitios distintos.
 *
 * Se ordena aquí y no en la consulta porque Firestore, al ordenar por un campo,
 * se salta en silencio los documentos que no lo tienen: un aparato que no
 * pusiera `creado_en` desaparecería del buzón sin que nadie se enterase.
 */
export async function bajarMedidas(): Promise<MedidaDeFuera[]> {
  const sesion = await dentro()
  const res = await conDatos(`${coleccionDeMedidas(sesion.uid)}?pageSize=300`, sesion)
  // La subcolección vacía es un 200 sin documentos, pero según cómo se haya
  // creado la cuenta puede venir como 404: en los dos casos, buzón vacío.
  if (res.status === 404) return []
  if (!res.ok) {
    throw new ErrorNube(`No he podido leer el buzón. ${quejaDeDatos(res.status, await res.text())}`)
  }
  const json = (await res.json()) as { documents?: unknown[] }
  const docs = json.documents ?? []

  return docs
    .map((d) => ({ id: idDeDocumento(d), f: campos(d) }))
    .sort((a, b) => String(a.f.creado_en ?? a.id).localeCompare(String(b.f.creado_en ?? b.id)))
    .map(({ id, f }) => ({
      id,
      tipo: String(f.tipo ?? ''),
      date: String(f.date ?? ''),
      desde: Number(f.desde ?? 0),
      hasta: f.hasta === null || f.hasta === undefined ? null : Number(f.hasta),
      piel: (f.piel as string) ?? null,
      cielo: (f.cielo as string) ?? null,
      filtro: (f.filtro as string) ?? null,
      lamparaId: (f.lampara_id as string) ?? null,
      zona: (f.zona as string) ?? null,
      distanciaCm:
        f.distancia_cm === null || f.distancia_cm === undefined ? null : Number(f.distancia_cm),
      origen: (f.origen as string) ?? null
    }))
}

/**
 * Vacía del buzón lo ya recogido.
 *
 * Se borra **después** de haberlo guardado en local, nunca antes. Si esto falla
 * no se pierde nada: la próxima sincronización vuelve a recogerlas y, como cada
 * escritura lleva el id de su medida, el resultado es el mismo.
 *
 * Firestore no tiene borrado por lote en su API REST simple, así que van una a
 * una. Son unas pocas por sincronización, y que una falle no puede impedir que
 * las demás se borren: por eso se esperan todas y se mira el resultado al final.
 */
export async function borrarMedidas(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const sesion = await dentro()
  const resultados = await Promise.all(
    ids.map(async (id) => {
      const res = await conDatos(documento(sesion.uid, SUBCOLECCION_MEDIDAS, id), sesion, {
        method: 'DELETE'
      })
      // Borrar algo que ya no está es exactamente lo que queríamos que pasara.
      return res.ok || res.status === 404 ? null : `${res.status}`
    })
  )
  const malo = resultados.find((x) => x !== null)
  if (malo) throw new ErrorNube(`No he podido vaciar el buzón. ${quejaDeDatos(Number(malo), '')}`)
}
