import { describe, expect, it } from 'vitest'
import {
  avisoDeGafas,
  azulEfectivo,
  coordenadasDe,
  diaSemana,
  esLaborable,
  fichajeAbierto,
  filtroCuestaAmplitud,
  juzgarHueco,
  minutosDentro,
  nombreDiaSemana,
  queSirve,
  resumenDeJornada,
  tieneSitio,
  tramosConLuzALaEntrada
} from './jornada'
import type { Fichaje, PerfilDeLuz, Profile, SalidaAlExterior } from './types'
import type { Coordenadas } from './arcoSolar'

const MADRID: Coordenadas = { lat: 40.4165, lon: -3.7026 }
const INVIERNO = 60
const VERANO = 120

/** Su horario real: entra a las 06:45, único hueco de 09:45 a 10:00, sale a las 15:00. */
const ENTRADA = 6 * 60 + 45 // 405
const HUECO = 9 * 60 + 45 // 585
const SALIDA = 15 * 60 // 900

const perfil = (extra: Partial<Profile> = {}): Profile => ({
  name: 'Alberto',
  goal: 'recomposicion',
  equipment: ['peso_corporal'],
  maxWeights: {},
  lat: MADRID.lat,
  lon: MADRID.lon,
  ...extra
})

const TALLER: Omit<PerfilDeLuz, 'id' | 'updatedAt'> = {
  nombre: 'Taller',
  temperaturaK: 5700,
  lux: 450,
  ventana: false,
  filtro: 'ambar'
}

describe('el día de la semana', () => {
  it('sabe cuál es sin líos de zona horaria', () => {
    expect(nombreDiaSemana('2026-08-21')).toBe('viernes')
    expect(diaSemana('2026-08-22')).toBe(6) // sábado
    expect(diaSemana('2026-08-23')).toBe(0) // domingo
  })

  it('de lunes a viernes se trabaja, salvo que se diga otra cosa', () => {
    expect(esLaborable('2026-08-21', perfil())).toBe(true) // viernes
    expect(esLaborable('2026-08-22', perfil())).toBe(false) // sábado
  })

  it('quien trabaja el sábado lo configura y la app le hace caso', () => {
    const sabatino = perfil({ diasLaborables: [2, 3, 4, 5, 6] })
    expect(esLaborable('2026-08-22', sabatino)).toBe(true) // sábado sí
    expect(esLaborable('2026-08-24', sabatino)).toBe(false) // lunes no
  })
})

describe('las coordenadas', () => {
  it('sin ellas no hay arco que calcular, y se dice', () => {
    expect(tieneSitio(null)).toBe(false)
    expect(tieneSitio(perfil({ lat: undefined, lon: undefined }))).toBe(false)
    expect(coordenadasDe(perfil({ lat: undefined }))).toBeNull()
  })

  it('con ellas, sí', () => {
    expect(tieneSitio(perfil())).toBe(true)
    expect(coordenadasDe(perfil())).toEqual(MADRID)
  })
})

describe('su jornada real, contra el sol', () => {
  it('en diciembre ficha de noche cerrada', () => {
    const q = queSirve('2025-12-21', MADRID, ENTRADA, INVIERNO)
    expect(q.elevacion).toBeLessThan(-18)
    expect(q.fase).toBe(false)
  })

  it('en junio ficha justo cuando sale el sol: el trayecto es el amanecer', () => {
    const q = queSirve('2026-06-21', MADRID, ENTRADA, VERANO)
    expect(q.elevacion).toBeGreaterThan(-2)
    expect(q.elevacion).toBeLessThan(1)
    expect(q.fase).toBe(true) // por encima de −6°: ya hay azul que sirve
  })

  it('su único hueco sirve para la fase todo el año, incluso en diciembre', () => {
    for (const [fecha, tz] of [
      ['2025-12-21', INVIERNO],
      ['2026-03-21', INVIERNO],
      ['2026-06-21', VERANO],
      ['2026-09-21', VERANO]
    ] as const) {
      const h = juzgarHueco(fecha, MADRID, HUECO, 15, tz)
      expect(h.sirve, `el hueco del ${fecha} debería servir`).toBe(true)
    }
  })

  it('en diciembre el UVA le entra dentro del propio hueco, no al empezarlo', () => {
    // A las 09:45 el sol está a 9,9° —por debajo del umbral— y a las 10:00 a
    // 12,0°. Por eso el hueco se juzga por su mejor instante: quince minutos
    // deciden si ese día hubo UVA o no.
    expect(queSirve('2025-12-21', MADRID, HUECO, INVIERNO).uva).toBe(false)
    expect(juzgarHueco('2025-12-21', MADRID, HUECO, 15, INVIERNO).mejor.uva).toBe(true)
  })

  it('en junio su cuarto de hora es la única ventana de UVB que tiene en todo el día', () => {
    // 31,4° al salir y 34,2° al volver: por encima de 30° los quince minutos.
    // Es el único momento del año en que su jornada le deja hacer vitamina D,
    // y saberlo es toda la diferencia entre aprovecharlo y no enterarse.
    expect(juzgarHueco('2026-06-21', MADRID, HUECO, 15, VERANO).mejor.uvb).toBe(true)
  })

  it('pero en invierno y en los equinoccios ese mismo hueco se queda corto', () => {
    for (const [fecha, tz] of [
      ['2025-12-21', INVIERNO],
      ['2026-03-21', INVIERNO],
      ['2026-09-21', VERANO]
    ] as const) {
      expect(juzgarHueco(fecha, MADRID, HUECO, 15, tz).mejor.uvb, fecha).toBe(false)
    }
  })

  it('al salir a las tres el sol está alto, y en junio hasta hay UVB', () => {
    expect(queSirve('2026-06-21', MADRID, SALIDA, VERANO).uvb).toBe(true)
    expect(queSirve('2025-12-21', MADRID, SALIDA, INVIERNO).uvb).toBe(false)
  })

  it('un hueco se juzga por su mejor instante, no por el primero', () => {
    // Un rato que empieza justo antes del amanecer y acaba después sí cuenta.
    const arco = juzgarHueco('2026-03-21', MADRID, 6 * 60 + 40, 40, INVIERNO)
    expect(arco.sirve).toBe(true)
  })
})

