import { describe, expect, it } from 'vitest'
import { aplicar, recoger, valeLaMedida, type MedidaDeFuera } from './buzon'
import type { AppData } from './types'

const HOY = '2026-06-21'

const medida = (extra: Partial<MedidaDeFuera> = {}): MedidaDeFuera => ({
  id: 'm1',
  tipo: 'sol',
  date: HOY,
  desde: 600,
  hasta: 630,
  ...extra
})

describe('lo que el buzón acepta', () => {
  it('una medida completa vale', () => {
    expect(valeLaMedida(medida())).toBe(true)
  })

  it('un tipo que no existe no entra', () => {
    // Esto viene de fuera. Una fila con el tipo mal escrito metería basura en
    // el diario de alguien sin que se entere.
    expect(valeLaMedida(medida({ tipo: 'siesta' }))).toBe(false)
  })

  it('ni una fecha que no es una fecha', () => {
    expect(valeLaMedida(medida({ date: '21/06/2026' }))).toBe(false)
    expect(valeLaMedida(medida({ date: '' }))).toBe(false)
  })

  it('ni una hora imposible', () => {
    expect(valeLaMedida(medida({ desde: -5 }))).toBe(false)
    expect(valeLaMedida(medida({ desde: 1500 }))).toBe(false)
    expect(valeLaMedida(medida({ hasta: 2000 }))).toBe(false)
  })

  it('ni una sin id, que no se podría recoger dos veces sin duplicar', () => {
    expect(valeLaMedida(medida({ id: '' }))).toBe(false)
  })

  it('y la que sigue en marcha todavía no vale: aún no ha acabado', () => {
    expect(valeLaMedida(medida({ hasta: null }))).toBe(false)
  })
})

describe('recoger lo que midió el reloj', () => {
  it('un rato de sol deja lo mismo que si lo hubieras hecho en el móvil', () => {
    // Pasa por `alParar`, así que no hay dos caminos que puedan divergir: la
    // salida y la exposición salen del mismo sitio.
    const r = recoger([medida({ piel: 'banador', cielo: 'limpio' })])
    const tipos = r.escrituras.map((e) => e.escritura.en).sort()
    expect(tipos).toEqual(['exposicion', 'salida'])
    expect(r.recogidos).toEqual(['m1'])
  })

  it('y estar descalzo deja hábito y rato fuera, como en el móvil', () => {
    const r = recoger([medida({ id: 'g1', tipo: 'grounding' })])
    expect(r.escrituras.map((e) => e.escritura.en).sort()).toEqual(['habito', 'salida'])
  })

  it('la lámpara llega con su zona y su distancia', () => {
    const r = recoger([
      medida({ id: 'l1', tipo: 'lampara', lamparaId: 'panel', zona: 'espalda', distanciaCm: 30 })
    ])
    const s = r.escrituras.find((e) => e.escritura.en === 'sesionPBM')!
    expect(s.escritura.en === 'sesionPBM' && s.escritura.sesion.zona).toBe('espalda')
    expect(s.escritura.en === 'sesionPBM' && s.escritura.sesion.distanciaCm).toBe(30)
  })

  it('lo que se guarda lleva el id de la medida, para poder recoger dos veces', () => {
    const r = recoger([medida({ id: 'abc', piel: 'torso' })])
    for (const { escritura } of r.escrituras) {
      if (escritura.en === 'salida') expect(escritura.salida.id).toBe('abc')
      if (escritura.en === 'exposicion') expect(escritura.exposicion.id).toBe('abc')
    }
  })

  it('recoger dos veces da exactamente lo mismo', () => {
    // Es lo que permite que el móvil no lleve la cuenta de lo ya recogido: si
    // la red falla entre recoger y borrar del buzón, no se duplica nada.
    const una = recoger([medida()])
    const otra = recoger([medida()])
    expect(JSON.stringify(una.escrituras)).toBe(JSON.stringify(otra.escrituras))
  })

  it('la fecha viaja con cada escritura, que puede no ser la de hoy', () => {
    // El reloj pudo medir de madrugada y el móvil sincronizar al día siguiente.
    const r = recoger([medida({ date: '2026-06-19' })])
    for (const e of r.escrituras) expect(e.fecha).toBe('2026-06-19')
  })

  it('el nivel del hábito lo pone quien recoge, que es quien lo sabe', () => {
    const r = recoger([medida({ id: 'f1', tipo: 'frio' })], () => 4)
    const h = r.escrituras.find((e) => e.escritura.en === 'habito')!
    expect(h.escritura.en === 'habito' && h.escritura.registro.nivel).toBe(4)
  })

  it('lo que no vale se descarta y se dice cuál, en vez de colarse', () => {
    const r = recoger([medida(), medida({ id: 'malo', tipo: 'siesta' })])
    expect(r.recogidos).toEqual(['m1'])
    expect(r.descartados).toEqual(['malo'])
  })

  it('lo que sigue en marcha se queda en el buzón, ni recogido ni descartado', () => {
    const r = recoger([medida({ id: 'abierta', hasta: null })])
    expect(r.recogidos).toEqual([])
    expect(r.descartados).toEqual([])
    expect(r.escrituras).toEqual([])
  })

  it('un buzón vacío no revienta', () => {
    expect(recoger(undefined)).toEqual({ escrituras: [], recogidos: [], descartados: [] })
    expect(recoger([])).toEqual({ escrituras: [], recogidos: [], descartados: [] })
  })

  it('varias medidas del mismo día se recogen todas', () => {
    const r = recoger([
      medida({ id: 'a', tipo: 'amanecer', desde: 400, hasta: 420 }),
      medida({ id: 'b', tipo: 'fuera', desde: 800, hasta: 830 })
    ])
    expect(r.recogidos).toEqual(['a', 'b'])
    expect(r.escrituras.filter((e) => e.escritura.en === 'salida')).toHaveLength(2)
  })

  it('una medida sin piel ni cielo se recoge igual, con lo de siempre por defecto', () => {
    // El reloj puede mandar cuatro campos y ya. Exigirle todo sería exigirle
    // que conozca el esquema entero de la app.
    const r = recoger([medida()])
    const e = r.escrituras.find((x) => x.escritura.en === 'exposicion')!
    expect(e.escritura.en === 'exposicion' && e.escritura.exposicion.piel).toBe('brazos_piernas')
  })
})


