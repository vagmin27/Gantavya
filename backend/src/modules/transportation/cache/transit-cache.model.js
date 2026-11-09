import mongoose from 'mongoose';
import { TRANSPORT_MODE_ENUM, DATA_FRESHNESS_ENUM } from '../transportation.enums.js';

export const transitCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: [true, 'Cache key is required'],
      unique: true,
      trim: true,
      index: true
    },
    provider: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true
    },
    mode: {
      type: String,
      enum: {
        values: TRANSPORT_MODE_ENUM,
        message: '{VALUE} is not a valid transport mode'
      },
      required: [true, 'Transport mode is required']
    },
    originQuery: {
      nodeId: { type: String, default: null },
      name: { type: String, default: null },
      code: { type: String, default: null },
      coordinates: { type: [Number], default: [] }
    },
    destinationQuery: {
      nodeId: { type: String, default: null },
      name: { type: String, default: null },
      code: { type: String, default: null },
      coordinates: { type: [Number], default: [] }
    },
    departureDate: {
      type: Date,
      required: [true, 'Departure date is required']
    },
    searchParams: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    responsePayload: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    dataFreshness: {
      freshnessLevel: {
        type: String,
        enum: DATA_FRESHNESS_ENUM,
        default: 'realtime'
      },
      source: {
        type: String,
        required: true
      },
      confidenceScore: {
        type: Number,
        default: 1.0
      },
      lastFetchedAt: {
        type: Date,
        default: Date.now
      }
    },
    ttlSeconds: {
      type: Number,
      required: [true, 'TTL in seconds is required'],
      min: [1, 'TTL must be positive']
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      index: { expireAfterSeconds: 0 }
    }
  },
  {
    timestamps: true,
    collection: 'transit_caches'
  }
);

// Compound index for querying by provider, mode and departure date range
transitCacheSchema.index({ provider: 1, mode: 1, departureDate: 1 });

export const TransitCache = mongoose.models.TransitCache || mongoose.model('TransitCache', transitCacheSchema);
