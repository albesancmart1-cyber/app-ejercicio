# Trabajar en tu ordenador, no en la nube

Hasta ahora yo he estado editando esta app en un **contenedor remoto**: una
máquina temporal en la nube que clona el repositorio, hace el trabajo y sube los
cambios a GitHub. Por eso no puedo leer nada de tu escritorio, y por eso cada
cosa que quieras darme tiene que caber en el chat.

Para lo que quieres —dejarme un libro en una carpeta y que lo lea— hace falta lo
contrario: **Claude Code corriendo en tu ordenador**, sobre la carpeta del
proyecto. Ahí sí leo lo que dejes, edito los ficheros de verdad y tú ves los
cambios al instante.

## Los cuatro pasos

**1. Node y Git.** [Node 22 o superior](https://nodejs.org) y
[Git](https://git-scm.com). Si ya los tienes, salta.

**2. Claude Code.** La app de escritorio para Mac y Windows, o por terminal:

```bash
npm install -g @anthropic-ai/claude-code
```

Los instaladores y los requisitos, en [code.claude.com/docs](https://code.claude.com/docs).

**3. Bajarte el proyecto** donde lo quieras tener — el escritorio vale:

```bash
cd ~/Escritorio
git clone https://github.com/albesancmart1-cyber/app-ejercicio.git
cd app-ejercicio
npm install
```

**4. Abrirlo conmigo dentro:**

```bash
claude
```

Y ya está. A partir de ahí, «lee el libro que he dejado en `material/`» funciona.

## Dónde dejarme las cosas

En [`material/`](../material). Esa carpeta **no se sube a GitHub** —está en el
`.gitignore`— y eso importa más de lo que parece: el repositorio es público, y un
PDF con derechos de autor subido ahí deja copia en el historial de git aunque
después borres el fichero.

Lo que sí acaba en el código son las **ideas**: los parámetros de un protocolo,
el porqué de una cifra, cómo se llama un ejercicio. Se escriben con nuestras
palabras y citando la fuente. El texto del libro no se copia.

## Y GitHub, ¿qué pasa con GitHub?

Clonar no te saca de GitHub: te da **las dos cosas**. El proyecto vive en tu
disco y `git push` sube una copia cuando tú quieras.

Merece la pena conservarlo aunque no vuelvas a mirarlo, por dos razones muy
concretas. Es tu **copia de seguridad**: si mañana se te muere el disco, la app
entera está a un `git clone`. Y es tu **historial**: todo lo retirado —el sol, la
vitamina D, las lámparas, la comida— sigue ahí entero y se puede recuperar. Un
proyecto solo en el escritorio es un proyecto a una avería de distancia.

Si prefieres no publicar más, la alternativa razonable no es borrar el remoto
sino **hacer el repositorio privado**: GitHub → Settings → General → abajo del
todo, *Change repository visibility*. Conservas copia e historial y deja de estar
a la vista.

Ojo con una cosa si lo haces: el despliegue de GitHub Pages deja de funcionar en
un repositorio privado con cuenta gratuita. Netlify sí sigue, porque publica
desde el código y no depende de que el repositorio sea público.

## Cómo seguimos con el libro

En cuanto tengas esto montado, deja el Heavy Duty en `material/` y dime que lo
lea. Lo que ya está preparado para recibirlo:

- **Los parámetros** viven todos juntos en
  [`src/domain/heavyDuty.ts`](../src/domain/heavyDuty.ts), cada cifra con su
  porqué escrito al lado. Ajustarlos a lo que diga el libro es tocar ese fichero.
- **Los ejercicios que no puedas hacer** ya tienen solución montada: la app sabe
  con qué material cuentas en cada sitio donde entrenas
  (`domain/localizaciones.ts`) y sabe sustituir un ejercicio por otro que trabaje
  **los mismos músculos** y no solo el mismo grupo grueso (`domain/swap.ts`).
  Así que cuando el libro pida una máquina que no tienes, lo que hay que hacer no
  es inventar nada nuevo: es que el catálogo tenga el equivalente y que tu
  localización diga qué hay en tu gimnasio.
