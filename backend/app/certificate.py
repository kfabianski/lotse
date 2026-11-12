"""Printable proof (PDF) that a person confirmed a training - for audits, the personnel file or a signature.

One A4 page, set in the portal's own typeface (Hanken Grotesk, shipped in ``app/assets/fonts``), German or English.
The page is laid out by hand without automatic page breaks: the signature block floats below the text but never past
``SIGN_MAX``, and a long list of materials is cut off with "... and n more" instead of spilling onto a second page."""
from datetime import datetime
from pathlib import Path

from fpdf import FPDF

from app.config import settings
from app.models import Training, TrainingCompletion, User

FONTS = Path(__file__).resolve().parent / "assets" / "fonts"
INK, MUTED, RULE, SOFT = (29, 53, 87), (55, 98, 125), (200, 214, 222), (227, 241, 242)
SIGN_MIN, SIGN_MAX, SIGN_GAP = 222, 250, 22  # signature line (mm): at least SIGN_GAP below the text, between SIGN_MIN and SIGN_MAX
TEXT = {
    "de": {
        "title": "Schulungsnachweis", "kicker": "Unterweisung · Schulung · Pflichtlektüre",
        "person": "Mitarbeiter:in", "department": "Abteilung", "position": "Position", "branch": "Niederlassung",
        "training": "Schulung", "round": "Runde", "due": "Fällig bis", "confirmed": "Bestätigt am", "materials": "Unterlagen",
        "more": "… und {n} weitere Unterlagen",
        "statement": "„Ich habe die Schulung durchgearbeitet und verstanden.“",
        "body": "{name} hat die Schulung „{training}“ am {date} im Intranet durchgearbeitet und die Kenntnisnahme mit der "
                "obenstehenden Erklärung bestätigt. Die Bestätigung ist mit Datum und Uhrzeit im Intranet gespeichert.",
        "sign_employee": "Datum, Unterschrift Mitarbeiter:in", "sign_manager": "Datum, Unterschrift Vorgesetzte:r / Unterweisende:r",
        "footer": "Erstellt am {date} aus dem Intranet der {company} · Nachweis {ref}",
        "kind": {"pdf": "PDF", "video": "Video", "image": "Bild", "link": "Link"},
    },
    "en": {
        "title": "Training certificate", "kicker": "Instruction · Training · Mandatory reading",
        "person": "Employee", "department": "Department", "position": "Position", "branch": "Site",
        "training": "Training", "round": "Round", "due": "Due by", "confirmed": "Confirmed on", "materials": "Materials",
        "more": "… and {n} more documents",
        "statement": "“I have worked through the training and understood it.”",
        "body": "{name} worked through the training “{training}” in the intranet on {date} and confirmed it with the "
                "statement above. The confirmation is stored in the intranet with date and time.",
        "sign_employee": "Date, signature employee", "sign_manager": "Date, signature supervisor / instructor",
        "footer": "Created on {date} from the {company} intranet · certificate {ref}",
        "kind": {"pdf": "PDF", "video": "Video", "image": "Image", "link": "Link"},
    },
}


def _face(pdf: FPDF) -> str:
    regular, bold = FONTS / "HankenGrotesk-400.ttf", FONTS / "HankenGrotesk-700.ttf"
    if regular.is_file() and bold.is_file():
        pdf.add_font("Hanken", "", str(regular))
        pdf.add_font("Hanken", "B", str(bold))
        return "Hanken"
    return "Helvetica"  # core font (Latin-1 only) when the shipped fonts are missing


def _fit(pdf: FPDF, text: str, width: float) -> str:
    """Trim ``text`` to one line of ``width`` mm in the current font, ending in an ellipsis."""
    if pdf.get_string_width(text) <= width:
        return text
    while text and pdf.get_string_width(text + "…") > width:
        text = text[:-1]
    return text.rstrip() + "…"