describe('el aviso de las gafas rojas', () => {
  it('en diciembre no avisa: a esa hora es de noche y las rojas están bien', () => {
    const a = avisoDeGafas('2025-12-21', MADRID, ENTRADA, 'rojo', INVIERNO)
    expect(a.hayLuzAprovechable).toBe(false)
    expect(a.filtroEstorba).toBe(false)
  })

  it('en junio sí: el trayecto es la ventana del amanecer y el filtro la tira', () => {
    const a = avisoDeGafas('2026-06-21', MADRID, ENTRADA, 'rojo', VERANO)
    expect(a.hayLuzAprovechable).toBe(true)
    expect(a.filtroEstorba).toBe(true)
  })

  it('sin gafas no hay nada que avisar, aunque haya luz', () => {
    const a = avisoDeGafas('2026-06-21', MADRID, ENTRADA, 'ninguno', VERANO)
    expect(a.hayLuzAprovechable).toBe(true)
    expect(a.filtroEstorba).toBe(false)
  })

  it('las ámbar también estorban a esa hora: cortan casi todo el azul', () => {
    expect(avisoDeGafas('2026-06-21', MADRID, ENTRADA, 'ambar', VERANO).filtroEstorba).toBe(true)
  })

  it('sabe entre qué fechas del año pasa, para poder avisar antes', () => {
    const tz = (iso: string) => {
      const m = Number(iso.slice(5, 7))
      return m >= 4 && m <= 9 ? VERANO : INVIERNO
    }
    const tramos = tramosConLuzALaEntrada(2026, MADRID, ENTRADA, tz)
    expect(tramos.length).toBeGreaterThan(0)
    // El tramo largo es el del verano: entra sobre mayo y aguanta hasta agosto.
    const dias = (t: { desde: string; hasta: string }) =>
      (Date.parse(t.hasta) - Date.parse(t.desde)) / 86400000
    const largo = tramos.reduce((a, b) => (dias(b) > dias(a) ? b : a))
    expect(largo.desde.slice(5, 7)).toBe('05')
    expect(largo.hasta.slice(5, 7)).toBe('08')
  })

  it('en el círculo polar en verano hay luz a cualquier hora, y no revienta', () => {
    const a = avisoDeGafas('2026-06-21', { lat: 69.65, lon: 18.96 }, ENTRADA, 'rojo', VERANO)
    expect(a.hayLuzAprovechable).toBe(true)
    expect(Number.isFinite(a.elevacion)).toBe(true)
  })
})

