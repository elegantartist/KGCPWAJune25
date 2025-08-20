#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = "."

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Serving files at http://localhost:{PORT}")
    print(f"Download link: http://localhost:{PORT}/keep-going-care-aws-deployment.tar.gz")
    httpd.serve_forever()