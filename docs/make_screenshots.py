"""Erzeugt die Screenshots in docs/screenshots/ mit einem lokalen Chrome (headless, DevTools-Protokoll).

Voraussetzungen: laufender Server mit Demodaten (python seed.py), Google Chrome, `pip install websocket-client`.
Das Admin-Passwort (von seed.py angezeigt) per --password oder Umgebungsvariable LOTSE_DEMO_ADMIN_PASSWORD.

    python docs/make_screenshots.py --password <admin-passwort>     # http://127.0.0.1:8000
    python docs/make_screenshots.py --url http://intranet:8000 --chrome "C:/Program Files/Google/Chrome/Application/chrome.exe"
"""

import argparse
import base64
import json
import os
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket  # websocket-client

OUT = Path(__file__).resolve().parent / "screenshots"
WIDTH, HEIGHT = 1440, 900


class Browser:
    def __init__(self, chrome: str, port: int = 9333):
        self.profile = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.proc = subprocess.Popen([
            chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--lang=de-DE",
            f"--remote-debugging-port={port}", f"--user-data-dir={self.profile.name}",
            f"--window-size={WIDTH},{HEIGHT}", "about:blank",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                pages = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
                page = next(p for p in pages if p["type"] == "page")
                break
            except Exception:
                time.sleep(0.2)
        else:
            raise RuntimeError("Chrome did not start")
        self.ws = websocket.create_connection(page["webSocketDebuggerUrl"], max_size=None)
        self.seq = 0
        self.send("Page.enable")
        self.send("Emulation.setDeviceMetricsOverride", width=WIDTH, height=HEIGHT, deviceScaleFactor=1, mobile=False)

    def send(self, method, **params):
        self.seq += 1
        self.ws.send(json.dumps({"id": self.seq, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.seq:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    def js(self, expression):
        res = self.send("Runtime.evaluate", expression=expression, awaitPromise=True, returnByValue=True)
        return res.get("result", {}).get("value")

    def goto(self, url, wait=1.8):
        self.send("Page.navigate", url=url)
        for _ in range(100):
            if self.js("document.readyState") == "complete":
                break
            time.sleep(0.1)
        self.js("document.fonts.ready.then(() => true)")
        time.sleep(wait)

    def theme(self, dark: bool):
        self.send("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark" if dark else "light"}])

    def shot(self, name, full=False):
        if full:  # whole page: make the viewport as tall as the page so fixed elements (sidebar) span it
            height = self.js("document.documentElement.scrollHeight")
            self.send("Emulation.setDeviceMetricsOverride", width=WIDTH, height=height, deviceScaleFactor=1, mobile=False)
            time.sleep(1.0)
        data = self.send("Page.captureScreenshot", format="png")["data"]
        if full:
            self.send("Emulation.setDeviceMetricsOverride", width=WIDTH, height=HEIGHT, deviceScaleFactor=1, mobile=False)
        (OUT / name).write_bytes(base64.b64decode(data))
        print("saved", OUT / name)

    def close(self):
        self.ws.close()
        self.proc.terminate()
        try:
            self.proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self.proc.kill()
        self.profile.cleanup()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--chrome", default="C:/Program Files/Google/Chrome/Application/chrome.exe")
    ap.add_argument("--user", default="admin")
    ap.add_argument("--password", default=os.environ.get("LOTSE_DEMO_ADMIN_PASSWORD"),
                    help="admin password shown by seed.py (or env LOTSE_DEMO_ADMIN_PASSWORD)")
    ap.add_argument("--staff-password", default=os.environ.get("LOTSE_DEMO_PASSWORD"),
                    help="password of the other demo accounts (or env LOTSE_DEMO_PASSWORD); optional, for the employee views")
    args = ap.parse_args()
    if not args.password:
        ap.error("admin password missing: --password or LOTSE_DEMO_ADMIN_PASSWORD")
    base = args.url.rstrip("/")
    OUT.mkdir(parents=True, exist_ok=True)
    b = Browser(args.chrome)

    def session(theme, login, user=None, password=None):
        b.goto(base + "/", wait=0.3)
        token = "null"
        if login:
            token = b.js(f"""fetch('/api/auth/login', {{method: 'POST', headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{username: {json.dumps(user or args.user)}, password: {json.dumps(password or args.password)}}})}})
                .then(r => r.json()).then(r => JSON.stringify(r.access_token))""")
        b.js(f"""localStorage.setItem('lotse-lang', 'de'); localStorage.setItem('lotse-theme', '{theme}');
                 {'localStorage.setItem("lotse-token", ' + token + ')' if login else 'localStorage.removeItem("lotse-token")'}; true""")
        b.theme(theme == "dark")

    def find(expr):
        return b.js(f"fetch({expr}).then(r => r.json())")

    try:
        session("light", login=False)
        b.goto(base + "/", wait=2.5)
        b.shot("01-startseite.png", full=True)
        b.goto(base + "/calendar")
        b.shot("03-veranstaltungen.png")
        b.goto(base + "/calendar?view=calendar")
        b.js("window.scrollTo(0, 150)")
        time.sleep(0.4)
        b.shot("04-kalender.png")
        b.goto(base + "/people")
        b.shot("05-mitarbeitende.png")
        mehmet = find("'/api/users?q=Mehmet'")[0]["id"]
        b.goto(f"{base}/people?view=plan&focus={mehmet}", wait=2.5)
        b.shot("06-lageplan.png")
        b.goto(f"{base}/people?view=org", wait=2)
        b.shot("22-organigramm.png")
        b.goto(base + "/ideas")
        b.shot("07-ideen.png")
        b.goto(base + "/board")
        b.shot("08-kleinanzeigen.png")
        b.goto(base + "/polls")
        b.shot("21-umfragen.png")
        b.goto(base + "/documents")
        b.shot("13-dokumente.png")
        b.js("[...document.querySelectorAll('main ul li button')].find(x => x.textContent.includes('KI Nutzung')).click()")
        time.sleep(2.5)
        b.shot("09-dokument-viewer.png")
        summer = next(e for e in find("'/api/events?from=2025-01-01&to=2027-12-31'") if e["photo_count"])
        b.goto(f"{base}/articles/{summer['id']}")
        b.js("[...document.querySelectorAll('main section button')].find(x => x.querySelector('img')).click()")
        time.sleep(1.5)
        b.shot("10-galerie.png")
        b.goto(base + "/search?q=Lager", wait=2)
        b.shot("19-suche.png", full=True)
        b.goto(base + "/", wait=1.5)  # results while typing
        b.js("document.querySelector('header input[role=combobox]').focus()")
        b.send("Input.insertText", text="Besprechung")
        time.sleep(1.5)
        b.shot("20-suche-live.png")
        b.goto(base + "/login")
        b.shot("12-anmeldung.png")

        session("dark", login=True)
        b.goto(base + "/")
        b.shot("02-startseite-dunkel.png")
        b.goto(base + "/admin?tab=settings")
        b.js("[...document.querySelectorAll('h2')].find(h => h.textContent.includes('LDAP')).scrollIntoView({block: 'start'}); window.scrollBy(0, -90)")
        time.sleep(0.5)
        b.shot("11-verwaltung-ldap.png")

        session("light", login=True)
        b.goto(base + "/admin")
        b.js("[...document.querySelectorAll('[role=tab]')].find(x => x.textContent.includes('Etagen')).click(); true")
        time.sleep(0.8)
        b.js("[...document.querySelectorAll('[role=tab]')].find(x => x.textContent.trim() === 'Räume').click(); true")
        time.sleep(0.8)
        b.js("[...document.querySelectorAll('aside li button')].find(x => x.textContent.includes('Besprechung Elbe')).click(); true")
        time.sleep(0.8)
        b.shot("14-raum-editor.png")

        b.goto(base + "/admin?tab=trainings", wait=2)
        b.shot("16-schulungen-verwaltung.png")
        b.js("[...document.querySelectorAll('main li')].find(li => li.textContent.includes('Datenschutz-Unterweisung'))"
             ".querySelectorAll('button')[1].click(); true")
        time.sleep(1.2)
        b.shot("17-schulung-bearbeiten.png")
        b.goto(base + "/admin?tab=quicklinks", wait=1.5)
        b.shot("18-schnellzugriff-verwaltung.png")
        b.goto(base + "/admin?tab=home", wait=1.5)
        b.shot("23-startseite-gestalten.png")

        if args.staff_password:  # employee view: only the person's own trainings
            session("light", login=True, user="ahmed.haddad", password=args.staff_password)
            b.goto(base + "/trainings", wait=2)
            b.shot("15-meine-schulungen.png")
    finally:
        b.close()


if __name__ == "__main__":
    main()
