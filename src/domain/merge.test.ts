import { describe, expect, it } from 'vitest'
import {
  PODA_DE_CURSOS,
  claveDeCurso,
  claveDeMedicion,
  claveDeRutina,
  claveDeSesion,
  fusionar,
  resumirFusion,
  unirLapidas
} from './merge'
import type {
  AppData,
  BodyMeasurement,
  CheckIn,
  EnCurso,
  Profile,
  Routine,
  SalidaAlExterior,
  Session
} from './types'

const perfil = (name: string): Profile => ({
  name,
  goal: 'recomposicion',
  equipment: ['peso_corporal'],
  maxWeights: {}
})

const sesion = (id: string, date: string, updatedAt?: number): Session => ({
  id,
  date,
  updatedAt,
  kind: 'fuerza',
  title: 'Fuerza',
  completed: true,
  exercises: []
})

const medicion = (date: string, weightKg: number, updatedAt?: number): BodyMeasurement => ({
  date,
  weightKg,
  updatedAt
})

const checkIn = (date: string, sleep: 1 | 2 | 3 | 4 | 5 = 4, updatedAt?: number): CheckIn => ({
  date,
  updatedAt,
  sleep,
  lightHygiene: true,
  sunrise: true,
  sunsetYesterday: true,
  sunExposure: true,
  keto: false,
  energy: 4,
  discomfort: 'ninguna'
})

const datos = (p: Partial<AppData> = {}): AppData => ({
  version: 2,
  profile: perfil('Alberto'),
  checkIns: [],
  sessions: [],
  measurements: [],
  ...p
})

// ── Lo que motivó la fusión ───────────────────────────────

describe('nada de lo entrenado se pierde', () => {
  it('la sesión del móvil sobrevive al abrir el ordenador con datos viejos', () => {
    const movil = datos({ sessions: [sesion('a', '2026-08-01'), sesion('b', '2026-08-03')] })
    const ordenador = datos({ sessions: [sesion('a', '2026-08-01')] })
    const { data } = fusionar(ordenador, movil)
    expect(data.sessions.map((s) => s.id).sort()).toEqual(['a', 'b'])
  })

  it('y al revés: lo del ordenador tampoco se pierde', () => {
    const movil = datos({ sessions: [sesion('a', '2026-08-01')] })
    const ordenador = datos({ sessions: [sesion('c', '2026-07-30')] })
    const { data } = fusionar(movil, ordenador)
    expect(data.sessions.map((s) => s.id).sort()).toEqual(['a', 'c'])
  })

  it('lo mismo con check-ins y mediciones', () => {
    const a = datos({ checkIns: [checkIn('2026-08-01')], measurements: [medicion('2026-08-01', 80)] })
    const b = datos({ checkIns: [checkIn('2026-08-02')], measurements: [medicion('2026-08-02', 79)] })
    const { data } = fusionar(a, b)
    expect(data.checkIns).toHaveLength(2)
    expect(data.measurements).toHaveLength(2)
  })

  it('no duplica lo que está en las dos copias', () => {
    const a = datos({ sessions: [sesion('a', '2026-08-01')] })
    const { data } = fusionar(a, structuredClone(a))
    expect(data.sessions).toHaveLength(1)
  })
})

describe('cuando la misma cosa se tocó en los dos sitios', () => {
  it('gana la más reciente', () => {
    const viejo = datos({ measurements: [medicion('2026-08-01', 80, 1000)] })
    const nuevo = datos({ measurements: [medicion('2026-08-01', 78, 2000)] })
    expect(fusionar(viejo, nuevo).data.measurements[0].weightKg).toBe(78)
    expect(fusionar(nuevo, viejo).data.measurements[0].weightKg).toBe(78)
  })

  it('lo que lleva marca de tiempo gana a lo que no la lleva', () => {
    const sinMarca = datos({ measurements: [medicion('2026-08-01', 80)] })
    const conMarca = datos({ measurements: [medicion('2026-08-01', 77, 1000)] })
    expect(fusionar(sinMarca, conMarca).data.measurements[0].weightKg).toBe(77)
  })

  it('y sin ninguna marca, se queda lo que el usuario tiene delante', () => {
    const local = datos({ measurements: [medicion('2026-08-01', 80)] })
    const remoto = datos({ measurements: [medicion('2026-08-01', 70)] })
    expect(fusionar(local, remoto).data.measurements[0].weightKg).toBe(80)
  })

  it('el perfil no se mezcla por partes: gana el guardado más tarde', () => {
    const local = datos({ profile: perfil('Aquí'), profileUpdatedAt: 1000 })
    const remoto = datos({ profile: perfil('Nube'), profileUpdatedAt: 2000 })
    expect(fusionar(local, remoto).data.profile!.name).toBe('Nube')
    expect(fusionar(remoto, local).data.profile!.name).toBe('Nube')
  })

  it('sin perfil aquí, se coge el de la nube', () => {
    const vacio = datos({ profile: null })
    const remoto = datos({ profile: perfil('Nube') })
    expect(fusionar(vacio, remoto).data.profile!.name).toBe('Nube')
  })
})

