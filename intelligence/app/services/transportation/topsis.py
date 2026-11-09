"""
TOPSIS Multi-Criteria Decision Analysis Engine
Gantavya Intelligence Engine - Milestone 2.4

Implements Technique for Order of Preference by Similarity to Ideal Solution (TOPSIS)
to rank multimodal routes transparently and select the "Best Overall" recommendation.
"""

from typing import List, Dict, Tuple
import math
from app.schemas.transportation import RouteOptionSchema


class TopsisRanker:
    """
    Transparent TOPSIS multi-criteria decision ranking algorithm.
    Evaluates:
    - Duration (minimize)
    - Monetary Cost (minimize)
    - Transfers Count (minimize)
    - Reliability Score (maximize)
    - Convenience Score (maximize)
    """

    DEFAULT_WEIGHTS = {
        "duration": 0.30,
        "cost": 0.30,
        "transfers": 0.15,
        "reliability": 0.15,
        "convenience": 0.10,
    }

    @classmethod
    def rank_routes(
        cls,
        routes: List[RouteOptionSchema],
        custom_weights: Dict[str, float] = None,
    ) -> List[Tuple[RouteOptionSchema, float]]:
        """
        Calculates TOPSIS closeness coefficients (0.0 to 1.0) and returns
        the routes sorted descending by closeness score.
        """
        if not routes:
            return []

        if len(routes) == 1:
            return [(routes[0], 1.0)]

        weights = dict(cls.DEFAULT_WEIGHTS)
        if custom_weights:
            weights.update(custom_weights)

        # Normalize weights so they sum strictly to 1.0
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}

        # 1. Construct Decision Matrix
        # Columns: [duration, cost, transfers, reliability, convenience]
        matrix = []
        for r in routes:
            matrix.append([
                float(r.total_duration_minutes),
                float(r.total_monetary_cost.amount),
                float(r.number_of_transfers),
                float(r.reliability_score),
                float(r.convenience_score),
            ])

        m = len(matrix)
        n = 5
        keys = ["duration", "cost", "transfers", "reliability", "convenience"]
        is_benefit = [False, False, False, True, True]  # True = maximize, False = minimize

        # 2. Vector Normalization
        # denom_j = sqrt(sum(x_ij^2))
        denominators = []
        for j in range(n):
            sum_sq = sum(matrix[i][j] ** 2 for i in range(m))
            denominators.append(math.sqrt(sum_sq) if sum_sq > 0 else 1.0)

        norm_matrix = []
        for i in range(m):
            row = []
            for j in range(n):
                # Apply weight directly to normalized value
                w = weights[keys[j]]
                val = (matrix[i][j] / denominators[j]) * w
                row.append(val)
            norm_matrix.append(row)

        # 3. Determine Ideal Best (A+) and Ideal Worst (A-)
        ideal_best = []
        ideal_worst = []
        for j in range(n):
            col_vals = [norm_matrix[i][j] for i in range(m)]
            if is_benefit[j]:
                ideal_best.append(max(col_vals))
                ideal_worst.append(min(col_vals))
            else:
                ideal_best.append(min(col_vals))
                ideal_worst.append(max(col_vals))

        # 4. Calculate Euclidean Distances S+ and S-
        scored_routes = []
        for i in range(m):
            dist_best = math.sqrt(sum((norm_matrix[i][j] - ideal_best[j]) ** 2 for j in range(n)))
            dist_worst = math.sqrt(sum((norm_matrix[i][j] - ideal_worst[j]) ** 2 for j in range(n)))

            # Closeness coefficient: C_i = S_i- / (S_i+ + S_i-)
            if (dist_best + dist_worst) == 0:
                closeness = 0.5
            else:
                closeness = dist_worst / (dist_best + dist_worst)

            closeness = round(closeness, 4)
            scored_routes.append((routes[i], closeness))

        # Sort descending by TOPSIS closeness score
        scored_routes.sort(key=lambda item: item[1], reverse=True)
        return scored_routes

