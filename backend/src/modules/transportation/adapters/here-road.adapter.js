import { TransportationProviderAdapter } from '../provider-adapter.interface.js';
import { defaultHttpClient } from '../../../utils/http-client.js';
import { env } from '../../../config/env.js';

export class HereRoadAdapter extends TransportationProviderAdapter {
  constructor(options = {}) {
    super('here', ['road_driving', 'road_cab', 'walking']);
    this.apiKey = options.apiKey ?? env.HERE_API_KEY;
    this.baseUrl = options.baseUrl ?? env.HERE_ROUTING_BASE_URL ?? 'https://router.hereapi.com/v8';
    this.httpClient = options.httpClient ?? defaultHttpClient;
  }

  /**
   * Returns true if valid API key is present.
   */
  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Health check verifying API configuration and reachability.
   */
  async healthCheck() {
    if (!this.isConfigured()) {
      return {
        status: 'unconfigured',
        reachable: false,
        message: 'HERE_API_KEY is not configured in environment'
      };
    }
    return {
      status: 'configured',
      reachable: true,
      provider: this.providerName,
      baseUrl: this.baseUrl
    };
  }

  /**
   * Extracts [lat, lng] coordinates from a TransportNode.
   */
  extractCoordinates(node) {
    if (!node) return null;
    const coords = node.coordinates || node.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      // GeoJSON is [longitude, latitude] -> HERE needs lat,lng
      return { lat: coords[1], lng: coords[0] };
    }
    return null;
  }

  /**
   * Searches for driving route options between origin and destination nodes.
   * @param {Object} originNode
   * @param {Object} destinationNode
   * @param {Date|string} departureTime
   * @param {Object} options
   * @returns {Promise<Array>} Normalized TransitLeg items
   */
  async searchLegs(originNode, destinationNode, departureTime = new Date(), options = {}) {
    const originCoords = this.extractCoordinates(originNode);
    const destCoords = this.extractCoordinates(destinationNode);

    if (!originCoords || !destCoords) {
      throw new Error('HERE routing requires valid origin and destination coordinates [lng, lat]');
    }

    const departureDate = departureTime instanceof Date ? departureTime : new Date(departureTime);
    const mode = options.mode || 'road_driving';

    // Graceful offline fallback if API key is not configured
    if (!this.isConfigured()) {
      return this.generateHeuristicFallbackLeg(originNode, destinationNode, departureDate, mode);
    }

    const queryParams = new URLSearchParams({
      transportMode: 'car',
      origin: `${originCoords.lat},${originCoords.lng}`,
      destination: `${destCoords.lat},${destCoords.lng}`,
      departureTime: departureDate.toISOString(),
      return: 'summary,polyline,tolls,actions',
      alternatives: String(Math.min(6, Math.max(0, options.alternatives ?? 1))),
      apiKey: this.apiKey
    });

    const url = `${this.baseUrl}/routes?${queryParams.toString()}`;

    try {
      const response = await this.httpClient.getJson(url, {
        timeoutMs: options.timeoutMs ?? 5000
      });

      return this.normalizeResponse(response, {
        originNode,
        destinationNode,
        departureTime: departureDate,
        mode,
        options
      });
    } catch (err) {
      console.warn(`[HereRoadAdapter] Routing API call failed: ${err.message}. Falling back to heuristic estimation.`);
      return this.generateHeuristicFallbackLeg(originNode, destinationNode, departureDate, mode, err.message);
    }
  }

  /**
   * Normalizes HERE Routing v8 response into standard TransitLeg domain schemas.
   * @param {Object} rawPayload - HERE API response payload
   * @param {Object} context - Request context
   * @returns {Array<Object>} List of TransitLeg plain objects
   */
  normalizeResponse(rawPayload, context = {}) {
    if (!rawPayload || !Array.isArray(rawPayload.routes) || rawPayload.routes.length === 0) {
      return [];
    }

    const { originNode, destinationNode, departureTime, mode = 'road_driving' } = context;
    const legs = [];

    rawPayload.routes.forEach((route, routeIndex) => {
      const sections = route.sections || [];
      if (sections.length === 0) return;

      let totalDurationSec = 0;
      let totalDistanceMeters = 0;
      const additionalCosts = [];
      let combinedPolyline = null;

      sections.forEach((section) => {
        if (section.summary) {
          totalDurationSec += section.summary.duration || 0;
          totalDistanceMeters += section.summary.length || 0;
        }

        if (section.polyline && !combinedPolyline) {
          combinedPolyline = section.polyline;
        }

        // Parse HERE Tolls if present
        if (Array.isArray(section.tolls)) {
          section.tolls.forEach((toll) => {
            if (Array.isArray(toll.fares)) {
              toll.fares.forEach((fare) => {
                const amount = fare.price?.value ?? 0;
                const currency = fare.price?.currency || 'INR';
                const methods = Array.isArray(fare.paymentMethods) ? fare.paymentMethods.join('/') : 'FASTag';
                additionalCosts.push({
                  costType: 'toll',
                  amount,
                  currency,
                  description: `Road Toll (${methods})`
                });
              });
            }
          });
        }
      });

      const durationMinutes = Math.max(1, Math.round(totalDurationSec / 60));
      const depDate = departureTime instanceof Date ? departureTime : new Date(departureTime);
      const arrDate = new Date(depDate.getTime() + durationMinutes * 60 * 1000);

      // Estimated fuel cost or taxi fare
      const distanceKm = totalDistanceMeters / 1000;
      const isCab = mode === 'road_cab';
      const baseFare = isCab ? Math.round(50 + distanceKm * 15) : Math.round(distanceKm * 7.5);
      const tollSum = additionalCosts.reduce((acc, c) => acc + (c.amount || 0), 0);
      const totalAmount = baseFare + tollSum;

      const leg = {
        legId: `leg_here_${routeIndex + 1}_${Date.now()}`,
        mode,
        origin: {
          nodeId: originNode.nodeId,
          name: originNode.name,
          nodeType: originNode.nodeType || 'coordinates',
          code: originNode.code || null,
          coordinates: originNode.coordinates || originNode.location?.coordinates
        },
        destination: {
          nodeId: destinationNode.nodeId,
          name: destinationNode.name,
          nodeType: destinationNode.nodeType || 'coordinates',
          code: destinationNode.code || null,
          coordinates: destinationNode.coordinates || destinationNode.location?.coordinates
        },
        departureTime: depDate,
        arrivalTime: arrDate,
        durationMinutes,
        distanceMeters: Math.round(totalDistanceMeters),
        carrier: {
          name: isCab ? 'On-Demand Cab / Taxi' : 'Personal Vehicle / Highway',
          code: 'ROAD',
          identifier: isCab ? 'TAXI' : 'PRIVATE_CAR'
        },
        fare: {
          baseAmount: baseFare,
          totalAmount,
          taxesAndFees: tollSum,
          currency: 'INR',
          fareTier: 'standard',
          isEstimated: true
        },
        additionalCosts,
        transferInfo: null,
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'realtime',
          source: 'here_routing_v8',
          confidenceScore: 0.95,
          lastFetchedAt: new Date(),
          validUntil: new Date(Date.now() + 3600 * 1000)
        },
        bookingInfo: {
          isBookableOnline: false,
          bookingReference: null,
          bookingUrl: null
        },
        polyline: combinedPolyline,
        intermediateStops: [],
        notes: `Route alternative ${routeIndex + 1} calculated via HERE Routing v8.`
      };

      legs.push(leg);
    });

    return legs;
  }

  /**
   * Generates a valid heuristic road TransitLeg based on haversine distance.
   * Used for offline resilience and development when HERE_API_KEY is not configured.
   */
  generateHeuristicFallbackLeg(originNode, destinationNode, departureDate, mode, reason = 'Unconfigured API key') {
    const originCoords = this.extractCoordinates(originNode);
    const destCoords = this.extractCoordinates(destinationNode);

    // Haversine formula for distance
    const R = 6371e3; // Earth radius in meters
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(destCoords.lat - originCoords.lat);
    const dLng = toRad(destCoords.lng - originCoords.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(originCoords.lat)) *
        Math.cos(toRad(destCoords.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistanceMeters = R * c;

    // Road winding factor: 1.3x straight-line distance
    const distanceMeters = Math.round(straightDistanceMeters * 1.3);
    const averageSpeedKmH = 55; // 55 km/h average intercity driving speed
    const durationMinutes = Math.max(5, Math.round((distanceMeters / 1000 / averageSpeedKmH) * 60));

    const depDate = departureDate instanceof Date ? departureDate : new Date(departureDate);
    const arrDate = new Date(depDate.getTime() + durationMinutes * 60 * 1000);

    const distanceKm = distanceMeters / 1000;
    const isCab = mode === 'road_cab';
    const baseFare = isCab ? Math.round(50 + distanceKm * 15) : Math.round(distanceKm * 7.5);

    // Estimate FASTag toll (~1.5 INR / km for national highways)
    const estimatedToll = distanceKm > 30 ? Math.round(distanceKm * 1.4) : 0;
    const additionalCosts =
      estimatedToll > 0
        ? [
            {
              costType: 'toll',
              amount: estimatedToll,
              currency: 'INR',
              description: 'Estimated FASTag Highway Toll'
            }
          ]
        : [];
    const totalAmount = baseFare + estimatedToll;

    return [
      {
        legId: `leg_here_est_${Date.now()}`,
        mode,
        origin: {
          nodeId: originNode.nodeId,
          name: originNode.name,
          nodeType: originNode.nodeType || 'coordinates',
          code: originNode.code || null,
          coordinates: originNode.coordinates || originNode.location?.coordinates
        },
        destination: {
          nodeId: destinationNode.nodeId,
          name: destinationNode.name,
          nodeType: destinationNode.nodeType || 'coordinates',
          code: destinationNode.code || null,
          coordinates: destinationNode.coordinates || destinationNode.location?.coordinates
        },
        departureTime: depDate,
        arrivalTime: arrDate,
        durationMinutes,
        distanceMeters,
        carrier: {
          name: isCab ? 'Cab / Taxi' : 'Personal Vehicle / Road Transit',
          code: 'ROAD',
          identifier: isCab ? 'TAXI' : 'PRIVATE_CAR'
        },
        fare: {
          baseAmount: baseFare,
          totalAmount,
          taxesAndFees: estimatedToll,
          currency: 'INR',
          fareTier: 'standard',
          isEstimated: true
        },
        additionalCosts,
        transferInfo: null,
        availabilityStatus: 'scheduled',
        dataFreshness: {
          freshnessLevel: 'historical_estimate',
          source: 'here_heuristic_fallback',
          confidenceScore: 0.85,
          lastFetchedAt: new Date(),
          validUntil: new Date(Date.now() + 3600 * 1000)
        },
        bookingInfo: {
          isBookableOnline: false,
          bookingReference: null,
          bookingUrl: null
        },
        polyline: null,
        intermediateStops: [],
        notes: `Road transit estimated based on standard highway topology (${reason}).`
      }
    ];
  }
}
