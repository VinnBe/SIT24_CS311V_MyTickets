"""venue_layout.py - So do su kien (Tao so do: tai ban ve co san / tu thiet ke).

So do gan voi DIA DIEM (venue), vi khu (zone) va ghe (seat) thuoc ve dia diem;
moi su kien to chuc tai dia diem do dung chung so do.

Hinh ve (vi tri san khau, khu, chu) luu thanh file, KHONG them bang moi:

    frontend/uploads/venues/
        1/layout.json          {"method": "image"|"design", "width", "height", "background", "items": [...]}
        1/background.jpg       anh ban ve (phuong phap 1)

Khi admin bam "Luu & tao ghe", cac khu tren so do duoc dong bo vao database:
    - khu moi -> INSERT zone
    - doi ten / doi so ghe -> UPDATE zone, them ghe con thieu, xoa ghe thua chua co ve
    - ghe da co ve (ke ca ve AVAILABLE) duoc giu nguyen
    - khu da dat gia o su kien chua dien ra -> sinh ve cho ghe moi (giong muc Gia ve)

Gan vao backend.py, ngay sau event_look.init(...):
    import venue_layout
    venue_layout.init(app, admin_required, ApiError, FRONTEND_DIR, query_one, query_all, get_connection)

API:
    GET    /api/events/<event_id>/layout                 so do cua su kien (trang chon ve)
    GET    /api/admin/venue-layout/<venue_id>            so do + danh sach khu trong database
    PUT    /api/admin/venue-layout/<venue_id>            {layout, apply, dry_run}
    DELETE /api/admin/venue-layout/<venue_id>            xoa so do (khong dong vao khu / ghe)
    POST   /api/admin/venue-layout/<venue_id>/background tai anh nen (form-data, truong "file")
"""
import glob
import json
import math
import os
import re
import threading
import time

from flask import jsonify, request

MAX_IMAGE_BYTES = 3 * 1024 * 1024
MAX_ITEMS = 500
MAX_SEATS_PER_ZONE = 5000
STANDING_PER_ROW = 50               # khu dung: moi "hang" 50 cho de sinh ghe trong database
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def image_ext(data):
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def row_label(i):
    """0 -> A, 25 -> Z, 26 -> AA, 27 -> AB ... (giong ten cot Excel)."""
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def zone_seats(item):
    """Danh sach (hang, so ghe) ma khu tren so do can co."""
    start = ord(item["start_row"]) - 65
    if item["seating"] == "standing":
        n = item["capacity"]
        rows = math.ceil(n / STANDING_PER_ROW)
        return [(row_label(start + r), c + 1)
                for r in range(rows)
                for c in range(min(STANDING_PER_ROW, n - r * STANDING_PER_ROW))]
    return [(row_label(start + r), c + 1) for r in range(item["rows"]) for c in range(item["cols"])]


