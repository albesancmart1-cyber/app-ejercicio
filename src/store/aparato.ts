/**
 * Cómo se llama este aparato.
 *
 * Existe por una frase: cuando el ordenador enseña que el sol lleva corriendo
 * veinte minutos, tiene que poder decir **dónde** empezó. Una baldosa que
 * aparece encendida sola, sin explicación, se lee como un fallo de la app y no
 * como lo que es.
 *
 * Se adivina del navegador y se guarda, para que siga siendo el mismo nombre
 * mañana. No identifica a nadie ni sale de aquí más que dentro de los datos de
 * la propia cuenta: es una etiqueta para leer, no un identificador.
 */
const CLAVE = 'ritmo-aparato'

function adivinar(): string {
  const ua = navigator.userAgent
  if (/iPad/.test(ua)) return 'el iPad'
  if (/iPhone/.test(ua)) return 'el iPhone'
  if (/Android/.test(ua)) return 'el móvil'
  if (/Macintosh/.test(ua)) return 'el Mac'
  if (/Windows/.test(ua)) return 'el ordenador'
  if (/Linux/.test(ua)) return 'el ordenador'
  return 'otro dispositivo'
}

export function nombreDeEsteAparato(): string {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) return guardado
    const nuevo = adivinar()
    localStorage.setItem(CLAVE, nuevo)
    return nuevo
  } catch {
    return adivinar()
  }
}

/** Para poder cambiarlo si «el ordenador» no distingue entre dos ordenadores. */
export function ponerNombreDeAparato(nombre: string): void {
  try {
    localStorage.setItem(CLAVE, nombre.trim() || adivinar())
  } catch {
    /* almacén bloqueado: se queda con el adivinado */
  }
}
