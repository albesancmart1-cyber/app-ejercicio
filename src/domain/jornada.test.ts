import { describe, expect, it } from 'vitest'
import {
  avisoDeGafas,
  azulEfectivo,
  coordenadasDe,
  diaSemana,
  entradaHabitual,
  esLaborable,
  fichajeAbierto,
  fichajesDe,
  filtroCuestaAmplitud,
  juzgarHueco,
  minutosDeTrabajo,
  minutosDentro,
  nombreDiaSemana,
  problemaDelTramoDeTrabajo,
  queSirve,
  resumenDeJornada,
  tieneSitio,
  tramoDeTrabajo,
  tramosConLuzALaEntrada,
  ventanaContraTuJornada
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


/* ══════════════════════════════════════════════ ¿ES TUYA ESA VENTANA? ══ */

describe('a qué hora sueles entrar', () => {
  // Lunes 2026-03-16 … viernes 2026-03-20.
  const fichaje = (date: string, entrada: number): Fichaje => ({
    id: date,
    date,
    entrada,
    luz: { nombre: 'Nave', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ninguno' }
  })

  const semana = [
    fichaje('2026-03-16', 6 * 60 + 45),
    fichaje('2026-03-17', 6 * 60 + 50),
    fichaje('2026-03-18', 6 * 60 + 40),
    fichaje('2026-03-19', 6 * 60 + 45),
    fichaje('2026-03-20', 6 * 60 + 45)
  ]

  it('sale de lo fichado, no de un campo que nadie rellena', () => {
    expect(entradaHabitual(semana, '2026-03-21')).toBe(6 * 60 + 45)
  })

  it('con menos de tres fichajes dice que no lo sabe, en vez de inventarlo', () => {
    // Uno solo pudo ser el día que fuiste al médico.
    expect(entradaHabitual(semana.slice(0, 2), '2026-03-21')).toBeUndefined()
    expect(entradaHabitual(undefined, '2026-03-21')).toBeUndefined()
  })

  it('es la mediana, así que un día raro no la mueve', () => {
    // El día que te llamaron a las cinco de la mañana no puede cambiar tu hora.
    const conRaro = [...semana, fichaje('2026-03-13', 5 * 60)]
    expect(entradaHabitual(conRaro, '2026-03-21')).toBe(6 * 60 + 45)
  })

  it('no mira más atrás de la ventana: si cambiaste de turno, se entera', () => {
    const viejos = [
      fichaje('2025-11-03', 14 * 60),
      fichaje('2025-11-04', 14 * 60),
      fichaje('2025-11-05', 14 * 60)
    ]
    expect(entradaHabitual([...viejos, ...semana], '2026-03-21')).toBe(6 * 60 + 45)
  })

  it('sin fichajes en la ventana no se saca nada de los de hace meses', () => {
    const viejos = [
      fichaje('2025-11-03', 14 * 60),
      fichaje('2025-11-04', 14 * 60),
      fichaje('2025-11-05', 14 * 60)
    ]
    expect(entradaHabitual(viejos, '2026-03-21')).toBeUndefined()
  })
})

describe('de quién es la ventana de la mañana', () => {
  const fichaje = (date: string, entrada: number): Fichaje => ({
    id: date,
    date,
    entrada,
    luz: { nombre: 'Nave', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ninguno' }
  })
  const conEntrada = (entrada: number) =>
    ['2026-03-16', '2026-03-17', '2026-03-18'].map((d) => fichaje(d, entrada))

  // Un lunes laborable.
  const LUNES = '2026-03-23'
  const VENTANA = { desde: 6 * 60 + 49, hasta: 8 * 60 + 46 }
  const perfil = { name: 'A', goal: 'recomposicion', equipment: [], maxWeights: {} } as Profile

  it('si entras después de que cierre, es tuya entera', () => {
    const r = ventanaContraTuJornada(LUNES, VENTANA, perfil, conEntrada(9 * 60))
    expect(r.de).toBe('tuya')
  })

  it('si ya estás dentro cuando empieza, no es tuya', () => {
    const r = ventanaContraTuJornada(LUNES, VENTANA, perfil, conEntrada(6 * 60 + 30))
    expect(r.de).toBe('trabajas')
    expect(r.entrada).toBe(6 * 60 + 30)
  })

  it('si entras a media ventana, es tuya hasta esa hora', () => {
    const r = ventanaContraTuJornada(LUNES, VENTANA, perfil, conEntrada(7 * 60 + 30))
    expect(r.de).toBe('parte')
    expect(r.hastaQue).toBe(7 * 60 + 30)
  })

  it('el fin de semana es tuyo entero, sin mirar un solo fichaje', () => {
    // 2026-03-22 es domingo.
    const r = ventanaContraTuJornada('2026-03-22', VENTANA, perfil, conEntrada(6 * 60 + 30))
    expect(r.de).toBe('tuya')
  })

  it('y respeta los días laborables que el usuario haya puesto', () => {
    // Quien libra los lunes tiene el lunes entero.
    const libraLunes = { ...perfil, diasLaborables: [2, 3, 4, 5, 6] }
    const r = ventanaContraTuJornada(LUNES, VENTANA, libraLunes, conEntrada(6 * 60 + 30))
    expect(r.de).toBe('tuya')
  })

  it('sin fichajes suficientes no supone: dice que no lo sabe', () => {
    expect(ventanaContraTuJornada(LUNES, VENTANA, perfil, undefined).de).toBe('no_se_sabe')
    expect(ventanaContraTuJornada(LUNES, VENTANA, perfil, conEntrada(6 * 60).slice(0, 1)).de).toBe(
      'no_se_sabe'
    )
  })

  it('donde no amanece no hay ventana que repartir', () => {
    const r = ventanaContraTuJornada(LUNES, { desde: null, hasta: null }, perfil, conEntrada(6 * 60))
    expect(r.de).toBe('tuya')
  })
})

describe('apuntar la jornada a mano', () => {
  const HOY = '2026-08-24'
  const SITIO: PerfilDeLuz = { id: 'taller', ...TALLER }
  const ficha = (id: string, entrada: number, salida?: number): Fichaje => ({
    id,
    date: HOY,
    entrada,
    salida,
    luz: TALLER
  })

  it('guarda el tramo con la luz del sitio congelada, no con una referencia', () => {
    const f = tramoDeTrabajo('x', HOY, 6 * 60 + 45, 8 * 60 + 48, SITIO)
    expect(f.entrada).toBe(405)
    expect(f.salida).toBe(528)
    expect(f.perfilLuzId).toBe('taller')
    expect(f.luz.lux).toBe(450)
    expect(f.luz.filtro).toBe('ambar')
  })

  it('un tramo normal vale', () => {
    expect(problemaDelTramoDeTrabajo(405, 528, [], HOY, 20 * 60)).toBeUndefined()
  })

  it('sin las dos horas no hay tramo', () => {
    expect(problemaDelTramoDeTrabajo(undefined, 528, [], HOY, 20 * 60)).toMatch(/Faltan/)
    expect(problemaDelTramoDeTrabajo(405, undefined, [], HOY, 20 * 60)).toMatch(/Faltan/)
  })

  it('salir antes de entrar no es un turno, y se manda partirlo por la medianoche', () => {
    const q = problemaDelTramoDeTrabajo(22 * 60, 6 * 60, [], HOY, 23 * 60)
    expect(q).toMatch(/después de la de entrar/)
    expect(q).toMatch(/medianoche/)
  })

  it('un tramo de duración cero tampoco', () => {
    expect(problemaDelTramoDeTrabajo(405, 405, [], HOY, 20 * 60)).toBeDefined()
  })

  it('no deja que dos tramos se pisen, y dice con cuál', () => {
    const ya = [ficha('a', 405, 528)]
    const q = problemaDelTramoDeTrabajo(8 * 60, 10 * 60, ya, HOY, 20 * 60)
    expect(q).toMatch(/06:45/)
    expect(q).toMatch(/08:48/)
  })

  it('pero dos turnos seguidos del mismo día sí valen: tocarse no es pisarse', () => {
    const manana = [ficha('a', 405, 528)]
    expect(problemaDelTramoDeTrabajo(528, 15 * 60, manana, HOY, 20 * 60)).toBeUndefined()
    expect(problemaDelTramoDeTrabajo(16 * 60, 20 * 60, manana, HOY, 20 * 60)).toBeUndefined()
  })

  it('el tramo abierto ocupa hasta ahora mismo, así que tampoco se le puede meter encima', () => {
    const dentro = [ficha('a', 9 * 60)]
    expect(problemaDelTramoDeTrabajo(10 * 60, 11 * 60, dentro, HOY, 12 * 60)).toBeDefined()
    // Antes de entrar sí cabe.
    expect(problemaDelTramoDeTrabajo(6 * 60, 8 * 60, dentro, HOY, 12 * 60)).toBeUndefined()
  })

  it('el que se corrige no se pisa consigo mismo', () => {
    const ya = [ficha('a', 405, 528)]
    expect(problemaDelTramoDeTrabajo(405, 9 * 60, ya, HOY, 20 * 60, 'a')).toBeUndefined()
  })

  it('un tramo de otro día no estorba al de hoy', () => {
    const ayer: Fichaje = { ...ficha('a', 405, 528), date: '2026-08-23' }
    expect(problemaDelTramoDeTrabajo(405, 528, [ayer], HOY, 20 * 60)).toBeUndefined()
  })

  it('la jornada del día suma todos los tramos', () => {
    const dos = [ficha('a', 405, 528), ficha('b', 16 * 60, 20 * 60)]
    expect(minutosDeTrabajo(dos, HOY, 21 * 60)).toBe(123 + 240)
  })

  it('y el tramo abierto cuenta hasta ahora', () => {
    expect(minutosDeTrabajo([ficha('a', 9 * 60)], HOY, 11 * 60)).toBe(120)
  })

  it('sin fichajes son cero minutos, no un hueco raro', () => {
    expect(minutosDeTrabajo(undefined, HOY, 11 * 60)).toBe(0)
    expect(minutosDeTrabajo([], HOY, 11 * 60)).toBe(0)
  })

  it('une en vez de sumar, por si acaso llegaran dos pisados de otra parte', () => {
    const pisados = [ficha('a', 8 * 60, 12 * 60), ficha('b', 10 * 60, 14 * 60)]
    expect(minutosDeTrabajo(pisados, HOY, 20 * 60)).toBe(360)
  })

  it('los tramos del día salen ordenados por la hora de entrar', () => {
    const revueltos = [ficha('b', 16 * 60, 20 * 60), ficha('a', 405, 528)]
    expect(fichajesDe(revueltos, HOY).map((f) => f.id)).toEqual(['a', 'b'])
  })
})