def training_certificate(t: Training, person: User, done: TrainingCompletion, manager: User | None, branch: str,
                         lang: str = "de") -> bytes:
    s = TEXT.get(lang, TEXT["de"])
    title = t.title_en if (lang == "en" and t.title_en) else t.title_de
    pdf = FPDF(format="A4")
    pdf.set_margins(22, 20, 22)
    pdf.set_auto_page_break(False)  # one page by design, see the module docstring
    pdf.add_page()
    face = _face(pdf)
    left, right = 22, 188

    pdf.set_font(face, "", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5, f"{settings.company_name} · Intranet", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(face, "B", 22)
    pdf.set_text_color(*INK)
    pdf.cell(0, 12, s["title"], new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(face, "", 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 6, s["kicker"], new_x="LMARGIN", new_y="NEXT")
    y = pdf.get_y() + 3
    pdf.set_draw_color(*INK)
    pdf.set_line_width(0.6)
    pdf.line(left, y, right, y)
    pdf.set_y(y + 6)

    rows = [(s["person"], person.full_name, True), (s["department"], person.department or "–", False),
            (s["position"], person.position or "–", False)]
    if branch:
        rows.append((s["branch"], branch, False))
    rows += [(s["training"], title, True), (s["round"], str(done.version), False)]
    if t.due_date:
        rows.append((s["due"], t.due_date.strftime("%d.%m.%Y"), False))
    rows.append((s["confirmed"], done.completed_at.strftime("%d.%m.%Y, %H:%M"), True))
    pdf.set_draw_color(*RULE)
    pdf.set_line_width(0.2)
    for label, value, strong in rows:
        pdf.set_font(face, "", 10)
        pdf.set_text_color(*MUTED)
        pdf.cell(48, 8, label)
        pdf.set_font(face, "B" if strong else "", 11)
        pdf.set_text_color(*INK)
        pdf.multi_cell(0, 8, value, align="L", new_x="LMARGIN", new_y="NEXT")
        yy = pdf.get_y()
        pdf.line(left, yy, right, yy)
    pdf.ln(7)

    pdf.set_fill_color(*SOFT)
    pdf.set_font(face, "B", 12)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 9, s["statement"], align="L", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font(face, "", 11)
    pdf.multi_cell(0, 6.5, s["body"].format(name=person.full_name, training=title,
                                             date=done.completed_at.strftime("%d.%m.%Y, %H:%M")), align="L", new_x="LMARGIN", new_y="NEXT")

    if t.materials:
        limit = SIGN_MAX - SIGN_GAP  # the list must end here so that the signatures still fit on this page
        pdf.ln(4)
        pdf.set_font(face, "B", 10)
        pdf.set_text_color(*MUTED)
        pdf.cell(0, 6, s["materials"], new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(face, "", 10)
        pdf.set_text_color(*INK)
        for i, m in enumerate(t.materials):
            rest = len(t.materials) - i
            if rest > 1 and pdf.get_y() + 12 > limit:  # this line plus one more would not fit: summarise the rest
                pdf.cell(0, 6, s["more"].format(n=rest), new_x="LMARGIN", new_y="NEXT")
                break
            line = f"•  {m.name}  ({s['kind'].get(m.kind, m.kind)})"
            pdf.cell(0, 6, _fit(pdf, line, right - left), new_x="LMARGIN", new_y="NEXT")

    y = min(max(pdf.get_y() + SIGN_GAP, SIGN_MIN), SIGN_MAX)
    pdf.set_draw_color(*INK)
    pdf.set_line_width(0.3)
    for x, label, name in ((left, s["sign_employee"], person.full_name), (108, s["sign_manager"], manager.full_name if manager else "")):
        pdf.line(x, y, x + 76, y)
        pdf.set_xy(x, y + 1.5)
        pdf.set_font(face, "", 8)
        pdf.set_text_color(*MUTED)
        pdf.cell(76, 4, label)
        if name:
            pdf.set_xy(x, y + 6)
            pdf.set_font(face, "", 9)
            pdf.set_text_color(*INK)
            pdf.cell(76, 4, name)

    pdf.set_y(-20)
    pdf.set_font(face, "", 8)
    pdf.set_text_color(*MUTED)
    ref = f"T{t.id}-P{person.id}-R{done.version}"
    pdf.cell(0, 4, s["footer"].format(date=datetime.now().strftime("%d.%m.%Y, %H:%M"), company=settings.company_name, ref=ref))
    return bytes(pdf.output())
