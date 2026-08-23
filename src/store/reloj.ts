/**
 * Lo que el reloj mide, entrando en la app.
 *
 * El reloj no habla con la nube: manda al móvil por WatchConnectivity y el
 * móvil ya sabe quién es. La razón está en `ios/RitmoWatch/Fuentes/Enlace.swift`
 * —en un reloj no hay dónde pegar un enlace de correo ni teclear un token—,
 * pero la consecuencia para este fichero es simple: las medidas llegan por el
 * puente nativo, no por HTTP.
 *
 * **Entran por el mismo sitio que las de la nube.** Las dos vías acaban en
 * `domain/buzon.ts`, así que una medida del reloj deja exactamente los mismos
 * rastros que si la hubieras hecho con el dedo, y no hay dos caminos que puedan
 * divergir.
 *
 * Fuera del contenedor nativo esto no hace nada y no estorba: la app en el
 * navegador se comporta igual que siempre.
 */
import { aplicar, recoger, type MedidaDeFuera } from '../domain/buzon'
import { estadoDeHabito } from '../domain/habitos'
import type { AppData, TipoEnCurso } from '../domain/types'

/** El puente que Capacitor cuelga de `window`, cuando la app va dentro. */
interface Puente {
  EnlaceReloj?: {
    recoger(): Promise<{ medidas: Record<string, unknown>[] }>
    mandarSitio(x: { lat: number; lon: number }): Promise<{ enviado: boolean }>
    addListener?(evento: string, f: () => void): Promise<{ remove: () => void }>
  }
}

function puente(): Puente['EnlaceReloj'] | undefined {
  const w = globalThis as unknown as { Capacitor?: { Plugins?: Puente } }
  return w.Capacitor?.Plugins?.EnlaceReloj
}

/** Si la app va dentro del contenedor y hay reloj con el que hablar. */
export function hayReloj(): boolean {
  return puente() !== undefined
}

/**
 * Lo que manda el reloj llega con los tipos de JavaScript perdidos por el
 * camino: el puente nativo entrega números como números o como cadenas según
 * el aparato. Se normaliza aquí, una vez, en vez de fiarse.
 */
function comoMedida(x: Record<string, unknown>): MedidaDeFuera {
  const num = (v: unknown): number | null =>
    v === null || v === undefined ? null : Number(v)
  return {
    id: String(x.id ?? ''),
    tipo: String(x.tipo ?? ''),
    date: String(x.date ?? ''),
    desde: Number(x.desde ?? -1),
    hasta: num(x.hasta),
    piel: (x.piel as string) ?? null,
    cielo: (x.cielo as string) ?? null,
    filtro: (x.filtro as string) ?? null,
    lamparaId: (x.lamparaId as string) ?? null,
    zona: (x.zona as string) ?? null,
    distanciaCm: num(x.distanciaCm),
    origen: (x.origen as string) ?? 'reloj'
  }
}

/**
 * Recoge lo que el reloj haya dejado y lo mete en los datos.
 *
 * Devuelve los datos ya con ello dentro, o los mismos que entraron si no había
 * nada. Que falle no puede romper nada: el reloj es un extra, y la app tiene
 * que arrancar igual sin él.
 */
export async function recogerDelReloj(data: AppData): Promise<{ data: AppData; cuantas: number }> {
  const p = puente()
  if (!p) return { data, cuantas: 0 }

  try {
    const { medidas } = await p.recoger()
    if (!medidas || medidas.length === 0) return { data, cuantas: 0 }

    const r = recoger(medidas.map(comoMedida), (t: TipoEnCurso, fecha: string) =>
      t === 'frio' || t === 'grounding'
        ? (estadoDeHabito(t, data.habitos, fecha).actual?.nivel ?? 1)
        : 1
    )
    if (r.escrituras.length === 0) return { data, cuantas: 0 }
    return { data: aplicar(data, r.escrituras), cuantas: r.recogidos.length }
  } catch {
    return { data, cuantas: 0 }
  }
}

/**
 * Le dice al reloj dónde vives.
 *
 * Es lo único que viaja hacia allá, y va cuando cambia y no cada arranque: el
 * sitio no se mueve, y `updateApplicationContext` guarda solo lo último de
 * todas formas. Con eso el reloj calcula la altura del sol sin red — que es
 * justo cuando hace falta saberla.
 */
export async function decirleElSitio(lat: number, lon: number): Promise<boolean> {
  const p = puente()
  if (!p) return false
  try {
    const { enviado } = await p.mandarSitio({ lat, lon })
    return enviado
  } catch {
    return false
  }
}
