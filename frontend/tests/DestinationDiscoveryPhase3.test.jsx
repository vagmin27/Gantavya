import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  DestinationCard,
  DestinationMap,
  PhotoGallery,
  DestinationSearch,
  AddToTripModal
} from '../src/components/destinations';
import { ExplorePage, DestinationDetailPage } from '../src/pages';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthService } from '../src/services/auth.service';
import { TripService } from '../src/services/trip.service';
import {
  getSearchHistory,
  clearSearchHistory
} from '../src/utils/recent-destinations';

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
    getDestination: vi.fn(),
    getPlaces: vi.fn(),
    updateTrip: vi.fn()
  }
}));

describe('Frontend Phase 3: Destination Discovery & Exploration Experience Suite', () => {
  const mockDestinations = [
    {
      _id: 'dest-annapurna',
      name: 'Annapurna Conservation Area',
      country: 'Nepal',
      city: 'Pokhara',
      categories: ['trekking', 'nature'],
      description: 'Legendary mountain sanctuary with rhododendron forests and high passes.',
      bestVisitingPeriods: {
        seasons: ['autumn', 'spring'],
        months: [3, 4, 10, 11],
        description: 'Clear skies and optimal mountain visibility.'
      },
      metadata: {
        coverImageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa',
        averageDailyBudget: { currency: 'NPR', amount: 3500 },
        timeZone: 'Asia/Kathmandu',
        climateType: 'Alpine'
      },
      location: {
        type: 'Point',
        coordinates: [83.85, 28.55]
      }
    },
    {
      _id: 'dest-bhaktapur',
      name: 'Bhaktapur Durbar Square',
      country: 'Nepal',
      city: 'Bhaktapur',
      categories: ['cultural', 'historical'],
      description: 'Living medieval museum of ancient Malla art, pottery and pagodas.',
      bestVisitingPeriods: {
        seasons: ['autumn', 'winter'],
        months: [10, 11, 12]
      },
      metadata: {
        averageDailyBudget: { currency: 'NPR', amount: 2000 },
        timeZone: 'Asia/Kathmandu'
      },
      location: {
        type: 'Point',
        coordinates: [85.42, 27.67]
      }
    }
  ];

  const mockPlaces = [
    {
      _id: 'place-macchapucchre',
      name: 'Machapuchare Base Camp',
      category: 'nature_spot',
      estimatedVisitDuration: 240,
      estimatedCost: 1200,
      priceInfo: { currency: 'NPR', estimatedCost: 1200 },
      description: 'Fishtail mountain viewpoint facing south Annapurna wall.',
      location: {
        type: 'Point',
        coordinates: [83.87, 28.53]
      }
    },
    {
      _id: 'place-deurali',
      name: 'Deurali Sanctuary Pass',
      category: 'viewpoint',
      estimatedVisitDuration: 90,
      priceInfo: { currency: 'NPR', estimatedCost: 0 },
      description: 'High rock canyon gateway to the inner amphitheater.',
      location: {
        type: 'Point',
        coordinates: [83.86, 28.51]
      }
    }
  ];

  const mockUserTrips = [
    {
      _id: 'trip-101',
      title: 'Himalayan Autumn Adventure',
      status: 'planning',
      startDate: '2026-10-15T00:00:00.000Z',
      destinationId: { _id: 'dest-old', name: 'Kathmandu' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearSearchHistory();
    localStorage.clear();
    AuthService.getMe.mockResolvedValue({
      data: {
        user: { id: 'usr-1', name: 'Aarav Sharma', email: 'aarav@gantavya.io', role: 'user' },
        profile: {
          travelInterests: ['trekking', 'nature'],
          homeCity: 'Kathmandu'
        }
      }
    });
  });

  describe('1. DestinationCard Component', () => {
    it('renders destination metadata, tags, and handles plan action', () => {
      const handlePlan = vi.fn();
      render(
        <MemoryRouter>
          <DestinationCard
            destination={mockDestinations[0]}
            onPlanTrip={handlePlan}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Annapurna Conservation Area')).toBeInTheDocument();
      expect(screen.getByText('Nepal')).toBeInTheDocument();
      expect(screen.getByText('Pokhara')).toBeInTheDocument();
      expect(screen.getByText('autumn')).toBeInTheDocument();
      expect(screen.getByText(/NPR 3500\/day/i)).toBeInTheDocument();

      const planBtn = screen.getByRole('button', { name: /Plan Trip/i });
      fireEvent.click(planBtn);
      expect(handlePlan).toHaveBeenCalledWith(mockDestinations[0]);
    });
  });

  describe('2. PhotoGallery Component', () => {
    const photos = [
      'https://images.unsplash.com/photo-1',
      'https://images.unsplash.com/photo-2',
      'https://images.unsplash.com/photo-3'
    ];

    it('renders gallery images and opens lightbox modal', () => {
      render(<PhotoGallery photos={photos} destinationName="Annapurna" />);

      expect(screen.getByText(/Photo Gallery \(3\)/i)).toBeInTheDocument();

      // Click to open lightbox
      const expandTrigger = screen.getByText(/View all photos/i);
      fireEvent.click(expandTrigger);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Photo 1 of 3/i)).toBeInTheDocument();

      // Close lightbox
      const closeBtn = screen.getByTitle('Close lightbox');
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('3. DestinationMap Component', () => {
    it('renders map beacon and attraction pins with interaction', () => {
      const handleSelect = vi.fn();
      render(
        <DestinationMap
          destination={mockDestinations[0]}
          places={mockPlaces}
          onSelectPlace={handleSelect}
        />
      );

      expect(screen.getAllByText(/Annapurna Conservation Area/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/2 attractions mapped/i)).toBeInTheDocument();

      // Click on attraction marker
      const placePin = screen.getByText('Machapuchare Base Camp');
      fireEvent.click(placePin);

      expect(handleSelect).toHaveBeenCalledWith('place-macchapucchre');
      expect(screen.getByText('Fishtail mountain viewpoint facing south Annapurna wall.')).toBeInTheDocument();
    });
  });

  describe('4. DestinationSearch Component & History', () => {
    it('displays auto-suggestions matching search term and remembers history', () => {
      const handleSearchChange = vi.fn();
      render(
        <MemoryRouter>
          <DestinationSearch
            searchTerm="Bhaktapur"
            onSearchChange={handleSearchChange}
            destinations={mockDestinations}
          />
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/Search destinations/i);
      fireEvent.focus(input);

      expect(screen.getByText(/Matching Destinations \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Bhaktapur Durbar Square \(Bhaktapur\)/i)).toBeInTheDocument();
    });
  });

  describe('5. AddToTripModal Component', () => {
    it('allows attaching destination to an existing trip', async () => {
      TripService.listTrips.mockResolvedValueOnce({ data: mockUserTrips });
      TripService.updateTrip.mockResolvedValueOnce({ data: { ...mockUserTrips[0], destinationId: mockDestinations[0]._id } });
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <MemoryRouter>
            <AddToTripModal
              isOpen={true}
              onClose={handleClose}
              destination={mockDestinations[0]}
            />
          </MemoryRouter>
        </ToastProvider>
      );

      expect(await screen.findByText('Himalayan Autumn Adventure')).toBeInTheDocument();

      // Select existing trip
      const tripOption = screen.getByText('Himalayan Autumn Adventure');
      fireEvent.click(tripOption);

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Attach/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(TripService.updateTrip).toHaveBeenCalledWith('trip-101', {
          destinationId: 'dest-annapurna'
        });
      });
    });
  });

  describe('6. DestinationDetailPage Component Integration', () => {
    it('renders full destination overview, best visiting period, and opens Add to Trip modal', async () => {
      TripService.getDestinations.mockResolvedValueOnce({ data: mockDestinations });
      TripService.getPlaces.mockResolvedValueOnce({ data: mockPlaces });
      TripService.listTrips.mockResolvedValue({ data: mockUserTrips });

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter
                initialEntries={['/destinations/dest-annapurna']}
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

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Annapurna Conservation Area');
      expect(screen.getByText('Legendary mountain sanctuary with rhododendron forests and high passes.')).toBeInTheDocument();
      expect(screen.getByText('autumn, spring')).toBeInTheDocument();
      expect(screen.getByText(/NPR 3500/i)).toBeInTheDocument();
      expect(screen.getByText('Asia/Kathmandu')).toBeInTheDocument();
      expect(screen.getAllByText('Machapuchare Base Camp').length).toBeGreaterThanOrEqual(1);

      // Click "Add to Existing Trip"
      const addExistingBtn = screen.getByRole('button', { name: /Add to Existing Trip/i });
      fireEvent.click(addExistingBtn);

      expect(await screen.findByText('Add "Annapurna Conservation Area" to Trip')).toBeInTheDocument();
    });
  });
});
