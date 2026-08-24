import { useState } from 'react'
import { MUSCLE_GROUPS, MUSCLE_LABELS, type BodyMeasurement } from '../domain/types'
import {
  compareComposition,
  computeComposition,
  esMedicionValida,
  formatDelta,
  sortMeasurements
} from '../domain/body'
import { actions } from '../store/store'
import { interpretTrend, type TrendReading } from '../domain/trend'
import TrendChart from '../components/TrendChart'
import SessionDetail from '../components/SessionDetail'
import ExerciseSheet from '../components/ExerciseSheet'
import ExerciseList from '../components/ExerciseList'
import SemanaCard from '../components/SemanaCard'
import AnoCard from '../components/AnoCard'
import MonthReport from '../components/MonthReport'
import EstresCard from '../components/EstresCard'
import Icon from '../components/Icon'
import { formatDuration } from '../components/Chrono'
import { computeBalance } from '../domain/muscleBalance'
import VolumeByMuscle from '../components/VolumeByMuscle'
import { computeLeptinSignal, explicarCobertura } from '../domain/leptin'
import { Analiticas, CurvaKeto, TarjetaDeHabito } from '../components/Habitos'
import { deElPerfil, escribirUI, notaDeTemporada, resumenSemanal } from '../domain/vitaminaD'
import { coordenadasDe } from '../domain/jornada'
import { arcoDelDia } from '../domain/arcoSolar'
import { useAppData } from '../store/store'
import { useToday } from '../store/clock'
import { Boton, Etiqueta, Regla } from '../components/ui'
import { Tabs, TabsList, TabsTrigger } from '@appica/ui-react/tabs'
import { Field, FieldLabel } from '@appica/ui-react/field'
import { Input } from '@appica/ui-react/input'
import { escribirNumero, leerNumero } from '../domain/numeros'
import { nombreDeDia } from '../domain/crononutricion'

/** Los cinco destinos de Progreso, en el orden en que se miran. */
type Seccion = 'semana' | 'mes' | 'ano' | 'cuerpo' | 'habitos' | 'ejercicios'

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'ano', label: 'Año' },
  { id: 'cuerpo', label: 'Cuerpo' },
  /*
   * Los hábitos viven aquí y no en «Yo». Estaban allí sueltos, por encima del
   * propio título de la pestaña, y lo primero que veías al entrar a tus ajustes
   * eran cinco tarjetas de rampas.
   *
   * Y este es su sitio de verdad, no solo un sitio mejor: una rampa que sube de
   * escalón cada semana es progreso, exactamente igual que el volumen o la
   * curva del peso. En «Yo» está lo que se configura una vez; aquí, lo que
   * cambia solo con el tiempo.
   */
  { id: 'habitos', label: 'Hábitos' },
  { id: 'ejercicios', label: 'Ejercicios' }
]

