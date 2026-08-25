import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Lo que se prueba aquí es el trato con Firebase, que es donde se puede meter
 * la pata en silencio: mandarle algo que su API no reconoce no siempre da
 * error, y el fallo aparece dos pasos más allá, cuando el enlace del correo
 * lleva a un sitio que no es o vuelve sin nada dentro.
 */

const CLAVE = 'clave-publica'
const PROYECTO = 'ritmo-de-prueba'
const APP = 'https://ritmo.netlify.app'
const RUTA = '/'

/** Un navegador de mentira: solo lo que cloud.ts toca de verdad. */
function montarNavegador(search = '') {
  const guardado = new Map<string, string>()
  const sitio = { origin: APP, pathname: RUTA, search, hash: '', hostname: 'ritmo.netlify.app' }
  vi.stubGlobal('location', sitio)
  vi.stubGlobal('history', {
    replaceState: (_e: unknown, _t: unknown, url: string) => {
      sitio.search = url.includes('?') ? url.slice(url.indexOf('?')) : ''
    }
  })
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => guardado.get(k) ?? null,
    setItem: (k: string, v: string) => void guardado.set(k, v),
    removeItem: (k: string) => void guardado.delete(k)
  })
  return { sitio, guardado }
}

/** Carga el módulo ya con las variables puestas: se leen al importarlo. */
async function cargarNube() {
  vi.stubEnv('VITE_FIREBASE_API_KEY', CLAVE)
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', PROYECTO)
  vi.resetModules()
  return import('./cloud')
}

/** Apunta las llamadas para poder mirarlas después. */
function espiarLlamadas(respuesta: unknown = {}) {
  const llamadas: { url: string; cuerpo: Record<string, unknown> | null }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      let cuerpo: Record<string, unknown> | null = null
      if (init.body) {
        try {
          cuerpo = JSON.parse(String(init.body))
        } catch {
          cuerpo = Object.fromEntries(new URLSearchParams(String(init.body)))
        }
      }
      llamadas.push({ url, cuerpo })
      return new Response(JSON.stringify(respuesta), { status: 200 })
    })
  )
  return llamadas
}

/** Lo que devuelve Firebase cuando el enlace vale. */
const SESION_BUENA = {
  idToken: 'tok',
  refreshToken: 'ref',
  expiresIn: '3600',
  email: 'alberto@ejemplo.com',
  localId: 'uid-1'
}

/** Un error de Firebase, con la forma exacta que tiene el suyo. */
function falloDeFirebase(mensaje: string, status = 400) {
  return new Response(JSON.stringify({ error: { code: status, message: mensaje } }), { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('pedir el enlace del correo', () => {
  it('pide que el enlace vuelva a esta app, y no a la raíz del dominio', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    expect(llamadas).toHaveLength(1)
    expect(llamadas[0].cuerpo?.continueUrl).toBe(`${APP}${RUTA}`)
  })

  it('y desde un subdirectorio, la vuelta es la carpeta de la app', async () => {
    const { sitio } = montarNavegador()
    sitio.pathname = '/app-ejercicio/index.html'
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    expect(llamadas[0].cuerpo?.continueUrl).toBe(`${APP}/app-ejercicio/`)
  })

  it('pide el tipo de correo que trae el testigo de vuelta, no el que se canjea solo', async () => {
    // `canHandleCodeInApp` en falso hace que Firebase mande un enlace que se
    // canjea en su propia página y no deja nada aquí: se entra en su web, no
    // en la app.
    montarNavegador()
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    expect(llamadas[0].cuerpo?.requestType).toBe('EMAIL_SIGNIN')
    expect(llamadas[0].cuerpo?.canHandleCodeInApp).toBe(true)
  })

  it('la clave va en la URL, que es donde Firebase la lee', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    expect(new URL(llamadas[0].url).searchParams.get('key')).toBe(CLAVE)
    expect(llamadas[0].url).toContain('accounts:sendOobCode')
  })

  it('guarda el correo, porque hará falta al canjear y el enlace no lo trae', async () => {
    const { guardado } = montarNavegador()
    espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('  alberto@ejemplo.com  ')

    expect(guardado.get('ritmo-correo-pendiente')).toBe('alberto@ejemplo.com')
  })
})

/**
 * Los dos errores de instalación que no se adivinan por el número.
 *
 * El acceso por enlace viene apagado de fábrica y el dominio hay que darlo de
 * alta a mano. Con el mensaje crudo de Firebase, ninguno de los dos lleva a
 * saber qué hay que tocar.
 */
describe('los fallos de montaje se cuentan diciendo qué falta', () => {
  it('el acceso por enlace apagado manda a la pantalla exacta', async () => {
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('OPERATION_NOT_ALLOWED')))
    const { pedirEnlace } = await cargarNube()

    await expect(pedirEnlace('alberto@ejemplo.com')).rejects.toThrow(/Sign-in method|Email link/i)
  })

  it('el dominio sin autorizar dice cuál es el dominio', async () => {
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('UNAUTHORIZED_DOMAIN')))
    const { pedirEnlace } = await cargarNube()

    await expect(pedirEnlace('alberto@ejemplo.com')).rejects.toThrow(/ritmo\.netlify\.app/)
  })

  it('un enlace gastado se explica en vez de soltar el código', async () => {
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('EXPIRED_OOB_CODE')))
    const { entrarConEnlace } = await cargarNube()

    await expect(
      entrarConEnlace('alberto@ejemplo.com', 'https://x.firebaseapp.com/__/auth/action?mode=signIn&oobCode=abc123def456ghi789')
    ).rejects.toThrow(/una sola vez|gastado|cópialo/i)
  })
})

