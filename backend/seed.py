"""Demo data: users, floors + warehouses with generated SVG plans, bilingual articles, notices.

Run once:  python seed.py          (refuses to touch a database that already has users)
Reset:     python seed.py --reset  (drops all tables first)
"""

import math
import os
import random
import secrets
import shutil
import sys
from pathlib import Path
from datetime import date, datetime, timedelta

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.models import (DEFAULT_DEPARTMENTS, Article, Attachment, Classified, Department, EventRsvp, Idea, IdeaVote, Location,
                        QuickLink, Room, Seat, Training, TrainingCompletion, TrainingGroup, TrainingGroupMember,
                        TrainingMaterial, TrainingTarget, User, Poll, PollVote, Branch, Jubilee)
from app.security import hash_password

random.seed(7)
UP = settings.upload_dir

# Palette shared with the frontend tokens.
BLUE, BLUE_D, INK, PAPER, SIGNAL, GREEN, RED, SKY = (
    "#1F4FD1", "#163A9C", "#17202B", "#F3F5F7", "#F5C400", "#1E8A5B", "#C8402E", "#DCE6FB")


def write(name: str, svg: str) -> str:
    (UP / name).write_text(svg, encoding="utf-8")
    return f"/uploads/{name}"


# ---------------------------------------------------------------------------
# Banner illustrations (1600 x 640)
# ---------------------------------------------------------------------------


def svg_wrap(body: str, bg: str, w=1600, h=640) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')


def banner_christmas() -> str:
    parts = []
    for i in range(70):  # snow / stars
        x, y, r = random.randint(0, 1600), random.randint(0, 420), random.choice([1.5, 2, 2.5, 3])
        parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity="{random.uniform(.35, .9):.2f}"/>')
    # string of lights across the top
    wave = [(x, 60 + 34 * math.sin(x / 130)) for x in range(0, 1601, 20)]
    parts.append('<polyline points="' + " ".join(f"{x},{y:.0f}" for x, y in wave)
                 + '" fill="none" stroke="#9fb3e8" stroke-width="2" opacity=".6"/>')
    for x, y in wave[1::4]:
        parts.append(f'<circle cx="{x}" cy="{y + 9:.0f}" r="7" fill="{SIGNAL}"/>')
    # stylised firs on the right
    for i, (cx, s) in enumerate([(1080, 1.0), (1250, 1.35), (1430, 0.9), (1530, 1.15)]):
        base, h = 640, 330 * s
        for k in range(3):
            top = base - h + k * h * 0.22
            wdt = 90 * s + k * 55 * s
            parts.append(f'<polygon points="{cx},{top:.0f} {cx - wdt:.0f},{top + h * 0.42:.0f} '
                         f'{cx + wdt:.0f},{top + h * 0.42:.0f}" fill="{GREEN if i % 2 else "#14684A"}"/>')
    return svg_wrap("".join(parts), "#10224F")


def banner_safety() -> str:
    stripes = "".join(f'<polygon points="{x},640 {x + 60},640 {x + 260},440 {x + 200},440" fill="{INK}"/>'
                      for x in range(-200, 1700, 120))
    return svg_wrap(
        f'<rect y="440" width="1600" height="200" fill="{SIGNAL}"/>{stripes}'
        f'<circle cx="1230" cy="250" r="150" fill="{SIGNAL}"/>'
        f'<path d="M1080 270 a150 150 0 0 1 300 0 z" fill="#fff" opacity=".92"/>'
        f'<rect x="1060" y="262" width="340" height="26" rx="13" fill="#fff"/>'
        f'<rect x="1215" y="120" width="30" height="150" rx="10" fill="{SIGNAL}"/>',
        "#2B3644")


def banner_cyber() -> str:
    cells = []
    for row in range(10):
        for col in range(26):
            if random.random() < 0.55:
                x, y = 760 + col * 32, 60 + row * 52
                op = random.uniform(.15, .8)
                cells.append(f'<rect x="{x}" y="{y}" width="22" height="34" rx="4" fill="{SKY}" opacity="{op:.2f}"/>')
    lock = (f'<rect x="300" y="290" width="260" height="210" rx="26" fill="{SIGNAL}"/>'
            f'<path d="M350 290 v-60 a80 80 0 0 1 160 0 v60" fill="none" stroke="{SIGNAL}" stroke-width="34"/>'
            f'<circle cx="430" cy="380" r="26" fill="{INK}"/><rect x="418" y="390" width="24" height="60" rx="8" fill="{INK}"/>')
    return svg_wrap("".join(cells) + lock, BLUE_D)


def banner_product() -> str:
    def box(x, y, s, top, left, right):
        return (f'<polygon points="{x},{y} {x + s},{y - s / 2} {x + 2 * s},{y} {x + s},{y + s / 2}" fill="{top}"/>'
                f'<polygon points="{x},{y} {x + s},{y + s / 2} {x + s},{y + 1.5 * s} {x},{y + s}" fill="{left}"/>'
                f'<polygon points="{x + s},{y + s / 2} {x + 2 * s},{y} {x + 2 * s},{y + s} {x + s},{y + 1.5 * s}" fill="{right}"/>')
    body = (box(980, 300, 150, "#E9C77A", "#C99A3E", "#B07F2A") + box(1130, 375, 150, "#E9C77A", "#C99A3E", "#B07F2A")
            + box(1055, 162, 150, SIGNAL, "#D9A800", "#BF9200") + box(1280, 300, 110, "#F7F1E3", "#D9CCAE", "#C4B594"))
    return svg_wrap(f'<rect y="560" width="1600" height="80" fill="#C9D6F2"/>{body}', "#E6ECF8")


def banner_people() -> str:
    body = []
    colors = [BLUE, SIGNAL, GREEN, "#7C93D9", RED, "#9AA9C2"]
    for i in range(7):
        cx = 820 + i * 115 + (30 if i % 2 else 0)
        cy = 330 + (60 if i % 2 else 0)
        c = colors[i % len(colors)]
        body.append(f'<circle cx="{cx}" cy="{cy}" r="48" fill="{c}"/>'
                    f'<path d="M{cx - 80} {cy + 260} a80 120 0 0 1 160 0 z" fill="{c}" opacity=".85"/>')
    return svg_wrap("".join(body), SKY)


BANNERS = {"christmas": banner_christmas, "safety": banner_safety, "cyber": banner_cyber,
           "product": banner_product, "people": banner_people}


def make_pdf(title: str, lines: list[str]) -> bytes:
    """Minimal one-page PDF (Helvetica, WinAnsi) – enough for the document library demo."""
    def esc(t: str) -> str:
        return t.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = ["BT", "/F1 22 Tf", "60 780 Td", f"({esc(title)}) Tj", "/F1 11 Tf", "0 -34 Td", "16 TL"]
    for line in lines:
        text.append(f"({esc(line)}) '")
    text.append("ET")
    stream = "\n".join(text).encode("cp1252", "replace")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


DEMO_PHOTOS = Path(__file__).resolve().parent / "demo" / "photos"  # real photos, see docs/CREDITS.md


def photo(name: str) -> str:
    """Copy a bundled demo photo into the upload folder and return its URL."""
    shutil.copyfile(DEMO_PHOTOS / name, UP / name)
    return f"/uploads/{name}"


def gallery(*items: tuple[str, str]) -> list[dict]:
    return [{"url": photo(file), "name": caption, "kind": "image", "size": (DEMO_PHOTOS / file).stat().st_size}
            for file, caption in items]


# Real photos for the demo (docs/CREDITS.md): title image and extra gallery photos per article (by German title),
# photos for classifieds (by title) and a portrait per person (demo/photos/avatar-<username>.jpg).
ARTICLE_PHOTOS: dict[str, tuple[str | None, list[tuple[str, str]]]] = {
    "Rekordquartal im Versand": ("versand-stapler.jpg", [
        ("versand-halle.jpg", "Hochbetrieb in der Halle"), ("versand-gabelstapler.jpg", "Nachschub für die Packplätze"),
        ("versand-tor.jpg", "Verladung am Tor 3"), ("versand-hof.jpg", "Feierabend nach der Rekordwoche")]),
    "Neue Fahrwege im Lager Süd": ("lager-fahrweg.jpg", []),
    "Phishing-Welle: Gefälschte Paketbenachrichtigungen": ("phishing.jpg", []),
    "Neu im Sortiment: Mehrweg-Versandbox M": ("versandbox.jpg", []),
    "Kantine: neue Öffnungszeiten": ("kantine.jpg", []),
    "Erste-Hilfe-Auffrischung": ("erste-hilfe-1.jpg", [
        ("erste-hilfe-1.jpg", "Herzdruckmassage üben"), ("erste-hilfe-2.jpg", "Ablauf mit dem Trainer")]),
    "Laufgruppe: Firmenlauf-Training": ("laufgruppe-1.jpg", [
        ("laufgruppe-1.jpg", "Dienstagsrunde"), ("laufgruppe-2.jpg", "Tempo-Training im Park"),
        ("laufgruppe-3.jpg", "Die letzten Meter")]),
    "Mobiles Arbeiten – Richtlinie 2026": ("mobiles-arbeiten.jpg", []),
    "Urlaubsplanung und Vertretung": ("urlaubsplanung.jpg", []),
    "Ergonomie am Bildschirmarbeitsplatz": ("ergonomie.jpg", []),
    "Passwörter und Passkeys": ("passwoerter.jpg", []),
    "Drucker im 1. OG einrichten": ("drucker.jpg", []),
    "Wareneingang richtig buchen": ("wareneingang.jpg", []),
    "Inventur 2026: Ablauf und Zeiten": ("inventur.jpg", []),
    "Jahresplanung 2027: Inventur, Audit, Betriebsferien": ("jahresplanung.jpg", []),
    "Entwurf: Neues Parkkonzept": ("parkplatz.jpg", []),
    "Neujahrsempfang 2027": ("neujahr-1.jpg", [
        ("neujahr-1.jpg", "Anstoßen um Mitternacht"), ("neujahr-2.jpg", "Prost auf 2027"),
        ("neujahr-3.jpg", "Sekt im Foyer"), ("neujahr-4.jpg", "Empfang im Showroom"), ("neujahr-5.jpg", "Gute Gespräche")]),
    "Betriebsausflug an die Elbe": (None, [
        ("ausflug-teamspiel.jpg", "Pause auf der Wiese"), ("ausflug-jubel.jpg", "Das Siegerteam"),
        ("ausflug-handschlag.jpg", "Fair geht vor")]),
    "Team-Workshop Vertrieb & Einkauf": (None, [
        ("workshop-laptop.jpg", "Zahlen live am Laptop"), ("workshop-runde.jpg", "Abschlussrunde"),
        ("workshop-team.jpg", "Nächste Schritte")]),
}
CLASSIFIED_PHOTOS = {"Kinderfahrrad 20 Zoll": "anzeige-kinderfahrrad.jpg",
                     "Fahrgemeinschaft aus Lüneburg": "anzeige-fahrgemeinschaft.jpg",
                     "Zimmerpflanzen zu verschenken": "anzeige-monstera.jpg"}


