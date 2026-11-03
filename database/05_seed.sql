-- 1. VENUE
INSERT INTO venue (venue_name, address) VALUES
    ('San van dong Phu Tho', '1 Lu Gia, Phuong 15, Quan 11, TP.HCM');

-- 2. ZONE (capacity = so ghe that cua zone)
INSERT INTO zone (zone_name, capacity, venue_id) VALUES
    ('VIP',      5, 1),
    ('Standard', 8, 1),
    ('Economy', 10, 1);

-- 3. SEAT (23 ghe)
INSERT INTO seat (seat_row, seat_number, zone_id) VALUES
    ('A', 1, 1), ('A', 2, 1), ('A', 3, 1), ('A', 4, 1), ('A', 5, 1),
    ('B', 1, 2), ('B', 2, 2), ('B', 3, 2), ('B', 4, 2),
    ('B', 5, 2), ('B', 6, 2), ('B', 7, 2), ('B', 8, 2),
    ('C', 1, 3), ('C', 2, 3), ('C', 3, 3), ('C', 4, 3), ('C', 5, 3),
    ('C', 6, 3), ('C', 7, 3), ('C', 8, 3), ('C', 9, 3), ('C', 10, 3);

-- 4. EVENT (event 1 dang mo ban, event 2 chua mo ban)
INSERT INTO event (event_name, sale_start, start_time, end_time, venue_id) VALUES
    ('Concert Mua Dong 2026', '2026-10-01 09:00:00', '2026-12-20 19:00:00', '2026-12-20 22:30:00', 1),
    ('Concert Dau Nam 2027',  '2026-12-01 09:00:00', '2027-01-15 19:00:00', '2027-01-15 22:30:00', 1);

-- 5. HAS_PRICE (moi event dat gia cho tat ca zone)
INSERT INTO has_price (event_id, zone_id, price) VALUES
    (1, 1, 2000000), (1, 2, 1200000), (1, 3,  600000),
    (2, 1, 2500000), (2, 2, 1500000), (2, 3,  800000);

-- 6. TICKET: phat hanh san 1 ve cho moi ghe cua moi event
INSERT INTO ticket (event_id, ticket_no, seat_id, ticket_price)
SELECT e.event_id,
       ROW_NUMBER() OVER (PARTITION BY e.event_id
                          ORDER BY z.zone_id, s.seat_row, s.seat_number),
       s.seat_id,
       hp.price
FROM event e
JOIN zone z       ON z.venue_id = e.venue_id
JOIN seat s       ON s.zone_id  = z.zone_id
JOIN has_price hp ON hp.event_id = e.event_id AND hp.zone_id = z.zone_id;

-- 7. USERS + CUSTOMER
INSERT INTO users (username, password) VALUES
    ('khach01', 'hash_demo_1'),
    ('khach02', 'hash_demo_2'),
    ('khach03', 'hash_demo_3');

INSERT INTO customer (full_name, email, phone, user_id) VALUES
    ('Nguyen Van An', 'an@example.com',    '0901000001', 1),
    ('Tran Thi Binh', 'binh@example.com',  '0901000002', 2),
    ('Le Van Cuong',  'cuong@example.com', '0901000003', 3);

-- 8. ORDERS (du 3 trang thai)
INSERT INTO orders
    (order_status, ticket_quantity, ticket_amount, create_at, method, pay_at, customer_id)
VALUES
    ('PAID',    2, 4000000, '2026-10-05 10:00:00', 'MOMO',    '2026-10-05 10:05:00', 1),
    ('PAID',    1, 1200000, '2026-10-06 14:30:00', 'BANKING', '2026-10-06 14:33:00', 2),
    ('PENDING', 2, 1200000, NOW() - INTERVAL 30 MINUTE, NULL, NULL, 3),
    ('FAILED',  1,  600000, '2026-10-07 09:00:00', NULL, NULL, 1);

-- 9. GAN VE VAO ORDER (doi ca status va order_id trong CUNG 1 lenh)
UPDATE ticket SET ticket_status = 'SOLD', order_id = 1
WHERE event_id = 1 AND ticket_no IN (1, 2);

UPDATE ticket SET ticket_status = 'SOLD', order_id = 2
WHERE event_id = 1 AND ticket_no = 6;

UPDATE ticket SET ticket_status = 'RESERVED', order_id = 3
WHERE event_id = 1 AND ticket_no IN (14, 15);