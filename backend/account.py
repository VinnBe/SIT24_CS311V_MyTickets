"""account.py - API tai khoan cua khach hang: xem ho so, sua ho so, doi mat khau.

Gan vao backend.py bang 2 dong (xem huong dan trong backend.py):
    import account
    account.init(app, query_one, get_connection, login_required, ApiError)

  GET  /api/profile          xem ho so (username, full_name, email, phone)
  PUT  /api/profile          sua full_name, email, phone
  POST /api/change-password  doi mat khau (can mat khau cu)
  GET  /api/my-tickets       don hang cua toi kem gio dien ra (trang "Ve cua toi")

Chi khach hang da dang nhap; id lay tu session, khong lay tu trinh duyet.
Thong bao loi viet khong dau giong cac phan khac; frontend doi sang tieng Viet co dau.
"""
import re

from flask import jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^\+?[0-9 ]{9,15}$")
MIN_PASSWORD = 6


def init(app, query_one, get_connection, login_required, ApiError):
    def run(sql, params):
        """Chay 1 lenh ghi (connection da autocommit)."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
        finally:
            conn.close()

    def load(customer_id):
        row = query_one(
            "SELECT u.username, c.full_name, c.email, c.phone "
            "FROM customer c JOIN users u ON u.user_id = c.user_id "
            "WHERE c.customer_id = %s", (customer_id,))
        if not row:
            raise ApiError("Tai khoan khong ton tai", 404)
        return row

    def text(data, field, label):
        value = data.get(field)
        value = value.strip() if isinstance(value, str) else ""
        if not value:
            raise ApiError(f"Thieu truong: {field}")
        return value

    @app.get("/api/profile")
    @login_required
    def account_get_profile():
        return jsonify(load(session["customer_id"]))

    @app.put("/api/profile")
    @login_required
    def account_update_profile():
        d = request.get_json(silent=True) or {}
        full_name = text(d, "full_name", "Ho ten")
        email = text(d, "email", "Email")
        phone = text(d, "phone", "So dien thoai")

        if len(full_name) > 100:
            raise ApiError("Ho ten toi da 100 ky tu")
        if len(email) > 100 or not EMAIL_RE.match(email):
            raise ApiError("Email khong hop le")
        if not PHONE_RE.match(phone):
            raise ApiError("So dien thoai khong hop le")

        customer_id = session["customer_id"]
        taken = query_one(
            "SELECT 1 AS x FROM customer WHERE email = %s AND customer_id <> %s",
            (email, customer_id))
        if taken:
            raise ApiError("Email da duoc su dung")

        run("UPDATE customer SET full_name = %s, email = %s, phone = %s "
            "WHERE customer_id = %s", (full_name, email, phone, customer_id))
        session["full_name"] = full_name        # thanh dieu huong lay ten tu session
        return jsonify(load(customer_id))

    @app.get("/api/my-tickets")
    @login_required
    def account_my_tickets():
        """Giong /api/my-orders nhung them start_time/end_time de chia Sap dien ra / Da ket thuc."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT vo.order_id, vo.event_name, vo.zone_name, vo.ticket_quantity, "
                    "       vo.total, vo.order_status, vo.create_at, vo.method, vo.pay_at, "
                    "       e.start_time, e.end_time "
                    "FROM v_customer_orders vo "
                    "JOIN v_order_total ot ON ot.order_id = vo.order_id "
                    "LEFT JOIN event e ON e.event_id = ot.event_id "
                    "WHERE vo.customer_id = %s ORDER BY vo.order_id DESC",
                    (session["customer_id"],))
                return jsonify(list(cur.fetchall()))
        finally:
            conn.close()

    @app.post("/api/change-password")
    @login_required
    def account_change_password():
        d = request.get_json(silent=True) or {}
        old = d.get("old_password")
        new = d.get("new_password")
        if not isinstance(old, str) or not old:
            raise ApiError("Thieu truong: old_password")
        if not isinstance(new, str) or not new:
            raise ApiError("Thieu truong: new_password")
        if len(new) < MIN_PASSWORD:
            raise ApiError("Mat khau phai co it nhat 6 ky tu")

        customer_id = session["customer_id"]
        row = query_one(
            "SELECT u.password FROM users u "
            "JOIN customer c ON c.user_id = u.user_id WHERE c.customer_id = %s",
            (customer_id,))
        if not row or not check_password_hash(row["password"], old):
            raise ApiError("Mat khau hien tai khong dung", 400)
        if old == new:
            raise ApiError("Mat khau moi phai khac mat khau hien tai")

        run("UPDATE users SET password = %s "
            "WHERE user_id = (SELECT user_id FROM customer WHERE customer_id = %s)",
            (generate_password_hash(new), customer_id))
        return jsonify(ok=True)
