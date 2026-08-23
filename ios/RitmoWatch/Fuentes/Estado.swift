import Foundation
import SwiftUI

/// Qué está en marcha, y qué pasa al empezar y al parar.
///
/// Es la versión de reloj de `src/domain/medir.ts`, con lo mismo que hace falta
/// y nada más. Las reglas que importan son las mismas y están aquí a propósito,
/// no repartidas por las vistas:
///
///  - **Varias a la vez.** El día se solapa: estás fuera y encima descalzo.
///  - **Lo que implica estar fuera enciende «Fuera» solo**, y no se puede
///    pulsar por separado mientras tanto: pulsarla apuntaría el mismo rato dos
///    veces.
///  - **Lo que se queda abierto de otro día se cierra con media hora.** Apretar
///    «Sol» y olvidarse no son catorce horas de sol, y mandar eso al móvil
///    envenenaría la vitamina D del día de una sola vez.
@MainActor
final class Estado: ObservableObject {
    @Published private(set) var enMarcha: [Tipo: EnMarcha] = [:]
    /// Los minutos de hoy de cada cosa, de lo medido en este reloj.
    @Published private(set) var hoyMin: [Tipo: Int] = [:]

    private let clave = "ritmo-en-marcha"
    private let claveHoy = "ritmo-hoy"

    /// Igual que en el móvil: media hora, y conservadora a propósito.
    static let minutosSiSeOlvida = 30

    init() {
        cargar()
        cerrarLoDeOtroDia()
    }

    func estaEnMarcha(_ t: Tipo) -> Bool { enMarcha[t] != nil }

    /// «Fuera» encendida por otra, sin haberla pulsado.
    func incluidaPor(_ t: Tipo) -> Tipo? {
        guard t == .fuera, enMarcha[.fuera] == nil else { return nil }
        return implicaFuera.first { enMarcha[$0] != nil }
    }

    func minutos(_ t: Tipo, ahora: Date = Date()) -> Int {
        guard let x = enMarcha[t] else { return 0 }
        return max(0, Int(ahora.timeIntervalSince(x.empezado) / 60))
    }

    /// Pulsar: si está en marcha la para, si no la arranca.
    func pulsar(_ t: Tipo) {
        if incluidaPor(t) != nil { return }
        if enMarcha[t] != nil { parar(t) } else { empezar(t) }
    }

    private func empezar(_ t: Tipo) {
        enMarcha[t] = EnMarcha(tipo: t, date: Reloj.hoy(), desde: Reloj.minutos(), empezado: Date())
        guardar()
    }

    private func parar(_ t: Tipo, hasta: Int? = nil) {
        guard let x = enMarcha[t] else { return }
        let fin = hasta ?? Reloj.minutos()
        enMarcha[t] = nil
        // La duración se manda tal cual, sin redondear: quien decide qué hacer
        // con ella es el móvil, que es donde están las reglas.
        Enlace.compartido.mandar(Medida(tipo: t, date: x.date, desde: x.desde, hasta: fin))
        hoyMin[t, default: 0] += max(0, fin - x.desde)
        guardar()
    }

    /// Lo que se quedó abierto de otro día se cierra con una duración
    /// conservadora. Arrastrarlo a hoy haría que el cronómetro enseñara
    /// cuarenta horas, y mandarlo así envenenaría el día en el móvil.
    private func cerrarLoDeOtroDia() {
        let hoy = Reloj.hoy()
        for (t, x) in enMarcha where x.date != hoy {
            parar(t, hasta: x.desde + Self.minutosSiSeOlvida)
        }
        // Y la cuenta del día se reinicia al cambiar de día.
        if UserDefaults.standard.string(forKey: "\(claveHoy)-fecha") != hoy {
            hoyMin = [:]
            UserDefaults.standard.set(hoy, forKey: "\(claveHoy)-fecha")
            guardar()
        }
    }

    // MARK: - Guardar entre arranques

    private func guardar() {
        let d = UserDefaults.standard
        if let x = try? JSONEncoder().encode(enMarcha) { d.set(x, forKey: clave) }
        if let x = try? JSONEncoder().encode(hoyMin) { d.set(x, forKey: claveHoy) }
    }

    private func cargar() {
        let d = UserDefaults.standard
        if let x = d.data(forKey: clave),
           let v = try? JSONDecoder().decode([Tipo: EnMarcha].self, from: x) { enMarcha = v }
        if let x = d.data(forKey: claveHoy),
           let v = try? JSONDecoder().decode([Tipo: Int].self, from: x) { hoyMin = v }
    }
}
