"""backend.py - MyTickets REST API (Flask).

Cac phan trong file:
  1. Cau hinh      : doc file .env
  2. Database      : ket noi MySQL, goi SQL va stored procedure
  3. App va loi    : khoi tao Flask, doi loi thanh JSON
  4. Tai khoan     : dang ky, dang nhap, dang xuat
  5. Su kien       : danh sach, chi tiet, bao cao
  6. Don hang      : dat ve, thanh toan, huy, lich su
  7. Soat ve       : kiem tra ma QR tai cong
  8. Tien trinh nen: moi phut huy order qua han
Chay: python backend.py  ->  mo http://localhost:5000
"""
import hmac
import logging
import os
from datetime import date, datetime
from decimal import Decimal
from functools import wraps

import pymysql
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
from flask.json.provider import DefaultJSONProvider
from pymysql.cursors import DictCursor
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

import Schema

# ======================================================================
# 1. CAU HINH
# ======================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "3306"))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "mytickets")
DB_SSL_CA = os.environ.get("DB_SSL_CA") or None
if DB_SSL_CA and not os.path.isabs(DB_SSL_CA):
    DB_SSL_CA = os.path.join(BASE_DIR, DB_SSL_CA)
DB_TIME_ZONE = os.environ.get("DB_TIME_ZONE", "+07:00")

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# ======================================================================
# 2. DATABASE
# ======================================================================
def get_connection():
    kwargs = dict(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, charset="utf8mb4", cursorclass=DictCursor,
        autocommit=True,                                   # procedure tu COMMIT
        init_command=f"SET time_zone = '{DB_TIME_ZONE}'",  # NOW() theo gio VN
    )
    if DB_SSL_CA:
        kwargs["ssl"] = {"ca": DB_SSL_CA}
    return pymysql.connect(**kwargs)


def query_all(sql, params=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())
    finally:
        conn.close()


def query_one(sql, params=None):
    rows = query_all(sql, params)
    return rows[0] if rows else None


