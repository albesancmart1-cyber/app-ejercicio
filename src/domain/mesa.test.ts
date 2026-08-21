import { describe, expect, it } from 'vitest'
import {
  HERRAMIENTAS,
  calidadDe,
  coberturaDeDatos,
  faltaParaElUmbral,
  leerComida,
  leerDia,
  nivelDeuterio,
  ritmoDeInsulina
} from './mesa'
import { NUTRIENTES, UMBRAL_LEUCINA_G } from '../data/nutrientes'
import { ALIMENTOS } from '../data/alimentos'
import type { ComidaRegistrada, DiaDeComidas } from './types'

const comida = (alimentos: { id: string; g: number }[], hora = '14:00'): ComidaRegistrada => ({
  hora,
  texto: '',
  alimentos: alimentos.map((a) => ({ nombre: a.id, alimentoId: a.id, gramos: a.g }))
})

const dia = (comidas: ComidaRegistrada[]): DiaDeComidas => ({ date: '2026-08-21', comidas })

describe('el catálogo de nutrientes', () => {
  it('todos sus identificadores existen en el catálogo de alimentos', () => {
    const ids = new Set(ALIMENTOS.map((a) => a.id))
    const huerfanos = Object.keys(NUTRIENTES).filter((id) => !ids.has(id))
    expect(huerfanos).toEqual([])
  })

  it('las cifras están en rangos que existen en comida de verdad', () => {
    for (const [id, n] of Object.entries(NUTRIENTES)) {
      if (n.proteinaPor100 !== undefined) {
        expect(n.proteinaPor100, id).toBeGreaterThanOrEqual(0)
        expect(n.proteinaPor100, id).toBeLessThan(50)
      }
      if (n.leucinaPor100 !== undefined && n.proteinaPor100) {
        // La leucina ronda el 8 % de la proteína; fuera de 3–15 % hay una errata.
        const pct = (n.leucinaPor100 / n.proteinaPor100) * 100
        expect(pct, `${id}: leucina ${pct.toFixed(1)} % de la proteína`).toBeGreaterThan(3)
        expect(pct, `${id}: leucina ${pct.toFixed(1)} % de la proteína`).toBeLessThan(15)
      }
      if (n.diaas !== undefined) {
        expect(n.diaas, id).toBeGreaterThan(20)
        expect(n.diaas, id).toBeLessThan(150)
      }
      if (n.deuterioPpm !== undefined) {
        // La comida real se mueve en una franja estrecha: no hay nada a 50 ni a 300.
        expect(n.deuterioPpm, id).toBeGreaterThan(110)
        expect(n.deuterioPpm, id).toBeLessThan(170)
      }
    }
  })

  it('el huevo y la carne puntúan por encima de cien, y el trigo por debajo de la mitad', () => {
    expect(NUTRIENTES.huevo_cocido.diaas).toBeGreaterThan(110)
    expect(NUTRIENTES.ternera_filete.diaas).toBeGreaterThan(110)
    expect(NUTRIENTES.pan_blanco.diaas).toBeLessThan(50)
  })

  it('la grasa animal trae menos deuterio que las semillas', () => {
    expect(NUTRIENTES.ghee.deuterioPpm!).toBeLessThan(NUTRIENTES.semillas_lino.deuterioPpm!)
    expect(NUTRIENTES.mantequilla.deuterioPpm!).toBeLessThan(NUTRIENTES.miel.deuterioPpm!)
  })
})

