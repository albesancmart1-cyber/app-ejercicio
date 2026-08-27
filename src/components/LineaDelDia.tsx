/**
 * El día entero en una lista, en el orden en que ocurre.
 *
 * La app ya calculaba las nueve horas que van aquí —están todas en
 * `arcoDelDia`—, pero repartidas entre tres tarjetas y con nombres de
 * astrónomo: «orto», «umbral de 10°», «crepúsculo civil». Para decidir a qué
 * hora salir hay que traducir eso mentalmente cada vez, y eso es exactamente lo
 * que nadie hace dos días seguidos.
 *
 * Aquí van en fila, con el nombre de lo que **puedes hacer** en cada momento y
 * no el del fenómeno. Y con lo que ya pasó en gris: a las cinco de la tarde lo
 * único que importa es lo que queda por delante.
 *
 * ## Por qué estas nueve y no otras
 *
 * Cada una marca un cambio de qué recibe el cuerpo, y son cambios distintos:
 *
 *  - **Primera luz** (−6°) es cuando ya hay señal de fase aunque el sol no
 *    haya salido. Importa porque es la hora a la que mucha gente sí puede salir.
 *  - **Sale el sol** (−0,83°) es el disco cruzando el horizonte.
 *  - **Ultravioleta A** (10°) es cuando empieza el óxido nítrico y la
 *    vasodilatación.
 *  - **Ultravioleta B** (30°) es cuando empieza la vitamina D, y esa es la
 *    razón de que la ventana de sol útil sea mucho más corta que el día.
 *  - **Lo más alto** es el cénit: el minuto de más UVB del día.
 *  - Y las mismas cuatro de vuelta, más la **ventana de atardecer**, que es la
 *    señal que le dice al cuerpo que viene la noche, y el momento de las gafas.
 */
import { ALTURAS, arcoDelDia, escribirHora, type Coordenadas } from '../domain/arcoSolar'
import { MARGEN_ANTES_DEL_OCASO } from '../domain/relojes'

interface Hito {
  clave: string
  hora: number | null
  nombre: string
  /** Qué cambia, en una línea. */
  que: string
  /** La altura del sol que lo define, para que la cifra no salga de la nada. */
  altura?: number
  /** Los que marcan el principio o el final de algo que se aprovecha. */
  fuerte?: boolean
}

/** Todo el día, de la primera luz a la última, en orden. */
export function hitosDelDia(
  fechaIso: string,
  coord: Coordenadas,
  desfaseMin?: number
): Hito[] {
  const a = arcoDelDia(fechaIso, coord, desfaseMin)
  const ocaso = a.pasos.orto.tarde

  return [
    {
      clave: 'primera-luz',
      hora: a.pasos.civil.manana,
      nombre: 'Primera luz',
      que: 'Ya hay señal para el reloj aunque el sol no haya salido. Si solo puedes salir a esta hora, cuenta.',
      altura: ALTURAS.civil
    },
    {
      clave: 'sale',
      hora: a.pasos.orto.manana,
      nombre: 'Sale el sol',
      que: 'El disco cruza el horizonte.',
      altura: ALTURAS.orto
    },
    {
      clave: 'uva-inicia',
      hora: a.pasos.uva.manana,
      nombre: 'Empieza el ultravioleta A',
      que: 'Óxido nítrico y vasodilatación. Todavía no hay vitamina D.',
      altura: ALTURAS.uva,
      fuerte: true
    },
    {
      clave: 'uvb-inicia',
      hora: a.pasos.uvb.manana,
      nombre: 'Empieza el ultravioleta B',
      que: 'Aquí y no antes empieza la vitamina D. Es la ventana corta del día.',
      altura: ALTURAS.uvb,
      fuerte: true
    },
    {
      clave: 'cenit',
      hora: a.mediodiaSolar,
      nombre: 'Lo más alto',
      que: `El sol llega a ${Math.round(a.elevacionMaxima)}°. Es el minuto de más ultravioleta B del día.`
    },
    {
      clave: 'uvb-termina',
      hora: a.pasos.uvb.tarde,
      nombre: 'Se acaba el ultravioleta B',
      que: 'Se cierra la vitamina D. Lo que quede de tarde ya no la fabrica.',
      altura: ALTURAS.uvb,
      fuerte: true
    },
    {
      clave: 'uva-termina',
      hora: a.pasos.uva.tarde,
      nombre: 'Se acaba el ultravioleta A',
      que: 'Se cierra la luz que penetra. Lo que viene es señal de fase, no dosis.',
      altura: ALTURAS.uva
    },
    {
      clave: 'atardecer',
      hora: ocaso === null ? null : ocaso - MARGEN_ANTES_DEL_OCASO,
      nombre: 'Sal a ver el atardecer',
      que: 'El cambio de proporción entre el rojo y el azul es lo que le dice al cuerpo que viene la noche. Dura poco.',
      fuerte: true
    },
    {
      clave: 'ocaso',
      hora: ocaso,
      nombre: 'Se pone el sol',
      que: 'El disco cruza el horizonte por el otro lado.',
      altura: ALTURAS.orto
    },
    {
      clave: 'ultima-luz',
      hora: a.pasos.civil.tarde,
      nombre: 'Última luz · gafas',
      que: 'Se acaba el atardecer. A partir de aquí, o luz baja y cálida, o las gafas puestas.',
      altura: ALTURAS.civil,
      fuerte: true
    }
  ]
}

export default function LineaDelDia({
  hoy,
  coord,
  ahoraMin,
  desfaseMin
}: {
  hoy: string
  coord: Coordenadas
  /** Minutos desde medianoche, para saber qué ya pasó. */
  ahoraMin: number
  desfaseMin?: number
}) {
  const hitos = hitosDelDia(hoy, coord, desfaseMin)
  // Lo que hoy no ocurre —en verano polar el sol no se pone— no se inventa.
  const hay = hitos.filter((h) => h.hora !== null)
  if (hay.length === 0) return null

  const siguiente = hay.find((h) => h.hora! > ahoraMin)

  return (
    <div className="card">
      <p className="eyebrow">Tu día, hora a hora</p>
      <p className="faint" style={{ marginBottom: 10 }}>
        Lo que cambia en cada momento, no el nombre del fenómeno. En gris, lo que ya ha pasado.
      </p>

      {hay.map((h) => {
        const pasado = h.hora! <= ahoraMin
        const esElProximo = siguiente?.clave === h.clave
        return (
          <div
            key={h.clave}
            style={{ padding: '8px 0', opacity: pasado ? 0.45 : 1 }}
          >
            <div className="row">
              <span className={h.fuerte && !pasado ? undefined : 'dim'}>
                {h.fuerte && !pasado ? <strong>{h.nombre}</strong> : h.nombre}
                {esElProximo && <span className="faint"> · ahora viene esto</span>}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{escribirHora(h.hora)}</span>
            </div>
            <p className="faint" style={{ marginTop: 2 }}>
              {h.que}
              {h.altura !== undefined && ` (sol a ${h.altura}°)`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
