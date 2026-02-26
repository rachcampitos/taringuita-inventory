#!/usr/bin/env python3
"""
Extract products from Taringuita's Excel master inventory file.
Outputs products-data.json for the Prisma seed script.
"""

import json
import re
import openpyxl

EXCEL_PATH = "/Users/raul.campos/Downloads/01. MAESTRA INVENTARIO Y PEDIDO COCINA_VITACURA 04-12-2025.xlsx"

# ---------------------------------------------------------------------------
# Unit mapping: Excel unit string -> { enum, factor }
# ---------------------------------------------------------------------------

def parse_unit(raw: str) -> dict:
    """Map an Excel unit string to a UnitOfMeasure enum + conversion factor."""
    if not raw:
        return {"unit": "UN", "factor": 1}

    s = str(raw).strip().upper()

    # Direct mappings
    direct = {
        "KG": "KG", "KILO": "KG",
        "L": "LT", "LITRO": "LT",
        "ML": "ML",
        "G": "GR",
        "UN": "UN", "UND": "UN", "UNIDAD": "UN",
        "PORCIONES": "PORCIONES",
        "BANDEJA": "BANDEJAS",
        "CAJA": "CAJAS",
        "BIDON": "BIDONES",
        "FRASCO": "FRASCOS",
        "PAQUETE": "PAQUETES", "PAQUET": "PAQUETES",
        "POTE": "POTES",
        "ROLLO": "ROLLOS",
        "SOBRE": "SOBRES",
        "MALLA": "MALLAS",
        "REBANADAS": "UN",
        "PIT": "UN",
    }

    if s in direct:
        return {"unit": direct[s], "factor": 1}

    # Pattern: "BIDON 5 LT" or "BIDON 10 LT"
    m = re.match(r"BIDON\s+([\d.,]+)\s*(?:LT|L)?", s)
    if m:
        return {"unit": "BIDONES", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "BOLSA X KG"
    m = re.match(r"BOLSA\s+([\d.,]+)\s*KG", s)
    if m:
        return {"unit": "BOLSAS", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "BOTELLA 0,25 LT"
    m = re.match(r"BOTELLA\s+([\d.,]+)\s*(?:LT|L)?", s)
    if m:
        return {"unit": "BOTELLAS", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "BANDEJA 24 UN"
    m = re.match(r"BANDEJA\s+([\d.,]+)\s*(?:UN)?", s)
    if m:
        return {"unit": "BANDEJAS", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "PAQUETE x6 u"
    m = re.match(r"PAQUETE\s*[xX]?\s*([\d.,]+)\s*(?:U|UN)?", s)
    if m:
        return {"unit": "PAQUETES", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "FRASCO 1KG"
    m = re.match(r"FRASCO\s*([\d.,]+)\s*KG", s)
    if m:
        return {"unit": "FRASCOS", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "POTE 0,789 KG" or "POTE 0,9 KG"
    m = re.match(r"POTE\s+([\d.,]+)\s*KG", s)
    if m:
        return {"unit": "POTES", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "TARRO 0,4 KG"
    m = re.match(r"TARRO\s+([\d.,]+)\s*KG", s)
    if m:
        return {"unit": "TARROS", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "SACO 25 KG"
    m = re.match(r"SACO\s+([\d.,]+)\s*KG", s)
    if m:
        return {"unit": "SACOS", "factor": float(m.group(1).replace(",", "."))}

    # Pattern: "UNIDAD 0,125 KG"
    m = re.match(r"UNIDAD\s+([\d.,]+)\s*KG", s)
    if m:
        return {"unit": "UN", "factor": float(m.group(1).replace(",", "."))}

    # Fallback
    return {"unit": "UN", "factor": 1}


def parse_base_unit(raw: str) -> str:
    """Map the base measurement unit (UNIDAD DE MEDIDA column) to enum."""
    if not raw:
        return "UN"
    s = str(raw).strip().lower()
    mapping = {
        "kg": "KG", "kilo": "KG",
        "l": "LT", "litro": "LT",
        "ml": "ML",
        "g": "GR",
        "un": "UN", "und": "UN", "unidad": "UN",
        "porciones": "PORCIONES",
    }
    return mapping.get(s, "UN")


def safe_float(val, default=0.0) -> float:
    """Convert a value to float safely."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_str(val) -> str:
    """Convert to stripped string."""
    if val is None:
        return ""
    return str(val).strip()


# ---------------------------------------------------------------------------
# Sheet extraction configs
# ---------------------------------------------------------------------------

SHEETS = [
    {
        "name": "Cocina VITACURA",
        "header_row": 2,
        "cols": {
            "code": 0,      # COD. PRODUCTO
            "name": 1,      # NOMBRE PRODUCTO
            "family": 2,    # FAMILIA
            "factor": 3,    # FACTOR DE AJUSTE
            "base_unit": 6, # UNIDAD DE MEDIDA
            "order_unit": 10, # UNIDAD PEDIDO
            "merma": 11,    # PRODUCTO MERMADO PERIODO
        },
    },
    {
        "name": "Procesado",
        "header_row": 2,
        "cols": {
            "code": 0,
            "name": 1,
            "family": 2,
            "factor": 5,     # MEDIDA REFERENCIA
            "base_unit": 4,  # UNIDAD INVENTARIO
            "order_unit": 6, # UNIDAD PEDIDO
            "merma": 7,
        },
    },
    {
        "name": "Personal",
        "header_row": 2,
        "cols": {
            "code": 0,
            "name": 1,
            "family": 2,
            "factor": None,
            "base_unit": 5,  # UNIDAD CONTROL
            "order_unit": 5,
            "merma": None,
        },
    },
    {
        "name": "Futas y Verduras",
        "header_row": 2,
        "cols": {
            "code": 0,
            "name": 1,
            "family": 2,
            "factor": 3,
            "base_unit": 6,
            "order_unit": 10,
            "merma": 11,
        },
    },
    {
        "name": "Aseo",
        "header_row": 2,
        "cols": {
            "code": 0,
            "name": 1,
            "family": 2,
            "factor": None,
            "base_unit": 5,
            "order_unit": 5,
            "merma": None,
        },
    },
    {
        "name": "Otros Materiales",
        "header_row": 2,
        "cols": {
            "code": 0,
            "name": 1,
            "family": 2,
            "factor": None,
            "base_unit": 5,
            "order_unit": 5,
            "merma": None,
        },
    },
    {
        "name": "Cuchillería y Cristalería",
        "header_row": 2,
        "cols": {
            "code": 0,
            "name": 1,
            "family": 2,
            "factor": None,
            "base_unit": 5,
            "order_unit": 5,
            "merma": None,
        },
    },
    {
        "name": "Articulos de Oficina",
        "header_row": 2,
        "cols": {
            "code": 0,
            "name": 1,
            "family": 2,
            "factor": None,
            "base_unit": 5,
            "order_unit": 5,
            "merma": None,
        },
    },
]

# ---------------------------------------------------------------------------
# Main extraction
# ---------------------------------------------------------------------------

def main():
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)

    all_products = []
    all_families = set()
    code_counter = {}  # family prefix -> counter for auto-generated codes
    seen_codes = set()

    for sheet_cfg in SHEETS:
        sheet_name = sheet_cfg["name"]
        ws = wb[sheet_name]
        cols = sheet_cfg["cols"]
        header_row = sheet_cfg["header_row"]

        for row_idx, row in enumerate(ws.iter_rows(min_row=header_row + 1, values_only=True), start=header_row + 1):
            name = safe_str(row[cols["name"]] if len(row) > cols["name"] else "")
            if not name:
                continue

            code = safe_str(row[cols["code"]] if len(row) > cols["code"] else "")
            family = safe_str(row[cols["family"]] if len(row) > cols["family"] else "")

            # Get factor
            factor = 1.0
            if cols["factor"] is not None and len(row) > cols["factor"]:
                factor = safe_float(row[cols["factor"]], 1.0)
                if factor == 0:
                    factor = 1.0

            # Get base unit
            base_unit_raw = ""
            if len(row) > cols["base_unit"]:
                base_unit_raw = safe_str(row[cols["base_unit"]])
            base_unit = parse_base_unit(base_unit_raw)

            # Get order unit
            order_unit_raw = ""
            if len(row) > cols["order_unit"]:
                order_unit_raw = safe_str(row[cols["order_unit"]])
            order_parsed = parse_unit(order_unit_raw)

            # If no code, generate one
            if not code:
                prefix = "NC"  # No Code
                if prefix not in code_counter:
                    code_counter[prefix] = 1
                code = f"NC-{code_counter[prefix]:04d}"
                code_counter[prefix] += 1

            # Ensure unique code
            original_code = code
            suffix = 1
            while code in seen_codes:
                code = f"{original_code}-{suffix}"
                suffix += 1
            seen_codes.add(code)

            # Default family if missing
            if not family:
                family = "SIN CLASIFICAR"

            all_families.add(family)

            product = {
                "code": code,
                "name": name,
                "family": family,
                "sheet": sheet_name,
                "unitOfMeasure": base_unit,
                "unitOfOrder": order_parsed["unit"],
                "conversionFactor": round(factor if factor != 1.0 else order_parsed["factor"], 4),
            }

            all_products.append(product)

    # Sort families for consistent ordering
    families_sorted = sorted(all_families)

    output = {
        "families": families_sorted,
        "products": all_products,
        "stats": {
            "totalProducts": len(all_products),
            "totalFamilies": len(families_sorted),
            "bySheet": {},
        },
    }

    for sheet_cfg in SHEETS:
        name = sheet_cfg["name"]
        count = sum(1 for p in all_products if p["sheet"] == name)
        output["stats"]["bySheet"][name] = count

    # Write JSON
    out_path = "/Users/raul.campos/Documents/taringuita-inventory/apps/api/prisma/products-data.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Extracted {len(all_products)} products in {len(families_sorted)} families")
    print(f"Output: {out_path}")
    print()
    print("By sheet:")
    for name, count in output["stats"]["bySheet"].items():
        print(f"  {name}: {count}")
    print()
    print("Families:")
    for fam in families_sorted:
        count = sum(1 for p in all_products if p["family"] == fam)
        print(f"  {fam}: {count}")


if __name__ == "__main__":
    main()
