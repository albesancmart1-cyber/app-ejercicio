import SwiftUI

@main
struct RitmoWatchApp: App {
    @StateObject private var estado = Estado()
    @StateObject private var enlace = Enlace.compartido

    var body: some Scene {
        WindowGroup {
            TabView {
                Rejilla()
                SolAhora()
            }
            .tabViewStyle(.verticalPage)
            .environmentObject(estado)
            .environmentObject(enlace)
        }
    }
}
