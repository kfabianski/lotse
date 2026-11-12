"""Minimal schema upgrades for existing SQLite databases (create_all never adds columns)."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

# table, column, DDL type, SQL to fill existing rows (or None)
COLUMNS = [
    ("articles", "published_at", "DATETIME", "UPDATE articles SET published_at = created_at WHERE published_at IS NULL"),
    ("departments", "source", "VARCHAR(8) DEFAULT 'manual'", None),
    # Up-votes became star ratings: an existing "support" counts as 5 stars.
    ("idea_votes", "stars", "INTEGER NOT NULL DEFAULT 5", None),
    ("users", "role_source", "VARCHAR(8) NOT NULL DEFAULT 'local'", "UPDATE users SET role_source = auth_source"),
    ("users", "permissions", "TEXT NOT NULL DEFAULT '[]'", None),
    ("users", "role_local", "VARCHAR(10)", None),
    ("trainings", "open_to_all", "BOOLEAN NOT NULL DEFAULT 0", None),
    ("users", "ideas_seen_at", "DATETIME", None),
    ("users", "manager_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL", None),
    ("users", "ldap_dn", "VARCHAR(400)", None),
    ("users", "notify_articles", "BOOLEAN NOT NULL DEFAULT 1", None),
    ("users", "branch_id", "INTEGER REFERENCES branches(id) ON DELETE SET NULL", None),
    ("articles", "pinned", "BOOLEAN NOT NULL DEFAULT 0", None),
    ("articles", "pinned_until", "DATE", None),
    ("users", "notify_ideas", "BOOLEAN NOT NULL DEFAULT 1", None),
    ("users", "color_scheme", "VARCHAR(20)", None),
    ("users", "ldap_guid", "VARCHAR(64)", None),
    ("polls", "target_departments", "TEXT NOT NULL DEFAULT '[]'", None),
    ("polls", "target_branches", "TEXT NOT NULL DEFAULT '[]'", None),
    # existing articles count as announced - switching notifications on must not mail old news
    ("articles", "notified_at", "DATETIME", "UPDATE articles SET notified_at = CURRENT_TIMESTAMP"),
    ("articles", "ack_required", "BOOLEAN NOT NULL DEFAULT 0", None),  # "read and understood" confirmation
]


def _anonymous_ideas_without_author(engine: Engine) -> None:
    """Older databases have ideas.author_id NOT NULL and keep the author of anonymous ideas.
    SQLite cannot drop NOT NULL in place, so the table is rebuilt once (votes keep pointing to "ideas")."""
    raw = engine.raw_connection()
    try:
        cur = raw.cursor()
        cols = cur.execute("PRAGMA table_info(ideas)").fetchall()
        author = next((c for c in cols if c[1] == "author_id"), None)
        if not author or author[3] == 0:  # no table yet, or already nullable
            return
        ddl = cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='ideas'").fetchone()[0]
        new_ddl = ddl.replace("CREATE TABLE ideas", "CREATE TABLE ideas_new", 1).replace(
            "author_id INTEGER NOT NULL", "author_id INTEGER", 1)
        names = ", ".join(c[1] for c in cols)
        raw.commit()
        cur.execute("PRAGMA foreign_keys=OFF")  # must be set outside a transaction
        cur.executescript(f"""
            BEGIN;
            {new_ddl};
            INSERT INTO ideas_new ({names}) SELECT {names} FROM ideas;
            DROP TABLE ideas;
            ALTER TABLE ideas_new RENAME TO ideas;
            CREATE INDEX IF NOT EXISTS ix_ideas_status ON ideas (status);
            CREATE INDEX IF NOT EXISTS ix_ideas_created_at ON ideas (created_at);
            UPDATE ideas SET author_id = NULL WHERE anonymous = 1;
            COMMIT;
        """)
        cur.execute("PRAGMA foreign_keys=ON")
    finally:
        raw.close()


def upgrade(engine: Engine) -> None:
    _anonymous_ideas_without_author(engine)
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl, fill in COLUMNS:
            if table not in insp.get_table_names():
                continue
            if column not in {c["name"] for c in insp.get_columns(table)}:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                if fill:
                    conn.execute(text(fill))
