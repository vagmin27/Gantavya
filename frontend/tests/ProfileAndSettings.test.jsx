import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage, SettingsPage } from '../src/pages';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthService } from '../src/services/auth.service';

vi.mock('../src/services/auth.service', () => ({
  AuthService: {
    getMe: vi.fn(),
    updateMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

describe('Traveller Profile & Settings Experience Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.getMe.mockResolvedValue({
      data: {
        user: { id: 'usr-42', name: 'Maya Lin', email: 'maya@gantavya.io', role: 'owner' },
        profile: {
          homeCity: 'Pokhara',
          travelInterests: ['Trekking', 'Photography'],
          preferredTravelStyles: ['Scenic', 'Moderate']
        }
      }
    });
  });

  describe('ProfilePage Component', () => {
    it('renders user details, role badge, and travel preferences', async () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ProfilePage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Maya Lin');
      expect(screen.getByText('maya@gantavya.io')).toBeInTheDocument();
      expect(screen.getByText('owner')).toBeInTheDocument();
      expect(await screen.findByDisplayValue('Maya Lin')).toBeInTheDocument();
      expect(await screen.findByDisplayValue('Pokhara')).toBeInTheDocument();
      expect(screen.getByText('Save Profile Changes')).toBeInTheDocument();
    });

    it('submits profile changes via updateProfile', async () => {
      AuthService.updateMe.mockResolvedValueOnce({
        data: { id: 'usr-42', name: 'Maya Lin Architect', email: 'maya@gantavya.io', role: 'owner' }
      });

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ProfilePage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      const nameInput = await screen.findByDisplayValue('Maya Lin');
      fireEvent.change(nameInput, { target: { value: 'Maya Lin Architect' } });

      const saveBtn = screen.getByRole('button', { name: /Save Profile Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(AuthService.updateMe).toHaveBeenCalledWith({
          name: 'Maya Lin Architect'
        });
      });
    });
  });

  describe('SettingsPage Component', () => {
    it('renders theme selector options and architecture parameters', async () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <SettingsPage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Application Settings');
      expect(screen.getByText('Light Mode')).toBeInTheDocument();
      expect(screen.getByText('Dark Mode')).toBeInTheDocument();
      expect(screen.getByText('System Preference')).toBeInTheDocument();
      expect(screen.getByText(/MongoDB Atlas \(Zero Redis Invariant\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Stateless FastAPI Intelligence Service/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Out of Gantavya/i })).toBeInTheDocument();
    });

    it('allows changing theme from settings page', async () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <SettingsPage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      const darkOption = await screen.findByText('Dark Mode');
      fireEvent.click(darkOption);

      expect(localStorage.getItem('gantavya_theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('triggers logout on sign out button click', async () => {
      AuthService.logout.mockResolvedValueOnce({});

      render(
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <SettingsPage />
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      );

      const signOutBtn = await screen.findByRole('button', { name: /Sign Out of Gantavya/i });
      fireEvent.click(signOutBtn);

      await waitFor(() => {
        expect(AuthService.logout).toHaveBeenCalled();
      });
    });
  });
});
