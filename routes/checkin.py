from datetime import datetime
from flask import Blueprint, request, jsonify
from db import get_conn
from routes.auth import require_admin

bp = Blueprint("checkin", __name__, url_prefix="/api")


@bp.post("/checkin")
def checkin():
    err = require_admin()
    if err:
        return err
    data = request.get_json(force=True) or {}
    qr_code = (data.get("qr_code") or "").strip()  # "<order_id>-<ticket_no>"
    try:
        order_id_str, ticket_no_str = qr_code.split("-")
        order_id, ticket_no = int(order_id_str), int(ticket_no_str)
    except Exception:
        return jsonify(error="Mã QR không hợp lệ"), 400

    conn = get_conn()
    ticket = conn.execute(
        "SELECT * FROM TICKET WHERE order_id = ? AND ticket_no = ?", (order_id, ticket_no)
    ).fetchone()
    if not ticket:
        conn.close()
        return jsonify(error="Không tìm thấy vé"), 404
    # Vé chỉ tồn tại trong 1 order sau khi đã bán (SOLD), nên không cần kiểm tra lại order.status
    if ticket["ticket_status"] != "SOLD":
        conn.close()
        return jsonify(error=f"Vé không hợp lệ (trạng thái: {ticket['ticket_status']})"), 409
    if ticket["checkin_at"] is not None:
        conn.close()
        return jsonify(error="Vé này đã được soát trước đó", checkin_at=ticket["checkin_at"]), 409

    now = datetime.utcnow().isoformat(timespec="seconds")
    conn.execute("UPDATE TICKET SET checkin_at = ? WHERE ticket_id = ?", (now, ticket["ticket_id"]))
    conn.commit()
    conn.close()
    return jsonify(message="Soát vé thành công", checkin_at=now)
