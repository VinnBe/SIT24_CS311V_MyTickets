USE MyTickets;

-- Users: 1 admin, 4 customer
INSERT INTO users VALUES
  ('admin1', 'a1'), ('an', '123'), ('binh', '123'), ('chi', '123'), ('dung', '123');
INSERT INTO admin VALUES ('admin1');
INSERT INTO customer (username, full_name, email, phone) VALUES
  ('an',   'Nguyen Van An',  'an@example.com',   '0900000001'),   -- customer_id 1
  ('binh', 'Tran Thi Binh',  'binh@example.com', '0900000002'),   -- customer_id 2
  ('chi',  'Le Thi Chi',     'chi@example.com',  '0900000003'),   -- customer_id 3
  ('dung', 'Pham Van Dung',  'dung@example.com', '0900000004');   -- customer_id 4

-- 2 venues, each with 2 zones
INSERT INTO venue (venue_name, address) VALUES
  ('San van dong Phu Tho',  '1 Lu Gia, Quan 11, TP.HCM'),        -- venue 1
  ('Nha hat Thong Nhat',    '2 Le Duan, Quan 1, TP.HCM');        -- venue 2
INSERT INTO zone (zone_name, venue_id) VALUES
  ('VIP', 1), ('Standard', 1),                                    -- zone 1, 2 (venue 1)
  ('Premium', 2), ('General', 2);                                 -- zone 3, 4 (venue 2)

-- Seats: zone 1 = 4, zone 2 = 4, zone 3 = 3, zone 4 = 5
INSERT INTO seat (zone_id, seat_row, seat_number) VALUES
  (1,'A',1), (1,'A',2), (1,'A',3), (1,'A',4),
  (2,'B',1), (2,'B',2), (2,'B',3), (2,'B',4),
  (3,'A',1), (3,'A',2), (3,'A',3),
  (4,'B',1), (4,'B',2), (4,'B',3), (4,'B',4), (4,'B',5);

-- 5 events
INSERT INTO events (event_name, sale_start, start_time, venue_id) VALUES
  ('Concert Demo', NOW() - INTERVAL 1 DAY,  NOW() + INTERVAL 7 DAY,  1),  -- event 1: on sale
  ('Rock Night',   NOW() - INTERVAL 1 DAY,  NOW() + INTERVAL 3 DAY,  1),  -- event 2: on sale
  ('Jazz Evening', NOW() - INTERVAL 2 DAY,  NOW() + INTERVAL 10 DAY, 2),  -- event 3: on sale
  ('Summer Fest',  NOW() + INTERVAL 2 DAY,  NOW() + INTERVAL 9 DAY,  2),  -- event 4: NOT yet on sale
  ('Past Show',    NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 1 DAY,  1);  -- event 5: already ended

-- Prices and available (available = number of seats in that zone)
INSERT INTO set_price VALUES
  (1, 1, 2000000, 4), (1, 2,  800000, 4),
  (2, 1, 1500000, 4), (2, 2,  600000, 4),
  (3, 3, 2500000, 3), (3, 4,  900000, 5),
  (4, 3, 3000000, 3), (4, 4, 1000000, 5),
  (5, 1, 1000000, 4), (5, 2,  400000, 4);
