"""
Transfer Buffer & Temporal Causality Engine
Gantavya Intelligence Engine - Milestone 2.4

Calculates minimum required transfer buffers between multimodal transportation legs.
Eliminates impossible connections and prevents temporal causality violations.
"""

from typing import Optional
from datetime import datetime, timedelta
from app.schemas.transportation import (
    TransportModeEnum,
    TransferSchema,
    TransferTypeEnum,
)


# Default minimum transfer buffer matrices (in minutes) based on mode transitions
MODE_TRANSITION_BUFFERS_MINUTES = {
    # (from_mode, to_mode) -> minimum minutes
    (TransportModeEnum.AIR, TransportModeEnum.AIR): 45,          # Domestic air connection
    (TransportModeEnum.AIR, TransportModeEnum.ROAD_CAB): 30,     # Deplaning, baggage claim, taxi stand
    (TransportModeEnum.AIR, TransportModeEnum.ROAD_DRIVING): 35, # Deplaning + parking lot shuttle
    (TransportModeEnum.AIR, TransportModeEnum.RAIL): 45,         # Airport to rail station navigation
    (TransportModeEnum.AIR, TransportModeEnum.BUS): 35,          # Airport to bus bay
    (TransportModeEnum.RAIL, TransportModeEnum.RAIL): 20,        # Platform change at rail station
    (TransportModeEnum.RAIL, TransportModeEnum.ROAD_CAB): 15,    # Exit station to taxi stand
    (TransportModeEnum.RAIL, TransportModeEnum.ROAD_DRIVING): 15,# Exit station to parking
    (TransportModeEnum.RAIL, TransportModeEnum.AIR): 120,        # Rail to airport check-in & security
    (TransportModeEnum.RAIL, TransportModeEnum.BUS): 20,         # Station to bus stop
    (TransportModeEnum.ROAD_CAB, TransportModeEnum.AIR): 120,    # Airport arrival check-in buffer
    (TransportModeEnum.ROAD_CAB, TransportModeEnum.RAIL): 45,    # Station arrival & platform buffer
    (TransportModeEnum.ROAD_CAB, TransportModeEnum.ROAD_CAB): 15,# Taxi interchange
    (TransportModeEnum.ROAD_DRIVING, TransportModeEnum.AIR): 120,
    (TransportModeEnum.ROAD_DRIVING, TransportModeEnum.RAIL): 45,
    (TransportModeEnum.BUS, TransportModeEnum.BUS): 20,          # Bus terminal transfer
    (TransportModeEnum.BUS, TransportModeEnum.RAIL): 30,
    (TransportModeEnum.BUS, TransportModeEnum.AIR): 120,
    (TransportModeEnum.WALKING, TransportModeEnum.ROAD_CAB): 5,
    (TransportModeEnum.WALKING, TransportModeEnum.RAIL): 15,
    (TransportModeEnum.WALKING, TransportModeEnum.AIR): 90,
}


class TransferBufferCalculator:
    """
    Computes realistic buffer durations between successive transit legs
    and validates temporal feasibility.
    """

    @staticmethod
    def get_minimum_buffer_minutes(
        from_mode: TransportModeEnum,
        to_mode: TransportModeEnum,
        transfer_info: Optional[TransferSchema] = None,
    ) -> int:
        """
        Determines the minimum required transfer buffer duration in minutes.
        """
        # Base buffer from mode transition matrix
        base_buffer = MODE_TRANSITION_BUFFERS_MINUTES.get((from_mode, to_mode), 25)

        # Apply specific transfer details if present
        if transfer_info:
            # If explicit buffer duration is defined on the leg, respect it
            if transfer_info.buffer_duration_minutes > 0:
                base_buffer = max(base_buffer, transfer_info.buffer_duration_minutes)

            # Extra buffer for cross-terminal transfers
            if transfer_info.transfer_type == TransferTypeEnum.CROSS_TERMINAL:
                base_buffer = max(base_buffer, 75)
            elif transfer_info.transfer_type == TransferTypeEnum.CROSS_CITY:
                base_buffer = max(base_buffer, 90)

            # Extra security clearance buffer
            if transfer_info.requires_security_clearance:
                base_buffer = max(base_buffer, 60)

            # Baggage reclaim buffer
            if transfer_info.requires_baggage_reclaim:
                base_buffer += 20

        return base_buffer

    @staticmethod
    def is_temporally_valid(
        arrival_time: datetime,
        departure_time: datetime,
        from_mode: TransportModeEnum,
        to_mode: TransportModeEnum,
        transfer_info: Optional[TransferSchema] = None,
    ) -> bool:
        """
        Validates whether departure_time is causally and temporally valid
        after arrival_time, taking into account the required transfer buffer.
        """
        # Departure can never precede or coincide with arrival
        if departure_time <= arrival_time:
            return False

        min_buffer_mins = TransferBufferCalculator.get_minimum_buffer_minutes(
            from_mode, to_mode, transfer_info
        )

        earliest_possible_departure = arrival_time + timedelta(minutes=min_buffer_mins)
        return departure_time >= earliest_possible_departure

