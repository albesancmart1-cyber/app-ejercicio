/**
 * La capa de Ritmo sobre Appica UI.
 *
 * Appica trae los componentes; esto les pone la ropa de la app. Existe por una
 * razón muy práctica: los controles genéricos aparecen en **ciento cuarenta y
 * nueve sitios** repartidos por dieciocho ficheros. Repetir en cada uno
 * `variant="primary" size="lg" className="mb-2 w-full"` es garantizar que
 * dentro de un mes haya nueve variaciones distintas del mismo botón; con esto,
 * el día que haya que subir el radio o cambiar el alto se toca un fichero.
 *
 * Los nombres van en castellano como el resto del dominio, y además evita
 * confundir de un vistazo lo que es de la librería —`Button`— y lo que es
 * nuestro —`Boton`—.
 */
import { NumberField } from '@base-ui/react/number-field'
import { Switch } from '@base-ui/react/switch'
import { Badge } from '@appica/ui-react/badge'
import { Button } from '@appica/ui-react/button'
import { Separator } from '@appica/ui-react/separator'
import { Toggle } from '@appica/ui-react/toggle'
import { ToggleGroup } from '@appica/ui-react/toggle-group'
import type { ComponentProps, ReactNode } from 'react'

/**
 * El botón de la app: ancho completo y alto de pulgar.
 *
 * En móvil las acciones van apiladas y a todo lo ancho, no en fila, así que el
 * ancho completo es la norma y no la excepción. `suelto` lo devuelve a su ancho
 * natural para los pocos casos que van en fila.
 */
export function Boton({
  tono = 'primario',
  suelto = false,
  className = '',
  ...props
}: Omit<ComponentProps<typeof Button>, 'variant' | 'size'> & {
  tono?: 'primario' | 'secundario' | 'callado'
  suelto?: boolean
}) {
  const variante = tono === 'primario' ? 'primary' : tono === 'secundario' ? 'secondary' : 'ghost'
  return (
    <Button
      variant={variante}
      size="lg"
      className={`${suelto ? '' : 'mb-2 w-full'} ${className}`.trim()}
      {...props}
    />
  )
}

/**
 * Una opción de un grupo: se queda pulsada o no.
 *
 * Mantiene `aria-pressed` —que es lo que Base UI pone por debajo— porque es
 * como se anuncia el estado a un lector de pantalla y como lo comprueban los
 * recorridos de navegador.
 */
