/// <reference types="vite/client" />

/** Momento en que se construyó esta versión. Lo inyecta `vite.config.ts`. */
declare const __BUILD_TIME__: string

/**
 * Dónde vive la nube, si la hay. Son valores **públicos**: la clave anónima de
 * Supabase no abre nada por sí sola, porque la base de datos tiene el
 * aislamiento por filas activado y cada fila pide la sesión de su dueño.
 * Sin estas dos, la app funciona igual pero guardando solo en este dispositivo.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
