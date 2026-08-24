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

- [x] reloj-tres-esferas · Período, fase y amplitud como lectura del día
  → src/domain/esferas.ts :: leerElReloj
- [x] reloj-arco-seis · Arco solar por latitud y fecha, seis umbrales
  → src/domain/arcoSolar.ts :: arcoDelDia
- [x] reloj-direccion-fase · Dirección del desplazamiento de fase
  → src/domain/esferas.ts :: desplazamientoDeFase
- [x] reloj-contraste · Contraste día:noche
  → src/domain/esferas.ts :: contrasteDiaNoche
- [x] reloj-fotoperiodo · Desfase estacional (fotoperiodo)
  → src/domain/estaciones.ts :: estacionRobada
- [x] reloj-callo-solar · Callo solar anclado al solsticio
  → src/domain/estaciones.ts :: solsticioAnterior

## Luz

- [x] luz-coordenadas · Latitud y longitud una vez; el resto se calcula solo
  → src/screens/Luz.tsx :: PedirSitio
- [x] luz-amanecer-exacto · Amanecer, ocaso y duración del día, exactos y día a día
  → src/domain/arcoSolar.ts :: duracionDiaMin
- [x] luz-sol-por-tramo · Sol por tramo, minutos, piel y a través de qué
  → src/domain/vitaminaD.ts :: FRANJAS
- [x] luz-vitamina-d-cifra · Vitamina D estimada con una cifra, y nota de temporada
  → src/domain/vitaminaD.ts :: uiDelDia
- [x] luz-higiene-noche · Higiene de luz de la noche
  → src/domain/estaciones.ts :: higieneDeNoche
- [x] luz-skygazing · Skygazing y atardecer
  → src/domain/estaciones.ts :: skygazing

## Turnos y talleres

- [x] turno-perfil-jornada · Perfil de jornada: turno, hora de entrada, ventana o no
  → src/domain/jornada.ts :: resumenDeJornada
- [x] turno-deficit-banda · Balance diario de déficit por banda
  → src/domain/balanceLuz.ts :: balanceDelDia
- [x] turno-fase-amplitud-aparte · Fase y amplitud contadas por separado
  → src/domain/esferas.ts :: son independientes
- [x] turno-sugerencia-descanso · Sugerencias del tamaño de tu descanso, no de tu día libre
  → src/domain/jornada.ts :: juzgarHueco
- [x] turno-sin-comparar · Nada de compararte con un horario que no tienes
  → src/domain/jornada.ts :: esLaborable
- [x] turno-tabla-compensaciones · Qué se compensa, con qué, y qué no se compensa con nada
  → src/domain/compensaciones.ts :: COMPENSACIONES

## Lámparas y fotobiomodulación

- [x] pbm-lampara-propia · Lámpara con nombre libre y todas sus longitudes de onda
  → src/domain/types.ts :: Lampara
- [x] pbm-clasificador · Cualquier nm de 280 a 3 000 clasificado en su banda
  → src/domain/luz.ts :: bandaDe
- [x] pbm-sesion · Sesiones con longitud de onda, minutos, zona y distancia
  → src/domain/types.ts :: SesionPBM
- [x] pbm-dosis-julios · Dosis en J/cm² si conoces la irradiancia de tu lámpara
  → src/domain/fotobiomodulacion.ts :: dosisDeSesion
- [x] pbm-picos-karu · Qué picos de absorción cubre tu aparato
  → src/domain/luz.ts :: picosCubiertos
- [x] pbm-cuanto-tapa · Cuánto del déficit de rojo e infrarrojo tapa la semana
  → src/domain/fotobiomodulacion.ts :: dosisAcumulada
- [x] pbm-que-no-tapa · Y qué parte no tapa: la fase y la UVB
  → src/domain/compensaciones.ts :: LO_QUE_LA_LAMPARA_NO_TAPA

## Balance de luz

- [x] balance-cuatro-barras · Cuatro barras: rojo e IR, ultravioleta, azul de día y oscuridad
  → src/domain/balanceLuz.ts :: NOMBRES_BANDA4
