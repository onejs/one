import base64, hashlib, http.server, os, sys
class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version="HTTP/1.1"
    def do_GET(self):
        if self.path != '/socket':
            return super().do_GET()
        key=base64.b64encode(hashlib.sha1((self.headers['Sec-WebSocket-Key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        self.send_response(101)
        self.send_header('Upgrade','websocket')
        self.send_header('Connection','Upgrade')
        self.send_header('Sec-WebSocket-Accept',key)
        self.end_headers()
        first, length = self.rfile.read(2)
        mask=self.rfile.read(4) if length & 128 else bytes(4)
        payload=self.rfile.read(length & 127)
        payload=bytes(value ^ mask[i%4] for i,value in enumerate(payload))
        assert first & 15 == 8
        self.wfile.write(bytes([0x88,len(payload)])+payload)
        self.wfile.flush()
        self.close_connection=True
os.chdir(sys.argv[1])
http.server.ThreadingHTTPServer(('127.0.0.1',8123), Handler).serve_forever()
