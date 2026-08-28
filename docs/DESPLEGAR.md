# Tener Ritmo en tu ordenador y publicarlo en Netlify

Esto describe la forma de trabajar que Ritmo usa ahora: **el código en tu
ordenador**, Netlify sirviendo la app, y Firebase guardando la copia que
sincroniza los dispositivos.

Antes de nada, lo que no cambia: **tus datos no están aquí**. Viven en el
`localStorage` de tu móvil, y la app funciona entera sin cuenta y sin red. Todo
lo de abajo es cómo llega el *programa* a tu móvil, no dónde están tus cosas.

## 1. Bajarte el código

Hace falta [Node](https://nodejs.org) 22 o superior. Si el proyecto ya está en
tu carpeta, solo:

```bash
cd app-ejercicio
npm install
```

Git no es obligatorio, pero conviene tenerlo aunque no subas a ningún sitio: es
lo que te deja ver qué cambió, comparar con ayer y volver atrás cuando algo se
rompe. Con `git log` y `git diff` en local basta.

Y para verlo funcionando mientras tocas cosas:

```bash
npm run dev       # abre http://localhost:5173
npm test          # antes de publicar nada
npm run build     # deja la app lista en dist/
```

`npm run dev` recarga solo al guardar un fichero. `npm test` tarda unos segundos
y es lo que impide publicar algo roto.

## 2. Publicarlo en Netlify

Sin GitHub de por medio, se publica desde tu carpeta con la herramienta de
Netlify. Una vez:

```bash
npm install -g netlify-cli
netlify login
```

Y cada vez que quieras publicar:

```bash
npm test          # que no salga nada roto
npm run build
netlify deploy --prod --dir=dist
```

La primera vez te preguntará si es un sitio nuevo o uno que ya existe; elige y
lo recuerda en `.netlify/`, que no se sube a ninguna parte.

Las dos variables de Firebase se ponen una vez en el panel de Netlify —**Site
configuration → Environment variables**—, o delante del build si prefieres no
tocar el panel:

```bash
VITE_FIREBASE_API_KEY=... VITE_FIREBASE_PROJECT_ID=... npm run build
```

> Si cambias el nombre del sitio, añade el nuevo dominio en Firebase →
> Authentication → Settings → Authorized domains. Es el paso que se olvida
> siempre, y el síntoma es que el correo de contraseña deja de llegar.

**La otra vía, sin instalar nada:** `npm run build` y arrastrar la carpeta
`dist/` a [app.netlify.com/drop](https://app.netlify.com/drop). Funciona, pero
cada arrastre es un despliegue suelto sin historia y las variables tienen que ir
en el `build` de tu terminal.

## 3. Instalarlo en el móvil

Abrir la dirección de Netlify en el móvil y añadirla a la pantalla de inicio:
en Android, menú de Chrome → «Instalar aplicación»; en iPhone, Safari →
compartir → «Añadir a pantalla de inicio». Queda con su icono, a pantalla
completa y funcionando sin conexión.

En iOS, la app instalada tiene su **propio almacén**, separado del de Safari: si
entraste con tu cuenta en Safari, dentro de la app hay que volver a entrar. Con
el mismo correo y la misma contraseña, y ya está — que es justamente por lo que
el acceso dejó de ser por enlace al correo.

## Las copias de seguridad son cosa tuya ahora

Sin repositorio remoto, la única copia del proyecto es la de tu disco. Git sigue
funcionando en local —`git log`, `git diff`, volver atrás— pero el historial vive
en la misma carpeta que el código, así que un disco que falle se lo lleva todo.

Lo mínimo razonable: copiar la carpeta entera (sin `node_modules`) a un disco
externo o a la nube que uses, de vez en cuando. Un `.zip` con fecha en el nombre
vale.

```bash
cd ..
tar --exclude=node_modules --exclude=dist -czf ritmo-$(date +%F).tar.gz app-ejercicio
```

Y por separado, lo que de verdad no se puede reconstruir: tus datos. Desde la
app, **Yo → Cuenta → Exportar copia**. El código se puede volver a escribir; los
entrenos de dos años, no.
