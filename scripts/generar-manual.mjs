/**
 * El manual, de HTML a PDF.
 *
 * Se compone con Chromium —que ya está aquí para los recorridos— en vez de
 * añadir LaTeX o una biblioteca de PDF al proyecto: así el manual usa la misma
 * tipografía y los mismos colores que la app, y se escribe con CSS en vez de
 * con una API de dibujo.
 *
 *   node scripts/generar-manual.mjs
 */
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const HTML = new URL('../docs/manual/manual.html', import.meta.url)
const SALIDA = new URL('../docs/manual/Ritmo-manual.pdf', import.meta.url).pathname

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
})
const page = await browser.newPage()

// Se carga por `file://` para que la tipografía de la app, que vive en
// `src/styles/fuentes/`, se pueda leer con una ruta relativa.
await page.goto(HTML.href, { waitUntil: 'networkidle' })
// Las fuentes tardan un instante más que la red en estar listas para componer.
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)

await page.pdf({
  path: SALIDA,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  // La portada va a sangre y sin numerar; el resto lleva pie.
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;font-size:7.5pt;color:#8b8290;padding:0 18mm;
                font-family:sans-serif;display:flex;justify-content:space-between">
      <span>Ritmo · Manual</span>
      <span class="pageNumber"></span>
    </div>`,
  margin: { top: '20mm', bottom: '18mm', left: '0', right: '0' }
})

await browser.close()

const kb = Math.round(readFileSync(SALIDA).length / 1024)
console.log(`✓ Ritmo-manual.pdf · ${kb} KB`)
