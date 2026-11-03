-- 1. Trang thai ban ve cua event, suy ra tu sale_start va start_time
CREATE OR REPLACE VIEW v_event_status AS
SELECT e.event_id,
       e.event_name,
       v.venue_name,
       e.sale_start,
       e.start_time,
       e.end_time,
       CASE WHEN NOW() < e.sale_start THEN 'UPCOMING'
            WHEN NOW() < e.start_time THEN 'ON_SALE'
            ELSE 'STARTED'
       END AS sale_status
FROM event e
JOIN venue v ON v.venue_id = e.venue_id;

-- 2. Tong tien tung order
--    ticket_amount: tong tien luu luc dat
--    tickets_total: tong ticket_price cac ve dang gan vao order
CREATE OR REPLACE VIEW v_order_total AS
SELECT o.order_id,
       o.customer_id,
       o.order_status,
       o.ticket_quantity,
       o.ticket_amount,
       MIN(t.event_id)                   AS event_id,
       MIN(s.zone_id)                    AS zone_id,
       COALESCE(SUM(t.ticket_price), 0)  AS tickets_total
FROM orders o
LEFT JOIN ticket t ON t.order_id = o.order_id
LEFT JOIN seat s   ON s.seat_id  = t.seat_id
GROUP BY o.order_id, o.customer_id, o.order_status,
         o.ticket_quantity, o.ticket_amount;

-- 3. Thong ke ve ban, ve dang giu va doanh thu theo event va zone
CREATE OR REPLACE VIEW v_event_sales AS
SELECT hp.event_id,
       e.event_name,
       hp.zone_id,
       z.zone_name,
       hp.price,
       COUNT(t.ticket_no)                                  AS total_seats,
       COALESCE(SUM(t.ticket_status = 'AVAILABLE'), 0)     AS available,
       COALESCE(SUM(t.ticket_status = 'RESERVED'), 0)      AS tickets_held,
       COALESCE(SUM(t.ticket_status = 'SOLD'), 0)          AS tickets_sold,
       COALESCE(SUM(CASE WHEN t.ticket_status = 'SOLD'
                         THEN t.ticket_price END), 0)      AS revenue
FROM has_price hp
JOIN event e ON e.event_id = hp.event_id
JOIN zone z  ON z.zone_id  = hp.zone_id
LEFT JOIN seat s   ON s.zone_id  = hp.zone_id
LEFT JOIN ticket t ON t.seat_id  = s.seat_id
                  AND t.event_id = hp.event_id
GROUP BY hp.event_id, e.event_name, hp.zone_id, z.zone_name, hp.price;

-- 4. Lich su order cua khach hang
CREATE OR REPLACE VIEW v_customer_orders AS
SELECT c.customer_id,
       c.full_name,
       ot.order_id,
       e.event_name,
       z.zone_name,
       ot.ticket_quantity,
       ot.ticket_amount AS total,
       ot.order_status,
       o.create_at,
       o.method,
       o.pay_at
FROM v_order_total ot
JOIN orders o     ON o.order_id    = ot.order_id
JOIN customer c   ON c.customer_id = ot.customer_id
LEFT JOIN event e ON e.event_id    = ot.event_id
LEFT JOIN zone z  ON z.zone_id     = ot.zone_id;