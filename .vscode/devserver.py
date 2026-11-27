"""Local dev server for peterbrown.space.

Serves the repo root the way GitHub Pages does closely enough for testing:
/about finds about.html, /nonogram finds nonogram/index.html. Nothing is
cached, so a reload always picks up saved changes. Run by the "Dev Server"
task (.vscode/tasks.json), or directly: python3 .vscode/devserver.py [port]
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        # Extensionless URLs fall back to the matching .html file, like Pages.
        path = self.translate_path(self.path)
        if not os.path.exists(path) and os.path.isfile(path + '.html'):
            self.path = self.path.split('?', 1)[0].split('#', 1)[0] + '.html'
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


try:
    server = Server(('127.0.0.1', PORT), functools.partial(Handler, directory=ROOT))
except OSError as e:
    sys.exit(f'Port {PORT} is busy ({e.strerror}). Stop whatever is using it, or pass another port.')

print(f'Serving {ROOT} at http://localhost:{PORT}/  (Ctrl+C to stop)', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
