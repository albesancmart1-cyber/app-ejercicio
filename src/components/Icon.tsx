/** Iconografía de línea, 1,5 px, sin relleno. */
const paths: Record<string, JSX.Element> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  horizon: (
    <>
      <path d="M3 18h18" />
      <path d="M7 18a5 5 0 0 1 10 0" />
      <path d="M12 4v3M5.6 7.6l1.5 1.5M18.4 7.6l-1.5 1.5" />
    </>
  ),
  body: (
    <>
      <circle cx="12" cy="5" r="2.4" />
      <path d="M12 8v7M12 15l-3 6M12 15l3 6M6.5 10.5L12 9l5.5 1.5" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-8 5-13 16-14 0 10-5 15-13 15H4z" />
      <path d="M9 15c2-3 5-5 8-6" />
    </>
  ),
  plate: (
    <>
      <circle cx="11" cy="13" r="7.5" />
      <circle cx="11" cy="13" r="3.5" />
      <path d="M20.5 4v16" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
}

export default function Icon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
