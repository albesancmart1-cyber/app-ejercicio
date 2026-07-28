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
3. **Recomendación** — reglas en cascada, de la más protectora a la más exigente. Cada
   recomendación viene con un «por qué» desplegable en lenguaje llano. Y si lo que te toca no es lo
   que te apetece, decides tú entre tres caminos, con los mismos guardas puestos en los tres:
   dejarlo como está, **«pesas sin quitar el cardio»** (sesión mixta: fuerza primero y el cardio a
   la mitad) o **«prefiero algo con pesas»** (cambio completo a fuerza contenida). Ninguno se acerca
   al fallo, y todos siguen respetando tus molestias, las 48 h de recuperación y la rampa de vuelta
   tras un parón.
4. **Sesión** — primero ves el plan completo y lo ajustas con calma: **eliges de la lista** otro
   ejercicio si alguno no encaja, **añades** los que quieras, **reordenas**, y dices **cómo lo vas a
   hacer** (con mancuerna o polea, a un brazo o a dos). Al pulsar «empezar entrenamiento» arranca un
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

## Pesas y cardio el mismo día

La cascada decide qué le conviene hoy a tu cuerpo, pero hay días en que toca cardio y uno se nota
con cuerpo para levantar. Antes solo se podía cambiar una cosa por la otra; ahora se puede
**repartir**.

«Pesas sin quitar el cardio» monta una sesión mixta: unos pocos ejercicios de fuerza **primero** y
después el cardio, recortado a la mitad (`CARDIO_EN_SESION_MIXTA`, con un suelo de 10 min para que
siga siendo cardio y no un paseo hasta el coche). El botón dice de antemano en qué se traduce —«14
min en vez de 28»—, así que la decisión se toma con el dato delante.

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

## Cambiar un ejercicio, o añadir otro

Si un ejercicio no te sirve —no te gusta o no tienes con qué hacerlo—, **«Cambiar ejercicio» abre el
catálogo** y eliges tú, filtrando por grupo muscular o buscando por nombre; la búsqueda ignora las
tildes, así que «biceps» encuentra «bíceps». Hay también un botón para **añadir un ejercicio más** a
la sesión, que recibe exactamente el mismo trato que los propuestos: sus series, su peso sugerido y
su descanso.

Antes esto rotaba a ciegas por las alternativas, prefiriendo un patrón de movimiento distinto al que
descartabas. La idea era buena y sigue ahí para ordenar la lista (`alternativesFor`), pero como
único mecanismo fallaba: con pocas opciones en el grupo, tocar el botón iba y venía entre los dos
mismos ejercicios, que no es cambiar sino dar vueltas. Y el motivo real del cambio —el gimnasio
tiene la máquina ocupada, hoy te molesta un hombro— la app no lo puede adivinar.

Para que cambiar tenga a dónde ir, el catálogo es largo: **107 ejercicios**, con un mínimo de dos
opciones por grupo muscular aun entrenando solo con peso corporal, y con su patrón de movimiento
—y por tanto su animación— cada uno. Dos tests lo vigilan: que ningún ejercicio se quede sin patrón,
y que ningún grupo se quede corto.

El tamaño del catálogo viene además de un fallo real que apareció por el camino: el filtro de
material daba por disponible cualquier ejercicio que listara «peso corporal» aunque además
necesitara algo, y por eso proponía **subidas al cajón a quien no tiene cajón**. Ahora subidas al
cajón y fondos en banco exigen banco, y al corregirlo hubo que rellenar los huecos que dejaba.

## Tus favoritos

Una lista larga solo funciona si no hay que recorrerla cada día, y de eso se encargan los
**favoritos**: la estrella de cada línea los marca, y `pickForGroup` los antepone al proponer la
sesión. Como la regla de no repetir lo de la última sesión sigue después, lo que hace en la práctica
es **rotar entre tus favoritos** en vez de caer siempre en el mismo. Se gestionan desde la propia
lista o desde Ajustes, y marcar algo como favorito lo saca de los descartados.

Descartar es una decisión aparte de cambiar: **«No me lo propongas más»** es un botón propio. Antes
cambiar un ejercicio lo descartaba para siempre de callado, que no es lo mismo que «hoy no me
apetece». Los descartados se recuperan en Ajustes, y si excluirlos dejara un grupo sin nada, se
ignora la lista antes que dejar la sesión coja.

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

Al registrar las repeticiones reales, la app aplica **doble progresión**, que es el método estándar:
si completas todas las series en el tope del rango prescrito, sube el peso; si alguna se queda por
debajo del mínimo, lo mantiene; en medio, progresa suave. Las repeticiones registradas mandan sobre
la sensación porque son dato objetivo — puedes haber acabado cómodo y aun así no haber llegado al
rango. Si no anotas repeticiones, se guía por la sensación como hacía antes.

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

Las palancas se usan en el orden que menos estrés añade por unidad de estímulo:

| Nivel | Series | Ejercicios | Repeticiones | Qué añade |
| ----- | ------ | ---------- | ------------ | --------- |
| 1 | 3 | 4 | rango normal | Volumen base |
| 2 | 4 | 4 | rango normal | Una serie más por ejercicio |
| 3 | 4 | 5 | rango normal | Un ejercicio más por sesión |
| 4 | 4 | 5 | rango desplazado (+4) | Cambio de estímulo con el mismo volumen |

Cada escalón pide **6 sesiones limpias**: a dos entrenos por semana son unas tres semanas por nivel,
tiempo de sobra para que se note si el volumen anterior se estaba asimilando de verdad. En fuerza el
grupo prioritario se dobla, así que en el nivel 4 recibe unas 8 series por sesión, dentro de la banda
de 10–20 semanales que maximiza la hipertrofia sin pasarse (`WEEKLY_SETS.techo`).

Nada de esto pasa en silencio: la pantalla de hoy muestra un bloque **«Volumen · nivel N de 4»** con
**qué cambia** respecto al volumen base —acumulado, no solo el último escalón— **por qué** se está en
ese nivel y **en qué me baso** (cuántas sesiones salieron limpias, qué dice la composición, qué dice
la leptina). Si el nivel baja, también se dice y se explica.

Dos cosas siguen mandando por encima del nivel alcanzado: la **rampa de vuelta tras un parón**, que
recorta las series igual (nivel 4 al 50 % son 2 series), y el **tope de estrés** de la sesión. Y pedir
pesas un día que tocaba paseo conserva el nivel: lo que el cuerpo lleva demostrando no se borra por
cambiar de plan.

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

## Instalarla en el móvil

Cada subida a la rama principal despliega la app sola en GitHub Pages
(`.github/workflows/deploy.yml`), y solo publica si los tests pasan. La URL es
**https://albesancmart1-cyber.github.io/app-ejercicio/**.

Ábrela ahí en el móvil y añádela a la pantalla de inicio: en Android, menú de Chrome → «Instalar
aplicación»; en iPhone, Safari → compartir → «Añadir a pantalla de inicio». Queda con su icono, a
pantalla completa y funcionando sin conexión.

El propio workflow activa Pages la primera vez (`enablement: true`), así que no hace falta tocar
nada en los ajustes del repositorio.

En local la app se sirve en la raíz y en Pages bajo `/app-ejercicio/`. Lo controla `BASE_PATH` en
`vite.config.ts`, que el workflow define al construir.

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # 237 tests: motor, catálogo, DHA, leptina, composición, tendencia, cambios, calendario, volumen, variantes y sesión mixta
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
