"""pay_qr.py - Thanh toan bang ma QR (mo phong vi MoMo / VNPAY).

Luong:
  1. Web (may tinh) goi POST /api/orders/<id>/pay-qr {method}
       -> nhan link xac nhan da ky (token) de ve thanh ma QR trong popup.
  2. Dien thoai quet ma -> mo trang pay-confirm.html?t=<token>
       -> GET  /api/pay-qr/<token>          xem don (danh dau "da quet")
       -> POST /api/pay-qr/<token>/confirm  bam Xac nhan -> goi sp_pay_order
  3. Web hoi GET /api/orders/<id>/pay-status moi 2 giay; PAID thi bao thanh cong.

Token ky bang SECRET_KEY (itsdangerous, di kem Flask) nen dien thoai khong can dang nhap
va khong sua duoc ma don / so tien. Token het han sau TOKEN_TTL giay; moi don chi
thanh toan duoc 1 lan vi sp_pay_order chi nhan don dang PENDING.

Dien thoai phai mo duoc dia chi trong ma QR:
  - Vao web bang localhost thi link dung IP mang LAN cua may (dien thoai cung Wi-Fi).
  - Muon dung dia chi khac (vd ngrok) thi dat PUBLIC_URL trong .env.
"""
import os
import socket
import threading
import time

from flask import jsonify, request, session
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

QR_METHODS = ("MOMO", "VNPAY")
TOKEN_TTL = 15 * 60

_scanned = {}                 # order_id -> thoi diem dien thoai mo trang xac nhan
_scanned_lock = threading.Lock()


def _lan_ip():
    """IP cua may trong mang LAN (khong gui goi tin nao, chi hoi he dieu hanh chon card mang)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def _public_base():
    base = os.environ.get("PUBLIC_URL", "").strip().rstrip("/")
    if base:
        return base
    host = request.host.split(":")[0]
    if host in ("localhost", "127.0.0.1", "::1", "[::1]"):
        port = request.host.split(":")[1] if ":" in request.host else "80"
        return f"http://{_lan_ip()}:{port}"
    return request.host_url.rstrip("/")


def init(app, query_one, call_proc, order_detail, login_required, ApiError):
    signer = URLSafeTimedSerializer(app.secret_key, salt="pay-qr")

    def read_token(token):
        try:
            return signer.loads(token, max_age=TOKEN_TTL)
        except SignatureExpired:
            raise ApiError("Ma QR da het han, vui long tao ma moi", 410)
        except BadSignature:
            raise ApiError("Ma QR khong hop le", 400)

    @app.post("/api/orders/<int:order_id>/pay-qr")
    @login_required
    def pay_qr_create(order_id):
        method = str((request.get_json(silent=True) or {}).get("method") or "").upper()
        if method not in QR_METHODS:
            raise ApiError("Phuong thuc nay khong thanh toan bang ma QR")
        order = order_detail(order_id, session["customer_id"])
        if order["order_status"] != "PENDING" or not order["seconds_left"]:
            raise ApiError("Order khong o trang thai PENDING")
        token = signer.dumps({"o": order_id, "c": session["customer_id"], "m": method})
        with _scanned_lock:
            _scanned.pop(order_id, None)
        return jsonify(url=f"{_public_base()}/pay-confirm.html?t={token}",
                       expires_in=min(TOKEN_TTL, int(order["seconds_left"])))

    @app.get("/api/orders/<int:order_id>/pay-status")
    @login_required
    def pay_qr_status(order_id):
        row = query_one("SELECT order_status FROM orders WHERE order_id = %s AND customer_id = %s",
                        (order_id, session["customer_id"]))
        if not row:
            raise ApiError("Order khong ton tai", 404)
        with _scanned_lock:
            scanned = order_id in _scanned
        return jsonify(status=row["order_status"], scanned=scanned)

    @app.get("/api/pay-qr/<token>")
    def pay_qr_info(token):
        t = read_token(token)
        order = order_detail(t["o"], t["c"])
        if order["order_status"] == "PENDING":
            with _scanned_lock:
                _scanned[t["o"]] = time.time()
        return jsonify(method=t["m"], order_id=order["order_id"], status=order["order_status"],
                       event_name=order["event_name"], zone_name=order["zone_name"],
                       quantity=order["ticket_quantity"], amount=order["ticket_amount"],
                       seconds_left=order["seconds_left"])

    @app.post("/api/pay-qr/<token>/confirm")
    def pay_qr_confirm(token):
        t = read_token(token)
        call_proc("sp_pay_order", (t["o"], t["c"], t["m"]))
        with _scanned_lock:
            _scanned.pop(t["o"], None)
        return jsonify(ok=True)
