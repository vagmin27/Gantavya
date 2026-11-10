import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { ThemeToggle } from '../src/components/ui';
import { AuthenticatedLayout, PublicLayout } from '../src/layouts';
import { AuthProvider } from '../src/context/AuthContext';

// Helper component to test useTheme directly
function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-theme-val">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('Theme System & Application Layouts', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('Theme Management & Persistence', () => {
    it('initializes with system theme and updates documentElement classes on theme change', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-val')).toHaveTextContent('system');

      // Switch to light
      fireEvent.click(screen.getByText('Set Light'));
      expect(screen.getByTestId('theme-val')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme-val')).toHaveTextContent('light');
      expect(localStorage.getItem('gantavya_theme')).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Switch to dark
      fireEvent.click(screen.getByText('Set Dark'));
      expect(screen.getByTestId('theme-val')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme-val')).toHaveTextContent('dark');
      expect(localStorage.getItem('gantavya_theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('ThemeToggle component switches themes on button clicks', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const lightBtn = screen.getByTitle('Switch to Light theme');
      const darkBtn = screen.getByTitle('Switch to Dark theme');

      fireEvent.click(lightBtn);
      expect(localStorage.getItem('gantavya_theme')).toBe('light');

      fireEvent.click(darkBtn);
      expect(localStorage.getItem('gantavya_theme')).toBe('dark');
    });

    it('restores theme from localStorage on initial load', () => {
      localStorage.setItem('gantavya_theme', 'light');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-val')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme-val')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('PublicLayout Component', () => {
    it('renders header, brand name, children, and footer', () => {
      const handleSignIn = vi.fn();
      render(
        <ThemeProvider>
          <PublicLayout onSignInClick={handleSignIn}>
            <div data-testid="public-content">Landing Hero Section</div>
          </PublicLayout>
        </ThemeProvider>
      );

      expect(screen.getByText('Gantavya')).toBeInTheDocument();
      expect(screen.getByTestId('public-content')).toBeInTheDocument();
      expect(screen.getByText(/Enterprise Reliability/i)).toBeInTheDocument();

      const signInBtn = screen.getByRole('button', { name: /Sign In/i });
      fireEvent.click(signInBtn);
      expect(handleSignIn).toHaveBeenCalledTimes(1);
    });
  });

  describe('AuthenticatedLayout Component', () => {
    const mockAuthContext = {
      user: { id: 'usr-1', name: 'Kabir Thapa', email: 'kabir@gantavya.io', role: 'owner' },
      isAuthenticated: true,
      logout: vi.fn()
    };

    it('renders sidebar navigation items and page header', () => {
      const handleTabChange = vi.fn();

      render(
        <ThemeProvider>
          <AuthenticatedLayout
            currentTab="trips"
            onTabChange={handleTabChange}
          >
            <div data-testid="auth-content">Trip Planner Content</div>
          </AuthenticatedLayout>
        </ThemeProvider>
      );

      expect(screen.getByText('My Trips')).toBeInTheDocument();
      expect(screen.getByText('Architecture')).toBeInTheDocument();
      expect(screen.getByTestId('auth-content')).toBeInTheDocument();

      const archBtn = screen.getByRole('button', { name: /Architecture/i });
      fireEvent.click(archBtn);
      expect(handleTabChange).toHaveBeenCalledWith('architecture');
    });

    it('renders active trip breadcrumb title when provided', () => {
      render(
        <ThemeProvider>
          <AuthenticatedLayout
            currentTab="trips"
            activeTripTitle="Pokhara Adventure 2026"
          >
            <div>Trip Body</div>
          </AuthenticatedLayout>
        </ThemeProvider>
      );

      expect(screen.getByText('Pokhara Adventure 2026')).toBeInTheDocument();
    });

    it('toggles mobile drawer navigation on menu button click', () => {
      render(
        <ThemeProvider>
          <AuthenticatedLayout currentTab="trips">
            <div>Mobile Viewport</div>
          </AuthenticatedLayout>
        </ThemeProvider>
      );

      const menuBtn = screen.getByLabelText('Open navigation menu');
      expect(menuBtn).toBeInTheDocument();
      fireEvent.click(menuBtn);

      // Verify close button in drawer becomes accessible
      expect(screen.getByRole('button', { name: 'My Trips' })).toBeInTheDocument();
    });
  });
});
