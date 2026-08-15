import { NOMBRE_NUMERO, esFigura, nombreDe, type Carta, type Palo } from '../data/baraja'

/**
 * Una carta de la baraja española, dibujada.
 *
 * Los cuatro palos van en SVG y no como texto ni emoji, que es lo único que
 * hace que esto se lea como una baraja española y no como cuatro letras de
 * colores: el oro es una moneda con su roseta, la copa un cáliz de pie ancho, la
 * espada una hoja recta con guarda, y el basto un tronco con sus nudos.
 *
 * Los números repiten el palo tantas veces como diga la carta, repartidos en
 * columnas como en la baraja de verdad. Las figuras —sota, caballo y rey— llevan
 * su propia silueta: de pie, a caballo y con corona.
 */

/** El color de cada palo. Oros y copas en rojo, espadas y bastos en oscuro. */
const COLOR: Record<Palo, string> = {
  oros: '#d98324',
  copas: '#c0392b',
  espadas: '#2c3e6b',
  bastos: '#6b4423'
}

/** El dibujo de cada palo, en una caja de 100 × 100. */
function Simbolo({ palo }: { palo: Palo }) {
  const c = COLOR[palo]
  if (palo === 'oros') {
    return (
      <g>
        <circle cx="50" cy="50" r="40" fill={c} stroke="#8a4f10" strokeWidth="3" />
        <circle cx="50" cy="50" r="31" fill="none" stroke="#8a4f10" strokeWidth="2" />
        {/* La roseta del centro: ocho pétalos, como en la moneda. */}
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="50"
            cy="32"
            rx="6"
            ry="13"
            fill="#f2c078"
            transform={`rotate(${i * 45} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="7" fill="#8a4f10" />
      </g>
    )
  }
  if (palo === 'copas') {
    return (
      <g fill={c} stroke="#8e2b21" strokeWidth="2.5" strokeLinejoin="round">
        {/* Cáliz: boca ancha, nudo y pie. */}
        <path d="M24 20 h52 l-6 26 a20 20 0 0 1 -40 0 z" />
        <rect x="45" y="63" width="10" height="14" />
        <path d="M30 88 h40 l-5 -11 h-30 z" />
        <ellipse cx="50" cy="20" rx="26" ry="6" fill="#e8756a" />
      </g>
    )
  }
  if (palo === 'espadas') {
    return (
      <g stroke="#1d2a4d" strokeWidth="3.5" strokeLinejoin="round">
        {/* Hoja ancha, guarda cruzada y empuñadura con pomo. Ancha a propósito:
            en la pirámide la carta mide 46 px y una hoja fina desaparecía. */}
        <path d="M50 6 l13 20 v34 h-26 v-34 z" fill="#c3cee2" />
        <path d="M50 26 v34" stroke="#8b98b5" strokeWidth="2.5" />
        <path d="M22 60 h56 v11 h-56 z" fill={c} />
        <rect x="42" y="71" width="16" height="15" fill={c} />
        <circle cx="50" cy="90" r="8" fill={c} />
      </g>
    )
  }
  return (
    <g stroke="#4a2e17" strokeWidth="3.5" strokeLinejoin="round">
      {/* Garrote con sus nudos y dos ramas cortadas: grueso, que es lo que
          distingue un basto de un palito. */}
      <path d="M38 94 l3 -76 a9 9 0 0 1 18 0 l3 76 z" fill={c} />
      <path d="M41 44 l-20 -13 8 18 z" fill={c} />
      <path d="M59 62 l20 -13 -8 18 z" fill={c} />
      <circle cx="50" cy="32" r="4.5" fill="#4a2e17" stroke="none" />
      <circle cx="50" cy="74" r="4.5" fill="#4a2e17" stroke="none" />
    </g>
  )
}

/**
 * Las tres figuras: sota de pie, caballo montado y rey sentado.
 *
 * Son siluetas, no retratos. La carta mide 46 px en la pirámide, así que lo que
 * tiene que distinguirlas de un vistazo es el contorno —un cuerpo alto, un
 * caballo de perfil, una corona sobre una figura ancha— y no el detalle, que a
 * ese tamaño se convierte en suciedad. Cada una sostiene además su palo, que es
 * como se sabe de qué figura se trata.
 */
const PIEL = '#f0d5b0'
const TINTA = '#3b2b1a'

function Sota({ c }: { c: string }) {
  return (
    <>
      {/* Gorro de paje, cabeza y una túnica que cae hasta abajo. */}
      <path d="M34 40 q12 -9 24 -3 l-3 7 h-20 z" fill={c} />
      <circle cx="45" cy="52" r="10" fill={PIEL} />
      {/* La túnica arranca justo bajo la barbilla: separada, la cabeza flotaba. */}
      <path d="M31 116 q1 -53 14 -53 q13 0 14 53 z" fill={c} />
      <path d="M45 90 h-13" />
    </>
  )
}

function Caballo({ c }: { c: string }) {
  return (
    <>
      {/* El caballo de perfil, mirando a la izquierda. */}
      <path d="M28 96 q-3 -22 18 -25 q16 -2 24 6 q7 7 6 19 z" fill="#a97c50" />
      {/* Cuello y cabeza. */}
      <path d="M38 76 q-4 -18 -13 -24 q-6 -4 -3 -8 q4 -3 9 1 q12 9 19 24 z" fill="#a97c50" />
      {/* Patas y cola. */}
      <path d="M34 96 v22M48 98 v20M64 96 v22" strokeWidth="5" stroke="#a97c50" />
      <path d="M76 92 q10 8 6 24" strokeWidth="4" />
      {/* El jinete: cabeza y torso, poco más. */}
      <circle cx="54" cy="46" r="8.5" fill={PIEL} />
      <path d="M44 74 q2 -19 10 -19 q9 0 11 19 z" fill={c} />
    </>
  )
}

function Rey({ c }: { c: string }) {
  return (
    <>
      {/* Corona de tres puntas. */}
      <path d="M31 40 l4 -13 l6 9 l4 -13 l4 13 l6 -9 l4 13 z" fill="#e0b23c" />
      <circle cx="45" cy="54" r="10.5" fill={PIEL} />
      {/* Manto ancho, cerrado contra la cabeza por la misma razón que la túnica
          de la sota: un hueco entre cabeza y cuerpo se lee como un fallo. */}
      <path d="M25 116 q3 -52 20 -52 q17 0 20 52 z" fill={c} />
      {/* La barba va **después** del manto: debajo se la comía entera, y es lo
          que distingue al rey de la sota cuando la corona no se aprecia. */}
      <path d="M35 58 q10 20 20 0 q-2 16 -10 16 q-8 0 -10 -16 z" fill="#ddd5c2" />
    </>
  )
}

function Figura({ carta }: { carta: Carta }) {
  const c = COLOR[carta.palo]
  return (
    <g stroke={TINTA} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none">
      {carta.numero === 10 && <Sota c={c} />}
      {carta.numero === 11 && <Caballo c={c} />}
      {carta.numero === 12 && <Rey c={c} />}
      {/* El palo que sostiene, arriba a la derecha. */}
      <g transform="translate(62 30) scale(0.32)">
        <Simbolo palo={carta.palo} />
      </g>
    </g>
  )
}

/** Dónde van los símbolos de cada número, en la caja de 100 × 140. */
const REPARTO: Record<number, [number, number][]> = {
  1: [[50, 70]],
  2: [
    [50, 42],
    [50, 98]
  ],
  3: [
    [50, 34],
    [50, 70],
    [50, 106]
  ],
  4: [
    [32, 42],
    [68, 42],
    [32, 98],
    [68, 98]
  ],
  5: [
    [32, 38],
    [68, 38],
    [50, 70],
    [32, 102],
    [68, 102]
  ],
  6: [
    [32, 34],
    [68, 34],
    [32, 70],
    [68, 70],
    [32, 106],
    [68, 106]
  ],
  7: [
    [32, 30],
    [68, 30],
    [32, 62],
    [68, 62],
    [50, 46],
    [32, 106],
    [68, 106]
  ]
}

export default function CartaEspanola({
  carta,
  bocaAbajo = false,
  className = ''
}: {
  carta?: Carta
  bocaAbajo?: boolean
  className?: string
}) {
  if (bocaAbajo || !carta) {
    return (
      <svg
        className={`carta carta-dorso ${className}`}
        viewBox="0 0 100 150"
        role="img"
        aria-label="Carta boca abajo"
      >
        <rect x="1.5" y="1.5" width="97" height="147" rx="9" fill="#7a2f2f" stroke="#4a1c1c" strokeWidth="3" />
        <rect x="9" y="9" width="82" height="132" rx="5" fill="none" stroke="#e0b23c" strokeWidth="2" />
        {/* Un enrejado sencillo, que es lo que llevan los dorsos de verdad. */}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`a${i}`} x1="9" y1={20 + i * 18} x2="91" y2={2 + i * 18} stroke="#a94b4b" strokeWidth="1.5" />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`b${i}`} x1="9" y1={2 + i * 18} x2="91" y2={20 + i * 18} stroke="#a94b4b" strokeWidth="1.5" />
        ))}
      </svg>
    )
  }

  const escala = esFigura(carta) ? null : REPARTO[carta.numero]
  /* El as lleva un solo símbolo y en la baraja de verdad va grande, ocupando
     casi la carta entera; con el mismo tamaño que un pip de un siete se
     quedaba en una mota en medio del cartón. */
  const tamano = carta.numero === 1 ? 0.62 : 0.28

  return (
    <svg
      className={`carta ${className}`}
      viewBox="0 0 100 150"
      role="img"
      aria-label={nombreDe(carta)}
    >
      <rect x="1.5" y="1.5" width="97" height="147" rx="9" fill="#fbf6e9" stroke="#c9b98f" strokeWidth="3" />

      {/* El número arriba a la izquierda, como en la baraja de verdad. */}
      <text x="9" y="20" className="carta-num" fill={COLOR[carta.palo]}>
        {carta.numero}
      </text>

      {escala ? (
        escala.map(([x, y], i) => (
          <g
            key={i}
            transform={`translate(${x - 50 * tamano} ${y - 50 * tamano}) scale(${tamano})`}
          >
            <Simbolo palo={carta.palo} />
          </g>
        ))
      ) : (
        <Figura carta={carta} />
      )}

      {/* Y el nombre de la figura abajo, que es como se cantan. */}
      {esFigura(carta) && (
        <text x="50" y="140" textAnchor="middle" className="carta-figura" fill={COLOR[carta.palo]}>
          {NOMBRE_NUMERO[carta.numero].toUpperCase()}
        </text>
      )}
    </svg>
  )
}
