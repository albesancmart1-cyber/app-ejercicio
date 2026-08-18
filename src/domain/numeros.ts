/**
 * Leer y escribir números como se escriben en español.
 *
 * Esto existe por un fallo concreto y caro: el peso se anotaba en un
 * `<input type="number">`, y al escribir **«102,5»** con la coma del teclado
 * español el navegador descartaba la coma en silencio y guardaba **1025**.
 * Un peso diez veces mayor no se ve raro en una casilla de dos dígitos y medio,
 * pero envenena el volumen semanal, la progresión de carga y los récords sin
 * que nadie se entere.
 *
 * La regla, entonces, es una: **al leer se aceptan las dos comas y al escribir
 * se usa siempre la nuestra.** Nada de confiar en lo que el navegador entienda
 * por número.
 */

/**
 * Lee lo que hay escrito en una casilla. Acepta coma o punto, se traga los
 * espacios y devuelve `undefined` para lo que no sea un número: vacío, texto
 * suelto o dos comas.
 *
 * Devolver `undefined` y no `0` es deliberado: una casilla en blanco significa
 * «no lo he anotado», que es distinto de «pesaba cero».
 */
export function leerNumero(texto: string): number | undefined {
  const limpio = texto.trim().replace(/\s/g, '').replace(',', '.')
  if (limpio === '' || limpio === '.' || limpio === '-') return undefined
  // Un solo separador y solo cifras: `1.2.3` y `12a` no son números.
  if (!/^-?\d*\.?\d*$/.test(limpio)) return undefined
  const n = Number(limpio)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Un número tal y como se escribe aquí: coma decimal y sin ceros de relleno.
 * `102.5` → `102,5`; `40` → `40`; `102.50` → `102,5`.
 */
export function escribirNumero(n: number): string {
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

/** Un peso con su unidad: «102,5 kg». */
export function escribirKg(kg: number): string {
  return `${escribirNumero(kg)} kg`
}

/**
 * Lo que se enseña mientras se escribe.
 *
 * Al teclear hace falta poder dejar la casilla a medias —«102,» antes de la
 * cifra decimal— sin que el valor ya guardado la reescriba y se coma la coma.
 * Por eso el texto en curso manda sobre el número mientras los dos digan lo
 * mismo.
 */
export function textoEnCurso(escrito: string, valor: number | undefined): string {
  if (valor === undefined) return escrito === '' || leerNumero(escrito) === undefined ? escrito : ''
  return leerNumero(escrito) === valor ? escrito : escribirNumero(valor)
}
