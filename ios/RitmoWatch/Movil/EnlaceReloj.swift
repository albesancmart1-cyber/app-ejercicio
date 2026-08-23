import Capacitor
import Foundation
import WatchConnectivity

/// El lado del móvil del enlace con el reloj.
///
/// Hace dos cosas y ninguna más:
///
///  1. **Recibe** las medidas que el reloj encoló y se las pasa a la web, que
///     las mete por el mismo camino que las de la nube — `domain/buzon.ts` —,
///     así que una medida del reloj deja exactamente los mismos rastros que si
///     la hubieras hecho con el dedo en el móvil.
///  2. **Manda** la latitud y la longitud al reloj cuando cambian, que es lo
///     único que el reloj necesita saber para calcular el sol sin red.
///
/// Las medidas que lleguen con la web todavía sin arrancar se guardan y se
/// entregan cuando pregunte. Sin eso se perderían justo las que más importan:
/// las que se midieron con el móvil en el bolsillo y la app cerrada.
@objc(EnlaceReloj)
public class EnlaceReloj: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "EnlaceReloj"
    public let jsName = "EnlaceReloj"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recoger", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mandarSitio", returnType: CAPPluginReturnPromise)
    ]

    /// Lo que ha llegado y la web todavía no ha pedido.
    private var pendientes: [[String: Any]] = []
    private let cola = DispatchQueue(label: "ritmo.enlace")

    override public func load() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// La web pide lo que haya llegado. Se vacía al entregarlo: quien lo recibe
    /// lo guarda en el acto, y volver a entregarlo no haría más que duplicar.
    @objc func recoger(_ call: CAPPluginCall) {
        cola.sync {
            call.resolve(["medidas": pendientes])
            pendientes = []
        }
    }

    /// La web manda el sitio. Va por `updateApplicationContext`, que guarda solo
    /// lo último: al reloj no le sirve de nada la coordenada de anteayer.
    @objc func mandarSitio(_ call: CAPPluginCall) {
        guard WCSession.default.activationState == .activated,
              let lat = call.getDouble("lat"), let lon = call.getDouble("lon")
        else {
            call.resolve(["enviado": false])
            return
        }
        do {
            try WCSession.default.updateApplicationContext(["lat": lat, "lon": lon])
            call.resolve(["enviado": true])
        } catch {
            call.resolve(["enviado": false])
        }
    }

    // MARK: - WCSessionDelegate

    public func session(_ s: WCSession, activationDidCompleteWith: WCSessionActivationState, error: Error?) {}
    public func sessionDidBecomeInactive(_ s: WCSession) {}
    /// Al cambiar de reloj hay que volver a activar, o deja de llegar nada.
    public func sessionDidDeactivate(_ s: WCSession) { WCSession.default.activate() }

    public func session(_ s: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        cola.sync { pendientes.append(userInfo) }
        // Y se avisa, por si la web está abierta y puede recogerlo ya.
        DispatchQueue.main.async {
            self.notifyListeners("medidas", data: ["hay": true])
        }
    }
}
