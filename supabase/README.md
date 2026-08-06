# Poner la nube (opcional)

Ritmo funciona entero sin esto: guarda en el dispositivo y no sale nada a
ningún sitio. La nube solo sirve para una cosa, entrar con tu correo en otro
móvil o en el ordenador y tener ahí tus datos y tu progreso.

Si no se configura, la app no enseña ni pantallas de sesión ni botones de
sincronizar: en Ajustes pone que todo se guarda en este dispositivo, y ya.

## Los cinco pasos

1. **Crear el proyecto.** En [supabase.com](https://supabase.com), plan
   gratuito. La región más cercana.

2. **Crear la tabla.** Panel → **SQL Editor** → **New query** → pegar el
   contenido de [`esquema.sql`](./esquema.sql) → **Run**.
   Al final debe devolver una fila así:

   | tabla | aislamiento_activado | politicas |
   | --- | --- | --- |
   | ritmo_datos | true | 1 |

3. **Decirle a dónde vuelve el enlace del correo.** Panel →
   **Authentication** → **URL Configuration**:
   - *Site URL*: `https://albesancmart1-cyber.github.io/app-ejercicio/`
   - *Redirect URLs*: añadir esa misma dirección.

   Sin esto el enlace del correo se abre y no entra: Supabase se niega a
   mandar los tokens a una dirección que no reconoce.

3b. **Meter el código en los correos.** Panel → **Authentication** →
   **Emails** (o *Email Templates*). Hay que editar **dos** plantillas, *Magic
   Link* y *Confirm signup*, y añadir en cada una una línea con el código:

   ```html
   <p>O escribe este código en la app: <strong>{{ .Token }}</strong></p>
   ```

   **Esto no es opcional si vas a usar la app instalada en el móvil.** En iOS,
   una app añadida a la pantalla de inicio tiene su propio almacén, separado
   del de Safari: no comparten ni sesión ni datos. Y el enlace del correo
   siempre se abre en Safari, porque iOS no sabe abrir un enlace dentro de una
   app instalada. Resultado: entras en Safari, la sesión se queda allí, y la
   app de la pantalla de inicio te sigue viendo como un dispositivo nuevo. El
   código es la única vía que funciona ahí, porque se teclea dentro de la app.

   Supabase genera el código siempre; lo que pasa es que las plantillas de
   serie solo enseñan el enlace.

4. **Copiar las dos claves.** Panel → **Project Settings** → **API**:
   *Project URL* y la clave **anon public**.

5. **Ponerlas en el repositorio.** GitHub → **Settings** → *Secrets and
   variables* → **Actions** → pestaña **Variables** → *New repository
   variable*:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   **Variables, no Secrets.** Estas dos van dentro del paquete que se descarga
   el navegador, así que no son un secreto y GitHub no las puede ocultar
   aunque se pongan como tales. Lo que protege los datos es el aislamiento por
   filas del paso 2: con la clave sola, sin haber entrado por correo, no se
   lee ni una fila.

Al terminar, hacer un cambio cualquiera (o volver a lanzar el flujo de
*Actions*) para que se publique una versión ya con las claves dentro.

## Si el paso 2 da error

El script está partido en cuatro bloques numerados. Ejecutarlos de uno en uno
dice cuál falla, y con eso el error se identifica solo. Los sospechosos
habituales:

- **`syntax error at or near "…"`** — casi siempre son las comillas. Al copiar
  desde una página con formato, las `'` y `"` normales se convierten en `‘ ’ “ ”`
  y Postgres no las reconoce. Copiar desde la vista **Raw** del fichero en
  GitHub, o desde el fichero del repositorio.

- **`permission denied for schema auth` / `must be owner of relation users`** —
  el proyecto no deja tocar el esquema `auth` desde el editor. Ya no debería
  pasar: la versión actual del script no toca `auth` para nada, solo llama a
  `auth.uid()`, que se puede llamar siempre.

- **`relation "ritmo_datos" already exists`** — no es un error que importe: la
  tabla ya estaba. El `create table if not exists` no debería llegar a decirlo;
  si lo dice, es que se ejecutó una versión antigua. Se puede seguir con los
  bloques 2, 3 y 4.

- **`policy … already exists`** — igual: el `drop policy if exists` de delante
  lo evita. Si aparece, ejecutar ese `drop` suelto y volver a lanzar el bloque 3.

Si falla otra cosa, el mensaje del editor de Supabase trae el código (`42501`,
`42P01`…) y la sentencia: con eso se sabe exactamente qué bloque es.

## Si el paso 2 salió bien pero la app no entra

- «No he podido enviar el enlace (…)»: revisar el paso 3, y que el correo no
  esté en la carpeta de no deseados.
- **«Supabase solo manda unos pocos correos por hora»**: es un 429. El correo
  que trae Supabase de serie es para probar, no para usar: van **unos pocos
  envíos por hora** y se comparten entre todos los proyectos. No es un fallo
  ni se arregla reintentando. Dos salidas: buscar el último enlace que llegó
  —cada uno vale una vez, pero si no se ha usado sigue sirviendo— o, si
  molesta a menudo, poner un SMTP propio en **Authentication → Emails → SMTP
  Settings**, que quita el límite. Para una app de una persona no suele hacer
  falta: se entra una vez por dispositivo y la sesión se queda.
- **El enlace del correo lleva a un 404 de GitHub** («There isn't a GitHub
  Pages site here»): mira la barra de direcciones. Si acabó en la raíz del
  dominio, sin `/app-ejercicio/`, es que Supabase no aceptó la dirección de
  vuelta y usó el *Site URL* del proyecto. Se arregla en el paso 3: la
  dirección completa, con `/app-ejercicio/` y la barra final, tiene que estar
  en **Redirect URLs**.
- **«Ese enlace ya no vale»**: es lo que dice la app cuando Supabase devuelve
  `otp_expired`. Cada enlace sirve **una sola vez** y caduca al rato, así que
  hay que abrir el último que llegó, y desde el mismo dispositivo donde se
  pidió.
- **En el móvil entro por el enlace, pero la app de la pantalla de inicio sale
  vacía.** No es un fallo: en iOS son dos sitios distintos con almacenes
  separados. Abre la app instalada, pide el correo desde dentro y entra con el
  **código**. Requiere el paso 3b.
- **El correo llega sin código**: falta el paso 3b, o se editó solo una de las
  dos plantillas. La de *Magic Link* es la de una cuenta que ya existe; la de
  *Confirm signup*, la de la primera vez.
- «Falta la tabla `ritmo_datos`…»: el paso 2 no llegó a ejecutarse en *este*
  proyecto. Comprobar que el *Project URL* del paso 4 es el del mismo proyecto
  donde se ejecutó el script.
- En Ajustes no aparece la tarjeta de cuenta: la versión publicada se compiló
  sin las variables. Repasar el paso 5 y volver a publicar.
