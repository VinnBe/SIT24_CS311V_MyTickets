-- ============================================================
-- MyTickets | MyTickets_tests.sql
-- Ca kiem thu T1-T8 (trigger) va P1-P12 (thu tuc/ham/view). Chay SAU MyTickets_setup.sql.
-- Luu y: cac ca nay co tinh gay loi va lam thay doi du lieu mau; chay 1 lan tren database vua dung.
-- ============================================================
USE myTickets;
-- ============ PHAN A: TRIGGER (T1-T8) ============
-- T1. An dat 2 ve zone VIP (backend: tru available -> tao order -> giu ghe)
UPDATE set_price SET available = available - 2
WHERE event_id = 1 AND zone_id = 1 AND available >= 2;
INSERT INTO orders (customer_id, event_id, zone_id, ticket_quantity)
VALUES (1, 1, 1, 2);                                   -- order_id = 1
INSERT INTO hold VALUES (1, 1), (1, 2);                -- ghe A1, A2
-- Ket qua mong doi: thanh cong, available cua VIP con 2

-- T2. Binh dat 1 ve roi huy -> FAILED, ghe va available duoc tra lai
UPDATE set_price SET available = available - 1
WHERE event_id = 1 AND zone_id = 1 AND available >= 1;
INSERT INTO orders (customer_id, event_id, zone_id, ticket_quantity)
VALUES (2, 1, 1, 1);                                   -- order_id = 2
INSERT INTO hold VALUES (2, 3);                        -- ghe A3
UPDATE orders SET status = 'FAILED' WHERE order_id = 2;
-- Ket qua mong doi: hold cua order 2 bi xoa, available VIP quay lai 2

-- T3. An dat them 1 ve cho cung su kien
INSERT INTO orders (customer_id, event_id, zone_id, ticket_quantity)
VALUES (1, 1, 2, 1);
-- Ket qua mong doi: LOI 'Vuot gioi han 2 ve moi tai khoan moi su kien'

-- T4. Giu ghe A1 (da bi order 1 giu) cho order khac cung su kien
UPDATE set_price SET available = available - 1
WHERE event_id = 1 AND zone_id = 1 AND available >= 1;
INSERT INTO orders (customer_id, event_id, zone_id, ticket_quantity)
VALUES (2, 1, 1, 1);                                   -- order moi cua Binh
INSERT INTO hold VALUES (LAST_INSERT_ID(), 1);
-- Ket qua mong doi: LOI 'Ghe da duoc giu hoac ban trong su kien nay'

-- T5. An thanh toan order 1, sinh ve, go giu ghe
UPDATE orders SET status = 'PAID', method = 'CARD', pay_at = NOW()
WHERE order_id = 1;
INSERT INTO ticket (order_id, ticket_no, seat_id) VALUES (1, 1, 1), (1, 2, 2);
DELETE FROM hold WHERE order_id = 1;
-- Ket qua mong doi: thanh cong, order 1 co 2 ve

-- T6. Dua order da PAID ve PENDING
UPDATE orders SET status = 'PENDING' WHERE order_id = 1;
-- Ket qua mong doi: LOI 'Order PAID/FAILED la trang thai cuoi'

-- T7. Soat ve 1 hai lan
UPDATE ticket SET checkin_at = NOW() WHERE order_id = 1 AND ticket_no = 1;
UPDATE ticket SET checkin_at = NOW() WHERE order_id = 1 AND ticket_no = 1;
-- Ket qua mong doi: lan 1 thanh cong, lan 2 LOI 'Ve da duoc soat'

-- T8. Sua gia zone da co order, va tao admin trung customer
UPDATE set_price SET price = 1 WHERE event_id = 1 AND zone_id = 1;
INSERT INTO admin VALUES ('an');
-- Ket qua mong doi: ca hai deu LOI (trg_set_price_bu, trg_admin_bi)

-- ============ PHAN B: THU TUC, HAM, VIEW (chay sau phan A) ============
-- Chuan bi: them event 2 (dang ban), event 3 (dang ban), event 4 (chua mo ban)
INSERT INTO events (event_name, sale_start, start_time, venue_id) VALUES
  ('Concert B', NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 5 DAY, 1),
  ('Concert C', NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 1 DAY, 1),
  ('Concert D', NOW() + INTERVAL 2 DAY, NOW() + INTERVAL 9 DAY, 1);
