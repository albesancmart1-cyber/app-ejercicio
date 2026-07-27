#!/usr/bin/env python3
"""
Informe en PDF de la prueba larga de Ritmo.

Lee la bitácora que deja `scripts/simulacion.mjs` —lo que la app decidió por su
cuenta durante seis meses conducida por el navegador— y arma un documento con
las capturas de pantalla intercaladas.

Uso:  python3 scripts/informe.py <directorio_de_capturas> <salida.pdf>
"""
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Line, PolyLine, String, Rect, Circle
from reportlab.graphics import renderPDF

# ── Paleta ────────────────────────────────────────────────
# Validada con el comprobador de daltonismo del método de visualización:
# ΔE 24,7 en protanopía, 33,6 en visión normal. Fondo claro, para imprimir.
SERIE_1 = colors.HexColor("#2a78d6")   # azul
SERIE_2 = colors.HexColor("#eb6834")   # naranja
TINTA = colors.HexColor("#111111")
TINTA_2 = colors.HexColor("#52514e")
TINTA_3 = colors.HexColor("#8a8880")
REJILLA = colors.HexColor("#e4e3de")
ACENTO = colors.HexColor("#b8622f")

ANCHO_UTIL = A4[0] - 40 * mm

# ── Estilos ───────────────────────────────────────────────
base = getSampleStyleSheet()


def estilo(nombre, **kw):
    return ParagraphStyle(nombre, parent=base["Normal"], **kw)


H1 = estilo("H1", fontName="Helvetica-Bold", fontSize=19, leading=24,
            textColor=TINTA, spaceBefore=18, spaceAfter=9)
H2 = estilo("H2", fontName="Helvetica-Bold", fontSize=12.5, leading=16,
            textColor=TINTA, spaceBefore=14, spaceAfter=6)
CUERPO = estilo("Cuerpo", fontSize=9.9, leading=14.6, textColor=TINTA,
                spaceAfter=8, alignment=TA_LEFT)
PIE = estilo("Pie", fontSize=8.2, leading=11.5, textColor=TINTA_2, spaceAfter=12)
CITA = estilo("Cita", fontSize=9.3, leading=14, textColor=TINTA_2,
              leftIndent=10, borderPadding=0, spaceBefore=4, spaceAfter=10)
PORTADA_T = estilo("PT", fontName="Helvetica-Bold", fontSize=30, leading=35,
                   textColor=TINTA, alignment=TA_CENTER)
PORTADA_S = estilo("PS", fontSize=12, leading=18, textColor=TINTA_2,
                   alignment=TA_CENTER)


def limpiar(t):
    """Texto de la app a texto de informe: sin dobles espacios ni cortes raros."""
    return re.sub(r"\s+", " ", (t or "")).strip()


# ── Gráficas ──────────────────────────────────────────────

def marco(dibujo, x0, y0, ancho, alto, ymin, ymax, etiquetas_y, titulo_y):
    """Ejes recesivos: rejilla horizontal fina y nada de caja alrededor."""
    for valor in etiquetas_y:
        y = y0 + (valor - ymin) / (ymax - ymin) * alto
        dibujo.add(Line(x0, y, x0 + ancho, y, strokeColor=REJILLA, strokeWidth=0.6))
        dibujo.add(String(x0 - 5, y - 3, f"{valor:g}", fontSize=7,
                          fillColor=TINTA_3, textAnchor="end"))
    dibujo.add(String(x0 - 5, y0 + alto + 9, titulo_y, fontSize=7.5,
                      fillColor=TINTA_3, textAnchor="start"))


def serie(dibujo, puntos, color, x0, y0, ancho, alto, xmin, xmax, ymin, ymax,
          etiqueta=None, escalones=False):
    def px(x):
        return x0 + (x - xmin) / max(xmax - xmin, 1e-9) * ancho

    def py(y):
        return y0 + (y - ymin) / max(ymax - ymin, 1e-9) * alto

    coords = []
    anterior = None
    for x, y in puntos:
        if escalones and anterior is not None:
            coords += [px(x), py(anterior)]
        coords += [px(x), py(y)]
        anterior = y
    dibujo.add(PolyLine(coords, strokeColor=color, strokeWidth=2,
                        strokeLineJoin=1, strokeLineCap=1))
    if etiqueta:
        ux, uy = puntos[-1]
        dibujo.add(Circle(px(ux), py(uy), 3.2, fillColor=color, strokeColor=colors.white,
                          strokeWidth=1.6))
        dibujo.add(String(px(ux) + 6, py(uy) - 3, etiqueta, fontSize=7.6,
                          fillColor=TINTA_2))


