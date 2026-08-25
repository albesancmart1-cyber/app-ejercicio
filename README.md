# Ritmo

Entrenar sin estrés, al ritmo de tu cuerpo.

Ritmo entiende el cuerpo como un todo. No impone un plan rígido: escucha cómo estás cada día,
mira qué has trabajado y cuánto llevas parado, y decide si hoy toca fuerza, cardio o descanso —
manteniendo todos los grupos musculares en equilibrio. El ejercicio como complemento de los
hábitos fundamentales (ritmos circadianos, exposición solar, buen descanso), no como una
obligación más.

Es una PWA instalable en el móvil. Todos los datos viven en tu dispositivo; no hay cuentas ni
servidor.

## Cómo funciona

1. **Perfil** — objetivo (masa, tonificar o recomposición), equipamiento disponible con el peso
   máximo de cada equipo, y desde cuándo sigues dieta cetogénica.
2. **Check-in diario** (medio minuto) — sueño, energía, higiene lumínica, amanecer, atardecer,
   exposición solar, cetosis, molestias, y dos señales de apetito (hambre al despertar y antojos).
   De ahí salen el índice de disposición del día y la señal de leptina de la semana.

   Las **molestias se marcan por zonas, tantas como haga falta**. Antes solo se admitía una, y el
   cuerpo no funciona así: de una sesión de empujes se sale con el pecho y el tríceps cargados a la
   vez. Cada zona marcada se deja descansar hoy, y además **restan puntos según cuántas sean** —4
   por zona hasta un tope de 12—, porque marcar una dice dónde entrenar y marcar tres dice cómo está
   el cuerpo. Aparte están las **leves y repartidas**, las que no señalan a ningún sitio: esas bajan
   el listón sin dejar nada fuera, y se pueden marcar junto con las zonas concretas. Si se marca casi
   todo, la app lo dice tal cual —«hoy no queda nada a lo que pedirle trabajo de fuerza»— en vez de
   fingir que está todo cubierto.
3. **Recomendación** — reglas en cascada, de la más protectora a la más exigente. Cada
   recomendación viene con un «por qué» desplegable en lenguaje llano. Y si lo que te toca no es lo
   que te apetece, decides tú entre tres caminos, con los mismos guardas puestos en los tres:
   dejarlo como está, **«pesas sin quitar el cardio»** (sesión mixta: fuerza primero y el cardio a
   la mitad) o **«prefiero algo con pesas»** (cambio completo a fuerza contenida). Ninguno se acerca
   al fallo, y todos siguen respetando tus molestias, las 48 h de recuperación y la rampa de vuelta
   tras un parón.
4. **Sesión** — primero ves el plan completo y lo ajustas con calma: **eliges de la lista** otro
   ejercicio si alguno no encaja, **quitas** el que sobre, **añades** los que quieras, **reordenas**,
   y dices **cómo lo vas a hacer** (con mancuerna o polea, a un brazo o a dos). Al pulsar «empezar entrenamiento» arranca un
   **cronómetro**. Anotas
   **serie a serie** el peso y las repeticiones reales, y al marcar una serie salta solo el
   **temporizador de descanso**, que vibra al terminar — entre series el que toque por el tipo de
   ejercicio, y **2 minutos al cambiar de ejercicio**, anunciando cuál viene. Todo lo anotado se
   guarda solo mientras entrenas: salir a otra pestaña, cerrar la app o bloquear el móvil no borra
   nada, y al volver sigues donde estabas con el cronómetro en marcha.
5. **Cuerpo** — composición corporal, señal de leptina, balance muscular de 14 días, grupos
   cubiertos y calendario.
6. **Mesa** — ideas de comida completa cetogénica para cuando no sabes qué cocinar.

## Base científica

Las decisiones del motor no son arbitrarias. Los parámetros y sus fuentes están documentados en
`src/domain/protocol.ts`:

**Vuelta tras un parón.** Se aplica la regla 50/30/20/10 de las guías conjuntas CSCCa/NSCA para
periodos de transición: la primera sesión al 50 % del volumen habitual, y luego 70 %, 80 % y 90 %.
La rampa es más larga cuanto más largo fue el parón (2 pasos hasta 3 semanas, 3 hasta 2 meses,
4 por encima). Durante toda la rampa se entrena lejos del fallo (4 repeticiones en reserva), que es
lo que evita el daño muscular y las agujetas incapacitantes de la vuelta. La literatura sobre
*muscle memory* respalda el mensaje de fondo: los mionúcleos retenidos hacen que se recupere lo
perdido mucho más rápido de lo que costó ganarlo, así que no hay ninguna prisa.

**Proximidad al fallo.** Los meta-análisis de proximidad al fallo muestran que parar a 1–3
repeticiones del fallo produce prácticamente la misma hipertrofia que llegar a él, con bastante
menos fatiga. La app programa 2–3 repeticiones en reserva en condiciones normales y 4 en la
vuelta: encaja exactamente con el objetivo de estresar el cuerpo lo mínimo posible.

**Volumen y frecuencia.** Las meta-regresiones de dosis-respuesta sitúan en unas 4 series
semanales por grupo muscular el mínimo con el que ya se obtienen ganancias sustanciales, y en
10–20 el rango que las maximiza. Como el objetivo aquí es entrenar poco y bien, la app usa 4 como
umbral de «grupo cubierto» y evita pasar de 20. Se respetan 48 h antes de volver a cargar un mismo
grupo.

**Cetosis.** El position stand de la ISSN sobre dietas cetogénicas y los meta-análisis de fuerza
coinciden en que la cetosis no compromete la fuerza máxima, pero sí el trabajo glucolítico de
muchas repeticiones con descansos cortos, que es el que depende del glucógeno muscular. Por eso en
cetosis la app acorta los rangos altos de repeticiones, sube algo la carga y alarga los descansos
30 segundos. Durante las primeras 6 semanas de adaptación mantiene la intensidad por debajo del
máximo. La proteína es la única cifra que la app pide vigilar: 1,6–2,2 g/kg, hasta 2,6 en
recomposición.

**Leptina en lugar de calorías.** La app no cuenta calorías ni habla de déficit ni de superávit.
La leptina es la hormona con la que el tejido graso informa al cerebro de la disponibilidad
energética del cuerpo: es el propio sensor que esas cuentas intentan estimar desde fuera. Así que
en vez de estimarlo, se cuida la señal y se come hasta saciedad real con la proteína por delante.
Cuando la señal llega limpia, el apetito se autorregula y el entorno hormonal es permisivo para
construir músculo; cuando se ensucia, aparecen hambre voraz, antojos y peor recuperación por bien
que se entrene.

`src/domain/leptin.ts` calcula esa señal sobre **una ventana de 7 días**, no del día: la leptina
responde a patrones, no a una noche suelta. Es lo que la distingue del índice de disposición, que
sí es diario. Las palancas, ordenadas por el peso que les da la evidencia:

- **Sueño** (el peso mayor). La restricción de sueño baja la leptina un 18–19 %: 6 días de
  restricción reducen un 19 % los niveles de 24 h, y bastan 2 días para un 18 % diurno.
- **Luz de la mañana.** Aumenta la leptina incluso en personas con el sueño restringido, así que la
  pregunta del amanecer es literalmente una palanca hormonal.
- **Higiene lumínica nocturna.** El desalineamiento circadiano induce resistencia a la leptina.
- **Exposición solar diurna y atardecer.** Refuerzan el contraste luz/oscuridad que sincroniza el
  ritmo propio de la hormona, que tiene su pico unas 2 h antes del amanecer.
- **Hambre al despertar y antojos.** Marcadores prácticos de que la señal de saciedad no llega.

