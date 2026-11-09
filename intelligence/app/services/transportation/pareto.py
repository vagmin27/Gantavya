"""
Pareto Dominance Multi-Objective Filter
Gantavya Intelligence Engine - Milestone 2.4

Filters candidate routes to produce the Pareto Optimal Frontier.
Eliminates inferior alternatives that are strictly dominated across all travel criteria.
"""

from typing import List
from app.schemas.transportation import RouteOptionSchema


class ParetoDominanceFilter:
    """
    Evaluates multi-objective tradeoffs and extracts non-dominated routes.
    
    Criteria to Minimize:
    - total_monetary_cost (INR)
    - total_duration_minutes (min)
    - number_of_transfers (count)
    - total_waiting_time_minutes (min)

    Criteria to Maximize:
    - reliability_score (1.0 - 10.0)
    - convenience_score (1.0 - 10.0)
    """

    @staticmethod
    def dominates(route_a: RouteOptionSchema, route_b: RouteOptionSchema) -> bool:
        """
        Returns True if route_a Pareto-dominates route_b.
        route_a dominates route_b if it is no worse in all criteria and strictly better in at least one.
        """
        cost_a, cost_b = route_a.total_monetary_cost.amount, route_b.total_monetary_cost.amount
        dur_a, dur_b = route_a.total_duration_minutes, route_b.total_duration_minutes
        trans_a, trans_b = route_a.number_of_transfers, route_b.number_of_transfers
        wait_a, wait_b = route_a.total_waiting_time_minutes, route_b.total_waiting_time_minutes
        rel_a, rel_b = route_a.reliability_score, route_b.reliability_score
        conv_a, conv_b = route_a.convenience_score, route_b.convenience_score

        # Check: no worse in any objective
        no_worse = (
            cost_a <= cost_b
            and dur_a <= dur_b
            and trans_a <= trans_b
            and wait_a <= wait_b
            and rel_a >= rel_b
            and conv_a >= conv_b
        )

        if not no_worse:
            return False

        # Check: strictly better in at least one objective
        strictly_better = (
            cost_a < cost_b
            or dur_a < dur_b
            or trans_a < trans_b
            or wait_a < wait_b
            or rel_a > rel_b
            or conv_a > conv_b
        )

        return strictly_better

    @classmethod
    def filter_pareto_frontier(cls, routes: List[RouteOptionSchema]) -> List[RouteOptionSchema]:
        """
        Filters candidate routes, returning only the non-dominated Pareto frontier.
        If a single route exists or empty, returns as is.
        """
        if len(routes) <= 1:
            return list(routes)

        pareto_frontier: List[RouteOptionSchema] = []

        for candidate in routes:
            is_dominated = False
            for other in routes:
                if candidate.route_id != other.route_id and cls.dominates(other, candidate):
                    is_dominated = True
                    break

            if not is_dominated:
                pareto_frontier.append(candidate)

        return pareto_frontier