- [x] balance-contra-el-arco · Medidas contra lo que el arco ofrecía, nunca contra una cifra inventada
  → src/domain/balanceLuz.ts :: fraccion
- [x] balance-no-habia · Distingue «no lo aprovechaste» de «el cielo no lo ofrecía»
  → src/domain/balanceLuz.test.ts :: no había

## Fichar y tu puesto

- [x] fichar-boton · Un botón al llegar, y la app sabe la hora y la luz
  → src/domain/types.ts :: Fichaje
- [x] fichar-perfil-luz · Temperatura de color, lux, ventana y filtro, configurados una vez
  → src/domain/types.ts :: PerfilDeLuz
- [x] fichar-tres-combinaciones · Ámbar+cálido, ámbar+frío y sin gafas+frío salen distintos
  → src/domain/jornada.ts :: azulEfectivo
- [x] fichar-dia-semana · Día laborable o fin de semana cambian lo que la app propone
  → src/domain/jornada.ts :: esLaborable
- [x] fichar-aviso-gafas · Avisa el día en que las gafas de la mañana pasan a estorbar
  → src/domain/jornada.ts :: avisoDeGafas
- [x] fichar-aviso-por-fecha · Y entre qué fechas del año pasa, para avisar con antelación
  → src/screens/Luz.tsx :: TramosDeGafas

## Mesa

- [x] mesa-catalogo · Catálogo de +200 alimentos básicos, editables
  → src/data/alimentos.ts :: ALIMENTOS
- [x] mesa-varios-alimentos · Varios alimentos por comida, en peso o en unidades
  → src/domain/types.ts :: AlimentoRegistrado
- [x] mesa-ventana-cafe · Ventana que arranca con el primer café
  → src/domain/crononutricion.ts :: ventana
- [x] mesa-eventos-insulina · Eventos de insulina y horas entre comidas
  → src/domain/mesa.ts :: ritmoDeInsulina
- [x] mesa-leucina · Umbral de leucina por comida
  → src/domain/mesa.ts :: llegaAlUmbral
- [x] mesa-cetosis · Cetosis con margen estacional
  → src/domain/crononutricion.ts :: estadoDeCetosis
- [x] mesa-omega-ratio · Omega 3:6 con y sin suplemento
  → src/domain/omega.ts :: ratioDelDia
- [x] mesa-suplementos · Suplementación dentro de la comida, creada una vez
  → src/domain/types.ts :: Suplemento
- [x] mesa-diaas · DIAAS por alimento
  → src/data/nutrientes.ts :: diaas
- [x] mesa-deuterio · Deuterio por alimento
  → src/data/nutrientes.ts :: deuterioPpm
- [x] mesa-antinutrientes · Antinutrientes por alimento
  → src/data/nutrientes.ts :: NivelAntinutrientes
- [x] mesa-herramienta-ayuno · Alimentos herramienta y qué rompe el ayuno
  → src/domain/mesa.ts :: HERRAMIENTAS
- [x] mesa-editar-dias · Editar comidas y ver cualquier día pasado
  → src/components/DiarioDeComidas.tsx :: editarComida

## Cuerpo

- [x] cuerpo-explicacion-peso · Explicación diaria del peso, con factores
  → src/domain/explicacionPeso.ts :: explicarPeso
- [x] cuerpo-dos-relojes · Distancia entre los dos relojes, central y periférico
  → src/domain/relojes.ts :: dosRelojes
- [x] cuerpo-composicion · Peso, grasa y masa libre de grasa con rangos
  → src/domain/body.ts :: computeComposition
- [x] cuerpo-corregir-pasado · Corregir la báscula de cualquier día pasado
  → src/screens/Progreso.tsx :: Corregir un día pasado
- [x] cuerpo-keto-adaptacion · Curva de keto-adaptación con hitos
  → src/domain/analiticas.ts :: HITOS
- [x] cuerpo-meseta · Árbol de meseta cuando el peso no se mueve
  → src/domain/explicacionPeso.ts :: meseta
