"""Liveness and readiness.

Liveness answers "is the process up". Readiness answers "can it actually serve
requests", which here means the database is reachable, has the extensions the
schema depends on, and has had its migrations applied. A readiness probe that
returns 200 while the database is down is worse than no probe at all, so this
one returns 503 when any check fails.
"""

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from cramrag.db import get_session_factory

router = APIRouter(tags=["health"])

REQUIRED_EXTENSIONS = ("vector", "pg_trgm")


class LiveResponse(BaseModel):
    status: str


class ReadyResponse(BaseModel):
    status: str
    checks: dict[str, str]


@router.get("/health/live", response_model=LiveResponse)
def live() -> LiveResponse:
    """Deliberately touches nothing. If this fails the process is gone."""
    return LiveResponse(status="ok")


@router.get("/health/ready", response_model=ReadyResponse)
def ready(response: Response) -> ReadyResponse:
    checks: dict[str, str] = {}
    healthy = True

    try:
        with get_session_factory()() as session:
            session.execute(text("SELECT 1"))
            checks["database"] = "ok"

            present = {
                row[0]
                for row in session.execute(
                    text(
                        "SELECT extname FROM pg_extension WHERE extname = ANY(:names)"
                    ),
                    {"names": list(REQUIRED_EXTENSIONS)},
                )
            }
            missing = [e for e in REQUIRED_EXTENSIONS if e not in present]
            if missing:
                checks["extensions"] = f"missing: {', '.join(missing)}"
                healthy = False
            else:
                checks["extensions"] = "ok"

            # to_regclass returns NULL instead of raising when the table is
            # absent, so a database that has never been migrated reports
            # cleanly rather than aborting the transaction.
            migrated = session.execute(
                text("SELECT to_regclass('public.alembic_version')")
            ).scalar()
            if migrated is None:
                checks["migrations"] = "not applied"
                healthy = False
            else:
                revision = session.execute(
                    text("SELECT version_num FROM alembic_version")
                ).scalar()
                checks["migrations"] = revision or "not applied"
                healthy = healthy and revision is not None
    except SQLAlchemyError as exc:
        # Report the error class, not the message: connection strings and
        # server internals do not belong in an HTTP response.
        checks["database"] = f"unreachable ({type(exc).__name__})"
        healthy = False

    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return ReadyResponse(status="ok" if healthy else "degraded", checks=checks)
