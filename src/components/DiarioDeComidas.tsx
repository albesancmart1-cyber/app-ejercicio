import { useState } from 'react'
import { MEALS, type Meal } from '../data/meals'
import {
  conComida,
  diaDe,
  diasRegistrados,
  estadoDeCetosis,
  nombreDeDia,
  ordenadas,
  reemplazarComida,
  resumenDeCetosis,
  resumenDelDia,
  sinComida,
  sumarDias,
  type Cuando
} from '../domain/crononutricion'
import {
  CATEGORIA_LABELS,
  alimentoResuelto,
  buscarAlimentos,
  escribirUnidades,
  type AlimentoBasico
} from '../data/alimentos'
import { escribirNumero } from '../domain/numeros'
import {
  ETIQUETAS_COMIDA,
  type AlimentoRegistrado,
  type CalidadCarbo,
  type CheckIn,
  type ComidaRegistrada,
  type DiaDeComidas,
  type EdicionAlimento,
  type EtiquetaComida,
  type Suplemento,
  type TomaDeSuplemento
} from '../domain/types'
import { resumirToma } from '../domain/omega'
import { actions } from '../store/store'
import Icon from './Icon'
import { Boton, CampoNumero, Etiqueta, Opcion, Regla } from './ui'

/**
 * El diario de comidas del día.
 *
 * Comida 1, comida 2, las que sean — sin la camisa de fuerza de
 * desayuno/comida/cena. Cada comida se compone de **alimentos**: cada uno con
 * su nombre, su peso si se quiere apuntar, y sus propias etiquetas — el pollo
 * es proteína y el arroz de al lado es carbohidrato, en el mismo plato. La
 * hora es el dato central (crononutrición) y ni una caloría en ninguna parte:
 * se registra qué, cuándo y de qué tipo.
 *
 * De aquí se deriva sin preguntar: la ventana de alimentación, la cena tardía
 * y la salida de cetosis (cualquier alimento con «carbohidrato»), que
 * alimentan la explicación diaria del peso.
 */
const ETIQUETAS: EtiquetaComida[] = [
  'proteina',
  'pescado_azul',
  'huevos',
  'verdura',
  'carbohidrato',
  'salada',
  'alcohol'
]

