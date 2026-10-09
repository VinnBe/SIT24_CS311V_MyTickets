-- MyTickets | 01_schema.sql
CREATE DATABASE IF NOT EXISTS myTickets CHARACTER SET utf8mb4;
USE myTickets;

CREATE TABLE venue (
  venue_id    INT AUTO_INCREMENT PRIMARY KEY,
  venue_name  VARCHAR(100) NOT NULL,
  address     VARCHAR(255) NOT NULL
);

CREATE TABLE zone (
  zone_id     INT AUTO_INCREMENT PRIMARY KEY,
  zone_name   VARCHAR(50) NOT NULL,
  venue_id    INT NOT NULL,
  UNIQUE (venue_id, zone_name),
  FOREIGN KEY (venue_id) REFERENCES venue(venue_id) ON DELETE CASCADE
);

CREATE TABLE seat (
  seat_id      INT AUTO_INCREMENT PRIMARY KEY,
  zone_id      INT NOT NULL,
  seat_row     VARCHAR(5) NOT NULL,
  seat_number  INT NOT NULL,
  UNIQUE (zone_id, seat_row, seat_number),
  FOREIGN KEY (zone_id) REFERENCES zone(zone_id) ON DELETE CASCADE
);

CREATE TABLE events (
  event_id    INT AUTO_INCREMENT PRIMARY KEY,
  event_name  VARCHAR(150) NOT NULL,
  sale_start  DATETIME NOT NULL,
  start_time  DATETIME NOT NULL,
  venue_id    INT NOT NULL,
  CONSTRAINT chk_event_time CHECK (sale_start < start_time),
  FOREIGN KEY (venue_id) REFERENCES venue(venue_id) ON DELETE RESTRICT
);

CREATE TABLE set_price (
  event_id   INT NOT NULL,
  zone_id    INT NOT NULL,
  price      DECIMAL(12,0) NOT NULL,
  available  INT NOT NULL,
  PRIMARY KEY (event_id, zone_id),
  CONSTRAINT chk_set_price CHECK (price >= 0 AND available >= 0),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id)  REFERENCES zone(zone_id)    ON DELETE RESTRICT
);

CREATE TABLE users (
  username  VARCHAR(50) PRIMARY KEY,
  password  VARCHAR(255) NOT NULL
);

CREATE TABLE admin (
  username  VARCHAR(50) PRIMARY KEY,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE customer (
  customer_id  INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50) NOT NULL UNIQUE,
  full_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(100) NOT NULL UNIQUE,
  phone        VARCHAR(20) NOT NULL,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE orders (
  order_id         INT AUTO_INCREMENT PRIMARY KEY,
  customer_id      INT NOT NULL,
  event_id         INT NOT NULL,
  zone_id          INT NOT NULL,
  status           ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  ticket_quantity  INT NOT NULL,
  place_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  method           VARCHAR(30) NULL,
  pay_at           DATETIME NULL,
  CONSTRAINT chk_qty CHECK (ticket_quantity BETWEEN 1 AND 2),
  CONSTRAINT chk_pay CHECK (
    (status = 'PAID' AND method IS NOT NULL AND pay_at IS NOT NULL) OR
    (status <> 'PAID' AND method IS NULL AND pay_at IS NULL)),
  FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE RESTRICT,
  FOREIGN KEY (event_id, zone_id) REFERENCES set_price(event_id, zone_id)
    ON DELETE RESTRICT
);

CREATE TABLE hold (
  order_id  INT NOT NULL,
  seat_id   INT NOT NULL,
  PRIMARY KEY (order_id, seat_id),
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id)  REFERENCES seat(seat_id)    ON DELETE RESTRICT
);

CREATE TABLE ticket (
  order_id       INT NOT NULL,
  ticket_no      INT NOT NULL,
  seat_id        INT NOT NULL,
  checkin_at  DATETIME NULL,
  PRIMARY KEY (order_id, ticket_no),
  CONSTRAINT chk_ticket_no CHECK (ticket_no BETWEEN 1 AND 2),
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id)  REFERENCES seat(seat_id)    ON DELETE RESTRICT
);