describe('la leucina, que se cuenta por comida', () => {
  it('160 g de ternera pasan del umbral de golpe', () => {
    const l = leerComida(comida([{ id: 'ternera_filete', g: 160 }]))
    expect(l.leucinaG).toBeCloseTo(2.816, 3)
    expect(l.llegaAlUmbral).toBe(true)
  })

  it('50 g se quedan cortos, y se dice cuánto falta', () => {
    const l = leerComida(comida([{ id: 'ternera_filete', g: 50 }]))
    expect(l.llegaAlUmbral).toBe(false)
    const falta = faltaParaElUmbral(l)
    expect(falta).toBeGreaterThan(0)
    // Y con esa proteína de más, la comida llegaría.
    const conMas = leerComida(comida([{ id: 'ternera_filete', g: 50 + falta / 0.22 }]))
    expect(conMas.llegaAlUmbral).toBe(true)
  })

  it('la misma proteína repartida en picoteos no enciende nada', () => {
    // Este es el porqué de todo el módulo. Los dos días traen 300 g de ternera
    // —66 g de proteína—, y solo uno de ellos enciende la síntesis, dos veces.
    // Repartirla en cuatro raciones de 75 g no la enciende ni una.
    const picoteo = leerDia(
      dia([
        comida([{ id: 'ternera_filete', g: 75 }], '09:00'),
        comida([{ id: 'ternera_filete', g: 75 }], '12:00'),
        comida([{ id: 'ternera_filete', g: 75 }], '16:00'),
        comida([{ id: 'ternera_filete', g: 75 }], '20:00')
      ])
    )
    const dosBolos = leerDia(
      dia([
        comida([{ id: 'ternera_filete', g: 150 }], '10:00'),
        comida([{ id: 'ternera_filete', g: 150 }], '18:00')
      ])
    )
    expect(picoteo.proteinaG).toBeCloseTo(dosBolos.proteinaG, 5)
    expect(picoteo.conUmbral).toBe(0)
    expect(dosBolos.conUmbral).toBe(2)
  })

  it('el umbral es el de la referencia, no uno inventado por comodidad', () => {
    expect(UMBRAL_LEUCINA_G).toBe(2.5)
  })

  it('una comida sin datos no falla ni inventa leucina', () => {
    const l = leerComida(comida([{ id: 'no_existe', g: 200 }]))
    expect(l.leucinaG).toBe(0)
    expect(l.gramosConDato).toBe(0)
    expect(l.gramosApuntados).toBe(200)
    expect(faltaParaElUmbral(l)).toBe(0)
  })
})

describe('la calidad de la proteína', () => {
  it('se pondera por proteína y no por peso del plato', () => {
    // Doscientos gramos de lechuga no deberían hundir el DIAAS de un filete.
    const soloFilete = leerComida(comida([{ id: 'ternera_filete', g: 150 }]))
    const conEnsalada = leerComida(
      comida([
        { id: 'ternera_filete', g: 150 },
        { id: 'lechuga', g: 200 }
      ])
    )
    expect(conEnsalada.diaas!).toBeGreaterThan(soloFilete.diaas! - 15)
  })

  it('un plato de pan y pasta sale por debajo de cien', () => {
    const l = leerComida(comida([{ id: 'pan_blanco', g: 100 }, { id: 'pasta', g: 200 }]))
    expect(l.diaas!).toBeLessThan(60)
    expect(calidadDe(l.diaas!)).toBe('pobre')
  })

  it('y las palabras cubren toda la escala', () => {
    expect(calidadDe(113)).toBe('completa')
    expect(calidadDe(83)).toBe('buena')
    expect(calidadDe(60)).toBe('incompleta')
    expect(calidadDe(40)).toBe('pobre')
  })
})

describe('el deuterio', () => {
  it('un plato de grasa animal sale bajo y uno de semillas, alto', () => {
    const animal = leerComida(comida([{ id: 'ghee', g: 30 }, { id: 'ternera_entrecot', g: 200 }]))
    const vegetal = leerComida(comida([{ id: 'miel', g: 30 }, { id: 'avena', g: 100 }]))
    expect(nivelDeuterio(animal.deuterioPpm!)).toBe('bajo')
    expect(nivelDeuterio(vegetal.deuterioPpm!)).toBe('alto')
  })

  it('la escala tiene sus tres tramos', () => {
    expect(nivelDeuterio(140)).toBe('bajo')
    expect(nivelDeuterio(152)).toBe('medio')
    expect(nivelDeuterio(156)).toBe('alto')
  })
})

describe('los antinutrientes', () => {
  it('manda el más alto del plato, porque es el que secuestra el mineral', () => {
    const l = leerComida(
      comida([
        { id: 'ternera_filete', g: 150 },
        { id: 'espinacas', g: 100 }
      ])
    )
    expect(l.antinutrientes).toBe('alto')
  })

  it('un plato solo de animal sale bajo', () => {
    expect(leerComida(comida([{ id: 'salmon', g: 150 }])).antinutrientes).toBe('bajo')
  })
})

