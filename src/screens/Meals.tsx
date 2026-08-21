import { useMemo, useState } from 'react'
import {
  BASE_LABELS,
  DHA_BOOSTERS,
  DHA_LABELS,
  EFFORT_LABELS,
  MEALS,
  bestDhaTier,
  dhaLevel,
  filterMeals,
  type Meal,
  type MealBase,
  type MealEffort
} from '../data/meals'
import { bandaDeProteina, platosParaElMinimo, tresIdeas } from '../domain/cocina'
import { complementarConPastillas, esVerano, objetivoDhaDiario } from '../domain/dha'
import { Badge } from '@appica/ui-react/badge'
import { Button } from '@appica/ui-react/button'
import { Separator } from '@appica/ui-react/separator'
import { actions, useAppData } from '../store/store'
import { useToday } from '../store/clock'
import Icon from '../components/Icon'
import DiarioDeComidas from '../components/DiarioDeComidas'
import { conComida, diaDe } from '../domain/crononutricion'
import { Boton, Opcion } from '../components/ui'
import { escribirNumero } from '../domain/numeros'
import {
  cobertura,
  escribirRatio,
  ratioDelDia,
  ratioFiable
} from '../domain/omega'
import type { DiaDeComidas, Suplemento } from '../domain/types'
import {
  HERRAMIENTAS,
  NOMBRES_EFECTO,
  QUE_HACEN_LOS_ANTINUTRIENTES,
  calidadDe,
  coberturaDeDatos,
  leerDia,
  nivelDeuterio
} from '../domain/mesa'
import { Etiqueta, Regla } from '../components/ui'

const BASES = Object.keys(BASE_LABELS) as MealBase[]
const EFFORTS = Object.keys(EFFORT_LABELS) as MealEffort[]

/** La receta entera, cuando ya se ha elegido una de las tres. */
function Receta({ meal, pillMg, today }: { meal: Meal; pillMg: number; today: string }) {
  const nivel = dhaLevel(meal)
  // Un plato que no puede ser alto en DHA por naturaleza al menos dice cómo serlo.
  const booster = nivel === 'alto' ? null : DHA_BOOSTERS[meal.name.length % DHA_BOOSTERS.length]
  const complemento = pillMg > 0 ? complementarConPastillas(meal.dhaMg, pillMg, today) : null

  return (
    <>
      <h2>{meal.name}</h2>
      <div className="tag-row">
        <Badge className="dha-tag" variant={nivel === 'alto' ? 'primary' : 'soft'}>
          {DHA_LABELS[nivel]} · {meal.dhaMg} mg
        </Badge>
        <Badge variant="soft">≈ {meal.proteinG} g de proteína</Badge>
        <Badge variant="soft">{EFFORT_LABELS[meal.effort]}</Badge>
      </div>
      <Separator className="my-4" />
      <ul className="reasons">
        {meal.ingredients.map((ing, i) => (
          <li key={i}>{ing}</li>
        ))}
      </ul>
      <p className="dim" style={{ marginTop: 14 }}>
        {meal.steps}
      </p>
      {booster && (
        <p className="faint" style={{ marginTop: 12 }}>
          Para subirle el DHA: {booster.charAt(0).toLowerCase() + booster.slice(1)}
        </p>
      )}
      {complemento && complemento.nota && (
        <p className="dim" style={{ marginTop: 12 }}>
          {complemento.cubierto ? '✓ ' : ''}
          {complemento.nota}
        </p>
      )}
      {meal.limit && (
        <>
          <Separator className="my-4" />
          <p className="eyebrow">Máximo {meal.limit.maxPerWeek} por semana</p>
          <p className="faint">{meal.limit.reason}</p>
        </>
      )}
    </>
  )
}

/**
 * Una de las tres ideas: lo justo para decidir sin abrir nada —qué es, cuánto
 * cuesta hacerlo y qué DHA trae—.
 */
function Idea({ meal, onAbrir }: { meal: Meal; onAbrir: () => void }) {
  const nivel = dhaLevel(meal)
  return (
    <button className="idea" onClick={onAbrir}>
      <span className="idea-cuerpo">
        <span className="idea-nombre">{meal.name}</span>
        <span className="idea-meta">
          {EFFORT_LABELS[meal.effort]} · ≈ {meal.proteinG} g de proteína
        </span>
        <span className="tag-row">
          <Badge className="dha-tag" variant={nivel === 'alto' ? 'primary' : 'soft'}>
            {DHA_LABELS[nivel]} · {meal.dhaMg} mg
          </Badge>
        </span>
      </span>
      <Icon name="chevron" />
    </button>
  )
}