describe('meterlo en los datos', () => {
  const vacio: AppData = {
    version: 2,
    profile: null,
    checkIns: [],
    sessions: [],
    measurements: []
  }

  it('un rato de sol del reloj acaba en las salidas y en el diario de sol', () => {
    const r = recoger([medida({ piel: 'banador' })])
    const d = aplicar(vacio, r.escrituras)
    expect(d.salidas).toHaveLength(1)
    expect(d.sol?.[0].exposiciones).toHaveLength(1)
    expect(d.sol?.[0].date).toBe(HOY)
  })

  it('aplicarlo dos veces deja exactamente lo mismo que una', () => {
    // Es la propiedad entera del diseño: si la red falla entre recoger y vaciar
    // el buzón, la próxima vez se recoge otra vez y no se duplica nada.
    const r = recoger([medida()])
    const una = aplicar(vacio, r.escrituras)
    const dos = aplicar(una, r.escrituras)
    expect(dos.salidas).toHaveLength(1)
    expect(dos.sol?.[0].exposiciones).toHaveLength(1)
  })

  it('no pisa lo que ya había apuntado en el móvil', () => {
    const conLoMio: AppData = {
      ...vacio,
      salidas: [{ id: 'mia', date: HOY, desde: 480, minutos: 20, filtro: 'ninguno' }]
    }
    const d = aplicar(conLoMio, recoger([medida()]).escrituras)
    expect(d.salidas).toHaveLength(2)
    expect(d.salidas?.some((s) => s.id === 'mia')).toBe(true)
  })

  it('la noche sustituye por fecha, que es como la guarda el móvil', () => {
    const r = recoger([medida({ id: 'n1', tipo: 'oscuridad', desde: 1380, hasta: 420 })])
    const d = aplicar(aplicar(vacio, r.escrituras), r.escrituras)
    expect(d.noches).toHaveLength(1)
  })

  it('el hábito sustituye por fecha y tipo', () => {
    const r = recoger([medida({ id: 'f1', tipo: 'frio', hasta: 603 })])
    const d = aplicar(aplicar(vacio, r.escrituras), r.escrituras)
    expect(d.habitos).toHaveLength(1)
  })

  it('la sesión de lámpara sustituye por id', () => {
    const r = recoger([medida({ id: 'l1', tipo: 'lampara', lamparaId: 'panel' })])
    const d = aplicar(aplicar(vacio, r.escrituras), r.escrituras)
    expect(d.sesionesPBM).toHaveLength(1)
  })

  it('sin nada que aplicar devuelve los datos tal cual', () => {
    expect(aplicar(vacio, [])).toBe(vacio)
  })

  it('varias medidas de días distintos van cada una a su día', () => {
    const r = recoger([
      medida({ id: 'a', date: '2026-06-19' }),
      medida({ id: 'b', date: '2026-06-20' })
    ])
    const d = aplicar(vacio, r.escrituras)
    expect(d.sol?.map((x) => x.date)).toEqual(['2026-06-19', '2026-06-20'])
  })
})
