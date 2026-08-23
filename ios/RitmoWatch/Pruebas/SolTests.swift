import XCTest
@testable import RitmoWatch_Watch_App

/// El oráculo: las cifras que da la versión de TypeScript.
///
/// Este fichero **está generado**, no escrito a mano. Sale de
/// `src/_oraculo.test.ts`, que llama a `elevacionSolar` de la app web con
/// 4 sitios × 4 fechas × 4 desfases ×
/// 9 horas y apunta lo que devuelve.
///
/// Existe porque `Sol.swift` es una traducción y las traducciones se
/// desvían en silencio: un `floor` que en Swift redondea distinto, un
/// `%` que con negativos no hace lo mismo, un paréntesis mal puesto. Nada
/// de eso da error de compilación — da un amanecer cuatro minutos tarde, y
/// eso no se nota hasta que alguien sale a la calle a la hora que no era.
///
/// Los 4 sitios no son decorativos: Tromsø prueba el sol de
/// medianoche y la noche polar, Quito el ecuador, y Sídney el hemisferio sur,
/// donde la declinación cambia de signo.
///
/// Si esta prueba pasa, la traducción es fiel. Si falla, manda el TypeScript.
///
/// Para regenerarlo:  npx vitest run src/_oraculo.test.ts
final class SolTests: XCTestCase {
    struct Caso {
        let anio: Int, mes: Int, dia: Int
        let lat: Double, lon: Double, desfase: Double, minutos: Double
        let elevacion: Double
    }

    /// Una diezmilésima de grado. Es holgura para el coma flotante y nada más:
    /// medio grado ya serían dos minutos de error en el amanecer.
    let tolerancia = 0.0001

