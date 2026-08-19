/**
 * Ningún decimal con punto en el texto visible.
 *
 * En castellano el punto es el separador de millares: un «13.5» leído deprisa
 * puede ser trece y medio o trece mil quinientos. La prueba de `toFixed` en
 * `ui-copy.test.ts` caza una de las formas de fabricarlo, pero no todas —el
 * «3.2 por semana» salía de un `Math.round(x*10)/10` interpolado crudo—, así
 * que esto mira el resultado final: el texto que hay en la pantalla.
 *
 * Los millares con punto («25.600 kg») son correctos y se dejan pasar.
 *
 *   node scripts/check-decimales.mjs
 */
import { chromium } from 'playwright-core'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'es-ES' })
await p.goto(BASE)
await p.evaluate(() => {
  const hoy=new Date(); const menos=d=>{const x=new Date(hoy);x.setDate(x.getDate()-d);return x.toISOString().slice(0,10)}
  const ej=(id,name,primary)=>({exerciseId:id,name,primary,plan:{sets:4,reps:'8-12',rir:2,restSeconds:120,weightKg:42.5},done:true,logs:[{done:true,reps:10,weightKg:42.5,rir:2},{done:true,reps:10,weightKg:42.5,rir:2},{done:true,reps:10,weightKg:42.5,rir:2},{done:true,reps:10,weightKg:20,rir:2,tipo:'calentamiento'}]})
  const sessions=[]; for(let i=1;i<80;i+=2) sessions.push({id:'s'+i,date:menos(i),kind:'fuerza',title:'Fuerza',completed:true,rpe:3,durationSec:3600,
    exercises:[ej('press_banca_mancuernas','Press banca','pecho'),ej('remo_mancuerna','Remo','espalda')]})
  localStorage.setItem('ritmo-data-v1',JSON.stringify({version:2,
    profile:{name:'A',goal:'recomposicion',weightKg:80.4,heightCm:180,equipment:['mancuernas','banco'],maxWeights:{mancuernas:24}},
    checkIns:Array.from({length:10},(_,i)=>({date:menos(i),sleep:4,lightHygiene:true,sunrise:true,sunsetYesterday:true,sunExposure:true,keto:true,energy:4,discomfort:'ninguna',wokeHungry:false,cravings:false})),
    sessions,measurements:Array.from({length:10},(_,i)=>({date:menos(i*3),weightKg:80.4-i*0.15,fatPercent:18.3-i*0.08,musclePercent:41.2}))}))
})
await p.goto(BASE); await p.waitForTimeout(800)
let malos = []
const mirar = async (donde) => {
  const t = await p.locator('.app-main').innerText()
  // decimal x.y que no sea un millar (los millares van seguidos de 3 cifras)
  for (const m of t.match(/\b\d+\.\d{1,2}\b(?!\d)/g) ?? []) {
    if (!/^\d+\.\d{3}$/.test(m)) malos.push(`${donde}: ${m}`)
  }
}
await mirar('hoy')
await p.getByRole('button',{name:'Progreso',exact:true}).click(); await p.waitForTimeout(700); await mirar('semana')
for (const s of ['Mes','Año','Cuerpo','Ejercicios']) {
  try { await p.getByRole('tab',{name:s}).click({timeout:2500}) } catch { continue }
  await p.waitForTimeout(700); await mirar(s.toLowerCase())
}
await p.getByRole('button',{name:'Cocina',exact:true}).click(); await p.waitForTimeout(700); await mirar('cocina')
await p.getByRole('button',{name:'Yo',exact:true}).click(); await p.waitForTimeout(700); await mirar('yo')
console.log(malos.length ? 'FALLA — decimales con punto:\n - ' + [...new Set(malos)].join('\n - ') : 'Decimales: todo con coma.')
process.exit(malos.length ? 1 : 0)
