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
import {
  coordenadasDe,
  fichajeAbierto,
  minutosDeTrabajo,
  problemaDelTramoDeTrabajo,
  queSirve,
  tramoDeTrabajo
} from '../domain/jornada'
import {
  MINUTOS_SOSPECHOSOS,
  NOMBRES_TIPO,
  abierto,
  abiertosDe,
  alParar,
  cambiarCielo,
  tramosDeCielo,
  loQueSeQuedoAbierto,
  minutosAbierto,
  minutosDeHoy,
  pareceOlvidado,
  yaEstaFuera,
  type Escritura
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
import { minutosDeHora } from '../domain/relojes'
import { ZONAS } from '../domain/fotobiomodulacion'
import { findActiveSession } from '../domain/activeSession'
import { CampoNumero } from '../components/ui'
import ParteDelDia from '../components/ParteDelDia'
import RepartoDelDia from '../components/RepartoDelDia'
import type { Coordenadas } from '../domain/arcoSolar'
import type {
  EnCurso,
  Fichaje,
  Lampara,
  PerfilDeLuz,
  PielExpuesta,
  Profile,
  TipoEnCurso,
  ZonaPBM
} from '../domain/types'
import type { EstadoDelCielo } from '../domain/cielo'
import type { IconName } from '../components/Icon'

/**
 * Las baldosas que se encienden y se apagan.
 *
 * Sin color. Once colores distintos convertían la rejilla en una bolsa de
 * caramelos y hacían que el ojo fuera al más llamativo en vez de al que buscaba;
 * y encendida o apagada acababa dependiendo del tono, que es lo que peor se ve
 * al sol de la calle. En gris, lo único que cambia entre una baldosa y otra es
 * el dibujo y el nombre, y lo único que cambia entre apagada y encendida es que
 * se da la vuelta entera. No hay forma de confundirse.
 */
interface Baldosa {
  tipo: TipoEnCurso
  nombre: string
  icono: IconName
}

const BALDOSAS: Baldosa[] = [
  { tipo: 'fuera', nombre: 'Fuera', icono: 'fuera' },
  { tipo: 'sol', nombre: 'Sol', icono: 'sun' },
  { tipo: 'amanecer', nombre: 'Amanecer', icono: 'amanecer' },
  { tipo: 'atardecer', nombre: 'Atardecer', icono: 'atardecer' },
  { tipo: 'grounding', nombre: 'Grounding', icono: 'descalzo' },
  { tipo: 'frio', nombre: 'Frío', icono: 'frio' },
  { tipo: 'lampara', nombre: 'Lámpara', icono: 'lampara' },
  { tipo: 'oscuridad', nombre: 'A oscuras', icono: 'moon' }
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
  /** Qué baldosa está preguntando algo antes de arrancar. Solo dos lo hacen. */
  const [preguntando, setPreguntando] = useState<'sol' | 'lampara' | null>(null)
  const [aMano, setAMano] = useState(false)

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
    for (const { viejo, escrituras } of loQueSeQuedoAbierto(data.enCurso, hoy)) {
      guardar(escrituras, viejo.date)
      actions.cerrarEnCurso(viejo.tipo, viejo.date)
    }
  }, [data.enCurso, hoy])

  const abiertos = abiertosDe(data.enCurso, hoy)
  const fichaje = fichajeAbierto(data.fichajes, hoy)
  const trabajoHoy = minutosDeTrabajo(data.fichajes, hoy, ahora)
  const sitios = data.perfilesLuz ?? []
  const sitioHabitual =
    sitios.find((p) => p.id === data.profile?.perfilLuzHabitualId) ?? sitios[0]
  const fuera = yaEstaFuera(data.enCurso, hoy)
  /** El entreno no es una actividad de esta pantalla: se mira, no se maneja. */
  const entreno = findActiveSession(data.sessions, hoy)

  function empezar(tipo: TipoEnCurso, extra: Partial<EnCurso> = {}) {
    actions.abrirEnCurso({ tipo, date: hoy, desde: minutosDeAhora(), ...extra })
  }

  function parar(x: EnCurso) {
    guardar(
      alParar(x, minutosDeAhora(), {
        nivelHabito:
          x.tipo === 'frio' || x.tipo === 'grounding'
            ? (estadoDeHabito(x.tipo, data.habitos, hoy).actual?.nivel ?? 1)
            : undefined
      }),
      x.date
    )
    actions.cerrarEnCurso(x.tipo, x.date)
  }

  /** Pulsar una baldosa: si está en marcha la para; si no, la arranca. */
  function pulsar(b: Baldosa) {
    const enCurso = abierto(data.enCurso, b.tipo, hoy)
    if (enCurso) return parar(enCurso)
    // Solo dos preguntan algo antes de arrancar: el sol y la lámpara.
    if (b.tipo === 'sol' || b.tipo === 'lampara') return setPreguntando(b.tipo)
    empezar(b.tipo)
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
            /*
             * «Fuera» se enciende sola en cuanto hay algo que implique estar
             * fuera. No se pulsa aparte porque ya estás contando, y pedir el
             * segundo toque solo serviría para apuntar el rato dos veces.
             */
            incluidaPor={b.tipo === 'fuera' && !abierto(data.enCurso, 'fuera', hoy) ? fuera : undefined}
            ahora={ahora}
            hoyMin={minutosDeHoy(b.tipo, hoy, data)}
            onPulsar={() => pulsar(b)}
          />
        ))}

        {/* Las tres que no son un cronómetro de esta pantalla. */}
        <BaldosaSuelta
          nombre={fichaje ? 'Salgo' : 'Trabajo'}
          icono="trabajo"
          /*
           * Apagada enseña la jornada de hoy, como cualquier otra baldosa. Antes
           * decía «Fichar» y nada más, así que un tramo apuntado a mano no se
           * veía por ninguna parte y parecía que no había entrado.
           */
          pie={
            fichaje
              ? escribirDuracion(Math.max(0, ahora - fichaje.entrada))
              : trabajoHoy > 0
                ? escribirDuracion(trabajoHoy)
                : 'Fichar'
          }
          encendida={fichaje !== undefined}
          onPulsar={() => {
            if (fichaje) return actions.saveFichaje({ ...fichaje, salida: minutosDeAhora() })
            const sitio = sitioHabitual
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

        {/*
          El entreno se lleva desde su propia pantalla, y aquí solo se mira: la
          sesión ya guarda cuándo empezó, así que el cronómetro sale de ahí sin
          inventar un segundo sitio donde apuntar lo mismo.
        */}
        <BaldosaSuelta
          nombre="Entreno"
          icono="body"
          pie={
            entreno?.startedAt
              ? escribirDuracion(Math.round((Date.now() - entreno.startedAt) / 60000))
              : data.sessions.some((s) => s.date === hoy && s.completed)
                ? 'Hecho hoy'
                : 'Abre «Hoy»'
          }
          encendida={entreno?.startedAt !== undefined}
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

      {abierto(data.enCurso, 'sol', hoy) && (
        <CieloEnMarcha
          sol={abierto(data.enCurso, 'sol', hoy)!}
          ahora={ahora}
          onCambiar={(cielo) => {
            const x = abierto(data.enCurso, 'sol', hoy)!
            const nuevo = cambiarCielo(x, cielo, minutosDeAhora())
            if (nuevo !== x) actions.abrirEnCurso(nuevo)
          }}
        />
      )}

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

      {preguntando === 'lampara' && (
        <LaLampara
          lamparas={data.lamparas ?? []}
          onEmpezar={(lamparaId, zona, distanciaCm) => {
            empezar('lampara', { lamparaId, zona, distanciaCm })
            setPreguntando(null)
          }}
          onDejarlo={() => setPreguntando(null)}
        />
      )}

      {aMano ? (
        <AMano
          hoy={hoy}
          ahora={ahora}
          lamparas={data.lamparas ?? []}
          sitios={sitios}
          sitioHabitual={sitioHabitual}
          fichajes={data.fichajes}
          nivelDe={(t) =>
            t === 'frio' || t === 'grounding'
              ? (estadoDeHabito(t, data.habitos, hoy).actual?.nivel ?? 1)
              : 1
          }
          onGuardar={(x, hasta, nivel) => {
            guardar(alParar(x, hasta, { nivelHabito: nivel }), x.date)
            setAMano(false)
          }}
          onGuardarTrabajo={(entrada, salida, sitio) => {
            actions.saveFichaje(tramoDeTrabajo(nuevoId(), hoy, entrada, salida, sitio))
            setAMano(false)
          }}
          onDejarlo={() => setAMano(false)}
        />
      ) : (
        <Boton tono="callado" onClick={() => setAMano(true)}>
          Apuntar un rato a mano
        </Boton>
      )}

      <Avisos abiertos={abiertos} ahora={ahora} data={data} />

      <RepartoDelDia hoy={hoy} />

      <ParteDelDia hoy={hoy} />
    </div>
  )
}

