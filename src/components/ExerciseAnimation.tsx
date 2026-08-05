import { PATTERN_CUES, type MovementPattern } from '../data/patterns'

/**
 * Muñeco esquemático que recorre el patrón de movimiento.
 *
 * Se anima con SMIL (`<animate>` sobre los puntos de la polilínea): sin
 * JavaScript, sin dependencias y sin pedir nada a la red, que es lo que permite
 * que funcione con la app instalada y sin conexión. Quien tenga activado el
 * ajuste de reducir movimiento ve la pose inicial congelada.
 */

const DUR = '2.6s'

/** Vaivén A → B → A, para que el bucle no dé saltos. */
function Ciclo({ from, to }: { from: string; to: string }) {
  return (
    <animate
      attributeName="points"
      values={`${from}; ${to}; ${from}`}
      dur={DUR}
      repeatCount="indefinite"
      calcMode="spline"
      keyTimes="0; 0.5; 1"
      keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
    />
  )
}

function Cabeza({ from, to }: { from: [number, number]; to: [number, number] }) {
  return (
    <circle className="head" cx={from[0]} cy={from[1]} r="5.5">
      <animate attributeName="cx" values={`${from[0]}; ${to[0]}; ${from[0]}`} dur={DUR} repeatCount="indefinite" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
      <animate attributeName="cy" values={`${from[1]}; ${to[1]}; ${from[1]}`} dur={DUR} repeatCount="indefinite" calcMode="spline" keyTimes="0; 0.5; 1" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
    </circle>
  )
}

const Suelo = () => <line className="ground" x1="8" y1="92" x2="92" y2="92" />

/**
 * Convención común para que todas las figuras sean legibles y comparables:
 * la figura mira a la derecha, el suelo está en y=92 y de pie va de pie(45,90)
 * a cabeza(45,22). Las cadenas van de la parte apoyada hacia la libre.
 */
