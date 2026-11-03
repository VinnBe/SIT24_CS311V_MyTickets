from flask import Blueprint, request, jsonify
from db import get_conn, rows_to_list, row_to_dict
from routes.auth import require_admin

bp = Blueprint("venues", __name__, url_prefix="/api")


# ---------- VENUE ----------

@bp.get("/venues")
def list_venues():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM VENUE ORDER BY venue_id").fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))


@bp.post("/venues")
def create_venue():
    err = require_admin()
    if err:
        return err
    data = request.get_json(force=True) or {}
    name = (data.get("venue_name") or "").strip()
    address = (data.get("address") or "").strip()
    if not name or not address:
        return jsonify(error="venue_name, address là bắt buộc"), 400
    conn = get_conn()
    cur = conn.execute("INSERT INTO VENUE (venue_name, address) VALUES (?, ?)", (name, address))
    conn.commit()
    venue_id = cur.lastrowid
    conn.close()
    return jsonify(venue_id=venue_id), 201


# ---------- ZONE ----------

@bp.get("/venues/<int:venue_id>/zones")
def list_zones(venue_id):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM ZONE WHERE venue_id = ? ORDER BY zone_id", (venue_id,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))


@bp.post("/venues/<int:venue_id>/zones")
def create_zone(venue_id):
    err = require_admin()
    if err:
        return err
    data = request.get_json(force=True) or {}
    zone_name = (data.get("zone_name") or "").strip()
    capacity = data.get("capacity")
    if not zone_name or not capacity or int(capacity) <= 0:
        return jsonify(error="zone_name bắt buộc, capacity phải > 0"), 400

    conn = get_conn()
    venue = conn.execute("SELECT 1 FROM VENUE WHERE venue_id = ?", (venue_id,)).fetchone()
    if not venue:
        conn.close()
        return jsonify(error="Venue không tồn tại"), 404
    cur = conn.execute(
        "INSERT INTO ZONE (venue_id, zone_name, capacity) VALUES (?, ?, ?)",
        (venue_id, zone_name, capacity),
    )
    zone_id = cur.lastrowid

    # Tự tạo ghế seat_row/seat_number theo capacity (10 ghế/hàng, A, B, C...)
    seats_per_row = 10
    for i in range(int(capacity)):
        row_letter = chr(ord("A") + i // seats_per_row)
        seat_number = (i % seats_per_row) + 1
        conn.execute(
            "INSERT INTO SEAT (zone_id, seat_row, seat_number) VALUES (?, ?, ?)",
            (zone_id, row_letter, seat_number),
        )
    conn.commit()
    conn.close()
    return jsonify(zone_id=zone_id), 201


# ---------- SEAT (xem) ----------

@bp.get("/zones/<int:zone_id>/seats")
def list_seats(zone_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM SEAT WHERE zone_id = ? ORDER BY seat_row, seat_number", (zone_id,)
    ).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))
