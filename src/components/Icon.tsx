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
  /*
   * Los de la rejilla de «Medir». Mismo trazo y misma rejilla que los de la
   * barra: a tamaño de baldosa lo que hace que se distingan de un vistazo es la
   * silueta, no el detalle, así que ninguno pasa de cuatro trazos.
   */
  /* Sol saliendo por detrás del horizonte, con la flecha hacia arriba. */
  amanecer: (
    <>
      <path d="M3.2 19.2h17.6" />
      <path d="M7.6 15.4a4.4 4.4 0 0 1 8.8 0" />
      <path d="M12 2.8v4.2M12 2.8L9.7 5.1M12 2.8l2.3 2.3" />
      <path d="M4.3 9.1l1.6 1.6M19.7 9.1l-1.6 1.6" />
    </>
  ),
  /* El mismo, con la flecha hacia abajo. Es la única diferencia, y basta. */
  atardecer: (
    <>
      <path d="M3.2 19.2h17.6" />
      <path d="M7.6 15.4a4.4 4.4 0 0 1 8.8 0" />
      <path d="M12 7.4V3.2M12 7.4L9.7 5.1M12 7.4l2.3-2.3" />
      <path d="M4.3 9.1l1.6 1.6M19.7 9.1l-1.6 1.6" />
    </>
  ),
  /* Una puerta abierta: estar fuera. */
  fuera: (
    <>
      <path d="M14.4 3.4H5.2v17.2h9.2" />
      <path d="M18.8 12H10.2" />
      <path d="M15.2 8.4L18.8 12l-3.6 3.6" />
    </>
  ),
  /* Una nave con su tejado de dientes de sierra: el sitio de trabajo. */
  trabajo: (
    <>
      <rect x="3.2" y="7.4" width="17.6" height="12.8" rx="2.4" />
      <path d="M8.8 7.4V5.6a2.2 2.2 0 0 1 2.2-2.2h2a2.2 2.2 0 0 1 2.2 2.2v1.8" />
      <path d="M3.2 12.6h17.6" />
    </>
  ),
  /* Un foco con su haz: la lámpara de fotobiomodulación. */
  lampara: (
    <>
      <path d="M7.4 3.6h9.2l1.8 5.2H5.6z" />
      <path d="M12 8.8v4.4" />
      <path d="M8.6 16.6h6.8M9.8 20.4h4.4" />
    </>
  ),
  /* Copo de nieve: el frío. */
  frio: (
    <>
      <path d="M12 2.8v18.4M4 7.4l16 9.2M20 7.4L4 16.6" />
      <path d="M9.6 5.2L12 7.6l2.4-2.4M9.6 18.8L12 16.4l2.4 2.4" />
    </>
  ),
  /* Dos pisadas: descalzo en el suelo. */
  descalzo: (
    <>
      {/* La planta del pie, y encima sus cinco dedos. */}
      <path d="M15.4 20.8c-2.7 0-4.4-1.7-4.4-4.3 0-2.1 1-3.4 1-5.1 0-1-.4-1.9-.4-1.9h7.6s-.4.9-.4 1.9c0 1.7 1 3 1 5.1 0 2.6-1.7 4.3-4.4 4.3z" />
      <circle cx="11.2" cy="6.9" r="1" />
      <circle cx="14" cy="5.5" r="1" />
      <circle cx="16.8" cy="5.2" r="1" />
      <circle cx="19.2" cy="5.9" r="1" />
      <circle cx="21" cy="7.4" r="1" />
    </>
  ),
  /* Una taza: el café o lo que abra la ventana de comida. */
  cafe: (
    <>
      <path d="M4.4 8.6h12.2v6a4 4 0 0 1-4 4H8.4a4 4 0 0 1-4-4z" />
      <path d="M16.6 10.4h1.8a2.4 2.4 0 0 1 0 4.8h-1.8" />
      <path d="M8 5.4V3.2M12.4 5.4V3.2" />
    </>
  ),
  /* Cronómetro: la pestaña de medir, que va de empezar y parar. */
  medir: (
    <>
      <circle cx="12" cy="13.6" r="7.4" />
      <path d="M12 9.6v4h3.1" />
      <path d="M9.6 2.6h4.8" />
      <path d="M12 2.6v3.6" />
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
  /* Lápiz: corregir algo ya apuntado, sin tener que borrarlo y repetirlo. */
  pencil: (
    <>
      <path d="M15.5 4.9l3.6 3.6L8.4 19.2l-4.3.7.7-4.3z" />
      <path d="M13.4 7l3.6 3.6" />
    </>
  ),
  /* Tres puntos: todo lo que no es la acción principal del momento. */
  dots: (
    <>
      <circle cx="5.2" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.8" cy="12" r="1.4" fill="currentColor" stroke="none" />
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

/** Los nombres que hay. Exportado para que quien pinte iconos no invente uno. */
export type IconName = keyof typeof paths

export default function Icon({ name, className }: { name: IconName; className?: string }) {
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
