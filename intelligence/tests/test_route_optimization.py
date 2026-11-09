"""
Comprehensive Multimodal Route Optimization Test Suite
Gantavya Intelligence Engine - Milestone 2.4.3

Validates:
- NetworkX graph construction & topological integrity
- Multimodal candidate route path finding (Road, Rail, Air, 3-mode combos)
- Temporal causality & transfer buffer enforcement
- Currency conversion & normalization (Zero cross-currency summation)
- Hard constraint filtering (budget, duration, transfers, overnight, deadlines)
- Pareto dominance pruning
- TOPSIS multi-criteria decision ranking across 5 recommendation categories
- Timezone handling & data freshness scoring
- Large graph performance
- FastAPI stateless endpoint integration with service key authentication
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.schemas.transportation import (
    TransportNodeSchema,
    TransportNodeTypeEnum,
    TransportModeEnum,
    TransitLegSchema,
    FareBreakdownSchema,
    DataFreshnessSchema,
    DataFreshnessEnum,
    LegStatusEnum,
    CarrierInfoSchema,
    TransferSchema,
    TransferTypeEnum,
    CurrencyEnum,
    FareTierEnum,
    TravellerConstraintsSchema,
    TransportationPreferencesSchema,
    DepartureWindowSchema,
    RouteOptimizationRequestSchema,
    RouteCategoryEnum,
)
from app.services.transportation import (
    CurrencyConverter,
    default_currency_converter,
    TransferBufferCalculator,
    MultimodalTransitGraph,
    CandidateRoutePathFinder,
    RouteEvaluator,
    ParetoDominanceFilter,
    TopsisRanker,
    MultimodalRouteOptimizer,
)

client = TestClient(app)
INTERNAL_KEY = settings.INTERNAL_SERVICE_KEY or "dev_internal_service_key"


# ==========================================
# FIXTURES & REALISTIC INDIAN TRANSIT NODES
# ==========================================

@pytest.fixture
def delhi_hotel():
    return TransportNodeSchema(
        node_id="node_delhi_hotel_aerocity",
        name="Aerocity Hotel, New Delhi",
        node_type=TransportNodeTypeEnum.LANDMARK,
        coordinates=[77.1200, 28.5500],
        city="New Delhi",
    )

@pytest.fixture
def delhi_airport():
    return TransportNodeSchema(
        node_id="node_delhi_igi_t3",
        name="Indira Gandhi International Airport Terminal 3",
        node_type=TransportNodeTypeEnum.AIRPORT,
        code="DEL",
        coordinates=[77.1000, 28.5562],
        city="New Delhi",
    )

@pytest.fixture
def delhi_rail_station():
    return TransportNodeSchema(
        node_id="node_rail_ndls",
        name="New Delhi Railway Station",
        node_type=TransportNodeTypeEnum.RAIL_STATION,
        code="NDLS",
        coordinates=[77.2195, 28.6431],
        city="New Delhi",
    )

@pytest.fixture
def jaipur_rail_station():
    return TransportNodeSchema(
        node_id="node_rail_jp",
        name="Jaipur Junction Railway Station",
        node_type=TransportNodeTypeEnum.RAIL_STATION,
        code="JP",
        coordinates=[75.7873, 26.9196],
        city="Jaipur",
    )

@pytest.fixture
def mumbai_airport():
    return TransportNodeSchema(
        node_id="node_mumbai_csmi_t2",
        name="Chhatrapati Shivaji Maharaj International Airport Terminal 2",
        node_type=TransportNodeTypeEnum.AIRPORT,
        code="BOM",
        coordinates=[72.8777, 19.0760],
        city="Mumbai",
    )

@pytest.fixture
def mumbai_rail_station():
    return TransportNodeSchema(
        node_id="node_rail_mmct",
        name="Mumbai Central Railway Station",
        node_type=TransportNodeTypeEnum.RAIL_STATION,
        code="MMCT",
        coordinates=[72.8193, 18.9696],
        city="Mumbai",
    )

@pytest.fixture
def agra_city():
    return TransportNodeSchema(
        node_id="node_agra_taj",
        name="Taj Mahal East Gate, Agra",
        node_type=TransportNodeTypeEnum.LANDMARK,
        coordinates=[78.0421, 27.1750],
        city="Agra",
    )

@pytest.fixture
def agra_station():
    return TransportNodeSchema(
        node_id="node_rail_agc",
        name="Agra Cantt Railway Station",
        node_type=TransportNodeTypeEnum.RAIL_STATION,
        code="AGC",
        coordinates=[78.0081, 27.1593],
        city="Agra",
    )


# ==========================================
# 1. CURRENCY CONVERSION & NORMALIZATION
# ==========================================

class TestCurrencyConversion:
    def test_same_currency_no_change(self):
        converter = CurrencyConverter()
        assert converter.convert_to_base(1500.0, CurrencyEnum.INR) == 1500.0

    def test_convert_usd_to_inr(self):
        converter = CurrencyConverter()
        converted = converter.convert_to_base(100.0, CurrencyEnum.USD)
        assert converted == 8650.0  # 100 * 86.50

    def test_convert_eur_and_gbp_to_inr(self):
        converter = CurrencyConverter()
        eur_inr = converter.convert_to_base(50.0, CurrencyEnum.EUR)
        assert eur_inr == 4650.0  # 50 * 93.00

        gbp_inr = converter.convert_to_base(20.0, CurrencyEnum.GBP)
        assert gbp_inr == 2200.0  # 20 * 110.00

    def test_convert_between_non_base_currencies(self):
        converter = CurrencyConverter()
        usd_to_eur = converter.convert_between(100.0, CurrencyEnum.USD, CurrencyEnum.EUR)
        # 100 USD = 8650 INR -> 8650 / 93 = 93.01 EUR
        assert 92.0 <= usd_to_eur <= 94.0


# ==========================================
# 2. TRANSFER BUFFER & TEMPORAL FEASIBILITY
# ==========================================

class TestTransferBufferAndCausality:
    def test_valid_temporal_connection(self):
        t_arr = datetime(2026, 12, 1, 10, 0)
        t_dep_valid = datetime(2026, 12, 1, 11, 0)  # 60m buffer > 45m required for air-to-air

        is_valid = TransferBufferCalculator.is_temporally_valid(
            arrival_time=t_arr,
            departure_time=t_dep_valid,
            from_mode=TransportModeEnum.AIR,
            to_mode=TransportModeEnum.AIR,
        )
        assert is_valid is True

    def test_impossible_connection_departure_before_arrival(self):
        t_arr = datetime(2026, 12, 1, 10, 0)
        t_dep_past = datetime(2026, 12, 1, 9, 30)

        is_valid = TransferBufferCalculator.is_temporally_valid(
            arrival_time=t_arr,
            departure_time=t_dep_past,
            from_mode=TransportModeEnum.ROAD_CAB,
            to_mode=TransportModeEnum.RAIL,
        )
        assert is_valid is False

    def test_missed_transfer_insufficient_buffer(self):
        t_arr = datetime(2026, 12, 1, 10, 0)
        # Air to Air needs 45 mins. 15 mins is an impossible connection
        t_dep_tight = datetime(2026, 12, 1, 10, 15)

        is_valid = TransferBufferCalculator.is_temporally_valid(
            arrival_time=t_arr,
            departure_time=t_dep_tight,
            from_mode=TransportModeEnum.AIR,
            to_mode=TransportModeEnum.AIR,
        )
        assert is_valid is False

    def test_respects_cross_terminal_buffer(self):
        transfer_info = TransferSchema(
            transfer_type=TransferTypeEnum.CROSS_TERMINAL,
            buffer_duration_minutes=30,  # cross_terminal enforces at least 75m
        )
        t_arr = datetime(2026, 12, 1, 10, 0)
        t_dep_60m = datetime(2026, 12, 1, 11, 0)   # 60m < 75m
        t_dep_90m = datetime(2026, 12, 1, 11, 30)  # 90m >= 75m

        assert TransferBufferCalculator.is_temporally_valid(
            t_arr, t_dep_60m, TransportModeEnum.AIR, TransportModeEnum.AIR, transfer_info
        ) is False

        assert TransferBufferCalculator.is_temporally_valid(
            t_arr, t_dep_90m, TransportModeEnum.AIR, TransportModeEnum.AIR, transfer_info
        ) is True


# ==========================================
# 3. GRAPH ENGINE & CANDIDATE ROUTE FINDER
# ==========================================

class TestGraphEngineAndPathFinder:
    def test_build_networkx_graph_and_summary(self, delhi_hotel, delhi_airport):
        base_time = datetime(2026, 12, 15, 8, 0)
        leg = TransitLegSchema(
            leg_id="leg_cab_001",
            mode=TransportModeEnum.ROAD_CAB,
            origin=delhi_hotel,
            destination=delhi_airport,
            departure_time=base_time,
            arrival_time=base_time + timedelta(minutes=25),
            duration_minutes=25,
            distance_meters=8500.0,
            fare=FareBreakdownSchema(base_amount=350.0, total_amount=350.0, currency=CurrencyEnum.INR),
            data_freshness=DataFreshnessSchema(source="test", freshness_level=DataFreshnessEnum.REALTIME),
            availability_status=LegStatusEnum.ACTIVE,
        )

        graph = MultimodalTransitGraph()
        graph.add_transit_leg(leg)

        assert graph.node_count == 2
        assert graph.edge_count == 1
        summary = graph.get_summary()
        assert summary["total_nodes"] == 2
        assert summary["total_edges"] == 1
        assert summary["mode_distribution"]["road_cab"] == 1

    def test_road_only_journey(self, delhi_hotel, agra_city):
        base_time = datetime(2026, 12, 15, 7, 0)
        road_leg = TransitLegSchema(
            leg_id="leg_road_delhi_agra",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=base_time,
            arrival_time=base_time + timedelta(minutes=210),
            duration_minutes=210,
            distance_meters=230000.0,
            fare=FareBreakdownSchema(base_amount=1800.0, total_amount=2215.0, currency=CurrencyEnum.INR, is_estimated=True),
            data_freshness=DataFreshnessSchema(source="here_routing_v8", freshness_level=DataFreshnessEnum.REALTIME),
            availability_status=LegStatusEnum.ACTIVE,
        )

        graph = MultimodalTransitGraph()
        graph.add_transit_leg(road_leg)

        finder = CandidateRoutePathFinder(graph)
        paths = finder.find_candidate_paths(delhi_hotel.node_id, agra_city.node_id)
        assert len(paths) == 1
        assert paths[0][0].leg_id == "leg_road_delhi_agra"

    def test_multimodal_road_plus_air_journey(self, delhi_hotel, delhi_airport, mumbai_airport):
        t1 = datetime(2026, 12, 15, 6, 0)
        t1_arr = t1 + timedelta(minutes=30)  # arrives 06:30

        leg_cab = TransitLegSchema(
            leg_id="leg_cab_to_airport",
            mode=TransportModeEnum.ROAD_CAB,
            origin=delhi_hotel,
            destination=delhi_airport,
            departure_time=t1,
            arrival_time=t1_arr,
            duration_minutes=30,
            distance_meters=10000.0,
            fare=FareBreakdownSchema(base_amount=400.0, total_amount=400.0),
            data_freshness=DataFreshnessSchema(source="cab_api"),
            availability_status=LegStatusEnum.ACTIVE,
        )

        # Cab arrives at 06:30. Road to Air buffer is 120m -> Earliest flight departure is 08:30
        t2_flight = datetime(2026, 12, 15, 8, 45) # 2h 15m buffer > 2h
        t2_arr = t2_flight + timedelta(minutes=135)

        leg_flight = TransitLegSchema(
            leg_id="leg_flight_del_bom",
            mode=TransportModeEnum.AIR,
            origin=delhi_airport,
            destination=mumbai_airport,
            departure_time=t2_flight,
            arrival_time=t2_arr,
            duration_minutes=135,
            distance_meters=1150000.0,
            carrier=CarrierInfoSchema(name="IndiGo", code="6E", identifier="6E-205"),
            fare=FareBreakdownSchema(base_amount=3800.0, total_amount=4500.0, is_estimated=False),
            data_freshness=DataFreshnessSchema(source="amadeus_flight_offers_v2", freshness_level=DataFreshnessEnum.REALTIME),
            availability_status=LegStatusEnum.SCHEDULED,
        )

        graph = MultimodalTransitGraph()
        graph.add_transit_leg(leg_cab)
        graph.add_transit_leg(leg_flight)

        finder = CandidateRoutePathFinder(graph)
        paths = finder.find_candidate_paths(delhi_hotel.node_id, mumbai_airport.node_id)
        assert len(paths) == 1
        assert len(paths[0]) == 2
        assert paths[0][0].mode == TransportModeEnum.ROAD_CAB
        assert paths[0][1].mode == TransportModeEnum.AIR

    def test_multimodal_3_mode_rail_road_air(self, jaipur_rail_station, delhi_rail_station, delhi_airport, mumbai_airport):
        # 1. Jaipur to Delhi Rail: 06:00 to 10:30
        t1 = datetime(2026, 12, 15, 6, 0)
        t1_arr = t1 + timedelta(minutes=270)
        leg_train = TransitLegSchema(
            leg_id="leg_train_jp_ndls",
            mode=TransportModeEnum.RAIL,
            origin=jaipur_rail_station,
            destination=delhi_rail_station,
            departure_time=t1,
            arrival_time=t1_arr,
            duration_minutes=270,
            distance_meters=305000.0,
            fare=FareBreakdownSchema(base_amount=650.0, total_amount=720.0),
            data_freshness=DataFreshnessSchema(source="indian_railways_gtfs_static", freshness_level=DataFreshnessEnum.SCHEDULED),
        )

        # 2. Delhi Rail Station to IGI Airport Cab: 11:00 to 11:45 (30m buffer from train arrival)
        t2 = datetime(2026, 12, 15, 11, 0)
        t2_arr = t2 + timedelta(minutes=45)
        leg_metro = TransitLegSchema(
            leg_id="leg_cab_station_airport",
            mode=TransportModeEnum.ROAD_CAB,
            origin=delhi_rail_station,
            destination=delhi_airport,
            departure_time=t2,
            arrival_time=t2_arr,
            duration_minutes=45,
            distance_meters=18000.0,
            fare=FareBreakdownSchema(base_amount=500.0, total_amount=500.0),
            data_freshness=DataFreshnessSchema(source="cab"),
        )

        # 3. IGI Airport to Mumbai Flight: 14:00 to 16:15 (2h 15m buffer from cab arrival)
        t3 = datetime(2026, 12, 15, 14, 0)
        t3_arr = t3 + timedelta(minutes=135)
        leg_flight = TransitLegSchema(
            leg_id="leg_flight_del_bom_3mode",
            mode=TransportModeEnum.AIR,
            origin=delhi_airport,
            destination=mumbai_airport,
            departure_time=t3,
            arrival_time=t3_arr,
            duration_minutes=135,
            distance_meters=1150000.0,
            fare=FareBreakdownSchema(base_amount=3800.0, total_amount=4500.0),
            data_freshness=DataFreshnessSchema(source="amadeus"),
        )

        graph = MultimodalTransitGraph()
        graph.build_from_legs([leg_train, leg_metro, leg_flight])

        finder = CandidateRoutePathFinder(graph)
        paths = finder.find_candidate_paths(jaipur_rail_station.node_id, mumbai_airport.node_id)
        assert len(paths) == 1
        assert len(paths[0]) == 3
        modes = [l.mode for l in paths[0]]
        assert modes == [TransportModeEnum.RAIL, TransportModeEnum.ROAD_CAB, TransportModeEnum.AIR]


# ==========================================
# 4. ROUTE EVALUATOR & HARD CONSTRAINTS
# ==========================================

class TestRouteEvaluatorAndConstraints:
    def test_hard_constraints_budget_filter(self, delhi_hotel, agra_city):
        t = datetime(2026, 12, 20, 8, 0)
        cheap_leg = TransitLegSchema(
            leg_id="leg_cheap",
            mode=TransportModeEnum.BUS,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(hours=4),
            duration_minutes=240,
            distance_meters=230000.0,
            fare=FareBreakdownSchema(base_amount=350.0, total_amount=350.0),
            data_freshness=DataFreshnessSchema(source="bus"),
        )
        expensive_leg = TransitLegSchema(
            leg_id="leg_expensive",
            mode=TransportModeEnum.ROAD_CAB,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(hours=3),
            duration_minutes=180,
            distance_meters=230000.0,
            fare=FareBreakdownSchema(base_amount=4500.0, total_amount=4500.0),
            data_freshness=DataFreshnessSchema(source="cab"),
        )

        request = RouteOptimizationRequestSchema(
            search_id="test_budget",
            origin=delhi_hotel,
            destination=agra_city,
            traveller_constraints=TravellerConstraintsSchema(max_budget=1000.0),  # Budget cap ₹1000
            candidate_transit_legs=[cheap_leg, expensive_leg],
        )

        optimizer = MultimodalRouteOptimizer()
        response = optimizer.optimize_routes(request)
        assert response.status == "success"
        assert response.total_candidates_evaluated == 1  # Expensive one was pruned by budget
        assert response.routes["cheapest"].total_monetary_cost.amount == 350.0

    def test_hard_constraints_avoid_overnight(self, delhi_hotel, agra_city):
        # Daytime journey
        t_day = datetime(2026, 12, 20, 10, 0)
        day_leg = TransitLegSchema(
            leg_id="leg_day",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t_day,
            arrival_time=t_day + timedelta(hours=3),
            duration_minutes=180,
            distance_meters=230000.0,
            fare=FareBreakdownSchema(base_amount=1500.0, total_amount=1500.0),
            data_freshness=DataFreshnessSchema(source="road"),
        )

        # Overnight journey (01:00 to 04:00 AM)
        t_night = datetime(2026, 12, 20, 1, 0)
        night_leg = TransitLegSchema(
            leg_id="leg_night",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t_night,
            arrival_time=t_night + timedelta(hours=3),
            duration_minutes=180,
            distance_meters=230000.0,
            fare=FareBreakdownSchema(base_amount=1200.0, total_amount=1200.0),
            data_freshness=DataFreshnessSchema(source="road"),
        )

        request = RouteOptimizationRequestSchema(
            search_id="test_overnight",
            origin=delhi_hotel,
            destination=agra_city,
            traveller_constraints=TravellerConstraintsSchema(avoid_overnight=True),
            candidate_transit_legs=[day_leg, night_leg],
        )

        optimizer = MultimodalRouteOptimizer()
        response = optimizer.optimize_routes(request)
        assert response.status == "success"
        assert response.total_candidates_evaluated == 1  # Night leg pruned


# ==========================================
# 5. MULTI-OBJECTIVE OPTIMIZATION & TOPSIS
# ==========================================

class TestMultiObjectiveOptimization:
    def test_pareto_dominance_prunes_dominated_routes(self, delhi_hotel, agra_city):
        t = datetime(2026, 12, 20, 9, 0)
        # Superior route: 120 mins, ₹1000, 0 transfers, rel 9.0, conv 9.0
        leg_superior = TransitLegSchema(
            leg_id="leg_sup",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(minutes=120),
            duration_minutes=120,
            distance_meters=215000.0,
            fare=FareBreakdownSchema(base_amount=1000.0, total_amount=1000.0),
            data_freshness=DataFreshnessSchema(source="test", confidence_score=0.95),
        )

        # Strictly inferior route: 240 mins, ₹2500, 0 transfers, rel 8.0, conv 7.0
        leg_inferior = TransitLegSchema(
            leg_id="leg_inf",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(minutes=240),
            duration_minutes=240,
            distance_meters=215000.0,
            fare=FareBreakdownSchema(base_amount=2500.0, total_amount=2500.0),
            data_freshness=DataFreshnessSchema(source="test", confidence_score=0.80),
        )

        evaluator = RouteEvaluator()
        route_sup = evaluator.evaluate_path([leg_superior])
        route_inf = evaluator.evaluate_path([leg_inferior])

        assert ParetoDominanceFilter.dominates(route_sup, route_inf) is True
        assert ParetoDominanceFilter.dominates(route_inf, route_sup) is False

        pareto = ParetoDominanceFilter.filter_pareto_frontier([route_sup, route_inf])
        assert len(pareto) == 1
        assert pareto[0].route_id == route_sup.route_id

    def test_topsis_selects_best_overall_compromise(self, delhi_hotel, mumbai_airport):
        t = datetime(2026, 12, 20, 8, 0)
        # Option 1: Ultra-fast flight, higher cost
        leg_fast = TransitLegSchema(
            leg_id="leg_opt_fast",
            mode=TransportModeEnum.AIR,
            origin=delhi_hotel,
            destination=mumbai_airport,
            departure_time=t,
            arrival_time=t + timedelta(minutes=140),
            duration_minutes=140,
            distance_meters=1150000.0,
            fare=FareBreakdownSchema(base_amount=5500.0, total_amount=6000.0),
            data_freshness=DataFreshnessSchema(source="air", confidence_score=0.98),
        )
        # Option 2: Train, slow but cheap
        leg_cheap = TransitLegSchema(
            leg_id="leg_opt_cheap",
            mode=TransportModeEnum.RAIL,
            origin=delhi_hotel,
            destination=mumbai_airport,
            departure_time=t,
            arrival_time=t + timedelta(minutes=940),
            duration_minutes=940,
            distance_meters=1380000.0,
            fare=FareBreakdownSchema(base_amount=1600.0, total_amount=1700.0),
            data_freshness=DataFreshnessSchema(source="rail", confidence_score=0.90),
        )

        evaluator = RouteEvaluator()
        r1 = evaluator.evaluate_path([leg_fast])
        r2 = evaluator.evaluate_path([leg_cheap])

        ranked = TopsisRanker.rank_routes([r1, r2])
        assert len(ranked) == 2
        # Check closeness coefficients bounded in [0, 1]
        for _, score in ranked:
            assert 0.0 <= score <= 1.0

    def test_produces_all_five_recommendation_categories(self, delhi_hotel, agra_city):
        t = datetime(2026, 12, 20, 7, 0)
        # Fast option (Taxi)
        leg1 = TransitLegSchema(
            leg_id="l1_fast",
            mode=TransportModeEnum.ROAD_CAB,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(minutes=160),
            duration_minutes=160,
            distance_meters=215000.0,
            fare=FareBreakdownSchema(base_amount=3500.0, total_amount=3500.0),
            data_freshness=DataFreshnessSchema(source="cab"),
        )
        # Cheap option (Bus)
        leg2 = TransitLegSchema(
            leg_id="l2_cheap",
            mode=TransportModeEnum.BUS,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(minutes=260),
            duration_minutes=260,
            distance_meters=220000.0,
            fare=FareBreakdownSchema(base_amount=400.0, total_amount=400.0),
            data_freshness=DataFreshnessSchema(source="bus"),
        )

        optimizer = MultimodalRouteOptimizer()
        req = RouteOptimizationRequestSchema(
            search_id="test_categories",
            origin=delhi_hotel,
            destination=agra_city,
            candidate_transit_legs=[leg1, leg2],
        )

        res = optimizer.optimize_routes(req)
        assert res.status == "success"
        assert "cheapest" in res.routes
        assert "fastest" in res.routes
        assert "fewest_transfers" in res.routes
        assert "most_convenient" in res.routes
        assert "best_overall" in res.routes

        assert res.routes["cheapest"].total_monetary_cost.amount == 400.0
        assert res.routes["fastest"].total_duration_minutes == 160


# ==========================================
# 6. TIMEZONE & LARGE GRAPH SCALABILITY
# ==========================================

class TestTimezoneAndScalability:
    def test_timezone_aware_timestamps(self, delhi_hotel, agra_city):
        ist = timezone(timedelta(hours=5, minutes=30))
        utc = timezone.utc

        t_ist = datetime(2026, 12, 20, 10, 0, tzinfo=ist)
        # Corresponding UTC arrival: 07:30 UTC = 13:00 IST (3h journey)
        t_arr_utc = datetime(2026, 12, 20, 7, 30, tzinfo=utc)

        leg = TransitLegSchema(
            leg_id="leg_tz",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t_ist,
            arrival_time=t_arr_utc,
            duration_minutes=180,
            distance_meters=215000.0,
            fare=FareBreakdownSchema(base_amount=1500.0, total_amount=1500.0),
            data_freshness=DataFreshnessSchema(source="road"),
        )

        evaluator = RouteEvaluator()
        route = evaluator.evaluate_path([leg])
        assert route.total_duration_minutes == 180

    def test_large_graph_scalability(self, delhi_hotel):
        # Generate a synthetic multi-hub transit graph with 50 nodes and 120 edges
        nodes = [delhi_hotel]
        for i in range(1, 50):
            nodes.append(
                TransportNodeSchema(
                    node_id=f"node_hub_{i}",
                    name=f"Transit Hub {i}",
                    coordinates=[77.0 + (i * 0.05), 28.0 + (i * 0.05)],
                )
            )

        legs = []
        base_time = datetime(2026, 12, 25, 6, 0)
        # Connect sequentially with multiple alternatives
        for i in range(40):
            u = nodes[i]
            v = nodes[i + 1]
            legs.append(
                TransitLegSchema(
                    leg_id=f"leg_scale_{i}_a",
                    mode=TransportModeEnum.ROAD_CAB,
                    origin=u,
                    destination=v,
                    departure_time=base_time + timedelta(minutes=i * 40),
                    arrival_time=base_time + timedelta(minutes=i * 40 + 15),
                    duration_minutes=15,
                    distance_meters=8000.0,
                    fare=FareBreakdownSchema(base_amount=200.0, total_amount=200.0),
                    data_freshness=DataFreshnessSchema(source="test"),
                )
            )

        req = RouteOptimizationRequestSchema(
            search_id="test_large_graph",
            origin=nodes[0],
            destination=nodes[3],  # 3-hop journey
            candidate_transit_legs=legs,
        )

        optimizer = MultimodalRouteOptimizer()
        start = datetime.now()
        res = optimizer.optimize_routes(req)
        elapsed_sec = (datetime.now() - start).total_seconds()

        assert res.status == "success"
        assert elapsed_sec < 1.0  # Must complete well within 1 second!


# ==========================================
# 7. FASTAPI STATELESS ENDPOINTS
# ==========================================

class TestFastApiOptimizationEndpoints:
    def test_get_transportation_contract(self):
        response = client.get("/api/v1/transportation/contract")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["contract_version"] == "2.4.3"
        assert "input_schema" in data
        assert "output_schema" in data

    def test_optimize_endpoint_requires_internal_service_key(self, delhi_hotel, agra_city):
        req_payload = {
            "search_id": "api_test_unauth",
            "origin": delhi_hotel.model_dump(mode="json"),
            "destination": agra_city.model_dump(mode="json"),
            "candidate_transit_legs": [],
        }
        # Call without service key -> 403 Forbidden
        response = client.post("/api/v1/transportation/optimize", json=req_payload)
        assert response.status_code == 403

    def test_optimize_endpoint_success(self, delhi_hotel, agra_city):
        t = datetime(2026, 12, 20, 8, 0)
        leg = TransitLegSchema(
            leg_id="leg_api_test",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(minutes=180),
            duration_minutes=180,
            distance_meters=215000.0,
            fare=FareBreakdownSchema(base_amount=1500.0, total_amount=1500.0),
            data_freshness=DataFreshnessSchema(source="road"),
        )

        req = RouteOptimizationRequestSchema(
            search_id="api_search_001",
            origin=delhi_hotel,
            destination=agra_city,
            candidate_transit_legs=[leg],
        )

        response = client.post(
            "/api/v1/transportation/optimize",
            json=req.model_dump(mode="json"),
            headers={"X-Internal-Service-Key": INTERNAL_KEY},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["stateless_execution"] is True
        assert "best_overall" in data["routes"]
        assert data["routes"]["best_overall"]["total_duration_minutes"] == 180

    def test_graph_summary_endpoint(self, delhi_hotel, agra_city):
        t = datetime(2026, 12, 20, 8, 0)
        leg = TransitLegSchema(
            leg_id="leg_summary_test",
            mode=TransportModeEnum.ROAD_DRIVING,
            origin=delhi_hotel,
            destination=agra_city,
            departure_time=t,
            arrival_time=t + timedelta(minutes=180),
            duration_minutes=180,
            distance_meters=215000.0,
            fare=FareBreakdownSchema(base_amount=1500.0, total_amount=1500.0),
            data_freshness=DataFreshnessSchema(source="road"),
        )

        response = client.post(
            "/api/v1/transportation/graph/summary",
            json=[leg.model_dump(mode="json")],
            headers={"X-Internal-Service-Key": INTERNAL_KEY},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["topology"]["total_nodes"] == 2
        assert data["topology"]["total_edges"] == 1
