/**
 * Medir: una rejilla de baldosas, y ya está.
 *
 * La app medía casi todo, pero **apuntarlo costaba demasiado**. Para decir que
 * habías tomado el sol había que entrar en Luz, bajar hasta la tarjeta de la
 * jornada y pulsar un botón con la duración fija a diez minutos, el filtro fijo
 * a «sin gafas» y sin preguntar cuánta piel llevabas. Fichar estaba enterrado en
 * la misma tarjeta y la noche en otra.
 *
 * ## Por qué baldosas y no una lista de botones
 *
 * Una columna de once botones anchos se lee de arriba abajo, uno detrás de otro,
 * y obliga a leer para encontrar el que buscas. Una rejilla se lee de un
 * vistazo: la posición no cambia nunca, así que a la tercera vez el dedo va solo
 * y no hace falta leer nada. Cada baldosa dice tres cosas y ninguna más — qué
 * es, si está en marcha y cuánto llevas hoy—, y el color de su borde es lo que
 * la hace reconocible antes que el texto.
 *
 * Se apoya en `ToggleGroup`/`Toggle` de Appica, que no traen aspecto pero sí lo
 * que cuesta hacer bien: `aria-pressed` de verdad y recorrido con las flechas.
 * Lo que se ve es nuestro.
 *
 * ## Varias a la vez
 *
 * A diferencia de una rejilla de categorías al uso, aquí **no se cambia de una
 * a otra**: se pueden tener varias encendidas porque se solapan de verdad —estás
 * fichado en el taller y sales quince minutos al patio—. Pulsar una segunda no
 * apaga la primera.
 *
 * **Ninguna estructura de almacenamiento nueva.** Cada baldosa escribe en el
 * tipo que ya existía, así que el balance, las tres esferas, los dos relojes, la
 * explicación del peso y las estaciones funcionan sin tocar una línea. Ver
 * `domain/medir.ts`.
 */