/**
 * El ratio omega 3 : 6 del día, en sus tres versiones.
 *
 * Se enseñan las tres —solo comida, con suplemento, y el total— porque son
 * información distinta. Alguien con un 1 : 1,2 gracias a las cápsulas y un
 * 1 : 2,4 de comida sabe algo útil sobre su semana que el número combinado le
 * escondería: que la mejora viene del bote, no de la mesa.
 *
 * Y siempre con la cobertura al lado. Un ratio calculado sobre un tercio del
 * plato no es un ratio, es una impresión, y presentarlo como si fuera lo mismo
 * sería el tipo de falsa precisión que esta app procura no cometer.
 */
function RatioDeOmegas({
  dia,
  suplementos
}: {
  dia: DiaDeComidas | undefined
  suplementos: Suplemento[] | undefined
}) {
  const r = ratioDelDia(dia, suplementos)
  if (r.total.o3 === 0 && r.total.o6 === 0) return null

  const haySuplemento = r.suplemento.o3 > 0 || r.suplemento.o6 > 0
  const fiable = ratioFiable(r)

  return (
    <div className="card">
      <p className="eyebrow">Omega 3 : 6 de hoy</p>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="score" style={{ fontSize: 28 }}>
          {escribirRatio(r.total)}
        </span>
      </div>

      {haySuplemento && (
        <>
          <div className="row" style={{ padding: '7px 0' }}>
            <span className="dim">Solo de comida</span>
            <span className="faint">{escribirRatio(r.comida)}</span>
          </div>
          <div className="row" style={{ padding: '7px 0' }}>
            <span className="dim">Con suplemento</span>
            <span className="accent">{escribirRatio(r.total)}</span>
          </div>
        </>
      )}

      <p className="faint" style={{ marginTop: 10 }}>
        {fiable
          ? `Calculado sobre el ${Math.round(cobertura(r) * 100)} % de lo que has apuntado hoy.`
          : `Ojo: solo el ${Math.round(cobertura(r) * 100)} % de lo apuntado tiene datos de omegas, así que este número dice poco todavía.`}
      </p>
    </div>
  )
}


/**
 * Lo que la app mira de la mesa y las demás no miran.
 *
 * Leucina **por comida** —que es lo que enciende la síntesis, y por eso no se
 * suma el día—, calidad de la proteína, deuterio, minerales secuestrados y el
 * ritmo de la insulina. Siempre con la cobertura al lado: un dato calculado
 * sobre un tercio del plato no es el dato, es una impresión.
 */
function LaMesa({ dia }: { dia: DiaDeComidas | undefined }) {
  const [abierto, setAbierto] = useState(false)
  const l = leerDia(dia)
  if (l.comidas === 0) return null

  const cob = coberturaDeDatos(l)

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          La mesa de hoy
        </p>
        <Etiqueta acento={l.conUmbral > 0}>
          {l.conUmbral} de {l.comidas} con bolo
        </Etiqueta>
      </div>

      <p className="faint" style={{ marginTop: 8 }}>
        {l.conUmbral === 0
          ? 'Ninguna comida ha llegado al umbral de leucina. La síntesis de proteína no se enciende con una suma diaria: se enciende con un bolo que pase de 2,5 g de golpe.'
          : `${l.conUmbral} ${l.conUmbral === 1 ? 'comida ha encendido' : 'comidas han encendido'} la síntesis. Repartir la misma proteína en picoteos no habría encendido ninguna.`}
      </p>

      <Regla />
      {l.diaas !== undefined && (
        <div className="row" style={{ padding: '6px 0' }}>
          <span className="dim">Calidad de la proteína</span>
          <span>
            {Math.round(l.diaas)} <span className="faint">· {calidadDe(l.diaas)}</span>
          </span>
        </div>
      )}
      {l.deuterioPpm !== undefined && (
        <div className="row" style={{ padding: '6px 0' }}>
          <span className="dim">Deuterio</span>
          <span>
            {Math.round(l.deuterioPpm)} ppm{' '}
            <span className="faint">· {nivelDeuterio(l.deuterioPpm)}</span>
          </span>
        </div>
      )}
      {l.antinutrientes && (
        <div className="row" style={{ padding: '6px 0' }}>
          <span className="dim">Antinutrientes</span>
          <span className={l.antinutrientes === 'alto' ? 'faint' : ''}>{l.antinutrientes}</span>
        </div>
      )}
      {l.antinutrientes && (
        <p className="faint" style={{ marginTop: 4 }}>
          {QUE_HACEN_LOS_ANTINUTRIENTES[l.antinutrientes]}
        </p>
      )}

      <Regla />
      <div className="row" style={{ padding: '6px 0' }}>
        <span className="dim">Eventos de insulina</span>
        <span>{l.insulina.eventos.length}</span>
      </div>
      <div className="row" style={{ padding: '6px 0' }}>
        <span className="dim">Mayor descanso</span>
        <span className={l.insulina.mayorDescanso >= 12 ? 'accent' : ''}>
          {escribirNumero(Math.round(l.insulina.mayorDescanso * 10) / 10)} h
        </span>
      </div>

      <p className="faint" style={{ marginTop: 8 }}>
        {cob >= 0.5
          ? `Calculado sobre el ${Math.round(cob * 100)} % de lo que has apuntado.`
          : `Ojo: solo el ${Math.round(cob * 100)} % de lo apuntado tiene estos datos, así que dicen poco todavía.`}
      </p>

      <Regla />
      {!abierto ? (
        <Boton tono="callado" onClick={() => setAbierto(true)}>
          Qué rompe el ayuno y qué no
        </Boton>
      ) : (
        <div className="fade-in">
          {HERRAMIENTAS.map((h) => (
            <div key={h.nombre} style={{ padding: '8px 0' }}>
              <div className="row">
                <span className="dim">{h.nombre}</span>
                <span className={h.efecto === 'no-rompe' ? 'accent' : 'faint'}>
                  {NOMBRES_EFECTO[h.efecto]}
                </span>
              </div>
              <p className="faint" style={{ marginTop: 3 }}>
                {h.porque.replace(/\*\*/g, '')}
              </p>
            </div>
          ))}
          <Boton tono="callado" onClick={() => setAbierto(false)}>
            Cerrar
          </Boton>
        </div>
      )}
    </div>
  )
}

