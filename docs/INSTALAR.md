# Instalar Ritmo

## En el iPhone

No hay App Store de por medio, y no hace falta.

1. Abre la app en **Safari** (no vale Chrome: en iOS solo Safari puede instalar).
2. Botón de compartir → **Añadir a pantalla de inicio**.
3. Se llamará **Ritmo** y tendrá su icono.

A partir de ahí es una app: se abre a pantalla completa sin barras de Safari,
arranca con su propia pantalla de carga en negro —sin el destello blanco que
delata a una web— y **funciona entera sin conexión**, porque todo se calcula en
el aparato. La nube solo sirve para que los datos lleguen a otro dispositivo.

### Lo que iOS no le deja hacer, y conviene saber

- **Nada de notificaciones ni de trabajo en segundo plano.** Si empiezas «Sol»
  y bloqueas el móvil, el cronómetro sigue —la hora de inicio está guardada—,
  pero la app no te va a avisar de nada. Por eso la pantalla avisa de lo que
  lleva más de cuatro horas abierto y lo cierra sola con media hora al cambiar
  de día, marcándolo como estimado.
- **iOS puede borrar los datos** de una web instalada si pasan **siete semanas
  sin abrirla**. Es la razón de peso para entrar con tu correo y dejar la nube
  configurada: con eso, lo que se pierda vuelve solo.
- Se actualiza sola. En «Yo» sale la fecha de la versión que tiene puesta, por
  si quieres comprobar que ya cogió la última.

## En el Apple Watch

**No se puede instalar Ritmo tal cual.** watchOS no tiene navegador ni instala
webs, así que no hay ninguna vía por la que esta app llegue al reloj. Una app de
watchOS es obligatoriamente nativa y se compila con Xcode en un Mac.

Lo que sí está montado ya es **la vía de entrada**: la tabla `ritmo_medidas` de
`supabase/esquema.sql` y `src/domain/buzon.ts`. Cualquier cosa que sepa hacer
una petición HTTP puede dejar ahí una medida, y el móvil la recoge y la mete
donde va la próxima vez que sincroniza.

### Qué manda quien mida

Una fila con esto, y nada más:

```json
{
  "id": "algo-único",
  "tipo": "sol",
  "date": "2026-06-21",
  "desde": 614,
  "hasta": 641
}
```

`desde` y `hasta` son minutos desde medianoche. `tipo` es uno de `sol`,
`amanecer`, `atardecer`, `fuera`, `lampara`, `oscuridad`, `frio`, `grounding`.
Se puede añadir `piel`, `cielo`, `filtro`, `lampara_id`, `zona` y
`distancia_cm`; lo que falte se resuelve con lo mismo que usa la app cuando el
usuario no lo dice.

Se manda con `hasta` en nulo al empezar y se actualiza al parar, o se manda una
sola vez ya cerrada. El móvil no la recoge hasta que tenga `hasta`.

**El `id` lo pone quien mide, y es importante que sea el mismo si se reintenta.**
Ese id acaba siendo el del rato de sol que se guarda, así que mandar dos veces
la misma medida no duplica nada.

### Las dos vías reales para el reloj

| | Sin Mac | Con Mac |
|---|---|---|
| **Atajos (Shortcuts)** | Sí | Sí |
| **App de watchOS** | No | Sí |

**Atajos** es la única vía sin Mac. Se crea un atajo que hace una petición POST
a `ritmo_medidas` y se pone en la esfera del reloj. No es bonito, pero se
instala hoy y no cuesta nada.

**Una app de watchOS** necesita Xcode y una cuenta de Apple. Con cuenta
gratuita el perfil caduca a los **7 días** y hay que reinstalar desde el Mac —es
una regla de Apple, no un ajuste—; con el Apple Developer Program (99 €/año)
cada instalación dura un año y además hay TestFlight, que instala por el aire.
