use MyTickets;




###------------------------------------check user existence
DROP PROCEDURE IF EXISTS pc_register_customer;
DELIMITER $$
CREATE PROCEDURE pc_register_customer(
  IN in_username VARCHAR(50), IN in_password VARCHAR(255),
  IN in_full_name VARCHAR(100), IN in_email VARCHAR(100), IN in_phone VARCHAR(20),
  OUT in_customer_id INT)
BEGIN
  DECLARE EXIT HANDLER FOR 1062 ###catch exception that user already exists
  BEGIN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Username or email already exists!';
  END;
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION ###catch all exceptions
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;                                        
  INSERT INTO users (username, password)                    
  VALUES (in_username, in_password);
  INSERT INTO customer (username, full_name, email, phone)  
  VALUES (in_username, in_full_name, in_email, in_phone);
  SET in_customer_id = LAST_INSERT_ID();                     
  COMMIT;                                                   
END$$
DELIMITER ;


### ------------------------------------------check available seat
DROP PROCEDURE IF EXISTS pc_place_order;
DELIMITER $$
CREATE PROCEDURE pc_place_order(
  IN in_customer_id INT, IN in_event_id INT, IN in_zone_id INT, IN in_qty INT,
  OUT in_order_id INT)
BEGIN
  -- 1. variables
  DECLARE v_done  INT DEFAULT 0;   -- 1 = cursor has no more rows
  DECLARE v_seat  INT;             -- the seat just fetched
  DECLARE v_count INT DEFAULT 0;   -- how many seats are held

  
  -- 2. cursor: the list of free seats we want to walk through
  DECLARE cur CURSOR FOR
    SELECT s.seat_id FROM seat s
    WHERE s.zone_id = in_zone_id
      AND s.seat_id NOT IN (
            SELECT h.seat_id FROM hold h JOIN orders o ON o.order_id = h.order_id
            WHERE o.event_id = in_event_id)
      AND s.seat_id NOT IN (
            SELECT t.seat_id FROM ticket t JOIN orders o ON o.order_id = t.order_id
            WHERE o.event_id = in_event_id)
    ORDER BY s.seat_row, s.seat_number
    LIMIT in_qty -- equivalent to number of seats are selected
    FOR UPDATE SKIP LOCKED;  -- skip seats are already assigned


  -- 3. handlers
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1; 
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL; -- throw exception
  END;

  IF in_qty NOT BETWEEN 1 AND 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ticket quantity must be 1 or 2!';
  END IF;

  START TRANSACTION;

  UPDATE has_price SET available = available - in_qty
  WHERE event_id = in_event_id AND zone_id = in_zone_id AND available >= in_qty;
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough seats in this zone';
  END IF;

  INSERT INTO orders (customer_id, event_id, zone_id, ticket_quantity)
  VALUES (in_customer_id, in_event_id, in_zone_id, in_qty);
  SET in_order_id = LAST_INSERT_ID();

  -- 4. NEW: walk through the free seats and hold each one
  OPEN cur;
  seat_loop: LOOP
    FETCH cur INTO v_seat;
    IF v_done = 1 THEN   -- check if no seats avail (=1) then end loop
      LEAVE seat_loop; 
    END IF;
    INSERT INTO hold (order_id, seat_id) VALUES (in_order_id, v_seat);
    SET v_count = v_count + 1;
  END LOOP;
  CLOSE cur;

  IF v_count < in_qty THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough free seats to hold';
  END IF;

  COMMIT;
END$$
DELIMITER ;

