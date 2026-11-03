-- ============ CHUAN BI: 4 event test, gia, phat hanh ve ============
-- event 3: dang ban (Phan A) | event 4: dang ban (Phan B)
-- event 5: dang ban, sap bat dau (P10) | event 6: chua mo ban (P0, P11)
INSERT INTO event (event_name, sale_start, start_time, end_time, venue_id) VALUES
  ('Test A - dang ban',    NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 5 DAY,
                           NOW() + INTERVAL 5 DAY + INTERVAL 3 HOUR, 1),
  ('Test B - dang ban',    NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 5 DAY,
                           NOW() + INTERVAL 5 DAY + INTERVAL 3 HOUR, 1),
  ('Test C - sap bat dau', NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 1 DAY,
                           NOW() + INTERVAL 1 DAY + INTERVAL 3 HOUR, 1),
  ('Test D - chua mo ban', NOW() + INTERVAL 2 DAY, NOW() + INTERVAL 9 DAY,
                           NOW() + INTERVAL 9 DAY + INTERVAL 3 HOUR, 1);

-- Gia: VIP 2.000.000 | Standard 800.000 | Economy 500.000
-- event 6 co tinh THIEU gia Economy de test P0
INSERT INTO has_price (event_id, zone_id, price) VALUES
  (3, 1, 2000000), (3, 2, 800000), (3, 3, 500000),
  (4, 1, 2000000), (4, 2, 800000), (4, 3, 500000),
  (5, 1, 2000000), (5, 2, 800000), (5, 3, 500000),
  (6, 1, 2000000), (6, 2, 800000);

CALL sp_issue_tickets(3);   -- tickets_issued = 23
CALL sp_issue_tickets(4);   -- tickets_issued = 23
CALL sp_issue_tickets(5);   -- tickets_issued = 23
-- Moi event: ve 1-5 = VIP (A1-A5), 6-13 = Standard, 14-23 = Economy

-- ============ PHAN A: TRIGGER (T1-T9) - event 3 ============

-- T1. An dat 2 ve VIP (tao order -> gan ve -> ve RESERVED)
INSERT INTO orders (ticket_quantity, ticket_amount, customer_id)
VALUES (2, 4000000, 1);
SET @o1 = LAST_INSERT_ID();
UPDATE ticket SET ticket_status = 'RESERVED', order_id = @o1
WHERE event_id = 3 AND ticket_no IN (1, 2);
SELECT fn_zone_available(3, 1) AS vip_con_trong;
-- Mong doi: thanh cong, VIP con 3

-- T2. Binh dat 1 ve VIP roi huy -> FAILED, ve tu tra ve AVAILABLE
INSERT INTO orders (ticket_quantity, ticket_amount, customer_id)
VALUES (1, 2000000, 2);
SET @o2 = LAST_INSERT_ID();
UPDATE ticket SET ticket_status = 'RESERVED', order_id = @o2
WHERE event_id = 3 AND ticket_no = 3;
UPDATE orders SET order_status = 'FAILED' WHERE order_id = @o2;
SELECT ticket_status, order_id FROM ticket WHERE event_id = 3 AND ticket_no = 3;
SELECT fn_zone_available(3, 1) AS vip_con_trong;
-- Mong doi: ve 3 la AVAILABLE, order_id NULL; VIP con 3

-- T3. An dat them 1 ve Standard cho cung su kien (da giu 2 ve)
INSERT INTO orders (ticket_quantity, ticket_amount, customer_id)
VALUES (1, 800000, 1);
SET @o3 = LAST_INSERT_ID();
UPDATE ticket SET ticket_status = 'RESERVED', order_id = @o3
WHERE event_id = 3 AND ticket_no = 6;
-- Mong doi: LOI 'Vuot gioi han 2 ve moi tai khoan moi su kien'
UPDATE orders SET order_status = 'FAILED' WHERE order_id = @o3;   -- don dep

-- T4a. Gan ve 1 (dang bi order cua An giu) cho order khac
INSERT INTO orders (ticket_quantity, ticket_amount, customer_id)
VALUES (1, 2000000, 2);
SET @o4 = LAST_INSERT_ID();
UPDATE ticket SET ticket_status = 'RESERVED', order_id = @o4
WHERE event_id = 3 AND ticket_no = 1;
-- Mong doi: LOI 'Chuyen trang thai ve khong hop le'
UPDATE orders SET order_status = 'FAILED' WHERE order_id = @o4;   -- don dep

