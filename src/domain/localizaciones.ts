/**
 * Dónde entrenas hoy, y con qué.
 *
 * El perfil tenía **una** lista de equipamiento, y eso da por hecho que uno
 * entrena siempre en el mismo sitio. En la práctica no: el mismo cuerpo entrena
 * en el gimnasio de casa entre semana, en un hotel el fin de semana y en el
 * salón cuando no hay tiempo de bajar. Cambiar de sitio significaba entrar en
 * los ajustes y marcar y desmarcar una docena de botones —y acordarse de
 * deshacerlo al volver—, así que en la práctica nadie lo hacía y la app proponía
 * sentadillas con barra a alguien que estaba en un piso vacío.
 *
 * Aquí cada sitio es una lista con nombre. Se elige antes de generar el entreno
 * y el motor construye con ese material y con esos topes de peso.
 */
import { EQUIPMENT_LABELS, type Equipment, type Profile } from './types'

export interface Localizacion {
  id: string
  nombre: string
  /** Con qué se cuenta aquí. Siempre incluye el propio cuerpo. */
  equipment: Equipment[]
  /**
   * Topes de peso de este sitio. Las mancuernas de casa llegan a 24 y las del
   * gimnasio a 50: sin esto, la progresión de carga propondría lo mismo en los
   * dos y en uno de ellos sería imposible.
   */
  maxWeights?: Partial<Record<Equipment, number>>
}

/**
 * El sitio que la app ofrece siempre, sin que nadie lo cree.
 *
 * Entrenar sin nada es el caso que más veces salva un día —de viaje, en casa de
 * alguien, con el gimnasio cerrado— y obligar a configurarlo antes de poder
 * usarlo sería pedirle al usuario que prevea el imprevisto.
 */
export const SIN_MATERIAL: Localizacion = {
  id: 'sin-material',
  nombre: 'Solo mi cuerpo',
  equipment: ['peso_corporal']
}

/** El identificador del sitio implícito: lo que hay configurado en el perfil. */
export const MI_MATERIAL = 'perfil'

/**
 * Todos los sitios entre los que se puede elegir hoy.
 *
 * El primero es siempre el material del perfil —el de toda la vida, para quien
 * no quiera saber nada de esto— y el último, entrenar sin nada. En medio, los
 * que haya creado el usuario.
 */
export function localizacionesDe(profile: Profile): Localizacion[] {
  const propias = profile.locations ?? []
  return [
    {
      id: MI_MATERIAL,
      nombre: 'Todo mi material',
      equipment: profile.equipment,
      maxWeights: profile.maxWeights
    },
    ...propias,
    SIN_MATERIAL
  ]
}

/** Busca un sitio por su identificador; si no está, el material del perfil. */
export function localizacionPorId(profile: Profile, id: string | undefined): Localizacion {
  const todas = localizacionesDe(profile)
  return todas.find((l) => l.id === id) ?? todas[0]
}

/**
 * El perfil que ve el motor cuando se entrena en un sitio concreto.
 *
 * En vez de enseñarle las localizaciones a `buildSession` y a los seis sitios
 * que consultan el equipamiento, se le da el perfil de siempre con el material
 * cambiado. Todo lo que ya sabía filtrar por equipo sigue funcionando sin
 * enterarse de que existen los sitios.
 */
export function perfilEn(profile: Profile, loc: Localizacion): Profile {
  return {
    ...profile,
    equipment: conCuerpo(loc.equipment),
    maxWeights: loc.maxWeights ?? {}
  }
}

/**
 * El peso corporal nunca se puede quitar de un sitio: uno siempre se lleva el
 * cuerpo. Sin esta garantía, una localización mal configurada dejaría a la app
 * sin un solo ejercicio que proponer.
 */
export function conCuerpo(equipment: Equipment[]): Equipment[] {
  return equipment.includes('peso_corporal') ? equipment : ['peso_corporal', ...equipment]
}

/** «Mancuernas, banco y bandas» — para enseñar de un vistazo con qué cuenta. */
export function describirLocalizacion(loc: Localizacion): string {
  const sinCuerpo = loc.equipment.filter((e) => e !== 'peso_corporal')
  if (sinCuerpo.length === 0) return 'Sin material: solo tu cuerpo'
  const nombres = sinCuerpo.map((e) => EQUIPMENT_LABELS[e].toLowerCase())
  if (nombres.length === 1) return capitalizar(nombres[0])
  return capitalizar(`${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`)
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Nombre libre: dos sitios con el mismo nombre no se distinguen en una lista. */
export function nombreLibreDeSitio(existentes: Localizacion[], propuesto: string): string {
  const limpio = propuesto.trim() || 'Sitio nuevo'
  const usados = new Set(existentes.map((l) => l.nombre.toLowerCase()))
  if (!usados.has(limpio.toLowerCase())) return limpio
  for (let n = 2; ; n++) {
    const intento = `${limpio} ${n}`
    if (!usados.has(intento.toLowerCase())) return intento
  }
}

/** Añade o reemplaza un sitio, devolviendo la lista nueva. */
export function guardarLocalizacion(
  actuales: Localizacion[],
  loc: Localizacion
): Localizacion[] {
  const i = actuales.findIndex((l) => l.id === loc.id)
  if (i === -1) return [...actuales, loc]
  return actuales.map((l, j) => (j === i ? loc : l))
}
