"""test_api.py - thu toan bo luong dat ve qua REST API.

Cach chay (backend phai DANG CHAY o terminal khac):
    python test_api.py

Moi lan chay tao 1 khach hang moi nen chay lai bao nhieu lan cung duoc.
"""
import json
import os
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
BASE = "http://localhost:5000/api"
results = []


def new_browser():
    """Moi 'trinh duyet' co cookie rieng (giu trang thai dang nhap)."""
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))


def call(browser, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with browser.open(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.load(e)


def check(name, ok, status, data):
    results.append((name, ok))
    print(f"\n[{'DUNG' if ok else 'SAI '}] {name}  (HTTP {status})")
    print(json.dumps(data, ensure_ascii=False, indent=2)[:800])


try:
    urllib.request.urlopen(BASE + "/me", timeout=3)
except Exception:
    raise SystemExit("Khong ket noi duoc backend. Hay chay 'python backend.py' o terminal khac truoc.")

khach = new_browser()
stamp = str(int(time.time()))

# 1. Dang ky khach moi (tu dang nhap luon)
s, d = call(khach, "POST", "/register", {
    "username": "test" + stamp, "password": "123456",
    "full_name": "Khach Thu " + stamp, "email": f"test{stamp}@example.com",
    "phone": "0900" + stamp[-6:]})
check("1. Dang ky khach hang moi", s == 201, s, d)

# 2. Tim su kien dang mo ban co zone con it nhat 2 ve
s, events = call(khach, "GET", "/events")
event_id = zone_id = None
for ev in events:
    if ev["sale_status"] != "ON_SALE":
        continue
    _, detail = call(khach, "GET", f"/events/{ev['event_id']}")
    for z in detail["zones"]:
        if z["available"] >= 2:
            event_id, zone_id = ev["event_id"], z["zone_id"]
            break
    if event_id:
        break
check("2. Tim su kien dang mo ban con ve", event_id is not None, s,
      {"event_id": event_id, "zone_id": zone_id})
if not event_id:
    raise SystemExit("Khong con su kien nao dang mo ban va con >= 2 ve.")

# 3. Dat 2 ve
s, order = call(khach, "POST", "/orders",
                {"event_id": event_id, "zone_id": zone_id, "quantity": 2})
check("3. Dat 2 ve -> order PENDING, ve RESERVED",
      s == 201 and order.get("order_status") == "PENDING", s, order)
order_id = order.get("order_id")

# 4. Thanh toan
s, paid = call(khach, "POST", f"/orders/{order_id}/pay", {"method": "MOMO"})
check("4. Thanh toan -> order PAID, ve SOLD co ma QR",
      s == 200 and paid.get("order_status") == "PAID", s, paid)

# 5. Dat them 1 ve -> vuot gioi han 2 ve (trigger chan)
s, d = call(khach, "POST", "/orders",
            {"event_id": event_id, "zone_id": zone_id, "quantity": 1})
check("5. Dat ve thu 3 -> bi chan", s == 400 and "2 ve" in d.get("error", ""), s, d)

# 6. Chua dang nhap thi khong xem duoc order
s, d = call(new_browser(), "GET", f"/orders/{order_id}")
check("6. Nguoi la xem order -> bi chan", s == 401, s, d)

# 7-8. Admin soat ve 2 lan
admin = new_browser()
s, d = call(admin, "POST", "/login", {"username": os.environ.get("ADMIN_USERNAME", "admin"),
                                      "password": os.environ.get("ADMIN_PASSWORD", "")})
check("7. Admin dang nhap", s == 200 and d.get("role") == "admin", s, d)

qr = (paid.get("tickets") or [{}])[0].get("qrcode")
s, d = call(admin, "POST", "/checkin", {"qrcode": qr})
check("8. Soat ve lan 1 -> hop le", s == 200 and d.get("ok"), s, d)
s, d = call(admin, "POST", "/checkin", {"qrcode": qr})
check("9. Soat lai cung ve -> bi chan", s == 400, s, d)

print("\n" + "=" * 50)
passed = sum(ok for _, ok in results)
print(f"KET QUA: {passed}/{len(results)} buoc dung")
for name, ok in results:
    print(("  DUNG  " if ok else "  SAI   ") + name)