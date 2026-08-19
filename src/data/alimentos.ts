/**
 * El catálogo de alimentos básicos.
 *
 * Alimentos **naturales y de verdad** — un entrecot, un salmón, un melocotón—,
 * no productos: aquí no hay pizzas, ni códigos de barras, ni «pollo fileteado
 * adobado». Si algo necesita lista de ingredientes, no es de esta lista.
 *
 * Cada alimento viene ya interpretado, que es para lo que existe el catálogo:
 * sus etiquetas puestas (proteína animal, pescado azul con su omega-3/DHA,
 * huevos, verdura, carbohidrato, mucha sal, alcohol), sus **gramos de
 * carbohidrato por cada 100 g** —aproximados, y con eso basta: sirven para
 * contar el margen de cetosis, no para una analítica— y, cuando lleva
 * carbohidrato, su **calidad**: el de una fruta o la miel («bueno») no es el
 * de un plato de macarrones («malo» = refinado, de pico rápido).
 *
 * Nada de calorías, por diseño: la app cree en la señal de leptina, y lo que
 * cuenta es qué se come, cuándo y de qué tipo.
 *
 * Todo es **editable por el usuario**: si un atributo no le cuadra, su edición
 * se guarda aparte (`EdicionAlimento`) y pisa a lo de fábrica — el catálogo
 * puede mejorar de versión en versión sin machacar lo que él corrigió.
 */
import type { CalidadCarbo, EdicionAlimento, EtiquetaComida } from '../domain/types'

export type CategoriaAlimento =
  | 'carne'
  | 'embutido'
  | 'pescado'
  | 'marisco'
  | 'huevos'
  | 'lacteos'
  | 'fruta'
  | 'verdura'
  | 'tuberculo_cereal'
  | 'legumbre'
  | 'frutos_secos'
  | 'grasas'
  | 'dulce_natural'
  | 'bebida'

export const CATEGORIA_LABELS: Record<CategoriaAlimento, string> = {
  carne: 'Carne',
  embutido: 'Embutidos y curados',
  pescado: 'Pescado',
  marisco: 'Marisco',
  huevos: 'Huevos',
  lacteos: 'Lácteos y quesos',
  fruta: 'Fruta',
  verdura: 'Verdura',
  tuberculo_cereal: 'Tubérculos y cereales',
  legumbre: 'Legumbres',
  frutos_secos: 'Frutos secos y semillas',
  grasas: 'Grasas',
  dulce_natural: 'Dulces naturales',
  bebida: 'Bebidas'
}

export interface AlimentoBasico {
  id: string
  nombre: string
  categoria: CategoriaAlimento
  etiquetas: EtiquetaComida[]
  /** Gramos de carbohidrato por 100 g, aproximados. Ausente = despreciable. */
  carbosPor100?: number
  /** Calidad del carbohidrato, cuando lo lleva. */
  carbo?: CalidadCarbo
}

/** Atajo de escritura del catálogo. */
function a(
  id: string,
  nombre: string,
  categoria: CategoriaAlimento,
  etiquetas: EtiquetaComida[],
  carbosPor100?: number,
  carbo?: CalidadCarbo
): AlimentoBasico {
  return {
    id,
    nombre,
    categoria,
    etiquetas,
    ...(carbosPor100 !== undefined ? { carbosPor100 } : {}),
    ...(carbo !== undefined ? { carbo } : {})
  }
}

const P: EtiquetaComida[] = ['proteina']
const AZUL: EtiquetaComida[] = ['proteina', 'pescado_azul']
const SAL: EtiquetaComida[] = ['proteina', 'salada']

