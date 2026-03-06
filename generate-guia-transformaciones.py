#!/usr/bin/env python3
"""Genera la Guia de Cuarto de Produccion (Transformaciones) en PDF."""

from fpdf import FPDF
from datetime import datetime


class GuiaPDF(FPDF):
    EMERALD = (5, 150, 105)
    EMERALD_DARK = (4, 120, 84)
    EMERALD_LIGHT = (209, 250, 229)
    DARK_TEXT = (30, 30, 30)
    GRAY_TEXT = (100, 100, 100)
    LIGHT_BG = (248, 250, 252)
    WHITE = (255, 255, 255)
    BORDER_COLOR = (226, 232, 240)
    AMBER_BG = (255, 251, 235)
    AMBER_TEXT = (146, 64, 14)
    RED_BG = (254, 242, 242)
    RED_TEXT = (153, 27, 27)

    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*self.GRAY_TEXT)
        self.cell(0, 8, "Taringuita - Guia Cuarto de Produccion", align="L")
        self.cell(0, 8, f"Pagina {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*self.BORDER_COLOR)
        self.line(10, 16, 200, 16)
        self.ln(4)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-15)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*self.GRAY_TEXT)
        self.cell(0, 10, "Documento confidencial - CodeMedia SpA", align="C")

    def cover_page(self):
        self.add_page()
        self.set_fill_color(*self.EMERALD)
        self.rect(0, 0, 210, 90, "F")

        self.set_fill_color(*self.WHITE)
        self.rect(85, 20, 40, 40, "F")
        self.set_font("Helvetica", "B", 36)
        self.set_text_color(*self.EMERALD)
        self.set_xy(85, 23)
        self.cell(40, 40, "T", align="C")

        self.set_text_color(*self.WHITE)
        self.set_font("Helvetica", "B", 13)
        self.set_xy(10, 65)
        self.cell(190, 10, "TARINGUITA INVENTORY", align="C")
        self.set_font("Helvetica", "", 11)
        self.set_xy(10, 75)
        self.cell(190, 8, "Guia: Cuarto de Produccion (Transformaciones)", align="C")

        # Metadata
        self.set_xy(30, 105)
        self.set_fill_color(*self.LIGHT_BG)
        self.set_draw_color(*self.BORDER_COLOR)
        self.rect(30, 105, 150, 45, "DF")

        self.set_text_color(*self.DARK_TEXT)
        self.set_font("Helvetica", "B", 10)
        self.set_xy(40, 112)
        self.cell(60, 8, "Version:")
        self.set_font("Helvetica", "", 10)
        self.cell(80, 8, "1.0 - Fase 6")

        month_names = {
            "January": "enero", "February": "febrero", "March": "marzo",
            "April": "abril", "May": "mayo", "June": "junio",
            "July": "julio", "August": "agosto", "September": "septiembre",
            "October": "octubre", "November": "noviembre", "December": "diciembre",
        }
        date_str = datetime.now().strftime("%d de %B de %Y")
        for en, es in month_names.items():
            date_str = date_str.replace(en, es)

        self.set_font("Helvetica", "B", 10)
        self.set_xy(40, 122)
        self.cell(60, 8, "Fecha:")
        self.set_font("Helvetica", "", 10)
        self.cell(80, 8, date_str)

        self.set_font("Helvetica", "B", 10)
        self.set_xy(40, 132)
        self.cell(60, 8, "Dirigido a:")
        self.set_font("Helvetica", "", 10)
        self.cell(80, 8, "Raymundo y equipo de cocina")

        # Description
        self.set_xy(25, 170)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*self.GRAY_TEXT)
        self.multi_cell(160, 5,
            "Esta guia explica como utilizar la nueva funcion de Cuarto de Produccion "
            "para registrar transformaciones de materia prima bruta a productos porcionados, "
            "con calculo automatico de merma y rendimiento.",
            align="C")

    def section_title(self, number, title):
        self.ln(4)
        self.set_fill_color(*self.EMERALD)
        self.set_text_color(*self.WHITE)
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 12, f"  {number}. {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)
        self.set_text_color(*self.DARK_TEXT)

    def subsection_title(self, title):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*self.EMERALD_DARK)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*self.DARK_TEXT)
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*self.DARK_TEXT)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet_list(self, items):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*self.DARK_TEXT)
        for item in items:
            x = self.get_x()
            self.set_x(x + 5)
            self.cell(5, 5.5, "-")
            self.multi_cell(170, 5.5, item)
            self.ln(1)
        self.ln(1)

    def numbered_list(self, items):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*self.DARK_TEXT)
        for i, item in enumerate(items, 1):
            x = self.get_x()
            self.set_x(x + 5)
            self.set_font("Helvetica", "B", 10)
            self.cell(8, 5.5, f"{i}.")
            self.set_font("Helvetica", "", 10)
            self.multi_cell(162, 5.5, item)
            self.ln(1)
        self.ln(1)

    def info_box(self, title, text):
        self.set_fill_color(*self.EMERALD_LIGHT)
        self.set_draw_color(*self.EMERALD)
        x = self.get_x()
        y = self.get_y()
        self.set_font("Helvetica", "", 9)
        lines = len(text) / 80 + 1
        h = max(20, int(lines * 5.5) + 16)
        self.rect(x, y, 190, h, "DF")
        self.set_xy(x + 5, y + 3)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*self.EMERALD_DARK)
        self.cell(0, 5, title)
        self.set_xy(x + 5, y + 9)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*self.DARK_TEXT)
        self.multi_cell(180, 4.5, text)
        self.set_y(y + h + 3)

    def warning_box(self, title, text):
        self.set_fill_color(*self.AMBER_BG)
        self.set_draw_color(*self.AMBER_TEXT)
        x = self.get_x()
        y = self.get_y()
        self.set_font("Helvetica", "", 9)
        lines = len(text) / 80 + 1
        h = max(20, int(lines * 5.5) + 16)
        self.rect(x, y, 190, h, "DF")
        self.set_xy(x + 5, y + 3)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*self.AMBER_TEXT)
        self.cell(0, 5, title)
        self.set_xy(x + 5, y + 9)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*self.DARK_TEXT)
        self.multi_cell(180, 4.5, text)
        self.set_y(y + h + 3)

    def simple_table(self, headers, rows, col_widths=None):
        if col_widths is None:
            col_widths = [190 / len(headers)] * len(headers)

        self.set_fill_color(*self.EMERALD)
        self.set_text_color(*self.WHITE)
        self.set_font("Helvetica", "B", 9)
        for i, header in enumerate(headers):
            self.cell(col_widths[i], 8, f" {header}", border=1, fill=True)
        self.ln()

        self.set_text_color(*self.DARK_TEXT)
        self.set_font("Helvetica", "", 9)
        fill = False
        for row in rows:
            if fill:
                self.set_fill_color(*self.LIGHT_BG)
            else:
                self.set_fill_color(*self.WHITE)
            for i, cell in enumerate(row):
                self.cell(col_widths[i], 7, f" {cell}", border=1, fill=True)
            self.ln()
            fill = not fill
        self.ln(3)


