"""
Test Suite for Unified Transportation Pydantic Schemas
Gantavya Intelligence Engine - Sub-Milestone 2.4.1
"""

import pytest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError
from app.schemas.transportation import (
    TransportModeEnum,
    TransportNodeTypeEnum,
    DataFreshnessEnum,
    LegStatusEnum,
    FareTierEnum,
    CurrencyEnum,
    RouteCategoryEnum,
    AdditionalCostTypeEnum,
    TransferTypeEnum,
    SegmentTypeEnum,
    TransportCoordinatesSchema,
    TransportNodeSchema,
    AdditionalCostSchema,
    FareBreakdownSchema,
    TransferSchema,
    DataFreshnessSchema,
    CarrierInfoSchema,
    BookingInfoSchema,
    TransitLegSchema,
    RouteSegmentSchema,
    TotalMonetaryCostSchema,
    RouteOptionSchema,
    TravellerConstraintsSchema,
    TransportationPreferencesSchema,
    RouteOptimizationRequestSchema,
    RouteOptimizationResponseSchema,
)
from app.core.transportation_provider import BaseTransportationProviderAdapter


class TestTransportationEnums:
    def test_enums_contain_expected_values(self):
        assert TransportModeEnum.WALKING == "walking"
        assert TransportModeEnum.ROAD_DRIVING == "road_driving"
        assert TransportModeEnum.ROAD_CAB == "road_cab"
        assert TransportModeEnum.BUS == "bus"
        assert TransportModeEnum.RAIL == "rail"
        assert TransportModeEnum.AIR == "air"

        assert TransportNodeTypeEnum.AIRPORT == "airport"
        assert TransportNodeTypeEnum.RAIL_STATION == "rail_station"
        assert TransportNodeTypeEnum.COORDINATES == "coordinates"

        assert DataFreshnessEnum.REALTIME == "realtime"
        assert DataFreshnessEnum.SCHEDULED == "scheduled"
        assert DataFreshnessEnum.HISTORICAL_ESTIMATE == "historical_estimate"

        assert CurrencyEnum.INR == "INR"
        assert CurrencyEnum.NPR == "NPR"
        assert CurrencyEnum.USD == "USD"


class TestTransportNodeAndFare:
    def test_valid_transport_node(self):
        node = TransportNodeSchema(
            node_id="node_del_airport",
            name="Indira Gandhi International Airport",
            node_type=TransportNodeTypeEnum.AIRPORT,
            code="DEL",
            coordinates=TransportCoordinatesSchema(longitude=77.1000, latitude=28.5562),
            city="New Delhi",
            country="India",
            terminal_or_platform="Terminal 3",
        )
        assert node.node_id == "node_del_airport"
        assert node.code == "DEL"
        assert node.coordinates.longitude == 77.1000

    def test_invalid_coordinates_raises_validation_error(self):
        with pytest.raises(ValidationError):
            TransportCoordinatesSchema(longitude=195.0, latitude=28.5)

        with pytest.raises(ValidationError):
            TransportCoordinatesSchema(longitude=77.0, latitude=-95.0)

    def test_valid_fare_breakdown(self):
        fare = FareBreakdownSchema(
            base_amount=3500.0,
            currency=CurrencyEnum.INR,
            fare_tier=FareTierEnum.ECONOMY,
            is_estimated=False,
            taxes_and_fees=450.0,
            total_amount=3950.0,
            pricing_source="amadeus_gds",
        )
        assert fare.total_amount == 3950.0
        assert fare.is_estimated is False

    def test_fare_breakdown_rejects_total_less_than_base(self):
        with pytest.raises(ValidationError, match="total_amount cannot be less than base_amount"):
            FareBreakdownSchema(
                base_amount=5000.0,
                total_amount=4000.0,  # Invalid
            )


