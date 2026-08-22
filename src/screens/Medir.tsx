/**
 * Medir: apuntar cualquier cosa en un toque.
 *
 * La app medía casi todo, pero **apuntarlo costaba demasiado**. Para decir que
 * habías tomado el sol había que entrar en Luz, bajar hasta la tarjeta de la
 * jornada y pulsar un botón con la duración fija a diez minutos, el filtro fijo
 * a «sin gafas» y sin preguntar cuánta piel llevabas. Fichar estaba enterrado en
 * la misma tarjeta. La noche se apuntaba en otra. Y no había forma de decir
 * «estoy tomando el sol **ahora**» y pararlo al terminar.
 *
 * Once botones en cuatro grupos, y debajo el parte del día. Va todo junto a
 * propósito: es el único sitio donde la causa y el efecto se ven a la vez —
 * aprietas un botón y el saldo cambia sin cambiar de pantalla.
 *
 * **Ninguna estructura de almacenamiento nueva.** Cada botón escribe en el tipo
 * que ya existía, así que el balance, las tres esferas, los dos relojes, la
 * explicación del peso y las estaciones funcionan sin tocar una línea. Ver
 * `domain/medir.ts`.
 */
import { useEffect, useState } from 'react'
import { actions, useAppData } from '../store/store'
import { useToday } from '../store/clock'
import { Boton, Etiqueta, Opcion, Regla } from '../components/ui'
import {
  escribirDuracion,
  escribirGrados,
  escribirHora,
  elevacionSolar,
  desfaseHorario,
  minutosDeAhora
} from '../domain/arcoSolar'
import { FILTROS, coordenadasDe, fichajeAbierto, queSirve } from '../domain/jornada'
import {
  MINUTOS_SOSPECHOSOS,
  NOMBRES_TIPO,
  abierto,
  abiertosDe,
  alParar,
  loQueSeQuedoAbierto,
  minutosAbierto,
  pareceOlvidado,
  type Resultado
} from '../domain/medir'
import {
  ORDEN_PIEL,
  PIELES,
  PIEL_PCT,
  conExposicion,
  deElPerfil,
  minutosParaQuemarse,
  solDe
} from '../domain/vitaminaD'
import { CIELOS, ORDEN_CIELO, factorDeCielo } from '../domain/cielo'
import { estadoDeHabito } from '../domain/habitos'
import { conComida, diaDe } from '../domain/crononutricion'
import ParteDelDia from '../components/ParteDelDia'
import type { Coordenadas } from '../domain/arcoSolar'
import type { EnCurso, Fichaje, PielExpuesta, Profile, TipoEnCurso } from '../domain/types'
import type { EstadoDelCielo } from '../domain/cielo'

/** Cada botón, con lo que pone cuando está parado y cuando está en marcha. */
interface BotonDef {
  tipo: TipoEnCurso
  etiqueta: string
  activo: string
}

const LUZ: BotonDef[] = [
  { tipo: 'sol', etiqueta: 'Tomando el sol', activo: 'Al sol' },
  { tipo: 'amanecer', etiqueta: 'Viendo el amanecer', activo: 'En el amanecer' },
  { tipo: 'atardecer', etiqueta: 'Viendo el atardecer', activo: 'En el atardecer' },
  { tipo: 'fuera', etiqueta: 'Fuera', activo: 'Fuera' }
]

const INTERIOR: BotonDef[] = [
  { tipo: 'lampara', etiqueta: 'Lámpara', activo: 'Con la lámpara' },
  { tipo: 'oscuridad', etiqueta: 'A oscuras', activo: 'A oscuras' }
]

const HABITOS: BotonDef[] = [
  { tipo: 'frio', etiqueta: 'Frío', activo: 'En frío' },
  { tipo: 'grounding', etiqueta: 'Descalzo', activo: 'Descalzo' }
]

const nuevoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * `onEntrenar` sube en vez de bajar: la pestaña la manda `App`, y un botón que
 * fingiera abrir el entreno sin abrirlo sería peor que no tenerlo.
 */
