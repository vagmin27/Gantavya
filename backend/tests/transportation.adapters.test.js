import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import {
  HereRoadAdapter,
  AmadeusFlightAdapter,
  IndianRailwaysAdapter,
  TransitCache,
  TransitCacheService,
  CACHE_TTL_SECONDS,
  TransportationProviderService,
  validateTransitLeg
} from '../src/modules/transportation/index.js';
import { ResilientHttpClient, HttpError } from '../src/utils/http-client.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gantavya_transport_adapters_test';

describe('Sub-Milestone 2.4.2: External Transportation Provider Adapters & MongoDB Caching', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      });
    }
    await TransitCache.deleteMany({});
  });

  afterAll(async () => {
    await TransitCache.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await TransitCache.deleteMany({});
  });

  // Mock Transport Nodes
  const delhiNode = {
    nodeId: 'node_delhi_hub',
    name: 'New Delhi National Capital Region',
    nodeType: 'airport',
    code: 'DEL',
    coordinates: [77.1000, 28.5562] // [lng, lat]
  };

  const mumbaiNode = {
    nodeId: 'node_mumbai_hub',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    nodeType: 'airport',
    code: 'BOM',
    coordinates: [72.8777, 19.0760] // [lng, lat]
  };

  const agraNode = {
    nodeId: 'node_agra_hub',
    name: 'Agra City Center',
    nodeType: 'coordinates',
    code: 'AGC',
    coordinates: [78.0081, 27.1767]
  };

  // ========================================================
  // 1. RESILIENT HTTP CLIENT & RELIABILITY SPECIFICATIONS
  // ========================================================

  describe('1. Resilient HTTP Client & Reliability', () => {
    it('successfully completes HTTP requests on 200 OK', async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, message: 'All systems operational' })
      });

      const client = new ResilientHttpClient({ fetchFn: mockFetch });
      const data = await client.getJson('https://api.example.com/status');
      expect(data.success).toBe(true);
      expect(data.message).toBe('All systems operational');
    });

    it('retries on retryable 503 Service Unavailable and succeeds when server recovers', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Temporarily Unavailable',
            headers: new Headers(),
            text: async () => 'Rate limit cooldown'
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ recovered: true })
        };
      };

      const client = new ResilientHttpClient({
        fetchFn: mockFetch,
        maxRetries: 2,
        baseDelayMs: 10,
        jitterMs: 5
      });

      const result = await client.getJson('https://api.example.com/resilience');
      expect(callCount).toBe(2);
      expect(result.recovered).toBe(true);
    });

    it('immediately rejects on non-retryable 401 Unauthorized without retries', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers(),
          text: async () => 'Invalid API credentials'
        };
      };

      const client = new ResilientHttpClient({
        fetchFn: mockFetch,
        maxRetries: 3,
        baseDelayMs: 10
      });

      await expect(client.getJson('https://api.example.com/secure')).rejects.toThrow(/HTTP 401/);
      expect(callCount).toBe(1); // Never retry 401
    });

    it('immediately rejects on non-retryable 422 Unprocessable Entity without retries', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        return {
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: new Headers(),
          text: async () => 'Malformed coordinates'
        };
      };

      const client = new ResilientHttpClient({
        fetchFn: mockFetch,
        maxRetries: 2,
        baseDelayMs: 10
      });

      await expect(client.getJson('https://api.example.com/validate')).rejects.toThrow(/HTTP 422/);
      expect(callCount).toBe(1);
    });

    it('sanitizes API keys and sensitive tokens in sanitized URL strings', () => {
      const client = new ResilientHttpClient();
      const rawUrl = 'https://router.hereapi.com/v8/routes?apiKey=super_secret_key_12345&transportMode=car';
      const sanitized = client.sanitizeUrl(rawUrl);
      expect(sanitized).not.toContain('super_secret_key_12345');
      expect(sanitized).toContain('apiKey=REDACTED');
    });
  });

  // ========================================================
  // 2. MONGODB TTL CACHING SPECIFICATIONS (ZERO REDIS)
  // ========================================================

  describe('2. MongoDB TTL Transit Caching', () => {
    it('defines correct TTL constants for all transportation modes', () => {
      expect(CACHE_TTL_SECONDS.road).toBe(3600); // 1 hour
      expect(CACHE_TTL_SECONDS.air).toBe(10800); // 3 hours
      expect(CACHE_TTL_SECONDS.rail_static).toBe(604800); // 7 days
      expect(CACHE_TTL_SECONDS.rail_live).toBe(7200); // 2 hours
      expect(CACHE_TTL_SECONDS.bus).toBe(14400); // 4 hours
    });

    it('deterministically generates identical SHA-256 cache keys for equivalent queries', () => {
      const depDate = new Date('2026-12-15T09:00:00Z');
      const key1 = TransitCacheService.generateCacheKey({
        provider: 'here',
        mode: 'road_driving',
        origin: delhiNode,
        destination: agraNode,
        departureDate: depDate,
        options: { alternatives: 2 }
      });

      const key2 = TransitCacheService.generateCacheKey({
        provider: 'HERE',
        mode: 'road_driving',
        origin: { ...delhiNode },
        destination: { ...agraNode },
        departureDate: depDate,
        options: { alternatives: 2 }
      });

      expect(typeof key1).toBe('string');
      expect(key1.length).toBe(64); // SHA-256 hex string length
      expect(key1).toBe(key2);
    });

    it('returns null on cache miss', async () => {
      const result = await TransitCacheService.get('non_existent_cache_key_sha256');
      expect(result).toBeNull();
    });

    it('stores and retrieves normalized legs in MongoDB with TTL expiration', async () => {
      const depDate = new Date('2026-12-20T10:00:00Z');
      const params = {
        provider: 'here',
        mode: 'road_driving',
        origin: delhiNode,
        destination: agraNode,
        departureDate: depDate
      };

      const mockLeg = {
        legId: 'leg_cached_test_1',
        mode: 'road_driving',
        origin: delhiNode,
        destination: agraNode,
        departureTime: depDate,
        arrivalTime: new Date(depDate.getTime() + 180 * 60 * 1000),
        durationMinutes: 180,
        distanceMeters: 230000,
        carrier: { name: 'Personal Vehicle', code: 'ROAD', identifier: 'NH-44' },
        fare: { baseAmount: 1800, totalAmount: 2215, taxesAndFees: 415, currency: 'INR', fareTier: 'standard', isEstimated: true },
        additionalCosts: [{ costType: 'toll', amount: 415, currency: 'INR', description: 'FASTag' }],
        transferInfo: null,
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'realtime',
          source: 'here_routing_v8',
          confidenceScore: 0.95,
          lastFetchedAt: new Date(),
          validUntil: new Date(Date.now() + 3600 * 1000)
        },
        bookingInfo: { isBookableOnline: false }
      };

      const cacheResult = await TransitCacheService.set(params, [mockLeg], {
        ttlSeconds: 3600,
        dataFreshness: { freshnessLevel: 'realtime', source: 'here_routing_v8', confidenceScore: 0.95 }
      });

      expect(cacheResult).toBeDefined();
      expect(cacheResult.cacheKey).toBeDefined();

      // Retrieve from cache
      const cached = await TransitCacheService.get(cacheResult.cacheKey);
      expect(cached).not.toBeNull();
      expect(cached.legs).toHaveLength(1);
      expect(cached.legs[0].legId).toBe('leg_cached_test_1');
      expect(cached.legs[0].distanceMeters).toBe(230000);
      expect(cached.dataFreshness.fromCache).toBe(true);
    });

    it('getOrFetch executes fetchFn on miss and returns cached on second call', async () => {
      let fetchCount = 0;
      const params = {
        provider: 'amadeus',
        mode: 'air',
        origin: delhiNode,
        destination: mumbaiNode,
        departureDate: new Date('2026-12-22T08:00:00Z')
      };

      const mockFetchFn = async () => {
        fetchCount++;
        return [
          {
            legId: 'leg_air_fetch_1',
            mode: 'air',
            origin: delhiNode,
            destination: mumbaiNode,
            departureTime: new Date(),
            arrivalTime: new Date(Date.now() + 130 * 60 * 1000),
            durationMinutes: 130,
            distanceMeters: 1150000,
            carrier: { name: 'IndiGo Airlines', code: '6E', identifier: '6E-501' },
            fare: { baseAmount: 3800, totalAmount: 3800, taxesAndFees: 0, currency: 'INR', fareTier: 'economy', isEstimated: false },
            additionalCosts: [],
            availabilityStatus: 'scheduled',
            dataFreshness: { freshnessLevel: 'realtime', source: 'amadeus_flight_offers_v2' }
          }
        ];
      };

      // Call 1: Cache Miss -> fetcher called
      const firstResult = await TransitCacheService.getOrFetch(params, mockFetchFn);
      expect(firstResult.isCached).toBe(false);
      expect(firstResult.legs).toHaveLength(1);
      expect(fetchCount).toBe(1);

      // Call 2: Cache Hit -> fetcher not called
      const secondResult = await TransitCacheService.getOrFetch(params, mockFetchFn);
      expect(secondResult.isCached).toBe(true);
      expect(secondResult.legs).toHaveLength(1);
      expect(fetchCount).toBe(1); // Count unchanged
    });

    it('supports cache invalidation by filter', async () => {
      const params = {
        provider: 'indian_railways',
        mode: 'rail',
        origin: delhiNode,
        destination: agraNode,
        departureDate: new Date('2026-12-25')
      };

      await TransitCacheService.set(params, [{ legId: 'test_rail_1' }], { ttlSeconds: 604800 });
      const beforeDelete = await TransitCache.countDocuments({ provider: 'indian_railways' });
      expect(beforeDelete).toBe(1);

      await TransitCacheService.invalidate({ provider: 'indian_railways' });
      const afterDelete = await TransitCache.countDocuments({ provider: 'indian_railways' });
      expect(afterDelete).toBe(0);
    });
  });

  // ========================================================
  // 3. HERE ROAD PROVIDER ADAPTER SPECIFICATIONS
  // ========================================================

  describe('3. HERE Road Provider Adapter', () => {
    it('correctly reports configuration and health check', async () => {
      const unconfiguredAdapter = new HereRoadAdapter({ apiKey: '' });
      expect(unconfiguredAdapter.isConfigured()).toBe(false);

      const health = await unconfiguredAdapter.healthCheck();
      expect(health.status).toBe('unconfigured');
      expect(health.reachable).toBe(false);

      const configuredAdapter = new HereRoadAdapter({ apiKey: 'mock_here_api_key_valid' });
      expect(configuredAdapter.isConfigured()).toBe(true);
      const configuredHealth = await configuredAdapter.healthCheck();
      expect(configuredHealth.status).toBe('configured');
      expect(configuredHealth.reachable).toBe(true);
    });

    it('generates heuristic fallback leg when unconfigured without crashing', async () => {
      const adapter = new HereRoadAdapter({ apiKey: '' });
      const legs = await adapter.searchLegs(delhiNode, agraNode, new Date('2026-12-15T08:00:00Z'));

      expect(legs).toHaveLength(1);
      const leg = legs[0];
      expect(leg.mode).toBe('road_driving');
      expect(leg.distanceMeters).toBeGreaterThan(150000); // Delhi-Agra > 150 km
      expect(leg.durationMinutes).toBeGreaterThan(100);
      expect(leg.dataFreshness.freshnessLevel).toBe('historical_estimate');
      expect(leg.dataFreshness.source).toBe('here_heuristic_fallback');

      const validation = validateTransitLeg(leg);
      expect(validation.isValid).toBe(true);
    });

    it('normalizes mock HERE Routing v8 response with tolls and polyline', () => {
      const mockHereResponse = {
        routes: [
          {
            id: 'route_delhi_agra_yamuna_exp',
            sections: [
              {
                id: 'sec_1',
                type: 'vehicle',
                summary: {
                  duration: 10800, // 3 hours (180 mins)
                  length: 215000, // 215 km
                  baseDuration: 10200
                },
                polyline: 'mock_encoded_flexible_polyline_string_xyz',
                tolls: [
                  {
                    fares: [
                      {
                        price: { value: 415, currency: 'INR' },
                        type: 'toll',
                        paymentMethods: ['transponder', 'cash']
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const adapter = new HereRoadAdapter({ apiKey: 'test_key' });
      const depDate = new Date('2026-12-10T07:00:00Z');

      const legs = adapter.normalizeResponse(mockHereResponse, {
        originNode: delhiNode,
        destinationNode: agraNode,
        departureTime: depDate,
        mode: 'road_driving'
      });

      expect(legs).toHaveLength(1);
      const leg = legs[0];
      expect(leg.durationMinutes).toBe(180);
      expect(leg.distanceMeters).toBe(215000);
      expect(leg.polyline).toBe('mock_encoded_flexible_polyline_string_xyz');

      // Toll verification
      expect(leg.additionalCosts).toHaveLength(1);
      expect(leg.additionalCosts[0].costType).toBe('toll');
      expect(leg.additionalCosts[0].amount).toBe(415);
      expect(leg.additionalCosts[0].currency).toBe('INR');

      // Schema compliance validation
      const validation = validateTransitLeg(leg);
      expect(validation.isValid).toBe(true);
    });

    it('handles HERE HTTP API errors gracefully by falling back to heuristic calculation', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 403,
        statusText: 'Forbidden - Invalid API Key',
        headers: new Headers(),
        text: async () => 'Forbidden'
      });

      const client = new ResilientHttpClient({ fetchFn: mockFetch });
      const adapter = new HereRoadAdapter({ apiKey: 'invalid_key', httpClient: client });

      const legs = await adapter.searchLegs(delhiNode, agraNode, new Date());
      expect(legs).toHaveLength(1);
      expect(legs[0].dataFreshness.source).toBe('here_heuristic_fallback');
    });
  });

  // ========================================================
  // 4. AMADEUS FLIGHT PROVIDER ADAPTER SPECIFICATIONS
  // ========================================================

  describe('4. Amadeus Flight Provider Adapter', () => {
    it('correctly reports configuration status', () => {
      const unconfigured = new AmadeusFlightAdapter({ clientId: '', clientSecret: '' });
      expect(unconfigured.isConfigured()).toBe(false);

      const configured = new AmadeusFlightAdapter({ clientId: 'valid_id', clientSecret: 'valid_secret' });
      expect(configured.isConfigured()).toBe(true);
    });

    it('acquires and reuses OAuth 2.0 access token before expiration', async () => {
      let tokenRequestCount = 0;
      const mockFetch = async (url) => {
        if (url.includes('/oauth2/token')) {
          tokenRequestCount++;
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              access_token: `mock_amadeus_token_${tokenRequestCount}`,
              expires_in: 1799,
              state: 'approved'
            })
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      };

      const httpClient = new ResilientHttpClient({ fetchFn: mockFetch });
      const adapter = new AmadeusFlightAdapter({
        clientId: 'mock_client',
        clientSecret: 'mock_secret',
        httpClient
      });

      // Token Call 1
      const token1 = await adapter.getAccessToken();
      expect(token1).toBe('mock_amadeus_token_1');
      expect(tokenRequestCount).toBe(1);

      // Token Call 2: Must reuse cached token without hitting endpoint
      const token2 = await adapter.getAccessToken();
      expect(token2).toBe('mock_amadeus_token_1');
      expect(tokenRequestCount).toBe(1);

      // Force refresh acquires a new token
      const token3 = await adapter.getAccessToken(true);
      expect(token3).toBe('mock_amadeus_token_2');
      expect(tokenRequestCount).toBe(2);
    });

    it('normalizes mock Amadeus flight offers (direct flight)', () => {
      const mockOfferData = {
        data: [
          {
            id: '1',
            price: {
              total: '4500.00',
              base: '3800.00',
              currency: 'INR'
            },
            itineraries: [
              {
                duration: 'PT2H15M',
                segments: [
                  {
                    departure: { iataCode: 'DEL', at: '2026-12-20T08:00:00' },
                    arrival: { iataCode: 'BOM', at: '2026-12-20T10:15:00' },
                    carrierCode: '6E',
                    number: '205'
                  }
                ]
              }
            ],
            travelerPricings: [
              {
                fareDetailsBySegment: [{ cabin: 'ECONOMY' }]
              }
            ]
          }
        ]
      };

      const adapter = new AmadeusFlightAdapter({ clientId: 'id', clientSecret: 'sec' });
      const legs = adapter.normalizeResponse(mockOfferData, {
        originNode: delhiNode,
        destinationNode: mumbaiNode,
        originIata: 'DEL',
        destIata: 'BOM'
      });

      expect(legs).toHaveLength(1);
      const leg = legs[0];
      expect(leg.mode).toBe('air');
      expect(leg.carrier.name).toBe('IndiGo Airlines');
      expect(leg.carrier.identifier).toBe('6E-205');
      expect(leg.durationMinutes).toBe(135);
      expect(leg.fare.baseAmount).toBe(3800);
      expect(leg.fare.currency).toBe('INR');
      expect(leg.fare.isEstimated).toBe(false);

      // Tax & fee verification in additionalCosts
      expect(leg.additionalCosts).toHaveLength(1);
      expect(leg.additionalCosts[0].amount).toBe(700); // 4500 - 3800

      // Booking reference distinct from confirmed booking
      expect(leg.bookingInfo.bookingReference).toBe('OFFER-1');
      expect(leg.bookingInfo.isBookableOnline).toBe(true);

      const validation = validateTransitLeg(leg);
      expect(validation.isValid).toBe(true);
    });

    it('normalizes mock Amadeus connecting flight with layover transfer details', () => {
      const mockConnectingOffer = {
        data: [
          {
            id: 'offer_connecting_1',
            price: { total: '7200.00', base: '6000.00', currency: 'INR' },
            itineraries: [
              {
                segments: [
                  {
                    departure: { iataCode: 'DEL', at: '2026-12-20T06:00:00' },
                    arrival: { iataCode: 'HYD', at: '2026-12-20T08:15:00' },
                    carrierCode: 'AI',
                    number: '840'
                  },
                  {
                    departure: { iataCode: 'HYD', at: '2026-12-20T10:00:00' }, // 1h 45m layover
                    arrival: { iataCode: 'BOM', at: '2026-12-20T11:30:00' },
                    carrierCode: 'AI',
                    number: '652'
                  }
                ]
              }
            ],
            travelerPricings: [{ fareDetailsBySegment: [{ cabin: 'BUSINESS' }] }]
          }
        ]
      };

      const adapter = new AmadeusFlightAdapter({ clientId: 'id', clientSecret: 'sec' });
      const legs = adapter.normalizeResponse(mockConnectingOffer, {
        originNode: delhiNode,
        destinationNode: mumbaiNode,
        originIata: 'DEL',
        destIata: 'BOM'
      });

      expect(legs).toHaveLength(1);
      const leg = legs[0];
      expect(leg.mode).toBe('air');
      expect(leg.fare.fareTier).toBe('business');

      // Transfer details
      expect(leg.transferInfo).toBeDefined();
      expect(leg.transferInfo.transferType).toBe('cross_terminal');
      expect(leg.transferInfo.bufferDurationMinutes).toBe(105); // 105 mins layover
      expect(leg.transferInfo.requiresSecurityClearance).toBe(true);
      expect(leg.intermediateStops).toHaveLength(1);
      expect(leg.intermediateStops[0].code).toBe('HYD');

      const validation = validateTransitLeg(leg);
      expect(validation.isValid).toBe(true);
    });

    it('generates heuristic flight fallback when unconfigured without crashing', async () => {
      const adapter = new AmadeusFlightAdapter({ clientId: '', clientSecret: '' });
      const legs = await adapter.searchLegs(delhiNode, mumbaiNode, new Date('2026-12-15'));
      expect(legs).toHaveLength(1);
      expect(legs[0].mode).toBe('air');
      expect(legs[0].dataFreshness.freshnessLevel).toBe('historical_estimate');

      const validation = validateTransitLeg(legs[0]);
      expect(validation.isValid).toBe(true);
    });
  });

  // ========================================================
  // 5. INDIAN RAILWAYS GTFS ADAPTER (ZERO SCRAPING)
  // ========================================================

  describe('5. Indian Railways Adapter (Zero Scraping Compliant)', () => {
    it('verifies compliance with strict zero scraping policy', async () => {
      const adapter = new IndianRailwaysAdapter();
      const health = await adapter.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.policy).toBe('STRICT_ZERO_SCRAPING_COMPLIANT');
      expect(health.dataSource).toBe('gtfs_static_topology');
    });

    it('resolves Tejas Rajdhani Express (Train 12952) from verified static timetable', async () => {
      const adapter = new IndianRailwaysAdapter();
      const depDate = new Date('2026-12-15T00:00:00Z');

      const delhiStation = {
        nodeId: 'node_ndls',
        name: 'New Delhi Railway Station',
        nodeType: 'rail_station',
        code: 'NDLS',
        coordinates: [77.2195, 28.6431]
      };

      const mumbaiStation = {
        nodeId: 'node_mmct',
        name: 'Mumbai Central',
        nodeType: 'rail_station',
        code: 'MMCT',
        coordinates: [72.8193, 18.9696]
      };

      const legs = await adapter.searchLegs(delhiStation, mumbaiStation, depDate, { fareTier: 'ac_tier_2' });
      expect(legs).toHaveLength(1);

      const leg = legs[0];
      expect(leg.mode).toBe('rail');
      expect(leg.carrier.name).toBe('Indian Railways');
      expect(leg.carrier.identifier).toContain('12952');
      expect(leg.distanceMeters).toBe(1386000); // 1386 km
      expect(leg.durationMinutes).toBe(940); // 15h 40m
      expect(leg.intermediateStops.length).toBeGreaterThanOrEqual(4); // Kota, Ratlam, Vadodara, Surat

      // Data freshness: static timetable has 7-day cache validity
      expect(leg.dataFreshness.freshnessLevel).toBe('scheduled');
      expect(leg.dataFreshness.source).toBe('indian_railways_gtfs_static');

      // Fare calculation check
      expect(leg.fare.fareTier).toBe('ac_tier_2');
      expect(leg.fare.baseAmount).toBeGreaterThan(2500);
      expect(leg.additionalCosts.length).toBeGreaterThan(0);

      const validation = validateTransitLeg(leg);
      expect(validation.isValid).toBe(true);
    });

    it('resolves New Delhi - Varanasi Vande Bharat Express (Train 22436)', async () => {
      const adapter = new IndianRailwaysAdapter();
      const depDate = new Date('2026-12-18T00:00:00Z');

      const delhiStation = {
        nodeId: 'node_ndls',
        name: 'New Delhi',
        code: 'NDLS',
        coordinates: [77.2195, 28.6431]
      };

      const varanasiStation = {
        nodeId: 'node_bsb',
        name: 'Varanasi Junction',
        code: 'BSB',
        coordinates: [82.9860, 25.3268]
      };

      const legs = await adapter.searchLegs(delhiStation, varanasiStation, depDate);
      expect(legs).toHaveLength(1);
      const leg = legs[0];
      expect(leg.carrier.identifier).toContain('22436');
      expect(leg.durationMinutes).toBe(480); // 8 hours
      expect(leg.intermediateStops.some((s) => s.code === 'CNB')).toBe(true);

      const validation = validateTransitLeg(leg);
      expect(validation.isValid).toBe(true);
    });

    it('calculates official telescopic fare tiers for Indian Railways', () => {
      const adapter = new IndianRailwaysAdapter();
      const distanceMeters = 1000000; // 1000 km

      const sleeper = adapter.calculateRailFare(distanceMeters, 'sleeper');
      const ac3 = adapter.calculateRailFare(distanceMeters, 'ac_tier_3');
      const ac2 = adapter.calculateRailFare(distanceMeters, 'ac_tier_2');
      const ac1 = adapter.calculateRailFare(distanceMeters, 'ac_tier_1');

      expect(sleeper.baseAmount).toBeLessThan(ac3.baseAmount);
      expect(ac3.baseAmount).toBeLessThan(ac2.baseAmount);
      expect(ac2.baseAmount).toBeLessThan(ac1.baseAmount);
      expect(ac3.additionalCosts[0].amount).toBeGreaterThan(0); // Reservation fee + superfast + GST
    });
  });

  // ========================================================
  // 6. MULTI-MODAL PROVIDER AGGREGATION & FAULT TOLERANCE
  // ========================================================

  describe('6. Transportation Provider Service & Fault Tolerance', () => {
    it('executes concurrent multi-provider search across all modes', async () => {
      const service = new TransportationProviderService();
      const result = await service.searchTransportation({
        origin: delhiNode,
        destination: mumbaiNode,
        departureDate: new Date('2026-12-20T08:00:00Z')
      });

      expect(result.legs.length).toBeGreaterThanOrEqual(2);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);

      const modesFound = new Set(result.legs.map((l) => l.mode));
      expect(modesFound.has('road_driving') || modesFound.has('air') || modesFound.has('rail')).toBe(true);
    });

    it('respects requested modes filter (e.g. only air and rail)', async () => {
      const service = new TransportationProviderService();
      const result = await service.searchTransportation({
        origin: delhiNode,
        destination: mumbaiNode,
        departureDate: new Date('2026-12-20T08:00:00Z'),
        modes: ['air', 'rail']
      });

      result.legs.forEach((leg) => {
        expect(['air', 'rail']).toContain(leg.mode);
        expect(leg.mode).not.toBe('road_driving');
      });
    });

    it('handles partial provider failure gracefully without crashing the overall search', async () => {
      // Mock a failing flight adapter
      const failingFlightAdapter = {
        providerName: 'amadeus',
        supportedModes: ['air'],
        searchLegs: async () => {
          throw new HttpError('Amadeus Rate Limit Exceeded (HTTP 429)', 429, { isRetryable: true });
        },
        healthCheck: async () => ({ status: 'degraded', reachable: false })
      };

      const healthyRoadAdapter = new HereRoadAdapter({ apiKey: '' }); // Uses valid heuristic fallback

      const service = new TransportationProviderService({
        amadeusAdapter: failingFlightAdapter,
        hereAdapter: healthyRoadAdapter
      });

      const result = await service.searchTransportation({
        origin: delhiNode,
        destination: agraNode,
        departureDate: new Date('2026-12-20')
      });

      // Overall search does NOT throw!
      expect(result.legs.length).toBeGreaterThanOrEqual(1);
      // Warning recorded for amadeus failure
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some((w) => w.provider === 'amadeus')).toBe(true);
    });
  });

  // ========================================================
  // 7. EXPRESS API ROUTES & ENDPOINT CONTRACTS
  // ========================================================

  describe('7. Transportation API Endpoints', () => {
    it('GET /api/v1/transportation/status returns 200 with mongodb_ttl caching backend', async () => {
      const res = await request(app).get('/api/v1/transportation/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cachingBackend).toBe('mongodb_ttl');
      expect(res.body.data.supportedModes).toContain('road_driving');
      expect(res.body.data.supportedModes).toContain('rail');
      expect(res.body.data.supportedModes).toContain('air');
    });

    it('GET /api/v1/transportation/providers/status reports health of all adapters', async () => {
      const res = await request(app).get('/api/v1/transportation/providers/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers.here).toBeDefined();
      expect(res.body.data.providers.amadeus).toBeDefined();
      expect(res.body.data.providers.indian_railways).toBeDefined();
      expect(res.body.data.providers.indian_railways.policy).toBe('STRICT_ZERO_SCRAPING_COMPLIANT');
      expect(res.body.data.cache.backend).toBe('mongodb_ttl');
    });

    it('POST /api/v1/transportation/search rejects invalid transport nodes with 422', async () => {
      const res = await request(app)
        .post('/api/v1/transportation/search')
        .send({
          origin: { nodeId: '' }, // Missing name and coordinates
          destination: delhiNode
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid origin transport node');
    });

    it('POST /api/v1/transportation/search performs search and leverages cache on repeat call', async () => {
      const payload = {
        origin: delhiNode,
        destination: agraNode,
        departureDate: '2026-12-25T08:00:00Z',
        modes: ['road_driving', 'rail']
      };

      // Call 1: fresh search
      const res1 = await request(app).post('/api/v1/transportation/search').send(payload);
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.legs.length).toBeGreaterThan(0);
      expect(res1.body.data.cacheHits).toBe(0);

      // Call 2: repeat query -> should hit MongoDB TTL cache
      const res2 = await request(app).post('/api/v1/transportation/search').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.cacheHits).toBeGreaterThan(0);
    });

    it('POST /api/v1/transportation/cache/purge clears cached entries', async () => {
      const res = await request(app).post('/api/v1/transportation/cache/purge').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.acknowledged).toBe(true);
    });
  });
});
