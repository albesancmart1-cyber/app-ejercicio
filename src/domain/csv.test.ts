import { describe, expect, it } from 'vitest'
import { csvASesiones, fechaIso, partirLinea, resumirImportacion, separadorDe, sesionesACsv } from './csv'
import { recordsDe } from './records'
import type { Session } from './types'

const sesion: Session = {
  id: 'ses-1',
  date: '2026-03-10',
  kind: 'fuerza',
  title: 'Fuerza · pecho, con "comillas"',
  completed: true,
  durationSec: 3600,
  rpe: 4,
  exercises: [
    {
      exerciseId: 'press_banca_mancuernas',
      name: 'Press de banca con mancuernas',
      primary: 'pecho',
      plan: { sets: 2, reps: '8-12', rir: 2 },
      logs: [
        { weightKg: 16, reps: 10, rir: 2, done: true },
        { weightKg: 16, reps: 8, rir: 0, tipo: 'fallo', done: true }
      ]
    }
  ]
}

describe('sacar el historial en CSV', () => {
  const csv = sesionesACsv([sesion])
  const lineas = csv.split('\n')

  it('una fila por serie, con cabecera', () => {
    expect(lineas).toHaveLength(3)
    expect(lineas[0]).toContain('fecha')
    expect(lineas[0]).toContain('peso_kg')
  })

  it('lleva lo que hace falta para reconstruirlo', () => {
    expect(lineas[1]).toContain('2026-03-10')
    expect(lineas[1]).toContain('Press de banca con mancuernas')
    expect(lineas[1]).toContain('16')
    expect(lineas[1]).toContain('10')
    expect(lineas[2]).toContain('fallo')
  })

  it('entrecomilla lo que lleva comas o comillas', () => {
    expect(lineas[1]).toContain('"Fuerza · pecho, con ""comillas"""')
  })

  it('las sesiones sin terminar no salen: no son historial', () => {
    expect(sesionesACsv([{ ...sesion, completed: false }]).split('\n')).toHaveLength(1)
  })
})

describe('leer una línea', () => {
  it('respeta las comillas y los separadores de dentro', () => {
    expect(partirLinea('a,"b,c",d', ',')).toEqual(['a', 'b,c', 'd'])
    expect(partirLinea('a,"di ""hola""",c', ',')).toEqual(['a', 'di "hola"', 'c'])
  })

  it('adivina el separador por la cabecera', () => {
    expect(separadorDe('a,b,c')).toBe(',')
    expect(separadorDe('a;b;c')).toBe(';')
    expect(separadorDe('a\tb\tc')).toBe('\t')
  })

  it('entiende las fechas que exportan otras apps', () => {
    expect(fechaIso('2026-03-10')).toBe('2026-03-10')
    expect(fechaIso('2026-03-10 18:30:00')).toBe('2026-03-10')
    expect(fechaIso('10/03/2026')).toBe('2026-03-10')
    expect(fechaIso('lo que sea')).toBeUndefined()
  })
})

// Cabecera real de una exportación de Hevy.
const HEVY = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
Push,2026-03-10 18:00:00,2026-03-10 19:00:00,,Bench Press (Dumbbell),,,0,warmup,10,12,,,
Push,2026-03-10 18:00:00,2026-03-10 19:00:00,,Bench Press (Dumbbell),,,1,normal,16,10,,,8
Push,2026-03-10 18:00:00,2026-03-10 19:00:00,,Bench Press (Dumbbell),,,2,normal,16,9,,,9
Push,2026-03-10 18:00:00,2026-03-10 19:00:00,,Lateral Raise (Dumbbell),,,1,normal,8,15,,,
Pull,2026-03-12 18:00:00,2026-03-12 19:00:00,,Bent Over Row (Dumbbell),,,1,normal,20,10,,,`

// Cabecera real de una exportación de Strong, con punto y coma.
const STRONG = `Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE
2026-03-10 18:00:00;Empuje;1h 5m;Bench Press (Dumbbell);W1;10;12;0;0;;;
2026-03-10 18:00:00;Empuje;1h 5m;Bench Press (Dumbbell);1;16;10;0;0;;;8
2026-03-10 18:00:00;Empuje;1h 5m;Bench Press (Dumbbell);2;16;9;0;0;;;`

describe('traerse el historial de otra app', () => {
  it('lee un CSV de Hevy y arma sus sesiones', () => {
    const r = csvASesiones(HEVY)
    expect(r.error).toBeUndefined()
    expect(r.sesiones).toHaveLength(2)
    expect(r.sesiones[0].date).toBe('2026-03-10')
    expect(r.sesiones[0].title).toBe('Push')
    expect(r.sesiones[0].exercises).toHaveLength(2)
    expect(r.sesiones[0].durationSec).toBeUndefined()
  })

  it('las series llegan marcadas como hechas: son historial, no un plan', () => {
    const r = csvASesiones(HEVY)
    const press = r.sesiones[0].exercises[0]
    expect(press.logs).toHaveLength(3)
    expect(press.logs!.every((l) => l.done)).toBe(true)
    expect(press.done).toBe(true)
  })

  it('respeta el calentamiento, que no debe contar como trabajo', () => {
    const press = csvASesiones(HEVY).sesiones[0].exercises[0]
    expect(press.logs![0].tipo).toBe('calentamiento')
    expect(press.logs![1].tipo).toBe('normal')
  })

  it('convierte el RPE en RIR, que es la misma escala del revés', () => {
    const press = csvASesiones(HEVY).sesiones[0].exercises[0]
    expect(press.logs![1].rir).toBe(2)
    expect(press.logs![2].rir).toBe(1)
    // Sin RPE no se inventa ninguno.
    expect(press.logs![0].rir).toBeUndefined()
  })

  it('lee también el CSV de Strong, con su punto y coma y su «W1»', () => {
    const r = csvASesiones(STRONG)
    expect(r.error).toBeUndefined()
    expect(r.sesiones).toHaveLength(1)
    const press = r.sesiones[0].exercises[0]
    expect(press.logs).toHaveLength(3)
    expect(press.logs![0].tipo).toBe('calentamiento')
  })

  it('pasa las libras a kilos', () => {
    const enLibras = `Date,Exercise Name,Set Order,Weight (lbs),Reps
