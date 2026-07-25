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
   exposición solar, cetosis y molestias. De ahí sale un índice de disposición sobre 100.
3. **Recomendación** — reglas en cascada, de la más protectora a la más exigente. Cada
   recomendación viene con un «por qué» desplegable en lenguaje llano.
4. **Sesión** — ejercicios concretos con series, repeticiones, repeticiones en reserva, descanso
   y peso sugerido. Al terminar indicas cómo te sentiste, y eso ajusta las cargas de la próxima.
5. **Tu cuerpo** — balance muscular de 14 días, grupos cubiertos esta semana y calendario.

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
máximo. Y recuerda lo que la evidencia deja claro: ganar masa magra exige superávit energético y
proteína alta (1,6–2,2 g/kg, hasta 2,6 en recomposición).

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
[Entrenamiento concurrente](https://www.strongerbyscience.com/research-spotlight-interference-effect/)

Nada de esto sustituye el criterio de un profesional, y menos si hay lesiones o patologías de por
medio.

## Diseño

Superficies planas, una sola línea de acento, mucho aire. El color sigue la hora del día —
amanecer, día, atardecer, noche — y **por la noche la interfaz pasa a ámbar y baja el brillo**: la
app no debería ser la que te rompa la higiene lumínica que te está pidiendo respetar.

El lenguaje acompaña y nunca presiona. No hay rachas que romper ni notificaciones de culpa; hasta
el botón de cancelar dice «Hoy no puedo — descartar sin culpa».

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # 43 tests del motor de recomendación
npm run build     # build de producción (PWA)
npm run preview   # servir la build
```

### Scripts auxiliares

- `node scripts/icons.mjs` — regenera los iconos PNG desde `public/icon.svg`.
- `node scripts/e2e-walkthrough.mjs` — recorrido completo automatizado con capturas.
  Requiere `npm run preview` en marcha; define `OUT_DIR` para el destino de las capturas.