def init(app, admin_required, ApiError, frontend_dir, query_one, query_all, get_connection):
    root = os.path.join(frontend_dir, "uploads", "venues")
    lock = threading.Lock()

    if not app.config.get("MAX_CONTENT_LENGTH"):
        app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES + 512 * 1024

    # ------------------------------------------------------------------
    # Doc / ghi file
    # ------------------------------------------------------------------
    def folder(venue_id):
        return os.path.join(root, str(venue_id))

    def load(venue_id):
        try:
            with open(os.path.join(folder(venue_id), "layout.json"), encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else None
        except (FileNotFoundError, ValueError):
            return None

    def save(venue_id, layout):
        os.makedirs(folder(venue_id), exist_ok=True)
        path = os.path.join(folder(venue_id), "layout.json")
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(layout, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, path)

    def check_venue(venue_id):
        if not query_one("SELECT 1 FROM venue WHERE venue_id = %s", (venue_id,)):
            raise ApiError("Không tìm thấy địa điểm", 404)

    # ------------------------------------------------------------------
    # Kiem tra du lieu so do gui len (chi giu cac truong biet truoc)
    # ------------------------------------------------------------------
    def num(v, lo, hi, default):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            return default
        return round(min(hi, max(lo, float(v))), 2)

    def whole(v, lo, hi, label):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v != int(v):
            raise ApiError(f"{label} phải là số nguyên")
        v = int(v)
        if not lo <= v <= hi:
            raise ApiError(f"{label} phải từ {lo} đến {hi}")
        return v

    def string(v, max_len):
        return v.strip()[:max_len] if isinstance(v, str) else ""

    def clean(raw, venue_id):
        if not isinstance(raw, dict):
            raise ApiError("Dữ liệu sơ đồ không hợp lệ")
        width = num(raw.get("width"), 200, 6000, 1200)
        height = num(raw.get("height"), 200, 6000, 800)
        out = {
            "version": 1,
            "method": "image" if raw.get("method") == "image" else "design",
            "width": width, "height": height,
            "background": None, "items": [],
        }
        bg = raw.get("background")
        if isinstance(bg, dict) and isinstance(bg.get("url"), str) and \
                bg["url"].startswith(f"/uploads/venues/{venue_id}/background."):
            out["background"] = {
                "url": bg["url"][:200],
                "opacity": num(bg.get("opacity"), 0, 1, 0.6),
                "public": bool(bg.get("public", True)),
            }
        items = raw.get("items")
        if not isinstance(items, list):
            items = []
        if len(items) > MAX_ITEMS:
            raise ApiError(f"Sơ đồ tối đa {MAX_ITEMS} thành phần")

        names = set()
        for it in items:
            if not isinstance(it, dict) or it.get("type") not in ("stage", "zone", "text"):
                continue
            iid = it.get("id") if isinstance(it.get("id"), str) and ID_RE.match(it["id"]) else None
            if not iid:
                raise ApiError("Thành phần sơ đồ thiếu mã")
            c = {
                "id": iid, "type": it["type"],
                "x": num(it.get("x"), -20000, 20000, 0), "y": num(it.get("y"), -20000, 20000, 0),
                "w": num(it.get("w"), 4, 20000, 100), "h": num(it.get("h"), 4, 20000, 60),
                "rot": num(it.get("rot"), -360, 360, 0),
            }
            if it["type"] in ("stage", "text"):
                c["label"] = string(it.get("label"), 60)
                c["size"] = num(it.get("size"), 6, 300, 24)
                col = it.get("color")
                c["color"] = col if isinstance(col, str) and COLOR_RE.match(col) else None
                if it["type"] == "stage":
                    c["shape"] = it.get("shape") if it.get("shape") in ("rect", "round", "thrust") else "rect"
            else:
                name = string(it.get("name"), 50)
                if not name:
                    raise ApiError("Có khu chưa đặt tên")
                key = name.casefold()
                if key in names:
                    raise ApiError(f"Tên khu “{name}” bị trùng trên sơ đồ")
                names.add(key)
                c["name"] = name
                c["shape"] = "poly" if it.get("shape") == "poly" else "rect"
                if c["shape"] == "poly":
                    pts = it.get("points")
                    if not isinstance(pts, list) or not 3 <= len(pts) <= 200:
                        raise ApiError(f"Khu “{name}”: hình đa giác cần từ 3 điểm")
                    c["points"] = [[num(p[0], -20000, 20000, 0), num(p[1], -20000, 20000, 0)]
                                   for p in pts if isinstance(p, list) and len(p) == 2]
                    if len(c["points"]) < 3:
                        raise ApiError(f"Khu “{name}”: hình đa giác cần từ 3 điểm")
                    xs = [p[0] for p in c["points"]]
                    ys = [p[1] for p in c["points"]]
                    c.update(x=min(xs), y=min(ys), w=max(4, max(xs) - min(xs)), h=max(4, max(ys) - min(ys)), rot=0)
                col = it.get("color")
                c["color"] = col if isinstance(col, str) and COLOR_RE.match(col) else "#2BD07F"
                c["seating"] = "standing" if it.get("seating") == "standing" else "seated"
                sr = it.get("start_row")
                c["start_row"] = sr.upper() if isinstance(sr, str) and len(sr) == 1 and sr.isalpha() and sr.isascii() else "A"
                if c["seating"] == "seated":
                    c["rows"] = whole(it.get("rows"), 1, 100, f"Số hàng của khu “{name}”")
                    c["cols"] = whole(it.get("cols"), 1, 200, f"Số ghế mỗi hàng của khu “{name}”")
                    if c["rows"] * c["cols"] > MAX_SEATS_PER_ZONE:
                        raise ApiError(f"Khu “{name}” tối đa {MAX_SEATS_PER_ZONE} ghế")
                    c["capacity"] = c["rows"] * c["cols"]
                else:
                    c["capacity"] = whole(it.get("capacity"), 1, MAX_SEATS_PER_ZONE, f"Sức chứa của khu “{name}”")
                    c["rows"] = c["cols"] = None
                c["show_seats"] = bool(it.get("show_seats", True))
                zid = it.get("zone_id")
                c["zone_id"] = zid if isinstance(zid, int) and not isinstance(zid, bool) and zid > 0 else None
            out["items"].append(c)
        return out

    # ------------------------------------------------------------------
    # Dong bo khu tren so do -> bang zone / seat / ticket (1 transaction)
    # ------------------------------------------------------------------
    def sync(venue_id, layout, dry_run):
        conn = get_connection()
        report, created_ids = [], {}
        try:
            conn.begin()
            with conn.cursor() as cur:
                cur.execute("SELECT zone_id, zone_name, capacity FROM zone WHERE venue_id = %s", (venue_id,))
                db = {r["zone_id"]: r for r in cur.fetchall()}
                zones = [it for it in layout["items"] if it["type"] == "zone"]

                # 1. Gan khu tren so do voi khu trong database: theo zone_id, roi theo ten
                linked = {}
                for it in zones:
                    if it["zone_id"] in db and it["zone_id"] not in linked.values():
                        linked[it["id"]] = it["zone_id"]
                by_name = {r["zone_name"].casefold(): zid for zid, r in db.items()}
                for it in zones:
                    if it["id"] in linked:
                        continue
                    zid = by_name.get(it["name"].casefold())
                    if zid and zid not in linked.values():
                        linked[it["id"]] = zid

                # Ten moi khong duoc trung khu khac cua dia diem khong nam tren so do
                free = {zid for zid in db if zid not in linked.values()}
                for it in zones:
                    for zid in free:
                        if db[zid]["zone_name"].casefold() == it["name"].casefold():
                            raise ApiError(f"Tên “{it['name']}” đang được khu khác của địa điểm dùng")

                # 2. Doi ten qua ten tam truoc, tranh trung UNIQUE(venue_id, zone_name) khi hoan doi ten
                renamed = [(it, linked[it["id"]]) for it in zones
                           if it["id"] in linked and db[linked[it["id"]]]["zone_name"] != it["name"]]
                for _, zid in renamed:
                    cur.execute("UPDATE zone SET zone_name = %s WHERE zone_id = %s", (f"~tmp{zid}", zid))
                for it, zid in renamed:
                    cur.execute("UPDATE zone SET zone_name = %s WHERE zone_id = %s", (it["name"], zid))

                # 3. Tung khu: them / xoa ghe, cap nhat suc chua, sinh ve
                for it in zones:
                    wanted = zone_seats(it)
                    zid = linked.get(it["id"])
                    row = {"id": it["id"], "name": it["name"], "zone_id": zid,
                           "action": "updated" if zid else "created",
                           "added": 0, "removed": 0, "kept_used": 0, "tickets": 0, "capacity": 0}
                    if not zid:
                        cur.execute("INSERT INTO zone (zone_name, capacity, venue_id) VALUES (%s, %s, %s)",
                                    (it["name"], len(wanted), venue_id))
                        zid = cur.lastrowid
                        created_ids[it["id"]] = zid
                        have = {}
                    else:
                        cur.execute(
                            "SELECT s.seat_id, s.seat_row, s.seat_number, "
                            "EXISTS (SELECT 1 FROM ticket t WHERE t.seat_id = s.seat_id) AS used "
                            "FROM seat s WHERE s.zone_id = %s", (zid,))
                        have = {(r["seat_row"], r["seat_number"]): r for r in cur.fetchall()}
                    want = set(wanted)
                    extra = [r for k, r in have.items() if k not in want]
                    drop = [r["seat_id"] for r in extra if not r["used"]]
                    row["kept_used"] = len(extra) - len(drop)
                    add = [k for k in wanted if k not in have]
                    final = len(wanted) + row["kept_used"]
                    if drop:
                        cur.executemany("DELETE FROM seat WHERE seat_id = %s", [(s,) for s in drop])
                    if have:
                        cur.execute("UPDATE zone SET capacity = %s WHERE zone_id = %s",
                                    (max(final, db[zid]["capacity"]), zid))
                    if add:
                        cur.executemany("INSERT INTO seat (seat_row, seat_number, zone_id) VALUES (%s, %s, %s)",
                                        [(r, n, zid) for r, n in add])
                    cur.execute("UPDATE zone SET capacity = %s WHERE zone_id = %s", (final, zid))
                    row.update(added=len(add), removed=len(drop), capacity=final)
                    if row["action"] == "updated" and not add and not drop and zid not in [z for _, z in renamed] \
                            and db[zid]["capacity"] == final:
                        row["action"] = "unchanged"

                    # Su kien chua dien ra da dat gia khu nay: sinh ve cho ghe chua co ve
                    if add and row["action"] != "created":
                        cur.execute(
                            "SELECT hp.event_id, hp.price FROM has_price hp JOIN event e ON e.event_id = hp.event_id "
                            "WHERE hp.zone_id = %s AND e.start_time > NOW()", (zid,))
                        for hp in cur.fetchall():
                            cur.execute(
                                "SELECT s.seat_id FROM seat s WHERE s.zone_id = %s AND NOT EXISTS "
                                "(SELECT 1 FROM ticket t WHERE t.seat_id = s.seat_id AND t.event_id = %s)",
                                (zid, hp["event_id"]))
                            new = [r["seat_id"] for r in cur.fetchall()]
                            if not new:
                                continue
                            cur.execute("SELECT COALESCE(MAX(ticket_no), 0) AS m FROM ticket WHERE event_id = %s FOR UPDATE",
                                        (hp["event_id"],))
                            nxt = cur.fetchone()["m"] + 1
                            cur.executemany(
                                "INSERT INTO ticket (event_id, ticket_no, seat_id, ticket_status, ticket_price) "
                                "VALUES (%s, %s, %s, 'AVAILABLE', %s)",
                                [(hp["event_id"], nxt + i, sid, hp["price"]) for i, sid in enumerate(new)])
                            row["tickets"] += len(new)
                    row["zone_id"] = None if dry_run and row["action"] == "created" else zid
                    report.append(row)
                    it["zone_id"] = row["zone_id"]

                unplaced = [{"zone_id": zid, "zone_name": db[zid]["zone_name"]}
                            for zid in sorted(free)]
            if dry_run:
                conn.rollback()
            else:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        return report, unplaced

    # ------------------------------------------------------------------
    # API
    # ------------------------------------------------------------------
    @app.get("/api/events/<int:event_id>/layout")
    def event_layout(event_id):
        ev = query_one("SELECT venue_id FROM event WHERE event_id = %s", (event_id,))
        if not ev:
            raise ApiError("Su kien khong ton tai", 404)
        layout = load(ev["venue_id"])
        if layout and layout.get("background") and not layout["background"].get("public", True):
            layout["background"] = None
        return jsonify(layout=layout)

    @app.get("/api/admin/venue-layout/<int:venue_id>")
    @admin_required
    def admin_layout(venue_id):
        check_venue(venue_id)
        zones = query_all(
            """
            SELECT z.zone_id, z.zone_name, z.capacity,
                   COUNT(s.seat_id)               AS seat_count,
                   COUNT(DISTINCT s.seat_row)     AS row_count,
                   COALESCE(MAX(s.seat_number), 0) AS max_number,
                   MIN(s.seat_row)                AS first_row,
                   (SELECT COUNT(*) FROM has_price hp WHERE hp.zone_id = z.zone_id) AS priced_events
            FROM zone z LEFT JOIN seat s ON s.zone_id = z.zone_id
            WHERE z.venue_id = %s
            GROUP BY z.zone_id, z.zone_name, z.capacity
            ORDER BY z.zone_name
            """, (venue_id,))
        events = query_all(
            "SELECT event_id, event_name, start_time FROM event WHERE venue_id = %s ORDER BY start_time", (venue_id,))
        return jsonify(layout=load(venue_id), zones=zones, events=events)

    @app.put("/api/admin/venue-layout/<int:venue_id>")
    @admin_required
    def admin_layout_save(venue_id):
        check_venue(venue_id)
        d = request.get_json(silent=True)
        if not isinstance(d, dict):
            raise ApiError("Dữ liệu gửi lên không hợp lệ")
        layout = clean(d.get("layout"), venue_id)
        if not d.get("apply"):
            with lock:
                save(venue_id, layout)
            return jsonify(layout=layout, report=None)
        dry = bool(d.get("dry_run"))
        if not any(it["type"] == "zone" for it in layout["items"]):
            raise ApiError("Sơ đồ chưa có khu nào để tạo ghế")
        with lock:
            report, unplaced = sync(venue_id, layout, dry)
            if not dry:
                save(venue_id, layout)
        return jsonify(layout=layout, report=report, unplaced=unplaced, dry_run=dry)

    @app.delete("/api/admin/venue-layout/<int:venue_id>")
    @admin_required
    def admin_layout_delete(venue_id):
        with lock:
            for path in glob.glob(os.path.join(folder(venue_id), "*")):
                try:
                    os.remove(path)
                except OSError:
                    pass
        return jsonify(ok=True)

    @app.post("/api/admin/venue-layout/<int:venue_id>/background")
    @admin_required
    def admin_layout_background(venue_id):
        check_venue(venue_id)
        f = request.files.get("file")
        if not f:
            raise ApiError("Chưa chọn ảnh")
        data = f.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise ApiError("Ảnh sơ đồ quá lớn, tối đa 3 MB")
        ext = image_ext(data)
        if not ext:
            raise ApiError("Chỉ nhận ảnh JPG, PNG hoặc WebP")
        os.makedirs(folder(venue_id), exist_ok=True)
        with lock:
            for path in glob.glob(os.path.join(folder(venue_id), "background.*")):
                try:
                    os.remove(path)
                except OSError:
                    pass
            with open(os.path.join(folder(venue_id), f"background.{ext}"), "wb") as out:
                out.write(data)
        return jsonify(url=f"/uploads/venues/{venue_id}/background.{ext}?v={int(time.time())}"), 201