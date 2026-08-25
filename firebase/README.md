# Poner la nube (opcional)

Ritmo funciona entero sin esto: guarda en el dispositivo y no sale nada a
ningún sitio. La nube solo sirve para una cosa, entrar con tu correo en otro
móvil o en el ordenador y tener ahí tus datos y tu progreso.

Si no se configura, la app no enseña ni pantallas de sesión ni botones de
sincronizar: en Ajustes pone que todo se guarda en este dispositivo, y ya.

> **La base de datos de la app sigue siendo tu móvil.** Firestore es el sitio
> de paso donde dos dispositivos se ponen de acuerdo: se baja lo de allí, se
> fusiona con lo de aquí y se vuelve a subir el resultado. Mientras el móvil
> conserve su almacén, aquí no hay nada que perder.

## Los cinco pasos

1. **Crear el proyecto.** En [console.firebase.google.com](https://console.firebase.google.com),
   plan Spark (gratuito). Google Analytics se puede desactivar: no hace falta
   para nada de esto.

2. **Activar el acceso por enlace al correo.** Panel → **Authentication** →
   **Comenzar** → **Sign-in method** → **Email/Password** → activar el
   interruptor de arriba y **también** el de abajo, **Email link (passwordless
   sign-in)** → *Guardar*.

   El de abajo viene apagado y es el que importa. Sin él, la app dice
   «tu proyecto tiene apagado el acceso por enlace al correo».

3. **Crear la base de datos y publicar las reglas.** Panel → **Firestore
   Database** → **Crear base de datos** → *modo producción* → la región más
   cercana (`eur3` para Europa). Luego, pestaña **Reglas**: borrar lo que haya,
   pegar el contenido de [`firestore.rules`](./firestore.rules) y **Publicar**.

   Sin las reglas, la app dice «tus reglas de Firestore no me dejan tocar esos
   datos». El modo producción cierra todo hasta que se publiquen.

4. **Autorizar el dominio desde el que se entra.** Panel → **Authentication** →
   **Settings** → **Authorized domains** → *Add domain*: el dominio de Netlify
   (`ritmo.netlify.app`, o el que sea).

   `localhost` ya viene en la lista, así que en el ordenador funciona de
   entrada. Sin este paso Firebase **ni siquiera manda el correo**: contesta
   que el dominio no está autorizado.

5. **Copiar las dos claves y ponerlas en Netlify.** Panel → engranaje →
   **Configuración del proyecto** → *Tus apps* → app web (crear una si no hay,
   sin hosting). De la configuración que enseña hacen falta dos valores:

   | En Firebase | En Netlify |
   | --- | --- |
   | `apiKey` | `VITE_FIREBASE_API_KEY` |
   | `projectId` | `VITE_FIREBASE_PROJECT_ID` |

   En Netlify: **Site configuration** → *Environment variables* → *Add a
   variable* → las dos, para todos los contextos de despliegue.

   **No son secretos, y no pasa nada porque se vean.** Las dos van dentro del
   paquete que se descarga el navegador: cualquiera que abra la app las tiene.
   La `apiKey` de Firebase identifica al proyecto, no autoriza; lo que protege
   los datos son las reglas del paso 3, que atan cada documento a la sesión de
   su dueño. Sin haber entrado por correo no se lee ni un campo.

Al terminar, volver a desplegar (*Deploys* → *Trigger deploy* → *Deploy site*)
para que se publique una versión ya con las claves dentro.

## Qué se guarda y dónde

```
usuarios/{uid}
  datos           (texto)  el JSON entero de la app
  actualizado_en  (fecha)

usuarios/{uid}/medidas/{id}
  tipo, date, desde, hasta, piel, cielo, filtro,
  lampara_id, zona, distancia_cm, origen, creado_en
```

El JSON entero va en **un solo campo de texto** y no repartido en campos de
Firestore, a propósito: `AppData` es un árbol con listas de objetos dentro de
objetos, y traducirlo al formato con tipos de Firestore en los dos sentidos
sería un serializador entero que mantener, con una forma de fallar por cada
tipo. Guardado como texto, lo que sube es exactamente lo que baja.

El límite de un documento de Firestore es **1 MB**. Es muchísimo para lo que
esto guarda —años de entrenos y de ratos de sol caben de sobra—, pero no es
infinito, y la app lo dice claro si algún día llega: entonces habrá que partir
el documento por años.

`usuarios/{uid}/medidas` es el buzón para lo que se mide desde otro sitio que
no es el móvil: el reloj, un atajo. El móvil las recoge al sincronizar, las
mete donde van (`src/domain/buzon.ts`) y las borra. El id lo pone quien
escribe, no la base de datos: ese mismo id acaba siendo el del rato de sol que
se guarda en el móvil, y es lo que hace que recoger dos veces no duplique nada.

## La app instalada en el móvil

En iOS, una app añadida a la pantalla de inicio **tiene su propio almacén**,
separado del de Safari: no comparten ni sesión ni datos. Y el enlace del correo
siempre se abre en Safari, porque iOS no sabe abrir un enlace dentro de una app
instalada. Resultado: entras por el enlace, la sesión se queda en Safari, y la
app de la pantalla de inicio te sigue viendo como un dispositivo nuevo.

No es un fallo ni tiene arreglo por la vía de pulsar el enlace. La app resuelve
esto dejando **pegar el enlace en vez de pulsarlo**: el enlace lleva el testigo
dentro y la app lo canjea ella misma, sin salir. Desde la app instalada:

1. Ajustes → Tu cuenta → escribe el correo → **Mandarme el acceso**.
2. Abre el correo y **mantén pulsado** el enlace → *Copiar enlace*.
   **No lo pulses**: sirve una sola vez y abrirlo lo gasta.
3. Vuelve a la app, pégalo en el campo y **Entrar**.

Firebase pide el correo además del enlace —para que un enlace interceptado no
baste por sí solo—, y por eso el campo del correo tiene que estar relleno al
pegarlo. Si lo pediste desde esa misma app, ya lo sabe y lo rellena solo.

Con Firebase **no hay código de seis cifras**: no existe esa vía en su API de
acceso por correo. La única forma de entrar es el enlace, pulsándolo o
pegándolo.

## Si la app no entra

- **«Tu proyecto de Firebase tiene apagado el acceso por enlace al correo»** —
  paso 2, el segundo interruptor, el de *Email link (passwordless sign-in)*.
- **«Firebase no reconoce el sitio desde el que estás entrando»** — paso 4:
  falta el dominio en *Authorized domains*. Fíjate en cuál dice, que si has
  entrado por la URL de un despliegue de prueba de Netlify
  (`nombre--sitio.netlify.app`) no es la misma que la del sitio.
- **«Tus reglas de Firestore no me dejan tocar esos datos»** — paso 3, la
  pestaña *Reglas*, y darle a **Publicar** (guardar no basta).
- **«Tu proyecto de Firebase no tiene creada la base de datos»** — paso 3, la
  primera mitad. Es distinto de que las reglas estén mal.
- **«Ese enlace ya no vale»** — cada enlace sirve **una sola vez** y caduca al
  rato. Hay que abrir el último que llegó, y desde el mismo dispositivo donde
  se pidió. Si lo pulsaste antes de copiarlo, ya se gastó.
- **«En este dispositivo no consta a qué correo se mandó»** — pediste el enlace
  en un sitio y lo abriste en otro. Escribe el correo en el campo de arriba y
  pega el enlace en el de abajo; con las dos cosas entra igual.
- **«Firebase ha cortado por exceso de intentos»** — el envío de correos del
  plan gratuito tiene cupo. No se arregla reintentando: el último enlace que
  llegó, si no se ha usado, sigue sirviendo.
- **En Ajustes no aparece la tarjeta de cuenta** — la versión publicada se
  construyó sin las variables. Repasar el paso 5 y volver a desplegar.
- **En el móvil entro por el enlace, pero la app de la pantalla de inicio sale
  vacía** — no es un fallo: en iOS son dos sitios distintos con almacenes
  separados. Ver «La app instalada en el móvil», más arriba.

## El correo que manda Firebase

Se puede cambiar el texto en Panel → **Authentication** → **Templates** →
*Email address sign-in*, y ahí también se pone el nombre del remitente. Lo que
**no** se puede es meter en él un código de cifras: la plantilla solo sabe
poner el enlace.