export function Opcion({
  activa,
  onElegir,
  className = '',
  children,
  ...props
}: Omit<ComponentProps<typeof Toggle>, 'pressed' | 'onPressedChange'> & {
  activa: boolean
  onElegir: () => void
  children?: ReactNode
}) {
  return (
    <Toggle
      pressed={activa}
      onPressedChange={onElegir}
      /*
       * El `Toggle` de Appica no trae estilo: es un primitivo pelado que pasa
       * derecho a Base UI con un `data-slot` y nada más. Da el comportamiento y
       * el `aria-pressed`; la forma es cosa nuestra. Se pinta con los tokens de
       * la librería para que siga el acento de la hora, y el estado se lee de
       * `data-pressed`, que es lo que Base UI escribe en el elemento.
       */
      className={`opt inline-flex min-h-9 cursor-pointer items-center rounded-full border
        border-border bg-background-muted px-3.5 text-sm text-foreground transition
        select-none active:scale-[0.97]
        data-pressed:border-primary/40 data-pressed:bg-primary-subtle
        data-pressed:font-medium data-pressed:text-primary ${className}`.replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </Toggle>
  )
}

/**
 * Una acción pequeña con forma de pastilla: «Quitar», «Readmitir», «+30 s».
 *
 * Se parecen a una `Opcion` y por eso compartían clase, pero no son lo mismo:
 * una opción **es un estado** que se queda puesto, y esto **hace algo** y no se
 * queda de ninguna manera. Con `Toggle` habrían salido con `aria-pressed`, y un
 * lector de pantalla habría anunciado «Quitar, no pulsado», que es mentira.
 */
export function Pastilla({ className = '', ...props }: ComponentProps<typeof Button>) {
  return <Button variant="soft" size="sm" className={className} {...props} />
}

/**
 * Una etiqueta de estado. `acento` la pinta con el color de la hora; el resto
 * van en el gris suave, que es lo que hace que el acento signifique algo.
 */
export function Etiqueta({
  acento = false,
  ...props
}: Omit<ComponentProps<typeof Badge>, 'variant'> & { acento?: boolean }) {
  return <Badge variant={acento ? 'primary' : 'soft'} {...props} />
}

/** La regla que separa bloques dentro de una tarjeta. */
export function Regla({ className = '', ...props }: ComponentProps<typeof Separator>) {
  return <Separator className={`my-4 ${className}`.trim()} {...props} />
}

/**
 * Un interruptor de sí o no.
 *
 * Sobre el primitivo de Base UI y **no** sobre el `Switch` de Appica, por peso:
 * el de la librería importa `motion/react` entero para animar el pulgar, y en
 * esta app eso salía a 90 kB de JavaScript —33 comprimidos— por dos ajustes
 * enterrados en un panel. Base UI ya está instalado como dependencia de Appica,
 * da el mismo comportamiento y los mismos roles, y la animación de 150 ms la
 * hace una transición de CSS.
 */
export function Interruptor({
  className = '',
  ...props
}: ComponentProps<typeof Switch.Root>) {
  return (
    <Switch.Root
      className={`relative inline-flex h-6 w-11 flex-none cursor-pointer items-center
        rounded-full border border-border bg-background-muted transition-colors
        data-[checked]:border-primary data-[checked]:bg-primary ${className}`.replace(/\s+/g, ' ')}
      {...props}
    >
      <Switch.Thumb
        className="block size-5 translate-x-0.5 rounded-full bg-foreground-strong
          transition-transform duration-150 data-[checked]:translate-x-[22px]
          data-[checked]:bg-primary-foreground"
      />
    </Switch.Root>
  )
}

/**
 * Una escala de uno a cinco: sueño, energía, cómo ha ido el entreno.
 *
 * Sobre `ToggleGroup`, que da lo que un puñado de botones sueltos no daba: foco
 * itinerante y flechas del teclado. Se recorre con izquierda y derecha como un
 * control único, en vez de tabular cinco veces.
 */
export function Escala({
  valor,
  onElegir,
  'aria-label': etiqueta
}: {
  valor: number | null
  onElegir: (n: 1 | 2 | 3 | 4 | 5) => void
  'aria-label'?: string
}) {
  return (
    <ToggleGroup
      className="scale w-full"
      aria-label={etiqueta}
      value={valor === null ? [] : [String(valor)]}
      onValueChange={(v) => {
        const n = Number(v[v.length - 1])
        if (n >= 1 && n <= 5) onElegir(n as 1 | 2 | 3 | 4 | 5)
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Toggle
          key={n}
          value={String(n)}
          className={`flex-1 cursor-pointer rounded-xl border border-border
            bg-background-muted py-3 text-center text-base tabular-nums
            text-foreground transition select-none active:scale-[0.97]
            data-pressed:border-primary/40 data-pressed:bg-primary-subtle
            data-pressed:font-semibold data-pressed:text-primary`.replace(/\s+/g, ' ')}
        >
          {n}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

/**
 * El contador de peso y repeticiones del entreno.
 *
 * Sobre el primitivo de Base UI y **no** sobre el `NumberField` de Appica, por
 * dos motivos y ninguno es estético:
 *
 *  - **El idioma.** Appica escribe `aria-label="Increase value"` y
 *    `"Decrease value"` a fuego, sin prop para cambiarlos. En una app
 *    íntegramente en castellano, el control que más se toca —cada serie de cada
 *    entreno— le diría «Increase value» a un lector de pantalla.
 *  - **El peso.** Su versión importa `motion/react` para animar el número, y
 *    aquí eso eran 101 kB de JavaScript por dos contadores.
 *
 * Lo que sí se conserva es lo que hacía falta y a mano no había: rol de
 * `spinbutton`, flechas del teclado y repetición al dejar el dedo puesto, que
 * con quince kilos que subir de dos y medio en dos y medio se agradece.
 */
export function Contador({
  valor,
  onCambiar,
  paso = 1,
  etiqueta,
  sugerido = false
}: {
  valor: number
  onCambiar: (n: number) => void
  paso?: number
  etiqueta: string
  /** Cuando el número todavía es la propuesta del plan y no lo anotado. */
  sugerido?: boolean
}) {
  return (
    <NumberField.Root
      className="stepper"
      value={valor}
      step={paso}
      min={0}
      locale="es-ES"
      onValueChange={(n) => onCambiar(n ?? 0)}
      aria-label={etiqueta}
    >
      <NumberField.Group className="flex w-full items-center justify-between gap-1">
        <NumberField.Decrement
          className="flex size-11 flex-none cursor-pointer items-center justify-center
            rounded-[--radius-xs] text-2xl leading-none text-foreground transition
            active:scale-[0.97] active:bg-secondary"
          aria-label={`Bajar: ${etiqueta}`}
        >
          −
        </NumberField.Decrement>
        <NumberField.Input
          className={`min-w-0 flex-1 bg-transparent text-center text-2xl font-semibold
            tabular-nums outline-none ${sugerido ? 'text-foreground-subtle' : 'text-foreground-intense'}`}
        />
        <NumberField.Increment
          className="flex size-11 flex-none cursor-pointer items-center justify-center
            rounded-[--radius-xs] text-2xl leading-none text-foreground transition
            active:scale-[0.97] active:bg-secondary"
          aria-label={`Subir: ${etiqueta}`}
        >
          +
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  )
}
