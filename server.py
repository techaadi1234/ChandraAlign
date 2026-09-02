#!/usr/bin/env python3
"""
ChandraAlign - Integration Bridge Server
Smart India Hackathon: Sub-pixel Lunar Image Registration
Serves frontend UI and provides integration endpoints for the PyTorch ML backend.
"""

import os
import sys
import json
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
MOCK_DATA_PATH = os.path.join(FRONTEND_DIR, 'assets', 'mock_data.json')

class ChandraAlignServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/' or path == '/index.html':
            self.serve_file(os.path.join(FRONTEND_DIR, 'index.html'), 'text/html')
            return

        if path == '/api/health':
            self.send_json_response({
                "status": "ONLINE",
                "system": "ChandraAlign Sub-Pixel Core",
                "sensor_bridge": "CH-2 OHRC (0.25m/px) & LROC NAC (0.50m/px)",
                "ml_backend_connected": False,
                "mock_mode": True,
                "version": "1.0.0-SIH"
            })
            return

        if path == '/api/mock-data' or path == '/api/presets':
            if os.path.exists(MOCK_DATA_PATH):
                with open(MOCK_DATA_PATH, 'r') as f:
                    data = json.load(f)
                self.send_json_response(data)
            else:
                self.send_error(404, "Mock data file not found")
            return

        # Serve static files from frontend/
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/register':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
            
            try:
                req_data = json.loads(body)
            except Exception:
                req_data = {}

            # Load mock dataset for default response or run PyTorch ML pipeline if hooked
            preset_key = req_data.get('preset', 'boguslawsky_south_pole')
            if os.path.exists(MOCK_DATA_PATH):
                with open(MOCK_DATA_PATH, 'r') as f:
                    mock_payload = json.load(f)
                result = mock_payload.get('presets', {}).get(preset_key, {})
            else:
                result = {"status": "ok", "rmse_px": 0.2643}

            self.send_json_response({
                "success": True,
                "message": "Sub-pixel deep homography registration complete",
                "data": result
            })
            return

        self.send_error(404, "Endpoint not found")

    def serve_file(self, filepath, content_type):
        if not os.path.exists(filepath):
            self.send_error(404, f"File not found: {filepath}")
            return
        with open(filepath, 'rb') as f:
            content = f.read()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def send_json_response(self, data):
        payload = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ChandraAlignServerHandler)
    print("=" * 68)
    print(f"  🛰️  ChandraAlign - ISRO Lunar Registration Mission Control")
    print(f"  🌐  Dashboard running at: http://localhost:{PORT}")
    print(f"  📂  Serving UI from: {FRONTEND_DIR}")
    print(f"  🎯  Mock dataset: {MOCK_DATA_PATH}")
    print("=" * 68)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping ChandraAlign Server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
