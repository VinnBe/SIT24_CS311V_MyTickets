"""admin_api.py - API cho trang quan tri (admin.html).

Gan vao backend.py, ngay duoi dong account.init(...):
    import admin_api
    admin_api.init(app, query_all, query_one, get_connection, admin_required, ApiError)

Bang dung (theo 01_create_table.sql):
    venue(venue_id, venue_name, address)
    zone(zone_id, zone_name, capacity, venue_id)        UNIQUE(venue_id, zone_name)
    seat(seat_id, seat_row, seat_number, zone_id)       UNIQUE(zone_id, seat_row, seat_number)
    event(event_id, event_name, sale_start, start_time, end_time, venue_id)
    has_price(event_id, zone_id, price)
    ticket(event_id, ticket_no, seat_id, ...)           FK seat_id ON DELETE RESTRICT
"""
from datetime import datetime

from flask import jsonify, request


def init(app, query_all, query_one, get_connection, admin_required, ApiError):

    # ------------------------------------------------------------------
    # Doc va kiem tra du lieu gui len
    # ------------------------------------------------------------------
    def data():
        d = request.get_json(silent=True)
        if not isinstance(d, dict):
            raise ApiError("Dữ liệu gửi lên không hợp lệ")
        return d

    def text(d, key, label, max_len):
        v = d.get(key)
        v = v.strip() if isinstance(v, str) else ""
        if not v:
            raise ApiError(f"Vui lòng nhập {label}")
        if len(v) > max_len:
            raise ApiError(f"{label.capitalize()} tối đa {max_len} ký tự")
        return v

    def integer(d, key, label, min_value=None, max_value=None):
        v = d.get(key)
        if isinstance(v, bool) or not isinstance(v, (int, str)):
            raise ApiError(f"{label.capitalize()} phải là số nguyên")
        try:
            v = int(v)
        except ValueError:
            raise ApiError(f"{label.capitalize()} phải là số nguyên")
        if min_value is not None and v < min_value:
            raise ApiError(f"{label.capitalize()} tối thiểu là {min_value}")
        if max_value is not None and v > max_value:
            raise ApiError(f"{label.capitalize()} tối đa là {max_value}")
        return v

    def moment(d, key, label):
        v = d.get(key)
        try:
            return datetime.strptime(str(v), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise ApiError(f"{label.capitalize()} không đúng định dạng")

    def run(sql, params=None):
        """Chay 1 cau INSERT/UPDATE/DELETE, tra ve (so dong anh huong, id moi)."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                n = cur.execute(sql, params)
                return n, cur.lastrowid
        finally:
            conn.close()

    def must_exist(sql, params, message):
        row = query_one(sql, params)
        if not row:
            raise ApiError(message, 404)
        return row

    # ==================================================================
    # 2. DIA DIEM (VENUE)
    # ==================================================================
    @app.get("/api/admin/venues")
    @admin_required
    def admin_venues():
        return jsonify(query_all(
            """
            SELECT v.venue_id, v.venue_name, v.address,
                   COUNT(z.zone_id)              AS zone_count,
                   COALESCE(SUM(z.capacity), 0)  AS capacity
            FROM venue v LEFT JOIN zone z ON z.venue_id = v.venue_id
            GROUP BY v.venue_id, v.venue_name, v.address
            ORDER BY v.venue_name
            """))

    @app.post("/api/admin/venues")
    @admin_required
    def admin_venue_create():
        d = data()
        _, new_id = run("INSERT INTO venue (venue_name, address) VALUES (%s, %s)",
                        (text(d, "venue_name", "tên địa điểm", 100),
                         text(d, "address", "địa chỉ", 255)))
        return jsonify(venue_id=new_id), 201

    @app.put("/api/admin/venues/<int:venue_id>")
    @admin_required
    def admin_venue_update(venue_id):
        d = data()
        must_exist("SELECT 1 FROM venue WHERE venue_id = %s", (venue_id,), "Không tìm thấy địa điểm")
        run("UPDATE venue SET venue_name = %s, address = %s WHERE venue_id = %s",
            (text(d, "venue_name", "tên địa điểm", 100), text(d, "address", "địa chỉ", 255), venue_id))
        return jsonify(ok=True)

    @app.delete("/api/admin/venues/<int:venue_id>")
    @admin_required
    def admin_venue_delete(venue_id):
        must_exist("SELECT 1 FROM venue WHERE venue_id = %s", (venue_id,), "Không tìm thấy địa điểm")
        # zone co ON DELETE CASCADE: xoa venue se xoa luon zone va ghe, nen chan truoc
        if query_one("SELECT 1 FROM event WHERE venue_id = %s LIMIT 1", (venue_id,)):
            raise ApiError("Địa điểm đã có sự kiện, không thể xoá")
        if query_one("SELECT 1 FROM zone WHERE venue_id = %s LIMIT 1", (venue_id,)):
            raise ApiError("Địa điểm vẫn còn khu vực. Hãy xoá các khu trước")
        run("DELETE FROM venue WHERE venue_id = %s", (venue_id,))
        return jsonify(ok=True)

    # ==================================================================
    # 3. KHU VUC (ZONE)
    # ==================================================================
    @app.get("/api/admin/zones")
    @admin_required
    def admin_zones():
        venue_id = request.args.get("venue_id", type=int)
        sql = """
            SELECT z.zone_id, z.zone_name, z.capacity, z.venue_id, v.venue_name,
                   (SELECT COUNT(*) FROM seat s WHERE s.zone_id = z.zone_id) AS seat_count
            FROM zone z JOIN venue v ON v.venue_id = z.venue_id
        """
        if venue_id:
            return jsonify(query_all(sql + " WHERE z.venue_id = %s ORDER BY z.zone_name", (venue_id,)))
        return jsonify(query_all(sql + " ORDER BY v.venue_name, z.zone_name"))

    def zone_input(d):
        venue_id = integer(d, "venue_id", "địa điểm", 1)
        must_exist("SELECT 1 FROM venue WHERE venue_id = %s", (venue_id,), "Không tìm thấy địa điểm")
        return (text(d, "zone_name", "tên khu", 50), integer(d, "capacity", "sức chứa", 1), venue_id)

    def zone_name_taken(venue_id, name, except_id=0):
        if query_one("SELECT 1 FROM zone WHERE venue_id = %s AND zone_name = %s AND zone_id <> %s",
                     (venue_id, name, except_id)):
            raise ApiError("Địa điểm này đã có khu cùng tên")

    @app.post("/api/admin/zones")
    @admin_required
    def admin_zone_create():
        name, capacity, venue_id = zone_input(data())
        zone_name_taken(venue_id, name)
        _, new_id = run("INSERT INTO zone (zone_name, capacity, venue_id) VALUES (%s, %s, %s)",
                        (name, capacity, venue_id))
        return jsonify(zone_id=new_id), 201

    @app.put("/api/admin/zones/<int:zone_id>")
    @admin_required
    def admin_zone_update(zone_id):
        name, capacity, venue_id = zone_input(data())
        old = must_exist("SELECT venue_id FROM zone WHERE zone_id = %s", (zone_id,), "Không tìm thấy khu vực")
        seats = query_one("SELECT COUNT(*) AS n FROM seat WHERE zone_id = %s", (zone_id,))["n"]
        if capacity < seats:
            raise ApiError(f"Khu đã có {seats} ghế, sức chứa không được nhỏ hơn")
        if venue_id != old["venue_id"] and (seats or query_one(
                "SELECT 1 FROM has_price WHERE zone_id = %s LIMIT 1", (zone_id,))):
            raise ApiError("Khu đã có ghế hoặc đã được đặt giá, không thể chuyển sang địa điểm khác")
        zone_name_taken(venue_id, name, zone_id)
        run("UPDATE zone SET zone_name = %s, capacity = %s, venue_id = %s WHERE zone_id = %s",
            (name, capacity, venue_id, zone_id))
        return jsonify(ok=True)

    @app.delete("/api/admin/zones/<int:zone_id>")
    @admin_required
    def admin_zone_delete(zone_id):
        must_exist("SELECT 1 FROM zone WHERE zone_id = %s", (zone_id,), "Không tìm thấy khu vực")
        if query_one("SELECT 1 FROM has_price WHERE zone_id = %s LIMIT 1", (zone_id,)):
            raise ApiError("Khu đã được đặt giá trong sự kiện, không thể xoá")
        # seat co ON DELETE CASCADE: chan de khong mat so do ghe ngoai y muon
        if query_one("SELECT 1 FROM seat WHERE zone_id = %s LIMIT 1", (zone_id,)):
            raise ApiError("Khu vẫn còn ghế. Hãy xoá các ghế trước")
        run("DELETE FROM zone WHERE zone_id = %s", (zone_id,))
        return jsonify(ok=True)

    # ==================================================================
    # 4. GHE (SEAT)
    # ==================================================================
    def zone_or_404(zone_id):
        return must_exist("SELECT zone_id, capacity FROM zone WHERE zone_id = %s", (zone_id,), "Không tìm thấy khu vực")

    def seat_count(zone_id):
        return query_one("SELECT COUNT(*) AS n FROM seat WHERE zone_id = %s", (zone_id,))["n"]

    def seat_input(d):
        row = text(d, "seat_row", "hàng", 5).upper()
        return row, integer(d, "seat_number", "số ghế", 1)

    @app.get("/api/admin/zones/<int:zone_id>/seats")
    @admin_required
    def admin_seats(zone_id):
        zone_or_404(zone_id)
        return jsonify(query_all(
            """
            SELECT s.seat_id, s.seat_row, s.seat_number,
                   EXISTS (SELECT 1 FROM ticket t WHERE t.seat_id = s.seat_id) AS used
            FROM seat s WHERE s.zone_id = %s
            ORDER BY CHAR_LENGTH(s.seat_row), s.seat_row, s.seat_number
            """, (zone_id,)))

    @app.post("/api/admin/zones/<int:zone_id>/seats")
    @admin_required
    def admin_seat_create(zone_id):
        zone = zone_or_404(zone_id)
        row, number = seat_input(data())
        if seat_count(zone_id) >= zone["capacity"]:
            raise ApiError("Khu đã đủ sức chứa. Tăng sức chứa ở mục Khu vực trước")
        if query_one("SELECT 1 FROM seat WHERE zone_id = %s AND seat_row = %s AND seat_number = %s",
                     (zone_id, row, number)):
            raise ApiError(f"Ghế {row}{number} đã tồn tại")
        _, new_id = run("INSERT INTO seat (seat_row, seat_number, zone_id) VALUES (%s, %s, %s)",
                        (row, number, zone_id))
        return jsonify(seat_id=new_id), 201

    @app.post("/api/admin/zones/<int:zone_id>/seats/bulk")
    @admin_required
    def admin_seat_bulk(zone_id):
        zone = zone_or_404(zone_id)
        d = data()
        start = text(d, "start_row", "hàng bắt đầu", 1).upper()
        if not ("A" <= start <= "Z"):
            raise ApiError("Hàng bắt đầu phải là 1 chữ cái từ A đến Z")
        rows = integer(d, "rows", "số hàng", 1, 26)
        per_row = integer(d, "per_row", "số ghế mỗi hàng", 1, 200)
        if ord(start) + rows - 1 > ord("Z"):
            raise ApiError("Hàng cuối vượt quá Z")

        wanted = [(chr(ord(start) + r), n) for r in range(rows) for n in range(1, per_row + 1)]
        existing = {(x["seat_row"], x["seat_number"]) for x in query_all(
            "SELECT seat_row, seat_number FROM seat WHERE zone_id = %s", (zone_id,))}
        new = [p for p in wanted if p not in existing]
        room = zone["capacity"] - len(existing)
        if len(new) > room:
            raise ApiError(f"Vượt sức chứa: khu chỉ tạo thêm được {room} ghế")
        if new:
            conn = get_connection()
            try:
                with conn.cursor() as cur:
                    cur.executemany("INSERT INTO seat (seat_row, seat_number, zone_id) VALUES (%s, %s, %s)",
                                    [(r, n, zone_id) for r, n in new])
            finally:
                conn.close()
        return jsonify(created=len(new), skipped=len(wanted) - len(new)), 201

    def seat_or_404(seat_id):
        return must_exist(
            "SELECT s.seat_id, s.zone_id, EXISTS (SELECT 1 FROM ticket t WHERE t.seat_id = s.seat_id) AS used "
            "FROM seat s WHERE s.seat_id = %s", (seat_id,), "Không tìm thấy ghế")

    @app.put("/api/admin/seats/<int:seat_id>")
    @admin_required
    def admin_seat_update(seat_id):
        seat = seat_or_404(seat_id)
        if seat["used"]:
            raise ApiError("Ghế đã có vé, không thể đổi vị trí")
        row, number = seat_input(data())
        if query_one("SELECT 1 FROM seat WHERE zone_id = %s AND seat_row = %s AND seat_number = %s AND seat_id <> %s",
                     (seat["zone_id"], row, number, seat_id)):
            raise ApiError(f"Ghế {row}{number} đã tồn tại")
        run("UPDATE seat SET seat_row = %s, seat_number = %s WHERE seat_id = %s", (row, number, seat_id))
        return jsonify(ok=True)

    @app.delete("/api/admin/seats/<int:seat_id>")
    @admin_required
    def admin_seat_delete(seat_id):
        if seat_or_404(seat_id)["used"]:
            raise ApiError("Ghế đã có vé, không thể xoá")
        run("DELETE FROM seat WHERE seat_id = %s", (seat_id,))
        return jsonify(ok=True)

    # ==================================================================
    # 5. SU KIEN (EVENT)
    # ==================================================================
    @app.get("/api/admin/events")
    @admin_required
    def admin_events():
        return jsonify(query_all(
            """
            SELECT e.event_id, e.event_name, e.venue_id, e.sale_start, e.start_time, e.end_time,
                   (SELECT COUNT(*) FROM has_price hp WHERE hp.event_id = e.event_id) AS priced_zones
            FROM event e ORDER BY e.start_time
            """))

    def event_input(d):
        name = text(d, "event_name", "tên sự kiện", 150)
        venue_id = integer(d, "venue_id", "địa điểm", 1)
        must_exist("SELECT 1 FROM venue WHERE venue_id = %s", (venue_id,), "Không tìm thấy địa điểm")
        sale = moment(d, "sale_start", "thời điểm mở bán")
        start = moment(d, "start_time", "thời gian bắt đầu")
        end = moment(d, "end_time", "thời gian kết thúc")
        if not start < end:
            raise ApiError("Thời gian kết thúc phải sau thời gian bắt đầu")
        if not sale < start:
            raise ApiError("Thời điểm mở bán phải trước thời gian bắt đầu")
        return name, sale, start, end, venue_id

    @app.post("/api/admin/events")
    @admin_required
    def admin_event_create():
        _, new_id = run(
            "INSERT INTO event (event_name, sale_start, start_time, end_time, venue_id) VALUES (%s, %s, %s, %s, %s)",
            event_input(data()))
        return jsonify(event_id=new_id), 201

    @app.put("/api/admin/events/<int:event_id>")
    @admin_required
    def admin_event_update(event_id):
        old = must_exist("SELECT venue_id FROM event WHERE event_id = %s", (event_id,), "Không tìm thấy sự kiện")
        name, sale, start, end, venue_id = event_input(data())
        # Gia va ve gan voi khu cua dia diem cu, nen khong cho doi dia diem khi da dat gia
        if venue_id != old["venue_id"] and query_one(
                "SELECT 1 FROM has_price WHERE event_id = %s LIMIT 1", (event_id,)):
            raise ApiError("Sự kiện đã được đặt giá theo khu, không thể đổi địa điểm")
        run("UPDATE event SET event_name = %s, sale_start = %s, start_time = %s, end_time = %s, venue_id = %s "
            "WHERE event_id = %s", (name, sale, start, end, venue_id, event_id))
        return jsonify(ok=True)

    # ==================================================================
    # 6. GIA VE THEO KHU (HAS_PRICE) + SINH VE (TICKET)
    #    Dat gia cho 1 khu = ghi has_price + tao 1 ve AVAILABLE cho moi ghe cua khu.
    #    sp_place_order lay ve AVAILABLE nay ra ban.
    # ==================================================================
    def event_or_404(event_id):
        return must_exist(
            "SELECT e.event_id, e.event_name, e.venue_id, v.venue_name, e.start_time, "
            "       (NOW() >= e.start_time) AS started "
            "FROM event e JOIN venue v ON v.venue_id = e.venue_id WHERE e.event_id = %s",
            (event_id,), "Không tìm thấy sự kiện")

    @app.get("/api/admin/pricing")
    @admin_required
    def admin_pricing():
        event_id = request.args.get("event_id", type=int)
        if not event_id:
            raise ApiError("Thiếu mã sự kiện")
        ev = event_or_404(event_id)
        zones = query_all(
            """
            SELECT z.zone_id, z.zone_name, z.capacity,
                   (SELECT COUNT(*) FROM seat s WHERE s.zone_id = z.zone_id) AS seat_count,
                   hp.price,
                   COUNT(t.ticket_no)                       AS total,
                   COALESCE(SUM(t.ticket_status = 'AVAILABLE'), 0) AS available,
                   COALESCE(SUM(t.ticket_status = 'RESERVED'), 0)  AS reserved,
                   COALESCE(SUM(t.ticket_status = 'SOLD'), 0)      AS sold
            FROM zone z
            LEFT JOIN has_price hp ON hp.zone_id = z.zone_id AND hp.event_id = %s
            LEFT JOIN seat s2 ON s2.zone_id = z.zone_id
            LEFT JOIN ticket t ON t.seat_id = s2.seat_id AND t.event_id = %s
            WHERE z.venue_id = %s
            GROUP BY z.zone_id, z.zone_name, z.capacity, hp.price
            ORDER BY hp.price IS NULL, hp.price DESC, z.zone_name
            """, (event_id, event_id, ev["venue_id"]))
        return jsonify(event=ev, zones=zones)

    def zone_of_event(ev, zone_id):
        return must_exist("SELECT zone_id FROM zone WHERE zone_id = %s AND venue_id = %s",
                          (zone_id, ev["venue_id"]), "Khu này không thuộc địa điểm của sự kiện")

    @app.put("/api/admin/pricing/<int:event_id>/<int:zone_id>")
    @admin_required
    def admin_pricing_set(event_id, zone_id):
        ev = event_or_404(event_id)
        zone_of_event(ev, zone_id)
        if ev["started"]:
            raise ApiError("Sự kiện đã bắt đầu, không thể đổi giá")
        price = integer(data(), "price", "giá vé", 0, 1_000_000_000)
        seats = query_all(
            "SELECT seat_id FROM seat WHERE zone_id = %s ORDER BY CHAR_LENGTH(seat_row), seat_row, seat_number",
            (zone_id,))
        if not seats:
            raise ApiError("Khu chưa có ghế. Hãy tạo ghế ở mục Ghế trước khi đặt giá")

        conn = get_connection()
        try:
            conn.begin()
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO has_price (event_id, zone_id, price) VALUES (%s, %s, %s) "
                    "ON DUPLICATE KEY UPDATE price = VALUES(price)", (event_id, zone_id, price))
                # Ve chua ban lay gia moi; ve da giu/da ban giu nguyen gia luc mua
                cur.execute(
                    "UPDATE ticket t JOIN seat s ON s.seat_id = t.seat_id "
                    "SET t.ticket_price = %s "
                    "WHERE t.event_id = %s AND s.zone_id = %s AND t.ticket_status = 'AVAILABLE'",
                    (price, event_id, zone_id))
                # Sinh ve cho ghe chua co ve (ke ca ghe moi them sau nay)
                cur.execute("SELECT seat_id FROM ticket WHERE event_id = %s", (event_id,))
                has_ticket = {r["seat_id"] for r in cur.fetchall()}
                cur.execute("SELECT COALESCE(MAX(ticket_no), 0) AS m FROM ticket WHERE event_id = %s FOR UPDATE",
                            (event_id,))
                next_no = cur.fetchone()["m"] + 1
                new = [s["seat_id"] for s in seats if s["seat_id"] not in has_ticket]
                if new:
                    cur.executemany(
                        "INSERT INTO ticket (event_id, ticket_no, seat_id, ticket_status, ticket_price) "
                        "VALUES (%s, %s, %s, 'AVAILABLE', %s)",
                        [(event_id, next_no + i, sid, price) for i, sid in enumerate(new)])
            conn.commit()
            return jsonify(ok=True, created_tickets=len(new))
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @app.delete("/api/admin/pricing/<int:event_id>/<int:zone_id>")
    @admin_required
    def admin_pricing_delete(event_id, zone_id):
        ev = event_or_404(event_id)
        zone_of_event(ev, zone_id)
        busy = query_one(
            "SELECT COUNT(*) AS n FROM ticket t JOIN seat s ON s.seat_id = t.seat_id "
            "WHERE t.event_id = %s AND s.zone_id = %s AND t.ticket_status <> 'AVAILABLE'",
            (event_id, zone_id))["n"]
        if busy:
            raise ApiError(f"Khu đã có {busy} vé được giữ hoặc đã bán, không thể ngừng bán")
        conn = get_connection()
        try:
            conn.begin()
            with conn.cursor() as cur:
                cur.execute("DELETE t FROM ticket t JOIN seat s ON s.seat_id = t.seat_id "
                            "WHERE t.event_id = %s AND s.zone_id = %s", (event_id, zone_id))
                cur.execute("DELETE FROM has_price WHERE event_id = %s AND zone_id = %s", (event_id, zone_id))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        return jsonify(ok=True)

    # ==================================================================
    # 7. VE (TICKET)
    # ==================================================================
    @app.get("/api/admin/tickets")
    @admin_required
    def admin_tickets():
        event_id = request.args.get("event_id", type=int)
        if not event_id:
            raise ApiError("Thiếu mã sự kiện")
        event_or_404(event_id)
        sql = """
            SELECT t.ticket_no, z.zone_id, z.zone_name, s.seat_row, s.seat_number,
                   t.ticket_price, t.ticket_status, t.qrcode, t.checkin_at,
                   t.order_id, c.full_name, c.email
            FROM ticket t
            JOIN seat s ON s.seat_id = t.seat_id
            JOIN zone z ON z.zone_id = s.zone_id
            LEFT JOIN orders o   ON o.order_id = t.order_id
            LEFT JOIN customer c ON c.customer_id = o.customer_id
            WHERE t.event_id = %s
        """
        params = [event_id]
        zone_id = request.args.get("zone_id", type=int)
        if zone_id:
            sql += " AND z.zone_id = %s"
            params.append(zone_id)
        sql += " ORDER BY z.zone_name, CHAR_LENGTH(s.seat_row), s.seat_row, s.seat_number"
        return jsonify(query_all(sql, params))

    # ==================================================================
    # 8. DON HANG (ORDERS) - chi xem
    #    v_order_total(order_id, order_status, ticket_quantity, ticket_amount,
    #                  event_id, zone_id, customer_id) da co san trong database
    # ==================================================================
    ORDER_SELECT = """
        SELECT ot.order_id, ot.order_status, ot.ticket_quantity, ot.ticket_amount,
               o.create_at, o.method, o.pay_at,
               e.event_id, e.event_name, z.zone_name,
               c.customer_id, c.full_name, c.email, c.phone,
               CASE WHEN ot.order_status = 'PENDING' THEN
                 GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(),
                   LEAST(o.create_at + INTERVAL 15 MINUTE, e.start_time)))
               END AS seconds_left
        FROM v_order_total ot
        JOIN orders o     ON o.order_id = ot.order_id
        JOIN customer c   ON c.customer_id = ot.customer_id
        LEFT JOIN event e ON e.event_id = ot.event_id
        LEFT JOIN zone z  ON z.zone_id = ot.zone_id
    """

    @app.get("/api/admin/orders")
    @admin_required
    def admin_orders():
        customer_id = request.args.get("customer_id", type=int)
        if customer_id:
            return jsonify(query_all(ORDER_SELECT + " WHERE ot.customer_id = %s ORDER BY ot.order_id DESC",
                                     (customer_id,)))
        return jsonify(query_all(ORDER_SELECT + " ORDER BY ot.order_id DESC LIMIT 2000"))

    @app.get("/api/admin/orders/<int:order_id>")
    @admin_required
    def admin_order_detail(order_id):
        order = query_one(ORDER_SELECT + " WHERE ot.order_id = %s", (order_id,))
        if not order:
            raise ApiError("Không tìm thấy đơn hàng", 404)
        order["tickets"] = query_all(
            """
            SELECT t.ticket_no, s.seat_row, s.seat_number, t.ticket_price, t.ticket_status,
                   CASE WHEN t.ticket_status = 'SOLD' THEN t.qrcode END AS qrcode,
                   t.checkin_at
            FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
            WHERE t.order_id = %s ORDER BY t.ticket_no
            """, (order_id,))
        return jsonify(order)

    # ==================================================================
    # 9. KHACH HANG (CUSTOMER) - chi xem
    # ==================================================================
    @app.get("/api/admin/customers")
    @admin_required
    def admin_customers():
        return jsonify(query_all(
            """
            SELECT c.customer_id, c.full_name, c.email, c.phone, u.username,
                   COUNT(o.order_id)                                        AS order_count,
                   COALESCE(SUM(o.order_status = 'PAID'), 0)                AS paid_count,
                   COALESCE(SUM(CASE WHEN o.order_status = 'PAID' THEN o.ticket_amount END), 0) AS spent,
                   COALESCE(SUM(CASE WHEN o.order_status = 'PAID' THEN o.ticket_quantity END), 0) AS tickets,
                   MAX(o.create_at)                                         AS last_order
            FROM customer c
            JOIN users u       ON u.user_id = c.user_id
            LEFT JOIN orders o ON o.customer_id = c.customer_id
            GROUP BY c.customer_id, c.full_name, c.email, c.phone, u.username
            ORDER BY c.customer_id DESC
            """))