// ── Lo que la unión sola haría mal ────────────────────────

describe('lo borrado no resucita', () => {
  it('una medición borrada aquí no vuelve desde la nube', () => {
    const remoto = datos({ measurements: [medicion('2026-08-01', 80, 1000)] })
    const local = datos({
      measurements: [],
      deleted: [{ clave: claveDeMedicion('2026-08-01'), at: 2000 }]
    })
    expect(fusionar(local, remoto).data.measurements).toHaveLength(0)
  })

  it('ni una sesión descartada', () => {
    const remoto = datos({ sessions: [sesion('a', '2026-08-01', 1000)] })
    const local = datos({ sessions: [], deleted: [{ clave: claveDeSesion('a'), at: 2000 }] })
    expect(fusionar(local, remoto).data.sessions).toHaveLength(0)
  })

  it('pero si se ha vuelto a crear después, se queda', () => {
    // Borrada el lunes en el móvil, anotada otra vez el martes en el ordenador.
    const remoto = datos({ measurements: [medicion('2026-08-01', 80, 3000)] })
    const local = datos({
      measurements: [],
      deleted: [{ clave: claveDeMedicion('2026-08-01'), at: 2000 }]
    })
    expect(fusionar(local, remoto).data.measurements).toHaveLength(1)
  })

  it('la lápida viaja a la copia fusionada, para que llegue al otro dispositivo', () => {
    const local = datos({ deleted: [{ clave: claveDeSesion('a'), at: 2000 }] })
    const { data } = fusionar(local, datos())
    expect(data.deleted).toEqual([{ clave: claveDeSesion('a'), at: 2000 }])
  })

  it('entre dos borrados de la misma cosa, manda el más reciente', () => {
    const unidas = unirLapidas(
      [{ clave: 'sesion:a', at: 1000 }],
      [{ clave: 'sesion:a', at: 5000 }]
    )
    expect(unidas).toEqual([{ clave: 'sesion:a', at: 5000 }])
  })
})

// ── Propiedades que tienen que cumplirse siempre ──────────

describe('la fusión se porta bien', () => {
  const a = datos({
    sessions: [sesion('a', '2026-08-01', 10), sesion('b', '2026-08-02', 20)],
    checkIns: [checkIn('2026-08-01')],
    measurements: [medicion('2026-08-01', 80, 10)]
  })
  const b = datos({
    sessions: [sesion('b', '2026-08-02', 30), sesion('c', '2026-08-03', 40)],
    checkIns: [checkIn('2026-08-02')],
    measurements: [medicion('2026-08-02', 79, 50)]
  })

  it('fusionar dos veces da lo mismo que fusionar una', () => {
    const una = fusionar(a, b).data
    const dos = fusionar(una, b).data
    expect(dos).toEqual(una)
  })

  it('no toca las copias que recibe', () => {
    const copiaA = structuredClone(a)
    const copiaB = structuredClone(b)
    fusionar(a, b)
    expect(a).toEqual(copiaA)
    expect(b).toEqual(copiaB)
  })

  it('el resultado sale ordenado por fecha', () => {
    const { data } = fusionar(a, b)
    const fechas = data.sessions.map((s) => s.date)
    expect([...fechas].sort()).toEqual(fechas)
  })

  it('el resultado tiene todo lo de las dos, ni más ni menos', () => {
    const { data } = fusionar(a, b)
    const esperadas = new Set([...a.sessions, ...b.sessions].map((s) => s.id))
    expect(new Set(data.sessions.map((s) => s.id))).toEqual(esperadas)
  })
})

describe('se cuenta lo que ha traído', () => {
  it('dice cuántas sesiones se han recuperado del otro dispositivo', () => {
    const local = datos({ sessions: [sesion('a', '2026-08-01')] })
    const remoto = datos({ sessions: [sesion('b', '2026-08-02'), sesion('c', '2026-08-03')] })
    const { resumen } = fusionar(local, remoto)
    expect(resumen.sesionesAnadidas).toBe(2)
    expect(resumirFusion(resumen)).toContain('2 sesiones')
  })

  it('y en singular cuando es una', () => {
    const { resumen } = fusionar(datos(), datos({ measurements: [medicion('2026-08-01', 80)] }))
    expect(resumirFusion(resumen)).toContain('1 medición')
  })

  it('si no ha traído nada, no dice nada', () => {
    const { resumen } = fusionar(datos(), datos())
    expect(resumirFusion(resumen)).toBeNull()
  })
})

