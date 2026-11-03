"""Tiến trình nền: quét order PENDING quá hạn mỗi phút, chuyển sang FAILED,
gỡ giữ ghế và cộng trả available — giống hệt luồng huỷ/thanh toán lỗi."""

from datetime import datetime
from db import get_conn
from routes.booking import order_deadline


def expire_pending_orders():
    conn = get_conn()
    try:
        orders = conn.execute('SELECT * FROM "ORDER" WHERE order_status = \'PENDING\'').fetchall()
        now = datetime.utcnow()
        expired = 0
        for order in orders:
            event = conn.execute("SELECT * FROM EVENT WHERE event_id = ?", (order["event_id"],)).fetchone()
            if event and now > order_deadline(order, event):
                conn.execute("BEGIN IMMEDIATE")
                conn.execute(
                    "UPDATE HAS_PRICE SET available = available + ? WHERE event_id = ? AND zone_id = ?",
                    (order["ticket_quantity"], order["event_id"], order["zone_id"]),
                )
                conn.execute(
                    "UPDATE TICKET SET order_id = NULL, ticket_status = 'AVAILABLE' WHERE order_id = ?",
                    (order["order_id"],),
                )
                conn.execute(
                    'UPDATE "ORDER" SET order_status = \'FAILED\' WHERE order_id = ?', (order["order_id"],)
                )
                conn.commit()
                expired += 1
        if expired:
            print(f"[scheduler] Đã chuyển {expired} order PENDING quá hạn sang FAILED")
    finally:
        conn.close()
