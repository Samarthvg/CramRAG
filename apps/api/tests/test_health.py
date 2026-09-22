import pytest
from sqlalchemy.exc import OperationalError

from cramrag.routes import health


def test_live_is_ok_without_a_database(client):
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_live_allows_the_web_app_origin(client):
    """Without this header every browser call from the web app fails."""
    response = client.get(
        "/health/live", headers={"Origin": "http://localhost:3000"}
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_ready_is_503_when_the_database_is_unreachable(client, monkeypatch):
    def unreachable():
        raise OperationalError(
            "SELECT 1", {}, Exception("connection refused at 10.0.0.1:5433")
        )

    monkeypatch.setattr(health, "get_session_factory", unreachable)

    response = client.get("/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"].startswith("unreachable")


def test_ready_does_not_leak_database_internals(client, monkeypatch):
    """Health output is public enough that it must not carry host details."""

    def unreachable():
        raise OperationalError(
            "SELECT 1", {}, Exception("connection refused at 10.0.0.1:5433")
        )

    monkeypatch.setattr(health, "get_session_factory", unreachable)

    assert "10.0.0.1" not in client.get("/health/ready").text


@pytest.mark.integration
def test_ready_is_ok_against_a_migrated_database(client):
    response = client.get("/health/ready")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["database"] == "ok"
    assert body["checks"]["extensions"] == "ok"
    # A revision hash, not the literal "not applied".
    assert body["checks"]["migrations"] != "not applied"
