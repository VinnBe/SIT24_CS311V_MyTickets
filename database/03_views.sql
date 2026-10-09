-- MyTickets | 03_views.sql
USE myTickets;

-- Trang thai ban ve cua event, suy ra tu sale_start va start_time
CREATE OR REPLACE VIEW v_event_status AS
SELECT e.event_id, e.event_name, e.sale_start, e.start_time,
       CASE WHEN NOW() < e.sale_start THEN 'UPCOMING'
            WHEN NOW() < e.start_time THEN 'ON_SALE'
            ELSE 'STARTED' END AS sale_status
FROM events e;

-- Tong tien tung order = gia cua zone * so ve
CREATE OR REPLACE VIEW v_order_total AS
SELECT o.order_id, o.customer_id, o.event_id, o.zone_id, o.status,
       sp.price, o.ticket_quantity, sp.price * o.ticket_quantity AS total
FROM orders o
JOIN set_price sp ON sp.event_id = o.event_id AND sp.zone_id = o.zone_id;

-- Thong ke ve ban, ve dang giu va doanh thu theo event va zone
CREATE OR REPLACE VIEW v_event_sales AS
SELECT sp.event_id, e.event_name, sp.zone_id, z.zone_name, sp.price,
       (SELECT COUNT(*) FROM seat s WHERE s.zone_id = sp.zone_id) AS total_seats,
       sp.available,
       COALESCE(SUM(CASE WHEN o.status = 'PAID' THEN o.ticket_quantity END), 0)
         AS tickets_sold,
       COALESCE(SUM(CASE WHEN o.status = 'PENDING' THEN o.ticket_quantity END), 0)
         AS tickets_held,
       COALESCE(SUM(CASE WHEN o.status = 'PAID' THEN o.ticket_quantity END), 0)
         * sp.price AS revenue
FROM set_price sp
JOIN events e ON e.event_id = sp.event_id
JOIN zone z   ON z.zone_id  = sp.zone_id
LEFT JOIN orders o ON o.event_id = sp.event_id AND o.zone_id = sp.zone_id
GROUP BY sp.event_id, e.event_name, sp.zone_id, z.zone_name, sp.price, sp.available;

-- Lich su order cua khach hang
CREATE OR REPLACE VIEW v_customer_orders AS
SELECT c.customer_id, c.full_name, o.order_id, e.event_name, z.zone_name,
       o.ticket_quantity, sp.price * o.ticket_quantity AS total,
       o.status, o.place_at, o.method, o.pay_at
FROM orders o
JOIN customer c   ON c.customer_id = o.customer_id
JOIN events e     ON e.event_id    = o.event_id
JOIN zone z       ON z.zone_id     = o.zone_id
JOIN set_price sp ON sp.event_id = o.event_id AND sp.zone_id = o.zone_id;
