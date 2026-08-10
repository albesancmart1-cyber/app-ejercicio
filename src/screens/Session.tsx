import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  SIDE_LABELS,
  TIPO_SERIE_CORTO,
  TIPO_SERIE_LABELS,
  type Equipment,
  type Exercise,
  type PlannedExercise,
  type Session,
  type SetLog,
  type SideMode,
  type TipoSerie
} from '../domain/types'
import { initLogs, rirDe, syncExercise, tipoDe, volumeLoad } from '../domain/setLogs'
import { describirSerie as describirSerieUltimaVez, describirUltimaVez } from '../domain/ultimaVez'
import { calentamientoPara, describirReparto, repartirDiscos } from '../domain/discos'
import {
  DESCANSOS,
  conDescanso,
  conNota,
  descansoDe,
  formatDescanso,
  notaDe
} from '../domain/preferencias'
import { mantenerPantalla, soportaWakeLock } from '../store/wakeLock'
import { prepararAlarma, sonarAlarma, soportaAlarma } from '../store/alarma'
import {
  NOMBRE_MARCA,
  celebrar,
  conSerie,
  describirSerieCorta,
  marcaPrevia,
  marcasDeSerie,
  recordsDe,
  type Records,
  type TipoMarca
} from '../domain/records'
import {
  desencadenar,
  encadenarConSiguiente,
  etiquetaDe,
  moverBloque,
  puedeEncadenar,
  puedeMover,
  serieEnCurso,
  siguePrevio,
  siguientePaso
} from '../domain/superseries'
import { DESCANSO_ENTRE_EJERCICIOS } from '../domain/protocol'
import { changeVariant, nextAlternative, swapExercise } from '../domain/swap'
import {
  desdeSesion,
  nombreLibre,
  nombrePropuesto,
  nombresDeCarpeta,
  sePuedeGuardar
} from '../domain/rutinas'
import { trasCambiar, trasEntrenar } from '../domain/affinity'
import { meterPesas, pesasParaMeter, puedeMeterPesas } from '../domain/mixIn'
import { prepareExercise } from '../domain/workoutBuilder'
import { implementOptions, sideOptions, variantLabel } from '../domain/variants'
import { exerciseById } from '../data/exercises'
import { actions, useAppData } from '../store/store'
import { useToday } from '../store/clock'
import { weeklyMuscleVolume } from '../domain/volume'
import { explicarEquivalencia, minutosEquivalentes, opcionesDeCardio } from '../domain/cardio'
import Icon from '../components/Icon'
import RestScreen from '../components/RestScreen'
import RecordScreen from '../components/RecordScreen'
import FocusMode from '../components/FocusMode'
import Chrono, { elapsedSeconds } from '../components/Chrono'
import ExerciseAnimation from '../components/ExerciseAnimation'
import ExercisePicker from '../components/ExercisePicker'
import ExerciseSheet from '../components/ExerciseSheet'
import { patternOf } from '../data/patterns'
import { Boton, Interruptor, Opcion } from '../components/ui'
import { Field, FieldLabel } from '@appica/ui-react/field'
import { Input } from '@appica/ui-react/input'

/** Los minutos que lleva puestos un ejercicio de cardio, si los dice. */
function minutosDe(pe: PlannedExercise): number | undefined {
  const m = pe.plan.reps.match(/(\d+)\s*min/)
  return m ? Number(m[1]) : undefined
}

/**
 * El nombre sin la coletilla entre paréntesis ni tras la coma. En una fila de
 * botones, «Trote suave (zona 2, puedes hablar) · 35 min» no cabe.
 */
function nombreCorto(nombre: string): string {
  return nombre.replace(/\s*\(.*?\)/g, '').split(',')[0].trim()
}

/** ¿Este ejercicio se hace con barra? Solo entonces hay discos que repartir. */
function conBarra(pe: PlannedExercise): boolean {
  if (pe.variant?.implement) return pe.variant.implement === 'barra' || pe.variant.implement === 'multipower'
  const ex = exerciseById(pe.exerciseId)
  return ex ? ex.equipment.includes('barra') || ex.equipment.includes('multipower') : false
}

/** «60 kg: 1×20 por lado» — y lo que falte, dicho. */
function describirDiscos(objetivoKg: number): string {
  const r = repartirDiscos(objetivoKg)
  if (r.imposible) return describirReparto(r)
  const base = `${describirReparto(r)} por lado`
  return r.desvioKg === 0 ? base : `${base} → ${r.totalKg} kg (${r.desvioKg} respecto a lo pedido)`
}

function planLabel(pe: PlannedExercise, descansoSeg?: number, enSuperserie = false): string {
  const parts = [`${pe.plan.sets} × ${pe.plan.reps}`]
  // «Ve a RIR 2» y no «RIR 2» a secas: es el objetivo, y el que cuenta luego es
  // el que se anota serie a serie.
  if (pe.plan.rir !== undefined && pe.primary !== 'cardio') parts.push(`ve a RIR ${pe.plan.rir}`)
  // Dentro de una superserie el descanso no va entre series, va al cerrar la
  // vuelta. Decir «90 s descanso» a secas ahí sería justo lo contrario.
  if (enSuperserie) parts.push('sin descanso hasta cerrar la vuelta')
  else if (descansoSeg) parts.push(`${formatDescanso(descansoSeg)} descanso`)
  const forma = variantLabel(pe.variant)
  if (forma) parts.push(forma)
  return parts.join(' · ')
}

/** Qué está abierto sobre la sesión: cambiar un ejercicio, o añadir uno nuevo. */
type Eligiendo = { modo: 'cambiar'; indice: number } | { modo: 'anadir' }

/**
 * Cómo se enseña la sesión mientras está en marcha: la serie que toca sola en
 * la pantalla, o la lista entera. Se empieza en foco —es donde se pasa el 90 %
 * del entreno— y la lista queda a un toque para lo demás.
 */
type Modo = 'foco' | 'lista'

/** Las repeticiones que pide el plan, para arrancar el contador en algo. */
function repsDelPlan(pe: PlannedExercise): number {
  const m = pe.plan.reps.match(/\d+/)
  return m ? Number(m[0]) : 8
}

/** Dónde está el descanso activo y de qué tipo. */
interface Resting {
  exercise: number
  set: number
  seconds: number
  /** Nombre del ejercicio que viene, cuando el descanso es entre ejercicios. */
  nextName?: string
}

