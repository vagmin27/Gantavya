from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "health" in data
    assert "docs" in data


def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Intelligence service is healthy"
    assert data["data"]["service"] == "gantavya-intelligence"
    assert data["data"]["status"] == "ok"
    assert data["data"]["stateless"] is True

