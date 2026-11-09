"""
Transportation Provider Abstraction Contract
Gantavya Intelligence Engine - Milestone 2.4

Abstract base specification for external multimodal transportation adapters.
Stateless execution boundary.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.schemas.transportation import (
    TransportNodeSchema,
    TransitLegSchema,
    TransportModeEnum,
)


class BaseTransportationProviderAdapter(ABC):
    """
    Abstract interface for transportation providers.
    All external transit providers (HERE, Amadeus, GTFS, etc.) must implement
    this contract to produce standardized TransitLegSchema instances.
    """

    def __init__(self, provider_name: str, supported_modes: List[TransportModeEnum]):
        self.provider_name = provider_name
        self.supported_modes = supported_modes

    @abstractmethod
    async def search_legs(
        self,
        origin: TransportNodeSchema,
        destination: TransportNodeSchema,
        departure_time: datetime,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[TransitLegSchema]:
        """
        Queries transit availability between origin and destination.
        Returns normalized list of TransitLegSchema instances.
        """
        pass

    @abstractmethod
    def normalize_response(
        self,
        raw_payload: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> TransitLegSchema:
        """
        Transforms third-party provider JSON response into standard TransitLegSchema.
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Verifies API connectivity, credential authorization, and remaining quotas.
        """
        pass

