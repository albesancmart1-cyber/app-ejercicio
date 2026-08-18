import {
  TITULO_NIVEL,
  UMBRALES,
  estadoDeEstres,
  explicarEstres,
  explicarRacha,
  rachaAmable,
  type EstadoEstres
} from '../domain/estres'
import type { Session } from '../domain/types'
import { Etiqueta, Regla } from './ui'
import { Badge } from '@appica/ui-react/badge'
import { escribirNumero } from '../domain/numeros'

/**
 * Cómo está el cuerpo: la fatiga que arrastras frente a la base a la que estás
 * acostumbrado.
 *
 * Se enseña el **cociente** y no la fatiga a secas, porque una cifra de carga
 * absoluta no significa nada: veinte puntos son mucho para quien empieza y poco
 * para quien lleva un año. Medirse contra uno mismo es lo único que informa.
 *
 * Y se dice lo que es: un descriptor de si estás subiendo más rápido de lo
 * acostumbrado. Nunca una predicción de lesión —el modelo no da para eso— ni un
 * reproche. Ver `src/domain/estres.ts`.
 */

const W = 320
const H = 110
const PAD = { top: 10, right: 8, bottom: 16, left: 8 }

/** La curva de fatiga sobre la de base, con las barras de cada día debajo. */
function Curvas({ e }: { e: EstadoEstres }) {
  const serie = e.serie
  const maximo = Math.max(1, ...serie.map((p) => Math.max(p.carga, p.fatiga, p.base)))
  const x = (i: number) => PAD.left + (i / Math.max(1, serie.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - v / maximo) * (H - PAD.top - PAD.bottom)

  const linea = (clave: 'fatiga' | 'base') => serie.map((p, i) => `${x(i)},${y(p[clave])}`).join(' ')
  const ancho = Math.max(1.5, (W - PAD.left - PAD.right) / serie.length - 1)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="estres-chart"
      role="img"
      aria-label="Fatiga acumulada frente a tu base, en las últimas ocho semanas"
    >
      {/* Cada día entrenado, como una barra. Es el material del que salen las
          dos curvas, y verlo evita que parezcan sacadas de la nada. */}
      {serie.map((p, i) =>
        p.carga > 0 ? (
          <rect
            key={p.fecha}
            x={x(i) - ancho / 2}
            y={y(p.carga)}
            width={ancho}
            height={Math.max(1, y(0) - y(p.carga))}
            className="estres-bar"
          />
        ) : null
      )}
      <polyline points={linea('base')} className="estres-base" fill="none" />
      <polyline points={linea('fatiga')} className="estres-fatiga" fill="none" />
    </svg>
  )
}

export default function EstresCard({
  sessions,
  todayIso
}: {
  sessions: Session[]
  todayIso: string
}) {
  const e = estadoDeEstres(sessions, todayIso)
  const r = rachaAmable(sessions, todayIso)

  return (
    <div className="card">
      <p className="eyebrow">Cómo está tu cuerpo</p>

      {e.fiable ? (
        <>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <span className="stat">
              {/* El rótulo dice qué es la cifra; el veredicto lo lleva la
                  etiqueta de al lado. Repetirlo en los dos sitios solo ocupa
                  espacio. */}
              <span className="stat-label">Fatiga frente a tu base</span>
              <span className="stat-value">{escribirNumero(Math.round(e.ratio * 100) / 100)}</span>
            </span>
            {/* El nivel se dice con palabra **y** con color, nunca solo con
                color: «pasado» en rojo y «en tu sitio» en verde serían
                indistinguibles para quien no separa esos dos tonos. */}
            <Badge
              variant={
                e.nivel === 'pasado' ? 'error' : e.nivel === 'subiendo' ? 'warning' : 'success'
              }
            >
              {TITULO_NIVEL[e.nivel]}
            </Badge>
          </div>

          {/* La escala, dicha con palabras: un número suelto entre 0 y 2 no se
              interpreta solo. */}
          <p className="faint" style={{ marginTop: 6 }}>
            Por debajo de {escribirNumero(UMBRALES.bajo)} vienes tranquilo; hasta{' '}
            {escribirNumero(UMBRALES.subiendo)} estás en lo tuyo; por encima de{' '}
            {escribirNumero(UMBRALES.pasado)}, cargando más de lo acostumbrado.
          </p>

          <Curvas e={e} />

          <div className="estres-legend">
            <span>
              <span className="estres-key estres-key-fatiga" /> Fatiga de estos días
            </span>
            <span>
              <span className="estres-key estres-key-base" /> Tu base
            </span>
          </div>

          <p className="dim" style={{ marginTop: 12 }}>
            {explicarEstres(e)}
          </p>
        </>
      ) : (
        <p className="dim">{explicarEstres(e)}</p>
      )}

      <Regla />
      <p className="eyebrow">Tu racha</p>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <span className="stat">
          <span className="stat-label">Días seguidos</span>
          <span className="stat-value">{r.dias}</span>
        </span>
        {r.hoyEsDescanso && <Etiqueta>Hoy, descanso ganado</Etiqueta>}
      </div>
      <p className="dim" style={{ marginTop: 8 }}>
        {explicarRacha(r)}
      </p>
      <p className="faint" style={{ marginTop: 8 }}>
        Esta racha no se rompe por descansar: un día de recuperación después de entrenar cuenta
        igual que uno de gimnasio, porque el músculo se construye descansando. Solo se corta si lo
        dejas de verdad.
      </p>
    </div>
  )
}
