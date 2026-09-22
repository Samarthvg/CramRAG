"""FastAPI application.

Run from apps/api with:

    uvicorn cramrag.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cramrag import __version__
from cramrag.config import get_settings
from cramrag.routes import capabilities, health


def create_app() -> FastAPI:
    """App factory, so tests can build an app without importing global state."""
    settings = get_settings()

    app = FastAPI(
        title="CramRAG API",
        version=__version__,
        description="Study assistant over course material.",
    )

    # The web app runs on a different port, so every browser call to this API is
    # cross-origin and fails without this. Origins are listed explicitly rather
    # than wildcarded, because a wildcard cannot be narrowed later without
    # breaking whoever started relying on it.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(capabilities.router)

    return app


app = create_app()
