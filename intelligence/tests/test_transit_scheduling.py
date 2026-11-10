"""
Tests for Sub-Milestone 2.4.4: Transit Scheduling & Feasibility
Gantavya Intelligence Engine

Verifies:
- Stateless schedule feasibility
- Transfer timing validation
- Overnight journey detection
- Day boundary and connection buffers
"""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY}


def test_validate_schedule_feasible():
    """Validates that a correctly buffered transit itinerary is feasible."""
    now = datetime(2026, 11, 10, 8, 0, tzinfo=timezone.utc)
    payload = {
        "schedule_id": "sched_001",
        "items": [
            {
                "item_id": "flight_delhi_jaipur",
                "item_type": "transit",
                "start_time": now.isoformat(),
                "end_time": (now + timedelta(hours=1)).isoformat(),
                "mode": "flight",
            },
            {
                "item_id": "cab_to_hotel",
                "item_type": "transit",
                "start_time": (now + timedelta(hours=2)).isoformat(),  # 60m buffer > 45m min
                "end_time": (now + timedelta(hours=2, minutes=30)).isoformat(),
                "mode": "road",
            },
            {
                "item_id": "visit_hawa_mahal",
                "item_type": "activity",
                "start_time": (now + timedelta(hours=3)).isoformat(),  # 30m buffer > 15m min
                "end_time": (now + timedelta(hours=4, minutes=30)).isoformat(),
                "mode": "walking",
            },
        ],
        "min_transfer_buffers": {"flight": 45, "rail": 20, "road": 10, "default": 15},
    }

    response = client.post("/api/v1/transportation/validate-schedule", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["is_feasible"] is True
    assert len(data["conflicts"]) == 0
    assert data["overnight_count"] == 0
    assert data["total_transit_duration_minutes"] == 180  # 60m + 30m + 90m


def test_validate_schedule_insufficient_transfer_buffer():
    """Detects insufficient transfer buffer between flight and downstream transit."""
    now = datetime(2026, 11, 10, 10, 0, tzinfo=timezone.utc)
    payload = {
        "schedule_id": "sched_002",
        "items": [
            {
                "item_id": "flight_raipur_delhi",
                "item_type": "transit",
                "start_time": now.isoformat(),
                "end_time": (now + timedelta(hours=2)).isoformat(),  # arrives 12:00
                "mode": "flight",
            },
            {
                "item_id": "train_delhi_jaipur",
                "item_type": "transit",
                "start_time": (now + timedelta(hours=2, minutes=15)).isoformat(),  # departs 12:15 (only 15m buffer!)
                "end_time": (now + timedelta(hours=6)).isoformat(),
                "mode": "rail",
            },
        ],
        "min_transfer_buffers": {"flight": 45, "rail": 20, "road": 10, "default": 15},
    }

    response = client.post("/api/v1/transportation/validate-schedule", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["is_feasible"] is False
    assert len(data["conflicts"]) == 1
    assert data["conflicts"][0]["conflict_type"] == "INSUFFICIENT_TRANSFER_BUFFER"


def test_validate_schedule_overnight_journey():
    """Verifies that journeys crossing calendar day boundaries are detected as overnight."""
    start = datetime(2026, 11, 10, 22, 30, tzinfo=timezone.utc)
    end = start + timedelta(hours=8, minutes=30)  # arrives next day 07:00

    payload = {
        "schedule_id": "sched_overnight",
        "items": [
            {
                "item_id": "overnight_express_train",
                "item_type": "transit",
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
                "mode": "rail",
            }
        ],
    }

    response = client.post("/api/v1/transportation/validate-schedule", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["is_feasible"] is True
    assert data["overnight_count"] == 1


def test_validate_schedule_overlapping_items():
    """Detects direct time overlap between consecutive scheduled items."""
    now = datetime(2026, 11, 10, 14, 0, tzinfo=timezone.utc)
    payload = {
        "schedule_id": "sched_overlap",
        "items": [
            {
                "item_id": "city_bus_tour",
                "item_type": "transit",
                "start_time": now.isoformat(),
                "end_time": (now + timedelta(hours=2)).isoformat(),  # ends 16:00
                "mode": "bus",
            },
            {
                "item_id": "museum_visit",
                "item_type": "activity",
                "start_time": (now + timedelta(hours=1)).isoformat(),  # starts 15:00 (during bus tour!)
                "end_time": (now + timedelta(hours=3)).isoformat(),
                "mode": "walking",
            },
        ],
    }

    response = client.post("/api/v1/transportation/validate-schedule", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["is_feasible"] is False
    assert any(c["conflict_type"] == "OVERLAPPING_SCHEDULE" for c in data["conflicts"])

