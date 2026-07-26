/**
 * Ideas de comida completa cetogénica, de base animal.
 *
 * Reglas del catálogo:
 * - Sin frutos secos ni semillas de ningún tipo (hay un test que lo vigila).
 * - Protagonista siempre animal: huevos, carne, casquería, pescado, marisco o lácteos.
 * - La verdura, cuando aparece, es acompañamiento y nunca el plato. Ajo, perejil,
 *   limón y especias cuentan como condimento.
 * - Platos, no ingredientes: la idea es resolver «no sé qué comer» en un vistazo.
 */

export type MealBase = 'huevos' | 'carne' | 'pescado' | 'marisco' | 'lacteos' | 'dulce'
export type MealEffort = 'sin_cocinar' | 'rapido' | 'con_calma'

export const BASE_LABELS: Record<MealBase, string> = {
  huevos: 'Huevos',
  carne: 'Carne',
  pescado: 'Pescado',
  marisco: 'Marisco',
  lacteos: 'Lácteos',
  dulce: 'Capricho'
}

export const EFFORT_LABELS: Record<MealEffort, string> = {
  sin_cocinar: 'Sin cocinar',
  rapido: 'Menos de 15 min',
  con_calma: 'Con calma'
}

export interface Meal {
  id: string
  name: string
  base: MealBase
  effort: MealEffort
  ingredients: string[]
  steps: string
  /** Proteína aproximada por ración, en gramos. */
  proteinG: number
  /** false solo si lleva algún acompañamiento vegetal. */
  animalOnly: boolean
}

