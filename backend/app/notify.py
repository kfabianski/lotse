"""E-mail and Microsoft Teams notifications.

* New articles and events: when an article becomes visible (published, publication date reached) every
  person who may see it and has *new articles* switched on in the profile gets an e-mail; the Teams channel
  (incoming webhook / Workflows) gets one card. A background thread checks once a minute, so scheduled
  articles are announced when they go live.
* Ideas: the author gets an e-mail when the status or the answer of their idea changes (never for anonymous
  ideas - they have no author).
* Trainings: everyone a mandatory training is assigned to (person, group, department, branch, position, new
  colleagues, all) gets one e-mail that it is waiting for them - also people who join a group or department
  later, and everyone again when a new round starts. Not for voluntary trainings, not for people who already
  confirmed this round. Mandatory, so it ignores the profile switches.

Everything is off until an administrator enables it in Verwaltung -> Einstellungen."""
import html
import json
import logging
import smtplib
import ssl
import threading
import time
import urllib.request
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from app import mail_templates
from app.config import settings
from app.db import SessionLocal
from app.models import Article, Idea, Training, TrainingCompletion, TrainingNotice, User

log = logging.getLogger("lotse.notify")
CHECK_SECONDS = 60
MAX_AGE = timedelta(days=1)  # older unannounced articles are not mailed (e.g. right after switching it on)
CATEGORY_DE = {"news": "Neuigkeit", "events": "Termin", "people": "Neu im Team", "products": "Neues Produkt",
               "rules": "Richtlinie", "safety": "Arbeitssicherheit", "cyber": "IT-Sicherheit", "knowhow": "Know-how"}
STATUS_DE = {"new": "Neu", "review": "In Prüfung", "planned": "Geplant", "done": "Umgesetzt", "declined": "Abgelehnt"}


def mail_ready() -> bool:
    return bool(settings.notify_email and settings.smtp_host and settings.smtp_from)


def teams_ready() -> bool:
    return bool(settings.notify_teams and settings.teams_webhook_url)


def portal(path: str) -> str:
    return (settings.portal_url or "").rstrip("/") + path


# --- sending ---------------------------------------------------------------------------------------------
def _smtp():
    ctx = ssl.create_default_context()
    if settings.smtp_mode == "ssl":
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=ctx, timeout=20)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20)
        if settings.smtp_mode == "starttls":
            server.starttls(context=ctx)
    if settings.smtp_user:
        server.login(settings.smtp_user, settings.smtp_password)
    return server


def _message(to: str, subject: str, text: str, html_body: str) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((settings.company_name + " Intranet", settings.smtp_from))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=settings.smtp_from.split("@")[-1] or None)
    msg["Auto-Submitted"] = "auto-generated"  # no out-of-office replies
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")
    return msg


def send_mails(messages: list[EmailMessage]) -> int:
    """Sends over one connection; returns how many went out. Errors are logged, never raised."""
    if not messages:
        return 0
    sent = 0
    try:
        with _smtp() as server:
            for m in messages:
                try:
                    server.send_message(m)
                    sent += 1
                except smtplib.SMTPException as exc:
                    log.warning("mail to %s failed: %s", m["To"], exc)
    except (OSError, smtplib.SMTPException) as exc:
        log.warning("SMTP connection failed: %s", exc)
    return sent


