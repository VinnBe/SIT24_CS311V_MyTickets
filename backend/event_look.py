"""event_look.py - Giao dien rieng cua tung su kien (KHONG dung database).

Admin tai len anh poster, anh nen va soan noi dung gioi thieu cho su kien.
Tat ca luu thanh file trong thu muc frontend/uploads/events/:

    frontend/uploads/events/
        content.json            {"1": {"poster": "...", "background": "...", "description": "..."}}
        1/poster.jpg
        1/background.png

Gan vao backend.py, ngay sau dong admin_api.init(...):
    import event_look
    event_look.init(app, admin_required, ApiError, FRONTEND_DIR, query_one)

API:
    GET    /api/event-look                         giao dien cua moi su kien (trang chu)
    GET    /api/event-look/<event_id>              giao dien cua 1 su kien
    PUT    /api/admin/event-look/<event_id>        {description} luu noi dung gioi thieu
    POST   /api/admin/event-look/<event_id>/<kind> tai anh len (form-data, truong "file")
    DELETE /api/admin/event-look/<event_id>/<kind> xoa anh
    kind = poster | background
"""
import glob
import json
import os
import threading
import time

from flask import jsonify, request

KINDS = ("poster", "background")
MAX_IMAGE_BYTES = 3 * 1024 * 1024          # 3 MB moi anh
MAX_TEXT = 5000                            # so ky tu toi da cua phan gioi thieu


def image_ext(data):
    """Doan dinh dang anh tu vai byte dau file (khong tin ten file nguoi dung gui)."""
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def init(app, admin_required, ApiError, frontend_dir, query_one):
    root = os.path.join(frontend_dir, "uploads", "events")
    content_path = os.path.join(root, "content.json")
    lock = threading.Lock()

    # Gioi han kich thuoc moi request (anh 3 MB + phan dau form)
    if not app.config.get("MAX_CONTENT_LENGTH"):
        app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES + 512 * 1024

    @app.errorhandler(413)
    def too_large(e):
        return jsonify(error="Ảnh quá lớn. Mỗi ảnh tối đa 3 MB."), 413

    # ------------------------------------------------------------------
    def load():
        try:
            with open(content_path, encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else {}
        except (FileNotFoundError, ValueError):
            return {}

    def save(data):
        os.makedirs(root, exist_ok=True)
        tmp = content_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, content_path)          # ghi xong moi thay file cu, khong bi hong giua chung

    def update(event_id, changes):
        """Sua giao dien 1 su kien. changes: {khoa: gia tri}, gia tri None = xoa khoa."""
        with lock:
            data = load()
            item = data.get(str(event_id), {})
            for k, v in changes.items():
                if v is None:
                    item.pop(k, None)
                else:
                    item[k] = v
            if item:
                data[str(event_id)] = item
            else:
                data.pop(str(event_id), None)
            save(data)
            return item

    def check_event(event_id):
        # Chi doc de kiem tra su kien co ton tai, khong ghi gi vao database
        if not query_one("SELECT 1 FROM event WHERE event_id = %s", (event_id,)):
            raise ApiError("Không tìm thấy sự kiện", 404)

    def check_kind(kind):
        if kind not in KINDS:
            raise ApiError("Loại ảnh không hợp lệ", 404)

    def remove_files(event_id, kind):
        for path in glob.glob(os.path.join(root, str(event_id), kind + ".*")):
            try:
                os.remove(path)
            except OSError:
                pass

    # ------------------------------------------------------------------
    # Cong khai: trang chu va trang su kien doc de hien thi
    # ------------------------------------------------------------------
    @app.get("/api/event-look")
    def event_look_all():
        return jsonify(load())

    @app.get("/api/event-look/<int:event_id>")
    def event_look_one(event_id):
        return jsonify(load().get(str(event_id), {}))

    # ------------------------------------------------------------------
    # Admin: sua giao dien
    # ------------------------------------------------------------------
    @app.put("/api/admin/event-look/<int:event_id>")
    @admin_required
    def event_look_text(event_id):
        check_event(event_id)
        d = request.get_json(silent=True)
        if not isinstance(d, dict):
            raise ApiError("Dữ liệu gửi lên không hợp lệ")
        text = d.get("description")
        text = text.replace("\r\n", "\n").strip() if isinstance(text, str) else ""
        if len(text) > MAX_TEXT:
            raise ApiError(f"Nội dung giới thiệu tối đa {MAX_TEXT} ký tự")
        return jsonify(update(event_id, {"description": text or None}))

    @app.post("/api/admin/event-look/<int:event_id>/<kind>")
    @admin_required
    def event_look_upload(event_id, kind):
        check_kind(kind)
        check_event(event_id)
        f = request.files.get("file")
        if not f:
            raise ApiError("Chưa chọn ảnh")
        data = f.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise ApiError("Ảnh quá lớn. Mỗi ảnh tối đa 3 MB.")
        ext = image_ext(data)
        if not ext:
            raise ApiError("Chỉ nhận ảnh JPG, PNG hoặc WebP")

        folder = os.path.join(root, str(event_id))
        os.makedirs(folder, exist_ok=True)
        remove_files(event_id, kind)                    # xoa anh cu (co the khac duoi file)
        with open(os.path.join(folder, f"{kind}.{ext}"), "wb") as out:
            out.write(data)
        # ?v=... de trinh duyet tai anh moi thay vi dung anh cu da luu tam
        url = f"/uploads/events/{event_id}/{kind}.{ext}?v={int(time.time())}"
        return jsonify(update(event_id, {kind: url})), 201

    @app.delete("/api/admin/event-look/<int:event_id>/<kind>")
    @admin_required
    def event_look_delete(event_id, kind):
        check_kind(kind)
        remove_files(event_id, kind)
        return jsonify(update(event_id, {kind: None}))