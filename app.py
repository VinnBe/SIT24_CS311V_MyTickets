import os
from flask import Flask, send_from_directory
from apscheduler.schedulers.background import BackgroundScheduler

from db import init_db, DB_PATH
from config import SECRET_KEY, STATIC_DIR
from routes import auth, venues, events, booking, checkin
from scheduler import expire_pending_orders


def create_app():
    app = Flask(__name__, static_folder=None)
    app.secret_key = SECRET_KEY

    if not os.path.exists(DB_PATH):
        init_db()
        print(f"[app] Đã tạo database mới tại {DB_PATH}")

    app.register_blueprint(auth.bp)
    app.register_blueprint(venues.bp)
    app.register_blueprint(events.bp)
    app.register_blueprint(booking.bp)
    app.register_blueprint(checkin.bp)

    @app.route("/")
    def index():
        return send_from_directory(STATIC_DIR, "index.html")

    @app.route("/<path:filename>")
    def static_files(filename):
        return send_from_directory(STATIC_DIR, filename)

    return app


app = create_app()

scheduler = BackgroundScheduler()
scheduler.add_job(expire_pending_orders, "interval", minutes=1, id="expire_pending_orders")
scheduler.start()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
