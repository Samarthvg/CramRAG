from cramrag.routes.capabilities import FEATURES


def test_capabilities_reports_document_types_and_features(client):
    response = client.get("/api/v1/config/capabilities")
    assert response.status_code == 200

    body = response.json()
    assert "application/pdf" in body["document_types"]
    assert set(body["features"]) == set(FEATURES)
    assert all(isinstance(v, bool) for v in body["features"].values())


def test_capabilities_exposes_nothing_secret(client):
    """A misplaced setting here would ship straight to the browser."""
    text = client.get("/api/v1/config/capabilities").text.lower()
    for leak in ("password", "database_url", "postgresql://", "api_key", "secret"):
        assert leak not in text
