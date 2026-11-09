import { TransportationProviderAdapter } from '../provider-adapter.interface.js';
import { defaultHttpClient, HttpError } from '../../../utils/http-client.js';
import { env } from '../../../config/env.js';

export const AIRLINE_NAMES = {
  '6E': 'IndiGo Airlines',
  AI: 'Air India',
  UK: 'Vistara',
  SG: 'SpiceJet',
  QP: 'Akasa Air',
  I5: 'Air India Express',
  BA: 'British Airways',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  LH: 'Lufthansa',
  SQ: 'Singapore Airlines'
};

export class AmadeusFlightAdapter extends TransportationProviderAdapter {
  constructor(options = {}) {
    super('amadeus', ['air']);
    this.clientId = options.clientId ?? env.AMADEUS_CLIENT_ID;
    this.clientSecret = options.clientSecret ?? env.AMADEUS_CLIENT_SECRET;
    this.hostname = options.hostname ?? env.AMADEUS_HOSTNAME ?? 'test.api.amadeus.com';
    this.httpClient = options.httpClient ?? defaultHttpClient;

    // In-memory OAuth 2.0 token cache
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  isConfigured() {
    return Boolean(
      this.clientId &&
      this.clientSecret &&
      this.clientId.trim().length > 0 &&
      this.clientSecret.trim().length > 0
    );
  }

  /**
   * Health check verifying API credentials and reachability.
   */
  async healthCheck() {
    if (!this.isConfigured()) {
      return {
        status: 'unconfigured',
        reachable: false,
        message: 'AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET is missing'
      };
    }

    try {
      const token = await this.getAccessToken();
      return {
        status: 'healthy',
        reachable: true,
        provider: this.providerName,
        authenticated: Boolean(token)
      };
    } catch (err) {
      return {
        status: 'degraded',
        reachable: false,
        message: `Amadeus authentication check failed: ${err.message}`
      };
    }
  }

  /**
   * Acquires or reuses a cached OAuth 2.0 access token from Amadeus.
   * Caches token in memory with a 60-second safety buffer before expiry.
   * @param {boolean} forceRefresh
   * @returns {Promise<string>} Bearer Access Token
   */
  async getAccessToken(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cachedToken && this.tokenExpiresAt - 60000 > now) {
      return this.cachedToken;
    }

    const tokenUrl = `https://${this.hostname}/v1/security/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret
    }).toString();

    const response = await this.httpClient.request(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body,
      timeoutMs: 6000
    });

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Amadeus token response did not include access_token');
    }

    this.cachedToken = data.access_token;
    const expiresInSeconds = data.expires_in || 1799;
    this.tokenExpiresAt = now + expiresInSeconds * 1000;

    return this.cachedToken;
  }

  /**
   * Extracts or resolves 3-letter IATA airport code from TransportNode.
   */
  resolveIataCode(node) {
    if (!node) return null;
    if (node.code && node.code.trim().length === 3) {
      return node.code.trim().toUpperCase();
    }
    // Heuristic extract from name if standard e.g. "Delhi (DEL)"
    const match = (node.name || '').match(/\b([A-Z]{3})\b/);
    if (match) return match[1];

    // Common Indian hub airport dictionary
    const nameLower = (node.name || '').toLowerCase();
    if (nameLower.includes('delhi')) return 'DEL';
    if (nameLower.includes('mumbai') || nameLower.includes('bombay')) return 'BOM';
    if (nameLower.includes('bengaluru') || nameLower.includes('bangalore')) return 'BLR';
    if (nameLower.includes('chennai') || nameLower.includes('madras')) return 'MAA';
    if (nameLower.includes('kolkata') || nameLower.includes('calcutta')) return 'CCU';
    if (nameLower.includes('hyderabad')) return 'HYD';
    if (nameLower.includes('varanasi')) return 'VNS';
    if (nameLower.includes('jaipur')) return 'JAI';
    if (nameLower.includes('goa')) return 'GOI';

    return null;
  }

  /**
   * Searches flight offers via Amadeus Flight Offers Search v2.
   * @param {Object} originNode
   * @param {Object} destinationNode
   * @param {Date|string} departureTime
   * @param {Object} options
   */
  async searchLegs(originNode, destinationNode, departureTime = new Date(), options = {}) {
    const originIata = this.resolveIataCode(originNode);
    const destIata = this.resolveIataCode(destinationNode);

    if (!originIata || !destIata) {
      throw new Error(
        `Amadeus flight search requires 3-letter IATA airport codes for origin and destination (received origin: ${originNode?.code || originNode?.name}, dest: ${destinationNode?.code || destinationNode?.name})`
      );
    }

    const depDate = departureTime instanceof Date ? departureTime : new Date(departureTime);
    const dateString = depDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const adults = options.passengers || options.adults || 1;
    const maxOffers = Math.min(10, Math.max(1, options.maxOffers || options.alternatives || 5));
    const currency = options.currency || 'INR';

    // Graceful offline fallback if credentials not configured
    if (!this.isConfigured()) {
      return this.generateHeuristicFallbackLegs(originNode, destinationNode, depDate, originIata, destIata, adults);
    }

    let token = await this.getAccessToken();

    const queryParams = new URLSearchParams({
      originLocationCode: originIata,
      destinationLocationCode: destIata,
      departureDate: dateString,
      adults: String(adults),
      max: String(maxOffers),
      currencyCode: currency
    });

    const url = `https://${this.hostname}/v2/shopping/flight-offers?${queryParams.toString()}`;

    let response;
    try {
      response = await this.httpClient.request(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeoutMs: options.timeoutMs ?? 7000
      });
    } catch (err) {
      // If 401 Unauthorized, refresh token once and retry
      if (err instanceof HttpError && err.statusCode === 401) {
        console.info('[AmadeusFlightAdapter] Token expired or invalid, acquiring new token...');
        token = await this.getAccessToken(true);
        response = await this.httpClient.request(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeoutMs: options.timeoutMs ?? 7000
        });
      } else {
        console.warn(`[AmadeusFlightAdapter] API call failed: ${err.message}. Falling back to flight estimation.`);
        return this.generateHeuristicFallbackLegs(originNode, destinationNode, depDate, originIata, destIata, adults, err.message);
      }
    }

    const data = await response.json();
    return this.normalizeResponse(data, {
      originNode,
      destinationNode,
      departureTime: depDate,
      originIata,
      destIata,
      options
    });
  }

  /**
   * Normalizes Amadeus v2 Flight Offers into standard TransitLeg domain schemas.
   * Clearly distinguishes flight offers from confirmed bookings.
   * @param {Object} rawPayload
   * @param {Object} context
   * @returns {Array<Object>} Normalized TransitLeg list
   */
  normalizeResponse(rawPayload, context = {}) {
    if (!rawPayload || !Array.isArray(rawPayload.data) || rawPayload.data.length === 0) {
      return [];
    }

    const { originNode, destinationNode, originIata, destIata } = context;
    const legs = [];

    rawPayload.data.forEach((offer, offerIndex) => {
      const itineraries = offer.itineraries || [];
      if (itineraries.length === 0) return;

      const segments = itineraries[0].segments || [];
      if (segments.length === 0) return;

      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];

      const depTime = new Date(firstSegment.departure?.at);
      const arrTime = new Date(lastSegment.arrival?.at);
      const durationMs = arrTime.getTime() - depTime.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / (60 * 1000)));

      // Estimate distance based on flight duration (~750 km/h cruising)
      const distanceMeters = Math.round((durationMinutes / 60) * 750 * 1000);

      // Carrier Information
      const carrierCode = firstSegment.carrierCode || '6E';
      const carrierName = AIRLINE_NAMES[carrierCode] || `Airline ${carrierCode}`;
      const flightNumber = `${carrierCode}-${firstSegment.number || '101'}`;

      // Fares & Pricing
      const totalAmount = parseFloat(offer.price?.total || '3500');
      const baseAmount = parseFloat(offer.price?.base || totalAmount * 0.75);
      const currency = offer.price?.currency || 'INR';

      const additionalCosts = [];
      const taxAmount = Math.max(0, Math.round((totalAmount - baseAmount) * 100) / 100);
      if (taxAmount > 0) {
        additionalCosts.push({
          costType: 'airport_fee',
          amount: taxAmount,
          currency,
          description: 'Aviation Taxes & Passenger Service Fee'
        });
      }

      // Fare Tier mapping
      const cabin = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY';
      let fareTier = 'economy';
      if (cabin === 'BUSINESS') fareTier = 'business';
      else if (cabin === 'FIRST') fareTier = 'first';
      else if (cabin === 'PREMIUM_ECONOMY') fareTier = 'premium_economy';

      // Transfer Info for connecting flights with layovers
      let transferInfo = null;
      const intermediateStops = [];

      if (segments.length > 1) {
        const layoverMinutes = Math.round(
          (new Date(segments[1].departure?.at).getTime() - new Date(segments[0].arrival?.at).getTime()) /
            (60 * 1000)
        );

        transferInfo = {
          transferType: 'cross_terminal',
          bufferDurationMinutes: Math.max(30, layoverMinutes),
          walkingDistanceMeters: 400,
          requiresSecurityClearance: true,
          requiresBaggageReclaim: false,
          isGuaranteedConnection: true,
          notes: `Layover at ${segments[0].arrival?.iataCode || 'Hub'} (${layoverMinutes} mins)`
        };

        for (let i = 0; i < segments.length - 1; i++) {
          const stopIata = segments[i].arrival?.iataCode;
          if (stopIata) {
            intermediateStops.push({
              nodeId: `node_airport_${stopIata.toLowerCase()}`,
              name: `Airport ${stopIata}`,
              nodeType: 'airport',
              code: stopIata,
              coordinates: [77.1000, 28.5562] // fallback coordinates
            });
          }
        }
      }

      const leg = {
        legId: `leg_amadeus_${offer.id || offerIndex + 1}_${Date.now()}`,
        mode: 'air',
        origin: {
          nodeId: originNode.nodeId,
          name: originNode.name,
          nodeType: 'airport',
          code: originIata,
          coordinates: originNode.coordinates || originNode.location?.coordinates
        },
        destination: {
          nodeId: destinationNode.nodeId,
          name: destinationNode.name,
          nodeType: 'airport',
          code: destIata,
          coordinates: destinationNode.coordinates || destinationNode.location?.coordinates
        },
        departureTime: depTime,
        arrivalTime: arrTime,
        durationMinutes,
        distanceMeters,
        carrier: {
          name: carrierName,
          code: carrierCode,
          identifier: flightNumber
        },
        fare: {
          baseAmount,
          totalAmount,
          taxesAndFees: taxAmount,
          currency,
          fareTier,
          isEstimated: false
        },
        additionalCosts,
        transferInfo,
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'realtime',
          source: 'amadeus_flight_offers_v2',
          confidenceScore: 0.98,
          lastFetchedAt: new Date(),
          validUntil: new Date(Date.now() + 10800 * 1000)
        },
        bookingInfo: {
          isBookableOnline: true,
          bookingReference: offer.id ? `OFFER-${offer.id}` : null,
          bookingUrl: `https://www.amadeus.com/flight-search?origin=${originIata}&dest=${destIata}`
        },
        polyline: null,
        intermediateStops,
        notes:
          segments.length > 1
            ? `Connecting flight offer (${segments.length} segments, offer ID: ${offer.id}) - Requires booking confirmation`
            : `Non-stop direct flight offer (offer ID: ${offer.id}) - Requires booking confirmation`
      };

      legs.push(leg);
    });

    return legs;
  }

  /**
   * Generates realistic heuristic flight options when API credentials are absent.
   */
  generateHeuristicFallbackLegs(originNode, destNode, depDate, originIata, destIata, adults, reason = 'Unconfigured credentials') {
    const flightDurationMinutes = 130; // ~2h 10m typical Indian trunk domestic route
    const baseDep = new Date(depDate);
    baseDep.setHours(9, 30, 0, 0); // 09:30 AM
    const arrDate = new Date(baseDep.getTime() + flightDurationMinutes * 60 * 1000);

    const distanceMeters = 1150000; // ~1150 km
    const baseFare = 4200 * adults;
    const taxAmount = 650 * adults;
    const totalAmount = baseFare + taxAmount;

    return [
      {
        legId: `leg_amadeus_est_${Date.now()}`,
        mode: 'air',
        origin: {
          nodeId: originNode.nodeId,
          name: originNode.name,
          nodeType: 'airport',
          code: originIata,
          coordinates: originNode.coordinates || originNode.location?.coordinates
        },
        destination: {
          nodeId: destNode.nodeId,
          name: destNode.name,
          nodeType: 'airport',
          code: destIata,
          coordinates: destNode.coordinates || destNode.location?.coordinates
        },
        departureTime: baseDep,
        arrivalTime: arrDate,
        durationMinutes: flightDurationMinutes,
        distanceMeters,
        carrier: {
          name: 'IndiGo Airlines',
          code: '6E',
          identifier: '6E-502'
        },
        fare: {
          baseAmount: baseFare,
          totalAmount,
          taxesAndFees: taxAmount,
          currency: 'INR',
          fareTier: 'economy',
          isEstimated: true
        },
        additionalCosts: [
          {
            costType: 'airport_fee',
            amount: taxAmount,
            currency: 'INR',
            description: 'Airport Development Fee & Aviation Fuel Surcharge'
          }
        ],
        transferInfo: null,
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'historical_estimate',
          source: 'amadeus_heuristic_fallback',
          confidenceScore: 0.88,
          lastFetchedAt: new Date(),
          validUntil: new Date(Date.now() + 10800 * 1000)
        },
        bookingInfo: {
          isBookableOnline: true,
          bookingReference: 'OFFER-EST-1',
          bookingUrl: `https://www.goindigo.in/booking/flight-search.html?origin=${originIata}&dest=${destIata}`
        },
        polyline: null,
        intermediateStops: [],
        notes: `Direct flight offer estimated based on domestic scheduled air corridor (${reason}).`
      }
    ];
  }
}
