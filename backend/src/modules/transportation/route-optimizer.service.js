/**
 * Route Optimizer Service (Express Backend)
 * Gantavya Platform - Milestone 2.4.3
 *
 * Coordinates between external provider adapters, MongoDB TTL cache,
 * and the FastAPI Intelligence Optimization Engine via secure East-West communication.
 */

import { defaultProviderService } from './transportation-provider.service.js';
import { RouteOption } from './route-option.model.js';
import { env } from '../../config/env.js';
import { defaultHttpClient } from '../../utils/http-client.js';

export class RouteOptimizerService {
  constructor(options = {}) {
    this.providerService = options.providerService || defaultProviderService;
    this.httpClient = options.httpClient || defaultHttpClient;
    this.intelligenceUrl = options.intelligenceUrl || env.INTELLIGENCE_SERVICE_URL;
    this.internalServiceKey = options.internalServiceKey || env.INTERNAL_SERVICE_KEY;
  }

  /**
   * Dispatches multimodal candidate search and optimizes routes via FastAPI.
   *
   * @param {Object} query
   * @param {Object} query.origin - TransportNode
   * @param {Object} query.destination - TransportNode
   * @param {Date|string} [query.departureDate]
   * @param {Array<string>} [query.modes]
   * @param {Object} [query.constraints] - TravellerConstraints
   * @param {Object} [query.preferences] - TransportationPreferences
   * @param {Object} [query.options] - Search options
   * @returns {Promise<Object>} Optimized routes across 5 categories
   */
  async optimizeJourney(query) {
    const startTime = Date.now();
    const { origin, destination, departureDate = new Date(), modes = [], constraints = {}, preferences = {}, options = {} } = query;

    // 1. Fetch candidate transit legs from providers and TTL cache
    const providerResult = await this.providerService.searchTransportation({
      origin,
      destination,
      departureDate,
      modes,
      options
    });

    const candidateLegs = providerResult.legs || [];

    if (candidateLegs.length === 0) {
      return {
        status: 'no_routes_found',
        searchId: `search_${Date.now()}`,
        totalCandidates: 0,
        routes: {},
        warnings: providerResult.warnings || [],
        executionTimeMs: Date.now() - startTime
      };
    }

    // 2. Call FastAPI Stateless Intelligence Engine
    const searchId = `opt_${Date.now()}`;
    const intelligenceEndpoint = `${this.intelligenceUrl}/transportation/optimize`;

    // Map coordinates to Pydantic TransportCoordinatesSchema if needed
    const formatNodeForPython = (node) => {
      const coords = node.coordinates || node.location?.coordinates || [77.0, 28.0];
      return {
        node_id: node.nodeId || node.node_id || 'node_unspecified',
        name: node.name || 'Unnamed Node',
        node_type: node.nodeType || node.node_type || 'coordinates',
        code: node.code || null,
        coordinates: Array.isArray(coords) ? coords : [coords.longitude || 77.0, coords.latitude || 28.0],
        city: node.city || '',
        country: node.country || ''
      };
    };

    // Format legs to Python Pydantic contract
    const formattedLegs = candidateLegs.map((leg, idx) => ({
      leg_id: leg.legId || leg.leg_id || `leg_${idx}`,
      mode: leg.mode,
      origin: formatNodeForPython(leg.origin),
      destination: formatNodeForPython(leg.destination),
      departure_time: leg.departureTime instanceof Date ? leg.departureTime.toISOString() : leg.departureTime,
      arrival_time: leg.arrivalTime instanceof Date ? leg.arrivalTime.toISOString() : leg.arrivalTime,
      duration_minutes: leg.durationMinutes || leg.duration_minutes || 60,
      distance_meters: leg.distanceMeters || leg.distance_meters || 1000,
      carrier: {
        name: leg.carrier?.name || 'Standard Carrier',
        code: leg.carrier?.code || null,
        identifier: leg.carrier?.identifier || null
      },
      fare: {
        base_amount: leg.fare?.baseAmount ?? leg.fare?.base_amount ?? 100,
        total_amount: leg.fare?.totalAmount ?? leg.fare?.total_amount ?? 100,
        currency: leg.fare?.currency || 'INR',
        fare_tier: leg.fare?.fareTier || leg.fare?.fare_tier || 'standard',
        is_estimated: Boolean(leg.fare?.isEstimated ?? leg.fare?.is_estimated)
      },
      additional_costs: (leg.additionalCosts || []).map((c) => ({
        cost_type: c.costType || c.cost_type || 'other',
        amount: c.amount || 0,
        currency: c.currency || 'INR',
        description: c.description || ''
      })),
      transfer_info: leg.transferInfo
        ? {
            transfer_type: leg.transferInfo.transferType || leg.transferInfo.transfer_type || 'same_station',
            buffer_duration_minutes: leg.transferInfo.bufferDurationMinutes || leg.transferInfo.buffer_duration_minutes || 30,
            walking_distance_meters: leg.transferInfo.walkingDistanceMeters || leg.transferInfo.walking_distance_meters || 0,
            requires_security_clearance: Boolean(leg.transferInfo.requiresSecurityClearance),
            requires_baggage_reclaim: Boolean(leg.transferInfo.requiresBaggageReclaim),
            is_guaranteed_connection: Boolean(leg.transferInfo.isGuaranteedConnection),
            notes: leg.transferInfo.notes || ''
          }
        : null,
      availability_status: leg.availabilityStatus || leg.availability_status || 'scheduled',
      data_freshness: {
        freshness_level: leg.dataFreshness?.freshnessLevel || leg.dataFreshness?.freshness_level || 'scheduled',
        source: leg.dataFreshness?.source || 'unknown',
        confidence_score: leg.dataFreshness?.confidenceScore ?? leg.dataFreshness?.confidence_score ?? 1.0,
        last_fetched_at: leg.dataFreshness?.lastFetchedAt || new Date().toISOString()
      },
      booking_info: {
        booking_reference: leg.bookingInfo?.bookingReference || null,
        booking_url: leg.bookingInfo?.bookingUrl || null,
        is_bookable_online: Boolean(leg.bookingInfo?.isBookableOnline)
      },
      polyline: leg.polyline || null,
      intermediate_stops: (leg.intermediateStops || []).map(formatNodeForPython),
      notes: leg.notes || ''
    }));

    const optimizationPayload = {
      search_id: searchId,
      trip_id: query.tripId || null,
      origin: formatNodeForPython(origin),
      destination: formatNodeForPython(destination),
      departure_window: query.departureWindow || null,
      traveller_constraints: {
        max_budget: constraints.maxBudget || constraints.max_budget || 0.0,
        currency: constraints.currency || 'INR',
        max_duration_minutes: constraints.maxDurationMinutes || constraints.max_duration_minutes || 0,
        max_transfers: constraints.maxTransfers ?? constraints.max_transfers ?? 3,
        avoid_overnight: Boolean(constraints.avoidOvernight ?? constraints.avoid_overnight)
      },
      preferences: {
        allowed_modes: preferences.allowedModes || preferences.allowed_modes || undefined,
        preferred_modes: preferences.preferredModes || preferences.preferred_modes || []
      },
      candidate_transit_legs: formattedLegs
    };

    let intelligenceResponse = null;

    try {
      const res = await this.httpClient.request(intelligenceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': this.internalServiceKey
        },
        body: JSON.stringify(optimizationPayload),
        timeoutMs: 6000
      });

