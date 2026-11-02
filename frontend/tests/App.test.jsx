import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../src/App.jsx';

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
    getMe: vi.fn().mockRejectedValue(new Error('Unauthenticated')),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

describe('Frontend Foundation App Component', () => {
  it('renders Gantavya application heading', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Gantavya');
  });

  it('renders all three architectural service cards', async () => {
    render(<App />);
    expect(await screen.findByText('Frontend Client')).toBeInTheDocument();
    expect(await screen.findByText('Backend Monolith')).toBeInTheDocument();
    expect(await screen.findByText('Intelligence Engine')).toBeInTheDocument();
  });

  it('displays foundational architecture indicator', async () => {
    render(<App />);
    expect(await screen.findByText(/Zero Redis/i)).toBeInTheDocument();
  });

  it('renders Sign In / Register button for guest users', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: /Sign In \/ Register/i })).toBeInTheDocument();
  });
});
