DELIMITER $$

-- Ham: tong tien cua 1 order (tong tien da chot luc dat)
CREATE FUNCTION fn_order_total(p_order_id INT)
RETURNS DECIMAL(14,0)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(14,0);
  SELECT ticket_amount INTO v_total FROM orders WHERE order_id = p_order_id;
  RETURN v_total;
END$$

-- Ham: so ve con trong cua 1 zone trong 1 event
CREATE FUNCTION fn_zone_available(p_event_id INT, p_zone_id INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_n INT;
  SELECT COUNT(*) INTO v_n
  FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
  WHERE t.event_id = p_event_id AND s.zone_id = p_zone_id
    AND t.ticket_status = 'AVAILABLE';
  RETURN v_n;
END$$

-- Dang ky customer: tao USERS va CUSTOMER trong 1 transaction
-- p_password phai la chuoi DA BAM (hash) do backend tao
CREATE PROCEDURE sp_register_customer(
  IN p_username VARCHAR(50), IN p_password VARCHAR(255),
  IN p_full_name VARCHAR(100), IN p_email VARCHAR(100), IN p_phone VARCHAR(20),
  OUT p_customer_id INT)
BEGIN
  DECLARE v_user_id INT;
  DECLARE EXIT HANDLER FOR 1062
  BEGIN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Username hoac email da ton tai';
  END;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  INSERT INTO users (username, password) VALUES (p_username, p_password);
  SET v_user_id = LAST_INSERT_ID();
  INSERT INTO customer (full_name, email, phone, user_id)
  VALUES (p_full_name, p_email, p_phone, v_user_id);
  SET p_customer_id = LAST_INSERT_ID();
  COMMIT;
END$$

-- Phat hanh ve cho event: moi ghe cua venue 1 ve (AVAILABLE)
CREATE PROCEDURE sp_issue_tickets(IN p_event_id INT)
BEGIN
  DECLARE v_venue  INT;
  DECLARE v_zones  INT;
  DECLARE v_priced INT;
  DECLARE v_exist  INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SELECT venue_id INTO v_venue FROM event WHERE event_id = p_event_id;
  IF v_venue IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Su kien khong ton tai';
  END IF;

  SELECT COUNT(*) INTO v_exist FROM ticket WHERE event_id = p_event_id;
  IF v_exist > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Su kien da phat hanh ve';
  END IF;

  SELECT COUNT(*) INTO v_zones FROM zone WHERE venue_id = v_venue;
  SELECT COUNT(*) INTO v_priced
  FROM has_price hp JOIN zone z ON z.zone_id = hp.zone_id
  WHERE hp.event_id = p_event_id AND z.venue_id = v_venue;
  IF v_zones = 0 OR v_priced <> v_zones THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Phai dat gia cho tat ca zone cua venue truoc khi phat hanh ve';
  END IF;

  START TRANSACTION;
  INSERT INTO ticket (event_id, ticket_no, seat_id, ticket_price)
  SELECT e.event_id,
         ROW_NUMBER() OVER (ORDER BY z.zone_id, s.seat_row, s.seat_number),
         s.seat_id,
         hp.price
  FROM event e
  JOIN zone z       ON z.venue_id = e.venue_id
  JOIN seat s       ON s.zone_id  = z.zone_id
  JOIN has_price hp ON hp.event_id = e.event_id AND hp.zone_id = z.zone_id
  WHERE e.event_id = p_event_id;
  SELECT ROW_COUNT() AS tickets_issued;
  COMMIT;
END$$

-- Dat ve: chon ve AVAILABLE dau tien theo (hang, so ghe), tao order,
-- gan ve vao order (RESERVED). Cac luat gio mo ban, han muc 2 ve,
-- 1 event + 1 zone / order do trigger trg_ticket_bu kiem tra.
CREATE PROCEDURE sp_place_order(
  IN p_customer_id INT, IN p_event_id INT, IN p_zone_id INT, IN p_qty INT,
  OUT p_order_id INT)
BEGIN
  DECLARE v_done  INT DEFAULT 0;
  DECLARE v_chk   INT DEFAULT 0;
  DECLARE v_no    INT;
  DECLARE v_price DECIMAL(12,0);
  DECLARE v_count INT DEFAULT 0;
  DECLARE v_total DECIMAL(12,0) DEFAULT 0;
  DECLARE v_no1   INT DEFAULT NULL;
  DECLARE v_no2   INT DEFAULT NULL;
  DECLARE cur CURSOR FOR
    SELECT t.ticket_no, t.ticket_price
    FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
    WHERE t.event_id = p_event_id
      AND s.zone_id = p_zone_id
      AND t.ticket_status = 'AVAILABLE'
    ORDER BY s.seat_row, s.seat_number
    LIMIT p_qty
    FOR UPDATE OF t SKIP LOCKED;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_qty IS NULL OR p_qty NOT BETWEEN 1 AND 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So luong ve phai tu 1 den 2';
  END IF;

  START TRANSACTION;

  -- khoa dong khach hang: tranh 2 request cung luc cung vuot han muc 2 ve
  SELECT COUNT(*) INTO v_chk FROM customer
  WHERE customer_id = p_customer_id FOR UPDATE;
  IF v_chk = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khach hang khong ton tai';
  END IF;

  SELECT COUNT(*) INTO v_chk FROM has_price
  WHERE event_id = p_event_id AND zone_id = p_zone_id;
  IF v_chk = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Zone chua co gia trong su kien nay';
  END IF;

  -- chon ve va khoa dong (SKIP LOCKED: bo qua ve dang bi nguoi khac giu)
  SET v_done = 0;
  OPEN cur;
  pick_loop: LOOP
    FETCH cur INTO v_no, v_price;
    IF v_done = 1 THEN
      LEAVE pick_loop;
    END IF;
    SET v_count = v_count + 1;
    SET v_total = v_total + v_price;
    IF v_count = 1 THEN
      SET v_no1 = v_no;
    ELSE
      SET v_no2 = v_no;
    END IF;
  END LOOP;
  CLOSE cur;

  IF v_count < p_qty THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong du ve trong zone';
  END IF;

  INSERT INTO orders (ticket_quantity, ticket_amount, customer_id)
  VALUES (p_qty, v_total, p_customer_id);
  SET p_order_id = LAST_INSERT_ID();

  UPDATE ticket
  SET ticket_status = 'RESERVED', order_id = p_order_id
  WHERE event_id = p_event_id AND ticket_no IN (v_no1, v_no2);

  COMMIT;
END$$

-- Thanh toan: doi order sang PAID. Trigger kiem tra han 15 phut, du ve,
-- khop tong tien, roi tu dong chuyen ve sang SOLD.
CREATE PROCEDURE sp_pay_order(
  IN p_order_id INT, IN p_customer_id INT, IN p_method VARCHAR(30))
BEGIN
  DECLARE v_owner  INT;
  DECLARE v_status VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_method IS NULL OR p_method = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Thieu phuong thuc thanh toan';
  END IF;

  START TRANSACTION;

  SELECT customer_id, order_status INTO v_owner, v_status
  FROM orders WHERE order_id = p_order_id FOR UPDATE;

  IF v_owner IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order khong ton tai';
  END IF;
  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong duoc thanh toan ho';
  END IF;
  IF v_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order khong o trang thai PENDING';
  END IF;

  UPDATE orders
  SET order_status = 'PAID', method = p_method, pay_at = NOW()
  WHERE order_id = p_order_id;

  COMMIT;

  -- tra ve cac ve vua mua (kem ma QR) cho client
  SELECT t.event_id, t.ticket_no, s.seat_row, s.seat_number,
         t.ticket_price, t.qrcode
  FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
  WHERE t.order_id = p_order_id
  ORDER BY t.ticket_no;
END$$

-- Huy order dang cho (khach tu huy hoac thanh toan loi): doi FAILED
CREATE PROCEDURE sp_cancel_order(IN p_order_id INT, IN p_customer_id INT)
BEGIN
  DECLARE v_owner  INT;
  DECLARE v_status VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT customer_id, order_status INTO v_owner, v_status
  FROM orders WHERE order_id = p_order_id FOR UPDATE;

  IF v_owner IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order khong ton tai';
  END IF;
  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong duoc huy order cua nguoi khac';
  END IF;
  IF v_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chi huy duoc order dang PENDING';
  END IF;

  UPDATE orders SET order_status = 'FAILED' WHERE order_id = p_order_id;
  COMMIT;
END$$

-- Tien trinh nen goi moi phut: order PENDING qua han -> FAILED
-- Qua han = qua 15 phut ke tu luc dat, hoac event cua order da bat dau.
CREATE PROCEDURE sp_expire_orders()
BEGIN
  DECLARE v_id INT;
  DECLARE v_n  INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  expire_loop: LOOP
    SET v_id = NULL;
    SELECT o.order_id INTO v_id
    FROM orders o
    WHERE o.order_status = 'PENDING'
      AND (o.create_at + INTERVAL 15 MINUTE < NOW()
           OR EXISTS (SELECT 1
                      FROM ticket t JOIN event e ON e.event_id = t.event_id
                      WHERE t.order_id = o.order_id
                        AND e.start_time <= NOW()))
    ORDER BY o.order_id
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_id IS NULL THEN
      LEAVE expire_loop;
    END IF;

    UPDATE orders SET order_status = 'FAILED' WHERE order_id = v_id;
    SET v_n = v_n + 1;
  END LOOP;
  COMMIT;

  SELECT v_n AS expired_orders;
END$$

-- Soat ve tai cong: tra theo ma QR; chi ve SOLD, chua soat moi hop le
CREATE PROCEDURE sp_checkin_ticket(IN p_qrcode CHAR(36))
BEGIN
  DECLARE v_event   INT;
  DECLARE v_no      INT;
  DECLARE v_status  VARCHAR(10);
  DECLARE v_checkin DATETIME;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT event_id, ticket_no, ticket_status, checkin_at
    INTO v_event, v_no, v_status, v_checkin
  FROM ticket WHERE qrcode = p_qrcode FOR UPDATE;

  IF v_event IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ma QR khong ton tai';
  END IF;
  IF v_status <> 'SOLD' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ve chua duoc thanh toan';
  END IF;
  IF v_checkin IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ve da duoc soat';
  END IF;

  UPDATE ticket SET checkin_at = NOW()
  WHERE event_id = v_event AND ticket_no = v_no;
  COMMIT;

  SELECT e.event_name, z.zone_name, s.seat_row, s.seat_number, t.checkin_at
  FROM ticket t
  JOIN event e ON e.event_id = t.event_id
  JOIN seat s  ON s.seat_id  = t.seat_id
  JOIN zone z  ON z.zone_id  = s.zone_id
  WHERE t.event_id = v_event AND t.ticket_no = v_no;
END$$

-- Bao cao ban ve cua 1 event
CREATE PROCEDURE sp_event_sales_report(IN p_event_id INT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM event WHERE event_id = p_event_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Su kien khong ton tai';
  END IF;

  SELECT zone_name, price, total_seats, tickets_sold, tickets_held, available,
         revenue,
         ROUND(100 * tickets_sold / NULLIF(total_seats, 0), 1) AS fill_rate_pct
  FROM v_event_sales WHERE event_id = p_event_id ORDER BY zone_id;

  SELECT COALESCE(SUM(tickets_sold), 0) AS total_tickets,
         COALESCE(SUM(revenue), 0)      AS total_revenue
  FROM v_event_sales WHERE event_id = p_event_id;
END$$

DELIMITER ;