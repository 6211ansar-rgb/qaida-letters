#!/usr/bin/env python3
"""Teacher-only recorder. Runs on your own computer, never on the website.

    python3 tools/record_server.py        then open http://localhost:5180

Each confirmed recording is cleaned up (silence trimmed, volume evened out),
saved as audio/NN.mp3, and listed in audio/index.json, which the app reads.
"Publish" commits the audio folder and pushes it to GitHub, so Vercel
updates the site. Mum's copy of the app can only play these files; it has
no way to record or change them.
"""
import json, os, subprocess, sys, tempfile, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "audio")
COUNT = 30
PORT = int(os.environ.get("PORT", "5180"))


def index_path():
    return os.path.join(AUDIO, "index.json")


def read_index():
    try:
        with open(index_path()) as f:
            return json.load(f)
    except Exception:
        return {"recorded": []}


def write_index(recorded):
    os.makedirs(AUDIO, exist_ok=True)
    data = {"recorded": sorted(set(recorded)), "v": int(time.time())}
    with open(index_path(), "w") as f:
        json.dump(data, f)
    return data


def clean_to_mp3(src, dst):
    # trim silence at both ends, even out the volume, mono MP3 that every phone plays
    trim = "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08"
    af = f"highpass=f=70,{trim},areverse,{trim},areverse,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.08"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", af,
                    "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "96k", dst], check=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass

    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path in ("/", "/record"):
            self.send_response(302)
            self.send_header("Location", "/tools/record.html")
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):
        url = urlparse(self.path)
        q = parse_qs(url.query)
        try:
            if url.path == "/api/save":
                i = int(q["i"][0])
                if not 0 <= i < COUNT:
                    raise ValueError("bad letter")
                n = int(self.headers.get("Content-Length", 0))
                if not 0 < n < 5_000_000:
                    raise ValueError("bad size")
                blob = self.rfile.read(n)
                os.makedirs(AUDIO, exist_ok=True)
                with tempfile.NamedTemporaryFile(suffix=".rec", delete=False) as t:
                    t.write(blob)
                    tmp = t.name
                try:
                    clean_to_mp3(tmp, os.path.join(AUDIO, f"{i:02d}.mp3"))
                finally:
                    os.unlink(tmp)
                idx = read_index()
                data = write_index(idx["recorded"] + [i])
                return self.send_json({"ok": True, **data})

            if url.path == "/api/publish":
                if not read_index()["recorded"]:
                    return self.send_json({"ok": False, "message": "Nothing recorded yet."}, 400)
                git = lambda *args: subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)
                git("add", "audio")
                if git("diff", "--cached", "--quiet").returncode == 0:
                    return self.send_json({"ok": True, "message": "Already published. Nothing new to send."})
                c = git("commit", "-m", "Update teacher recordings\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")
                if c.returncode:
                    return self.send_json({"ok": False, "message": c.stderr.strip() or c.stdout.strip()}, 500)
                p = git("push")
                if p.returncode:
                    return self.send_json({"ok": False, "message": "Saved, but pushing to GitHub failed: " + p.stderr.strip()}, 500)
                return self.send_json({"ok": True, "message": "Published! The app will update in a minute or two."})

            self.send_json({"ok": False, "message": "Unknown request"}, 404)
        except subprocess.CalledProcessError:
            self.send_json({"ok": False, "message": "Could not process that recording. Try again."}, 500)
        except Exception as e:
            self.send_json({"ok": False, "message": str(e)}, 400)


if __name__ == "__main__":
    print(f"Recorder running: http://localhost:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
