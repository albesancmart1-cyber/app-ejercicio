/**
 * El símbolo de Ritmo: el sol saliendo sobre tres líneas que se acortan.
 *
 * Va en `currentColor`, así que hereda el acento de la hora del día igual que
 * el resto de la interfaz. Es el mismo dibujo que el icono de la app —lo genera
 * `scripts/logo.mjs`—, sin el fondo ni la silueta.
 */
export default function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="232 232 560 696" fill="currentColor" aria-hidden="true">
      <circle cx="512" cy="424" r="168" />
      <rect x="256" y="664" width="512" height="52" rx="26" />
      <rect x="332" y="758" width="360" height="52" rx="26" opacity="0.62" />
      <rect x="427" y="852" width="170" height="52" rx="26" opacity="0.34" />
    </svg>
  )
}
