"""Database engine and session factory.

The engine is created lazily rather than at import time so that importing the
app does not require a reachable database. Tests and `--help` should not need
Postgres running.
"""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from cramrag.config import get_settings


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    return create_engine(
        settings.sqlalchemy_url,
        # Connections can be killed by a container restart while idle in the
        # pool; pre_ping discards those instead of failing the first query.
        pool_pre_ping=True,
    )


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a session that always gets closed."""
    with get_session_factory()() as session:
        yield session
