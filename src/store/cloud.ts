/**
 * La nube: entrar con tu correo y tu contraseña, y dejar los datos donde los
 * vea cualquier dispositivo.
 *
 * Se habla con Firebase por HTTP, sin su biblioteca. Son cuatro endpoints de
 * autenticación y dos de datos, y la app no tiene ninguna dependencia en tiempo
 * de ejecución más allá de React: meter el SDK de Firebase —que son varios
 * cientos de kilobytes— para esto sería pagar mucho por muy poco, y encima en
 * una app que tiene que arrancar sin conexión.
 *
 * **Aquí «la nube» no sustituye al dispositivo.** Los datos viven en
 * `localStorage` y la app funciona entera sin conexión y sin cuenta; esto es lo
 * que hace que dos dispositivos se pongan de acuerdo. Se baja lo de allí, se
 * fusiona con lo de aquí (`src/domain/merge.ts`) y se vuelve a subir el
 * resultado. Un local-first bien hecho da lo mismo que uno que dependa del
 * servidor —lo que empieces en el móvil aparece en el ordenador en segundos—
 * sin el precio de quedarte sin app cuando no hay cobertura.
 *
 * ## Por qué contraseña y no enlace al correo
 *
 * Antes esto entraba por enlace mágico, y tenía un problema que no se arregla
 * con más código: **en iOS, una app añadida a la pantalla de inicio tiene su
 * propio almacén, separado del de Safari**, y el enlace del correo siempre abre
 * Safari. Pulsarlo entraba en Safari y dejaba la app instalada viéndote como un
 * dispositivo nuevo. La salida era copiar el enlace y pegarlo dentro de la app:
 * funciona, pero son tres pasos y uno de ellos —«no lo pulses»— va contra el
 * instinto de cualquiera.
 *
 * Una contraseña se teclea **dentro** de la app, en el móvil, en el ordenador y
 * en la app instalada por igual, y no hay nada que copiar ni ventana que
 * caduque. Para entrar en el segundo dispositivo mientras el primero está
 * midiendo, que es de lo que va todo esto, es la diferencia entre diez segundos
 * y una excursión por el correo.
 *
 * El enlace no desaparece del todo: sigue siendo como se recupera una
 * contraseña olvidada, que es el único sitio donde un enlace de un solo uso es
 * exactamente la herramienta correcta.
 *
 * ## Qué se guarda
 *
 * Un documento por cuenta en `usuarios/{uid}` con el JSON entero dentro de un
 * solo campo de texto. Las reglas de seguridad (`firebase/firestore.rules`)
 * atan cada documento a su dueño, así que la clave que va en el paquete es
 * justo eso, pública: sin sesión no abre nada. Y la contraseña no pasa por
 * aquí más que para canjearla por un testigo: no se guarda ni se vuelve a
 * mandar.
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
 * El último correo con el que se entró, para poder rellenarlo solo la próxima
 * vez. No es la contraseña, que no se guarda en ninguna parte.
 */
const CLAVE_CORREO = 'ritmo-ultimo-correo'

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

/** El correo con el que se entró la última vez, para no volver a teclearlo. */
export function ultimoCorreo(): string {
  try {
    return localStorage.getItem(CLAVE_CORREO) ?? ''
  } catch {
    return ''
  }
}

function recordarCorreo(email: string) {
  try {
    localStorage.setItem(CLAVE_CORREO, email)
  } catch {
    /* almacén lleno o bloqueado: se teclea otra vez y ya está */
  }
}

/** Error con el motivo en castellano, para poder enseñarlo tal cual. */
export class ErrorNube extends Error {}

/* ══════════════════════════════════════════════════ AUTENTICACIÓN ══ */

/** Lo que Firebase exige, y es poco. Se dice antes de mandar nada. */
export const LARGO_MINIMO_DE_CONTRASENA = 6

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
 * El primero es el que se ve al montar el proyecto y no se adivina nunca por el
 * número del error: el acceso por contraseña viene apagado de fábrica.
 *
 * Y ojo con `INVALID_LOGIN_CREDENTIALS`: Firebase dejó de distinguir «ese
 * correo no existe» de «esa contraseña no es» a propósito, para que nadie pueda
 * averiguar qué correos tienen cuenta probando. Aquí eso obliga a dar un
 * mensaje que cubra los dos casos, y está bien que así sea.
 */
