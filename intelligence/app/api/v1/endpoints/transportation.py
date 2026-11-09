"""
Transportation Optimization API Endpoints
Gantavya Intelligence Engine - Milestone 2.4

Stateless graph construction and multi-objective Pareto-TOPSIS route optimization.
Zero database coupling. Express handles persistence and authentication.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.core.security import verify_internal_service_key
from app.schemas.transportation import (
    RouteOptimizationRequestSchema,
    RouteOptimizationResponseSchema,
    TransitLegSchema,
)
from app.services.transportation import (
    MultimodalRouteOptimizer,
    MultimodalTransitGraph,
)

router = APIRouter()
optimizer = MultimodalRouteOptimizer()


@router.get("/contract", summary="Retrieve Transportation Optimization Contract")
def get_transportation_contract() -> Dict[str, Any]:
    """
    Returns JSON schemas for multimodal graph construction and route optimization.
    Defines the contract between the Express Backend and FastAPI Intelligence Engine.
    """
    return {
        "success": True,
        "contract_version": "2.4.3",
        "service": "gantavya-intelligence-transportation",
        "stateless": True,
        "supported_algorithms": ["NetworkX_Multimodal", "Pareto_Dominance", "TOPSIS_Ranking"],
        "input_schema": RouteOptimizationRequestSchema.model_json_schema(),
        "output_schema": RouteOptimizationResponseSchema.model_json_schema(),
    }


@router.post(
    "/optimize",
    response_model=RouteOptimizationResponseSchema,
    dependencies=[Depends(verify_internal_service_key)],
    summary="Optimize Multimodal Transit Routes",
)
def optimize_transportation(payload: RouteOptimizationRequestSchema) -> RouteOptimizationResponseSchema:
    """
    Receives candidate transit legs, origin/destination nodes, traveler constraints, and preferences.
    Executes stateless NetworkX graph construction, candidate path exploration, Pareto pruning,
    and TOPSIS multi-criteria ranking to return the 5 standard recommendation categories:
    1. cheapest
    2. fastest
    3. fewest_transfers
    4. most_convenient
    5. best_overall
    """
    try:
        response = optimizer.optimize_routes(payload)
        return response
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Route optimization failed: {str(err)}",
        )


@router.post(
    "/graph/summary",
    dependencies=[Depends(verify_internal_service_key)],
    summary="Build Multimodal Graph and Return Topological Summary",
)
def get_graph_summary(legs: List[TransitLegSchema]) -> Dict[str, Any]:
    """
    Builds a temporary NetworkX MultimodalTransitGraph from candidate legs
    and returns its topological metadata without persistence.
    """
    graph = MultimodalTransitGraph()
    graph.build_from_legs(legs)
    return {
        "success": True,
        "topology": graph.get_summary(),
        "stateless": True,
    }

