/**
 * Qué parte de un entreno cuenta como estar al aire libre.
 *
 * ## El rato que no contaba en ninguna parte
 *
 * Un entreno de fuerza de hora y media es, en su mayoría, **descanso**. Dos
 * minutos entre series repetidos veinte veces son cuarenta minutos, y si esos
 * cuarenta minutos se pasan en la puerta del gimnasio, al sol, son cuarenta
 * minutos de calle que la app no apuntaba en ningún sitio. Peor: contaba el
 * bloque entero como tiempo de entreno y punto, como si durante hora y media no
 * hubiera existido luz de ninguna clase.
 *
 * ## Cómo se cuenta el descanso, y por qué así
 *
 * No se inventa. Se suman **los descansos que el propio plan prescribió** para
 * las series que de verdad se registraron. Es un dato que ya está guardado, no
 * una estimación: si el plan puso noventa segundos entre series y tú anotaste
 * doce series, son dieciocho minutos de descanso prescrito.
 *
 * Se queda corto a propósito. El descanso real suele ser algo mayor que el
 * prescrito —uno se entretiene—, y entre ejercicios hay dos minutos que también
 * se cuentan. Preferimos quedarnos por debajo: apuntar de menos deja tu día
 * algo más pobre de lo que fue, y apuntar de más te lo inventa.
 */
import { DESCANSO_ENTRE_EJERCICIOS } from './protocol'
import type { EntornoDeEntreno, Session } from './types'

/**
 * Los minutos de descanso de una sesión, sumando lo prescrito.
 *
 * Las series de calentamiento cuentan: también se descansa entre ellas. Lo que
 * no cuenta es el descanso después de la última serie del último ejercicio,
 * porque ahí ya no se descansa para nada, se termina.
 */
export function minutosDeDescanso(sesion: Session): number {
  let segundos = 0

  const hechas = (i: number) => (sesion.exercises[i]?.logs ?? []).filter((l) => l.done).length

  sesion.exercises.forEach((ej, i) => {
    if (hechas(i) === 0) return

    // Entre las series de este ejercicio hay un descanso menos que series.
    segundos += Math.max(0, hechas(i) - 1) * (ej.plan?.restSeconds ?? 0)

    /*
     * Y uno entre ejercicios, pero solo si de verdad viniste de este al
     * siguiente. Si dejaste la sesión a medias, no descansaste hacia un
     * ejercicio que nunca hiciste: paraste.
     */
    const sigue = sesion.exercises.some((_, j) => j > i && hechas(j) > 0)
    if (sigue) segundos += DESCANSO_ENTRE_EJERCICIOS
  })

  return Math.round(segundos / 60)
}

/**
 * Los minutos de una sesión que cuentan como estar al aire libre.
 *
 * Tres casos y ninguno más. Entrenar fuera cuenta entero — estabas fuera todo
 * el rato—. Entrenar dentro y salir en los descansos cuenta los descansos.
 * Entrenar dentro sin salir no cuenta nada, que también es una respuesta.
 */
export function minutosFueraDelEntreno(sesion: Session): number {
  const e = sesion.entorno
  if (!e) return 0
  if (e.fuera) return minutosDeSesion(sesion)
  if (e.descansosFuera) return Math.min(minutosDeDescanso(sesion), minutosDeSesion(sesion))
  return 0
}

/**
 * Cuánto duró la sesión, en minutos.
 *
 * Con `durationSec` es exacto. Sin él —la sesión sigue abierta— se cuenta
 * contra el reloj desde que se pulsó empezar, igual que hace el cronómetro.
 */
export function minutosDeSesion(sesion: Session, ahoraMs = Date.now()): number {
  if (sesion.durationSec !== undefined) return Math.round(sesion.durationSec / 60)
  if (sesion.startedAt === undefined) return 0
  return Math.max(0, Math.round((ahoraMs - sesion.startedAt) / 60000))
}

/** Si el entorno describe algo, o está vacío y no vale la pena enseñarlo. */
export function hayEntorno(e: EntornoDeEntreno | undefined): boolean {
  if (!e) return false
  return Boolean(e.perfilLuzId || e.fuera || e.descansosFuera || e.lamparasAmbiente?.length)
}