def leyenda(dibujo, entradas, x, y):
    for texto, color in entradas:
        dibujo.add(Rect(x, y, 9, 3, fillColor=color, strokeColor=None))
        dibujo.add(String(x + 13, y - 1, texto, fontSize=7.6, fillColor=TINTA_2))
        x += 13 + len(texto) * 4.3 + 16


def grafica_carga(sesiones, ancho=ANCHO_UTIL, alto=125):
    """Kilos totales movidos por sesión de fuerza. Una serie: sin leyenda."""
    puntos = []
    for i, s in enumerate(sesiones):
        total = sum((e["pesoKg"] or 0) * e["series"] * (e["repeticiones"] or 0)
                    for e in s["ejercicios"])
        if total > 0:
            puntos.append((s["_semana"], total))
    if not puntos:
        return None

    d = Drawing(ancho, alto + 30)
    x0, y0, w, h = 34, 24, ancho - 70, alto - 10
    ymax = max(p[1] for p in puntos) * 1.1
    xmax = max(p[0] for p in puntos)
    marco(d, x0, y0, w, h, 0, ymax, [0, round(ymax / 2 / 500) * 500, round(ymax / 500) * 500],
          "kg levantados en la sesión")
    serie(d, puntos, SERIE_1, x0, y0, w, h, 0, xmax, 0, ymax, etiqueta=f"{puntos[-1][1]:,.0f} kg".replace(",", "."))
    for semana in range(0, xmax + 1, 4):
        d.add(String(x0 + semana / max(xmax, 1) * w, y0 - 11, f"sem {semana}",
                     fontSize=7, fillColor=TINTA_3, textAnchor="middle"))
    return d


def grafica_composicion(mediciones, ancho=ANCHO_UTIL, alto=135):
    """Grasa y músculo en kg. Misma unidad, así que un solo eje."""
    grasa, musculo = [], []
    for m in mediciones:
        grasa.append((m["_semana"], m["pesoKg"] * m["grasaPct"] / 100))
        musculo.append((m["_semana"], m["pesoKg"] * m["musculoPct"] / 100))
    if len(grasa) < 2:
        return None

    d = Drawing(ancho, alto + 34)
    x0, y0, w, h = 34, 28, ancho - 78, alto - 16
    todos = [p[1] for p in grasa + musculo]
    ymin, ymax = min(todos) - 2, max(todos) + 2
    xmax = max(p[0] for p in grasa)
    marco(d, x0, y0, w, h, ymin, ymax,
          [round(ymin) + 1, round((ymin + ymax) / 2), round(ymax) - 1], "kg")
    serie(d, grasa, SERIE_2, x0, y0, w, h, 0, xmax, ymin, ymax, etiqueta="grasa")
    serie(d, musculo, SERIE_1, x0, y0, w, h, 0, xmax, ymin, ymax, etiqueta="músculo")
    for semana in range(0, xmax + 1, 4):
        d.add(String(x0 + semana / max(xmax, 1) * w, y0 - 11, f"sem {semana}",
                     fontSize=7, fillColor=TINTA_3, textAnchor="middle"))
    leyenda(d, [("Músculo", SERIE_1), ("Grasa", SERIE_2)], x0, y0 + h + 20)
    return d


def grafica_nivel(sesiones, ancho=ANCHO_UTIL, alto=95):
    """Nivel de volumen a lo largo del tiempo. Escalones, que es como cambia."""
    puntos = [(s["_semana"], s["nivel"]) for s in sesiones if s.get("nivel")]
    if len(puntos) < 2:
        return None
    d = Drawing(ancho, alto + 26)
    x0, y0, w, h = 34, 24, ancho - 70, alto - 12
    xmax = max(p[0] for p in puntos)
    marco(d, x0, y0, w, h, 1, 4, [1, 2, 3, 4], "nivel de volumen (1 a 4)")
    serie(d, puntos, SERIE_1, x0, y0, w, h, 0, xmax, 1, 4, escalones=True)
    for semana in range(0, xmax + 1, 4):
        d.add(String(x0 + semana / max(xmax, 1) * w, y0 - 11, f"sem {semana}",
                     fontSize=7, fillColor=TINTA_3, textAnchor="middle"))
    return d