function quejaDeIdentidad(status: number, json: Record<string, unknown>): string {
  const codigo = codigoDeError(json)

  if (/OPERATION_NOT_ALLOWED|PASSWORD_LOGIN_DISABLED|ADMIN_ONLY_OPERATION/.test(codigo))
    return 'Tu proyecto de Firebase tiene apagado el acceso por contraseña. Panel → Authentication → Sign-in method → activa «Email/Password».'
  if (/CONFIGURATION_NOT_FOUND/.test(codigo))
    return 'Ese proyecto de Firebase no tiene la autenticación activada todavía. Panel → Authentication → «Comenzar».'
  if (/API key not valid|API_KEY_INVALID/i.test(codigo))
    return 'La clave de Firebase que lleva esta versión no vale para ningún proyecto. Revisa VITE_FIREBASE_API_KEY.'

  if (/EMAIL_EXISTS/.test(codigo))
    return 'Ya hay una cuenta con ese correo. Entra con tu contraseña, o pide una nueva si no la recuerdas.'
  if (/INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD/.test(codigo))
    return 'El correo o la contraseña no son. Míralo otra vez, y si no la recuerdas pide una nueva aquí abajo.'
  if (/WEAK_PASSWORD/.test(codigo))
    return `Esa contraseña es demasiado corta. Firebase pide ${LARGO_MINIMO_DE_CONTRASENA} caracteres como mínimo.`
  if (/INVALID_EMAIL|MISSING_EMAIL/.test(codigo)) return 'Ese correo no tiene buena pinta. Míralo otra vez.'
  if (/MISSING_PASSWORD/.test(codigo)) return 'Te falta escribir la contraseña.'
  if (/USER_DISABLED/.test(codigo)) return 'Esa cuenta está desactivada en el panel de Firebase.'

  if (/UNAUTHORIZED_DOMAIN|INVALID_CONTINUE_URI/.test(codigo))
    return `Firebase no reconoce el sitio desde el que estás entrando (${location.hostname}). Panel → Authentication → Settings → Authorized domains → añade ese dominio.`
  if (/EXPIRED_OOB_CODE|INVALID_OOB_CODE|MISSING_OOB_CODE/.test(codigo))
    return 'Ese enlace ya no vale: sirve una sola vez y caduca al rato. Pide otro correo de contraseña nueva.'

  if (/TOO_MANY_ATTEMPTS_TRY_LATER|QUOTA_EXCEEDED/.test(codigo))
    return 'Firebase ha cortado por exceso de intentos. Espera un rato antes de volver a probar.'
  if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND/.test(codigo))
    return 'Tu sesión ha caducado. Vuelve a entrar con tu correo y tu contraseña.'

  return `${codigo || 'Error desconocido'} (${status})`
}

/**
 * A dónde tiene que volver el enlace de contraseña nueva: a esta misma app, que
 * es lo único que sabe qué hacer con él. El dominio tiene que estar en la lista
 * de dominios autorizados del panel de Firebase, o el correo ni se manda.
 */
export function dondeVuelve(): string {
  return location.origin + location.pathname.replace(/index\.html$/, '')
}

/** Lo que devuelve Firebase al entrar, hecho sesión y guardado. */
function desdeRespuesta(json: Record<string, unknown>, email: string): SesionNube {
  const sesion: SesionNube = {
    accessToken: String(json.idToken ?? ''),
    refreshToken: String(json.refreshToken ?? ''),
    expiraEn: Date.now() + Number(json.expiresIn ?? 3600) * 1000,
    email: String(json.email ?? email),
    uid: String(json.localId ?? ''),
    proveedor: 'firebase'
  }
  if (!sesion.accessToken || !sesion.uid) {
    throw new ErrorNube('Firebase ha aceptado los datos pero no ha devuelto una sesión utilizable.')
  }
  guardarSesion(sesion)
  recordarCorreo(sesion.email)
  return sesion
}

/**
 * Lo que se comprueba aquí antes de molestar al servidor.
 *
 * No es validación por gusto: un correo sin arroba y una contraseña de tres
 * letras son dos viajes de ida y vuelta para que te digan lo mismo que se sabe
 * desde aquí, y encima cuentan para el límite de intentos de Firebase.
 */
function revisar(email: string, password: string): string | null {
  if (!email.includes('@') || email.length < 5) return 'Escribe un correo válido.'
  if (password.length < LARGO_MINIMO_DE_CONTRASENA) {
    return `La contraseña son ${LARGO_MINIMO_DE_CONTRASENA} caracteres como mínimo.`
  }
  return null
}

/** Crear la cuenta. La primera vez, y solo la primera. */
export async function crearCuenta(email: string, password: string): Promise<SesionNube> {
  const limpio = email.trim()
  const queja = revisar(limpio, password)
  if (queja) throw new ErrorNube(queja)
  return desdeRespuesta(
    await identidad('signUp', { email: limpio, password, returnSecureToken: true }),
    limpio
  )
}

