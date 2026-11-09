"""
East-West Internal Service Authentication
Gantavya Intelligence Engine - Milestone 2.4
"""

from typing import Optional
from fastapi import HTTPException, Header
from app.core.config import settings


def verify_internal_service_key(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
):
    """
    Validates East-West service communication between Express backend and FastAPI.
    Requires matching INTERNAL_SERVICE_KEY header.
    """
    if settings.INTERNAL_SERVICE_KEY:
        if not x_internal_service_key or x_internal_service_key != settings.INTERNAL_SERVICE_KEY:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Invalid or missing internal service key"
            )

