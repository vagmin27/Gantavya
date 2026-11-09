import crypto from 'crypto';
import { TransitCache } from './transit-cache.model.js';

export const CACHE_TTL_SECONDS = {
  road: 3600, // 1 hour for road traffic and tolls
  air: 10800, // 3 hours for flight offers
  rail_static: 604800, // 7 days for GTFS static timetable schedules
  rail_live: 7200, // 2 hours for live train status
  bus: 14400, // 4 hours for intercity bus routes
  default: 3600
};

export class TransitCacheService {
  /**
   * Deterministically generates a SHA-256 cache key from canonical search parameters.
   * Coordinate precision is normalized to 4 decimals (~11 meters) to optimize cache hits.
   * @param {Object} params
   * @returns {string} SHA-256 hex digest
   */
  static generateCacheKey({ provider, mode, origin, destination, departureDate, options = {} }) {
    const normalizeNode = (node) => {
      if (!node) return 'null';
      const code = (node.code || '').trim().toUpperCase();
      const coords = node.coordinates || node.location?.coordinates;
      let coordKey = '';
      if (Array.isArray(coords) && coords.length === 2) {
        const [lng, lat] = coords;
        coordKey = `${lng.toFixed(4)},${lat.toFixed(4)}`;
      }
      return `${node.nodeId || ''}:${code}:${coordKey}`;
    };

    let formattedDate = '';
    if (departureDate instanceof Date && !isNaN(departureDate.getTime())) {
      // For road traffic, bucket by hour; for flights/rail, bucket by date
      if (mode && mode.startsWith('road')) {
        formattedDate = departureDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      } else {
        formattedDate = departureDate.toISOString().slice(0, 10); // YYYY-MM-DD
      }
    } else if (typeof departureDate === 'string') {
      formattedDate = departureDate.slice(0, 13);
    }

    // Exclude any sensitive keys, auth tokens or user identifiers from cache key
    const sanitizedOptions = {
      passengers: options.passengers || options.adults || 1,
      alternatives: options.alternatives ?? 1,
      tier: options.tier || options.cabin || 'economy'
    };

    const canonicalString = [
      (provider || '').trim().toLowerCase(),
      (mode || '').trim().toLowerCase(),
      normalizeNode(origin),
      normalizeNode(destination),
      formattedDate,
      JSON.stringify(sanitizedOptions)
    ].join('|');

    return crypto.createHash('sha256').update(canonicalString).digest('hex');
  }

  /**
   * Retrieves active (non-expired) cached transit legs.
   * @param {string} cacheKey
   * @returns {Promise<{ legs: Array, dataFreshness: Object }|null>}
   */
  static async get(cacheKey) {
    try {
      const cached = await TransitCache.findOne({
        cacheKey,
        expiresAt: { $gt: new Date() }
      }).lean();

      if (!cached) {
        return null;
      }

      // Mark freshness as cached/stale if close to expiry
      const freshness = {
        ...cached.dataFreshness,
        cachedAt: cached.createdAt,
        expiresAt: cached.expiresAt,
        fromCache: true
      };

      return {
        legs: cached.responsePayload,
        dataFreshness: freshness,
        confidenceScore: cached.dataFreshness?.confidenceScore ?? 1.0
      };
    } catch (err) {
      console.warn(`[TransitCacheService.get] Cache read warning: ${err.message}`);
      return null;
    }
  }

  /**
   * Stores normalized transit legs in MongoDB TTL cache.
   * @param {Object} params
   * @param {Array} legs - Normalized TransitLeg items
   * @param {Object} metadata - TTL and freshness metadata
   */
  static async set(params, legs, metadata = {}) {
    try {
      const cacheKey = params.cacheKey || this.generateCacheKey(params);
      const ttlSeconds =
        metadata.ttlSeconds ||
        (params.mode?.startsWith('road')
          ? CACHE_TTL_SECONDS.road
          : params.mode === 'air'
            ? CACHE_TTL_SECONDS.air
            : params.mode === 'rail'
              ? metadata.isLive
                ? CACHE_TTL_SECONDS.rail_live
                : CACHE_TTL_SECONDS.rail_static
              : CACHE_TTL_SECONDS.default);

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const doc = {
        cacheKey,
        provider: (params.provider || 'unknown').toLowerCase(),
        mode: params.mode || 'other',
        originQuery: {
          nodeId: params.origin?.nodeId || null,
          name: params.origin?.name || null,
          code: params.origin?.code || null,
          coordinates: params.origin?.coordinates || params.origin?.location?.coordinates || []
        },
        destinationQuery: {
          nodeId: params.destination?.nodeId || null,
          name: params.destination?.name || null,
          code: params.destination?.code || null,
          coordinates: params.destination?.coordinates || params.destination?.location?.coordinates || []
        },
        departureDate: params.departureDate ? new Date(params.departureDate) : new Date(),
        searchParams: metadata.searchParams || {},
        responsePayload: legs,
        dataFreshness: {
          freshnessLevel: metadata.dataFreshness?.freshnessLevel || 'realtime',
          source: metadata.dataFreshness?.source || params.provider || 'cache',
          confidenceScore: metadata.dataFreshness?.confidenceScore ?? 1.0,
          lastFetchedAt: new Date()
        },
        ttlSeconds,
        expiresAt
      };

      await TransitCache.findOneAndUpdate(
        { cacheKey },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return { cacheKey, ttlSeconds, expiresAt };
    } catch (err) {
      console.warn(`[TransitCacheService.set] Cache write warning: ${err.message}`);
      return null;
    }
  }

  /**
   * Executes fetchFn on cache miss, caches and returns result.
   * Does not fail if cache read/write throws.
   */
  static async getOrFetch(params, fetchFn, metadata = {}) {
    const cacheKey = params.cacheKey || this.generateCacheKey(params);
    const cached = await this.get(cacheKey);

    if (cached && Array.isArray(cached.legs) && cached.legs.length > 0) {
      return {
        legs: cached.legs,
        isCached: true,
        dataFreshness: cached.dataFreshness
      };
    }

    const legs = await fetchFn();

    if (Array.isArray(legs) && legs.length > 0) {
      await this.set({ ...params, cacheKey }, legs, metadata);
    }

    return {
      legs,
      isCached: false,
      dataFreshness: metadata.dataFreshness || { freshnessLevel: 'realtime', source: params.provider }
    };
  }

  /**
   * Invalidates cached entries by provider or key pattern.
   * @param {Object} filter
   */
  static async invalidate(filter = {}) {
    try {
      return await TransitCache.deleteMany(filter);
    } catch (err) {
      console.warn(`[TransitCacheService.invalidate] Cache purge error: ${err.message}`);
      return { deletedCount: 0 };
    }
  }
}

