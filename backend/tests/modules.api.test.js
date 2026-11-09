import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Modular Monolith Module Routes & API Contracts', () => {
  it('GET /api/v1/profiles/status should return 200', async () => {
    const res = await request(app).get('/api/v1/profiles/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'profiles');
    expect(res.body.data).toHaveProperty('initialized', true);
  });

  it('GET /api/v1/destinations/status should return 200', async () => {
    const res = await request(app).get('/api/v1/destinations/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'destinations');
  });

  it('GET /api/v1/places/status should return 200', async () => {
    const res = await request(app).get('/api/v1/places/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'places');
  });

  it('GET /api/v1/trips/status should return 200', async () => {
    const res = await request(app).get('/api/v1/trips/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'trips');
  });

  it('GET /api/v1/itineraries/status should return 200', async () => {
    const res = await request(app).get('/api/v1/itineraries/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'itineraries');
  });

  it('GET /api/v1/activities/status should return 200', async () => {
    const res = await request(app).get('/api/v1/activities/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'activities');
  });

  it('GET /api/v1/transportation/status should return 200', async () => {
    const res = await request(app).get('/api/v1/transportation/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('module', 'transportation');
    expect(res.body.data).toHaveProperty('initialized', true);
  });

  it('POST /api/v1/trips should return 422 on validation failure', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .send({
        title: 'X', // too short
        startDate: '2026-10-10',
        endDate: '2026-10-01' // invalid range
      });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('POST /api/v1/places should return 422 on invalid category and coordinates', async () => {
    const res = await request(app)
      .post('/api/v1/places')
      .send({
        name: 'Invalid Place',
        category: 'unsupported_cat',
        location: { coordinates: [300, 200] }
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

