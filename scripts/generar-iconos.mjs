/**
 * Los iconos y las pantallas de carga del iPhone, generados del SVG.
 *
 * Instalada desde «Añadir a pantalla de inicio», una web en iOS arranca con un
 * **destello en blanco** hasta que el JavaScript pinta algo. Es lo único que
 * delata que no es una app nativa, y se quita con una imagen de arranque por
 * cada tamaño de pantalla: iOS elige la que encaje con una media query, y si no
 * encuentra ninguna enseña el blanco.
 *
 * No hay ImageMagick ni `sharp` en este proyecto y no hacía falta añadirlos:
 * Chromium ya está aquí para los recorridos de navegador, así que se renderiza
 * el SVG y se hace una captura. La imagen sale exactamente con los colores del
 * tema porque sale del mismo fichero que el icono.
 *
 *   node scripts/generar-iconos.mjs
 */
import { chromium } from 'playwright-core'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const SVG = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf-8')
const FONDO = '#000000'

/**
 * Cada iPhone que sigue en circulación, con su tamaño en puntos, su densidad y
 * el nombre de los modelos que lo usan.
 *
 * iOS empareja por `device-width`, `device-height` y `-webkit-device-pixel-ratio`
 * exactos: si falta uno, ese modelo se queda con el destello en blanco. Por eso
 * la lista es larga y no una talla única.
 */
const PANTALLAS = [
  { w: 320, h: 568, dpr: 2, modelos: 'SE 1.ª' },
  { w: 375, h: 667, dpr: 2, modelos: '8, SE 2.ª y 3.ª' },
  { w: 414, h: 736, dpr: 3, modelos: '8 Plus' },
  { w: 375, h: 812, dpr: 3, modelos: 'X, XS, 11 Pro, 12 mini, 13 mini' },
  { w: 414, h: 896, dpr: 2, modelos: 'XR, 11' },
  { w: 414, h: 896, dpr: 3, modelos: 'XS Max, 11 Pro Max' },
  { w: 390, h: 844, dpr: 3, modelos: '12, 13, 14' },
  { w: 428, h: 926, dpr: 3, modelos: '12 y 13 Pro Max, 14 Plus' },
  { w: 393, h: 852, dpr: 3, modelos: '14 Pro, 15, 15 Pro, 16' },
  { w: 430, h: 932, dpr: 3, modelos: '15 Plus, 15 Pro Max, 16 Plus' },
  { w: 402, h: 874, dpr: 3, modelos: '16 Pro' },
  { w: 440, h: 956, dpr: 3, modelos: '16 Pro Max' }
]

/** Los iconos sueltos. 180 es el que usa iOS en la pantalla de inicio. */
const ICONOS = [
  { px: 180, nombre: 'icon-180.png' },
  { px: 192, nombre: 'icon-192.png' },
  { px: 512, nombre: 'icon-512.png' }
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})

const raiz = new URL('../public/', import.meta.url)
const escribir = (nombre, buffer) => writeFileSync(new URL(nombre, raiz), buffer)

/** El SVG solo, a tamaño exacto. */
for (const { px, nombre } of ICONOS) {
  const page = await browser.newPage({ viewport: { width: px, height: px } })
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${SVG}`
  )
  escribir(nombre, await page.screenshot({ omitBackground: true }))
  await page.close()
}

/**
 * El SVG centrado sobre el fondo del tema, al tamaño de cada pantalla.
 *
 * El icono va al 28 % del ancho, que es más o menos lo que ocupa el logotipo en
 * la pantalla de carga de una app nativa: más grande parece un cartel y más
 * pequeño no se ve.
 */
const listado = []
for (const p of PANTALLAS) {
  const ancho = p.w * p.dpr
  const alto = p.h * p.dpr
  const nombre = `splash-${ancho}x${alto}.png`
  const lado = Math.round(ancho * 0.28)

  const page = await browser.newPage({ viewport: { width: ancho, height: alto } })
  await page.setContent(
    `<style>
       html,body{margin:0;padding:0;height:100%;background:${FONDO}}
       body{display:flex;align-items:center;justify-content:center}
       svg{display:block;width:${lado}px;height:${lado}px}
     </style>${SVG}`
  )
  escribir(nombre, await page.screenshot())
  await page.close()

  listado.push(
    `    <!-- ${p.modelos} -->\n` +
      `    <link\n` +
      `      rel="apple-touch-startup-image"\n` +
      `      media="(device-width: ${p.w}px) and (device-height: ${p.h}px) and (-webkit-device-pixel-ratio: ${p.dpr}) and (orientation: portrait)"\n` +
      `      href="/${nombre}"\n` +
      `    />`
  )
}

/*
 * Y lo mismo para el contenedor nativo, si está.
 *
 * Capacitor genera su icono y su pantalla de arranque **en blanco**, que es
 * justo el destello que las de arriba existen para quitar: dejarlos como vienen
 * significaría que la app instalada desde Xcode arranca peor que la instalada
 * desde Safari.
 *
 * Van al catálogo de recursos de Xcode, no a `public/`, y por eso se escriben
 * aquí y no a mano: son los mismos píxeles del mismo SVG.
 */
const IOS = new URL('../ios/App/App/Assets.xcassets/', import.meta.url)
let iosHechos = 0
if (existsSync(IOS)) {
  const icono = async (px, transparente) => {
    const page = await browser.newPage({ viewport: { width: px, height: px } })
    await page.setContent(
      `<style>html,body{margin:0;padding:0;background:${transparente ? 'transparent' : FONDO}}svg{display:block;width:${px}px;height:${px}px}</style>${SVG}`
    )
    const png = await page.screenshot({ omitBackground: transparente })
    await page.close()
    return png
  }

  // El icono de la app: 1024 y sin transparencia, que iOS no la admite aquí.
  writeFileSync(new URL('AppIcon.appiconset/AppIcon-512@2x.png', IOS), await icono(1024, false))
  iosHechos++

  // La pantalla de arranque: cuadrada de 2732, que es como la quiere Xcode para
  // poder recortarla a cualquier pantalla. El icono, al 22 % — más pequeño que
  // en las de Safari porque aquí el lienzo es cuadrado y se recorta por los lados.
  const lado = Math.round(2732 * 0.22)
  const page = await browser.newPage({ viewport: { width: 2732, height: 2732 } })
  await page.setContent(
    `<style>
       html,body{margin:0;padding:0;height:100%;background:${FONDO}}
       body{display:flex;align-items:center;justify-content:center}
       svg{display:block;width:${lado}px;height:${lado}px}
     </style>${SVG}`
  )
  const arranque = await page.screenshot()
  await page.close()
  for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    writeFileSync(new URL(`Splash.imageset/${n}`, IOS), arranque)
    iosHechos++
  }
}

await browser.close()

// Se deja escrito el bloque que va en index.html, para no teclearlo a mano ni
// que se descuadre si algún día cambia la lista de pantallas.
writeFileSync(new URL('../scripts/pantallas-de-carga.html', import.meta.url), listado.join('\n') + '\n')

console.log(
  `✓ ${ICONOS.length} iconos, ${PANTALLAS.length} pantallas de carga` +
    (iosHechos > 0 ? ` y ${iosHechos} recursos del contenedor nativo` : '')
)
