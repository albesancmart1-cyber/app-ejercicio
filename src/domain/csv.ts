/**
 * Entrar y salir en CSV.
 *
 * Dos motivos, y ninguno es «porque sí»:
 *
 *  - **Salir.** Ya se puede exportar todo en JSON, que sirve para hacer copia y
 *    volver a entrar, pero no para *mirarlo*: nadie abre un JSON en una hoja de
 *    cálculo para ver cómo le fue el trimestre. El CSV es el formato de «esto
 *    es mío y me lo llevo donde quiera».
 *  - **Entrar.** Quien viene de Hevy o de Strong tiene años de entrenos
 *    registrados, y empezar de cero en una app nueva significa perder todas las
 *    referencias: con qué peso dejaste el press, cuál es tu récord, de dónde
 *    parte la progresión. Importar eso es lo que hace que la app sirva desde el
 *    primer día en vez de desde el tercer mes.
 *
 * El lector es **tolerante a propósito**: acepta coma, punto y coma o tabulador,
 * comillas, cabeceras en inglés o en español, kilos o libras, y columnas que
 * sobran. Un CSV exportado por otra app es un dato que el usuario no puede
 * arreglar: si no se entiende, se ha perdido el trabajo de años, así que se
 * intenta entender todo lo que se pueda y se cuenta con detalle lo que no.
 */
import { CONTRIBUTIONS } from '../data/contributions'
import { EXERCISES } from '../data/exercises'
import { inferirPorNombre } from '../store/migrate'
import { regionOf, type Muscle, type MuscleContributions } from './muscles'
import { seriesQueCuentan } from './records'
import { etiquetaDe } from './superseries'
import { tipoDe } from './setLogs'
import type { MuscleGroup, PlannedExercise, Session, SetLog, TipoSerie } from './types'

// ── Salir ─────────────────────────────────────────────────

const COLUMNAS = [
  'fecha',
  'entreno',
  'duracion_min',
  'ejercicio',
  'superserie',
  'serie',
  'tipo',
  'peso_kg',
  'reps',
  'rir',
  'sensacion'
] as const

/** Escapa un campo: comillas dobles solo cuando hacen falta. */
function campo(valor: string | number | undefined): string {
  if (valor === undefined || valor === '') return ''
  const texto = String(valor)
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/**
 * Todo el historial como CSV, una fila por serie.
 *
 * Una fila por serie y no por ejercicio: es el grano al que están los datos, y
 * cualquier resumen que se hiciera aquí lo tendría que deshacer quien luego
 * quiera contar algo distinto de lo que se nos ocurrió a nosotros.
 */
export function sesionesACsv(sessions: Session[]): string {
  const filas: string[] = [COLUMNAS.join(',')]
  const ordenadas = [...sessions]
    .filter((s) => s.completed)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  for (const s of ordenadas) {
    s.exercises.forEach((pe, i) => {
      const logs = pe.logs ?? []
      if (logs.length === 0) return
      logs.forEach((l, j) => {
        filas.push(
          [
            campo(s.date),
            campo(s.title),
            campo(s.durationSec ? Math.round(s.durationSec / 60) : ''),
            campo(pe.name),
            campo(etiquetaDe(s.exercises, i) ?? ''),
            campo(j + 1),
            campo(tipoDe(l)),
            campo(l.weightKg),
            campo(l.reps),
            campo(l.rir),
            campo(s.rpe)
          ].join(',')
        )
      })
    })
  }
  return filas.join('\n')
}

// ── Entrar ────────────────────────────────────────────────

/** Parte una línea de CSV respetando comillas. */
export function partirLinea(linea: string, sep: string): string[] {
  const campos: string[] = []
  let actual = ''
  let entreComillas = false
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (entreComillas) {
      if (c === '"') {
        if (linea[i + 1] === '"') {
          actual += '"'
          i++
        } else entreComillas = false
      } else actual += c
    } else if (c === '"') {
      entreComillas = true
    } else if (c === sep) {
      campos.push(actual)
      actual = ''
    } else actual += c
  }
  campos.push(actual)
  return campos.map((x) => x.trim())
}

/** Qué separa las columnas. Se mira en la cabecera, que es la fila más fiable. */
export function separadorDe(cabecera: string): string {
  const candidatos = [',', ';', '\t']
  return candidatos.reduce((mejor, sep) =>
    cabecera.split(sep).length > cabecera.split(mejor).length ? sep : mejor
  )
}