- [x] cuerpo-analiticas · Analíticas: HOMA-IR, TG/HDL, CT/HDL, vitamina D, ferritina
  → src/domain/analiticas.ts :: indicesDe

## Hábitos

- [x] habito-grounding · Grounding con minutos y superficie
  → src/domain/habitos.ts :: SUPERFICIES_QUE_VALEN
- [x] habito-frio · Frío en seis escalones
  → src/domain/habitos.ts :: ESCALONES_FRIO
- [x] habito-ayuno-estacional · Ayuno estacional con fases
  → src/domain/habitos.ts :: FASES_AYUNO
- [x] habito-rampa · Rampa de protocolos
  → src/domain/habitos.ts :: estadoDeHabito
- [x] habito-rachas · Rachas de todo lo anterior
  → src/domain/estaciones.ts :: rachaDeSol
- [x] habito-uno-cada-vez · Un solo hábito cada vez: el más barato que más arregla
  → src/domain/esferas.ts :: loDeHoy

## El motor

- [x] motor-luz-explica-peso · La báscula viene cada mañana con la explicación puesta, y la luz entra en ella
  → src/domain/explicacionPeso.ts :: relojes-desincronizados

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
- [x] datos-csv · Exportar a CSV
  → src/domain/csv.ts :: sesionesACsv
- [x] datos-importar · Importar de Hevy y de Strong
  → src/domain/csv.ts :: csvASesiones
- [x] datos-offline · Funciona sin conexión; se instala como app
  → vite.config.ts :: VitePWA

## Medir

Once botones en cuatro grupos, y debajo el saldo del día. Apuntar tenía que
costar un toque, y ese toque tenía que alimentar todo lo ya construido.

- [x] medir-pestana · Una pestaña para apuntar, la primera de la barra
  → src/screens/Medir.tsx :: Medir
- [x] medir-rejilla · Una rejilla de baldosas cuadradas, no una lista de botones
  → src/screens/Medir.tsx :: BALDOSAS
- [x] medir-tres-datos · Cada baldosa dice tres cosas y ninguna más
  → src/screens/Medir.tsx :: BaldosaBoton
- [x] medir-tiempo-propio · Cada baldosa lleva su propia cuenta del día
  → src/domain/medir.ts :: minutosDeHoy
- [x] medir-no-inventa-el-pasado · Los ratos de antes no se reparten a dedo entre baldosas
  → src/domain/medir.test.ts :: inventar el pasado
- [x] medir-empezar-parar · Empezar y parar, con el cronómetro a la vista
  → src/domain/medir.ts :: minutosAbierto
- [x] medir-varios-a-la-vez · Varias cosas a la vez, porque se solapan de verdad
  → src/domain/medir.test.ts :: permite varias a la vez
- [x] medir-contexto-al-empezar · La piel y el cielo se congelan al empezar, no al parar
  → src/domain/types.ts :: EnCurso
- [x] medir-sin-estructuras-nuevas · Cada botón escribe donde ya escribía la app
  → src/domain/medir.ts :: Escritura
- [x] medir-entrelazado · Tomar el sol o hacer grounding ya cuentan como estar fuera
  → src/domain/medir.ts :: IMPLICA_FUERA
- [x] medir-sin-doble-cuenta · Nada deja dos ratos fuera a la vez
  → src/domain/medir.test.ts :: contarlos dos veces
- [x] medir-lampara-completa · La lámpara pregunta cuál, qué zona y a qué distancia
  → src/screens/Medir.tsx :: LaLampara
- [x] pbm-varias-a-la-vez · Se pueden encender varias lámparas en la misma sesión
  → src/components/SelectorDeLamparas.tsx :: SelectorDeLamparas
- [x] pbm-distancia-por-lampara · Cada lámpara con su distancia, que es lo único que puede ser
  → src/domain/types.ts :: LamparaEnSesion
