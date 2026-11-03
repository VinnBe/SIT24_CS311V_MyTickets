"""Sinh dữ liệu demo: venue, zone (ghế sinh tự động), event (vé sinh sẵn), khách hàng và vài order đã thanh toán.

Chạy sau seed.py:   python3 seed_demo.py
Gọi thẳng qua API của app (test client) nên logic giống hệt khi dùng giao diện.
Chạy lại nhiều lần an toàn: nếu DB đã có venue thì bỏ qua.
"""
import os
from datetime import datetime, timedelta

from db import DB_PATH, get_conn, init_db

if not os.path.exists(DB_PATH):
    init_db()

# đảm bảo có tài khoản admin
import seed  # noqa: F401  (chạy seed.py: tạo admin nếu chưa có)

from app import app

conn = get_conn()
if conn.execute("SELECT COUNT(*) FROM VENUE").fetchone()[0] > 0:
    print("DB đã có dữ liệu demo — bỏ qua. (Xoá mytickets.db rồi chạy lại seed.py + seed_demo.py nếu muốn tạo mới)")
    conn.close()
    raise SystemExit
conn.close()


def iso(delta):
    return (datetime.utcnow() + delta).replace(microsecond=0).isoformat()


def ok(res, what):
    if res.status_code >= 400:
        raise SystemExit(f"Lỗi khi {what}: {res.status_code} {res.get_json()}")
    return res.get_json()


admin = app.test_client()
ok(admin.post("/api/login", json={"username": "admin", "password": "admin123"}), "đăng nhập admin")

# ---------- Venue + Zone ----------
venues = {}
for key, name, address, zones in [
    ("hoabinh", "Nhà hát Hòa Bình", "240 Đường 3/2, Quận 10, TP.HCM", [("VIP", 20), ("Standard", 40)]),
    ("thehall", "The Hall Saigon", "15 Nguyễn Thị Minh Khai, Quận 1, TP.HCM", [("Front Row", 10), ("General", 30)]),
    ("attic", "The Attic Jazz Club", "8 Lê Thánh Tôn, Quận 1, TP.HCM", [("Hàng đầu", 2), ("Hàng sau", 2)]),
]:
    vid = ok(admin.post("/api/venues", json={"venue_name": name, "address": address}), f"tạo venue {name}")["venue_id"]
    zone_ids = {}
    for zname, cap in zones:
        zone_ids[zname] = ok(
            admin.post(f"/api/venues/{vid}/zones", json={"zone_name": zname, "capacity": cap}), f"tạo zone {zname}"
        )["zone_id"]
    venues[key] = (vid, zone_ids)


# ---------- Event (vé được sinh sẵn lúc tạo) ----------
def make_event(venue_key, name, sale_start, start, duration_h, prices_by_zone_name):
    vid, zone_ids = venues[venue_key]
    prices = {str(zone_ids[z]): p for z, p in prices_by_zone_name.items()}
    eid = ok(
        admin.post("/api/events", json={
            "venue_id": vid,
            "event_name": name,
            "sale_start": iso(sale_start),
            "start_time": iso(start),
            "end_time": iso(start + timedelta(hours=duration_h)),
            "prices": prices,
        }),
        f"tạo event {name}",
    )["event_id"]
    return eid


d = timedelta
ev_rock = make_event("hoabinh", "Sóng Đêm Rock Fest", -d(days=2), d(days=10), 3, {"VIP": 650000, "Standard": 350000})
ev_indie = make_event("thehall", "Indie Acoustic Night", d(days=3), d(days=20), 2, {"Front Row": 480000, "General": 280000})
ev_jazz = make_event("attic", "Jazz Night at The Attic", -d(days=1), d(days=5), 2, {"Hàng đầu": 700000, "Hàng sau": 500000})
ev_past = make_event("hoabinh", "Countdown Concert 2025", -d(days=60), -d(days=30), 3, {"VIP": 600000, "Standard": 300000})


# ---------- Khách hàng ----------
def register(username, full_name, email, phone):
    c = app.test_client()
    ok(c.post("/api/register", json={
        "username": username, "password": "demo123", "full_name": full_name, "email": email, "phone": phone,
    }), f"đăng ký {username}")
    ok(c.post("/api/login", json={"username": username, "password": "demo123"}), f"đăng nhập {username}")
    return c


def buy(client, event_id, zone_id, qty, method="MOMO"):
    oid = ok(client.post("/api/orders", json={"event_id": event_id, "zone_id": zone_id, "quantity": qty}), "đặt vé")["order_id"]
    ok(client.post(f"/api/orders/{oid}/pay", json={"method": method}), "thanh toán")
    return oid


demo = register("demo", "Khách Demo", "demo@example.com", "0900000001")
khach1 = register("khach1", "Nguyễn Văn An", "an@example.com", "0900000002")
khach2 = register("khach2", "Trần Thị Bình", "binh@example.com", "0900000003")

vid_hb, zones_hb = venues["hoabinh"]
vid_at, zones_at = venues["attic"]

# demo mua 1 vé VIP Rock Fest (để trang "Vé của tôi" có dữ liệu)
demo_order = buy(demo, ev_rock, zones_hb["VIP"], 1, "CREDIT_CARD")
# khach1 + khach2 mua hết vé Jazz Night -> trạng thái "Hết vé"
buy(khach1, ev_jazz, zones_at["Hàng đầu"], 2)
buy(khach2, ev_jazz, zones_at["Hàng sau"], 2, "BANK_TRANSFER")

# lấy mã QR của vé demo để in ra
my = ok(demo.get("/api/my-tickets"), "xem vé của demo")
qr = my[0]["qr_code"] if my else "?"

print("Đã tạo dữ liệu demo:")
print("  - 3 venue, 6 zone, ghế + vé sinh sẵn theo capacity")
print("  - 4 event: Rock Fest (Đang bán), Indie Acoustic (Sắp mở bán), Jazz Night (Hết vé), Countdown 2025 (Đã đóng)")
print("  - Admin:     admin / admin123")
print("  - Khách:     demo / demo123  (đã mua 1 vé Rock Fest, mã QR =", qr + ")")
print("               khach1, khach2 / demo123")
print("  - Thử soát vé: đăng nhập admin, nhập mã QR", qr, "ở mục Soát vé")