/** Normaliza un nombre de columna: sin tildes, sin unidades, con guiones bajos. */
function normalizar(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
}

/** Qué significa cada columna. Un mismo campo tiene muchos nombres por ahí. */
const ALIAS: Record<string, string[]> = {
  fecha: ['fecha', 'date', 'start_time', 'workout_date', 'fecha_de_entrenamiento'],
  entreno: ['entreno', 'title', 'workout_name', 'workout', 'nombre_del_entrenamiento'],
  ejercicio: ['ejercicio', 'exercise_title', 'exercise_name', 'exercise', 'nombre_del_ejercicio'],
  serie: ['serie', 'set_index', 'set_order', 'set', 'set_number'],
  tipo: ['tipo', 'set_type'],
  peso: ['peso_kg', 'peso', 'weight_kg', 'weight', 'weight_lbs', 'weight_lb'],
  reps: ['reps', 'repeticiones', 'repetitions', 'rep'],
  rir: ['rir'],
  rpe: ['rpe'],
  superserie: ['superserie', 'superset_id', 'superset'],
  duracion: ['duracion_min', 'duration', 'duration_seconds', 'workout_duration', 'seconds'],
  notas: ['notas', 'notes', 'exercise_notes']
}

type Campo = keyof typeof ALIAS

function mapaDeColumnas(cabecera: string[]): Partial<Record<Campo, number>> {
  const mapa: Partial<Record<Campo, number>> = {}
  cabecera.forEach((bruto, i) => {
    const nombre = normalizar(bruto)
    for (const [campoNombre, alias] of Object.entries(ALIAS) as [Campo, string[]][]) {
      if (mapa[campoNombre] === undefined && alias.includes(nombre)) mapa[campoNombre] = i
    }
  })
  return mapa
}

/** Un número que puede venir con coma decimal, o no venir. */
function numero(bruto: string | undefined): number | undefined {
  if (!bruto) return undefined
  const limpio = bruto.replace(',', '.').replace(/[^\d.-]/g, '')
  if (limpio === '' || limpio === '-') return undefined
  const n = Number(limpio)
  return Number.isFinite(n) ? n : undefined
}

const LIBRA_EN_KILOS = 0.45359237

/** La fecha en ISO, venga como venga: «2026-03-10», «2026-03-10 18:30», «10/03/2026». */
export function fechaIso(bruto: string): string | undefined {
  const texto = bruto.trim()
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  // Hevy exporta «10 Mar 2026, 18:30» en algunos idiomas; Strong, «10/03/2026».
  const barras = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (barras) {
    // Día primero: es lo que exportan las versiones en español, y en las
    // inglesas el mes va primero. Sin más pistas se prefiere el día, y las
    // fechas ambiguas —hasta el 12— caen donde caigan.
    return `${barras[3]}-${barras[2].padStart(2, '0')}-${barras[1].padStart(2, '0')}`
  }
  const suelta = Date.parse(texto)
  if (!Number.isNaN(suelta)) return new Date(suelta).toISOString().slice(0, 10)
  return undefined
}

/** El tipo de serie, con los nombres que usan las otras apps. */
function tipoDeSerie(bruto: string | undefined, ordenSerie: string | undefined): TipoSerie {
  const t = (bruto ?? '').toLowerCase()
  if (/warm|calent/.test(t)) return 'calentamiento'
  if (/fail|fallo/.test(t)) return 'fallo'
  if (/drop/.test(t)) return 'drop'
  // Strong no tiene columna de tipo: marca el calentamiento en el número de
  // serie, como «W1».
  if (/^w/i.test(ordenSerie ?? '')) return 'calentamiento'
  return 'normal'
}

