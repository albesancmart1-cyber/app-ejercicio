import { afterEach, describe, expect, it, vi } from 'vitest'
import { decirleElSitio, hayReloj, recogerDelReloj } from './reloj'
import type { AppData } from '../domain/types'

const vacio: AppData = { version: 2, profile: null, checkIns: [], sessions: [], measurements: [] }

/** Monta el puente que Capacitor colgaría de `window` dentro del contenedor. */
function conPuente(medidas: unknown[], mandar = vi.fn(async () => ({ enviado: true }))) {
  ;(globalThis as any).Capacitor = {
    Plugins: {
      EnlaceReloj: {
        recoger: vi.fn(async () => ({ medidas })),
        mandarSitio: mandar
      }
    }
  }
  return mandar
}

afterEach(() => {
  delete (globalThis as any).Capacitor
})

const medida = (extra: Record<string, unknown> = {}) => ({
  id: 'reloj-abc',
  tipo: 'sol',
  date: '2026-06-21',
  desde: 600,
  hasta: 630,
  origen: 'reloj',
  ...extra
})

describe('fuera del contenedor no pasa nada', () => {
  it('no hay reloj y no se rompe', async () => {
    expect(hayReloj()).toBe(false)
    const r = await recogerDelReloj(vacio)
    expect(r.data).toBe(vacio)
    expect(r.cuantas).toBe(0)
  })

  it('y decirle el sitio simplemente dice que no', async () => {
    expect(await decirleElSitio(40.4, -3.7)).toBe(false)
  })
})

describe('lo que manda el reloj', () => {
  it('acaba donde acabaría si lo hubieras medido en el móvil', async () => {
    conPuente([medida()])
    const { data, cuantas } = await recogerDelReloj(vacio)
    expect(cuantas).toBe(1)
    expect(data.salidas).toHaveLength(1)
    expect(data.sol?.[0].exposiciones).toHaveLength(1)
  })

  it('recogerlo dos veces no lo duplica', async () => {
    // El puente vacía su cola al entregar, pero si algo se entregara dos veces
    // —una app que arranca dos veces, un aviso repetido— no puede duplicarse.
    conPuente([medida()])
    const una = await recogerDelReloj(vacio)
    conPuente([medida()])
    const dos = await recogerDelReloj(una.data)
    expect(dos.data.salidas).toHaveLength(1)
  })

  it('estar descalzo deja hábito y rato fuera, igual que en el móvil', async () => {
    conPuente([medida({ id: 'g', tipo: 'grounding' })])
    const { data } = await recogerDelReloj(vacio)
    expect(data.habitos?.[0].habito).toBe('grounding')
    expect(data.salidas).toHaveLength(1)
  })

  it('los números que llegan como texto por el puente se leen igual', async () => {
    // El puente nativo entrega los números como números o como cadenas según
    // el aparato. Fiarse de que siempre serán números es pedir un fallo que
    // solo aparece en el móvil de otro.
    conPuente([medida({ desde: '600', hasta: '630' })])
    const { data, cuantas } = await recogerDelReloj(vacio)
    expect(cuantas).toBe(1)
    expect(data.salidas?.[0].minutos).toBe(30)
  })

  it('una medida con el tipo mal escrito se descarta sin tocar nada', async () => {
    conPuente([medida({ tipo: 'siesta' })])
    const { data, cuantas } = await recogerDelReloj(vacio)
    expect(cuantas).toBe(0)
    expect(data.salidas).toBeUndefined()
  })

  it('lo que siga en marcha en el reloj no entra todavía', async () => {
    conPuente([medida({ hasta: null })])
    expect((await recogerDelReloj(vacio)).cuantas).toBe(0)
  })

  it('si el puente falla, la app sigue con sus datos intactos', async () => {
    // El reloj es un extra. Que reviente no puede impedir que la app arranque.
    ;(globalThis as any).Capacitor = {
      Plugins: {
        EnlaceReloj: {
          recoger: vi.fn(async () => {
            throw new Error('el puente se cayó')
          }),
          mandarSitio: vi.fn()
        }
      }
    }
    const r = await recogerDelReloj(vacio)
    expect(r.data).toBe(vacio)
    expect(r.cuantas).toBe(0)
  })

  it('un buzón vacío devuelve los mismos datos, sin copiarlos', async () => {
    conPuente([])
    const r = await recogerDelReloj(vacio)
    expect(r.data).toBe(vacio)
  })
})

describe('decirle al reloj dónde vives', () => {
  it('le llegan las dos coordenadas', async () => {
    const mandar = conPuente([])
    expect(await decirleElSitio(40.4165, -3.7026)).toBe(true)
    expect(mandar).toHaveBeenCalledWith({ lat: 40.4165, lon: -3.7026 })
  })

  it('y si el reloj no está emparejado, se dice que no en vez de reventar', async () => {
    conPuente([], vi.fn(async () => ({ enviado: false })))
    expect(await decirleElSitio(40.4, -3.7)).toBe(false)
  })
})