- [x] pbm-julios-se-suman · Los julios de varias lámparas se suman y las ondas iguales se juntan
  → src/domain/fotobiomodulacion.ts :: dosisDeSesion
- [x] pbm-picos-se-unen · Dos lámparas cubren juntas picos que ninguna cubre sola
  → src/domain/fotobiomodulacion.ts :: picosCubiertos
- [x] pbm-una-sesion-no-dos · Estar bajo dos lámparas es una sesión, no dos ratos seguidos
  → src/domain/medir.ts :: conLampara
- [x] pbm-encender-y-apagar · Se puede encender y apagar una lámpara sin parar el cronómetro
  → src/domain/medir.ts :: cambiarLamparas
- [x] pbm-tramos-no-son-sesiones · Los cambios parten la sesión en tramos, no en sesiones
  → src/domain/fotobiomodulacion.ts :: tramosDe
- [x] pbm-minutos-por-lampara · Cada lámpara dice cuántos minutos estuvo encendida
  → src/domain/fotobiomodulacion.ts :: DosisDeLampara
- [x] pbm-editar-lampara · Una lámpara se puede corregir sin borrarla y volver a escribirla
  → src/screens/Luz.tsx :: Corregir la lámpara
- [x] pbm-editar-avisa · Y se avisa de que las sesiones ya apuntadas se recalculan
  → src/screens/Luz.tsx :: se recalculan
- [x] espectro-completo · Qué hace cada longitud de onda, del UVB al infrarrojo lejano
  → src/domain/espectro.ts :: ESPECTRO
- [x] espectro-con-fuentes · Cada tramo cita de dónde sale, con año o con norma
  → src/domain/espectro.test.ts :: sin una sola fuente
- [x] espectro-donde-tecleas · Lo dice donde hace falta: al teclear la onda de tu lámpara
  → src/components/QueHaceEstaOnda.tsx :: QueHaceEstaOnda
- [x] espectro-bifasico · Empieza avisando de que pasarse inhibe, no de bondades
  → src/components/QueHaceEstaOnda.tsx :: bifásica
- [x] espectro-desmiente · Y desmonta lo que se repite y no se sostiene
  → src/domain/espectro.ts :: ojo
- [x] espectro-lejano-es-calor · El infrarrojo lejano cuenta como calor, no como mitocondria
  → src/domain/luz.ts :: infrarrojo_lejano
- [x] espectro-no-receta · Ni dosis, ni minutos, ni protocolos: se explica, no se receta
  → src/domain/espectro.test.ts :: no receta
- [x] medir-a-mano · Se puede apuntar un rato que ya pasó, con su hora
  → src/screens/Medir.tsx :: AMano
- [x] medir-entreno-en-marcha · El entreno empezado en «Hoy» se ve corriendo aquí
  → src/screens/Medir.tsx :: findActiveSession
- [x] medir-sin-color · Las baldosas no dependen del color para decir si están en marcha
  → src/styles/theme.css :: se da la vuelta
- [x] medir-olvido · Lo que se olvida abierto se cierra con media hora, y se dice
  → src/domain/medir.ts :: MINUTOS_SI_SE_OLVIDA
- [x] medir-estimado-se-dice · Un rato estimado no se presenta como uno cronometrado
  → src/domain/types.ts :: estimado
- [x] medir-piel · Seis opciones de cuánta piel llevas
  → src/domain/vitaminaD.ts :: ORDEN_PIEL
- [x] medir-cielo · Cinco estados del cielo, con su multiplicador
  → src/domain/cielo.ts :: ORDEN_CIELO
- [x] medir-cielo-es-anadido · El cielo se declara como añadido nuestro, no como parte de la fórmula
  → src/domain/cielo.ts :: un añadido nuestro sobre esa fórmula
- [x] medir-cielo-cambia · El cielo se puede cambiar a mitad de sesión, y parte el rato en tramos
  → src/domain/medir.ts :: cambiarCielo
- [x] medir-cielo-tramos · Cada tramo se guarda con el cielo que había, y se ve mientras corre
  → src/screens/Medir.tsx :: Lo que llevas de cada uno