2026-03-10,Bench Press (Dumbbell),1,100,10`
    const press = csvASesiones(enLibras).sesiones[0].exercises[0]
    expect(press.logs![0].weightKg).toBeCloseTo(45.4, 1)
  })

  it('un ejercicio desconocido se guarda con su nombre y el músculo deducido', () => {
    const raro = `date,exercise_title,set_index,weight_kg,reps
2026-03-10,Curl martillo en polea alta,1,12,10`
    const r = csvASesiones(raro)
    const ex = r.sesiones[0].exercises[0]
    expect(ex.name).toBe('Curl martillo en polea alta')
    expect(ex.primary).toBe('brazo')
    expect(ex.muscleContributions).toMatchObject({ biceps_braquial: 1 })
    // Y se marca, porque el músculo es una conjetura sacada del nombre.
    expect(ex.needsReview).toBe(true)
    expect(r.desconocidos).toContain('Curl martillo en polea alta')
    expect(r.avisos.join(' ')).toMatch(/revises/)
  })

  it('un ejercicio del catálogo se reconoce aunque venga escrito distinto', () => {
    const conNombreNuestro = `fecha,ejercicio,serie,peso_kg,reps
2026-03-10,PRESS DE BANCA CON MANCUERNAS,1,16,10`
    const ex = csvASesiones(conNombreNuestro).sesiones[0].exercises[0]
    expect(ex.exerciseId).toBe('press_banca_mancuernas')
    expect(ex.needsReview).toBeUndefined()
  })

  it('lo importado alimenta los récords, que es para lo que se importa', () => {
    const r = csvASesiones(HEVY)
    const marcas = recordsDe('press_banca_mancuernas', r.sesiones)
    expect(marcas.pesoMaximo?.valor).toBe(16)
    // El calentamiento de 12 repeticiones no cuenta como récord de reps.
    expect(marcas.masReps?.valor).toBe(10)
  })

  it('cuenta lo que va a entrar antes de tocar nada', () => {
    const texto = resumirImportacion(csvASesiones(HEVY))
    expect(texto).toContain('2 entrenos')
    expect(texto).toContain('2026-03-10')
  })
})

describe('cuando el archivo no sirve', () => {
  it('un archivo vacío se dice claro', () => {
    expect(csvASesiones('').error).toBeTruthy()
  })

  it('sin columna de ejercicio no se puede hacer nada, y se explica', () => {
    const r = csvASesiones('fecha,peso\n2026-03-10,50')
    expect(r.error).toMatch(/ejercicio/i)
    expect(r.sesiones).toEqual([])
  })

  it('sin fecha tampoco', () => {
    const r = csvASesiones('ejercicio,peso_kg\nPress,50')
    expect(r.error).toMatch(/fecha/i)
  })

  it('las filas rotas se saltan y se cuentan, sin tirar el resto', () => {
    const conBasura = `fecha,ejercicio,serie,peso_kg,reps
2026-03-10,Press de banca con mancuernas,1,16,10
,,,,
sin fecha,,2,16,9`
    const r = csvASesiones(conBasura)
    expect(r.sesiones).toHaveLength(1)
    expect(r.filas).toBe(1)
    expect(r.avisos.join(' ')).toMatch(/saltadas/)
  })
})

describe('ida y vuelta', () => {
  it('lo que sale de aquí se puede volver a leer aquí', () => {
    const csv = sesionesACsv([sesion])
    const r = csvASesiones(csv)
    expect(r.error).toBeUndefined()
    expect(r.sesiones).toHaveLength(1)
    const press = r.sesiones[0].exercises[0]
    expect(press.exerciseId).toBe('press_banca_mancuernas')
    expect(press.logs).toHaveLength(2)
    expect(press.logs![0]).toMatchObject({ weightKg: 16, reps: 10, rir: 2 })
    expect(press.logs![1].tipo).toBe('fallo')
    expect(r.sesiones[0].durationSec).toBe(3600)
  })
})
