"""Editable notification e-mails: subject + HTML body per mail type, with {shortcodes}.

Admins edit them in Verwaltung -> Einstellungen -> Benachrichtigungen -> "Mail anpassen". The body is
sanitised (allow-list of simple formatting tags, links only http/https/mailto or {link}); shortcode values
are always HTML-escaped, so article titles cannot inject markup. The company header and the unsubscribe
footer are added around every mail and cannot be removed."""
import html
import json
import re
from html.parser import HTMLParser

from app.config import settings
from app.models import AppSetting

KEY = "mail_templates"
KINDS = ("article", "idea", "training")

DEFAULTS = {
    "article": {
        "subject": "{category}: {article}",
        "body": "<h2>{article}</h2><p>{summary}</p><p>{when}</p><p>{button}</p>",
    },
    "idea": {
        "subject": "Ihre Idee: {status}",
        "body": "<h2>„{idea}“</h2><p>Hallo {first_name}, Ihre Idee hat einen neuen Status: <b>{status}</b>.</p>"
                "<p>{answer}</p><p>{button}</p>",
    },
    "training": {
        "subject": "Schulung für Sie: {training}",
        "body": "<h2>{training}</h2><p>Hallo {first_name}, im Intranet wartet eine Schulung auf Sie. Bitte arbeiten Sie "
                "sie durch und bestätigen Sie am Ende mit „durchgearbeitet und verstanden“.</p><p>{round}</p>"
                "<p>{due}</p><p>{button}</p>",
    },
}

# shortcode -> (description DE, description EN); {button} and {link} exist for every kind
SHORTCODES = {
    "article": {
        "article": ("Titel des Beitrags", "Title of the post"),
        "summary": ("Kurztext", "Summary"),
        "category": ("Rubrik, z. B. Termin", "Category, e.g. event"),
        "when": ("Bei Terminen: Datum, Uhrzeit, Ort", "For events: date, time, place"),
        "author": ("Autor:in", "Author"),
    },
    "idea": {
        "idea": ("Titel der Idee", "Title of the idea"),
        "status": ("Neuer Status", "New status"),
        "answer": ("Antwort der Redaktion", "Answer of the editors"),
    },
    "training": {
        "training": ("Titel der Schulung", "Title of the training"),
        "due": ("Fälligkeit, z. B. „Bitte erledigen bis 31.12.2026.“", "Due date, e.g. “Please complete by …”"),
        "round": ("Hinweis bei neuer Runde", "Note for a new round"),
    },
}
COMMON = {
    "name": ("Name der Empfänger:in", "Recipient's name"),
    "first_name": ("Vorname der Empfänger:in", "Recipient's first name"),
    "company": ("Firmenname", "Company name"),
    "link": ("Adresse im Intranet", "Address in the intranet"),
    "button": ("Knopf „Öffnen“ mit Link", "“Open” button with link"),
}

SAMPLE = {
    "article": {"article": "Sommerfest am 12. Juli", "summary": "Grillen, Musik und Kinderprogramm im Hof.",
                "category": "Termin", "when": "Wann: 12.07.2027, 16:00 Uhr · Wo: Innenhof", "author": "Lea Hoffmann",
                "path": "/news"},
    "idea": {"idea": "Fahrradständer am Lager", "status": "Geplant", "answer": "Antwort: Wird im Frühjahr umgesetzt.",
             "path": "/ideas"},
    "training": {"training": "Unterweisung Brandschutz 2027", "due": "Bitte erledigen bis 31.03.2027.",
                 "round": "Neue Runde – bitte erneut bestätigen.", "path": "/trainings"},
}
BUTTON_LABEL = {"article": "Weiterlesen", "idea": "Zur Idee", "training": "Zur Schulung"}

FOOTER = ("Sie erhalten diese Nachricht, weil Benachrichtigungen in Ihrem Profil eingeschaltet sind. "
          "Abbestellen: Intranet → Profil → Benachrichtigungen.")
# Assigned trainings are mandatory, so this mail cannot be unsubscribed.
FOOTERS = {"training": "Sie erhalten diese Nachricht, weil Ihnen im Intranet eine Schulung zugewiesen wurde."}


# --- sanitising ------------------------------------------------------------------------------------------
ALLOWED = {"p", "br", "b", "strong", "i", "em", "u", "a", "ul", "ol", "li", "h2", "h3", "blockquote", "div", "span"}
VOID = {"br"}
DROP_CONTENT = {"script", "style", "iframe", "object", "embed", "head", "title", "template", "svg", "math"}