- [x] medir-cielo-sin-inflar · Partir el cielo no multiplica ni la vitamina D ni los minutos de calle
  → src/domain/vitaminaD.ts :: uiDeExposicion
- [x] vitd-sin-tope · Ni techo diario ni corte de minutos: se cuenta todo lo sintetizado
  → src/domain/vitaminaD.ts :: No hay techo diario
- [x] vitd-una-cifra · Una cifra, no un intervalo, y sin redondear a cientos
  → src/domain/vitaminaD.ts :: escribirUI
- [x] vitd-sin-acantilado · La síntesis baja sola con el sol: no hay corte en ninguna altura
  → src/domain/vitaminaD.ts :: factorVitaminaD
- [x] vitd-ozono · El ozono se modela por latitud y estación, no se esconde en un margen
  → src/domain/atmosfera.ts :: ozonoDU
- [x] vitd-camino-real · El camino por la atmósfera se calcula con Kasten y Young, no con 1/cos
  → src/domain/atmosfera.ts :: masaDeAire
- [x] vitd-bruta-se-dice · Se dice que la cifra es síntesis bruta, no lo que sobrevive en sangre
  → src/domain/vitaminaD.ts :: síntesis bruta
- [x] medir-quemadura · Cuánto tardarías en quemarte, con tu fototipo y este cielo
  → src/domain/vitaminaD.ts :: minutosParaQuemarse
- [x] medir-fichar · Fichar y salir del trabajo desde el mismo sitio
  → src/screens/Medir.tsx :: saveFichaje
- [x] medir-trabajo-a-mano · La jornada se puede apuntar a mano, porque fichar se olvida
  → src/domain/jornada.ts :: tramoDeTrabajo
- [x] medir-trabajo-dos-horas · Se piden las dos horas, entré y salí, no una duración
  → src/screens/Medir.tsx :: Salí a las
- [x] medir-trabajo-sin-pisarse · Dos tramos que se pisan no se guardan, y se dice con cuál
  → src/domain/jornada.ts :: problemaDelTramoDeTrabajo
- [x] medir-trabajo-hoy · La baldosa de Trabajo enseña la jornada del día, como las demás
  → src/domain/jornada.ts :: minutosDeTrabajo
- [x] medir-cafe-cuenta · El café abre la ventana, y se dice que cuenta
  → src/screens/Medir.tsx :: El café cuenta

## La ventana de la mañana contra tu jornada

Un consejo que no puedes seguir no es un consejo: es un reproche con formato de
consejo. La app decía «sal fuera entre las 05:04 y las 07:03» a quien a las siete
menos cuarto ya está fichado en una nave sin ventanas.

- [x] ventana-no-manda-salir · No manda salir a quien a esa hora está fichado
  → src/domain/esferas.ts :: queHacerConLaVentana
- [x] ventana-hora-real · Tu hora de entrada sale de tus fichajes, no de un formulario
  → src/domain/jornada.ts :: entradaHabitual
- [x] ventana-media-tuya · Si solo te pilla media ventana, dice hasta cuándo es tuya
  → src/domain/jornada.ts :: parte
- [x] ventana-no-supone · Sin fichajes suficientes lo dice, en vez de suponer
  → src/domain/jornada.ts :: FICHAJES_PARA_SABERLO
- [x] ventana-no-esta-a-tiempo · Lo que no puedes hacer no se ofrece como «aún a tiempo»
  → src/domain/parte.ts :: cae dentro de tu jornada

## En qué se te va el día

- [x] reparto-barras · Una barra por cada cosa medida, a la misma escala
  → src/components/RepartoDelDia.tsx :: RepartoDelDia
- [x] reparto-anidado · Lo que ocurre dentro de otra cosa se enseña dentro, no al lado
  → src/domain/reparto.ts :: dentro
- [x] reparto-sin-doble-cuenta · Dos ratos a la vez son un rato, no dos
  → src/domain/reparto.ts :: unir
