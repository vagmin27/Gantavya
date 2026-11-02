from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class CoordinatesSchema(BaseModel):
    longitude: float = Field(..., ge=-180.0, le=180.0)
    latitude: float = Field(..., ge=-90.0, le=90.0)


class DestinationContextSchema(BaseModel):
    name: str
    country: str
    coordinates: Optional[CoordinatesSchema] = None


class CandidatePlaceSchema(BaseModel):
    place_id: str
    name: str
    category: str
    estimated_duration_minutes: int = Field(default=60, ge=5, le=1440)
    estimated_cost: float = Field(default=0.0, ge=0.0)
    coordinates: Optional[CoordinatesSchema] = None


class TravellerPreferencesContextSchema(BaseModel):
    travel_interests: List[str] = Field(default_factory=list)
    preferred_travel_styles: List[str] = Field(default_factory=list)
    preferred_transportation: List[str] = Field(default_factory=list)


class TravelConstraintsContextSchema(BaseModel):
    max_daily_travel_duration: int = Field(default=180, ge=0)
    activity_density: str = Field(default="medium")
    dietary_restrictions: List[str] = Field(default_factory=list)


class PlanningInputSchema(BaseModel):
    trip_id: str
    destination: DestinationContextSchema
    start_date: date
    end_date: date
    budget: float = Field(default=0.0, ge=0.0)
    traveller_preferences: TravellerPreferencesContextSchema = Field(
        default_factory=TravellerPreferencesContextSchema
    )
    travel_constraints: TravelConstraintsContextSchema = Field(
        default_factory=TravelConstraintsContextSchema
    )
    candidate_places: List[CandidatePlaceSchema] = Field(default_factory=list)


class PlannedActivityOutputSchema(BaseModel):
    place_id: str
    title: str
    sequence: int
    start_time: str
    end_time: str
    duration_minutes: int
    estimated_cost: float


class PlannedDayOutputSchema(BaseModel):
    day_number: int
    date: date
    activities: List[PlannedActivityOutputSchema]
    total_day_cost: float


class PlanningOutputSchema(BaseModel):
    trip_id: str
    status: str = "success"
    message: str = "Deterministic contract plan generated successfully"
    total_days: int
    total_estimated_cost: float
    itinerary_days: List[PlannedDayOutputSchema]
    stateless_execution: bool = True

