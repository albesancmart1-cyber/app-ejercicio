import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        background_color: '#1c1633',
        theme_color: '#1c1633',
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