- [x] reparto-lo-dice · Cuando el total no cuadra al sumar, se explica por qué
  → src/components/RepartoDelDia.tsx :: ocurrieron a la vez

## Las tres esferas

- [x] esferas-crepusculo · Coger el atardecer frena la deriva de fase
  → src/domain/relojes.ts :: huboPulsoDeTarde
- [x] esferas-crepusculo-no-sustituye · Pero no sustituye a la luz de la mañana, y se dice
  → src/domain/esferas.ts :: ATRASO_CON_SOLO_CREPUSCULO
- [x] esferas-hoy-cuenta · Lo que haces hoy mueve la esfera hoy, no mañana
  → src/domain/esferas.ts :: hoyCuenta
- [x] esferas-no-se-adelanta · Pero no se da el día por perdido mientras quede ventana
  → src/domain/esferas.test.ts :: hoy no se da por perdido

## El parte del día

- [x] parte-cuatro-signos · Cuatro signos, no dos
  → src/domain/parte.ts :: ORDEN_SIGNO
- [x] parte-nada-contra-por-ausencia · Nada entra en contra por no haber podido
  → src/domain/parte.test.ts :: nada entra como «contra» por no haber podido
- [x] parte-aun-a-tiempo · Lo accionable va primero, con su hora límite
  → src/domain/parte.ts :: aun_puedes
- [x] parte-diciembre-no-es-culpa · Un día sin UVB da «no había», no un punto negativo
  → src/domain/parte.test.ts :: no un punto negativo
- [x] parte-sin-nota · No hay nota del día: no se promedia lo que no se puede promediar
  → src/components/ParteDelDia.tsx :: Esto no es una nota del día
- [x] parte-lampara-letra-pequena · La lámpara aparece siempre con lo que no tapa
  → src/domain/parte.ts :: pbm-no-tapa
- [x] parte-semana · Si se ha recuperado la deuda de fase de la semana
  → src/domain/parte.ts :: deudaSemana

## Vitamina D con la fórmula real

- [x] vitd-formula · La fórmula completa, con sus seis factores
  → src/domain/vitaminaD.ts :: uiPorMinuto
- [x] vitd-elevacion-real · Minuto a minuto con la altura real del sol, sin listas de meses
  → src/domain/vitaminaD.ts :: uiDeExposicion
- [x] vitd-fototipo · Fototipo de Fitzpatrick, editable en «Yo»
  → src/screens/Settings.tsx :: TuPiel
- [x] vitd-edad-altitud · La edad y la altitud mueven la síntesis
  → src/domain/vitaminaD.ts :: factorEdad
- [x] vitd-med · El aviso de quemadura con la dosis eritemática por fototipo
  → src/domain/vitaminaD.ts :: MED_J_M2
- [x] vitd-compatible · Lo apuntado antes sigue dando el mismo número
  → src/domain/vitaminaD.ts :: UI_POR_MINUTO_VIEJO
- [x] vitd-es-estimacion · Se presenta siempre como estimación, no como medida
  → src/domain/parte.ts :: estimación, no medida

## Instalar

- [x] instalar-iphone · Se instala en el iPhone sin App Store, a pantalla completa
  → index.html :: apple-mobile-web-app-capable
- [x] instalar-sin-destello · Arranca con su pantalla de carga, no con un flash blanco
  → src/instalacion.test.ts :: hay una por cada iPhone en circulación
- [x] instalar-nombre-corto · Bajo el icono pone «Ritmo», no el título entero
  → index.html :: apple-mobile-web-app-title
- [x] instalar-offline · Funciona entera sin conexión
  → vite.config.ts :: VitePWA
- [x] instalar-buzon · Otro aparato puede dejar una medida y el móvil la recoge
  → src/domain/buzon.ts :: recoger
- [x] instalar-buzon-sin-duplicar · Recoger dos veces deja lo mismo que recoger una
  → src/domain/buzon.test.ts :: exactamente lo mismo que una