describe('sacar el testigo de un enlace pegado', () => {
  const ENLACE =
    'https://ritmo.firebaseapp.com/__/auth/action?mode=signIn&oobCode=abc123def456ghi789&apiKey=k&continueUrl=https%3A%2F%2Fritmo.netlify.app%2F&lang=es'

  it('del enlace tal cual viene en el correo', async () => {
    montarNavegador()
    const { testigoDeEnlace } = await cargarNube()

    expect(testigoDeEnlace(ENLACE)).toEqual({ testigo: 'abc123def456ghi789' })
  })

  it('aguanta los saltos de línea que mete el correo al copiar', async () => {
    montarNavegador()
    const { testigoDeEnlace } = await cargarNube()

    const r = testigoDeEnlace('  https://ritmo.firebaseapp.com/__/auth/action?mode=signIn&oobCode=abc123def456\n  ghi789  ')

    expect(r?.testigo).toBe('abc123def456ghi789')
  })

  it('y lo encuentra aunque venga anidado dentro de continueUrl', async () => {
    // Pasa cuando el enlace ya ha rebotado una vez: el bueno acaba metido
    // dentro del parámetro de vuelta del otro. Mirando solo el primer nivel se
    // quedaba fuera el caso más habitual al copiar del correo abierto.
    montarNavegador()
    const { testigoDeEnlace } = await cargarNube()

    const anidado =
      'https://ritmo.netlify.app/?continueUrl=' +
      encodeURIComponent('https://ritmo.firebaseapp.com/__/auth/action?mode=signIn&oobCode=zzz111yyy222xxx333')

    expect(testigoDeEnlace(anidado)).toEqual({ testigo: 'zzz111yyy222xxx333' })
  })

  it('y un testigo suelto, por si alguien lo saca a mano', async () => {
    montarNavegador()
    const { testigoDeEnlace } = await cargarNube()

    expect(testigoDeEnlace('abcdefghij0123456789klmn')).toEqual({
      testigo: 'abcdefghij0123456789klmn'
    })
  })

  it('no se traga cualquier cosa', async () => {
    montarNavegador()
    const { testigoDeEnlace } = await cargarNube()

    expect(testigoDeEnlace('')).toBeNull()
    expect(testigoDeEnlace('hola qué tal')).toBeNull()
    expect(testigoDeEnlace('https://ejemplo.com/sin-testigo?a=1')).toBeNull()
    expect(testigoDeEnlace('123456')).toBeNull()
  })
})

