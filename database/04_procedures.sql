-- MyTickets | 04_procedures.sql
USE myTickets;
DELIMITER $$

-- Ham: tong tien cua 1 order
CREATE FUNCTION fn_order_total(p_order_id INT)
RETURNS DECIMAL(14,0)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(14,0);
  SELECT sp.price * o.ticket_quantity INTO v_total
  FROM orders o
  JOIN set_price sp ON sp.event_id = o.event_id AND sp.zone_id = o.zone_id
  WHERE o.order_id = p_order_id;
  RETURN v_total;
END$$

-- Dang ky customer: tao USER va CUSTOMER trong 1 transaction
CREATE PROCEDURE sp_register_customer(
  IN p_username VARCHAR(50), IN p_password VARCHAR(255),
  IN p_full_name VARCHAR(100), IN p_email VARCHAR(100), IN p_phone VARCHAR(20),
  OUT p_customer_id INT)
BEGIN
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
  INSERT INTO customer (username, full_name, email, phone)
  VALUES (p_username, p_full_name, p_email, p_phone);
  SET p_customer_id = LAST_INSERT_ID();
  COMMIT;
END$$

-- Dat ve: tru available, tao order, chon va giu ghe (1 transaction)
CREATE PROCEDURE sp_place_order(
  IN p_customer_id INT, IN p_event_id INT, IN p_zone_id INT, IN p_qty INT,
  OUT p_order_id INT)
BEGIN
  DECLARE v_done  INT DEFAULT 0;
  DECLARE v_seat  INT;
  DECLARE v_count INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT s.seat_id FROM seat s
    WHERE s.zone_id = p_zone_id
      AND s.seat_id NOT IN (
            SELECT h.seat_id FROM hold h JOIN orders o ON o.order_id = h.order_id
            WHERE o.event_id = p_event_id)
      AND s.seat_id NOT IN (
            SELECT t.seat_id FROM ticket t JOIN orders o ON o.order_id = t.order_id
            WHERE o.event_id = p_event_id)
    ORDER BY s.seat_row, s.seat_number
    LIMIT p_qty
    FOR UPDATE SKIP LOCKED;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_qty NOT BETWEEN 1 AND 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So luong ve phai tu 1 den 2';
  END IF;

  START TRANSACTION;

  UPDATE set_price SET available = available - p_qty
  WHERE event_id = p_event_id AND zone_id = p_zone_id AND available >= p_qty;
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong du ghe trong zone';
  END IF;

  INSERT INTO orders (customer_id, event_id, zone_id, ticket_quantity)
  VALUES (p_customer_id, p_event_id, p_zone_id, p_qty);
  SET p_order_id = LAST_INSERT_ID();

  OPEN cur;
  seat_loop: LOOP
    FETCH cur INTO v_seat;
    IF v_done = 1 THEN
      LEAVE seat_loop;
    END IF;
    INSERT INTO hold (order_id, seat_id) VALUES (p_order_id, v_seat);
    SET v_count = v_count + 1;
  END LOOP;
  CLOSE cur;

  IF v_count < p_qty THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong du ghe trong de giu';
  END IF;

  COMMIT;
END$$

-- Thanh toan: doi PAID, sinh ve tu cac ghe dang giu, go giu ghe
CREATE PROCEDURE sp_pay_order(
  IN p_order_id INT, IN p_customer_id INT, IN p_method VARCHAR(30))
BEGIN
  DECLARE v_owner  INT;
  DECLARE v_status VARCHAR(10);
  DECLARE v_qty    INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT customer_id, status, ticket_quantity INTO v_owner, v_status, v_qty
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
  SET status = 'PAID', method = p_method, pay_at = NOW()
  WHERE order_id = p_order_id;

  INSERT INTO ticket (order_id, ticket_no, seat_id)
  SELECT p_order_id, ROW_NUMBER() OVER (ORDER BY seat_id), seat_id
  FROM hold WHERE order_id = p_order_id;

  IF ROW_COUNT() <> v_qty THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'So ghe dang giu khong khop so ve';
  END IF;

  DELETE FROM hold WHERE order_id = p_order_id;
  COMMIT;
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

  SELECT customer_id, status INTO v_owner, v_status
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

  UPDATE orders SET status = 'FAILED' WHERE order_id = p_order_id;
  COMMIT;
END$$

-- Tien trinh nen goi moi phut: order PENDING qua han -> FAILED
CREATE PROCEDURE sp_expire_orders()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  UPDATE orders o JOIN events e ON e.event_id = o.event_id
  SET o.status = 'FAILED'
  WHERE o.status = 'PENDING'
    AND (o.place_at + INTERVAL 15 MINUTE < NOW() OR e.start_time <= NOW());
  SELECT ROW_COUNT() AS expired_orders;
  COMMIT;
END$$

-- Bao cao ban ve cua 1 event
CREATE PROCEDURE sp_event_sales_report(IN p_event_id INT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM events WHERE event_id = p_event_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Su kien khong ton tai';
  END IF;

  SELECT zone_name, price, total_seats, tickets_sold, tickets_held, available,
         revenue, ROUND(100 * tickets_sold / NULLIF(total_seats, 0), 1) AS fill_rate_pct
  FROM v_event_sales WHERE event_id = p_event_id ORDER BY zone_id;

  SELECT COALESCE(SUM(tickets_sold), 0) AS total_tickets,
         COALESCE(SUM(revenue), 0)      AS total_revenue
  FROM v_event_sales WHERE event_id = p_event_id;
END$$

DELIMITER ;
