import { describe, expect, it } from 'vitest'
import {
  A_QUIEN_PREGUNTAR,
  HITOS,
  estadoKeto,
  homaIr,
  indicesDe,
  type Analitica
} from './analiticas'

describe('el HOMA-IR', () => {
  it('sale de la fórmula, sin redondeos escondidos', () => {
    // 90 × 5 / 405 = 1,111…
    expect(homaIr(90, 5)).toBeCloseTo(1.111, 3)
  })

  it('una glucosa normal con la insulina alta se marca, que es su razón de ser', () => {
    // Los dos tienen glucosa de 92: mirando solo la glucosa parecen iguales.
    const tranquilo = indicesDe({ date: 'x', glucosa: 92, insulina: 3 })[0]
    const trabajando = indicesDe({ date: 'x', glucosa: 92, insulina: 18 })[0]
    expect(tranquilo.franja).toBe('optimo')
    expect(trabajando.franja).toBe('vigilar')
  })

  it('explica qué mide sin nombrar ninguna enfermedad', () => {
    const i = indicesDe({ date: 'x', glucosa: 90, insulina: 5 })[0]
    expect(i.queDice).toContain('insulina')
    expect(i.queDice.toLowerCase()).not.toMatch(/diabet|síndrome|enfermedad/)
  })
})

describe('los cocientes de lípidos', () => {
  it('TG/HDL se calcula y se sitúa', () => {
    const i = indicesDe({ date: 'x', trigliceridos: 60, hdl: 60 }).find((x) => x.id === 'tg-hdl')!
    expect(i.valor).toBe(1)
    expect(i.franja).toBe('optimo')
  })

  it('y se marca cuando se dispara', () => {
    const i = indicesDe({ date: 'x', trigliceridos: 200, hdl: 40 }).find((x) => x.id === 'tg-hdl')!
    expect(i.valor).toBe(5)
    expect(i.franja).toBe('vigilar')
  })

  it('CT/HDL igual', () => {
    const i = indicesDe({ date: 'x', colesterolTotal: 200, hdl: 65 }).find((x) => x.id === 'ct-hdl')!
    expect(i.valor).toBeCloseTo(3.08, 2)
    expect(i.franja).toBe('optimo')
  })

  it('un HDL de cero no provoca una división por cero', () => {
    expect(indicesDe({ date: 'x', trigliceridos: 100, hdl: 0 })).toEqual([])
  })
})

describe('la vitamina D y la ferritina', () => {
  it('en la vitamina D más es mejor, hasta un punto', () => {
    const baja = indicesDe({ date: 'x', vitaminaD: 18 })[0]
    const buena = indicesDe({ date: 'x', vitaminaD: 55 })[0]
    const pasada = indicesDe({ date: 'x', vitaminaD: 120 })[0]
    expect(baja.franja).toBe('vigilar')
    expect(buena.franja).toBe('optimo')
    expect(pasada.franja).toBe('vigilar')
  })

  it('la ferritina avisa por arriba y por abajo', () => {
    expect(indicesDe({ date: 'x', ferritina: 8 })[0].franja).toBe('vigilar')
    expect(indicesDe({ date: 'x', ferritina: 80 })[0].franja).toBe('optimo')
    expect(indicesDe({ date: 'x', ferritina: 400 })[0].franja).toBe('vigilar')
  })

  it('y dice que puede subir por inflamación, no solo por hierro', () => {
    expect(indicesDe({ date: 'x', ferritina: 80 })[0].queDice).toContain('inflamación')
  })
})

describe('lo que falta, no sale', () => {
  it('una analítica vacía no produce ningún índice', () => {
    expect(indicesDe({ date: 'x' })).toEqual([])
  })

  it('con glucosa pero sin insulina no se inventa el HOMA', () => {
    expect(indicesDe({ date: 'x', glucosa: 90 })).toEqual([])
  })

  it('y con lo que haya, salen los que se puedan', () => {
    const a: Analitica = { date: 'x', trigliceridos: 60, hdl: 60, vitaminaD: 50 }
    expect(indicesDe(a).map((i) => i.id).sort()).toEqual(['tg-hdl', 'vitamina-d'])
  })
})

describe('el tono', () => {
  it('la app no diagnostica, y lo dice con todas las letras', () => {
    expect(A_QUIEN_PREGUNTAR).toContain('no es un diagnóstico')
    expect(A_QUIEN_PREGUNTAR).toContain('llévalo a quien sepa')
  })

  it('ningún índice nombra una enfermedad', () => {
    const a: Analitica = {
      date: 'x',
      glucosa: 100,
      insulina: 10,
      trigliceridos: 150,
      hdl: 50,
      colesterolTotal: 200,
      vitaminaD: 25,
      ferritina: 300
    }
    const todo = indicesDe(a).map((i) => i.queDice).join(' ').toLowerCase()
    for (const palabra of ['diabet', 'cáncer', 'enfermedad', 'síndrome', 'patolog']) {
      expect(todo, `no debería decir «${palabra}»`).not.toContain(palabra)
    }
  })

  it('ni recomienda ningún tratamiento', () => {
    const todo = indicesDe({ date: 'x', glucosa: 110, insulina: 20 })
      .map((i) => i.queDice)
      .join(' ')
      .toLowerCase()
    expect(todo).not.toMatch(/\btoma\b|\bmedicac|\bsuplement/)
  })
})

describe('la curva de keto-adaptación', () => {
  it('empieza por el glucógeno, que es lo que explica los primeros kilos', () => {
    const e = estadoKeto('2026-08-21', '2026-08-21')!
    expect(e.dias).toBe(0)
    expect(e.actual.titulo).toContain('glucógeno')
    expect(e.actual.que).toContain('agua')
  })

  it('avisa del bache antes de que llegue', () => {
    const e = estadoKeto('2026-08-21', '2026-08-22')!
    expect(e.siguiente!.titulo).toBe('El bache')
    expect(e.diasParaElSiguiente).toBe(2)
  })

  it('va pasando por sus hitos', () => {
    expect(estadoKeto('2026-01-01', '2026-01-16')!.actual.titulo).toContain('cabeza')
    expect(estadoKeto('2026-01-01', '2026-02-05')!.actual.titulo).toContain('fuerza')
    expect(estadoKeto('2026-01-01', '2026-03-05')!.actual.titulo).toContain('Flexibilidad')
  })

  it('al final no hay siguiente, y no se inventa uno', () => {
    const e = estadoKeto('2026-01-01', '2026-12-01')!
    expect(e.actual.titulo).toBe('Adaptado')
    expect(e.siguiente).toBeUndefined()
    expect(e.diasParaElSiguiente).toBeUndefined()
  })

  it('una fecha futura no da una curva al revés', () => {
    expect(estadoKeto('2026-12-01', '2026-01-01')).toBeNull()
  })

  it('los hitos van en orden y cada uno explica algo', () => {
    for (let i = 1; i < HITOS.length; i++) {
      expect(HITOS[i].dia).toBeGreaterThan(HITOS[i - 1].dia)
    }
    for (const h of HITOS) expect(h.que.length).toBeGreaterThan(40)
  })

  it('y el de la fuerza reconoce que la alta intensidad puede no volver del todo', () => {
    const fuerza = HITOS.find((h) => h.titulo.includes('fuerza'))!
    expect(fuerza.que).toContain('alta intensidad')
  })
})
