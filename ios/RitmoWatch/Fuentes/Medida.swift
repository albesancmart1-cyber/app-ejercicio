import Foundation

/// Las ocho cosas que se pueden medir. Mismos identificadores que `TipoEnCurso`
/// en `src/domain/types.ts`: si se cambian aquí, dejan de encajar allí.
enum Tipo: String, CaseIterable, Identifiable, Codable {
    case fuera, sol, amanecer, atardecer, grounding, frio, lampara, oscuridad

    var id: String { rawValue }

    var nombre: String {
        switch self {
        case .fuera: return "Fuera"
        case .sol: return "Sol"
        case .amanecer: return "Amanecer"
        case .atardecer: return "Atardecer"
        case .grounding: return "Grounding"
        case .frio: return "Frío"
        case .lampara: return "Lámpara"
        case .oscuridad: return "A oscuras"
        }
    }

    /// El símbolo del sistema. Se usan los de Apple y no dibujos propios: en el
    /// reloj cada uno los ve al tamaño y grosor que tenga configurado, y un SVG
    /// nuestro no respetaría eso.
    var simbolo: String {
        switch self {
        case .fuera: return "figure.walk"
        case .sol: return "sun.max"
        case .amanecer: return "sunrise"
        case .atardecer: return "sunset"
        case .grounding: return "shoeprints.fill"
        case .frio: return "snowflake"
        case .lampara: return "lamp.desk"
        case .oscuridad: return "moon"
        }
    }
}

/// Lo que implica estar fuera. Copia de `IMPLICA_FUERA` en `domain/medir.ts`.
///
/// El frío no está, y es a propósito: una ducha fría se da dentro de casa.
let implicaFuera: Set<Tipo> = [.sol, .amanecer, .atardecer, .grounding]

/// Una medida terminada, lista para mandar al móvil.
///
/// Es el mismo objeto que espera `MedidaDeFuera` en `src/domain/buzon.ts`, y
/// los nombres de los campos tienen que coincidir letra por letra: el móvil los
/// lee tal cual y lo que no reconozca lo descarta.
struct Medida: Codable {
    /// Lo pone el reloj, y es lo que permite mandar la misma medida dos veces
    /// sin que se duplique nada: acaba siendo el id del rato que se guarda.
    let id: String
    let tipo: String
    /// Fecha ISO del día al que pertenece.
    let date: String
    /// Minutos desde medianoche en que empezó.
    let desde: Int
    /// Y en que se paró.
    let hasta: Int
    let origen: String

    init(tipo: Tipo, date: String, desde: Int, hasta: Int) {
        self.id = "reloj-\(UUID().uuidString.prefix(12))"
        self.tipo = tipo.rawValue
        self.date = date
        self.desde = desde
        self.hasta = hasta
        self.origen = "reloj"
    }
}

/// Lo que está en marcha ahora mismo, con la hora a la que empezó.
struct EnMarcha: Codable {
    let tipo: Tipo
    let date: String
    let desde: Int
    /// Cuándo se pulsó, para poder contar los segundos a la vista.
    let empezado: Date
}

/// Fecha y minutos de ahora, en la zona horaria del reloj.
enum Reloj {
    static func hoy(_ fecha: Date = Date()) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone.current
        return f.string(from: fecha)
    }

    static func minutos(_ fecha: Date = Date()) -> Int {
        let p = Calendar.current.dateComponents([.hour, .minute], from: fecha)
        return (p.hour ?? 0) * 60 + (p.minute ?? 0)
    }

    static func duracion(_ minutos: Int) -> String {
        if minutos < 1 { return "Ahora mismo" }
        if minutos < 60 { return "\(minutos) min" }
        return "\(minutos / 60) h \(String(format: "%02d", minutos % 60))"
    }
}