def add_demo_photos(db) -> int:
    """Real photos for staff, articles, galleries and classifieds. Fills only what is empty (generated SVG banners
    count as empty), so it is safe on an existing database: `seed.py --photos`."""
    n = 0
    for u in db.query(User).filter(User.avatar_url.is_(None)).all():
        if (DEMO_PHOTOS / f"avatar-{u.username}.jpg").exists():
            u.avatar_url = photo(f"avatar-{u.username}.jpg")
            n += 1
    for title, (cover, items) in ARTICLE_PHOTOS.items():
        article = db.query(Article).filter(Article.title_de == title).first()
        if article is None:
            continue
        if cover and (not article.image_url or article.image_url.endswith(".svg")):
            article.image_url = photo(cover)
            n += 1
        present = db.query(Attachment).filter(Attachment.article_id == article.id).all()
        urls, sort = {a.url for a in present}, len(present)
        for item in gallery(*[(f, c) for f, c in items if f"/uploads/{f}" not in urls]):
            db.add(Attachment(article_id=article.id, sort=sort, **item))
            sort += 1
            n += 1
    for c in db.query(Classified).filter(Classified.image_url.is_(None)).all():
        if c.title in CLASSIFIED_PHOTOS:
            c.image_url = photo(CLASSIFIED_PHOTOS[c.title])
            n += 1
    return n


def write_pdf(name: str, title: str, lines: list[str]) -> dict:
    data = make_pdf(title, lines)
    (UP / name).write_bytes(data)
    return {"url": f"/uploads/{name}", "name": name, "kind": "pdf", "size": len(data)}



ISO_TITLE = "Managementsystem: ISO-Dokumente"

ISO_DOCS = [
    ("ISO-9001-Zertifikat-2026.pdf", "Zertifikat ISO 9001:2015", [
        "Die Muster GmbH betreibt ein Qualitätsmanagementsystem nach DIN EN ISO 9001:2015.",
        "Geltungsbereich: Einkauf, Lagerung, Versand und Fulfillment, Vertrieb, Verwaltung.",
        "Standorte: Verwaltungsgebäude (EG, 1. OG, 2. OG), Lager Nord, Lager Süd.",
        "Gültig bis: 30.11.2029. Nächstes Überwachungsaudit: November 2027.",
        "Demo-Dokument – kein echtes Zertifikat."]),
    ("QM-Handbuch-ISO-9001.pdf", "Qualitätsmanagement-Handbuch (ISO 9001)", [
        "1. Kontext der Organisation und interessierte Parteien",
        "2. Qualitätspolitik und Qualitätsziele 2026",
        "3. Rollen und Verantwortlichkeiten, QM-Beauftragte:r",
        "4. Prozesslandkarte: Kern-, Führungs- und Unterstützungsprozesse",
        "5. Lenkung dokumentierter Information",
        "6. Interne Audits, Managementbewertung, Korrekturmaßnahmen",
        "Version 4.2, freigegeben durch die Geschäftsführung"]),
    ("Qualitaetspolitik.pdf", "Qualitätspolitik", [
        "Wir liefern richtig, vollständig und pünktlich.",
        "Kundenanforderungen und gesetzliche Vorgaben sind die Grundlage unserer Arbeit.",
        "Fehler sehen wir als Chance: Ursachen finden, Maßnahmen umsetzen, Wirkung prüfen.",
        "Jede:r Mitarbeitende kann Verbesserungen über die Ideenbox einbringen."]),
    ("Umweltpolitik-ISO-14001.pdf", "Umweltpolitik (ISO 14001)", [
        "Wir senken Verpackungsmaterial und Energieverbrauch in beiden Lagerhallen.",
        "Ziel 2027: 15 % weniger Folie im Versand, 100 % Ökostrom.",
        "Abfälle werden getrennt: Papier, Folie, Holzpaletten, Restmüll.",
        "Umweltaspekte werden jährlich bewertet."]),
    ("Leitlinie-Informationssicherheit-ISO-27001.pdf", "Leitlinie Informationssicherheit (ISO 27001)", [
        "Schutzziele: Vertraulichkeit, Integrität, Verfügbarkeit.",
        "Zugriff nur nach dem Need-to-know-Prinzip, Berechtigungen jährlich prüfen.",
        "Sicherheitsvorfälle sofort an it@muster-gmbh.de melden.",
        "Diese Leitlinie gilt für alle Mitarbeitenden und Dienstleister."]),
    ("VA-Lenkung-dokumentierter-Information.pdf", "VA: Lenkung dokumentierter Information", [
        "Zweck: Erstellung, Prüfung, Freigabe und Archivierung von Dokumenten.",
        "Jedes Dokument hat Version, Verantwortliche:n und Freigabedatum.",
        "Gültig ist nur die Version im Intranet (Dokumente). Ausdrucke sind ungelenkt.",
        "Aufbewahrung von Aufzeichnungen: mindestens 10 Jahre."]),
    ("Auditprogramm-2027.pdf", "Internes Auditprogramm 2027", [
        "Februar: Einkauf und Lieferantenbewertung",
        "April: Wareneingang Lager Nord",
        "Juni: Versand und Fulfillment",
        "September: IT und Informationssicherheit",
        "Oktober: Managementbewertung"]),
]


POLICY_TITLE = "Richtlinien: Datenschutz, Entsorgung und KI"

POLICY_DOCS = [
    ("Richtlinie-Datenschutz-DSGVO.pdf", "Richtlinie Datenschutz (DSGVO)", [
        "Personenbezogene Daten nur verarbeiten, wenn es für die Aufgabe nötig ist.",
        "Kunden- und Mitarbeiterdaten nie auf private Geräte oder private Cloud-Speicher kopieren.",
        "Bildschirm sperren beim Verlassen des Platzes (Windows + L).",
        "Auskunfts- und Löschanfragen sofort an datenschutz@muster-gmbh.de weiterleiten.",
        "Datenpannen innerhalb von 24 Stunden melden – die Meldefrist an die Behörde beträgt 72 Stunden.",
        "Datenschutzbeauftragte:r: extern, erreichbar über datenschutz@muster-gmbh.de"]),
    ("Richtlinie-KI-Nutzung.pdf", "Richtlinie zur Nutzung von KI-Diensten", [
        "Keine Firmendokumente, Kundendaten, Preise, Verträge oder personenbezogenen Daten",
        "an externe KI-Dienste hochladen oder in deren Eingabefelder kopieren",
        "(z. B. öffentliche Chatbots, Übersetzer, Text- und Bildgeneratoren).",
        "Erlaubt sind nur von der IT freigegebene Werkzeuge – Liste im Intranet unter Wissen & Regeln.",
        "KI-Ergebnisse immer selbst prüfen, bevor sie verwendet oder weitergegeben werden.",
        "Unsicher? Vorher die IT fragen: it@muster-gmbh.de.",
        "Verstöße können arbeitsrechtliche Folgen haben."]),
    ("Richtlinie-Vernichtung-von-Dokumenten.pdf", "Vernichtung von Dokumenten und Datenträgern", [
        "Vertrauliche Papiere gehören in die verschlossenen Datenschutztonnen (je Etage und im Lager).",
        "Niemals vertrauliche Unterlagen ins Altpapier werfen.",
        "Die Tonnen werden von einem zertifizierten Dienstleister nach DIN 66399 geleert.",
        "Sicherheitsstufe: mindestens P-4 für personenbezogene Daten.",
        "Festplatten, USB-Sticks und Handys zur Vernichtung bei der IT abgeben.",
        "Aufbewahrungsfristen beachten: Buchhaltung 10 Jahre, Geschäftsbriefe 6 Jahre."]),
    ("Abfalltrennung.pdf", "Abfalltrennung im Büro und Lager", [
        "Blau – Papier und Pappe (keine vertraulichen Unterlagen!)",
        "Gelb – Verpackungen aus Kunststoff und Metall, Stretchfolie",
        "Braun – Bioabfall (Küchen im EG, 1. OG, 2. OG)",
        "Schwarz/grau – Restmüll",
        "Glas – Container am Parkplatz, nach Farben getrennt",
        "Holzpaletten: Sammelplatz Lager Süd, Tor 4",
        "Batterien, Toner, Elektrogeräte: Sammelbox am Empfang",
        "Kartonagen aus dem Versand zusammenfalten und in die Presse geben."]),
]


def _add_article_with_pdfs(db, author_id: int, created: datetime, docs: list, **fields) -> bool:
    if db.query(Article).filter(Article.title_de == fields["title_de"]).first():
        return False
    article = Article(author_id=author_id, created_at=created, published_at=created, **fields)
    db.add(article)
    db.flush()
    for i, (name, title, lines) in enumerate(docs):
        db.add(Attachment(article_id=article.id, sort=i, **write_pdf(name, title, lines)))
    return True


def add_iso_documents(db, author_id: int, now: datetime) -> bool:
    """ISO management-system documents and company policies (data protection, disposal, AI).
    Idempotent; returns False if both articles already exist."""
    iso = _add_article_with_pdfs(
        db, author_id, now - timedelta(days=9), ISO_DOCS, category="rules", title_de=ISO_TITLE,
        title_en="Management system: ISO documents",
        summary_de="Zertifikat, Handbuch, Politiken und Verfahrensanweisungen nach ISO 9001, 14001 und 27001.",
        summary_en="Certificate, manual, policies and procedures under ISO 9001, 14001 and 27001.",
        body_de="## Unser Managementsystem\n\nWir sind nach **ISO 9001** zertifiziert und richten Umwelt- "
                "und Informationssicherheit an **ISO 14001** und **ISO 27001** aus.\n\n"
                "Gültig ist immer die Version hier im Intranet. Fragen an das QM-Team.",
        body_en="## Our management system\n\nWe are **ISO 9001** certified and align environmental and "
                "information security with **ISO 14001** and **ISO 27001**.\n\n"
                "The version in the intranet is always the valid one. Questions to the QM team.")
    policies = _add_article_with_pdfs(
        db, author_id, now - timedelta(days=5), POLICY_DOCS, category="rules", title_de=POLICY_TITLE,
        title_en="Policies: data protection, disposal and AI",
        summary_de="Datenschutz, Aktenvernichtung, Mülltrennung und: keine Firmendokumente an externe KI-Dienste.",
        summary_en="Data protection, document destruction, waste separation and: no company documents to external AI services.",
        body_de="## Das Wichtigste in Kürze\n\n- **Keine Firmendokumente oder Kundendaten** an externe KI-Dienste "
                "(öffentliche Chatbots, Übersetzer) hochladen.\n- Vertrauliche Papiere nur in die **Datenschutztonne**, "
                "nie ins Altpapier.\n- Müll trennen: Papier, Verpackung, Bio, Rest – Paletten und Elektroschrott separat."
                "\n- Datenpannen sofort an datenschutz@muster-gmbh.de melden.",
        body_en="## Key points\n\n- **Never upload company documents or customer data** to external AI services "
                "(public chatbots, translators).\n- Confidential papers only in the **data-protection bins**, never in "
                "paper recycling.\n- Separate waste: paper, packaging, organic, residual – pallets and e-waste separately."
                "\n- Report data breaches immediately to datenschutz@muster-gmbh.de.")
    rooms = _add_article_with_pdfs(
        db, author_id, now - timedelta(days=3), ROOM_DOCS, category="knowhow", title_de=ROOM_TITLE,
        title_en="Booking a meeting room by email",
        summary_de="Raum als Teilnehmer in die Outlook-Einladung – der Raum sagt automatisch zu oder ab.",
        summary_en="Add the room as an attendee in the Outlook invitation – it accepts or declines automatically.",
        body_de=ROOM_BODY_DE, body_en=ROOM_BODY_EN)
    support = _add_article_with_pdfs(
        db, author_id, now - timedelta(days=1), SUPPORT_DOCS, category="knowhow", title_de=SUPPORT_TITLE,
        title_en="Reporting IT problems: ticket system or support@",
        summary_de="Ticket im Helpdesk oder E-Mail an support@muster-gmbh.de – mit diesen Angaben geht es am schnellsten.",
        summary_en="A ticket in the helpdesk or an email to support@muster-gmbh.de – these details get it solved fastest.",
        body_de=SUPPORT_BODY_DE, body_en=SUPPORT_BODY_EN)
    return iso or policies or rooms or support


SUPPORT_TITLE = "IT-Probleme melden: Ticketsystem oder support@"

