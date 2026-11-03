DROP TRIGGER IF EXISTS trg_orders_bi;
DROP TRIGGER IF EXISTS trg_orders_bu;
DROP TRIGGER IF EXISTS trg_orders_au;
DROP TRIGGER IF EXISTS trg_ticket_bi;
DROP TRIGGER IF EXISTS trg_ticket_bu;
DROP TRIGGER IF EXISTS trg_has_price_bu;

DELIMITER $$

-- 1. Tao order: luon bat dau o PENDING, chua thanh toan
CREATE TRIGGER trg_orders_bi BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  SET NEW.order_status = 'PENDING';
  SET NEW.method       = NULL;
  SET NEW.pay_at       = NULL;
  SET NEW.create_at    = NOW();
END$$

-- 2. Sua order: khoa cot goc, trang thai 1 chieu, kiem tra khi thanh toan
CREATE TRIGGER trg_orders_bu BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  DECLARE v_cnt   INT;
  DECLARE v_sum   DECIMAL(12,0);
  DECLARE v_event INT;
  DECLARE v_start DATETIME;

  IF NEW.customer_id <> OLD.customer_id
     OR NEW.ticket_quantity <> OLD.ticket_quantity
     OR NEW.ticket_amount   <> OLD.ticket_amount
     OR NEW.create_at       <> OLD.create_at THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khong duoc sua thong tin goc cua order';
  END IF;

  IF OLD.order_status <> 'PENDING'
     AND (NEW.order_status <> OLD.order_status
          OR NOT (NEW.method <=> OLD.method)
          OR NOT (NEW.pay_at <=> OLD.pay_at)) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order PAID/FAILED la trang thai cuoi';
  END IF;

  IF OLD.order_status = 'PENDING' AND NEW.order_status = 'PAID' THEN
    SELECT COUNT(*), COALESCE(SUM(ticket_price), 0), MIN(event_id)
      INTO v_cnt, v_sum, v_event
    FROM ticket WHERE order_id = OLD.order_id;

    IF v_cnt <> OLD.ticket_quantity THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order chua giu du so ve da dat';
    END IF;
    IF v_sum <> OLD.ticket_amount THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tong tien order khong khop tong gia cac ve';
    END IF;

    SELECT start_time INTO v_start FROM event WHERE event_id = v_event;
    IF NOW() >= v_start OR NOW() > OLD.create_at + INTERVAL 15 MINUTE THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order da qua han thanh toan';
    END IF;
  END IF;
END$$

-- 3. Sau khi doi trang thai order: tu dong chuyen trang thai cac ve
--    PENDING -> PAID   : ve RESERVED thanh SOLD
--    PENDING -> FAILED : go ve khoi order, tra ve AVAILABLE
CREATE TRIGGER trg_orders_au AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.order_status = 'PENDING' AND NEW.order_status = 'PAID' THEN
    UPDATE ticket SET ticket_status = 'SOLD'
    WHERE order_id = NEW.order_id AND ticket_status = 'RESERVED';
  ELSEIF OLD.order_status = 'PENDING' AND NEW.order_status = 'FAILED' THEN
    UPDATE ticket SET ticket_status = 'AVAILABLE', order_id = NULL
    WHERE order_id = NEW.order_id;
  END IF;
END$$

-- 4. Phat hanh ve: phai AVAILABLE, dung gia zone, ghe thuoc venue cua event
CREATE TRIGGER trg_ticket_bi BEFORE INSERT ON ticket
FOR EACH ROW
BEGIN
  DECLARE v_price DECIMAL(12,0) DEFAULT NULL;

  IF NEW.ticket_no < 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ticket_no phai tu 1 tro len';
  END IF;

  IF NEW.ticket_status <> 'AVAILABLE'
     OR NEW.order_id IS NOT NULL OR NEW.checkin_at IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ve moi phat hanh phai AVAILABLE va chua thuoc order';
  END IF;

  SELECT hp.price INTO v_price
  FROM seat s
  JOIN zone z       ON z.zone_id = s.zone_id
  JOIN event e      ON e.event_id = NEW.event_id AND e.venue_id = z.venue_id
  JOIN has_price hp ON hp.event_id = e.event_id AND hp.zone_id = z.zone_id
  WHERE s.seat_id = NEW.seat_id;

  IF v_price IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ghe khong thuoc venue cua event hoac zone chua co gia';
  END IF;
  IF NEW.ticket_price <> v_price THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Gia ve phai bang gia zone trong event';
  END IF;
END$$

