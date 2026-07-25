# Ritmo 🌅

Entrenar sin estrés, al ritmo de tu cuerpo.

Ritmo es una app de entrenamiento que entiende el cuerpo como un todo. No impone un plan rígido:
escucha cómo estás cada día y te recomienda el entreno que más te conviene — fuerza, cardio o
descanso — manteniendo todos los grupos musculares en equilibrio. El ejercicio como complemento
de los hábitos fundamentales (ritmos circadianos, exposición solar, buen descanso), no como una
obligación más.

## Cómo funciona

1. **Perfil**: tu objetivo (masa muscular, tonificar o recomposición), tu equipamiento disponible
   y hasta qué peso llegas con él. Solo se te proponen ejercicios que puedas hacer.
2. **Check-in diario** (menos de 30 segundos): sueño, higiene lumínica, amanecer, atardecer, sol,
   alimentación cetogénica, energía y molestias.
3. **Recomendación**: un motor de reglas decide qué le conviene hoy a tu cuerpo:
   - Más de 10 días parado → reacondicionamiento suave (cardio tranquilo o full-body ligero).
   - Mal descanso o poca energía → descanso activo, nunca fuerza intensa.
   - Varias sesiones de fuerza seguidas → cardio para dar aire al corazón.
   - Si estás receptivo → fuerza priorizando los grupos menos trabajados en los últimos 14 días.
4. **Sesión**: ejercicios concretos con series, repeticiones y peso sugerido (progresión suave a
   partir de tus últimos registros). Marca lo que hagas; descartar también es una opción sin culpa.
5. **Tu cuerpo**: balance muscular de 14 días y calendario sereno de las últimas 4 semanas.

Los datos viven solo en tu dispositivo (localStorage), con exportación e importación de copias
de seguridad desde Ajustes.

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # tests del motor de recomendación
npm run build     # build de producción (PWA instalable)
npm run preview   # servir la build
```

Es una PWA: al servirla con HTTPS puede instalarse en el móvil ("Añadir a pantalla de inicio")
y funciona sin conexión.

### Scripts auxiliares

- `node scripts/icons.mjs` — regenera los iconos PNG a partir de `public/icon.svg`.
- `node scripts/e2e-walkthrough.mjs` — recorrido completo automatizado con capturas
  (requiere `npm run preview` en marcha y define `OUT_DIR` para las capturas).
