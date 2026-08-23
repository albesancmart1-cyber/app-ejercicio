# La app del reloj

## Antes de empezar: lo que no está verificado

Todo lo demás de este proyecto está comprobado con pruebas que se ejecutan. **El
Swift no.** No hay Mac en el entorno donde se escribió, así que no se ha
compilado ni una vez. Puede tener errores de compilación tontos —un `import` que
falta, un nombre mal escrito— y los arreglarás tú en Xcode en dos minutos.

Lo que sí está protegido es lo que de verdad podía salir mal en silencio: el
cálculo del sol. `Sol.swift` es una traducción de `arcoSolar.ts`, y las
traducciones se desvían sin dar error —un `floor` que redondea distinto, un
paréntesis mal puesto—. Eso no revienta: da un amanecer cuatro minutos tarde, y
no se nota hasta que sales a la calle a la hora que no era.

Por eso hay **576 casos de oráculo** en `SolTests.swift`, generados desde la
versión de TypeScript, con cuatro sitios —incluidos Tromsø para el sol de
medianoche y Sídney para el hemisferio sur—, cuatro fechas y cuatro husos.
**Ejecuta esa prueba antes que nada.** Si pasa, la traducción es fiel.

Y avisa de lo obvio: **con cuenta gratuita la app deja de abrirse a los 7 días**
y hay que repetir el paso 6. Es una regla de Apple, no un ajuste.

## Lo que hace falta

- Un Mac con **Xcode 15 o más**.
- El iPhone y el Apple Watch emparejados entre sí.
- Un Apple ID cualquiera. No hace falta pagar nada.

## Los pasos

### 1. Construir la web y abrir Xcode

```bash
npm ci
npm run build:ios
npx cap open ios
```

### 2. Poner tu equipo de firma

En Xcode, selecciona el proyecto **App** → diana **App** → pestaña **Signing &
Capabilities**:

- **Team**: tu Apple ID (si no sale, Xcode → Settings → Accounts → +).
- **Bundle Identifier**: cámbialo a algo tuyo, por ejemplo
  `com.tunombre.ritmo`. El que viene, `com.ritmo.app`, seguramente esté cogido.

### 3. Crear la diana del reloj

**File → New → Target… → watchOS → App**.

- **Product Name**: `RitmoWatch`
- **Interface**: SwiftUI · **Language**: Swift
- Marca **«Watch App for Existing iOS App»** si te lo ofrece, y elige `App`.
- **No** marques Notification Scene ni Complication: no se usan.

Xcode crea `RitmoWatch Watch App` con un `ContentView` de ejemplo. **Bórralo**,
y también su `RitmoWatchApp.swift`: los de aquí lo sustituyen.

### 4. Meter los ficheros

Arrastra a Xcode, marcando la casilla **Copy items if needed**:

| Carpeta de aquí | Diana de Xcode |
|---|---|
| `ios/RitmoWatch/Fuentes/*.swift` | **RitmoWatch Watch App** |
| `ios/RitmoWatch/Pruebas/SolTests.swift` | **RitmoWatch Watch AppTests** |
| `ios/RitmoWatch/Movil/EnlaceReloj.swift` y `.m` | **App** (la del iPhone) |

Si no existe la diana de pruebas: **File → New → Target… → watchOS → Unit
Testing Bundle**.

### 5. Ejecutar el oráculo

**Product → Test** (⌘U) con la diana del reloj seleccionada.

Tiene que pasar `testTraduccionFielAlTypeScript`. Si falla, dice qué caso y qué
cifra esperaba: manda el TypeScript, y lo que hay que corregir es el Swift.

### 6. Instalar

1. Conecta el iPhone por cable y elígelo arriba como destino. **Run** (⌘R).
2. En el iPhone: **Ajustes → General → VPN y gestión de dispositivos** → tu
   Apple ID → **Confiar**.
3. Abre Ritmo en el iPhone una vez: al hacerlo manda tus coordenadas al reloj.
4. En el iPhone, app **Watch** → busca **Ritmo** → **Instalar**.

Y **a los 7 días, repite el paso 6.1**. La app seguirá instalada pero no abrirá.

## Cómo llega al móvil lo que mides

El reloj **no habla con la nube**. Lo intentó ser así y no sale: la sesión de
Ritmo va por enlace al correo, y en un reloj no hay dónde pegar un enlace ni
teclado para un token. Meter la autenticación en la muñeca significaría teclear
algo largo en cuatro centímetros de pantalla, o guardar una credencial eterna,
que es peor.

Así que manda al móvil, que ya sabe quién es:

```
  reloj                     iPhone                      todo lo demás
 ───────                   ────────                    ───────────────
  pulsas                                                
  paras   ──transferUserInfo──▶  EnlaceReloj.swift
                                        │
                                   reloj.ts
                                        │
                                   buzon.ts ──▶ alParar ──▶ salidas, sol,
                                                            hábitos, noches
```

`transferUserInfo` **encola y garantiza la entrega**: se guarda en el sistema,
sobrevive a que el reloj se quede sin batería, y llega en orden la próxima vez
que la app del móvil arranque. No hace falta que el móvil esté abierto ni con
cobertura cuando mides — que es justo la gracia de medir desde el reloj.

Y una vez dentro, pasa por el **mismo** `alParar` que las del móvil. Un rato de
sol medido en el reloj deja su salida y su exposición; estar descalzo deja
hábito y rato fuera. No hay dos caminos que puedan divergir.

## Lo que el reloj no hace, y por qué

- **No pregunta piel ni cielo al tomar el sol.** En la muñeca eso serían tres
  pantallas más para una cosa que se hace con el brazo en alto. Se usa lo que
  tengas puesto de la última vez en el móvil.
- **No elige lámpara, zona ni distancia.** Lo mismo: la sesión de
  fotobiomodulación se apunta desde el móvil, que es donde estás cuando la haces.
- **No enseña el parte del día.** Es para leer con calma, y eso no es un reloj.
- **No tiene complicación en la esfera.** Requiere la cuenta de pago.