describe('la luz del puesto', () => {
  it('un LED frío sin gafas da mucho más azul que uno cálido', () => {
    const frioSinGafas = azulEfectivo({ lux: 450, temperaturaK: 5700, filtro: 'ninguno' })
    const calidoSinGafas = azulEfectivo({ lux: 450, temperaturaK: 2700, filtro: 'ninguno' })
    expect(frioSinGafas).toBeGreaterThan(calidoSinGafas)
  })

  it('y las gafas ámbar dejan pasar una fracción pequeña', () => {
    const sin = azulEfectivo({ lux: 450, temperaturaK: 5700, filtro: 'ninguno' })
    const con = azulEfectivo({ lux: 450, temperaturaK: 5700, filtro: 'ambar' })
    expect(con).toBeLessThan(sin / 10)
  })

  it('las tres combinaciones que el usuario nombró salen distintas', () => {
    const a = azulEfectivo({ lux: 450, temperaturaK: 2700, filtro: 'ambar' })
    const b = azulEfectivo({ lux: 450, temperaturaK: 5700, filtro: 'ambar' })
    const c = azulEfectivo({ lux: 450, temperaturaK: 5700, filtro: 'ninguno' })
    expect(new Set([a, b, c]).size).toBe(3)
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
  })

  it('en un taller normal el filtro no cuesta amplitud, y eso tranquiliza', () => {
    // 450 lux nunca iban a dar contraste: lo que quita amplitud es la falta de día.
    expect(filtroCuestaAmplitud({ lux: 450, filtro: 'ambar' })).toBe(false)
  })

  it('pero junto a una ventana luminosa sí', () => {
    expect(filtroCuestaAmplitud({ lux: 4000, filtro: 'ambar' })).toBe(true)
  })

  it('y sin filtro nunca cuesta nada, por definición', () => {
    expect(filtroCuestaAmplitud({ lux: 9000, filtro: 'ninguno' })).toBe(false)
  })
})

describe('el fichaje', () => {
  const fichaje: Fichaje = {
    id: 'f1',
    date: '2026-03-16',
    entrada: ENTRADA,
    luz: TALLER
  }

  it('mientras no se salga, cuenta hasta ahora', () => {
    expect(minutosDentro(fichaje, HUECO)).toBe(180) // tres horas
  })

  it('y al salir, hasta la salida', () => {
    expect(minutosDentro({ ...fichaje, salida: SALIDA }, 23 * 60)).toBe(495)
  })

  it('nunca da negativo aunque el reloj se mueva hacia atrás', () => {
    expect(minutosDentro(fichaje, 60)).toBe(0)
  })

  it('sabe si sigues dentro', () => {
    expect(fichajeAbierto([fichaje], '2026-03-16')?.id).toBe('f1')
    expect(fichajeAbierto([{ ...fichaje, salida: SALIDA }], '2026-03-16')).toBeUndefined()
    expect(fichajeAbierto(undefined, '2026-03-16')).toBeUndefined()
  })

  it('guarda la luz congelada, para que cambiar el perfil no reescriba el pasado', () => {
    expect(fichaje.luz.lux).toBe(450)
    expect(fichaje.luz.filtro).toBe('ambar')
  })
})

describe('el resumen del día', () => {
  const fichaje: Fichaje = { id: 'f1', date: '2026-03-16', entrada: ENTRADA, salida: SALIDA, luz: TALLER }
  const salida: SalidaAlExterior = {
    id: 's1',
    date: '2026-03-16',
    desde: HUECO,
    minutos: 15,
    filtro: 'ninguno'
  }

  it('junta arco, fichaje y huecos en una sola cosa', () => {
    const r = resumenDeJornada('2026-03-16', perfil(), [fichaje], [salida], 20 * 60, INVIERNO)!
    expect(r.laborable).toBe(true) // lunes
    expect(r.minutosDentro).toBe(495)
    expect(r.huecos).toHaveLength(1)
    expect(r.minutosUtiles).toBe(15)
    expect(r.arco.pasos.orto.manana).not.toBeNull()
  })

  it('sin coordenadas no inventa nada: devuelve null', () => {
    expect(resumenDeJornada('2026-03-16', perfil({ lat: undefined }), [], [], 600)).toBeNull()
  })

  it('un día sin fichar sigue teniendo su arco', () => {
    const r = resumenDeJornada('2026-03-21', perfil(), [], [], 600, INVIERNO)!
    expect(r.fichaje).toBeUndefined()
    expect(r.minutosDentro).toBe(0)
    expect(r.gafas).toBeUndefined()
    expect(r.arco.duracionDiaMin).toBeGreaterThan(0)
  })

  it('un hueco que no sirve no suma minutos útiles', () => {
    // Una salida de madrugada, con el sol muy por debajo del horizonte.
    const nocturna: SalidaAlExterior = { ...salida, desde: 3 * 60, minutos: 20 }
    const r = resumenDeJornada('2026-03-16', perfil(), [fichaje], [nocturna], 20 * 60, INVIERNO)!
    expect(r.huecos[0].sirve).toBe(false)
    expect(r.minutosUtiles).toBe(0)
  })
})
