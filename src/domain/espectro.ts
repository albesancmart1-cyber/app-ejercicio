/**
 * Qué hace cada longitud de onda, del UVB al infrarrojo lejano.
 *
 * ## Por qué existe este fichero
 *
 * `luz.ts` reparte el espectro en nueve bandas y le da a cada una **una frase**,
 * que es lo que hace falta para calcular el balance del día. Pero cuando
 * alguien está creando una lámpara y teclea «810», esa frase no le dice lo que
 * necesita saber: qué absorbe esos 810 nm, qué se ha documentado que pasa
 * cuando lo hace, y hasta dónde llega.
 *
 * Aquí está eso, tramo a tramo, **con su fuente**. Cada línea sale de un
 * trabajo publicado y lleva la referencia al lado, para que se pueda ir a
 * mirarla y para que se note cuándo algo está bien establecido y cuándo es un
 * mecanismo propuesto.
 *
 * ## Cómo está escrito, y qué no vas a encontrar
 *
 * Tres reglas, y las tres son de esta app y no de la literatura:
 *
 *  - **Se describe el mecanismo, no se receta.** No hay dosis recomendadas, ni
 *    minutos, ni protocolos. La app no vende lámparas y no va a decirte cuánto
 *    tiempo ponerte debajo de la tuya.
 *  - **No se nombra ninguna enfermedad como algo que la luz cure.** Buena parte
 *    de esta literatura es clínica; lo que se recoge aquí es qué le pasa al
 *    tejido, no qué se arregla. Donde un efecto solo se ha visto en células o en
 *    animales, lo dice.
 *  - **Lo que no se sabe, se dice.** Hay tramos enteros del infrarrojo con muy
 *    poco detrás, y hay mecanismos que se repiten en los folletos y no aguantan
 *    una lectura. Están señalados.
 *
 * ## La advertencia que va antes que todas las demás
 *
 * La respuesta a la luz es **bifásica**: poca no hace nada, la adecuada
 * estimula, y más de la cuenta **inhibe** —no es que sobre, es que resta—. Es
 * la curva de Arndt-Schulz aplicada a esto, y está documentada tanto en los
 * mediadores de dentro de la célula (ATP, potencial de membrana mitocondrial)
 * como en el resultado final. Por eso ninguna de las líneas de abajo dice
 * «cuanto más, mejor», y por eso la app enseña julios y no una nota.
 * (Huang, Chen, Carroll & Hamblin, *Dose-Response* 2009; actualización en
 * *Dose-Response* 2011.)
 */

/** Un tramo del espectro con lo que se sabe de él. */
export interface TramoEspectral {
  /** Desde (inclusive) y hasta (exclusive), en nanómetros. */
  desde: number
  hasta: number
  nombre: string
  /** Las longitudes concretas que la literatura señala dentro del tramo. */
  picos: number[]
  /** Qué molécula absorbe: sin cromóforo no hay efecto, solo calor. */
  cromoforo: string
  /** Hasta dónde llega en el tejido, escrito para leerlo. */
  penetracion: string
  /** Lo documentado. Cada línea con su referencia dentro. */
  efectos: string[]
  /** Lo que se repite por ahí y no se sostiene, cuando lo hay. */
  ojo?: string
}

/**
 * El espectro entero, en orden y sin huecos.
 *
 * Los cortes no son redondos porque no lo son en la naturaleza: 315 nm separa
 * UVB de UVA porque ahí se acaba la síntesis de vitamina D, y 780 nm separa el
 * infrarrojo A del visible porque es donde la CIE lo pone.
 */