export const ALIMENTOS: AlimentoBasico[] = [
  // ── Carne ─────────────────────────────────────────────────
  a('ternera_filete', 'Filete de ternera', 'carne', P),
  a('ternera_entrecot', 'Entrecot de vaca', 'carne', P),
  a('ternera_chuleta', 'Chuleta de vaca', 'carne', P),
  a('ternera_chuleton', 'Chuletón', 'carne', P),
  a('ternera_solomillo', 'Solomillo de ternera', 'carne', P),
  a('ternera_picada', 'Carne picada de ternera', 'carne', P),
  a('ternera_hamburguesa', 'Hamburguesa de ternera (carne sola)', 'carne', P),
  a('ternera_higado', 'Hígado de ternera', 'carne', P, 4, 'bueno'),
  a('ternera_rabo', 'Rabo de toro', 'carne', P),
  a('ternera_carrillera', 'Carrillera de ternera', 'carne', P),
  a('cerdo_lomo', 'Lomo de cerdo', 'carne', P),
  a('cerdo_chuleta', 'Chuleta de cerdo', 'carne', P),
  a('cerdo_solomillo', 'Solomillo de cerdo', 'carne', P),
  a('cerdo_costillas', 'Costillas de cerdo', 'carne', P),
  a('cerdo_panceta', 'Panceta fresca', 'carne', P),
  a('cerdo_secreto', 'Secreto ibérico', 'carne', P),
  a('cerdo_presa', 'Presa ibérica', 'carne', P),
  a('cerdo_picada', 'Carne picada de cerdo', 'carne', P),
  a('picada_mixta', 'Carne picada mixta', 'carne', P),
  a('pollo_pechuga', 'Pechuga de pollo', 'carne', P),
  a('pollo_muslo', 'Muslo de pollo', 'carne', P),
  a('pollo_contramuslo', 'Contramuslo de pollo', 'carne', P),
  a('pollo_alitas', 'Alitas de pollo', 'carne', P),
  a('pollo_entero', 'Pollo asado (entero)', 'carne', P),
  a('pollo_higaditos', 'Higaditos de pollo', 'carne', P),
  a('pavo_pechuga', 'Pechuga de pavo fresca', 'carne', P),
  a('pavo_picada', 'Carne picada de pavo', 'carne', P),
  a('cordero_chuletillas', 'Chuletillas de cordero', 'carne', P),
  a('cordero_pierna', 'Pierna de cordero', 'carne', P),
  a('cordero_paletilla', 'Paletilla de cordero', 'carne', P),
  a('conejo', 'Conejo', 'carne', P),
  a('codorniz', 'Codorniz', 'carne', P),
  a('pato_magret', 'Magret de pato', 'carne', P),

  // ── Embutidos y curados ───────────────────────────────────
  a('jamon_serrano', 'Jamón serrano en lonchas', 'embutido', SAL),
  a('jamon_iberico', 'Jamón ibérico', 'embutido', SAL),
  a('jamon_cocido', 'Jamón cocido', 'embutido', SAL, 1),
  a('lomo_embuchado', 'Lomo embuchado', 'embutido', SAL),
  a('cecina', 'Cecina', 'embutido', SAL),
  a('chorizo', 'Chorizo', 'embutido', SAL, 2),
  a('salchichon', 'Salchichón', 'embutido', SAL, 2),
  a('fuet', 'Fuet', 'embutido', SAL, 2),
  a('sobrasada', 'Sobrasada', 'embutido', SAL, 2),
  a('bacon', 'Bacon', 'embutido', SAL),
  a('morcilla', 'Morcilla de arroz', 'embutido', ['proteina', 'salada', 'carbohidrato'], 20, 'malo'),
  a('pavo_lonchas', 'Pechuga de pavo en lonchas', 'embutido', SAL, 2),

  // ── Pescado ───────────────────────────────────────────────
  a('salmon', 'Salmón', 'pescado', AZUL),
  a('salmon_ahumado', 'Salmón ahumado', 'pescado', ['proteina', 'pescado_azul', 'salada']),
  a('atun_filete', 'Filete de atún', 'pescado', AZUL),
  a('atun_lata_natural', 'Atún en lata al natural', 'pescado', ['proteina', 'pescado_azul', 'salada']),
  a('atun_lata_aceite', 'Atún en lata en aceite de oliva', 'pescado', ['proteina', 'pescado_azul', 'salada']),
  a('bonito', 'Bonito del norte', 'pescado', AZUL),
  a('sardinas', 'Sardinas', 'pescado', AZUL),
  a('sardinas_lata', 'Sardinas en lata', 'pescado', ['proteina', 'pescado_azul', 'salada']),
  a('boquerones', 'Boquerones', 'pescado', AZUL),
  a('boquerones_vinagre', 'Boquerones en vinagre', 'pescado', ['proteina', 'pescado_azul', 'salada']),
  a('anchoas', 'Anchoas en salazón', 'pescado', ['proteina', 'pescado_azul', 'salada']),
  a('caballa', 'Caballa', 'pescado', AZUL),
  a('caballa_lata', 'Caballa en lata', 'pescado', ['proteina', 'pescado_azul', 'salada']),
  a('jurel', 'Jurel (chicharro)', 'pescado', AZUL),
  a('arenque', 'Arenque', 'pescado', AZUL),
  a('trucha', 'Trucha', 'pescado', AZUL),
  a('pez_espada', 'Pez espada (emperador)', 'pescado', P),
  a('salmonete', 'Salmonete', 'pescado', AZUL),
  a('bacalao_fresco', 'Bacalao fresco', 'pescado', P),
  a('bacalao_salado', 'Bacalao en salazón (desalado)', 'pescado', SAL),
  a('merluza', 'Merluza', 'pescado', P),
  a('lubina', 'Lubina', 'pescado', P),
  a('dorada', 'Dorada', 'pescado', P),
  a('rape', 'Rape', 'pescado', P),
  a('lenguado', 'Lenguado', 'pescado', P),
  a('rodaballo', 'Rodaballo', 'pescado', P),
  a('besugo', 'Besugo', 'pescado', P),
  a('corvina', 'Corvina', 'pescado', P),
  a('huevas_pescado', 'Huevas de pescado', 'pescado', AZUL),

  // ── Marisco ───────────────────────────────────────────────
  a('calamar', 'Calamar', 'marisco', P, 3),
  a('sepia', 'Sepia', 'marisco', P, 1),
  a('pulpo', 'Pulpo', 'marisco', P, 2),
  a('gambas', 'Gambas', 'marisco', P),
  a('langostinos', 'Langostinos', 'marisco', P),
  a('cigalas', 'Cigalas', 'marisco', P),
  a('mejillones', 'Mejillones al vapor', 'marisco', ['proteina', 'pescado_azul'], 4),
  a('almejas', 'Almejas', 'marisco', P, 2),
  a('berberechos', 'Berberechos', 'marisco', ['proteina', 'salada'], 2),
  a('ostras', 'Ostras', 'marisco', P, 3),
  a('vieiras', 'Vieiras', 'marisco', P, 3),
  a('navajas', 'Navajas', 'marisco', P, 2),
  a('necora', 'Nécora / cangrejo', 'marisco', P),
  a('bogavante', 'Bogavante', 'marisco', P),
  a('percebes', 'Percebes', 'marisco', P),

  // ── Huevos ────────────────────────────────────────────────
  a('huevo_cocido', 'Huevo cocido', 'huevos', ['proteina', 'huevos']),
  a('huevo_frito', 'Huevo frito', 'huevos', ['proteina', 'huevos']),
  a('huevo_revuelto', 'Huevos revueltos', 'huevos', ['proteina', 'huevos']),
  a('huevo_plancha', 'Huevo a la plancha', 'huevos', ['proteina', 'huevos']),
  a('tortilla_francesa', 'Tortilla francesa', 'huevos', ['proteina', 'huevos']),
  a('claras', 'Claras de huevo', 'huevos', ['proteina', 'huevos']),
  a('yema', 'Yema de huevo', 'huevos', ['proteina', 'huevos']),
  a('huevo_codorniz', 'Huevos de codorniz', 'huevos', ['proteina', 'huevos']),

  // ── Lácteos y quesos ──────────────────────────────────────
  a('yogur_griego', 'Yogur griego natural', 'lacteos', P, 5, 'bueno'),
  a('yogur_natural', 'Yogur natural', 'lacteos', P, 6, 'bueno'),
  a('kefir', 'Kéfir', 'lacteos', P, 5, 'bueno'),
  a('queso_cabra', 'Queso de cabra', 'lacteos', P, 2),
  a('queso_cabra_rulo', 'Rulo de cabra', 'lacteos', P, 3),
  a('queso_oveja', 'Queso de oveja curado', 'lacteos', SAL, 1),
  a('queso_oveja_lonchas', 'Queso de oveja en lonchas', 'lacteos', SAL, 1),
  a('queso_vaca', 'Queso de vaca curado', 'lacteos', SAL, 1),
  a('queso_manchego', 'Queso manchego', 'lacteos', SAL, 1),
  a('queso_parmesano', 'Parmesano', 'lacteos', SAL),
  a('queso_azul', 'Queso azul', 'lacteos', SAL, 2),
  a('mozzarella', 'Mozzarella en lonchas', 'lacteos', P, 2),
  a('mozzarella_fresca', 'Mozzarella fresca (bola)', 'lacteos', P, 3),
  a('burrata', 'Burrata', 'lacteos', P, 3),
  a('queso_fresco', 'Queso fresco', 'lacteos', P, 3),
  a('requeson', 'Requesón', 'lacteos', P, 4),
  a('queso_cottage', 'Queso cottage', 'lacteos', P, 3),
  a('leche_entera', 'Leche entera', 'lacteos', P, 5, 'bueno'),
  a('nata', 'Nata para montar', 'lacteos', [], 3),
  a('mantequilla', 'Mantequilla', 'grasas', []),
  a('ghee', 'Ghee (mantequilla clarificada)', 'grasas', []),

  // ── Fruta ─────────────────────────────────────────────────
  a('sandia', 'Sandía', 'fruta', ['carbohidrato'], 8, 'bueno'),
  a('melon', 'Melón', 'fruta', ['carbohidrato'], 8, 'bueno'),
  a('melocoton', 'Melocotón', 'fruta', ['carbohidrato'], 9, 'bueno'),
  a('nectarina', 'Nectarina', 'fruta', ['carbohidrato'], 9, 'bueno'),
  a('paraguaya', 'Paraguaya', 'fruta', ['carbohidrato'], 9, 'bueno'),
  a('albaricoque', 'Albaricoque', 'fruta', ['carbohidrato'], 9, 'bueno'),
  a('ciruela', 'Ciruela', 'fruta', ['carbohidrato'], 10, 'bueno'),
  a('cereza', 'Cerezas', 'fruta', ['carbohidrato'], 14, 'bueno'),
  a('fresa', 'Fresas', 'fruta', ['carbohidrato'], 6, 'bueno'),
  a('frambuesa', 'Frambuesas', 'fruta', ['carbohidrato'], 6, 'bueno'),
  a('arandano', 'Arándanos', 'fruta', ['carbohidrato'], 12, 'bueno'),
  a('mora', 'Moras', 'fruta', ['carbohidrato'], 8, 'bueno'),
  a('platano', 'Plátano', 'fruta', ['carbohidrato'], 21, 'bueno'),
  a('manzana', 'Manzana', 'fruta', ['carbohidrato'], 12, 'bueno'),
  a('pera', 'Pera', 'fruta', ['carbohidrato'], 12, 'bueno'),
  a('naranja', 'Naranja', 'fruta', ['carbohidrato'], 9, 'bueno'),
  a('mandarina', 'Mandarina', 'fruta', ['carbohidrato'], 10, 'bueno'),
  a('kiwi', 'Kiwi', 'fruta', ['carbohidrato'], 11, 'bueno'),
  a('pina', 'Piña', 'fruta', ['carbohidrato'], 11, 'bueno'),
  a('mango', 'Mango', 'fruta', ['carbohidrato'], 13, 'bueno'),
  a('uvas', 'Uvas', 'fruta', ['carbohidrato'], 16, 'bueno'),
  a('granada', 'Granada', 'fruta', ['carbohidrato'], 14, 'bueno'),
  a('higo', 'Higos', 'fruta', ['carbohidrato'], 16, 'bueno'),
  a('caqui', 'Caqui', 'fruta', ['carbohidrato'], 17, 'bueno'),
  a('chirimoya', 'Chirimoya', 'fruta', ['carbohidrato'], 18, 'bueno'),
  a('nispero', 'Níspero', 'fruta', ['carbohidrato'], 10, 'bueno'),
  a('limon', 'Limón', 'fruta', [], 3, 'bueno'),
  a('aguacate', 'Aguacate', 'grasas', [], 2),
  a('coco', 'Coco fresco', 'grasas', [], 6),

  // ── Verdura ───────────────────────────────────────────────
  a('tomate', 'Tomate', 'verdura', ['verdura'], 3, 'bueno'),
  a('tomate_cherry', 'Tomates cherry', 'verdura', ['verdura'], 4, 'bueno'),
  a('tomate_frito_casero', 'Tomate frito casero', 'verdura', ['verdura'], 7, 'bueno'),
  a('lechuga', 'Lechuga', 'verdura', ['verdura'], 1),
  a('espinacas', 'Espinacas', 'verdura', ['verdura'], 1),
  a('acelgas', 'Acelgas', 'verdura', ['verdura'], 2),
  a('brocoli', 'Brócoli', 'verdura', ['verdura'], 4, 'bueno'),
  a('coliflor', 'Coliflor', 'verdura', ['verdura'], 4, 'bueno'),
  a('calabacin', 'Calabacín', 'verdura', ['verdura'], 3, 'bueno'),
  a('berenjena', 'Berenjena', 'verdura', ['verdura'], 5, 'bueno'),
  a('pimiento', 'Pimiento', 'verdura', ['verdura'], 5, 'bueno'),
  a('cebolla', 'Cebolla', 'verdura', ['verdura'], 8, 'bueno'),
  a('ajo', 'Ajo', 'verdura', ['verdura'], 28, 'bueno'),
  a('puerro', 'Puerro', 'verdura', ['verdura'], 8, 'bueno'),
  a('judias_verdes', 'Judías verdes', 'verdura', ['verdura'], 5, 'bueno'),
  a('esparragos', 'Espárragos', 'verdura', ['verdura'], 2),
  a('esparragos_lata', 'Espárragos en conserva', 'verdura', ['verdura', 'salada'], 2),
  a('alcachofa', 'Alcachofa', 'verdura', ['verdura'], 6, 'bueno'),
  a('champinones', 'Champiñones', 'verdura', ['verdura'], 3),
  a('setas', 'Setas', 'verdura', ['verdura'], 3),
  a('pepino', 'Pepino', 'verdura', ['verdura'], 3),
  a('zanahoria', 'Zanahoria', 'verdura', ['verdura'], 8, 'bueno'),
  a('calabaza', 'Calabaza', 'verdura', ['verdura'], 6, 'bueno'),
  a('remolacha', 'Remolacha', 'verdura', ['verdura'], 9, 'bueno'),
  a('col', 'Col / repollo', 'verdura', ['verdura'], 4, 'bueno'),
  a('coles_bruselas', 'Coles de Bruselas', 'verdura', ['verdura'], 6, 'bueno'),
  a('kale', 'Kale', 'verdura', ['verdura'], 4, 'bueno'),
  a('rucula', 'Rúcula', 'verdura', ['verdura'], 2),
  a('canonigos', 'Canónigos', 'verdura', ['verdura'], 1),
  a('apio', 'Apio', 'verdura', ['verdura'], 2),
  a('hinojo', 'Hinojo', 'verdura', ['verdura'], 4),
  a('rabanos', 'Rábanos', 'verdura', ['verdura'], 2),
  a('endibias', 'Endibias', 'verdura', ['verdura'], 2),
  a('aceitunas', 'Aceitunas', 'grasas', ['salada'], 4),
  a('pepinillos', 'Pepinillos en vinagre', 'verdura', ['verdura', 'salada'], 2),

  // ── Tubérculos y cereales ─────────────────────────────────
  a('patata_cocida', 'Patata cocida', 'tuberculo_cereal', ['carbohidrato'], 17, 'bueno'),
  a('patata_asada', 'Patata asada', 'tuberculo_cereal', ['carbohidrato'], 20, 'bueno'),
  a('patatas_fritas_caseras', 'Patatas fritas caseras', 'tuberculo_cereal', ['carbohidrato'], 30, 'malo'),
  a('boniato', 'Boniato', 'tuberculo_cereal', ['carbohidrato'], 20, 'bueno'),
  a('yuca', 'Yuca', 'tuberculo_cereal', ['carbohidrato'], 38, 'bueno'),
  a('arroz_blanco', 'Arroz blanco cocido', 'tuberculo_cereal', ['carbohidrato'], 28, 'malo'),
  a('arroz_integral', 'Arroz integral cocido', 'tuberculo_cereal', ['carbohidrato'], 25, 'bueno'),
  a('pasta', 'Pasta / macarrones cocidos', 'tuberculo_cereal', ['carbohidrato'], 30, 'malo'),
  a('pan_blanco', 'Pan blanco', 'tuberculo_cereal', ['carbohidrato', 'salada'], 50, 'malo'),
  a('pan_integral', 'Pan integral de verdad', 'tuberculo_cereal', ['carbohidrato'], 43, 'bueno'),
  a('avena', 'Copos de avena', 'tuberculo_cereal', ['carbohidrato'], 60, 'bueno'),
  a('quinoa', 'Quinoa cocida', 'tuberculo_cereal', ['carbohidrato'], 21, 'bueno'),
  a('cuscus', 'Cuscús cocido', 'tuberculo_cereal', ['carbohidrato'], 23, 'malo'),
  a('maiz', 'Maíz', 'tuberculo_cereal', ['carbohidrato'], 19, 'bueno'),
  a('palomitas_caseras', 'Palomitas caseras', 'tuberculo_cereal', ['carbohidrato', 'salada'], 74, 'malo'),

  // ── Legumbres ─────────────────────────────────────────────
  a('lentejas', 'Lentejas cocidas', 'legumbre', ['proteina', 'carbohidrato'], 17, 'bueno'),
  a('garbanzos', 'Garbanzos cocidos', 'legumbre', ['proteina', 'carbohidrato'], 21, 'bueno'),
  a('alubias', 'Alubias cocidas', 'legumbre', ['proteina', 'carbohidrato'], 16, 'bueno'),
  a('guisantes', 'Guisantes', 'legumbre', ['verdura', 'carbohidrato'], 10, 'bueno'),
  a('habas', 'Habas', 'legumbre', ['verdura', 'carbohidrato'], 10, 'bueno'),
  a('edamame', 'Edamame', 'legumbre', ['proteina', 'carbohidrato'], 7, 'bueno'),

  // ── Frutos secos y semillas ───────────────────────────────
  a('nueces', 'Nueces', 'frutos_secos', [], 7),
  a('almendras', 'Almendras', 'frutos_secos', [], 7),
  a('avellanas', 'Avellanas', 'frutos_secos', [], 7),
  a('anacardos', 'Anacardos', 'frutos_secos', ['carbohidrato'], 27, 'bueno'),
  a('pistachos', 'Pistachos', 'frutos_secos', ['carbohidrato'], 18, 'bueno'),
  a('cacahuetes', 'Cacahuetes', 'frutos_secos', [], 8),
  a('cacahuetes_saladas', 'Cacahuetes salados', 'frutos_secos', ['salada'], 8),
  a('macadamias', 'Nueces de macadamia', 'frutos_secos', [], 5),
  a('pinones', 'Piñones', 'frutos_secos', [], 9),
  a('semillas_chia', 'Semillas de chía', 'frutos_secos', [], 8),
  a('semillas_lino', 'Semillas de lino', 'frutos_secos', [], 2),
  a('pipas_calabaza', 'Pipas de calabaza', 'frutos_secos', [], 11),
  a('pipas_girasol', 'Pipas de girasol', 'frutos_secos', [], 12),
  a('crema_cacahuete', 'Crema de cacahuete 100 %', 'frutos_secos', [], 12),
  a('crema_almendra', 'Crema de almendra 100 %', 'frutos_secos', [], 9),

  // ── Grasas ────────────────────────────────────────────────
  a('aceite_oliva', 'Aceite de oliva virgen extra', 'grasas', []),
  a('aceite_coco', 'Aceite de coco', 'grasas', []),

  // ── Dulces naturales ──────────────────────────────────────
  a('miel', 'Miel', 'dulce_natural', ['carbohidrato'], 80, 'bueno'),
  a('chocolate_95', 'Chocolate negro 95 %', 'dulce_natural', [], 14, 'bueno'),
  a('chocolate_85', 'Chocolate negro 85 %', 'dulce_natural', ['carbohidrato'], 19, 'bueno'),
  a('chocolate_70', 'Chocolate negro 70 %', 'dulce_natural', ['carbohidrato'], 32, 'malo'),
  a('cacao_puro', 'Cacao puro en polvo', 'dulce_natural', [], 12, 'bueno'),
  a('datiles', 'Dátiles', 'dulce_natural', ['carbohidrato'], 66, 'bueno'),
  a('pasas', 'Pasas', 'dulce_natural', ['carbohidrato'], 66, 'bueno'),
  a('orejones', 'Orejones de albaricoque', 'dulce_natural', ['carbohidrato'], 55, 'bueno'),
  a('coco_rallado', 'Coco rallado', 'dulce_natural', [], 7),

  // ── Bebidas ───────────────────────────────────────────────
  a('cafe', 'Café solo', 'bebida', []),
  a('cafe_leche', 'Café con leche', 'bebida', [], 4, 'bueno'),
  a('te', 'Té / infusión', 'bebida', []),
  a('agua_gas', 'Agua con gas', 'bebida', []),
  a('caldo_huesos', 'Caldo de huesos', 'bebida', P),
  a('vino_tinto', 'Vino tinto', 'bebida', ['alcohol'], 3),
  a('vino_blanco', 'Vino blanco', 'bebida', ['alcohol'], 3),
  a('cerveza', 'Cerveza', 'bebida', ['alcohol', 'carbohidrato'], 4, 'malo'),
  a('kombucha', 'Kombucha', 'bebida', [], 3, 'bueno'),
  a('zumo_naranja_natural', 'Zumo de naranja natural', 'bebida', ['carbohidrato'], 9, 'bueno')
]

