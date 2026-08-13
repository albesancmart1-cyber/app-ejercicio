import { useState } from 'react'
import { EQUIPMENT_LABELS, type Equipment, type Profile } from '../domain/types'
import {
  describirLocalizacion,
  guardarLocalizacion,
  nombreLibreDeSitio,
  type Localizacion
} from '../domain/localizaciones'
import { Boton, Opcion, Pastilla, Regla } from './ui'
import { Field, FieldLabel } from '@appica/ui-react/field'
import { Input } from '@appica/ui-react/input'

const TODO_EL_MATERIAL = Object.keys(EQUIPMENT_LABELS) as Equipment[]

/**
 * Los sitios donde entrenas, con el material de cada uno.
 *
 * El perfil tenía una sola lista de equipamiento, y eso da por hecho que uno
 * entrena siempre en el mismo sitio. En la práctica el mismo cuerpo entrena en
 * el gimnasio de casa entre semana, en un hotel el fin de semana y en el salón
 * cuando no hay tiempo de bajar; cambiar significaba entrar aquí, marcar y
 * desmarcar una docena de botones, y acordarse de deshacerlo al volver.
 *
 * El material del perfil y «solo mi cuerpo» no se editan aquí: el primero está
 * arriba, en su propia tarjeta, y el segundo no tiene nada que configurar.
 */
export default function Localizaciones({
  profile,
  onChange
}: {
  profile: Profile
  onChange: (partial: Partial<Profile>) => void
}) {
  const sitios = profile.locations ?? []
  const [editando, setEditando] = useState<Localizacion | null>(null)

  function nuevo() {
    setEditando({
      id: `loc-${Date.now()}`,
      nombre: nombreLibreDeSitio(sitios, 'Gimnasio'),
      equipment: []
    })
  }

  function guardar() {
    if (!editando) return
    onChange({
      locations: guardarLocalizacion(sitios, {
        ...editando,
        nombre: nombreLibreDeSitio(
          sitios.filter((l) => l.id !== editando.id),
          editando.nombre
        )
      })
    })
    setEditando(null)
  }

  function borrar(id: string) {
    onChange({ locations: sitios.filter((l) => l.id !== id) })
    if (editando?.id === id) setEditando(null)
  }

  function alternarEquipo(eq: Equipment) {
    if (!editando) return
    setEditando({
      ...editando,
      equipment: editando.equipment.includes(eq)
        ? editando.equipment.filter((e) => e !== eq)
        : [...editando.equipment, eq]
    })
  }

  return (
    <div className="card">
      <p className="eyebrow">Dónde entrenas</p>
      <p className="dim" style={{ marginBottom: 14 }}>
        Un sitio es un nombre y el material que hay en él. Al preparar el día eliges dónde estás y la
        app construye con lo que haya allí. Tu material de siempre y «solo mi cuerpo» están
        disponibles sin configurar nada.
      </p>

      {sitios.map((l) => (
        <div className="item" key={l.id}>
          <div className="item-body">
            <div className="item-title">{l.nombre}</div>
            <div className="item-meta">{describirLocalizacion(l)}</div>
          </div>
          <Pastilla onClick={() => setEditando(l)} aria-label={`Editar ${l.nombre}`}>
            Editar
          </Pastilla>
          <Pastilla onClick={() => borrar(l.id)} aria-label={`Borrar ${l.nombre}`}>
            Borrar
          </Pastilla>
        </div>
      ))}

      {sitios.length === 0 && !editando && (
        <p className="faint" style={{ marginBottom: 14 }}>
          Todavía no has creado ninguno. Con uno solo ya merece la pena: el del gimnasio, o el de
          casa de tus padres.
        </p>
      )}

      {editando ? (
        <div className="fade-in ex-prefs">
          <Field className="field">
            <FieldLabel>Nombre del sitio</FieldLabel>
            <Input
              type="text"
              value={editando.nombre}
              placeholder="Gimnasio, hotel, casa de mis padres…"
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
            />
          </Field>

          <p className="eyebrow" style={{ marginTop: 14 }}>
            Qué hay aquí
          </p>
          <div className="options">
            {TODO_EL_MATERIAL.filter((eq) => eq !== 'peso_corporal').map((eq) => (
              <Opcion
                key={eq}
                activa={editando.equipment.includes(eq)}
                onElegir={() => alternarEquipo(eq)}
              >
                {EQUIPMENT_LABELS[eq]}
              </Opcion>
            ))}
          </div>
          <p className="faint" style={{ marginTop: 10 }}>
            Tu cuerpo va contigo a todas partes, así que el peso corporal está siempre disponible y
            no hace falta marcarlo.
          </p>

          <Regla />
          <Boton tono="primario" onClick={guardar}>
            Guardar este sitio
          </Boton>
          <Boton tono="callado" onClick={() => setEditando(null)}>
            Cancelar
          </Boton>
        </div>
      ) : (
        <Boton tono="secundario" onClick={nuevo}>
          Añadir un sitio
        </Boton>
      )}
    </div>
  )
}
