"""
NetworkX Multimodal Transit Graph Engine
Gantavya Intelligence Engine - Milestone 2.4

Constructs a time-dependent, multi-modal directed multigraph representation
of transportation nodes (airports, railway stations, bus terminals, road points)
and transit legs across all modes (road, rail, air, bus, walking).
"""

from typing import List, Dict, Any, Optional
import networkx as nx
from app.schemas.transportation import (
    TransportNodeSchema,
    TransitLegSchema,
    TransportModeEnum,
)
from app.services.transportation.currency import default_currency_converter


class MultimodalTransitGraph:
    """
    Time-dependent Multimodal Directed Multigraph built on NetworkX MultiDiGraph.
    Allows multiple parallel transit legs between the same physical nodes (e.g.
    different departure times, different airlines, road alternatives).
    """

    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.currency_converter = default_currency_converter

    def add_node(self, node: TransportNodeSchema) -> str:
        """
        Adds a transportation node to the graph if not already present.
        Returns canonical node_id.
        """
        node_id = node.node_id
        if not self.graph.has_node(node_id):
            if hasattr(node.coordinates, "longitude"):
                coords = [node.coordinates.longitude, node.coordinates.latitude]
            else:
                coords = node.coordinates
            self.graph.add_node(
                node_id,
                name=node.name,
                node_type=node.node_type.value if hasattr(node.node_type, "value") else str(node.node_type),
                code=node.code,
                coordinates=coords,
                city=node.city,
            )
        return node_id

    def add_transit_leg(self, leg: TransitLegSchema) -> str:
        """
        Adds a TransitLeg as a directed edge between origin and destination nodes.
        Normalizes currency into base INR and attaches temporal and cost attributes.
        """
        u = self.add_node(leg.origin)
        v = self.add_node(leg.destination)

        # Normalize leg fare to base INR
        cost_inr = self.currency_converter.convert_to_base(
            leg.fare.total_amount, leg.fare.currency
        )

        edge_key = leg.leg_id

        self.graph.add_edge(
            u,
            v,
            key=edge_key,
            leg=leg,
            leg_id=leg.leg_id,
            mode=leg.mode,
            departure_time=leg.departure_time,
            arrival_time=leg.arrival_time,
            duration_minutes=leg.duration_minutes,
            distance_meters=leg.distance_meters,
            cost_inr=cost_inr,
            confidence_score=leg.data_freshness.confidence_score,
            is_estimated=leg.fare.is_estimated,
            availability_status=leg.availability_status,
        )

        return edge_key

    def build_from_legs(self, legs: List[TransitLegSchema]) -> None:
        """
        Populates the multimodal transit graph from a batch of TransitLeg items.
        """
        for leg in legs:
            self.add_transit_leg(leg)

    @property
    def node_count(self) -> int:
        return self.graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self.graph.number_of_edges()

    def get_outgoing_edges(self, node_id: str) -> List[Dict[str, Any]]:
        """
        Returns all outgoing transit leg edges from node_id with their data attributes.
        """
        if not self.graph.has_node(node_id):
            return []

        outgoing = []
        for _, v, key, data in self.graph.out_edges(node_id, keys=True, data=True):
            outgoing.append({"target": v, "key": key, **data})
        return outgoing

    def get_summary(self) -> Dict[str, Any]:
        """
        Returns topological metadata and mode distribution of the transit graph.
        """
        mode_counts = {}
        for _, _, _, data in self.graph.edges(keys=True, data=True):
            m = data["mode"].value if hasattr(data["mode"], "value") else str(data["mode"])
            mode_counts[m] = mode_counts.get(m, 0) + 1

        return {
            "total_nodes": self.node_count,
            "total_edges": self.edge_count,
            "mode_distribution": mode_counts,
            "is_weakly_connected": nx.is_weakly_connected(self.graph) if self.node_count > 0 else False,
        }
