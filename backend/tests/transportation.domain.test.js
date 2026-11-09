import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import {
  TRANSPORT_MODE_ENUM,
  TRANSPORT_NODE_TYPE_ENUM,
  CURRENCY_ENUM,
  FARE_TIER_ENUM,
  DATA_FRESHNESS_ENUM,
  LEG_STATUS_ENUM,
  ROUTE_CATEGORY_ENUM,
  RouteOption,
  validateTransportNode,
  validateFareBreakdown,
  validateTransitLeg,
  TransportationProviderAdapter
} from '../src/modules/transportation/index.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gantavya_transport_test';

describe('Sub-Milestone 2.4.1: Unified Transportation Domain Model & Validation', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      });
    }
    await RouteOption.deleteMany({});
  });

  afterAll(async () => {
    await RouteOption.deleteMany({});
    await mongoose.disconnect();
  });

  // ==========================================
  // SECTION 1: DOMAIN ENUM & VALIDATOR INTEGRITY
  // ==========================================

  describe('1. Domain Enums & Validation Helpers', () => {
    it('defines comprehensive transportation modes and node types', () => {
      expect(TRANSPORT_MODE_ENUM).toContain('walking');
      expect(TRANSPORT_MODE_ENUM).toContain('road_driving');
      expect(TRANSPORT_MODE_ENUM).toContain('road_cab');
      expect(TRANSPORT_MODE_ENUM).toContain('bus');
      expect(TRANSPORT_MODE_ENUM).toContain('rail');
      expect(TRANSPORT_MODE_ENUM).toContain('air');

      expect(TRANSPORT_NODE_TYPE_ENUM).toContain('airport');
      expect(TRANSPORT_NODE_TYPE_ENUM).toContain('rail_station');
      expect(TRANSPORT_NODE_TYPE_ENUM).toContain('coordinates');
    });

    it('validates a correct TransportNode', () => {
      const validNode = {
        nodeId: 'node_delhi_airport',
        name: 'Indira Gandhi International Airport',
        nodeType: 'airport',
        code: 'DEL',
        coordinates: [77.1000, 28.5562],
        city: 'New Delhi',
        country: 'India',
        timezone: 'Asia/Kolkata',
        terminalOrPlatform: 'Terminal 3'
      };

      const result = validateTransportNode(validNode);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('rejects TransportNode with invalid geographic coordinates', () => {
      const invalidNode = {
        nodeId: 'node_invalid_coords',
        name: 'Out of Bounds Waypoint',
        coordinates: [195.0, 95.0] // Lng > 180, Lat > 90
      };

      const result = validateTransportNode(invalidNode);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('longitude'))).toBe(true);
      expect(result.errors.some((e) => e.includes('latitude'))).toBe(true);
    });

    it('rejects TransportNode with missing ID or name', () => {
      const result = validateTransportNode({ coordinates: [77.2, 28.6] });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('ID is required'))).toBe(true);
      expect(result.errors.some((e) => e.includes('name is required'))).toBe(true);
    });

    it('validates correct FareBreakdown with confirmed price', () => {
      const validFare = {
        baseAmount: 3500,
        currency: 'INR',
        fareTier: 'economy',
        isEstimated: false,
        taxesAndFees: 450,
        totalAmount: 3950,
        pricingSource: 'amadeus_gds'
      };

      const result = validateFareBreakdown(validFare);
      expect(result.isValid).toBe(true);
    });

    it('validates estimated FareBreakdown', () => {
      const estimatedFare = {
        baseAmount: 1200,
        currency: 'INR',
        fareTier: 'standard',
        isEstimated: true,
        taxesAndFees: 0,
        totalAmount: 1200,
        pricingSource: 'distance_heuristic'
      };

      const result = validateFareBreakdown(estimatedFare);
      expect(result.isValid).toBe(true);
    });

    it('rejects FareBreakdown with unsupported currency or total less than base', () => {
      const invalidFare = {
        baseAmount: 2000,
        currency: 'XYZ', // Unsupported
        totalAmount: 1500 // Total < Base
      };

      const result = validateFareBreakdown(invalidFare);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unsupported currency'))).toBe(true);
      expect(result.errors.some((e) => e.includes('cannot be less than base amount'))).toBe(true);
    });
  });

  // ==========================================
  // SECTION 2: MULTIMODAL LEGS (ROAD, RAIL, AIR)
  // ==========================================

  describe('2. Multimodal Transit Leg Validations', () => {
    it('validates a road transit leg with tolls and live traffic data', () => {
      const roadLeg = {
        legId: 'leg_road_delhi_agra',
        mode: 'road_cab',
        origin: {
          nodeId: 'node_cp_delhi',
          name: 'Connaught Place',
          nodeType: 'coordinates',
          coordinates: [77.2167, 28.6328],
          city: 'New Delhi'
        },
        destination: {
          nodeId: 'node_taj_agra',
          name: 'Taj Mahal East Gate',
          nodeType: 'landmark',
          coordinates: [78.0421, 27.1751],
          city: 'Agra'
        },
        departureTime: '2026-11-20T07:00:00.000Z',
        arrivalTime: '2026-11-20T10:30:00.000Z',
        durationMinutes: 210,
        distanceMeters: 235000,
        carrier: {
          name: 'Intercity Cab Provider',
          code: 'CAB',
          identifier: 'Yamuna Expressway Taxi'
        },
        fare: {
          baseAmount: 3200,
          currency: 'INR',
          fareTier: 'standard',
          isEstimated: false,
          taxesAndFees: 160,
          totalAmount: 3360
        },
        additionalCosts: [
          {
            costType: 'toll',
            amount: 415,
            currency: 'INR',
            description: 'Yamuna Expressway FASTag Toll'
          }
        ],
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'realtime',
          source: 'here_routing_v8',
          confidenceScore: 0.95
        },
        bookingInfo: {
          bookingUrl: 'https://example.com/book-cab',
          isBookableOnline: true
        }
      };

      const result = validateTransitLeg(roadLeg);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('validates a rail transit leg with station codes and seat class', () => {
      const railLeg = {
        legId: 'leg_rail_vb_express',
        mode: 'rail',
        origin: {
          nodeId: 'node_stn_ndls',
          name: 'New Delhi Railway Station',
          nodeType: 'rail_station',
          code: 'NDLS',
          coordinates: [77.2197, 28.6431],
          city: 'New Delhi',
          terminalOrPlatform: 'Platform 1'
        },
        destination: {
          nodeId: 'node_stn_bsb',
          name: 'Varanasi Junction',
          nodeType: 'rail_station',
          code: 'BSB',
          coordinates: [82.9863, 25.3284],
          city: 'Varanasi',
          terminalOrPlatform: 'Platform 5'
        },
        departureTime: '2026-11-20T06:00:00.000Z',
        arrivalTime: '2026-11-20T14:00:00.000Z',
        durationMinutes: 480,
        distanceMeters: 759000,
        carrier: {
          name: 'Indian Railways',
          code: 'NR',
          identifier: '22436 Vande Bharat Express'
        },
        fare: {
          baseAmount: 1750,
          currency: 'INR',
          fareTier: 'chair_car',
          isEstimated: false,
          taxesAndFees: 0,
          totalAmount: 1750,
          pricingSource: 'irctc_published_tariff'
        },
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'scheduled',
          source: 'indian_rail_gtfs_schedule',
          confidenceScore: 0.98
        }
      };

      const result = validateTransitLeg(railLeg);
      expect(result.isValid).toBe(true);
    });

    it('validates an air transit leg with airport codes, layovers and baggage fees', () => {
      const airLeg = {
        legId: 'leg_air_del_bom',
        mode: 'air',
        origin: {
          nodeId: 'node_del_airport',
          name: 'Indira Gandhi International Airport',
          nodeType: 'airport',
          code: 'DEL',
          coordinates: [77.1000, 28.5562],
          terminalOrPlatform: 'T3'
        },
        destination: {
          nodeId: 'node_bom_airport',
          name: 'Chhatrapati Shivaji Maharaj International Airport',
          nodeType: 'airport',
          code: 'BOM',
          coordinates: [72.8679, 19.0896],
          terminalOrPlatform: 'T2'
        },
        departureTime: '2026-11-20T09:00:00.000Z',
        arrivalTime: '2026-11-20T11:15:00.000Z',
        durationMinutes: 135,
        distanceMeters: 1150000,
        carrier: {
          name: 'IndiGo Airlines',
          code: '6E',
          identifier: '6E-205'
        },
        fare: {
          baseAmount: 4800,
          currency: 'INR',
          fareTier: 'economy',
          isEstimated: false,
          taxesAndFees: 620,
          totalAmount: 5420,
          pricingSource: 'amadeus_flight_offers_v2'
        },
        additionalCosts: [
          {
            costType: 'baggage',
            amount: 500,
            currency: 'INR',
            description: 'Excess baggage 5kg'
          }
        ],
        transferInfo: {
          transferType: 'cross_terminal',
          bufferDurationMinutes: 120,
          requiresSecurityClearance: true,
          notes: 'Allow 2 hours for domestic baggage reclaim and check-in'
        },
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'realtime',
          source: 'amadeus_gds',
          confidenceScore: 1.0
        }
      };

      const result = validateTransitLeg(airLeg);
      expect(result.isValid).toBe(true);
    });

    it('rejects leg when arrivalTime is earlier than or equal to departureTime', () => {
      const invalidTimingLeg = {
        legId: 'leg_invalid_timing',
        mode: 'road_driving',
        origin: { nodeId: 'o1', name: 'Start', coordinates: [77.1, 28.5] },
        destination: { nodeId: 'd1', name: 'End', coordinates: [77.2, 28.6] },
        departureTime: '2026-11-20T10:00:00.000Z',
        arrivalTime: '2026-11-20T09:00:00.000Z', // Arrival before departure
        durationMinutes: 60,
        distanceMeters: 10000,
        fare: { baseAmount: 200, totalAmount: 200 },
        dataFreshness: { source: 'test' }
      };

      const result = validateTransitLeg(invalidTimingLeg);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Arrival time must be strictly after'))).toBe(true);
    });

    it('rejects leg with missing fare or invalid confidence score', () => {
      const invalidDataLeg = {
        legId: 'leg_missing_fare',
        mode: 'walking',
        origin: { nodeId: 'o1', name: 'Start', coordinates: [77.1, 28.5] },
        destination: { nodeId: 'd1', name: 'End', coordinates: [77.2, 28.6] },
        departureTime: '2026-11-20T10:00:00.000Z',
        arrivalTime: '2026-11-20T10:15:00.000Z',
        durationMinutes: 15,
        distanceMeters: 1000,
        fare: null, // missing fare
        dataFreshness: { source: 'test', confidenceScore: 1.5 } // invalid confidence > 1.0
      };

      const result = validateTransitLeg(invalidDataLeg);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Fare breakdown is required'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Confidence score must be a number between 0.0 and 1.0'))).toBe(true);
    });
  });

  // ==========================================
  // SECTION 3: MONGOOSE MODEL PERSISTENCE & COMPOUND QUERIES
  // ==========================================

  describe('3. MongoDB RouteOption Schema Persistence', () => {
    it('successfully persists and retrieves a full multimodal RouteOption', async () => {
      const routeData = {
        routeId: 'route_opt_test_001',
        tripId: new mongoose.Types.ObjectId(),
        origin: {
          nodeId: 'node_home',
          name: 'Home Address',
          coordinates: [77.2000, 28.6000]
        },
        destination: {
          nodeId: 'node_resort',
          name: 'Goa Coastal Resort',
          coordinates: [73.7400, 15.5200]
        },
        departureTime: new Date('2026-11-20T06:00:00.000Z'),
        arrivalTime: new Date('2026-11-20T12:00:00.000Z'),
        totalDurationMinutes: 360,
        totalDistanceMeters: 1850000,
        totalMonetaryCost: {
          amount: 6200,
          currency: 'INR',
          isEstimated: false
        },
        numberOfTransfers: 2,
        totalWaitingTimeMinutes: 110,
        convenienceScore: 8.5,
        reliabilityScore: 9.0,
        rankingCategory: 'fastest',
        recommendationReason: 'Door-to-door flight option saving 16 hours over rail.',
        legs: [
          {
            legId: 'leg_1_cab',
            mode: 'road_cab',
            origin: { nodeId: 'node_home', name: 'Home Address', coordinates: [77.2000, 28.6000] },
            destination: { nodeId: 'node_del_t3', name: 'DEL Airport T3', coordinates: [77.1000, 28.5562] },
            departureTime: new Date('2026-11-20T06:00:00.000Z'),
            arrivalTime: new Date('2026-11-20T06:45:00.000Z'),
            durationMinutes: 45,
            distanceMeters: 18000,
            fare: { baseAmount: 450, totalAmount: 450, currency: 'INR' },
            dataFreshness: { source: 'here_routing', freshnessLevel: 'realtime', confidenceScore: 0.95 }
          },
          {
            legId: 'leg_2_flight',
            mode: 'air',
            origin: { nodeId: 'node_del_t3', name: 'DEL Airport T3', coordinates: [77.1000, 28.5562], code: 'DEL' },
            destination: { nodeId: 'node_goi_t1', name: 'Dabolim Airport', coordinates: [73.8314, 15.3808], code: 'GOI' },
            departureTime: new Date('2026-11-20T08:30:00.000Z'),
            arrivalTime: new Date('2026-11-20T11:00:00.000Z'),
            durationMinutes: 150,
            distanceMeters: 1500000,
            carrier: { name: 'Air India', code: 'AI', identifier: 'AI-860' },
            fare: { baseAmount: 4500, totalAmount: 4950, taxesAndFees: 450, currency: 'INR' },
            dataFreshness: { source: 'amadeus_flight_offers', freshnessLevel: 'realtime', confidenceScore: 1.0 }
          },
          {
            legId: 'leg_3_cab',
            mode: 'road_cab',
            origin: { nodeId: 'node_goi_t1', name: 'Dabolim Airport', coordinates: [73.8314, 15.3808] },
            destination: { nodeId: 'node_resort', name: 'Goa Coastal Resort', coordinates: [73.7400, 15.5200] },
            departureTime: new Date('2026-11-20T11:15:00.000Z'),
            arrivalTime: new Date('2026-11-20T12:00:00.000Z'),
            durationMinutes: 45,
            distanceMeters: 32000,
            fare: { baseAmount: 800, totalAmount: 800, currency: 'INR' },
            dataFreshness: { source: 'local_cab_tariff', freshnessLevel: 'scheduled', confidenceScore: 0.9 }
          }
        ]
      };

      const savedRoute = await RouteOption.create(routeData);
      expect(savedRoute._id).toBeDefined();
      expect(savedRoute.routeId).toBe('route_opt_test_001');
      expect(savedRoute.legs.length).toBe(3);
      expect(savedRoute.totalMonetaryCost.amount).toBe(6200);

      // Query by compound index { tripId, rankingCategory }
      const retrieved = await RouteOption.findOne({
        tripId: routeData.tripId,
        rankingCategory: 'fastest'
      });
      expect(retrieved).not.toBeNull();
      expect(retrieved.routeId).toBe('route_opt_test_001');
      expect(retrieved.legs[1].carrier.identifier).toBe('AI-860');
    });

    it('Mongoose schema rejects RouteOption where arrivalTime <= departureTime', async () => {
      const invalidTimingDoc = {
        routeId: 'route_opt_err_timing',
        origin: { nodeId: 'o1', name: 'Start', coordinates: [77.1, 28.5] },
        destination: { nodeId: 'd1', name: 'End', coordinates: [77.2, 28.6] },
        departureTime: new Date('2026-11-20T12:00:00.000Z'),
        arrivalTime: new Date('2026-11-20T10:00:00.000Z'), // invalid
        totalDurationMinutes: 60,
        totalDistanceMeters: 10000,
        totalMonetaryCost: { amount: 500, currency: 'INR' },
        legs: [
          {
            legId: 'leg_err',
            mode: 'road_driving',
            origin: { nodeId: 'o1', name: 'Start', coordinates: [77.1, 28.5] },
            destination: { nodeId: 'd1', name: 'End', coordinates: [77.2, 28.6] },
            departureTime: new Date('2026-11-20T10:00:00.000Z'),
            arrivalTime: new Date('2026-11-20T11:00:00.000Z'),
            durationMinutes: 60,
            distanceMeters: 10000,
            fare: { baseAmount: 500, totalAmount: 500 },
            dataFreshness: { source: 'test' }
          }
        ]
      };

      await expect(RouteOption.create(invalidTimingDoc)).rejects.toThrow();
    });

    it('Mongoose schema rejects RouteOption without legs', async () => {
      const invalidNoLegs = {
        routeId: 'route_opt_err_no_legs',
        origin: { nodeId: 'o1', name: 'Start', coordinates: [77.1, 28.5] },
        destination: { nodeId: 'd1', name: 'End', coordinates: [77.2, 28.6] },
        departureTime: new Date('2026-11-20T08:00:00.000Z'),
        arrivalTime: new Date('2026-11-20T10:00:00.000Z'),
        totalDurationMinutes: 120,
        totalDistanceMeters: 20000,
        totalMonetaryCost: { amount: 800, currency: 'INR' },
        legs: [] // Empty
      };

      await expect(RouteOption.create(invalidNoLegs)).rejects.toThrow();
    });
  });

  // ==========================================
  // SECTION 4: MODULAR MONOLITH API ENDPOINTS
  // ==========================================

  describe('4. Modular Monolith Routes & Controller', () => {
    it('GET /api/v1/transportation/status returns 200 with module metadata', async () => {
      const res = await request(app).get('/api/v1/transportation/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.module).toBe('transportation');
      expect(res.body.data.supportedModes).toContain('rail');
      expect(res.body.data.supportedModes).toContain('air');
    });

    it('POST /api/v1/transportation/validate-leg validates valid transit leg payload', async () => {
      const validPayload = {
        legId: 'leg_api_test',
        mode: 'rail',
        origin: { nodeId: 'n1', name: 'Delhi', coordinates: [77.2, 28.6] },
        destination: { nodeId: 'n2', name: 'Agra', coordinates: [78.0, 27.1] },
        departureTime: '2026-11-20T08:00:00.000Z',
        arrivalTime: '2026-11-20T10:00:00.000Z',
        durationMinutes: 120,
        distanceMeters: 200000,
        fare: { baseAmount: 500, totalAmount: 500, currency: 'INR' },
        dataFreshness: { source: 'test', confidenceScore: 1.0 }
      };

      const res = await request(app)
        .post('/api/v1/transportation/validate-leg')
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.data.validated).toBe(true);
    });

    it('POST /api/v1/transportation/validate-leg returns 422 with validation errors for invalid payload', async () => {
      const invalidPayload = {
        legId: '',
        mode: 'space_rocket', // invalid mode
        origin: null
      };

      const res = await request(app)
        .post('/api/v1/transportation/validate-leg')
        .send(invalidPayload);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.some((e) => e.includes('Transit leg ID is required'))).toBe(true);
      expect(res.body.errors.some((e) => e.includes('Valid transport mode is required'))).toBe(true);
    });
  });

  // ==========================================
  // SECTION 5: PROVIDER ADAPTER INTERFACE
  // ==========================================

  describe('5. Provider Abstraction Interface', () => {
    it('throws when attempting to instantiate abstract TransportationProviderAdapter directly', () => {
      expect(() => {
        new TransportationProviderAdapter('GenericProvider', ['road_driving']);
      }).toThrow(/abstract interface and cannot be instantiated directly/);
    });

    it('allows concrete subclass implementation and enforces interface methods', async () => {
      class MockHereAdapter extends TransportationProviderAdapter {
        constructor() {
          super('HERE_Routing', ['road_driving', 'road_cab']);
        }
        async searchLegs() {
          return [{ legId: 'leg_mock_here' }];
        }
        normalizeResponse() {
          return { normalized: true };
        }
        async healthCheck() {
          return { status: 'ok', reachable: true };
        }
      }

      const adapter = new MockHereAdapter();
      expect(adapter.providerName).toBe('HERE_Routing');
      expect(adapter.supportedModes).toContain('road_driving');
      const legs = await adapter.searchLegs();
      expect(legs.length).toBe(1);
      const health = await adapter.healthCheck();
      expect(health.reachable).toBe(true);
    });
  });
});

