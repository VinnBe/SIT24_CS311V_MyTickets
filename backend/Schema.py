"""Schema.py - mo ta va kiem tra du lieu JSON ma giao dien gui len backend.

Moi schema la 1 dict {ten_truong: kieu}. Ham parse() kiem tra du truong,
doi kieu (chuoi -> so) va ap cac luat don gian truoc khi goi database.
"""

PAY_METHODS = ("MOMO", "BANKING", "CARD")
MAX_TICKETS = 2

LOGIN = {"username": str, "password": str}

REGISTER = {
    "username": str,
    "password": str,
    "full_name": str,
    "email": str,
    "phone": str,
}

ORDER = {"event_id": int, "zone_id": int, "quantity": int}

PAY = {"method": str}

CHECKIN = {"qrcode": str}


class SchemaError(Exception):
    """Du lieu gui len khong hop le."""


def parse(schema, data):
    data = data or {}
    out = {}
    for field, kind in schema.items():
        value = data.get(field)
        if value is None or str(value).strip() == "":
            raise SchemaError(f"Thieu truong: {field}")
        if kind is int:
            try:
                value = int(value)
            except (TypeError, ValueError):
                raise SchemaError(f"{field} phai la so nguyen")
        elif field != "password":
            value = str(value).strip()
        out[field] = value

    # Luat rieng cua tung schema
    if schema is REGISTER and len(out["password"]) < 6:
        raise SchemaError("Mat khau phai co it nhat 6 ky tu")
    if schema is ORDER and not 1 <= out["quantity"] <= MAX_TICKETS:
        raise SchemaError(f"So luong ve phai tu 1 den {MAX_TICKETS}")
    if schema is PAY:
        out["method"] = out["method"].upper()
        if out["method"] not in PAY_METHODS:
            raise SchemaError("Phuong thuc thanh toan phai la: " + ", ".join(PAY_METHODS))
    return out