INSERT INTO set_price VALUES
  (2, 1, 2000000, 4), (2, 2, 800000, 4),
  (3, 1, 1500000, 4), (3, 2, 600000, 4),
  (4, 1, 2500000, 4), (4, 2, 900000, 4);

-- P1. Dang ky customer moi
CALL sp_register_customer('chi', '123', 'Le Thi Chi', 'chi@example.com',
                          '0900000003', @cid);
SELECT @cid AS customer_id;
-- Ket qua mong doi: customer_id = 3

-- P2. Dang ky trung email
CALL sp_register_customer('chi2', '123', 'Le Thi Chi', 'chi@example.com',
                          '0900000009', @x);
-- Ket qua mong doi: LOI 'Username hoac email da ton tai', khong co dong users 'chi2'

-- P3. Chi dat 2 ve VIP cua event 2
CALL sp_place_order(3, 2, 1, 2, @oid);
SELECT @oid AS order_id;
SELECT order_id, seat_id FROM hold WHERE order_id = @oid;
SELECT available FROM set_price WHERE event_id = 2 AND zone_id = 1;
-- Ket qua mong doi: giu 2 ghe dau tien (A1, A2), available con 2

-- P4. Chi dat them 1 ve cho event 2 -> vuot han muc, transaction rollback
CALL sp_place_order(3, 2, 2, 1, @o4);
SELECT available FROM set_price WHERE event_id = 2 AND zone_id = 2;
-- Ket qua mong doi: LOI 'Vuot gioi han 2 ve...'; available zone 2 van la 4

-- P5. Binh thanh toan ho order cua Chi
CALL sp_pay_order(@oid, 2, 'CARD');
-- Ket qua mong doi: LOI 'Khong duoc thanh toan ho'

-- P6. Chi thanh toan order cua minh
CALL sp_pay_order(@oid, 3, 'CARD');
SELECT order_id, ticket_no, seat_id FROM ticket WHERE order_id = @oid;
SELECT COUNT(*) AS con_giu FROM hold WHERE order_id = @oid;
-- Ket qua mong doi: sinh 2 ve (ticket_no 1, 2), khong con ghe dang giu

-- P7. Tong tien order
SELECT fn_order_total(@oid) AS tong_tien;
SELECT order_id, total FROM v_order_total WHERE order_id = @oid;
-- Ket qua mong doi: 4000000 (2 ve x 2000000)

-- P8. Binh dat 1 ve Standard roi huy
CALL sp_place_order(2, 2, 2, 1, @o8);
CALL sp_cancel_order(@o8, 2);
SELECT status FROM orders WHERE order_id = @o8;
SELECT available FROM set_price WHERE event_id = 2 AND zone_id = 2;
-- Ket qua mong doi: status = FAILED, available zone 2 quay lai 4

-- P9. Bao cao ban ve event 2
CALL sp_event_sales_report(2);
-- Ket qua mong doi: VIP ban 2 ve, doanh thu 4000000, lap day 50.0%; tong 2 ve

-- P10. Tien trinh nen: order PENDING cua event da bat dau bi chuyen FAILED
CALL sp_place_order(2, 3, 1, 1, @o10);
UPDATE events SET start_time = NOW() - INTERVAL 1 SECOND WHERE event_id = 3;
CALL sp_expire_orders();
SELECT status FROM orders WHERE order_id = @o10;
SELECT available FROM set_price WHERE event_id = 3 AND zone_id = 1;
-- Ket qua mong doi: expired_orders = 1, status = FAILED, available quay lai 4

-- P11. Dat ve event chua mo ban
CALL sp_place_order(2, 4, 1, 1, @o11);
SELECT * FROM v_event_status;
-- Ket qua mong doi: LOI 'Ngoai thoi gian mo ban'; v_event_status: event 4 = UPCOMING

-- P12. Lich su order cua Binh
SELECT order_id, event_name, zone_name, ticket_quantity, total, status
FROM v_customer_orders WHERE customer_id = 2 ORDER BY order_id;
-- Ket qua mong doi: cac order cua Binh kem ten event, zone, tong tien va trang thai