/** Compara nombres de ejercicio sin tildes, sin puntuación y sin mayúsculas. */
function clave(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Los nombres en inglés más comunes de Hevy y Strong, apuntando a nuestro
 * catálogo.
 *
 * No es una traducción del catálogo entero —serían ciento cuarenta entradas y
 * la mitad no aparece nunca en una exportación—, sino los que salen en casi
 * todos los historiales. Importa porque un ejercicio reconocido **es** el
 * mismo ejercicio: su historial alimenta la progresión y sus récords son los
 * tuyos. Uno sin reconocer se guarda igual, pero vive aparte.
 *
 * Lo que no se reconozca aquí no se pierde: se guarda con su nombre tal cual.
 */
const ALIAS_EN: Record<string, string> = {
  'bench press barbell': 'press_banca_barra',
  'bench press dumbbell': 'press_banca_mancuernas',
  'incline bench press barbell': 'press_inclinado_barra',
  'incline bench press dumbbell': 'press_inclinado_mancuernas',
  'chest fly dumbbell': 'aperturas_mancuernas',
  'chest fly cable': 'aperturas_polea',
  'push up': 'flexiones',
  'chest dip': 'fondos_paralelas',
  squat: 'sentadilla_barra',
  'squat barbell': 'sentadilla_barra',
  'front squat': 'sentadilla_frontal',
  'goblet squat': 'sentadilla_goblet',
  'bulgarian split squat': 'sentadilla_bulgara',
  'leg press': 'prensa',
  'leg extension': 'extension_cuadriceps',
  'leg curl': 'curl_femoral',
  'seated leg curl': 'curl_femoral_sentado',
  lunge: 'zancadas',
  'walking lunge': 'zancada_caminando',
  deadlift: 'peso_muerto_convencional',
  'romanian deadlift': 'peso_muerto_rumano',
  'hip thrust': 'hip_thrust',
  'standing calf raise': 'elevacion_talones_pie',
  'seated calf raise': 'elevacion_talones_sentado',
  'pull up': 'dominadas',
  'chin up': 'dominadas_supinas',
  'lat pulldown': 'jalon_polea',
  'lat pulldown cable': 'jalon_polea',
  'bent over row barbell': 'remo_barra',
  'bent over row dumbbell': 'remo_mancuerna',
  'seated cable row': 'remo_polea_sentado',
  'seated row machine': 'remo_maquina',
  'shrug dumbbell': 'encogimientos',
  'back extension': 'hiperextensiones',
  'overhead press barbell': 'press_militar_barra',
  'shoulder press dumbbell': 'press_militar_mancuernas',
  'lateral raise dumbbell': 'elevaciones_laterales',
  'front raise dumbbell': 'elevaciones_frontales',
  'rear delt fly': 'pajaros',
  'face pull': 'face_pull',
  'upright row': 'remo_menton',
  'bicep curl dumbbell': 'curl_biceps',
  'bicep curl barbell': 'curl_biceps',
  'hammer curl': 'curl_martillo',
  'preacher curl': 'curl_predicador',
  'triceps extension': 'extension_triceps',
  'triceps pushdown': 'extension_triceps_polea_baja',
  'skullcrusher': 'press_frances',
  'triceps dip': 'fondos_paralelas_triceps',
  plank: 'plancha',
  'hanging leg raise': 'piernas_colgado',
  crunch: 'crunch_abdominal',
  'ab wheel': 'rueda_abdominal',
  'russian twist': 'russian_twist',
  'farmers walk': 'paseo_granjero'
}

const POR_NOMBRE = new Map(EXERCISES.map((e) => [clave(e.name), e]))

/**
 * Busca el ejercicio en el catálogo: por nombre nuestro, y si no, por el
 * nombre en inglés con el que lo exportan las otras apps.
 */
function delCatalogo(nombre: string) {
  const k = clave(nombre)
  const directo = POR_NOMBRE.get(k)
  if (directo) return directo
  const id = ALIAS_EN[k]
  return id ? EXERCISES.find((e) => e.id === id) : undefined
}

/** El grupo grueso que le toca a un mapa muscular deducido. */
function grupoDe(aporte: MuscleContributions): MuscleGroup {
  const principal = (Object.entries(aporte) as [Muscle, number][]).sort((a, b) => b[1] - a[1])[0]
  if (!principal) return 'core'
  const region = regionOf(principal[0])
  if (region === 'pierna') {
    return principal[0] === 'isquiosurales'
      ? 'femoral'
      : principal[0] === 'gastrocnemio' || principal[0] === 'soleo'
        ? 'gemelo'
        : 'cuadriceps_gluteo'
  }
  return region
}

export interface FilaImportada {
  fecha: string
  entreno: string
  ejercicio: string
  serie: number
  tipo: TipoSerie
  pesoKg?: number
  reps?: number
  rir?: number
  superserie?: string
  duracionSeg?: number
}

export interface ResultadoImportacion {
  sesiones: Session[]
  /** Filas leídas que tenían algo aprovechable. */
  filas: number
  /** Ejercicios que no estaban en el catálogo y se han deducido del nombre. */
  desconocidos: string[]
  /** Por qué no se pudo leer, cuando no se pudo. */
  error?: string
  /** Avisos que no impiden importar. */
  avisos: string[]
}

/**
 * Lee un CSV de Hevy, de Strong o nuestro, y lo convierte en sesiones.
 *
 * Las sesiones importadas llegan **completadas**: son historial, no planes. Y
 * llevan sus series marcadas como hechas, porque lo están: si no, no contarían
 * ni para el volumen ni para los récords, que es justo para lo que se importan.
 */
export function csvASesiones(texto: string, opts: { prefijo?: string } = {}): ResultadoImportacion {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lineas.length < 2) {
    return { sesiones: [], filas: 0, desconocidos: [], avisos: [], error: 'El archivo está vacío.' }
  }

  const sep = separadorDe(lineas[0])
  const cabecera = partirLinea(lineas[0], sep)
  const mapa = mapaDeColumnas(cabecera)

  if (mapa.ejercicio === undefined) {
    return {
      sesiones: [],
      filas: 0,
      desconocidos: [],
      avisos: [],
      error:
        'No encuentro la columna del ejercicio. Exporta el CSV desde tu app tal cual y vuelve a probarlo, sin abrirlo ni reordenarlo.'
    }
  }
  if (mapa.fecha === undefined) {
    return {
      sesiones: [],
      filas: 0,
      desconocidos: [],
      avisos: [],
      error: 'No encuentro la columna de la fecha, y sin fecha no se puede colocar nada en el historial.'
    }
  }

  // Las libras se convierten al leer: dentro de la app todo es kilos.
  const enLibras = /lb/i.test(cabecera[mapa.peso ?? -1] ?? '')
  // «duration_seconds» son segundos; «duracion_min», minutos.
  const duracionEnSegundos = /second|seconds|_s$/.test(
    normalizar(cabecera[mapa.duracion ?? -1] ?? '')
  )

  const avisos: string[] = []
  const desconocidos = new Set<string>()
  const filas: FilaImportada[] = []
  let saltadas = 0

  for (const linea of lineas.slice(1)) {
    const c = partirLinea(linea, sep)
    const fecha = fechaIso(c[mapa.fecha] ?? '')
    const ejercicio = c[mapa.ejercicio]?.trim()
    if (!fecha || !ejercicio) {
      saltadas++
      continue
    }
    const peso = numero(c[mapa.peso ?? -1])
    const rpe = numero(c[mapa.rpe ?? -1])
    const rirColumna = numero(c[mapa.rir ?? -1])
    const duracion = numero(c[mapa.duracion ?? -1])
    filas.push({
      fecha,
      entreno: c[mapa.entreno ?? -1]?.trim() || 'Entreno importado',
      ejercicio,
      serie: numero(c[mapa.serie ?? -1]) ?? filas.length + 1,
      tipo: tipoDeSerie(c[mapa.tipo ?? -1], c[mapa.serie ?? -1]),
      pesoKg: peso !== undefined && peso > 0 ? (enLibras ? Math.round(peso * LIBRA_EN_KILOS * 10) / 10 : peso) : undefined,
      reps: numero(c[mapa.reps ?? -1]),
      // El RIR es lo que la app usa; si solo viene RPE se convierte, que es la
      // misma escala del revés: RIR = 10 − RPE.
      rir: rirColumna ?? (rpe !== undefined && rpe <= 10 ? Math.max(0, Math.round(10 - rpe)) : undefined),
      superserie: c[mapa.superserie ?? -1]?.trim() || undefined,
      duracionSeg:
        duracion !== undefined ? (duracionEnSegundos ? duracion : duracion * 60) : undefined
    })
  }

  if (filas.length === 0) {
    return {
      sesiones: [],
      filas: 0,
      desconocidos: [],
      avisos: [],
      error: 'No he podido leer ninguna serie del archivo.'
    }
  }
  if (saltadas > 0) {
    avisos.push(`${saltadas} ${saltadas === 1 ? 'fila' : 'filas'} sin fecha o sin ejercicio, saltadas.`)
  }

  // Agrupar: una sesión por día y título.
  const porSesion = new Map<string, FilaImportada[]>()
  for (const f of filas) {
    const k = `${f.fecha}|${f.entreno}`
    const ya = porSesion.get(k)
    if (ya) ya.push(f)
    else porSesion.set(k, [f])
  }

  const prefijo = opts.prefijo ?? 'imp'
  const sesiones: Session[] = []

  for (const [k, delDia] of porSesion) {
    const [fecha, titulo] = k.split('|')
    const porEjercicio = new Map<string, FilaImportada[]>()
    for (const f of delDia) {
      const ya = porEjercicio.get(f.ejercicio)
      if (ya) ya.push(f)
      else porEjercicio.set(f.ejercicio, [f])
    }

    const exercises: PlannedExercise[] = []
    for (const [nombre, series] of porEjercicio) {
      const conocido = delCatalogo(nombre)
      const aporte = conocido ? CONTRIBUTIONS[conocido.id] : (inferirPorNombre(nombre) ?? undefined)
      if (!conocido) desconocidos.add(nombre)

      const logs: SetLog[] = series
        .sort((a, b) => a.serie - b.serie)
        .map((f) => ({
          weightKg: f.pesoKg,
          reps: f.reps,
          rir: f.rir,
          tipo: f.tipo,
          ...(f.tipo === 'calentamiento' ? { warmup: true } : {}),
          done: true
        }))

      const reps = logs.map((l) => l.reps).filter((r): r is number => typeof r === 'number')
      const pesos = logs.map((l) => l.weightKg).filter((w): w is number => typeof w === 'number')

      exercises.push({
        // Un ejercicio que no está en el catálogo conserva su nombre y se le da
        // un identificador propio: mezclarlo con otro parecido falsearía tanto
        // el historial como los récords.
        exerciseId: conocido?.id ?? `importado_${clave(nombre).replace(/ /g, '_')}`,
        name: conocido?.name ?? nombre,
        primary: conocido?.primary ?? (aporte ? grupoDe(aporte) : 'core'),
        plan: {
          sets: logs.length,
          reps: reps.length > 0 ? `${Math.min(...reps)}-${Math.max(...reps)}` : '—',
          weightKg: pesos.length > 0 ? Math.max(...pesos) : undefined
        },
        logs,
        done: true,
        actualWeightKg: pesos.length > 0 ? Math.max(...pesos) : undefined,
        ...(aporte ? { muscleContributions: { ...aporte } } : {}),
        // Lo deducido se marca para revisar, igual que en la migración: un mapa
        // sacado del nombre es una conjetura, y conviene que se sepa.
        ...(conocido ? {} : { needsReview: true }),
        ...(series[0].superserie ? { supersetId: `ss-${series[0].superserie}` } : {})
      })
    }

    const duracion = delDia.find((f) => f.duracionSeg !== undefined)?.duracionSeg
    sesiones.push({
      id: `${prefijo}-${fecha}-${sesiones.length}`,
      date: fecha,
      kind: 'fuerza',
      title: titulo,
      exercises,
      completed: true,
      ...(duracion ? { durationSec: Math.round(duracion) } : {}),
      updatedAt: Date.now()
    })
  }

  if (desconocidos.size > 0) {
    avisos.push(
      `${desconocidos.size} ${desconocidos.size === 1 ? 'ejercicio no estaba' : 'ejercicios no estaban'} en el catálogo: se guardan con su nombre y el músculo deducido, marcados para que lo revises.`
    )
  }

  return {
    sesiones: sesiones.sort((a, b) => (a.date < b.date ? -1 : 1)),
    filas: filas.length,
    desconocidos: [...desconocidos],
    avisos
  }
}

/**
 * Qué traería importar esto, en una frase, antes de tocar nada.
 *
 * Importar años de historial es irreversible de hecho —aunque se pueda borrar,
 * nadie va a repasar seiscientas sesiones—, así que primero se enseña qué va a
 * entrar y luego se confirma.
 */
export function resumirImportacion(r: ResultadoImportacion): string {
  if (r.error) return r.error
  const dias = new Set(r.sesiones.map((s) => s.date)).size
  const series = r.sesiones.reduce(
    (a, s) => a + s.exercises.reduce((b, e) => b + seriesQueCuentan(e.logs).length, 0),
    0
  )
  const desde = r.sesiones[0]?.date
  const hasta = r.sesiones[r.sesiones.length - 1]?.date
  return `${r.sesiones.length} ${r.sesiones.length === 1 ? 'entreno' : 'entrenos'} en ${dias} ${
    dias === 1 ? 'día' : 'días'
  }, ${series} series, de ${desde} a ${hasta}.`
}
