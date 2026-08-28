# Las promesas de Ritmo

Esto no es documentación. Es **el contrato** entre lo que la página de producto
anuncia y lo que la app hace de verdad, y está aquí por un motivo concreto:
durante el desarrollo se construyó la mitad de lo prometido y la otra mitad se
dio por hecha de memoria. La memoria no vale para esto.

Cada línea de esta lista salió **extraída del HTML publicado**, no escrita de
nuevo. Y cada línea marcada como hecha tiene debajo la prueba de que existe: el
fichero y el símbolo que la cumplen.

## Cómo funciona la garantía

`src/promesas.test.ts` lee este fichero y falla si:

- una promesa marcada `[x]` **no** tiene línea de prueba;
- el fichero que nombra no existe;
- el símbolo que nombra no aparece en ese fichero;
- hay dos promesas con el mismo identificador;
- **el número total de promesas cambia** respecto al declarado al final.

Esa última regla es la importante: impide que una promesa incómoda desaparezca
de la lista en silencio. Para quitar una hay que bajar el número a mano, y eso
se ve en el diff.

Marcar una casilla sin escribir el código **rompe la suite**. Es deliberado.

---

## El reloj


## Luz


## Turnos y talleres


## Lámparas y fotobiomodulación

- [x] pbm-lampara-propia · Lámpara con nombre libre y todas sus longitudes de onda
  → src/domain/types.ts :: Lampara
- [x] pbm-sesion · Sesiones con longitud de onda, minutos, zona y distancia
  → src/domain/types.ts :: SesionPBM

## Balance de luz


## Fichar y tu puesto

- [x] fichar-boton · Un botón al llegar, y la app sabe la hora y la luz
  → src/domain/types.ts :: Fichaje
- [x] fichar-perfil-luz · Temperatura de color, lux, ventana y filtro, configurados una vez
  → src/domain/types.ts :: PerfilDeLuz

## Mesa

- [x] mesa-varios-alimentos · Varios alimentos por comida, en peso o en unidades
  → src/domain/types.ts :: AlimentoRegistrado
- [x] mesa-suplementos · Suplementación dentro de la comida, creada una vez
  → src/domain/types.ts :: Suplemento

## Cuerpo

- [x] cuerpo-composicion · Peso, grasa y masa libre de grasa con rangos
  → src/domain/body.ts :: computeComposition
- [x] cuerpo-corregir-pasado · Corregir la báscula de cualquier día pasado
  → src/screens/Progreso.tsx :: Corregir un día pasado

## Hábitos


## El motor


## Entreno

- [x] entreno-sesion-generada · Sesión generada según cómo te encuentras
  → src/domain/workoutBuilder.ts :: buildSession
- [x] entreno-localizaciones · Localizaciones con su material y sus topes
  → src/domain/localizaciones.ts :: Localizacion
- [x] entreno-rir-drop-fallo · RIR real, drop sets, series al fallo, superseries
  → src/domain/types.ts :: TipoSerie
- [x] entreno-cronometro · Cronómetro y descansos entre series y ejercicios
  → src/components/Chrono.tsx :: formatDuration
- [x] entreno-cambiar-reordenar · Cambiar y reordenar ejercicios
  → src/domain/swap.ts :: alternativesFor
- [x] entreno-records · Récords, ficha por ejercicio, calculadora de discos
  → src/domain/discos.ts :: repartirDiscos
- [x] entreno-rutinas · Rutinas guardadas en carpetas
  → src/domain/types.ts :: Routine

## Progreso

- [x] progreso-cinco-vistas · Semana, mes, año, cuerpo y ejercicios
  → src/screens/Progreso.tsx :: SECCIONES
- [x] progreso-informe · Estadísticas e informe mensual
  → src/domain/estadisticas.ts :: estadisticasDe
- [x] progreso-comparacion · Comparación entre periodos
  → src/domain/comparacion.ts :: comparar
- [x] progreso-historial · Historial de sesiones con su detalle
  → src/components/SessionDetail.tsx :: SessionDetail

## Los datos

- [x] datos-en-el-movil · Todo en tu móvil, sin cuenta obligatoria
  → src/store/store.ts :: STORAGE_KEY
- [x] datos-sync · Sincronización entre dispositivos si la quieres
  → src/store/sync.ts :: sincronizar
- [x] cuenta-contrasena · Se entra con correo y contraseña, que funciona igual en la app instalada
  → src/store/cloud.ts :: entrar
- [x] cuenta-un-solo-boton · El mismo botón entra o crea la cuenta, sin decidir cuál pulsar
  → src/store/cloud.ts :: entrarOCrear
- [x] cuenta-sin-delatar · Equivocarse de contraseña no revela si ese correo tiene cuenta
  → src/store/cloud.ts :: credenciales
- [x] sync-latido · Se mira la nube sola cada poco mientras la app está a la vista
  → src/store/sync.ts :: arrancarLatido