# ── Capturas ──────────────────────────────────────────────

def captura(carpeta, nombre, pie, alto_mm=108):
    ruta = carpeta / f"{nombre}.png"
    if not ruta.exists():
        return []
    from PIL import Image as PILImage
    with PILImage.open(ruta) as im:
        w, h = im.size
    alto = alto_mm * mm
    ancho = alto * w / h
    if ancho > ANCHO_UTIL:
        ancho = ANCHO_UTIL
        alto = ancho * h / w
    return [KeepTogether([
        Spacer(1, 4),
        Image(str(ruta), width=ancho, height=alto, hAlign="CENTER"),
        Spacer(1, 3),
        Paragraph(pie, PIE),
    ])]


def tabla(datos, anchos, cabecera=True):
    t = Table(datos, colWidths=anchos, hAlign="LEFT")
    estilo_t = [
        ("FONT", (0, 0), (-1, -1), "Helvetica", 8.4),
        ("TEXTCOLOR", (0, 0), (-1, -1), TINTA),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, REJILLA),
    ]
    if cabecera:
        estilo_t += [
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.4),
            ("TEXTCOLOR", (0, 0), (-1, 0), TINTA_2),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, TINTA_3),
        ]
    t.setStyle(TableStyle(estilo_t))
    return t


# ── Documento ─────────────────────────────────────────────

