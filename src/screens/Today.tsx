import { Suspense, lazy, useMemo, useState } from 'react'
import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type CheckIn,
  type MuscleGroup,
  type Routine
} from '../domain/types'
import PesoDeHoy from '../components/PesoDeHoy'
import SolDeHoy from '../components/SolDeHoy'
import { computeReadiness, tieneLevesRepartidas, zonasConMolestias } from '../domain/readiness'
import { canIntensify, canMix, recommend, withMoreIntensity, withSomeStrength } from '../domain/recommender'
import { NIVEL_MAXIMO, volumePlan } from '../domain/progression'
import { interpretTrend } from '../domain/trend'
import { buildSession } from '../domain/workoutBuilder'
import { actions, useAppData } from '../store/store'
import { useToday } from '../store/clock'
import { findActiveSession } from '../domain/activeSession'
import { razonesCortas, resumenDelPlan, tituloDeHoy } from '../domain/decision'
import { aSesion, carpetasDe, describirRutina } from '../domain/rutinas'
import Icon from '../components/Icon'
import VolumeLevelChooser from '../components/VolumeLevelChooser'
import ReadinessRing from '../components/ReadinessRing'
import WeekStrip from '../components/WeekStrip'
/*
 * La pantalla de entrenar, aparte.
 *
 * Es la más pesada de la app —se lleva el cajón de opciones y los contadores—
 * y solo hace falta cuando de verdad se está entrenando. Quien abre «Hoy» para
 * ver qué le toca y decide que hoy no, no descarga nada de eso.
 */
const SessionScreen = lazy(() => import('./Session'))
import { Boton, CampoNumero, Escala, Etiqueta, Opcion, Regla } from '../components/ui'
import { explicarPeso } from '../domain/explicacionPeso'
import {
  MI_MATERIAL,
  describirLocalizacion,
  localizacionPorId,
  localizacionesDe,
  perfilEn
} from '../domain/localizaciones'
import { MINUTOS_DISPONIBLES, ajustarATiempo, type MinutosDisponibles } from '../domain/tiempo'
import { ordenarGrupos } from '../domain/superseries'
import { descansoDe } from '../domain/preferencias'
import { weeklyMuscleVolume } from '../domain/volume'

type Scale = 1 | 2 | 3 | 4 | 5
type YesNoKey =
  | 'lightHygiene'
  | 'sunrise'
  | 'sunsetYesterday'
  | 'sunExposure'
  | 'keto'
  | 'wokeHungry'
  | 'cravings'

const HABITS: { q: string; key: YesNoKey }[] = [
  { q: '¿Respetaste anoche la higiene lumínica?', key: 'lightHygiene' },
  { q: '¿Has visto el amanecer hoy?', key: 'sunrise' },
  { q: '¿Viste el atardecer ayer?', key: 'sunsetYesterday' },
  { q: '¿Te dio el sol ayer?', key: 'sunExposure' },
  { q: '¿Sigues en cetosis?', key: 'keto' }
]

/** Señales de leptina: no cambian el entreno de hoy, alimentan la lectura semanal. */
const APPETITE: { q: string; key: YesNoKey }[] = [
  { q: '¿Te despertaste con mucha hambre?', key: 'wokeHungry' },
  { q: '¿Tuviste antojos ayer?', key: 'cravings' }
]

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

function ScaleInput({
  value,
  onChange,
  low,
  high
}: {
  value: Scale | null
  onChange: (v: Scale) => void
  low: string
  high: string
}) {
  return (
    <>
      <Escala valor={value} onElegir={onChange} aria-label={`${low} a ${high}`} />
      <div className="scale-legend">
        <span className="faint">{low}</span>
        <span className="faint">{high}</span>
      </div>
    </>
  )
}