describe('entrar pegando el enlace', () => {
  const ENLACE = 'https://ritmo.firebaseapp.com/__/auth/action?mode=signIn&oobCode=abc123def456ghi789'

  it('canjea el testigo sin pasar por el navegador', async () => {
    const { guardado } = montarNavegador()
    const llamadas = espiarLlamadas(SESION_BUENA)
    const { entrarConEnlace } = await cargarNube()

    const sesion = await entrarConEnlace('alberto@ejemplo.com', ENLACE)

    expect(sesion.accessToken).toBe('tok')
    expect(sesion.uid).toBe('uid-1')
    expect(guardado.get('ritmo-sesion')).toBeTruthy()
    expect(llamadas[0].url).toContain('accounts:signInWithEmailLink')
  })

  it('manda el correo junto al testigo, que Firebase no canjea sin él', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas(SESION_BUENA)
    const { entrarConEnlace } = await cargarNube()

    await entrarConEnlace('alberto@ejemplo.com', ENLACE)

    expect(llamadas[0].cuerpo).toEqual({
      email: 'alberto@ejemplo.com',
      oobCode: 'abc123def456ghi789'
    })
  })

  it('si no se escribe el correo, tira del que se guardó al pedir el enlace', async () => {
    const { guardado } = montarNavegador()
    guardado.set('ritmo-correo-pendiente', 'alberto@ejemplo.com')
    const llamadas = espiarLlamadas(SESION_BUENA)
    const { entrarConEnlace } = await cargarNube()

    await entrarConEnlace('', ENLACE)

    expect(llamadas[0].cuerpo?.email).toBe('alberto@ejemplo.com')
  })

  it('y sin correo por ningún lado lo pide, en vez de mandar una petición que va a fallar', async () => {
    montarNavegador()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { entrarConEnlace } = await cargarNube()

    await expect(entrarConEnlace('', ENLACE)).rejects.toThrow(/correo/i)
    expect(espia).not.toHaveBeenCalled()
  })

  it('pegar algo que no es el enlace se dice antes de molestar al servidor', async () => {
    montarNavegador()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { entrarConEnlace } = await cargarNube()

    await expect(entrarConEnlace('alberto@ejemplo.com', 'no es un enlace')).rejects.toThrow(
      /Copiar enlace|no parece/i
    )
    expect(espia).not.toHaveBeenCalled()
  })

  it('y si falla no deja media sesión guardada', async () => {
    const { guardado } = montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('INVALID_OOB_CODE')))
    const { entrarConEnlace } = await cargarNube()

    await entrarConEnlace('alberto@ejemplo.com', ENLACE).catch(() => {})

    expect(guardado.get('ritmo-sesion')).toBeUndefined()
  })

  it('al entrar se olvida el correo pendiente: ya no hace falta', async () => {
    const { guardado } = montarNavegador()
    guardado.set('ritmo-correo-pendiente', 'alberto@ejemplo.com')
    espiarLlamadas(SESION_BUENA)
    const { entrarConEnlace } = await cargarNube()

    await entrarConEnlace('alberto@ejemplo.com', ENLACE)

    expect(guardado.get('ritmo-correo-pendiente')).toBeUndefined()
  })
})

describe('lo que se pega y no es un enlace', () => {
  it('unas cifras se explican: Firebase no manda códigos', async () => {
    montarNavegador()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { entrarConAcceso } = await cargarNube()

    await expect(entrarConAcceso('alberto@ejemplo.com', '424242')).rejects.toThrow(
      /no manda códigos/i
    )
    expect(espia).not.toHaveBeenCalled()
  })

  it('un enlace va por la vía del enlace, aunque lleve cifras dentro', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas(SESION_BUENA)
    const { entrarConAcceso } = await cargarNube()

    await entrarConAcceso(
      'alberto@ejemplo.com',
      'https://ritmo.firebaseapp.com/__/auth/action?mode=signIn&oobCode=123456abcdef7890ghij'
    )

    expect(llamadas[0].cuerpo?.oobCode).toBe('123456abcdef7890ghij')
  })
})

