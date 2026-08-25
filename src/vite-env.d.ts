/// <reference types="vite/client" />

/** Momento en que se construyó esta versión. Lo inyecta `vite.config.ts`. */
declare const __BUILD_TIME__: string

/**
 * Dónde vive la nube, si la hay. Son valores **públicos**: la clave de la API
 * web de Firebase identifica al proyecto, no autoriza nada. Lo que protege los
 * datos son las reglas de Firestore (`firebase/firestore.rules`), que atan cada
 * documento a la sesión de su dueño.
 *
 * Sin estas dos, la app funciona igual pero guardando solo en este dispositivo.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