/** Entrar en una cuenta que ya existe. */
export async function entrar(email: string, password: string): Promise<SesionNube> {
  const limpio = email.trim()
  const queja = revisar(limpio, password)
  if (queja) throw new ErrorNube(queja)
  return desdeRespuesta(
    await identidad('signInWithPassword', { email: limpio, password, returnSecureToken: true }),
    limpio
  )
}

/**
 * Entrar sin tener que saber de antemano si la cuenta existe.
 *
 * En una app de una sola persona, «registrarse» y «entrar» son la misma
 * intención escrita dos veces, y obligar a elegir el botón correcto solo sirve
 * para equivocarse. Se prueba a entrar y, si el correo no tiene cuenta, se
 * crea. Al revés no vale: intentar crearla primero le diría a cualquiera qué
 * correos ya están registrados, que es justo lo que Firebase se esfuerza en no
 * decir.
 */
export async function entrarOCrear(email: string, password: string): Promise<SesionNube> {
  let credenciales: ErrorNube
  try {
    return await entrar(email, password)
  } catch (e) {
    const dice = e instanceof ErrorNube ? e.message : ''
    // Solo se cae hacia crear si el fallo es «esas credenciales no valen». Un
    // proyecto mal montado o un corte de red no se arreglan creando cuentas.
    if (!(e instanceof ErrorNube) || !/correo o la contraseña no son/.test(dice)) throw e
    credenciales = e
  }

  try {
    return await crearCuenta(email, password)
  } catch (e) {
    /*
     * Si crear dice que el correo ya existe, es que la cuenta estaba y lo que
     * falló arriba fue la contraseña. Dejar salir ese mensaje contestaba «ya
     * hay una cuenta con ese correo» a quien acababa de teclear mal su propia
     * contraseña, que es de las cosas más desconcertantes que puede decir una
     * pantalla de acceso. Se devuelve el fallo de verdad, que es el de antes.
     */
    if (e instanceof ErrorNube && /Ya hay una cuenta/.test(e.message)) throw credenciales
    throw e
  }
}

/**
 * Pide por correo el enlace para poner una contraseña nueva.
 *
 * Es el único sitio donde un enlace de un solo uso es la herramienta correcta:
 * demuestra que el correo es tuyo, que es precisamente lo que hay que demostrar
 * cuando ya no te acuerdas de nada más.
 */
export async function pedirNuevaContrasena(email: string): Promise<void> {
  const limpio = email.trim()
  if (!limpio.includes('@')) throw new ErrorNube('Escribe un correo válido.')
  await identidad('sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email: limpio,
    continueUrl: dondeVuelve()
  })
}

/**
 * El testigo de contraseña nueva que viene en la URL, si venimos de ese enlace.
 *
 * Se lee y se limpia la barra de direcciones de una vez: sirve una sola vez, y
 * dejarlo ahí solo consigue que recargar la página dé un error confuso.
 */
export function codigoDeResetEnLaUrl(): string | null {
  const p = new URLSearchParams(location.search)
  const oobCode = p.get('oobCode')
  if (!oobCode || p.get('mode') !== 'resetPassword') return null
  limpiarUrl()
  return oobCode
}

/**
 * Pone la contraseña nueva y entra con ella.
 *
 * Firebase no devuelve sesión al cambiarla —solo confirma el correo al que
 * pertenecía el testigo—, así que se entra a continuación con lo que se acaba
 * de poner. Hacerlo aquí y no en la pantalla evita el paso más absurdo posible:
 * teclear la contraseña nueva dos veces seguidas.
 */
export async function ponerNuevaContrasena(oobCode: string, password: string): Promise<SesionNube> {
  if (password.length < LARGO_MINIMO_DE_CONTRASENA) {
    throw new ErrorNube(`La contraseña son ${LARGO_MINIMO_DE_CONTRASENA} caracteres como mínimo.`)
  }
  const json = await identidad('resetPassword', { oobCode, newPassword: password })
  const email = String(json.email ?? '')
  if (!email) throw new ErrorNube('Firebase no ha dicho de qué cuenta era ese enlace.')
  return entrar(email, password)
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
 * Si el enlace del correo volvió con un fallo, lo cuenta en castellano y limpia
 * la barra de direcciones. Callárselo dejaba al usuario sin saber por qué el
 * enlace no hacía nada.
 */
export function recogerFalloDeLaUrl(): string | null {
  const p = new URLSearchParams(location.search)
  const codigo = p.get('error_code') ?? p.get('error')
  if (!codigo) return null
  limpiarUrl()

  if (/expired|invalid|access_denied/i.test(codigo))
    return 'Ese enlace ya no vale: solo sirve una vez y caduca al poco de mandarlo. Pide otro y ábrelo en cuanto llegue.'
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
    throw new ErrorNube('Tu sesión ha caducado. Vuelve a entrar con tu correo y tu contraseña.')
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
