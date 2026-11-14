"""password_reset.py - Quen mat khau: gui ma OTP 6 so qua email de dat lai mat khau.

API:
  POST /api/forgot-password   {email}                       gui ma OTP (het han sau 10 phut)
  POST /api/reset-password    {email, otp, new_password}    kiem tra ma va dat mat khau moi

Bao mat:
  - Ma OTP tao bang secrets (ngau nhien an toan), chi luu BAN BAM trong database.
  - Moi ma chi dung 1 lan, het han sau OTP_TTL_MIN phut, sai qua MAX_ATTEMPTS lan la huy.
  - Moi email chi xin ma moi sau RESEND_SEC giay (chong spam hop thu).
  - /forgot-password luon tra loi giong nhau du email co ton tai hay khong,
    de nguoi ngoai khong do duoc email nao da dang ky.

Gui email: dien SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM trong .env
(vd Gmail: smtp.gmail.com, 587, dung "App password"). Chua cau hinh SMTP thi ma OTP
duoc IN RA TERMINAL cua backend (che do thu nghiem khi lam do an).
"""
import os
import secrets
import smtplib
import ssl
from email.message import EmailMessage

from flask import current_app, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

OTP_TTL_MIN = 10
MAX_ATTEMPTS = 5
RESEND_SEC = 60
MIN_PASSWORD = 6

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS password_reset (
    user_id     INT PRIMARY KEY,
    otp_hash    VARCHAR(255) NOT NULL,
    expires_at  DATETIME NOT NULL,
    attempts    INT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
)"""

SENT_MSG = "Neu email ton tai trong he thong, ma xac nhan da duoc gui"
BAD_OTP = "Ma xac nhan khong dung hoac da het han"


def _send_email(to_addr, full_name, otp):
    host = os.environ.get("SMTP_HOST")
    if not host:
        print(f"[QUEN MAT KHAU] Chua cau hinh SMTP. Ma OTP cho {to_addr}: {otp}")
        return
    msg = EmailMessage()
    msg["Subject"] = "MyTickets - Mã xác nhận đặt lại mật khẩu"
    msg["From"] = os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER")
    msg["To"] = to_addr
    msg.set_content(
        f"Xin chào {full_name},\n\n"
        f"Mã xác nhận đặt lại mật khẩu MyTickets của bạn là: {otp}\n\n"
        f"Mã có hiệu lực trong {OTP_TTL_MIN} phút và chỉ dùng được một lần.\n"
        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; "
        "mật khẩu của bạn vẫn giữ nguyên.\n\nMyTickets")
    port = int(os.environ.get("SMTP_PORT", "587"))
    ctx = ssl.create_default_context()
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, context=ctx, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        server.starttls(context=ctx)
    with server:
        user = os.environ.get("SMTP_USER")
        if user:
            server.login(user, os.environ.get("SMTP_PASSWORD", ""))
        server.send_message(msg)


def init(app, query_one, get_connection, ApiError):
    def run(sql, params=None):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return cur.rowcount
        finally:
            conn.close()

    # Tu tao bang khi khoi dong (database cu chua co bang nay van chay duoc)
    try:
        run(CREATE_TABLE)
    except Exception as e:
        print("KHONG tao duoc bang password_reset:", e)

    def email_field(d):
        email = d.get("email")
        email = email.strip() if isinstance(email, str) else ""
        if not email:
            raise ApiError("Thieu truong: email")
        return email

    @app.post("/api/forgot-password")
    def forgot_password():
        email = email_field(request.get_json(silent=True) or {})
        user = query_one(
            "SELECT u.user_id, c.full_name, c.email FROM customer c "
            "JOIN users u ON u.user_id = c.user_id WHERE c.email = %s", (email,))
        if not user:
            return jsonify(ok=True, message=SENT_MSG)

        recent = query_one(
            "SELECT 1 AS x FROM password_reset WHERE user_id = %s "
            "AND created_at > NOW() - INTERVAL %s SECOND", (user["user_id"], RESEND_SEC))
        if recent:
            raise ApiError(f"Vui long doi {RESEND_SEC} giay truoc khi gui lai ma", 429)

        otp = f"{secrets.randbelow(10**6):06d}"
        run("REPLACE INTO password_reset (user_id, otp_hash, expires_at, attempts, created_at) "
            "VALUES (%s, %s, NOW() + INTERVAL %s MINUTE, 0, NOW())",
            (user["user_id"], generate_password_hash(otp), OTP_TTL_MIN))
        try:
            _send_email(user["email"], user["full_name"], otp)
        except Exception:
            current_app.logger.exception("Loi gui email OTP")
            run("DELETE FROM password_reset WHERE user_id = %s", (user["user_id"],))
            raise ApiError("Khong gui duoc email, vui long thu lai sau", 503)
        return jsonify(ok=True, message=SENT_MSG)

    @app.post("/api/reset-password")
    def reset_password():
        d = request.get_json(silent=True) or {}
        email = email_field(d)
        otp = str(d.get("otp") or "").strip()
        new = d.get("new_password")
        if not otp:
            raise ApiError("Thieu truong: otp")
        if not isinstance(new, str) or len(new) < MIN_PASSWORD:
            raise ApiError("Mat khau phai co it nhat 6 ky tu")

        row = query_one(
            "SELECT r.user_id, r.otp_hash, r.attempts, (r.expires_at < NOW()) AS expired "
            "FROM password_reset r JOIN customer c ON c.user_id = r.user_id "
            "WHERE c.email = %s", (email,))
        if not row:
            raise ApiError(BAD_OTP)
        if row["expired"] or row["attempts"] >= MAX_ATTEMPTS:
            run("DELETE FROM password_reset WHERE user_id = %s", (row["user_id"],))
            raise ApiError(BAD_OTP)
        if not check_password_hash(row["otp_hash"], otp):
            # Tang so lan sai co dieu kien de 2 request song song khong vuot gioi han
            run("UPDATE password_reset SET attempts = attempts + 1 "
                "WHERE user_id = %s AND attempts < %s", (row["user_id"], MAX_ATTEMPTS))
            raise ApiError(BAD_OTP)

        # Xoa ma truoc (chi 1 request thang duoc) roi moi doi mat khau
        if not run("DELETE FROM password_reset WHERE user_id = %s AND otp_hash = %s",
                   (row["user_id"], row["otp_hash"])):
            raise ApiError(BAD_OTP)
        run("UPDATE users SET password = %s WHERE user_id = %s",
            (generate_password_hash(new), row["user_id"]))
        return jsonify(ok=True)
