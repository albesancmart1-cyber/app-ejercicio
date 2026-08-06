import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Lo que se prueba aquí es el trato con Supabase, que es donde se puede meter
 * la pata en silencio: mandar algo que la API no reconoce no da error, se
 * ignora y el fallo aparece dos pasos más allá, cuando el enlace del correo
 * lleva a un sitio que no es.
 */

const NUBE = 'https://falso.supabase.co'
const APP = 'https://albesancmart1-cyber.github.io'
const RUTA = '/app-ejercicio/'

/** Un navegador de mentira: solo lo que cloud.ts toca de verdad. */
function montarNavegador(hash = '') {
  const guardado = new Map<string, string>()
  const sitio = { origin: APP, pathname: RUTA, search: '', hash }
  vi.stubGlobal('location', sitio)
  vi.stubGlobal('history', {
    replaceState: (_e: unknown, _t: unknown, url: string) => {
      sitio.hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''
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
  vi.stubEnv('VITE_SUPABASE_URL', NUBE)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-publica')
  vi.resetModules()
  return import('./cloud')
}

/** Apunta las llamadas para poder mirarlas después. */
function espiarLlamadas() {
  const llamadas: { url: string; cuerpo: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      llamadas.push({ url, cuerpo: init.body ? JSON.parse(String(init.body)) : null })
      return new Response('{}', { status: 200 })
    })
  )
  return llamadas
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('pedir el enlace del correo', () => {
  it('manda la dirección de vuelta donde la API la lee: en la URL', async () => {
    // El fallo que esto vigila: mandarla en el cuerpo como `emailRedirectTo`
    // —que es lo que acepta la biblioteca de Supabase, no su API— hacía que
    // Supabase la ignorase y el enlace volviera al «Site URL» del proyecto,
    // que es la raíz del dominio y ahí no hay ninguna app.
    montarNavegador()
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    expect(llamadas).toHaveLength(1)
    const { searchParams } = new URL(llamadas[0].url)
    expect(searchParams.get('redirect_to')).toBe(`${APP}${RUTA}`)
  })

  it('y esa dirección es la de la app, no la raíz del dominio', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    const vuelta = new URL(llamadas[0].url).searchParams.get('redirect_to')!
    expect(vuelta).toContain('/app-ejercicio/')
    expect(vuelta).not.toBe(`${APP}/`)
  })

  it('el cuerpo lleva el correo y crea la cuenta si no existe', async () => {
    montarNavegador()
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    expect(llamadas[0].cuerpo).toEqual({ email: 'alberto@ejemplo.com', create_user: true })
  })

  it('abriéndola por index.html, la vuelta sigue siendo la carpeta de la app', async () => {
    const { sitio } = montarNavegador()
    sitio.pathname = '/app-ejercicio/index.html'
    const llamadas = espiarLlamadas()
    const { pedirEnlace } = await cargarNube()

    await pedirEnlace('alberto@ejemplo.com')

    expect(new URL(llamadas[0].url).searchParams.get('redirect_to')).toBe(`${APP}${RUTA}`)
  })
})

/**
 * Entrar con código.
 *
 * Existe porque en iOS la app instalada en la pantalla de inicio tiene su
 * propio almacén, separado del de Safari, y el enlace del correo siempre abre
 * Safari. Por enlace es imposible entrar en la app instalada.
 */
describe('entrar tecleando el código del correo', () => {
  /** Un Supabase que solo acepta el código con una etiqueta concreta. */
  function nubeQueAcepta(tipoBueno: string) {
    const intentos: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit = {}) => {
        const cuerpo = JSON.parse(String(init.body))
        intentos.push(cuerpo.type)
        if (cuerpo.type !== tipoBueno) return new Response('{}', { status: 403 })
        return new Response(
          JSON.stringify({
            access_token: 'tok',
            refresh_token: 'ref',
            expires_in: 3600,
            user: { email: 'alberto@ejemplo.com' }
          }),
          { status: 200 }
        )
      })
    )
    return intentos
  }

  it('con una cuenta que ya existía, el código entra', async () => {
    const { guardado } = montarNavegador()
    nubeQueAcepta('email')
    const { entrarConCodigo } = await cargarNube()

    const sesion = await entrarConCodigo('alberto@ejemplo.com', '123456')

    expect(sesion.accessToken).toBe('tok')
    expect(sesion.email).toBe('alberto@ejemplo.com')
    expect(guardado.get('ritmo-sesion')).toBeTruthy()
  })

  it('y con una cuenta recién creada también, aunque la API lo etiquete distinto', async () => {
    // El correo de confirmación de una cuenta nueva lleva el código con otro
    // tipo, y desde el cliente no hay forma de saber cuál de los dos vino.
    montarNavegador()
    const intentos = nubeQueAcepta('signup')
    const { entrarConCodigo } = await cargarNube()

    await entrarConCodigo('alberto@ejemplo.com', '123456')

    expect(intentos).toContain('email')
    expect(intentos).toContain('signup')
  })

  it('deja de probar en cuanto uno funciona', async () => {
    montarNavegador()
    const intentos = nubeQueAcepta('email')
    const { entrarConCodigo } = await cargarNube()

    await entrarConCodigo('alberto@ejemplo.com', '123456')

    expect(intentos).toEqual(['email'])
  })

  it('el código va sin espacios ni guiones, se escriba como se escriba', async () => {
    montarNavegador()
    const enviados: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u: string, init: RequestInit = {}) => {
        enviados.push(JSON.parse(String(init.body)).token)
        return new Response(
          JSON.stringify({ access_token: 't', refresh_token: 'r', expires_in: 3600 }),
          { status: 200 }
        )
      })
    )
    const { entrarConCodigo } = await cargarNube()

    await entrarConCodigo('alberto@ejemplo.com', '123 456')

    expect(enviados[0]).toBe('123456')
  })

  it('un código corto ni se manda: se avisa y punto', async () => {
    montarNavegador()
    const espia = vi.fn()
    vi.stubGlobal('fetch', espia)
    const { entrarConCodigo, ErrorNube } = await cargarNube()

    await expect(entrarConCodigo('alberto@ejemplo.com', '123')).rejects.toBeInstanceOf(ErrorNube)
    expect(espia).not.toHaveBeenCalled()
  })

  it('un código que no vale se explica, no se traga', async () => {
    montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })))
    const { entrarConCodigo } = await cargarNube()

    await expect(entrarConCodigo('alberto@ejemplo.com', '000000')).rejects.toThrow(
      /no vale|caducado|usado/i
    )
  })

  it('y si falla no deja media sesión guardada', async () => {
    const { guardado } = montarNavegador()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })))
    const { entrarConCodigo } = await cargarNube()

    await entrarConCodigo('alberto@ejemplo.com', '000000').catch(() => {})

    expect(guardado.get('ritmo-sesion')).toBeUndefined()
  })
})