-- T4b. Phat hanh ve thu 2 cho cung 1 ghe trong cung event
INSERT INTO ticket (event_id, ticket_no, seat_id, ticket_price)
VALUES (3, 99, 1, 2000000);
-- Mong doi: LOI Duplicate entry ... 'uq_ticket_seat'

-- T5. An thanh toan order @o1 -> ve tu dong SOLD
UPDATE orders SET order_status = 'PAID', method = 'CARD', pay_at = NOW()
WHERE order_id = @o1;
SELECT ticket_no, ticket_status FROM ticket WHERE order_id = @o1;
-- Mong doi: thanh cong, ve 1 va 2 la SOLD

-- T6. Dua order da PAID ve PENDING
UPDATE orders SET order_status = 'PENDING' WHERE order_id = @o1;
-- Mong doi: LOI 'Order PAID/FAILED la trang thai cuoi'

-- T7a. Soat ve 1 hai lan (lan 2 cong them 1 phut de gia tri that su khac)
UPDATE ticket SET checkin_at = NOW()
WHERE event_id = 3 AND ticket_no = 1;
UPDATE ticket SET checkin_at = NOW() + INTERVAL 1 MINUTE
WHERE event_id = 3 AND ticket_no = 1;
-- Mong doi: lan 1 thanh cong, lan 2 LOI 'Ve da duoc soat, khong the soat lai'

-- T7b. Soat ve chua ban (ve 4 dang AVAILABLE)
UPDATE ticket SET checkin_at = NOW() WHERE event_id = 3 AND ticket_no = 4;
-- Mong doi: LOI Check constraint 'ck_ticket_checkin' is violated

-- T8a. Sua gia zone da phat hanh ve
UPDATE has_price SET price = 1 WHERE event_id = 3 AND zone_id = 1;
-- Mong doi: LOI 'Zone da phat hanh ve, khong duoc sua gia'

-- T8b. Tra ve da SOLD ve AVAILABLE
UPDATE ticket SET ticket_status = 'AVAILABLE', order_id = NULL
WHERE event_id = 3 AND ticket_no = 2;
-- Mong doi: LOI 'Chuyen trang thai ve khong hop le'

-- T8c. Sua gia tren ve
UPDATE ticket SET ticket_price = 1 WHERE event_id = 3 AND ticket_no = 5;
-- Mong doi: LOI 'Khong duoc sua thong tin dinh danh cua ve'

-- T9. Cuong dat 2 ve Economy nhung chi giu 1 ve roi thanh toan
INSERT INTO orders (ticket_quantity, ticket_amount, customer_id)
VALUES (2, 1000000, 3);
SET @o9 = LAST_INSERT_ID();
UPDATE ticket SET ticket_status = 'RESERVED', order_id = @o9
WHERE event_id = 3 AND ticket_no = 14;
UPDATE orders SET order_status = 'PAID', method = 'CARD', pay_at = NOW()
WHERE order_id = @o9;
-- Mong doi: LOI 'Order chua giu du so ve da dat'
UPDATE orders SET order_status = 'FAILED' WHERE order_id = @o9;   -- don dep

-- ============ PHAN B: THU TUC, HAM, VIEW (P0-P13) ============

-- P0a. Phat hanh ve khi chua dat gia du moi zone (event 6 thieu Economy)
CALL sp_issue_tickets(6);
-- Mong doi: LOI 'Phai dat gia cho tat ca zone cua venue truoc khi phat hanh ve'
INSERT INTO has_price (event_id, zone_id, price) VALUES (6, 3, 500000);
CALL sp_issue_tickets(6);
-- Mong doi: tickets_issued = 23

-- P0b. Phat hanh lai cho event da co ve
CALL sp_issue_tickets(3);
-- Mong doi: LOI 'Su kien da phat hanh ve'

-- P1. Dang ky customer moi
CALL sp_register_customer('chi', 'hash_123', 'Le Thi Chi', 'chi@example.com',
                          '0900000004', @cid);
SELECT @cid AS customer_id;
-- Mong doi: customer_id = 4

-- P2. Dang ky trung email
CALL sp_register_customer('chi2', 'hash_123', 'Le Thi Chi', 'chi@example.com',
                          '0900000009', @x);
SELECT COUNT(*) AS so_user_chi2 FROM users WHERE username = 'chi2';
-- Mong doi: LOI 'Username hoac email da ton tai'; so_user_chi2 = 0