describe('los eventos de insulina', () => {
  it('cuenta uno por comida y mide los huecos', () => {
    const r = ritmoDeInsulina(
      dia([comida([], '08:00'), comida([], '13:00'), comida([], '20:00')])
    )
    expect(r.eventos).toHaveLength(3)
    expect(r.eventos[1].desdeElAnterior).toBe(5)
    expect(r.eventos[2].desdeElAnterior).toBe(7)
  })

  it('el café cuenta como evento: cambia la cuenta real del ayuno', () => {
    const conCafe = ritmoDeInsulina(dia([comida([], '07:00'), comida([], '14:00')]))
    const sinCafe = ritmoDeInsulina(dia([comida([], '14:00')]))
    expect(conCafe.abre).toBe(420)
    expect(sinCafe.abre).toBe(840)
    // Siete horas de diferencia en la ventana: no es un matiz.
    expect(conCafe.ventanaHoras).toBe(7)
    expect(sinCafe.ventanaHoras).toBe(0)
  })

  it('el mayor descanso incluye la noche', () => {
    const r = ritmoDeInsulina(dia([comida([], '12:00'), comida([], '20:00')]))
    expect(r.mayorDescanso).toBe(16)
  })

  it('picotear todo el día deja el mayor descanso corto', () => {
    const r = ritmoDeInsulina(
      dia([
        comida([], '08:00'),
        comida([], '11:00'),
        comida([], '14:00'),
        comida([], '17:00'),
        comida([], '20:00'),
        comida([], '23:00')
      ])
    )
    expect(r.eventos).toHaveLength(6)
    expect(r.mayorDescanso).toBe(9)
  })

  it('un día sin comidas no revienta', () => {
    const r = ritmoDeInsulina(undefined)
    expect(r.eventos).toEqual([])
    expect(r.mayorDescanso).toBe(24)
    expect(r.ventanaHoras).toBeUndefined()
  })

  it('las comidas desordenadas se ordenan solas', () => {
    const r = ritmoDeInsulina(dia([comida([], '20:00'), comida([], '08:00')]))
    expect(r.abre).toBe(480)
    expect(r.cierra).toBe(1200)
  })
})

describe('qué rompe el ayuno', () => {
  it('el agua no, un caldo sí, y el café solo es zona gris', () => {
    const buscar = (n: string) => HERRAMIENTAS.find((h) => h.nombre.startsWith(n))!
    expect(buscar('Agua').efecto).toBe('no-rompe')
    expect(buscar('Caldo').efecto).toBe('rompe')
    expect(buscar('Café solo').efecto).toBe('zona-gris')
  })

  it('el café solo explica por qué, aunque no suba la glucosa', () => {
    const cafe = HERRAMIENTAS.find((h) => h.nombre === 'Café solo')!
    expect(cafe.porque).toContain('ventana del hígado')
  })

  it('hay una zona gris de verdad: no se finge que sea binario', () => {
    const grises = HERRAMIENTAS.filter((h) => h.efecto === 'zona-gris')
    expect(grises.length).toBeGreaterThan(1)
  })

  it('cada uno explica su porqué', () => {
    for (const h of HERRAMIENTAS) expect(h.porque.length).toBeGreaterThan(15)
  })
})

describe('la cobertura de datos', () => {
  it('es uno cuando todo el plato tiene cifras', () => {
    const l = leerComida(comida([{ id: 'ternera_filete', g: 150 }]))
    expect(coberturaDeDatos(l)).toBe(1)
  })

  it('y baja cuando la mitad no las tiene', () => {
    const l = leerComida(
      comida([
        { id: 'ternera_filete', g: 100 },
        { id: 'no_existe', g: 100 }
      ])
    )
    expect(coberturaDeDatos(l)).toBeCloseTo(0.5, 5)
  })

  it('sin nada apuntado, cero y no una división por cero', () => {
    expect(coberturaDeDatos({ gramosConDato: 0, gramosApuntados: 0 })).toBe(0)
  })
})
