"""E-mail and Microsoft Teams notifications.

* New articles and events: when an article becomes visible (published, publication date reached) every
  person who may see it and has *new articles* switched on in the profile gets an e-mail; the Teams channel
  (incoming webhook / Workflows) gets one card. A background thread checks once a minute, so scheduled
  articles are announced when they go live.
* Ideas: the author gets an e-mail when the status or the answer of their idea changes (never for anonymous
  ideas - they have no author).

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

from app.config import settings
from app.db import SessionLocal
from app.models import Article, Idea, User

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


FOOTER = "Sie erhalten diese Nachricht, weil Benachrichtigungen in Ihrem Profil eingeschaltet sind. Abbestellen: Intranet → Profil → Benachrichtigungen."


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
        text = f"{kind}: {title}\n\n{lead}\n" + (f"\nWann: {when}\nWo: {article.event_location}\n" if when else "") + f"\n{url}\n\n{FOOTER}\n"
        msgs = [_message(u.email, f"{kind}: {title}", text,
                         _html(title, lead + (f" – {when}, {article.event_location}" if when else ""), url, "Weiterlesen", FOOTER))
                for u in people if may_see(u, article)]
        result["mails"] = send_mails(msgs)
    if teams_ready() and article_is_public_to_all(article):
        facts = [("Wann", when), ("Wo", article.event_location)] if when else None
        result["teams"] = post_teams(f"{kind}: {title}", lead, url, facts)
    return result


def article_is_public_to_all(article: Article) -> bool:
    """Teams channels reach everybody: only announce articles that are not limited to some branches."""
    return not getattr(article, "branch_ids", None)


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
        answer = f"\n\nAntwort: {idea.response}" if idea.response else ""
        text = f"Ihre Idee „{idea.title}“ hat den Status: {status}.{answer}\n\n{url}\n\n{FOOTER}\n"
        lead = f"Neuer Status: {status}." + (f" Antwort: {idea.response}" if idea.response else "")
        send_mails([_message(u.email, f"Ihre Idee: {status}", text, _html(f"„{idea.title}“", lead, url, "Zur Idee", FOOTER))])
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
            try:
                check_new_articles()
            except Exception:  # noqa: BLE001 - keep the loop alive
                log.exception("notification check failed")
            time.sleep(CHECK_SECONDS)

    threading.Thread(target=run, name="lotse-notify", daemon=True).start()