SUPPORT_BODY_DE = """## Zwei Wege zur IT

**1. Ticketsystem (empfohlen)** – [helpdesk.muster-gmbh.de](https://helpdesk.muster-gmbh.de)

1. Mit dem normalen Windows-Konto anmelden.
2. **Neues Ticket** wählen und eine **Kategorie** aussuchen: *Hardware*, *Software*, *Drucker*, *Netzwerk / VPN*, *Konto & Passwort*, *Telefon*, *Bestellung*.
3. Formular ausfüllen, Screenshot anhängen, **Absenden**.
4. Sie bekommen sofort eine **Ticketnummer** (z. B. `#24-1187`) per E-Mail und sehen den Stand jederzeit unter *Meine Tickets*.

**2. E-Mail an `support@muster-gmbh.de`**

Jede Mail an diese Adresse wird automatisch zu einem Ticket – Sie bekommen die Ticketnummer als Antwort.
Antworten Sie für Rückfragen immer **auf diese Mail** (Ticketnummer im Betreff), dann landet alles im selben Ticket.

## Was ins Ticket gehört

- **Was** funktioniert nicht – und **seit wann**?
- **Fehlermeldung** wörtlich oder als **Screenshot** (*Windows + Umschalt + S*).
- **Gerätename** (Aufkleber am Gerät, z. B. `NB-0421`) und **Standort** (Etage, Raum oder Lager).
- Wie viele sind betroffen – nur Sie, das Team, alle?
- Wie Sie **erreichbar** sind (Durchwahl).

Ein Problem pro Ticket. Gute Betreffzeile: *„Drucker OG1-Farbe druckt nur leere Seiten“* statt *„Problem“*.

## Wie schnell?

- **Kritisch** – niemand kann arbeiten (Netzwerk, ERP, Versand steht): Antwort in **30 Minuten**
- **Hoch** – eine Person kann nicht arbeiten: **4 Stunden**
- **Normal** – stört, aber es geht weiter: **1 Arbeitstag**
- **Anfrage** – neue Software, Hardware, Zugänge: **3 Arbeitstage**

Servicezeiten: Mo–Fr 7:00–17:00 Uhr.

## Dringend?

Steht der **Versand** oder ein ganzes Team, zusätzlich **anrufen: Durchwahl 210**.
Außerhalb der Servicezeiten nur für Lager und Versand: Bereitschaftshandy **0170 1234567**.

## Bitte nicht

- **Kein Passwort** ins Ticket oder in die Mail schreiben – die IT fragt nie danach.
- Probleme nicht nur mündlich im Flur melden – ohne Ticket geht es verloren.
- **Verdächtige E-Mails** nicht an support@ weiterleiten, sondern mit *Phishing melden* in Outlook."""

SUPPORT_BODY_EN = """## Two ways to reach IT

**1. Ticket system (recommended)** – [helpdesk.muster-gmbh.de](https://helpdesk.muster-gmbh.de)

1. Sign in with your normal Windows account.
2. Choose **New ticket** and pick a **category**: *Hardware*, *Software*, *Printer*, *Network / VPN*, *Account & password*, *Phone*, *Order*.
3. Fill in the form, attach a screenshot, **Submit**.
4. You immediately get a **ticket number** (e.g. `#24-1187`) by email and can follow it under *My tickets*.

**2. Email to `support@muster-gmbh.de`**

Every email to this address automatically becomes a ticket – you get the ticket number in the reply.
For follow-ups always **reply to that email** (ticket number in the subject) so everything stays in one ticket.

## What to include

- **What** is not working – and **since when**?
- The **error message** word for word or as a **screenshot** (*Windows + Shift + S*).
- **Device name** (sticker on the device, e.g. `NB-0421`) and **location** (floor, room or warehouse).
- Who is affected – just you, your team, everyone?
- How to **reach** you (extension).

One problem per ticket. Good subject: *"Printer OG1-Farbe prints only blank pages"* instead of *"Problem"*.

## How fast?

- **Critical** – nobody can work (network, ERP, shipping stopped): reply within **30 minutes**
- **High** – one person cannot work: **4 hours**
- **Normal** – annoying, but work goes on: **1 working day**
- **Request** – new software, hardware, access: **3 working days**

Service hours: Mon–Fri 7:00–17:00.

## Urgent?

If **shipping** or a whole team is stopped, also **call extension 210**.
Outside service hours, for warehouse and shipping only: on-call mobile **0170 1234567**.

## Please don't

- **Never put a password** in a ticket or email – IT will never ask for it.
- Don't only report problems verbally in the corridor – without a ticket it gets lost.
- Don't forward **suspicious emails** to support@ – use *Report phishing* in Outlook instead."""

SUPPORT_DOCS = [
    ("Anleitung-IT-Probleme-melden.pdf", "Anleitung: IT-Probleme melden", [
        "Ticketsystem: helpdesk.muster-gmbh.de (Windows-Anmeldung) -> Neues Ticket.",
        "Oder E-Mail an support@muster-gmbh.de - wird automatisch zum Ticket.",
        "",
        "Ins Ticket gehören:",
        "- Was funktioniert nicht, seit wann?",
        "- Fehlermeldung oder Screenshot (Windows + Umschalt + S)",
        "- Gerätename (Aufkleber, z. B. NB-0421) und Standort",
        "- Wer ist betroffen? Wie sind Sie erreichbar?",
        "",
        "Reaktionszeiten: Kritisch 30 Min. | Hoch 4 Std. | Normal 1 Arbeitstag | Anfrage 3 Arbeitstage",
        "Servicezeiten: Mo-Fr 7:00-17:00 Uhr",
        "Dringend: Durchwahl 210. Bereitschaft (Lager/Versand): 0170 1234567",
        "",
        "Niemals Passwörter ins Ticket schreiben. Phishing über 'Phishing melden' in Outlook."]),
]


ROOM_TITLE = "Besprechungsraum per E-Mail buchen"

ROOM_BODY_DE = """## So geht's in Outlook

1. **Neue Besprechung** anlegen (Kalender → *Neue Besprechung*, oder *Strg + Umschalt + Q*).
2. Unter **An** die Kolleg:innen eintragen – und den **Raum wie eine Person** hinzufügen, z. B. `raum.elbe@muster-gmbh.de`.
3. **Betreff**, **Datum** und **Uhrzeit** setzen. Das Feld *Ort* füllt Outlook selbst mit dem Raumnamen.
4. Mit der **Terminplanungs-Assistent**-Ansicht prüfen, ob der Raum frei ist (graue Blöcke = belegt).
5. **Senden.** Nach wenigen Sekunden kommt eine Antwort vom Raum:
   - **Angenommen** – der Raum ist gebucht.
   - **Abgelehnt** – der Raum ist zu der Zeit schon belegt. Andere Zeit oder anderen Raum wählen.

Ohne Zusage gilt der Raum **nicht** als gebucht.

## Unsere Räume

- **Besprechung Elbe**, EG – bis 12 Personen, Bildschirm und Konferenzkamera – `raum.elbe@muster-gmbh.de`
- **Besprechung Rhein**, 1. OG – bis 8 Personen, Bildschirm – `raum.rhein@muster-gmbh.de`
- **Besprechung Main**, 2. OG – bis 10 Personen, Bildschirm und Whiteboard – `raum.main@muster-gmbh.de`
- **Schulungsraum**, 2. OG – bis 20 Personen, Beamer – `raum.schulung@muster-gmbh.de`

## Ändern oder absagen

- **Verschieben:** Termin öffnen, Zeit ändern, *Update senden* – der Raum prüft erneut und antwortet.
- **Absagen:** Besprechung *absagen* und senden. Nur so wird der Raum für andere wieder frei.
- Einfach den Termin aus dem eigenen Kalender löschen reicht **nicht**.

## Regeln

- Maximal **4 Stunden** am Stück und höchstens **3 Monate** im Voraus.
- Den Schulungsraum für ganze Tage bitte vorher mit der Verwaltung abstimmen (Durchwahl 100).
- Raum aufgeräumt verlassen, Bildschirm ausschalten, Fenster schließen.
- Probleme mit der Buchung oder der Technik: it@muster-gmbh.de

## Ohne Outlook?

Eine normale E-Mail an die Raumadresse bucht **nichts** – der Raum versteht nur Kalendereinladungen.
Wer kein Outlook hat, schreibt an empfang@muster-gmbh.de mit Raum, Datum, Uhrzeit und Anzahl Personen;
der Empfang bucht dann und schickt die Einladung."""

ROOM_BODY_EN = """## How to do it in Outlook

1. Create a **new meeting** (Calendar → *New Meeting*, or *Ctrl + Shift + Q*).
2. Add your colleagues under **To** – and add the **room like a person**, e.g. `raum.elbe@muster-gmbh.de`.
3. Set **subject**, **date** and **time**. Outlook fills in the *Location* field with the room name.
4. Use the **Scheduling Assistant** to check whether the room is free (grey blocks = booked).
5. **Send.** After a few seconds the room replies:
   - **Accepted** – the room is booked.
   - **Declined** – the room is already taken at that time. Pick another time or room.

Without an acceptance the room is **not** booked.

## Our rooms

- **Besprechung Elbe**, ground floor – up to 12 people, screen and conference camera – `raum.elbe@muster-gmbh.de`
- **Besprechung Rhein**, 1st floor – up to 8 people, screen – `raum.rhein@muster-gmbh.de`
- **Besprechung Main**, 2nd floor – up to 10 people, screen and whiteboard – `raum.main@muster-gmbh.de`
- **Training room**, 2nd floor – up to 20 people, projector – `raum.schulung@muster-gmbh.de`

## Change or cancel

- **Reschedule:** open the meeting, change the time, *Send update* – the room checks again and replies.
- **Cancel:** *cancel* the meeting and send. Only then is the room free for others.
- Just deleting the meeting from your own calendar is **not** enough.

## Rules

- At most **4 hours** in a row and no more than **3 months** ahead.
- Please agree full-day bookings of the training room with the administration first (ext. 100).
- Leave the room tidy, switch off the screen, close the windows.
- Problems with the booking or the equipment: it@muster-gmbh.de

## No Outlook?

A plain email to the room address books **nothing** – the room only understands calendar invitations.
Without Outlook, write to empfang@muster-gmbh.de with room, date, time and number of people;
reception books it and sends you the invitation."""

ROOM_DOCS = [
    ("Anleitung-Besprechungsraum-buchen.pdf", "Anleitung: Besprechungsraum per E-Mail buchen", [
        "1. Outlook: Neue Besprechung (Strg + Umschalt + Q).",
        "2. Unter 'An' den Raum wie eine Person eintragen, z. B. raum.elbe@muster-gmbh.de.",
        "3. Betreff, Datum und Uhrzeit setzen - 'Ort' füllt Outlook selbst.",
        "4. Im Terminplanungs-Assistenten prüfen, ob der Raum frei ist.",
        "5. Senden. Der Raum antwortet automatisch: Angenommen = gebucht, Abgelehnt = belegt.",
        "",
        "Räume:",
        "Besprechung Elbe, EG, 12 Pers.  - raum.elbe@muster-gmbh.de",
        "Besprechung Rhein, 1. OG, 8 Pers. - raum.rhein@muster-gmbh.de",
        "Besprechung Main, 2. OG, 10 Pers. - raum.main@muster-gmbh.de",
        "Schulungsraum, 2. OG, 20 Pers.   - raum.schulung@muster-gmbh.de",
        "",
        "Absagen: Besprechung absagen und senden - nicht nur aus dem Kalender löschen.",
        "Regeln: max. 4 Stunden am Stück, max. 3 Monate im Voraus.",
        "Ohne Outlook: Mail an empfang@muster-gmbh.de (Raum, Datum, Uhrzeit, Personen)."]),
]


