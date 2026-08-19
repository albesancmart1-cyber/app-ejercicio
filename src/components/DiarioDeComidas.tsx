import { useState } from 'react'
import { MEALS, type Meal } from '../data/meals'
import {
  conComida,
  diaDe,
  ordenadas,
  resumenDelDia,
  sinComida
} from '../domain/crononutricion'
import {
  ETIQUETAS_COMIDA,
  type CheckIn,
  type DiaDeComidas,
  type EtiquetaComida
} from '../domain/types'
import { actions } from '../store/store'
import Icon from './Icon'
import { Boton, Etiqueta, Opcion, Regla } from './ui'

/**
 * El diario de comidas del día.
 *
 * Comida 1, comida 2, las que sean — sin la camisa de fuerza de
 * desayuno/comida/cena. Lo que se registra es **qué, cuándo y de qué tipo**:
 * la hora es el dato central (crononutrición) y las etiquetas son un toque
 * cada una. Ni una caloría: la app cree en la señal de leptina, y lo que la
 * cuida es comer alineado con el día, con proteína y sin ultra-nada — no una
 * cuenta.
 *
 * De aquí se deriva sin preguntar: la ventana de alimentación, la cena tardía
 * y la salida de cetosis (etiqueta «carbohidrato»), que alimentan la
 * explicación diaria del peso.
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

export default function DiarioDeComidas({
  comidas,
  todayIso,
  checkIn
}: {
  comidas: DiaDeComidas[] | undefined
  todayIso: string
  checkIn?: CheckIn
}) {
  const dia = diaDe(comidas, todayIso)
  const [abierto, setAbierto] = useState(false)
  const [hora, setHora] = useState(ahora())
  const [texto, setTexto] = useState('')
  const [etiquetas, setEtiquetas] = useState<EtiquetaComida[]>([])

  const lista = ordenadas(dia?.comidas ?? [])
  const resumen = resumenDelDia(dia, checkIn)

  // La proteína y el DHA de los platos del recetario que se hayan enlazado.
  const enlazados = lista
    .map((c) => (c.mealId ? MEALS.find((m: Meal) => m.id === c.mealId) : undefined))
    .filter((m): m is Meal => m !== undefined)
  const proteinaG = enlazados.reduce((a, m) => a + m.proteinG, 0)
  const dhaMg = enlazados.reduce((a, m) => a + m.dhaMg, 0)

  function guardar() {
    if (!texto.trim() && etiquetas.length === 0) return
    actions.saveComidas(
      conComida(dia, todayIso, {
        hora,
        texto: texto.trim() || 'Comida',
        ...(etiquetas.length > 0 ? { etiquetas } : {})
      })
    )
    setTexto('')
    setEtiquetas([])
    setHora(ahora())
    setAbierto(false)
  }

  return (
    <div className="card diario-comidas">
      <p className="eyebrow">Hoy has comido</p>

      {lista.length === 0 && !abierto && (
        <p className="dim">
          Apunta cada comida con su hora — comida 1, comida 2, las que sean. Con las horas te digo tu
          ventana de alimentación, y mañana la báscula tendrá explicación.
        </p>
      )}

      {lista.map((c, i) => (
        <div className="comida-fila" key={`${c.hora}-${i}`}>
          <span className="comida-hora">{c.hora}</span>
          <div className="comida-cuerpo">
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
      {proteinaG > 0 && (
        <p className="faint" style={{ marginTop: 6 }}>
          De los platos del recetario llevas ≈ {proteinaG} g de proteína
          {dhaMg > 0 ? ` y ${dhaMg} mg de DHA` : ''}.
        </p>
      )}

      {abierto ? (
        <div className="comida-form fade-in">
          <Regla />
          <div className="comida-form-fila">
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              aria-label="Hora de la comida"
            />
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Qué has comido"
              aria-label="Qué has comido"
            />
          </div>
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
          <Boton tono="primario" style={{ marginTop: 12 }} onClick={guardar} disabled={!texto.trim() && etiquetas.length === 0}>
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
