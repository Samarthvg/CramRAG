"""Typed settings, read from the repository-root .env.

One .env serves the whole repository: Docker Compose reads POSTGRES_* from it to
create the database, and this module reads DATABASE_URL from it to connect. They
have to agree, which is easier to keep true with a single file than with two.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py -> cramrag -> src -> api -> apps -> repository root
REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    app_env: str = "development"
    log_level: str = "INFO"

    # The browser calls the API cross-origin, so the web app's origin has to be
    # allowed explicitly. Comma-separated to allow more than one later.
    cors_allow_origins: str = "http://localhost:3000"

    @property
    def sqlalchemy_url(self) -> str:
        """DATABASE_URL with the driver named explicitly.

        SQLAlchemy defaults to psycopg2 for a plain postgresql:// URL and we use
        psycopg 3, so the driver has to be spelled out. The .env keeps the plain
        form because Docker and psql do not understand the +psycopg suffix.
        """
        for prefix in ("postgresql://", "postgres://"):
            if self.database_url.startswith(prefix):
                return "postgresql+psycopg://" + self.database_url[len(prefix) :]
        return self.database_url

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached so the .env is read once per process."""
    return Settings()