# ---------------------------------------------------------------------------
# Floor plans (1000 x H). Seats are returned as percentages.
# ---------------------------------------------------------------------------


def plan_office(code: str, rooms: list[tuple]) -> tuple[str, list[tuple[str, float, float]]]:
    """rooms: (x, y, w, h, label, desks_cols, desks_rows)."""
    W, H = 1000, 520
    out = [f'<rect x="10" y="10" width="{W - 20}" height="{H - 20}" rx="6" fill="#FFFFFF" stroke="#9AA9C2" stroke-width="6"/>',
           f'<rect x="10" y="236" width="{W - 20}" height="48" fill="#EEF2F8"/>',  # corridor
           f'<rect x="460" y="236" width="80" height="48" fill="#DCE3EE"/>'
           f'<text x="500" y="266" font-family="Barlow, sans-serif" font-size="13" text-anchor="middle" fill="#5B6B82">Treppe / Aufzug</text>']
    seats = []
    n = 1
    for (x, y, w, h, label, cols, rows) in rooms:
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#F7F9FC" stroke="#B9C5D8" stroke-width="3"/>')
        out.append(f'<text x="{x + 12}" y="{y + 24}" font-family="Barlow, sans-serif" font-size="15" '
                   f'font-weight="600" fill="#5B6B82">{label}</text>')
        if label.startswith(("Besprechung", "Meeting")):
            out.append(f'<rect x="{x + w * .2}" y="{y + h * .38}" width="{w * .6}" height="{h * .32}" rx="14" fill="#E3E9F3"/>')
        for r in range(rows):
            for c in range(cols):
                dx = x + w * (c + 1) / (cols + 1)
                dy = y + 40 + (h - 50) * (r + 0.5) / rows
                out.append(f'<rect x="{dx - 26}" y="{dy - 14}" width="52" height="28" rx="4" fill="#E3E9F3"/>')
                seats.append((f"{code}-{n:02d}", round(dx / W * 100, 2), round(dy / H * 100, 2)))
                n += 1
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{"".join(out)}</svg>'
    return svg, seats


def plan_warehouse(code: str, racks: int, docks: int) -> tuple[str, list[tuple[str, float, float]]]:
    W, H = 1000, 560
    out = [f'<rect x="10" y="10" width="{W - 20}" height="{H - 20}" rx="4" fill="#FFFFFF" stroke="#9AA9C2" stroke-width="6"/>']
    for i in range(racks):  # high-bay racks
        x = 70 + i * (640 / racks)
        out.append(f'<rect x="{x:.0f}" y="60" width="{640 / racks * .55:.0f}" height="330" fill="#DCE3EE" stroke="#B9C5D8" stroke-width="2"/>')
        out.append(f'<text x="{x + 640 / racks * .27:.0f}" y="50" font-family="Barlow, sans-serif" font-size="13" '
                   f'text-anchor="middle" fill="#5B6B82">R{i + 1}</text>')
    # floor marking for the forklift lane
    out.append(f'<rect x="40" y="410" width="700" height="10" fill="{SIGNAL}"/>')
    out.append(f'<rect x="40" y="480" width="700" height="10" fill="{SIGNAL}"/>')
    for i in range(docks):  # loading docks on the right wall
        y = 60 + i * 95
        out.append(f'<rect x="900" y="{y}" width="80" height="70" fill="#E3E9F3" stroke="#B9C5D8" stroke-width="2"/>'
                   f'<text x="940" y="{y + 42}" font-family="Barlow, sans-serif" font-size="14" text-anchor="middle" fill="#5B6B82">Tor {i + 1}</text>')
    # office box + stations
    out.append('<rect x="760" y="430" width="200" height="110" fill="#F7F9FC" stroke="#B9C5D8" stroke-width="3"/>'
               '<text x="772" y="454" font-family="Barlow, sans-serif" font-size="15" font-weight="600" fill="#5B6B82">Lagerbüro</text>')
    spots = [(810, 500), (900, 500), (790, 300), (790, 180), (120, 450), (380, 450), (640, 450)]
    seats = []
    for n, (x, y) in enumerate(spots, 1):
        out.append(f'<rect x="{x - 26}" y="{y - 14}" width="52" height="28" rx="4" fill="#E3E9F3"/>')
        seats.append((f"{code}-{n:02d}", round(x / W * 100, 2), round(y / H * 100, 2)))
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{"".join(out)}</svg>'
    return svg, seats


# ---------------------------------------------------------------------------
# Rooms for the interactive plan, in plan units (office 1000 x 520, warehouse 1000 x 560).
# ---------------------------------------------------------------------------

ROOM_INFO = {  # name: (english name, type, department, capacity, equipment de, equipment en, email)
    "Empfang": ("Reception", "reception", None, None, "", "", ""),
    "Verwaltung": ("Administration", "office", "Verwaltung", None, "", "", ""),
    "Finanzen": ("Finance", "office", "Finanzen", None, "", "", ""),
    "Besprechung Elbe": ("Besprechung Elbe", "meeting", None, 12, "Bildschirm, Konferenzkamera", "Screen, conference camera",
                         "raum.elbe@muster-gmbh.de"),
    "Küche": ("Kitchen", "kitchen", None, None, "", "", ""),
    "Geschäftsführung": ("Management", "lead", "Verwaltung", None, "", "", ""),
    "Vertrieb": ("Sales", "office", "Vertrieb", None, "", "", ""),
    "Einkauf": ("Purchasing", "office", "Einkauf", None, "", "", ""),
    "IT": ("IT", "office", "IT", None, "", "", ""),
    "Besprechung Rhein": ("Besprechung Rhein", "meeting", None, 8, "Bildschirm", "Screen", "raum.rhein@muster-gmbh.de"),
    "Projektfläche": ("Project area", "project", None, None, "", "", ""),
    "Versand-Büro": ("Shipping office", "office", "Versand", None, "", "", ""),
    "Fulfillment-Büro": ("Fulfilment office", "office", "Fulfillment", None, "", "", ""),
    "Schulungsraum": ("Training room", "meeting", None, 20, "Beamer", "Projector", "raum.schulung@muster-gmbh.de"),
    "Besprechung Main": ("Besprechung Main", "meeting", None, 10, "Bildschirm, Whiteboard", "Screen, whiteboard",
                         "raum.main@muster-gmbh.de"),
}


def office_rooms(layout: list[tuple]) -> list[dict]:
    """Rooms of a generated office plan (see plan_office) plus corridor and stairwell."""
    rooms = [dict(type="corridor", name_de="Flur", name_en="Corridor", x=10, y=236, w=980, h=48),
             dict(type="stairs", name_de="Treppe / Aufzug", name_en="Stairs / lift", x=460, y=236, w=80, h=48)]
    for (x, y, w, h, label, _cols, _rows) in layout:
        en, kind, dept, cap, eq_de, eq_en, mail = ROOM_INFO[label]
        rooms.append(dict(type=kind, name_de=label, name_en=en, department=dept, x=x, y=y, w=w, h=h, capacity=cap,
                          equipment_de=eq_de, equipment_en=eq_en, email=mail))
    return rooms


def warehouse_rooms(racks: int, docks: int) -> list[dict]:
    """Zones of a generated warehouse plan (see plan_warehouse)."""
    rooms = [dict(type="rack", name_de=f"R{i + 1}", name_en=f"R{i + 1}", x=70 + i * (640 / racks), y=60,
                  w=640 / racks * .55, h=330) for i in range(racks)]
    rooms += [dict(type="dock", name_de=f"Tor {i + 1}", name_en=f"Gate {i + 1}", x=900, y=60 + i * 95, w=80, h=70)
              for i in range(docks)]
    rooms.append(dict(type="lane", name_de="Fahrweg Stapler", name_en="Forklift lane", x=40, y=410, w=700, h=80))
    rooms.append(dict(type="stock-office", name_de="Lagerbüro", name_en="Warehouse office", x=760, y=430, w=200, h=110))
    return rooms


def add_rooms(db, loc: Location, rooms: list[dict], width: float, height: float) -> int:
    """Store rooms given in plan units as percentages. Skips locations that already have rooms."""
    if db.query(Room).filter(Room.location_id == loc.id).count():
        return 0
    for i, r in enumerate(rooms):
        db.add(Room(location_id=loc.id, sort=i, **{**r, "x": round(r["x"] / width * 100, 3), "y": round(r["y"] / height * 100, 3),
                                                    "w": round(r["w"] / width * 100, 3), "h": round(r["h"] / height * 100, 3)}))
    return len(rooms)


OFFICE_LAYOUTS = {
    "EG": [(10, 10, 300, 226, "Empfang", 1, 1), (310, 10, 330, 226, "Verwaltung", 3, 2),
           (640, 10, 350, 226, "Finanzen", 3, 2), (10, 284, 420, 226, "Besprechung Elbe", 0, 0),
           (430, 284, 260, 226, "Küche", 0, 0), (690, 284, 300, 226, "Geschäftsführung", 2, 1)],
    "1. OG": [(10, 10, 480, 226, "Vertrieb", 4, 2), (490, 10, 500, 226, "Einkauf", 4, 2),
              (10, 284, 330, 226, "IT", 2, 2), (340, 284, 320, 226, "Besprechung Rhein", 0, 0),
              (660, 284, 330, 226, "Projektfläche", 2, 2)],
    "2. OG": [(10, 10, 480, 226, "Versand-Büro", 3, 2), (490, 10, 500, 226, "Fulfillment-Büro", 3, 2),
              (10, 284, 480, 226, "Schulungsraum", 0, 0), (490, 284, 500, 226, "Besprechung Main", 0, 0)],
}
WAREHOUSES = [("Lager N", "Lager Nord", "Warehouse North", 6, 4), ("Lager S", "Lager Süd", "Warehouse South", 5, 3)]


def add_demo_rooms(db) -> int:
    """Rooms for the demo floors and halls (matched by location code). Used by seed and `seed.py --rooms`."""
    n = 0
    for loc in db.query(Location).all():
        if loc.code in OFFICE_LAYOUTS:
            n += add_rooms(db, loc, office_rooms(OFFICE_LAYOUTS[loc.code]), 1000, 520)
        for code, _de, _en, racks, docks in WAREHOUSES:
            if loc.code == code:
                n += add_rooms(db, loc, warehouse_rooms(racks, docks), 1000, 560)
    return n


# ---------------------------------------------------------------------------
# Quick-access tiles and trainings (Schulungen)
# ---------------------------------------------------------------------------

DEMO_LINKS = [  # title de, title en, subtitle de, subtitle en, url, icon, color
    ("Zeiterfassung", "Time tracking", "Kommen, Gehen, Urlaub", "Clock in/out, leave", "https://zeit.muster-gmbh.de", "clock", "#13995b"),
    ("ERP", "ERP", "Aufträge, Bestand, Versand", "Orders, stock, shipping", "https://erp.muster-gmbh.de", "package", "#3557f5"),
    ("Outlook im Web", "Outlook on the web", "E-Mail und Kalender", "Mail and calendar", "https://outlook.office.com", "mail", "#0891b2"),
    ("IT-Helpdesk", "IT helpdesk", "Ticket erstellen", "Open a ticket", "https://helpdesk.muster-gmbh.de", "lifebuoy", "#e0484d"),
    ("IT-Support", "IT support", "support@muster-gmbh.de", "support@muster-gmbh.de", "mailto:support@muster-gmbh.de", "monitor", "#e0484d"),
    ("Buchhaltung", "Accounting", "buchhaltung@muster-gmbh.de", "buchhaltung@muster-gmbh.de", "mailto:buchhaltung@muster-gmbh.de", "calculator", "#d97706"),
    ("Eingangsrechnungen", "Incoming invoices", "rechnungen@muster-gmbh.de", "rechnungen@muster-gmbh.de", "mailto:rechnungen@muster-gmbh.de", "receipt", "#d97706"),
    ("Personalabteilung", "HR", "personal@muster-gmbh.de", "personal@muster-gmbh.de", "mailto:personal@muster-gmbh.de", "users", "#8b5cf6"),
    ("Empfang", "Reception", "Durchwahl 100", "Extension 100", "tel:100", "phone", "#64748b"),
]


