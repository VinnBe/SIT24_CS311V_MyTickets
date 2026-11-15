"""event_look.py - Giao dien rieng cua tung su kien (KHONG dung database).

Admin tai len anh poster, anh nen va soan noi dung gioi thieu cho su kien.
Tat ca luu thanh file trong thu muc frontend/uploads/events/:

    frontend/uploads/events/
        content.json            {"1": {"poster": "...", "background": "...", "description": "..."}}
        1/poster.jpg
        1/background.png
        1/content/<ma ngau nhien>.jpg   anh chen trong noi dung gioi thieu

Gan vao backend.py, ngay sau dong admin_api.init(...):
    import event_look
    event_look.init(app, admin_required, ApiError, FRONTEND_DIR, query_one)

API:
    GET    /api/event-look                         giao dien cua moi su kien (trang chu)
    GET    /api/event-look/<event_id>              giao dien cua 1 su kien
    PUT    /api/admin/event-look/<event_id>        {description, notes} luu noi dung gioi thieu
                                                   va phan "Luu y cho nguoi mua". Chi sua khoa co gui len.
                                                   notes = null: dung doan luu y mac dinh (ngay mo ban,
                                                   gioi han 2 ve...); notes = "": an phan luu y.
    POST   /api/admin/event-look/<event_id>/<kind> tai anh len (form-data, truong "file")
    DELETE /api/admin/event-look/<event_id>/<kind> xoa anh
    kind = poster | background
    POST   /api/admin/event-images/<event_id>      tai anh de chen vao noi dung gioi thieu,
                                                   tra ve {url}. Anh khong con nam trong noi dung
                                                   se bi xoa khi luu gioi thieu (PUT o tren).

Cu phap noi dung gioi thieu (frontend/js/rich-text.js hien thi):
    ## Tieu de  |  **chu dam**  |  ![chu thich](url anh) tren 1 dong rieng
"""
import glob
import json
import os
import re
import secrets
import threading
import time

from flask import jsonify, request

KINDS = ("poster", "background")
MAX_IMAGE_BYTES = 3 * 1024 * 1024          # 3 MB moi anh
MAX_TEXT = 10000                           # so ky tu toi da cua phan gioi thieu
MAX_NOTES = 2000                           # so ky tu toi da cua phan luu y cho nguoi mua
MAX_CONTENT_IMAGES = 30                    # so anh toi da chen trong gioi thieu cua 1 su kien


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

    def content_dir(event_id):
        return os.path.join(root, str(event_id), "content")

    def clean_content_images(event_id, text):
        """Xoa anh trong thu muc content/ ma noi dung gioi thieu khong con dung."""
        folder = content_dir(event_id)
        if not os.path.isdir(folder):
            return
        used = set(re.findall(rf"/uploads/events/{event_id}/content/([0-9a-f]{{16}}\.(?:jpg|png|webp))", text))
        for name in os.listdir(folder):
            if name not in used:
                try:
                    os.remove(os.path.join(folder, name))
                except OSError:
                    pass

    def read_image():
        """Doc anh trong form-data (truong "file"), tra ve (bytes, duoi file)."""
        f = request.files.get("file")
        if not f:
            raise ApiError("Chưa chọn ảnh")
        data = f.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise ApiError("Ảnh quá lớn. Mỗi ảnh tối đa 3 MB.")
        ext = image_ext(data)
        if not ext:
            raise ApiError("Chỉ nhận ảnh JPG, PNG hoặc WebP")
        return data, ext

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
        changes = {}
        if "description" in d:
            text = d["description"]
            text = text.replace("\r\n", "\n").strip() if isinstance(text, str) else ""
            if len(text) > MAX_TEXT:
                raise ApiError(f"Nội dung giới thiệu tối đa {MAX_TEXT} ký tự")
            changes["description"] = text or None
        if "notes" in d:
            notes = d["notes"]
            if notes is not None:                      # None = quay ve doan mac dinh
                if not isinstance(notes, str):
                    raise ApiError("Dữ liệu gửi lên không hợp lệ")
                notes = notes.replace("\r\n", "\n").strip()   # "" = an phan luu y
                if len(notes) > MAX_NOTES:
                    raise ApiError(f"Phần lưu ý tối đa {MAX_NOTES} ký tự")
            changes["notes"] = notes
        item = update(event_id, changes)
        if "description" in changes:
            clean_content_images(event_id, item.get("description") or "")
        return jsonify(item)

    @app.post("/api/admin/event-images/<int:event_id>")
    @admin_required
    def event_content_image(event_id):
        check_event(event_id)
        data, ext = read_image()
        folder = content_dir(event_id)
        os.makedirs(folder, exist_ok=True)
        if len(os.listdir(folder)) >= MAX_CONTENT_IMAGES:
            raise ApiError(f"Mỗi sự kiện chèn tối đa {MAX_CONTENT_IMAGES} ảnh trong phần giới thiệu. "
                           "Hãy xoá bớt ảnh khỏi nội dung rồi lưu lại.")
        name = f"{secrets.token_hex(8)}.{ext}"      # ten ngau nhien, khong trung, khong can ?v=
        with open(os.path.join(folder, name), "wb") as out:
            out.write(data)
        return jsonify(url=f"/uploads/events/{event_id}/content/{name}"), 201

    @app.post("/api/admin/event-look/<int:event_id>/<kind>")
    @admin_required
    def event_look_upload(event_id, kind):
        check_kind(kind)
        check_event(event_id)
        data, ext = read_image()

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