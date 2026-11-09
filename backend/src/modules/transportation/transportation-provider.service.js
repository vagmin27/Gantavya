import { HereRoadAdapter } from './adapters/here-road.adapter.js';
import { AmadeusFlightAdapter } from './adapters/amadeus-flight.adapter.js';
import { IndianRailwaysAdapter } from './adapters/railway.adapter.js';
import { TransitCacheService } from './cache/transit-cache.service.js';

export class TransportationProviderService {
  constructor(options = {}) {
    this.adapters = new Map();
    this.cacheService = options.cacheService || TransitCacheService;

    // Register standard provider adapters
    const hereAdapter = options.hereAdapter || new HereRoadAdapter();
    const amadeusAdapter = options.amadeusAdapter || new AmadeusFlightAdapter();
    const railwayAdapter = options.railwayAdapter || new IndianRailwaysAdapter();

    this.registerAdapter(hereAdapter);
    this.registerAdapter(amadeusAdapter);
    this.registerAdapter(railwayAdapter);
  }

  /**
   * Registers a provider adapter.
   * Enables adding new live APIs dynamically without modifying the graph engine.
   * @param {TransportationProviderAdapter} adapter
   */
  registerAdapter(adapter) {
    if (!adapter || !adapter.providerName) {
      throw new Error('Invalid adapter instance provided.');
    }
    this.adapters.set(adapter.providerName.toLowerCase(), adapter);
  }

  /**
   * Unregisters a provider adapter by name.
   */
  unregisterAdapter(providerName) {
    return this.adapters.delete((providerName || '').toLowerCase());
  }

  /**
   * Lists all currently registered transportation adapters.
   */
  listAdapters() {
    return Array.from(this.adapters.values()).map((a) => ({
      providerName: a.providerName,
      supportedModes: a.supportedModes,
      isConfigured: typeof a.isConfigured === 'function' ? a.isConfigured() : true
    }));
  }

  /**
   * Returns registered adapter by name.
   */
  getAdapter(providerName) {
    return this.adapters.get((providerName || '').toLowerCase());
  }

  /**
   * Performs health checks on all registered adapters and cache service.
   */
  async getProvidersStatus() {
    const statuses = {};
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        statuses[name] = await adapter.healthCheck();
      } catch (err) {
        statuses[name] = {
          status: 'error',
          reachable: false,
          error: err.message
        };
      }
    }

    return {
      providers: statuses,
      cache: {
        backend: 'mongodb_ttl',
        status: 'active'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Searches transit legs across all requested or applicable modes.
   * Leverages MongoDB TTL caching and handles partial provider failures gracefully.
   *
   * @param {Object} query
   * @param {Object} query.origin - TransportNode
   * @param {Object} query.destination - TransportNode
   * @param {Date|string} query.departureDate
   * @param {Array<string>} [query.modes] - Requested transport modes
   * @param {Object} [query.options] - Search options
   * @returns {Promise<{ legs: Array, warnings: Array, cacheHits: number, executionTimeMs: number }>}
   */
  async searchTransportation(query) {
    const startTime = Date.now();
    const { origin, destination, departureDate = new Date(), modes = [], options = {} } = query;

    if (!origin || !destination) {
      throw new Error('Origin and destination transport nodes are required');
    }

    // Determine candidate provider adapters based on requested modes
    const candidateAdapters = [];
    for (const [, adapter] of this.adapters.entries()) {
      if (modes.length === 0) {
        // If no modes specified, include all providers
        candidateAdapters.push(adapter);
      } else {
        const matchesMode = adapter.supportedModes.some((m) => modes.includes(m));
        if (matchesMode) {
          candidateAdapters.push(adapter);
        }
      }
    }

    const allLegs = [];
    const warnings = [];
    let cacheHits = 0;

    // Execute provider queries concurrently with Promise.allSettled
    const searchPromises = candidateAdapters.map(async (adapter) => {
      const providerMode = adapter.supportedModes[0] || 'other';
      const cacheParams = {
        provider: adapter.providerName,
        mode: providerMode,
        origin,
        destination,
        departureDate,
        options
      };

      try {
        const result = await this.cacheService.getOrFetch(
          cacheParams,
          async () => {
            return await adapter.searchLegs(origin, destination, departureDate, options);
          },
          {
            searchParams: options
          }
        );

        if (result.isCached) {
          cacheHits++;
        }

        return {
          provider: adapter.providerName,
          legs: result.legs || [],
          isCached: Boolean(result.isCached)
        };
      } catch (err) {
        // Individual provider failure does NOT break the multimodal search
        console.warn(`[TransportationProviderService] Provider '${adapter.providerName}' search failed: ${err.message}`);

        let fallbackLegs = [];
        if (typeof this.cacheService.getStaleFallback === 'function') {
          const cacheKey = this.cacheService.generateCacheKey(cacheParams);
          const fallback = await this.cacheService.getStaleFallback(cacheKey);
          if (fallback && Array.isArray(fallback.legs) && fallback.legs.length > 0) {
            fallbackLegs = fallback.legs;
          }
        }

        warnings.push({
          provider: adapter.providerName,
          error: err.message,
          degradedFallbackUsed: fallbackLegs.length > 0,
          timestamp: new Date().toISOString()
        });

        return {
          provider: adapter.providerName,
          legs: fallbackLegs,
          isCached: false,
          error: err.message
        };
      }
    });

    const settledResults = await Promise.allSettled(searchPromises);

    settledResults.forEach((settled) => {
      if (settled.status === 'fulfilled' && settled.value && Array.isArray(settled.value.legs)) {
        allLegs.push(...settled.value.legs);
      }
    });

    return {
      legs: allLegs,
      totalCount: allLegs.length,
      cacheHits,
      warnings,
      executionTimeMs: Date.now() - startTime
    };
  }
}

export const defaultProviderService = new TransportationProviderService();

