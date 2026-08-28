# Ritmo

App de entrenar bajo **Heavy Duty**. React 19 + TypeScript + Vite, PWA, sin
servidor propio. Todo en castellano: el código, los comentarios, los nombres de
las funciones y los mensajes. Se sigue así.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 958 pruebas
npx tsc -b       # el typecheck de verdad — `npx tsc --noEmit` NO comprueba nada aquí
npm run build
```

## Lo que hace la app

Dos cosas, y nada más: decir **si hoy toca entrenar** y dar la sesión.

Tres pestañas —Hoy, Progreso, Yo—. El veredicto del día vive en
`src/domain/heavyDuty.ts` y se enseña en `src/components/VeredictoHD.tsx`, antes
del check-in: los días de descanso se saben sin preguntar nada.

## Heavy Duty, y por qué manda sobre todo lo demás

Mike Mentzer, *Heavy Duty* (1993). El estímulo es la **intensidad**, no la
cantidad: una serie al fallo real lo da entero y lo que venga después solo gasta
recuperación. Y la recuperación es limitada, así que entrenar antes de tiempo no
es entrenar de más — es interrumpir la reparación de la sesión anterior.

Consecuencias que ya están implementadas y **no se deshacen sin decirlo**:

- **«Hoy no» es una respuesta completa**, sin plan B más suave debajo. Ofrecer
  una sesión corta el día de descanso es lo que rompe el ciclo. Hay una salida
  («entrenar igualmente») y va con forma de enlace pequeño, no de botón.
- **El descanso crece con el nivel** (3 días al empezar, 7 de veterano), que es
  lo contrario de lo que hace casi todo el mundo.
- **Los días mandan sobre la disposición**, no al revés. Encontrarse bien es el
  resultado de estar recuperándose, no permiso para gastarlo.

Lo que **no** se toma de Mentzer es su parte doctrinal: aquí es la forma de
entrenar elegida, no la única válida.

### Lo que falta

El generador de sesiones (`domain/recommender.ts`, `domain/workoutBuilder.ts`,
`domain/progression.ts`, `domain/volume.ts`, `domain/landmarks.ts`) **todavía
construye con la lógica de volumen anterior**: series semanales por músculo y
parada a 1–3 repeticiones en reserva. El veredicto ya manda sobre *cuándo* se
entrena; falta que Heavy Duty mande sobre *qué* se propone — una serie por
ejercicio, 3–7 por sesión, 6–10 repeticiones (8–15 en piernas), doble progresión.

Hay un libro pendiente de leer en `material/` para ajustar los parámetros a la
fuente. Cuando llegue: los ejercicios que el libro pida y no se puedan hacer se
resuelven con lo que ya existe —`domain/localizaciones.ts` sabe con qué material
se cuenta en cada sitio y `domain/swap.ts` sustituye por otro que trabaje **los
mismos músculos**, no el mismo grupo grueso—.

## Reglas de la casa

- **Nada de calorías.** Ni déficit, ni superávit, ni macros, en ningún texto
  visible. `src/ui-copy.test.ts` lo comprueba y falla si aparece.
- **`material/` no se sube nunca.** Está en el `.gitignore`: ahí van libros y
  apuntes con derechos de autor. Las ideas sí pasan al código, escritas con
  nuestras palabras y citando la fuente; el texto no se copia.
- **El archivo de datos no se toca.** `AppData` conserva `sol`, `comidas`,
  `sesionesPBM`, `salidas`, `noches`, `fichajes`, `habitos` y `analiticas` sin
  tipar. Nada los escribe ya, pero viven en el móvil del usuario con meses de
  mediciones dentro. Ver «El archivo» en `src/domain/types.ts`.
- **`docs/PROMESAS.md` es un contrato comprobado a máquina.** Cada promesa
  marcada tiene que nombrar un fichero y un símbolo que existan, y el total va
  escrito a mano al final para que quitar una se vea en el diff.
- La app **no diagnostica** y no sugiere abandonar un tratamiento médico.
- Decimales con coma. Es una app en castellano.

## Cómo se escribe aquí

Los comentarios explican **por qué**, no qué. Cuando una decisión tiene una
alternativa razonable que se descartó, se dice cuál y por qué — eso es lo que
evita que alguien la deshaga sin enterarse. Mira `src/domain/heavyDuty.ts` o
`src/domain/merge.ts` para el tono.

Las pruebas describen comportamiento en castellano y explican el fallo real que
vigilan cuando lo hubo. No se ajusta una prueba para que pase: se arregla el
código, o se retira la prueba diciendo por qué dejó de aplicar.

## Historia

Ritmo llegó a medir el sol, la vitamina D, la fotobiomodulación, la comida, la
jornada y los hábitos, con seis pestañas. Se retiró todo el 28 de agosto para
volver a ser una app de entrenar. **Sigue en el historial de git**: `git log`
lo tiene entero y se puede recuperar.

Publicar: `npm run build` y `netlify deploy --prod --dir=dist`. Ver
`docs/DESPLEGAR.md`. La nube opcional (Firebase, solo para sincronizar entre
dispositivos) está en `firebase/README.md`; la app funciona entera sin ella.