      intelligenceResponse = await res.json();
    } catch (err) {
      console.warn(`[RouteOptimizerService] FastAPI optimization service call failed: ${err.message}. Using resilient fallback sorting.`);
      intelligenceResponse = this.generateFallbackRecommendations(candidateLegs, searchId);
    }

    return {
      status: intelligenceResponse?.status || 'success',
      searchId: intelligenceResponse?.search_id || searchId,
      totalCandidates: intelligenceResponse?.total_candidates_evaluated || candidateLegs.length,
      paretoOptimalCount: intelligenceResponse?.pareto_optimal_count || 0,
      routes: intelligenceResponse?.routes || {},
      warnings: providerResult.warnings || [],
      cacheHits: providerResult.cacheHits || 0,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Resilient fallback recommendation builder when FastAPI intelligence service is offline.
   */
  generateFallbackRecommendations(legs, searchId) {
    if (!legs || legs.length === 0) return { status: 'no_routes_found', routes: {} };

    // Find cheapest
    const sortedByCost = [...legs].sort((a, b) => (a.fare?.totalAmount || 0) - (b.fare?.totalAmount || 0));
    // Find fastest
    const sortedByDuration = [...legs].sort((a, b) => (a.durationMinutes || 0) - (b.durationMinutes || 0));

    const cheapestLeg = sortedByCost[0];
    const fastestLeg = sortedByDuration[0];

    const toRouteOption = (leg, category, reason) => ({
      route_id: `route_${category}_${searchId}`,
      origin: leg.origin,
      destination: leg.destination,
      departure_time: leg.departureTime,
      arrival_time: leg.arrivalTime,
      total_duration_minutes: leg.durationMinutes,
      total_distance_meters: leg.distanceMeters,
      total_monetary_cost: {
        amount: leg.fare?.totalAmount || 0,
        currency: leg.fare?.currency || 'INR',
        is_estimated: Boolean(leg.fare?.isEstimated)
      },
      number_of_transfers: 0,
      total_waiting_time_minutes: 0,
      convenience_score: 8.0,
      reliability_score: (leg.dataFreshness?.confidenceScore || 0.9) * 10,
      ranking_category: category,
      recommendation_reason: reason,
      legs: [leg]
    });

    return {
      status: 'success',
      search_id: searchId,
      total_candidates_evaluated: legs.length,
      pareto_optimal_count: legs.length,
      routes: {
        cheapest: toRouteOption(cheapestLeg, 'cheapest', 'Lowest monetary cost alternative (resilient fallback).'),
        fastest: toRouteOption(fastestLeg, 'fastest', 'Shortest transit duration alternative (resilient fallback).'),
        fewest_transfers: toRouteOption(fastestLeg, 'fewest_transfers', 'Direct transit leg with zero transfers.'),
        most_convenient: toRouteOption(fastestLeg, 'most_convenient', 'Direct journey with minimal waiting time.'),
        best_overall: toRouteOption(fastestLeg, 'best_overall', 'Best overall compromise candidate.')
      }
    };
  }
}

export const defaultRouteOptimizerService = new RouteOptimizerService();