/** «HH:MM» de ahora, para que añadir una comida recién comida sea un toque. */
function ahora(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * La cantidad como se dijo: «2 huevos» si se contó en unidades, «250 g» si se
 * pesó. Los gramos existen igual por debajo para la cuenta de carbohidratos,
 * pero enseñarlos aquí sería devolver un dato que nadie escribió.
 */
function cantidadDe(a: AlimentoRegistrado): string | undefined {
  if (a.unidades !== undefined && a.unidad) return escribirUnidades(a.unidades, a.unidad)
  if (a.gramos !== undefined) return `${escribirNumero(a.gramos)} g`
  return undefined
}

/** Un alimento en una línea: «Pollo · 250 g» y sus etiquetas debajo. */
function FilaDeAlimento({
  a,
  onQuitar,
  onEditar
}: {
  a: AlimentoRegistrado
  onQuitar?: () => void
  /** Devolverlo a los campos para tocarlo, en vez de borrarlo y repetirlo. */
  onEditar?: () => void
}) {
  const cantidad = cantidadDe(a)
  const cuerpo = (
    <>
      <span className="comida-texto">
        {a.nombre}
        {cantidad !== undefined && <span className="alimento-gramos"> · {cantidad}</span>}
      </span>
      {(a.etiquetas ?? []).length > 0 && (
        <span className="comida-etiquetas">
          {(a.etiquetas ?? []).map((e) => (
            <Etiqueta key={e} acento={e === 'carbohidrato' || e === 'alcohol'}>
              {ETIQUETAS_COMIDA[e]}
            </Etiqueta>
          ))}
        </span>
      )}
    </>
  )
  return (
    <div className="alimento-fila">
      {onEditar ? (
        <button
          className="comida-cuerpo alimento-editable"
          aria-label={`Cambiar ${a.nombre}`}
          onClick={onEditar}
        >
          {cuerpo}
        </button>
      ) : (
        <div className="comida-cuerpo">{cuerpo}</div>
      )}
      {onQuitar && (
        <button className="icon-btn" aria-label={`Quitar ${a.nombre}`} onClick={onQuitar}>
          <Icon name="close" />
        </button>
      )}
    </div>
  )
}

export default function DiarioDeComidas({
  comidas,
  todayIso,
  checkIns,
  ediciones,
  suplementos
}: {
  comidas: DiaDeComidas[] | undefined
  todayIso: string
  /** Todos los tests de la mañana: cada día mirado usa el suyo. */
  checkIns?: CheckIn[]
  /** Las correcciones del usuario sobre el catálogo de alimentos. */
  ediciones?: EdicionAlimento[]
  /** Los suplementos ya creados, para reutilizarlos de un toque. */
  suplementos?: Suplemento[]
}) {
  /**
   * El día que se está mirando, o `null` para hoy.
   *
   * Se guarda como «null» y no como la fecha de hoy a propósito: así, si la
   * app se queda abierta y pasa la medianoche, el diario sigue estando en el
   * día de hoy y no se queda anclado al de ayer sin avisar.
   */
  const [otroDia, setOtroDia] = useState<string | null>(null)
  const fecha = otroDia ?? todayIso
  const esHoy = fecha === todayIso
  const cuando: Cuando = esHoy ? 'hoy' : 'aquel_dia'
  const dia = diaDe(comidas, fecha)
  const checkIn = (checkIns ?? []).find((c) => c.date === fecha)
  const anteriores = diasRegistrados(comidas).filter((d) => d.date !== fecha)
  const [verAnteriores, setVerAnteriores] = useState(false)
  /**
   * La comida que se está corrigiendo, por su sitio en el día guardado — o
   * `null` si lo que se está haciendo es apuntar una nueva.
   */
  const [editando, setEditando] = useState<number | null>(null)
  /** El plato del recetario de la comida en corrección, para no perder el enlace. */
  const [mealIdEnEdicion, setMealIdEnEdicion] = useState<string | undefined>(undefined)
  const [abierto, setAbierto] = useState(false)
  const [hora, setHora] = useState(ahora())
  /** Los alimentos ya añadidos a la comida que se está componiendo. */
  const [alimentos, setAlimentos] = useState<AlimentoRegistrado[]>([])
  /** El alimento que se está escribiendo ahora mismo. */
  const [nombre, setNombre] = useState('')
  const [gramos, setGramos] = useState<number | undefined>(undefined)
  /** Las unidades, para lo que se cuenta contando: huevos, tortitas. */
  const [unidades, setUnidades] = useState<number | undefined>(undefined)
  const [etiquetas, setEtiquetas] = useState<EtiquetaComida[]>([])
  /** El alimento del catálogo elegido en el buscador, si se eligió. */
  const [elegido, setElegido] = useState<AlimentoBasico | null>(null)
  /**
   * Las cápsulas de esta comida.
   *
   * Van en su propio estado y no dentro de `alimentos` porque **un suplemento
   * no es un alimento**: no tiene gramos que pesar, y mezclarlos impediría
   * enseñar el ratio de omegas con y sin él, que es justo la comparación que
   * dice algo.
   */
  const [tomas, setTomas] = useState<TomaDeSuplemento[]>([])
  /** El panel de crear un suplemento nuevo para reutilizarlo siempre. */
  const [creandoSuplemento, setCreandoSuplemento] = useState(false)
  const [supNombre, setSupNombre] = useState('')
  const [supDha, setSupDha] = useState<number | undefined>(undefined)
  const [supEpa, setSupEpa] = useState<number | undefined>(undefined)
  /** El panel de corregir el alimento del catálogo para siempre. */
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [edCarbos, setEdCarbos] = useState<number | undefined>(undefined)
  const [edCarbo, setEdCarbo] = useState<CalidadCarbo | undefined>(undefined)
  const [edPorUnidad, setEdPorUnidad] = useState<number | undefined>(undefined)

  const resultados = elegido === null ? buscarAlimentos(nombre, ediciones) : []

  /**
   * Si lo que hay ahora mismo en el campo se cuenta por unidades. Solo cuenta
   * mientras el nombre siga siendo el del catálogo: en cuanto se reescribe, ya
   * es un alimento libre y vuelve a pesarse en gramos.
   */
  const porUnidades =
    elegido && nombre.trim() === elegido.nombre && elegido.gramosPorUnidad !== undefined
      ? { gramosPorUnidad: elegido.gramosPorUnidad, unidad: elegido.unidad ?? 'unidad' }
      : null

  /** Elegir del catálogo: nombre, enlace y sus etiquetas ya interpretadas. */
  function elegir(x: AlimentoBasico) {
    setElegido(x)
    setNombre(x.nombre)
    setEtiquetas(x.etiquetas)
    setEdCarbos(x.carbosPor100)
    setEdCarbo(x.carbo)
    setEdPorUnidad(x.gramosPorUnidad)
    setCorrigiendo(false)
    // Lo que se cuenta por unidades empieza en una: es el caso de siempre, y
    // dejarlo vacío obligaría a escribir «1» cada vez que se come un huevo.
    if (x.gramosPorUnidad !== undefined) {
      setUnidades(1)
      setGramos(undefined)
    } else {
      setUnidades(undefined)
    }
  }

  const lista = ordenadas(dia?.comidas ?? [])
  const resumen = resumenDelDia(dia, checkIn, cuando)
  const cetosis = resumenDeCetosis(dia, ediciones, cuando)

  // La proteína y el DHA de los platos del recetario que se hayan enlazado.
  const enlazados = lista
    .map((c) => (c.mealId ? MEALS.find((m: Meal) => m.id === c.mealId) : undefined))
    .filter((m): m is Meal => m !== undefined)
  const proteinaG = enlazados.reduce((a, m) => a + m.proteinG, 0)
  const dhaMg = enlazados.reduce((a, m) => a + m.dhaMg, 0)

  /** Lo escrito ahora mismo, como alimento — o nada si está en blanco. */
  function alimentoEnCurso(): AlimentoRegistrado | null {
    if (!nombre.trim()) return null
    // Contado por unidades se guardan las dos cosas: las unidades para poder
    // volver a enseñar «2 huevos», y los gramos que salen de ellas para que la
    // cuenta de carbohidratos y la cetosis sigan funcionando sin enterarse.
    const cantidad =
      porUnidades && unidades !== undefined
        ? {
            unidades,
            unidad: porUnidades.unidad,
            gramos: Math.round(unidades * porUnidades.gramosPorUnidad)
          }
        : gramos !== undefined
          ? { gramos }
          : {}
    return {
      nombre: nombre.trim(),
      ...cantidad,
      // El enlace al catálogo solo vale si el nombre sigue siendo el suyo.
      ...(elegido && nombre.trim() === elegido.nombre ? { alimentoId: elegido.id } : {}),
      ...(etiquetas.length > 0 ? { etiquetas } : {})
    }
  }

  function limpiarCampos() {
    setNombre('')
    setGramos(undefined)
    setUnidades(undefined)
    setEtiquetas([])
    setElegido(null)
    setCorrigiendo(false)
  }

  function anadirAlimento() {
    const a = alimentoEnCurso()
    if (!a) return
    setAlimentos((prev) => [...prev, a])
    limpiarCampos()
  }

  /**
   * Devuelve un alimento de la comida a los campos para retocarlo.
   *
   * «Eran tres huevos, no uno» tiene que costar un toque y un número; borrarlo
   * y volver a buscarlo en el catálogo es rehacer el trabajo entero. Si venía
   * del catálogo se recupera su ficha, para que siga contándose por unidades y
   * con sus carbohidratos.
   */
  function retocarAlimento(i: number) {
    const a = alimentos[i]
    if (!a) return
    setAlimentos((prev) => prev.filter((_, j) => j !== i))
    const ficha = a.alimentoId ? alimentoResuelto(a.alimentoId, ediciones) : undefined
    setElegido(ficha ?? null)
    setNombre(a.nombre)
    setEtiquetas(a.etiquetas ?? [])
    setUnidades(a.unidades)
    setGramos(a.unidades === undefined ? a.gramos : undefined)
    setEdCarbos(ficha?.carbosPor100)
    setEdCarbo(ficha?.carbo)
    setEdPorUnidad(ficha?.gramosPorUnidad)
    setCorrigiendo(false)
  }

  /** Guarda la corrección del alimento del catálogo, para este y para siempre. */
  function guardarCorreccion() {
    if (!elegido) return
    actions.saveEdicionAlimento({
      id: elegido.id,
      etiquetas,
      ...(edCarbos !== undefined ? { carbosPor100: edCarbos } : {}),
      ...(edCarbo !== undefined ? { carbo: edCarbo } : {}),
      ...(edPorUnidad !== undefined ? { gramosPorUnidad: edPorUnidad } : {})
    })
    setElegido({
      ...elegido,
      etiquetas,
      carbosPor100: edCarbos,
      carbo: edCarbo,
      ...(edPorUnidad !== undefined ? { gramosPorUnidad: edPorUnidad } : {})
    })
    setCorrigiendo(false)
  }

  function cerrarFormulario() {
    setAlimentos([])
    setTomas([])
    setCreandoSuplemento(false)
    limpiarCampos()
    setHora(ahora())
    setEditando(null)
    setMealIdEnEdicion(undefined)
    setAbierto(false)
  }

  /** Abre el formulario ya relleno con una comida apuntada, para corregirla. */
  function editarComida(c: ComidaRegistrada) {
    if (!dia) return
    setEditando(dia.comidas.indexOf(c))
    setMealIdEnEdicion(c.mealId)
    setHora(c.hora)
    setTomas([...(c.suplementos ?? [])])
    // Un plato del recetario o una comida vieja de texto no tienen alimentos
    // sueltos: entra tal cual como un alimento, con sus etiquetas, y desde ahí
    // ya se le pueden añadir los acompañamientos.
    setAlimentos(
      (c.alimentos ?? []).length > 0
        ? [...c.alimentos!]
        : c.texto.trim()
          ? [{ nombre: c.texto, ...(c.etiquetas?.length ? { etiquetas: c.etiquetas } : {}) }]
          : []
    )
    limpiarCampos()
    setAbierto(true)
  }

  function guardar() {
    // Lo que esté a medio escribir también entra: obligar a pulsar «añadir»
    // antes de guardar perdería el último alimento sin que nadie lo note.
    const enCurso = alimentoEnCurso()
    const todos = enCurso ? [...alimentos, enCurso] : alimentos
    // Una comida que solo son cápsulas también vale: hay quien las toma sola.
    if (todos.length === 0 && tomas.length === 0) return
    const comida: ComidaRegistrada = {
      hora,
      texto: '',
      alimentos: todos,
      ...(tomas.length > 0 ? { suplementos: tomas } : {}),
      // El enlace al plato del recetario se conserva al corregir: de él salen
      // la proteína y el DHA del día, y perderlo al tocar la hora sería un
      // agujero silencioso en la cuenta.
      ...(mealIdEnEdicion ? { mealId: mealIdEnEdicion } : {})
    }
    actions.saveComidas(
      editando !== null && dia
        ? reemplazarComida(dia, editando, comida)
        : conComida(dia, fecha, comida)
    )
    cerrarFormulario()
  }

  const sePuedeGuardar = alimentos.length > 0 || nombre.trim() !== ''

  return (
    <div className="card diario-comidas">
      {/*
        El diario no es solo el de hoy: se puede ir a cualquier día para ver lo
        que se comió, corregirlo o rellenar lo que se quedó sin apuntar.
      */}
      <div className="diario-dias">
        <button
          className="icon-btn"
          aria-label="Ver el día anterior"
          onClick={() => {
            setOtroDia(sumarDias(fecha, -1))
            cerrarFormulario()
          }}
        >
          <Icon name="chevron" className="gira-180" />
        </button>
        <p className="eyebrow diario-dia-nombre">
          {esHoy ? 'Hoy has comido' : `${nombreDeDia(fecha, todayIso)} comiste`}
        </p>
        <button
          className="icon-btn"
          aria-label="Ver el día siguiente"
          disabled={esHoy}
          onClick={() => {
            const siguiente = sumarDias(fecha, 1)
            setOtroDia(siguiente === todayIso ? null : siguiente)
            cerrarFormulario()
          }}
        >
          <Icon name="chevron" />
        </button>
      </div>

      {lista.length === 0 && !abierto && (
        <p className="dim">
          {esHoy
            ? 'Apunta cada comida con su hora y sus alimentos — cada uno con su peso y lo que es. Con las horas te digo tu ventana de alimentación, y mañana la báscula tendrá explicación.'
            : 'Ese día no quedó nada apuntado. Todavía lo puedes rellenar, si te acuerdas.'}
        </p>
      )}

      {lista.map((c, i) => (
        <div className="comida-fila" key={`${c.hora}-${i}`}>
          <span className="comida-hora">{c.hora}</span>
          <div className="comida-cuerpo">
            {(c.alimentos ?? []).length > 0 ? (
              (c.alimentos ?? []).map((a, j) => <FilaDeAlimento key={j} a={a} />)
            ) : (
              <>
                <span className="comida-texto">{c.texto}</span>
                {(c.etiquetas ?? []).length > 0 && (
                  <span className="comida-etiquetas">
                    {(c.etiquetas ?? []).map((e) => (
                      <Etiqueta key={e} acento={e === 'carbohidrato' || e === 'alcohol'}>
                        {ETIQUETAS_COMIDA[e]}
                      </Etiqueta>
                    ))}
                  </span>
                )}
              </>
            )}
          </div>
          <button
            className="icon-btn"
            aria-label={`Corregir la comida de las ${c.hora}`}
            onClick={() => editarComida(c)}
          >
            <Icon name="pencil" />
          </button>
          <button
            className="icon-btn"
            aria-label={`Quitar la comida de las ${c.hora}`}
            onClick={() => actions.saveComidas(sinComida(dia!, dia!.comidas.indexOf(c)))}
          >
            <Icon name="close" />
          </button>
        </div>
      ))}

      {resumen && <p className="comida-resumen">{resumen}</p>}
      {cetosis && <p className="comida-resumen">{cetosis}</p>}
      {proteinaG > 0 && (
        <p className="faint" style={{ marginTop: 6 }}>
          De los platos del recetario {esHoy ? 'llevas' : 'llevabas'} ≈ {proteinaG} g de proteína
          {dhaMg > 0 ? ` y ${dhaMg} mg de DHA` : ''}.
        </p>
      )}

      {abierto ? (
        <div className="comida-form fade-in">
          <Regla />
          <label className="comida-form-hora">
            <span className="focus-label">Hora de la comida</span>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              aria-label="Hora de la comida"
            />
          </label>

          {alimentos.length > 0 && (
            <div className="comida-borrador">
              {alimentos.map((a, i) => (
                <FilaDeAlimento
                  key={i}
                  a={a}
                  onEditar={() => retocarAlimento(i)}
                  onQuitar={() => setAlimentos((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          {/*
            * La suplementación va **dentro de la comida** y separada de los
            * alimentos, tal y como se toma: la cápsula se traga con la comida,
            * pero no es comida. Se crea una vez y luego es un toque.
            */}
          {tomas.length > 0 && (
            <div className="comida-borrador">
              {tomas.map((t, i) => {
                const sup = (suplementos ?? []).find((x) => x.id === t.suplementoId)
                return (
                  <div className="row" key={i} style={{ padding: '6px 0' }}>
                    <span className="dim">
                      ＋ {sup?.nombre ?? 'Suplemento borrado'}{' '}
                      <Etiqueta>Suplem.</Etiqueta>
                    </span>
                    <span className="faint">
                      {sup ? resumirToma(t, sup) : `${t.capsulas} cáps.`}
                      <button
                        onClick={() => setTomas((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Quitar ${sup?.nombre ?? 'suplemento'}`}
                        style={{
                          background: 'none',
                          border: 0,
                          color: 'var(--label-3)',
                          marginLeft: 10,
                          cursor: 'pointer',
                          font: 'inherit'
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {(suplementos ?? []).length > 0 && !creandoSuplemento && (
            <div style={{ marginTop: 8 }}>
              <span className="bar-label">Suplementación</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(suplementos ?? []).map((sup) => (
                  <Boton
                    key={sup.id}
                    tono="callado"
                    style={{ width: 'auto' }}
                    onClick={() =>
                      setTomas((prev) => {
                        const ya = prev.find((t) => t.suplementoId === sup.id)
                        // Volver a tocarlo sube una cápsula: es más rápido que
                        // abrir un campo para escribir «2».
                        return ya
                          ? prev.map((t) =>
                              t.suplementoId === sup.id ? { ...t, capsulas: t.capsulas + 1 } : t
                            )
                          : [...prev, { suplementoId: sup.id, capsulas: 1 }]
                      })
                    }
                  >
                    ＋ {sup.nombre}
                  </Boton>
                ))}
              </div>
            </div>
          )}

          {!creandoSuplemento ? (
            <Boton tono="callado" onClick={() => setCreandoSuplemento(true)}>
              Crear un suplemento
            </Boton>
          ) : (
            <div className="fade-in" style={{ marginTop: 8 }}>
              <label className="field">
                <span className="bar-label">Nombre</span>
                <input
                  value={supNombre}
                  onChange={(e) => setSupNombre(e.target.value)}
                  placeholder="Omega-3 Nordic"
                />
              </label>
              <div className="field-row" style={{ marginTop: 8 }}>
                <label className="field">
                  <span className="bar-label">DHA por cápsula (mg)</span>
                  <CampoNumero valor={supDha} onCambiar={setSupDha} placeholder="330" />
                </label>
                <label className="field">
                  <span className="bar-label">EPA por cápsula (mg)</span>
                  <CampoNumero valor={supEpa} onCambiar={setSupEpa} placeholder="110" />
                </label>
              </div>
              <p className="faint" style={{ marginTop: 8 }}>
                Se crea una vez y ya está para siempre: a partir de ahora lo añades a cualquier
                comida con un toque. Cuenta para el ratio de omegas del día, pero se guarda aparte
                para que puedas ver el ratio solo de comida y con suplemento.
              </p>
              <Boton
                tono="primario"
                disabled={!supNombre.trim()}
                onClick={() => {
                  const sup: Suplemento = {
                    id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    nombre: supNombre.trim(),
                    ...(supDha !== undefined ? { dhaMg: supDha } : {}),
                    ...(supEpa !== undefined ? { epaMg: supEpa } : {})
                  }
                  actions.saveSuplemento(sup)
                  setTomas((prev) => [...prev, { suplementoId: sup.id, capsulas: 1 }])
                  setSupNombre('')
                  setSupDha(undefined)
                  setSupEpa(undefined)
                  setCreandoSuplemento(false)
                }}
              >
                Guardar y añadir a esta comida
              </Boton>
              <Boton tono="callado" onClick={() => setCreandoSuplemento(false)}>
                Cancelar
              </Boton>
            </div>
          )}

          <div className="comida-form-fila" style={{ marginTop: 10 }}>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                // Escribir de nuevo suelta el elegido: vuelve a ser búsqueda.
                if (elegido && e.target.value !== elegido.nombre) {
                  setElegido(null)
                  setEtiquetas([])
                }
              }}
              placeholder="Busca un alimento (salmón, melocotón…)"
              aria-label="Nombre del alimento"
            />
            {porUnidades ? (
              <CampoNumero
                decimales
                valor={unidades}
                onCambiar={setUnidades}
                placeholder={porUnidades.unidad === 'unidad' ? 'uds.' : `${porUnidades.unidad}s`}
                className="alimento-peso"
                // Sin género: «cuántos tortitas» estaría mal y «cuántas huevos»
                // también, y no hay género que consultar en el catálogo.
                aria-label={`Cantidad en ${porUnidades.unidad}s`}
              />
            ) : (
              <CampoNumero
                decimales
                valor={gramos}
                onCambiar={setGramos}
                placeholder="g"
                className="alimento-peso"
                aria-label="Peso del alimento en gramos"
              />
            )}
          </div>
          {porUnidades && unidades !== undefined && (
            <p className="faint" style={{ marginTop: 6 }}>
              {escribirUnidades(unidades, porUnidades.unidad)} ·{' '}
              {escribirNumero(Math.round(unidades * porUnidades.gramosPorUnidad))} g
            </p>
          )}

          {/*
            El buscador del catálogo: alimentos básicos ya interpretados. Elegir
            uno pone su nombre, su enlace y sus etiquetas de fábrica; escribir
            algo que no está sigue valiendo como alimento libre.
          */}
          {resultados.length > 0 && (
            <div className="alimento-resultados" role="listbox" aria-label="Alimentos del catálogo">
              {resultados.map((x) => (
                <button key={x.id} className="alimento-resultado" role="option" aria-selected="false" onClick={() => elegir(x)}>
                  <span>{x.nombre}</span>
                  <span className="faint">
                    {CATEGORIA_LABELS[x.categoria]}
                    {x.carbosPor100 !== undefined && x.etiquetas.includes('carbohidrato')
                      ? ` · ${x.carbosPor100} g carb./100 g`
                      : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* El elegido, con su ficha y la puerta a corregirlo para siempre. */}
          {elegido && (
            <div className="alimento-ficha">
              <p className="faint">
                {CATEGORIA_LABELS[elegido.categoria]}
                {elegido.carbosPor100 !== undefined
                  ? ` · ≈ ${elegido.carbosPor100} g de carbohidrato por 100 g${
                      elegido.carbo ? ` (${elegido.carbo === 'bueno' ? 'de los buenos' : 'refinado'})` : ''
                    }`
                  : ' · sin carbohidrato que contar'}
              </p>
              {elegido.gramosPorUnidad !== undefined && (
                <p className="faint">
                  Se cuenta por {elegido.unidad ?? 'unidad'}s · {escribirNumero(elegido.gramosPorUnidad)} g
                  por {elegido.unidad ?? 'unidad'}
                  {elegido.carbosPor100 !== undefined && elegido.etiquetas.includes('carbohidrato')
                    ? `, ≈ ${escribirNumero(
                        Math.round((elegido.gramosPorUnidad * elegido.carbosPor100) / 10) / 10
                      )} g de carbohidrato`
                    : ''}
                </p>
              )}
              {corrigiendo ? (
                <div className="fade-in" style={{ marginTop: 8 }}>
                  <label className="bascula-campo" style={{ maxWidth: 170 }}>
                    <span className="focus-label">Carbohidrato por 100 g</span>
                    <CampoNumero decimales valor={edCarbos} onCambiar={setEdCarbos} placeholder="g" aria-label="Gramos de carbohidrato por cien gramos" />
                  </label>
                  {elegido.gramosPorUnidad !== undefined && (
                    <label className="bascula-campo" style={{ maxWidth: 170, marginTop: 8 }}>
                      <span className="focus-label">Gramos por {elegido.unidad ?? 'unidad'}</span>
                      <CampoNumero
                        decimales
                        valor={edPorUnidad}
                        onCambiar={setEdPorUnidad}
                        placeholder="g"
                        aria-label="Gramos que pesa una unidad"
                      />
                    </label>
                  )}
                  <div className="options" style={{ marginTop: 8 }}>
                    <Opcion activa={edCarbo === 'bueno'} onElegir={() => setEdCarbo('bueno')}>
                      Carbohidrato bueno
                    </Opcion>
                    <Opcion activa={edCarbo === 'malo'} onElegir={() => setEdCarbo('malo')}>
                      Refinado
                    </Opcion>
                  </div>
                  <p className="faint" style={{ marginTop: 8 }}>
                    Las etiquetas marcadas arriba también se guardan con la corrección.
                  </p>
                  <Boton tono="secundario" suelto onClick={guardarCorreccion}>
                    Guardar la corrección para siempre
                  </Boton>
                </div>
              ) : (
                <button className="disclose" onClick={() => setCorrigiendo(true)}>
                  Corregir este alimento
                </button>
              )}
            </div>
          )}
          <div className="options" style={{ marginTop: 10 }}>
            {ETIQUETAS.map((e) => (
              <Opcion
                key={e}
                activa={etiquetas.includes(e)}
                onElegir={() =>
                  setEtiquetas((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))
                }
              >
                {ETIQUETAS_COMIDA[e]}
              </Opcion>
            ))}
          </div>

          <Boton
            tono="secundario"
            style={{ marginTop: 12 }}
            disabled={!nombre.trim()}
            onClick={anadirAlimento}
          >
            Añadir otro alimento
          </Boton>
          <Boton tono="primario" onClick={guardar} disabled={!sePuedeGuardar}>
            {editando !== null ? 'Guardar los cambios' : 'Guardar comida'}
          </Boton>
          <Boton tono="callado" onClick={cerrarFormulario}>
            Cancelar
          </Boton>
        </div>
      ) : (
        <Boton
          tono="secundario"
          style={{ marginTop: 12 }}
          onClick={() => {
            setHora(ahora())
            setEditando(null)
            setMealIdEnEdicion(undefined)
            setAbierto(true)
          }}
        >
          {esHoy ? 'Añadir comida' : 'Añadir una comida de ese día'}
        </Boton>
      )}

      {/*
        Todo lo que se ha apuntado alguna vez, a un toque. Es la memoria del
        diario: sin ella, mirar atrás significaría ir día a día con la flecha
        sin saber siquiera en cuáles hay algo.
      */}
      {anteriores.length > 0 && (
        <>
          <Regla />
          {verAnteriores ? (
            <div className="dias-anteriores fade-in">
              {anteriores.map((d) => {
                const e = estadoDeCetosis(d, ediciones)
                return (
                  <button
                    key={d.date}
                    className="dia-anterior"
                    onClick={() => {
                      setOtroDia(d.date === todayIso ? null : d.date)
                      cerrarFormulario()
                      setVerAnteriores(false)
                    }}
                  >
                    <span className="dia-anterior-nombre">{nombreDeDia(d.date, todayIso)}</span>
                    <span className="faint">
                      {d.comidas.length} {d.comidas.length === 1 ? 'comida' : 'comidas'}
                      {e.estado !== 'desconocido' && !e.conCarboSinGramos
                        ? ` · ≈ ${e.carbosG} g de carbohidrato`
                        : ''}
                    </span>
                    {e.estado === 'fuera' && <Etiqueta acento>Fuera de cetosis</Etiqueta>}
                  </button>
                )
              })}
            </div>
          ) : (
            <button className="disclose" onClick={() => setVerAnteriores(true)}>
              Ver los otros {anteriores.length} {anteriores.length === 1 ? 'día' : 'días'} apuntados
            </button>
          )}
        </>
      )}
    </div>
  )
}