class TestTransitLegValidation:
    def test_valid_road_transit_leg(self):
        dep = datetime(2026, 11, 20, 7, 0, tzinfo=timezone.utc)
        arr = datetime(2026, 11, 20, 10, 30, tzinfo=timezone.utc)

        leg = TransitLegSchema(
            leg_id="leg_road_1",
            mode=TransportModeEnum.ROAD_CAB,
            origin=TransportNodeSchema(
                node_id="n1",
                name="Connaught Place",
                coordinates=TransportCoordinatesSchema(longitude=77.2167, latitude=28.6328),
            ),
            destination=TransportNodeSchema(
                node_id="n2",
                name="Taj Mahal",
                coordinates=TransportCoordinatesSchema(longitude=78.0421, latitude=27.1751),
            ),
            departure_time=dep,
            arrival_time=arr,
            duration_minutes=210,
            distance_meters=235000.0,
            carrier=CarrierInfoSchema(name="Intercity Cab", identifier="Sedan"),
            fare=FareBreakdownSchema(base_amount=3200.0, total_amount=3200.0),
            additional_costs=[
                AdditionalCostSchema(
                    cost_type=AdditionalCostTypeEnum.TOLL,
                    amount=415.0,
                    currency=CurrencyEnum.INR,
                    description="Expressway FASTag",
                )
            ],
            data_freshness=DataFreshnessSchema(
                freshness_level=DataFreshnessEnum.REALTIME,
                source="here_routing_v8",
                confidence_score=0.95,
            ),
        )
        assert leg.mode == TransportModeEnum.ROAD_CAB
        assert leg.duration_minutes == 210
        assert len(leg.additional_costs) == 1

    def test_valid_rail_transit_leg(self):
        dep = datetime(2026, 11, 20, 6, 0, tzinfo=timezone.utc)
        arr = datetime(2026, 11, 20, 14, 0, tzinfo=timezone.utc)

        leg = TransitLegSchema(
            leg_id="leg_rail_1",
            mode=TransportModeEnum.RAIL,
            origin=TransportNodeSchema(
                node_id="ndls",
                name="New Delhi",
                node_type=TransportNodeTypeEnum.RAIL_STATION,
                code="NDLS",
                coordinates=TransportCoordinatesSchema(longitude=77.2197, latitude=28.6431),
            ),
            destination=TransportNodeSchema(
                node_id="bsb",
                name="Varanasi",
                node_type=TransportNodeTypeEnum.RAIL_STATION,
                code="BSB",
                coordinates=TransportCoordinatesSchema(longitude=82.9863, latitude=25.3284),
            ),
            departure_time=dep,
            arrival_time=arr,
            duration_minutes=480,
            distance_meters=759000.0,
            carrier=CarrierInfoSchema(name="Indian Railways", identifier="22436 Vande Bharat"),
            fare=FareBreakdownSchema(
                base_amount=1750.0,
                fare_tier=FareTierEnum.CHAIR_CAR,
                total_amount=1750.0,
            ),
            data_freshness=DataFreshnessSchema(
                freshness_level=DataFreshnessEnum.SCHEDULED,
                source="ir_gtfs",
            ),
        )
        assert leg.carrier.identifier == "22436 Vande Bharat"
        assert leg.fare.fare_tier == FareTierEnum.CHAIR_CAR

    def test_valid_air_transit_leg(self):
        dep = datetime(2026, 11, 20, 9, 0, tzinfo=timezone.utc)
        arr = datetime(2026, 11, 20, 11, 15, tzinfo=timezone.utc)

        leg = TransitLegSchema(
            leg_id="leg_air_1",
            mode=TransportModeEnum.AIR,
            origin=TransportNodeSchema(
                node_id="del",
                name="DEL Airport",
                node_type=TransportNodeTypeEnum.AIRPORT,
                code="DEL",
                coordinates=TransportCoordinatesSchema(longitude=77.1000, latitude=28.5562),
            ),
            destination=TransportNodeSchema(
                node_id="bom",
                name="BOM Airport",
                node_type=TransportNodeTypeEnum.AIRPORT,
                code="BOM",
                coordinates=TransportCoordinatesSchema(longitude=72.8679, latitude=19.0896),
            ),
            departure_time=dep,
            arrival_time=arr,
            duration_minutes=135,
            distance_meters=1150000.0,
            carrier=CarrierInfoSchema(name="IndiGo", code="6E", identifier="6E-205"),
            fare=FareBreakdownSchema(
                base_amount=4800.0,
                taxes_and_fees=620.0,
                total_amount=5420.0,
            ),
            data_freshness=DataFreshnessSchema(
                freshness_level=DataFreshnessEnum.REALTIME,
                source="amadeus_v2",
            ),
        )
        assert leg.mode == TransportModeEnum.AIR
        assert leg.carrier.code == "6E"

    def test_rejects_arrival_before_or_equal_to_departure(self):
        now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
        earlier = datetime(2026, 11, 20, 11, 0, tzinfo=timezone.utc)

        with pytest.raises(ValidationError, match="arrival_time must be strictly after departure_time"):
            TransitLegSchema(
                leg_id="leg_err",
                mode=TransportModeEnum.ROAD_DRIVING,
                origin=TransportNodeSchema(
                    node_id="o1",
                    name="Start",
                    coordinates=TransportCoordinatesSchema(longitude=77.1, latitude=28.5),
                ),
                destination=TransportNodeSchema(
                    node_id="d1",
                    name="End",
                    coordinates=TransportCoordinatesSchema(longitude=77.2, latitude=28.6),
                ),
                departure_time=now,
                arrival_time=earlier,  # Invalid: arrival earlier than departure
                duration_minutes=60,
                distance_meters=10000.0,
                fare=FareBreakdownSchema(base_amount=100.0, total_amount=100.0),
                data_freshness=DataFreshnessSchema(source="test"),
            )


