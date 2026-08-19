import { describe, expect, it } from 'vitest'
import {
  conExposicion,
  esInviernoVitaminico,
  escribirUI,
  minutosDelDia,
  notaDeTemporada,
  resumenSemanal,
  sinExposicion,
  solDe,
  uiDeExposicion,
  uiDelDia
  , conManual
} from './vitaminaD'
import type { DiaDeSol, ExposicionSolar } from './types'

const VERANO = '2026-07-15'
const INVIERNO = '2026-12-15'

const exp = (minutos: number, franja: ExposicionSolar['franja'] = 'mediodia', piel: ExposicionSolar['piel'] = 'brazos_piernas'): ExposicionSolar => ({ minutos, franja, piel })

function dia(fecha: string, ...exposiciones: ExposicionSolar[]): DiaDeSol {
  return { date: fecha, exposiciones }
}

describe('la estimación de UI', () => {
  it('media hora de mediodía en verano con brazos y piernas da miles de UI, en rango', () => {
    const r = uiDeExposicion(exp(30), 7)
    expect(r.min).toBeGreaterThanOrEqual(4000)
    expect(r.max).toBeLessThanOrEqual(11000)
    expect(r.min).toBeLessThan(r.max)
  })

  it('la misma media hora en diciembre es casi nada: invierno vitamínico', () => {
    const verano = uiDeExposicion(exp(30), 7)
    const invierno = uiDeExposicion(exp(30), 12)
    expect(invierno.max).toBeLessThan(verano.min * 0.2)
  })

  it('fuera del mediodía el UVB cae en picado', () => {
    const mediodia = uiDeExposicion(exp(30, 'mediodia'), 7)
    const tarde = uiDeExposicion(exp(30, 'tarde'), 7)
    expect(tarde.max).toBeLessThanOrEqual(mediodia.max * 0.3)
  })

  it('más piel, más síntesis: torso > brazos > cara', () => {
    const cara = uiDeExposicion(exp(20, 'mediodia', 'cara_manos'), 7)
    const brazos = uiDeExposicion(exp(20, 'mediodia', 'brazos_piernas'), 7)
    const torso = uiDeExposicion(exp(20, 'mediodia', 'torso'), 7)
    expect(brazos.max).toBeGreaterThan(cara.max)
    expect(torso.max).toBeGreaterThan(brazos.max)
  })

  it('la piel satura: dos horas no dan el cuádruple que media', () => {
    const media = uiDeExposicion(exp(30), 7)
    const dosHoras = uiDeExposicion(exp(120), 7)
    expect(dosHoras.max).toBeLessThan(media.max * 2)
  })

  it('el día suma exposiciones y respeta el techo', () => {
    const d = dia(VERANO, exp(40, 'mediodia', 'torso'), exp(40, 'mediodia', 'torso'), exp(40, 'mediodia', 'torso'))
    const r = uiDelDia(d)!
    expect(r.max).toBeLessThanOrEqual(20000)
  })

  it('sin exposiciones no hay estimación', () => {
    expect(uiDelDia(undefined)).toBeUndefined()
    expect(uiDelDia(dia(VERANO))).toBeUndefined()
  })
})

describe('el invierno vitamínico', () => {
  it('va de noviembre a febrero', () => {
    expect(esInviernoVitaminico(11)).toBe(true)
    expect(esInviernoVitaminico(1)).toBe(true)
    expect(esInviernoVitaminico(3)).toBe(false)
    expect(esInviernoVitaminico(10)).toBe(false)
  })

  it('la nota de temporada solo aparece en esos meses, y no vende humo', () => {
    expect(notaDeTemporada(VERANO)).toBeUndefined()
    const nota = notaDeTemporada(INVIERNO)!
    expect(nota).toMatch(/apenas sintetiza/)
    expect(nota).toMatch(/sigue contando/)
  })
})