export default function Meals() {
  const data = useAppData()
  const profile = data.profile!
  const [base, setBase] = useState<MealBase | null>(null)
  const [effort, setEffort] = useState<MealEffort | null>(null)
  const [current, setCurrent] = useState<Meal | null>(null)
  const [browsing, setBrowsing] = useState(false)
  /** Los identificadores de la tanda anterior, para que otras tres sean otras. */
  const [vistas, setVistas] = useState<string[]>([])
  const [tanda, setTanda] = useState(0)

  const today = useToday()
  const pillMg = profile.dhaPillMg ?? 0
  const objetivoDha = objetivoDhaDiario(today)
  const banda = profile.weightKg ? bandaDeProteina(profile.weightKg, profile.goal) : null
  const available = filterMeals(base, effort)
  // Qué DHA es capaz de dar el filtro elegido, para avisar antes de sugerir.
  const mejorNivel = available.length > 0 ? dhaLevel(bestDhaTier(available)[0]) : null

  /*
   * Las tres ideas se calculan al vuelo y no se guardan en un estado: dependen
   * del filtro, y guardarlas obligaría a acordarse de rehacerlas cada vez que
   * se toca algo. `tanda` es lo único que las cambia a mano.
   */
  const ideas = useMemo(
    () => tresIdeas(base, effort, vistas),
    // `vistas` se queda fuera a propósito: cambia justo al pedir otra tanda, y
    // ponerlo aquí volvería a barajar dos veces seguidas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, effort, tanda]
  )

  function otrasTres() {
    setVistas(ideas.map((m) => m.id))
    setTanda((t) => t + 1)
    setCurrent(null)
  }

  if (current) {
    return (
      <div className="fade-in">
        <Button className="btn-atras" variant="ghost" size="sm" onClick={() => setCurrent(null)}>
          <Icon name="chevron" />
          Volver a las ideas
        </Button>
        <div className="card">
          <Receta meal={current} pillMg={pillMg} today={today} />
          <Boton
            tono="secundario"
            style={{ marginTop: 14 }}
            onClick={() => {
              const d = new Date()
              const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              actions.saveComidas(
                conComida(diaDe(data.comidas, today), today, {
                  hora,
                  texto: current.name,
                  mealId: current.id,
                  etiquetas: ['proteina']
                })
              )
              setCurrent(null)
            }}
          >
            La he comido · al diario
          </Boton>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in cards-grid">
      <p className="eyebrow">Cuando no sabes qué comer</p>
      <h1>Cocina</h1>

      <DiarioDeComidas
        comidas={data.comidas}
        todayIso={today}
        checkIns={data.checkIns}
        ediciones={data.alimentosEditados}
        suplementos={data.suplementos}
      />

      <RatioDeOmegas dia={data.comidas?.find((d) => d.date === today)} suplementos={data.suplementos} />

      <LaMesa dia={data.comidas?.find((d) => d.date === today)} />

      {/*
        Antes esta pantalla pedía dos filtros y daba **una** idea al pulsar un
        botón: elegir antes de ver nada y tirar de la palanca hasta que saliera
        algo apetecible. Quien abre esto no quiere configurar un filtro, quiere
        cenar; y elegir de verdad es comparar, que con una sola idea no se
        puede. Tres delante, y los filtros esperan debajo por si acaso.
      */}
      <div className="ideas">
        {ideas.map((m) => (
          <Idea key={m.id} meal={m} onAbrir={() => setCurrent(m)} />
        ))}
        {ideas.length === 0 && (
          <p className="faint">
            Con esa combinación no tengo nada. Prueba a soltar uno de los dos filtros.
          </p>
        )}
      </div>

      {ideas.length > 0 && (
        <Button className="mb-2 w-full" variant="secondary" size="lg" onClick={otrasTres}>
          Otras tres
        </Button>
      )}

      {mejorNivel && mejorNivel !== 'alto' && (
        <p className="faint" style={{ margin: '0 4px 8px' }}>
          Ojo: por aquí no hay nada con DHA alto — solo el pescado azul y el marisco lo tienen de
          verdad. Te doy lo mejor que hay y cómo enriquecerlo.
        </p>
      )}

      {/*
        La proteína, como banda y no como barra que se llena: un depósito que
        sube invita a contar, que es justo lo que aquí no se hace. La regla va
        de poco a mucho para que se lea que el objetivo es una zona ancha y no
        una diana.
      */}
      <div className="card">
        <p className="eyebrow">Tu referencia del día</p>
        {banda ? (
          <>
            <p className="banda-num">
              {banda.min}–{banda.max}
              <small> g de proteína</small>
            </p>
            <div className="banda">
              <div className="banda-track" />
              <div
                className="banda-zona"
                style={{ left: `${banda.inicio}%`, width: `${banda.ancho}%` }}
              />
            </div>
            <div className="banda-pies">
              <span className="faint">{banda.desde} g</span>
              <span className="faint">{banda.hasta} g</span>
            </div>
            <p className="dim" style={{ marginTop: 14 }}>
              Son {escribirNumero(banda.porKilo.min)}–{escribirNumero(banda.porKilo.max)} g por kilo de peso, y es una zona, no una
              cifra que haya que clavar. Con {platosParaElMinimo(banda.min, ideas) || 3} platos como
              estos sale sola: no hace falta que apuntes nada.
            </p>
          </>
        ) : (
          <p className="dim">
            Añade tu peso en Yo y te digo la referencia de proteína del día. Del resto no lleves
            cuentas: come hasta saciarte de verdad y deja que la leptina regule lo demás.
          </p>
        )}
        <Separator className="my-4" />
        <p className="eyebrow">DHA de hoy</p>
        <p className="banda-num">
          {objetivoDha.toLocaleString('es-ES')}
          <small> mg</small>
          {esVerano(today) && <Badge variant="primary">verano</Badge>}
        </p>
        <p className="faint" style={{ marginTop: 10 }}>
          {esVerano(today)
            ? 'En los meses de más sol subimos el DHA: es el material con el que se construyen las membranas.'
            : 'DHA a diario, que es el ácido graso estructural de tus membranas celulares.'}
          {pillMg > 0
            ? ` Tus pastillas son de ${pillMg.toLocaleString('es-ES')} mg y nunca te sugeriré pasar de 1.000 mg de suplemento al día.`
            : ' Si tomas pastillas de DHA, dímelo en Yo y te calculo el complemento.'}
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">¿Qué te apetece?</p>
        <div className="options">
          <Opcion activa={base === null} onElegir={() => setBase(null)}>
            Lo que sea
          </Opcion>
          {BASES.map((b) => (
            <Opcion key={b} activa={base === b} onElegir={() => setBase(b)}>
              {BASE_LABELS[b]}
            </Opcion>
          ))}
        </div>

        <Separator className="my-4" />
        <p className="eyebrow">¿Cuánto tiempo tienes?</p>
        <div className="options">
          <Opcion activa={effort === null} onElegir={() => setEffort(null)}>
            Da igual
          </Opcion>
          {EFFORTS.map((e) => (
            <Opcion key={e} activa={effort === e} onElegir={() => setEffort(e)}>
              {EFFORT_LABELS[e]}
            </Opcion>
          ))}
        </div>
      </div>

      <Button className="w-full" variant="ghost" onClick={() => setBrowsing(!browsing)}>
        {browsing ? 'Ocultar el recetario' : `Ver los ${MEALS.length} platos`}
      </Button>

      {browsing && (
        <div className="fade-in" style={{ marginTop: 16 }}>
          {BASES.map((b) => {
            const meals = MEALS.filter((m) => m.base === b)
            return (
              <div className="card" key={b}>
                <p className="eyebrow">{BASE_LABELS[b]}</p>
                {meals.map((m) => (
                  <button
                    className="item"
                    key={m.id}
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => setCurrent(m)}
                  >
                    <div className="item-body">
                      <div className="item-title">{m.name}</div>
                      <div className="item-meta">
                        {DHA_LABELS[dhaLevel(m)]} · {EFFORT_LABELS[m.effort]} · ≈ {m.proteinG} g de proteína
                      </div>
                    </div>
                    <Icon name="chevron" className="check" />
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
