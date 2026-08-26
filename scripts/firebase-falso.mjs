/**
 * Un Firebase de mentira, compartido entre varias pestañas.
 *
 * Está aparte porque lo usan dos recorridos y uno de ellos —el de los dos
 * dispositivos— necesita que **las dos pestañas hablen con el mismo servidor**:
 * es la única forma de comprobar de verdad que lo que empieza en una aparece en
 * la otra. Dos copias del mismo simulacro no probarían nada.
 *
 * Imita lo justo: entrar, crear cuenta, refrescar el testigo, y un documento por
 * usuario con el JSON entero dentro, que es exactamente lo que hace Firestore.
 */
const IDENTIDAD = 'https://identitytoolkit.googleapis.com'
const TESTIGOS = 'https://securetoken.googleapis.com'
const DATOS = 'https://firestore.googleapis.com'

const json = (route, cuerpo, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) })

const fallo = (route, mensaje, status = 400) =>
  json(route, { error: { code: status, message: mensaje } }, status)

/** Unos datos de la app con las sesiones que se digan, y nada más. */
export function sesionesDelDia(sesiones) {
  return {
    version: 2,
    profile: {
      name: 'Alberto',
      goal: 'recomposicion',
      equipment: ['peso_corporal', 'mancuernas'],
      maxWeights: { mancuernas: 24 },
      lat: 40.4165,
      lon: -3.7026,
      sitio: 'Madrid'
    },
    profileUpdatedAt: 1000,
    checkIns: [],
    sessions: sesiones.map((s) => ({
      updatedAt: 5000,
      kind: 'fuerza',
      title: `Fuerza · ${s.id}`,
      completed: true,
      exercises: [],
      ...s
    })),
    measurements: []
  }
}

export function montarFirebaseFalso({ datos = null, cuentas = {} } = {}) {
  const estado = {
    /** El documento de la cuenta, tal cual lo tendría Firestore. */
    datos,
    /** Correo → contraseña. Las que existan al empezar. */
    cuentas: { ...cuentas },
    /** Cada intento de entrar, para poder mirar el orden. */
    entradas: [],
    subidas: 0,
    lecturas: 0
  }

  const uidDe = (email) => `uid-${email.replace(/[^a-z0-9]/gi, '')}`

  async function enchufar(page) {
    await page.route(`${IDENTIDAD}/**`, async (route) => {
      const req = route.request()
      const ruta = new URL(req.url()).pathname
      const c = JSON.parse(req.postData() ?? '{}')
      const metodo = ruta.slice(ruta.lastIndexOf(':') + 1)

      if (metodo === 'signInWithPassword' || metodo === 'signUp') {
        estado.entradas.push({ metodo, email: c.email })
        const guardada = estado.cuentas[c.email]

        if (metodo === 'signInWithPassword') {
          // Como Firebase de verdad: no distingue «no existe» de «no es esa».
          if (guardada === undefined || guardada !== c.password) {
            return fallo(route, 'INVALID_LOGIN_CREDENTIALS')
          }
        } else {
          if (guardada !== undefined) return fallo(route, 'EMAIL_EXISTS')
          estado.cuentas[c.email] = c.password
        }

        return json(route, {
          idToken: `tok-${c.email}`,
          refreshToken: `ref-${c.email}`,
          expiresIn: '3600',
          email: c.email,
          localId: uidDe(c.email)
        })
      }

      if (metodo === 'lookup') {
        const email = String(c.idToken ?? '').replace(/^tok-/, '')
        return json(route, { users: [{ email, localId: uidDe(email) }] })
      }
      if (metodo === 'sendOobCode') return json(route, {})
      return fallo(route, 'NOT_FOUND', 404)
    })

    await page.route(`${TESTIGOS}/**`, (route) =>
      json(route, {
        id_token: 'tok-renovado',
        refresh_token: 'ref-renovado',
        expires_in: '3600',
        user_id: 'uid'
      })
    )

    await page.route(`${DATOS}/**`, async (route) => {
      const req = route.request()
      const ruta = new URL(req.url()).pathname

      // El buzón de medidas: vacío, que aquí no se prueba.
      if (ruta.endsWith('/medidas')) return json(route, {})

      if (req.method() === 'GET') {
        estado.lecturas += 1
        if (estado.datos === null) return fallo(route, 'Document not found', 404)
        return json(route, {
          name: ruta.slice(1),
          fields: { datos: { stringValue: JSON.stringify(estado.datos) } }
        })
      }
      if (req.method() === 'PATCH') {
        estado.subidas += 1
        estado.datos = JSON.parse(JSON.parse(req.postData() ?? '{}').fields.datos.stringValue)
        return json(route, { name: ruta.slice(1) })
      }
      if (req.method() === 'DELETE') return json(route, {})
      return fallo(route, 'NOT_FOUND', 404)
    })
  }

  return {
    enchufar,
    get datos() {
      return estado.datos
    },
    get entradas() {
      return estado.entradas
    },
    get subidas() {
      return estado.subidas
    },
    get lecturas() {
      return estado.lecturas
    }
  }
}