-- 5. Sua ve: khoa cot dinh danh, kiem tra chuyen trang thai, soat 1 lan
CREATE TRIGGER trg_ticket_bu BEFORE UPDATE ON ticket
FOR EACH ROW
BEGIN
  DECLARE v_ord_status VARCHAR(10);
  DECLARE v_ord_cust   INT;
  DECLARE v_ord_qty    INT;
  DECLARE v_sale       DATETIME;
  DECLARE v_start      DATETIME;
  DECLARE v_zone       INT;
  DECLARE v_cnt        INT;

  IF NEW.event_id <> OLD.event_id OR NEW.ticket_no <> OLD.ticket_no
     OR NEW.seat_id <> OLD.seat_id OR NEW.ticket_price <> OLD.ticket_price
     OR NEW.qrcode <> OLD.qrcode THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khong duoc sua thong tin dinh danh cua ve';
  END IF;

  IF OLD.checkin_at IS NOT NULL AND NOT (NEW.checkin_at <=> OLD.checkin_at) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ve da duoc soat, khong the soat lai';
  END IF;

  IF NEW.ticket_status <> OLD.ticket_status
     OR NOT (NEW.order_id <=> OLD.order_id) THEN

    -- AVAILABLE -> RESERVED: gan ve vao order
    IF OLD.ticket_status = 'AVAILABLE' AND NEW.ticket_status = 'RESERVED'
       AND OLD.order_id IS NULL AND NEW.order_id IS NOT NULL THEN

      SELECT order_status, customer_id, ticket_quantity
        INTO v_ord_status, v_ord_cust, v_ord_qty
      FROM orders WHERE order_id = NEW.order_id;

      IF v_ord_status IS NULL OR v_ord_status <> 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Chi giu ve cho order PENDING';
      END IF;

      SELECT sale_start, start_time INTO v_sale, v_start
      FROM event WHERE event_id = NEW.event_id;
      IF NOW() < v_sale OR NOW() >= v_start THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Ngoai thoi gian mo ban cua su kien';
      END IF;

      -- han muc 2 ve / khach / su kien
      SELECT COUNT(*) INTO v_cnt
      FROM ticket t JOIN orders o ON o.order_id = t.order_id
      WHERE o.customer_id = v_ord_cust
        AND t.event_id = NEW.event_id
        AND o.order_status IN ('PENDING', 'PAID');
      IF v_cnt + 1 > 2 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Vuot gioi han 2 ve moi tai khoan moi su kien';
      END IF;

      -- khong vuot so luong da khai bao trong order
      SELECT COUNT(*) INTO v_cnt FROM ticket WHERE order_id = NEW.order_id;
      IF v_cnt >= v_ord_qty THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Order da du so ve';
      END IF;

      -- moi order chi 1 su kien va 1 zone
      SELECT zone_id INTO v_zone FROM seat WHERE seat_id = NEW.seat_id;
      SELECT COUNT(*) INTO v_cnt
      FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
      WHERE t.order_id = NEW.order_id
        AND (t.event_id <> NEW.event_id OR s.zone_id <> v_zone);
      IF v_cnt > 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Moi order chi gom ve cua 1 su kien va 1 zone';
      END IF;

    -- RESERVED -> SOLD: chi khi order da PAID
    ELSEIF OLD.ticket_status = 'RESERVED' AND NEW.ticket_status = 'SOLD'
           AND NEW.order_id <=> OLD.order_id THEN
      SELECT order_status INTO v_ord_status
      FROM orders WHERE order_id = NEW.order_id;
      IF v_ord_status <> 'PAID' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Chi ban ve khi order da PAID';
      END IF;

    -- RESERVED -> AVAILABLE: chi khi order da FAILED
    ELSEIF OLD.ticket_status = 'RESERVED' AND NEW.ticket_status = 'AVAILABLE'
           AND NEW.order_id IS NULL THEN
      SELECT order_status INTO v_ord_status
      FROM orders WHERE order_id = OLD.order_id;
      IF v_ord_status <> 'FAILED' THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Chi tra ve khi order da FAILED';
      END IF;

    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Chuyen trang thai ve khong hop le';
    END IF;
  END IF;
END$$

-- 6. Khong sua gia khi zone da phat hanh ve
CREATE TRIGGER trg_has_price_bu BEFORE UPDATE ON has_price
FOR EACH ROW
BEGIN
  IF NEW.event_id <> OLD.event_id OR NEW.zone_id <> OLD.zone_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Khong duoc doi event hoac zone cua bang gia';
  END IF;

  IF NEW.price <> OLD.price AND EXISTS (
       SELECT 1 FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
       WHERE t.event_id = OLD.event_id AND s.zone_id = OLD.zone_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Zone da phat hanh ve, khong duoc sua gia';
  END IF;
END$$

DELIMITER ;