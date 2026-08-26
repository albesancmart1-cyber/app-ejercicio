import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Lo que se prueba aquí es el trato con Firebase, que es donde se puede meter
 * la pata en silencio: mandarle algo que su API no reconoce no siempre da
 * error, y el fallo aparece dos pasos más allá.
 *
 * Y sobre todo, lo que **no** puede pasar: que una contraseña se quede
 * guardada, que un fallo deje media sesión, o que el atajo de «entrar o crear»
 * acabe contándole a cualquiera qué correos tienen cuenta.
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

/** Lo que devuelve Firebase cuando el correo y la contraseña valen. */
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

describe('entrar con contraseña', () => {
  it('manda correo y contraseña al endpoint de contraseña, no al del enlace', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas(SESION_BUENA)
    const { entrar } = await cargarNube()

    await entrar('alberto@ejemplo.com', 'unacontraseña')

    expect(llamadas[0].url).toContain('accounts:signInWithPassword')
    expect(llamadas[0].cuerpo).toEqual({
      email: 'alberto@ejemplo.com',
      password: 'unacontraseña',
      returnSecureToken: true
    })
  })

  it('la clave del proyecto va en la URL, que es donde Firebase la lee', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas(SESION_BUENA)
    const { entrar } = await cargarNube()

    await entrar('alberto@ejemplo.com', 'unacontraseña')

    expect(new URL(llamadas[0].url).searchParams.get('key')).toBe(CLAVE)
  })

  it('guarda la sesión con el uid, que es el nombre del documento en Firestore', async () => {
    const { guardado } = montarNavegador()
    espiarLlamadas(SESION_BUENA)
    const { entrar } = await cargarNube()

    const sesion = await entrar('alberto@ejemplo.com', 'unacontraseña')

    expect(sesion.uid).toBe('uid-1')
    expect(JSON.parse(guardado.get('ritmo-sesion')!).uid).toBe('uid-1')
  })

  it('recuerda el correo para no teclearlo la próxima vez — y la contraseña no', async () => {
    const { guardado } = montarNavegador()
    espiarLlamadas(SESION_BUENA)
    const { entrar, ultimoCorreo } = await cargarNube()

    await entrar('  alberto@ejemplo.com  ', 'unacontraseña')

    expect(ultimoCorreo()).toBe('alberto@ejemplo.com')
    expect(JSON.stringify([...guardado.values()])).not.toContain('unacontraseña')
  })

  it('una contraseña corta ni se manda: se avisa desde aquí', async () => {
    // Un viaje de ida y vuelta para que te digan lo que se sabe desde aquí, y
    // encima contando para el límite de intentos de Firebase.
    montarNavegador()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { entrar } = await cargarNube()

    await expect(entrar('alberto@ejemplo.com', 'corta')).rejects.toThrow(/caracteres/i)
    expect(espia).not.toHaveBeenCalled()
  })

  it('y un correo sin arroba tampoco', async () => {
    montarNavegador()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { entrar } = await cargarNube()

    await expect(entrar('alberto', 'unacontraseña')).rejects.toThrow(/correo/i)
    expect(espia).not.toHaveBeenCalled()
  })

  it('unas credenciales que no valen se explican sin decir cuál de las dos falla', async () => {
    /*
     * Firebase dejó de distinguir «ese correo no existe» de «esa contraseña no
     * es» a propósito, para que nadie averigüe qué correos tienen cuenta
     * probando. El mensaje tiene que cubrir los dos casos.
     */
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('INVALID_LOGIN_CREDENTIALS')))
    const { entrar } = await cargarNube()

    await expect(entrar('alberto@ejemplo.com', 'loquesea')).rejects.toThrow(
      /correo o la contraseña/i
    )
  })

  it('y si falla no deja media sesión guardada', async () => {
    const { guardado } = montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('INVALID_LOGIN_CREDENTIALS')))
    const { entrar } = await cargarNube()

    await entrar('alberto@ejemplo.com', 'loquesea').catch(() => {})

    expect(guardado.get('ritmo-sesion')).toBeUndefined()
  })
})

