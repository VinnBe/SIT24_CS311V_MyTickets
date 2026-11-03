CREATE TABLE venue (
    venue_id    INT AUTO_INCREMENT PRIMARY KEY,
    venue_name  VARCHAR(100) NOT NULL,
    address     VARCHAR(255) NOT NULL
);

CREATE TABLE zone (
    zone_id     INT AUTO_INCREMENT PRIMARY KEY,
    zone_name   VARCHAR(50) NOT NULL,
    capacity    INT NOT NULL,
    venue_id    INT NOT NULL,
    CONSTRAINT uq_zone_name  UNIQUE (venue_id, zone_name),
    CONSTRAINT ck_zone_cap   CHECK (capacity > 0),
    CONSTRAINT fk_zone_venue FOREIGN KEY (venue_id)
        REFERENCES venue (venue_id) ON DELETE CASCADE
);

CREATE TABLE seat (
    seat_id      INT AUTO_INCREMENT PRIMARY KEY,
    seat_row     VARCHAR(5) NOT NULL,
    seat_number  INT NOT NULL,
    zone_id      INT NOT NULL,
    CONSTRAINT uq_seat_pos  UNIQUE (zone_id, seat_row, seat_number),
    CONSTRAINT fk_seat_zone FOREIGN KEY (zone_id)
        REFERENCES zone (zone_id) ON DELETE CASCADE
);

CREATE TABLE event (
    event_id    INT AUTO_INCREMENT PRIMARY KEY,
    event_name  VARCHAR(150) NOT NULL,
    sale_start  DATETIME NOT NULL,
    start_time  DATETIME NOT NULL,
    end_time    DATETIME NOT NULL,
    venue_id    INT NOT NULL,
    CONSTRAINT ck_event_time CHECK (sale_start < start_time AND start_time < end_time),
    CONSTRAINT fk_event_venue FOREIGN KEY (venue_id)
        REFERENCES venue (venue_id) ON DELETE RESTRICT
);

CREATE TABLE has_price (
    event_id  INT NOT NULL,
    zone_id   INT NOT NULL,
    price     DECIMAL(12,0) NOT NULL,
    PRIMARY KEY (event_id, zone_id),
    CONSTRAINT ck_price CHECK (price >= 0),
    CONSTRAINT fk_hp_event FOREIGN KEY (event_id)
        REFERENCES event (event_id) ON DELETE CASCADE,
    CONSTRAINT fk_hp_zone FOREIGN KEY (zone_id)
        REFERENCES zone (zone_id) ON DELETE RESTRICT
);

CREATE TABLE users (
    user_id   INT AUTO_INCREMENT PRIMARY KEY,
    username  VARCHAR(50)  NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL
);

CREATE TABLE customer (
    customer_id  INT AUTO_INCREMENT PRIMARY KEY,
    full_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    phone        VARCHAR(20)  NOT NULL,
    user_id      INT NOT NULL UNIQUE,
    CONSTRAINT fk_customer_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE orders (
    order_id         INT AUTO_INCREMENT PRIMARY KEY,
    order_status     ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
    ticket_quantity  TINYINT NOT NULL,
    ticket_amount    DECIMAL(12,0) NOT NULL DEFAULT 0,
    create_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    method           VARCHAR(30) NULL,
    pay_at           DATETIME NULL,
    customer_id      INT NOT NULL,
    CONSTRAINT ck_order_qty    CHECK (ticket_quantity BETWEEN 1 AND 2),
    CONSTRAINT ck_order_amount CHECK (ticket_amount >= 0),
    CONSTRAINT ck_order_paid CHECK (
        (order_status = 'PAID'  AND method IS NOT NULL AND pay_at IS NOT NULL)
        OR
        (order_status <> 'PAID' AND method IS NULL     AND pay_at IS NULL)
    ),
    CONSTRAINT ck_order_paytime CHECK (pay_at IS NULL OR pay_at >= create_at),
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id)
        REFERENCES customer (customer_id) ON DELETE RESTRICT
);

CREATE TABLE ticket (
    event_id       INT NOT NULL,
    ticket_no      INT NOT NULL,
    seat_id        INT NOT NULL,
    order_id       INT NULL,
    ticket_status  ENUM('AVAILABLE','RESERVED','SOLD') NOT NULL DEFAULT 'AVAILABLE',
    ticket_price   DECIMAL(12,0) NOT NULL,
    qrcode         CHAR(36) NOT NULL DEFAULT (UUID()),
    checkin_at     DATETIME NULL,
    PRIMARY KEY (event_id, ticket_no),
    CONSTRAINT uq_ticket_seat UNIQUE (event_id, seat_id),
    CONSTRAINT uq_ticket_qr   UNIQUE (qrcode),
    CONSTRAINT ck_ticket_price CHECK (ticket_price >= 0),
    CONSTRAINT ck_ticket_order CHECK (
        (ticket_status = 'AVAILABLE'  AND order_id IS NULL)
        OR
        (ticket_status <> 'AVAILABLE' AND order_id IS NOT NULL)
    ),
    CONSTRAINT ck_ticket_checkin CHECK (checkin_at IS NULL OR ticket_status = 'SOLD'),
    CONSTRAINT fk_ticket_event FOREIGN KEY (event_id)
        REFERENCES event (event_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ticket_seat FOREIGN KEY (seat_id)
        REFERENCES seat (seat_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ticket_order FOREIGN KEY (order_id)
        REFERENCES orders (order_id) ON DELETE RESTRICT
);