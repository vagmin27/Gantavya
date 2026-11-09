"""
Multimodal Route Evaluator & Scoring Engine
Gantavya Intelligence Engine - Milestone 2.4

Computes multidimensional metrics for candidate paths:
- Total journey duration & waiting times
- Converted monetary costs
- Transfer counts & segments decomposition
- Reliability and Convenience scores
Produces validated RouteOptionSchema domain instances.
"""

from typing import List, Optional
from datetime import datetime
import uuid
from app.schemas.transportation import (
    TransitLegSchema,
    RouteOptionSchema,
    RouteSegmentSchema,
    SegmentTypeEnum,
    TotalMonetaryCostSchema,
    CurrencyEnum,
    RouteCategoryEnum,
    TransportModeEnum,
    TravellerConstraintsSchema,
    TransportationPreferencesSchema,
)
from app.services.transportation.currency import default_currency_converter


class RouteEvaluator:
    """
    Evaluates raw sequences of TransitLeg instances and constructs fully scored
    RouteOptionSchema domain instances.
    """

    def __init__(self, currency_converter=None):
        self.currency_converter = currency_converter or default_currency_converter

    def evaluate_path(
        self,
        legs: List[TransitLegSchema],
        search_id: str = "",
        trip_id: Optional[str] = None,
        constraints: Optional[TravellerConstraintsSchema] = None,
        preferences: Optional[TransportationPreferencesSchema] = None,
    ) -> RouteOptionSchema:
        """
        Transforms a valid sequence of TransitLeg items into a scored RouteOptionSchema.
        """
        if not legs or len(legs) == 0:
            raise ValueError("Cannot evaluate an empty leg sequence.")

        origin_node = legs[0].origin
        dest_node = legs[-1].destination
        overall_departure = legs[0].departure_time
        overall_arrival = legs[-1].arrival_time

        total_duration_minutes = max(1, int((overall_arrival - overall_departure).total_seconds() / 60))
        total_distance_meters = sum(leg.distance_meters for leg in legs)

        # 1. Calculate Monetary Cost in base INR
        total_cost_inr = 0.0
        any_estimated_fare = False
        for leg in legs:
            leg_cost_inr = self.currency_converter.convert_to_base(
                leg.fare.total_amount, leg.fare.currency
            )
            total_cost_inr += leg_cost_inr
            if leg.fare.is_estimated:
                any_estimated_fare = True

        total_monetary_cost = TotalMonetaryCostSchema(
            amount=round(total_cost_inr, 2),
            currency=CurrencyEnum.INR,
            is_estimated=any_estimated_fare,
        )

        # 2. Transfers & Waiting Times
        num_transfers = max(0, len(legs) - 1)
        total_waiting_minutes = 0
        for i in range(len(legs) - 1):
            layover_sec = (legs[i + 1].departure_time - legs[i].arrival_time).total_seconds()
            total_waiting_minutes += max(0, int(layover_sec / 60))

        # 3. Reliability Scoring (Scale 1.0 - 10.0)
        # Multiplicative confidence of constituent legs
        combined_confidence = 1.0
        for leg in legs:
            combined_confidence *= leg.data_freshness.confidence_score

        base_reliability = combined_confidence * 9.5
        # Penalty for connection risks (-0.4 per transfer)
        reliability_penalty = num_transfers * 0.4
        reliability_score = round(max(1.0, min(10.0, base_reliability - reliability_penalty)), 2)

        # 4. Convenience Scoring (Scale 1.0 - 10.0)
        convenience = 10.0
        # Transfer penalty: transfers disrupt passenger comfort
        convenience -= num_transfers * 1.5

        # Layover penalty: waiting > 120 minutes reduces convenience
        if total_waiting_minutes > 120:
            excess_hours = (total_waiting_minutes - 120) / 60.0
            convenience -= min(2.5, excess_hours * 0.8)

        # Overnight journey penalty: travel between 23:00 and 05:00
        has_overnight = any(
            (leg.departure_time.hour >= 23 or leg.departure_time.hour < 5)
            or (leg.arrival_time.hour >= 23 or leg.arrival_time.hour < 5)
            for leg in legs
        )
        if has_overnight:
            convenience -= 1.5

        convenience_score = round(max(1.0, min(10.0, convenience)), 2)

        # 5. Build Segment Decomposition
        segments = self._build_segments(legs)

        # Combined polyline if present
        combined_polyline = None
        for leg in legs:
            if leg.polyline:
                combined_polyline = leg.polyline
                break

        route_id = f"route_{search_id[:8] if search_id else 'opt'}_{uuid.uuid4().hex[:8]}"

        return RouteOptionSchema(
            route_id=route_id,
            trip_id=trip_id,
            origin=origin_node,
            destination=dest_node,
            departure_time=overall_departure,
            arrival_time=overall_arrival,
            total_duration_minutes=total_duration_minutes,
            total_distance_meters=round(total_distance_meters, 2),
            total_monetary_cost=total_monetary_cost,
            number_of_transfers=num_transfers,
            total_waiting_time_minutes=total_waiting_minutes,
            convenience_score=convenience_score,
            reliability_score=reliability_score,
            ranking_category=RouteCategoryEnum.BEST_OVERALL,
            recommendation_reason="",
            segments=segments,
            legs=legs,
            polyline=combined_polyline,
            metadata={
                "has_overnight": has_overnight,
                "modes": [leg.mode.value if hasattr(leg.mode, "value") else str(leg.mode) for leg in legs],
                "evaluated_at": datetime.utcnow().isoformat(),
            },
        )

    def _build_segments(self, legs: List[TransitLegSchema]) -> List[RouteSegmentSchema]:
        """
        Decomposes legs into standard first-mile, intercity, and last-mile segments.
        """
        if len(legs) == 1:
            seg_type = SegmentTypeEnum.INTERCITY_TRANSIT
            if legs[0].mode in (TransportModeEnum.WALKING, TransportModeEnum.ROAD_CAB):
                seg_type = SegmentTypeEnum.FIRST_MILE
            return [
                RouteSegmentSchema(
                    segment_id=f"seg_{uuid.uuid4().hex[:6]}",
                    segment_type=seg_type,
                    title=f"Direct {legs[0].carrier.name} ({legs[0].mode.value})",
                    legs=legs,
                    segment_duration_minutes=legs[0].duration_minutes,
                    segment_distance_meters=legs[0].distance_meters,
                    segment_total_cost=float(legs[0].fare.total_amount),
                )
            ]

        segments = []
        for i, leg in enumerate(legs):
            if i == 0 and leg.mode in (TransportModeEnum.WALKING, TransportModeEnum.ROAD_CAB, TransportModeEnum.BUS):
                seg_type = SegmentTypeEnum.FIRST_MILE
                title = f"First-Mile to {leg.destination.name}"
            elif i == len(legs) - 1 and leg.mode in (TransportModeEnum.WALKING, TransportModeEnum.ROAD_CAB, TransportModeEnum.BUS):
                seg_type = SegmentTypeEnum.LAST_MILE
                title = f"Last-Mile to {leg.destination.name}"
            else:
                seg_type = SegmentTypeEnum.INTERCITY_TRANSIT
                title = f"{leg.carrier.name} ({leg.mode.value})"

            segments.append(
                RouteSegmentSchema(
                    segment_id=f"seg_{uuid.uuid4().hex[:6]}",
                    segment_type=seg_type,
                    title=title,
                    legs=[leg],
                    segment_duration_minutes=leg.duration_minutes,
                    segment_distance_meters=leg.distance_meters,
                    segment_total_cost=float(leg.fare.total_amount),
                )
            )

        return segments