def add_demo_links(db) -> int:
    if db.query(QuickLink).count():
        return 0
    for i, (tde, ten, sde, sen, url, icon, color) in enumerate(DEMO_LINKS):
        db.add(QuickLink(title_de=tde, title_en=ten, subtitle_de=sde, subtitle_en=sen, url=url, icon=icon, color=color, sort=i))
    return len(DEMO_LINKS)


def _training_pdf(name: str, title: str, lines: list[str]) -> dict:
    stored = f"tr-demo-{name}"
    data = make_pdf(title, lines)
    (settings.training_dir / stored).write_bytes(data)
    return {"kind": "pdf", "name": name, "file": stored, "size": len(data)}


def add_demo_trainings(db) -> int:
    """Groups, trainings and some confirmations. Skips when trainings exist already."""
    if db.query(Training).count():
        return 0
    rng = random.Random(11)
    people = {u.username: u for u in db.query(User).filter(User.show_in_directory.is_(True))}
    groups = {}
    for name, members in [("Geschäftsführung", ["anna.becker"]),
                          ("Ersthelfer", ["sophie.schulz", "lukas.fischer", "marta.kowalska"]),
                          ("Staplerfahrer", ["ahmed.haddad", "paul.schroeder", "lukas.fischer"])]:
        g = TrainingGroup(name=name, members=[TrainingGroupMember(user_id=people[m].id) for m in members if m in people])
        db.add(g)
        db.flush()
        groups[name] = g.id
    today = date.today()
    items = [
        ("Datenschutz-Unterweisung 2026", "Data protection instruction 2026",
         "Jährliche Unterweisung nach DSGVO. Bitte die Richtlinie lesen und bestätigen.",
         "Yearly GDPR instruction. Please read the policy and confirm.",
         today + timedelta(days=21), [("all", "")],
         [_training_pdf("Datenschutz-Unterweisung-2026.pdf", "Datenschutz-Unterweisung 2026", [
             "Personenbezogene Daten nur verarbeiten, wenn es für die Aufgabe nötig ist.",
             "Keine Firmendaten auf private Geräte oder in private Cloud-Speicher.",
             "Bildschirm sperren beim Verlassen des Platzes (Windows + L).",
             "Datenpannen sofort an datenschutz@muster-gmbh.de melden."])], 0.55),
        ("KI-Richtlinie: keine Firmendokumente an externe KI", "AI policy: no company documents to external AI",
         "Was mit Chatbots und Übersetzern erlaubt ist – und was nicht.",
         "What is allowed with chatbots and translators – and what is not.",
         today + timedelta(days=14), [("all", "")],
         [_training_pdf("KI-Richtlinie.pdf", "Richtlinie zur Nutzung von KI-Diensten", [
             "Keine Firmendokumente, Kundendaten, Preise oder Verträge an externe KI-Dienste.",
             "Nur von der IT freigegebene Werkzeuge verwenden.",
             "KI-Ergebnisse immer selbst prüfen."]),
          {"kind": "link", "name": "Artikel im Intranet: Richtlinien", "url": "/knowledge"}], 0.4),
        ("Unterweisung Flurförderzeuge (Stapler)", "Forklift instruction",
         "Jährliche Pflichtunterweisung für alle Staplerfahrer:innen nach DGUV Vorschrift 68.",
         "Yearly mandatory instruction for forklift drivers (DGUV regulation 68).",
         today - timedelta(days=3), [("group", str(groups["Staplerfahrer"]))],
         [_training_pdf("Unterweisung-Stapler-2026.pdf", "Unterweisung Flurfoerderzeuge 2026", [
             "Nur unterwiesene Personen mit Fahrausweis fahren Stapler.",
             "Vor Schichtbeginn: Sichtprüfung, Bremsen, Hupe, Licht.",
             "Fußgänger nutzen ausschließlich die gelb markierten Wege."])], 0.34),
        ("Brandschutz im Lager", "Fire safety in the warehouse",
         "Verhalten im Brandfall, Fluchtwege und Sammelplatz für Versand und Fulfillment.",
         "What to do in case of fire, escape routes and assembly point for shipping and fulfilment.",
         today + timedelta(days=30), [("department", "Versand"), ("department", "Fulfillment")],
         [_training_pdf("Brandschutz-Lager.pdf", "Brandschutz im Lager", [
             "Brand melden: Notruf 112, intern 999.",
             "Sammelplatz: Parkplatz vor dem Haupteingang.",
             "Feuerlöscher an jedem Hallentor."])], 0.5),
        ("Compliance für Führungskräfte", "Compliance for managers",
         "Geschenke, Interessenkonflikte, Vier-Augen-Prinzip bei Zahlungen.",
         "Gifts, conflicts of interest, four-eyes principle for payments.",
         None, [("group", str(groups["Geschäftsführung"])), ("user", str(people["felix.zimmermann"].id))],
         [_training_pdf("Compliance-Fuehrungskraefte.pdf", "Compliance fuer Fuehrungskraefte", [
             "Geschenke über 35 € werden gemeldet.",
             "Zahlungen über 10.000 € nur nach dem Vier-Augen-Prinzip."])], 0.0),
    ]
    from app.routers.trainings import assigned_ids
    for tde, ten, dde, den, due, targets, materials, share in items:
        t = Training(title_de=tde, title_en=ten, description_de=dde, description_en=den, due_date=due,
                     targets=[TrainingTarget(kind=k, value=v) for k, v in targets],
                     materials=[TrainingMaterial(sort=i, **m) for i, m in enumerate(materials)])
        db.add(t)
        db.flush()
        for uid in sorted(assigned_ids(db, t)):
            if rng.random() < share:
                db.add(TrainingCompletion(training_id=t.id, user_id=uid, version=1,
                                          completed_at=datetime.now() - timedelta(days=rng.randint(0, 9), hours=rng.randint(0, 8))))
    # General how-tos: voluntary for everybody, linked to the matching articles
    for tde, ten, dde, den, article_title in [
        ("Besprechungsraum per E-Mail buchen", "Booking a meeting room by email",
         "So reservieren Sie einen Besprechungsraum über Outlook – Schritt für Schritt.",
         "How to book a meeting room in Outlook – step by step.", ROOM_TITLE),
        ("IT-Probleme richtig melden", "Reporting IT problems",
         "Ticketsystem oder support@ – und welche Angaben die IT braucht.",
         "Ticket system or support@ – and what IT needs to know.", SUPPORT_TITLE),
    ]:
        art = db.query(Article).filter(Article.title_de == article_title).first()
        db.add(Training(title_de=tde, title_en=ten, description_de=dde, description_en=den, open_to_all=True,
                        materials=[TrainingMaterial(kind="link", name=article_title, url=f"/articles/{art.id}", sort=0)] if art else []))
    return len(items) + 2


PEOPLE = [  # first, last, department, position, ext, role, start offset (days ago)
    ("Anna", "Becker", "Verwaltung", "Geschäftsführerin", "100", "admin", 2900),
    ("Sophie", "Schulz", "Verwaltung", "Personalreferentin", "140", "editor", 700),
    ("Lea", "Hoffmann", "Verwaltung", "Kommunikation & Intranet", "120", "editor", 900),
    ("Elena", "Richter", "Finanzen", "Finanzbuchhalterin", "150", "user", 1600),
    ("Katrin", "Lange", "Finanzen", "Controllerin", "151", "user", 45),
    ("Tim", "Neumann", "Einkauf", "Strategischer Einkäufer", "240", "user", 1100),
    ("Clara", "Braun", "Einkauf", "Category Managerin", "241", "user", 60),
    ("Jonas", "Weber", "IT", "IT-Administrator", "210", "admin", 1500),
    ("David", "Klein", "IT", "Werkstudent IT-Support", "212", "user", 21),
    ("Mehmet", "Yılmaz", "Vertrieb", "Key Account Manager", "331", "user", 1200),
    ("Hannah", "Wolf", "Vertrieb", "Vertriebsinnendienst", "333", "user", 12),
    ("Nina", "Krüger", "Vertrieb", "Online-Marketing", "322", "user", 5),
    ("Lukas", "Fischer", "Versand", "Versandleiter", "501", "user", 2100),
    ("Paul", "Schröder", "Versand", "Fachkraft für Lagerlogistik", "503", "user", 35),
    ("Ahmed", "Haddad", "Versand", "Staplerfahrer", "504", "user", 800),
    ("Felix", "Zimmermann", "Fulfillment", "Teamleiter Fulfillment", "520", "user", 1900),
    ("Marta", "Kowalska", "Fulfillment", "Disponentin", "502", "user", 400),
    ("Jana", "Peters", "Fulfillment", "Kommissioniererin", "521", "user", 30),
]


def demo_password(env: str) -> str:
    """Password for the demo accounts: from the environment variable, otherwise random (never stored in the repo)."""
    return os.environ.get(env) or secrets.token_urlsafe(12)


def username(first, last):
    table = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "ı": "i"})
    return f"{first}.{last}".lower().translate(table)