-- P3. Chi dat 2 ve VIP cua event 4
CALL sp_place_order(4, 4, 1, 2, @oid);
SELECT @oid AS order_id;
SELECT t.ticket_no, s.seat_row, s.seat_number, t.ticket_status
FROM ticket t JOIN seat s ON s.seat_id = t.seat_id
WHERE t.order_id = @oid;
SELECT fn_zone_available(4, 1) AS vip_con_trong;
-- Mong doi: giu 2 ghe dau tien A1, A2 (RESERVED); VIP con 3

-- P4. Chi dat them 1 ve Standard cho event 4 -> vuot han muc, rollback
CALL sp_place_order(4, 4, 2, 1, @o4b);
SELECT fn_zone_available(4, 2) AS standard_con_trong;
SELECT COUNT(*) AS so_order_cua_chi FROM orders WHERE customer_id = 4;
-- Mong doi: LOI 'Vuot gioi han 2 ve...'; Standard van 8; Chi van chi co 1 order

-- P5. Binh thanh toan ho order cua Chi
CALL sp_pay_order(@oid, 2, 'CARD');
-- Mong doi: LOI 'Khong duoc thanh toan ho'

-- P6. Chi thanh toan order cua minh
CALL sp_pay_order(@oid, 4, 'CARD');
SELECT ticket_no, ticket_status FROM ticket WHERE order_id = @oid;
-- Mong doi: tra ve 2 ve kem ma QR; ca 2 ve la SOLD

-- P7. Tong tien order
SELECT fn_order_total(@oid) AS tong_tien;
SELECT order_id, ticket_amount, tickets_total FROM v_order_total WHERE order_id = @oid;
-- Mong doi: 4000000; ticket_amount = tickets_total = 4000000

-- P8. Binh dat 1 ve Standard roi huy
CALL sp_place_order(2, 4, 2, 1, @o8);
SELECT fn_zone_available(4, 2) AS standard_sau_khi_dat;
CALL sp_cancel_order(@o8, 2);
SELECT order_status FROM orders WHERE order_id = @o8;
SELECT fn_zone_available(4, 2) AS standard_sau_khi_huy;
-- Mong doi: sau khi dat 7; status = FAILED; sau khi huy quay lai 8

-- P9. Bao cao ban ve event 4
CALL sp_event_sales_report(4);
-- Mong doi: VIP ban 2 ve, doanh thu 4000000, lap day 40.0%;
--           Standard va Economy ban 0; tong 2 ve, 4000000

-- P10. Tien trinh nen: order PENDING cua event da bat dau -> FAILED
CALL sp_place_order(2, 5, 1, 1, @o10);
UPDATE event SET start_time = NOW() - INTERVAL 1 SECOND WHERE event_id = 5;
CALL sp_expire_orders();
SELECT order_status FROM orders WHERE order_id = @o10;
SELECT fn_zone_available(5, 1) AS vip_event5;
SELECT order_status FROM orders WHERE order_id = 3;
-- Mong doi: expired_orders = 2 (@o10 + order 3 cua seed da qua 15 phut);
--           @o10 FAILED, VIP event 5 quay lai 5; order 3 FAILED

-- P11. Dat ve event chua mo ban
CALL sp_place_order(2, 6, 1, 1, @o11);
SELECT event_id, event_name, sale_status FROM v_event_status;
-- Mong doi: LOI 'Ngoai thoi gian mo ban cua su kien';
--           v_event_status: event 5 = STARTED, event 6 = UPCOMING

-- P12. Lich su order cua Binh
SELECT order_id, event_name, zone_name, ticket_quantity, total, order_status
FROM v_customer_orders WHERE customer_id = 2 ORDER BY order_id;
-- Mong doi: order 2 (PAID, Concert Mua Dong 2026, Standard) va cac order FAILED;
--           order FAILED co event_name/zone_name = NULL

-- P13. Soat ve bang ma QR
SELECT qrcode INTO @qr FROM ticket WHERE order_id = @oid ORDER BY ticket_no LIMIT 1;
CALL sp_checkin_ticket(@qr);
-- Mong doi: thanh cong, tra ve ten event, zone, ghe, gio soat
CALL sp_checkin_ticket(@qr);
-- Mong doi: LOI 'Ve da duoc soat'
CALL sp_checkin_ticket('khong-ton-tai');
-- Mong doi: LOI 'Ma QR khong ton tai'