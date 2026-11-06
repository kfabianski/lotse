"""Public holidays for Germany, Austria and Switzerland (computed locally with the `holidays` package – no internet
needed). Which countries/regions are shown is an admin setting (``holiday_regions``), e.g. ["DE", "AT", "CH"] for the
nationwide holidays or ["DE-NI", "AT", "CH-ZH"] including the regional ones of one state/canton."""

from datetime import date
from functools import lru_cache

import holidays

COUNTRIES = ("DE", "AT", "CH")
FIRST_YEAR_OFFSET, LAST_YEAR_OFFSET = -1, 10  # last year (review) up to ten years ahead


@lru_cache(maxsize=None)
def regions() -> dict[str, list[dict]]:
    """Selectable states/cantons per country: [{code, name}] (first full-name alias of each code)."""
    out = {}
    for country in COUNTRIES:
        cls = holidays.country_holidays(country).__class__
        aliases = getattr(cls, "subdivisions_aliases", {}) or {}
        names = {}
        for alias, code in aliases.items():
            if code not in names and len(alias) > 3:
                names[code] = alias
        out[country] = [{"code": c, "name": names.get(c, c)} for c in cls.subdivisions if c in names]
    return out


def valid_region(value: str) -> bool:
    country, _, sub = value.partition("-")
    if country not in COUNTRIES:
        return False
    return not sub or any(r["code"] == sub for r in regions()[country])


@lru_cache(maxsize=256)
def _year(region: str, year: int, lang: str) -> tuple[tuple[date, str], ...]:
    country, _, sub = region.partition("-")
    h = holidays.country_holidays(country, subdiv=sub or None, years=year, language=lang)
    return tuple(sorted(h.items()))


def between(selected: list[str], start: date, end: date) -> list[dict]:
    """Holidays in [start, end), merged per date and English name: the same holiday in several countries is one entry."""
    today = date.today()
    first, last = today.year + FIRST_YEAR_OFFSET, today.year + LAST_YEAR_OFFSET
    start = max(start, date(first, 1, 1))
    end = min(end, date(last + 1, 1, 1))
    merged: dict[tuple[date, str], dict] = {}
    for region in [r for r in selected if valid_region(r)]:
        for year in range(start.year, end.year + 1):
            if not first <= year <= last:
                continue
            names_de = dict(_year(region, year, "de"))
            for day, name_en in _year(region, year, "en_US"):
                if not start <= day < end:
                    continue
                for part_en, part_de in zip(name_en.split("; "), names_de.get(day, name_en).split("; ")):
                    key = (day, part_en)
                    entry = merged.setdefault(key, {"date": day, "name_de": part_de, "name_en": part_en, "regions": []})
                    if region not in entry["regions"]:
                        entry["regions"].append(region)
    return sorted(merged.values(), key=lambda e: (e["date"], e["name_de"]))
