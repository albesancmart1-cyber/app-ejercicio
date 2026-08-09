/**
 * La alarma de fin de descanso.
 *
 * No es una notificación: es un **sonido que sale del móvil ahí mismo**. Y esa
 * diferencia importa, porque una notificación necesita permiso, puede llegar
 * tarde, la silencia el modo concentración y en una PWA de iOS ni siquiera
 * existe. Un pitido sintetizado en el momento no depende de nada de eso.
 *
 * Va con osciladores en vez de con un archivo de audio por tres motivos: no
 * pesa ni un byte, funciona sin conexión y se puede afinar —el tono que corta
 * el ruido de un gimnasio no es el mismo que suena bien en casa—.
 *
 * **La pega de los móviles**: el navegador no deja sonar nada que no venga de
 * un gesto del usuario. Por eso `prepararAlarma()` se llama al marcar la serie
 * —que es un toque— y deja el audio despierto para cuando la cuenta atrás
 * llegue a cero, dos minutos después, sin que nadie toque nada.
 */

/** Un pulso de la alarma: cuándo suena, a qué tono y cuánto dura. */
export interface Pulso {
  /** Segundos desde el arranque de la alarma. */
  en: number
  /** Frecuencia en hercios. */
  hz: number
  /** Duración en segundos. */
  dura: number
}

/**
 * Tres pulsos cortos y ascendentes.
 *
 * Cortos porque una alarma larga en un gimnasio molesta a todo el mundo;
 * ascendentes porque un tono que sube se reconoce como «se acabó» y no como
 * «error»; y tres porque con uno solo no te enteras y con cinco parece una
 * urgencia.
 *
 * El registro está entre 800 y 1200 Hz a propósito: es donde el oído humano es
 * más sensible y donde menos ruido de fondo hay en una sala de pesas, con las
 * máquinas y la música por debajo.
 */
export function pulsosDeAlarma(): Pulso[] {
  return [
    { en: 0, hz: 880, dura: 0.16 },
    { en: 0.26, hz: 880, dura: 0.16 },
    { en: 0.52, hz: 1174, dura: 0.34 }
  ]
}

let contexto: AudioContext | null = null

type ConWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext }

function crearContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Clase = window.AudioContext ?? (globalThis as ConWebkit).webkitAudioContext
  if (!Clase) return null
  try {
    return new Clase()
  } catch {
    return null
  }
}

/** ¿Puede este navegador hacer sonar la alarma? */
export function soportaAlarma(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.AudioContext ?? (globalThis as ConWebkit).webkitAudioContext)
}

/**
 * Despierta el audio. **Hay que llamarlo desde un gesto del usuario** —marcar
 * una serie, pulsar un botón—, o el navegador dejará el contexto suspendido y
 * al terminar la cuenta atrás no sonará nada.
 */
export function prepararAlarma(): void {
  if (!contexto) contexto = crearContexto()
  if (contexto?.state === 'suspended') void contexto.resume()
}

/**
 * Suena. Devuelve `false` si no ha podido —sin soporte o con el audio
 * bloqueado—, para que quien llame pueda quedarse solo con la vibración.
 */
export function sonarAlarma(volumen = 0.5): boolean {
  if (!contexto) contexto = crearContexto()
  if (!contexto) return false
  if (contexto.state === 'suspended') void contexto.resume()
  if (contexto.state !== 'running') return false

  const ahora = contexto.currentTime
  for (const p of pulsosDeAlarma()) {
    const osc = contexto.createOscillator()
    const gan = contexto.createGain()
    // Onda triangular: tiene algo más de cuerpo que la senoidal —se oye con
    // ruido alrededor— sin el filo áspero de la cuadrada.
    osc.type = 'triangle'
    osc.frequency.value = p.hz

    // Subida y bajada suaves. Un corte seco produce un chasquido que suena a
    // aparato roto, y aquí lo que se busca es avisar, no asustar.
    const inicio = ahora + p.en
    gan.gain.setValueAtTime(0.0001, inicio)
    gan.gain.exponentialRampToValueAtTime(Math.max(0.0002, volumen), inicio + 0.012)
    gan.gain.exponentialRampToValueAtTime(0.0001, inicio + p.dura)

    osc.connect(gan).connect(contexto.destination)
    osc.start(inicio)
    osc.stop(inicio + p.dura + 0.02)
  }
  return true
}

/** Cuánto dura la alarma entera, para no solaparla consigo misma. */
export function duracionDeAlarma(): number {
  const ps = pulsosDeAlarma()
  return Math.max(...ps.map((p) => p.en + p.dura))
}