function lastNDays(n: number): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    days.push(`${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return days
}

/** El color de estado va acompañado de icono y texto, nunca solo. */
function Verdict({ reading }: { reading: TrendReading }) {
  const clase =
    reading.state === 'recomposicion' || reading.state === 'progreso'
      ? 'verdict verdict-good'
      : reading.state === 'atencion'
        ? 'verdict verdict-warn'
        : 'verdict'
  const icono = reading.state === 'recomposicion' || reading.state === 'progreso' ? 'check' : 'sun'

  return (
    <>
      <div className={clase}>
        <Icon name={icono} className="verdict-icon" />
        <div>
          <div className="item-title">{reading.titular}</div>
          <p className="dim" style={{ marginTop: 6 }}>
            {reading.mensaje}
          </p>
        </div>
      </div>
      {reading.sugerencias.length > 0 && (
        <>
          <p className="eyebrow" style={{ marginTop: 18 }}>
            Por dónde empezar
          </p>
          <ul className="reasons">
            {reading.sugerencias.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <p className="faint" style={{ marginTop: 10 }}>
            Una cosa cada vez. No hace falta cambiarlo todo a la vez, ni pesarse más a menudo.
          </p>
        </>
      )}
    </>
  )
}

function BodyCompositionCard({
  measurements,
  heightCm,
  today,
  reading
}: {
  measurements: BodyMeasurement[]
  heightCm?: number
  today: string
  reading: TrendReading
}) {
  const [abierto, setAbierto] = useState(false)
  /**
   * Qué día se está escribiendo. Hasta ahora era siempre hoy, y por eso una
   * lectura mal tecleada se quedaba mal para siempre: no había forma de volver
   * a un día pasado. Ahora la casilla lleva su fecha, y corregir el martes es
   * lo mismo que anotar el jueves.
   */
  const [fecha, setFecha] = useState(today)
  const [peso, setPeso] = useState('')
  const [grasa, setGrasa] = useState('')
  const [musculo, setMusculo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [historial, setHistorial] = useState(false)

  const ordenadas = sortMeasurements(measurements)
  const ultima = ordenadas[0]
  const anterior = ordenadas[1]
  const primera = ordenadas[ordenadas.length - 1]

  const actual = ultima ? computeComposition(ultima, heightCm) : null
  const vsAnterior = actual && anterior ? compareComposition(actual, computeComposition(anterior, heightCm)) : null
  const vsPrimera =
    actual && primera && primera !== ultima
      ? compareComposition(actual, computeComposition(primera, heightCm))
      : null

  /** Abre la casilla en blanco para un día, o con lo que ya hubiera anotado. */
  function abrir(dia: string) {
    const ya = measurements.find((m) => m.date === dia)
    setFecha(dia)
    setPeso(ya ? escribirNumero(ya.weightKg) : '')
    setGrasa(ya?.fatPercent !== undefined ? escribirNumero(ya.fatPercent) : '')
    setMusculo(ya?.musclePercent !== undefined ? escribirNumero(ya.musclePercent) : '')
    setError(null)
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    setError(null)
  }

  function guardar() {
    // `leerNumero` y no `Number`: con el teclado español «19,9» son 19,9 y no 199.
    const kg = leerNumero(peso)
    if (kg === undefined) {
      setError('El peso no se entiende. Escríbelo con coma, por ejemplo 82,4.')
      return
    }
    const pctGrasa = grasa.trim() === '' ? undefined : leerNumero(grasa)
    const pctMusculo = musculo.trim() === '' ? undefined : leerNumero(musculo)
    if ((grasa.trim() !== '' && pctGrasa === undefined) || (musculo.trim() !== '' && pctMusculo === undefined)) {
      setError('Los porcentajes no se entienden. Escríbelos con coma, por ejemplo 19,9.')
      return
    }
    const medicion: BodyMeasurement = {
      date: fecha,
      weightKg: kg,
      fatPercent: pctGrasa,
      musclePercent: pctMusculo
    }
    if (!esMedicionValida(medicion)) {
      setError('Esos números no cuadran. Revisa el peso y que grasa y músculo no sumen más de 100 %.')
      return
    }
    actions.saveMeasurement(medicion)
    setPeso('')
    setGrasa('')
    setMusculo('')
    setError(null)
    setAbierto(false)
  }

  function borrar() {
    actions.deleteMeasurement(fecha)
    setPeso('')
    setGrasa('')
    setMusculo('')
    setError(null)
    setAbierto(false)
  }

  return (
    <div className="card">
      <p className="eyebrow">Composición corporal</p>

      {actual ? (
        <>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <span className="score">
              {actual.weightKg.toLocaleString('es-ES')}
              <small> kg</small>
            </span>
            {actual.ffmi !== undefined && <Etiqueta acento>FFMI {escribirNumero(actual.ffmi)}</Etiqueta>}
          </div>

          <div style={{ marginTop: 16 }}>
            {actual.fatKg !== undefined && (
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Grasa</span>
                <span>
                  {escribirNumero(actual.fatKg)} kg{' '}
                  {vsAnterior?.fatKg !== undefined && (
                    <span className={vsAnterior.fatKg <= 0 ? 'accent' : 'faint'}>
                      ({formatDelta(vsAnterior.fatKg)})
                    </span>
                  )}
                </span>
              </div>
            )}
            {actual.muscleKg !== undefined && (
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Músculo</span>
                <span>
                  {escribirNumero(actual.muscleKg)} kg{' '}
                  {vsAnterior?.muscleKg !== undefined && (
                    <span className={vsAnterior.muscleKg >= 0 ? 'accent' : 'faint'}>
                      ({formatDelta(vsAnterior.muscleKg)})
                    </span>
                  )}
                </span>
              </div>
            )}
            {actual.leanKg !== undefined && (
              <div className="row" style={{ padding: '7px 0' }}>
                <span className="dim">Masa libre de grasa</span>
                <span>{actual.leanKg !== undefined ? escribirNumero(actual.leanKg) : '—'} kg</span>
              </div>
            )}
          </div>

          {ordenadas.length >= 2 && (
            <div style={{ marginTop: 18 }}>
              <TrendChart measurements={measurements} heightCm={heightCm} todayIso={today} />
            </div>
          )}

          <Regla />
          <Verdict reading={reading} />

          {vsPrimera && (
            <p className="faint" style={{ marginTop: 14 }}>
              Desde la primera medida: peso {formatDelta(vsPrimera.weightKg)}, grasa{' '}
              {formatDelta(vsPrimera.fatKg)}, músculo {formatDelta(vsPrimera.muscleKg)}.
            </p>
          )}
          <p className="faint" style={{ marginTop: 14 }}>
            La masa libre de grasa incluye hueso, órganos y agua, por eso siempre supera a la
            muscular. La bioimpedancia se mueve ±3–5 % según la hidratación: mide siempre en las
            mismas condiciones y fíjate en la tendencia, no en una lectura suelta.
          </p>
        </>
      ) : (
        <p className="dim">
          Cuando te peses, anota aquí el peso y los porcentajes de grasa y músculo que te dé la
          báscula, y te los paso a kilos. Es la única forma de ver si estás recomponiendo.
        </p>
      )}

      <Regla />
      {!abierto ? (
        <>
          <Boton tono="callado" onClick={() => abrir(today)}>
            {measurements.some((m) => m.date === today) ? 'Corregir la de hoy' : 'Anotar una medición'}
          </Boton>
          {ordenadas.length > 0 && (
            <Boton tono="callado" onClick={() => setHistorial((v) => !v)}>
              {historial ? 'Ocultar las anteriores' : 'Corregir un día pasado'}
            </Boton>
          )}
          {historial && (
            <div className="fade-in" style={{ marginTop: 6 }}>
              <p className="faint" style={{ marginBottom: 8 }}>
                Toca la lectura que quieras cambiar. Se corrige o se borra, y la tendencia se
                rehace con el dato bueno.
              </p>
              {ordenadas.map((m) => (
                <button
                  key={m.date}
                  className="row"
                  onClick={() => abrir(m.date)}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    background: 'none',
                    border: 0,
                    borderTop: '1px solid var(--separator)',
                    color: 'inherit',
                    font: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <span className="dim">{nombreDeDia(m.date, today)}</span>
                  <span>
                    {escribirNumero(m.weightKg)} kg
                    {m.fatPercent !== undefined && (
                      <span className="faint"> · {escribirNumero(m.fatPercent)} % grasa</span>
                    )}
                    {m.musclePercent !== undefined && (
                      <span className="faint"> · {escribirNumero(m.musclePercent)} % músculo</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="fade-in">
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            {`La báscula · ${nombreDeDia(fecha, today).toLowerCase()}`}
          </p>
          <div className="field-row">
            <Field className="field">
  <FieldLabel>Peso (kg)</FieldLabel>
  <Input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
</Field>
            <Field className="field">
  <FieldLabel>Grasa (%)</FieldLabel>
  <Input inputMode="decimal" value={grasa} onChange={(e) => setGrasa(e.target.value)} />
</Field>
            <Field className="field">
  <FieldLabel>Músculo (%)</FieldLabel>
  <Input inputMode="decimal" value={musculo} onChange={(e) => setMusculo(e.target.value)} />
</Field>
          </div>
          {error && (
            <p className="faint" style={{ marginTop: 10 }}>
              {error}
            </p>
          )}
          <div style={{ height: 14 }} />
          <Boton tono="primario" disabled={!peso} onClick={guardar}>
            Guardar medición
          </Boton>
          {measurements.some((m) => m.date === fecha) && (
            <Boton tono="callado" onClick={borrar}>
              Borrar la de ese día
            </Boton>
          )}
          <Boton tono="callado" onClick={cerrar}>
            Cancelar
          </Boton>
        </div>
      )}
    </div>
  )
}

export default function Progreso() {
  const data = useAppData()
  const today = useToday()
  // Qué entreno se está mirando por dentro, si alguno.
  const [abierta, setAbierta] = useState<string | null>(null)
  // Y qué ejercicio tiene abierta su ficha de marcas.
  const [ficha, setFicha] = useState<{ exerciseId: string; name: string } | null>(null)
  const [seccion, setSeccion] = useState<Seccion>('semana')
  const balance = computeBalance(data.sessions, today)
  const maxBalance = Math.max(0.1, ...MUSCLE_GROUPS.map((g) => balance[g]))
  const trained = new Set(data.sessions.filter((s) => s.completed).map((s) => s.date))
  const completed = data.sessions.filter((s) => s.completed)

  const leptin = computeLeptinSignal(data.checkIns, today, data.profile?.goal, data.sol)
  const cobertura = explicarCobertura(leptin)
  const coordPerfil = coordenadasDe(data.profile)
  const quienToma = deElPerfil(data.profile)
  const solSemana = resumenSemanal(data.sol, today, 7, coordPerfil ?? undefined, quienToma, {
    sesiones: data.sesionesPBM,
    catalogo: data.lamparas
  })
  /*
   * La nota de invierno ya no sale de una lista de meses: sale de que el arco
   * de hoy, en este sitio, no llegue al umbral de síntesis. Así aparece en
   * Noruega en septiembre y no aparece en Quito en enero.
   */
  const notaSol = coordPerfil
    ? notaDeTemporada(today, coordPerfil, arcoDelDia(today, coordPerfil).elevacionMaxima)
    : undefined

  if (ficha) {
    return (
      <ExerciseSheet
        exerciseId={ficha.exerciseId}
        name={ficha.name}
        sessions={data.sessions}
        todayIso={today}
        onClose={() => setFicha(null)}
      />
    )
  }

  const sesionAbierta = abierta ? data.sessions.find((s) => s.id === abierta) : undefined
  if (sesionAbierta) {
    return (
      <SessionDetail
        session={sesionAbierta}
        history={data.sessions}
        onExercise={(exerciseId, name) => setFicha({ exerciseId, name })}
        onClose={() => setAbierta(null)}
      />
    )
  }

  return (
    <div className="fade-in cards-grid">
      <p className="eyebrow">Cómo vas</p>
      <h1>Progreso</h1>

      {/*
        Cinco destinos con nombre en vez de un scroll de ocho tarjetas.
        «Cuerpo» era un cajón de sastre: estrés, mes, volumen, composición,
        leptina, reparto, calendario e historial, todo seguido y sin relación
        entre ello. Nadie llegaba abajo, y lo que se mira a diario —cómo va la
        semana— estaba enterrado.
      */}
      <Tabs variant="line" value={seccion} onValueChange={(v) => setSeccion(v as Seccion)}>
        <TabsList className="segmentos" aria-label="Qué mirar">
          {SECCIONES.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {seccion === 'semana' && (
        <SemanaCard
          sessions={data.sessions}
          todayIso={today}
          opts={{ overrides: data.profile?.landmarkOverrides, deficit: data.profile?.deficitPhase }}
        />
      )}

      {seccion === 'mes' && (
        <>
      {/* El mes, para la pregunta que uno se hace el día 1 y que ninguna otra
          tarjeta responde: «¿qué tal fue?». */}
      <div className="card-wrap">
        <MonthReport sessions={data.sessions} todayIso={today} />
      </div>

        </>
      )}

      {seccion === 'ano' && <AnoCard sessions={data.sessions} todayIso={today} />}

      {seccion === 'cuerpo' && (
        <>
      {/* Cómo está el cuerpo va lo primero: es la pregunta que uno trae al
          abrir esta pestaña, antes que el detalle de volumen por músculo. */}
      <div className="card-wrap" style={{ marginTop: 28 }}>
        <EstresCard sessions={data.sessions} todayIso={today} />
      </div>

      <BodyCompositionCard
        measurements={data.measurements}
        heightCm={data.profile?.heightCm}
        today={today}
        reading={interpretTrend(data.measurements, data.profile, data.checkIns, data.sessions, today)}
      />

      <div className="card">
        <p className="eyebrow">Señal de leptina</p>
        {leptin.days === 0 ? (
          <p className="dim">{leptin.muscleNote}</p>
        ) : (
          <>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <span className="score">
                {leptin.score}
                <small> / 100</small>
              </span>
              <Etiqueta acento>{leptin.level}</Etiqueta>
            </div>
            <div className="meter" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={i < Math.round(leptin.score / 10) ? 'on' : ''} />
              ))}
            </div>
            {/*
              Los días sin contestar, dichos donde se ve la cifra y no en la
              letra pequeña del final: son parte de lo que significa el número.
            */}
            {cobertura && <p className="leptina-cobertura">{cobertura}</p>}
            <p className="dim" style={{ marginTop: 14 }}>
              {leptin.muscleNote}
            </p>
            {leptin.hurting.length > 0 && (
              <>
                <Regla />
                <p className="eyebrow">Lo que resta</p>
                <ul className="reasons">
                  {leptin.hurting.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </>
            )}
            {leptin.helping.length > 0 && (
              <>
                <Regla />
                <p className="eyebrow">Lo que suma</p>
                <ul className="reasons">
                  {leptin.helping.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="faint" style={{ marginTop: 14 }}>
              Calculado sobre {leptin.days} de los últimos {leptin.diasDeLaVentana} días
              {leptin.diasSinContestar > 0 ? `, y los otros ${leptin.diasSinContestar} cuentan como días sin saber` : ''}.
              La leptina responde a patrones, no a una noche suelta.
            </p>
          </>
        )}
      </div>

      <div className="card">
        <p className="eyebrow">Sol y vitamina D · esta semana</p>
        {solSemana.diasConSol === 0 ? (
          <p className="dim">
            Sin ratos de sol apuntados esta semana. Se apuntan en «Medir», con un toque, y aquí se
            acumula la vitamina D estimada.
          </p>
        ) : (
          <>
            <p className="dim">
              {solSemana.diasConSol} de {solSemana.dias} días con sol
              {solSemana.diasQueSintetizan > 0
                ? `, ${solSemana.diasQueSintetizan} de ellos con el sol lo bastante alto para sintetizar`
                : ''}
              . Acumuladas {escribirUI(solSemana.ui)} de vitamina D.
            </p>
          </>
        )}
        {notaSol && (
          <p className="faint" style={{ marginTop: 8 }}>{notaSol}</p>
        )}
      </div>

      <div className="card-wrap">
        <VolumeByMuscle
          sessions={data.sessions}
          todayIso={today}
          opts={{ overrides: data.profile?.landmarkOverrides, deficit: data.profile?.deficitPhase }}
        />
      </div>

      <div className="card">
        <p className="eyebrow">Reparto por zonas</p>
        {MUSCLE_GROUPS.map((g) => {
          const pct = Math.round((balance[g] / maxBalance) * 100)
          return (
            <div className="bar" key={g}>
              <span className="bar-label">{MUSCLE_LABELS[g]}</span>
              <div className="bar-track">
                <div className={`bar-fill ${pct < 30 ? 'low' : ''}`} style={{ width: `${Math.max(3, pct)}%` }} />
              </div>
            </div>
          )
        })}
        <p className="faint" style={{ marginTop: 14 }}>
          Últimos 14 días, en grueso. Sirve para ver de un vistazo si la semana ha estado repartida;
          para saber si algo se está quedando corto, el que manda es el detalle por músculo de
          arriba.
        </p>
      </div>

        </>
      )}

      {seccion === 'habitos' && (
        <>
          <TarjetaDeHabito habito="grounding" registros={data.habitos} hoy={today} />
          <TarjetaDeHabito habito="frio" registros={data.habitos} hoy={today} />
          <TarjetaDeHabito
            habito="ayuno"
            registros={data.habitos}
            hoy={today}
            lat={data.profile?.lat}
          />
          {data.profile?.ketoSince && <CurvaKeto desde={data.profile.ketoSince} hoy={today} />}
          <Analiticas analiticas={data.analiticas} hoy={today} />
        </>
      )}

      {seccion === 'ejercicios' && (
        <ExerciseList
          sessions={data.sessions}
          todayIso={today}
          onOpen={(exerciseId, name) => setFicha({ exerciseId, name })}
        />
      )}
    </div>
  )
}
