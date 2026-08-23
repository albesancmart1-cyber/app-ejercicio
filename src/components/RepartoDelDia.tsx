/**
 * En qué se te ha ido el día, debajo de los botones.
 *
 * La rejilla dice cuánto llevas de cada cosa, pero suelto: once cifras que hay
 * que ir sumando con la cabeza. Aquí van juntas y a la misma escala.
 *
 * Lo que hace distinta a esta lista de once barras sueltas es **el
 * anidamiento**. «Fuera» va como barra principal y las otras cuatro colgando de
 * ella, indentadas: así se ve que los veinte minutos de atardecer están
 * *dentro* de los cuarenta de calle y no al lado. Ponerlas al mismo nivel daría
 * a entender que se suman, y no se suman.
 *
 * Y por eso el total de calle **no es la suma de lo que cuelga**: si sales al
 * jardín y te descalzas, esa media hora es media hora, aunque aparezca en dos
 * ramas. Está dicho en la propia tarjeta, porque un número que no cuadra al
 * sumarlo a mano tiene que explicarse.
 */
import { escribirDuracion } from '../domain/arcoSolar'
import { repartoDelDia, type Rama } from '../domain/reparto'
import { minutosDeAhora } from '../domain/arcoSolar'
import { useAppData } from '../store/store'

export default function RepartoDelDia({ hoy }: { hoy: string }) {
  const data = useAppData()
  const r = repartoDelDia({
    fecha: hoy,
    ahoraMin: minutosDeAhora(),
    salidas: data.salidas,
    sesionesPBM: data.sesionesPBM,
    habitos: data.habitos,
    noches: data.noches,
    fichajes: data.fichajes,
    sessions: data.sessions
  })

  if (r.ramas.length === 0) {
    return (
      <div className="card">
        <p className="eyebrow">En qué se te va el día</p>
        <p className="lede">
          Todavía no hay nada apuntado hoy. En cuanto pares lo primero, aquí se ve cuánto duró y
          dentro de qué cae.
        </p>
      </div>
    )
  }

  const solapan = (rama: Rama) =>
    (rama.dentro ?? []).reduce((a, x) => a + x.minutos, 0) > rama.minutos

  return (
    <div className="card">
      <div className="row">
        <p className="eyebrow" style={{ margin: 0 }}>
          En qué se te va el día
        </p>
        <span className="faint">{escribirDuracion(r.minutosApuntados)} apuntadas</span>
      </div>

      <div className="reparto">
        {r.ramas.map((rama) => (
          <div key={rama.id}>
            <Barra rama={rama} tope={r.tope} />
            {(rama.dentro ?? []).length > 0 && (
              <div className="reparto-dentro">
                {/*
                  Las hijas se miden contra **su madre**, no contra el tope del
                  día. Contra el tope quedaban en un hilo invisible y no se
                  podían comparar entre ellas; contra la madre se lee de un
                  vistazo qué parte del rato de calle fue cada cosa — y una hija
                  nunca puede pasar del ancho de su madre, que es justo lo que
                  significa estar dentro.
                */}
                {rama.dentro!.map((hija) => (
                  <Barra key={hija.id} rama={hija} tope={rama.minutos} hija />
                ))}
              </div>
            )}
            {solapan(rama) && (
              <p className="faint reparto-nota">
                Lo de dentro suma más que el total porque algunas ocurrieron a la vez. Estar al sol
                y descalzo es un solo rato de calle, y así se cuenta.
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="faint" style={{ marginTop: 14 }}>
        Lo indentado ocurre <strong>dentro</strong> de lo de arriba, no al lado. Y las horas
        apuntadas no son la suma de las barras: estar fichado y salir al patio son los mismos
        minutos del día, no dos veces los mismos.
      </p>
    </div>
  )
}

/**
 * Una barra. Sin color, como las baldosas: lo que la distingue es su sitio en
 * la lista y su longitud, no el tono.
 */
function Barra({ rama, tope, hija = false }: { rama: Rama; tope: number; hija?: boolean }) {
  // Un mínimo visible: una barra de un minuto que no se ve parece un cero.
  const ancho = Math.max(2, Math.round((rama.minutos / tope) * 100))

  return (
    <div className={`reparto-fila ${hija ? 'reparto-hija' : ''}`}>
      <div className="reparto-cabecera">
        <span className="reparto-nombre">{rama.nombre}</span>
        <span className="reparto-min">{escribirDuracion(rama.minutos)}</span>
      </div>
      <div
        className="reparto-carril"
        role="img"
        aria-label={`${rama.nombre}: ${escribirDuracion(rama.minutos)}`}
      >
        <div className="reparto-relleno" style={{ width: `${ancho}%` }} />
      </div>
    </div>
  )
}
