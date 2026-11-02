from fastapi import APIRouter
from app.core.config import settings
import time

router = APIRouter()
START_TIME = time.time()


@router.get("", summary="Intelligence Service Health Check")
def get_health():
    """
    Returns operational health and uptime.
    Stateless: Holds no persistent database connection.
    """
    return {
        "success": True,
        "message": "Intelligence service is healthy",
        "data": {
            "service": "gantavya-intelligence",
            "status": "ok",
            "uptime_seconds": round(time.time() - START_TIME, 2),
            "environment": settings.ENVIRONMENT,
            "stateless": True
        }
    }