const FIGURAS: Record<MovementPattern, JSX.Element> = {
  // Rodilla adelante, cadera atrás y abajo, tronco algo inclinado.
  sentadilla: (
    <>
      <Suelo />
      <polyline className="limb" points="45,90 45,68 45,50 45,30 58,34">
        <Ciclo from="45,90 45,68 45,50 45,30 58,34" to="45,90 54,70 36,62 44,44 57,42" />
      </polyline>
      <Cabeza from={[45, 22]} to={[46, 36]} />
    </>
  ),
  zancada: (
    <>
      <Suelo />
      <polyline className="limb" points="62,90 58,66 48,46 38,68 28,90">
        <Ciclo from="62,90 58,66 48,46 38,68 28,90" to="62,90 64,66 50,64 38,84 28,90" />
      </polyline>
      <polyline className="limb" points="48,46 46,26">
        <Ciclo from="48,46 46,26" to="50,64 48,42" />
      </polyline>
      <Cabeza from={[46, 19]} to={[48, 35]} />
    </>
  ),
  // La cadera va atrás y el tronco cae; las rodillas casi no se doblan.
  bisagra: (
    <>
      <Suelo />
      <polyline className="limb" points="45,90 45,68 45,50 45,30 47,44">
        <Ciclo from="45,90 45,68 45,50 45,30 47,44" to="45,90 43,68 36,52 58,46 58,62" />
      </polyline>
      <Cabeza from={[45, 22]} to={[66, 44]} />
    </>
  ),
  puente: (
    <>
      <Suelo />
      <polyline className="limb" points="26,84 46,84 60,70 60,88">
        <Ciclo from="26,84 46,84 60,70 60,88" to="26,84 46,66 62,68 62,88" />
      </polyline>
      <Cabeza from={[19, 82]} to={[19, 82]} />
    </>
  ),
  curl_femoral: (
    <>
      <Suelo />
      <polyline className="limb" points="24,86 48,86 68,86 84,86">
        <Ciclo from="24,86 48,86 68,86 84,86" to="24,86 48,86 68,86 66,60" />
      </polyline>
      <Cabeza from={[17, 84]} to={[17, 84]} />
    </>
  ),
  // Manos fijas en la barra; el cuerpo sube y el codo se abre.
  traccion_vertical: (
    <>
      <line className="ground" x1="24" y1="15" x2="76" y2="15" />
      <polyline className="limb" points="50,17 50,32 50,44 50,64 50,84">
        <Ciclo from="50,17 50,32 50,44 50,64 50,84" to="50,17 41,30 50,36 50,56 50,76" />
      </polyline>
      <Cabeza from={[58, 41]} to={[58, 33]} />
    </>
  ),
  traccion_horizontal: (
    <>
      <Suelo />
      <polyline className="limb" points="34,90 38,66 48,46">
        <Ciclo from="34,90 38,66 48,46" to="34,90 38,66 48,46" />
      </polyline>
      <polyline className="limb" points="48,46 52,62 54,78">
        <Ciclo from="48,46 52,62 54,78" to="48,46 39,58 52,60" />
      </polyline>
      <Cabeza from={[56, 42]} to={[56, 42]} />
    </>
  ),
  empuje_horizontal: (
    <>
      <Suelo />
      <polyline className="limb" points="24,84 44,74 64,64">
        <Ciclo from="24,84 44,74 64,64" to="24,80 44,68 64,54" />
      </polyline>
      <polyline className="limb" points="64,64 56,76 68,88">
        <Ciclo from="64,64 56,76 68,88" to="64,54 67,71 68,88" />
      </polyline>
      <Cabeza from={[72, 61]} to={[72, 50]} />
    </>
  ),
  empuje_vertical: (
    <>
      <Suelo />
      <polyline className="limb" points="45,90 45,60 45,34">
        <Ciclo from="45,90 45,60 45,34" to="45,90 45,60 45,34" />
      </polyline>
      <polyline className="limb" points="45,34 34,44 42,50">
        <Ciclo from="45,34 34,44 42,50" to="45,34 40,22 44,10" />
      </polyline>
      <Cabeza from={[52, 27]} to={[52, 27]} />
    </>
  ),
  extension_espalda: (
    <>
      <Suelo />
      <polyline className="limb" points="20,84 46,84 74,84">
        <Ciclo from="20,84 46,84 74,84" to="20,72 46,84 74,72" />
      </polyline>
      <Cabeza from={[14, 84]} to={[12, 71]} />
    </>
  ),
  flexion_codo: (
    <>
      <Suelo />
      <polyline className="limb" points="42,90 44,62 46,36">
        <Ciclo from="42,90 44,62 46,36" to="42,90 44,62 46,36" />
      </polyline>
      <polyline className="limb" points="46,36 46,58 58,64">
        <Ciclo from="46,36 46,58 58,64" to="46,36 46,58 52,40" />
      </polyline>
      <Cabeza from={[49, 28]} to={[49, 28]} />
    </>
  ),
  extension_codo: (
    <>
      <Suelo />
      <polyline className="limb" points="42,90 44,60 46,32">
        <Ciclo from="42,90 44,60 46,32" to="42,90 44,60 46,32" />
      </polyline>
      <polyline className="limb" points="46,32 52,20 40,28">
        <Ciclo from="46,32 52,20 40,28" to="46,32 52,20 58,10" />
      </polyline>
      <Cabeza from={[52, 26]} to={[52, 26]} />
    </>
  ),
  isometrico: (
    <>
      <Suelo />
      <polyline className="limb" points="24,84 46,74 68,64">
        <Ciclo from="24,84 46,74 68,64" to="24,85 46,75 68,65" />
      </polyline>
      <polyline className="limb" points="68,64 62,84 76,84">
        <Ciclo from="68,64 62,84 76,84" to="68,65 62,84 76,84" />
      </polyline>
      <Cabeza from={[75, 60]} to={[75, 61]} />
    </>
  ),
  core_dinamico: (
    <>
      <Suelo />
      <polyline className="limb" points="32,80 58,80">
        <Ciclo from="32,80 58,80" to="32,80 58,80" />
      </polyline>
      <polyline className="limb" points="58,80 66,64 74,66">
        <Ciclo from="58,80 66,64 74,66" to="58,80 70,70 84,74" />
      </polyline>
      <polyline className="limb" points="36,80 30,64 26,54">
        <Ciclo from="36,80 30,64 26,54" to="36,80 26,68 16,72" />
      </polyline>
      <Cabeza from={[25, 79]} to={[25, 79]} />
    </>
  ),
  // Suspendido entre dos barras: las manos no se mueven y lo que sube y baja es
  // el cuerpo entero. El brazo pasa de estirado a doblado en ángulo recto, que
  // es justo hasta donde dice el aviso que hay que bajar.
  fondo: (
    <>
      {/* Las paralelas, a la altura de las manos. */}
      <line className="ground" x1="20" y1="40" x2="40" y2="40" />
      <line className="ground" x1="60" y1="40" x2="80" y2="40" />
      {/* Brazo: hombro → codo → mano, con la mano clavada en la barra. */}
      <polyline className="limb" points="46,44 46,42 66,40">
        <Ciclo from="46,44 46,42 66,40" to="46,62 58,54 66,40" />
      </polyline>
      {/* Tronco y piernas colgando, algo recogidas. */}
      <polyline className="limb" points="46,44 47,62 45,78 52,86">
        <Ciclo from="46,44 47,62 45,78 52,86" to="46,62 47,80 45,90 52,92" />
      </polyline>
      <Cabeza from={[46, 34]} to={[46, 52]} />
    </>
  ),
  // De pie, el cuerpo entero sube unos centímetros al elevar el talón.
  extension_tobillo: (
    <>
      <Suelo />
      <polyline className="limb" points="45,90 45,68 45,48 45,30 56,36">
        <Ciclo from="45,90 45,68 45,48 45,30 56,36" to="45,90 47,62 47,42 47,24 58,30" />
      </polyline>
      {/* El pie: el talón despega y el peso pasa a la punta. */}
      <polyline className="limb" points="45,90 54,90">
        <Ciclo from="45,90 54,90" to="49,84 56,90" />
      </polyline>
      <Cabeza from={[45, 22]} to={[47, 16]} />
    </>
  ),
  cardio: (
    <>
      <Suelo />
      <polyline className="limb" points="34,90 42,68 50,90">
        <Ciclo from="34,90 42,68 50,90" to="50,88 42,68 34,88" />
      </polyline>
      <polyline className="limb" points="42,68 44,42">
        <Ciclo from="42,68 44,42" to="42,68 44,42" />
      </polyline>
      <polyline className="limb" points="44,42 34,52 36,62">
        <Ciclo from="44,42 34,52 36,62" to="44,42 54,52 52,62" />
      </polyline>
      <Cabeza from={[45, 35]} to={[45, 34]} />
    </>
  )
}

export default function ExerciseAnimation({ pattern }: { pattern: MovementPattern }) {
  return (
    <>
      <svg
        className="exercise-anim"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Animación esquemática del patrón: ${pattern}`}
      >
        {FIGURAS[pattern]}
      </svg>
      <ul className="reasons">
        {PATTERN_CUES[pattern].map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      <p className="faint" style={{ marginTop: 10 }}>
        Es un esquema del movimiento, para salir de dudas sobre la dirección y qué se mueve. No
        sustituye a que alguien te vea y te corrija.
      </p>
    </>
  )
}
