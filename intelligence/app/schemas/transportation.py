"""
Unified Transportation Pydantic Schemas
Gantavya Intelligence Engine - Milestone 2.4
Stateless computation & validation contracts
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, model_validator


# ==========================================
# 1. ENUMS
# ==========================================

class TransportModeEnum(str, Enum):
    WALKING = "walking"
    ROAD_DRIVING = "road_driving"
    ROAD_CAB = "road_cab"
    BUS = "bus"
    RAIL = "rail"
    AIR = "air"
    FERRY = "ferry"
    CABLE_CAR = "cable_car"
    OTHER = "other"


class TransportNodeTypeEnum(str, Enum):
    COORDINATES = "coordinates"
    AIRPORT = "airport"
    RAIL_STATION = "rail_station"
    BUS_TERMINAL = "bus_terminal"
    METRO_STATION = "metro_station"
    PORT = "port"
    LANDMARK = "landmark"


class DataFreshnessEnum(str, Enum):
    REALTIME = "realtime"
    SCHEDULED = "scheduled"
    HISTORICAL_ESTIMATE = "historical_estimate"
    STALE_CACHE = "stale_cache"


class LegStatusEnum(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    DELAYED = "delayed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    UNKNOWN = "unknown"


class FareTierEnum(str, Enum):
    FREE = "free"
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium_economy"
    BUSINESS = "business"
    FIRST = "first"
    STANDARD = "standard"
    SLEEPER = "sleeper"
    AC_TIER_1 = "ac_tier_1"
    AC_TIER_2 = "ac_tier_2"
    AC_TIER_3 = "ac_tier_3"
    CHAIR_CAR = "chair_car"
    CUSTOM = "custom"


class CurrencyEnum(str, Enum):
    INR = "INR"
    NPR = "NPR"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class RouteCategoryEnum(str, Enum):
    FASTEST = "fastest"
    CHEAPEST = "cheapest"
    FEWEST_TRANSFERS = "fewest_transfers"
    MOST_CONVENIENT = "most_convenient"
    BEST_OVERALL = "best_overall"
    CUSTOM = "custom"


class AdditionalCostTypeEnum(str, Enum):
    TOLL = "toll"
    PARKING = "parking"
    BAGGAGE = "baggage"
    SEAT_SELECTION = "seat_selection"
    SERVICE_TAX = "service_tax"
    AIRPORT_FEE = "airport_fee"
    OTHER = "other"


class TransferTypeEnum(str, Enum):
    SAME_STATION = "same_station"
    CROSS_TERMINAL = "cross_terminal"
    CROSS_CITY = "cross_city"
    MODE_SWITCH = "mode_switch"


class SegmentTypeEnum(str, Enum):
    FIRST_MILE = "first_mile"
    INTERCITY_TRANSIT = "intercity_transit"
    LAST_MILE = "last_mile"
    SIGHTSEEING_TRANSIT = "sightseeing_transit"


# ==========================================
# 2. CORE SCHEMAS
# ==========================================

class TransportCoordinatesSchema(BaseModel):
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees (-180 to 180)")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to 90)")

    @model_validator(mode="before")
    @classmethod
    def parse_coords(cls, data: Any) -> Any:
        if isinstance(data, (list, tuple)) and len(data) == 2:
            return {"longitude": float(data[0]), "latitude": float(data[1])}
        return data


class TransportNodeSchema(BaseModel):
    node_id: str = Field(..., min_length=1, description="Unique transport node identifier")
    name: str = Field(..., min_length=2, description="Display name of node")
    node_type: TransportNodeTypeEnum = Field(default=TransportNodeTypeEnum.COORDINATES)
    code: Optional[str] = Field(default=None, description="IATA code or Railway station code")
    coordinates: TransportCoordinatesSchema
    city: Optional[str] = Field(default="")
    country: Optional[str] = Field(default="")
    timezone: Optional[str] = Field(default="UTC")
    terminal_or_platform: Optional[str] = Field(default=None)


class AdditionalCostSchema(BaseModel):
    cost_type: AdditionalCostTypeEnum
    amount: float = Field(..., ge=0.0)
    currency: CurrencyEnum = Field(default=CurrencyEnum.INR)
    description: Optional[str] = Field(default="")


class FareBreakdownSchema(BaseModel):
    base_amount: float = Field(..., ge=0.0)
    currency: CurrencyEnum = Field(default=CurrencyEnum.INR)
    fare_tier: FareTierEnum = Field(default=FareTierEnum.ECONOMY)
    is_estimated: bool = Field(default=False)
    taxes_and_fees: float = Field(default=0.0, ge=0.0)
    total_amount: float = Field(..., ge=0.0)
    pricing_source: Optional[str] = Field(default="provider_api")

    @model_validator(mode="after")
    def validate_total_at_least_base(self):
        if self.total_amount < self.base_amount:
            raise ValueError("total_amount cannot be less than base_amount")
        return self


class TransferSchema(BaseModel):
    transfer_type: TransferTypeEnum = Field(default=TransferTypeEnum.SAME_STATION)
    buffer_duration_minutes: int = Field(..., ge=0)
    walking_distance_meters: float = Field(default=0.0, ge=0.0)
    requires_security_clearance: bool = Field(default=False)
    requires_baggage_reclaim: bool = Field(default=False)
    is_guaranteed_connection: bool = Field(default=False)
    notes: Optional[str] = Field(default="")


class DataFreshnessSchema(BaseModel):
    freshness_level: DataFreshnessEnum = Field(default=DataFreshnessEnum.REALTIME)
    last_fetched_at: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = Field(default=None)
    source: str = Field(..., min_length=1)
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)


class CarrierInfoSchema(BaseModel):
    name: str = Field(..., min_length=1)
    code: Optional[str] = Field(default=None)
    identifier: Optional[str] = Field(default=None)


class BookingInfoSchema(BaseModel):
    booking_reference: Optional[str] = Field(default=None)
    booking_url: Optional[str] = Field(default=None)
    operator_phone: Optional[str] = Field(default=None)
    is_bookable_online: bool = Field(default=False)


class TransitLegSchema(BaseModel):
    leg_id: str = Field(..., min_length=1)
    mode: TransportModeEnum
    origin: TransportNodeSchema
    destination: TransportNodeSchema
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int = Field(..., ge=1)
    distance_meters: float = Field(..., ge=0.0)
    carrier: CarrierInfoSchema = Field(default_factory=lambda: CarrierInfoSchema(name="Self/Unspecified"))
    fare: FareBreakdownSchema
    additional_costs: List[AdditionalCostSchema] = Field(default_factory=list)
    transfer_info: Optional[TransferSchema] = Field(default=None)
    availability_status: LegStatusEnum = Field(default=LegStatusEnum.SCHEDULED)
    data_freshness: DataFreshnessSchema
    booking_info: BookingInfoSchema = Field(default_factory=BookingInfoSchema)
    polyline: Optional[str] = Field(default=None)
    intermediate_stops: List[TransportNodeSchema] = Field(default_factory=list)
    notes: Optional[str] = Field(default="")

    @model_validator(mode="after")
    def validate_temporal_order(self):
        if self.arrival_time <= self.departure_time:
            raise ValueError("arrival_time must be strictly after departure_time")
        return self


class RouteSegmentSchema(BaseModel):
    segment_id: str = Field(..., min_length=1)
    segment_type: SegmentTypeEnum = Field(default=SegmentTypeEnum.INTERCITY_TRANSIT)
    title: Optional[str] = Field(default="")
    legs: List[TransitLegSchema] = Field(..., min_length=1)
    segment_duration_minutes: int = Field(..., ge=1)
    segment_distance_meters: float = Field(default=0.0, ge=0.0)
    segment_total_cost: float = Field(default=0.0, ge=0.0)


class TotalMonetaryCostSchema(BaseModel):
    amount: float = Field(..., ge=0.0)
    currency: CurrencyEnum = Field(default=CurrencyEnum.INR)
    is_estimated: bool = Field(default=False)


class RouteOptionSchema(BaseModel):
    route_id: str = Field(..., min_length=1)
    trip_id: Optional[str] = Field(default=None)
    origin: TransportNodeSchema
    destination: TransportNodeSchema
    departure_time: datetime
    arrival_time: datetime
    total_duration_minutes: int = Field(..., ge=1)
    total_distance_meters: float = Field(..., ge=0.0)
    total_monetary_cost: TotalMonetaryCostSchema
    number_of_transfers: int = Field(default=0, ge=0)
    total_waiting_time_minutes: int = Field(default=0, ge=0)
    convenience_score: float = Field(default=5.0, ge=0.0, le=10.0)
    reliability_score: float = Field(default=5.0, ge=0.0, le=10.0)
    ranking_category: RouteCategoryEnum = Field(default=RouteCategoryEnum.BEST_OVERALL)
    recommendation_reason: Optional[str] = Field(default="")
    segments: List[RouteSegmentSchema] = Field(default_factory=list)
    legs: List[TransitLegSchema] = Field(..., min_length=1)
    polyline: Optional[str] = Field(default=None)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_route_temporal_order(self):
        if self.arrival_time <= self.departure_time:
            raise ValueError("route arrival_time must be strictly after departure_time")
        return self


# ==========================================
# 3. CONSTRAINTS & PREFERENCES
# ==========================================

class AccessibilityConstraintsSchema(BaseModel):
    wheelchair_accessible: bool = Field(default=False)
    step_free_access: bool = Field(default=False)
    limited_walking_required: bool = Field(default=False)
    audio_visual_aids: bool = Field(default=False)


class PassengerCountSchema(BaseModel):
    adults: int = Field(default=1, ge=1)
    children: int = Field(default=0, ge=0)
    infants: int = Field(default=0, ge=0)
    elderly: int = Field(default=0, ge=0)


class TravellerConstraintsSchema(BaseModel):
    max_budget: float = Field(default=0.0, ge=0.0)
    currency: CurrencyEnum = Field(default=CurrencyEnum.INR)
    max_duration_minutes: int = Field(default=0, ge=0)
    max_transfers: int = Field(default=3, ge=0)
    earliest_departure: Optional[datetime] = Field(default=None)
    latest_arrival: Optional[datetime] = Field(default=None)
    avoid_overnight: bool = Field(default=False)
    accessibility_requirements: AccessibilityConstraintsSchema = Field(
        default_factory=AccessibilityConstraintsSchema
    )
    passengers: PassengerCountSchema = Field(default_factory=PassengerCountSchema)
    has_heavy_luggage: bool = Field(default=False)


class TransportationPreferencesSchema(BaseModel):
    allowed_modes: List[TransportModeEnum] = Field(
        default=[
            TransportModeEnum.WALKING,
            TransportModeEnum.ROAD_DRIVING,
            TransportModeEnum.ROAD_CAB,
            TransportModeEnum.BUS,
            TransportModeEnum.RAIL,
            TransportModeEnum.AIR,
        ]
    )
    preferred_modes: List[TransportModeEnum] = Field(default_factory=list)
    disliked_modes: List[TransportModeEnum] = Field(default_factory=list)
    preferred_rail_classes: List[str] = Field(default_factory=lambda: ["3A", "2A", "CC"])
    preferred_cabin_class: str = Field(default="economy")
    max_walking_distance_meters: float = Field(default=1000.0, ge=0.0)


# ==========================================
# 4. OPTIMIZATION CONTRACT SCHEMAS
# ==========================================

class DepartureWindowSchema(BaseModel):
    earliest: datetime
    latest: datetime


class RouteOptimizationRequestSchema(BaseModel):
    search_id: str
    trip_id: Optional[str] = Field(default=None)
    origin: TransportNodeSchema
    destination: TransportNodeSchema
    departure_window: Optional[DepartureWindowSchema] = Field(default=None)
    traveller_constraints: TravellerConstraintsSchema = Field(default_factory=TravellerConstraintsSchema)
    preferences: TransportationPreferencesSchema = Field(default_factory=TransportationPreferencesSchema)
    candidate_transit_legs: List[TransitLegSchema] = Field(default_factory=list)


class RouteOptimizationResponseSchema(BaseModel):
    search_id: str
    status: str = Field(default="success")
    execution_time_ms: float = Field(default=0.0)
    stateless_execution: bool = Field(default=True)
    total_candidates_evaluated: int = Field(default=0)
    pareto_optimal_count: int = Field(default=0)
    routes: Dict[str, Optional[RouteOptionSchema]] = Field(default_factory=dict)

