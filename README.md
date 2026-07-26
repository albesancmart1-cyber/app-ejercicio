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
   recomendación viene con un «por qué» desplegable en lenguaje llano. Si te toca paseo pero te
   apetecen pesas, «Prefiero algo con pesas» te lo cambia por fuerza contenida: sube un escalón,
   pero nunca se acerca al fallo y sigue respetando tus molestias, las 48 h de recuperación y la
   rampa de vuelta tras un parón.
4. **Sesión** — ejercicios concretos con series, repeticiones, repeticiones en reserva, descanso y
   peso sugerido. Anotas **serie a serie** el peso y las repeticiones que has hecho de verdad, y al
   marcar una serie arranca solo el **temporizador de descanso**, que vibra al terminar.
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
sesiones de fuerza seguidas propone cardio a intensidad conversacional.

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

Superficies planas, una sola línea de acento, mucho aire. El color sigue la hora del día —
amanecer, día, atardecer, noche — y **por la noche la interfaz pasa a ámbar y baja el brillo**: la
app no debería ser la que te rompa la higiene lumínica que te está pidiendo respetar.

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
npm test          # 127 tests: motor, catálogo, DHA, leptina y composición corporal
npm run build     # build de producción (PWA)
npm run preview   # servir la build
```

### Scripts auxiliares

- `node scripts/icons.mjs` — regenera los iconos PNG desde `public/icon.svg`.
- `node scripts/e2e-walkthrough.mjs` — recorrido completo automatizado con capturas.
  Requiere `npm run preview` en marcha; define `OUT_DIR` para el destino de las capturas.
