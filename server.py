#!/usr/bin/env python3
import json, os, time, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

BASE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8000"))
# Set DATA_DIR to a persistent folder on your hosting provider.
# On first start, the bundled data.json is copied there.
DATA_DIR = os.environ.get("DATA_DIR", BASE)
DATA_FILE = os.path.join(DATA_DIR, "data.json")
os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(DATA_FILE):
    bundled = os.path.join(BASE, "data.json")
    if os.path.exists(bundled) and os.path.abspath(bundled) != os.path.abspath(DATA_FILE):
        import shutil
        shutil.copy2(bundled, DATA_FILE)
LOCK = threading.Lock()

def load():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save(data):
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, DATA_FILE)

class App(BaseHTTPRequestHandler):
    def send_json(self, code, obj):
        raw = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(raw)

    def read_body(self):
        n = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(n) or b"{}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self.send_json(200, {"status": "ok"})
            return
        if path == "/api/state":
            with LOCK:
                self.send_json(200, load())
            return
        if path == "/":
            path = "/static/index.html"
        if path.startswith("/static/"):
            file = os.path.join(BASE, path.lstrip("/"))
            if os.path.isfile(file):
                types = {".html":"text/html", ".css":"text/css", ".js":"application/javascript"}
                ext = os.path.splitext(file)[1]
                with open(file, "rb") as f: raw = f.read()
                self.send_response(200)
                self.send_header("Content-Type", types.get(ext, "application/octet-stream"))
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return
        self.send_json(404, {"error":"Not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        body = self.read_body()

        if path == "/api/orders":
            table = int(body.get("table", 0))
            items = body.get("items", [])
            waiter = body.get("waiter", "Waiter")
            if not table or not items:
                self.send_json(400, {"error":"Select a table and add items"})
                return
            with LOCK:
                data = load()
                order = {
                    "id": data["next_order"],
                    "table": table,
                    "waiter": waiter,
                    "items": items,
                    "status": "new",
                    "payment": "unpaid",
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                order["total"] = sum(float(x["price"]) * int(x["qty"]) for x in items)
                data["next_order"] += 1
                data["orders"].append(order)
                for t in data["tables"]:
                    if t["number"] == table:
                        t["status"] = "occupied"
                save(data)
            self.send_json(201, order)
            return

        parts = path.strip("/").split("/")
        if len(parts) == 4 and parts[0] == "api" and parts[1] == "orders":
            try: oid = int(parts[2])
            except: self.send_json(400, {"error":"Invalid order"}); return

            with LOCK:
                data = load()
                order = next((o for o in data["orders"] if o["id"] == oid), None)
                if not order:
                    self.send_json(404, {"error":"Order not found"})
                    return

                if parts[3] == "status":
                    order["status"] = body.get("status", order["status"])
                elif parts[3] == "pay":
                    order["payment"] = "paid"
                    order["payment_method"] = body.get("method", "Cash")
                    table = order["table"]
                    still_unpaid = any(
                        o["table"] == table and o["payment"] != "paid" and o["status"] != "cancelled"
                        for o in data["orders"]
                    )
                    if not still_unpaid:
                        for t in data["tables"]:
                            if t["number"] == table: t["status"] = "available"
                else:
                    self.send_json(404, {"error":"Unknown action"}); return
                save(data)
                self.send_json(200, order)
            return

        self.send_json(404, {"error":"Not found"})

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    print("Restaurant Order System: http://localhost:8000")
    print("Keep this Terminal open while using the app.")
    ThreadingHTTPServer(("0.0.0.0", PORT), App).serve_forever()
