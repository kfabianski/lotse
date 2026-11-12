"""Text helpers shared by the search and its index: accent folding, markup stripping, snippets."""
import html
import re
import unicodedata

_FOLD = str.maketrans({"ß": "ss", "ı": "i", "ł": "l", "ø": "o", "æ": "ae", "œ": "oe", "đ": "d"})
_TAGS = re.compile(r"<[^>]+>")
_MD = re.compile(r"[#*_`>\[\]()|~]+")


def fold(text: str) -> str:
    """Lower case without accents: "Schröder" → "schroder", "Yılmaz" → "yilmaz", "Straße" → "strasse"."""
    text = unicodedata.normalize("NFKD", (text or "").casefold().translate(_FOLD))
    return "".join(c for c in text if not unicodedata.combining(c))


def collapse(folded: str) -> str:
    """"Schroeder" written with oe should also find "Schröder": ae/oe/ue become a/o/u."""
    return folded.replace("ae", "a").replace("oe", "o").replace("ue", "u")


def plain(text: str) -> str:
    """Body text without HTML / Markdown markup, for matching and snippets."""
    return " ".join(_MD.sub(" ", html.unescape(_TAGS.sub(" ", text or ""))).split())


def matches(words: list[str], *fields: str) -> bool:
    """Every word occurs somewhere in the fields (accents and ae/oe/ue spelling ignored)."""
    hay = fold(" ".join(f for f in fields if f))
    alt = collapse(hay)
    return all(w in hay or collapse(w) in alt for w in words)


def snippet(words: list[str], text: str, size: int = 170) -> str:
    """A piece of the text around the first hit."""
    text = plain(text)
    if len(text) <= size:
        return text
    low = fold(text)  # same length as text for nearly all European scripts
    pos = min((p for p in (low.find(w) for w in words) if p >= 0), default=0)
    start = max(0, min(pos - 50, len(text) - size)) if len(low) == len(text) else 0
    cut = text[start:start + size].strip()
    return ("… " if start else "") + cut + (" …" if start + size < len(text) else "")
