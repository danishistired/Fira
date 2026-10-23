"""
analysis/db/session.py

SQLAlchemy engine + session management for ARGUS.

Usage
-----
    from db import init_db, get_session

    init_db()           # call once at startup — creates tables if absent

    with get_session() as session:
        job = session.get(Job, job_id)

Environment Variables
---------------------
    ARGUS_DB_PATH   — path to the SQLite file (default: ./argus.db)
                      Set to a postgresql+psycopg2://... URL for production.
"""

import os
import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from .models import Base

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Engine setup
# ---------------------------------------------------------------------------

def _build_database_url() -> str:
    """Resolve the database URL from env or use default SQLite path."""
    db_path = os.environ.get("ARGUS_DB_PATH", "")
    if db_path:
        # If it looks like a full URL (postgres://, sqlite:///, etc.) use as-is
        if "://" in db_path:
            return db_path
        # Otherwise treat as a file path for SQLite
        return f"sqlite:///{db_path}"
    # Default: argus.db next to this file's analysis/ root
    analysis_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_path = os.path.join(analysis_dir, "argus.db")
    return f"sqlite:///{default_path}"


DATABASE_URL = _build_database_url()

# SQLite-specific: enable WAL mode and foreign keys for concurrent reads
def _configure_sqlite(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
    except Exception as exc:  # noqa: BLE001
        # WAL mode is unsupported on some Docker volume drivers (overlay2, NFS,
        # tmpfs-backed mounts).  Fall back to the default DELETE journal mode so
        # the application can still start.  Log a warning so the operator knows.
        logger.warning(
            "[DB] Could not enable WAL mode (%s). "
            "Falling back to default journal mode. "
            "Consider mounting the DB directory as a named Docker volume.",
            exc,
        )
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


engine = create_engine(
    DATABASE_URL,
    # SQLite doesn't support multiple threads by default — check_same_thread=False
    # is safe here because SQLAlchemy manages its own connection pool per session.
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    echo=False,        # Set to True for SQL debug logging
    pool_pre_ping=True,
)

if DATABASE_URL.startswith("sqlite"):
    event.listen(engine, "connect", _configure_sqlite)

SessionFactory = sessionmaker(bind=engine, autocommit=False, autoflush=False)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create all tables if they don't already exist.

    Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS semantics.
    Call this once at application startup before serving any requests.
    """
    logger.info("[DB] Initializing database: %s", DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    logger.info("[DB] Tables ready.")
    print(f"[DB] Database initialized: {DATABASE_URL}", flush=True)


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Yield a SQLAlchemy session, committing on success or rolling back on error.

    Example::

        with get_session() as session:
            job = session.get(Job, job_id)
            job.status = "done"
            # session.commit() is called automatically on __exit__

    Raises any exception after rollback so callers can handle it.
    """
    session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
