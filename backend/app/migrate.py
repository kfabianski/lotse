"""Minimal schema upgrades for existing SQLite databases (create_all never adds columns)."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

# table, column, DDL type, SQL to fill existing rows (or None)
COLUMNS = [
    ("articles", "published_at", "DATETIME", "UPDATE articles SET published_at = created_at WHERE published_at IS NULL"),
    ("departments", "source", "VARCHAR(8) DEFAULT 'manual'", None),
    # Up-votes became star ratings: an existing "support" counts as 5 stars.
    ("idea_votes", "stars", "INTEGER NOT NULL DEFAULT 5", None),
]


def upgrade(engine: Engine) -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl, fill in COLUMNS:
            if table not in insp.get_table_names():
                continue
            if column not in {c["name"] for c in insp.get_columns(table)}:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                if fill:
                    conn.execute(text(fill))
