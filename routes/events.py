from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from db import get_conn, rows_to_list, row_to_dict
from routes.auth import require_admin

bp = Blueprint("events", __name__, url_prefix="/api")


def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds")


def derive_status(event, zones_available_sum, zones_total):
    sale_start, start_time = event["sale_start"], event["start_time"]
    now = now_iso()
    if now < sale_start:
        return "UPCOMING"
    if now >= start_time:
        return "CLOSED"
    if zones_total > 0 and zones_available_sum == 0:
        return "SOLD_OUT"
    return "ON_SALE"


# ---------- EVENT (admin tạo) ----------

@bp.post("/events")
def create_event():
    err = require_admin()
    if err:
        return err
    data = request.get_json(force=True) or {}
    venue_id = data.get("venue_id")
    event_name = (data.get("event_name") or "").strip()
    sale_start = data.get("sale_start")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    prices = data.get("prices") or {}  # { zone_id: price }

    if not all([venue_id, event_name, sale_start, start_time, end_time]):
        return jsonify(error="venue_id, event_name, sale_start, start_time, end_time là bắt buộc"), 400
    if not (sale_start < start_time < end_time):
        return jsonify(error="Phải có sale_start < start_time < end_time"), 400

    conn = get_conn()
    zones = conn.execute("SELECT * FROM ZONE WHERE venue_id = ?", (venue_id,)).fetchall()
    if not zones:
        conn.close()
        return jsonify(error="Venue chưa có zone nào"), 400

    # Phủ đủ zone và khoá giá: phải có giá cho TẤT CẢ zone của venue
    missing = [str(z["zone_id"]) for z in zones if str(z["zone_id"]) not in {str(k) for k in prices}]
    if missing:
        conn.close()
        return jsonify(error=f"Thiếu giá cho zone_id: {', '.join(missing)}"), 400

    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO EVENT (venue_id, event_name, sale_start, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
            (venue_id, event_name, sale_start, start_time, end_time),
        )
        event_id = cur.lastrowid

        for z in zones:
            price = float(prices[str(z["zone_id"])] if str(z["zone_id"]) in prices else prices[z["zone_id"]])
            if price < 0:
                raise ValueError("Giá không được âm")
            cur.execute(
                "INSERT INTO HAS_PRICE (event_id, zone_id, price, available) VALUES (?, ?, ?, ?)",
                (event_id, z["zone_id"], price, z["capacity"]),
            )
            # Phát hành vé trước khi bán: sinh sẵn 1 vé AVAILABLE cho mỗi ghế của zone
            seats = cur.execute(
                "SELECT * FROM SEAT WHERE zone_id = ? ORDER BY seat_row, seat_number", (z["zone_id"],)
            ).fetchall()
            for i, seat in enumerate(seats, start=1):
                cur.execute(
                    """INSERT INTO TICKET (event_id, seat_id, order_id, ticket_no, ticket_status, ticket_price, checkin_at)
                       VALUES (?, ?, NULL, ?, 'AVAILABLE', ?, NULL)""",
                    (event_id, seat["seat_id"], _next_ticket_no(cur, event_id), price),
                )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify(error="Tạo event thất bại: " + str(e)), 400
    conn.close()
    return jsonify(event_id=event_id), 201


def _next_ticket_no(cur, event_id):
    row = cur.execute("SELECT COALESCE(MAX(ticket_no), 0) + 1 AS n FROM TICKET WHERE event_id = ?", (event_id,)).fetchone()
    return row["n"]


# ---------- EVENT (xem) ----------

@bp.get("/events")
def list_events():
    conn = get_conn()
    events = conn.execute("SELECT * FROM EVENT ORDER BY start_time").fetchall()
    result = []
    for e in events:
        zp = conn.execute("SELECT available FROM HAS_PRICE WHERE event_id = ?", (e["event_id"],)).fetchall()
        total_available = sum(r["available"] for r in zp)
        d = row_to_dict(e)
        d["status"] = derive_status(e, total_available, len(zp))
        result.append(d)
    conn.close()
    return jsonify(result)


@bp.get("/events/<int:event_id>")
def get_event(event_id):
    conn = get_conn()
    e = conn.execute("SELECT * FROM EVENT WHERE event_id = ?", (event_id,)).fetchone()
    if not e:
        conn.close()
        return jsonify(error="Không tìm thấy event"), 404
    venue = conn.execute("SELECT * FROM VENUE WHERE venue_id = ?", (e["venue_id"],)).fetchone()
    zones = conn.execute(
        """SELECT z.zone_id, z.zone_name, z.capacity, hp.price, hp.available
           FROM HAS_PRICE hp JOIN ZONE z ON z.zone_id = hp.zone_id
           WHERE hp.event_id = ? ORDER BY z.zone_id""",
        (event_id,),
    ).fetchall()
    conn.close()
    d = row_to_dict(e)
    d["venue"] = row_to_dict(venue)
    d["zones"] = rows_to_list(zones)
    d["status"] = derive_status(e, sum(z["available"] for z in zones), len(zones))
    return jsonify(d)
