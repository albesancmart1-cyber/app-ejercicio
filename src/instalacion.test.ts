/**
 * Que la app siga instalándose bien en el iPhone.
 *
 * Estas cosas no fallan ruidosamente: nadie se entera de que falta una pantalla
 * de carga hasta que abre la app un martes de madrugada y le da un flash blanco
 * a pantalla completa en la cara. Y no se descubre en el móvil de quien lo
 * rompió, porque su modelo sí tenía la suya.
 *
 * Así que se comprueban aquí, contra los ficheros de verdad: el `index.html`
 * que se sirve y las imágenes que hay en `public/`.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RAIZ = resolve(__dirname, '..')
const HTML = readFileSync(resolve(RAIZ, 'index.html'), 'utf-8')
const CONFIG = readFileSync(resolve(RAIZ, 'vite.config.ts'), 'utf-8')

/** Cada `apple-touch-startup-image`, con su media query y su fichero. */
function pantallasDeCarga(): { media: string; href: string }[] {
  const out: { media: string; href: string }[] = []
  const re = /rel="apple-touch-startup-image"\s+media="([^"]+)"\s+href="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(HTML)) !== null) out.push({ media: m[1], href: m[2] })
  return out
}

describe('la instalación en el iPhone', () => {
  it('se abre a pantalla completa, sin barras de Safari', () => {
    expect(HTML).toContain('name="apple-mobile-web-app-capable" content="yes"')
    expect(CONFIG).toContain("display: 'standalone'")
  })

  it('lleva nombre corto, o iOS corta el título largo bajo el icono', () => {
    expect(HTML).toContain('name="apple-mobile-web-app-title" content="Ritmo"')
  })

  it('el icono de la pantalla de inicio es de 180 px, que es el que usa iOS', () => {
    expect(HTML).toMatch(/rel="apple-touch-icon" sizes="180x180" href="\/icon-180\.png"/)
    expect(existsSync(resolve(RAIZ, 'public/icon-180.png'))).toBe(true)
  })

  it('la barra de estado no desentona con el fondo de la app', () => {
    expect(HTML).toContain('content="black-translucent"')
    expect(HTML).toContain('name="theme-color" content="#000000"')
  })
})

describe('las pantallas de carga', () => {
  const pantallas = pantallasDeCarga()

  it('hay una por cada iPhone en circulación', () => {
    // iOS empareja por tamaño y densidad exactos: el modelo que no encuentre la
    // suya se queda con el destello en blanco, que es justo lo que se quita.
    expect(pantallas.length).toBeGreaterThanOrEqual(12)
  })

  it('todas existen de verdad en public/', () => {
    const faltan = pantallas
      .map((p) => p.href.replace(/^\//, ''))
      .filter((f) => !existsSync(resolve(RAIZ, 'public', f)))
    expect(faltan).toEqual([])
  })

  it('cada una declara ancho, alto, densidad y orientación', () => {
    // Con que falte uno de los cuatro, iOS deja de emparejarla y no se entera
    // nadie: la imagen sigue estando y simplemente no se usa nunca.
    for (const p of pantallas) {
      expect(p.media, p.href).toContain('device-width')
      expect(p.media, p.href).toContain('device-height')
      expect(p.media, p.href).toContain('-webkit-device-pixel-ratio')
      expect(p.media, p.href).toContain('orientation: portrait')
    }
  })

  it('el nombre del fichero cuadra con los píxeles que declara su media query', () => {
    // Es el fallo más fácil de cometer al añadir un modelo a mano: copiar la
    // línea de al lado y cambiar solo la mitad.
    for (const p of pantallas) {
      const w = Number(/device-width: (\d+)px/.exec(p.media)![1])
      const h = Number(/device-height: (\d+)px/.exec(p.media)![1])
      const dpr = Number(/-webkit-device-pixel-ratio: (\d+)/.exec(p.media)![1])
      expect(p.href, p.media).toContain(`splash-${w * dpr}x${h * dpr}.png`)
    }
  })

  it('ninguna media query se repite: dos iguales dejan una imagen muerta', () => {
    const medias = pantallas.map((p) => p.media)
    expect(new Set(medias).size).toBe(medias.length)
  })

  it('no se precachean: son 1,2 MB que la app nunca pide', () => {
    // Las lee iOS al abrir desde la pantalla de inicio, antes de que el service
    // worker exista. Meterlas dentro triplicaría la primera descarga a cambio
    // de nada.
    expect(CONFIG).toContain("globIgnores: ['**/splash-*.png']")
  })
})

describe('el manifiesto', () => {
  it('tiene identidad fija, para que cambiar la ruta no cree una app nueva', () => {
    expect(CONFIG).toMatch(/id: '/)
  })

  it('se queda en vertical: se usa con una mano y de pie en la calle', () => {
    expect(CONFIG).toContain("orientation: 'portrait'")
  })

  it('el fondo del manifiesto es el mismo negro que el tema', () => {
    // Si no coinciden, la pantalla de carga del sistema y la app parpadean con
    // dos negros distintos, que se nota más de lo que parece.
    expect(CONFIG).toContain("background_color: '#000000'")
    expect(CONFIG).toContain("theme_color: '#000000'")
  })
})
