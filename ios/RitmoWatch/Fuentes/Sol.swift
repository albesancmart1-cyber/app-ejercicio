import Foundation

/// El arco del sol, traducido de `src/domain/arcoSolar.ts` línea por línea.
///
/// Va en el reloj y no se pide al móvil por una razón: es la única cosa de la
/// app que no necesita nada de fuera. Con dos números y la fecha sale la altura
/// del sol en cualquier sitio y en cualquier momento, sin red y sin batería. Un
/// reloj sin cobertura en mitad del monte sigue sabiendo si hay UVB.
///
/// **Está traducido, no reinventado.** Las mismas constantes, el mismo orden de
/// operaciones y los mismos nombres que en TypeScript, para que se puedan poner
/// los dos ficheros uno al lado del otro y compararlos. Y `SolTests.swift` trae
/// las cifras que da la versión de TypeScript, generadas desde ella: si esta
/// traducción se desvía, esa prueba lo dice.
///
/// Fuente: algoritmo solar de la NOAA (Meeus, *Astronomical Algorithms*, cap. 7
/// y 25). Precisión de un minuto por debajo de los 72° de latitud.
enum Sol {
    private static let rad = Double.pi / 180

    private static func sen(_ grados: Double) -> Double { sin(grados * rad) }
    private static func cos_(_ grados: Double) -> Double { cos(grados * rad) }

    /// El día juliano a las 0 h UT de una fecha del calendario gregoriano.
    ///
    /// Enero y febrero cuentan como meses 13 y 14 del año anterior, que es lo
    /// que hace que el año bisiesto encaje sin casos especiales.
    static func diaJuliano(anio: Int, mes: Int, dia: Int) -> Double {
        var a = anio
        var m = mes
        if m <= 2 {
            a -= 1
            m += 12
        }
        let siglo = Int(floor(Double(a) / 100))
        let gregoriano = 2 - siglo + Int(floor(Double(siglo) / 4))
        return floor(365.25 * Double(a + 4716))
            + floor(30.6001 * Double(m + 1))
            + Double(dia) + Double(gregoriano) - 1524.5
    }

    /// Declinación del sol (grados) y ecuación del tiempo (minutos).
    static func posicionSolar(jd: Double) -> (declinacion: Double, ecuacionTiempo: Double) {
        let t = (jd - 2451545) / 36525 // siglos julianos desde J2000

        // Longitud media geométrica y anomalía media del sol.
        let l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)).truncatingRemainder(dividingBy: 360)
        let m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
        let excentricidad = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)

        // Ecuación del centro: la órbita es una elipse, no un círculo.
        let centro =
            sen(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
            + sen(2 * m) * (0.019993 - 0.000101 * t)
            + sen(3 * m) * 0.000289

        let omega = 125.04 - 1934.136 * t // nodo de la órbita lunar, para la nutación
        let lambda = l0 + centro - 0.00569 - 0.00478 * sen(omega)

        let oblicuidadMedia =
            23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
        let oblicuidad = oblicuidadMedia + 0.00256 * cos_(omega)

        let declinacion = asin(sen(oblicuidad) * sen(lambda)) / rad

        let y = pow(tan((oblicuidad / 2) * rad), 2)
        let ecuacionTiempo =
            (4 * (y * sen(2 * l0)
                - 2 * excentricidad * sen(m)
                + 4 * excentricidad * y * sen(m) * cos_(2 * l0)
                - 0.5 * y * y * sen(4 * l0)
                - 1.25 * excentricidad * excentricidad * sen(2 * m))) / rad

        return (declinacion, ecuacionTiempo)
    }

    /// El estado del sol de un día, resuelto una vez.
    struct Dia {
        let declinacion: Double
        let mediodiaSolar: Double
        let lat: Double
    }

    static func dia(anio: Int, mes: Int, dia d: Int, lat: Double, lon: Double, desfaseMin: Double) -> Dia {
        // El mediodía local expresado en día juliano: es donde la NOAA evalúa el día.
        let jd = diaJuliano(anio: anio, mes: mes, dia: d) + 0.5 - desfaseMin / 1440
        let p = posicionSolar(jd: jd)
        let mediodiaSolar = 720 - 4 * lon - p.ecuacionTiempo + desfaseMin
        return Dia(declinacion: p.declinacion, mediodiaSolar: mediodiaSolar, lat: lat)
    }

    /// A qué altura está el sol. `minutos` va desde la medianoche local.
    static func elevacion(_ dia: Dia, minutos: Double) -> Double {
        // Cada minuto de reloj son cuatro minutos de arco: 360° en 1 440 minutos.
        let anguloHorario = (minutos - dia.mediodiaSolar) / 4
        let s =
            sen(dia.lat) * sen(dia.declinacion)
            + cos_(dia.lat) * cos_(dia.declinacion) * cos_(anguloHorario)
        return asin(min(1, max(-1, s))) / rad
    }

    /// Atajo: la altura del sol ahora mismo, en el sitio que se le diga.
    static func elevacionAhora(lat: Double, lon: Double, fecha: Date = Date()) -> Double {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone.current
        let p = cal.dateComponents([.year, .month, .day, .hour, .minute], from: fecha)
        // El desfase se lee del propio reloj, igual que en la web: así el cambio
        // de hora se resuelve solo y nadie tiene que acordarse de nada.
        let desfase = Double(TimeZone.current.secondsFromGMT(for: fecha)) / 60
        let d = dia(anio: p.year!, mes: p.month!, dia: p.day!, lat: lat, lon: lon, desfaseMin: desfase)
        return elevacion(d, minutos: Double(p.hour! * 60 + p.minute!))
    }
}

/// Las tres alturas que la app usa para decidir. Mismos números que `ALTURAS`.
enum Alturas {
    /// Ya hay azul suficiente para poner el reloj en hora.
    static let civil = -6.0
    /// Empieza el UVA: óxido nítrico y vasodilatación.
    static let uva = 10.0
    /// La única ventana en que la piel puede fabricar vitamina D.
    static let uvb = 30.0
}
