import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ItineraryTimeline from '../src/components/ItineraryTimeline';
import { TripService } from '../src/services/trip.service';

vi.mock('../src/services/trip.service', () => ({
  TripService: {
    getDayTimeline: vi.fn(),
    integrateTransportation: vi.fn(),
    selectTransitAlternative: vi.fn(),
    lockTransition: vi.fn(),
    recalculateTrip: vi.fn()
  }
}));

describe('ItineraryTimeline Component (Sub-Milestone 2.4.4)', () => {
  const mockTimelineData = {
    itineraryDayId: 'day-101',
    dayNumber: 1,
    travelDistanceKm: 45.2,
    travelDurationMinutes: 75,
    hasConflicts: true,
    conflicts: [
      {
        conflictId: 'conf-1',
        conflictType: 'ARRIVAL_AFTER_ACTIVITY_START',
        message: 'Transit arrives at 10:00, which is after activity begins at 08:30.',
        suggestedAction: 'Reschedule activity or choose an earlier transit option.'
      }
    ],
    timeline: [
      {
        id: 'act-1',
        entityId: 'act-entity-1',
        type: 'activity',
        title: 'Morning Temple Visit',
        startTime: '2026-11-15T08:30:00.000Z',
        endTime: '2026-11-15T09:30:00.000Z',
        durationMinutes: 60,
        estimatedCost: 150,
        isLocked: true,
        location: { name: 'Pashupatinath Temple' }
      },
      {
        id: 'trans-1',
        entityId: 'trans-entity-1',
        type: 'transit',
        title: 'Transit: Temple → Patan Square',
        startTime: '2026-11-15T09:30:00.000Z',
        endTime: '2026-11-15T10:15:00.000Z',
        durationMinutes: 45,
        distanceMeters: 12000,
        selectedCategory: 'best_overall',
        alternativeCategories: ['best_overall', 'cheapest', 'fastest'],
        isLocked: false
      },
      {
        id: 'acc-1',
        entityId: 'acc-entity-1',
        type: 'accommodation',
        title: 'Hotel Check-in: Heritage Home',
        checkInTime: '14:00',
        checkOutTime: '11:00'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders timeline with travel stats and activities', async () => {
    TripService.getDayTimeline.mockResolvedValueOnce({ data: mockTimelineData });

    render(
      <ItineraryTimeline
        dayId="day-101"
        dayNumber={1}
        tripId="trip-1"
        currency="NPR"
        canEdit={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Morning Temple Visit')).toBeInTheDocument();
      expect(screen.getByText('Transit: Temple → Patan Square')).toBeInTheDocument();
      expect(screen.getByText(/45.2 km/i)).toBeInTheDocument();
      expect(screen.getByText(/75 mins/i)).toBeInTheDocument();
      expect(screen.getByText('Fixed')).toBeInTheDocument();
    });
  });

  it('renders conflict warning banner with diagnostics and suggestions', async () => {
    TripService.getDayTimeline.mockResolvedValueOnce({ data: mockTimelineData });

    render(
      <ItineraryTimeline
        dayId="day-101"
        dayNumber={1}
        tripId="trip-1"
        currency="NPR"
        canEdit={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Scheduling Conflict Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/Transit arrives at 10:00/i)).toBeInTheDocument();
      expect(screen.getByText(/Suggestion: Reschedule activity/i)).toBeInTheDocument();
    });
  });

  it('allows switching to an alternative route category', async () => {
    TripService.getDayTimeline.mockResolvedValue({ data: mockTimelineData });
    TripService.selectTransitAlternative.mockResolvedValueOnce({ success: true });

    render(
      <ItineraryTimeline
        dayId="day-101"
        dayNumber={1}
        tripId="trip-1"
        currency="NPR"
        canEdit={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('cheapest')).toBeInTheDocument();
    });

    const cheapestBtn = screen.getByText('cheapest');
    await waitFor(() => {
      fireEvent.click(cheapestBtn);
    });

    await waitFor(() => {
      expect(TripService.selectTransitAlternative).toHaveBeenCalledWith('day-101', {
        transitionId: 'trans-entity-1',
        routeCategory: 'cheapest'
      });
    });
  });

  it('triggers dynamic schedule recalculation when Recalculate button is clicked', async () => {
    TripService.getDayTimeline.mockResolvedValue({ data: mockTimelineData });
    TripService.recalculateTrip.mockResolvedValueOnce({ success: true });

    render(
      <ItineraryTimeline
        dayId="day-101"
        dayNumber={1}
        tripId="trip-1"
        currency="NPR"
        canEdit={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Recalculate')).toBeInTheDocument();
    });

    const recalcBtn = screen.getByText('Recalculate');
    await waitFor(() => {
      fireEvent.click(recalcBtn);
    });

    await waitFor(() => {
      expect(TripService.recalculateTrip).toHaveBeenCalledWith('trip-1', 1);
    });
  });
});
