"""
database.py
-----------
SQLAlchemy engine + session factory.

Supports both SQLite (dev) and PostgreSQL (prod) via DATABASE_URL env var.
- If DATABASE_URL is not set → defaults to SQLite (./water_tanker.db)
- In production: set DATABASE_URL=postgresql://user:pass@host/dbname
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# ── Database URL ──────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./water_tanker.db"   # default: SQLite for local dev
)

# SQLite needs check_same_thread=False; PostgreSQL doesn't need it
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,     # Set True to log all SQL queries during debug
)

# ── Session Factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Base class for all ORM models ─────────────────────────────────────────────
Base = declarative_base()


# ── Dependency injection helper for FastAPI routes ────────────────────────────
def get_db():
    """
    FastAPI dependency that provides a DB session per request.
    Guarantees the session is closed after the request, even on errors.
    Usage in router:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