def seed(reset: bool):
    if reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    if db.query(User).count():
        print("Database already has users; use --reset to rebuild the demo data.")
        return

    for i, (name, color) in enumerate(DEFAULT_DEPARTMENTS):
        db.add(Department(name=name, color=color, sort=i))

    # Locations ---------------------------------------------------------------
    office_layouts = OFFICE_LAYOUTS
    names = {"EG": ("Erdgeschoss", "Ground floor"), "1. OG": ("1. Obergeschoss", "First floor"),
             "2. OG": ("2. Obergeschoss", "Second floor")}
    seats_by_room: dict[str, list[Seat]] = {}
    sort = 0
    for code, rooms in office_layouts.items():
        svg, seats = plan_office(code.replace(". ", "").replace(" ", ""), rooms)
        loc = Location(code=code, name_de=names[code][0], name_en=names[code][1], kind="floor", sort=sort,
                       plan_url=write(f"plan-{code.replace('. ', '').lower()}.svg", svg), plan_ratio=520 / 1000)
        sort += 1
        db.add(loc)
        db.flush()
        for label, x, y in seats:
            s = Seat(location_id=loc.id, label=label, x=x, y=y)
            db.add(s)
            # remember which room the desk is in, to seat people by department
            px, py = x * 10, y * 5.2
            room = next(r[4] for r in rooms if r[0] <= px <= r[0] + r[2] and r[1] <= py <= r[1] + r[3])
            seats_by_room.setdefault(room, []).append(s)
    for code, name_de, name_en, racks, docks in WAREHOUSES:
        svg, seats = plan_warehouse(code.replace(" ", ""), racks, docks)
        loc = Location(code=code, name_de=name_de, name_en=name_en, kind="warehouse", sort=sort,
                       plan_url=write(f"plan-{code.replace(' ', '').lower()}.svg", svg), plan_ratio=560 / 1000)
        sort += 1
        db.add(loc)
        db.flush()
        for label, x, y in seats:
            s = Seat(location_id=loc.id, label=label, x=x, y=y)
            db.add(s)
            seats_by_room.setdefault(name_de, []).append(s)
    db.flush()

    # Users ---------------------------------------------------------------------
    # Where each department sits, in order of preference. Fulfillment works in Lager Nord, shipping in Lager Süd.
    dept_rooms = {"Verwaltung": ["Geschäftsführung", "Verwaltung", "Empfang"], "Finanzen": ["Finanzen"],
                  "Einkauf": ["Einkauf"], "IT": ["IT"], "Vertrieb": ["Vertrieb"],
                  "Versand": ["Versand-Büro", "Lager Süd"], "Fulfillment": ["Fulfillment-Büro", "Lager Nord"]}
    taken_once: set[str] = set()
    users = {}
    staff_pw = demo_password("LOTSE_DEMO_PASSWORD")
    admin_pw = demo_password("LOTSE_DEMO_ADMIN_PASSWORD")
    staff_hash = hash_password(staff_pw)
    for first, last, dept, pos, ext, role, days in PEOPLE:
        uname = username(first, last)
        # The first person of a department (the lead) gets the office desk, the others go out on the floor/hall.
        rooms = dept_rooms.get(dept, [])
        if dept in taken_once and len(rooms) > 1:
            rooms = rooms[1:] + rooms[:1]
        taken_once.add(dept)
        pool = next((seats_by_room[r] for r in rooms if seats_by_room.get(r)), [])
        u = User(username=uname, email=f"{uname}@muster-gmbh.de", password_hash=staff_hash,
                 role=role, first_name=first, last_name=last, department=dept, position=pos, phone_ext=ext,
                 start_date=date.today() - timedelta(days=days), seat_id=pool.pop(0).id if pool else None)
        db.add(u)
        users[uname] = u
    db.add(User(username="admin", email="intranet@muster-gmbh.de", password_hash=hash_password(admin_pw),
                role="admin", first_name="Intranet", last_name="Admin", department="IT",
                position="Technischer Account", show_in_directory=False))
    db.flush()
    editor = users["lea.hoffmann"]
    hr = users["sophie.schulz"]

    # Articles --------------------------------------------------------------------
    img = {k: write(f"banner-{k}.svg", fn()) for k, fn in BANNERS.items()}
    now = datetime.now()
    A = lambda **kw: db.add(Article(**{"published_at": kw.get("created_at", now), **kw}))  # noqa: E731

    A(category="events", featured=True, image_url=photo("feier-konfetti.jpg"), author_id=editor.id,
      created_at=now - timedelta(hours=3),
      title_de="Weihnachtsfeier 2026", title_en="Christmas party 2026",
      summary_de="Am 11. Dezember feiern wir gemeinsam im Lager Nord – mit Glühwein, Live-Band und Wichteln.",
      summary_en="On 11 December we celebrate together in Warehouse North – mulled wine, live band and Secret Santa.",
      event_date=datetime(2026, 12, 11, 17, 0), event_location="Lager Nord, Halle 2",
      body_de="## Programm\n\n- **17:00** Empfang mit Glühwein und Kinderpunsch\n- **18:00** Rückblick der Geschäftsführung\n"
              "- **18:30** Buffet\n- **20:00** Live-Band *The Forklifts*\n\n## Anmeldung\n\nBitte bis **27. November** "
              "bei Sophie Schulz (Durchwahl 140) anmelden. Partner:innen sind herzlich willkommen.\n\n"
              "Wichtelgeschenke bis maximal 15 € bitte mit Namensschild unter den Baum im Foyer legen.",
      body_en="## Schedule\n\n- **17:00** Welcome with mulled wine and kids' punch\n- **18:00** Year in review by the management\n"
              "- **18:30** Buffet\n- **20:00** Live band *The Forklifts*\n\n## Sign-up\n\nPlease register with Sophie "
              "Schulz (ext. 140) by **27 November**. Partners are very welcome.\n\nSecret Santa gifts up to €15, with a "
              "name tag, go under the tree in the lobby.")
    A(category="safety", featured=True, image_url=img["safety"], author_id=users["lukas.fischer"].id,
      created_at=now - timedelta(days=1),
      title_de="Neue Fahrwege im Lager Süd", title_en="New forklift lanes in Warehouse South",
      summary_de="Ab Montag gelten neue Bodenmarkierungen. Fußwege sind gelb, Staplerwege bleiben frei.",
      summary_en="New floor markings apply from Monday. Walkways are yellow; forklift lanes stay clear.",
      body_de="## Was sich ändert\n\n1. Fußgänger nutzen ausschließlich die **gelb markierten Wege**.\n2. An Kreuzungen gilt: "
              "Stapler halten, Blickkontakt, dann queren.\n3. Warnwesten sind in beiden Hallen Pflicht.\n\n"
              "Fragen beantwortet Lukas Fischer, Durchwahl 501.",
      body_en="## What changes\n\n1. Pedestrians use the **yellow walkways** only.\n2. At crossings: forklift stops, eye "
              "contact, then cross.\n3. High-visibility vests are mandatory in both halls.\n\nQuestions: Lukas Fischer, ext. 501.")
    A(category="cyber", featured=True, image_url=img["cyber"], author_id=users["jonas.weber"].id,
      created_at=now - timedelta(days=2),
      title_de="Phishing-Welle: Gefälschte Paketbenachrichtigungen", title_en="Phishing wave: fake parcel notifications",
      summary_de="Aktuell kursieren E-Mails, die wie DHL-Benachrichtigungen aussehen. Nicht klicken, sondern melden.",
      summary_en="Emails that look like DHL notifications are going around. Don't click – report them.",
      body_de="## So erkennen Sie die Mails\n\n- Absender endet nicht auf `dhl.de`\n- Zeitdruck: „Zustellung in 24 h verfällt“\n"
              "- Link führt auf eine fremde Domain\n\n## Was tun?\n\nMail über den Button **Phishing melden** in Outlook "
              "weiterleiten und anschließend löschen. Wer bereits geklickt hat: sofort die IT anrufen (Durchwahl 210).",
      body_en="## How to spot them\n\n- Sender does not end in `dhl.de`\n- Urgency: \"delivery expires in 24 h\"\n"
              "- Link goes to an unrelated domain\n\n## What to do\n\nForward the mail with the **Report phishing** button "
              "in Outlook, then delete it. Already clicked? Call IT right away (ext. 210).")
    A(category="products", featured=True, image_url=img["product"], author_id=users["clara.braun"].id,
      created_at=now - timedelta(days=4),
      title_de="Neu im Sortiment: Mehrweg-Versandbox M", title_en="New in the range: reusable shipping box M",
      summary_de="Die neue Box hält 30 Umläufe und spart pro Sendung rund 40 % Verpackungsmaterial.",
      summary_en="The new box lasts 30 trips and saves about 40% packaging material per shipment.",
      body_de="Die **Mehrweg-Versandbox M** ist ab sofort im Vertrieb bestellbar. Muster liegen im Showroom im 1. OG.\n\n"
              "| Maß | Wert |\n|---|---|\n| Innenmaß | 40 × 30 × 20 cm |\n| Traglast | 25 kg |\n| Umläufe | ≥ 30 |",
      body_en="The **reusable shipping box M** can now be ordered through sales. Samples are in the showroom on the "
              "first floor.\n\n| Spec | Value |\n|---|---|\n| Inner size | 40 × 30 × 20 cm |\n| Load | 25 kg |\n| Trips | ≥ 30 |")
    A(category="people", featured=True, image_url=photo("team-monitor.jpg"), author_id=hr.id, created_at=now - timedelta(days=5),
      title_de="Willkommen an Bord!", title_en="Welcome aboard!",
      summary_de="Diesen Monat starten Nina, Hannah, David, Jana und Paul bei uns. Sagen Sie Hallo!",
      summary_en="Nina, Hannah, David, Jana and Paul join us this month. Say hello!",
      body_de="Wir freuen uns auf **Nina Krüger** und **Hannah Wolf** (Vertrieb), **David Klein** (IT), "
              "**Jana Peters** (Fulfillment) und **Paul Schröder** (Versand). Wo sie sitzen, sehen Sie im Lageplan unter *Mitarbeitende*.",
      body_en="We're happy to welcome **Nina Krüger** and **Hannah Wolf** (sales), **David Klein** (IT), "
              "**Jana Peters** (fulfillment) and **Paul Schröder** (shipping). Find their desks on the floor plan under *People*.")
    A(category="news", author_id=users["anna.becker"].id, created_at=now - timedelta(days=6),
      title_de="Rekordquartal im Versand", title_en="Record quarter in shipping",
      summary_de="Im dritten Quartal haben wir 18 % mehr Sendungen verschickt als im Vorjahr. Danke an alle Teams!",
      summary_en="In Q3 we shipped 18% more parcels than last year. Thank you, all teams!",
      body_de="Ein großes Dankeschön an Versand, Fulfillment, Vertrieb und Einkauf. Als kleines Dankeschön gibt es am Freitag Frühstück für alle in der Küche im EG.",
      body_en="A big thank-you to shipping, fulfillment, sales and purchasing. As a small thank-you, there's breakfast for everyone on Friday in the ground-floor kitchen.")
    A(category="news", author_id=editor.id, created_at=now - timedelta(days=9),
      title_de="Kantine: neue Öffnungszeiten", title_en="Canteen: new opening hours",
      summary_de="Ab November ist die Kantine von 11:30 bis 14:00 Uhr geöffnet.",
      summary_en="From November the canteen is open from 11:30 to 14:00.")
    A(category="events", author_id=hr.id, created_at=now - timedelta(days=8),
      title_de="Erste-Hilfe-Auffrischung", title_en="First aid refresher",
      summary_de="Zweistündiger Kurs für alle Ersthelfer:innen, Besprechung Elbe (EG).",
      summary_en="Two-hour course for all first aiders, meeting room Elbe (ground floor).",
      event_date=datetime(2026, 11, 19, 9, 0), event_location="Besprechung Elbe, EG")
    A(category="events", author_id=editor.id, created_at=now - timedelta(days=12),
      title_de="Laufgruppe: Firmenlauf-Training", title_en="Running group: company run training",
      summary_de="Jeden Dienstag 17:30 Uhr ab Haupteingang, alle Tempos willkommen.",
      summary_en="Every Tuesday 17:30 from the main entrance, all paces welcome.",
      event_date=datetime(2026, 11, 10, 17, 30), event_location="Haupteingang")
    A(category="rules", author_id=hr.id, created_at=now - timedelta(days=30),
      title_de="Mobiles Arbeiten – Richtlinie 2026", title_en="Remote work policy 2026",
      summary_de="Bis zu zwei Tage pro Woche mobil, Kernzeit 9–15 Uhr, Abstimmung im Team.",
      summary_en="Up to two days a week remote, core hours 9–15, agreed within the team.",
      body_de="## Grundsätze\n\n- Bis zu **zwei Tage pro Woche** mobiles Arbeiten nach Absprache.\n- Kernzeit 9–15 Uhr, "
              "Erreichbarkeit über Teams.\n- Vertrauliche Unterlagen nicht in öffentlichen Räumen bearbeiten.",
      body_en="## Principles\n\n- Up to **two days a week** of remote work by agreement.\n- Core hours 9–15, reachable via "
              "Teams.\n- Don't work on confidential documents in public places.")
    A(category="rules", author_id=hr.id, created_at=now - timedelta(days=40),
      title_de="Urlaubsplanung und Vertretung", title_en="Holiday planning and cover",
      summary_de="Urlaub mindestens vier Wochen vorher beantragen und eine Vertretung eintragen.",
      summary_en="Request holiday at least four weeks ahead and name a stand-in.")
    A(category="safety", author_id=users["felix.zimmermann"].id, created_at=now - timedelta(days=20),
      title_de="Ergonomie am Bildschirmarbeitsplatz", title_en="Ergonomics at your desk",
      summary_de="Monitoroberkante auf Augenhöhe, Unterarme aufliegend, alle 60 Minuten aufstehen.",
      summary_en="Top of the monitor at eye level, forearms supported, stand up every 60 minutes.",
      body_de="## Checkliste\n\n- [x] Bildschirmabstand ca. eine Armlänge\n- [x] Füße flach auf dem Boden\n- [x] Licht seitlich, nicht im Rücken\n\n"
              "Höhenverstellbare Tische können über die Haustechnik angefragt werden.",
      body_en="## Checklist\n\n- [x] Screen about an arm's length away\n- [x] Feet flat on the floor\n- [x] Light from the side, not behind\n\n"
              "Height-adjustable desks can be requested from facilities.")
    A(category="cyber", author_id=users["jonas.weber"].id, created_at=now - timedelta(days=25),
      title_de="Passwörter und Passkeys", title_en="Passwords and passkeys",
      summary_de="Mindestens 14 Zeichen, nirgends doppelt – oder gleich Passkey nutzen.",
      summary_en="At least 14 characters, never reused – or just use a passkey.",
      body_de="Nutzen Sie den Firmen-Passwortmanager. Passwörter werden **nie** per Mail oder Telefon abgefragt – auch nicht von der IT.",
      body_en="Use the company password manager. Passwords are **never** requested by email or phone – not even by IT.")
    A(category="knowhow", author_id=users["jonas.weber"].id, created_at=now - timedelta(days=14),
      title_de="Drucker im 1. OG einrichten", title_en="Set up the first-floor printer",
      summary_de="In drei Schritten zum Netzwerkdrucker „OG1-Farbe“.",
      summary_en="Three steps to the network printer \"OG1-Color\".",
      body_de="1. **Einstellungen → Drucker** öffnen\n2. `\\\\print01\\OG1-Farbe` eingeben\n3. Testseite drucken\n\nKlappt es nicht? Ticket an it@muster-gmbh.de.",
      body_en="1. Open **Settings → Printers**\n2. Enter `\\\\print01\\OG1-Farbe`\n3. Print a test page\n\nNot working? Open a ticket at it@muster-gmbh.de.")
    A(category="knowhow", author_id=users["lukas.fischer"].id, created_at=now - timedelta(days=16),
      title_de="Wareneingang richtig buchen", title_en="Booking goods receipt correctly",
      summary_de="Lieferschein prüfen, Menge zählen, erst dann im ERP buchen.",
      summary_en="Check the delivery note, count, then book in the ERP.")
    A(category="news", author_id=users["lukas.fischer"].id, created_at=now - timedelta(hours=2),
      published_at=(now + timedelta(days=3)).replace(hour=7, minute=0, second=0, microsecond=0),
      title_de="Inventur 2026: Ablauf und Zeiten", title_en="Stocktaking 2026: schedule and times",
      summary_de="Am 28. und 29. Dezember zählen wir beide Hallen. Hier steht, wer wann eingeteilt ist.",
      summary_en="On 28 and 29 December we count both halls. Here is who is on which shift.",
      body_de="Geplanter Beitrag – erscheint automatisch zum eingestellten Zeitpunkt.",
      body_en="Scheduled post – appears automatically at the set time.")
    A(category="news", published=False, author_id=editor.id, created_at=now - timedelta(hours=1),
      title_de="Entwurf: Neues Parkkonzept", title_en="Draft: new parking plan",
      summary_de="Noch nicht veröffentlicht – nur für Redaktion sichtbar.",
      summary_en="Not yet published – visible to editors only.")

    # Kleinanzeigen ----------------------------------------------------------------------
    for kind, title, body, price, who, days in [
        ("offer", "Kinderfahrrad 20 Zoll", "Gut erhalten, blau, mit Licht. Abholung Parkplatz.", "40 €", "mehmet.yilmaz", 1),
        ("carpool", "Fahrgemeinschaft aus Lüneburg", "Fahre Mo–Do um 7:15 los, zwei Plätze frei.", "", "marta.kowalska", 2),
        ("give", "Zimmerpflanzen zu verschenken", "Drei Monstera-Ableger, stehen in der Küche im EG.", "", "nina.krueger", 3),
        ("search", "Suche Nachmieter für Garage", "Garage in Harburg ab Januar, 70 € monatlich.", "70 €", "tim.neumann", 6),
    ]:
        db.add(Classified(kind=kind, title=title, body=body, price=price, author_id=users[who].id,
                          created_at=now - timedelta(days=days)))
    # Past company events + sign-ups ------------------------------------------------
    A(category="events", author_id=hr.id, created_at=now - timedelta(days=120), image_url=photo("feier-tanz-1.jpg"),
      title_de="25 Jahre Muster GmbH", title_en="25 years of Muster GmbH",
      summary_de="Ein Vierteljahrhundert – gefeiert mit Musik, Tanz im Foyer und viel guter Laune. Danke an alle!",
      summary_en="A quarter of a century – celebrated with music, dancing in the lobby and lots of good cheer. Thank you all!",
      event_date=datetime(2026, 7, 3, 17, 0), event_location="Foyer, EG")
    A(category="events", author_id=editor.id, created_at=now - timedelta(days=30), image_url=photo("workshop-kolleginnen.jpg"),
      title_de="Team-Workshop Vertrieb & Einkauf", title_en="Sales & purchasing team workshop",
      summary_de="Ein Tag für Ideen: wie wir Anfragen schneller beantworten und Lieferanten besser einbinden.",
      summary_en="A day for ideas: answering enquiries faster and involving suppliers better.",
      event_date=datetime(2026, 10, 8, 9, 0), event_location="Besprechung Rhein, 1. OG")
    A(category="events", author_id=hr.id, created_at=now - timedelta(days=80), image_url=photo("ausflug-boot.jpg"),
      title_de="Betriebsausflug an die Elbe", title_en="Company outing to the Elbe",
      summary_de="Barkassenfahrt durch den Hafen mit anschließendem Abendessen.",
      summary_en="Harbour boat tour followed by dinner.",
      event_date=datetime(2026, 9, 12, 10, 0), event_location="Landungsbrücken")
    A(category="events", author_id=editor.id, created_at=now - timedelta(days=2),
      title_de="Neujahrsempfang 2027", title_en="New Year reception 2027",
      summary_de="Gemeinsamer Start ins neue Jahr mit Ausblick der Geschäftsführung.",
      summary_en="Kicking off the new year together with an outlook from the management.",
      event_date=datetime(2027, 1, 15, 16, 0), event_location="Kantine, EG")
    db.flush()

    # Attachments: event photo galleries and company PDFs ----------------------------
    def attach(title_de: str, items: list[dict]) -> None:
        article = db.query(Article).filter(Article.title_de == title_de).one()
        for i, item in enumerate(items):
            db.add(Attachment(article_id=article.id, sort=i, **item))

    attach("25 Jahre Muster GmbH", gallery(("feier-tanz-1.jpg", "Tanz im Foyer"), ("feier-tanz-2.jpg", "Die Tanzfläche ist eröffnet"),
                                           ("feier-konfetti.jpg", "Konfetti zum Jubiläum")))
    attach("Betriebsausflug an die Elbe", gallery(("ausflug-boot.jpg", "Unterwegs auf dem Wasser")))
    attach("Team-Workshop Vertrieb & Einkauf", gallery(("workshop-kolleginnen.jpg", "Vorstellung der Ergebnisse"),
                                                       ("workshop-schreibtisch.jpg", "Gruppenarbeit"),
                                                       ("team-monitor.jpg", "Prozesse gemeinsam durchgehen")))
    attach("Mobiles Arbeiten – Richtlinie 2026", [write_pdf("Richtlinie-Mobiles-Arbeiten-2026.pdf", "Richtlinie Mobiles Arbeiten 2026", [
        "1. Bis zu zwei Tage pro Woche mobiles Arbeiten nach Absprache im Team.",
        "2. Kernzeit 9-15 Uhr, Erreichbarkeit ueber Teams und Telefon.",
        "3. Vertrauliche Unterlagen nicht in oeffentlichen Raeumen bearbeiten.",
        "4. Firmengeraete nur im Firmen-VPN verwenden.",
        "Stand: 2026, Personalabteilung"])])
    attach("Neue Fahrwege im Lager Süd", [write_pdf("Brandschutzordnung-Teil-B.pdf", "Brandschutzordnung Teil B", [
        "Verhalten im Brandfall: Ruhe bewahren, Brand melden (Notruf 112, intern 999).",
        "Gefaehrdete Personen warnen, Tueren schliessen, Aufzuege nicht benutzen.",
        "Sammelplatz: Parkplatz vor dem Haupteingang.",
        "Feuerloescher: an jedem Hallentor und im Treppenhaus jeder Etage."]),
        write_pdf("Unterweisung-Flurfoerderzeuge.pdf", "Unterweisung Flurfoerderzeuge", [
        "Nur unterwiesene Personen mit Fahrausweis duerfen Stapler fahren.",
        "Vor Schichtbeginn: Sichtpruefung, Bremsen, Hupe, Licht.",
        "Fussgaenger nutzen ausschliesslich die gelb markierten Wege."])])
    attach("Passwörter und Passkeys", [write_pdf("IT-Sicherheitsrichtlinie.pdf", "IT-Sicherheitsrichtlinie", [
        "Passwoerter: mindestens 14 Zeichen, nie mehrfach verwenden.",
        "Passwoerter werden nie per Mail oder Telefon abgefragt - auch nicht von der IT.",
        "Verdaechtige Mails mit dem Button 'Phishing melden' weiterleiten."])])

    for article in db.query(Article).filter(Article.category == "events").all():
        if article.event_date:
            n = random.randint(3, 12)
            for voter in random.sample(list(users.values()), n):
                db.add(EventRsvp(article_id=article.id, user_id=voter.id))

    # Ideenbox ----------------------------------------------------------------------
    voters = list(users.values())
    for topic, status, title, body, response, who, anon, days, n_votes in [
        ("sustainability", "planned", "Pfandsystem für Kaffeebecher",
         "Statt Einwegbechern Mehrwegbecher mit 1 € Pfand am Automaten im EG.",
         "Super Idee! Start im Januar, die Becher sind bestellt.", "nina.krueger", False, 20, 11),
        ("process", "review", "Digitale Urlaubsanträge mit Vertretungsprüfung",
         "Beim Antrag automatisch prüfen, ob die Vertretung im selben Zeitraum frei ist.",
         "Wir prüfen das gerade mit der IT.", "elena.richter", False, 14, 8),
        ("safety", "done", "Spiegel an der Kreuzung Halle 2 / Tor 3",
         "Die Ecke ist für Stapler und Fußgänger schwer einsehbar.",
         "Umgesetzt – der Spiegel hängt seit Oktober. Danke!", "ahmed.haddad", False, 60, 14),
        ("workplace", "new", "Ruheraum für kurze Pausen",
         "Ein kleiner Raum ohne Bildschirme, z. B. das ehemalige Archiv im 2. OG.", "", "marta.kowalska", True, 3, 5),
        ("it", "new", "Self-Service für Passwort-Reset",
         "Damit man bei gesperrtem Konto nicht auf die IT warten muss.", "", "hannah.wolf", False, 2, 3),
        ("other", "declined", "Firmenhund im Büro",
         "Ein Bürohund für bessere Stimmung.", "Leider wegen Allergien im Team nicht möglich.", "david.klein", False, 40, 6),
    ]:
        idea = Idea(topic=topic, status=status, title=title, body=body, response=response, anonymous=anon,
                    author_id=None if anon else users[who].id, created_at=now - timedelta(days=days),
                    status_changed_at=(now - timedelta(days=days // 2)) if status != "new" else None)
        db.add(idea)
        db.flush()
        # Star ratings: well-received ideas mostly get 4-5 stars, the declined one a mixed picture.
        weights = [1, 1, 3, 6, 9] if status != "declined" else [3, 3, 3, 2, 1]
        for voter in [v for v in voters if v.username != who][:n_votes]:
            db.add(IdeaVote(idea_id=idea.id, user_id=voter.id, stars=random.choices(range(1, 6), weights)[0]))

    add_iso_documents(db, editor.id, now)
    add_demo_rooms(db)
    db.flush()
    add_demo_links(db)
    add_demo_trainings(db)
    add_demo_polls(db)
    db.flush()
    add_demo_org(db)
    add_demo_branches(db)
    add_demo_pinned(db)
    add_demo_jubilees(db)
    db.flush()
    add_demo_photos(db)
    db.commit()
    print("Demo data created. Passwords are shown only now - note them down:")
    print(f"  admin            {admin_pw}   (administrator)")
    print(f"  all other users  {staff_pw}   (e.g. lea.hoffmann = editor, mehmet.yilmaz = user)")


ORG = {  # person -> manager (demo org chart)
    "sophie.schulz": "anna.becker", "lea.hoffmann": "anna.becker", "katrin.lange": "anna.becker",
    "elena.richter": "katrin.lange", "clara.braun": "anna.becker", "tim.neumann": "clara.braun",
    "jonas.weber": "anna.becker", "david.klein": "jonas.weber", "mehmet.yilmaz": "anna.becker",
    "hannah.wolf": "mehmet.yilmaz", "nina.krueger": "mehmet.yilmaz", "lukas.fischer": "anna.becker",
    "paul.schroeder": "lukas.fischer", "ahmed.haddad": "lukas.fischer", "felix.zimmermann": "lukas.fischer",
    "marta.kowalska": "felix.zimmermann", "jana.peters": "felix.zimmermann",
}


BRANCH_PEOPLE = {"München": ["felix.zimmermann", "marta.kowalska", "jana.peters"]}


def add_demo_branches(db) -> int:
    """Two sites: Hamburg (head office, most people) and München (fulfillment), plus one event and one
    news item only for München - so the branch limit can be seen."""
    if db.query(Branch).count():
        return 0
    hh, mu = Branch(name="Hamburg", sort=0), Branch(name="München", sort=1)
    db.add_all([hh, mu])
    db.flush()
    for u in db.query(User).filter(User.username != "admin"):
        u.branch_id = mu.id if u.username in BRANCH_PEOPLE["München"] else hh.id
    editor = db.query(User).filter(User.role == "editor").first()
    now = datetime.now()
    nxt = (now + timedelta(days=12)).replace(hour=14, minute=0, second=0, microsecond=0)
    db.add_all([
        Article(category="events", title_de="Betriebsversammlung Standort München", title_en="Staff meeting Munich site",
                summary_de="Neuer Schichtplan, Umbau der Packstraße und Fragen an die Leitung.",
                summary_en="New shift plan, packing line rebuild and questions to management.",
                body_de="Alle Kolleg:innen am Standort München sind eingeladen. Treffpunkt: Pausenraum Halle 1.",
                event_date=nxt, event_location="München, Pausenraum Halle 1", author_id=editor.id if editor else None,
                published_at=now - timedelta(hours=2), notified_at=now, branches=[mu]),
        Article(category="news", title_de="München: Parkplatz ab Montag gesperrt", title_en="Munich: car park closed from Monday",
                summary_de="Wegen Asphaltarbeiten bitte eine Woche lang auf der Gewerbestraße parken.",
                summary_en="Due to resurfacing please park on Gewerbestraße for one week.",
                body_de="Die Arbeiten dauern voraussichtlich bis Freitag.", author_id=editor.id if editor else None,
                published_at=now - timedelta(hours=5), notified_at=now, branches=[mu]),
    ])
    return 2


PLAN_2027 = """## Jahresplanung 2027 – bitte bei der Urlaubsplanung beachten

| Wann | Was | Wer |
|---|---|---|
| 4.–8. Januar | **Inventur** Lager Nord und Süd – kein Urlaub im Lager | Versand, Fulfillment |
| 31. März | Jahresabschluss | Finanzen |
| 12.–16. April | ISO-9001-Audit | alle Abteilungen |
| 25. Juni | Sommerfest (Termin per Umfrage) | alle |
| 1.–30. September | Hauptsaison: Urlaubssperre Versand | Versand, Fulfillment |
| 24. Dezember – 1. Januar | **Betriebsferien** | alle |

Fragen zur Urlaubsplanung: Personalabteilung, Durchwahl 140.
"""


def add_demo_pinned(db) -> int:
    """A pinned annual plan - the kind of article that should stay on top for a long time."""
    if db.query(Article).filter(Article.pinned.is_(True)).count():
        return 0
    editor = db.query(User).filter(User.role == "editor").first()
    now = datetime.now()
    db.add(Article(category="rules", title_de="Jahresplanung 2027: Inventur, Audit, Betriebsferien",
                   title_en="Annual plan 2027: stocktaking, audit, company holidays",
                   summary_de="Die wichtigsten Termine des Jahres – bitte vor dem Urlaubsantrag reinschauen.",
                   summary_en="The key dates of the year – please check before requesting leave.",
                   body_de=PLAN_2027, author_id=editor.id if editor else None, published_at=now - timedelta(days=1),
                   notified_at=now, pinned=True, pinned_until=date(2027, 12, 31)))
    return 1


def add_demo_org(db) -> int:
    """Who reports to whom - only when nobody has a manager yet."""
    if db.query(User).filter(User.manager_id.isnot(None)).count():
        return 0
    users = {u.username: u for u in db.query(User).all()}
    n = 0
    for person, manager in ORG.items():
        if person in users and manager in users:
            users[person].manager_id = users[manager].id
            n += 1
    return n


def add_demo_polls(db) -> int:
    """Two running polls and a finished one with votes, so the page and the home card are not empty."""
    import json
    if db.query(Poll).count():
        return 0
    staff = db.query(User).filter(User.is_active.is_(True), User.username.notin_(["admin", "lea.hoffmann", "mehmet.yilmaz"])).order_by(User.id).all()
    creator = db.query(User).filter(User.role == "editor").first()
    now = datetime.now()
    polls = [
        ("Welcher Termin passt für das Sommerfest 2027?", "Which date suits you for the 2027 summer party?",
         "Wir feiern wieder im Lager Nord. Bitte bis Ende des Monats abstimmen.", "",
         [("Freitag, 25. Juni", "Friday, 25 June"), ("Freitag, 2. Juli", "Friday, 2 July"), ("Samstag, 3. Juli", "Saturday, 3 July")],
         False, "after_vote", now + timedelta(days=21), [0, 0, 1, 0, 2, 1, 0, 0, 1]),
        ("Was wünschen Sie sich für die Kantine?", "What would you like in the canteen?",
         "Mehrere Antworten möglich.", "Several answers possible.",
         [("Mehr vegetarische Gerichte", "More vegetarian dishes"), ("Salatbar", "Salad bar"),
          ("Frühstück ab 7 Uhr", "Breakfast from 7 am"), ("Kaffee-Flatrate", "Coffee flat rate")],
         True, "always", None, [[0, 1], [1], [0, 3], [3], [1, 2], [0]]),
        ("Wie zufrieden sind Sie mit dem neuen Zeiterfassungs-Terminal?", "How happy are you with the new time clock?",
         "", "", [("Sehr zufrieden", "Very happy"), ("Zufrieden", "Happy"), ("Geht so", "So-so"), ("Unzufrieden", "Unhappy")],
         False, "after_close", now - timedelta(days=5), [1, 0, 1, 1, 2, 0, 1, 1, 3, 1, 0]),
    ]
    for q_de, q_en, d_de, d_en, options, multiple, results, closes, votes in polls:
        p = Poll(question_de=q_de, question_en=q_en, description_de=d_de, description_en=d_en, multiple=multiple,
                 results=results, closes_at=closes, created_by=creator.id if creator else None,
                 options=json.dumps([{"de": a, "en": b} for a, b in options], ensure_ascii=False),
                 created_at=now - timedelta(days=12 if closes and closes < now else 3))
        db.add(p)
        db.flush()
        for person, choice in zip(staff, votes):  # the demo logins have not voted yet, so they can try it
            db.add(PollVote(poll_id=p.id, user_id=person.id, choices=json.dumps(choice if isinstance(choice, list) else [choice])))
    return len(polls)


JUBILEES = [  # username (None = no account), kind, years, days from today, text
    ("anna.becker", "service", 10, 3, "Zehn Jahre Geschäftsführung – danke für die ruhige Hand in bewegten Zeiten."),
    ("paul.schroeder", "service", 25, 12, "Ein Vierteljahrhundert im Lager – Paul kennt jedes Regal mit Vornamen."),
    ("elena.richter", "birthday", 50, 20, ""),
    ("tim.neumann", "service", 5, -3, ""),
    (None, "retirement", None, 30, "Hans Meier geht nach 38 Jahren in den Ruhestand – Abschied am Freitag in der Kantine."),
]


def add_demo_jubilees(db) -> int:
    """A few anniversaries around today for the home block, and one policy that asks readers to confirm it."""
    n = 0
    if not db.query(Jubilee).count():
        users = {u.username: u for u in db.query(User).all()}
        hr = db.query(User).filter(User.role == "hr").first() or db.query(User).filter(User.role == "admin").first()
        for username, kind, years, offset, text in JUBILEES:
            u = users.get(username) if username else None
            if username and not u:
                continue
            db.add(Jubilee(user_id=u.id if u else None, name="" if u else "Hans Meier", kind=kind, years=years,
                           on_date=date.today() + timedelta(days=offset), text_de=text, created_by=hr.id if hr else None))
            n += 1
    if not db.query(Article).filter(Article.ack_required.is_(True)).count():
        policy = db.query(Article).filter(Article.category == "rules", Article.title_de.ilike("%Mobiles Arbeiten%")).first()
        if policy:
            policy.ack_required = True  # "Lesebestätigung": every reader confirms "read and understood"
    return n


if __name__ == "__main__":
    if "--jubilees" in sys.argv:  # demo anniversaries + one policy with read confirmation for an existing database
        db = SessionLocal()
        print(f"{add_demo_jubilees(db)} anniversaries added.")
        db.commit()
    elif "--photos" in sys.argv:  # real photos for an existing database (only where nothing is set)
        db = SessionLocal()
        print(f"{add_demo_photos(db)} photos added.")
        db.commit()
    elif "--pinned" in sys.argv:
        db = SessionLocal()
        print(f"{add_demo_pinned(db)} pinned article added.")
        db.commit()
    elif "--branches" in sys.argv:  # demo branches for an existing database
        db = SessionLocal()
        print(f"{add_demo_branches(db)} branches added.")
        db.commit()
    elif "--org" in sys.argv:  # demo org chart for an existing database
        db = SessionLocal()
        print(f"{add_demo_org(db)} reporting lines added.")
        db.commit()
    elif "--polls" in sys.argv:  # demo polls for an existing database
        db = SessionLocal()
        print(f"{add_demo_polls(db)} polls added.")
        db.commit()
    elif "--trainings" in sys.argv:  # quick-access tiles + trainings for an existing database
        db = SessionLocal()
        print(f"{add_demo_links(db)} tiles, {add_demo_trainings(db)} trainings added.")
        db.commit()
    elif "--rooms" in sys.argv:  # add the demo rooms to an existing database (floors that have none yet)
        db = SessionLocal()
        print(f"{add_demo_rooms(db)} rooms added.")
        db.commit()
    elif "--iso" in sys.argv:  # add only the ISO documents to an existing database
        db = SessionLocal()
        print("ISO documents and policies added." if add_iso_documents(db, db.query(User).filter(User.role == "editor").first().id,
                                                           datetime.now()) else "Already present.")
        db.commit()
    else:
        seed(reset="--reset" in sys.argv)
