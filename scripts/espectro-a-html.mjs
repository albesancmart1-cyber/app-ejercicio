/**
 * El apartado del espectro del manual, generado desde el código.
 *
 * Se escribe solo por una razón concreta: es una tabla larga con referencias, y
 * una copia a mano en el HTML del manual se habría desincronizado del código a
 * la tercera corrección. Aquí no puede: si `domain/espectro.ts` cambia, el
 * manual cambia con él la próxima vez que se genere.
 *
 *   node scripts/espectro-a-html.mjs   → escribe el bloque en docs/manual/manual.html
 */
import { build } from 'esbuild'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'

const TEMP = '/tmp/espectro.mjs'
await build({
  entryPoints: ['src/domain/espectro.ts'],
  outfile: TEMP,
  bundle: true,
  format: 'esm',
  platform: 'node'
})
const { ESPECTRO } = await import(`${TEMP}?v=${Date.now()}`)
rmSync(TEMP)

const escapar = (t) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Los `**negritas**` y `*cursivas*` del dominio, a HTML. */
const marcado = (t) =>
  escapar(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')

const nm = (n) => (n >= 3000 ? `${(n / 1000).toLocaleString('es-ES')} µm` : `${n} nm`)

const bloques = ESPECTRO.map(
  (t) => `<div class="ficha">
  <h4>${escapar(t.nombre)} · ${nm(t.desde)}–${nm(t.hasta)}</h4>
  <dl>
    <dt>Lo absorbe</dt><dd>${marcado(t.cromoforo)}.</dd>
    <dt>Hasta dónde llega</dt><dd>${marcado(t.penetracion)}</dd>
    ${t.picos.length ? `<dt>Picos citados</dt><dd>${t.picos.map(nm).join(', ')}.</dd>` : ''}
  </dl>
  <ul>
${t.efectos.map((e) => `    <li>${marcado(e)}</li>`).join('\n')}
  </ul>
  ${t.ojo ? `<p class="faint"><strong>Ojo:</strong> ${marcado(t.ojo)}</p>` : ''}
</div>`
).join('\n\n')

const INICIO = '<!-- ESPECTRO:INICIO -->'
const FIN = '<!-- ESPECTRO:FIN -->'
const manual = readFileSync('docs/manual/manual.html', 'utf-8')
const i = manual.indexOf(INICIO)
const j = manual.indexOf(FIN)
if (i === -1 || j === -1) {
  console.error('✗ Faltan las marcas ESPECTRO:INICIO / ESPECTRO:FIN en el manual.')
  process.exit(1)
}
writeFileSync(
  'docs/manual/manual.html',
  `${manual.slice(0, i + INICIO.length)}\n${bloques}\n${manual.slice(j)}`
)
console.log(`✓ ${ESPECTRO.length} tramos del espectro escritos en el manual`)