describe('cómo se escriben las UI', () => {
  it('siempre como rango redondeado: la precisión sería mentira', () => {
    // El español no separa millares en cifras de cuatro dígitos: «4200» está bien.
    expect(escribirUI({ min: 4230, max: 8460 })).toMatch(/^unas 4\.?200–8\.?500 UI$/)
    expect(escribirUI({ min: 12300, max: 18800 })).toBe('unas 12.300–18.800 UI')
  })

  it('una síntesis despreciable se dice, no se numera', () => {
    expect(escribirUI({ min: 10, max: 60 })).toBe('una síntesis mínima')
  })
})

describe('la semana', () => {
  it('acumula UI y cuenta los días de mediodía', () => {
    const sol = [
      dia('2026-07-13', exp(20)),
      dia('2026-07-14', exp(30, 'tarde')),
      dia('2026-07-15', exp(15))
    ]
    const r = resumenSemanal(sol, VERANO)
    expect(r.diasConSol).toBe(3)
    expect(r.diasDeMediodia).toBe(2)
    expect(r.ui.min).toBeGreaterThan(0)
  })

  it('lo de hace más de una semana queda fuera', () => {
    const r = resumenSemanal([dia('2026-07-01', exp(30))], VERANO)
    expect(r.diasConSol).toBe(0)
  })
})

describe('editar el día', () => {
  it('añadir y quitar sin tocar el anterior', () => {
    const d = conExposicion(undefined, VERANO, exp(15))
    expect(d.exposiciones).toHaveLength(1)
    const con2 = conExposicion(d, VERANO, exp(30, 'tarde'))
    expect(con2.exposiciones).toHaveLength(2)
    expect(d.exposiciones).toHaveLength(1)
    expect(sinExposicion(con2, 0).exposiciones).toHaveLength(1)
    expect(minutosDelDia(con2)).toBe(45)
  })

  it('solDe encuentra la fecha', () => {
    expect(solDe([dia(VERANO, exp(15))], VERANO)?.exposiciones).toHaveLength(1)
    expect(solDe(undefined, VERANO)).toBeUndefined()
  })
})

describe('lo apuntado a mano manda', () => {
  it('los minutos manuales pisan a la suma de ratos', () => {
    const d: DiaDeSol = { date: VERANO, minutos: 45, exposiciones: [exp(15), exp(10)] }
    expect(minutosDelDia(d)).toBe(45)
  })

  it('las UI traídas de fuera se usan tal cual, sin estimar por encima', () => {
    const d: DiaDeSol = { date: VERANO, minutos: 40, ui: 6400, exposiciones: [] }
    expect(uiDelDia(d)).toEqual({ min: 6400, max: 6400 })
  })

  it('una cifra exacta se escribe exacta, sin «unas» y sin redondear', () => {
    expect(escribirUI({ min: 6400, max: 6400 })).toBe('6400 UI')
    expect(escribirUI({ min: 12345, max: 12345 })).toBe('12.345 UI')
  })

  it('sin cifra manual, la estimación por ratos sigue funcionando', () => {
    const d = dia(VERANO, exp(30))
    const r = uiDelDia(d)!
    expect(r.min).toBeLessThan(r.max)
  })

  it('conManual conserva las exposiciones y fija minutos y UI', () => {
    const base = dia(VERANO, exp(15))
    const con = conManual(base, VERANO, { minutos: 50, ui: 8000 })
    expect(con.minutos).toBe(50)
    expect(con.ui).toBe(8000)
    expect(con.exposiciones).toHaveLength(1)
    expect(base.minutos).toBeUndefined()
  })

  it('la semana suma las UI manuales exactas junto a las estimadas', () => {
    const sol: DiaDeSol[] = [
      { date: '2026-07-14', minutos: 40, ui: 6000, exposiciones: [] },
      dia('2026-07-15', exp(20))
    ]
    const r = resumenSemanal(sol, VERANO)
    expect(r.diasConSol).toBe(2)
    expect(r.ui.min).toBeGreaterThan(6000)
  })

  it('los 15 minutos manuales anclan la leptina igual que los de los ratos', () => {
    // La palanca de sol usa minutosDelDia, así que basta con que este los lea.
    expect(minutosDelDia({ date: VERANO, minutos: 15, exposiciones: [] })).toBe(15)
    expect(minutosDelDia({ date: VERANO, minutos: 0, exposiciones: [exp(30)] })).toBe(0)
  })
})
