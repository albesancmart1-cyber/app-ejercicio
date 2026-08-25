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

## Como app nativa, con Capacitor

Hay un proyecto de Xcode en `ios/`. Dentro va **exactamente la misma app**: el
mismo `dist/`, el mismo `localStorage`, la misma nube. No hay una segunda
versión que mantener.

```bash
npm run build:ios    # construye la web con rutas relativas y la copia a ios/
npx cap open ios     # abre Xcode (solo en Mac)
```

`build:ios` hace dos cosas distintas del build de siempre, y las dos importan:
deja las rutas **relativas** —en GitHub Pages la app vive bajo `/app-ejercicio/`
y aquí se sirve desde la raíz de `capacitor://localhost`— y **quita el service
worker**, que dentro del contenedor no añade nada y sí puede servir una versión
vieja después de actualizar. `node scripts/check-ios.mjs` comprueba que el
paquete arranca entero desde una raíz cualquiera.

El icono y la pantalla de arranque salen del mismo SVG que los de Safari, con
`node scripts/generar-iconos.mjs`. Capacitor los trae en blanco, y dejarlos así
significaría que la app instalada desde Xcode arranca peor que la instalada
desde el navegador.

### Lo que Capacitor NO cambia

**No alarga la firma.** Los 7 días de la cuenta gratuita los impone Apple al
firmar, no el framework: una app hecha con Capacitor, con SwiftUI o con lo que
sea, instalada desde Xcode con un Apple ID gratuito, deja de abrirse a los 7
días exactamente igual.

La confusión viene de **Live Updates**: Capacitor sí puede cambiar el HTML y el
JavaScript por el aire sin volver a firmar, todo el tiempo que quieras. Pero eso
actualiza el *contenido*; el contenedor sigue caducando. Actualizarías una app
que ya no arranca.

| Vía | Duración | Coste |
|---|---|---|
| Safari → Añadir a pantalla de inicio | Para siempre | 0 € |
| Xcode + Apple ID gratuito | **7 días** | 0 € |
| SideStore / AltStore (refirma sola) | Mientras aguante | 0 €, no oficial |
| Apple Developer Program | 1 año por instalación | 99 €/año |
| TestFlight | 90 días por compilación, por el aire | 99 €/año |

Para el iPhone solo, **la web instalada desde Safari sigue siendo la mejor
opción**: no caduca, no cuesta nada y no necesita Mac. El contenedor nativo
merece la pena por dos cosas que la web no puede dar: acceso a HealthKit y la
posibilidad de que exista una app de reloj.

## En el Apple Watch

**No se puede instalar Ritmo tal cual.** watchOS no tiene navegador ni instala
webs, así que no hay ninguna vía por la que esta app llegue al reloj. Una app de
watchOS es obligatoriamente nativa y se compila con Xcode en un Mac.

El proyecto de Xcode de `ios/` es el sitio donde vivirá cuando se escriba: una
app de watchOS es una diana más dentro del mismo proyecto.

Lo que sí está montado ya es **la vía de entrada**: la subcolección
`usuarios/{uid}/medidas` de `firebase/firestore.rules` y `src/domain/buzon.ts`.
Cualquier cosa que sepa hacer una petición HTTP puede dejar ahí una medida, y el
móvil la recoge y la mete donde va la próxima vez que sincroniza.

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

**Atajos** es la única vía sin Mac. Se crea un atajo que hace una petición al
buzón —`usuarios/{uid}/medidas` en Firestore— y se pone en la esfera del reloj.
No es bonito, pero se instala hoy y no cuesta nada.

**Una app de watchOS** necesita Xcode y una cuenta de Apple. Con cuenta
gratuita el perfil caduca a los **7 días** y hay que reinstalar desde el Mac —es
una regla de Apple, no un ajuste—; con el Apple Developer Program (99 €/año)
cada instalación dura un año y además hay TestFlight, que instala por el aire.
