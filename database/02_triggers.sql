-- MyTickets | 02_triggers.sql
USE myTickets;

DELIMITER $$

-- 1. Khi tao order: kiem tra thoi diem ban va han muc 2 ve
CREATE TRIGGER trg_orders_bi BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  DECLARE v_sale  DATETIME;
  DECLARE v_start DATETIME;
  DECLARE v_used  INT;

  SELECT sale_start, start_time INTO v_sale, v_start
  FROM events WHERE event_id = NEW.event_id;

  IF NOW() < v_sale OR NOW() >= v_start THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ngoai thoi gian mo ban cua su kien';
  END IF;

  SELECT COALESCE(SUM(ticket_quantity), 0) INTO v_used
  FROM orders
  WHERE customer_id = NEW.customer_id AND event_id = NEW.event_id
    AND status IN ('PENDING', 'PAID');

  IF v_used + NEW.ticket_quantity > 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Vuot gioi han 2 ve moi tai khoan moi su kien';
  END IF;

  SET NEW.status   = 'PENDING';
  SET NEW.place_at = NOW();
  SET NEW.method   = NULL;
  SET NEW.pay_at   = NULL;
END$$

-- 2. Khi sua order: trang thai 1 chieu, han thanh toan, khoa cac cot chinh
CREATE TRIGGER trg_orders_bu BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  DECLARE v_start DATETIME;

  IF NEW.customer_id <> OLD.customer_id OR NEW.event_id <> OLD.event_id
     OR NEW.zone_id <> OLD.zone_id
     OR NEW.ticket_quantity <> OLD.ticket_quantity
     OR NEW.place_at <> OLD.place_at THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khong duoc sua thong tin goc cua order';
  END IF;

  IF OLD.status <> 'PENDING' AND (NEW.status <> OLD.status
     OR NOT (NEW.method <=> OLD.method)
     OR NOT (NEW.pay_at <=> OLD.pay_at)) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order PAID/FAILED la trang thai cuoi';
  END IF;

  IF OLD.status = 'PENDING' AND NEW.status = 'PAID' THEN
    SELECT start_time INTO v_start FROM events WHERE event_id = OLD.event_id;
    IF NOW() >= v_start OR NOW() > OLD.place_at + INTERVAL 15 MINUTE THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order da qua han thanh toan';
    END IF;
  END IF;
END$$

-- 3. Khi order PENDING -> FAILED: nha ghe va tra lai available
CREATE TRIGGER trg_orders_au AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status = 'PENDING' AND NEW.status = 'FAILED' THEN
    DELETE FROM hold WHERE order_id = NEW.order_id;
    UPDATE set_price
    SET available = available + NEW.ticket_quantity
    WHERE event_id = NEW.event_id AND zone_id = NEW.zone_id;
  END IF;
END$$

-- 4. Khi giu ghe: order phai PENDING, ghe dung zone, ghe chua bi giu/ban
CREATE TRIGGER trg_hold_bi BEFORE INSERT ON hold
FOR EACH ROW
BEGIN
  DECLARE v_status     VARCHAR(10);
  DECLARE v_event      INT;
  DECLARE v_zone_order INT;
  DECLARE v_zone_seat  INT;
  DECLARE v_taken      INT;

  SELECT status, event_id, zone_id INTO v_status, v_event, v_zone_order
  FROM orders WHERE order_id = NEW.order_id;
  SELECT zone_id INTO v_zone_seat FROM seat WHERE seat_id = NEW.seat_id;

  IF v_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Chi giu ghe cho order PENDING';
  END IF;
  IF v_zone_seat <> v_zone_order THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ghe khong thuoc zone cua order';
  END IF;

  SELECT COUNT(*) INTO v_taken FROM (
    SELECT h.seat_id FROM hold h JOIN orders o ON o.order_id = h.order_id
    WHERE o.event_id = v_event
    UNION ALL
    SELECT t.seat_id FROM ticket t JOIN orders o ON o.order_id = t.order_id
    WHERE o.event_id = v_event
  ) x WHERE x.seat_id = NEW.seat_id;

  IF v_taken > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ghe da duoc giu hoac ban trong su kien nay';
  END IF;
END$$

-- 5. Khi tao ve: order phai PAID, ghe dung zone, khong trung ghe trong event
CREATE TRIGGER trg_ticket_bi BEFORE INSERT ON ticket
FOR EACH ROW
BEGIN
  DECLARE v_status     VARCHAR(10);
  DECLARE v_event      INT;
  DECLARE v_zone_order INT;
  DECLARE v_qty        INT;
  DECLARE v_zone_seat  INT;
  DECLARE v_taken      INT;

  SELECT status, event_id, zone_id, ticket_quantity
  INTO v_status, v_event, v_zone_order, v_qty
  FROM orders WHERE order_id = NEW.order_id;
  SELECT zone_id INTO v_zone_seat FROM seat WHERE seat_id = NEW.seat_id;

  IF v_status <> 'PAID' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Chi tao ve cho order da PAID';
  END IF;
  IF NEW.ticket_no > v_qty THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'So ve vuot qua so luong cua order';
  END IF;
  IF v_zone_seat <> v_zone_order THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ghe khong thuoc zone cua order';
  END IF;

  SELECT COUNT(*) INTO v_taken
  FROM ticket t JOIN orders o ON o.order_id = t.order_id
  WHERE o.event_id = v_event AND t.seat_id = NEW.seat_id;

  IF v_taken > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ghe da co ve trong su kien nay';
  END IF;
END$$

-- 6. Khi sua ve: moi ve chi soat 1 lan, khong doi order/ghe
CREATE TRIGGER trg_ticket_bu BEFORE UPDATE ON ticket
FOR EACH ROW
BEGIN
  IF NEW.order_id <> OLD.order_id OR NEW.ticket_no <> OLD.ticket_no
     OR NEW.seat_id <> OLD.seat_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khong duoc sua thong tin ve';
  END IF;
  IF OLD.checkin_at IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ve da duoc soat, khong the soat lai';
  END IF;
END$$

-- 7. Khong sua gia khi zone da co order
CREATE TRIGGER trg_set_price_bu BEFORE UPDATE ON set_price
FOR EACH ROW
BEGIN
  IF NEW.price <> OLD.price AND EXISTS (
       SELECT 1 FROM orders
       WHERE event_id = OLD.event_id AND zone_id = OLD.zone_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Zone da co order, khong duoc sua gia';
  END IF;
END$$

-- 8. ISA disjoint: 1 tai khoan khong the vua la admin vua la customer
CREATE TRIGGER trg_admin_bi BEFORE INSERT ON admin
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM customer WHERE username = NEW.username) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tai khoan nay da la customer';
  END IF;
END$$

CREATE TRIGGER trg_customer_bi BEFORE INSERT ON customer
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM admin WHERE username = NEW.username) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tai khoan nay da la admin';
  END IF;
END$$

DELIMITER ;