/** Sin tildes ni mayúsculas: es lo que hace que «platano» encuentre «Plátano». */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * El alimento con las ediciones del usuario aplicadas. Su edición pisa a lo de
 * fábrica campo a campo, así que corregir la sal de un queso no le borra los
 * carbohidratos de serie.
 */
export function alimentoResuelto(
  id: string,
  ediciones?: EdicionAlimento[]
): AlimentoBasico | undefined {
  const base = ALIMENTOS.find((x) => x.id === id)
  if (!base) return undefined
  const ed = ediciones?.find((e) => e.id === id)
  if (!ed) return base
  return {
    ...base,
    ...(ed.etiquetas !== undefined ? { etiquetas: ed.etiquetas } : {}),
    ...(ed.carbosPor100 !== undefined ? { carbosPor100: ed.carbosPor100 } : {}),
    ...(ed.carbo !== undefined ? { carbo: ed.carbo } : {})
  }
}

/**
 * Busca en el catálogo. Prefiere el que empieza por lo escrito al que solo lo
 * contiene, y devuelve pocos: un buscador de comida se usa con el plato
 * delante, no se navega.
 */
export function buscarAlimentos(
  texto: string,
  ediciones?: EdicionAlimento[],
  limite = 8
): AlimentoBasico[] {
  const q = normalizar(texto.trim())
  if (q.length < 2) return []
  const puntuados = ALIMENTOS.map((x) => {
    const n = normalizar(x.nombre)
    const pos = n.indexOf(q)
    const porPalabra = n.split(/[\s()/]+/).some((p) => p.startsWith(q))
    return { x, puntos: pos === 0 ? 0 : porPalabra ? 1 : pos > 0 ? 2 : 99 }
  })
    .filter((r) => r.puntos < 99)
    .sort((a, b) => a.puntos - b.puntos || a.x.nombre.localeCompare(b.x.nombre, 'es'))
    .slice(0, limite)
  return puntuados.map((r) => alimentoResuelto(r.x.id, ediciones) ?? r.x)
}
