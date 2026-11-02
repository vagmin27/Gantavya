import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { TravellerProfile } from '../src/modules/profiles/profile.model.js';
import { RefreshToken } from '../src/modules/auth/refresh-token.model.js';
import { Trip } from '../src/modules/trips/trip.model.js';
import { Destination } from '../src/modules/destinations/destination.model.js';
import { env } from '../src/config/env.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gantavya_auth_test';

describe('Authentication & User Management Suite', () => {
  const CSRF_HEADERS = {
    'X-Requested-With': 'XMLHttpRequest'
  };

  const testUser = {
    name: 'Siddhartha Gautama',
    email: 'siddhartha@example.com',
    password: 'SecurePassword123!'
  };

  let registeredCookies = [];
  let userAccessToken = '';
  let userRefreshToken = '';
  let userId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
    // Clean up test data
    await User.deleteMany({ email: { $in: [testUser.email, 'suspended@example.com'] } });
    await RefreshToken.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [testUser.email, 'suspended@example.com'] } });
    await RefreshToken.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. CSRF Protection Middleware', () => {
    it('blocks state-changing POST requests without CSRF header with 403', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Missing CSRF protection header');
    });

    it('permits state-changing requests when X-Requested-With is present', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADERS)
        .send({ email: testUser.email, password: 'WrongPassword123!' });

      // Expect 401 instead of 403 CSRF rejection
      expect(res.status).toBe(401);
    });
  });

  describe('2. User Registration', () => {
    it('rejects registration with weak password (422)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADERS)
        .send({
          name: 'Weak Pass',
          email: 'weak@example.com',
          password: 'pass' // too short, no uppercase, no number
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('rejects registration with invalid email format (422)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADERS)
        .send({
          name: 'Invalid Email',
          email: 'not-an-email',
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('successfully registers a new user (201) and initializes traveller profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADERS)
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.password).toBeUndefined(); // Password is stripped
      expect(res.body.data.accessToken).toBeDefined();

      userId = res.body.data.user._id;
      userAccessToken = res.body.data.accessToken;

      // Extract set-cookie headers
      registeredCookies = res.headers['set-cookie'];
      expect(registeredCookies).toBeDefined();
      expect(registeredCookies.some((c) => c.includes('accessToken='))).toBe(true);
      expect(registeredCookies.some((c) => c.includes('refreshToken='))).toBe(true);

      // Verify traveller profile was initialized automatically
      const profile = await TravellerProfile.findOne({ userId });
      expect(profile).toBeDefined();
      expect(profile.userId.toString()).toBe(userId.toString());
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADERS)
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('3. User Login', () => {
    it('rejects login with wrong password (401 generic error)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADERS)
        .send({ email: testUser.email, password: 'IncorrectPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects login with non-existent email (401 generic error)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADERS)
        .send({ email: 'nonexistent@example.com', password: 'SomePassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects suspended accounts with 403', async () => {
      await User.create({
        name: 'Suspended User',
        email: 'suspended@example.com',
        password: 'SecurePassword123!',
        status: 'suspended'
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADERS)
        .send({ email: 'suspended@example.com', password: 'SecurePassword123!' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('suspended');
    });

    it('successfully logs in with valid credentials (200) and updates lastLoginAt', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADERS)
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      userAccessToken = res.body.data.accessToken;
      registeredCookies = res.headers['set-cookie'];

      // Extract raw refresh token cookie
      const refreshCookie = registeredCookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      userRefreshToken = refreshCookie.split(';')[0].replace('refreshToken=', '');

      // Verify lastLoginAt updated in DB
      const dbUser = await User.findById(userId);
      expect(dbUser.lastLoginAt).toBeDefined();
    });
  });

  describe('4. Token Verification & Protected Endpoints', () => {
    it('GET /api/v1/auth/me rejects requests without token (401)', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('token missing');
    });

    it('GET /api/v1/auth/me rejects requests with tampered token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid authentication token');
    });

    it('GET /api/v1/auth/me rejects expired tokens with 401 and TOKEN_EXPIRED code', async () => {
      const expiredToken = jwt.sign(
        { id: userId, email: testUser.email, role: 'user' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '-1s' } // Expired in past
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('expired');
      expect(res.body.errors).toHaveProperty('code', 'TOKEN_EXPIRED');
    });

    it('GET /api/v1/auth/me returns current user and traveller profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user._id).toBe(userId);
      expect(res.body.data.profile).toBeDefined();
    });

    it('GET /api/v1/users/me returns account details via HTTP-only cookie', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Cookie', registeredCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUser.email.toLowerCase());
    });

    it('PATCH /api/v1/users/me updates user name and enforces validation', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ name: 'Siddhartha (Enlightened)' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Siddhartha (Enlightened)');

      // Verify in DB
      const dbUser = await User.findById(userId);
      expect(dbUser.name).toBe('Siddhartha (Enlightened)');
    });
  });

  describe('5. Refresh Token Rotation & Replay Protection', () => {
    let rotatedRefreshToken = '';

    it('POST /api/v1/auth/refresh without token returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADERS);

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/auth/refresh successfully rotates refresh token and returns new access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADERS)
        .set('Cookie', [`refreshToken=${userRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).not.toBe(userAccessToken);

      const newCookies = res.headers['set-cookie'];
      const newRefreshCookie = newCookies.find((c) => c.startsWith('refreshToken='));
      expect(newRefreshCookie).toBeDefined();

      rotatedRefreshToken = newRefreshCookie.split(';')[0].replace('refreshToken=', '');
      expect(rotatedRefreshToken).not.toBe(userRefreshToken);
    });

    it('POST /api/v1/auth/refresh detects replay attack if old refresh token is reused', async () => {
      // Re-using userRefreshToken which was already rotated
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADERS)
        .set('Cookie', [`refreshToken=${userRefreshToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Token reuse detected');

      // The entire family should now be revoked
      const afterReplayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADERS)
        .set('Cookie', [`refreshToken=${rotatedRefreshToken}`]);

      expect(afterReplayRes.status).toBe(401);
    });
  });

  describe('6. Logout & Session Revocation', () => {
    it('POST /api/v1/auth/logout revokes refresh token and clears auth cookies', async () => {
      // Re-login to get fresh session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADERS)
        .send({ email: testUser.email, password: testUser.password });

      const loginCookies = loginRes.headers['set-cookie'];
      const currentRefresh = loginCookies
        .find((c) => c.startsWith('refreshToken='))
        .split(';')[0]
        .replace('refreshToken=', '');

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set(CSRF_HEADERS)
        .set('Cookie', loginCookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      const clearedCookies = logoutRes.headers['set-cookie'];
      expect(clearedCookies.some((c) => c.includes('accessToken=;'))).toBe(true);
      expect(clearedCookies.some((c) => c.includes('refreshToken=;'))).toBe(true);

      // Attempting to refresh with the revoked token fails
      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADERS)
        .set('Cookie', [`refreshToken=${currentRefresh}`]);

      expect(refreshAttempt.status).toBe(401);
    });
  });

  describe('7. Resource-Based Authorization', () => {
    let tripId = '';
    let otherUserId = '';
    let otherAccessToken = '';

    beforeAll(async () => {
      // Create destination for trip
      const destination = await Destination.create({
        name: 'Lumbini',
        country: 'Nepal',
        description: 'Birthplace of Buddha',
        location: { type: 'Point', coordinates: [83.276, 27.484] }
      });

      // Create a trip owned by testUser
      const trip = await Trip.create({
        title: 'Peace Pilgrimage',
        ownerId: userId,
        destinationId: destination._id,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        visibility: 'private'
      });
      tripId = trip._id.toString();

      // Create another user
      const otherUser = await User.create({
        name: 'Other Traveller',
        email: 'other@example.com',
        password: 'OtherPassword123!',
        role: 'user',
        status: 'active'
      });
      otherUserId = otherUser._id.toString();
      otherAccessToken = jwt.sign(
        { id: otherUserId, email: otherUser.email, role: otherUser.role },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
    });

    afterAll(async () => {
      await User.deleteMany({ email: 'other@example.com' });
      await Trip.deleteMany({ _id: tripId });
      await Destination.deleteMany({ name: 'Lumbini' });
    });

    it('Trip owner can retrieve their trip', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(tripId);
    });

    it('Owner can add participants to trip', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${tripId}/participants`)
        .set(CSRF_HEADERS)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          userId: otherUserId,
          role: 'viewer'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.participants.some((p) => p.userId === otherUserId)).toBe(true);
    });
  });
});

