import SwiftUI

/// La rejilla, con la misma forma que en el móvil.
///
/// Dos columnas y baldosas cuadradas, sin color: encendida se da la vuelta
/// entera —fondo claro, tinta oscura—. En el reloj eso importa aún más que en
/// el móvil, porque se mira de reojo, con la muñeca girada y a pleno sol.
struct Rejilla: View {
    @EnvironmentObject private var estado: Estado
    @EnvironmentObject private var enlace: Enlace
    /// Refresca los cronómetros a la vista sin gastar batería en un temporizador
    /// por baldosa: uno solo, cada quince segundos, como en el móvil.
    @State private var ahora = Date()
    private let latido = Timer.publish(every: 15, on: .main, in: .common).autoconnect()

    private let columnas = [GridItem(.flexible(), spacing: 6), GridItem(.flexible(), spacing: 6)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columnas, spacing: 6) {
                ForEach(Tipo.allCases) { t in
                    Baldosa(
                        tipo: t,
                        enMarcha: estado.estaEnMarcha(t),
                        incluidaPor: estado.incluidaPor(t),
                        pie: pie(t)
                    ) {
                        // Un toque corto de vibración al empezar y otro al
                        // parar: en la muñeca es la única confirmación que se
                        // nota sin mirar.
                        WKInterfaceDevice.current().play(estado.estaEnMarcha(t) ? .stop : .start)
                        estado.pulsar(t)
                    }
                }
            }
            .padding(.horizontal, 2)

            if enlace.enCola > 0 {
                Text("\(enlace.enCola) por mandar al móvil")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
            }
        }
        .navigationTitle("Medir")
        .onReceive(latido) { ahora = $0 }
    }

    private func pie(_ t: Tipo) -> String {
        if let por = estado.incluidaPor(t) { return "Con \(por.nombre)" }
        if estado.estaEnMarcha(t) { return Reloj.duracion(estado.minutos(t, ahora: ahora)) }
        let hoy = estado.hoyMin[t] ?? 0
        return hoy > 0 ? "\(Reloj.duracion(hoy)) hoy" : "—"
    }
}

private struct Baldosa: View {
    let tipo: Tipo
    let enMarcha: Bool
    let incluidaPor: Tipo?
    let pie: String
    let alPulsar: () -> Void

    var body: some View {
        Button(action: alPulsar) {
            VStack(alignment: .leading, spacing: 2) {
                Image(systemName: tipo.simbolo)
                    .font(.system(size: 15, weight: .medium))
                Spacer(minLength: 2)
                Text(tipo.nombre)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Text(pie)
                    .font(.system(size: 10))
                    .opacity(0.7)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .aspectRatio(1, contentMode: .fit)
            .padding(7)
            .background(enMarcha ? Color.white : Color.white.opacity(0.10))
            .foregroundStyle(enMarcha ? Color.black : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(
                        Color.white.opacity(incluidaPor != nil ? 0.35 : 0),
                        style: StrokeStyle(lineWidth: 1, dash: [3, 3])
                    )
            )
            .opacity(incluidaPor != nil ? 0.6 : 1)
        }
        .buttonStyle(.plain)
        .disabled(incluidaPor != nil)
        .accessibilityLabel("\(tipo.nombre)\(enMarcha ? ", en marcha" : incluidaPor != nil ? ", incluida" : "")")
    }
}