export default function Medir({ onEntrenar }: { onEntrenar?: () => void }) {
  const data = useAppData()
  const hoy = useToday()
  const coord = coordenadasDe(data.profile)
  const [ahora, setAhora] = useState(minutosDeAhora())

  /** El cronómetro se refresca solo, para que los minutos avancen a la vista. */
  useEffect(() => {
    const id = setInterval(() => setAhora(minutosDeAhora()), 15000)
    return () => clearInterval(id)
  }, [])

  /*
   * Lo que se quedó abierto de días anteriores se cierra al entrar, con una
   * duración conservadora y marcado como estimado. Arrastrarlo a hoy haría que
   * el cronómetro enseñara cuarenta horas.
   */
  useEffect(() => {
    for (const { viejo, resultado } of loQueSeQuedoAbierto(data.enCurso, hoy)) {
      guardarResultado(resultado)
      actions.cerrarEnCurso(viejo.tipo, viejo.date)
    }
  }, [data.enCurso, hoy])

  const abiertos = abiertosDe(data.enCurso, hoy)
  const fichaje = fichajeAbierto(data.fichajes, hoy)

  function empezar(tipo: TipoEnCurso, extra: Partial<EnCurso> = {}) {
    actions.abrirEnCurso({ tipo, date: hoy, desde: minutosDeAhora(), ...extra })
  }

  function parar(x: EnCurso) {
    const r = alParar(x, minutosDeAhora(), {
      nivelHabito:
        x.tipo === 'frio' || x.tipo === 'grounding'
          ? (estadoDeHabito(x.tipo, data.habitos, hoy).actual?.nivel ?? 1)
          : undefined
    })
    guardarResultado(r)

    // El sol deja además su exposición, con la piel y el cielo de cuando empezó.
    if (r.en === 'salida' && r.exposicionDeSol) {
      actions.saveSol(
        conExposicion(solDe(data.sol, hoy), hoy, {
          minutos: r.salida.minutos,
          // La franja solo la leen los registros viejos; aquí manda `desde`.
          franja: 'mediodia',
          piel: x.piel ?? 'brazos_piernas',
          desde: x.desde,
          ...(x.cielo ? { cielo: x.cielo } : {})
        })
      )
    }
    actions.cerrarEnCurso(x.tipo, x.date)
  }

  if (!coord) {
    return (
      <div className="card-wrap fade-in">
        <div className="card">
          <p className="eyebrow">Medir</p>
          <p className="dim" style={{ marginTop: 8 }}>
            Antes de poder medir hace falta saber dónde estás: sin coordenadas no sé a qué altura
            está el sol, y sin eso la vitamina D y las ventanas del día serían inventadas. Se piden
            una vez, en la pestaña de Luz.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-wrap fade-in">
      <EnMarcha abiertos={abiertos} ahora={ahora} onParar={parar} />

      <SolAhora hoy={hoy} coord={coord} ahora={ahora} perfil={data.profile} />

      <BotonesDeLuz
        abiertos={abiertos}
        hoy={hoy}
        ahora={ahora}
        perfil={data.profile}
        onEmpezar={empezar}
        onParar={parar}
      />

      <Jornada hoy={hoy} fichaje={fichaje} ahora={ahora} perfil={data.profile} />

      <Grupo titulo="Interior">
        {INTERIOR.map((b) => (
          <BotonDeMedir
            key={b.tipo}
            boton={b}
            enCurso={abierto(data.enCurso, b.tipo, hoy)}
            ahora={ahora}
            onEmpezar={() =>
              empezar(b.tipo, b.tipo === 'lampara' ? { lamparaId: data.lamparas?.[0]?.id } : {})
            }
            onParar={parar}
          />
        ))}
        {INTERIOR.some((b) => b.tipo === 'lampara') && !data.lamparas?.length && (
          <p className="faint">
            Todavía no hay ninguna lámpara creada. Sin sus longitudes de onda no hay dosis que
            calcular, así que la sesión no se guardaría: se crea una vez en «Luz».
          </p>
        )}
        <Boton
          tono="callado"
          onClick={() =>
            actions.saveComidas(
              conComida(diaDe(data.comidas, hoy), hoy, {
                hora: escribirHora(minutosDeAhora()),
                texto: 'Café o algo',
                alimentos: []
              })
            )
          }
        >
          Café o comida · abre la ventana
        </Boton>
        <p className="faint">
          El café cuenta. Es el detalle que más cambia la cuenta real de ayuno de la gente, y
          omitirlo por ser «solo un café» sería contar mal a propósito.
        </p>
      </Grupo>

      <Grupo titulo="Hábitos">
        {HABITOS.map((b) => (
          <BotonDeMedir
            key={b.tipo}
            boton={b}
            enCurso={abierto(data.enCurso, b.tipo, hoy)}
            ahora={ahora}
            onEmpezar={() => empezar(b.tipo)}
            onParar={parar}
          />
        ))}
        {onEntrenar && (
          <Boton tono="callado" onClick={onEntrenar}>
            Entrenar · abre «Hoy»
          </Boton>
        )}
      </Grupo>

      <ParteDelDia hoy={hoy} />
    </div>
  )
}

/** Guarda lo que devuelve `alParar` en el sitio que le toque. */
function guardarResultado(r: Resultado) {
  switch (r.en) {
    case 'salida':
      actions.saveSalida(r.salida)
      break
    case 'sesionPBM':
      actions.saveSesionPBM(r.sesion)
      break
    case 'noche':
      actions.saveNoche(r.noche)
      break
    case 'habito':
      actions.saveHabito(r.registro)
      break
    case 'nada':
      break
  }
}

/* ══════════════════════════════════════════════ LO QUE ESTÁ EN MARCHA ══ */

/**
 * Los cronómetros de arriba. Solo aparece la tarjeta si hay algo corriendo:
 * una tarjeta vacía permanente ocuparía el sitio de los botones, que es lo que
 * de verdad se viene a tocar.
 */
function EnMarcha({
  abiertos,
  ahora,
  onParar
}: {
  abiertos: EnCurso[]
  ahora: number
  onParar: (x: EnCurso) => void
}) {
  if (abiertos.length === 0) return null

  return (
    <div className="card">
      <p className="eyebrow">En marcha</p>
      {abiertos.map((x) => (
        <div key={x.tipo} style={{ marginTop: 12 }}>
          <div className="row">
            <span>{NOMBRES_TIPO[x.tipo]}</span>
            <Etiqueta acento>{escribirDuracion(minutosAbierto(x, ahora))}</Etiqueta>
          </div>
          <div className="row" style={{ padding: '7px 0' }}>
            <span className="dim">Desde las {escribirHora(x.desde)}</span>
            {x.piel && <span className="faint">{PIELES[x.piel]}</span>}
          </div>
          {pareceOlvidado(x, ahora) && (
            <p className="faint" style={{ marginTop: 4 }}>
              Lleva más de {Math.round(MINUTOS_SOSPECHOSOS / 60)} horas abierto. Si se te olvidó
              pararlo, párala ahora: al cambiar de día la app la cierra sola con media hora y la
              marca como estimada, para no apuntar una jornada entera de sol que no ocurrió.
            </p>
          )}
          <Boton tono="primario" onClick={() => onParar(x)}>
            Parar · {NOMBRES_TIPO[x.tipo].toLowerCase()}
          </Boton>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════ EL SOL, AHORA MISMO ══ */

/**
 * Qué ofrece el sol en este momento y cuánto tardarías en quemarte.
 *
 * El aviso de quemadura va aquí y no escondido en un detalle: cuando alguien
 * está tumbado al sol en bañador, el dato que necesita en ese momento no es la
 * vitamina D acumulada, es cuánto le queda.
 */
function SolAhora({
  hoy,
  coord,
  ahora,
  perfil
}: {
  hoy: string
  coord: Coordenadas
  ahora: number
  perfil: Profile | null
}) {
  const desfase = desfaseHorario(hoy)
  const elevacion = elevacionSolar(hoy, coord, ahora, desfase)
  const sirve = queSirve(hoy, coord, ahora, desfase)
  const cielo = perfil?.cieloHabitual
  const quemarse = minutosParaQuemarse(elevacion, deElPerfil(perfil), factorDeCielo(cielo))

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          El sol ahora
        </p>
        <Etiqueta acento={sirve.uvb}>{escribirGrados(elevacion)}</Etiqueta>
      </div>
      <p className="dim" style={{ marginTop: 8 }}>
        {sirve.uvb
          ? 'Por encima de 30°: tu piel puede fabricar vitamina D ahora mismo.'
          : sirve.uva
            ? 'Hay UVA —óxido nítrico y vasodilatación— pero el sol no sube lo suficiente para el UVB.'
            : sirve.fase
              ? 'Hay azul de sobra para poner el reloj en hora, aunque no haya UVB.'
              : 'El sol está demasiado bajo. Sigue contando para el reloj y para la calma, no para la vitamina D.'}
      </p>
      {quemarse !== null && (
        <p className="faint" style={{ marginTop: 8 }}>
          Con tu fototipo y este cielo, la piel sin proteger empezaría a enrojecer a los{' '}
          {Math.round(quemarse)} min. Es una estimación: no incluye nubes, ozono ni aerosoles.
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════ LUZ NATURAL ══ */

/**
 * Los cuatro botones de luz, y el único que pregunta algo: el sol.
 *
 * Piel y cielo se preguntan **antes de empezar**, no al parar, porque son el
 * contexto del rato y no su resultado. Y las dos respuestas se recuerdan en el
 * perfil, así que a partir de la segunda vez sigue siendo un toque.
 */
function BotonesDeLuz({
  abiertos,
  hoy,
  ahora,
  perfil,
  onEmpezar,
  onParar
}: {
  abiertos: EnCurso[]
  hoy: string
  ahora: number
  perfil: Profile | null
  onEmpezar: (tipo: TipoEnCurso, extra?: Partial<EnCurso>) => void
  onParar: (x: EnCurso) => void
}) {
  const solEnCurso = abiertos.find((x) => x.tipo === 'sol')
  const [preguntando, setPreguntando] = useState(false)
  const [piel, setPiel] = useState<PielExpuesta>(perfil?.pielHabitual ?? 'brazos_piernas')
  const [cielo, setCielo] = useState<EstadoDelCielo>(perfil?.cieloHabitual ?? 'limpio')

  function empezarElSol() {
    onEmpezar('sol', { piel, cielo })
    // Se recuerdan para la próxima: preguntar lo mismo cada día convertiría un
    // botón en un formulario.
    if (perfil) actions.saveProfile({ ...perfil, pielHabitual: piel, cieloHabitual: cielo })
    setPreguntando(false)
  }

  return (
    <Grupo titulo="Luz natural">
      {solEnCurso ? (
        <Boton tono="secundario" onClick={() => onParar(solEnCurso)}>
          Parar · tomando el sol
        </Boton>
      ) : preguntando ? (
        <>
          <p className="eyebrow">Cuánta piel</p>
          <div className="options">
            {ORDEN_PIEL.map((x) => (
              <Opcion key={x} activa={piel === x} onElegir={() => setPiel(x)}>
                {PIELES[x]}
              </Opcion>
            ))}
          </div>
          <p className="faint" style={{ marginTop: 8 }}>
            Un {PIEL_PCT[piel]} % de la superficie del cuerpo. La síntesis va con la superficie: en
            bañador se consigue en veinte minutos lo que con cara y manos no llega en dos horas.
          </p>

          <Regla />
          <p className="eyebrow">Cómo está el cielo</p>
          <div className="options-col">
            {ORDEN_CIELO.map((x) => (
              <Opcion key={x} activa={cielo === x} onElegir={() => setCielo(x)}>
                {CIELOS[x].nombre}
              </Opcion>
            ))}
          </div>
          <p className="faint" style={{ marginTop: 8 }}>
            {CIELOS[cielo].comoSeVe} Deja pasar del orden del{' '}
            {Math.round(CIELOS[cielo].factor * 100)} % del UVB de un cielo despejado.
          </p>
          <p className="faint" style={{ marginTop: 8 }}>
            Esto es un añadido nuestro: la fórmula de referencia calcula con cielo despejado y dice
            expresamente que no incluye nubes, ozono ni aerosoles.
          </p>

          <Regla />
          <Boton tono="primario" onClick={empezarElSol}>
            Empezar
          </Boton>
          <Boton tono="callado" onClick={() => setPreguntando(false)}>
            Dejarlo
          </Boton>
        </>
      ) : (
        <Boton tono="primario" onClick={() => setPreguntando(true)}>
          Tomando el sol
        </Boton>
      )}

      {LUZ.filter((b) => b.tipo !== 'sol').map((b) => {
        const x = abiertos.find((a) => a.tipo === b.tipo)
        return (
          <BotonDeMedir
            key={b.tipo}
            boton={b}
            enCurso={x}
            ahora={ahora}
            onEmpezar={() => onEmpezar(b.tipo)}
            onParar={onParar}
          />
        )
      })}
      <p className="faint">
        El amanecer y el atardecer se apuntan aparte de «Fuera» porque no son un rato de sol
        cualquiera: son las dos ventanas en que cambia la proporción entre el rojo y el azul, que es
        la señal que mueve el reloj. Los cuatro se guardan como el mismo rato fuera; solo el sol
        deja además su exposición para la vitamina D. Hoy es {hoy}.
      </p>
    </Grupo>
  )
}

/* ══════════════════════════════════════════════ JORNADA ══ */

function Jornada({
  hoy,
  fichaje,
  ahora,
  perfil
}: {
  hoy: string
  fichaje: Fichaje | undefined
  ahora: number
  perfil: Profile | null
}) {
  const data = useAppData()
  const habitual =
    (data.perfilesLuz ?? []).find((p) => p.id === perfil?.perfilLuzHabitualId) ??
    (data.perfilesLuz ?? [])[0]

  return (
    <Grupo titulo="Jornada">
      {fichaje ? (
        <>
          <div className="row">
            <span className="dim">Fichaste a las {escribirHora(fichaje.entrada)}</span>
            <span>{escribirDuracion(Math.max(0, ahora - fichaje.entrada))}</span>
          </div>
          <div className="row" style={{ padding: '7px 0' }}>
            <span className="dim">{fichaje.luz.nombre}</span>
            <span className="faint">
              {fichaje.luz.lux} lux · {FILTROS[fichaje.luz.filtro]}
            </span>
          </div>
          <Boton tono="primario" onClick={() => actions.saveFichaje({ ...fichaje, salida: ahora })}>
            Salgo del trabajo
          </Boton>
        </>
      ) : habitual ? (
        <Boton
          tono="primario"
          onClick={() =>
            actions.saveFichaje({
              id: nuevoId(),
              date: hoy,
              entrada: minutosDeAhora(),
              perfilLuzId: habitual.id,
              luz: {
                nombre: habitual.nombre,
                temperaturaK: habitual.temperaturaK,
                lux: habitual.lux,
                ventana: habitual.ventana,
                filtro: habitual.filtro
              }
            })
          }
        >
          Fichar entrada · {habitual.nombre}
        </Boton>
      ) : (
        <p className="faint">
          Para fichar en un toque hace falta tener descrito el sitio —sus lux, su temperatura de
          color y si entra luz natural—. Se hace una vez en «Luz», y a partir de ahí fichar es un
          botón.
        </p>
      )}
    </Grupo>
  )
}

/* ══════════════════════════════════════════════ PIEZAS ══ */

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <p className="eyebrow">{titulo}</p>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  )
}

/** Un botón que alterna entre empezar y parar, con su cronómetro si procede. */
function BotonDeMedir({
  boton,
  enCurso,
  ahora,
  onEmpezar,
  onParar
}: {
  boton: BotonDef
  enCurso: EnCurso | undefined
  ahora: number
  onEmpezar: () => void
  onParar: (x: EnCurso) => void
}) {
  if (!enCurso) {
    return (
      <Boton tono="secundario" onClick={onEmpezar}>
        {boton.etiqueta}
      </Boton>
    )
  }
  return (
    <Boton tono="primario" onClick={() => onParar(enCurso)}>
      Parar · {boton.activo.toLowerCase()} · {escribirDuracion(minutosAbierto(enCurso, ahora))}
    </Boton>
  )
}