export const ESPECTRO: TramoEspectral[] = [
  {
    desde: 280,
    hasta: 300,
    nombre: 'UVB corto',
    picos: [297],
    cromoforo: '7-dehidrocolesterol en la membrana de los queratinocitos',
    penetracion: 'La epidermis y poco más: décimas de milímetro.',
    efectos: [
      'Es **el** tramo de la vitamina D. El espectro de acción de la CIE para la previtamina D₃ tiene su máximo en 297 nm, y prácticamente todo lo que se sintetiza ocurre entre 295 y 300 nm (CIE 174:2006; revisión de Webb et al., *PNAS* 2021).',
      'La misma luz que la fabrica la destruye: pasado un rato, la previtamina D₃ recién hecha se isomeriza a lumisterol y taquisterol. Es una autorregulación, no un fallo, y es la razón de que la síntesis se aplane sola (MacLaughlin, Anderson & Holick, *Science* 1982).',
      'Induce POMC en los queratinocitos y de ahí β-endorfina, y activa el eje HPA de forma sistémica. Es el mecanismo endocrino que explica por qué el sol se «nota» y también la inmunosupresión que produce (Slominski et al., *Endocrinology* 2018).'
    ],
    ojo: 'Ninguna lámpara doméstica de las que se venden como «de espectro completo» emite aquí. La vitamina D de la piel sale del sol, y solo del sol.'
  },
  {
    desde: 300,
    hasta: 315,
    nombre: 'UVB largo',
    picos: [305, 308],
    cromoforo: 'ADN (dímeros de pirimidina), ácido urocánico, 7-dehidrocolesterol',
    penetracion: 'Epidermis. Casi nada llega a la dermis.',
    efectos: [
      'Todavía sintetiza vitamina D, pero cada vez menos: por encima de 315 nm no queda prácticamente nada (CIE 174:2006).',
      'Es el tramo que más pesa en el eritema —la quemadura— y de donde sale el índice UV que dan los partes. Por eso el tiempo hasta enrojecer y la vitamina D **no** van de la mano: se calculan con curvas distintas.',
      'Estimula la melanogénesis, que es la respuesta de la piel a haber recibido UV y lo que la app llama callo solar.'
    ]
  },
  {
    desde: 315,
    hasta: 400,
    nombre: 'UVA',
    picos: [340, 365, 380],
    cromoforo: 'Nitritos y S-nitrosotioles de la piel; OPN5 (neuropsina), con máximo en 380 nm',
    penetracion: 'Llega a la dermis: alrededor de un milímetro.',
    efectos: [
      'Libera **óxido nítrico** de los depósitos que la piel guarda, sin necesidad de ninguna enzima, y eso vasodilata y baja la tensión arterial durante horas. El efecto es independiente de la vitamina D y del calor (Liu, Fernandez, … Feelisch & Weller, *J Invest Dermatol* 2014).',
      'La OPN5, la neuropsina, tiene su máximo de absorción en 380 nm y es el primer fotorreceptor humano conocido con el pico en el ultravioleta. En piel de ratón pone en hora los genes del reloj **localmente**, sin pasar por el ojo (Buhr et al., *Current Biology* 2019).',
      'Participa en la pigmentación inmediata, la que aparece el mismo día, y en la que se consolida después (Lan et al., *Br J Dermatol* 2021).'
    ],
    ojo: 'El UVA está disponible con el sol mucho más bajo que el UVB —desde unos 10° de altura—, así que a primera y última hora del día hay UVA sin apenas UVB. La app lo distingue por eso.'
  },
  {
    desde: 400,
    hasta: 450,
    nombre: 'Violeta y azul corto',
    picos: [415, 420],
    cromoforo: 'Porfirinas bacterianas; OPN3 en los melanocitos; melanopsina, ya de lejos',
    penetracion: 'Epidermis y dermis superficial. Menos de un milímetro.',
    efectos: [
      '415 nm cae en el pico de absorción de las porfirinas que fabrica *Cutibacterium acnes*: al absorberlas, generan especies reactivas dentro de la propia bacteria. Es la base de la fototerapia azul de la piel (Papageorgiou, Katsambas & Chu, *Br J Dermatol* 2000).',
      'La OPN3 responde a luz azul entre 420 y 490 nm y activa la pigmentación en los melanocitos por la vía de MITF y tirosinasa.',
      'Para el reloj cuenta, pero por debajo del azul de 480: está en el hombro de la curva de la melanopsina, no en su pico.'
    ]
  },
  {
    desde: 450,
    hasta: 495,
    nombre: 'Azul',
    picos: [480],
    cromoforo: 'Melanopsina en las células ganglionares fotosensibles de la retina',
    penetracion: 'No es cosa de la piel: entra por el ojo.',
    efectos: [
      'Es **la señal del reloj**. La melanopsina humana tiene su máximo en unos 479 nm (Bailes & Lucas, *Proc R Soc B* 2013), y el espectro de acción de la supresión de melatonina en humanos encaja con un solo pigmento de máximo en 481 nm (Brainard et al., *J Neurosci* 2001).',
      'La misma luz que pone el reloj en hora por la mañana lo retrasa por la noche. No hay dos azules: hay dos momentos, y es lo único que cambia.',
      'Su efecto no depende solo de la intensidad sino de la **duración**: la melanopsina domina en exposiciones largas y con mucha luz (Gooley et al., *Sci Transl Med* 2010).'
    ]
  },
  {
    desde: 495,
    hasta: 570,
    nombre: 'Verde',
    picos: [555],
    cromoforo: 'Conos L y M al principio; melanopsina después',
    penetracion: 'Por el ojo. En piel, menos de un milímetro.',
    efectos: [
      'Tiene efecto circadiano real, y más de lo que suele decirse: **al principio de una exposición**, 555 nm suprime melatonina tan bien como 460 nm, porque los conos aportan lo suyo. Lo que pasa es que esa sensibilidad decae de forma exponencial mientras la luz sigue, y la melanopsina se queda al mando (Gooley et al., *Sci Transl Med* 2010).',
      'Por eso el verde cuenta menos que el azul en el balance del día, pero no cuenta cero: descartarlo sería tan falso como igualarlo.'
    ]
  },
  {
    desde: 570,
    hasta: 620,
    nombre: 'Ámbar y naranja',
    picos: [590],
    cromoforo: 'Poco claro. Ni melanopsina ni citocromo c oxidasa de forma apreciable',
    penetracion: 'Dermis superficial y su red de vasos, alrededor de un milímetro.',
    efectos: [
      'Es el tramo **más neutro para el reloj**, y por eso es lo que dejan pasar las gafas ámbar de la noche: no porque quiten «lo malo», sino porque lo que dejan pasar cae aquí.',
      'En cultivo de fibroblastos, 590 nm reduce las especies reactivas inducidas por UV y baja la expresión de metaloproteinasas que degradan colágeno; en piel, se ha usado sobre el eritema y la pigmentación (Kim et al., *J Photochem Photobiol B* 2015; Ann Dermatol 2022).'
    ],
    ojo: 'Que sea neutro para el reloj no lo hace inútil, y que tenga efectos en la piel no lo convierte en luz roja. Son cosas distintas y aquí se cuentan por separado.'
  },
  {
    desde: 620,
    hasta: 700,
    nombre: 'Rojo',
    picos: [630, 660, 670, 680],
    cromoforo: 'Citocromo c oxidasa, con banda de absorción entre 620 y 680 nm',
    penetracion: 'Un milímetro largo. Piel y lo que hay justo debajo.',
    efectos: [
      'La citocromo c oxidasa —el complejo IV de la cadena respiratoria— absorbe en esta banda, y de ahí sale la explicación clásica: se desplaza el óxido nítrico que frena la enzima, sube el gradiente de protones y sube el ATP (revisiones de Hamblin, *Photochem Photobiol* 2018).',
      'En la retina envejecida, tres minutos de 670 nm mejoraron la sensibilidad al contraste de color, con más efecto en el eje tritán, que es el más caro de mantener en energía (Shinhmar et al., *J Gerontol A* 2020).',
      '670 nm por la mañana también se ha asociado a una menor subida de glucosa tras una carga oral, con la hipótesis de que la mitocondria consume más al trabajar más (Powner & Jeffery, 2024).'
    ],
    ojo: 'La historia de la citocromo c oxidasa es sólida pero **no es la única**: hay trabajos en los que el efecto de 660 nm se mantiene en células sin citocromo c oxidasa funcional (Lima et al., *J Photochem Photobiol B* 2019). O sea que a 660 nm pasa algo más, y todavía no se sabe qué.'
  },
  {
    desde: 700,
    hasta: 780,
    nombre: 'Rojo lejano',
    picos: [760],
    cromoforo: 'Citocromo c oxidasa, en el valle entre sus dos bandas',
    penetracion: 'Dos o tres milímetros.',
    efectos: [
      'Es el **valle** de la curva: entre el pico rojo y el infrarrojo la absorción de la citocromo c oxidasa baja, y con ella el efecto. Que un tramo esté en medio de dos activos no lo hace activo.',
      '760 nm sí es uno de los cuatro máximos que Karu describió en los espectros de acción de la enzima —620, 680, 760 y 820 nm—, y por eso la app lo cuenta como cubierto cuando una lámpara lo trae (Karu & Kolyakov, *Photomed Laser Surg* 2005).'
    ]
  },
  {
    desde: 780,
    hasta: 940,
    nombre: 'Infrarrojo cercano (IR-A)',
    picos: [810, 830, 850],
    cromoforo: 'Citocromo c oxidasa, con su segunda banda entre 760 y 825 nm',
    penetracion: 'Lo que más entra de todo el espectro: hasta unos cinco milímetros de piel, y es la ventana que se usa para llegar más hondo.',
    efectos: [
      'Más de la mitad de la absorción entre 800 y 850 nm se atribuye a la citocromo c oxidasa. 810 nm es la longitud con la que se ha hecho buena parte de la literatura de fotobiomodulación por eso (Hamblin, *Photochem Photobiol* 2018).',
      'Es la **ventana óptica** del tejido: entre 650 y 1 300 nm la absorción del agua y de la hemoglobina es mínima, así que es donde la luz llega más lejos antes de apagarse (Anderson & Parrish, *J Invest Dermatol* 1981).',
      'Del aumento de ATP se derivan los efectos aguas abajo que se estudian: señalización por especies reactivas a dosis bajas y por calcio.'
    ]
  },
  {
    desde: 940,
    hasta: 1400,
    nombre: 'Infrarrojo cercano largo',
    picos: [980, 1064],
    cromoforo: 'Agua intracelular, no la citocromo c oxidasa',
    penetracion: 'Dos a cuatro milímetros, según la banda de agua en la que caiga.',
    efectos: [
      'Aquí cambia el mecanismo, y es un detalle que casi nunca se cuenta: 980 nm y 1 064 nm los absorbe **el agua**, y lo que hacen es crear un gradiente de temperatura microscópico que abre canales iónicos sensibles al calor —TRPV1 entre otros— y deja entrar calcio.',
      'Está demostrado que son mecanismos distintos y no el mismo con otro número: bloquear los canales de calcio anula el efecto de 980 nm y no toca el de 810 nm (Wang et al., *J Biotechnol* 2016).',
      'Sigue dentro de la ventana óptica, así que penetra bien, pero lo que entrega abajo es calor local y señal de calcio, no ATP por la vía de la enzima.'
    ]
  },
  {
    desde: 1400,
    hasta: 3000,
    nombre: 'Infrarrojo medio (IR-B)',
    picos: [1450, 1940],
    cromoforo: 'Agua, con bandas de absorción muy fuertes',
    penetracion: 'Décimas de milímetro. El agua se lo come casi entero en la superficie.',
    efectos: [
      'Calor radiante en la piel, no fotoquímica. Es lo que da una hoguera y lo que no da ninguna pantalla.',
      'Aquí se acaba la ventana óptica. Mientras el infrarrojo A entra hasta unos cinco milímetros, el de onda media se queda en las primeras micras porque las bandas de absorción del agua son muy fuertes (Bundesamt für Strahlenschutz, *Applications of infrared radiation*, 2023).',
      'El calor en la superficie es una señal real —vasodilatación, sudoración, respuesta cardiovascular— pero llega por la vía térmica y por el sistema nervioso, no porque el fotón haya alcanzado una mitocondria.'
    ]
  },
  {
    desde: 3000,
    hasta: 50000,
    nombre: 'Infrarrojo lejano (IR-C)',
    picos: [10000],
    cromoforo: 'Agua. A 10 µm la absorción es tan alta que la luz se detiene en la superficie',
    penetracion: 'Alrededor de una centésima de milímetro: unas diez micras. Prácticamente, la primera capa de células.',
    efectos: [
      'Es el infrarrojo del calor de un cuerpo: la piel humana emite alrededor de 10 µm, y una estufa cerámica o una sauna de infrarrojos emiten en este tramo.',
      'La absorción del agua a estas ondas es tan alta que el alcance en tejido es de unas diez micras: la primera capa de células y poco más (Bundesamt für Strahlenschutz, *Applications of infrared radiation*, 2023).',
      'Todo lo que hace lo hace por **calor de superficie**: sube la temperatura de la piel, vasodilata, y desde ahí llegan el aumento de la frecuencia cardiaca, la sudoración y el resto de la respuesta al calor. En sauna de infrarrojos se ha medido efecto sobre la recuperación tras el entrenamiento, y va por esa vía (Mero et al., *Springerplus* 2015).'
    ],
    ojo: 'Aquí es donde más se exagera. Se lee a menudo que el infrarrojo lejano «penetra varios centímetros» o que «resuena con el agua del cuerpo a 8-15 µm». La física dice lo contrario: cuanto más larga la onda en el infrarrojo, **menos** penetra, y a 10 µm el alcance es de micras, no de centímetros. El calor sí llega hondo, pero por conducción y por la sangre, como el de una manta. Que el efecto sea térmico no lo hace falso; contarlo como si fuera fotobiomodulación, sí.'
  }
]

/** En qué tramo cae una longitud de onda, o `null` si se sale del espectro. */
export function efectosDe(nm: number): TramoEspectral | null {
  if (!Number.isFinite(nm)) return null
  for (const t of ESPECTRO) {
    if (nm >= t.desde && nm < t.hasta) return t
  }
  return nm === ESPECTRO[ESPECTRO.length - 1].hasta ? ESPECTRO[ESPECTRO.length - 1] : null
}

/** El pico documentado más cercano, si la onda cae cerca de uno. */
export function picoCercano(nm: number, margenNm = 10): number | undefined {
  const t = efectosDe(nm)
  if (!t) return undefined
  let mejor: number | undefined
  for (const p of t.picos) {
    if (Math.abs(p - nm) <= margenNm && (mejor === undefined || Math.abs(p - nm) < Math.abs(mejor - nm))) {
      mejor = p
    }
  }
  return mejor
}