export const MEALS: Meal[] = [
  // ── Huevos ─────────────────────────────────────────────────
  {
    id: 'revuelto_curado',
    name: 'Revuelto cremoso con queso curado',
    base: 'huevos',
    effort: 'rapido',
    ingredients: ['4 huevos', 'Una nuez de mantequilla', 'Queso curado rallado', 'Sal'],
    steps: 'A fuego muy bajo y removiendo sin parar, para que queden cremosos. El queso, fuera del fuego.',
    proteinG: 32,
    animalOnly: true
  },
  {
    id: 'huevos_panceta',
    name: 'Huevos fritos en mantequilla con panceta',
    base: 'huevos',
    effort: 'rapido',
    ingredients: ['3 huevos', 'Panceta o bacon', 'Mantequilla', 'Sal en escamas'],
    steps: 'Dora la panceta primero y fríe los huevos en esa grasa con un extra de mantequilla, bañándolos con una cuchara.',
    proteinG: 34,
    animalOnly: true
  },
  {
    id: 'tortilla_jamon',
    name: 'Tortilla jugosa de jamón serrano',
    base: 'huevos',
    effort: 'rapido',
    ingredients: ['3 huevos', 'Jamón serrano en tiras', 'Mantequilla'],
    steps: 'Saltea el jamón medio minuto, añade el huevo batido y retírala cuando aún esté cremosa por dentro.',
    proteinG: 33,
    animalOnly: true
  },
  {
    id: 'huevos_mayonesa_anchoas',
    name: 'Huevos cocidos con mayonesa y anchoas',
    base: 'huevos',
    effort: 'sin_cocinar',
    ingredients: ['4 huevos cocidos', 'Mayonesa', 'Anchoas en aceite de oliva'],
    steps: 'Parte los huevos por la mitad, una cucharada de mayonesa y una anchoa encima de cada uno.',
    proteinG: 30,
    animalOnly: true
  },
  {
    id: 'huevos_carne_picada',
    name: 'Huevos sobre carne picada especiada',
    base: 'huevos',
    effort: 'rapido',
    ingredients: ['200 g de carne picada', '2 huevos', 'Pimentón y comino', 'Mantequilla'],
    steps: 'Dora la carne bien suelta con las especias, haz dos huecos y casca ahí los huevos. Tapa hasta que cuaje la clara.',
    proteinG: 48,
    animalOnly: true
  },
  {
    id: 'huevos_chorizo',
    name: 'Huevos rotos con chorizo',
    base: 'huevos',
    effort: 'rapido',
    ingredients: ['3 huevos', 'Chorizo en rodajas', 'Aceite de oliva'],
    steps: 'Fríe el chorizo hasta que suelte su grasa, añade los huevos y rómpelos en la sartén al retirar.',
    proteinG: 32,
    animalOnly: true
  },
  {
    id: 'huevos_salmon',
    name: 'Huevos escalfados sobre salmón ahumado',
    base: 'huevos',
    effort: 'rapido',
    ingredients: ['2 huevos', 'Salmón ahumado', 'Mantequilla derretida', 'Pimienta'],
    steps: 'Escalfa los huevos tres minutos en agua con un chorro de vinagre y sírvelos sobre las lonchas de salmón.',
    proteinG: 36,
    animalOnly: true
  },
  {
    id: 'huevos_al_plato',
    name: 'Huevos al plato con nata y queso',
    base: 'huevos',
    effort: 'con_calma',
    ingredients: ['3 huevos', 'Nata para cocinar', 'Queso rallado', 'Mantequilla'],
    steps: 'En una cazuelita untada de mantequilla, un fondo de nata, los huevos encima y el queso. Al horno 12 min a 180°.',
    proteinG: 31,
    animalOnly: true
  },

  // ── Carne ──────────────────────────────────────────────────
  {
    id: 'entrecot_mantequilla',
    name: 'Entrecot a la sartén con mantequilla',
    base: 'carne',
    effort: 'rapido',
    ingredients: ['Entrecot de ternera', 'Mantequilla', 'Ajo', 'Sal en escamas'],
    steps: 'Sartén muy caliente, dos minutos por cara. Baja el fuego, añade mantequilla y ajo y báñalo. Reposa 5 min antes de cortar.',
    proteinG: 52,
    animalOnly: true
  },
  {
    id: 'hamburguesa_queso',
    name: 'Hamburguesas de ternera con queso fundido',
    base: 'carne',
    effort: 'rapido',
    ingredients: ['300 g de carne picada de ternera', 'Queso en lonchas', 'Mantequilla', 'Sal'],
    steps: 'Forma dos hamburguesas sin apretarlas, sella a fuego fuerte y funde el queso encima con la sartén tapada.',
    proteinG: 55,
    animalOnly: true
  },
  {
    id: 'costillas_horno',
    name: 'Costillas de cerdo al horno',
    base: 'carne',
    effort: 'con_calma',
    ingredients: ['Costillar de cerdo', 'Pimentón', 'Ajo', 'Sal gruesa'],
    steps: 'Frota con las especias y hornea a 150° durante hora y media, tapado. Los últimos 15 min destapado para dorar.',
    proteinG: 50,
    animalOnly: true
  },
  {
    id: 'solomillo_nata',
    name: 'Solomillo con salsa de nata y pimienta',
    base: 'carne',
    effort: 'con_calma',
    ingredients: ['Solomillo de cerdo o ternera', 'Nata', 'Pimienta negra en grano', 'Mantequilla'],
    steps: 'Sella el solomillo y resérvalo. En la misma sartén, machaca la pimienta, añade nata y reduce. Devuelve la carne un minuto.',
    proteinG: 48,
    animalOnly: true
  },
  {
    id: 'pollo_asado',
    name: 'Pollo asado con la piel crujiente',
    base: 'carne',
    effort: 'con_calma',
    ingredients: ['Pollo entero o cuartos', 'Mantequilla', 'Sal', 'Romero'],
    steps: 'Unta con mantequilla bajo la piel y hornea a 200° unos 50 min, regándolo con su jugo dos o tres veces.',
    proteinG: 46,
    animalOnly: true
  },
  {
    id: 'muslos_sarten',
    name: 'Muslos de pollo a la sartén',
    base: 'carne',
    effort: 'rapido',
    ingredients: ['Muslos deshuesados con piel', 'Mantequilla', 'Ajo', 'Sal'],
    steps: 'Empieza con la piel hacia abajo en sartén fría y sube el fuego poco a poco: así queda crujiente sin quemarse.',
    proteinG: 42,
    animalOnly: true
  },
  {
    id: 'secreto_iberico',
    name: 'Secreto ibérico a la plancha',
    base: 'carne',
    effort: 'rapido',
    ingredients: ['Secreto ibérico', 'Sal en escamas', 'Pimienta'],
    steps: 'Plancha muy caliente y sin aceite: la propia grasa infiltrada basta. Dos minutos por cara y sal al final.',
    proteinG: 44,
    animalOnly: true
  },
  {
    id: 'albondigas_queso',
    name: 'Albóndigas rellenas de queso',
    base: 'carne',
    effort: 'con_calma',
    ingredients: ['Carne picada mixta', 'Queso en dados', 'Huevo', 'Especias'],
    steps: 'Mezcla la carne con el huevo, forma bolas con un dado de queso dentro y hornéalas 20 min a 190°.',
    proteinG: 47,
    animalOnly: true
  },
  {
    id: 'higado_encebollado',
    name: 'Hígado de ternera encebollado',
    base: 'carne',
    effort: 'rapido',
    ingredients: ['Hígado de ternera en filetes', 'Cebolla', 'Mantequilla', 'Sal'],
    steps: 'Pocha la cebolla despacio en mantequilla y sella el hígado un minuto por cara: si se pasa, se pone correoso.',
    proteinG: 45,
    animalOnly: false
  },
  {
    id: 'steak_tartar',
    name: 'Steak tartar',
    base: 'carne',
    effort: 'sin_cocinar',
    ingredients: ['Solomillo muy fresco picado a cuchillo', 'Yema de huevo', 'Mostaza', 'Alcaparras', 'Aceite de oliva'],
    steps: 'Mezcla todo con cuidado justo antes de comer y corona con la yema. Pide la carne al carnicero el mismo día.',
    proteinG: 40,
    animalOnly: false
  },
  {
    id: 'cordero_horno',
    name: 'Paletilla de cordero al horno',
    base: 'carne',
    effort: 'con_calma',
    ingredients: ['Paletilla de cordero', 'Manteca o mantequilla', 'Ajo', 'Sal gruesa'],
    steps: 'Hora y media a 160°, regando con su grasa. Sube a 220° cinco minutos para que quede dorada.',
    proteinG: 49,
    animalOnly: true
  },
  {
    id: 'carne_mechada',
    name: 'Carne guisada que aguanta toda la semana',
    base: 'carne',
    effort: 'con_calma',
    ingredients: ['1 kg de aguja o morcillo', 'Caldo de huesos', 'Pimentón', 'Ajo'],
    steps: 'Sella la carne por tandas, cúbrela con caldo y déjala dos horas a fuego mínimo. Cunde para tres o cuatro comidas.',
    proteinG: 52,
    animalOnly: true
  },

  // ── Pescado ────────────────────────────────────────────────
  {
    id: 'salmon_plancha',
    name: 'Salmón a la plancha con mantequilla',
    base: 'pescado',
    effort: 'rapido',
    ingredients: ['Lomo de salmón', 'Mantequilla', 'Limón', 'Sal'],
    steps: 'Piel hacia abajo cuatro minutos sin tocarlo, vuelta de un minuto y mantequilla al final.',
    proteinG: 40,
    animalOnly: true
  },
  {
    id: 'caballa_aceite',
    name: 'Caballa en aceite de oliva',
    base: 'pescado',
    effort: 'sin_cocinar',
    ingredients: ['Conserva de caballa en aceite de oliva', 'Huevo cocido', 'Pimentón'],
    steps: 'Directamente del bote, con un huevo cocido al lado y un golpe de pimentón. Comida completa en dos minutos.',
    proteinG: 36,
    animalOnly: true
  },
  {
    id: 'sardinas_plancha',
    name: 'Sardinas a la plancha',
    base: 'pescado',
    effort: 'rapido',
    ingredients: ['Sardinas frescas', 'Sal gruesa', 'Aceite de oliva'],
    steps: 'Plancha bien caliente, tres minutos por cara y sal gruesa. De lo más denso en nutrientes que hay.',
    proteinG: 38,
    animalOnly: true
  },
  {
    id: 'bacalao_nata',
    name: 'Bacalao gratinado con nata',
    base: 'pescado',
    effort: 'con_calma',
    ingredients: ['Lomos de bacalao desalado', 'Nata', 'Queso rallado', 'Ajo'],
    steps: 'Coloca el bacalao en una fuente, cubre con nata y queso y gratina 15 min a 200°.',
    proteinG: 44,
    animalOnly: true
  },
  {
    id: 'atun_plancha',
    name: 'Tataki de atún',
    base: 'pescado',
    effort: 'rapido',
    ingredients: ['Lomo de atún fresco', 'Aceite de oliva', 'Sal en escamas'],
    steps: 'Sella cuarenta segundos por cada cara en sartén muy caliente: crudo por dentro, dorado por fuera.',
    proteinG: 46,
    animalOnly: true
  },
  {
    id: 'boquerones_vinagre',
    name: 'Boquerones en vinagre con huevo',
    base: 'pescado',
    effort: 'sin_cocinar',
    ingredients: ['Boquerones en vinagre', 'Huevos cocidos', 'Aceite de oliva', 'Ajo y perejil'],
    steps: 'Todo en el plato, buen chorro de aceite por encima. Cero cocina.',
    proteinG: 34,
    animalOnly: true
  },
  {
    id: 'lubina_horno',
    name: 'Lubina al horno',
    base: 'pescado',
    effort: 'con_calma',
    ingredients: ['Lubina entera', 'Limón', 'Ajo', 'Aceite de oliva'],
    steps: 'Rellena la tripa con limón y ajo y hornea 20 min a 190°. Se sirve entera y se saca el lomo con una cuchara.',
    proteinG: 42,
    animalOnly: true
  },
  {
    id: 'anchoas_mantequilla',
    name: 'Anchoas con mantequilla',
    base: 'pescado',
    effort: 'sin_cocinar',
    ingredients: ['Anchoas del cantábrico', 'Mantequilla buena', 'Queso curado'],
    steps: 'Una lámina de mantequilla, la anchoa encima y una cuña de queso al lado. Comida pequeña pero muy densa.',
    proteinG: 26,
    animalOnly: true
  },
  {
    id: 'trucha_mantequilla',
    name: 'Trucha a la mantequilla negra',
    base: 'pescado',
    effort: 'rapido',
    ingredients: ['Trucha limpia', 'Mantequilla', 'Alcaparras', 'Limón'],
    steps: 'Haz la trucha en mantequilla, retírala y deja que la mantequilla se dore. Añade alcaparras y limón y viértelo encima.',
    proteinG: 40,
    animalOnly: false
  },

  // ── Marisco ────────────────────────────────────────────────
  {
    id: 'gambas_ajillo',
    name: 'Gambas al ajillo',
    base: 'marisco',
    effort: 'rapido',
    ingredients: ['Gambas peladas', 'Ajo laminado', 'Aceite de oliva', 'Guindilla'],
    steps: 'Dora el ajo a fuego medio, sube el fuego y echa las gambas. Un minuto y medio y fuera.',
    proteinG: 38,
    animalOnly: true
  },
  {
    id: 'mejillones_vapor',
    name: 'Mejillones al vapor',
    base: 'marisco',
    effort: 'rapido',
    ingredients: ['1 kg de mejillones', 'Limón', 'Laurel'],
    steps: 'Un dedo de agua en la olla, tapa y fuego fuerte hasta que se abran. El caldo que sueltan también se bebe.',
    proteinG: 36,
    animalOnly: true
  },
  {
    id: 'pulpo_aceite',
    name: 'Pulpo con aceite y pimentón',
    base: 'marisco',
    effort: 'sin_cocinar',
    ingredients: ['Pulpo ya cocido', 'Aceite de oliva virgen extra', 'Pimentón', 'Sal gruesa'],
    steps: 'Corta en rodajas, aceite generoso, pimentón y sal. Se compra cocido y se resuelve en un minuto.',
    proteinG: 34,
    animalOnly: true
  },
  {
    id: 'almejas_marinera',
    name: 'Almejas a la marinera',
    base: 'marisco',
    effort: 'rapido',
    ingredients: ['Almejas', 'Ajo', 'Perejil', 'Aceite de oliva'],
    steps: 'Sofríe ajo y perejil, añade las almejas y tapa hasta que abran. Descarta las que no se abran.',
    proteinG: 30,
    animalOnly: true
  },
  {
    id: 'calamares_plancha',
    name: 'Calamares a la plancha',
    base: 'marisco',
    effort: 'rapido',
    ingredients: ['Calamares limpios', 'Ajo', 'Perejil', 'Aceite de oliva'],
    steps: 'Plancha muy caliente y poco tiempo: o dos minutos o veinte, en el medio se quedan gomosos.',
    proteinG: 35,
    animalOnly: true
  },
  {
    id: 'langostinos_mayonesa',
    name: 'Langostinos cocidos con mayonesa',
    base: 'marisco',
    effort: 'sin_cocinar',
    ingredients: ['Langostinos cocidos', 'Mayonesa casera', 'Limón'],
    steps: 'Pelar y mojar. Si haces la mayonesa con huevo y aceite de oliva, mejor todavía.',
    proteinG: 32,
    animalOnly: true
  },
  {
    id: 'chipirones_encebollados',
    name: 'Chipirones encebollados',
    base: 'marisco',
    effort: 'con_calma',
    ingredients: ['Chipirones', 'Cebolla', 'Aceite de oliva', 'Sal'],
    steps: 'Pocha mucha cebolla a fuego lento hasta que esté melosa y añade los chipirones los últimos cinco minutos.',
    proteinG: 33,
    animalOnly: false
  },

  // ── Lácteos ────────────────────────────────────────────────
  {
    id: 'yogur_chocolate',
    name: 'Yogur griego con chocolate del 95 %',
    base: 'lacteos',
    effort: 'sin_cocinar',
    ingredients: ['Yogur griego natural entero', 'Onzas de chocolate 95 %', 'Canela'],
    steps: 'Ralla o pica el chocolate sobre el yogur y espolvorea canela. El clásico para cuando no apetece cocinar nada.',
    proteinG: 20,
    animalOnly: true
  },
  {
    id: 'yogur_canela',
    name: 'Yogur griego batido con canela',
    base: 'lacteos',
    effort: 'sin_cocinar',
    ingredients: ['Yogur griego', 'Canela', 'Un chorro de nata'],
    steps: 'Bátelo con la nata hasta que quede aireado, como una mousse. Textura de postre sin nada añadido.',
    proteinG: 18,
    animalOnly: true
  },
  {
    id: 'tabla_quesos',
    name: 'Tabla de quesos curados con jamón',
    base: 'lacteos',
    effort: 'sin_cocinar',
    ingredients: ['Quesos curados variados', 'Jamón ibérico', 'Aceitunas'],
    steps: 'Sacar del frigorífico veinte minutos antes para que el queso exprese. Cena resuelta sin encender el fuego.',
    proteinG: 35,
    animalOnly: false
  },
  {
    id: 'kefir_cacao',
    name: 'Kéfir con cacao puro',
    base: 'lacteos',
    effort: 'sin_cocinar',
    ingredients: ['Kéfir entero', 'Cacao puro desgrasado', 'Canela'],
    steps: 'Bate el cacao con el kéfir hasta que no queden grumos. Bueno para la microbiota y sacia bastante.',
    proteinG: 16,
    animalOnly: true
  },
  {
    id: 'requeson_nata',
    name: 'Requesón con nata y pimienta',
    base: 'lacteos',
    effort: 'sin_cocinar',
    ingredients: ['Requesón o queso fresco batido', 'Nata', 'Pimienta negra', 'Sal'],
    steps: 'Mezcla el requesón con un poco de nata y termina con pimienta recién molida. Versión salada, cunde mucho.',
    proteinG: 24,
    animalOnly: true
  },

  // ── Capricho ───────────────────────────────────────────────
  {
    id: 'chocolate_mantequilla',
    name: 'Chocolate del 95 % con mantequilla',
    base: 'dulce',
    effort: 'sin_cocinar',
    ingredients: ['Onzas de chocolate 95 %', 'Mantequilla buena', 'Sal en escamas'],
    steps: 'Una onza con una lámina fina de mantequilla y una pizca de sal encima. Suena raro y funciona.',
    proteinG: 4,
    animalOnly: true
  },
  {
    id: 'mousse_cacao',
    name: 'Mousse de nata y cacao',
    base: 'dulce',
    effort: 'rapido',
    ingredients: ['Nata para montar', 'Cacao puro', 'Canela'],
    steps: 'Monta la nata bien fría, incorpora el cacao con movimientos suaves y enfría media hora.',
    proteinG: 6,
    animalOnly: true
  },
  {
    id: 'chocolate_queso',
    name: 'Chocolate del 95 % con queso curado',
    base: 'dulce',
    effort: 'sin_cocinar',
    ingredients: ['Chocolate 95 %', 'Queso curado de oveja'],
    steps: 'Alterna un bocado de cada uno. La grasa del queso suaviza el amargor del cacao.',
    proteinG: 14,
    animalOnly: true
  },
  {
    id: 'crema_cacao_yogur',
    name: 'Crema espesa de cacao y yogur',
    base: 'dulce',
    effort: 'sin_cocinar',
    ingredients: ['Yogur griego', 'Cacao puro', 'Chocolate 95 % rallado', 'Canela'],
    steps: 'Bate el yogur con el cacao hasta que quede oscuro y denso, y ralla chocolate por encima.',
    proteinG: 19,
    animalOnly: true
  }
]

export function mealById(id: string): Meal | undefined {
  return MEALS.find((m) => m.id === id)
}

/** Filtra por base y esfuerzo; `null` significa «lo que sea». */
export function filterMeals(base: MealBase | null, effort: MealEffort | null): Meal[] {
  return MEALS.filter((m) => (base === null || m.base === base) && (effort === null || m.effort === effort))
}

/**
 * Sugiere un plato al azar dentro del filtro, evitando repetir el anterior.
 * Si el filtro solo deja un plato, lo devuelve igualmente.
 */
export function suggestMeal(
  base: MealBase | null,
  effort: MealEffort | null,
  previousId?: string,
  random: () => number = Math.random
): Meal | undefined {
  const pool = filterMeals(base, effort)
  if (pool.length === 0) return undefined
  const withoutPrevious = pool.filter((m) => m.id !== previousId)
  const candidates = withoutPrevious.length > 0 ? withoutPrevious : pool
  return candidates[Math.floor(random() * candidates.length) % candidates.length]
}
