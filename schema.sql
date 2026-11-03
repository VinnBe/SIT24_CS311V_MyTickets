-- MyTickets schema (SQLite) — resolves các mâu thuẫn tìm thấy trong report V2:
-- - capacity thuộc ZONE (không phải VENUE)
-- - EVENT có end_time
-- - không có bảng ADMIN (admin cấu hình ở app layer, xem app.py ADMIN_USERNAMES)
-- - ORDER chỉ có 1 FK customer_id (bỏ pay_customer_id thừa)
-- - TICKET dùng ticket_id (PK kỹ thuật) + UNIQUE(event_id, ticket_no) vì ticket_no đánh số trong event
-- - QRcode không lưu cột riêng, suy ra từ ticket_id ở tầng app

PRAGMA foreign_keys = ON;

CREATE TABLE VENUE (
    venue_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_name  TEXT NOT NULL,
    address     TEXT NOT NULL
);

CREATE TABLE ZONE (
    zone_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id    INTEGER NOT NULL REFERENCES VENUE(venue_id) ON DELETE CASCADE,
    zone_name   TEXT NOT NULL,
    capacity    INTEGER NOT NULL CHECK (capacity > 0)
);

CREATE TABLE SEAT (
    seat_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id     INTEGER NOT NULL REFERENCES ZONE(zone_id) ON DELETE CASCADE,
    seat_row    TEXT NOT NULL,
    seat_number INTEGER NOT NULL,
    UNIQUE (zone_id, seat_row, seat_number)
);

CREATE TABLE EVENT (
    event_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id    INTEGER NOT NULL REFERENCES VENUE(venue_id) ON DELETE RESTRICT,
    event_name  TEXT NOT NULL,
    sale_start  TEXT NOT NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    CHECK (sale_start < start_time AND start_time < end_time)
);

CREATE TABLE HAS_PRICE (
    event_id    INTEGER NOT NULL REFERENCES EVENT(event_id) ON DELETE RESTRICT,
    zone_id     INTEGER NOT NULL REFERENCES ZONE(zone_id) ON DELETE RESTRICT,
    price       REAL NOT NULL CHECK (price >= 0),
    available   INTEGER NOT NULL CHECK (available >= 0),
    PRIMARY KEY (event_id, zone_id)
);

CREATE TABLE USER (
    user_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL
);

CREATE TABLE CUSTOMER (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES USER(user_id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT
);

CREATE TABLE "ORDER" (
    order_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id     INTEGER NOT NULL REFERENCES CUSTOMER(customer_id) ON DELETE RESTRICT,
    event_id        INTEGER NOT NULL REFERENCES EVENT(event_id) ON DELETE RESTRICT,
    zone_id         INTEGER NOT NULL REFERENCES ZONE(zone_id) ON DELETE RESTRICT,
    order_status    TEXT NOT NULL CHECK (order_status IN ('PENDING','PAID','FAILED')),
    ticket_quantity INTEGER NOT NULL CHECK (ticket_quantity BETWEEN 1 AND 2),
    ticket_amount   REAL NOT NULL CHECK (ticket_amount >= 0),
    create_at       TEXT NOT NULL,
    method          TEXT,
    pay_at          TEXT,
    CHECK ( (order_status = 'PAID' AND method IS NOT NULL AND pay_at IS NOT NULL)
         OR (order_status != 'PAID' AND method IS NULL AND pay_at IS NULL) ),
    CHECK ( pay_at IS NULL OR pay_at >= create_at )
);

-- TICKET: sinh sẵn khi event được tạo + đặt giá (xem routes/events.py).
-- order_id NULL <=> ticket_status='AVAILABLE' (ép bằng CHECK).
-- ticket_no đánh số trong phạm vi 1 event -> UNIQUE(event_id, ticket_no), PK kỹ thuật là ticket_id.
CREATE TABLE TICKET (
    ticket_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id      INTEGER NOT NULL REFERENCES EVENT(event_id) ON DELETE RESTRICT,
    seat_id       INTEGER NOT NULL REFERENCES SEAT(seat_id) ON DELETE RESTRICT,
    order_id      INTEGER REFERENCES "ORDER"(order_id) ON DELETE CASCADE,
    ticket_no     INTEGER NOT NULL,
    ticket_status TEXT NOT NULL CHECK (ticket_status IN ('AVAILABLE','RESERVED','SOLD')),
    ticket_price  REAL NOT NULL CHECK (ticket_price >= 0),
    checkin_at    TEXT,
    UNIQUE (event_id, ticket_no),
    UNIQUE (event_id, seat_id),
    CHECK ( (ticket_status = 'AVAILABLE' AND order_id IS NULL)
         OR (ticket_status != 'AVAILABLE' AND order_id IS NOT NULL) )
);

CREATE INDEX idx_ticket_event_status ON TICKET(event_id, ticket_status);
CREATE INDEX idx_order_customer_event ON "ORDER"(customer_id, event_id, order_status);