Cuando coinciden poca energía sostenida y antojos, la app avisa de que probablemente se está
comiendo por debajo de lo necesario: la baja disponibilidad energética suprime leptina e IGF-1, y
eso sí frena el músculo. Se detecta por señales, no por una cuenta. En sentido contrario, entrenar
ayuda: la carga muscular crónica aumenta los receptores de leptina en el propio músculo (+62 % de
OB-R170 en el brazo dominante de tenistas profesionales).

**Cardio.** El efecto de interferencia entre fuerza y resistencia es menor a volúmenes moderados y
desaparece separando las sesiones, así que la app alterna días en vez de mezclarlos: tras dos
sesiones de fuerza seguidas propone cardio a intensidad conversacional. Si el usuario pide las dos
cosas el mismo día, se aplica lo que dice la misma evidencia: fuerza primero, cardio recortado a la
mitad y a ritmo conversacional.

Fuentes: [CSCCa/NSCA Transition Periods](https://www.nsca.com/about-us/position-statements/safe-return-to-training/) ·
[Proximidad al fallo (meta-análisis)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9935748/) ·
[Dosis-respuesta de volumen y frecuencia](https://pubmed.ncbi.nlm.nih.gov/41343037/) ·
[Frecuencia de entrenamiento](https://pubmed.ncbi.nlm.nih.gov/30558493/) ·
[ISSN Position Stand: dietas cetogénicas](https://www.tandfonline.com/doi/full/10.1080/15502783.2024.2368167) ·
[Cetosis y fuerza (meta-análisis)](https://www.mdpi.com/2072-6643/16/14/2200) ·
[Cetosis e hipertrofia (meta-análisis)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9564904/) ·
[Memoria muscular](https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1701520/full) ·
[Entrenamiento concurrente](https://www.strongerbyscience.com/research-spotlight-interference-effect/) ·
[EFSA 2026: DHA suplementario](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2026.9858) ·
[EFSA 2012: EPA, DHA y DPA](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2012.2815) ·
[Retinol en hígados (estudio BfR MEAL)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9530835/) ·
[Leptina y sueño](https://pmc.ncbi.nlm.nih.gov/articles/PMC4131947/) ·
[Luz de la mañana y leptina](https://onlinelibrary.wiley.com/doi/full/10.1155/2012/530726) ·
[Disfunción circadiana y resistencia a la leptina](https://www.cell.com/cell-metabolism/fulltext/S1550-4131(15)00272-7) ·
[Ritmo circadiano de la leptina](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00630.2013) ·
[Horarios de comida y balance energético](https://www.jci.org/articles/view/144655)

Nada de esto sustituye el criterio de un profesional, y menos si hay lesiones o patologías de por
medio.

## Composición corporal

Cuando te peses, anotas el peso y los porcentajes de grasa y músculo que dé la báscula, y la app los
pasa a kilos: `grasa = peso × %grasa / 100`, `músculo = peso × %músculo / 100` y
`masa libre de grasa = peso − grasa`. Con la altura calcula además el **FFMI** (masa libre de grasa
dividida por la altura al cuadrado) y su versión **normalizada a 1,80 m** con la corrección habitual
`+ 6,1 × (1,80 − altura)`, que permite comparar entre estaturas.

Lo importante no es la lectura suelta sino la **variación**: para un objetivo de recomposición el
peso puede quedarse clavado mientras baja la grasa y sube el músculo, y eso solo se ve en kilos. La
app lo detecta y lo dice.

### La gráfica

Grasa (~16 kg) y músculo (~32 kg) tienen escalas muy distintas. En vez de recurrir a un doble eje
—que es el error clásico y deforma la comparación—, ambas series se **indexan a una base común: el
cambio en kg desde la primera medición**, con la línea de cero como referencia. Además de ser
correcto, es justo donde la recomposición se ve: dos líneas separándose del origen.

Los colores de serie son fijos (la identidad sigue al dato, no al acento horario) y están
**validados con el script del sistema de visualización**, no elegidos a ojo: `#cf6d4d` para grasa y
`#5596d0` para músculo pasan banda de luminosidad, croma, separación para daltonismo (ΔE 19,0),
suelo de visión normal y contraste, en las cuatro superficies oscuras de la app. Un primer intento
coral/verde se descartó justamente por dar ΔE 6,1 en deuteranopía. Leyenda siempre presente,
etiquetas directas y marcas distintas (círculo y cuadrado) para que la identidad nunca dependa solo
del color.

### El veredicto

Debajo de la gráfica la app dice si estás recomponiendo, si vas bien, si estás estancado o si algo
va mal. Dos reglas gobiernan ese comentario:

- **No inventar señal donde no la hay.** La pendiente se calcula por mínimos cuadrados sobre todas
  las mediciones, no comparando la última con la anterior, así que una lectura rara no cambia el
  veredicto. No opina con menos de 3 mediciones ni menos de 3 semanas, y trata como plano todo lo
  que quede por debajo de 0,3 kg al mes. Decir «te has estancado» a partir de ruido de báscula sería
  fabricar ansiedad.
- **Quitar carga mental, no añadirla.** Si algo no funciona se dice claro, pero se señala **una sola
  palanca**, sacada de lo que la app ya sabe de ti: la señal de leptina que peor esté, tu
  consistencia real de entrenamiento, los grupos musculares que se quedan fuera o la proteína.
  Nunca más de dos sugerencias a la vez, nunca hablando de calorías, y nunca en clave de culpa ni de
  racha rota. Cuando vas bien, la recomendación es explícitamente no tocar nada.

## El cambio de día

A las 00:00 empieza un día nuevo: la app vuelve a preguntarte el check-in para planificar la
jornada, con las preguntas que miran al día anterior (atardecer, sol, antojos).

Esto no salía gratis. La fecha se calculaba al dibujar la pantalla, pero **nada obligaba a
redibujarla al cambiar el día**: con la app abierta o recuperada de segundo plano —lo normal en el
móvil— seguía creyendo que era ayer y daba el check-in por hecho. Ahora el día es una fuente a la
que las pantallas se suscriben (`src/store/clock.ts`), y se actualiza por tres vías: un temporizador
ajustado a los milisegundos que faltan para medianoche, el regreso desde segundo plano —clave,
porque mientras el móvil duerme los temporizadores no corren— y la recuperación del foco.

Y una salvaguarda para quien entrene de noche: **un entreno empezado a las 23:50 no desaparece al
dar las doce**. Una sesión ya iniciada sigue activa unas horas aunque cambie la fecha, mientras que
una que se preparó ayer y nunca se empezó no bloquea el día nuevo.

`node scripts/check-midnight.mjs` lo verifica falseando el reloj del navegador por los dos caminos.

## El cardio: con qué, y cuánto

Un día de cardio no es «35 minutos», es una **cantidad de trabajo**. Si la app propone 35 minutos de
trote y ese día no apetece correr, andar 35 minutos no es lo mismo: es bastante menos. Así que en la
sesión de cardio se ofrecen las actividades que se pueden hacer con el material del perfil —andar,
bici, cuestas, escaleras, trote, comba— **cada una con sus propios minutos**, ordenadas de menos a
más exigente.

La moneda de cambio son los **MET-minuto**: el coste metabólico de la actividad por el tiempo. Es la
unidad con la que están escritas las recomendaciones de actividad física —los 150–300 minutos
semanales de la OMS son MET-minuto disfrazados— y los valores salen del
[Compendium of Physical Activities](https://pubmed.ncbi.nlm.nih.gov/21681120/) (Ainsworth et al.,
2011). Con eso, 35 min de trote (7,0 MET) son 245 MET-minuto, y andar (3,5 MET) los mismos 245 pide
70 minutos. Sale largo porque **es** largo: caminar cuesta la mitad por minuto.

Dos guardas. La conversión **no sube la intensidad de un día que pedía calma**: en un descanso activo
no se ofrece trote aunque salgan las cuentas, porque el objetivo de ese día es mover sangre, no
acumular MET-minuto. Y la **movilidad no entra** como alternativa aeróbica: convertir la dosis daría
«85 min de estiramientos», que no es una recomendación, es una cuenta.

Al cambiar, la app dice por qué cambian los minutos —«caminata tranquila cuesta menos por minuto, así
que hacen falta 70 min para el mismo trabajo que 35 de trote suave»— y si la equivalencia exacta se
pasa de hora y media, lo reconoce en vez de disimularlo.

`node scripts/check-cardio.mjs` lo comprueba en navegador.

## Pesas y cardio el mismo día

La cascada decide qué le conviene hoy a tu cuerpo, pero hay días en que toca cardio y uno se nota
con cuerpo para levantar. Antes solo se podía cambiar una cosa por la otra; ahora se puede
**repartir**.

«Pesas sin quitar el cardio» monta una sesión mixta: **tres o cuatro ejercicios de fuerza que elige
la app**, y después el cardio recortado a la mitad (`CARDIO_EN_SESION_MIXTA`, con un suelo de 10 min
para que siga siendo cardio y no un paseo hasta el coche). El botón dice de antemano en qué se
traduce —«14 min en vez de 28»—, así que la decisión se toma con el dato delante.

Los ejercicios **no hay que añadirlos a mano**: eso sería devolverte justo el problema que la app
existe para quitarte. Se eligen solos, uno por zona, entre las que llevan más tiempo sin trabajarse
y respetando las 48 h de recuperación, y el «por qué» te dice cuáles ha cogido y con qué criterio.
A diferencia de una sesión de fuerza normal, la mixta **no dobla el grupo prioritario**: es una
sesión corta, y lo que interesa es tocar varias zonas descansadas en vez de cargar dos veces la
misma.

Las tres cosas que hacen que eso no sea una paliza:

- **La fuerza va antes que el cardio.** El efecto de interferencia depende sobre todo del volumen de
  resistencia y de cuánto se separan las dos cosas; llegar a levantar con las piernas ya cansadas es
  justo donde se nota.
- **La sesión de fuerza es más corta.** Dos ejercicios menos que una normal, y sin el bloque de core:
  ese hueco lo ocupa el cardio.
- **La intensidad no pasa de moderada**, por alta que sea tu disposición del día. El día ya carga con
  las dos cosas.

El resto de guardas son exactamente los mismos que en cualquier otra sesión —molestias, 48 h de
recuperación, rampa de vuelta, nunca cerca del fallo—, porque la decisión es tuya pero el trabajo de
la app es que esa decisión no te pase factura. En un día flojo la mixta sale suave y con 4
repeticiones en reserva; en uno bueno, moderada.

La opción aparece **siempre que el día traiga cardio**, incluido el descanso activo. Solo desaparece
cuando ya toca fuerza, que es cuando no hay nada que repartir.

Y hay **dos puertas de entrada**, porque las ganas de levantar no siempre llegan en el mismo
momento: el botón de la recomendación, antes de preparar nada, y **«Añadir pesas · te las elijo yo»**
dentro del plan ya montado (`src/domain/mixIn.ts`). Sin la segunda, quien ya había preparado su
sesión de cardio solo podía añadir ejercicios a mano de la lista —justo el trabajo que la app existe
para quitarte— o descartar la sesión y empezar de cero. Las dos hacen exactamente lo mismo por
dentro y con los mismos guardas; la segunda además nunca alarga el cardio, solo lo recorta.

## Cambiar un ejercicio, o añadir otro

A veces el propuesto no sirve: no gusta, o no se tiene con qué hacerlo. **«Cambiar ejercicio» lo
sustituye de un toque** — elige la app, que para eso está. Pedirle al usuario que escogiera de una
lista de cien era exactamente lo contrario del propósito de esto.

El sustituto trabaja **los mismos músculos**, no el mismo grupo grueso: eso era lo que permitía que
cambiar un curl te devolviera un tríceps. Primero los que mueven ese músculo como motor principal;
después, los que lo acompañan, porque hay músculos con solo tres ejercicios directos en todo el
catálogo y sin ellos cambiar se convertía en un ir y venir entre dos.

Y cada toque trae **uno distinto**. La app recuerda lo que ya has descartado en ese hueco de la
sesión: sin eso, al cambiar A por B el siguiente toque devolvía A, porque A ya no estaba en la sesión
y volvía a ser candidato. Agotadas las opciones vuelve a empezar, en vez de dejar el botón muerto.
Si aun así se prefiere elegir a mano, **«Elegirlo yo de la lista»** sigue abriendo el catálogo, con
buscador y filtro por zona.

### Lo que la app aprende

Marcar favoritos funciona, pero es trabajo. Así que además se aprende de lo que ya haces
(`src/domain/affinity.ts`): cada ejercicio que **entrenas** sube, cada uno que **cambias** por otro
baja, y el que te quedas sube un poco —menos de lo que baja el descartado, porque quedarse con lo
primero que aparece dice menos que rechazar algo activamente—. Con eso, la próxima vez que hagan
falta esos músculos, lo que te gusta se propone antes.

Es deliberadamente lento y acotado a ±3. Un solo cambio no condena a un ejercicio —puede que ese día
no tuvieras sitio, o que te doliera algo— y una sola sesión no lo consagra. Un favorito marcado a
mano manda sobre lo aprendido: es una preferencia declarada, no una deducción. Y lo aprendido nunca
manda sobre que el sustituto haga el trabajo: primero que mueva los músculos que tocaba, después que
te guste.

Los rechazados con **«No me lo propongas más»** siguen siendo distintos: esos desaparecen del todo,
con la guarda de siempre —si excluirlos dejara un músculo sin ningún ejercicio, se ignora la lista y
se propone igual, diciéndolo—.

`node scripts/check-cambiar.mjs` comprueba las cuatro cosas en navegador.

## Tus favoritos

Una lista larga solo funciona si no hay que recorrerla cada día, y de eso se encargan los
**favoritos**: la estrella de cada línea los marca, y `pickForGroup` los antepone al proponer la
sesión. Como la regla de no repetir lo de la última sesión sigue después, lo que hace en la práctica
es **rotar entre tus favoritos** en vez de caer siempre en el mismo. Se gestionan desde la propia
lista o desde Ajustes, y marcar algo como favorito lo saca de los descartados.

Cada ejercicio de la sesión tiene tres salidas distintas, porque son tres cosas distintas:

- **Cambiar ejercicio** — otro para hoy, elegido por ti de la lista.
- **Quitar** — fuera de la sesión de hoy y nada más. Disponible también para el cardio, que hay días
  en que lo que sobra es justo eso. No se deja vaciar la sesión del todo: con el último la app se
  niega y propone descartarla sin culpa, que para eso está el botón.
- **No me lo propongas más** — fuera de hoy **y** de las próximas. Antes solo hacía lo segundo y el
  ejercicio se quedaba en la sesión, lo cual no se entendía: si no lo quieres ver nunca, tampoco lo
  quieres hoy.

Los descartados se recuperan en Ajustes, y si excluirlos dejara un grupo sin nada, se ignora la
lista antes que dejar la sesión coja.

## Con qué y de qué forma

Un mismo ejercicio admite formas distintas, y no son matices: **son cargas distintas**. La extensión
de tríceps sobre la cabeza se puede hacer con mancuerna, con polea o con banda, y a un brazo o a los
dos a la vez. Doce kilos a un brazo en polea no se comparan con doce kilos con mancuerna a dos manos.

Cuando el ejercicio lo admite, la sesión ofrece elegirlo, y la elección **se guarda con la serie**:

- **Con qué** — solo aparece si tienes más de un material válido para ese ejercicio. El peso máximo
  que se usa para estimar la carga pasa a ser el de *ese* material: el tope de la polea no tiene por
  qué ser el de las mancuernas.
- **A un lado o a los dos** — marcado en el catálogo (`unilateralOption`) para los ejercicios donde
  la distinción tiene sentido.

La sugerencia de peso mira entonces el historial de **esa misma forma de hacerlo**. Si nunca lo has
hecho así, traduce la carga en vez de perderla: al pasar a un lado se estima la mitad
(`FACTOR_UNILATERAL`), al volver a los dos se recupera, y en ninguno de los dos casos se sube nada
encima hasta que haya una serie registrada con esa forma. Las sesiones guardadas antes de que esto
existiera no dicen cómo se hicieron, así que **valen como comodín**: no se pierde el peso alcanzado
por haber empezado a anotar la variante.

Cambiar la forma a mitad de ejercicio **no borra lo anotado**: recalcula el peso sugerido y deja las
series como estaban.

## Cómo se hace cada ejercicio

Cada ejercicio tiene un desplegable **«¿cómo se hace?»** con un muñeco animado del patrón de
movimiento y dos o tres avisos de técnica. Los 49 ejercicios se agrupan en 15 patrones —sentadilla,
bisagra de cadera, empuje horizontal y vertical, tracción, plancha, cardio…—, que es lo que hace
viable tener referencia visual para todos sin depender de vídeos externos ni de conexión.

Las animaciones son SVG con SMIL: sin JavaScript, sin dependencias y funcionando con la app
instalada y sin red. Respetan el ajuste de reducir movimiento del sistema congelando la pose
inicial. Son esquemáticas a propósito: resuelven la duda de en qué dirección va el movimiento y qué
se mueve, y no sustituyen a que alguien te vea y te corrija.

Dos avisos que van en la propia pantalla, porque son la diferencia entre un dato útil y uno
engañoso:

- **Masa muscular y masa libre de grasa no son lo mismo.** La libre de grasa incluye hueso, órganos
  y agua, así que siempre es mayor. Se muestran por separado para no confundir agua con músculo.
- **La bioimpedancia se mueve ±3–5 % según la hidratación.** Conviene medir siempre en las mismas
  condiciones y mirar la tendencia — lo mismo que pasa con el peso al día siguiente de un entreno
  fuerte, que sube por retención de líquidos y no por grasa.

Las lecturas imposibles se rechazan: porcentajes fuera de rango, o grasa y músculo sumando más de
100 %.

## Progresión de cargas

Al registrar las repeticiones reales, la app aplica **doble progresión**: mientras el rango no esté
ganado del todo se ganan repeticiones, y solo cuando lo está sube el peso. Las repeticiones mandan
sobre la sensación porque son dato objetivo — puedes acabar cómodo y no haber llegado al rango.

Tres reglas, todas de la NSCA ([Baechle y Earle](https://www.nsca.com/education/nsca-essentials-of-strength-training-and-conditioning/)):

- **Dos por dos.** Hacen falta **dos sesiones seguidas** completando el rango. Una puede serlo por
  haber dormido bien; dos ya es adaptación. Antes bastaba una, y esa es la forma más silenciosa de
  encadenar semanas de estancamiento: la carga se adelanta a la capacidad y a partir de ahí ninguna
  sesión sale limpia. Cuando falta la segunda, la app lo dice en la tarjeta del ejercicio.
- **Incremento proporcional.** 2,5 % de base y 5 % en los básicos de tren inferior, que es el
  extremo conservador de las bandas de la NSCA (2,5–5 % arriba, 5–10 % abajo). Antes era un salto
  fijo del 5 % **o de un kilo, el mayor de los dos**, y ese suelo era el problema: en un curl de 8 kg,
  un kilo es un 12,5 %.
- **Suelo realista.** El salto mínimo es 0,5 kg, porque el disco de 0,2 kg no existe. En cargas
  pequeñas manda el suelo, y eso hay que decirlo: subir 8 kg a 8,5 sigue siendo un 6,3 %.

Y una cuarta que no viene de la literatura sino de entrenar en casa: **cuando la carga llega al tope
del material, la progresión cambia de palanca** en vez de estancarse en silencio. Si el ejercicio
admite hacerse a un lado cada vez, esa es la siguiente; si no, se estira el rango de repeticiones.
A carga fija el estímulo sigue viniendo de llevar la serie cerca del fallo
([Schoenfeld et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28834797/), [Lasevicius et al. 2018](https://pubmed.ncbi.nlm.nih.gov/29564973/)),
así que hay progresión después del último kilo. Con unas mancuernas de 24 kg esto no es un detalle.

`node scripts/check-carga.mjs` lo comprueba en navegador, y `node scripts/medir-rampas.mjs` mide los
porcentajes reales para distintos pesos.

## Taxonomía muscular y conteo fraccional

El conteo por grupos gruesos mentía por omisión: una serie de tríceps y una de
bíceps sumaban las dos a «brazo», así que el balance podía dar el brazo por cubierto con el tríceps
machacado y el bíceps a cero. La taxonomía nueva (`src/domain/muscles.ts`) tiene **dos niveles**:

- **Región** — pecho, espalda, hombro, brazo, pierna, core. Solo para navegar y plegar. **No se
  cuenta volumen sobre ella.**
- **Músculo** — 19 en total, y es la unidad real. Ahí viven los landmarks y ahí se decide si falta o
  sobra trabajo.

**El conteo es fraccional.** Cada ejercicio declara qué mueve y cuánto (`src/data/contributions.ts`):
`1` si es motor primario, `0,5` si es sinergista con implicación significativa. Los estabilizadores
no se listan — que un ejercicio te haga apretar el abdomen para no caerte no es volumen de abdominal.
Cuatro series de press de banca son 4 al pectoral, 2 al tríceps y 2 al deltoides anterior. Contar las
indirectas como media serie es lo que mejor predijo hipertrofia y fuerza frente a contarlas enteras o
no contarlas ([Pelland et al., Sports Medicine 2025](https://pubmed.ncbi.nlm.nih.gov/40410597/)).

**Qué serie cuenta** (`src/domain/volume.ts`): las hechas, no las planificadas; las de trabajo, no
los calentamientos; y las que van a 3 repeticiones del fallo o menos. Las de la rampa de vuelta tras
un parón, que van a 4 y 5, quedan fuera a propósito: son de rodaje.

El mapa se **congela con la sesión** al registrarla, así que afinar el catálogo mañana no reescribe
el volumen de lo que ya entrenaste.

### Landmarks por músculo

Cada músculo trae sus referencias en series fraccionales por semana: `mev` (mínimo con el que ya se
ve adaptación), la banda `mavMin`–`mavMax` donde el volumen rinde de verdad, y `mrv` (a partir de ahí
se acumula más fatiga que estímulo). Son valores de partida **editables por perfil**: la respuesta al
volumen varía mucho de una persona a otra.

**Mientras se pierde grasa** el objetivo se recorta a 12 series por músculo. No es conformarse:
cuando el cuerpo tira de sus reservas la leptina baja y con ella la capacidad de recuperación, y ahí
20 series semanales de cuádriceps no preservaron más masa magra que 12
([Roth et al. 2023](https://pubmed.ncbi.nlm.nih.gov/38028130/)); para conservar lo ganado basta
alrededor de un tercio del volumen de acumulación ([Bickel et al. 2011](https://pubmed.ncbi.nlm.nih.gov/21131862/)).
El recorte se aplica **al final**, así que también limita lo que el usuario haya subido a mano: es una
salvaguarda, no una preferencia.

Aquel estudio impuso la fase con una restricción calórica medida, porque es como se controla un
experimento. La app no hereda de ahí el instrumento: lo que se declara en Ajustes es **«estoy
perdiendo grasa»**, y si hay dudas, quien lo dice antes que la báscula es la señal de leptina. El
estado del cuerpo es el mismo; cambia con qué se detecta.

### Migración

`src/store/migrate.ts` lleva el histórico de la taxonomía vieja a la nueva con tres reglas:
**no se pierde nada** (los campos viejos se quedan donde estaban, así que se puede revertir), **lo
que se deduce se marca** (un ejercicio que ya no está en el catálogo se infiere del nombre con una
tabla de heurísticas y queda con `needsReview` para que lo confirmes), y **es idempotente**, así que
correrla en cada arranque es seguro.

### Los dos motores en paralelo

Antes de cambiar de motor se midió la diferencia. El nuevo estuvo un tiempo solo mirando y apuntando
(`src/domain/shadow.ts`): no se sustituye algo que lleva meses funcionando por algo que sobre el
papel es mejor, sin medirlo antes.

`node scripts/comparar-motores.mjs` genera seis meses de historial haciendo que la propia app decida
—`recommend` → `buildSession` → registrar series— y compara las dos lecturas semana a semana. Sobre
78 sesiones y 26 semanas:

| | |
|---|---|
| Semanas en que los dos coincidirían | **0 de 26** |
| Semanas con un grupo «cubierto» y algún músculo bajo su mínimo | **26 de 26** |
| Semanas con un músculo pasado de MRV sin que el viejo lo viera | 0 |
| Semanas con freno por techo sin que hiciera falta | 0 |

Los músculos que el conteo grueso tapaba, por semanas bajo su MEV dentro de un grupo dado por
cubierto: deltoides posterior y antebrazo (26), trapecio superior (22), deltoides lateral y bíceps
(20), aductores (15), recto abdominal (13).

El patrón es de manual y se ve en la última semana: **hombro 13 series** para el motor viejo, que
por dentro son 12 de deltoides anterior, 2 de lateral y **0 de posterior**; **brazo 12 series**, que
son 14 de tríceps y **2 de bíceps**. El volumen de empuje infla los dos grupos mientras los músculos
que solo crecen con trabajo directo se quedan a cero.

**Que no haya ni una sola sobrecarga invisible ni una falsa saturación es la buena noticia para la
migración**: el motor nuevo nunca diría «te estás pasando» donde el viejo no lo decía. Toda la
divergencia va en la dirección de «te falta trabajo», que es segura de aplicar.

### La sesión se elige por músculo

Con eso medido, la elección pasó a hacerse por músculo (`src/domain/focus.ts`). `elegirFoco` ordena
los músculos por lo lejos que están de su volumen productivo —en proporción, que es lo que hace
comparables a un sóleo que pide 6 series y a un deltoides anterior que pide 3— y `pickForMuscle`
busca un ejercicio donde ese músculo sea **motor principal**, no uno que lo roce. Con todo a cero, que
es lo normal a principio de semana, desempata el tiempo que lleva sin trabajarse.

Lo que **no** cambió: la cascada que decide si hoy toca descanso, cardio o vuelta progresiva, y las
dos guardas de siempre. Una molestia declarada deja fuera **la zona entera**, porque quien dice «me
duele el hombro» no está distinguiendo entre deltoides; y un grupo entrenado hace menos de 48 h
descansa entero. `avoidGroups` las hace explícitas en la recomendación, porque un buen ejercicio de
bíceps puede ser una dominada y con la espalda dolorida esa no es la respuesta.

`node scripts/check-foco.mjs` simula seis meses dos veces sobre el mismo perfil y el mismo
calendario, cambiando **solo quién elige**:

| | por zona | por músculo |
|---|---|---|
| Semanas de músculo bajo su mínimo (de 494) | 220 | **196** |
| Músculos sin una sola serie en seis meses | deltoides posterior | **ninguno** |

La mejora en el total es modesta y tiene una explicación aritmética: con tres sesiones semanales no
hay series para tener a diecinueve músculos por encima de su mínimo a la vez. Lo que cambia de
verdad es el reparto — deja de haber músculos abandonados y los que iban sobrados bajan a su parte —
y eso es lo que el script vigila: falla si esa mejora se pierde.

### El catálogo tenía un agujero

Contar por músculo dejó a la vista que la app **nunca había propuesto trabajo de pantorrilla**: con
la taxonomía vieja no había ningún grupo que nombrara al gemelo, así que el hueco era invisible. Se
añadieron once ejercicios por los músculos que la comparación marcaba como más descuidados —siete de
tobillo (de pie para el gastrocnemio, sentado para el sóleo, que con la rodilla doblada es el que
queda), curl de muñeca y paseo del granjero para el antebrazo, elevación lateral inclinado y aducción
de cadera— y un test comprueba que todo músculo con landmarks tiene al menos un ejercicio que lo
trabaja **de forma directa**. Cubrirlo solo como sinergista no vale: harían falta el doble de series
de otra cosa.

### Cómo se ve

En «Cuerpo», el volumen semanal músculo a músculo, plegado por regiones y con la primera que tenga
carencias ya abierta. Cada barra es una escala con sus tramos —bajo el mínimo, banda que rinde, por
encima de lo que rinde, pasado el techo— y el número lleva un decimal, porque las series de
acompañante valen media. Tocando un músculo se ve de dónde sale: «12,0 series directas + 12,0 de
acompañante, que cuentan la mitad = 18,0», con sus landmarks debajo.

El color nunca lleva la información solo: cada músculo enseña su número y el nombre de su zona en
texto, y los tramos están siempre en el mismo orden. Distinguir verde de ámbar y de rojo es
exactamente lo que no puede dar por hecho una app que quiere leerse con un daltonismo común.

Si una semana sale a cero porque el trabajo fue de rodaje —a 4 o 5 repeticiones del fallo—, la vista
lo dice en vez de parecer rota.

Al añadir un ejercicio a mano, la lista enseña **a qué dejaría la semana**: «bíceps 0,0 → 3,0», y en
verde el que cruzaría el mínimo semanal. Y en Ajustes se pueden cambiar los objetivos de cada
músculo, que se guardan en el perfil; solo se guarda lo que difiere del valor de fábrica, así que
afinar mañana los valores por defecto sigue llegando a quien no los haya tocado.

## Progresión de volumen

Subir el peso deja de bastar en algún momento: para seguir creciendo hace falta **más volumen**. Pero
subirlo por calendario es la forma más rápida de acabar reventado, así que la app solo lo hace cuando
el cuerpo demuestra que asimila lo que ya está haciendo. La decisión está en
`src/domain/progression.ts` y se toma con tres preguntas, en este orden:

1. **¿Asimilas?** Cuenta las **sesiones limpias**: todas las series marcadas, llegando al menos al
   mínimo del rango de repeticiones prescrito y con sensación de 3 o más sobre 5. Hacen falta **3 de
   las últimas 4** para considerar que el volumen actual se está asimilando.
2. **¿Puedes?** Si la señal de leptina lleva tres días o más en «baja» —mal descanso, hambre voraz,
   antojos—, se vuelve al volumen base aunque todo lo demás diga que sí. Con la recuperación tocada,
   añadir series no construye músculo: solo acumula fatiga.
3. **¿Hace falta?** Si la composición corporal va bien (`recomposicion` o `progreso`), no se toca lo
   que funciona. Si está **estancada** y además el cuerpo asimila, se adelanta un nivel: es
   exactamente cuando pedir más tiene sentido.

Las palancas se usan en el orden que menos estrés añade por unidad de estímulo. Las cifras de las dos
últimas columnas están medidas con `node scripts/medir-rampas.mjs`: simula ocho semanas a tres
entrenos por semana con el nivel fijado y cuenta cuántos de los 19 músculos acaban por encima de su
mínimo y cuántos dentro de la banda que rinde.

| Nivel | Series | Ejercicios | Zonas | Repeticiones | Series/semana | ≥ MEV | en su banda |
| ----- | ------ | ---------- | ----- | ------------ | ------------- | ----- | ----------- |
| 1 | 3 | 4 | 4 | rango normal | 58,5 | 5/19 | 0/19 |
| 2 | 4 | 4 | 4 | rango normal | 76 | 10/19 | 1/19 |
| 3 | 4 | 5 | 5 | rango normal | 99,5 | 16/19 | 2/19 |
| 4 | 5 | 5 | 5 | rango desplazado (+4) | 122,9 | 16/19 | 5/19 |

**Cada escalón sube el volumen de verdad.** Antes el nivel 4 era idéntico al 3 salvo el rango de
repeticiones, con lo que el último escalón de la rampa no subía nada: la app llegaba a su techo con
2 de 19 músculos en su banda productiva.

**Y la rampa ensancha, no estrecha.** La intuición decía lo contrario —concentrar en menos músculos
para darle a cada uno más series y meterlo en la banda de 10–20 semanales de Schoenfeld—, pero
medido sale al revés: con las mismas 25 series de sesión, abrir cinco zonas deja 16 músculos sobre su
mínimo y 5 en su banda, y abrir solo tres deja 14 y 3. Concentrar reparte peor sin dar más
profundidad, porque el que se queda fuera hoy tampoco entra mañana.

Cada escalón pide **6 sesiones limpias**: a dos entrenos por semana son tres semanas por nivel,
tiempo de sobra para que se note si el volumen anterior se estaba asimilando de verdad. Y si las
sesiones dejan de salir, se baja **un escalón**, no hasta el suelo: tirar de golpe toda la adaptación
acumulada por cuatro sesiones flojas no lo sostiene nada, y además se corrige solo, porque el nivel
sale de las sesiones limpias de las últimas ocho semanas.

### Saltar de nivel a mano

La progresión automática va lenta a propósito, pero eso da por hecho que la app sabe de lo que eres
capaz, y no lo sabe: no tiene ni idea de si llevas años levantando en otro sitio. Desde la tarjeta de
volumen, **«Subir de nivel»** abre los cuatro niveles con lo que significa cada uno —ejercicios,
series, series de trabajo, zonas— y el elegido manda sobre el calculado. Se puede elegir también uno
más bajo: hay semanas en las que uno sabe que no quiere más volumen aunque el cuerpo aguante.

Elegido a mano, la app no se calla ni te lo cambia por la espalda: sigue enseñando dónde estaría ella
(«por sesiones limpias yo estaría en el 1»), y si la señal de leptina cae dice que bajaría al volumen
base **manteniendo tu nivel**. Volver a lo automático es un toque. Y cuando el nivel calculado alcanza
al elegido, deja de marcarse como elección: ya es el mismo.

### Qué cuenta como sesión asimilada

Todo lo anterior descansa en contar **sesiones limpias**, y ahí había un fallo que dejaba la puerta
cerrada para siempre: se exigía que **cada** serie de **cada** ejercicio llegara al mínimo del rango.
En una sesión de veinte series, que la última se quede a una repetición es la forma normal de la
fatiga en series rectas, no un fallo de adaptación — pero invalidaba el día entero. El resultado era
«0 de tus últimas 3 sesiones» semana tras semana y un volumen que no subía nunca.

Ahora una sesión cuenta si se marcó al menos el **85 %** de las series y **dos tercios** de las que
llevan repeticiones anotadas llegaron al rango, con la sensación en 3 o más. Y cuando no cuenta, la
app dice por qué y con números: «quedaron series sin marcar: la última vez, 12 de 20» o «las
repeticiones se quedaron por debajo del rango: llegaron 4 de 15; si pasa siempre, el peso va por
delante de lo que toca».

Nada de esto pasa en silencio: la pantalla de hoy muestra un bloque **«Volumen · nivel N de 4»** con
**qué cambia** respecto al volumen base —acumulado, no solo el último escalón— **por qué** se está en
ese nivel y **en qué me baso** (cuántas sesiones salieron limpias, qué dice la composición, qué dice
la leptina). Si el nivel baja, también se dice y se explica.

Dos cosas siguen mandando por encima del nivel alcanzado: la **rampa de vuelta tras un parón**, que
recorta las series igual, y el **tope de estrés** de la sesión. Y pedir pesas un día que tocaba paseo
conserva el nivel: lo que el cuerpo lleva demostrando no se borra por cambiar de plan.

### Volver después de un parón

La regla 50/30/20/10 de la CSCCa/NSCA reduce el volumen a la mitad al volver y lo devuelve poco a
poco. La guía está escrita **en semanas**, y la app lo contaba en sesiones: a tres entrenos por
semana, una rampa de cuatro pasos se despachaba en once días. Ahora cada paso dura siete días, y
entrenar más veces no la acelera — lo que se readapta despacio tras un parón es el tejido, y eso no
depende de cuántos días vayas.

Las repeticiones en reserva también se acercan a lo normal según avanza la rampa (4 → 3 → 3 → 2) en
vez de quedarse en 4 hasta el último día. Tenía una consecuencia que no se había visto: el conteo de
volumen deja fuera lo que se hace a más de 3 repeticiones del fallo, así que la vuelta entera
aparecía con **cero volumen** en la vista por músculo.

## Mesa

Un recetario para los días en que no sabes qué comer. **59 platos completos** de base animal —
huevos, carne, casquería, pescado, marisco, lácteos enteros y chocolate del 95 % — **sin ningún
fruto seco ni semilla**, restricción que vigila un test para que no se cuele nunca al ampliar el
catálogo. La verdura, cuando aparece, es acompañamiento y jamás el plato.

Eliges qué te apetece y cuánto tiempo tienes (sin cocinar, menos de 15 minutos, o con calma), pulsas
«Dame una idea» y sale un plato concreto con ingredientes, dos líneas de preparación, su proteína y
su DHA; la siguiente idea nunca repite la anterior. Debajo queda el recetario completo para
curiosear. Se muestra tu referencia diaria de proteína, pero **no se registra nada**: es
orientación, no contabilidad.

**El DHA manda.** Sin filtros, toda sugerencia es de DHA alto (≥600 mg por ración). El DHA es el
ácido graso estructural de las membranas — los segmentos externos de los fotorreceptores rondan el
50 % — y solo existe en cantidad relevante en pescado azul y marisco: la caballa anda por los
1.400 mg/100 g y las sardinas por los 700, mientras que la carne, los lácteos y el cacao están
prácticamente a cero y una yema convencional aporta unos 45 mg.

Aun así, pedir carne no te deja sin DHA: hay platos que la acompañan de algo del mar — muslos de
pollo con caballa al lado, hamburguesa con sardinas encima, o hígado de bacalao en su aceite junto
al filete. Donde no hay salida (lácteos, capricho) la app lo dice claramente en vez de fingir, y
sugiere cómo enriquecer el plato: anchoas, huevas, media lata de sardinas o huevos enriquecidos en
omega-3, que multiplican por cuatro el DHA de la yema.

### Cuánto DHA, y dónde está el límite

El objetivo diario es de 2.000 mg, que suben a 2.600 en los meses de más sol. Los topes están en
`src/domain/dha.ts` con sus fuentes:

- **EFSA (2026)**, opinión específica sobre DHA suplementario: hasta **1.000 mg/día de DHA aislado**
  no plantean problemas de seguridad en ninguna población. No es un límite máximo tolerable — por
  encima no está demostrado que sea peligroso —, sino el techo que la evidencia actual permite
  respaldar. Por eso la app **nunca sugiere más de una pastilla de 1 g al día**, y calcula sola
  cuántas te faltan para el objetivo a partir del plato que elijas.
- **EFSA (2012)**, EPA + DHA combinados: hasta ~5 g/día de suplemento no aumentan el sangrado
  espontáneo ni alteran el control glucémico, la función inmune o la peroxidación lipídica.
- El techo operativo total de la app son 3.000 mg diarios sumando comida y pastilla. Entre 2 y 3 g
  de DHA suplementario puede subir el LDL (y también el HDL), aunque la propia EFSA no considera
  ese cambio adverso hasta 4 g durante 16 semanas.

**Vitamina A: el otro límite.** El hígado de bacalao es de lo más denso en DHA que existe, pero una
lata ronda los 5.000 µg de retinol y el límite superior en adultos son 3.000 µg al día. Por eso los
platos con hígado llevan un tope semanal visible con su motivo — dos veces por semana el de bacalao,
una el de ternera —, y un test impide que se añada casquería al catálogo sin ese tope.

Subir el objetivo en verano es una preferencia razonable y segura dentro de estos límites, pero
conviene ser claro: que el DHA sea material de construcción de las membranas está fuera de
discusión; que el cuerpo *necesite* más en verano no es algo que la literatura establezca.

## Diseño

Lenguaje visual de Apple: tipografía del sistema con la jerarquía completa —título grande de 34 px,
titulares de 21, cuerpo de 17—, listas agrupadas sobre superficies translúcidas, esquinas continuas
y mucho aire. Controles con la forma que toca: cápsulas para las opciones, control segmentado para
las escalas de 1 a 5, botón relleno para la acción principal, y una respuesta táctil de escala al
pulsar.

La app se monta como un **armazón**, no como una página: el documento no se desplaza nunca, y quien
lo hace es el contenido dentro de su contenedor. No es un capricho de arquitectura, es un fallo que
apareció en el móvil: con la barra en `position: fixed` sobre el documento, iOS deja de repintarla
durante el desplazamiento por inercia y la cápsula se queda plantada a media pantalla. Con este
armazón la barra no se recoloca nunca, porque no hay nada que recolocar.

**La barra de navegación es una cápsula flotante de cristal líquido.** No es un rectángulo
translúcido: desenfoca y satura lo que pasa por detrás, lleva un anillo especular de un píxel que
recoge la luz por arriba a la izquierda y la derrama por abajo a la derecha, un reflejo interior en
la cara superior y su propia sombra proyectada. El indicador de la pestaña activa es una pastilla
que **se desliza** de una a otra, de modo que la barra se lee como una pieza física apoyada sobre la
app y no como cuatro botones sueltos. El material de verdad se reserva para donde algo pasa por
debajo —la barra y la hoja del catálogo—: las tarjetas no llevan desenfoque, porque desenfocar ocho
veces un fondo liso cuesta fluidez en el móvil sin ganar nada.

El icono lo genera `scripts/logo.mjs`. La silueta no es un rectángulo redondeado sino una
**superelipse**, la misma curva continua que usan los iconos del sistema; la diferencia se nota
justo en el arranque de la esquina, que es donde un icono se ve casero o no. Dentro, un solo
símbolo con mucho aire alrededor y sin una letra: el sol saliendo sobre tres líneas que se acortan
—el amanecer que gobierna toda la app y la cadencia, el ritmo, en la misma figura—. El mismo dibujo,
sin fondo y en `currentColor`, es la marca de dentro de la app (`src/components/Mark.tsx`), así que
hereda el acento de la hora del día.

Y lo que no se toca, porque es salud y no estética: el acento sigue la hora del día —amanecer, día,
atardecer, noche— y **por la noche la interfaz pasa a ámbar y baja el brillo**. La app no debería
ser la que te rompa la higiene lumínica que te está pidiendo respetar.

El lenguaje acompaña y nunca presiona. No hay rachas que romper ni notificaciones de culpa; hasta
el botón de cancelar dice «Hoy no puedo — descartar sin culpa».

## Se comporta como una app, no como una web

**En el móvil**, la escala está fijada: no se amplía con dos dedos ni con dos toques.
`touch-action: manipulation` quita además los 300 ms que el navegador dejaba para distinguir el doble
toque, así que los botones responden al instante. No hay rebote elástico al llegar al final ni
«tirar para recargar», el texto no se selecciona al mantener pulsado —salvo donde se escribe— y no
aparece el destello gris del navegador al tocar. El documento no se desplaza: quien lo hace es el
contenido por dentro del armazón.

**En el ordenador**, a partir de 900 px el armazón gira noventa grados: la cápsula de cristal se
convierte en **barra lateral** —que es lo que hacen las apps de Apple en pantalla ancha— y el
contenido ocupa el resto. A partir de 1180 px, las tarjetas se reparten en **dos columnas** en las
pantallas donde son independientes entre sí (Cuerpo, Mesa, Ajustes). En «Hoy» y en la sesión no: son
un hilo con un orden —cómo estás, qué toca, empezar— y partirlo en dos obligaría a leer en zigzag.

`node scripts/check-pantalla.mjs` comprueba las dos cosas.

## Tus datos en cualquier dispositivo

Por defecto todo se guarda **en el dispositivo** y no sale de ahí. Si quieres entrar desde el móvil y
desde el ordenador con los mismos datos, la app puede usar una nube — hay que darla de alta una vez.

Conviene decir qué es «la nube» aquí, porque la palabra engaña: **la base de datos de la app es tu
móvil**. Todo vive en `localStorage`, la app arranca y funciona entera sin cuenta y sin red, y
Firestore es solo el sitio de paso donde dos dispositivos se ponen de acuerdo. Mientras el móvil
conserve su almacén, cambiar de proveedor de nube —o quedarse sin ninguno— no pierde nada.

### Ponerla en marcha (una vez, unos cinco minutos)

Los cinco pasos, con las pantallas exactas y qué hacer cuando algo falla, están en
[`firebase/README.md`](firebase/README.md). En resumen:

1. Crea un proyecto gratuito en [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method → Email/Password**: activa el interruptor de arriba **y** el de
   abajo, *Email link (passwordless sign-in)*. El de abajo viene apagado y es el que hace falta.
3. **Firestore Database → Crear base de datos** (modo producción) y, en la pestaña **Reglas**, pega
   y publica [`firebase/firestore.rules`](firebase/firestore.rules). Es lo que hace que cada cuenta
   solo pueda leer y escribir lo suyo.
4. **Authentication → Settings → Authorized domains**: añade el dominio de Netlify. Sin esto Firebase
   ni siquiera manda el correo.
5. En Netlify, **Site configuration → Environment variables**, crea `VITE_FIREBASE_API_KEY` y
   `VITE_FIREBASE_PROJECT_ID` con el `apiKey` y el `projectId` del proyecto.

En el siguiente despliegue aparece la tarjeta **«Tu cuenta»** en Ajustes. Si las variables no están,
la app se construye igual y guarda solo en el dispositivo: la nube es opcional de principio a fin.

La `apiKey` va dentro del paquete y **es pública a propósito**: identifica al proyecto, no autoriza
nada. Lo que protege los datos son las reglas de Firestore, no esconder la clave.

### Cómo entra uno

Con el **correo, sin contraseña**: pides un enlace, lo abres, y ya estás dentro. Una contraseña más
es una contraseña más que perder, y en una app de una sola persona no aporta nada.

El enlace no trae la sesión hecha: trae un **testigo de un solo uso** que la app canjea con una
petición, mandando además el correo al que se envió —de modo que un enlace interceptado no basta por
sí solo—. En cuanto se canjea, los parámetros se quitan de la barra de direcciones para que no queden
en el historial ni se compartan al copiar la dirección.

Y hay una segunda vía que parece un rodeo y no lo es: **pegar el enlace dentro de la app en vez de
pulsarlo**. En iOS, una app añadida a la pantalla de inicio tiene su propio almacén, separado del de
Safari, y el enlace del correo siempre abre Safari: pulsándolo se entra en Safari y la app instalada
te sigue viendo como un dispositivo nuevo. Pegándolo, el canje ocurre dentro de la app. Firebase no
manda códigos de cifras por correo —no existe esa vía en su API—, así que estas dos son todas.

### Qué pasa cuando los dos lados tienen cosas distintas

Se **juntan**, no se pisan. Entrenas en el móvil, abres el ordenador que lleva días sin actualizarse,
y la sesión de esta mañana sigue ahí. Se puede juntar porque cada cosa tiene identidad propia —el
check-in es de un día, la medición es de un día, la sesión tiene su identificador—, así que la fusión
(`src/domain/merge.ts`) es la unión de las dos listas; cuando la **misma** cosa está en los dos
lados, gana la que se tocó más tarde. El perfil es lo único que no se puede unir por partes sin
inventar, y ahí gana el guardado más tarde.

Lo que la unión sola haría mal es **borrar**: si borras una medición en el móvil, el ordenador
todavía la tiene y al fusionar volvería a aparecer. Por eso lo borrado deja una **lápida** —qué era y
cuándo— que la fusión respeta, salvo que hayas vuelto a crear esa misma cosa después.

Y el ciclo es siempre el mismo: bajar, fusionar, guardar aquí, subir. Hacerlo dos veces da lo mismo
que hacerlo una, así que reintentar cuando vuelve la conexión es seguro.

### Sin conexión

Manda siempre **lo que hay en este dispositivo**. La app arranca y funciona entera sin red —se
entrena en sitios sin cobertura—, así que la nube nunca está en el camino crítico: se lee y se
escribe en local como siempre y la sincronización va por detrás. Si falla, se queda marcado como
pendiente y se sube solo al recuperar la conexión. Cerrar sesión tampoco borra nada de aquí.

`node scripts/check-nube.mjs` comprueba todo esto en navegador contra un Firebase simulado, sin
necesidad de una cuenta real.

## Publicarla e instalarla en el móvil

Se publica en **Netlify**, que construye la app al subir un cambio. Toda la configuración de la
construcción está en [`netlify.toml`](netlify.toml) —el comando, la carpeta, la versión de Node, el
redirect que hace falta para el enlace del correo y qué se cachea y qué no—, así que en el panel de
Netlify no hay que rellenar nada salvo las dos variables de la nube. Los pasos, en
[`docs/DESPLEGAR.md`](docs/DESPLEGAR.md).

Sigue existiendo el despliegue en **GitHub Pages** (`.github/workflows/deploy.yml`), que además pasa
los tests antes de publicar y activa Pages la primera vez (`enablement: true`). Se pueden tener los
dos a la vez: la app funciona en los dos sitios porque la ruta la decide `BASE_PATH` al construir
—en la raíz para Netlify, `/app-ejercicio/` para Pages—. Lo que hay que recordar teniendo los dos es
que son dos dominios distintos: los dos tienen que estar en la lista de dominios autorizados de
Firebase, y una sesión iniciada en uno no vale en el otro.

Ábrela en el móvil y añádela a la pantalla de inicio: en Android, menú de Chrome → «Instalar
aplicación»; en iPhone, Safari → compartir → «Añadir a pantalla de inicio». Queda con su icono, a
pantalla completa y funcionando sin conexión.

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # 482 tests: motor, catálogo, DHA, leptina, composición, tendencia, cambios, calendario, volumen, variantes, sesión mixta, músculos, foco por músculo, progresión de carga y migración
npm run build     # build de producción (PWA)
npm run preview   # servir la build
```

### Scripts auxiliares

- `node scripts/logo.mjs` — genera `public/icon.svg` y `public/marca.svg` (silueta de superelipse
  y símbolo).
- `node scripts/icons.mjs` — regenera los iconos PNG desde `public/icon.svg`.
- `node scripts/e2e-walkthrough.mjs` — recorrido completo automatizado con capturas.
  Requiere `npm run preview` en marcha; define `OUT_DIR` para el destino de las capturas.
- `node scripts/check-midnight.mjs` — comprueba el cambio de día falseando el reloj del navegador,
  con la app abierta y recuperándola de segundo plano.
- `node scripts/check-volumen.mjs` — siembra distintos historiales y comprueba en navegador que el
  nivel de volumen sube al asimilar, baja con la recuperación tocada, y se explica en cada caso.
- `node scripts/check-mixta.mjs` — siembra un día de cardio y comprueba que la sesión mixta conserva
  cardio, lo recorta, pone la fuerza delante y se puede deshacer.
- `node scripts/check-meter-pesas.mjs` — prepara la sesión de cardio y comprueba que desde el plan ya
  montado se pueden meter pesas elegidas por la app, con el cardio recortado.
- `node scripts/check-barra.mjs` — mide dónde queda la barra de navegación al principio, a mitad y al
  final del desplazamiento, en tres tamaños de móvil.
- `node scripts/check-migracion.mjs` — siembra datos en el formato viejo y comprueba que al abrir la
  app se migran solos, sin perder nada, marcando lo deducido y sin volver a cambiar al reabrir.
- `node scripts/comparar-motores.mjs` — genera seis meses de historial con las decisiones de la propia
  app y compara semana a semana lo que ve el motor viejo con lo que ve el nuevo.
- `node scripts/check-nube.mjs` — interceptando el tráfico a Firebase, comprueba pedir el enlace,
  canjear el testigo que vuelve en la URL, fusionar los datos de dos dispositivos sin perder nada,
  que lo borrado no resucite y que cerrar sesión no borre nada de aquí. Necesita una build hecha con
  `VITE_FIREBASE_API_KEY` y `VITE_FIREBASE_PROJECT_ID` puestas a cualquier valor.
- `node scripts/check-cardio.mjs` — comprueba que un día de cardio ofrece varias actividades, que cada
  una trae sus minutos equivalentes y que al cambiar se ajusta la dosis y se explica.
- `node scripts/check-molestias.mjs` — comprueba que en el test diario se pueden marcar varias zonas
  con molestias a la vez, que se guardan en el check-in y que la recomendación las deja fuera todas.
- `node scripts/check-cambiar.mjs` — comprueba que cambiar de ejercicio lo hace la app de un toque,
  que cada toque trae uno distinto, que el sustituto trabaja lo mismo y que la afinidad aprendida se
  guarda en el perfil.
- `node scripts/check-pantalla.mjs` — comprueba que en el móvil la escala está fijada, no hay rebote
  ni selección de texto y el documento no se desplaza; y que en el ordenador la barra pasa a ser
  lateral, el contenido aprovecha el ancho y las tarjetas independientes van en dos columnas.
- `node scripts/check-nivel.mjs` — comprueba que se puede saltar de nivel de volumen a mano, que la
  elección se guarda en el perfil y manda sobre lo calculado, que se puede deshacer y que la sesión
  que se construye trae de verdad ese volumen.
- `node scripts/check-carga.mjs` — comprueba en navegador que una sesión al tope del rango no sube el
  peso y la app lo dice, que dos seguidas sí y de forma proporcional, y que al llegar al tope del
  material la progresión cambia de palanca.
- `node scripts/medir-rampas.mjs` — mide las dos rampas tal y como están: cuánto sube la carga en
  porcentaje para distintos pesos, cuánto volumen semanal por músculo deja cada nivel y en cuántas
  semanas se completa la vuelta tras un parón. Con `MATRIZ=1` prueba además combinaciones de series,
  ejercicios y zonas, que es como se decidió que la rampa debía ensanchar en vez de concentrar. Solo
  mide, no cambia nada.
- `node scripts/check-foco.mjs` — simula seis meses dos veces cambiando solo quién elige los
  ejercicios (por zona o por músculo) y mide cuántas semanas pasa cada músculo bajo su mínimo. Falla
  si elegir por músculo deja de mejorar la cobertura.
- `node scripts/check-foco-ui.mjs` — con un historial de solo empujes, comprueba en navegador que la
  app propone lo que quedó a cero y lo explica nombrando el músculo.
- `node scripts/check-volumen-musculo.mjs` — comprueba la vista de volumen por músculo: las zonas, el
  desglose de directas e indirectas, los objetivos editables que se guardan en el perfil y la vista
  previa del impacto al añadir un ejercicio.
