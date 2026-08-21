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
- [x] luz-vitamina-d-rango · Vitamina D estimada en rango, e invierno vitamínico
  → src/domain/vitaminaD.ts :: UI_POR_MINUTO
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
- [ ] cuerpo-keto-adaptacion · Curva de keto-adaptación con hitos
- [x] cuerpo-meseta · Árbol de meseta cuando el peso no se mueve
  → src/domain/explicacionPeso.ts :: meseta
- [ ] cuerpo-analiticas · Analíticas: HOMA-IR, TG/HDL, CT/HDL, vitamina D, ferritina

## Hábitos

- [ ] habito-grounding · Grounding con minutos y superficie
- [ ] habito-frio · Frío en seis escalones
- [ ] habito-ayuno-estacional · Ayuno estacional con fases
- [ ] habito-rampa · Rampa de protocolos
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

## Lo que Ritmo NO hace

Estas también son promesas, y romperlas sería peor que no cumplir una función.

- [x] no-calorias · Ni una caloría, ni déficit, ni superávit, ni macros
  → src/ui-copy.test.ts :: caloría
- [ ] no-diagnostica · No dice qué tienes, no cura nada, no toca tratamientos
- [x] no-rine-latitud · Ni un solo «no has tomado suficiente sol»
  → src/domain/balanceLuz.ts :: No es un fallo tuyo: es tu turno.
- [x] no-inventa-compensaciones · Lo que no se compensa, se dice
  → src/domain/compensaciones.ts :: sinRemedio
- [ ] no-cronotipo · No te asigna un cronotipo
- [x] no-vende-lamparas · No recomienda marcas, dosis ni aparatos
  → src/domain/compensaciones.test.ts :: no recomienda marcas
- [ ] no-dejes-tu-trabajo · Da por hecha tu jornada y trabaja con los huecos que tienes

---

TOTAL: 84
