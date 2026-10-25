"""loopback endpoints for the native networking proof, with no app state changes."""
import base64
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    runs = 0

    def reply(self, status, data, content_type='text/plain'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        if self.path == '/generation':
            Handler.runs += 1
            self.reply(200, json.dumps(Handler.runs).encode(), 'application/json')
            return
        if self.path == '/stream':
            chunks = [b'first \xf0\x9f', b'\x8c\x8a last']
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(sum(map(len, chunks))))
            self.end_headers()
            for chunk in chunks:
                self.wfile.write(chunk)
                self.wfile.flush()
                time.sleep(0.1)
            return
        if self.path == '/binary':
            self.reply(200, bytes([0, 1, 127, 255]), 'application/octet-stream')
            return
        if self.path == '/slow':
            time.sleep(3)
        self.reply(503 if self.path == '/failure' else 200,
                   b'unavailable' if self.path == '/failure' else b'ok')

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', '0')))
        data = json.dumps({'body': body.decode('utf-8', errors='replace'),
                           'base64': base64.b64encode(body).decode(),
                           'header': self.headers.get('X-One-Proof')}).encode()
        self.reply(200, data, 'application/json')


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 18989), Handler).serve_forever()