def post_teams(title: str, text: str, url: str, facts: list[tuple[str, str]] | None = None) -> bool:
    """Adaptive card for a Teams channel webhook (Workflows "post to a channel when a webhook request is received")."""
    body = [{"type": "TextBlock", "text": title, "weight": "Bolder", "size": "Medium", "wrap": True}]
    if text:
        body.append({"type": "TextBlock", "text": text, "wrap": True})
    if facts:
        body.append({"type": "FactSet", "facts": [{"title": k, "value": v} for k, v in facts]})
    card = {"type": "AdaptiveCard", "$schema": "http://adaptivecards.io/schemas/adaptive-card.json", "version": "1.4",
            "body": body, "actions": [{"type": "Action.OpenUrl", "title": "Im Intranet öffnen", "url": url}] if url.startswith("http") else []}
    payload = {"type": "message", "attachments": [{"contentType": "application/vnd.microsoft.card.adaptive", "content": card}]}
    req = urllib.request.Request(settings.teams_webhook_url, json.dumps(payload).encode(), {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:  # noqa: S310 - https only, admin-set URL
            return 200 <= res.status < 300
    except OSError as exc:
        log.warning("Teams webhook failed: %s", exc)
        return False


def _html(title: str, lead: str, url: str, button: str, footer: str) -> str:
    e = html.escape
    link = f'<p><a href="{e(url)}" style="display:inline-block;background:#3557f5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">{e(button)}</a></p>' if url.startswith("http") else ""
    return (f'<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;color:#111">'
            f'<p style="color:#667;font-size:13px;margin:0">{e(settings.company_name)} · Intranet</p>'
            f'<h2 style="margin:6px 0 10px">{e(title)}</h2><p style="font-size:15px;line-height:1.5">{e(lead)}</p>{link}'
            f'<p style="color:#889;font-size:12px;margin-top:28px">{e(footer)}</p></div>')


FOOTER = mail_templates.FOOTER


def _person(u: User) -> dict:
    name = u.full_name or u.username
    return {"name": name, "first_name": name.split()[0] if name.split() else name}


# --- new articles ----------------------------------------------------------------------------------------
def may_see(user: User, article: Article) -> bool:
    """Same rule as the article list (extended for branches)."""
    from app.routers.content import visible_to
    return visible_to(user, article)


def announce(db, article: Article) -> dict:
    title = article.title_de
    url = portal(f"/articles/{article.id}")
    kind = CATEGORY_DE.get(article.category, "Neuer Beitrag")
    lead = article.summary_de or ""
    when = article.event_date.strftime("%d.%m.%Y, %H:%M Uhr") if article.event_date else ""
    result = {"mails": 0, "teams": False}
    if mail_ready():
        people = db.query(User).filter(User.is_active.is_(True), User.notify_articles.is_(True), User.email.isnot(None),
                                       User.email != "").all()
        tpl = mail_templates.load(db)["article"]
        values = {"article": title, "summary": lead, "category": kind,
                  "when": f"Wann: {when}" + (f" · Wo: {article.event_location}" if article.event_location else "") if when else "",
                  "author": article.author.full_name if article.author else ""}
        msgs = []
        for u in people:
            if may_see(u, article):
                subject, page, text = mail_templates.render("article", tpl, {**values, **_person(u)}, url)
                msgs.append(_message(u.email, subject, text, page))
        result["mails"] = send_mails(msgs)
    if teams_ready() and article_is_public_to_all(article):
        facts = [("Wann", when), ("Wo", article.event_location)] if when else None
        result["teams"] = post_teams(f"{kind}: {title}", lead, url, facts)
    return result


def article_is_public_to_all(article: Article) -> bool:
    """Teams channels reach everybody: only announce articles that are not limited to some branches."""
    return not article.branches


def check_new_articles() -> int:
    """Announce articles that became visible since the last run. Returns how many were announced."""
    db = SessionLocal()
    try:
        now = datetime.now()
        pending = db.query(Article).filter(Article.notified_at.is_(None), Article.live()).all()
        done = 0
        for a in pending:
            a.notified_at = now  # mark first: never mail twice, even if sending fails half-way
            db.commit()
            if (mail_ready() or teams_ready()) and a.published_at and now - a.published_at <= MAX_AGE:
                announce(db, a)
                done += 1
        return done
    finally:
        db.close()


# --- ideas -----------------------------------------------------------------------------------------------
def idea_changed(idea_id: int) -> None:
    """Mail the author of a (non-anonymous) idea about the new status / answer. Runs in a thread."""
    if not mail_ready():
        return
    db = SessionLocal()
    try:
        idea = db.get(Idea, idea_id)
        if not idea or idea.anonymous or not idea.author:
            return
        u = idea.author
        if not (u.is_active and u.notify_ideas and u.email):
            return
        status = STATUS_DE.get(idea.status, idea.status)
        url = portal(f"/ideas#idea-{idea.id}")
        values = {"idea": idea.title, "status": status, "answer": f"Antwort: {idea.response}" if idea.response else "", **_person(u)}
        subject, page, text = mail_templates.render("idea", mail_templates.load(db)["idea"], values, url)
        send_mails([_message(u.email, subject, text, page)])
    finally:
        db.close()


# --- trainings -------------------------------------------------------------------------------------------
def check_training_assignments() -> int:
    """Mail people a mandatory training is waiting for (once per training round). Returns the number of mails."""
    if not mail_ready():
        return 0
    from app.routers.trainings import assigned_ids
    db = SessionLocal()
    try:
        tpl = mail_templates.load(db)["training"]
        msgs = []
        for t in db.query(Training).filter(Training.active.is_(True)).all():
            todo = assigned_ids(db, t)
            if not todo:
                continue
            completions = {c.user_id: c.version for c in
                           db.query(TrainingCompletion).filter(TrainingCompletion.training_id == t.id)}
            notices = {n.user_id: n for n in db.query(TrainingNotice).filter(TrainingNotice.training_id == t.id)}
            for u in db.query(User).filter(User.id.in_(todo), User.email.isnot(None), User.email != "").all():
                if completions.get(u.id) == t.version:
                    continue  # already confirmed this round
                n = notices.get(u.id)
                if n is not None and n.version >= t.version:
                    continue  # already told about this round
                again = u.id in completions or n is not None
                if n is None:
                    db.add(TrainingNotice(training_id=t.id, user_id=u.id, version=t.version, sent_at=datetime.now()))
                else:
                    n.version, n.sent_at = t.version, datetime.now()
                values = {"training": t.title_de,
                          "due": f"Bitte erledigen bis {t.due_date.strftime('%d.%m.%Y')}." if t.due_date else "",
                          "round": "Neue Runde – bitte erneut bestätigen." if again and t.version > 1 else "",
                          **_person(u)}
                subject, page, text = mail_templates.render("training", tpl, values, portal(f"/trainings/{t.id}"))
                msgs.append(_message(u.email, subject, text, page))
        db.commit()  # mark first: never mail twice, even if sending fails half-way
        return send_mails(msgs) if msgs else 0
    finally:
        db.close()


def in_background(fn, *args) -> None:
    threading.Thread(target=fn, args=args, daemon=True).start()


# --- loop ------------------------------------------------------------------------------------------------
_started = False


def start_loop() -> None:
    global _started
    if _started:
        return
    _started = True

    def run():
        while True:
            for check in (check_new_articles, check_training_assignments):
                try:
                    check()
                except Exception:  # noqa: BLE001 - keep the loop alive
                    log.exception("notification check failed: %s", check.__name__)
            time.sleep(CHECK_SECONDS)

    threading.Thread(target=run, name="lotse-notify", daemon=True).start()
