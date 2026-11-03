# MyTickets — backend Flask + frontend HTML/JS

## Chạy thử

```bash
pip install -r requirements.txt
python3 seed.py      # tạo DB SQLite + tài khoản admin (admin / admin123)
python3 app.py        # chạy ở http://127.0.0.1:5000
```

Mở trình duyệt vào `http://127.0.0.1:5000`. Đăng nhập admin để tạo venue → zone → event (tự phát hành vé), hoặc đăng ký tài khoản customer để đặt vé.

## Những điểm đã resolve so với report V2 (xem phần chat đã trao đổi)

- `capacity` đặt ở bảng `ZONE` (không phải `VENUE`, theo đúng CHECK constraint và business rule "available khởi tạo bằng capacity của zone").
- `EVENT` có `end_time`.
- Không có bảng `ADMIN`; admin được nhận diện qua `ADMIN_USERNAMES` trong `config.py`.
- `ORDER` chỉ có 1 FK `customer_id` (bỏ cột thừa `pay_customer_id`).
- `TICKET` dùng `ticket_id` làm PK kỹ thuật (autoincrement) + `UNIQUE(event_id, ticket_no)`, vì `ticket_no` đánh số trong phạm vi 1 event (không unique toàn hệ thống).
- Mã QR không lưu cột riêng — suy ra từ `order_id-ticket_no` ở tầng app (route `/api/checkin`, `/api/my-tickets`).
- Vé được phát hành (pre-generate, trạng thái AVAILABLE) ngay khi event được tạo + đặt giá xong — khớp với mục 1.2/3.4.2 của report, không phải "tạo sau khi thanh toán" như mô tả cũ ở 3.1.2/3.2.

## Chuyển sang MySQL/Aiven thật

`db.py` hiện dùng SQLite cho dễ chạy thử. Khi sẵn sàng dùng Aiven: viết lại `schema.sql` sang cú pháp MySQL (AUTO_INCREMENT, ENUM thay CHECK IN, DATETIME thay TEXT) và thay `db.py` bằng PyMySQL — phần business logic trong `routes/*.py` giữ nguyên vì chỉ dùng SQL chuẩn + transaction.
