import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../src/modules/users/user.model.js';
import { TravellerProfile } from '../src/modules/profiles/profile.model.js';
import { Destination } from '../src/modules/destinations/destination.model.js';
import { Place } from '../src/modules/places/place.model.js';
import { Trip } from '../src/modules/trips/trip.model.js';
import { ItineraryDay } from '../src/modules/itineraries/itinerary-day.model.js';
import { Activity } from '../src/modules/activities/activity.model.js';

describe('Domain Models Validation Suite', () => {
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyDestinationId = new mongoose.Types.ObjectId();
  const dummyPlaceId = new mongoose.Types.ObjectId();
  const dummyTripId = new mongoose.Types.ObjectId();
  const dummyDayId = new mongoose.Types.ObjectId();

  describe('User Model', () => {
    it('validates a correct user document', async () => {
      const user = new User({
        name: 'Aarav Sharma',
        email: 'aarav@example.com',
        password: 'securepassword123',
        role: 'user',
        status: 'active'
      });
      await expect(user.validate()).resolves.toBeUndefined();
    });

    it('rejects invalid email and missing password', async () => {
      const user = new User({
        name: 'A',
        email: 'not-an-email'
      });
      let error;
      try {
        await user.validate();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it('rejects invalid role enum', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'superadmin_invalid'
      });
      await expect(user.validate()).rejects.toThrow(/not a valid user role/);
    });
  });

  describe('TravellerProfile Model', () => {
    it('validates a valid traveller profile', async () => {
      const profile = new TravellerProfile({
        userId: dummyUserId,
        travelInterests: ['nature', 'adventure', 'spiritual'],
        preferredTravelStyles: ['backpacking', 'eco_tourism'],
        foodPreferences: ['vegetarian', 'local_cuisine'],
        preferredTransportation: ['walking', 'bus'],
        accessibilityPreferences: {
          wheelchairAccessible: true,
          notes: 'Prefer ground-floor or ramp access'
        },
        personalisationSettings: {
          currency: 'NPR',
          language: 'en'
        }
      });
      await expect(profile.validate()).resolves.toBeUndefined();
    });

    it('rejects invalid travel interests enum', async () => {
      const profile = new TravellerProfile({
        userId: dummyUserId,
        travelInterests: ['gambling_invalid']
      });
      await expect(profile.validate()).rejects.toThrow(/not a valid travel interest/);
    });

    it('requires userId', async () => {
      const profile = new TravellerProfile({
        travelInterests: ['nature']
      });
      await expect(profile.validate()).rejects.toThrow(/User ID reference is required/);
    });
  });

  describe('Destination Model & GeoJSON Validation', () => {
    it('validates a valid destination with coordinates', async () => {
      const destination = new Destination({
        name: 'Pokhara',
        country: 'Nepal',
        city: 'Pokhara',
        description: 'Gateway to the Annapurna Circuit, featuring serene lakes.',
        location: {
          type: 'Point',
          coordinates: [83.9856, 28.2096] // [lng, lat]
        },
        categories: ['scenic', 'adventure', 'nature'],
        bestVisitingPeriods: {
          seasons: ['autumn', 'spring'],
          months: [10, 11, 3, 4],
          description: 'Clear skies and best mountain views'
        }
      });
      await expect(destination.validate()).resolves.toBeUndefined();
    });

    it('rejects out-of-range coordinates', async () => {
      const destination = new Destination({
        name: 'Invalid Point',
        country: 'Nepal',
        description: 'Test point with bad coordinates',
        location: {
          type: 'Point',
          coordinates: [195.0, 28.0] // Longitude > 180
        }
      });
      await expect(destination.validate()).rejects.toThrow(/Coordinates must be valid/);
    });
  });

  describe('Place Model', () => {
    it('validates a valid place', async () => {
      const place = new Place({
        name: 'Phewa Lake Boating Point',
        destinationId: dummyDestinationId,
        category: 'nature_spot',
        location: {
          type: 'Point',
          coordinates: [83.9576, 28.2116]
        },
        estimatedVisitDuration: 90,
        priceInfo: {
          priceTier: 'budget',
          estimatedCost: 1000,
          currency: 'NPR'
        },
        rating: 4.8
      });
      await expect(place.validate()).resolves.toBeUndefined();
    });

    it('rejects invalid category and invalid visit duration', async () => {
      const place = new Place({
        name: 'Invalid Place',
        destinationId: dummyDestinationId,
        category: 'space_station_invalid',
        location: {
          type: 'Point',
          coordinates: [83.9576, 28.2116]
        },
        estimatedVisitDuration: 2 // Less than 5 min minimum
      });
      let error;
      try {
        await place.validate();
      } catch (err) {
        error = err;
      }
      expect(error.errors.category).toBeDefined();
      expect(error.errors.estimatedVisitDuration).toBeDefined();
    });
  });

  describe('Trip Model & Group Collaboration', () => {
    it('validates a correct trip with valid date range', async () => {
      const trip = new Trip({
        title: 'Annapurna Base Camp Trek',
        ownerId: dummyUserId,
        destinationId: dummyDestinationId,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-10'),
        travellersCount: { adults: 2 },
        budget: { currency: 'NPR', targetAmount: 60000 },
        participants: [
          {
            userId: dummyUserId,
            role: 'owner',
            invitationStatus: 'accepted'
          }
        ]
      });
      await expect(trip.validate()).resolves.toBeUndefined();
    });

    it('rejects when endDate is earlier than startDate', async () => {
      const trip = new Trip({
        title: 'Invalid Dates Trip',
        ownerId: dummyUserId,
        destinationId: dummyDestinationId,
        startDate: new Date('2026-10-10'),
        endDate: new Date('2026-10-01') // Earlier than startDate
      });
      await expect(trip.validate()).rejects.toThrow(/End date must be greater than or equal to start date/);
    });

    it('rejects duplicate participants in the same trip', async () => {
      const trip = new Trip({
        title: 'Duplicate Group Member Trip',
        ownerId: dummyUserId,
        destinationId: dummyDestinationId,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-05'),
        participants: [
          { userId: dummyUserId, role: 'owner' },
          { userId: dummyUserId, role: 'editor' } // Duplicate userId
        ]
      });
      await expect(trip.validate()).rejects.toThrow(/Duplicate participants are not allowed in the same trip/);
    });
  });

  describe('ItineraryDay Model', () => {
    it('validates a valid itinerary day', async () => {
      const day = new ItineraryDay({
        tripId: dummyTripId,
        dayNumber: 1,
        calendarDate: new Date('2026-10-01'),
        title: 'Arrival and Lakeside Walk',
        estimatedExpenditure: 3500,
        travelDistanceKm: 12
      });
      await expect(day.validate()).resolves.toBeUndefined();
    });

    it('rejects invalid dayNumber (< 1)', async () => {
      const day = new ItineraryDay({
        tripId: dummyTripId,
        dayNumber: 0, // Invalid: must be >= 1
        calendarDate: new Date('2026-10-01')
      });
      await expect(day.validate()).rejects.toThrow(/Day number must be at least 1/);
    });
  });

  describe('Activity Model', () => {
    it('validates a valid sequenced activity', async () => {
      const activity = new Activity({
        itineraryDayId: dummyDayId,
        tripId: dummyTripId,
        placeId: dummyPlaceId,
        title: 'Sunrise at Sarangkot Viewpoint',
        startTime: '05:30',
        endTime: '07:30',
        durationMinutes: 120,
        sequence: 1,
        status: 'planned'
      });
      await expect(activity.validate()).resolves.toBeUndefined();
    });

    it('rejects invalid time format and duration', async () => {
      const activity = new Activity({
        itineraryDayId: dummyDayId,
        tripId: dummyTripId,
        placeId: dummyPlaceId,
        title: 'Invalid Activity',
        startTime: '25:99', // Invalid time
        durationMinutes: 2, // Less than 5 min min
        sequence: 1
      });
      let error;
      try {
        await activity.validate();
      } catch (err) {
        error = err;
      }
      expect(error.errors.startTime).toBeDefined();
      expect(error.errors.durationMinutes).toBeDefined();
    });
  });
});

