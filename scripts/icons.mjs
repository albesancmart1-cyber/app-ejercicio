import { chromium } from 'playwright-core'
import { readFileSync } from 'fs'

const svg = readFileSync('/home/user/app-ejercicio/public/icon.svg', 'utf8')
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`
  )
  await page.screenshot({ path: `/home/user/app-ejercicio/public/icon-${size}.png`, omitBackground: true })
  await page.close()
}
await browser.close()
console.log('icons done')
