from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, session
from db import get_conn, rows_to_list, row_to_dict
from routes.auth import require_customer
from config import ORDER_EXPIRY_MINUTES, MAX_TICKETS_PER_EVENT

bp = Blueprint("booking", __name__, url_prefix="/api")


def now_dt():
    return datetime.utcnow()


def now_iso():
    return now_dt().isoformat(timespec="seconds")


def order_deadline(order, event):
    create_at = datetime.fromisoformat(order["create_at"])
    by_timeout = create_at + timedelta(minutes=ORDER_EXPIRY_MINUTES)
    by_event_start = datetime.fromisoformat(event["start_time"])
    return min(by_timeout, by_event_start)


# ---------- Đặt vé: 3 bước kiểm tra trong 1 transaction ----------

@bp.post("/orders")
def create_order():
    err = require_customer()
    if err:
        return err
    data = request.get_json(force=True) or {}
    event_id = data.get("event_id")
    zone_id = data.get("zone_id")
    quantity = data.get("quantity")
    customer_id = session["customer_id"]

    if not event_id or not zone_id or not quantity or int(quantity) < 1:
        return jsonify(error="event_id, zone_id, quantity là bắt buộc"), 400
    quantity = int(quantity)

    conn = get_conn()
    try:
        event = conn.execute("SELECT * FROM EVENT WHERE event_id = ?", (event_id,)).fetchone()
        if not event:
            conn.close()
            return jsonify(error="Event không tồn tại"), 404

        now = now_iso()
        # Bước 1: thời điểm đặt phải trong [sale_start, start_time)
        if not (event["sale_start"] <= now < event["start_time"]):
            conn.close()
            return jsonify(error="Sự kiện chưa mở bán hoặc đã bắt đầu"), 400

        # Bước 2: tổng vé khách đã có cho event này (PENDING + PAID) + quantity <= MAX
        held = conn.execute(
            """SELECT COALESCE(SUM(ticket_quantity), 0) AS n FROM "ORDER"
               WHERE customer_id = ? AND event_id = ? AND order_status IN ('PENDING','PAID')""",
            (customer_id, event_id),
        ).fetchone()["n"]
        if held + quantity > MAX_TICKETS_PER_EVENT:
            conn.close()
            return jsonify(
                error=f"Vượt giới hạn {MAX_TICKETS_PER_EVENT} vé/sự kiện (đã có {held})"
            ), 400

        conn.execute("BEGIN IMMEDIATE")

        # Bước 3: trừ available an toàn trong 1 câu UPDATE duy nhất
        cur = conn.execute(
            """UPDATE HAS_PRICE SET available = available - ?
               WHERE event_id = ? AND zone_id = ? AND available >= ?""",
            (quantity, event_id, zone_id, quantity),
        )
        if cur.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify(error="Zone không còn đủ vé"), 409

        price_row = conn.execute(
            "SELECT price FROM HAS_PRICE WHERE event_id = ? AND zone_id = ?", (event_id, zone_id)
        ).fetchone()
        ticket_amount = price_row["price"] * quantity

        cur = conn.execute(
            """INSERT INTO "ORDER" (customer_id, event_id, zone_id, order_status, ticket_quantity,
                                     ticket_amount, create_at, method, pay_at)
               VALUES (?, ?, ?, 'PENDING', ?, ?, ?, NULL, NULL)""",
            (customer_id, event_id, zone_id, quantity, ticket_amount, now),
        )
        order_id = cur.lastrowid

        # Tự động gán ghế: lấy vé AVAILABLE đầu tiên của zone theo (seat_row, seat_number)
        tickets = conn.execute(
            """SELECT t.ticket_id FROM TICKET t JOIN SEAT s ON s.seat_id = t.seat_id
               WHERE t.event_id = ? AND s.zone_id = ? AND t.ticket_status = 'AVAILABLE'
               ORDER BY s.seat_row, s.seat_number LIMIT ?""",
            (event_id, zone_id, quantity),
        ).fetchall()

        if len(tickets) < quantity:
            conn.rollback()
            conn.close()
            return jsonify(error="Không đủ ghế trống (dữ liệu không nhất quán)"), 409

        ticket_ids = [t["ticket_id"] for t in tickets]
        conn.executemany(
            "UPDATE TICKET SET order_id = ?, ticket_status = 'RESERVED' WHERE ticket_id = ?",
            [(order_id, tid) for tid in ticket_ids],
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify(error="Đặt vé thất bại: " + str(e)), 400
    conn.close()
    return jsonify(order_id=order_id, ticket_amount=ticket_amount), 201


def _fail_order(conn, order):
    """Gỡ giữ ghế, trả available, chuyển order sang FAILED. Dùng chung cho huỷ/lỗi/hết hạn."""
    conn.execute(
        "UPDATE HAS_PRICE SET available = available + ? WHERE event_id = ? AND zone_id = ?",
        (order["ticket_quantity"], order["event_id"], order["zone_id"]),
    )
    conn.execute(
        "UPDATE TICKET SET order_id = NULL, ticket_status = 'AVAILABLE' WHERE order_id = ?",
        (order["order_id"],),
    )
    conn.execute(
        """UPDATE "ORDER" SET order_status = 'FAILED' WHERE order_id = ?""",
        (order["order_id"],),
    )


@bp.get("/orders/<int:order_id>/countdown")
def countdown(order_id):
    err = require_customer()
    if err:
        return err
    conn = get_conn()
    order = conn.execute(
        'SELECT * FROM "ORDER" WHERE order_id = ? AND customer_id = ?',
        (order_id, session["customer_id"]),
    ).fetchone()
    if not order:
        conn.close()
        return jsonify(error="Không tìm thấy order"), 404
    if order["order_status"] != "PENDING":
        conn.close()
        return jsonify(status=order["order_status"], seconds_left=0)
    event = conn.execute("SELECT * FROM EVENT WHERE event_id = ?", (order["event_id"],)).fetchone()
    deadline = order_deadline(order, event)
    seconds_left = max(0, int((deadline - now_dt()).total_seconds()))
    conn.close()
    return jsonify(status="PENDING", seconds_left=seconds_left)


@bp.post("/orders/<int:order_id>/pay")
def pay_order(order_id):
    err = require_customer()
    if err:
        return err
    data = request.get_json(force=True) or {}
    method = (data.get("method") or "").strip()
    if not method:
        return jsonify(error="method là bắt buộc"), 400

    conn = get_conn()
    try:
        order = conn.execute(
            'SELECT * FROM "ORDER" WHERE order_id = ? AND customer_id = ?',
            (order_id, session["customer_id"]),
        ).fetchone()
        if not order:
            conn.close()
            return jsonify(error="Không tìm thấy order"), 404
        if order["order_status"] != "PENDING":
            conn.close()
            return jsonify(error=f"Order đang ở trạng thái {order['order_status']}, không thể thanh toán"), 409

        event = conn.execute("SELECT * FROM EVENT WHERE event_id = ?", (order["event_id"],)).fetchone()
        if now_dt() > order_deadline(order, event):
            _fail_order(conn, order)
            conn.commit()
            conn.close()
            return jsonify(error="Order đã quá hạn thanh toán"), 409

        conn.execute("BEGIN IMMEDIATE")
        now = now_iso()
        conn.execute(
            """UPDATE "ORDER" SET order_status = 'PAID', method = ?, pay_at = ? WHERE order_id = ?""",
            (method, now, order_id),
        )
        conn.execute(
            "UPDATE TICKET SET ticket_status = 'SOLD' WHERE order_id = ?", (order_id,)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify(error="Thanh toán thất bại: " + str(e)), 400
    conn.close()
    return jsonify(message="Thanh toán thành công", order_id=order_id)


@bp.post("/orders/<int:order_id>/cancel")
def cancel_order(order_id):
    err = require_customer()
    if err:
        return err
    conn = get_conn()
    order = conn.execute(
        'SELECT * FROM "ORDER" WHERE order_id = ? AND customer_id = ?',
        (order_id, session["customer_id"]),
    ).fetchone()
    if not order:
        conn.close()
        return jsonify(error="Không tìm thấy order"), 404
    if order["order_status"] != "PENDING":
        conn.close()
        return jsonify(error="Chỉ huỷ được order đang PENDING"), 409
    conn.execute("BEGIN IMMEDIATE")
    _fail_order(conn, order)
    conn.commit()
    conn.close()
    return jsonify(message="Đã huỷ order")


# ---------- Vé & order của tôi ----------

@bp.get("/my-orders")
def my_orders():
    err = require_customer()
    if err:
        return err
    conn = get_conn()
    orders = conn.execute(
        'SELECT * FROM "ORDER" WHERE customer_id = ? ORDER BY create_at DESC', (session["customer_id"],)
    ).fetchall()
    conn.close()
    return jsonify(rows_to_list(orders))


@bp.get("/my-tickets")
def my_tickets():
    err = require_customer()
    if err:
        return err
    conn = get_conn()
    tickets = conn.execute(
        """SELECT t.*, e.event_name, s.seat_row, s.seat_number
           FROM TICKET t
           JOIN "ORDER" o ON o.order_id = t.order_id
           JOIN EVENT e ON e.event_id = t.event_id
           JOIN SEAT s ON s.seat_id = t.seat_id
           WHERE o.customer_id = ? AND t.ticket_status = 'SOLD'
           ORDER BY e.start_time""",
        (session["customer_id"],),
    ).fetchall()
    conn.close()
    result = rows_to_list(tickets)
    for t in result:
        t["qr_code"] = f"{t['order_id']}-{t['ticket_no']}"
    return jsonify(result)
