import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '../src/routes/AppRoutes';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthService } from '../src/services/auth.service';
import { TripService } from '../src/services/trip.service';

vi.mock('../src/services/api', () => ({
  checkBackendHealth: vi.fn().mockResolvedValue({
    data: { service: 'gantavya-backend', status: 'ok' }
  }),
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      response: { use: vi.fn() }
    }
  }
}));

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
    listTrips: vi.fn().mockResolvedValue({ data: [] }),
    getDestinations: vi.fn().mockResolvedValue({ data: [] }),
    getPlaces: vi.fn().mockResolvedValue({ data: [] }),
    getTrip: vi.fn(),
    getItineraryDays: vi.fn().mockResolvedValue({ data: [] }),
    getActivities: vi.fn().mockResolvedValue({ data: [] })
  }
}));

function renderWithProviders(initialRoute = '/', authenticated = false) {
  if (authenticated) {
    AuthService.getMe.mockResolvedValue({
      data: {
        user: { id: 'usr-1', name: 'Dev Tester', email: 'dev@gantavya.io', role: 'editor' },
        profile: { homeCity: 'Kathmandu' }
      }
    });
  } else {
    AuthService.getMe.mockRejectedValue(new Error('Unauthenticated'));
  }

  return render(
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter
            initialEntries={[initialRoute]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('Routing Architecture & Auth Guards Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders landing page on public root / for unauthenticated guest', async () => {
    renderWithProviders('/', false);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Gantavya');
    expect(await screen.findByRole('button', { name: /Sign In \/ Register/i })).toBeInTheDocument();
    expect(screen.getByText('Frontend Client')).toBeInTheDocument();
  });

  it('redirects unauthenticated user accessing protected route /dashboard to /login', async () => {
    renderWithProviders('/dashboard', false);
    expect(await screen.findByRole('heading', { name: /Sign In to Gantavya/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
  });

  it('allows authenticated user to access /dashboard', async () => {
    renderWithProviders('/dashboard', true);
    expect(await screen.findByText(/Welcome back, Dev Tester/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming Journeys' })).toBeInTheDocument();
    expect(screen.getByText('Travel Network')).toBeInTheDocument();
  });

  it('redirects authenticated user on /login to /dashboard', async () => {
    renderWithProviders('/login', true);
    expect(await screen.findByText(/Welcome back, Dev Tester/i)).toBeInTheDocument();
  });

  it('allows unauthenticated guest to access public /explore page', async () => {
    renderWithProviders('/explore', false);
    expect(await screen.findByText('Explore Handcrafted Destinations')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by destination name/i)).toBeInTheDocument();
  });

  it('renders 404 Not Found page for invalid routes', async () => {
    renderWithProviders('/invalid-route-does-not-exist', false);
    expect(await screen.findByText('Destination Not Found')).toBeInTheDocument();
    expect(screen.getByText(/Lost in Transit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Return to Safety/i })).toBeInTheDocument();
  });
});
