/**
 * Genera el icono de la app y el logotipo de dentro.
 *
 * La silueta no es un rectángulo redondeado: es una **superelipse**, la misma
 * curva continua que usan los iconos del sistema. La diferencia con un `rx` de
 * toda la vida se nota justo en el arranque de la esquina, que es donde un
 * icono se ve casero o no.
 *
 * El símbolo es un sol saliendo sobre tres líneas de horizonte que se acortan:
 * el amanecer que gobierna toda la app, y la cadencia —el ritmo— en la misma
 * figura. Una sola forma, mucho aire alrededor, sin texto.
 */
import { writeFileSync } from 'node:fs'

const LADO = 1024

/** Superelipse |x|^n + |y|^n = 1. Con n = 5 sale la esquina continua del sistema. */
function squircle(lado, n = 5, pasos = 360) {
  const r = lado / 2
  const puntos = []
  for (let i = 0; i <= pasos; i++) {
    const t = (i / pasos) * 2 * Math.PI
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = Math.sign(c) * Math.abs(c) ** (2 / n) * r + r
    const y = Math.sign(s) * Math.abs(s) ** (2 / n) * r + r
    puntos.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `M${puntos[0]}L${puntos.slice(1).join('L')}Z`
}

/**
 * El símbolo, sin fondo: sirve igual dentro de la app que sobre el icono.
 *
 * Las tres líneas van en tintes distintos, no en opacidades del mismo color:
 * bajando la opacidad sobre un fondo cálido se emborronan y el símbolo pierde
 * el filo. Con tintes propios cada línea conserva su borde y la cadencia se lee.
 */
function simbolo({ sol, lineas }) {
  const [a, b, c] = lineas
  return `
  <circle cx="512" cy="424" r="168" fill="${sol}"/>
  <rect x="256" y="664" width="512" height="52" rx="26" fill="${a}"/>
  <rect x="332" y="758" width="360" height="52" rx="26" fill="${b}"/>
  <rect x="427" y="852" width="170" height="52" rx="26" fill="${c}"/>`
}

const forma = squircle(LADO)

// ── Icono de la app ───────────────────────────────────────
const icono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}" width="${LADO}" height="${LADO}">
  <defs>
    <linearGradient id="fondo" x1="0.15" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#4a2338"/>
      <stop offset="0.5" stop-color="#20101a"/>
      <stop offset="1" stop-color="#0b0609"/>
    </linearGradient>
    <radialGradient id="amanecer" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0" stop-color="#ff9257" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ff9257" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="disco" x1="0.3" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#ffd9a8"/>
      <stop offset="1" stop-color="#ff8f5f"/>
    </linearGradient>
    <linearGradient id="brillo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.42" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="silueta"><path d="${forma}"/></clipPath>
  </defs>

  <g clip-path="url(#silueta)">
    <rect width="${LADO}" height="${LADO}" fill="url(#fondo)"/>
    <rect width="${LADO}" height="${LADO}" fill="url(#amanecer)"/>
    ${simbolo({ sol: 'url(#disco)', lineas: ['#ffc79c', '#d8845c', '#a55b41'] })}
    <!-- El reflejo de la cara superior, que es lo que da volumen al icono. -->
    <rect width="${LADO}" height="${LADO}" fill="url(#brillo)"/>
  </g>
  <!-- Filo de un píxel: el canto del cristal cogiendo la luz. -->
  <path d="${forma}" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="3"/>
</svg>
`

// ── Logotipo de dentro de la app ──────────────────────────
// Sin fondo y en `currentColor`, para que herede el acento de la hora del día.
const marca = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}" fill="currentColor">
  ${simbolo({ sol: 'currentColor', lineas: ['currentColor', 'currentColor', 'currentColor'] })}
</svg>
`

writeFileSync(new URL('../public/icon.svg', import.meta.url), icono)
writeFileSync(new URL('../public/marca.svg', import.meta.url), marca)
console.log('icono y marca generados')
