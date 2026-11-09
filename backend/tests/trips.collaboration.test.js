import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { Destination } from '../src/modules/destinations/destination.model.js';
import { Place } from '../src/modules/places/place.model.js';
import { Trip } from '../src/modules/trips/trip.model.js';
import { ItineraryDay } from '../src/modules/itineraries/itinerary-day.model.js';
import { Activity } from '../src/modules/activities/activity.model.js';
import { env } from '../src/config/env.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gantavya_trip_test';

describe('Milestone 2.3: Trip Planning, Group Collaboration & Intelligence Engine', () => {
  const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };

  let ownerUser, collaboratorUser, strangerUser;
  let ownerToken, collaboratorToken, strangerToken;
  let testDestination, testPlace;
  let testTripId = '';
  let invitationToken = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    // Clean up
    await User.deleteMany({ email: { $in: ['trip_owner@example.com', 'collaborator@example.com', 'stranger@example.com'] } });
    await Destination.deleteMany({ name: 'Pokhara Test Valley' });
    await Trip.deleteMany({});
    await ItineraryDay.deleteMany({});
    await Activity.deleteMany({});

    // Create test users
    ownerUser = await User.create({
      name: 'Trip Owner',
      email: 'trip_owner@example.com',
      password: 'SecurePassword123!',
      role: 'user',
      status: 'active'
    });
    ownerToken = jwt.sign(
      { id: ownerUser._id.toString(), email: ownerUser.email, role: ownerUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    collaboratorUser = await User.create({
      name: 'Collaborator User',
      email: 'collaborator@example.com',
      password: 'SecurePassword123!',
      role: 'user',
      status: 'active'
    });
    collaboratorToken = jwt.sign(
      { id: collaboratorUser._id.toString(), email: collaboratorUser.email, role: collaboratorUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    strangerUser = await User.create({
      name: 'Stranger User',
      email: 'stranger@example.com',
      password: 'SecurePassword123!',
      role: 'user',
      status: 'active'
    });
    strangerToken = jwt.sign(
      { id: strangerUser._id.toString(), email: strangerUser.email, role: strangerUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Create test destination and place
    testDestination = await Destination.create({
      name: 'Pokhara Test Valley',
      country: 'Nepal',
      city: 'Pokhara',
      description: 'Lakeside paradise with mountain views.',
      location: { type: 'Point', coordinates: [83.9856, 28.2096] },
      categories: ['scenic', 'nature', 'adventure']
    });

    testPlace = await Place.create({
      name: 'Phewa Lake Point',
      destinationId: testDestination._id,
      category: 'nature_spot',
      location: { type: 'Point', coordinates: [83.9576, 28.2116] },
      estimatedVisitDuration: 90,
      priceInfo: { priceTier: 'budget', estimatedCost: 1500, currency: 'NPR' }
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['trip_owner@example.com', 'collaborator@example.com', 'stranger@example.com'] } });
    await Destination.deleteMany({ name: 'Pokhara Test Valley' });
    await Place.deleteMany({ _id: testPlace._id });
    await Trip.deleteMany({});
    await ItineraryDay.deleteMany({});
    await Activity.deleteMany({});
    await mongoose.disconnect();
  });

  // ==========================================
  // PHASE 1: TRIP MANAGEMENT
  // ==========================================

  describe('Phase 1: Trip Management & Authorization', () => {
    it('POST /api/v1/trips creates trip and automatically assigns owner as active participant', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Himalayan Expedition',
          destinationId: testDestination._id.toString(),
          startDate: '2026-11-10',
          endDate: '2026-11-15',
          budget: { currency: 'NPR', targetAmount: 50000 },
          visibility: 'private'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ownerId).toBe(ownerUser._id.toString());
      expect(res.body.data.participants.length).toBe(1);
      expect(res.body.data.participants[0].userId).toBe(ownerUser._id.toString());
      expect(res.body.data.participants[0].role).toBe('owner');

      testTripId = res.body.data._id;
    });

    it('GET /api/v1/trips lists trips accessible by authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((t) => t._id === testTripId)).toBe(true);
    });

    it('GET /api/v1/trips/:id allows owner to view trip details', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(testTripId);
      expect(res.body.data.destinationId.name).toBe('Pokhara Test Valley');
    });

    it('GET /api/v1/trips/:id blocks unauthorized stranger from viewing private trip (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('PUT /api/v1/trips/:id updates trip details when executed by owner', async () => {
      const res = await request(app)
        .put(`/api/v1/trips/${testTripId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Himalayan Expedition (Updated Title)',
          'budget.targetAmount': 65000
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Himalayan Expedition (Updated Title)');
      expect(res.body.data.budget.targetAmount).toBe(65000);
    });

    it('PUT /api/v1/trips/:id rejects invalid date range (endDate < startDate)', async () => {
      const res = await request(app)
        .put(`/api/v1/trips/${testTripId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          startDate: '2026-11-20',
          endDate: '2026-11-10'
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('End date must be greater');
    });
  });

  // ==========================================
  // PHASE 2: GROUP COLLABORATION & INVITATIONS
  // ==========================================

  describe('Phase 2: Group Collaboration & Invitations', () => {
    it('POST /api/v1/trips/:id/invitations invites participant by email with secure token', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${testTripId}/invitations`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorUser.email,
          role: 'editor'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.invitation.email).toBe(collaboratorUser.email);
      expect(res.body.data.invitation.role).toBe('editor');
      expect(res.body.data.invitation.status).toBe('pending');

      invitationToken = res.body.data.token;
    });

    it('POST /api/v1/trips/:id/invitations rejects duplicate pending invitation for same email (409)', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${testTripId}/invitations`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: collaboratorUser.email,
          role: 'viewer'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('POST /api/v1/trips/invitations/accept accepts invitation and adds user to trip participants', async () => {
      const res = await request(app)
        .post('/api/v1/trips/invitations/accept')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ token: invitationToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('editor');

      // Verify collaborator now has access to the private trip
      const tripRes = await request(app)
        .get(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(tripRes.status).toBe(200);
      expect(
        tripRes.body.data.participants.some(
          (p) => p.userId._id === collaboratorUser._id.toString() && p.role === 'editor'
        )
      ).toBe(true);
    });

    it('PATCH /api/v1/trips/:id/participants/:id allows owner to change participant role', async () => {
      const res = await request(app)
        .patch(`/api/v1/trips/${testTripId}/participants/${collaboratorUser._id}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'viewer' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('viewer');
    });

    it('PATCH /api/v1/trips/:id/participants/:id blocks non-owner from changing participant roles (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/trips/${testTripId}/participants/${collaboratorUser._id}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ role: 'editor' });

      expect(res.status).toBe(403);
    });

    it('DELETE /api/v1/trips/:id/participants/:id allows participant to leave trip', async () => {
      const res = await request(app)
        .delete(`/api/v1/trips/${testTripId}/participants/${collaboratorUser._id}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(res.status).toBe(200);

      // Verify collaborator no longer in active participants
      const trip = await Trip.findById(testTripId);
      expect(
        trip.participants.some((p) => p.userId.toString() === collaboratorUser._id.toString())
      ).toBe(false);
    });
  });

  // ==========================================
  // PHASE 3: ITINERARY MANAGEMENT
  // ==========================================

  describe('Phase 3: Itinerary Day Management', () => {
    let day1Id = '';
    let day2Id = '';

    it('POST /api/v1/itineraries creates itinerary day within trip date range', async () => {
      const res = await request(app)
        .post('/api/v1/itineraries')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tripId: testTripId,
          dayNumber: 1,
          calendarDate: '2026-11-10',
          title: 'Arrival & Valley Walk'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.dayNumber).toBe(1);
      day1Id = res.body.data._id;
    });

    it('POST /api/v1/itineraries rejects day with calendar date outside trip date bounds (422)', async () => {
      const res = await request(app)
        .post('/api/v1/itineraries')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tripId: testTripId,
          dayNumber: 2,
          calendarDate: '2026-12-25', // Outside trip bounds (Nov 10-15)
          title: 'Far Future Day'
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('outside the trip start and end dates');
    });

    it('POST /api/v1/itineraries rejects duplicate dayNumber for same trip (409)', async () => {
      const res = await request(app)
        .post('/api/v1/itineraries')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tripId: testTripId,
          dayNumber: 1, // Already exists
          calendarDate: '2026-11-11'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('POST /api/v1/itineraries/reorder reorders itinerary days', async () => {
      // Create Day 2
      const day2Res = await request(app)
        .post('/api/v1/itineraries')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tripId: testTripId,
          dayNumber: 2,
          calendarDate: '2026-11-11',
          title: 'Lake Boating & Mountain Views'
        });
      day2Id = day2Res.body.data._id;

      // Reorder days: swap 1 and 2
      const reorderRes = await request(app)
        .post('/api/v1/itineraries/reorder')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tripId: testTripId,
          dayOrders: [
            { dayId: day1Id, newDayNumber: 2 },
            { dayId: day2Id, newDayNumber: 1 }
          ]
        });

      expect(reorderRes.status).toBe(200);
      expect(reorderRes.body.data.length).toBe(2);
      expect(reorderRes.body.data[0]._id).toBe(day2Id);
      expect(reorderRes.body.data[0].dayNumber).toBe(1);
    });
  });

  // ==========================================
  // PHASE 4: ACTIVITY MANAGEMENT
  // ==========================================

  describe('Phase 4: Activity Operations & Status', () => {
    let dayId = '';
    let activityId = '';

    beforeAll(async () => {
      const day = await ItineraryDay.findOne({ tripId: testTripId });
      dayId = day._id.toString();
    });

    it('POST /api/v1/activities adds an activity referencing a reusable Place', async () => {
      const res = await request(app)
        .post('/api/v1/activities')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          itineraryDayId: dayId,
          tripId: testTripId,
          placeId: testPlace._id.toString(),
          title: 'Boating at Phewa Lake Point',
          startTime: '09:00',
          endTime: '10:30',
          durationMinutes: 90,
          sequence: 1,
          estimatedCost: 1500
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Boating at Phewa Lake Point');
      expect(res.body.data.placeId).toBe(testPlace._id.toString());
      activityId = res.body.data._id;
    });

    it('POST /api/v1/activities supports custom activity without a Place reference', async () => {
      const res = await request(app)
        .post('/api/v1/activities')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          itineraryDayId: dayId,
          tripId: testTripId,
          placeId: null, // Custom activity without Place
          title: 'Relax at Coffee Shop & Journaling',
          startTime: '11:00',
          endTime: '12:00',
          durationMinutes: 60,
          sequence: 2,
          estimatedCost: 300
        });

      expect(res.status).toBe(201);
      expect(res.body.data.placeId).toBeNull();
      expect(res.body.data.title).toBe('Relax at Coffee Shop & Journaling');
    });

    it('PUT /api/v1/activities/:id updates activity completion status to completed', async () => {
      const res = await request(app)
        .put(`/api/v1/activities/${activityId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
    });
  });

  // ==========================================
  // PHASE 5: INTELLIGENCE ENGINE INTEGRATION
  // ==========================================

  describe('Phase 5: Intelligence Engine Planning Integration', () => {
    let freshTripId = '';

    beforeAll(async () => {
      const trip = await Trip.create({
        title: 'Autumn Pokhara Retreat',
        ownerId: ownerUser._id,
        destinationId: testDestination._id,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-03'), // 3 days
        budget: { currency: 'NPR', targetAmount: 40000 },
        travelConstraints: {
          maxDailyTravelDuration: 120,
          activityDensity: 'medium'
        },
        participants: [
          { userId: ownerUser._id, role: 'owner', invitationStatus: 'accepted', membershipStatus: 'active' }
        ]
      });
      freshTripId = trip._id.toString();
    });

    it('POST /api/v1/trips/:id/generate-itinerary generates and persists automated itinerary', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${freshTripId}/generate-itinerary`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalDays).toBe(3);

      // Verify persisted in MongoDB
      const savedDays = await ItineraryDay.find({ tripId: freshTripId }).sort({ dayNumber: 1 });
      expect(savedDays.length).toBe(3);

      const savedActivities = await Activity.find({ tripId: freshTripId });
      expect(savedActivities.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/trips/:id/generate-itinerary prevents accidental overwrite without confirmOverwrite (409)', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${freshTripId}/generate-itinerary`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({}); // confirmOverwrite false

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Set confirmOverwrite: true to regenerate');
    });

    it('POST /api/v1/trips/:id/generate-itinerary replaces itinerary when confirmOverwrite is true', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${freshTripId}/generate-itinerary`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmOverwrite: true });

      expect(res.status).toBe(200);
      expect(res.body.data.totalDays).toBe(3);

      const savedDays = await ItineraryDay.find({ tripId: freshTripId });
      expect(savedDays.length).toBe(3);
    });
  });
});

