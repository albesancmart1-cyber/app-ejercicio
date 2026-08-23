import SwiftUI

/// El sol ahora mismo. La única pantalla del reloj que no es un botón.
///
/// No pide nada a nadie: con la latitud, la longitud y la hora sale la altura
/// del sol, y con eso se sabe si hay UVB. Sin red, sin batería y sin el móvil
/// cerca — que es exactamente cuando hace falta saberlo.
struct SolAhora: View {
    @EnvironmentObject private var enlace: Enlace
    @State private var ahora = Date()
    private let latido = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 6) {
            if let lat = enlace.lat, let lon = enlace.lon {
                let e = Sol.elevacionAhora(lat: lat, lon: lon, fecha: ahora)
                Text(grados(e))
                    .font(.system(size: 34, weight: .semibold, design: .rounded))
                Text(queOfrece(e))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            } else {
                Text("Falta tu sitio")
                    .font(.headline)
                Text("Abre Ritmo en el móvil una vez y el reloj se queda con tus coordenadas.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 6)
        .navigationTitle("El sol")
        .onReceive(latido) { ahora = $0 }
    }

    /// Con coma decimal, como en toda la app.
    private func grados(_ g: Double) -> String {
        String(format: "%.1f°", g).replacingOccurrences(of: ".", with: ",")
    }

    /// Las mismas cuatro frases que la tarjeta del móvil, recortadas al ancho
    /// de una muñeca. Dicen lo mismo o no dirían nada.
    private func queOfrece(_ e: Double) -> String {
        if e >= Alturas.uvb { return "Hay UVB: tu piel puede fabricar vitamina D ahora." }
        if e >= Alturas.uva { return "Hay UVA, pero el sol no sube lo bastante para el UVB." }
        if e >= Alturas.civil { return "Hay azul de sobra para poner tu reloj en hora." }
        return "El sol está muy bajo. Cuenta para el reloj, no para la vitamina D."
    }
}