/** Escribe cada cosa que deja una actividad en el sitio que le toca. */
function guardar(escrituras: Escritura[], fecha: string) {
  for (const e of escrituras) {
    switch (e.en) {
      case 'salida':
        actions.saveSalida(e.salida)
        break
      case 'exposicion':
        actions.saveExposicion(fecha, e.exposicion)
        break
      case 'sesionPBM':
        actions.saveSesionPBM(e.sesion)
        break
      case 'noche':
        actions.saveNoche(e.noche)
        break
      case 'habito':
        actions.saveHabito(e.registro)
        break
    }
  }
}

/* ══════════════════════════════════════════════ LAS BALDOSAS ══ */

/**
 * Una baldosa con cronómetro. Tres datos y ni uno más: qué es, si está en
 * marcha, y cuánto llevas hoy.
 *
 * `incluidaPor` es el tercer estado y el que hace visible el entrelazado: la
 * baldosa de «Fuera» se enciende sola en cuanto hay algo que implique estar
 * fuera, y se enseña **atenuada y sin poder pulsarse**, porque ya estás
 * contando. Poder pulsarla entonces solo serviría para apuntar el mismo rato
 * dos veces.
 */
function BaldosaBoton({
  baldosa,
  enCurso,
  incluidaPor,
  ahora,
  hoyMin,
  onPulsar
}: {
  baldosa: Baldosa
  enCurso: EnCurso | undefined
  incluidaPor?: TipoEnCurso
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
  const pie = incluidaPor
    ? `Con ${BALDOSAS.find((b) => b.tipo === incluidaPor)?.nombre ?? NOMBRES_TIPO[incluidaPor]}`
    : corriendo
      ? lleva < 1
        ? 'Ahora mismo'
        : escribirDuracion(lleva)
      : hoyMin > 0
        ? `${escribirDuracion(hoyMin)} hoy`
        : 'Sin tiempo hoy'

  const estado = corriendo ? ', en marcha' : incluidaPor ? ', incluida' : ''

  return (
    <Toggle
      value={baldosa.tipo}
      disabled={incluidaPor !== undefined}
      className={`baldosa ${corriendo ? 'baldosa-viva' : ''} ${incluidaPor ? 'baldosa-incluida' : ''}`}
      onClick={onPulsar}
      aria-label={`${baldosa.nombre}${estado}`}
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
 * Una baldosa que no cronometra aquí: fichar, apuntar un café, mirar el
 * entreno. Comparte forma con las demás a propósito — a la vista todas son «una
 * cosa que se toca», y separarlas obligaría a aprender dos reglas.
 */
function BaldosaSuelta({
  nombre,
  icono,
  pie,
  encendida = false,
  onPulsar
}: {
  nombre: string
  icono: IconName
  pie: string
  encendida?: boolean
  onPulsar: () => void
}) {
  return (
    <button
      type="button"
      className={`baldosa ${encendida ? 'baldosa-viva' : ''}`}
      aria-pressed={encendida}
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

/**
 * La lámpara, con lo que hace falta para que la dosis signifique algo.
 *
 * Antes la baldosa arrancaba con la primera lámpara de la lista, el torso y
 * quince centímetros puestos a dedo. Los julios que entrega un panel caen con
 * el **cuadrado** de la distancia, así que la diferencia entre veinte y cuarenta
 * centímetros es de cuatro veces: darla por supuesta convertía la dosis en un
 * número inventado. Y sin la zona no se puede decir qué llevas repetido.
 *
 * Las tres vienen con lo último elegido puesto, así que a partir de la segunda
 * vez son un vistazo y un botón.
 */
function LaLampara({
  lamparas,
  onEmpezar,
  onDejarlo
}: {
  lamparas: Lampara[]
  onEmpezar: (lamparaId: string, zona: ZonaPBM, distanciaCm: number) => void
  onDejarlo: () => void
}) {
  const [lamparaId, setLamparaId] = useState(lamparas[0]?.id ?? '')
  const [zona, setZona] = useState<ZonaPBM>('torso')
  const [distancia, setDistancia] = useState<number | undefined>(
    lamparas[0]?.distanciaRefCm ?? 15
  )
  const elegida = lamparas.find((l) => l.id === lamparaId)

  if (lamparas.length === 0) {
    return (
      <div className="card">
        <p className="eyebrow">Lámpara</p>
        <p className="dim" style={{ marginTop: 8 }}>
          Todavía no hay ninguna creada. Sin sus longitudes de onda y su irradiancia no hay dosis
          que calcular, y guardar la sesión sin eso dejaría un registro que nunca podrá contar nada.
          Se crea una vez en «Luz».
        </p>
        <Boton tono="callado" onClick={onDejarlo}>
          Dejarlo
        </Boton>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="eyebrow">Con cuál</p>
      <div className="options-col" style={{ marginTop: 10 }}>
        {lamparas.map((l) => (
          <Opcion
            key={l.id}
            activa={lamparaId === l.id}
            onElegir={() => {
              setLamparaId(l.id)
              setDistancia(l.distanciaRefCm)
            }}
          >
            {l.nombre}
          </Opcion>
        ))}
      </div>

      <Regla />
      <p className="eyebrow">Qué zona</p>
      <div className="options" style={{ marginTop: 10 }}>
        {(Object.keys(ZONAS) as ZonaPBM[]).map((z) => (
          <Opcion key={z} activa={zona === z} onElegir={() => setZona(z)}>
            {ZONAS[z]}
          </Opcion>
        ))}
      </div>

      <Regla />
      <label className="field">
        <span className="bar-label">A qué distancia (cm)</span>
        <CampoNumero valor={distancia} onCambiar={setDistancia} placeholder="15" />
      </label>
      {elegida && (
        <p className="faint" style={{ marginTop: 8 }}>
          Sus datos están medidos a {elegida.distanciaRefCm} cm. La irradiancia cae con el cuadrado
          de la distancia, así que ponerte al doble te deja en la cuarta parte: por eso se pregunta
          en vez de suponerlo.
        </p>
      )}

      <Regla />
      <Boton
        tono="primario"
        disabled={distancia === undefined || distancia <= 0}
        onClick={() => onEmpezar(lamparaId, zona, distancia ?? 15)}
      >
        Empezar
      </Boton>
      <Boton tono="callado" onClick={onDejarlo}>
        Dejarlo
      </Boton>
    </div>
  )
}

/**
 * El cielo, mientras el sol está en marcha.
 *
 * El sol no se está quieto: empiezas con el cielo cubierto, a los cinco minutos
 * se despeja, y el resto del rato es otra cosa. Antes había que elegir cuál de
 * los dos mentir, porque solo se guardaba uno.
 *
 * Cambiarlo aquí **no reescribe lo anterior**: cierra el tramo que llevabas y
 * abre uno nuevo. Los cinco minutos cubiertos se guardan como cubiertos, y al
 * parar cada tramo se convierte en su propia exposición con su propio factor.
 *
 * Se enseña lo que llevas de cada uno, y no solo el actual, porque es la única
 * forma de comprobar de un vistazo que la app ha entendido tu rato.
 */
function CieloEnMarcha({
  sol,
  ahora,
  onCambiar
}: {
  sol: EnCurso
  ahora: number
  onCambiar: (cielo: EstadoDelCielo) => void
}) {
  const tramos = tramosDeCielo(sol, Math.max(sol.desde, ahora))
  const actual = tramos[tramos.length - 1]?.cielo

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          Cómo está el cielo ahora
        </p>
        <Etiqueta acento>{escribirDuracion(minutosAbierto(sol, ahora))} al sol</Etiqueta>
      </div>
      <p className="dim" style={{ marginTop: 8 }}>
        Si cambia mientras estás fuera, tócalo. Lo que llevabas se guarda con el cielo que
        había; lo que venga después, con el nuevo.
      </p>

      <div className="options-col" style={{ marginTop: 12 }}>
        {ORDEN_CIELO.map((x) => (
          <Opcion key={x} activa={actual === x} onElegir={() => onCambiar(x)}>
            {CIELOS[x].nombre}
          </Opcion>
        ))}
      </div>

      {tramos.length > 1 && (
        <>
          <Regla />
          <p className="eyebrow">Lo que llevas de cada uno</p>
          {tramos.map((t, i) => (
            <div className="row" key={`${t.desde}-${i}`} style={{ padding: '5px 0' }}>
              <span className="dim">
                {t.cielo ? CIELOS[t.cielo].nombre : 'Sin apuntar'} · desde las{' '}
                {escribirHora(t.desde)}
              </span>
              <span>{escribirDuracion(t.minutos)}</span>
            </div>
          ))}
          <p className="faint" style={{ marginTop: 8 }}>
            Cada tramo se guardará como su propia exposición. El factor del cielo multiplica y
            no se promedia: cinco minutos cubiertos y cincuenta y cinco despejados no es lo
            mismo que una hora a medio camino.
          </p>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════ A MANO ══ */

/**
 * Apuntar un rato que ya pasó.
 *
 * Hace falta porque la vida no espera a que saques el móvil: te acuerdas del
 * paseo de esta mañana a la hora de comer, o se te olvidó parar y prefieres
 * poner tú la hora buena en vez de quedarte con la media hora estimada que puso
 * la app.
 *
 * No hay nada nuevo detrás: se construye un `EnCurso` con la hora que digas y
 * se para al momento que digas, así que lo que se guarda es exactamente lo
 * mismo que si lo hubieras cronometrado. Un rato apuntado a mano y uno
 * cronometrado valen igual, porque los dos los pusiste tú.
 *
 * ## El trabajo también
 *
 * La jornada no es un `EnCurso` —el fichaje ya sabía estar abierto por su
 * cuenta—, así que va por su lado, pero está aquí y no en otra pantalla porque
 * el olvido es el mismo olvido: entras a trabajar con las manos ocupadas y el
 * móvil en el bolsillo. Y se pide **entré / salí** en vez de una duración,
 * porque de un turno uno se acuerda por sus dos horas, no por lo que duró.
 */
type TipoAMano = TipoEnCurso | 'trabajo'

function AMano({
  hoy,
  ahora,
  lamparas,
  sitios,
  sitioHabitual,
  fichajes,
  nivelDe,
  onGuardar,
  onGuardarTrabajo,
  onDejarlo
}: {
  hoy: string
  ahora: number
  lamparas: Lampara[]
  sitios: PerfilDeLuz[]
  sitioHabitual?: PerfilDeLuz
  fichajes?: Fichaje[]
  nivelDe: (t: TipoEnCurso) => number
  onGuardar: (x: EnCurso, hastaMin: number, nivel?: number) => void
  onGuardarTrabajo: (entrada: number, salida: number, sitio: PerfilDeLuz) => void
  onDejarlo: () => void
}) {
  const [tipo, setTipo] = useState<TipoAMano>('fuera')
  const [desde, setDesde] = useState(escribirHora(Math.max(0, minutosDeAhora() - 60)))
  const [minutos, setMinutos] = useState<number | undefined>(30)
  const [hasta, setHasta] = useState(escribirHora(minutosDeAhora()))
  const [piel, setPiel] = useState<PielExpuesta>('brazos_piernas')
  const [cielo, setCielo] = useState<EstadoDelCielo>('limpio')
  const [lamparaId, setLamparaId] = useState(lamparas[0]?.id ?? '')
  const [sitioId, setSitioId] = useState(sitioHabitual?.id ?? '')

  const inicio = minutosDeHora(desde)
  const fin = minutosDeHora(hasta)
  const sitio = sitios.find((x) => x.id === sitioId) ?? sitioHabitual
  const esTrabajo = tipo === 'trabajo'

  const problema = esTrabajo
    ? (sitios.length === 0
        ? 'Primero hace falta un sitio de trabajo con su luz, en Luz.'
        : problemaDelTramoDeTrabajo(inicio, fin, fichajes, hoy, ahora))
    : undefined
  const vale = esTrabajo
    ? problema === undefined
    : inicio !== undefined && minutos !== undefined && minutos > 0

  return (
    <div className="card">
      <p className="eyebrow">Apuntar un rato a mano</p>
      <p className="dim" style={{ marginTop: 8 }}>
        Para lo que se te olvidó cronometrar, la jornada incluida. Se guarda igual que si lo
        hubieras medido: la hora es la que digas, no la de ahora.
      </p>

      <div className="options" style={{ marginTop: 14 }}>
        {BALDOSAS.map((b) => (
          <Opcion key={b.tipo} activa={tipo === b.tipo} onElegir={() => setTipo(b.tipo)}>
            {b.nombre}
          </Opcion>
        ))}
        <Opcion activa={esTrabajo} onElegir={() => setTipo('trabajo')}>
          Trabajo
        </Opcion>
      </div>

      {esTrabajo ? (
        <div className="field-row" style={{ marginTop: 14 }}>
          <label className="field">
            <span className="bar-label">Entré a las</span>
            <input
              type="time"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              aria-label="Hora a la que entré"
            />
          </label>
          <label className="field">
            <span className="bar-label">Salí a las</span>
            <input
              type="time"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              aria-label="Hora a la que salí"
            />
          </label>
        </div>
      ) : (
        <div className="field-row" style={{ marginTop: 14 }}>
          <label className="field">
            <span className="bar-label">Empezó a las</span>
            <input
              type="time"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              aria-label="Hora a la que empezó"
            />
          </label>
          <label className="field">
            <span className="bar-label">Cuántos minutos</span>
            <CampoNumero valor={minutos} onCambiar={setMinutos} placeholder="30" />
          </label>
        </div>
      )}

      {esTrabajo && sitios.length > 1 && (
        <>
          <Regla />
          <p className="eyebrow">En qué sitio</p>
          <p className="faint" style={{ marginTop: 6 }}>
            De aquí sale la luz que se guarda con el tramo: no vale lo mismo un taller sin
            ventanas que una oficina al lado del cristal.
          </p>
          <div className="options-col" style={{ marginTop: 10 }}>
            {sitios.map((x) => (
              <Opcion key={x.id} activa={sitio?.id === x.id} onElegir={() => setSitioId(x.id)}>
                {x.nombre}
              </Opcion>
            ))}
          </div>
        </>
      )}

      {esTrabajo && problema !== undefined && inicio !== undefined && fin !== undefined && (
        <p className="dim" style={{ marginTop: 12 }}>
          {problema}
        </p>
      )}

      {tipo === 'sol' && (
        <>
          <Regla />
          <p className="eyebrow">Cuánta piel</p>
          <div className="options" style={{ marginTop: 10 }}>
            {ORDEN_PIEL.map((x) => (
              <Opcion key={x} activa={piel === x} onElegir={() => setPiel(x)}>
                {PIELES[x]}
              </Opcion>
            ))}
          </div>
          <p className="eyebrow" style={{ marginTop: 14 }}>
            Cómo estaba el cielo
          </p>
          <div className="options" style={{ marginTop: 10 }}>
            {ORDEN_CIELO.map((x) => (
              <Opcion key={x} activa={cielo === x} onElegir={() => setCielo(x)}>
                {CIELOS[x].nombre}
              </Opcion>
            ))}
          </div>
        </>
      )}

      {tipo === 'lampara' && lamparas.length > 0 && (
        <>
          <Regla />
          <p className="eyebrow">Con cuál</p>
          <div className="options-col" style={{ marginTop: 10 }}>
            {lamparas.map((l) => (
              <Opcion key={l.id} activa={lamparaId === l.id} onElegir={() => setLamparaId(l.id)}>
                {l.nombre}
              </Opcion>
            ))}
          </div>
        </>
      )}

      <Regla />
      <Boton
        tono="primario"
        disabled={!vale}
        onClick={() => {
          if (esTrabajo) {
            if (inicio === undefined || fin === undefined || !sitio) return
            return onGuardarTrabajo(inicio, fin, sitio)
          }
          if (inicio === undefined || minutos === undefined) return
          const x: EnCurso = {
            tipo,
            date: hoy,
            desde: inicio,
            ...(tipo === 'sol' ? { piel, cielo } : {}),
            ...(tipo === 'lampara' ? { lamparaId } : {})
          }
          onGuardar(x, inicio + minutos, nivelDe(tipo))
        }}
      >
        {esTrabajo ? 'Guardar el tramo de trabajo' : 'Guardar el rato'}
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
