
USE MyTickets;



-- Total = zone price * ticket quantity
CREATE OR REPLACE VIEW v_order_total AS
SELECT o.order_id, o.customer_id, o.event_id, o.zone_id, o.status,
       sp.price, o.ticket_quantity, sp.price * o.ticket_quantity AS total
FROM orders o
JOIN has_price sp ON sp.event_id = o.event_id AND sp.zone_id = o.zone_id;



-- Order history
CREATE OR REPLACE VIEW v_customer_orders AS
SELECT c.customer_id, c.full_name, o.order_id, e.event_name, z.zone_name,
       o.ticket_quantity, sp.price * o.ticket_quantity AS total,
       o.status, o.place_at, o.method, o.pay_at
FROM orders o
JOIN customer c   ON c.customer_id = o.customer_id
JOIN events e     ON e.event_id    = o.event_id
JOIN zone z       ON z.zone_id     = o.zone_id
JOIN has_price sp ON sp.event_id = o.event_id AND sp.zone_id = o.zone_id;
