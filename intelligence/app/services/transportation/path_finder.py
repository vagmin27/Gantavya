"""
Candidate Route Path Finder Engine
Gantavya Intelligence Engine - Milestone 2.4

Generates valid multimodal journey paths through the NetworkX transit graph.
Enforces temporal causality, transfer buffer feasibility, cycle elimination,
and branch-and-bound search bounds.
"""

from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from app.schemas.transportation import (
    TransportModeEnum,
    TransitLegSchema,
    TravellerConstraintsSchema,
    TransportationPreferencesSchema,
    DepartureWindowSchema,
)
from app.services.transportation.graph_engine import MultimodalTransitGraph
from app.services.transportation.transfer_buffer import TransferBufferCalculator


class CandidateRoutePathFinder:
    """
    Finds temporally causally valid candidate paths across single-mode and multi-modal
    connections between origin and destination nodes.
    """

    def __init__(self, transit_graph: MultimodalTransitGraph):
        self.graph = transit_graph

    def find_candidate_paths(
        self,
        origin_node_id: str,
        dest_node_id: str,
        departure_window: Optional[DepartureWindowSchema] = None,
        constraints: Optional[TravellerConstraintsSchema] = None,
        preferences: Optional[TransportationPreferencesSchema] = None,
        max_candidates: int = 50,
    ) -> List[List[TransitLegSchema]]:
        """
        Explores valid paths connecting origin_node_id to dest_node_id.
        Applies branch-and-bound pruning to prevent combinatorial explosion.
        """
        if origin_node_id == dest_node_id:
            return []

        if not self.graph.graph.has_node(origin_node_id) or not self.graph.graph.has_node(dest_node_id):
            return []

        allowed_modes = set(preferences.allowed_modes) if preferences and preferences.allowed_modes else None
        max_transfers = constraints.max_transfers if constraints else 3
        max_duration_mins = constraints.max_duration_minutes if constraints and constraints.max_duration_minutes > 0 else 0
        max_budget = constraints.max_budget if constraints and constraints.max_budget > 0 else 0.0

        earliest_dep = departure_window.earliest if departure_window else (constraints.earliest_departure if constraints else None)
        latest_dep = departure_window.latest if departure_window else None
        latest_arr = constraints.latest_arrival if constraints else None

        completed_paths: List[List[TransitLegSchema]] = []

        def search(
            current_node: str,
            current_path: List[Dict[str, Any]],
            visited_nodes: Set[str],
            current_arrival_time: Optional[datetime],
            current_cost: float,
        ):
            # Terminate branch if max candidates reached
            if len(completed_paths) >= max_candidates:
                return

            # Check if destination reached
            if current_node == dest_node_id and len(current_path) > 0:
                completed_paths.append([edge["leg"] for edge in current_path])
                return

            # Prune if transfer count would exceed max_transfers
            transfers_so_far = max(0, len(current_path) - 1)
            if transfers_so_far >= max_transfers and current_node != dest_node_id:
                return

            outgoing_edges = self.graph.get_outgoing_edges(current_node)

            # Sort edges by departure time to prioritize natural chronological connections
            outgoing_edges.sort(key=lambda e: e["departure_time"])

            for edge in outgoing_edges:
                target_node = edge["target"]

                # 1. Prevent cycles: do not revisit any node in current path
                if target_node in visited_nodes:
                    continue

                edge_mode = edge["mode"]
                # 2. Check allowed modes constraint
                if allowed_modes and edge_mode not in allowed_modes:
                    continue

                edge_dep = edge["departure_time"]
                edge_arr = edge["arrival_time"]

                # 3. Check departure window constraints on first leg
                if len(current_path) == 0:
                    if earliest_dep and edge_dep < earliest_dep:
                        continue
                    if latest_dep and edge_dep > latest_dep:
                        continue
                else:
                    # 4. Enforce Temporal Causality & Minimum Transfer Buffer
                    prev_edge = current_path[-1]
                    prev_mode = prev_edge["mode"]
                    prev_arr = prev_edge["arrival_time"]
                    transfer_info = edge["leg"].transfer_info

                    if not TransferBufferCalculator.is_temporally_valid(
                        prev_arr, edge_dep, prev_mode, edge_mode, transfer_info
                    ):
                        continue

                # 5. Check arrival deadline constraint
                if latest_arr and edge_arr > latest_arr:
                    continue

                # 6. Check budget constraint bound
                new_cost = current_cost + edge["cost_inr"]
                if max_budget > 0 and new_cost > max_budget:
                    continue

                # 7. Check max journey duration bound
                first_dep = current_path[0]["departure_time"] if current_path else edge_dep
                journey_mins = (edge_arr - first_dep).total_seconds() / 60.0
                if max_duration_mins > 0 and journey_mins > max_duration_mins:
                    continue

                # Advance recursive branch
                visited_nodes.add(target_node)
                current_path.append(edge)

                search(target_node, current_path, visited_nodes, edge_arr, new_cost)

                # Backtrack
                current_path.pop()
                visited_nodes.remove(target_node)

        # Initialize search from origin
        initial_visited = {origin_node_id}
        search(origin_node_id, [], initial_visited, None, 0.0)

        return completed_paths

