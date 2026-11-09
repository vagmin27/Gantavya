import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TripsDashboard from '../src/components/TripsDashboard';
import { TripService } from '../src/services/trip.service';
import { AuthProvider } from '../src/context/AuthContext';

vi.mock('../src/services/trip.service', () => ({
  TripService: {
    listTrips: vi.fn(),
    getTrip: vi.fn(),
    createTrip: vi.fn(),
    deleteTrip: vi.fn(),
    getDestinations: vi.fn().mockResolvedValue({ data: [] }),
    getItineraryDays: vi.fn().mockResolvedValue({ data: [] }),
    getActivities: vi.fn().mockResolvedValue({ data: [] }),
    inviteParticipant: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn()
  }
}));

vi.mock('../src/services/auth.service', () => ({
  AuthService: {
    getMe: vi.fn().mockResolvedValue({
      data: {
        user: { id: 'usr-123', name: 'Explorer One', email: 'explorer@example.com', role: 'user' },
        profile: { homeCity: 'Kathmandu' }
      }
    }),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

describe('TripsDashboard & Collaboration UI', () => {
  const sampleTrips = [
    {
      _id: 'trip-101',
      title: 'Annapurna Circuit Trek',
      status: 'planning',
      visibility: 'shared',
      destinationId: { name: 'Annapurna Valley' },
      startDate: '2026-11-15T00:00:00.000Z',
      endDate: '2026-11-22T00:00:00.000Z',
      budget: { currency: 'USD', targetAmount: 2500 },
      participants: [
        { userId: { _id: 'usr-123', name: 'Explorer One', email: 'explorer@example.com' }, role: 'owner' },
        { userId: { _id: 'usr-456', name: 'Partner', email: 'partner@example.com' }, role: 'editor' }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trips dashboard with action buttons', async () => {
    TripService.listTrips.mockResolvedValueOnce({ data: sampleTrips });

    render(
      <AuthProvider>
        <TripsDashboard />
      </AuthProvider>
    );

    expect(await screen.findByText('Your Collaborative Trips')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Trip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept Invite/i })).toBeInTheDocument();
  });

  it('displays user trips retrieved from backend', async () => {
    TripService.listTrips.mockResolvedValueOnce({ data: sampleTrips });

    render(
      <AuthProvider>
        <TripsDashboard />
      </AuthProvider>
    );

    expect(await screen.findByText('Annapurna Circuit Trek')).toBeInTheDocument();
    expect(screen.getByText('Annapurna Valley')).toBeInTheDocument();
    expect(screen.getByText(/2 members/i)).toBeInTheDocument();
    expect(screen.getByText(/USD 2,500/i)).toBeInTheDocument();
  });

  it('opens and closes New Trip modal', async () => {
    TripService.listTrips.mockResolvedValueOnce({ data: [] });

    render(
      <AuthProvider>
        <TripsDashboard />
      </AuthProvider>
    );

    const newTripBtn = await screen.findByRole('button', { name: /New Trip/i });
    fireEvent.click(newTripBtn);

    expect(await screen.findByText('Create New Trip')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Pokhara Annapurna Trek/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create New Trip')).not.toBeInTheDocument();
    });
  });

  it('opens and closes Accept Invite modal', async () => {
    TripService.listTrips.mockResolvedValueOnce({ data: [] });

    render(
      <AuthProvider>
        <TripsDashboard />
      </AuthProvider>
    );

    const inviteBtn = await screen.findByRole('button', { name: /Accept Invite/i });
    fireEvent.click(inviteBtn);

    expect(await screen.findByText('Trip Invitation')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste invitation token here/i)).toBeInTheDocument();
  });
});

