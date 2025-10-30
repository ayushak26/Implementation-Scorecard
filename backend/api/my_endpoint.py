# /api/my_endpoint.py
from http.server import BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Hello from Python")

# ⬇️ Guard goes HERE
base = Handler
print("Base is:", base, type(base))
if isinstance(base, type) and issubclass(base, BaseHTTPRequestHandler):
    pass
else:
    raise TypeError(f"Expected a class, got {type(base)}: {base}")

# Vercel expects this export
handler = base