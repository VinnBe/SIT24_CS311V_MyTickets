"""Tạo tài khoản admin mẫu (username=admin, password=admin123).
Admin không có dòng CUSTOMER — chỉ cần có trong USER + nằm trong ADMIN_USERNAMES (config.py)."""
from werkzeug.security import generate_password_hash
from db import get_conn, init_db, DB_PATH
import os

if not os.path.exists(DB_PATH):
    init_db()
    print("Đã tạo database")

conn = get_conn()
existing = conn.execute("SELECT 1 FROM USER WHERE username = 'admin'").fetchone()
if not existing:
    conn.execute(
        "INSERT INTO USER (username, password) VALUES (?, ?)",
        ("admin", generate_password_hash("admin123")),
    )
    conn.commit()
    print("Đã tạo tài khoản admin / admin123")
else:
    print("Tài khoản admin đã tồn tại")
conn.close()
