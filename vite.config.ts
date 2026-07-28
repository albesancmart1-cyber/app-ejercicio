import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Evita traer @types/node entero solo por leer una variable de entorno.
declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  // GitHub Pages sirve el proyecto bajo /app-ejercicio/. En local se queda en la
  // raíz, para que `npm run dev`, `npm run preview` y el recorrido e2e no cambien.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
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
