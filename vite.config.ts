import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Evita traer @types/node entero solo por leer una variable de entorno.
declare const process: { env: Record<string, string | undefined> }

// Marca de construcción: se enseña en Ajustes para poder comprobar de un
// vistazo si el móvil ya tiene la versión nueva o sigue con la cacheada.
const CONSTRUIDA = new Date().toISOString()

export default defineConfig({
  define: { __BUILD_TIME__: JSON.stringify(CONSTRUIDA) },
  // GitHub Pages sirve el proyecto bajo /app-ejercicio/. En local se queda en la
  // raíz, para que `npm run dev`, `npm run preview` y el recorrido e2e no cambien.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        /*
         * El service worker de la app tiene ámbito `/app-ejercicio/`, que
         * incluye `/app-ejercicio/cata/` —donde se publica la cata de interfaz
         * para poder mirarla en el móvil—. Sin esta línea, cualquier navegación
         * ahí dentro caería en el `index.html` de la app de verdad y verías la
         * app creyendo que ves la cata.
         */
        navigateFallbackDenylist: [/\/cata\//]
      },
      manifest: {
        name: 'Ritmo — entrena con tu cuerpo',
        short_name: 'Ritmo',
        description:
          'Entrenamiento que acompaña: escucha tu cuerpo, respeta tus ritmos y te recomienda el entreno que necesitas hoy.',
        lang: 'es',
        display: 'standalone',
        // Deben coincidir con --bg del tema, o la barra de estado y la pantalla
        // de carga del móvil desentonan con la app.
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'node'
  }
} as any)