describe('entrar o crear la cuenta con el mismo botón', () => {
  /** Un Firebase donde solo existe la cuenta que se diga. */
  function nubeCon(cuentaExiste: boolean) {
    const rutas: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        rutas.push(new URL(url).pathname)
        if (url.includes('signInWithPassword') && !cuentaExiste) {
          return falloDeFirebase('INVALID_LOGIN_CREDENTIALS')
        }
        return new Response(JSON.stringify(SESION_BUENA), { status: 200 })
      })
    )
    return rutas
  }

  it('con la cuenta hecha, entra y no intenta crear nada', async () => {
    montarNavegador()
    const rutas = nubeCon(true)
    const { entrarOCrear } = await cargarNube()

    await entrarOCrear('alberto@ejemplo.com', 'unacontraseña')

    expect(rutas.join(' ')).toContain('signInWithPassword')
    expect(rutas.join(' ')).not.toContain('signUp')
  })

  it('y sin cuenta, la crea', async () => {
    montarNavegador()
    const rutas = nubeCon(false)
    const { entrarOCrear } = await cargarNube()

    const sesion = await entrarOCrear('alberto@ejemplo.com', 'unacontraseña')

    expect(sesion.uid).toBe('uid-1')
    expect(rutas.join(' ')).toContain('signUp')
  })

  it('prueba a entrar primero, y ese orden no es casual', async () => {
    /*
     * Al revés —crear y caerse a entrar— cualquiera podría averiguar qué
     * correos tienen cuenta, porque el fallo «ese correo ya existe» lo dice.
     */
    montarNavegador()
    const rutas = nubeCon(false)
    const { entrarOCrear } = await cargarNube()

    await entrarOCrear('alberto@ejemplo.com', 'unacontraseña')

    expect(rutas[0]).toContain('signInWithPassword')
  })

  it('equivocarse de contraseña no contesta «ya hay una cuenta con ese correo»', async () => {
    /*
     * Con la cuenta hecha y la contraseña mal, entrar falla y crear falla
     * también —con EMAIL_EXISTS—. Dejar salir ese segundo mensaje le contestaba
     * «ya hay una cuenta con ese correo» a quien acababa de teclear mal su
     * propia contraseña. El fallo que hay que contar es el primero.
     */
    montarNavegador()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        falloDeFirebase(url.includes('signUp') ? 'EMAIL_EXISTS' : 'INVALID_LOGIN_CREDENTIALS')
      )
    )
    const { entrarOCrear } = await cargarNube()

    await expect(entrarOCrear('alberto@ejemplo.com', 'noeslabuena')).rejects.toThrow(
      /correo o la contraseña/i
    )
  })

  it('un fallo que no es de credenciales no se arregla creando cuentas', async () => {
    // Un proyecto mal montado o un corte de red no son «no tienes cuenta».
    montarNavegador()
    const rutas: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        rutas.push(new URL(url).pathname)
        return falloDeFirebase('OPERATION_NOT_ALLOWED')
      })
    )
    const { entrarOCrear } = await cargarNube()

    await expect(entrarOCrear('alberto@ejemplo.com', 'unacontraseña')).rejects.toThrow(
      /Sign-in method|Email\/Password/i
    )
    expect(rutas.join(' ')).not.toContain('signUp')
  })
})

describe('los fallos de montaje se cuentan diciendo qué falta', () => {
  it('el acceso por contraseña apagado manda a la pantalla exacta', async () => {
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('OPERATION_NOT_ALLOWED')))
    const { entrar } = await cargarNube()

    await expect(entrar('alberto@ejemplo.com', 'unacontraseña')).rejects.toThrow(
      /Sign-in method|Email\/Password/i
    )
  })

  it('un correo ya registrado se explica sin dejar al usuario atascado', async () => {
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('EMAIL_EXISTS')))
    const { crearCuenta } = await cargarNube()

    await expect(crearCuenta('alberto@ejemplo.com', 'unacontraseña')).rejects.toThrow(
      /Ya hay una cuenta/i
    )
  })
})

describe('la contraseña olvidada', () => {
  it('pide el enlace al correo, diciéndole a Firebase de qué va', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas({})
    const { pedirNuevaContrasena } = await cargarNube()

    await pedirNuevaContrasena('alberto@ejemplo.com')

    expect(llamadas[0].url).toContain('accounts:sendOobCode')
    expect(llamadas[0].cuerpo?.requestType).toBe('PASSWORD_RESET')
  })

  it('y la vuelta apunta a esta app, no a la raíz del dominio', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas({})
    const { pedirNuevaContrasena } = await cargarNube()

    await pedirNuevaContrasena('alberto@ejemplo.com')

    expect(llamadas[0].cuerpo?.continueUrl).toBe(`${APP}${RUTA}`)
  })

  it('el testigo se lee de la URL y se limpia la barra de direcciones', async () => {
    const { sitio } = montarNavegador('?mode=resetPassword&oobCode=abc123&apiKey=k')
    const { codigoDeResetEnLaUrl } = await cargarNube()

    expect(codigoDeResetEnLaUrl()).toBe('abc123')
    expect(sitio.search).toBe('')
  })

  it('un enlace de otra cosa no se confunde con este', async () => {
    montarNavegador('?mode=verifyEmail&oobCode=abc123')
    const { codigoDeResetEnLaUrl } = await cargarNube()

    expect(codigoDeResetEnLaUrl()).toBeNull()
  })

  it('poner la nueva entra con ella sin pedirla dos veces', async () => {
    // El paso más absurdo posible sería teclear la contraseña nueva y que la
    // pantalla la pida otra vez para entrar.
    montarNavegador()
    const rutas: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        rutas.push(new URL(url).pathname)
        if (url.includes('resetPassword')) {
          return new Response(JSON.stringify({ email: 'alberto@ejemplo.com' }), { status: 200 })
        }
        return new Response(JSON.stringify(SESION_BUENA), { status: 200 })
      })
    )
    const { ponerNuevaContrasena } = await cargarNube()

    const sesion = await ponerNuevaContrasena('abc123', 'lanuevacontraseña')

    expect(rutas.join(' ')).toContain('accounts:resetPassword')
    expect(rutas.join(' ')).toContain('accounts:signInWithPassword')
    expect(sesion.uid).toBe('uid-1')
  })

  it('un enlace gastado se explica, no se traga', async () => {
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => falloDeFirebase('EXPIRED_OOB_CODE')))
    const { ponerNuevaContrasena } = await cargarNube()

    await expect(ponerNuevaContrasena('abc123', 'lanuevacontraseña')).rejects.toThrow(
      /ya no vale|pide otro/i
    )
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
    const { cerrarSesion } = await cargarNube()

    cerrarSesion()

    expect(guardado.get('ritmo-sesion')).toBeUndefined()
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
    const { hayNube, entrar } = await import('./cloud')

    expect(hayNube()).toBe(false)
    await expect(entrar('alberto@ejemplo.com', 'unacontraseña')).rejects.toThrow(
      /no hay ninguna nube/i
    )
  })
})