- [x] instalar-reloj-se-dice · Se dice sin rodeos que watchOS no admite webs
  → docs/INSTALAR.md :: No se puede instalar Ritmo tal cual
- [x] instalar-capacitor · Hay proyecto de Xcode, con la misma app dentro
  → capacitor.config.ts :: webDir
- [x] instalar-capacitor-arranca · Se comprueba que el paquete nativo arranca desde la raíz
  → scripts/check-ios.mjs :: sin rutas absolutas
- [x] instalar-capacitor-sin-blanco · El contenedor no arranca en blanco
  → scripts/generar-iconos.mjs :: recursos del contenedor nativo
- [x] instalar-firma-se-dice · Se dice que Capacitor no alarga los 7 días de la firma
  → docs/INSTALAR.md :: No alarga la firma

## El reloj

- [x] reloj-medir · Empezar y parar desde la muñeca, con la misma rejilla
  → ios/RitmoWatch/Fuentes/Rejilla.swift :: Baldosa
- [x] reloj-entrelazado · «Fuera» se enciende sola, igual que en el móvil
  → ios/RitmoWatch/Fuentes/Estado.swift :: incluidaPor
- [x] reloj-sol-sin-red · La altura del sol se calcula en el reloj, sin conexión
  → ios/RitmoWatch/Fuentes/Sol.swift :: elevacionAhora
- [x] reloj-traduccion-comprobada · El cálculo del sol se comprueba contra el TypeScript
  → ios/RitmoWatch/Pruebas/SolTests.swift :: testTraduccionFielAlTypeScript
- [x] reloj-sin-credenciales · El reloj no guarda ninguna credencial
  → ios/RitmoWatch/Fuentes/Enlace.swift :: ninguna credencial en la muñeca
- [x] reloj-entrega-garantizada · Lo medido llega aunque el móvil esté apagado
  → ios/RitmoWatch/Fuentes/Enlace.swift :: transferUserInfo
- [x] reloj-mismo-camino · Una medida del reloj deja los mismos rastros que una del móvil
  → src/store/reloj.ts :: recogerDelReloj
- [x] reloj-sin-verificar-se-dice · Se dice que el Swift no está compilado ni probado
  → docs/RELOJ.md :: compilado ni una vez
- [x] reloj-siete-dias-se-dice · Se avisa de que caduca a los 7 días
  → docs/RELOJ.md :: deja de abrirse a los 7 días

## El manual

- [x] manual-pdf · Hay un manual en PDF de la app entera
  → scripts/generar-manual.mjs :: Ritmo-manual.pdf
- [x] manual-cada-boton · Dice qué guarda y qué alimenta cada botón de Medir
  → docs/manual/manual.html :: Al parar guarda
- [x] manual-cifras-del-codigo · Las cifras salen del código, no de la memoria
  → docs/manual/manual.html :: Todas las cifras, en tablas

## Lo que Ritmo NO hace

Estas también son promesas, y romperlas sería peor que no cumplir una función.

- [x] no-calorias · Ni una caloría, ni déficit, ni superávit, ni macros
  → src/ui-copy.test.ts :: caloría
- [x] no-diagnostica · No dice qué tienes, no cura nada, no toca tratamientos
  → src/ui-copy.test.ts :: la app no diagnostica
- [x] no-rine-latitud · Ni un solo «no has tomado suficiente sol»
  → src/domain/balanceLuz.ts :: No es un fallo tuyo: es tu turno.
- [x] no-inventa-compensaciones · Lo que no se compensa, se dice
  → src/domain/compensaciones.ts :: sinRemedio
- [x] no-cronotipo · No te asigna un cronotipo
  → src/ui-copy.test.ts :: no hay búhos ni alondras
- [x] no-vende-lamparas · No recomienda marcas, dosis ni aparatos
  → src/domain/compensaciones.test.ts :: no recomienda marcas
- [x] no-dejes-tu-trabajo · Da por hecha tu jornada y trabaja con los huecos que tienes
  → src/ui-copy.test.ts :: no te dice que dejes tu trabajo

---

TOTAL: 187