    let casos: [Caso] = [
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 0, elevacion: -48.926537539), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 300, elevacion: -15.217131425), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 480, elevacion: 18.654753534), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 600, elevacion: 38.601593090), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 720, elevacion: 49.625859884), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 840, elevacion: 44.162447461), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1080, elevacion: 4.403229976), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1260, elevacion: -28.713223108), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1439, elevacion: -48.898218351), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 0, elevacion: -45.184276092), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 300, elevacion: -25.989406570), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 480, elevacion: 7.445742232), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 600, elevacion: 29.220481560), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 720, elevacion: 45.804701405), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 840, elevacion: 48.996537802), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1080, elevacion: 15.681732657), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1260, elevacion: -18.182888571), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1439, elevacion: -45.089277871), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 0, elevacion: -38.043901079), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 300, elevacion: -35.718172319), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 480, elevacion: -3.971891041), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 600, elevacion: 18.627758216), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 720, elevacion: 38.570934330), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 840, elevacion: 49.592452012), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1080, elevacion: 26.464514977), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1260, elevacion: -7.015773878), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1439, elevacion: -37.903285614), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 0, elevacion: -15.150225623), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 300, elevacion: 38.678227814), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 480, elevacion: 49.089868982), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 600, elevacion: 36.308226464), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 720, elevacion: 15.734255294), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 840, elevacion: -6.956861804), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1080, elevacion: -45.099874902), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1260, elevacion: -43.448994536), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1439, elevacion: -15.334888814), // Madrid 2026-03-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 0, elevacion: -26.028117034), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 300, elevacion: 1.640794499), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 480, elevacion: 34.219062291), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 600, elevacion: 56.710484156), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 720, elevacion: 72.664325768), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 840, elevacion: 62.444676381), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1080, elevacion: 17.971169953), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1260, elevacion: -11.474718936), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1439, elevacion: -26.013601525), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 0, elevacion: -23.701418496), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 300, elevacion: -7.718834452), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 480, elevacion: 22.910706856), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 600, elevacion: 45.620255630), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 720, elevacion: 66.597100540), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 840, elevacion: 70.724488275), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1080, elevacion: 29.150424960), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1260, elevacion: -2.672074599), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1439, elevacion: -23.638456462), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 0, elevacion: -18.673483497), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 300, elevacion: -15.696281442), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 480, elevacion: 11.963039934), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 600, elevacion: 34.222542597), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 720, elevacion: 56.713761632), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 840, elevacion: 72.665158185), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1080, elevacion: 40.545624644), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1260, elevacion: 7.263988749), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1439, elevacion: -18.569692082), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 0, elevacion: 1.633064916), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 300, elevacion: 56.702162063), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 480, elevacion: 70.729528480), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 600, elevacion: 51.852778326), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 720, elevacion: 29.160460420), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 840, elevacion: 7.274669111), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1080, elevacion: -23.698406847), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1260, elevacion: -21.769097550), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1439, elevacion: 1.468180075), // Madrid 2026-06-21
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 0, elevacion: -49.742196904), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 300, elevacion: -12.839346060), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 480, elevacion: 20.953498564), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 600, elevacion: 40.157836711), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 720, elevacion: 49.358470888), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 840, elevacion: 41.974636377), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1080, elevacion: 1.245341333), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1260, elevacion: -31.557687231), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1439, elevacion: -49.732307351), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 0, elevacion: -46.956079035), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 300, elevacion: -23.779627980), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 480, elevacion: 9.894022722), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 600, elevacion: 31.275941865), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 720, elevacion: 46.623190616), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 840, elevacion: 47.667786939), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1080, elevacion: 12.597656287), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1260, elevacion: -21.206426071), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1439, elevacion: -46.874945423), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 0, elevacion: -40.452942760), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 300, elevacion: -33.839307707), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 480, elevacion: -1.478900073), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 600, elevacion: 20.970800914), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 720, elevacion: 40.181601975), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 840, elevacion: 49.390619126), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1080, elevacion: 23.544872370), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1260, elevacion: -10.112038428), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1439, elevacion: -40.320774614), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 0, elevacion: -12.879540602), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 300, elevacion: 40.098376265), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 480, elevacion: 47.568098808), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 600, elevacion: 33.485975251), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 720, elevacion: 12.516544225), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 840, elevacion: -10.206023937), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1080, elevacion: -47.055276723), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1260, elevacion: -42.372329833), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1439, elevacion: -13.066420395), // Madrid 2026-09-23
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 0, elevacion: -72.805504639), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 300, elevacion: -28.444323583), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 480, elevacion: 3.258608629), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 600, elevacion: 19.055924283), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 720, elevacion: 26.075740183), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 840, elevacion: 21.453767081), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1080, elevacion: -12.627668000), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1260, elevacion: -46.325353778), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 0, minutos: 1439, elevacion: -72.771050087), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 0, elevacion: -67.131650537), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 300, elevacion: -39.831832461), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 480, elevacion: -6.616528122), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 600, elevacion: 11.980197270), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 720, elevacion: 23.932178048), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 840, elevacion: 25.210472388), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1080, elevacion: -2.263861765), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1260, elevacion: -34.934934298), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 60, minutos: 1439, elevacion: -66.990650618), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 0, elevacion: -57.384445790), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 300, elevacion: -51.142475893), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 480, elevacion: -17.277807739), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 600, elevacion: 3.265251809), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 720, elevacion: 19.060343211), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 840, elevacion: 26.076457705), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1080, elevacion: 7.165766122), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1260, elevacion: -23.614556086), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: 120, minutos: 1439, elevacion: -57.206821135), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 0, elevacion: -28.464045595), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 300, elevacion: 19.045084145), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 480, elevacion: 25.214800729), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 600, elevacion: 15.262970506), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 720, elevacion: -2.243681166), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 840, elevacion: -23.587996685), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1080, elevacion: -67.114678593), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1260, elevacion: -61.841119409), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfase: -300, minutos: 1439, elevacion: -28.652735318), // Madrid 2026-12-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 0, elevacion: -19.056588386), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 300, elevacion: 1.084868951), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 480, elevacion: 15.117631785), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 600, elevacion: 20.171878487), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 720, elevacion: 19.756123403), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 840, elevacion: 14.014555851), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1080, elevacion: -5.561343396), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1260, elevacion: -17.564744552), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1439, elevacion: -19.083554267), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 0, elevacion: -20.000219599), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 300, elevacion: -4.114265995), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 480, elevacion: 10.990058059), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 600, elevacion: 18.241395562), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 720, elevacion: 20.670951784), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 840, elevacion: 17.449452952), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1080, elevacion: -0.439375946), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1260, elevacion: -14.450477657), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1439, elevacion: -20.003518239), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 0, elevacion: -19.502836433), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 300, elevacion: -9.042075508), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 480, elevacion: 6.191540257), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 600, elevacion: 15.084195739), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 720, elevacion: 20.138560507), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 840, elevacion: 19.724077165), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1080, elevacion: 4.730654954), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1260, elevacion: -10.364842416), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1439, elevacion: -19.482152920), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 0, elevacion: 1.167421522), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 300, elevacion: 20.255164550), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 480, elevacion: 17.542704593), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 600, elevacion: 9.750859367), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 720, elevacion: -0.353255200), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 840, elevacion: -10.261411964), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1080, elevacion: -19.901219861), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1260, elevacion: -13.252035563), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1439, elevacion: 1.080521875), // Tromso 2026-03-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 0, elevacion: 4.033734462), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 300, elevacion: 23.104187651), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 480, elevacion: 37.726898072), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 600, elevacion: 43.282527406), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 720, elevacion: 42.494198902), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 840, elevacion: 35.757584172), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1080, elevacion: 15.764879362), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1260, elevacion: 5.013022618), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1439, elevacion: 4.008527700), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 0, elevacion: 3.121467512), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 300, elevacion: 18.018586240), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 480, elevacion: 33.301544966), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 600, elevacion: 41.184303905), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 720, elevacion: 43.741632716), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 840, elevacion: 39.716999157), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1080, elevacion: 20.698049545), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1260, elevacion: 7.698093915), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1439, elevacion: 3.116762448), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 0, elevacion: 3.454682392), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 300, elevacion: 13.331206649), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 480, elevacion: 28.306872081), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 600, elevacion: 37.728170050), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 720, elevacion: 43.282986643), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 840, elevacion: 42.493639711), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1080, elevacion: 25.882245467), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1260, elevacion: 11.350188561), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1439, elevacion: 3.470780362), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 0, elevacion: 23.099926137), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 300, elevacion: 43.281170679), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 480, elevacion: 39.719716091), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 600, elevacion: 31.021153235), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 720, elevacion: 20.702298165), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 840, elevacion: 11.354078064), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1080, elevacion: 3.120796616), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1260, elevacion: 9.291007472), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1439, elevacion: 23.013381734), // Tromso 2026-06-21
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 0, elevacion: -19.154414995), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 300, elevacion: 1.854158857), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 480, elevacion: 15.460935568), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 600, elevacion: 19.889451549), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 720, elevacion: 18.773733890), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 840, elevacion: 12.496535194), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1080, elevacion: -7.294396884), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1260, elevacion: -18.692607534), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1439, elevacion: -19.187001205), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 0, elevacion: -20.415625071), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 300, elevacion: -3.333554713), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 480, elevacion: 11.585017740), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 600, elevacion: 18.328452986), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 720, elevacion: 20.064329382), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 840, elevacion: 16.199855183), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1080, elevacion: -2.197921149), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1260, elevacion: -15.818184235), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1439, elevacion: -20.424887206), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 0, elevacion: -20.239959138), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 300, elevacion: -8.330591715), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 480, elevacion: 6.959841997), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 600, elevacion: 15.490855106), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 720, elevacion: 19.921404705), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 840, elevacion: 18.806851711), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1080, elevacion: 3.019935194), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1260, elevacion: -11.905094009), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1439, elevacion: -20.225026977), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 0, elevacion: 1.784394914), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 300, elevacion: 19.809560355), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 480, elevacion: 16.100093082), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 600, elevacion: 7.912569662), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 720, elevacion: -2.296820751), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 840, elevacion: -12.021197338), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1080, elevacion: -20.512046282), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1260, elevacion: -12.938432593), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1439, elevacion: 1.697851954), // Tromso 2026-09-23
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 0, elevacion: -42.361840207), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 300, elevacion: -20.379660636), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 480, elevacion: -7.499849605), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 600, elevacion: -3.396863885), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 720, elevacion: -4.130399248), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 840, elevacion: -9.521941340), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1080, elevacion: -28.626121502), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1260, elevacion: -41.357651711), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 0, minutos: 1439, elevacion: -42.397550779), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 0, elevacion: -43.711990066), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 300, elevacion: -25.555511491), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 480, elevacion: -11.096406210), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 600, elevacion: -4.879774819), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 720, elevacion: -3.141357175), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 840, elevacion: -6.302237173), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1080, elevacion: -23.429760395), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1260, elevacion: -37.975938062), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 60, minutos: 1439, elevacion: -43.720296210), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 0, elevacion: -43.360975668), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 300, elevacion: -30.700444435), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 480, elevacion: -15.467191317), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 600, elevacion: -7.497429240), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 720, elevacion: -3.395992464), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 840, elevacion: -4.131232755), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1080, elevacion: -18.329060219), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1260, elevacion: -33.600211114), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: 120, minutos: 1439, elevacion: -43.340648518), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 0, elevacion: -20.388819862), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 300, elevacion: -3.398807440), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 480, elevacion: -6.297162275), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 600, elevacion: -13.598055714), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 720, elevacion: -23.419538098), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 840, elevacion: -33.589449362), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1080, elevacion: -43.713601687), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1260, elevacion: -35.487598248), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfase: -300, minutos: 1439, elevacion: -20.473705257), // Tromso 2026-12-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 0, elevacion: -9.749087766), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 300, elevacion: -84.745466741), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 480, elevacion: -50.251897345), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 600, elevacion: -20.252482676), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 720, elevacion: 9.746835882), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 840, elevacion: 39.745617685), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1080, elevacion: 80.237313165), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1260, elevacion: 35.249479790), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1439, elevacion: -9.499093062), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 0, elevacion: 5.253727111), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 300, elevacion: -69.744717150), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 480, elevacion: -65.254684764), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 600, elevacion: -35.255305882), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 720, elevacion: -5.255851594), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 840, elevacion: 24.743345653), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1080, elevacion: 84.719833652), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1260, elevacion: 50.251728344), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1439, elevacion: 5.503721099), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 0, elevacion: 20.256502390), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 300, elevacion: -54.742076375), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 480, elevacion: -80.257121786), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 600, elevacion: -50.258170336), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 720, elevacion: -20.258646762), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 840, elevacion: 9.740770726), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1080, elevacion: 69.735911267), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1260, elevacion: 65.253059937), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1439, elevacion: 20.506494827), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 0, elevacion: -84.757667559), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 300, elevacion: -20.237029836), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 480, elevacion: 24.761320014), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 600, elevacion: 54.758613257), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 720, elevacion: 84.727781494), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 840, elevacion: 65.228830931), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1080, elevacion: 5.234730167), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1260, elevacion: -39.763893513), // Quito 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1439, elevacion: -84.507950406), // Quito 2026-03-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 0, elevacion: -10.225082635), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 300, elevacion: -66.432523017), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 480, elevacion: -43.859283329), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 600, elevacion: -17.385889564), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 720, elevacion: 10.079046923), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 840, elevacion: 36.983866280), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1080, elevacion: 64.045442419), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1260, elevacion: 30.716209167), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1439, elevacion: -9.996335740), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 0, elevacion: 3.525557864), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 300, elevacion: -60.361432768), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 480, elevacion: -55.622386653), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 600, elevacion: -30.881542607), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 720, elevacion: -3.669591208), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 840, elevacion: 23.707823187), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1080, elevacion: 66.075856414), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1260, elevacion: 43.658348935), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1439, elevacion: 3.754820018), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 0, elevacion: 17.231194505), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 300, elevacion: -49.694483734), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 480, elevacion: -64.373948547), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 600, elevacion: -43.855469073), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 720, elevacion: -17.381760726), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 840, elevacion: 10.083185148), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1080, elevacion: 60.073366633), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1260, elevacion: 55.366998979), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1439, elevacion: 17.458340292), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 0, elevacion: -66.431105668), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 300, elevacion: -17.396235085), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 480, elevacion: 23.695672785), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 600, elevacion: 49.460493306), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 720, elevacion: 66.074150927), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 840, elevacion: 55.378522823), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1080, elevacion: 3.538030730), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1260, elevacion: -37.154328128), // Quito 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1439, elevacion: -66.390522152), // Quito 2026-06-21
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 0, elevacion: -13.434663231), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 300, elevacion: -88.391656493), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 480, elevacion: -46.563047948), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 600, elevacion: -16.563757152), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 720, elevacion: 13.435908323), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 840, elevacion: 43.435690188), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1080, elevacion: 76.564635971), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1260, elevacion: 31.564907280), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1439, elevacion: -13.184666669), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 0, elevacion: 1.568767153), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 300, elevacion: -73.427964588), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 480, elevacion: -61.566039223), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 600, elevacion: -31.567236393), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 720, elevacion: -1.567658028), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 840, elevacion: 28.432102366), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1080, elevacion: 88.431772078), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1260, elevacion: 46.568448332), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1439, elevacion: 1.818764802), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 0, elevacion: 16.572261211), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 300, elevacion: -58.426326647), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 480, elevacion: -76.567596935), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 600, elevacion: -46.570619411), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 720, elevacion: -16.571211194), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 840, elevacion: 13.428509167), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1080, elevacion: 73.428173065), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1260, elevacion: 61.572007358), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1439, elevacion: 16.822259487), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 0, elevacion: -88.388500331), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 300, elevacion: -16.545113730), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 480, elevacion: 28.454182272), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 600, elevacion: 58.453831688), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 720, elevacion: 88.450963944), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 840, elevacion: 61.546371133), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1080, elevacion: 1.547126586), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1260, elevacion: -43.451636730), // Quito 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1439, elevacion: -88.147280002), // Quito 2026-09-23
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 0, elevacion: -10.935595494), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 300, elevacion: -66.204346892), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 480, elevacion: -42.877705889), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 600, elevacion: -16.383720418), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 720, elevacion: 11.082035300), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 840, elevacion: 37.975894585), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1080, elevacion: 63.981593915), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1260, elevacion: 30.051759776), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 0, minutos: 1439, elevacion: -10.707078590), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 0, elevacion: 2.807627587), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 300, elevacion: -60.624309254), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 480, elevacion: -54.696811313), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 600, elevacion: -29.881280324), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 720, elevacion: -2.663719324), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 840, elevacion: 24.711246452), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1080, elevacion: 66.563909404), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1260, elevacion: 43.069887395), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 60, minutos: 1439, elevacion: 3.036961677), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 0, elevacion: 16.524244334), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 300, elevacion: -50.212477860), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 480, elevacion: -63.651591312), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 600, elevacion: -42.869164730), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 720, elevacion: -16.374366483), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 840, elevacion: 11.091496189), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1080, elevacion: 60.921805947), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1260, elevacion: 54.942654020), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: 120, minutos: 1439, elevacion: 16.751791833), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 0, elevacion: -66.200848919), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 300, elevacion: -16.407140947), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 480, elevacion: 24.683269470), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 600, elevacion: 50.408930753), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 720, elevacion: 66.559621551), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 840, elevacion: 54.968442688), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1080, elevacion: 2.836029912), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1260, elevacion: -37.771351667), // Quito 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -0.1807, lon: -78.4678, desfase: -300, minutos: 1439, elevacion: -66.169753927), // Quito 2026-12-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 0, elevacion: 45.352073790), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 300, elevacion: 36.124933652), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 480, elevacion: 0.281082635), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 600, elevacion: -24.288988486), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 720, elevacion: -45.912919179), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 840, elevacion: -56.478724742), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1080, elevacion: -25.199031125), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1260, elevacion: 11.737019979), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1439, elevacion: 45.201473265), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 0, elevacion: 35.302912013), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 300, elevacion: 46.050356678), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 480, elevacion: 12.692147420), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 600, elevacion: -12.125950730), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 720, elevacion: -35.762284027), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 840, elevacion: -53.423713947), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1080, elevacion: -36.602866937), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1260, elevacion: -0.666674587), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1439, elevacion: 35.121072536), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 0, elevacion: 23.874691999), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 300, elevacion: 53.230151049), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 480, elevacion: 24.791554439), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 600, elevacion: 0.304580597), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 720, elevacion: -24.264027924), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 840, elevacion: -45.882991370), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1080, elevacion: -46.580248340), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1260, elevacion: -13.068783048), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1439, elevacion: 23.676872209), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 0, elevacion: 36.056605943), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 300, elevacion: -24.351376440), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 480, elevacion: -53.522251902), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 600, elevacion: -53.928446916), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 720, elevacion: -36.657460790), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 840, elevacion: -13.116685942), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1080, elevacion: 35.248558272), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1260, elevacion: 55.693033316), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 3, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1439, elevacion: 36.236185967), // Sidney 2026-03-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 0, elevacion: 26.297190152), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 300, elevacion: 18.052213306), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 480, elevacion: -13.396122617), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 600, elevacion: -37.677116155), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 720, elevacion: -62.419597320), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 840, elevacion: -79.548439279), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1080, elevacion: -36.431764736), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1260, elevacion: -0.850346213), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1439, elevacion: 26.193041891), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 0, elevacion: 18.909058338), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 300, elevacion: 25.657883446), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 480, elevacion: -1.960888111), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 600, elevacion: -25.373877410), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 720, elevacion: -50.121198902), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 840, elevacion: -73.750531318), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1080, elevacion: -48.868070318), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1260, elevacion: -12.217476403), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1439, elevacion: 18.768340722), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 0, elevacion: 9.667325263), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 300, elevacion: 30.764387971), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 480, elevacion: 8.654567607), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 600, elevacion: -13.399703567), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 720, elevacion: -37.680891372), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 840, elevacion: -62.423270175), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1080, elevacion: -61.201197729), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1260, elevacion: -24.147630498), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1439, elevacion: 9.501131283), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 0, elevacion: 18.058998860), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 300, elevacion: -37.667591405), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 480, elevacion: -73.741149912), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 600, elevacion: -72.726944269), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 720, elevacion: -48.879169419), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 840, elevacion: -24.160255152), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1080, elevacion: 18.901744723), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1260, elevacion: 32.689168887), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 6, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1439, elevacion: 18.202222160), // Sidney 2026-06-21
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 0, elevacion: 47.937893047), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 300, elevacion: 33.796243173), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 480, elevacion: -2.476873220), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 600, elevacion: -26.854043199), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 720, elevacion: -47.619449267), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 840, elevacion: -55.814104588), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1080, elevacion: -21.939801109), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1260, elevacion: 15.069953080), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1439, elevacion: 47.797356200), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 0, elevacion: 38.301992377), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 300, elevacion: 44.203375061), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 480, elevacion: 9.950521349), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 600, elevacion: -14.854832051), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 720, elevacion: -38.052769196), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 840, elevacion: -54.172655099), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1080, elevacion: -33.552716066), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1260, elevacion: 2.679000641), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1439, elevacion: 38.125158574), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 0, elevacion: 27.068187974), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 300, elevacion: 52.256000566), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 480, elevacion: 22.157061132), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 600, elevacion: -2.488900062), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 720, elevacion: -26.868653411), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 840, elevacion: -47.642306665), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1080, elevacion: -43.945616567), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1260, elevacion: -9.763871722), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1439, elevacion: 26.872810023), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 0, elevacion: 33.836823612), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 300, elevacion: -26.817467895), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 480, elevacion: -54.085964206), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 600, elevacion: -51.852593608), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 720, elevacion: -33.471146425), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 840, elevacion: -9.678498333), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1080, elevacion: 38.386349858), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1260, elevacion: 56.276188589), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 9, dia: 23, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1439, elevacion: 34.022757552), // Sidney 2026-09-23
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 0, elevacion: 63.170761441), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 300, elevacion: 48.092259067), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 480, elevacion: 11.489772981), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 600, elevacion: -10.284547391), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 720, elevacion: -26.681729968), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 840, elevacion: -32.671332329), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1080, elevacion: -8.025950215), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1260, elevacion: 26.132496782), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 0, minutos: 1439, elevacion: 62.970523338), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 0, elevacion: 50.899595948), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 300, elevacion: 60.441366110), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 480, elevacion: 23.389291683), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 600, elevacion: 0.160771996), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 720, elevacion: -19.434116670), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 840, elevacion: -31.312473885), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1080, elevacion: -17.508753234), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1260, elevacion: 14.134323374), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 60, minutos: 1439, elevacion: 50.692455755), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 0, elevacion: 38.460398393), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 300, elevacion: 72.052357376), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 480, elevacion: 35.649175224), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 600, elevacion: 11.481610060), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 720, elevacion: -10.291533579), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 840, elevacion: -26.686143036), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1080, elevacion: -25.245516114), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1260, elevacion: 2.659950857), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: 120, minutos: 1439, elevacion: 38.253480187), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 0, elevacion: 48.113863552), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 300, elevacion: -10.267241631), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 480, elevacion: -31.305568355), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 600, elevacion: -30.540654096), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 720, elevacion: -17.526323112), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 840, elevacion: 2.633545981), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1080, elevacion: 50.874174847), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1260, elevacion: 79.467732742), // Sidney 2026-12-21
        Caso(anio: 2026, mes: 12, dia: 21, lat: -33.8688, lon: 151.2093, desfase: -300, minutos: 1439, elevacion: 48.321334869), // Sidney 2026-12-21
    ]

    func testTraduccionFielAlTypeScript() {
        for c in casos {
            let d = Sol.dia(anio: c.anio, mes: c.mes, dia: c.dia, lat: c.lat, lon: c.lon, desfaseMin: c.desfase)
            let mia = Sol.elevacion(d, minutos: c.minutos)
            XCTAssertEqual(
                mia, c.elevacion, accuracy: tolerancia,
                "\(c.anio)-\(c.mes)-\(c.dia) a \(Int(c.minutos)) min, lat \(c.lat): TypeScript dice \(c.elevacion) y Swift \(mia)"
            )
        }
    }

    /// Y una prueba que no depende del oráculo, por si el oráculo se generara mal.
    func testCosasQueSeSabenSinCalcular() {
        // En Tromsø, en el solsticio de junio, el sol no se pone: ni a
        // medianoche baja del horizonte.
        let tromsoJunio = Sol.dia(anio: 2026, mes: 6, dia: 21, lat: 69.6492, lon: 18.9553, desfaseMin: 120)
        XCTAssertGreaterThan(Sol.elevacion(tromsoJunio, minutos: 0), 0, "sol de medianoche")

        // Y en diciembre no sale: ni a mediodía sube del horizonte.
        let tromsoDiciembre = Sol.dia(anio: 2026, mes: 12, dia: 21, lat: 69.6492, lon: 18.9553, desfaseMin: 60)
        XCTAssertLessThan(Sol.elevacion(tromsoDiciembre, minutos: 720), 0, "noche polar")

        // En Madrid, en el solsticio de junio, el sol pasa de 70°.
        let madrid = Sol.dia(anio: 2026, mes: 6, dia: 21, lat: 40.4165, lon: -3.7026, desfaseMin: 120)
        XCTAssertGreaterThan(Sol.elevacion(madrid, minutos: 14 * 60), 70, "mediodía de junio en Madrid")

        // Y en diciembre no llega a los 30° que hacen falta para la vitamina D.
        let madridDic = Sol.dia(anio: 2026, mes: 12, dia: 21, lat: 40.4165, lon: -3.7026, desfaseMin: 60)
        XCTAssertLessThan(Sol.elevacion(madridDic, minutos: 13 * 60), Alturas.uvb, "sin UVB en diciembre")
    }
}