describe('volver del enlace pulsado', () => {
  it('canjea lo que trae la URL y deja la sesión guardada', async () => {
    const { guardado } = montarNavegador('?mode=signIn&oobCode=abc123def456ghi789&apiKey=k&lang=es')
    guardado.set('ritmo-correo-pendiente', 'alberto@ejemplo.com')
    espiarLlamadas(SESION_BUENA)
    const { recogerSesionDeLaUrl } = await cargarNube()

    const sesion = await recogerSesionDeLaUrl()

    expect(sesion?.accessToken).toBe('tok')
    expect(guardado.get('ritmo-sesion')).toBeTruthy()
  })

  it('y limpia la barra de direcciones, que un testigo en el historial no pinta nada', async () => {
    const { sitio, guardado } = montarNavegador('?mode=signIn&oobCode=abc123def456ghi789&apiKey=k')
    guardado.set('ritmo-correo-pendiente', 'alberto@ejemplo.com')
    espiarLlamadas(SESION_BUENA)
    const { recogerSesionDeLaUrl } = await cargarNube()

    await recogerSesionDeLaUrl()

    expect(sitio.search).toBe('')
  })

  it('sin nada en la URL no inventa ninguna sesión ni llama a nadie', async () => {
    montarNavegador()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { recogerSesionDeLaUrl } = await cargarNube()

    expect(await recogerSesionDeLaUrl()).toBeNull()
    expect(espia).not.toHaveBeenCalled()
  })

  it('el enlace abierto en otro dispositivo se explica, no se queda callado', async () => {
    // Sin el correo guardado no hay canje posible: Firebase lo exige. Callarlo
    // dejaba una pantalla que no hace nada al volver del correo.
    montarNavegador('?mode=signIn&oobCode=abc123def456ghi789')
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { recogerSesionDeLaUrl, recogerFalloDeLaUrl } = await cargarNube()

    expect(await recogerSesionDeLaUrl()).toBeNull()
    expect(recogerFalloDeLaUrl()).toMatch(/correo/i)
    expect(espia).not.toHaveBeenCalled()
  })

  it('un canje que falla también se cuenta', async () => {
    const { guardado } = montarNavegador('?mode=signIn&oobCode=abc123def456ghi789')
    guardado.set('ritmo-correo-pendiente', 'alberto@ejemplo.com')
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('EXPIRED_OOB_CODE')))
    const { recogerSesionDeLaUrl, recogerFalloDeLaUrl } = await cargarNube()

    expect(await recogerSesionDeLaUrl()).toBeNull()
    expect(recogerFalloDeLaUrl()).toMatch(/ya no vale/i)
  })

  it('sin fallo no inventa ninguno', async () => {
    montarNavegador()
    const { recogerFalloDeLaUrl } = await cargarNube()

    expect(recogerFalloDeLaUrl()).toBeNull()
  })
})

describe('la sesión guardada', () => {
  it('una de la versión anterior no se intenta usar contra Firebase', async () => {
    // La app hablaba antes con otro proveedor y guardaba en la misma clave.
    // Usarla aquí daría un error raro en la primera petición en vez de un
    // «entra otra vez», que es lo que de verdad hay que hacer.
    const { guardado } = montarNavegador()
    guardado.set(
      'ritmo-sesion',
      JSON.stringify({ accessToken: 'viejo', refreshToken: 'viejo', expiraEn: Date.now() + 1e7 })
    )
    const { sesionGuardada } = await cargarNube()

    expect(sesionGuardada()).toBeNull()
  })

  it('cerrar sesión se lleva también el correo pendiente', async () => {
    const { guardado } = montarNavegador()
    guardado.set('ritmo-sesion', JSON.stringify({ proveedor: 'firebase', accessToken: 'a', refreshToken: 'b', uid: 'u' }))
    guardado.set('ritmo-correo-pendiente', 'alberto@ejemplo.com')
    const { cerrarSesion } = await cargarNube()

    cerrarSesion()

    expect(guardado.get('ritmo-sesion')).toBeUndefined()
    expect(guardado.get('ritmo-correo-pendiente')).toBeUndefined()
  })

  it('renovarla habla en formato de formulario, que es lo único que ese endpoint entiende', async () => {
    const { guardado } = montarNavegador()
    guardado.set(
      'ritmo-sesion',
      JSON.stringify({
        proveedor: 'firebase',
        accessToken: 'viejo',
        refreshToken: 'ref',
        uid: 'uid-1',
        email: 'alberto@ejemplo.com',
        expiraEn: Date.now() - 1000
      })
    )
    const llamadas = espiarLlamadas({ id_token: 'nuevo', refresh_token: 'ref2', expires_in: '3600', user_id: 'uid-1' })
    const { sesionValida } = await cargarNube()

    const s = await sesionValida()

    expect(llamadas[0].url).toContain('securetoken.googleapis.com')
    expect(llamadas[0].cuerpo).toEqual({ grant_type: 'refresh_token', refresh_token: 'ref' })
    expect(s?.accessToken).toBe('nuevo')
    // El correo no viene en la respuesta del refresco: si no se arrastrara, la
    // pantalla de Ajustes se quedaría sin saber quién ha entrado.
    expect(s?.email).toBe('alberto@ejemplo.com')
  })
})

