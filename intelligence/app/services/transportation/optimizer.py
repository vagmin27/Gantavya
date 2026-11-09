"""
Multimodal Route Optimization Engine
Gantavya Intelligence Engine - Milestone 2.4

Stateless graph construction, candidate path generation, hard-constraint filtering,
Pareto dominance pruning, and TOPSIS multi-criteria recommendation across 5 categories.
"""

import time
from typing import Dict, List, Optional
from datetime import datetime

from app.schemas.transportation import (
    RouteOptimizationRequestSchema,
    RouteOptimizationResponseSchema,
    RouteOptionSchema,
    RouteCategoryEnum,
    TransitLegSchema,
)
from app.services.transportation.graph_engine import MultimodalTransitGraph
from app.services.transportation.path_finder import CandidateRoutePathFinder
from app.services.transportation.evaluator import RouteEvaluator
from app.services.transportation.pareto import ParetoDominanceFilter
from app.services.transportation.topsis import TopsisRanker


class MultimodalRouteOptimizer:
    """
    Stateless high-performance Multimodal Route Optimizer.
    """

    def __init__(self):
        self.evaluator = RouteEvaluator()

    def optimize_routes(self, request: RouteOptimizationRequestSchema) -> RouteOptimizationResponseSchema:
        start_time = time.perf_counter()

        origin = request.origin
        destination = request.destination
        constraints = request.traveller_constraints
        preferences = request.preferences
        legs = request.candidate_transit_legs or []

        # 1. Build NetworkX Multimodal Graph
        graph = MultimodalTransitGraph()
        graph.build_from_legs(legs)

        # 2. Find Candidate Paths
        path_finder = CandidateRoutePathFinder(graph)
        raw_paths = path_finder.find_candidate_paths(
            origin_node_id=origin.node_id,
            dest_node_id=destination.node_id,
            departure_window=request.departure_window,
            constraints=constraints,
            preferences=preferences,
            max_candidates=50,
        )

        # 3. Evaluate each path into a fully scored RouteOptionSchema
        evaluated_candidates: List[RouteOptionSchema] = []
        for path in raw_paths:
            try:
                route_opt = self.evaluator.evaluate_path(
                    legs=path,
                    search_id=request.search_id,
                    trip_id=request.trip_id,
                    constraints=constraints,
                    preferences=preferences,
                )
                evaluated_candidates.append(route_opt)
            except Exception:
                continue

        # 4. Filter by Hard Constraints
        valid_candidates = self._apply_hard_constraints(evaluated_candidates, constraints, preferences)
        total_evaluated = len(valid_candidates)

        if total_evaluated == 0:
            exec_time = (time.perf_counter() - start_time) * 1000
            return RouteOptimizationResponseSchema(
                search_id=request.search_id,
                status="no_routes_found",
                execution_time_ms=round(exec_time, 2),
                stateless_execution=True,
                total_candidates_evaluated=len(evaluated_candidates),
                pareto_optimal_count=0,
                routes={},
            )

        # 5. Extract Pareto Optimal Frontier
        pareto_frontier = ParetoDominanceFilter.filter_pareto_frontier(valid_candidates)
        pareto_count = len(pareto_frontier)

        # 6. Rank via TOPSIS
        # Provide Pareto frontier to TOPSIS for selecting Best Overall
        topsis_ranked = TopsisRanker.rank_routes(pareto_frontier if pareto_frontier else valid_candidates)

        # 7. Select 5 distinct category recommendations
        recommended_categories = self._select_category_recommendations(
            valid_candidates=valid_candidates,
            pareto_frontier=pareto_frontier,
            topsis_ranked=topsis_ranked,
        )

        exec_time = (time.perf_counter() - start_time) * 1000

        return RouteOptimizationResponseSchema(
            search_id=request.search_id,
            status="success",
            execution_time_ms=round(exec_time, 2),
            stateless_execution=True,
            total_candidates_evaluated=total_evaluated,
            pareto_optimal_count=pareto_count,
            routes=recommended_categories,
        )

    def _apply_hard_constraints(
        self,
        candidates: List[RouteOptionSchema],
        constraints,
        preferences,
    ) -> List[RouteOptionSchema]:
        """
        Enforces strict hard constraints, eliminating any route that violates user bounds.
        """
        filtered = []

        max_budget = constraints.max_budget if constraints and constraints.max_budget > 0 else 0.0
        max_duration = constraints.max_duration_minutes if constraints and constraints.max_duration_minutes > 0 else 0
        max_transfers = constraints.max_transfers if constraints else 3
        avoid_overnight = constraints.avoid_overnight if constraints else False
        earliest_dep = constraints.earliest_departure if constraints else None
        latest_arr = constraints.latest_arrival if constraints else None

        for route in candidates:
            # 1. Budget constraint
            if max_budget > 0 and route.total_monetary_cost.amount > max_budget:
                continue

            # 2. Maximum duration constraint
            if max_duration > 0 and route.total_duration_minutes > max_duration:
                continue

            # 3. Maximum transfers constraint
            if route.number_of_transfers > max_transfers:
                continue

            # 4. Overnight travel avoidance
            if avoid_overnight and route.metadata.get("has_overnight", False):
                continue

            # 5. Earliest departure & latest arrival
            if earliest_dep and route.departure_time < earliest_dep:
                continue
            if latest_arr and route.arrival_time > latest_arr:
                continue

            filtered.append(route)

        return filtered

    def _select_category_recommendations(
        self,
        valid_candidates: List[RouteOptionSchema],
        pareto_frontier: List[RouteOptionSchema],
        topsis_ranked,
    ) -> Dict[str, Optional[RouteOptionSchema]]:
        """
        Identifies and tags the top route for each of the 5 standard categories:
        1. cheapest
        2. fastest
        3. fewest_transfers
        4. most_convenient
        5. best_overall
        """
        pool = valid_candidates
        routes_map: Dict[str, Optional[RouteOptionSchema]] = {}

        # 1. Cheapest
        cheapest_route = min(pool, key=lambda r: (r.total_monetary_cost.amount, r.total_duration_minutes))
        cheapest_copy = cheapest_route.model_copy(deep=True)
        cheapest_copy.ranking_category = RouteCategoryEnum.CHEAPEST
        cheapest_copy.recommendation_reason = (
            f"Lowest total cost: ₹{cheapest_copy.total_monetary_cost.amount:,.2f}. Ideal for budget optimization."
        )
        routes_map["cheapest"] = cheapest_copy

        # 2. Fastest
        fastest_route = min(pool, key=lambda r: (r.total_duration_minutes, r.total_monetary_cost.amount))
        fastest_copy = fastest_route.model_copy(deep=True)
        fastest_copy.ranking_category = RouteCategoryEnum.FASTEST
        h = fastest_copy.total_duration_minutes // 60
        m = fastest_copy.total_duration_minutes % 60
        fastest_copy.recommendation_reason = (
            f"Fastest travel time: {h}h {m}m total journey duration. Optimal for time-sensitive travel."
        )
        routes_map["fastest"] = fastest_copy

        # 3. Fewest Transfers
        fewest_transfers_route = min(pool, key=lambda r: (r.number_of_transfers, r.total_duration_minutes))
        fewest_copy = fewest_transfers_route.model_copy(deep=True)
        fewest_copy.ranking_category = RouteCategoryEnum.FEWEST_TRANSFERS
        transfer_desc = "Direct connection (0 transfers)" if fewest_copy.number_of_transfers == 0 else f"{fewest_copy.number_of_transfers} transfer(s)"
        fewest_copy.recommendation_reason = (
            f"Minimal transit switching: {transfer_desc}. Minimizes intermediate station changes and luggage handling."
        )
        routes_map["fewest_transfers"] = fewest_copy

        # 4. Most Convenient
        most_convenient_route = max(pool, key=lambda r: (r.convenience_score, -r.number_of_transfers))
        convenient_copy = most_convenient_route.model_copy(deep=True)
        convenient_copy.ranking_category = RouteCategoryEnum.MOST_CONVENIENT
        convenient_copy.recommendation_reason = (
            f"Highest convenience rating ({convenient_copy.convenience_score}/10). Optimal transfer buffers and comfortable scheduling."
        )
        routes_map["most_convenient"] = convenient_copy

        # 5. Best Overall (TOPSIS Top Ranker)
        if topsis_ranked and len(topsis_ranked) > 0:
            best_overall_route, topsis_score = topsis_ranked[0]
            best_copy = best_overall_route.model_copy(deep=True)
            best_copy.ranking_category = RouteCategoryEnum.BEST_OVERALL
            best_copy.metadata["topsis_score"] = topsis_score
            best_copy.recommendation_reason = (
                f"TOPSIS Closeness Score: {topsis_score:.4f}. Mathematically optimal compromise balancing duration, cost, transfers, reliability, and convenience."
            )
            routes_map["best_overall"] = best_copy
        else:
            routes_map["best_overall"] = routes_map["cheapest"]

        return routes_map