def call_proc(name, args=()):
    """Goi stored procedure. Tra ve (cac bang ket qua, gia tri tham so sau khi goi)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.callproc(name, args)
            result_sets = []
            while True:
                if cur.description:
                    result_sets.append(list(cur.fetchall()))
                if not cur.nextset():
                    break
            out_values = []
            if args:
                names = ", ".join(f"@_{name}_{i}" for i in range(len(args)))
                cur.execute(f"SELECT {names}")
                out_values = list(cur.fetchone().values())
            return result_sets, out_values
    finally:
        conn.close()

# ======================================================================
# 3. APP VA XU LY LOI
# ======================================================================
class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def _json_default(o):
    if isinstance(o, datetime):
        return o.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(o, date):
        return o.isoformat()
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    raise TypeError(f"Khong chuyen duoc {type(o).__name__} sang JSON")


class JSONProvider(DefaultJSONProvider):
    default = staticmethod(_json_default)
    sort_keys = False


app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY", "dev-only-change-me"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
app.json = JSONProvider(app)

# Loi MySQL do nguoi dung gay ra -> 400 kem thong bao goc
#   1644 SIGNAL | 1062 trung khoa | 3819 vi pham CHECK | 1452 sai khoa ngoai
USER_DB_ERRORS = {1062, 1452, 1644, 3819}


@app.errorhandler(ApiError)
def handle_api_error(e):
    return jsonify(error=e.message), e.status


@app.errorhandler(Schema.SchemaError)
def handle_schema_error(e):
    return jsonify(error=str(e)), 400


@app.errorhandler(pymysql.MySQLError)
def handle_db_error(e):
    code = e.args[0] if e.args else None
    if code in USER_DB_ERRORS and len(e.args) > 1:
        return jsonify(error=e.args[1]), 400
    app.logger.exception("Loi co so du lieu")
    return jsonify(error="Loi co so du lieu, vui long thu lai"), 500


@app.errorhandler(HTTPException)
def handle_http_error(e):
    if request.path.startswith("/api/"):
        return jsonify(error=e.description), e.code
    return e


@app.get("/")
def home():
    if os.path.exists(os.path.join(FRONTEND_DIR, "index.html")):
        return app.send_static_file("index.html")
    return "Backend MyTickets dang chay. Chua co frontend/index.html."


def login_required(f):
    """Chi khach hang da dang nhap."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if session.get("role") != "customer":
            raise ApiError("Ban can dang nhap", 401)
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    """Chi admin."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if session.get("role") != "admin":
            raise ApiError("Chi admin moi duoc dung chuc nang nay", 403)
        return f(*args, **kwargs)
    return wrapper


def body(schema):
    return Schema.parse(schema, request.get_json(silent=True))

# ======================================================================
# 4. TAI KHOAN
# ======================================================================
def set_customer_session(customer_id, username, full_name):
    session.clear()
    session.update(role="customer", customer_id=customer_id,
                   username=username, full_name=full_name)


@app.post("/api/register")
def register():
    d = body(Schema.REGISTER)
    if d["username"] == ADMIN_USERNAME:
        raise ApiError("Username hoac email da ton tai")
    _, out = call_proc("sp_register_customer", (
        d["username"], generate_password_hash(d["password"]),
        d["full_name"], d["email"], d["phone"],
        0,                                     # cho tham so OUT p_customer_id
    ))
    set_customer_session(out[5], d["username"], d["full_name"])
    return jsonify(role="customer", customer_id=out[5],
                   username=d["username"], full_name=d["full_name"]), 201


@app.post("/api/login")
def login():
    d = body(Schema.LOGIN)
    if d["username"] == ADMIN_USERNAME:        # admin doc tu .env
        if ADMIN_PASSWORD and hmac.compare_digest(
                d["password"].encode(), ADMIN_PASSWORD.encode()):
            session.clear()
            session.update(role="admin", username=d["username"])
            return jsonify(role="admin", username=d["username"])
        raise ApiError("Sai ten dang nhap hoac mat khau", 401)

    row = query_one(
        "SELECT c.customer_id, c.full_name, u.password "
        "FROM users u JOIN customer c ON c.user_id = u.user_id "
        "WHERE u.username = %s", (d["username"],))
    if not row or not check_password_hash(row["password"], d["password"]):
        raise ApiError("Sai ten dang nhap hoac mat khau", 401)

    set_customer_session(row["customer_id"], d["username"], row["full_name"])
    return jsonify(role="customer", customer_id=row["customer_id"],
                   username=d["username"], full_name=row["full_name"])


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/me")
def me():
    if not session.get("role"):
        return jsonify(logged_in=False)
    return jsonify(logged_in=True, role=session["role"],
                   username=session.get("username"),
                   full_name=session.get("full_name"),
                   customer_id=session.get("customer_id"))

# ======================================================================
# 5. SU KIEN
# ======================================================================
EVENT_COLUMNS = ("event_id, event_name, venue_name, sale_start, "
                 "start_time, end_time, sale_status")


@app.get("/api/events")
def list_events():
    return jsonify(query_all(
        f"SELECT {EVENT_COLUMNS} FROM v_event_status ORDER BY start_time"))


@app.get("/api/events/<int:event_id>")
def event_detail(event_id):
    event = query_one(
        f"SELECT {EVENT_COLUMNS} FROM v_event_status WHERE event_id = %s",
        (event_id,))
    if not event:
        raise ApiError("Su kien khong ton tai", 404)
    zones = query_all(
        "SELECT zone_id, zone_name, price, total_seats, available "
        "FROM v_event_sales WHERE event_id = %s ORDER BY zone_id", (event_id,))
    return jsonify(event=event, zones=zones)


@app.get("/api/events/<int:event_id>/report")
@admin_required
def event_report(event_id):
    sets, _ = call_proc("sp_event_sales_report", (event_id,))
    return jsonify(zones=sets[0], total=sets[1][0])

# ======================================================================
# 6. DON HANG
# ======================================================================
def order_detail(order_id, customer_id):
    """1 order cua dung khach dang dang nhap, kem ve va so giay con lai."""
    order = query_one(
        """
        SELECT ot.order_id, ot.order_status, ot.ticket_quantity, ot.ticket_amount,
               o.create_at, o.method, o.pay_at,
               e.event_id, e.event_name, z.zone_name,
               CASE WHEN ot.order_status = 'PENDING' THEN
                 GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(),
                   LEAST(o.create_at + INTERVAL 15 MINUTE, e.start_time)))
               END AS seconds_left
        FROM v_order_total ot
        JOIN orders o     ON o.order_id = ot.order_id
        LEFT JOIN event e ON e.event_id = ot.event_id
        LEFT JOIN zone z  ON z.zone_id  = ot.zone_id
        WHERE ot.order_id = %s AND ot.customer_id = %s
        """, (order_id, customer_id))
    if not order:
        raise ApiError("Order khong ton tai", 404)
    order["tickets"] = query_all(
        """
        SELECT t.ticket_no, s.seat_row, s.seat_number, t.ticket_price, t.ticket_status,
               CASE WHEN t.ticket_status = 'SOLD' THEN t.qrcode END AS qrcode,
               t.checkin_at
        FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
        WHERE t.order_id = %s ORDER BY t.ticket_no
        """, (order_id,))
    return order


@app.post("/api/orders")
@login_required
def place_order():
    d = body(Schema.ORDER)
    customer_id = session["customer_id"]        # lay tu session, khong tu trinh duyet
    _, out = call_proc("sp_place_order", (
        customer_id, d["event_id"], d["zone_id"], d["quantity"],
        0,                                      # cho tham so OUT p_order_id
    ))
    return jsonify(order_detail(out[4], customer_id)), 201


@app.get("/api/orders/<int:order_id>")
@login_required
def get_order(order_id):
    return jsonify(order_detail(order_id, session["customer_id"]))


@app.post("/api/orders/<int:order_id>/pay")
@login_required
def pay_order(order_id):
    d = body(Schema.PAY)
    # Mo phong thanh toan thanh cong (khong noi cong thanh toan that)
    call_proc("sp_pay_order", (order_id, session["customer_id"], d["method"]))
    return jsonify(order_detail(order_id, session["customer_id"]))


@app.post("/api/orders/<int:order_id>/cancel")
@login_required
def cancel_order(order_id):
    call_proc("sp_cancel_order", (order_id, session["customer_id"]))
    return jsonify(order_detail(order_id, session["customer_id"]))


@app.get("/api/my-orders")
@login_required
def my_orders():
    return jsonify(query_all(
        "SELECT order_id, event_name, zone_name, ticket_quantity, total, "
        "       order_status, create_at, method, pay_at "
        "FROM v_customer_orders WHERE customer_id = %s ORDER BY order_id DESC",
        (session["customer_id"],)))

# ======================================================================
# 7. SOAT VE
# ======================================================================
@app.post("/api/checkin")
@admin_required
def checkin():
    d = body(Schema.CHECKIN)
    sets, _ = call_proc("sp_checkin_ticket", (d["qrcode"],))
    return jsonify(ok=True, ticket=sets[0][0] if sets and sets[0] else {})

# ======================================================================
# 8. TIEN TRINH NEN: moi phut huy order qua han
# ======================================================================
def expire_orders_job():
    try:
        sets, _ = call_proc("sp_expire_orders")
        n = sets[0][0]["expired_orders"] if sets and sets[0] else 0
        if n:
            app.logger.info("Da chuyen %s order qua han sang FAILED", n)
    except Exception:
        app.logger.exception("Loi khi xu ly order qua han")


def start_scheduler():
    sched = BackgroundScheduler(daemon=True)
    sched.add_job(expire_orders_job, "interval", minutes=1, id="expire_orders",
                  max_instances=1, coalesce=True, next_run_time=datetime.now())
    sched.start()
    return sched


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    start_scheduler()
    print("MyTickets dang chay tai http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)