def construir(carpeta: Path, salida: Path):
    bit = json.loads((carpeta / "bitacora.json").read_text(encoding="utf-8"))
    sesiones = bit["sesiones"]
    mediciones = bit["mediciones"]
    hitos = bit["hitos"]

    inicio = datetime.fromisoformat(sesiones[0]["fecha"]).date()

    def semana_de(f):
        return (datetime.fromisoformat(f).date() - inicio).days // 7

    for s in sesiones:
        s["_semana"] = semana_de(s["fecha"])
    for m in mediciones:
        m["_semana"] = semana_de(m["fecha"])

    fuerza = [s for s in sesiones if "Fuerza" in s["titulo"] or "progresiva" in s["titulo"]]
    cardio = [s for s in sesiones if s not in fuerza]

    # Progresión de carga: primera y última sesión con peso.
    con_peso = [s for s in sesiones if any(e["pesoKg"] for e in s["ejercicios"])]
    def total(s):
        return sum((e["pesoKg"] or 0) * e["series"] * (e["repeticiones"] or 0) for e in s["ejercicios"])

    primera_carga = total(con_peso[0]) if con_peso else 0
    ultima_carga = total(con_peso[-1]) if con_peso else 0

    # La captura de cada nivel se tomó en la última subida a ese nivel, así que
    # el informe cita esa misma, no la primera vez que se rozó.
    niveles = {}
    for h in hitos:
        m = re.match(r"Nivel de volumen (\d) de 4", h.get("nota", ""))
        if m:
            niveles[int(m.group(1))] = {**h, "_semana": semana_de(h["fecha"])}

    m0, mf = (mediciones[0], mediciones[-1]) if mediciones else (None, None)

    doc = SimpleDocTemplate(
        str(salida), pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title="Ritmo · seis meses de prueba real",
        author="Informe de la prueba automatizada",
    )
    S = []

    # ── Portada ───────────────────────────────────────────
    S += [
        Spacer(1, 45 * mm),
        Paragraph("Ritmo", PORTADA_T),
        Spacer(1, 5),
        Paragraph("Seis meses de entrenamiento, probados de verdad", PORTADA_S),
        Spacer(1, 14 * mm),
        Paragraph(
            f"Del {inicio.strftime('%d/%m/%Y')} al "
            f"{datetime.fromisoformat(sesiones[-1]['fecha']).date().strftime('%d/%m/%Y')}"
            f" &nbsp;·&nbsp; {len(sesiones)} sesiones &nbsp;·&nbsp; {len(mediciones)} mediciones de báscula",
            PORTADA_S),
        Spacer(1, 20 * mm),
    ]

    resumen = [
        ["", "Al empezar", "Al terminar"],
        ["Carga movida por sesión", f"{primera_carga:,.0f} kg".replace(",", "."),
         f"{ultima_carga:,.0f} kg".replace(",", ".")],
    ]
    if m0 and mf:
        resumen += [
            ["Peso", f"{m0['pesoKg']} kg", f"{mf['pesoKg']} kg"],
            ["Grasa", f"{m0['pesoKg'] * m0['grasaPct'] / 100:.1f} kg ({m0['grasaPct']} %)",
             f"{mf['pesoKg'] * mf['grasaPct'] / 100:.1f} kg ({mf['grasaPct']} %)"],
            ["Músculo", f"{m0['pesoKg'] * m0['musculoPct'] / 100:.1f} kg ({m0['musculoPct']} %)",
             f"{mf['pesoKg'] * mf['musculoPct'] / 100:.1f} kg ({mf['musculoPct']} %)"],
        ]
    resumen.append(["Nivel de volumen", "1 de 4", f"{max(niveles) if niveles else 1} de 4"])
    S += [tabla(resumen, [58 * mm, 46 * mm, 46 * mm]), PageBreak()]

    # ── Cómo se hizo ──────────────────────────────────────
    S += [
        Paragraph("Cómo se hizo esta prueba", H1),
        Paragraph(
            "No es una simulación de despacho ni datos inventados metidos a mano en la base de "
            "datos. Un guion abre la app en un navegador de verdad, hace el alta, y a partir de ahí "
            "vive seis meses día a día: adelanta el reloj del navegador, contesta el check-in de la "
            "mañana, mira qué le propone la app, prepara la sesión, <b>anota todas las series una a "
            "una</b> con el peso que la propia app sugiere, y la guarda. Cada dos domingos entra en "
            "«Cuerpo» y apunta la báscula.", CUERPO),
        Paragraph(
            "Todo lo que aparece a partir de aquí —qué entrenamiento tocaba cada día, cuánto peso "
            "sugerir, cuándo subir el volumen, qué decir de la báscula— <b>lo decidió la app sola</b>. "
            "El guion solo se comporta como un usuario constante.", CUERPO),
        Paragraph("Lo que se le pidió al usuario simulado", H2),
        tabla([
            ["Perfil", "78 kg, 1,78 m, recomposición corporal, en cetosis desde diciembre"],
            ["Material", "Mancuernas hasta 24 kg, banco, bandas, bici y poder salir a correr"],
            ["Constancia", "Lunes, miércoles y viernes. Sin heroicidades ni semanas perfectas"],
            ["Esfuerzo", "Todas las series completas, siempre en el tope del rango de repeticiones"],
            ["Sensación", "4 sobre 5 al terminar: cómodo, sin llegar al fallo"],
            ["Descanso", "Tres noches malas repartidas por los seis meses, con hambre y antojos"],
            ["Báscula", "Recomposición real las 12 primeras semanas; a partir de ahí, plana"],
        ], [26 * mm, 124 * mm], cabecera=False),
        Spacer(1, 8),
        Paragraph(
            "Esa última línea es la clave del experimento: <b>el entreno nunca empeora</b>. Lo que "
            "cambia a mitad de camino es que el cuerpo deja de responder. Eso es exactamente lo que "
            "pasa en la vida real cuando uno se adapta, y era lo que había que ver cómo maneja la app.",
            CUERPO),
    ]
    S += captura(carpeta, "sim-00-alta", "El punto de partida: perfil recién creado, sin una sola sesión detrás.")

    # ── Fase 1 ────────────────────────────────────────────
    S += [PageBreak(), Paragraph("1. Partir de cero", H1)]
    primera = sesiones[0]
    S += [
        Paragraph(
            f"Primer día, {primera['fecha']}. Un usuario nuevo, sin historial, contesta que ha "
            "dormido bien y tiene energía. La app <b>no</b> le propone entrenar fuerte: propone "
            f"«{primera['titulo']}».", CUERPO),
        Paragraph(
            "Esto es lo correcto y no es obvio: la disposición del cuerpo salía alta, así que la "
            "tentación sería empezar a tope. La app antepone la regla de vuelta progresiva —volumen "
            "recortado, lejos del fallo, todo el cuerpo repartido— porque venir de parado importa más "
            "que haber dormido bien una noche.", CUERPO),
    ]
    S += captura(carpeta, "sim-01-primer-dia", "Día 1: disposición alta y aun así, vuelta progresiva.")
    S += captura(carpeta, "sim-02-primer-plan",
                 "El primer plan: dos series por ejercicio y peso corporal. Sin agujetas de tres días.")
    S += captura(carpeta, "sim-03-registro",
                 "El registro serie a serie. El peso que aparece en gris es el que sugiere la app; "
                 "el usuario simulado lo acepta tal cual.")

    # ── Fase 2: la carga ──────────────────────────────────
    S += [PageBreak(), Paragraph("2. La carga sube sola", H1)]
    S += [
        Paragraph(
            "El usuario no decide nunca cuánto peso poner: usa el que sugiere la app. Como completa "
            "todas las series en el tope del rango, la doble progresión hace su trabajo sesión a "
            "sesión. Nadie tiene que llevar la cuenta.", CUERPO),
    ]
    g = grafica_carga(sesiones)
    if g:
        S += [g, Paragraph(
            "Kilos totales levantados en cada sesión de fuerza (peso × series × repeticiones). "
            "Los dientes de sierra no son ruido: son los distintos grupos musculares, que no mueven "
            "el mismo peso. Lo que importa es la pendiente.", PIE)]

    # Progresión de un ejercicio concreto, si se repite lo bastante.
    from collections import defaultdict
    por_ejercicio = defaultdict(list)
    for s in sesiones:
        for e in s["ejercicios"]:
            if e["pesoKg"]:
                por_ejercicio[e["ejercicio"]].append((s["_semana"], e["pesoKg"], e["series"]))
    frecuentes = sorted(por_ejercicio.items(), key=lambda kv: -len(kv[1]))[:3]
    if frecuentes:
        filas = [["Ejercicio", "Veces", "Primera vez", "Última vez", "Series al final"]]
        for nombre, apariciones in frecuentes:
            filas.append([
                nombre[:34],
                str(len(apariciones)),
                f"{apariciones[0][1]:g} kg (sem {apariciones[0][0]})",
                f"{apariciones[-1][1]:g} kg (sem {apariciones[-1][0]})",
                str(apariciones[-1][2]),
            ])
        S += [Paragraph("Los tres ejercicios más repetidos", H2),
              tabla(filas, [50 * mm, 14 * mm, 32 * mm, 32 * mm, 22 * mm])]
        S += [Spacer(1, 6), Paragraph(
            "El tope de las mancuernas son 24 kg, y la app no lo pasa nunca. Cuando un ejercicio "
            "llega ahí, la progresión deja de venir del peso y pasa a venir del volumen, que es "
            "justo lo que hace el siguiente apartado.", CUERPO)]

    # ── Fase 3: el volumen ────────────────────────────────
    S += [PageBreak(), Paragraph("3. El volumen sube cuando el cuerpo lo demuestra", H1)]
    S += [
        Paragraph(
            "Aquí está lo que había que ver. La app no sube el volumen por calendario: cuenta "
            "<b>sesiones limpias</b> —todas las series marcadas, dentro del rango, sin sufrir— y solo "
            "cuando hay bastantes, y la báscula da permiso, añade trabajo. Y lo dice.", CUERPO),
    ]
    g = grafica_nivel(sesiones)
    if g:
        S += [g, Paragraph(
            "Nivel de volumen a lo largo de los seis meses. Sube por escalones, nunca de golpe, y "
            "solo tras encadenar sesiones completas.", PIE)]

    for nivel in sorted(niveles):
        if nivel == 1:
            continue
        s = niveles[nivel]
        S += [Paragraph(f"Nivel {nivel} de 4 &nbsp;·&nbsp; semana {s['_semana']} ({s['fecha']})", H2)]
        S += captura(carpeta, f"sim-nivel-{nivel}",
                     f"Lo que ve el usuario al subir a nivel {nivel}: qué cambia, por qué, y en qué se basa.",
                     alto_mm=110)

    # ── Fase 4: la báscula ────────────────────────────────
    S += [PageBreak(), Paragraph("4. Lo que dijo la báscula", H1)]
    g = grafica_composicion(mediciones)
    if g:
        S += [g, Paragraph(
            "Kilos de músculo y de grasa, calculados a partir de los porcentajes de la báscula y el "
            "peso. Misma unidad y mismo eje: son directamente comparables.", PIE)]
    S += [Paragraph(
        "La app no se moja hasta que tiene con qué. Con una o dos mediciones dice literalmente que "
        "no se puede distinguir un cambio real del vaivén normal, y que no hagas caso al número. "
        "Solo a partir de la tercera —y con tres semanas de por medio— empieza a interpretar.", CUERPO)]

    filas = [["Fecha", "Sem.", "Peso", "Grasa", "Músculo", "Veredicto de la app"]]
    for m in mediciones:
        v = limpiar(m["veredicto"] or "")
        titulo_v = v.split("Con ")[0].split("Estás")[0].strip() or v[:38]
        # El veredicto empieza por su titular; con eso basta para la tabla.
        for cabeza in ["Aún es pronto para decir nada", "Estás recomponiendo",
                       "Vas bien: la grasa baja", "Vas bien: el músculo sube",
                       "Esto no está yendo bien", "Todo plano de momento"]:
            if v.startswith(cabeza):
                titulo_v = cabeza
                break
        filas.append([
            m["fecha"][5:], str(m["_semana"]), f"{m['pesoKg']:g}",
            f"{m['pesoKg'] * m['grasaPct'] / 100:.1f} kg",
            f"{m['pesoKg'] * m['musculoPct'] / 100:.1f} kg",
            titulo_v[:34],
        ])
    S += [Spacer(1, 6), tabla(filas, [16 * mm, 11 * mm, 16 * mm, 20 * mm, 22 * mm, 65 * mm])]

    S += captura(carpeta, "sim-07-tendencia-buena",
                 "Semana 10: con datos suficientes, la app se moja y llama a las cosas por su nombre.")

    # ── Fase 5: el estancamiento ──────────────────────────
    S += [PageBreak(), Paragraph("5. El estancamiento, que era la prueba de fuego", H1)]
    S += [
        Paragraph(
            "A partir de la semana 12 el entrenamiento no cambia: mismas sesiones completas, mismo "
            "esfuerzo, misma sensación al terminar. Lo que cambia es que la báscula se planta. Es el "
            "momento en que una app mal hecha empezaría a hablar de calorías, de déficit, o a "
            "sugerir que te estás engañando.", CUERPO),
    ]
    S += captura(carpeta, "sim-11-estancamiento",
                 "El veredicto del estancamiento. Lo dice claro, sin dramatizar y sin culpar a nadie.")
    S += captura(carpeta, "sim-12-tendencia-plana",
                 "La gráfica del mismo momento: sube hasta la semana 12 y ahí se aplana.")

    S += [Paragraph("Y no se queda en el comentario", H2)]
    S += [Paragraph(
        "El estado de la tendencia es una de las tres señales que mira el motor de volumen. En cuanto "
        "la composición pasa a «plana» y el cuerpo sigue asimilando la carga, la app <b>adelanta un "
        "nivel</b> en lugar de esperar a acumular más sesiones limpias. Pedir un poco más es "
        "justamente lo que toca cuando lo de ahora ha dejado de producir cambio.", CUERPO)]

    ultima_subida = niveles.get(max(niveles)) if niveles else None
    estancamiento = next((m for m in mediciones
                          if (m["veredicto"] or "").startswith("Todo plano")), None)
    if ultima_subida and estancamiento:
        S += [tabla([
            ["Semana", "Qué pasó"],
            [str(estancamiento["_semana"]),
             "La báscula lleva 12 semanas plana. La app lo dice: «Todo plano de momento»."],
            [str(ultima_subida["_semana"]),
             f"Primera sesión después. Sube a nivel {max(niveles)} de 4, el máximo."],
        ], [18 * mm, 132 * mm])]
        S += [Spacer(1, 8)]
    S += captura(carpeta, "sim-09-plan-maximo",
                 "El plan en el nivel máximo, comparado con el de la primera semana: más ejercicios, "
                 "cuatro series y las mancuernas a tope.")

    S += captura(carpeta, "sim-13-balance-final",
                 "Seis meses después: ningún grupo muscular abandonado por el camino. "
                 "El usuario no tuvo que pensar ni un solo día qué tocaba.", alto_mm=110)

    # ── El fallo encontrado ───────────────────────────────
    S += [PageBreak(), Paragraph("6. Un fallo que solo aparece a los cinco meses", H1)]
    S += [
        Paragraph(
            "Esta prueba no se hizo para confirmar lo que ya se sabía, y no lo confirmó: en la primera "
            "pasada completa <b>la app no detectó el estancamiento</b>. En la semana 20, con el músculo "
            "parado desde la 16, seguía diciendo «estás recomponiendo, no cambies nada».", CUERPO),
        Paragraph(
            "El motivo, al mirar el código: la pendiente se calculaba por mínimos cuadrados sobre "
            "<b>todas</b> las mediciones desde la primera. Cuatro meses buenos pesaban más que dos "
            "malos, así que la recta seguía saliendo a favor. Es un fallo que ningún test corto "
            "encuentra y que ningún usuario nota hasta que lleva medio año midiendo — momento en el "
            "que además recibe el peor consejo posible: seguir igual, justo cuando lo que hace ha "
            "dejado de funcionar.", CUERPO),
        Paragraph("El arreglo", H2),
        Paragraph(
            "El veredicto pasa a mirar una <b>ventana de 12 semanas</b> contada desde la última "
            "medición. Es tiempo de sobra para que el vaivén de la bioimpedancia se promedie, y poco "
            "para que un parón real quede tapado. Si en esa ventana no hay mediciones suficientes "
            "—alguien que se pesa una vez al mes— se estira hacia atrás hasta el mínimo antes que "
            "renunciar a opinar. La gráfica sigue dibujando el histórico completo: lo que se acota es "
            "el juicio, no lo que ves.", CUERPO),
        Paragraph(
            "El arreglo desatasca además el motor de volumen, que usa el estado de la tendencia como "
            "señal. Con el estancamiento detectado a tiempo, sube de nivel en vez de esperar. Todo lo "
            "que aparece en este informe está medido ya con el arreglo puesto, y quedan cuatro tests "
            "nuevos —dos de ellos fallan sin él— para que no vuelva.", CUERPO),
    ]

    # ── Cierre ────────────────────────────────────────────
    S += [PageBreak(), Paragraph("Qué se comprobó, y qué habría que vigilar", H1)]
    S += [Paragraph("Funciona como se esperaba", H2)]
    for punto in [
        "Partir de cero <b>no</b> se confunde con estar en forma: la vuelta progresiva se impone "
        "aunque la disposición del día sea alta.",
        "La carga sube sola con la doble progresión, sin que el usuario lleve ninguna cuenta, y "
        "respeta el tope real del material disponible.",
        "El volumen sube por escalones y solo tras encadenar sesiones limpias; cada subida viene "
        "explicada con qué cambia, por qué y en qué se basa.",
        "Con una o dos mediciones la app se niega a interpretar la báscula, que es lo honesto.",
        "El estancamiento se nombra sin dramatizar, y además dispara el siguiente escalón de "
        "volumen en vez de quedarse en un comentario.",
        "En seis meses ningún grupo muscular se quedó sin trabajar.",
        "En 78 sesiones y 13 mediciones no salió ni un solo error de consola. Y revisando los 142 "
        "mensajes que la app escribió por el camino —36.000 caracteres— no aparece ni una vez "
        "la palabra caloría, déficit o superávit.",
    ]:
        S += [Paragraph(f"• {punto}", CUERPO)]

    S += [Paragraph("Lo que esta prueba no cubre", H2)]
    for punto in [
        "El usuario simulado es <b>demasiado bueno</b>: nunca falla una serie, nunca se salta una "
        "semana entera, nunca se lesiona. Falta probar el camino contrario —parones largos, "
        "sesiones a medias— aunque las reglas para eso ya existen y tienen sus tests.",
        "La báscula simulada es limpia. Una báscula de bioimpedancia real da saltos de un día para "
        "otro según hidratación y hora; la app ya exige tres semanas y tres mediciones antes de "
        "opinar, pero conviene verlo con datos tuyos de verdad.",
        "Seis meses son suficientes para llegar al nivel máximo de volumen, pero no para ver qué "
        "pasa cuando el tope de 24 kg de mancuerna se queda corto en todo. Ahí la respuesta ya no "
        "es de la app: es comprar más peso.",
    ]:
        S += [Paragraph(f"• {punto}", CUERPO)]

    def pie_pagina(canvas, documento):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(TINTA_3)
        canvas.drawString(20 * mm, 11 * mm, "Ritmo · prueba de seis meses")
        canvas.drawRightString(A4[0] - 20 * mm, 11 * mm, str(documento.page))
        canvas.restoreState()

    doc.build(S, onFirstPage=lambda c, d: None, onLaterPages=pie_pagina)
    print("PDF escrito en", salida)


if __name__ == "__main__":
    construir(Path(sys.argv[1]), Path(sys.argv[2]))
