import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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
    tailwindcss(),
    /*
     * Dentro del contenedor nativo no hay service worker: los archivos ya están
     * en el aparato, así que no añadiría nada y sí podría servir una versión
     * vieja después de actualizar. `npm run build:ios` pone `SIN_SW`.
     */
    ...(process.env.SIN_SW ? [] : [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        /*
         * Las pantallas de carga se quedan fuera del precacheado a propósito.
         * Son 1,2 MB que la app **nunca pide**: quien las lee es iOS, al abrir
         * desde la pantalla de inicio y antes de que el service worker exista.
         * Meterlas dentro triplicaría lo que hay que descargar la primera vez a
         * cambio de nada.
         */
        globIgnores: ['**/splash-*.png']
      },
      manifest: {
        name: 'Ritmo — entrena con tu cuerpo',
        short_name: 'Ritmo',
        description:
          'Entrenamiento que acompaña: escucha tu cuerpo, respeta tus ritmos y te recomienda el entreno que necesitas hoy.',
        lang: 'es',
        // `id` fija la identidad de la app instalada: sin él, cambiar el
        // `start_url` algún día haría que el móvil la trate como otra app
        // distinta y quien la tuviera puesta se quedaría con la vieja.
        id: '/app-ejercicio/',
        display: 'standalone',
        // Vertical y bloqueada: la app se usa con una mano, de pie en la calle,
        // y girándola no hay nada que ganar.
        orientation: 'portrait',
        categories: ['health', 'fitness', 'lifestyle'],
        // Deben coincidir con --bg del tema, o la barra de estado y la pantalla
        // de carga del móvil desentonan con la app.
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
    ])
  ],
  test: {
    environment: 'node'
  }
} as any)
