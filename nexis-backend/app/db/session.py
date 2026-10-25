import sqlite3
import os
import logging
from typing import Generator
from app.core.config import settings

logger = logging.getLogger("nexis.db")


def get_db_path() -> str:
    path = settings.SQLITE_DB_PATH
    if not os.path.isabs(path):
        # Resolve relative to backend root
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(backend_root, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path(), timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """
    Initializes database schema and seeds initial fleet if empty.
    """
    db_path = get_db_path()
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    conn = get_db_connection()
    try:
        with conn:
            conn.executescript(schema_sql)
            # Run light migration if existing table lacks columns
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(softwares);")
            columns = [row["name"] for row in cursor.fetchall()]
            if "repo_url" not in columns:
                conn.execute("ALTER TABLE softwares ADD COLUMN repo_url TEXT;")
            if "provider" not in columns:
                conn.execute("ALTER TABLE softwares ADD COLUMN provider TEXT DEFAULT 'custom';")
            if "provider_api_key" not in columns:
                conn.execute("ALTER TABLE softwares ADD COLUMN provider_api_key TEXT;")
            if "provider_project_id" not in columns:
                conn.execute("ALTER TABLE softwares ADD COLUMN provider_project_id TEXT;")
        logger.info(f"SQLite database initialized at: {db_path}")
    finally:
        conn.close()
