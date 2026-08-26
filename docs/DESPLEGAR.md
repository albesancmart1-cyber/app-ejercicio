# Tener Ritmo en tu ordenador y publicarlo en Netlify

Esto describe la forma de trabajar que Ritmo usa ahora: **el código en tu
ordenador**, Netlify sirviendo la app, y Firebase guardando la copia que
sincroniza los dispositivos.

Antes de nada, lo que no cambia: **tus datos no están aquí**. Viven en el
`localStorage` de tu móvil, y la app funciona entera sin cuenta y sin red. Todo
lo de abajo es cómo llega el *programa* a tu móvil, no dónde están tus cosas.

## 1. Bajarte el código

Hace falta [Node](https://nodejs.org) 22 o superior y
[Git](https://git-scm.com). En una terminal:

```bash
git clone https://github.com/albesancmart1-cyber/app-ejercicio.git
cd app-ejercicio
npm install
```

Y para verlo funcionando mientras tocas cosas:

```bash
npm run dev       # abre http://localhost:5173
npm test          # antes de publicar nada
npm run build     # deja la app lista en dist/
```

`npm run dev` recarga solo al guardar un fichero. `npm test` tarda unos segundos
y es lo que impide publicar algo roto.

## 2. Publicarlo en Netlify

Hay dos maneras, y la primera es la que conviene.

### Conectando el repositorio (recomendada)

Netlify construye la app él mismo cada vez que subes un cambio. Se configura
una vez:

1. En [app.netlify.com](https://app.netlify.com): **Add new site** → **Import an
   existing project** → GitHub → elegir `app-ejercicio`.
2. La rama: la que uses (`claude/smart-workout-app-lrleo9`).
3. El resto **no hay que rellenarlo**: el comando, la carpeta que se publica y
   la versión de Node ya están en [`netlify.toml`](../netlify.toml), y Netlify
   lo lee de ahí.
4. **Site configuration → Environment variables**: `VITE_FIREBASE_API_KEY` y
   `VITE_FIREBASE_PROJECT_ID` (ver [`firebase/README.md`](../firebase/README.md)).
   Sin ellas la app se construye igual, pero sin cuenta ni sincronización.

A partir de ahí, `git push` publica. La dirección es la que te dé Netlify
(`algo.netlify.app`), y se puede cambiar en **Site configuration → Change site
name**.

> Si cambias el nombre del sitio, acuérdate de añadir el nuevo dominio en
> Firebase → Authentication → Settings → Authorized domains. Es el paso que se
> olvida siempre, y el síntoma es que el correo del enlace deja de llegar.

### Arrastrando la carpeta

Para una prueba rápida, o si un día no quieres pasar por Git:

```bash
npm run build
```

y arrastrar la carpeta `dist/` a [app.netlify.com/drop](https://app.netlify.com/drop).

Funciona, pero hay que saber lo que se pierde: las variables de entorno no
existen en ese momento —hay que ponerlas antes en el propio `npm run build`— y
cada arrastre es un despliegue suelto sin historia. Para el día a día, la
primera vía.

## 3. Instalarlo en el móvil

Abrir la dirección de Netlify en el móvil y añadirla a la pantalla de inicio:
en Android, menú de Chrome → «Instalar aplicación»; en iPhone, Safari →
compartir → «Añadir a pantalla de inicio». Queda con su icono, a pantalla
completa y funcionando sin conexión.

En iOS, la app instalada tiene su **propio almacén**, separado del de Safari: si
entraste con tu cuenta en Safari, dentro de la app hay que volver a entrar. Con
el mismo correo y la misma contraseña, y ya está — que es justamente por lo que
el acceso dejó de ser por enlace al correo.

## Y GitHub Pages, ¿qué?

Sigue ahí: `.github/workflows/deploy.yml` publica en
`https://albesancmart1-cyber.github.io/app-ejercicio/` en cada subida, y también
pasa los tests antes. Se puede tener a la vez que Netlify —la app funciona en
los dos sitios, porque `BASE_PATH` decide la ruta al construir— o se puede
desactivar el flujo cuando Netlify esté rodado.

Lo único que hay que tener en cuenta teniendo los dos: son **dos dominios
distintos**, así que los dos tienen que estar en la lista de dominios
autorizados de Firebase, y una sesión iniciada en uno no vale en el otro. Los
datos sí son los mismos: entrar con el mismo correo los junta.