- [x] datos-csv · Exportar a CSV
  → src/domain/csv.ts :: sesionesACsv
- [x] datos-importar · Importar de Hevy y de Strong
  → src/domain/csv.ts :: csvASesiones
- [x] datos-offline · Funciona sin conexión; se instala como app
  → vite.config.ts :: VitePWA

## Medir

Once botones en cuatro grupos, y debajo el saldo del día. Apuntar tenía que
costar un toque, y ese toque tenía que alimentar todo lo ya construido.

- [x] medir-contexto-al-empezar · La piel y el cielo se congelan al empezar, no al parar
  → src/domain/types.ts :: EnCurso
- [x] pbm-distancia-por-lampara · Cada lámpara con su distancia, que es lo único que puede ser
  → src/domain/types.ts :: LamparaEnSesion
- [x] medir-estimado-se-dice · Un rato estimado no se presenta como uno cronometrado
  → src/domain/types.ts :: estimado
- [x] medir-cielo · Cinco estados del cielo, con su multiplicador
  → src/domain/cielo.ts :: ORDEN_CIELO
- [x] medir-cielo-es-anadido · El cielo se declara como añadido nuestro, no como parte de la fórmula
  → src/domain/cielo.ts :: un añadido nuestro sobre esa fórmula
- [x] noche-estimada-se-dice · Una noche cerrada por la app se marca, no se hace pasar por medida
  → src/domain/types.ts :: estimado

## La ventana de la mañana contra tu jornada

Un consejo que no puedes seguir no es un consejo: es un reproche con formato de
consejo. La app decía «sal fuera entre las 05:04 y las 07:03» a quien a las siete
menos cuarto ya está fichado en una nave sin ventanas.


## En qué se te va el día


## Las tres esferas


## El parte del día


## Vitamina D con la fórmula real


## Instalar

- [x] instalar-iphone · Se instala en el iPhone sin App Store, a pantalla completa
  → index.html :: apple-mobile-web-app-capable
- [x] instalar-sin-destello · Arranca con su pantalla de carga, no con un flash blanco
  → src/instalacion.test.ts :: hay una por cada iPhone en circulación
- [x] instalar-nombre-corto · Bajo el icono pone «Ritmo», no el título entero
  → index.html :: apple-mobile-web-app-title
- [x] instalar-offline · Funciona entera sin conexión
  → vite.config.ts :: VitePWA
- [x] instalar-capacitor-sin-blanco · El contenedor no arranca en blanco
  → scripts/generar-iconos.mjs :: recursos del contenedor nativo

## El reloj


## El manual


## Lo que Ritmo NO hace

Estas también son promesas, y romperlas sería peor que no cumplir una función.

- [x] no-calorias · Ni una caloría, ni déficit, ni superávit, ni macros
  → src/ui-copy.test.ts :: caloría
- [x] no-diagnostica · No dice qué tienes, no cura nada, no toca tratamientos
  → src/ui-copy.test.ts :: la app no diagnostica
- [x] no-cronotipo · No te asigna un cronotipo
  → src/ui-copy.test.ts :: no hay búhos ni alondras

## Heavy Duty

- [x] hd-una-serie · Una serie al fallo por ejercicio, y no dos
  → src/domain/heavyDuty.ts :: SERIES_POR_EJERCICIO
- [x] hd-sesion-breve · Entre tres y siete series de trabajo por sesión
  → src/domain/heavyDuty.ts :: SERIES_POR_SESION
- [x] hd-descanso-crece · El descanso entre sesiones sube con el nivel, no baja
  → src/domain/heavyDuty.ts :: DIAS_POR_NIVEL
- [x] hd-hoy-no · «Hoy no» es una respuesta completa, sin plan B más suave debajo
  → src/components/VeredictoHD.tsx :: VeredictoHD
- [x] hd-dias-mandan · Encontrarse bien no es permiso para gastar el descanso
  → src/domain/heavyDuty.ts :: veredictoDelDia
- [x] hd-sin-listón-bajo · Con los días cumplidos pero sin disposición, tampoco se entrena
  → src/domain/heavyDuty.ts :: DISPOSICION_MINIMA
- [x] hd-paron-se-dice · Dos semanas dejan de ser descanso y se vuelve con menos peso
  → src/domain/heavyDuty.ts :: DIAS_QUE_YA_SON_PARON
- [x] hd-que-es-el-fallo · El fallo se define, no se da por supuesto
  → src/domain/heavyDuty.ts :: COMO_ES_UNA_SERIE
- [x] hd-salida-sin-empujon · Se puede entrenar igualmente, y se ofrece sin invitar a ello
  → src/styles/theme.css :: enlace-callado
- [x] archivo-no-se-borra · Lo que medía la app antes sigue en tus datos, entero
  → src/domain/types.ts :: El archivo

---

TOTAL: 51
