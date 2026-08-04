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
