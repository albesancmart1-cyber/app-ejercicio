/**
 * Iconografía de línea al modo de los símbolos del sistema: rejilla de 24,
 * trazo de 1,8, remates redondos y construcción geométrica —círculos y arcos
 * completos, no siluetas dibujadas a mano—. A tamaño de barra de navegación es
 * lo que hace que se lean de un vistazo.
 */
import type { JSX } from 'react'
const paths: Record<string, JSX.Element> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
    </>
  ),
  /* Sol sobre el horizonte: la pestaña de hoy. */
  horizon: (
    <>
      <path d="M2.8 18.5h18.4" />
      <path d="M7.2 18.5a4.8 4.8 0 0 1 9.6 0" />
      <path d="M12 4.2v2.4M5.6 7.4l1.7 1.7M18.4 7.4l-1.7 1.7M2.9 13.6h2.4M18.7 13.6h2.4" />
    </>
  ),
  /* Figura de pie: la pestaña del cuerpo. */
  body: (
    <>
      <circle cx="12" cy="4.6" r="2.1" />
      <path d="M12 8.1v6.4" />
      <path d="M12 14.5l-2.9 5.9M12 14.5l2.9 5.9" />
      <path d="M7.2 10.4L12 9.1l4.8 1.3" />
    </>
  ),
  /* Hoja: la pestaña de ajustes, que va de hábitos. */
  leaf: (
    <>
      <path d="M4.4 19.6c-.6-8 4.6-13.4 15.2-14.4.9 10.3-4.4 15.4-12.4 15.4H4.4z" />
      <path d="M8.6 15.4c2.1-3.1 5.1-5.3 8.4-6.4" />
    </>
  ),
  /* Plato y cubierto: la pestaña de la mesa. */
  plate: (
    <>
      <circle cx="10.2" cy="12.6" r="7.2" />
      <circle cx="10.2" cy="12.6" r="3.2" />
      <path d="M20.6 4.2v16.2" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.2l1.85 4.95L18.8 10l-4.95 1.85L12 16.8l-1.85-4.95L5.2 10l4.95-1.85z" />
      <path d="M18.4 15.6l.62 1.68 1.68.62-1.68.62-.62 1.68-.62-1.68-1.68-.62 1.68-.62z" />
    </>
  ),
  check: <path d="M4.5 12.6l4.9 4.9L19.6 7.2" />,
  chevron: <path d="M9.2 5.4l6.6 6.6-6.6 6.6" />,
  moon: <path d="M20.2 14.6A8.4 8.4 0 1 1 9.6 4.1a6.9 6.9 0 0 0 10.6 10.5z" />,
  /* Cerrar: para la hoja del catálogo de ejercicios. */
  close: <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />,
  /* Tres puntos: todo lo que no es la acción principal del momento. */
  dots: (
    <>
      <circle cx="5.2" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.8" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  /* Dos cartas, una tras otra: la pestaña de la pirámide. */
  cards: (
    <>
      <rect x="8.4" y="4.6" width="11.2" height="14.8" rx="2" />
      <path d="M15.8 20.9H6.4a2 2 0 0 1-2-2V8.6" />
    </>
  ),
  /* Lista: volver a ver todos los ejercicios de la sesión. */
  list: (
    <>
      <path d="M9 6.4h11M9 12h11M9 17.6h11" />
      <circle cx="4.6" cy="6.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="17.6" r="1.05" fill="currentColor" stroke="none" />
    </>
  )
}

export default function Icon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