import { useEffect, useState } from 'react'
import { ToggleGroup } from '@appica/ui-react/toggle-group'
import { Toggle } from '@appica/ui-react/toggle'
import { actions, useAppData } from '../store/store'
import { useToday } from '../store/clock'
import { Boton, Etiqueta, Opcion, Regla } from '../components/ui'
import Icon from '../components/Icon'
import {
  desfaseHorario,
  elevacionSolar,
  escribirDuracion,
  escribirGrados,
  escribirHora,
  minutosDeAhora
} from '../domain/arcoSolar'
import { coordenadasDe, fichajeAbierto, queSirve } from '../domain/jornada'
import {
  MINUTOS_SOSPECHOSOS,
  abierto,
  abiertosDe,
  alParar,
  loQueSeQuedoAbierto,
  minutosAbierto,
  minutosDeHoy,
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
import type { EnCurso, PielExpuesta, Profile, TipoEnCurso } from '../domain/types'
import type { EstadoDelCielo } from '../domain/cielo'
import type { IconName } from '../components/Icon'

/**
 * Las baldosas que se encienden y se apagan.
 *
 * `color` es una variable del tema y no un valor suelto: el borde de la baldosa
 * es lo que la hace reconocible de un vistazo, antes que el texto, y por eso
 * conviene que salga de la misma paleta que todo lo demás.
 */
interface Baldosa {
  tipo: TipoEnCurso
  nombre: string
  icono: IconName
  color: string
}

const BALDOSAS: Baldosa[] = [
  { tipo: 'amanecer', nombre: 'Amanecer', icono: 'amanecer', color: 'var(--st-alto)' },
  { tipo: 'sol', nombre: 'Sol', icono: 'sun', color: 'var(--st-tuyo)' },
  { tipo: 'fuera', nombre: 'Fuera', icono: 'fuera', color: 'var(--st-fresco)' },
  { tipo: 'atardecer', nombre: 'Atardecer', icono: 'atardecer', color: 'var(--accent)' },
  { tipo: 'lampara', nombre: 'Lámpara', icono: 'lampara', color: 'var(--st-pasado)' },
  { tipo: 'oscuridad', nombre: 'A oscuras', icono: 'moon', color: 'var(--medir-noche)' },
  { tipo: 'frio', nombre: 'Frío', icono: 'frio', color: 'var(--medir-frio)' },
  { tipo: 'grounding', nombre: 'Descalzo', icono: 'descalzo', color: 'var(--medir-tierra)' }
]

const nuevoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * `onEntrenar` sube en vez de bajar: la pestaña la manda `App`, y una baldosa
 * que fingiera abrir el entreno sin abrirlo sería peor que no tenerla.
 */
export default function Medir({ onEntrenar }: { onEntrenar?: () => void }) {
  const data = useAppData()
  const hoy = useToday()
  const coord = coordenadasDe(data.profile)
  const [ahora, setAhora] = useState(minutosDeAhora())
  /** Qué baldosa está preguntando algo antes de arrancar. Solo el sol lo hace. */
  const [preguntando, setPreguntando] = useState<TipoEnCurso | null>(null)

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

  /** Pulsar una baldosa: si está en marcha la para; si no, la arranca. */
  function pulsar(b: Baldosa) {
    const enCurso = abierto(data.enCurso, b.tipo, hoy)
    if (enCurso) return parar(enCurso)
    // Solo el sol pregunta algo antes de arrancar.
    if (b.tipo === 'sol') return setPreguntando('sol')
    empezar(b.tipo, b.tipo === 'lampara' ? { lamparaId: data.lamparas?.[0]?.id } : {})
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
      <header className="medir-cabecera">
        <p className="eyebrow">Medir</p>
        <h1 className="medir-titulo">Un toque y ya está contando.</h1>
        <p className="dim">
          Pulsa para empezar. Pulsa otra vez para parar. Pueden estar varias en marcha a la vez,
          porque el día se solapa.
        </p>
      </header>

      <SolAhora hoy={hoy} coord={coord} ahora={ahora} perfil={data.profile} />

      {/*
        Las utilidades van aquí y no en la hoja de estilos a propósito:
        `ToggleGroup` llega con `flex w-fit gap-1` puestos, y `tailwind-merge`
        solo sabe descartarlos si el reemplazo viene por la misma vía. Una regla
        `.baldosas { display: grid }` en la hoja pierde contra ellos y la
        rejilla sale en una fila que se desborda — que es exactamente lo que
        pasaba.
      */}
      <ToggleGroup
        multiple
        className="baldosas mb-4 grid w-full grid-cols-2 items-stretch gap-3"
        aria-label="Qué estás haciendo ahora"
        value={abiertos.map((x) => x.tipo)}
      >
        {BALDOSAS.map((b) => (
          <BaldosaBoton
            key={b.tipo}
            baldosa={b}
            enCurso={abierto(data.enCurso, b.tipo, hoy)}
            ahora={ahora}
            hoyMin={minutosDeHoy(b.tipo, hoy, data)}
            onPulsar={() => pulsar(b)}
          />
        ))}

        {/* Las tres que no son un cronómetro: un toque y queda apuntado. */}
        <BaldosaSuelta
          nombre={fichaje ? 'Salgo' : 'Trabajo'}
          icono="trabajo"
          color="var(--label-3)"
          pie={fichaje ? escribirDuracion(Math.max(0, ahora - fichaje.entrada)) : 'Fichar'}
          encendida={fichaje !== undefined}
          onPulsar={() => {
            if (fichaje) return actions.saveFichaje({ ...fichaje, salida: minutosDeAhora() })
            const sitio =
              (data.perfilesLuz ?? []).find((p) => p.id === data.profile?.perfilLuzHabitualId) ??
              (data.perfilesLuz ?? [])[0]
            if (!sitio) return
            actions.saveFichaje({
              id: nuevoId(),
              date: hoy,
              entrada: minutosDeAhora(),
              perfilLuzId: sitio.id,
              luz: {
                nombre: sitio.nombre,
                temperaturaK: sitio.temperaturaK,
                lux: sitio.lux,
                ventana: sitio.ventana,
                filtro: sitio.filtro
              }
            })
          }}
        />

        <BaldosaSuelta
          nombre="Café o comida"
          icono="cafe"
          color="var(--st-tuyo)"
          pie={`${(diaDe(data.comidas, hoy)?.comidas ?? []).length} hoy`}
          onPulsar={() =>
            actions.saveComidas(
              conComida(diaDe(data.comidas, hoy), hoy, {
                hora: escribirHora(minutosDeAhora()),
                texto: 'Café o algo',
                alimentos: []
              })
            )
          }
        />

        <BaldosaSuelta
          nombre="Entrenar"
          icono="body"
          color="var(--st-fresco)"
          pie={data.sessions.some((s) => s.date === hoy && s.completed) ? 'Hecho hoy' : 'Abre «Hoy»'}
          onPulsar={() => onEntrenar?.()}
        />
      </ToggleGroup>

      {/*
        La única letra pequeña que la rejilla no puede llevar encima. Se dice
        aquí y no se calla: es el detalle que más cambia la cuenta real de ayuno
        de la gente, y omitirlo por ser «solo un café» sería contar mal a
        propósito.
      */}
      <p className="faint medir-nota">
        El café cuenta. Abre la ventana igual que un plato, y por eso tiene su baldosa.
      </p>

      {preguntando === 'sol' && (
        <ElSol
          perfil={data.profile}
          onEmpezar={(piel, cielo) => {
            empezar('sol', { piel, cielo })
            // Se recuerdan para la próxima: preguntar lo mismo cada día
            // convertiría una baldosa en un formulario.
            if (data.profile) {
              actions.saveProfile({ ...data.profile, pielHabitual: piel, cieloHabitual: cielo })
            }
            setPreguntando(null)
          }}
          onDejarlo={() => setPreguntando(null)}
        />
      )}

      <Avisos abiertos={abiertos} ahora={ahora} data={data} />

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

/* ══════════════════════════════════════════════ LAS BALDOSAS ══ */

/**
 * Una baldosa con cronómetro. Tres datos y ni uno más: qué es, si está en
 * marcha, y cuánto llevas hoy. Todo lo que se pueda contar sin abrirla se
 * cuenta aquí; lo que haga falta explicar vive en el parte, más abajo.
 */
function BaldosaBoton({
  baldosa,
  enCurso,
  ahora,
  hoyMin,
  onPulsar
}: {
  baldosa: Baldosa
  enCurso: EnCurso | undefined
  ahora: number
  hoyMin: number
  onPulsar: () => void
}) {
  const corriendo = enCurso !== undefined
  const lleva = corriendo ? minutosAbierto(enCurso, ahora) : 0
  /*
   * El primer minuto no se escribe «0 min». Acabas de pulsar y la baldosa te
   * contesta con un cero: parece que no ha cogido el toque, que es justo la
   * duda que este rediseño existe para quitar.
   */
  const pie = corriendo
    ? lleva < 1
      ? 'Ahora mismo'
      : escribirDuracion(lleva)
    : hoyMin > 0
      ? `${escribirDuracion(hoyMin)} hoy`
      : 'Sin tiempo hoy'

  return (
    <Toggle
      value={baldosa.tipo}
      className={`baldosa ${corriendo ? 'baldosa-viva' : ''}`}
      style={{ '--baldosa-color': baldosa.color } as React.CSSProperties}
      onClick={onPulsar}
      aria-label={`${baldosa.nombre}${corriendo ? ', en marcha' : ''}`}
    >
      <span className="baldosa-icono" aria-hidden="true">
        <Icon name={baldosa.icono} />
      </span>
      <span className="baldosa-nombre">{baldosa.nombre}</span>
      <span className="baldosa-pie">{pie}</span>
    </Toggle>
  )
}

/**
 * Una baldosa que no cronometra: fichar, apuntar un café, saltar al entreno.
 * Comparte forma con las demás a propósito — a la vista todas son «una cosa que
 * se toca», y separarlas visualmente obligaría a aprender dos reglas.
 */
function BaldosaSuelta({
  nombre,
  icono,
  color,
  pie,
  encendida = false,
  onPulsar
}: {
  nombre: string
  icono: IconName
  color: string
  pie: string
  encendida?: boolean
  onPulsar: () => void
}) {
  return (
    <button
      type="button"
      className={`baldosa ${encendida ? 'baldosa-viva' : ''}`}
      style={{ '--baldosa-color': color } as React.CSSProperties}
      onClick={onPulsar}
    >
      <span className="baldosa-icono" aria-hidden="true">
        <Icon name={icono} />
      </span>
      <span className="baldosa-nombre">{nombre}</span>
      <span className="baldosa-pie">{pie}</span>
    </button>
  )
}

/* ══════════════════════════════════════════════ LO QUE SÍ PREGUNTA ══ */

/**
 * Lo único que se pregunta en toda la pantalla, y solo para el sol: cuánta piel
 * y cómo está el cielo. Las dos **antes de empezar**, porque son el contexto del
 * rato y no su resultado, y las dos recordadas en el perfil para que a partir de
 * la segunda vez la baldosa vuelva a ser un toque.
 */
function ElSol({
  perfil,
  onEmpezar,
  onDejarlo
}: {
  perfil: Profile | null
  onEmpezar: (piel: PielExpuesta, cielo: EstadoDelCielo) => void
  onDejarlo: () => void
}) {
  const [piel, setPiel] = useState<PielExpuesta>(perfil?.pielHabitual ?? 'brazos_piernas')
  const [cielo, setCielo] = useState<EstadoDelCielo>(perfil?.cieloHabitual ?? 'limpio')

  return (
    <div className="card">
      <p className="eyebrow">Cuánta piel</p>
      <div className="options" style={{ marginTop: 10 }}>
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
      <div className="options-col" style={{ marginTop: 10 }}>
        {ORDEN_CIELO.map((x) => (
          <Opcion key={x} activa={cielo === x} onElegir={() => setCielo(x)}>
            {CIELOS[x].nombre}
          </Opcion>
        ))}
      </div>
      <p className="faint" style={{ marginTop: 8 }}>
        {CIELOS[cielo].comoSeVe} Deja pasar del orden del {Math.round(CIELOS[cielo].factor * 100)} %
        del UVB de un cielo despejado.
      </p>
      <p className="faint" style={{ marginTop: 8 }}>
        Esto es un añadido nuestro: la fórmula de referencia calcula con cielo despejado y dice
        expresamente que no incluye nubes, ozono ni aerosoles.
      </p>

      <Regla />
      <Boton tono="primario" onClick={() => onEmpezar(piel, cielo)}>
        Empezar
      </Boton>
      <Boton tono="callado" onClick={onDejarlo}>
        Dejarlo
      </Boton>
    </div>
  )
}

/* ══════════════════════════════════════════════ EL SOL, AHORA MISMO ══ */

/**
 * Qué ofrece el sol en este momento y cuánto tardarías en quemarte.
 *
 * El aviso de quemadura va arriba y no escondido en un detalle: cuando alguien
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
  const quemarse = minutosParaQuemarse(
    elevacion,
    deElPerfil(perfil),
    factorDeCielo(perfil?.cieloHabitual)
  )

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

/* ══════════════════════════════════════════════ AVISOS ══ */

/**
 * Lo que hay que decir y no cabe en una baldosa. Solo aparece cuando hay algo
 * que decir: una tarjeta vacía permanente ocuparía el sitio de la rejilla, que
 * es lo que de verdad se viene a tocar.
 */
function Avisos({
  abiertos,
  ahora,
  data
}: {
  abiertos: EnCurso[]
  ahora: number
  data: ReturnType<typeof useAppData>
}) {
  const olvidados = abiertos.filter((x) => pareceOlvidado(x, ahora))
  const lamparaSinCrear =
    abiertos.some((x) => x.tipo === 'lampara' && !x.lamparaId) || !data.lamparas?.length
  const sinSitio = !data.perfilesLuz?.length

  if (olvidados.length === 0 && !lamparaSinCrear && !sinSitio) return null

  return (
    <div className="card">
      <p className="eyebrow">Ojo</p>
      {olvidados.map((x) => (
        <p key={x.tipo} className="dim" style={{ marginTop: 8 }}>
          Algo lleva más de {Math.round(MINUTOS_SOSPECHOSOS / 60)} horas en marcha, desde las{' '}
          {escribirHora(x.desde)}. Si se te olvidó pararlo, páralo ahora: al cambiar de día la app lo
          cierra solo con media hora y lo marca como estimado, para no apuntar una jornada entera de
          sol que no ocurrió.
        </p>
      ))}
      {lamparaSinCrear && (
        <p className="faint" style={{ marginTop: 8 }}>
          Todavía no hay ninguna lámpara creada. Sin sus longitudes de onda no hay dosis que
          calcular, así que su baldosa no llegaría a guardar la sesión: se crea una vez en «Luz».
        </p>
      )}
      {sinSitio && (
        <p className="faint" style={{ marginTop: 8 }}>
          Para que fichar sea un toque hace falta tener descrito el sitio —sus lux, su temperatura de
          color y si entra luz natural—. Se hace una vez en «Luz».
        </p>
      )}
    </div>
  )
}
