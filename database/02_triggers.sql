
USE MyTickets;

DELIMITER $$

-- TRIGGER 1: Check (1) if event is open for sale; (2) customer already has 2 tickets (PENDING + PAID) for 1 event
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
      SET MESSAGE_TEXT = 'Event is not on sale'; 
  END IF;

  SELECT COALESCE(SUM(ticket_quantity), 0) INTO v_used
  FROM orders
  WHERE customer_id = NEW.customer_id AND event_id = NEW.event_id
    AND status IN ('PENDING', 'PAID');

  IF v_used + NEW.ticket_quantity > 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Limit of 2 tickets per event exceeded'; 
  END IF;

  SET NEW.status   = 'PENDING';
  SET NEW.place_at = NOW();
  SET NEW.method   = NULL;
  SET NEW.pay_at   = NULL;
END$$

-- TRIGGER 2: order info cannot be changed, paid/failed cannot be changed, check if order is expired
CREATE TRIGGER trg_orders_bu BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  DECLARE v_start DATETIME;

  IF NEW.customer_id <> OLD.customer_id OR NEW.event_id <> OLD.event_id
     OR NEW.zone_id <> OLD.zone_id
     OR NEW.ticket_quantity <> OLD.ticket_quantity
     OR NEW.place_at <> OLD.place_at THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot change anything in the order!';
  END IF;

  IF OLD.status <> 'PENDING' AND (NEW.status <> OLD.status
     OR NOT (NEW.method <=> OLD.method)
     OR NOT (NEW.pay_at <=> OLD.pay_at)) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'PAID/FAIL is the last status. Cannot update!';
  END IF;

  IF OLD.status = 'PENDING' AND NEW.status = 'PAID' THEN
    SELECT start_time INTO v_start FROM events WHERE event_id = OLD.event_id;
    IF NOW() >= v_start OR NOW() > OLD.place_at + INTERVAL 15 MINUTE THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order has expired.';
    END IF;
  END IF;
END$$

-- TRIGGER 3: PENDING -> FAILED: redo seat and order
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


-- TRIGGER 4: only create ticket when order is PAID
CREATE TRIGGER trg_ticket_bi BEFORE INSERT ON ticket
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);

  SELECT status INTO v_status
  FROM orders WHERE order_id = NEW.order_id;

  IF v_status <> 'PAID' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order is NOT PAID!';
  END IF;
END$$

-- TRIGGER 5: 1 ticket can only be checked in at once
CREATE TRIGGER trg_ticket_bu BEFORE UPDATE ON ticket
FOR EACH ROW
BEGIN
  IF OLD.checkin_at IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ticket already checked in!';
  END IF;
END$$

-- TRIGGER 6: admin OR customer, canNOT be both
CREATE TRIGGER trg_admin_bi BEFORE INSERT ON admin
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM customer WHERE username = NEW.username) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'This is a customer!';
  END IF;
END$$

CREATE TRIGGER trg_customer_bi BEFORE INSERT ON customer
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM admin WHERE username = NEW.username) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'This is an admin!';
  END IF;
END$$

-- TRIGGER 7: price cannot change once the zone has orders
CREATE TRIGGER trg_set_price_bu BEFORE UPDATE ON set_price
FOR EACH ROW
BEGIN
  IF NEW.price <> OLD.price AND EXISTS (
       SELECT 1 FROM orders
       WHERE event_id = OLD.event_id AND zone_id = OLD.zone_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Zone already has orders, price cannot change!';
  END IF;
END$$
DELIMITER ;


