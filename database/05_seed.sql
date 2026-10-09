-- MyTickets | 05_seed.sql
USE myTickets;

-- Du lieu mau
INSERT INTO users VALUES ('admin1', 'a1'), ('an', '123'), ('binh', '123');
INSERT INTO admin VALUES ('admin1');
INSERT INTO customer (username, full_name, email, phone) VALUES
  ('an',   'Nguyen Van An',  'an@example.com',   '0900000001'),
  ('binh', 'Tran Thi Binh',  'binh@example.com', '0900000002');

INSERT INTO venue (venue_name, address)
VALUES ('San van dong Phu Tho', '1 Lu Gia, Quan 11, TP.HCM');
INSERT INTO zone (zone_name, venue_id) VALUES ('VIP', 1), ('Standard', 1);
INSERT INTO seat (zone_id, seat_row, seat_number) VALUES
  (1,'A',1), (1,'A',2), (1,'A',3), (1,'A',4),
  (2,'B',1), (2,'B',2), (2,'B',3), (2,'B',4);

INSERT INTO events (event_name, sale_start, start_time, venue_id)
VALUES ('Concert Demo', NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 7 DAY, 1);
INSERT INTO set_price VALUES (1, 1, 2000000, 4), (1, 2, 800000, 4);
