import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Backend Foundation & Health API', () => {
  it('GET /api/v1/health should return 200 with service health payload', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'Backend service is healthy');
    expect(res.body.data).toHaveProperty('service', 'gantavya-backend');
    expect(res.body.data).toHaveProperty('status', 'ok');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('database');
  });

  it('GET /api/v1/auth/status should return 200 for foundational auth module', async () => {
    const res = await request(app).get('/api/v1/auth/status');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'auth');
    expect(res.body.data).toHaveProperty('initialized', true);
  });

  it('GET /api/v1/users/status should return 200 for foundational users module', async () => {
    const res = await request(app).get('/api/v1/users/status');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'users');
    expect(res.body.data).toHaveProperty('initialized', true);
  });

  it('GET /unknown-route should return 404 with standard error envelope', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toContain('Route not found');
  });
});