describe('los datos', () => {
  function conSesion() {
    const { guardado, sitio } = montarNavegador()
    guardado.set(
      'ritmo-sesion',
      JSON.stringify({
        proveedor: 'firebase',
        accessToken: 'tok',
        refreshToken: 'ref',
        uid: 'uid-1',
        email: 'alberto@ejemplo.com',
        expiraEn: Date.now() + 1e7
      })
    )
    return { guardado, sitio }
  }

  it('van al documento de esta cuenta y de ninguna otra', async () => {
    conSesion()
    const llamadas = espiarLlamadas({})
    const { subir } = await cargarNube()

    await subir({ version: 1 } as never)

    expect(llamadas[0].url).toContain(`/projects/${PROYECTO}/databases/(default)/documents/usuarios/uid-1`)
  })

  it('se guardan como un solo texto: lo que sube es exactamente lo que baja', async () => {
    conSesion()
    const llamadas = espiarLlamadas({})
    const { subir } = await cargarNube()

    await subir({ version: 3, sessions: [{ id: 'a' }] } as never)

    const campos = (llamadas[0].cuerpo as { fields: Record<string, { stringValue?: string }> }).fields
    expect(JSON.parse(campos.datos.stringValue!)).toEqual({ version: 3, sessions: [{ id: 'a' }] })
  })

  it('la máscara está puesta, para no borrar lo que no se toca', async () => {
    conSesion()
    const llamadas = espiarLlamadas({})
    const { subir } = await cargarNube()

    await subir({ version: 1 } as never)

    const p = new URL(llamadas[0].url).searchParams.getAll('updateMask.fieldPaths')
    expect(p).toContain('datos')
    expect(p).toContain('actualizado_en')
  })

  it('bajarlos deshace el texto', async () => {
    conSesion()
    espiarLlamadas({ fields: { datos: { stringValue: '{"version":3}' } } })
    const { descargar } = await cargarNube()

    expect(await descargar()).toEqual({ version: 3 })
  })

  it('una cuenta nueva no tiene documento, y eso no es un error', async () => {
    // Firestore contesta 404 a un documento que aún no existe. Tratarlo como
    // fallo hacía que la primera sincronización de una cuenta nueva no subiera
    // nada y se quedara diciendo que algo había ido mal.
    conSesion()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Document not found' } }), { status: 404 }))
    )
    const { descargar } = await cargarNube()

    expect(await descargar()).toBeNull()
  })

  it('pero la base de datos sin crear sí lo es, y se dice cómo crearla', async () => {
    conSesion()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { message: 'The database (default) does not exist for project ritmo' } }),
            { status: 404 }
          )
      )
    )
    const { descargar } = await cargarNube()

    await expect(descargar()).rejects.toThrow(/Firestore Database|Crear base de datos/i)
  })

  it('las reglas sin publicar se cuentan diciendo qué publicar', async () => {
    conSesion()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('PERMISSION_DENIED', { status: 403 })))
    const { descargar } = await cargarNube()

    await expect(descargar()).rejects.toThrow(/firestore\.rules/i)
  })
})