describe('cuando el enlace vuelve con un fallo', () => {
  it('lo cuenta en castellano en vez de quedarse callada', async () => {
    montarNavegador(
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    )
    const { recogerFalloDeLaUrl } = await cargarNube()

    const queja = recogerFalloDeLaUrl()

    expect(queja).toMatch(/ya no vale/i)
    expect(queja).toMatch(/pide otro/i)
  })

  it('y limpia la barra de direcciones, que el error no tiene que quedarse ahí', async () => {
    const { sitio } = montarNavegador('#error_code=otp_expired')
    const { recogerFalloDeLaUrl } = await cargarNube()

    recogerFalloDeLaUrl()

    expect(sitio.hash).toBe('')
  })

  it('un fallo que no conocemos se enseña tal cual, con su código', async () => {
    montarNavegador('#error_code=server_error&error_description=Algo+ha+ido+mal')
    const { recogerFalloDeLaUrl } = await cargarNube()

    expect(recogerFalloDeLaUrl()).toBe('El enlace ha fallado (server_error). Algo ha ido mal')
  })

  it('sin fallo en la URL no inventa ninguno', async () => {
    montarNavegador('#access_token=tok&refresh_token=ref')
    const { recogerFalloDeLaUrl } = await cargarNube()

    expect(recogerFalloDeLaUrl()).toBeNull()
  })

  it('ni con la URL limpia', async () => {
    montarNavegador()
    const { recogerFalloDeLaUrl } = await cargarNube()

    expect(recogerFalloDeLaUrl()).toBeNull()
  })
})
