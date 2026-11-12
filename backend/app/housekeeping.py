"""Removes uploaded files nothing refers to any more: pictures of deleted articles and notices, replaced
avatars and floor plans, abandoned uploads. Runs once a day from the background loop (``app.notify``) and by hand:

    python -m app.housekeeping --dry-run    # only list what would go
    python -m app.housekeeping

A file younger than a day is never touched - it may belong to an article that is still being written."""
import logging
import re
import sys
import time
from datetime import timedelta

from sqlalchemy import String, select

from app import models  # noqa: F401  - registers every table on Base.metadata
from app.config import settings
from app.db import Base, SessionLocal
from app.models import TrainingMaterial

log = logging.getLogger("lotse.housekeeping")
GRACE = timedelta(hours=24)
_REF = re.compile(r"uploads/([A-Za-z0-9._-]+)")


def referenced_uploads(db) -> set[str]:
    """File names under uploads/ that any text in the whole database still mentions - every string column of every
    table, so new features (or links typed by hand into an article, a training text, a setting or old article
    versions) can never lose their files. A file counts as orphaned only when no row anywhere names it."""
    names: set[str] = set()

    def add(text) -> None:
        if text:
            names.update(_REF.findall(str(text)))

    for table in Base.metadata.sorted_tables:
        for col in table.columns:
            if not isinstance(col.type, String):  # Text is a String subclass
                continue
            for (v,) in db.execute(select(col).where(col.like("%uploads/%")).distinct()):
                add(v)
    add(settings.login_image_url)
    return names


def sweep(dry_run: bool = False) -> dict[str, list[str]]:
    """Delete (or list) orphaned files in the upload and training folders. Returns the removed names per folder."""
    db = SessionLocal()
    try:
        keep_uploads = referenced_uploads(db)
        keep_trainings = {m.file for m in db.query(TrainingMaterial).filter(TrainingMaterial.file.isnot(None))}
    finally:
        db.close()
    cutoff = time.time() - GRACE.total_seconds()
    removed: dict[str, list[str]] = {"uploads": [], "trainings": []}
    for folder, keep, key in ((settings.upload_dir, keep_uploads, "uploads"), (settings.training_dir, keep_trainings, "trainings")):
        if not folder.is_dir():
            continue
        for path in sorted(folder.iterdir()):
            if not path.is_file() or path.name in keep or path.name.startswith("."):
                continue
            if path.stat().st_mtime > cutoff:
                continue  # too young: may belong to something not saved yet
            removed[key].append(path.name)
            if not dry_run:
                path.unlink(missing_ok=True)
    if not dry_run and (removed["uploads"] or removed["trainings"]):
        log.info("housekeeping: removed %d upload(s) and %d training file(s)", len(removed["uploads"]), len(removed["trainings"]))
    return removed


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    result = sweep(dry_run=dry)
    verb = "would remove" if dry else "removed"
    for key, names in result.items():
        print(f"{key}: {verb} {len(names)} file(s)")
        for name in names:
            print(f"  {name}")