export default function Today() {
  const data = useAppData()
  const profile = data.profile!
  const today = useToday()

  // Tolera el cruce de medianoche: un entreno empezado a las 23:50 no se pierde.
  const activeSession = findActiveSession(data.sessions, today)
  const doneToday = data.sessions.find((s) => s.date === today && s.completed)
  const saved = data.checkIns.find((c) => c.date === today)

  const [phase, setPhase] = useState<'inicio' | 'checkin' | 'plan'>('inicio')
  const [showWhy, setShowWhy] = useState(false)
  /** El detalle del nivel de volumen, plegado: es de leer con calma. */
  const [verVolumen, setVerVolumen] = useState(false)
  // Qué ha pedido el usuario por encima de lo que tocaba: nada, pesas en vez
  // del cardio, o pesas sin renunciar al cardio.
  const [override, setOverride] = useState<'ninguno' | 'pesas' | 'mixto'>('ninguno')
  /** Dónde se entrena hoy y de cuánto tiempo se dispone. */
  const [sitio, setSitio] = useState<string>(profile.lastLocationId ?? MI_MATERIAL)
  const [minutos, setMinutos] = useState<MinutosDisponibles | null>(null)
  const [sleep, setSleep] = useState<Scale | null>(saved?.sleep ?? null)
  const [energy, setEnergy] = useState<Scale | null>(saved?.energy ?? null)
  /*
   * La báscula, dentro del test porque es cuando uno se acaba de pesar.
   * Opcional entera: un día sin pesarse no invalida el test.
   */
  const medidaHoy = data.measurements.find((m) => m.date === today)
  const [peso, setPeso] = useState<number | undefined>(medidaHoy?.weightKg)
  const [grasa, setGrasa] = useState<number | undefined>(medidaHoy?.fatPercent)
  const [musculo, setMusculo] = useState<number | undefined>(medidaHoy?.musclePercent)
  /*
   * Lo de ayer que explica la báscula de hoy. Opcional todo: cada respuesta
   * activa un factor en `explicacionPeso`, y la que falte deja ese factor sin
   * mirar — nunca se inventa.
   */
  const [ayer, setAyer] = useState<Record<'cenaTarde' | 'alcohol' | 'comidaSalada' | 'transito', boolean | null>>({
    cenaTarde: saved?.cenaTarde ?? null,
    alcohol: saved?.alcohol ?? null,
    comidaSalada: saved?.comidaSalada ?? null,
    transito: saved?.transito ?? null
  })
  const [estres, setEstres] = useState<Scale | null>(saved?.estres ?? null)
  const [horaAcostarse, setHoraAcostarse] = useState(saved?.horaAcostarse ?? '')
  const [horaLevantarse, setHoraLevantarse] = useState(saved?.horaLevantarse ?? '')
  const [habits, setHabits] = useState<Record<YesNoKey, boolean | null>>({
    lightHygiene: saved?.lightHygiene ?? null,
    sunrise: saved?.sunrise ?? null,
    sunsetYesterday: saved?.sunsetYesterday ?? null,
    sunExposure: saved?.sunExposure ?? null,
    keto: saved?.keto ?? null,
    wokeHungry: saved?.wokeHungry ?? null,
    cravings: saved?.cravings ?? null
  })
  /**
   * Molestias: varias zonas a la vez, no una.
   *
   * `null` = todavía sin contestar, que es distinto de «ninguna»: la pregunta
   * sigue siendo obligatoria para poder pasar. `respondido` guarda que ya se ha
   * tocado algo, y así «Ninguna» —que es la lista vacía— cuenta como respuesta.
   */
  const [zonas, setZonas] = useState<MuscleGroup[]>(saved ? zonasConMolestias(saved) : [])
  const [leves, setLeves] = useState(saved ? tieneLevesRepartidas(saved) : false)
  const [respondido, setRespondido] = useState(saved !== undefined)

  const complete =
    sleep !== null && energy !== null && respondido && Object.values(habits).every((v) => v !== null)

  /** Marca o desmarca una zona; marcar cualquiera deja de ser «ninguna». */
  function alternarZona(g: MuscleGroup) {
    setRespondido(true)
    setZonas((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  function sinMolestias() {
    setRespondido(true)
    setZonas([])
    setLeves(false)
  }

  const checkIn: CheckIn | null = useMemo(() => {
    if (!complete) return null
    return {
      date: today,
      sleep: sleep!,
      energy: energy!,
      lightHygiene: habits.lightHygiene!,
      sunrise: habits.sunrise!,
      sunsetYesterday: habits.sunsetYesterday!,
      sunExposure: habits.sunExposure!,
      keto: habits.keto!,
      wokeHungry: habits.wokeHungry!,
      cravings: habits.cravings!,
      discomforts: zonas,
      mildSoreness: leves,
      // Lo opcional entra solo si se contestó: `undefined` es «sin contestar»,
      // que el motor del peso distingue de «no».
      ...(ayer.cenaTarde !== null ? { cenaTarde: ayer.cenaTarde } : {}),
      ...(ayer.alcohol !== null ? { alcohol: ayer.alcohol } : {}),
      ...(ayer.comidaSalada !== null ? { comidaSalada: ayer.comidaSalada } : {}),
      ...(ayer.transito !== null ? { transito: ayer.transito } : {}),
      ...(estres !== null ? { estres } : {}),
      ...(horaAcostarse ? { horaAcostarse } : {}),
      ...(horaLevantarse ? { horaLevantarse } : {}),
      // El campo viejo se sigue rellenando como resumen, para que un check-in
      // guardado hoy se pueda leer con una versión anterior de la app.
      discomfort: zonas[0] ?? (leves ? 'leves' : 'ninguna')
    }
  }, [complete, today, sleep, energy, habits, zonas, leves, ayer, estres, horaAcostarse, horaLevantarse])

  const renderYesNo = ({ q, key }: { q: string; key: YesNoKey }, i: number) => (
    <div key={key} style={{ marginTop: i === 0 ? 0 : 18 }}>
      <div className="row">
        <span style={{ fontSize: '0.9rem' }}>{q}</span>
        <div className="options" style={{ flexWrap: 'nowrap' }}>
          <Opcion
            activa={habits[key] === true}
            onElegir={() => setHabits((p) => ({ ...p, [key]: true }))}
          >
            Sí
          </Opcion>
          <Opcion
            activa={habits[key] === false}
            onElegir={() => setHabits((p) => ({ ...p, [key]: false }))}
          >
            No
          </Opcion>
        </div>
      </div>
    </div>
  )

  const sitios = localizacionesDe(profile)
  const readiness = checkIn ? computeReadiness(checkIn) : null

  // Cuánto volumen toca hoy, según lo que el cuerpo viene demostrando y si la
  // composición corporal está estancada.
  const volumen = volumePlan({
    profile,
    sessions: data.sessions,
    checkIns: data.checkIns,
    trendState: interpretTrend(data.measurements, profile, data.checkIns, data.sessions, today).state,
    todayIso: today
  })

  const suggested =
    readiness && phase === 'plan' ? recommend(profile, readiness, data.sessions, today, volumen) : null
  // El usuario puede pedir pesas aunque tocara paseo; los guardas siguen puestos.
  const recommendation =
    suggested && readiness && override === 'pesas'
      ? withMoreIntensity(suggested, profile, readiness, data.sessions, today)
      : suggested && readiness && override === 'mixto'
        ? withSomeStrength(suggested, profile, readiness, data.sessions, today)
        : suggested

  /**
   * Prepara la sesión con el sitio y el tiempo que se hayan elegido.
   *
   * El sitio entra como un perfil con otro material, así que todo lo que ya
   * sabía filtrar por equipo sigue funcionando sin enterarse. El tiempo se
   * aplica **después** de construir: primero se decide el mejor entreno posible
   * y luego se recorta con criterio, que es distinto —y mucho mejor— que pedirle
   * al motor que construya uno pequeño desde el principio.
   */
  function startSession() {
    if (!recommendation) return
    const loc = localizacionPorId(profile, sitio)
    const perfilDelSitio = perfilEn(profile, loc)
    const sesion = buildSession(
      recommendation,
      perfilDelSitio,
      data.sessions,
      today,
      checkIn?.keto ?? false
    )

    const recorte =
      minutos === null
        ? null
        : ajustarATiempo(sesion.exercises, minutos, {
            descanso: (pe) => descansoDe(profile, pe.exerciseId, pe.plan.restSeconds),
            cardioMinutos: sesion.cardioMinutes,
            volumenSemanal: weeklyMuscleVolume(data.sessions, today)
          })

    actions.saveSession(
      recorte
        ? { ...sesion, exercises: ordenarGrupos(recorte.exercises), minutosPedidos: minutos ?? undefined }
        : sesion
    )
    // El sitio elegido se recuerda: mañana vendrá puesto.
    if (sitio !== profile.lastLocationId) {
      actions.saveProfile({ ...profile, lastLocationId: sitio })
    }
    setPhase('inicio')
  }

  /**
   * Hacer hoy una rutina guardada. El plan viene de la rutina, pero los pesos
   * los sigue poniendo la progresión: repetir un entreno no es repetir sus
   * kilos.
   */
  function empezarRutina(rutina: Routine) {
    actions.saveSession(
      aSesion(rutina, profile, data.sessions, {
        date: today,
        keto: checkIn?.keto ?? false,
        rir: recommendation?.rir
      })
    )
    setPhase('inicio')
  }

  if (activeSession) {
    return (
      <Suspense fallback={null}>
        <SessionScreen session={activeSession} />
      </Suspense>
    )
  }

  return (
    <div className="fade-in">
      {phase !== 'plan' && (
        <>
          <p className="eyebrow">{greeting()}</p>
          <h1>{profile.name !== 'Tú' ? profile.name : 'Hoy'}</h1>
        </>
      )}

      {phase === 'inicio' && (
        <div style={{ marginTop: 28 }}>
          {doneToday ? (
            <div className="card">
              <Icon name="moon" className="sun-mark" />
              <h2>Sesión completada</h2>
              <p className="dim" style={{ marginTop: 8 }}>
                «{doneToday.title}» queda registrada. Ahora el descanso es la parte que construye:
                nos vemos cuando tu cuerpo quiera.
              </p>
            </div>
          ) : (
            <div className="card">
              <Icon name="sun" className="sun-mark" />
              <h2>¿Cómo estás hoy?</h2>
              <p className="dim" style={{ marginTop: 8 }}>
                Antes de proponerte nada, cuéntame en medio minuto cómo has dormido y cómo andas de
                energía. Con eso decidimos si hoy toca empujar o recuperar.
              </p>
            </div>
          )}
          <Boton tono="primario" onClick={() => setPhase('checkin')}>
            {doneToday ? 'Preparar otra sesión' : 'Empezar'}
          </Boton>
          <PesoDeHoy
            measurements={data.measurements}
            checkIns={data.checkIns}
            sessions={data.sessions}
            comidas={data.comidas}
            todayIso={today}
          />
          <SolDeHoy sol={data.sol} todayIso={today} />
        </div>
      )}

      {phase === 'checkin' && (
        <div className="stack" style={{ marginTop: 28 }}>
          {/*
            La báscula va la primera y es opcional entera: es el momento en que
            uno se acaba de pesar, y con el dato aquí la app puede explicar cada
            mañana por qué el número se movió. Un día sin pesarse no bloquea
            nada.
          */}
          <div className="card">
            <p className="eyebrow">La báscula · si te has pesado</p>
            <div className="bascula-campos">
              <label className="bascula-campo">
                <span className="focus-label">Peso</span>
                <CampoNumero decimales valor={peso} onCambiar={setPeso} placeholder="kg" aria-label="Peso de hoy en kilos" />
              </label>
              <label className="bascula-campo">
                <span className="focus-label">Grasa</span>
                <CampoNumero decimales valor={grasa} onCambiar={setGrasa} placeholder="%" aria-label="Porcentaje de grasa de hoy" />
              </label>
              <label className="bascula-campo">
                <span className="focus-label">Músculo</span>
                <CampoNumero decimales valor={musculo} onCambiar={setMusculo} placeholder="%" aria-label="Porcentaje de músculo de hoy" />
              </label>
            </div>
            <p className="faint" style={{ marginTop: 10 }}>
              Con esto te explico cada mañana por qué el número sube o baja. Los porcentajes, si tu
              báscula los da: son lo que separa una meseta de una recomposición.
            </p>
          </div>

          <div className="card">
            <p className="eyebrow">Descanso</p>
            <h2 style={{ marginBottom: 16 }}>¿Cómo has dormido?</h2>
            <ScaleInput value={sleep} onChange={setSleep} low="Muy mal" high="De maravilla" />
            <div className="horas-sueno">
              <label>
                <span className="focus-label">Me acosté a las</span>
                <input type="time" value={horaAcostarse} onChange={(e) => setHoraAcostarse(e.target.value)} aria-label="Hora de acostarse anoche" />
              </label>
              <label>
                <span className="focus-label">Me levanté a las</span>
                <input type="time" value={horaLevantarse} onChange={(e) => setHoraLevantarse(e.target.value)} aria-label="Hora de levantarse hoy" />
              </label>
            </div>
            <Regla />
            <h2 style={{ marginBottom: 16 }}>¿Cuánta energía tienes?</h2>
            <ScaleInput value={energy} onChange={setEnergy} low="Agotado" high="A tope" />
          </div>

          <div className="card">
            <p className="eyebrow">Ritmos</p>
            {HABITS.map(renderYesNo)}
          </div>

          <div className="card">
            <p className="eyebrow">Apetito</p>
            {APPETITE.map(renderYesNo)}
            <p className="faint" style={{ marginTop: 16 }}>
              Estas dos no deciden tu entreno de hoy: son las señales con las que leo tu leptina a
              lo largo de la semana.
            </p>
          </div>

          {/*
            Lo de ayer que mueve la báscula. Opcional todo: cada respuesta
            enciende o apaga un factor de la explicación del peso, y la que se
            quede sin contestar simplemente no se mira.
          */}
          <div className="card">
            <p className="eyebrow">Lo de ayer · para explicarte la báscula</p>
            {(
              [
                { q: '¿Cenaste tarde, a menos de 3 h de acostarte?', key: 'cenaTarde' },
                { q: '¿Bebiste alcohol?', key: 'alcohol' },
                { q: '¿Alguna comida muy salada?', key: 'comidaSalada' },
                { q: '¿Has ido al baño antes de pesarte?', key: 'transito' }
              ] as const
            ).map(({ q, key }, i) => (
              <div key={key} style={{ marginTop: i === 0 ? 0 : 18 }}>
                <div className="row">
                  <span style={{ fontSize: '0.9rem' }}>{q}</span>
                  <div className="options" style={{ flexWrap: 'nowrap' }}>
                    <Opcion activa={ayer[key] === true} onElegir={() => setAyer((p) => ({ ...p, [key]: true }))}>
                      Sí
                    </Opcion>
                    <Opcion activa={ayer[key] === false} onElegir={() => setAyer((p) => ({ ...p, [key]: false }))}>
                      No
                    </Opcion>
                  </div>
                </div>
              </div>
            ))}
            <Regla />
            <h2 style={{ marginBottom: 16 }}>¿Cuánto estrés tuviste ayer?</h2>
            <ScaleInput value={estres} onChange={setEstres} low="Tranquilo" high="Muy alto" />
            <p className="faint" style={{ marginTop: 12 }}>
              Todo esto es opcional. Cada respuesta me deja explicarte mejor el número de la báscula;
              la que falte, simplemente no la miro.
            </p>
          </div>

          <div className="card">
            <p className="eyebrow">Cuerpo</p>
            <h2 style={{ marginBottom: 4 }}>¿Molestias o agujetas?</h2>
            <p className="faint" style={{ marginBottom: 14 }}>
              Marca todas las zonas que lo noten. Se sale de una sesión de empujes con el pecho y el
              tríceps cargados a la vez, y con una sola no se contaba bien.
            </p>
            <div className="options">
              <Opcion
                activa={respondido && zonas.length === 0 && !leves}
                onElegir={sinMolestias}
              >
                Ninguna
              </Opcion>
              {MUSCLE_GROUPS.filter((g) => g !== 'cardio').map((g: MuscleGroup) => (
                <Opcion key={g} activa={zonas.includes(g)} onElegir={() => alternarZona(g)}>
                  {MUSCLE_LABELS[g]}
                </Opcion>
              ))}
            </div>
            <Regla />
            <button
              className="opt opt-block"
              aria-pressed={leves}
              onClick={() => {
                setRespondido(true)
                setLeves((v) => !v)
              }}
            >
              Leves y repartidas
              <span className="opt-desc">
                Agujetas de las que no señalan a ningún sitio en concreto. Bajan el listón del día sin
                dejar nada fuera.
              </span>
            </button>
            {zonas.length > 0 && (
              <p className="faint" style={{ marginTop: 12 }}>
                {zonas.length === 1
                  ? 'Hoy dejo descansar esa zona.'
                  : `Hoy dejo descansar esas ${zonas.length} zonas, y bajo el listón: con varias cargadas el cuerpo pide menos, no solo otra cosa.`}
              </p>
            )}
          </div>

          <Boton tono="primario"
            disabled={!complete}
            onClick={() => {
              if (checkIn) actions.saveCheckIn(checkIn)
              if (peso !== undefined) {
                actions.saveMeasurement({
                  date: today,
                  weightKg: peso,
                  ...(grasa !== undefined ? { fatPercent: grasa } : {}),
                  ...(musculo !== undefined ? { musclePercent: musculo } : {})
                })
              }
              setPhase('plan')
            }}
          >
            Ver qué me conviene
          </Boton>
          <Boton tono="callado" onClick={() => setPhase('inicio')}>
            Ahora no
          </Boton>
        </div>
      )}

      {phase === 'plan' && recommendation && readiness && (
        <div className="fade-in">
          {/*
            La decisión del día, y dentro su botón.
            Antes había que pasar por siete bloques de explicación —disposición,
            mensaje, etiquetas, nivel de volumen, qué cambia, en qué me baso y
            por qué esto hoy— para llegar a «Preparar la sesión». El gesto más
            repetido de la app era el que más costaba alcanzar; ahora está en la
            primera pantalla y el matiz se queda debajo.
          */}
          <div className="card decision">
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="eyebrow" style={{ color: 'var(--accent)' }}>
                  {tituloDeHoy(recommendation).gancho}
                </p>
                <h1 className="decision-titulo">{tituloDeHoy(recommendation).titular}</h1>
                <p className="decision-meta">{resumenDelPlan(recommendation)}</p>
              </div>
              <ReadinessRing readiness={readiness} />
            </div>

            <div className="tag-row">
              <Etiqueta>Intensidad {recommendation.intensity}</Etiqueta>
              {recommendation.kind !== 'descanso_activo' && recommendation.kind !== 'cardio_suave' && (
                <Etiqueta>{recommendation.rir} reps en reserva</Etiqueta>
              )}
              {recommendation.reentry && (
                <Etiqueta>
                  Vuelta {recommendation.reentry.step}/{recommendation.reentry.total}
                </Etiqueta>
              )}
              {recommendation.ketoAdapting && <Etiqueta>Adaptación cetogénica</Etiqueta>}
              {recommendation.userOverride && <Etiqueta acento>A petición tuya</Etiqueta>}
            </div>

            {/*
              Antes de generar: dónde estás y de cuánto tiempo dispones.
              Va aquí y no en los ajustes porque las dos cosas cambian **cada
              día** —hoy en casa con media hora, mañana en el gimnasio con una—,
              y preguntarlo justo antes de construir es lo que permite construir
              bien a la primera en vez de dar un plan que no cabe.
            */}
            {recommendation.kind !== 'descanso_activo' && (
              <div className="antes-de-empezar">
                {sitios.length > 1 && (
                  <>
                    <p className="eyebrow">¿Dónde entrenas?</p>
                    <div className="options">
                      {sitios.map((l) => (
                        <Opcion key={l.id} activa={sitio === l.id} onElegir={() => setSitio(l.id)}>
                          {l.nombre}
                        </Opcion>
                      ))}
                    </div>
                    <p className="faint" style={{ margin: '6px 0 0' }}>
                      {describirLocalizacion(localizacionPorId(profile, sitio))}
                    </p>
                  </>
                )}

                <p className="eyebrow" style={{ marginTop: 14 }}>
                  ¿Cuánto tiempo tienes?
                </p>
                <div className="options">
                  <Opcion activa={minutos === null} onElegir={() => setMinutos(null)}>
                    El que haga falta
                  </Opcion>
                  {MINUTOS_DISPONIBLES.map((m) => (
                    <Opcion key={m} activa={minutos === m} onElegir={() => setMinutos(m)}>
                      {m} min
                    </Opcion>
                  ))}
                </div>
                {minutos !== null && (
                  <p className="faint" style={{ margin: '6px 0 0' }}>
                    Si no cabe, primero encadeno ejercicios en superseries y solo después quito
                    series, empezando por lo que más trabajado llevas esta semana.
                  </p>
                )}
              </div>
            )}

            <Boton tono="primario" className="decision-cta" onClick={startSession}>
              <Icon name="spark" />
              {recommendation.kind === 'descanso_activo' || recommendation.kind === 'cardio_suave'
                ? 'Empezar'
                : 'Empezar entreno'}
            </Boton>

            {override === 'ninguno' && canIntensify(recommendation) && (
              <>
                <Regla />
                {canMix(recommendation) && (
                  <>
                    <Boton tono="secundario" onClick={() => setOverride('mixto')}>
                      Pesas sin quitar el cardio
                    </Boton>
                    <p className="faint" style={{ margin: '0 0 14px' }}>
                      Unos ejercicios de fuerza primero y el cardio a la mitad,{' '}
                      {Math.round((recommendation.cardioMinutes ?? 0) / 2)} min en vez de{' '}
                      {recommendation.cardioMinutes}.
                    </p>
                  </>
                )}
                <Boton tono="secundario" onClick={() => setOverride('pesas')}>
                  Prefiero algo con pesas
                </Boton>
                <p className="faint" style={{ marginTop: 10 }}>
                  Te lo cambio por fuerza contenida, respetando igualmente tus molestias y las 48 h
                  de recuperación.
                </p>
              </>
            )}
            {override !== 'ninguno' && (
              <>
                <Regla />
                <Boton tono="callado" onClick={() => setOverride('ninguno')}>
                  Volver a lo que me tocaba
                </Boton>
              </>
            )}

            {recommendation.volume && recommendation.kind === 'fuerza' && (
              <>
                <Regla />
                {/* El nivel de volumen se pliega: es de leer con calma, no de
                    mirar antes de entrenar. Su sitio natural es Progreso. */}
                <button
                  className="disclose"
                  aria-expanded={verVolumen}
                  onClick={() => setVerVolumen((v) => !v)}
                >
                  <Icon name="chevron" />
                  Volumen · nivel {recommendation.volume.level} de {NIVEL_MAXIMO}
                  {recommendation.volume.chosenByUser ? ' · elegido por ti' : ''}
                </button>
              </>
            )}
            {recommendation.volume && recommendation.kind === 'fuerza' && verVolumen && (
              <>
                {recommendation.volume.changes.length > 0 && (
                  <>
                    <p className="faint" style={{ fontSize: '0.8rem', margin: '0 0 4px' }}>
                      Qué cambia respecto al volumen base
                    </p>
                    <ul className="reasons" style={{ marginBottom: 12 }}>
                      {recommendation.volume.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="dim">{recommendation.volume.reason}</p>
                {recommendation.volume.evidence.length > 0 && (
                  <>
                    <p className="faint" style={{ fontSize: '0.8rem', margin: '12px 0 4px' }}>
                      En qué me baso
                    </p>
                    <ul className="reasons">
                      {recommendation.volume.evidence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </>
                )}
                <VolumeLevelChooser
                  actual={recommendation.volume.level}
                  automatico={recommendation.volume.autoLevel}
                  elegidoPorTi={recommendation.volume.chosenByUser}
                  onElegir={(n) => actions.saveProfile({ ...profile, volumeLevelOverride: n })}
                  onAutomatico={() => {
                    const { volumeLevelOverride: _, ...resto } = profile
                    actions.saveProfile(resto)
                  }}
                />
              </>
            )}

          </div>

          {/* La báscula explicada, recién contestado el test: es cuando se mira. */}
          <PesoDeHoy
            measurements={data.measurements}
            checkIns={data.checkIns}
            sessions={data.sessions}
            comidas={data.comidas}
            todayIso={today}
          />

          {/* Las tres razones, fuera de la tarjeta y en tono menor: informan sin
              competir con la decisión ni con su botón. */}
          <div className="razones">
            <p className="eyebrow">Por qué esto hoy</p>
            {razonesCortas(recommendation, readiness).map((r, i) => (
              <div className="razon" key={i}>
                <span className={`razon-punto ${r.tono}`} aria-hidden="true" />
                <span>{r.texto}</span>
              </div>
            ))}
            <button className="disclose" aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>
              <Icon name="chevron" />
              {showWhy ? 'Menos detalle' : 'Con todo el detalle'}
            </button>
            {showWhy && (
              <ul className="reasons">
                {/* El párrafo largo de la recomendación. Fuera de la decisión,
                    porque a las siete de la mañana estorba; pero dentro del
                    detalle, porque es donde se dice cuánto cardio se conserva o
                    con qué carga se va a trabajar. */}
                <li>{recommendation.message}</li>
                {recommendation.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
                {readiness.notes.map((n, i) => (
                  <li key={`n${i}`}>{n}</li>
                ))}
              </ul>
            )}
          </div>

          <WeekStrip sessions={data.sessions} todayIso={today} />


          {/*
            Las rutinas guardadas van **después** de la propuesta y en tono
            menor, y no es un capricho de maquetación: lo de arriba tiene en
            cuenta cómo has dormido, qué te duele y qué llevas semanas sin
            trabajar, y una rutina fija no sabe nada de eso. Repetir una es una
            decisión de hoy que se toma a sabiendas, no un modo en el que uno se
            queda.
          */}
          {(data.routines ?? []).length > 0 && (
            <div className="card" style={{ marginTop: 8 }}>
              <p className="eyebrow">O repite una rutina tuya</p>
              <p className="faint" style={{ marginBottom: 12 }}>
                Lo de arriba está pensado para hoy —tu descanso, tus molestias, lo que llevas sin
                tocar—. Una rutina guardada no sabe nada de eso, así que elígela tú si hoy te
                apetece esa y no otra.
              </p>
              {carpetasDe(data.routines ?? []).map((c) => (
                <div key={c.nombre ?? 'sueltas'}>
                  {c.nombre && (
                    <p className="eyebrow" style={{ marginTop: 12 }}>
                      {c.nombre}
                    </p>
                  )}
                  {c.rutinas.map((r) => (
                    <button className="item item-tap" key={r.id} onClick={() => empezarRutina(r)}>
                      <div className="item-body">
                        <div className="item-title">{r.name}</div>
                        <div className="item-meta">{describirRutina(r)}</div>
                      </div>
                      <span className="chev" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          <Boton tono="callado" onClick={() => setPhase('checkin')}>
            Revisar mis respuestas
          </Boton>
        </div>
      )}
    </div>
  )
}