describe('el buzón de medidas', () => {
  function conSesion() {
    const { guardado } = montarNavegador()
    guardado.set(
      'ritmo-sesion',
      JSON.stringify({
        proveedor: 'firebase',
        accessToken: 'tok',
        refreshToken: 'ref',
        uid: 'uid-1',
        email: 'alberto@ejemplo.com',
        expiraEn: Date.now() + 1e7
      })
    )
  }

  const documento = (id: string, campos: Record<string, unknown>) => ({
    name: `projects/${PROYECTO}/databases/(default)/documents/usuarios/uid-1/medidas/${id}`,
    fields: campos
  })

  it('deshace los tipos de Firestore, que no guarda JSON sino campos etiquetados', async () => {
    conSesion()
    espiarLlamadas({
      documents: [
        documento('m1', {
          tipo: { stringValue: 'sol' },
          date: { stringValue: '2026-08-25' },
          // El entero viene como cadena: es así en su API, no es un error.
          desde: { integerValue: '405' },
          hasta: { integerValue: '528' },
          distancia_cm: { nullValue: null },
          origen: { stringValue: 'reloj' },
          creado_en: { timestampValue: '2026-08-25T06:45:00Z' }
        })
      ]
    })
    const { bajarMedidas } = await cargarNube()

    expect(await bajarMedidas()).toEqual([
      {
        id: 'm1',
        tipo: 'sol',
        date: '2026-08-25',
        desde: 405,
        hasta: 528,
        piel: null,
        cielo: null,
        filtro: null,
        lamparaId: null,
        zona: null,
        distanciaCm: null,
        origen: 'reloj'
      }
    ])
  })

  it('las ordena por cuándo se dejaron, aquí y no en la consulta', async () => {
    // Firestore, al ordenar por un campo, se salta en silencio los documentos
    // que no lo tienen: un aparato que no pusiera `creado_en` desaparecería del
    // buzón sin que nadie se enterase.
    conSesion()
    espiarLlamadas({
      documents: [
        documento('tarde', { creado_en: { timestampValue: '2026-08-25T18:00:00Z' }, tipo: { stringValue: 'b' } }),
        documento('sin-fecha', { tipo: { stringValue: 'c' } }),
        documento('pronto', { creado_en: { timestampValue: '2026-08-25T06:00:00Z' }, tipo: { stringValue: 'a' } })
      ]
    })
    const { bajarMedidas } = await cargarNube()

    const ids = (await bajarMedidas()).map((m) => m.id)
    expect(ids).toHaveLength(3)
    expect(ids.indexOf('pronto')).toBeLessThan(ids.indexOf('tarde'))
    expect(ids).toContain('sin-fecha')
  })

  it('el buzón vacío es una lista vacía, no un fallo', async () => {
    conSesion()
    espiarLlamadas({})
    const { bajarMedidas } = await cargarNube()

    expect(await bajarMedidas()).toEqual([])
  })

  it('borrar lo recogido va una a una, a su documento', async () => {
    conSesion()
    const llamadas = espiarLlamadas({})
    const { borrarMedidas } = await cargarNube()

    await borrarMedidas(['m1', 'm2'])

    expect(llamadas).toHaveLength(2)
    expect(llamadas[0].url).toContain('/usuarios/uid-1/medidas/m1')
    expect(llamadas[1].url).toContain('/usuarios/uid-1/medidas/m2')
  })

  it('borrar algo que ya no está es justo lo que queríamos que pasara', async () => {
    conSesion()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    const { borrarMedidas } = await cargarNube()

    await expect(borrarMedidas(['m1'])).resolves.toBeUndefined()
  })

  it('y sin nada que borrar no se llama a nadie', async () => {
    conSesion()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { borrarMedidas } = await cargarNube()

    await borrarMedidas([])

    expect(espia).not.toHaveBeenCalled()
  })
})

describe('sin nube configurada', () => {
  it('la app lo dice y no se inventa un servidor', async () => {
    montarNavegador()
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')
    vi.resetModules()
    const { hayNube, pedirEnlace } = await import('./cloud')

    expect(hayNube()).toBe(false)
    await expect(pedirEnlace('alberto@ejemplo.com')).rejects.toThrow(/no hay ninguna nube/i)
  })
})