class TestRouteOptionSchema:
    def test_valid_multimodal_route_option(self):
        dep = datetime(2026, 11, 20, 6, 0, tzinfo=timezone.utc)
        arr = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)

        route = RouteOptionSchema(
            route_id="route_test_001",
            origin=TransportNodeSchema(
                node_id="n_home",
                name="Home",
                coordinates=TransportCoordinatesSchema(longitude=77.2, latitude=28.6),
            ),
            destination=TransportNodeSchema(
                node_id="n_dest",
                name="Resort",
                coordinates=TransportCoordinatesSchema(longitude=73.7, latitude=15.5),
            ),
            departure_time=dep,
            arrival_time=arr,
            total_duration_minutes=360,
            total_distance_meters=1850000.0,
            total_monetary_cost=TotalMonetaryCostSchema(
                amount=6200.0,
                currency=CurrencyEnum.INR,
                is_estimated=False,
            ),
            number_of_transfers=1,
            ranking_category=RouteCategoryEnum.BEST_OVERALL,
            recommendation_reason="Optimal balance of speed and cost",
            legs=[
                TransitLegSchema(
                    leg_id="leg_1",
                    mode=TransportModeEnum.ROAD_CAB,
                    origin=TransportNodeSchema(
                        node_id="n_home",
                        name="Home",
                        coordinates=TransportCoordinatesSchema(longitude=77.2, latitude=28.6),
                    ),
                    destination=TransportNodeSchema(
                        node_id="n_del",
                        name="DEL Airport",
                        coordinates=TransportCoordinatesSchema(longitude=77.1, latitude=28.55),
                    ),
                    departure_time=dep,
                    arrival_time=datetime(2026, 11, 20, 6, 45, tzinfo=timezone.utc),
                    duration_minutes=45,
                    distance_meters=18000.0,
                    fare=FareBreakdownSchema(base_amount=450.0, total_amount=450.0),
                    data_freshness=DataFreshnessSchema(source="test"),
                )
            ],
        )

        assert route.route_id == "route_test_001"
        assert route.ranking_category == RouteCategoryEnum.BEST_OVERALL
        assert len(route.legs) == 1

        # Test JSON serialization roundtrip
        json_data = route.model_dump_json()
        assert "route_test_001" in json_data
        assert "best_overall" in json_data


class TestProviderAdapterInterface:
    def test_cannot_instantiate_abstract_adapter(self):
        with pytest.raises(TypeError, match="Can't instantiate abstract class"):
            BaseTransportationProviderAdapter("Generic", [TransportModeEnum.ROAD_DRIVING])  # type: ignore

    def test_concrete_subclass_instantiation(self):
        class MockAirAdapter(BaseTransportationProviderAdapter):
            async def search_legs(self, origin, destination, departure_time, options=None):
                return []

            def normalize_response(self, raw_payload, context=None):
                return None

            async def health_check(self):
                return {"status": "ok"}

        adapter = MockAirAdapter("MockAmadeus", [TransportModeEnum.AIR])
        assert adapter.provider_name == "MockAmadeus"
        assert TransportModeEnum.AIR in adapter.supported_modes

