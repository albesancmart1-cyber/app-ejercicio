import Foundation
import WatchConnectivity

/// El enlace con el móvil.
///
/// ## Por qué no habla con la nube directamente
///
/// Sería lo primero que uno piensa: el reloj tiene WiFi, y en Supabase ya hay
/// una tabla esperando. El problema es entrar. La sesión de Ritmo va por enlace
/// al correo, y en un reloj no hay dónde pegar un enlace ni teclado en el que
/// escribir un token. Meter la autenticación en el reloj significaría teclear
/// algo largo en una pantalla de cuatro centímetros, o guardar una credencial
/// eterna, que es peor.
///
/// Así que no entra: **manda al móvil, y el móvil ya sabe quién es**. Menos
/// piezas, ninguna credencial en la muñeca, y funciona sin cobertura.
///
/// ## Por qué `transferUserInfo` y no `sendMessage`
///
/// `sendMessage` necesita que la app del móvil esté abierta en ese momento, y
/// no lo va a estar: la gracia de medir desde el reloj es no sacar el móvil.
/// `transferUserInfo` **encola y garantiza la entrega**: se guarda en el
/// sistema, sobrevive a que el reloj se quede sin batería, y llega en orden la
/// próxima vez que la app del móvil arranque. Para esto es exactamente lo que
/// hace falta.
final class Enlace: NSObject, ObservableObject, WCSessionDelegate {
    static let compartido = Enlace()

    /// Dónde estás, para poder calcular el sol sin red. Lo manda el móvil.
    @Published var lat: Double?
    @Published var lon: Double?
    /// Cuántas medidas están esperando a que el móvil las recoja.
    @Published var enCola = 0

    private let clave = "ritmo-sitio"

    override private init() {
        super.init()
        // El último sitio recibido se guarda: el reloj tiene que saber el sol
        // aunque el móvil lleve dos días apagado.
        let d = UserDefaults.standard
        if d.object(forKey: "\(clave)-lat") != nil {
            lat = d.double(forKey: "\(clave)-lat")
            lon = d.double(forKey: "\(clave)-lon")
        }
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    /// Manda una medida terminada. No espera respuesta ni la necesita.
    func mandar(_ medida: Medida) {
        guard let datos = try? JSONEncoder().encode(medida),
              let dict = try? JSONSerialization.jsonObject(with: datos) as? [String: Any]
        else { return }
        WCSession.default.transferUserInfo(dict)
        enCola = WCSession.default.outstandingUserInfoTransfers.count
    }

    // MARK: - WCSessionDelegate

    func session(_ s: WCSession, activationDidCompleteWith: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { self.enCola = s.outstandingUserInfoTransfers.count }
    }

    /// El móvil manda el sitio cuando cambia. Es lo único que viaja hacia acá.
    func session(_ s: WCSession, didReceiveApplicationContext contexto: [String: Any]) {
        DispatchQueue.main.async {
            if let la = contexto["lat"] as? Double, let lo = contexto["lon"] as? Double {
                self.lat = la
                self.lon = lo
                UserDefaults.standard.set(la, forKey: "\(self.clave)-lat")
                UserDefaults.standard.set(lo, forKey: "\(self.clave)-lon")
            }
        }
    }

    func session(_ s: WCSession, didFinish: WCSessionUserInfoTransfer, error: Error?) {
        DispatchQueue.main.async { self.enCola = s.outstandingUserInfoTransfers.count }
    }
}