export default function SessionScreen({ session }: { session: Session }) {
  const data = useAppData()
  const today = useToday()
  const profile = data.profile!
  const [exercises, setExercises] = useState<PlannedExercise[]>(() =>
    session.exercises.map((e) => (e.logs ? e : { ...e, logs: initLogs(e.plan) }))
  )
  const [startedAt, setStartedAt] = useState<number | undefined>(session.startedAt)
  const [rpe, setRpe] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [resting, setResting] = useState<Resting | null>(null)
  const [comoSeHace, setComoSeHace] = useState<number | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [eligiendo, setEligiendo] = useState<Eligiendo | null>(null)
  /** Qué ejercicio tiene abierto su panel de ajustes propios. */
  const [ajustando, setAjustando] = useState<number | null>(null)
  /** Foco o lista, mientras el entreno está en marcha. */
  const [modo, setModo] = useState<Modo>('foco')
  /** El menú de lo secundario, abierto sobre el modo foco. */
  const [menu, setMenu] = useState(false)
  /**
   * A qué serie toca ir ahora. En una superserie el recorrido no es de arriba
   * abajo, así que hay que decir en voz alta dónde estás: si no, se marca una
   * serie y no se sabe si toca bajar al siguiente o seguir donde estabas.
   */
  const [ahora, setAhora] = useState<{ exercise: number; set: number } | null>(null)
  /** Las tarjetas, para poder traer a la vista la que toca. */
  const tarjetas = useRef<(HTMLDivElement | null)[]>([])
  /** Qué ejercicio tiene abierta su ficha de marcas. */
  const [ficha, setFicha] = useState<number | null>(null)
  /** El formulario de guardar esto como rutina. */
  const [guardandoRutina, setGuardandoRutina] = useState(false)
  const [nombreRutina, setNombreRutina] = useState('')
  const [carpetaRutina, setCarpetaRutina] = useState('')
  /**
   * Los récords conseguidos hoy, por serie. Se guardan para que la medalla se
   * quede puesta: enterarse de que aquella fue tu mejor serie y que el aviso
   * desaparezca al marcar la siguiente sería enterarse a medias.
   */
  const [marcas, setMarcas] = useState<Record<string, TipoMarca[]>>({})
  /** El récord recién batido, mientras se enseña a pantalla completa. */
  const [record, setRecord] = useState<{
    serie: string
    anterior?: string
    ejercicio: string
    tipos: TipoMarca[]
  } | null>(null)
  /**
   * Contra qué se comparan las series de hoy. Se calcula una vez al abrir la
   * sesión —el historial no cambia mientras entrenas— y se va actualizando con
   * lo que se marca, para no cantar tres veces el mismo récord.
   */
  const recordsPrevios = useRef<Map<string, Records>>(new Map())
  /**
   * Lo que ya se ha descartado en cada hueco de la sesión, para que tocar
   * «cambiar» recorra opciones distintas en vez de ir y venir entre dos: sin
   * esto, al cambiar A por B el siguiente toque devolvía A, porque A ya no
   * estaba en la sesión y volvía a ser candidato.
   */
  const descartadosPorHueco = useRef<Map<number, string[]>>(new Map())

  const keto = data.checkIns.find((c) => c.date === session.date)?.keto ?? false
  // Con qué se planificó la sesión, para que un ejercicio elegido a mano reciba
  // el mismo trato que los propuestos.
  const contexto = { intensity: 'moderada' as const, volumeScale: 1, keto }

  /**
   * Lo anotado vivía solo en el estado del componente, así que cambiar de
   * pestaña lo desmontaba y se perdían pesos y repeticiones. Ahora se persiste
   * según se escribe —con un pequeño retardo para no guardar en cada tecla— y
   * se vuelca sí o sí al salir de la pantalla.
   */
  const ultimo = useRef({ exercises, startedAt })
  ultimo.current = { exercises, startedAt }
  // Una vez terminada o descartada, no debe resucitarla el volcado de salida.
  const cerrada = useRef(false)

  useEffect(() => {
    if (cerrada.current) return
    const id = setTimeout(() => {
      actions.saveSession({ ...session, exercises, startedAt })
    }, 300)
    return () => clearTimeout(id)
  }, [exercises, startedAt])

  useEffect(
    () => () => {
      if (!cerrada.current) {
        actions.saveSession({ ...session, ...ultimo.current })
      }
    },
    []
  )

  function updateSet(ei: number, si: number, patch: Partial<SetLog>) {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== ei) return e
        const logs = (e.logs ?? []).map((l, j) => (j === si ? { ...l, ...patch } : l))
        return syncExercise({ ...e, logs })
      })
    )
  }

  /**
   * Cicla el tipo de la serie. El orden no es alfabético: va del caso más común
   * al más raro, para que llegar a lo habitual cueste menos toques.
   */
  function ciclarTipo(ei: number, si: number) {
    const orden: TipoSerie[] = ['normal', 'calentamiento', 'fallo', 'drop']
    const actual = tipoDe(exercises[ei].logs?.[si] ?? { done: false })
    const siguiente = orden[(orden.indexOf(actual) + 1) % orden.length]
    // Se escribe también `warmup` para que una sesión guardada hoy y abierta
    // por una versión anterior siga contando bien el calentamiento.
    updateSet(ei, si, { tipo: siguiente, warmup: siguiente === 'calentamiento' })
  }

  /**
   * Mete las series de calentamiento delante de las de trabajo.
   *
   * El salto de peso sale del material: con barra hay que poner el mismo disco
   * a los dos lados, así que lo mínimo que se mueve son 2,5 kg; con mancuernas,
   * lo que salte el juego. Sin peso de trabajo no hay porcentaje que calcular y
   * el botón no aparece.
   */
  function anadirCalentamiento(ei: number) {
    const e = exercises[ei]
    const trabajo = e.plan.weightKg
    if (!trabajo) return
    const conBarra = e.variant?.implement === 'barra' || e.variant?.implement === 'multipower'
    const series = calentamientoPara(trabajo, { salto: conBarra ? 2.5 : 2 })
    if (series.length === 0) return
    setExercises((prev) =>
      prev.map((x, i) => {
        if (i !== ei) return x
        const nuevas: SetLog[] = series.map((c) => ({
          weightKg: c.weightKg,
          reps: c.reps,
          done: false,
          tipo: 'calentamiento' as const,
          warmup: true
        }))
        return { ...x, logs: [...nuevas, ...(x.logs ?? [])] }
      })
    )
  }

  /**
   * Contra qué se compara este ejercicio. Por forma, no solo por ejercicio: un
   * récord a un brazo no se mide contra los de a dos.
   */
  function previosDe(pe: PlannedExercise): { clave: string; previos: Records } {
    const clave = `${pe.exerciseId}|${pe.variant?.implement ?? ''}|${pe.variant?.side ?? ''}`
    const ya = recordsPrevios.current.get(clave)
    if (ya) return { clave, previos: ya }
    const r = recordsDe(pe.exerciseId, data.sessions, {
      variant: pe.variant,
      excluirSesion: session.id
    })
    recordsPrevios.current.set(clave, r)
    return { clave, previos: r }
  }

  /** Trae a la vista la tarjeta que toca, sin dar un salto brusco. */
  function irA(ei: number) {
    tarjetas.current[ei]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function toggleSet(ei: number, si: number) {
    // Aquí, y no en el temporizador: el navegador solo deja despertar el audio
    // desde un gesto del usuario, y este toque es el último que hay antes de
    // que la cuenta atrás llegue a cero ella sola.
    if (profile.alarmaDescanso !== false) prepararAlarma()
    const ejercicio = exercises[ei]
    const marcando = ejercicio.logs?.[si]?.done !== true
    updateSet(ei, si, { done: marcando })

    if (!marcando) {
      setResting(null)
      setAhora(null)
      // Desmarcar una serie retira su medalla: si no se hizo, no hay récord.
      setMarcas((m) => {
        const { [`${ejercicio.exerciseId}-${si}`]: _fuera, ...resto } = m
        return resto
      })
      return
    }
    if (ejercicio.primary === 'cardio') return

    // ¿Ha sido esta serie lo mejor que has hecho aquí? Se mira ahora, con la
    // serie recién marcada: enterarse media hora después no es enterarse.
    const serie = { ...(ejercicio.logs?.[si] ?? { done: false }), done: true }
    const { clave, previos } = previosDe(ejercicio)
    const nuevas = marcasDeSerie(serie, previos)
    recordsPrevios.current.set(clave, conSerie(previos, serie, session.date))
    if (nuevas.length > 0) {
      setMarcas((m) => ({ ...m, [`${ejercicio.exerciseId}-${si}`]: nuevas }))
      setAviso(celebrar(nuevas, serie, previos) ?? null)
      // Y se celebra en condiciones: a pantalla completa y un segundo. Es lo
      // único del entreno que uno cuenta luego.
      setRecord({
        serie: describirSerieCorta(serie),
        anterior: marcaPrevia(nuevas, previos),
        ejercicio: ejercicio.name,
        tipos: nuevas
      })
    }

    // Quién va después —y si hay descanso de por medio— lo decide el recorrido,
    // que sabe de superseries. Aquí solo se pinta lo que diga.
    const paso = siguientePaso(exercises, ei, si, {
      descanso: (pe) => descansoDe(profile, pe.exerciseId, pe.plan.restSeconds),
      entreEjercicios: DESCANSO_ENTRE_EJERCICIOS
    })

    if (!paso) {
      setResting(null)
      setAhora(null)
      return
    }

    if (paso.tipo === 'encadena') {
      // Lo que hace que una superserie sea una superserie: nada de descanso, y
      // la siguiente tarjeta delante de los ojos.
      setResting(null)
      setAhora({ exercise: paso.exercise, set: paso.set })
      irA(paso.exercise)
      return
    }

    setResting({ exercise: ei, set: si, seconds: paso.seconds, nextName: paso.nombre })
    setAhora(paso.exercise !== undefined ? { exercise: paso.exercise, set: paso.set ?? 0 } : null)
  }

  function encadenar(ei: number) {
    setExercises((prev) => encadenarConSiguiente(prev, ei))
    setResting(null)
    setAhora(null)
    setAviso(
      `${exercises[ei].name} y ${exercises[ei + 1].name}, encadenados: una serie de cada uno seguida y el descanso al cerrar la vuelta.`
    )
  }

  function soltar(ei: number) {
    setExercises((prev) => desencadenar(prev, ei))
    setResting(null)
    setAhora(null)
    setAviso(`${exercises[ei].name} vuelve a ir por su cuenta, con su descanso entre series.`)
  }

  /**
   * Antes esto rotaba a ciegas por las alternativas, y con dos opciones en el
   * grupo acababa yendo y viniendo entre las mismas dos. Ahora se abre la lista
   * y se elige, que es lo que uno quiere cuando el motivo del cambio la app no
   * lo puede adivinar.
   */
  function elegido(exercise: Exercise) {
    if (!eligiendo) return
    if (eligiendo.modo === 'cambiar') {
      const actual = exercises[eligiendo.indice]
      const sustituto = swapExercise(actual, exercise, profile, data.sessions, contexto)
      setExercises((prev) => prev.map((e, i) => (i === eligiendo.indice ? sustituto : e)))
      const vistos = descartadosPorHueco.current.get(eligiendo.indice) ?? []
      descartadosPorHueco.current.set(eligiendo.indice, [...vistos, actual.exerciseId])
      actions.saveProfile({
        ...profile,
        exerciseAffinity: trasCambiar(profile, actual.exerciseId, exercise.id)
      })
      setAviso(`Cambiado: ${actual.name} → ${exercise.name}.`)
    } else {
      const nuevo = prepareExercise(exercise, profile, {
        ...contexto,
        rir: exercises[0]?.plan.rir ?? 2,
        history: data.sessions,
        addedByUser: true
      })
      setExercises((prev) => [...prev, nuevo])
      setAviso(`Añadido: ${exercise.name}.`)
    }
    setEligiendo(null)
    setResting(null)
    setComoSeHace(null)
  }

  /**
   * Cambiar el ejercicio de un toque: elige la app, no el usuario.
   *
   * Pedirle que escogiera de una lista de cien era justo lo contrario del
   * propósito de esto. Aquí se sustituye directamente por otro que trabaje los
   * mismos músculos, y cada toque trae uno nuevo hasta agotar las opciones. De
   * paso, el descartado baja en la afinidad y el que entra sube un poco: la
   * próxima vez que hagan falta esos músculos, se propone antes lo que te gusta.
   */
  function cambiar(indice: number) {
    const actual = exercises[indice]
    const vistos = descartadosPorHueco.current.get(indice) ?? []
    const sesionAhora = { ...session, exercises }
    const siguiente = nextAlternative(actual, profile, sesionAhora, 'alto', vistos)
    if (!siguiente) {
      setAviso(`No tengo con qué cambiar ${actual.name.toLowerCase()} con tu material.`)
      return
    }
    descartadosPorHueco.current.set(indice, [...vistos, actual.exerciseId])
    const sustituto = swapExercise(actual, siguiente, profile, data.sessions, contexto)
    setExercises((prev) => prev.map((e, i) => (i === indice ? sustituto : e)))
    actions.saveProfile({
      ...profile,
      exerciseAffinity: trasCambiar(profile, actual.exerciseId, siguiente.id)
    })
    setAviso(`${actual.name} → ${siguiente.name}. Toca otra vez si tampoco encaja.`)
    setResting(null)
    setComoSeHace(null)
  }

  /**
   * Cambiar con qué se hace el cardio, conservando la dosis.
   *
   * No es lo mismo andar 35 minutos que trotarlos, así que al cambiar de
   * actividad se convierten los minutos: lo que se mantiene es el trabajo, no
   * el reloj.
   */
  function cambiarCardio(indice: number, destinoId: string) {
    const actual = exercises[indice]
    const destino = exerciseById(destinoId)
    if (!destino) return
    const minutosAhora = minutosDe(actual) ?? session.cardioMinutes ?? 25
    const minutos = minutosEquivalentes(actual.exerciseId, destinoId, minutosAhora)
    const nota = explicarEquivalencia(actual.exerciseId, destinoId, minutosAhora)
    setExercises((prev) =>
      prev.map((e, i) =>
        i === indice
          ? {
              ...e,
              exerciseId: destino.id,
              name: destino.name,
              plan: { ...e.plan, reps: `${minutos} min` },
              logs: e.logs?.map((l) => ({ ...l, done: false })) ?? undefined
            }
          : e
      )
    )
    if (nota) setAviso(nota)
  }

  /**
   * Quitar un ejercicio de la sesión de hoy. No se deja vaciar del todo: una
   * sesión sin nada no es una sesión, y para eso ya está descartarla sin culpa.
   */
  function quitar(ei: number): boolean {
    if (exercises.length <= 1) {
      setAviso(
        'Es el único ejercicio que queda. Si hoy no te apetece nada, descarta la sesión sin culpa: también es una decisión.'
      )
      return false
    }
    const actual = exercises[ei]
    setExercises((prev) => prev.filter((_, i) => i !== ei))
    setResting(null)
    setComoSeHace(null)
    setAviso(`Quitado: ${actual.name}. Si te arrepientes, lo tienes en la lista de añadir.`)
    return true
  }

  /**
   * Que no se lo proponga más. Si no lo quiere ver nunca, tampoco lo quiere
   * hoy: se saca también de la sesión en curso.
   */
  function noProponerMas(ei: number) {
    const actual = exercises[ei]
    actions.saveProfile({
      ...profile,
      dislikedExercises: [...new Set([...(profile.dislikedExercises ?? []), actual.exerciseId])],
      favoriteExercises: (profile.favoriteExercises ?? []).filter((id) => id !== actual.exerciseId)
    })
    const fuera = quitar(ei)
    setAviso(
      fuera
        ? `${actual.name} fuera de hoy y de las próximas sesiones. Puedes readmitirlo en Yo · Entreno.`
        : `${actual.name} no aparecerá en próximas sesiones, pero hoy se queda: es el único que hay. Puedes readmitirlo en Yo · Entreno.`
    )
  }

  /**
   * Meter pesas en un día de cardio sin salir del plan. Las elige la app: la
   * alternativa era añadirlas a mano de la lista, que es justo el trabajo que
   * esto existe para quitarte.
   */
  const pesas = useMemo(
    () =>
      puedeMeterPesas({ ...session, exercises })
        ? pesasParaMeter(data, { ...session, exercises }, session.date)
        : null,
    [data, session, exercises]
  )

  function anadirPesas() {
    if (!pesas) return
    setExercises((prev) => meterPesas(prev, pesas))
    setResting(null)
    setComoSeHace(null)
    const zonas = pesas.zonas.map((z) => MUSCLE_LABELS[z].toLowerCase()).join(', ')
    setAviso(
      `Añadidas ${pesas.exercises.length} de fuerza — ${zonas} — y el cardio queda en ${pesas.cardioMinutes} min. Las pesas van primero.`
    )
  }

  function alternarFavorito(id: string) {
    const favoritos = profile.favoriteExercises ?? []
    actions.saveProfile({
      ...profile,
      favoriteExercises: favoritos.includes(id)
        ? favoritos.filter((f) => f !== id)
        : [...favoritos, id],
      // Marcar algo como favorito lo saca de los descartados: es contradictorio.
      dislikedExercises: (profile.dislikedExercises ?? []).filter((d) => d !== id)
    })
  }

  /** Con qué y de qué forma se ha hecho. Cambia el peso sugerido, no lo anotado. */
  function ajustarVariante(ei: number, patch: { implement?: Equipment; side?: SideMode }) {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== ei) return e
        const variant = { ...e.variant, ...patch } as PlannedExercise['variant']
        return changeVariant(e, variant!, profile, data.sessions, contexto)
      })
    )
  }

  /**
   * Subir o bajar. Se mueve el **bloque**: una superserie viaja entera, porque
   * dejar a uno de sus miembros suelto en medio de la lista rompería el
   * recorrido sin que se vea por qué.
   */
  function mover(ei: number, delta: number) {
    setExercises((prev) => moverBloque(prev, ei, delta))
    setResting(null)
    setAhora(null)
    setComoSeHace(null)
  }

  function guardarRutina() {
    const rutinas = data.routines ?? []
    const rutina = desdeSesion({ ...session, exercises }, nombreLibre(rutinas, nombreRutina), {
      folder: carpetaRutina
    })
    actions.saveRoutine(rutina)
    setGuardandoRutina(false)
    setAviso(
      `Rutina «${rutina.name}» guardada${rutina.folder ? ` en ${rutina.folder}` : ''}. La tienes al preparar el día, debajo de lo que te proponga.`
    )
  }

  function empezar() {
    const ahora = Date.now()
    setStartedAt(ahora)
    actions.saveSession({ ...session, exercises, startedAt: ahora })
  }

  function descartar() {
    cerrada.current = true
    actions.discardSession(session.id)
  }

  function guardar() {
    cerrada.current = true
    // Lo que has entrenado sube en la afinidad: es la señal más honesta de que
    // el ejercicio te vale, porque no has tenido que decir nada.
    actions.saveProfile({
      ...profile,
      exerciseAffinity: trasEntrenar(profile, { ...session, exercises })
    })
    actions.saveSession({
      ...session,
      exercises,
      rpe: rpe ?? undefined,
      startedAt,
      durationSec: startedAt ? elapsedSeconds(startedAt) : undefined,
      completed: true
    })
  }

  const doneSets = exercises.reduce((acc, e) => acc + (e.logs ?? []).filter((l) => l.done).length, 0)
  const totalSets = exercises.reduce((acc, e) => acc + (e.logs ?? []).length, 0)
  const volumen = exercises.reduce((acc, e) => acc + volumeLoad(e), 0)
  const enMarcha = startedAt !== undefined

  // La pantalla se mantiene encendida solo mientras el entreno está en marcha,
  // y se suelta al salir de la pantalla: fuera de aquí no hay motivo para
  // gastar batería.
  useEffect(() => {
    const activo = enMarcha && profile.keepAwake === true
    mantenerPantalla(activo)
    return () => mantenerPantalla(false)
  }, [enMarcha, profile.keepAwake])


  /*
   * Los dos momentos del entreno toman la pantalla entera, y en este orden: el
   * récord primero —dura cuatro segundos— y debajo espera el descanso, que es
   * donde se cae al cerrarlo.
   */
  if (record) {
    return (
      <RecordScreen
        serie={record.serie}
        anterior={record.anterior}
        ejercicio={record.ejercicio}
        tipos={record.tipos}
        onCerrar={() => setRecord(null)}
      />
    )
  }

  if (resting) {
    const deDonde = exercises[resting.exercise]
    const hecha = deDonde?.logs?.[resting.set]
    const previa = deDonde?.previous?.series[resting.set]
    const siguiente = ahora ? exercises[ahora.exercise] : undefined
    return (
      <RestScreen
        seconds={resting.seconds}
        hecho={
          hecha
            ? {
                weightKg: hecha.weightKg,
                reps: hecha.reps,
                rir: rirDe(hecha, deDonde.plan.rir),
                previo: previa ? describirSerieUltimaVez(previa) : undefined
              }
            : undefined
        }
        siguiente={
          siguiente && ahora
            ? {
                etiqueta: etiquetaDe(exercises, ahora.exercise),
                nombre: siguiente.name,
                detalle: `Serie ${ahora.set + 1}${
                  siguiente.plan.weightKg ? ` · ${siguiente.plan.weightKg} kg` : ''
                } · ${siguiente.plan.reps}`
              }
            : undefined
        }
        conAlarma={profile.alarmaDescanso !== false}
        onCorregir={() => setResting(null)}
        onSkip={() => setResting(null)}
      />
    )
  }

  if (ficha !== null && exercises[ficha]) {
    return (
      <ExerciseSheet
        exerciseId={exercises[ficha].exerciseId}
        name={exercises[ficha].name}
        sessions={data.sessions}
        todayIso={today}
        onClose={() => setFicha(null)}
      />
    )
  }

  if (eligiendo) {
    const actual = eligiendo.modo === 'cambiar' ? exercises[eligiendo.indice] : undefined
    return (
      <ExercisePicker
        profile={profile}
        title={actual ? `En lugar de ${actual.name.toLowerCase()}` : 'Añadir un ejercicio'}
        initialGroup={actual?.primary}
        inSession={exercises.map((e) => e.exerciseId)}
        volumenActual={weeklyMuscleVolume(data.sessions, today)}
        seriesPrevistas={session.exercises[0]?.plan.sets ?? 3}
        landmarkOpts={{ overrides: profile.landmarkOverrides, deficit: profile.deficitPhase }}
        onPick={elegido}
        onToggleFavorite={alternarFavorito}
        onClose={() => setEligiendo(null)}
      />
    )
  }

  /*
   * Dónde está uno ahora mismo. Manda `ahora` —lo que dijo el recorrido al
   * marcar la última serie, que en una superserie no es la de debajo— y solo si
   * no sirve se recalcula mirando la lista.
   */
  const puntoDeFoco = (() => {
    if (ahora) {
      const pe = exercises[ahora.exercise]
      const log = pe?.logs?.[ahora.set]
      if (pe && pe.primary !== 'cardio' && log && !log.done) return ahora
    }
    return serieEnCurso(exercises)
  })()

  /*
   * El modo foco: mientras se entrena, una serie en la pantalla y nada más.
   *
   * Se cae solo a la lista cuando ya no queda nada que marcar —ahí lo que toca
   * es terminar— y cuando se pide verla, que es de donde salen los cambios de
   * plan.
   */
  if (enMarcha && modo === 'foco' && puntoDeFoco) {
    const ei = puntoDeFoco.exercise
    const si = puntoDeFoco.set
    const e = exercises[ei]
    const serie = e.logs?.[si] ?? { done: false }
    const previa = e.previous?.series[si]
    const paso = siguientePaso(exercises, ei, si, {
      descanso: (pe) => descansoDe(profile, pe.exerciseId, pe.plan.restSeconds),
      entreEjercicios: DESCANSO_ENTRE_EJERCICIOS
    })
    const nombreSiguiente = paso?.nombre
    const indiceSiguiente = paso?.exercise

    const cerrarMenu = (hacer: () => void) => {
      setMenu(false)
      hacer()
    }

    return (
      <>
        <FocusMode
          ejercicio={e}
          etiqueta={etiquetaDe(exercises, ei)}
          set={serie}
          totalSeries={(e.logs ?? []).length}
          serieN={si + 1}
          totalSerieN={{ hechas: doneSets, total: totalSets }}
          conBarra={conBarra(e)}
          crono={<Chrono startedAt={startedAt!} />}
          pesoSugerido={e.plan.weightKg}
          repsSugeridas={repsDelPlan(e)}
          ultimaVez={previa ? `La última vez: ${describirSerieUltimaVez(previa)}` : undefined}
          discos={conBarra(e) && serie.weightKg ? describirDiscos(serie.weightKg) : undefined}
          siguiente={
            nombreSiguiente
              ? {
                  etiqueta:
                    indiceSiguiente !== undefined ? etiquetaDe(exercises, indiceSiguiente) : undefined,
                  nombre: nombreSiguiente,
                  sinDescanso: paso?.tipo === 'encadena'
                }
              : undefined
          }
          onCambiarPeso={(delta) => {
            const base = serie.weightKg ?? e.plan.weightKg ?? 0
            updateSet(ei, si, { weightKg: Math.max(0, Math.round((base + delta) * 4) / 4) })
          }}
          onCambiarReps={(delta) => {
            const base = serie.reps ?? repsDelPlan(e)
            updateSet(ei, si, { reps: Math.max(0, base + delta) })
          }}
          // Volver a tocar el que ya está puesto lo quita: anotar un RIR por
          // error y no poder desanotarlo falsearía la fatiga del día.
          onCambiarRir={(rir) => updateSet(ei, si, { rir: serie.rir === rir ? undefined : rir })}
          onCambiarTipo={() => ciclarTipo(ei, si)}
          onHecha={() => toggleSet(ei, si)}
          onMenu={() => setMenu(true)}
          onVerTodo={() => setModo('lista')}
        />

        {aviso && <p className="faint focus-aviso">{aviso}</p>}

        {menu && (
          <div className="hoja-fondo fade-in" onClick={() => setMenu(false)}>
            <div
              className="hoja"
              role="dialog"
              aria-label={`Opciones de ${e.name}`}
              onClick={(ev) => ev.stopPropagation()}
            >
              <p className="eyebrow">{e.name}</p>
              <div className="hoja-acciones">
                {patternOf(e.exerciseId) && (
                  <button
                    onClick={() =>
                      cerrarMenu(() => {
                        setComoSeHace(ei)
                        setModo('lista')
                      })
                    }
                  >
                    ¿Cómo se hace?
                  </button>
                )}
                <button onClick={() => cerrarMenu(() => setFicha(ei))}>Mis marcas</button>
                <button onClick={() => cerrarMenu(() => cambiar(ei))}>Cambiar ejercicio</button>
                <button
                  onClick={() => cerrarMenu(() => setEligiendo({ modo: 'cambiar', indice: ei }))}
                >
                  Elegirlo yo de la lista
                </button>
                {e.plan.weightKg ? (
                  <button onClick={() => cerrarMenu(() => anadirCalentamiento(ei))}>
                    Añadir calentamiento
                  </button>
                ) : null}
                {etiquetaDe(exercises, ei) ? (
                  <button onClick={() => cerrarMenu(() => soltar(ei))}>Sacar de la superserie</button>
                ) : null}
                {puedeEncadenar(exercises, ei) && (
                  <button onClick={() => cerrarMenu(() => encadenar(ei))}>
                    Encadenar con el siguiente
                  </button>
                )}
                <button
                  onClick={() =>
                    cerrarMenu(() => {
                      setAjustando(ei)
                      setModo('lista')
                    })
                  }
                >
                  Descanso y notas
                </button>
                <button onClick={() => cerrarMenu(() => quitar(ei))}>Quitar de hoy</button>
                <button onClick={() => cerrarMenu(() => noProponerMas(ei))}>
                  No me lo propongas más
                </button>
              </div>
              <div className="hoja-acciones hoja-sesion">
                <button onClick={() => cerrarMenu(() => setModo('lista'))}>
                  Ver todos los ejercicios
                </button>
                <button
                  onClick={() =>
                    cerrarMenu(() => {
                      setModo('lista')
                      setFinishing(true)
                    })
                  }
                >
                  Terminar el entreno
                </button>
              </div>
              <Boton tono="callado" onClick={() => setMenu(false)}>
                Cerrar
              </Boton>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="fade-in">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          {enMarcha ? 'En marcha' : 'Tu plan de hoy'}
        </p>
        {enMarcha && <Chrono startedAt={startedAt!} />}
      </div>
      <h1>{session.title}</h1>
      <p className="lede">
        {enMarcha
          ? `${doneSets} de ${totalSets} series. A tu ritmo: quedarte con ganas de más es la idea.`
          : 'Revisa el plan con calma: cambia lo que no encaje y ordénalo como quieras. Cuando estés, empezamos.'}
      </p>

      {/* La lista es la vista de los cambios de plan; la de entrenar es la
          otra. Por eso la puerta de vuelta va arriba y no al final. */}
      {enMarcha && puntoDeFoco && (
        <Boton tono="secundario" onClick={() => setModo('foco')}>
          Volver a la serie que toca
        </Boton>
      )}

      {exercises.map((e, ei) => (
        <div
          className={[
            'card',
            etiquetaDe(exercises, ei) ? 'en-superserie' : '',
            siguePrevio(exercises, ei) ? 'sigue-superserie' : '',
            ahora?.exercise === ei ? 'toca-ahora' : ''
          ]
            .filter(Boolean)
            .join(' ')}
          key={`${e.exerciseId}-${ei}`}
          ref={(nodo) => {
            tarjetas.current[ei] = nodo
          }}
        >
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="item-title">
                {etiquetaDe(exercises, ei) && (
                  <span className="ss-tag" title="Superserie">
                    {etiquetaDe(exercises, ei)}
                  </span>
                )}
                {e.name}
              </div>
              <div className="item-meta">
                {planLabel(
                  e,
                  descansoDe(profile, e.exerciseId, e.plan.restSeconds),
                  etiquetaDe(exercises, ei) !== undefined
                )}
              </div>
              {e.previous && (
                <div className="last-time">
                  <span className="last-time-tag">La última vez</span>
                  {describirUltimaVez(e.previous, today)}
                </div>
              )}
              {e.progressNote && <div className="progress-note">{e.progressNote}</div>}
            </div>
            <div className="reorder">
              <button
                onClick={() => mover(ei, -1)}
                disabled={!puedeMover(exercises, ei, -1)}
                aria-label={`Subir ${e.name}`}
              >
                ↑
              </button>
              <button
                onClick={() => mover(ei, 1)}
                disabled={!puedeMover(exercises, ei, 1)}
                aria-label={`Bajar ${e.name}`}
              >
                ↓
              </button>
            </div>
          </div>

          {/* Dónde estás del recorrido. En una superserie es imprescindible: la
              serie que toca no es la de debajo, es la de otra tarjeta. */}
          {ahora?.exercise === ei && (
            <p className="ahora-toca">Ahora: serie {ahora.set + 1}</p>
          )}

          <div className="exercise-actions">
            {patternOf(e.exerciseId) && (
              <button
                className="disclose"
                aria-expanded={comoSeHace === ei}
                onClick={() => setComoSeHace(comoSeHace === ei ? null : ei)}
              >
                <Icon name="chevron" />
                ¿Cómo se hace?
              </button>
            )}
            {e.primary !== 'cardio' && (
              <button className="disclose" onClick={() => setFicha(ei)}>
                <Icon name="spark" />
                Mis marcas
              </button>
            )}
            {e.primary !== 'cardio' && (
              <>
                <button className="disclose" onClick={() => cambiar(ei)}>
                  <Icon name="spark" />
                  Cambiar ejercicio
                </button>
                <button
                  className="disclose"
                  onClick={() => setEligiendo({ modo: 'cambiar', indice: ei })}
                >
                  <Icon name="chevron" />
                  Elegirlo yo de la lista
                </button>
              </>
            )}
            {/* Quitarlo de hoy está disponible también para el cardio: hay días
                en que lo que sobra es justo eso. */}
            <button
              className="disclose"
              onClick={() => quitar(ei)}
              aria-label={`Quitar ${e.name} de la sesión de hoy`}
            >
              <Icon name="close" />
              Quitar
            </button>
            {/* Encadenar es una decisión del momento —hoy tengo prisa, hoy
                quiero apretar— y por eso vive aquí y no en los ajustes. */}
            {etiquetaDe(exercises, ei) && (
              <button className="disclose" onClick={() => soltar(ei)}>
                <Icon name="close" />
                Sacar de la superserie
              </button>
            )}
            {/* Sale también en el último de un grupo: así se mete un tercero sin
                tener que deshacer nada. */}
            {puedeEncadenar(exercises, ei) && (
              <button className="disclose" onClick={() => encadenar(ei)}>
                <Icon name="spark" />
                Encadenar con el siguiente
              </button>
            )}
            {e.primary !== 'cardio' && e.plan.weightKg ? (
              <button className="disclose" onClick={() => anadirCalentamiento(ei)}>
                <Icon name="chevron" />
                Añadir calentamiento
              </button>
            ) : null}
            {e.primary !== 'cardio' && (
              <button
                className="disclose"
                onClick={() => setAjustando(ajustando === ei ? null : ei)}
              >
                <Icon name="chevron" />
                {ajustando === ei ? 'Cerrar los ajustes' : 'Descanso y notas'}
              </button>
            )}
            {e.primary !== 'cardio' && (
              <Boton tono="callado" className="btn-inline" onClick={() => noProponerMas(ei)}>
                No me lo propongas más
              </Boton>
            )}
          </div>
          {comoSeHace === ei && (
            <div className="how-to fade-in">
              <ExerciseAnimation pattern={patternOf(e.exerciseId)!} />
            </div>
          )}

          {(() => {
            const ex = exerciseById(e.exerciseId)
            if (!ex) return null
            const materiales = implementOptions(ex, profile)
            const lados = sideOptions(ex)
            if (materiales.length === 0 && lados.length === 0) return null
            return (
              <>
                <p className="faint" style={{ fontSize: '0.76rem', margin: '12px 0 0' }}>
                  ¿Cómo lo haces? Se guarda con la serie, y el peso que te sugiera la próxima vez
                  será el de esta misma forma.
                </p>
                {materiales.length > 0 && (
                  <div className="variant-row">
                    {materiales.map((eq) => (
                      <Opcion
                        key={eq}
                        activa={e.variant?.implement === eq}
                        onElegir={() => ajustarVariante(ei, { implement: eq })}
                      >
                        {EQUIPMENT_LABELS[eq]}
                      </Opcion>
                    ))}
                  </div>
                )}
                {lados.length > 0 && (
                  <div className="variant-row">
                    {lados.map((s) => (
                      <Opcion
                        key={s}
                        activa={e.variant?.side === s}
                        onElegir={() => ajustarVariante(ei, { side: s })}
                      >
                        {SIDE_LABELS[s]}
                      </Opcion>
                    ))}
                  </div>
                )}
              </>
            )
          })()}

          {/*
            Lo que se ajusta una vez y vale para siempre: cuánto descansa uno en
            **este** ejercicio y la nota que no quiere volver a averiguar. Va en
            el perfil, no en la sesión, así que la próxima vez ya está puesto.
          */}
          {ajustando === ei && e.primary !== 'cardio' && (
            <div className="fade-in ex-prefs">
              <p className="eyebrow">Descanso entre series</p>
              <div className="options">
                {DESCANSOS.map((seg) => (
                  <Opcion
                    key={seg}
                    activa={descansoDe(profile, e.exerciseId, e.plan.restSeconds) === seg}
                    onElegir={() => actions.saveProfile(conDescanso(profile, e.exerciseId, seg))}
                  >
                    {formatDescanso(seg)}
                  </Opcion>
                ))}
              </div>
              <Field className="field" style={{ marginTop: 14 }}>
  <FieldLabel>Tu nota para este ejercicio</FieldLabel>
  <Input
                  type="text"
                  placeholder="El agujero del asiento, el agarre que no molesta…"
                  defaultValue={notaDe(profile, e.exerciseId)}
                  onBlur={(ev) => actions.saveProfile(conNota(profile, e.exerciseId, ev.target.value))}
                  aria-label={`Nota para ${e.name}`}
                />
</Field>
              {/*
                Un ajuste que solo puede estar puesto o quitado es un
                interruptor, no dos botones. Con el par de «Sí»/«No» hacían falta
                dos elementos y una lectura para saber cuál estaba activo; el
                interruptor lo dice con su propia posición y ocupa la mitad.
              */}
              {soportaWakeLock() && (
                <label className="row ajuste-si-no">
                  <span className="dim">Que la pantalla no se apague</span>
                  <Interruptor
                    checked={profile.keepAwake === true}
                    onCheckedChange={(v) => actions.saveProfile({ ...profile, keepAwake: v })}
                  />
                </label>
              )}
              {soportaAlarma() && (
                <label className="row ajuste-si-no">
                  <span className="dim">Alarma al acabar el descanso</span>
                  <Interruptor
                    checked={profile.alarmaDescanso !== false}
                    onCheckedChange={(v) => {
                      // Al encenderla se prueba en el mismo toque: así se oye
                      // cómo suena y, de paso, queda el audio despierto, que es
                      // lo que el navegador solo permite desde un gesto.
                      if (v) {
                        prepararAlarma()
                        sonarAlarma()
                      }
                      actions.saveProfile({ ...profile, alarmaDescanso: v })
                    }}
                    aria-label="Alarma sonora al acabar el descanso"
                  />
                </label>
              )}
              {soportaAlarma() && profile.alarmaDescanso !== false && (
                <p className="faint" style={{ marginTop: 8 }}>
                  Suena en el propio móvil, sin notificaciones ni permisos. Con el timbre en
                  silencio no se oye: el navegador usa el volumen de multimedia.
                </p>
              )}
            </div>
          )}

          {/* La nota propia se ve siempre, no solo con los ajustes abiertos. */}
          {notaDe(profile, e.exerciseId) && ajustando !== ei && (
            <p className="ex-note">{notaDe(profile, e.exerciseId)}</p>
          )}

          <div style={{ height: 10 }} />

          {e.primary === 'cardio' && (
            <div className="cardio-swap">
              <p className="faint" style={{ marginBottom: 8 }}>
                ¿Con qué te apetece hoy? Cambio los minutos para que el trabajo sea el mismo.
              </p>
              <div className="options">
                {opcionesDeCardio(
                  profile,
                  session.kind,
                  e.exerciseId,
                  minutosDe(e) ?? session.cardioMinutes ?? 25
                ).map((o) => (
                  <Opcion
                    key={o.exercise.id}
                    activa={o.actual}
                    onElegir={() => cambiarCardio(ei, o.exercise.id)}
                  >
                    {nombreCorto(o.exercise.name)} · {o.minutos} min
                  </Opcion>
                ))}
              </div>
            </div>
          )}

          {e.primary === 'cardio' ? (
            <div className="set-row">
              <span className="set-index">·</span>
              <span className="dim" style={{ flex: 1 }}>
                {e.plan.reps}
              </span>
              <button
                className="check"
                aria-pressed={e.logs?.[0]?.done === true}
                aria-label={`Marcar ${e.name}`}
                onClick={() => toggleSet(ei, 0)}
              >
                <Icon name="check" />
              </button>
            </div>
          ) : (
            (e.logs ?? []).map((serie, si) => (
              <div key={si}>
                <div className="set-row">
                  {/*
                    El número de la serie es además su tipo: se toca y cicla
                    entre normal, calentamiento, al fallo y drop set. Un botón
                    donde ya había un número, en vez de un control nuevo: en una
                    fila de 390 píxeles no cabe nada más.
                  */}
                  <button
                    className={`set-index set-type set-type-${tipoDe(serie)}`}
                    onClick={() => ciclarTipo(ei, si)}
                    aria-label={`Serie ${si + 1}: ${TIPO_SERIE_LABELS[tipoDe(serie)].toLowerCase()}. Tocar para cambiar de tipo`}
                  >
                    {TIPO_SERIE_CORTO[tipoDe(serie)] || si + 1}
                  </button>
                  <label className="set-field">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={e.plan.weightKg ? `${e.plan.weightKg}` : '—'}
                      value={serie.weightKg ?? ''}
                      onChange={(ev) =>
                        updateSet(ei, si, { weightKg: ev.target.value ? Number(ev.target.value) : undefined })
                      }
                      aria-label={`Peso de la serie ${si + 1} de ${e.name}`}
                    />
                    <span>kg</span>
                  </label>
                  <label className="set-field">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={e.plan.reps.split('-')[0]}
                      value={serie.reps ?? ''}
                      onChange={(ev) =>
                        updateSet(ei, si, { reps: ev.target.value ? Number(ev.target.value) : undefined })
                      }
                      aria-label={`Repeticiones de la serie ${si + 1} de ${e.name}`}
                    />
                    <span>reps</span>
                  </label>
                  {/* El RIR al que se fue de verdad. El plan pide uno, pero el
                      que cuenta para el estrés es este. */}
                  <label className="set-field set-field-rir">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={10}
                      placeholder={e.plan.rir !== undefined ? `${e.plan.rir}` : '—'}
                      value={serie.rir ?? ''}
                      onChange={(ev) =>
                        updateSet(ei, si, { rir: ev.target.value ? Number(ev.target.value) : undefined })
                      }
                      aria-label={`Repeticiones en reserva reales de la serie ${si + 1} de ${e.name}`}
                    />
                    <span>RIR</span>
                  </label>
                  <button
                    className="check"
                    aria-pressed={serie.done}
                    aria-label={`Marcar serie ${si + 1} de ${e.name}`}
                    onClick={() => toggleSet(ei, si)}
                  >
                    <Icon name="check" />
                  </button>
                </div>
                {/*
                  Qué discos poner, solo cuando hay barra de por medio: con
                  mancuernas no hay nada que repartir. Se calcula sobre el peso
                  que hay escrito en esa serie, no sobre el del plan, porque lo
                  que se monta es lo que se va a levantar.
                */}
                {conBarra(e) && serie.weightKg ? (
                  <p className="plate-hint">{describirDiscos(serie.weightKg)}</p>
                ) : null}
                {/* La medalla se queda puesta el resto de la sesión: es lo
                    único del entreno que uno quiere volver a mirar. */}
                {marcas[`${e.exerciseId}-${si}`] && (
                  <p className="record-hint">
                    <Icon name="spark" />
                    {marcas[`${e.exerciseId}-${si}`].map((t) => NOMBRE_MARCA[t]).join(' · ')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      ))}

      {/* La puerta principal para meter pesas está en la recomendación, pero a
          veces las ganas llegan mirando ya el plan del día. Aquí no hay que
          elegir nada: las pone la app. */}
      {pesas && (
        <>
          <Boton tono="primario" onClick={anadirPesas}>
            Añadir pesas · te las elijo yo
          </Boton>
          <p className="faint" style={{ margin: '0 0 14px' }}>
            {pesas.exercises.length} ejercicios de las zonas que llevan más sin trabajarse, y el
            cardio baja a {pesas.cardioMinutes} min para no cargar el día de más.
          </p>
        </>
      )}

      <Boton tono="secundario" onClick={() => setEligiendo({ modo: 'anadir' })}>
        Añadir un ejercicio de la lista
      </Boton>

      {/*
        Guardar el entreno de hoy para repetirlo. Guarda la estructura y no los
        kilos: los pesos los sigue poniendo la progresión cada vez, que es lo
        que hace que repetir una rutina no sea repetir el mismo entreno.
      */}
      {sePuedeGuardar({ ...session, exercises }) && (
        <>
          {!guardandoRutina ? (
            <Boton tono="callado"
              onClick={() => {
                setNombreRutina(nombrePropuesto(session))
                setCarpetaRutina('')
                setGuardandoRutina(true)
              }}
            >
              Guardar esto como rutina
            </Boton>
          ) : (
            <div className="card fade-in">
              <p className="eyebrow">Guardar como rutina</p>
              <p className="faint" style={{ marginBottom: 12 }}>
                Se guardan los ejercicios, el orden y las series. Los pesos no: esos los pone la
                progresión cada vez que la repitas, mirando lo que hiciste la última vez.
              </p>
              <Field className="field">
  <FieldLabel>Nombre</FieldLabel>
  <Input
                  type="text"
                  value={nombreRutina}
                  onChange={(ev) => setNombreRutina(ev.target.value)}
                  aria-label="Nombre de la rutina"
                />
</Field>
              <Field className="field" style={{ marginTop: 12 }}>
  <FieldLabel>Carpeta (opcional)</FieldLabel>
  <Input
                  type="text"
                  list="carpetas-de-rutinas"
                  placeholder="Casa, gimnasio, torso…"
                  value={carpetaRutina}
                  onChange={(ev) => setCarpetaRutina(ev.target.value)}
                  aria-label="Carpeta de la rutina"
                />
</Field>
              <datalist id="carpetas-de-rutinas">
                {nombresDeCarpeta(data.routines ?? []).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div style={{ height: 14 }} />
              <Boton tono="primario" disabled={!nombreRutina.trim()} onClick={guardarRutina}>
                Guardar rutina
              </Boton>
              <Boton tono="callado" onClick={() => setGuardandoRutina(false)}>
                Ahora no
              </Boton>
            </div>
          )}
        </>
      )}

      {aviso && (
        <p className="faint" style={{ margin: '0 4px 14px' }}>
          {aviso}
        </p>
      )}

      {!enMarcha ? (
        <>
          <Boton tono="primario" onClick={empezar}>
            Empezar entrenamiento
          </Boton>
          <Boton tono="callado" onClick={() => descartar()}>
            Hoy no puedo — descartar sin culpa
          </Boton>
        </>
      ) : !finishing ? (
        <>
          {volumen > 0 && (
            <p className="faint" style={{ margin: '0 4px 14px' }}>
              Volumen de hoy: {Math.round(volumen).toLocaleString('es-ES')} kg levantados.
            </p>
          )}
          <Boton tono="primario" disabled={doneSets === 0} onClick={() => setFinishing(true)}>
            Terminar
          </Boton>
          <Boton tono="callado" onClick={() => descartar()}>
            Hoy no puedo — descartar sin culpa
          </Boton>
        </>
      ) : (
        <div className="card fade-in">
          <p className="eyebrow">Última pregunta</p>
          <h2 style={{ marginBottom: 16 }}>¿Cómo te has sentido?</h2>
          <div className="scale">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button key={n} aria-pressed={rpe === n} onClick={() => setRpe(n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="scale-legend">
            <span className="faint">Muy duro</span>
            <span className="faint">Muy cómodo</span>
          </div>
          <p className="faint" style={{ marginTop: 14 }}>
            Con las repeticiones que has anotado y esta sensación ajustamos las cargas de la próxima.
          </p>
          <div style={{ height: 20 }} />
          <Boton tono="primario" onClick={guardar}>
            Guardar el entreno
          </Boton>
        </div>
      )}
    </div>
  )
}
