/**
 * Que la pantalla no se apague mientras se entrena.
 *
 * Entre serie y serie pasan dos o tres minutos, más que de sobra para que el
 * móvil se bloquee. Desbloquearlo con las manos llenas de magnesio, doce veces
 * por sesión, es de las cosas que más estorban de registrar un entreno.
 *
 * Se apoya en la Screen Wake Lock del navegador, que no está en todas partes
 * —Safari la trae desde iOS 16.4— y **se suelta sola** cuando la pestaña pasa a
 * segundo plano. Eso último obliga a volver a pedirla al regresar, que es lo
 * que hace el escuchador de visibilidad.
 *
 * Todo lo de aquí es best-effort a propósito: si el navegador no lo soporta o
 * lo deniega, no se avisa ni se rompe nada. La app funciona igual, solo que hay
 * que desbloquear el móvil.
 */

type Centinela = { released: boolean; release: () => Promise<void> }

interface NavegadorConWakeLock {
  wakeLock?: { request: (tipo: 'screen') => Promise<Centinela> }
}

let centinela: Centinela | null = null
let queremos = false
let escuchando = false

export function soportaWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

async function pedir(): Promise<void> {
  if (!queremos || centinela !== null || !soportaWakeLock()) return
  try {
    centinela = await (navigator as NavegadorConWakeLock).wakeLock!.request('screen')
    // El navegador puede soltarlo por su cuenta —batería baja, por ejemplo—.
    // Enterarse permite volver a pedirlo cuando se pueda.
    ;(centinela as unknown as EventTarget).addEventListener?.('release', () => {
      centinela = null
    })
  } catch {
    /* denegado o no disponible: se entrena igual */
  }
}

/**
 * Al volver de segundo plano el bloqueo ya no existe: el navegador lo suelta al
 * ocultar la pestaña y no lo devuelve solo.
 */
function alVolver() {
  if (document.visibilityState === 'visible') void pedir()
}

export function mantenerPantalla(activo: boolean): void {
  queremos = activo
  if (activo) {
    if (!escuchando && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', alVolver)
      escuchando = true
    }
    void pedir()
    return
  }

  if (escuchando && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', alVolver)
    escuchando = false
  }
  const actual = centinela
  centinela = null
  void actual?.release().catch(() => {})
}

/** Para los tests y para saber si de verdad está puesto. */
export function pantallaRetenida(): boolean {
  return centinela !== null
}