def generate_guide():
    pdf = GuiaPDF()

    # ==========================================================================
    # COVER
    # ==========================================================================
    pdf.cover_page()

    # ==========================================================================
    # 1. QUE ES EL CUARTO DE PRODUCCION
    # ==========================================================================
    pdf.add_page()
    pdf.section_title("1", "Que es el Cuarto de Produccion")

    pdf.body_text(
        "El Cuarto de Produccion es una nueva seccion del sistema que permite registrar "
        "como la materia prima bruta se transforma en productos porcionados listos para "
        "las estaciones de cocina."
    )

    pdf.subsection_title("El problema que resuelve")
    pdf.body_text(
        "Cuando llega un pulpo entero de 5 KG del proveedor, no se usa asi en las estaciones. "
        "Primero pasa por el cuarto de produccion donde se limpia, se porciona y se distribuye. "
        "De esos 5 KG salen, por ejemplo, 15 porciones de 140gr para frio y 12 porciones de 170gr "
        "para plancha. Lo que sobra (huesos, piel, partes no usables) es la merma."
    )

    pdf.body_text(
        "Sin este registro, es imposible saber cuanto se aprovecha realmente de cada materia prima "
        "y cuanto se pierde. El sistema ahora calcula esto automaticamente."
    )

    pdf.subsection_title("El flujo completo")

    pdf.set_fill_color(*GuiaPDF.LIGHT_BG)
    pdf.set_draw_color(*GuiaPDF.BORDER_COLOR)
    y = pdf.get_y()
    pdf.rect(15, y, 180, 18, "DF")
    pdf.set_xy(20, y + 2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*GuiaPDF.EMERALD_DARK)
    pdf.cell(170, 14,
        "Proveedor  -->  Almacenamiento (bruto)  -->  Produccion (transforma)  -->  Almacenamiento (porcionado)  -->  Estaciones",
        align="C")
    pdf.set_text_color(*GuiaPDF.DARK_TEXT)
    pdf.set_y(y + 24)

    pdf.subsection_title("Ejemplo practico")

    pdf.simple_table(
        ["Concepto", "Detalle"],
        [
            ["Entrada", "Pulpo entero: 5.00 KG"],
            ["Salida 1", "Pulpo 140gr (frio): 2.10 KG"],
            ["Salida 2", "Pulpo parrilla 170gr (plancha): 2.04 KG"],
            ["Total rendimiento", "4.14 KG (82.8%)"],
            ["Merma", "0.86 KG (17.2%)"],
        ],
        [50, 140],
    )

    pdf.info_box(
        "Resultado automatico",
        "Las salidas porcionadas se agregan automaticamente al inventario de la estacion "
        "Almacenamiento. No necesita ir a Inventario a registrarlas manualmente."
    )

    # ==========================================================================
    # 2. COMO ACCEDER
    # ==========================================================================
    pdf.add_page()
    pdf.section_title("2", "Como acceder")

    pdf.body_text(
        "La nueva seccion aparece en el menu de navegacion con el nombre 'Cuarto Prod.' "
        "y un icono de tijera."
    )

    pdf.subsection_title("En celular")
    pdf.numbered_list([
        "Abra la aplicacion Taringuita Inventory",
        "En la barra inferior, busque 'Cuarto Prod.' (si no lo ve, presione 'Mas')",
        "Toque para ingresar a la seccion",
    ])

    pdf.subsection_title("En computador")
    pdf.numbered_list([
        "Ingrese al sistema desde su navegador",
        "En la barra lateral izquierda, busque 'Cuarto Prod.' debajo de 'Produccion'",
        "Haga clic para ingresar",
    ])

    pdf.subsection_title("Quien puede usarlo")
    pdf.simple_table(
        ["Rol", "Ver la seccion", "Registrar transformaciones"],
        [
            ["ADMIN", "Si", "Si"],
            ["HEAD CHEF", "Si", "Solo si esta asignado a la estacion 'produccion'"],
            ["SOUS CHEF", "Si", "Solo si esta asignado a la estacion 'produccion'"],
        ],
        [35, 40, 115],
    )

    pdf.warning_box(
        "Importante: permisos de escritura",
        "Todos los usuarios pueden ver la seccion y el historial, pero solo pueden registrar "
        "transformaciones quienes tengan acceso a la estacion 'produccion'. El ADMIN siempre puede. "
        "Si un usuario necesita registrar transformaciones, el ADMIN debe asignarle la estacion "
        "'produccion' desde Configuracion > Usuarios."
    )

    # ==========================================================================
    # 3. REGISTRAR UNA TRANSFORMACION
    # ==========================================================================
    pdf.add_page()
    pdf.section_title("3", "Registrar una transformacion")

    pdf.body_text(
        "La pestana 'Registrar' permite ingresar una nueva transformacion paso a paso."
    )

    pdf.subsection_title("Paso 1: Seleccionar la materia prima de entrada")
    pdf.numbered_list([
        "En la seccion 'Entrada (materia prima)', toque el campo 'Buscar producto...'",
        "Escriba el nombre o codigo del producto bruto (ej: 'pulpo', 'salmon')",
        "Seleccione el producto correcto de la lista desplegable",
        "Ingrese la cantidad total que va a transformar (ej: 5.00 KG)",
    ])

    pdf.subsection_title("Paso 2: Agregar los productos de salida")
    pdf.numbered_list([
        "En la seccion 'Salidas (rendimiento)', vera una primera salida vacia",
        "Busque y seleccione el producto porcionado de salida (ej: 'Pulpo 140gr')",
        "Ingrese la cantidad obtenida (ej: 2.10)",
        "Para agregar mas salidas, presione '+ Agregar salida'",
        "Puede agregar tantas salidas como necesite",
        "Para eliminar una salida, presione el icono de basura (X)",
    ])

    pdf.subsection_title("Paso 3: Verificar la merma")
    pdf.body_text(
        "Mientras ingresa las salidas, el sistema calcula automaticamente la merma "
        "en tiempo real. Aparece una tarjeta con:"
    )
    pdf.bullet_list([
        "Cantidad de merma en la unidad del producto de entrada",
        "Porcentaje de merma sobre el total de entrada",
        "Barra visual: verde = rendimiento, rojo/amarillo = merma",
    ])

    pdf.subsection_title("Colores de la merma")
    pdf.simple_table(
        ["Color", "Rango", "Significado"],
        [
            ["Verde", "Menos de 10%", "Excelente aprovechamiento"],
            ["Amarillo", "Entre 10% y 20%", "Normal para la mayoria de productos"],
            ["Rojo", "Mas de 20%", "Revisar proceso o calidad del producto"],
        ],
        [30, 45, 115],
    )

    pdf.subsection_title("Paso 4: Guardar")
    pdf.numbered_list([
        "Opcionalmente, agregue una nota (ej: 'Pulpo con buen rendimiento')",
        "Verifique que la merma sea razonable",
        "Presione 'Guardar' en la barra inferior",
        "El sistema registra la transformacion y actualiza el inventario de Almacenamiento",
    ])

    pdf.warning_box(
        "Validacion importante",
        "La suma de todas las salidas NO puede superar la cantidad de entrada. "
        "Si ingresa mas de lo que entro, el sistema no permitira guardar y mostrara "
        "un mensaje en rojo. Corrija las cantidades antes de guardar."
    )

    # ==========================================================================
    # 4. VER EL HISTORIAL
    # ==========================================================================
    pdf.add_page()
    pdf.section_title("4", "Ver el historial del dia")

    pdf.body_text(
        "La pestana 'Historial' muestra todas las transformaciones registradas hoy."
    )

    pdf.subsection_title("Que muestra cada registro")
    pdf.bullet_list([
        "Producto de entrada y cantidad utilizada",
        "Lista de productos de salida con cantidades obtenidas",
        "Porcentaje de merma (con color segun el rango)",
        "Nombre del usuario que registro la transformacion",
        "Hora del registro",
        "Notas (si se agregaron)",
    ])

    pdf.body_text(
        "Use esta vista para verificar al final del dia que todas las transformaciones "
        "fueron registradas correctamente y que los porcentajes de merma son coherentes."
    )

    pdf.info_box(
        "Control de calidad",
        "Si nota que un producto tiene merma consistentemente mayor al 20%, esto puede "
        "indicar un problema con la calidad del proveedor, la tecnica de procesamiento, "
        "o la necesidad de capacitacion. Use estos datos para tomar decisiones informadas."
    )

    # ==========================================================================
    # 5. FUNCIONAMIENTO OFFLINE
    # ==========================================================================
    pdf.section_title("5", "Funcionamiento sin conexion")

    pdf.body_text(
        "Al igual que el inventario y la produccion, las transformaciones funcionan "
        "sin conexion a internet."
    )

    pdf.subsection_title("Como funciona")
    pdf.numbered_list([
        "Si no hay internet, registre la transformacion normalmente",
        "El sistema la guarda en el dispositivo (vera un aviso amarillo)",
        "Vera un contador de 'transformacion(es) pendiente(s) de sincronizar'",
        "Cuando recupere la conexion, se envian automaticamente al servidor",
        "No necesita hacer nada adicional",
    ])

    pdf.warning_box(
        "Requisito",
        "Para que el modo offline funcione, la aplicacion debe estar instalada en el dispositivo "
        "(agregar a pantalla de inicio). La primera vez que ingrese a esta seccion necesita "
        "conexion para cargar los productos."
    )

    # ==========================================================================
    # 6. ESTACION ALMACENAMIENTO
    # ==========================================================================
    pdf.add_page()
    pdf.section_title("6", "La estacion Almacenamiento")

    pdf.body_text(
        "Con esta actualizacion se agrega una nueva estacion llamada 'almacenamiento'. "
        "Esta estacion es especial y representa el stock central de productos porcionados "
        "listos para distribuir a las estaciones de cocina."
    )

    pdf.subsection_title("Como se actualiza")
    pdf.body_text(
        "Cada vez que registra una transformacion, los productos de salida se agregan "
        "automaticamente al inventario de la estacion Almacenamiento. Por ejemplo:"
    )

    pdf.simple_table(
        ["Accion", "Efecto en Almacenamiento"],
        [
            ["Registra: Pulpo 5KG -> Pulpo 140gr x2.1", "Se suman 2.1 a Pulpo 140gr en Almacenamiento"],
            ["Registra otra transformacion del mismo", "Se acumula sobre el stock existente"],
            ["Conteo manual en Inventario", "Puede verificar/corregir como cualquier estacion"],
        ],
        [80, 110],
    )

    pdf.info_box(
        "No necesita registrar manualmente",
        "El inventario de Almacenamiento se actualiza solo con cada transformacion. "
        "Solo necesita ir a Inventario > Almacenamiento si quiere verificar o corregir "
        "manualmente un stock."
    )

    # ==========================================================================
    # 7. RUTINA DIARIA RECOMENDADA
    # ==========================================================================
    pdf.section_title("7", "Rutina diaria recomendada")

    pdf.body_text(
        "Para aprovechar al maximo esta funcion, se recomienda la siguiente rutina:"
    )

    pdf.subsection_title("Por la manana (inicio de produccion)")
    pdf.numbered_list([
        "Reciba la materia prima bruta del proveedor o del almacen frio",
        "Pese la materia prima antes de procesarla",
        "Procese: limpie, porcione, separe",
        "Pese los productos porcionados obtenidos",
        "Registre la transformacion en el sistema con las cantidades reales",
        "Verifique que la merma sea razonable",
    ])

    pdf.subsection_title("Al cierre")
    pdf.numbered_list([
        "Revise el historial de transformaciones del dia en la pestana 'Historial'",
        "Verifique que no falte registrar ninguna transformacion",
        "Haga el conteo normal de inventario en cada estacion",
    ])

    # ==========================================================================
    # 8. PREGUNTAS FRECUENTES
    # ==========================================================================
    pdf.add_page()
    pdf.section_title("8", "Preguntas frecuentes")

    faqs = [
        (
            "Puedo registrar una transformacion con un solo producto de salida?",
            "Si. Puede tener tantas salidas como necesite, desde una hasta muchas. "
            "El minimo es una salida."
        ),
        (
            "Que pasa si la merma es 0%?",
            "Es perfectamente valido. Significa que aprovecho el 100% de la materia prima. "
            "Esto puede ocurrir con productos que solo se porcionan sin descarte."
        ),
        (
            "Puedo editar una transformacion despues de guardarla?",
            "No. Una vez registrada, la transformacion no se puede modificar. Si cometio un "
            "error, registre una nueva transformacion con los datos correctos. El inventario "
            "de Almacenamiento se ajustara en el proximo conteo manual."
        ),
        (
            "Tengo que crear los productos porcionados primero?",
            "Si. Los productos de salida (ej: 'Pulpo 140gr') deben existir en el catalogo "
            "de Productos antes de poder usarlos en una transformacion. El ADMIN puede "
            "crearlos desde la seccion Productos."
        ),
        (
            "Puedo usar el mismo producto como entrada y salida?",
            "Tecnicamente si, pero no tiene mucho sentido. Lo normal es que la entrada "
            "sea un producto bruto y las salidas sean productos porcionados diferentes."
        ),
        (
            "La merma aparece en los reportes?",
            "Las transformaciones se pueden consultar desde el endpoint de resumen, que "
            "muestra totales de merma por producto y promedios del dia. Los reportes "
            "visuales se integraran en futuras versiones."
        ),
        (
            "Que pasa si no existe la estacion Almacenamiento?",
            "El sistema necesita una estacion llamada 'almacenamiento' para funcionar. "
            "Si al intentar guardar ve un error sobre estacion no encontrada, contacte "
            "al administrador para que ejecute la actualizacion de datos."
        ),
        (
            "Necesito estar asignado a alguna estacion especifica?",
            "Si no es ADMIN, necesita estar asignado a la estacion 'produccion' para "
            "poder registrar transformaciones. El ADMIN puede asignarle esta estacion "
            "desde Configuracion > Usuarios."
        ),
    ]

    for q, a in faqs:
        pdf.set_x(10)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GuiaPDF.EMERALD_DARK)
        pdf.multi_cell(190, 5.5, q)
        pdf.set_x(10)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*GuiaPDF.DARK_TEXT)
        pdf.multi_cell(190, 5.5, a)
        pdf.ln(3)

    # ==========================================================================
    # BACK COVER
    # ==========================================================================
    pdf.add_page()
    pdf.ln(60)
    pdf.set_fill_color(*GuiaPDF.EMERALD)
    pdf.set_draw_color(*GuiaPDF.EMERALD)
    y = pdf.get_y()
    pdf.rect(30, y, 150, 70, "DF")

    pdf.set_text_color(*GuiaPDF.WHITE)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_xy(30, y + 12)
    pdf.cell(150, 10, "Taringuita Inventory", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 11)
    pdf.set_xy(30, y + 27)
    pdf.cell(150, 8, "Cuarto de Produccion", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(30, y + 35)
    pdf.cell(150, 8, "Transformacion y Control de Merma", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_xy(30, y + 50)
    pdf.cell(150, 6, "Desarrollado por CodeMedia SpA", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(30, y + 57)
    pdf.cell(150, 6, "Soporte: contacto@codemedia.cl", align="C", new_x="LMARGIN", new_y="NEXT")

    # Save
    output_path = "/Users/raul.campos/Documents/taringuita-inventory/Guia_Cuarto_Produccion_Taringuita.pdf"
    pdf.output(output_path)
    print(f"Guia generada: {output_path}")
    print(f"Paginas: {pdf.page_no()}")


if __name__ == "__main__":
    generate_guide()
