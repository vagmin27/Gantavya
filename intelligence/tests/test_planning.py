from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_planning_contract():
    response = client.get("/api/v1/planning/contract")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stateless"] is True
    assert "input_schema" in data
    assert "output_schema" in data


def test_post_planning_contract_success():
    payload = {
        "trip_id": "test_trip_123",
        "destination": {
            "name": "Pokhara",
            "country": "Nepal",
            "coordinates": {"longitude": 83.9856, "latitude": 28.2096}
        },
        "start_date": "2026-10-01",
        "end_date": "2026-10-03",
        "budget": 25000.0,
        "traveller_preferences": {
            "travel_interests": ["nature", "adventure"],
            "preferred_travel_styles": ["scenic", "moderate"]
        },
        "travel_constraints": {
            "max_daily_travel_duration": 180,
            "activity_density": "medium"
        },
        "candidate_places": [
            {
                "place_id": "place_1",
                "name": "Phewa Lake",
                "category": "nature_spot",
                "estimated_duration_minutes": 120,
                "estimated_cost": 1500.0,
                "coordinates": {"longitude": 83.9576, "latitude": 28.2116}
            },
            {
                "place_id": "place_2",
                "name": "World Peace Pagoda",
                "category": "viewpoint",
                "estimated_duration_minutes": 90,
                "estimated_cost": 500.0,
                "coordinates": {"longitude": 83.9443, "latitude": 28.2008}
            }
        ]
    }

    response = client.post("/api/v1/planning/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == "test_trip_123"
    assert data["total_days"] == 3
    assert len(data["itinerary_days"]) == 3
    assert data["stateless_execution"] is True
    assert data["itinerary_days"][0]["activities"][0]["title"] == "Visit Phewa Lake"


def test_post_planning_invalid_dates():
    payload = {
        "trip_id": "test_trip_invalid",
        "destination": {"name": "Kathmandu", "country": "Nepal"},
        "start_date": "2026-10-05",
        "end_date": "2026-10-01",  # end before start
        "budget": 10000.0
    }
    response = client.post("/api/v1/planning/plan", json=payload)
    assert response.status_code == 422

