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
    ScheduleValidationRequestSchema,
    ScheduleValidationResponseSchema,
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


@router.post(
    "/validate-schedule",
    response_model=ScheduleValidationResponseSchema,
    dependencies=[Depends(verify_internal_service_key)],
    summary="Validate Transit Schedule Feasibility and Detect Conflicts",
)
def validate_transit_schedule(payload: ScheduleValidationRequestSchema) -> ScheduleValidationResponseSchema:
    """
    Stateless temporal validation of transit legs and activities across days,
    verifying minimum transfer buffers, overnight boundary crossings, and causal order.
    """
    items = sorted(payload.items, key=lambda x: x.start_time)
    conflicts = []
    overnight_count = 0
    total_duration = 0

    for i in range(len(items)):
        curr = items[i]
        duration = int((curr.end_time - curr.start_time).total_seconds() / 60)
        total_duration += max(0, duration)

        if curr.end_time.date() != curr.start_time.date():
            overnight_count += 1

        if i < len(items) - 1:
            nxt = items[i + 1]
            gap_minutes = int((nxt.start_time - curr.end_time).total_seconds() / 60)

            # Determine required buffer
            buf_key = curr.mode.lower() if curr.mode else "default"
            min_buf = payload.min_transfer_buffers.get(buf_key, payload.min_transfer_buffers.get("default", 15))

            if gap_minutes < 0:
                conflicts.append({
                    "conflict_type": "OVERLAPPING_SCHEDULE",
                    "item_1": curr.item_id,
                    "item_2": nxt.item_id,
                    "message": f"Item '{nxt.item_id}' starts before '{curr.item_id}' completes ({gap_minutes}m overlap)."
                })
            elif gap_minutes < min_buf:
                conflicts.append({
                    "conflict_type": "INSUFFICIENT_TRANSFER_BUFFER",
                    "item_1": curr.item_id,
                    "item_2": nxt.item_id,
                    "message": f"Buffer of {gap_minutes}m between '{curr.item_id}' and '{nxt.item_id}' is below minimum required {min_buf}m."
                })

    return ScheduleValidationResponseSchema(
        schedule_id=payload.schedule_id,
        is_feasible=len(conflicts) == 0,
        conflicts=conflicts,
        overnight_count=overnight_count,
        total_transit_duration_minutes=total_duration,
        stateless_execution=True,
    )


