import pytest

from cramrag.config import REPO_ROOT, Settings


def test_repo_root_points_at_the_repository_root():
    """Guards the parents[] index in config.py.

    Counting directories upward is easy to get wrong and fails silently: the
    wrong root just means .env is never found and every setting looks missing.
    """
    assert (REPO_ROOT / "docker-compose.yml").is_file()
    assert (REPO_ROOT / "apps" / "web" / "package.json").is_file()


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        (
            "postgresql://u:p@localhost:5433/cramrag",
            "postgresql+psycopg://u:p@localhost:5433/cramrag",
        ),
        (
            "postgres://u:p@localhost:5433/cramrag",
            "postgresql+psycopg://u:p@localhost:5433/cramrag",
        ),
        (
            "postgresql+psycopg://u:p@localhost:5433/cramrag",
            "postgresql+psycopg://u:p@localhost:5433/cramrag",
        ),
    ],
)
def test_sqlalchemy_url_names_the_psycopg_driver(given, expected):
    assert Settings(database_url=given).sqlalchemy_url == expected


def test_password_containing_the_scheme_is_not_mangled():
    """Only the leading scheme is rewritten, not a match further along."""
    url = "postgresql://u:postgresql://@localhost:5433/cramrag"
    assert Settings(database_url=url).sqlalchemy_url == (
        "postgresql+psycopg://u:postgresql://@localhost:5433/cramrag"
    )


def test_cors_origins_splits_and_trims():
    settings = Settings(
        database_url="postgresql://u:p@localhost:5433/c",
        cors_allow_origins="http://localhost:3000, https://example.com ,",
    )
    assert settings.cors_origins == ["http://localhost:3000", "https://example.com"]
