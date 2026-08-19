import { useState } from 'react'
import { MEALS, type Meal } from '../data/meals'
import {
  conComida,
  diaDe,
  ordenadas,
  resumenDeCetosis,
  resumenDelDia,
  sinComida
} from '../domain/crononutricion'
import { CATEGORIA_LABELS, buscarAlimentos, type AlimentoBasico } from '../data/alimentos'
import { escribirNumero } from '../domain/numeros'
import {
  ETIQUETAS_COMIDA,
  type AlimentoRegistrado,
  type CalidadCarbo,
  type CheckIn,
  type ComidaRegistrada,
  type DiaDeComidas,
  type EdicionAlimento,
  type EtiquetaComida
} from '../domain/types'
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

/** Un alimento en una línea: «Pollo · 250 g» y sus etiquetas debajo. */
function FilaDeAlimento({ a, onQuitar }: { a: AlimentoRegistrado; onQuitar?: () => void }) {
  return (
    <div className="alimento-fila">
      <div className="comida-cuerpo">
        <span className="comida-texto">
          {a.nombre}
          {a.gramos !== undefined && <span className="alimento-gramos"> · {escribirNumero(a.gramos)} g</span>}
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
      </div>
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
  checkIn,
  ediciones
}: {
  comidas: DiaDeComidas[] | undefined
  todayIso: string
  checkIn?: CheckIn
  /** Las correcciones del usuario sobre el catálogo de alimentos. */
  ediciones?: EdicionAlimento[]
}) {
  const dia = diaDe(comidas, todayIso)
  const [abierto, setAbierto] = useState(false)
  const [hora, setHora] = useState(ahora())
  /** Los alimentos ya añadidos a la comida que se está componiendo. */
  const [alimentos, setAlimentos] = useState<AlimentoRegistrado[]>([])
  /** El alimento que se está escribiendo ahora mismo. */
  const [nombre, setNombre] = useState('')
  const [gramos, setGramos] = useState<number | undefined>(undefined)
  const [etiquetas, setEtiquetas] = useState<EtiquetaComida[]>([])
  /** El alimento del catálogo elegido en el buscador, si se eligió. */
  const [elegido, setElegido] = useState<AlimentoBasico | null>(null)
  /** El panel de corregir el alimento del catálogo para siempre. */
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [edCarbos, setEdCarbos] = useState<number | undefined>(undefined)
  const [edCarbo, setEdCarbo] = useState<CalidadCarbo | undefined>(undefined)

  const resultados = elegido === null ? buscarAlimentos(nombre, ediciones) : []

  /** Elegir del catálogo: nombre, enlace y sus etiquetas ya interpretadas. */
  function elegir(x: AlimentoBasico) {
    setElegido(x)
    setNombre(x.nombre)
    setEtiquetas(x.etiquetas)
    setEdCarbos(x.carbosPor100)
    setEdCarbo(x.carbo)
    setCorrigiendo(false)
  }

  const lista = ordenadas(dia?.comidas ?? [])
  const resumen = resumenDelDia(dia, checkIn)
  const cetosis = resumenDeCetosis(dia, ediciones)

  // La proteína y el DHA de los platos del recetario que se hayan enlazado.
  const enlazados = lista
    .map((c) => (c.mealId ? MEALS.find((m: Meal) => m.id === c.mealId) : undefined))
    .filter((m): m is Meal => m !== undefined)
  const proteinaG = enlazados.reduce((a, m) => a + m.proteinG, 0)
  const dhaMg = enlazados.reduce((a, m) => a + m.dhaMg, 0)

  /** Lo escrito ahora mismo, como alimento — o nada si está en blanco. */
  function alimentoEnCurso(): AlimentoRegistrado | null {
    if (!nombre.trim()) return null
    return {
      nombre: nombre.trim(),
      ...(gramos !== undefined ? { gramos } : {}),
      // El enlace al catálogo solo vale si el nombre sigue siendo el suyo.
      ...(elegido && nombre.trim() === elegido.nombre ? { alimentoId: elegido.id } : {}),
      ...(etiquetas.length > 0 ? { etiquetas } : {})
    }
  }

  function limpiarCampos() {
    setNombre('')
    setGramos(undefined)
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

  /** Guarda la corrección del alimento del catálogo, para este y para siempre. */
  function guardarCorreccion() {
    if (!elegido) return
    actions.saveEdicionAlimento({
      id: elegido.id,
      etiquetas,
      ...(edCarbos !== undefined ? { carbosPor100: edCarbos } : {}),
      ...(edCarbo !== undefined ? { carbo: edCarbo } : {})
    })
    setElegido({ ...elegido, etiquetas, carbosPor100: edCarbos, carbo: edCarbo })
    setCorrigiendo(false)
  }

  function guardar() {
    // Lo que esté a medio escribir también entra: obligar a pulsar «añadir»
    // antes de guardar perdería el último alimento sin que nadie lo note.
    const enCurso = alimentoEnCurso()
    const todos = enCurso ? [...alimentos, enCurso] : alimentos
    if (todos.length === 0) return
    const comida: ComidaRegistrada = { hora, texto: '', alimentos: todos }
    actions.saveComidas(conComida(dia, todayIso, comida))
    setAlimentos([])
    limpiarCampos()
    setHora(ahora())
    setAbierto(false)
  }

  const sePuedeGuardar = alimentos.length > 0 || nombre.trim() !== ''

  return (
    <div className="card diario-comidas">
      <p className="eyebrow">Hoy has comido</p>

      {lista.length === 0 && !abierto && (
        <p className="dim">
          Apunta cada comida con su hora y sus alimentos — cada uno con su peso y lo que es. Con las
          horas te digo tu ventana de alimentación, y mañana la báscula tendrá explicación.
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
          De los platos del recetario llevas ≈ {proteinaG} g de proteína
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
                  onQuitar={() => setAlimentos((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
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
            <CampoNumero
              decimales
              valor={gramos}
              onCambiar={setGramos}
              placeholder="g"
              className="alimento-peso"
              aria-label="Peso del alimento en gramos"
            />
          </div>

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
              {corrigiendo ? (
                <div className="fade-in" style={{ marginTop: 8 }}>
                  <label className="bascula-campo" style={{ maxWidth: 170 }}>
                    <span className="focus-label">Carbohidrato por 100 g</span>
                    <CampoNumero decimales valor={edCarbos} onCambiar={setEdCarbos} placeholder="g" aria-label="Gramos de carbohidrato por cien gramos" />
                  </label>
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
            Guardar comida
          </Boton>
          <Boton tono="callado" onClick={() => setAbierto(false)}>
            Cancelar
          </Boton>
        </div>
      ) : (
        <Boton tono="secundario" style={{ marginTop: 12 }} onClick={() => { setHora(ahora()); setAbierto(true) }}>
          Añadir comida
        </Boton>
      )}
    </div>
  )
}
