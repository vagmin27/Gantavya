import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage, ExplorePage, DestinationDetailPage } from '../src/pages';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthService } from '../src/services/auth.service';
import { TripService } from '../src/services/trip.service';

vi.mock('../src/services/auth.service', () => ({
  AuthService: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

vi.mock('../src/services/trip.service', () => ({
  TripService: {
    listTrips: vi.fn(),
    getDestinations: vi.fn(),
    getPlaces: vi.fn()
  }
}));

describe('Dashboard & Destination Discovery Suite', () => {
  const sampleTrips = [
    {
      _id: 'trip-1',
      title: 'Himalayan Expedition',
      status: 'planning',
      startDate: '2026-12-01T00:00:00.000Z',
      endDate: '2026-12-10T00:00:00.000Z',
      budget: { currency: 'USD', targetAmount: 3200 },
      destinationId: { name: 'Pokhara' },
      participants: [
        { userId: 'usr-1', role: 'owner' },
        { userId: 'usr-2', role: 'editor' }
      ]
    },
    {
      _id: 'trip-2',
      title: 'Heritage Walk',
      status: 'completed',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-05T00:00:00.000Z',
      budget: { currency: 'USD', targetAmount: 800 },
      destinationId: { name: 'Kathmandu' },
      participants: [
        { userId: 'usr-1', role: 'owner' }
      ]
    }
  ];

  const sampleDestinations = [
    {
      _id: 'dest-101',
      name: 'Pokhara Valley',
      country: 'Nepal',
      city: 'Pokhara',
      categories: ['nature', 'adventure'],
      description: 'Gateway to the Annapurna mountain circuit.',
      coordinates: { latitude: 28.2096, longitude: 83.9856 }
    },
    {
      _id: 'dest-102',
      name: 'Kathmandu Cultural Hub',
      country: 'Nepal',
      city: 'Kathmandu',
      categories: ['culture', 'urban'],
      description: 'Historical capital with UNESCO heritage sites.',
      coordinates: { latitude: 27.7172, longitude: 85.324 }
    }
  ];

  const samplePlaces = [
    {
      _id: 'place-1',
      name: 'Phewa Lake & Boating',
      category: 'nature',
      estimatedDurationMinutes: 120,
      estimatedCost: 15,
      description: 'Peaceful lake surrounded by forested hills and peaks.'
    },
    {
      _id: 'place-2',
      name: 'World Peace Pagoda',
      category: 'culture',
      estimatedDurationMinutes: 90,
      estimatedCost: 5,
      description: 'Monolithic Buddhist stupa on Anadu Hill.'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.getMe.mockResolvedValue({
      data: {
        user: { id: 'usr-1', name: 'Aarav Sharma', email: 'aarav@gantavya.io', role: 'user' },
        profile: { homeCity: 'Kathmandu' }
      }
    });
  });

  describe('DashboardPage Component', () => {
    it('computes and renders live travel statistics from user trips', async () => {
      TripService.listTrips.mockResolvedValueOnce({ data: sampleTrips });
      TripService.getDestinations.mockResolvedValueOnce({ data: sampleDestinations });

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <DashboardPage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText(/Welcome back, Aarav Sharma/i)).toBeInTheDocument();
      // Total trips & collaborators numbers
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      // Planned Budget: USD 4,000 (3200 + 800)
      expect(screen.getByText(/USD 4,000/i)).toBeInTheDocument();
      // Upcoming trip title
      expect(screen.getByText('Himalayan Expedition')).toBeInTheDocument();
      expect(screen.getByText('Pokhara')).toBeInTheDocument();
      // Suggested destinations
      expect(screen.getByText('Pokhara Valley')).toBeInTheDocument();
    });

    it('renders clean empty state when user has zero trips', async () => {
      TripService.listTrips.mockResolvedValueOnce({ data: [] });
      TripService.getDestinations.mockResolvedValueOnce({ data: [] });

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <DashboardPage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText('No upcoming journeys scheduled')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Plan a New Trip/i })).toBeInTheDocument();
    });
  });

  describe('ExplorePage Component', () => {
    it('renders destination cards and filters by category', async () => {
      TripService.getDestinations.mockResolvedValueOnce({ data: sampleDestinations });

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ExplorePage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText('Pokhara Valley')).toBeInTheDocument();
      expect(screen.getByText('Kathmandu Cultural Hub')).toBeInTheDocument();

      // Filter by Culture
      const cultureFilter = screen.getByRole('button', { name: /Culture & Heritage/i });
      fireEvent.click(cultureFilter);

      expect(screen.getByText('Kathmandu Cultural Hub')).toBeInTheDocument();
      expect(screen.queryByText('Pokhara Valley')).not.toBeInTheDocument();
    });

    it('filters destinations by search term', async () => {
      TripService.getDestinations.mockResolvedValueOnce({ data: sampleDestinations });

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ExplorePage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText('Pokhara Valley')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/Search by destination name/i);
      fireEvent.change(searchInput, { target: { value: 'Kathmandu' } });

      expect(screen.getByText('Kathmandu Cultural Hub')).toBeInTheDocument();
      expect(screen.queryByText('Pokhara Valley')).not.toBeInTheDocument();
    });
  });

  describe('DestinationDetailPage Component', () => {
    it('renders destination details and its registered places', async () => {
      TripService.getDestinations.mockResolvedValueOnce({ data: sampleDestinations });
      TripService.getPlaces.mockResolvedValueOnce({ data: samplePlaces });

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter
                initialEntries={['/destinations/dest-101']}
                future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
              >
                <Routes>
                  <Route path="/destinations/:id" element={<DestinationDetailPage />} />
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByText('Pokhara Valley')).toBeInTheDocument();
      expect(screen.getByText(/Gateway to the Annapurna mountain circuit/i)).toBeInTheDocument();
      expect(screen.getByText('Phewa Lake & Boating')).toBeInTheDocument();
      expect(screen.getByText('World Peace Pagoda')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Plan Trip Here/i })).toBeInTheDocument();
    });
  });
});
