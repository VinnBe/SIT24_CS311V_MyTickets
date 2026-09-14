from flask import Flask, jsonify
import pymysql
from config import DB_CONFIG

app = Flask(__name__)

@app.route("/customers", methods=["GET"])
def get_customers():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SELECT customer_id, full_name, email, phone FROM CUSTOMER")
    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "customer_id": row[0],
            "full_name": row[1],
            "email": row[2],
            "phone": row[3]
        })
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
