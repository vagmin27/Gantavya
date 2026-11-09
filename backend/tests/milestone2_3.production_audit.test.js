import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { Destination } from '../src/modules/destinations/destination.model.js';
import { Place } from '../src/modules/places/place.model.js';
import { Trip } from '../src/modules/trips/trip.model.js';
import { ItineraryDay } from '../src/modules/itineraries/itinerary-day.model.js';
import { Activity } from '../src/modules/activities/activity.model.js';
import { env } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gantavya_prod_audit_test';
const CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };

describe('Milestone 2.3: Production-Readiness Integration Audit', () => {
  let fastApiProcess = null;
  let ownerUser, editorUser, viewerUser, strangerUser;
  let ownerToken, editorToken, viewerToken, strangerToken;
  let auditDestination, auditPlace1, auditPlace2;
  let auditTripId = '';
  let invitationTokenEditor = '';
  let invitationTokenViewer = '';
  let day1Id = '', day2Id = '';

  beforeAll(async () => {
    // 1. Connect to Real MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 20
      });
    }

    // Clean up test collections
    await User.deleteMany({ email: { $in: ['audit_owner@example.com', 'audit_editor@example.com', 'audit_viewer@example.com', 'audit_stranger@example.com'] } });
    await Destination.deleteMany({ name: 'Mustang Kingdom' });
    await Trip.deleteMany({});
    await ItineraryDay.deleteMany({});
    await Activity.deleteMany({});

    // 2. Start Live FastAPI server on port 8000
    const pythonExe = path.resolve(__dirname, '../../intelligence/.venv/Scripts/python.exe');
    const intelligenceDir = path.resolve(__dirname, '../../intelligence');

    fastApiProcess = spawn(
      pythonExe,
      ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--host', '127.0.0.1'],
      { cwd: intelligenceDir, stdio: 'ignore' }
    );

    // Wait for FastAPI to be ready
    let attempts = 0;
    while (attempts < 20) {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/health');
        if (res.ok) break;
      } catch {
        // wait
      }
      await new Promise((r) => setTimeout(r, 250));
      attempts++;
    }

    // 3. Create Users
    ownerUser = await User.create({
      name: 'Audit Owner',
      email: 'audit_owner@example.com',
      password: 'SecurePassword123!',
      role: 'user',
      status: 'active'
    });
    ownerToken = jwt.sign({ id: ownerUser._id.toString(), email: ownerUser.email, role: ownerUser.role }, env.JWT_ACCESS_SECRET, { expiresIn: '2h' });

    editorUser = await User.create({
      name: 'Audit Editor',
      email: 'audit_editor@example.com',
      password: 'SecurePassword123!',
      role: 'user',
      status: 'active'
    });
    editorToken = jwt.sign({ id: editorUser._id.toString(), email: editorUser.email, role: editorUser.role }, env.JWT_ACCESS_SECRET, { expiresIn: '2h' });

    viewerUser = await User.create({
      name: 'Audit Viewer',
      email: 'audit_viewer@example.com',
      password: 'SecurePassword123!',
      role: 'user',
      status: 'active'
    });
    viewerToken = jwt.sign({ id: viewerUser._id.toString(), email: viewerUser.email, role: viewerUser.role }, env.JWT_ACCESS_SECRET, { expiresIn: '2h' });

    strangerUser = await User.create({
      name: 'Audit Stranger',
      email: 'audit_stranger@example.com',
      password: 'SecurePassword123!',
      role: 'user',
      status: 'active'
    });
    strangerToken = jwt.sign({ id: strangerUser._id.toString(), email: strangerUser.email, role: strangerUser.role }, env.JWT_ACCESS_SECRET, { expiresIn: '2h' });

    // 4. Create Destination & Places
    auditDestination = await Destination.create({
      name: 'Mustang Kingdom',
      country: 'Nepal',
      city: 'Lo Manthang',
      description: 'Ancient walled city of Upper Mustang',
      location: { type: 'Point', coordinates: [83.97, 29.18] },
      categories: ['historical', 'cultural', 'scenic']
    });

    auditPlace1 = await Place.create({
      name: 'Lo Manthang Royal Palace',
      destinationId: auditDestination._id,
      category: 'historical_place',
      location: { type: 'Point', coordinates: [83.968, 29.182] },
      estimatedVisitDuration: 90,
      priceInfo: { priceTier: 'budget', estimatedCost: 1000, currency: 'NPR' }
    });

    auditPlace2 = await Place.create({
      name: 'Jampa Gompa',
      destinationId: auditDestination._id,
      category: 'cultural_center',
      location: { type: 'Point', coordinates: [83.969, 29.181] },
      estimatedVisitDuration: 60,
      priceInfo: { priceTier: 'budget', estimatedCost: 500, currency: 'NPR' }
    });
  }, 30000);

  afterAll(async () => {
    if (fastApiProcess) {
      fastApiProcess.kill('SIGTERM');
    }
    await User.deleteMany({ email: { $in: ['audit_owner@example.com', 'audit_editor@example.com', 'audit_viewer@example.com', 'audit_stranger@example.com'] } });
    await Destination.deleteMany({ name: 'Mustang Kingdom' });
    const placeIds = [auditPlace1?._id, auditPlace2?._id].filter(Boolean);
    if (placeIds.length > 0) {
      await Place.deleteMany({ _id: { $in: placeIds } });
    }
    await Trip.deleteMany({});
    await ItineraryDay.deleteMany({});
    await Activity.deleteMany({});
    await mongoose.disconnect();
  });

  // ==========================================
  // SECTION 1: REAL MONGODB PERSISTENCE & COMPOUND CONSTRAINTS
  // ==========================================

  describe('1. Real MongoDB Atlas / Local Persistence & Compound Index Integrity', () => {
    it('persists a new trip with owner binding and indexed visibility', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Upper Mustang Cultural Traverse',
          destinationId: auditDestination._id.toString(),
          startDate: '2026-11-20',
          endDate: '2026-11-23',
          visibility: 'private',
          budget: { currency: 'NPR', targetAmount: 85000 }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      auditTripId = res.body.data._id;

      // Direct MongoDB verify
      const inDb = await Trip.findById(auditTripId);
      expect(inDb).not.toBeNull();
      expect(inDb.ownerId.toString()).toBe(ownerUser._id.toString());
      expect(inDb.participants[0].userId.toString()).toBe(ownerUser._id.toString());
      expect(inDb.participants[0].role).toBe('owner');
    });

    it('enforces compound uniqueness on ItineraryDay { tripId, dayNumber }', async () => {
      const day1 = await ItineraryDay.create({
        tripId: auditTripId,
        dayNumber: 1,
        calendarDate: new Date('2026-11-20'),
        title: 'Arrival in Lo Manthang'
      });
      day1Id = day1._id.toString();

      // Attempt duplicate dayNumber for same trip
      await expect(
        ItineraryDay.create({
          tripId: auditTripId,
          dayNumber: 1,
          calendarDate: new Date('2026-11-20'),
          title: 'Duplicate Day Number'
        })
      ).rejects.toThrow();

      const day2 = await ItineraryDay.create({
        tripId: auditTripId,
        dayNumber: 2,
        calendarDate: new Date('2026-11-21'),
        title: 'Exploration Day'
      });
      day2Id = day2._id.toString();
    });

    it('successfully reorders days using two-pass algorithm without clashing compound unique index', async () => {
      const res = await request(app)
        .post('/api/v1/itineraries/reorder')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tripId: auditTripId,
          dayOrders: [
            { dayId: day2Id, newDayNumber: 1 },
            { dayId: day1Id, newDayNumber: 2 }
          ]
        });

      expect(res.status).toBe(200);
      const reorderedDay1 = await ItineraryDay.findById(day2Id);
      expect(reorderedDay1.dayNumber).toBe(1);
      const reorderedDay2 = await ItineraryDay.findById(day1Id);
      expect(reorderedDay2.dayNumber).toBe(2);

      // Restore original order
      await request(app)
        .post('/api/v1/itineraries/reorder')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tripId: auditTripId,
          dayOrders: [
            { dayId: day1Id, newDayNumber: 1 },
            { dayId: day2Id, newDayNumber: 2 }
          ]
        });
    });
  });

  // ==========================================
  // SECTION 2: LIVE EXPRESS <-> FASTAPI INTEGRATION
  // ==========================================

  describe('2. Live Express <-> FastAPI East-West Integration', () => {
    it('authenticates with live FastAPI service using internal key and generates real plan', async () => {
      // First clear manually created test days to test fresh generation
      await Activity.deleteMany({ tripId: auditTripId });
      await ItineraryDay.deleteMany({ tripId: auditTripId });

      const res = await request(app)
        .post(`/api/v1/trips/${auditTripId}/generate-itinerary`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalDays).toBe(4); // Nov 20 - Nov 23 = 4 days
      expect(res.body.data.totalActivities).toBeGreaterThanOrEqual(1);

      // Verify records were persisted into MongoDB
      const days = await ItineraryDay.find({ tripId: auditTripId }).sort({ dayNumber: 1 });
      expect(days.length).toBe(4);
      day1Id = days[0]._id.toString();

      const activities = await Activity.find({ tripId: auditTripId });
      expect(activities.length).toBeGreaterThanOrEqual(1);
      expect(activities[0].status).toBe('planned');
    });

    it('rejects regeneration attempt without confirmOverwrite: true (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${auditTripId}/generate-itinerary`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({}); // no confirmOverwrite

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already has 4 itinerary day(s)');
    });

    it('successfully regenerates and overwrites days and activities when confirmOverwrite: true', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${auditTripId}/generate-itinerary`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmOverwrite: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const days = await ItineraryDay.find({ tripId: auditTripId });
      expect(days.length).toBe(4);
      day1Id = days[0]._id.toString();
    });
  });

  // ==========================================
  // SECTION 3: TWO-USER INVITATION & COLLABORATION
  // ==========================================

  describe('3. Two-User Invitation & Collaboration Lifecycle', () => {
    it('Owner invites User B with "editor" role', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${auditTripId}/invitations`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: editorUser.email,
          role: 'editor'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.invitation.role).toBe('editor');
      invitationTokenEditor = res.body.data.token;
    });

    it('Rejects duplicate pending invitation for same email with 409', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${auditTripId}/invitations`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: editorUser.email,
          role: 'viewer'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('User B accepts invitation token and becomes active Editor', async () => {
      const res = await request(app)
        .post('/api/v1/trips/invitations/accept')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ token: invitationTokenEditor });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('editor');

      // Check DB participant entry
      const trip = await Trip.findById(auditTripId);
      const editorP = trip.participants.find((p) => p.userId.toString() === editorUser._id.toString());
      expect(editorP).toBeDefined();
      expect(editorP.role).toBe('editor');
      expect(editorP.membershipStatus).toBe('active');
    });

    it('Owner invites User C with "viewer" role and User C accepts', async () => {
      const invRes = await request(app)
        .post(`/api/v1/trips/${auditTripId}/invitations`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: viewerUser.email,
          role: 'viewer'
        });

      expect(invRes.status).toBe(201);
      invitationTokenViewer = invRes.body.data.token;

      const acceptRes = await request(app)
        .post('/api/v1/trips/invitations/accept')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ token: invitationTokenViewer });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.role).toBe('viewer');
    });

    it('Rejects reused/already-accepted token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/trips/invitations/accept')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ token: invitationTokenEditor });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been accepted');
    });
  });

  // ==========================================
  // SECTION 4: EXHAUSTIVE AUTHORIZATION MATRIX
  // ==========================================

  describe('4. Owner / Editor / Viewer / Stranger Authorization Matrix', () => {
    // EDITOR PERMISSIONS
    it('Editor can update trip details (PUT /trips/:id)', async () => {
      const res = await request(app)
        .put(`/api/v1/trips/${auditTripId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Upper Mustang Cultural Expedition - Editor Edited' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Upper Mustang Cultural Expedition - Editor Edited');
    });

    it('Editor CANNOT delete trip (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/trips/${auditTripId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the trip owner can delete');
    });

    it('Editor CANNOT change participant roles (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/trips/${auditTripId}/participants/${viewerUser._id}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ role: 'editor' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the trip owner can change');
    });

    it('Editor CANNOT remove another participant (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/trips/${auditTripId}/participants/${viewerUser._id}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('do not have permission');
    });

    // VIEWER PERMISSIONS
    it('Viewer can read trip details', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${auditTripId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(auditTripId);
    });

    it('Viewer CANNOT update trip details (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/v1/trips/${auditTripId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Viewer Attempting Edit' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('do not have permission');
    });

    it('Viewer CANNOT create an itinerary day (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/itineraries')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          tripId: auditTripId,
          dayNumber: 5,
          calendarDate: '2026-11-22'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('do not have permission');
    });

    it('Viewer CANNOT create an activity (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/activities')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          itineraryDayId: day1Id,
          title: 'Viewer Activity',
          startTime: '10:00',
          endTime: '11:00'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('do not have permission');
    });

    it('Viewer CANNOT generate an itinerary (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${auditTripId}/generate-itinerary`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('do not have permission');
    });

    // STRANGER PERMISSIONS (INFORMATION LEAK PREVENTION)
    it('Stranger CANNOT view private trip details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${auditTripId}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Stranger CANNOT list itinerary days of private trip (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/itineraries?tripId=${auditTripId}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Stranger CANNOT list activities of private trip (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/activities?itineraryDayId=${day1Id}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  // ==========================================
  // SECTION 5: FRONTEND COMPATIBILITY & LIFECYCLE
  // ==========================================

  describe('5. Frontend Compatibility & Cascading Deletion', () => {
    let createdActivityId = '';

    it('Editor creates activity with auto-calculated sequence and duration', async () => {
      const res = await request(app)
        .post('/api/v1/activities')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          itineraryDayId: day1Id,
          title: 'Sunrise Walk at Royal Gate',
          startTime: '06:00',
          endTime: '07:30',
          type: 'leisure',
          estimatedCost: 200
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sequence).toBeGreaterThanOrEqual(1);
      expect(res.body.data.durationMinutes).toBe(90); // 06:00 to 07:30 = 90 min
      expect(res.body.data.status).toBe('planned');
      createdActivityId = res.body.data._id;
    });

    it('Editor toggles activity status to completed and back to planned', async () => {
      // Toggle to completed
      const res1 = await request(app)
        .put(`/api/v1/activities/${createdActivityId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ status: 'completed' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('completed');

      // Toggle back to planned
      const res2 = await request(app)
        .put(`/api/v1/activities/${createdActivityId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ status: 'planned' });

      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('planned');
    });

    it('Owner deleting trip cascades and cleans up all days and activities', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/trips/${auditTripId}`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify cascading removal in DB
      const tripInDb = await Trip.findById(auditTripId);
      expect(tripInDb).toBeNull();

      const daysInDb = await ItineraryDay.find({ tripId: auditTripId });
      expect(daysInDb.length).toBe(0);

      const activitiesInDb = await Activity.find({ tripId: auditTripId });
      expect(activitiesInDb.length).toBe(0);
    });
  });
});