// ── Rutinas ───────────────────────────────────────────────

const rutina = (id: string, name: string, updatedAt?: number): Routine => ({
  id,
  name,
  kind: 'fuerza',
  exercises: [],
  createdAt: 1,
  updatedAt
})

describe('las rutinas también viajan entre dispositivos', () => {
  it('se juntan las de los dos lados', () => {
    const { data } = fusionar(
      datos({ routines: [rutina('a', 'Torso')] }),
      datos({ routines: [rutina('b', 'Pierna')] })
    )
    expect(data.routines?.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })

  it('con la misma rutina en los dos, gana la tocada más tarde', () => {
    const { data } = fusionar(
      datos({ routines: [rutina('a', 'Torso viejo', 100)] }),
      datos({ routines: [rutina('a', 'Torso nuevo', 200)] })
    )
    expect(data.routines).toHaveLength(1)
    expect(data.routines![0].name).toBe('Torso nuevo')
  })

  it('una rutina borrada aquí no vuelve de la nube', () => {
    const { data } = fusionar(
      datos({ routines: [], deleted: [{ clave: claveDeRutina('a'), at: 500 }] }),
      datos({ routines: [rutina('a', 'Torso', 100)] })
    )
    expect(data.routines).toBeUndefined()
  })

  it('pero volver a guardarla después del borrado sí la resucita', () => {
    const { data } = fusionar(
      datos({ routines: [], deleted: [{ clave: claveDeRutina('a'), at: 500 }] }),
      datos({ routines: [rutina('a', 'Torso', 900)] })
    )
    expect(data.routines).toHaveLength(1)
  })

  it('sin rutinas en ninguno de los dos, no se inventa la lista', () => {
    const { data } = fusionar(datos(), datos())
    expect(data.routines).toBeUndefined()
  })
})

/* ══════════════════════════════════════════════ LO QUE MIDE «MEDIR» ══ */

const salida = (id: string, date: string, desde: number, updatedAt?: number): SalidaAlExterior => ({
  id,
  date,
  desde,
  minutos: 30,
  updatedAt,
  filtro: 'ninguno'
})

/*
 * Los ratos en marcha se fechan con el reloj de verdad y no con números de
 * juguete: sus lápidas se podan por antigüedad real, así que un `at: 200` es
 * una lápida de 1970 y se tira antes de poder hacer nada.
 */
const AHORA = Date.now()

const curso = (
  tipo: EnCurso['tipo'],
  date: string,
  haceMin = 30,
  aparato?: string
): EnCurso => ({ tipo, date, desde: 600, updatedAt: AHORA - haceMin * 60_000, aparato })

const lapidaDeCurso = (tipo: string, date: string, haceMin: number) => ({
  clave: claveDeCurso(tipo, date),
  at: AHORA - haceMin * 60_000
})

describe('lo que se mide en un dispositivo no lo borra el otro', () => {
  it('los ratos de sol del móvil sobreviven al ordenador', () => {
    /*
     * Esto no se fusionaba: `salidas` venía de la copia local y la de la nube
     * se tiraba entera. Con un solo dispositivo no se notaba nunca; con dos,
     * medir el sol en el móvil y abrir el ordenador borraba lo del móvil en la
     * siguiente subida.
     */
    const movil = datos({ salidas: [salida('s1', '2026-08-25', 600)] })
    const ordenador = datos({ salidas: [salida('s2', '2026-08-24', 660)] })

    const { data } = fusionar(ordenador, movil)

    expect((data.salidas ?? []).map((s) => s.id).sort()).toEqual(['s1', 's2'])
  })

  it('y con el mismo rato en los dos lados, gana el tocado más tarde', () => {
    const viejo = datos({ salidas: [{ ...salida('s1', '2026-08-25', 600, 100), minutos: 10 }] })
    const nuevo = datos({ salidas: [{ ...salida('s1', '2026-08-25', 600, 200), minutos: 45 }] })

    expect(fusionar(viejo, nuevo).data.salidas![0].minutos).toBe(45)
  })

  it('las noches, los fichajes, las lámparas y los hábitos van por el mismo camino', () => {
    const movil = datos({
      noches: [{ date: '2026-08-25', apagado: 1380, levantado: 420 }],
      fichajes: [
        { id: 'f1', date: '2026-08-25', entrada: 405, luz: { nombre: 'taller', temperaturaK: 5700, lux: 450, ventana: false, filtro: 'ninguno' } }
      ]
    })
    const ordenador = datos({
      lamparas: [{ id: 'l1', nombre: 'Panel', distanciaRefCm: 15, ondas: [{ nm: 660, irradiancia: 30 }] }],
      habitos: [{ date: '2026-08-25', habito: 'frio', nivel: 2, minutos: 3 }]
    })

    const { data } = fusionar(movil, ordenador)

    expect(data.noches).toHaveLength(1)
    expect(data.fichajes).toHaveLength(1)
    expect(data.lamparas).toHaveLength(1)
    expect(data.habitos).toHaveLength(1)
  })

  it('dos hábitos distintos del mismo día no se pisan', () => {
    // La identidad de un hábito es el hábito **y** la fecha: con la fecha sola,
    // apuntar frío borraba el grounding de ese día.
    const a = datos({ habitos: [{ date: '2026-08-25', habito: 'frio', nivel: 2 }] })
    const b = datos({ habitos: [{ date: '2026-08-25', habito: 'grounding', nivel: 1 }] })

    expect(fusionar(a, b).data.habitos).toHaveLength(2)
  })
})

describe('lo que está en marcha se ve desde el otro dispositivo', () => {
  it('el sol empezado en el móvil aparece en el ordenador', () => {
    const ordenador = datos({})
    const movil = datos({ enCurso: [curso('sol', '2026-08-25', 25, 'el iPhone')] })

    const { data } = fusionar(ordenador, movil)

    expect(data.enCurso).toHaveLength(1)
    expect(data.enCurso![0].aparato).toBe('el iPhone')
  })

  it('y pararlo desde el ordenador no lo resucita el móvil', () => {
    /*
     * El caso entero, que es de lo que va todo esto. Sin la lápida, el móvil
     * —que todavía tiene el rato abierto en su copia— lo volvería a subir en la
     * siguiente sincronización y la baldosa se encendería otra vez un minuto
     * después de haberla apagado.
     */
    const ordenador = datos({ enCurso: [], deleted: [lapidaDeCurso('sol', '2026-08-25', 1)] })
    const movil = datos({ enCurso: [curso('sol', '2026-08-25', 25)] })

    expect(fusionar(ordenador, movil).data.enCurso).toBeUndefined()
  })

  it('pero volver a empezarlo después sí cuenta', () => {
    // Parar a las diez y volver a empezar a las once es la misma clave y tiene
    // que sobrevivir: es lo que distingue una lápida de un veto.
    const parado = datos({ deleted: [lapidaDeCurso('sol', '2026-08-25', 60)] })
    const otraVez = datos({ enCurso: [curso('sol', '2026-08-25', 5)] })

    expect(fusionar(parado, otraVez).data.enCurso).toHaveLength(1)
  })

  it('cambiar el cielo a mitad en un dispositivo gana sobre la copia vieja del otro', () => {
    const viejo = datos({ enCurso: [{ ...curso('sol', '2026-08-25', 30), cielo: 'limpio' }] })
    const tocado = datos({ enCurso: [{ ...curso('sol', '2026-08-25', 5), cielo: 'velado' }] })

    expect(fusionar(viejo, tocado).data.enCurso![0].cielo).toBe('velado')
  })

  it('dos cosas distintas en marcha a la vez conviven: el día se solapa', () => {
    const movil = datos({ enCurso: [curso('sol', '2026-08-25')] })
    const ordenador = datos({ enCurso: [curso('grounding', '2026-08-25')] })

    expect(fusionar(movil, ordenador).data.enCurso).toHaveLength(2)
  })
})

describe('las lápidas de lo que estaba en marcha se podan solas', () => {
  it('la de hace un mes se tira: no es un borrado que haya que recordar', () => {
    /*
     * Las lápidas de verdad son para siempre —haber borrado una sesión es un
     * hecho que no caduca—, pero una por baldosa y día haría crecer la lista
     * para siempre. Lo único que tiene que hacer es sobrevivir a que el otro
     * dispositivo se entere.
     */
    const vieja = [lapidaDeCurso('sol', '2026-07-01', 30 * 24 * 60)]

    expect(unirLapidas(vieja, [], AHORA)).toEqual([])
  })

  it('la de esta mañana se queda, que es para lo que está', () => {
    const dehoy = [lapidaDeCurso('sol', '2026-08-25', 1)]

    expect(unirLapidas(dehoy, [], AHORA)).toHaveLength(1)
    // Y aguanta justo hasta el plazo, que es lo que se le pide.
    expect(unirLapidas([lapidaDeCurso('sol', '2026-08-25', PODA_DE_CURSOS / 60_000 - 1)], [], AHORA)).toHaveLength(1)
  })

  it('y las de verdad no se podan nunca, por viejas que sean', () => {
    const vieja = [{ clave: claveDeSesion('a'), at: AHORA - 365 * 24 * 60 * 60 * 1000 }]

    expect(unirLapidas(vieja, [], AHORA)).toHaveLength(1)
  })
})
