from fastapi import APIRouter, HTTPException, Header, Depends
from datetime import timedelta
from typing import Optional
from app.core.config import settings
from app.schemas.planning import (
    PlanningInputSchema,
    PlanningOutputSchema,
    PlannedDayOutputSchema,
    PlannedActivityOutputSchema,
)

router = APIRouter()


def verify_internal_service_key(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key")
):
    """
    Validates East-West service communication between Express backend and FastAPI.
    """
    if settings.INTERNAL_SERVICE_KEY:
        if not x_internal_service_key or x_internal_service_key != settings.INTERNAL_SERVICE_KEY:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Invalid or missing internal service key"
            )


@router.get("/contract", summary="Retrieve Planning Contract Specification")
def get_planning_contract():
    """
    Returns the JSON schemas defining the integration boundary
    between the Express Modular Monolith and FastAPI Intelligence Service.
    """
    return {
        "success": True,
        "contract_version": "1.0.0",
        "service": "gantavya-intelligence",
        "stateless": True,
        "input_schema": PlanningInputSchema.model_json_schema(),
        "output_schema": PlanningOutputSchema.model_json_schema(),
    }


@router.post(
    "/plan",
    response_model=PlanningOutputSchema,
    dependencies=[Depends(verify_internal_service_key)],
    summary="Plan Trip Itinerary Contract"
)
def plan_itinerary(payload: PlanningInputSchema):
    """
    Receives structured constraints and places from Express backend.
    Returns structured, sequenced itinerary days and activities.
    Stateless execution with zero database coupling.
    """
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=422,
            detail="end_date cannot be earlier than start_date"
        )

    delta_days = (payload.end_date - payload.start_date).days + 1
    planned_days = []
    total_cost = 0.0

    place_index = 0
    candidate_count = len(payload.candidate_places)

    for day_idx in range(1, delta_days + 1):
        day_date = payload.start_date + timedelta(days=day_idx - 1)
        day_activities = []
        day_cost = 0.0

        # Assign available candidate places deterministically across days
        if candidate_count > 0 and place_index < candidate_count:
            place = payload.candidate_places[place_index]
            activity = PlannedActivityOutputSchema(
                place_id=place.place_id,
                title=f"Visit {place.name}",
                sequence=1,
                start_time="09:30",
                end_time="11:30",
                duration_minutes=place.estimated_duration_minutes,
                estimated_cost=place.estimated_cost,
            )
            day_activities.append(activity)
            day_cost += place.estimated_cost
            place_index += 1

        total_cost += day_cost
        planned_days.append(
            PlannedDayOutputSchema(
                day_number=day_idx,
                date=day_date,
                activities=day_activities,
                total_day_cost=day_cost,
            )
        )

    return PlanningOutputSchema(
        trip_id=payload.trip_id,
        status="success",
        message="Deterministic contract plan generated successfully",
        total_days=delta_days,
        total_estimated_cost=total_cost,
        itinerary_days=planned_days,
        stateless_execution=True,
    )