class _Clean(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.open: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in DROP_CONTENT:
            self.skip += 1
            return
        if self.skip or tag not in ALLOWED:
            return
        extra = ""
        if tag == "a":
            href = (dict(attrs).get("href") or "").strip()
            if href == "{link}" or re.match(r"^(https?:|mailto:)", href, re.I):
                extra = f' href="{html.escape(href, quote=True)}"'
        self.out.append(f"<{tag}{extra}>")
        if tag not in VOID:
            self.open.append(tag)

    def handle_startendtag(self, tag, attrs):
        if tag in VOID and not self.skip:
            self.out.append(f"<{tag}>")

    def handle_endtag(self, tag):
        if tag in DROP_CONTENT:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip or tag not in self.open:
            return
        while self.open:  # close everything opened after it, too
            t = self.open.pop()
            self.out.append(f"</{t}>")
            if t == tag:
                break

    def handle_data(self, data):
        if not self.skip:
            self.out.append(html.escape(data, quote=False))


def sanitize(body: str) -> str:
    p = _Clean()
    p.feed(body or "")
    p.close()
    return "".join(p.out) + "".join(f"</{t}>" for t in reversed(p.open))


def clean_subject(subject: str) -> str:
    return re.sub(r"\s+", " ", subject or "").strip()[:200]


# --- storage ---------------------------------------------------------------------------------------------
def load(db) -> dict:
    """Saved templates merged with the defaults; `custom` tells whether a kind was changed."""
    row = db.get(AppSetting, KEY)
    try:
        saved = json.loads(row.value) if row else {}
    except ValueError:
        saved = {}
    out = {}
    for kind in KINDS:
        s = saved.get(kind) or {}
        out[kind] = {"subject": s.get("subject") or DEFAULTS[kind]["subject"],
                     "body": s.get("body") or DEFAULTS[kind]["body"],
                     "custom": bool(s.get("subject") or s.get("body"))}
    return out


def save(db, templates: dict) -> dict:
    data = {}
    for kind in KINDS:
        t = templates.get(kind) or {}
        subject, body = clean_subject(t.get("subject", "")), sanitize(t.get("body", ""))
        data[kind] = {"subject": "" if subject == DEFAULTS[kind]["subject"] else subject,
                      "body": "" if body == DEFAULTS[kind]["body"] or not re.sub(r"<[^>]+>|\s", "", body) else body}
    row = db.get(AppSetting, KEY)
    if row is None:
        db.add(AppSetting(key=KEY, value=json.dumps(data)))
    else:
        row.value = json.dumps(data)
    db.commit()
    return load(db)


# --- rendering -------------------------------------------------------------------------------------------
def _button(url: str, label: str) -> str:
    if not url.startswith("http"):
        return ""
    e = html.escape
    return (f'<a href="{e(url)}" style="display:inline-block;background:#3557f5;color:#fff;padding:10px 18px;'
            f'border-radius:8px;text-decoration:none;font-weight:600">{e(label)}</a>')


def _fill(text: str, values: dict, escape: bool) -> str:
    def rep(m):
        key = m.group(1)
        if key not in values:
            return m.group(0)
        v = values[key]
        return v if key == "button" else (html.escape(v) if escape else v)
    return re.sub(r"\{([a-z_]+)\}", rep, text)


class _Text(HTMLParser):
    """HTML -> readable plain text for the text/plain part."""
    BLOCK = {"p", "div", "h2", "h3", "li", "blockquote", "ul", "ol"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.href = ""

    def handle_starttag(self, tag, attrs):
        if tag == "br":
            self.parts.append("\n")
        elif tag == "li":
            self.parts.append("\n- ")
        elif tag in self.BLOCK:
            self.parts.append("\n\n")
        if tag == "a":
            self.href = dict(attrs).get("href") or ""

    def handle_endtag(self, tag):
        if tag == "a" and self.href:
            self.parts.append(f" ({self.href})")
            self.href = ""
        elif tag in self.BLOCK:
            self.parts.append("\n\n")

    def handle_data(self, data):
        self.parts.append(data)


def to_text(body_html: str) -> str:
    p = _Text()
    p.feed(body_html)
    text = "".join(p.parts)
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+\n", "\n", text)).strip()


def render(kind: str, template: dict, values: dict, url: str) -> tuple[str, str, str]:
    """Returns (subject, html, text) for one recipient."""
    vals = {k: str(v or "") for k, v in values.items()}
    vals.setdefault("company", settings.company_name)
    vals["link"] = url
    vals["button"] = _button(url, BUTTON_LABEL.get(kind, "Öffnen"))
    subject = clean_subject(_fill(template["subject"], vals, escape=False))
    body = _fill(sanitize(template["body"]), vals, escape=True)
    body = re.sub(r"<(p|div|h2|h3|li)>\s*</\1>", "", body)  # shortcodes that were empty
    footer = FOOTERS.get(kind, FOOTER)
    e = html.escape
    page = (f'<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;color:#111;font-size:15px;line-height:1.5">'
            f'<p style="color:#667;font-size:13px;margin:0">{e(settings.company_name)} · Intranet</p>'
            f'{body}<p style="color:#889;font-size:12px;margin-top:28px">{e(footer)}</p></div>')
    text = to_text(body.replace(vals["button"], "")) + (f"\n\n{url}" if url.startswith("http") else "") + f"\n\n{footer}\n"
    return subject, page, text
