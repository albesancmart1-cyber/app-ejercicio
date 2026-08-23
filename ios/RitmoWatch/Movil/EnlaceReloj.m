#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Lo que hace visible el plugin de Swift a JavaScript. Capacitor lo lee al
// arrancar: sin este fichero el plugin compila y no existe para la web.
CAP_PLUGIN(EnlaceReloj, "EnlaceReloj",
           CAP_PLUGIN_METHOD(recoger, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(mandarSitio, CAPPluginReturnPromise);
)
