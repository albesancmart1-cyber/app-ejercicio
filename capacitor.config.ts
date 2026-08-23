/**
 * Ritmo dentro de un contenedor nativo.
 *
 * Esto **no sustituye** a la web instalada desde «Añadir a pantalla de inicio»,
 * que sigue siendo la vía sin Mac, sin Xcode y sin pagar nada. Existe por una
 * sola razón: un proyecto de Xcode es el único sitio donde puede vivir una app
 * de watchOS, y sin él no hay reloj posible.
 *
 * Lo que hay dentro es exactamente la misma app: el mismo `dist/`, el mismo
 * `localStorage`, la misma nube. No hay una segunda versión que mantener.
 *
 * ## Lo que cambia respecto a la web
 *
 *  - **La ruta base.** En GitHub Pages la app vive en `/app-ejercicio/`; aquí
 *    se sirve desde la raíz de `capacitor://localhost`, así que hay que
 *    construir con `npm run build:ios`, que la deja relativa.
 *  - **Sin service worker.** Dentro del contenedor los archivos ya están en el
 *    aparato: un service worker no añadiría nada y sí puede servir una versión
 *    vieja después de actualizar. `build:ios` lo desactiva.
 */
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ritmo.app',
  appName: 'Ritmo',
  webDir: 'dist',
  ios: {
    // El fondo del contenedor, para que no se vea un blanco entre que arranca
    // la vista y pinta la app. Es el mismo negro del tema.
    backgroundColor: '#000000',
    // La app ya se ocupa de las zonas seguras con `viewport-fit=cover`.
    contentInset: 'never'
  },
  // Sin plugins: Ritmo no pide cámara, ni ubicación, ni nada del aparato. Todo
  // lo que calcula —el arco del sol incluido— sale de dos números y la fecha.
  plugins: {}
}

export default config
