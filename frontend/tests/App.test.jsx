import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../src/App.jsx';

vi.mock('../src/services/api', () => ({
  checkBackendHealth: vi.fn().mockResolvedValue({
    data: { service: 'gantavya-backend', status: 'ok' }
  })
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
});
