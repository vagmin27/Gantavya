from fastapi import APIRouter
from app.api.v1.endpoints import health, planning

api_v1_router = APIRouter()
api_v1_router.include_router(health.router, prefix="/health", tags=["Health"])
api_v1_router.include_router(planning.router, prefix="/planning", tags=["Planning"])
