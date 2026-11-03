from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_conn
from config import ADMIN_USERNAMES

bp = Blueprint("auth", __name__, url_prefix="/api")


@bp.post("/register")
def register():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()

    if not username or not password or not full_name or not email:
        return jsonify(error="username, password, full_name, email là bắt buộc"), 400

    conn = get_conn()
    try:
        cur = conn.cursor()
        # customer tự đăng ký: tạo đồng thời USER + CUSTOMER trong cùng 1 transaction
        cur.execute(
            "INSERT INTO USER (username, password) VALUES (?, ?)",
            (username, generate_password_hash(password)),
        )
        user_id = cur.lastrowid
        cur.execute(
            "INSERT INTO CUSTOMER (user_id, full_name, email, phone) VALUES (?, ?, ?, ?)",
            (user_id, full_name, email, phone),
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        msg = str(e)
        if "UNIQUE" in msg and "username" in msg:
            return jsonify(error="Username đã tồn tại"), 409
        if "UNIQUE" in msg and "email" in msg:
            return jsonify(error="Email đã được đăng ký"), 409
        return jsonify(error="Đăng ký thất bại: " + msg), 400
    finally:
        conn.close()

    return jsonify(message="Đăng ký thành công"), 201


@bp.post("/login")
def login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    conn = get_conn()
    user = conn.execute("SELECT * FROM USER WHERE username = ?", (username,)).fetchone()
    if not user or not check_password_hash(user["password"], password):
        conn.close()
        return jsonify(error="Sai username hoặc password"), 401

    is_admin = username in ADMIN_USERNAMES
    customer = None
    if not is_admin:
        customer = conn.execute(
            "SELECT * FROM CUSTOMER WHERE user_id = ?", (user["user_id"],)
        ).fetchone()
    conn.close()

    session["user_id"] = user["user_id"]
    session["username"] = username
    session["is_admin"] = is_admin
    session["customer_id"] = customer["customer_id"] if customer else None

    return jsonify(
        username=username,
        is_admin=is_admin,
        customer_id=customer["customer_id"] if customer else None,
        full_name=customer["full_name"] if customer else None,
    )


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify(message="Đã đăng xuất")


@bp.get("/me")
def me():
    if "user_id" not in session:
        return jsonify(error="Chưa đăng nhập"), 401
    return jsonify(
        username=session.get("username"),
        is_admin=session.get("is_admin"),
        customer_id=session.get("customer_id"),
    )


def require_login():
    if "user_id" not in session:
        return jsonify(error="Chưa đăng nhập"), 401
    return None


def require_admin():
    if not session.get("is_admin"):
        return jsonify(error="Cần quyền admin"), 403
    return None


def require_customer():
    if not session.get("customer_id"):
        return jsonify(error="Cần đăng nhập bằng tài khoản customer"), 403
    return None
